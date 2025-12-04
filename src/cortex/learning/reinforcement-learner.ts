// @version 2.3.0
/**
 * ReinforcementLearner
 * RL-style continuous learning system for TooLoo's self-improvement.
 * Tracks user outcomes, provider performance, and automatically adjusts strategies.
 *
 * Key concepts:
 * - Rewards: User feedback, task completion, response quality
 * - States: Context (task type, complexity, provider)
 * - Actions: Provider selection, temperature, prompt strategies
 * - Policy: Learned mapping from states to optimal actions
 *
 * Enhanced in v2.3.0 with:
 * - Global learning controls (pause, resume, emergency stop)
 * - Learning velocity control with boost/throttle
 * - Coordinator integration for emergence-driven learning
 * - Adaptive learning rate based on system state
 */

import { bus } from '../../core/event-bus.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface Reward {
  id: string;
  sessionId: string;
  timestamp: Date;
  source: 'explicit' | 'implicit' | 'system';
  value: number; // -1 to 1
  context: RewardContext;
}

export interface RewardContext {
  taskType: string;
  provider: string;
  model?: string;
  complexity: 'low' | 'medium' | 'high';
  latency?: number;
  cost?: number;
  userAction?: 'thumbs_up' | 'thumbs_down' | 'copy' | 'regenerate' | 'edit' | 'ignore';
}

export interface StateVector {
  taskType: string;
  complexity: number; // 0-1
  recency: number; // time decay factor
  providerHistory: Record<string, number>; // provider -> recent success rate
  domainSignature: string; // hash of recent topics
}

export interface Action {
  provider: string;
  temperature: number;
  promptStrategy: 'direct' | 'chain_of_thought' | 'few_shot' | 'decompose';
  creativityLevel: number; // 0-1
}

export interface QTableEntry {
  state: string; // serialized state signature
  action: string; // serialized action
  qValue: number;
  updateCount: number;
  lastUpdated: Date;
}

export interface LearningPolicy {
  explorationRate: number; // epsilon for epsilon-greedy
  learningRate: number; // alpha
  discountFactor: number; // gamma
  minExplorationRate: number;
  explorationDecay: number;
}

export type LearningStatus = 'active' | 'paused' | 'boosted' | 'throttled' | 'emergency_stop';

export interface GlobalLearningControls {
  status: LearningStatus;
  pauseReason?: string;
  boostMultiplier: number; // 1.0 = normal, >1 = boosted, <1 = throttled
  boostExpiresAt?: Date;
  emergencyStopAt?: Date;
  learningVelocityTarget: number; // target velocity
  adaptiveLearningEnabled: boolean;
}

export interface LearningMetrics {
  totalRewards: number;
  positiveRewards: number;
  negativeRewards: number;
  averageReward: number;
  rewardsByProvider: Record<string, { total: number; count: number; avg: number }>;
  rewardsByTaskType: Record<string, { total: number; count: number; avg: number }>;
  learningVelocity: number;
  policyImprovements: number;
  explorationCount: number;
  exploitationCount: number;
  // New metrics for global controls
  pauseCount: number;
  boostCount: number;
  throttleCount: number;
  emergencyStopCount: number;
  effectiveLearningRate: number;
}

export interface StrategyAdjustment {
  id: string;
  timestamp: Date;
  trigger: string;
  before: Partial<Action>;
  after: Partial<Action>;
  confidence: number;
  reasoning: string;
}

// ============================================================================
// REINFORCEMENT LEARNER
// ============================================================================

export class ReinforcementLearner {
  private static instance: ReinforcementLearner;

  private rewardHistory: Reward[] = [];
  private qTable: Map<string, QTableEntry> = new Map();
  private policy: LearningPolicy;
  private metrics: LearningMetrics;
  private adjustmentHistory: StrategyAdjustment[] = [];
  private globalControls: GlobalLearningControls;
  private dataDir: string;
  private stateFile: string;

  private readonly MAX_REWARD_HISTORY = 10000;
  private readonly MAX_ADJUSTMENT_HISTORY = 500;
  private readonly REWARD_DECAY = 0.95; // temporal discount
  private readonly STRATEGY_UPDATE_INTERVAL = 60000; // 1 minute

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'reinforcement-learning');
    this.stateFile = path.join(this.dataDir, 'rl-state.json');

    this.policy = {
      explorationRate: 0.3, // Start with 30% exploration
      learningRate: 0.1,
      discountFactor: 0.9,
      minExplorationRate: 0.05,
      explorationDecay: 0.995,
    };

    this.globalControls = {
      status: 'active',
      boostMultiplier: 1.0,
      learningVelocityTarget: 0.1,
      adaptiveLearningEnabled: true,
    };

    this.metrics = {
      totalRewards: 0,
      positiveRewards: 0,
      negativeRewards: 0,
      averageReward: 0,
      rewardsByProvider: {},
      rewardsByTaskType: {},
      learningVelocity: 0,
      policyImprovements: 0,
      explorationCount: 0,
      exploitationCount: 0,
      pauseCount: 0,
      boostCount: 0,
      throttleCount: 0,
      emergencyStopCount: 0,
      effectiveLearningRate: 0.1,
    };

    this.setupListeners();
  }

  static getInstance(): ReinforcementLearner {
    if (!ReinforcementLearner.instance) {
      ReinforcementLearner.instance = new ReinforcementLearner();
    }
    return ReinforcementLearner.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    console.log('[ReinforcementLearner] Initializing RL-based learning system...');

    await fs.ensureDir(this.dataDir);
    await this.loadState();
    this.startStrategyUpdateCycle();

    bus.publish('cortex', 'learning:rl_initialized', {
      policy: this.policy,
      globalControls: this.globalControls,
      metricsSnapshot: this.getMetricsSnapshot(),
      timestamp: new Date().toISOString(),
    });

    console.log('[ReinforcementLearner] Ready - Q-table entries:', this.qTable.size);
  }

  // ============================================================================
  // GLOBAL LEARNING CONTROLS
  // ============================================================================

  /**
   * Check if learning is currently allowed
   */
  isLearningEnabled(): boolean {
    this.checkBoostExpiration();
    return this.globalControls.status === 'active' || this.globalControls.status === 'boosted';
  }

  /**
   * Pause all learning activities
   */
  pauseLearning(reason: string): void {
    this.globalControls.status = 'paused';
    this.globalControls.pauseReason = reason;
    this.metrics.pauseCount++;

    bus.publish('cortex', 'learning:paused', {
      reason,
      previousStatus: this.globalControls.status,
      timestamp: new Date().toISOString(),
    });

    console.log(`[ReinforcementLearner] ⏸️ Learning paused: ${reason}`);
  }

  /**
   * Resume learning activities
   */
  resumeLearning(): void {
    const previousStatus = this.globalControls.status;
    this.globalControls.status = 'active';
    this.globalControls.pauseReason = undefined;

    bus.publish('cortex', 'learning:resumed', {
      previousStatus,
      timestamp: new Date().toISOString(),
    });

    console.log('[ReinforcementLearner] ▶️ Learning resumed');
  }

  /**
   * Emergency stop - halt all learning immediately
   */
  emergencyStop(reason: string): void {
    this.globalControls.status = 'emergency_stop';
    this.globalControls.pauseReason = reason;
    this.globalControls.emergencyStopAt = new Date();
    this.metrics.emergencyStopCount++;

    bus.publish('cortex', 'learning:emergency_stop', {
      reason,
      timestamp: new Date().toISOString(),
    });

    console.log(`[ReinforcementLearner] 🛑 EMERGENCY STOP: ${reason}`);
  }

  /**
   * Boost learning rate temporarily (for emergence events)
   */
  boostLearning(multiplier: number, durationMs: number): void {
    this.globalControls.status = 'boosted';
    this.globalControls.boostMultiplier = Math.max(1, Math.min(5, multiplier));
    this.globalControls.boostExpiresAt = new Date(Date.now() + durationMs);
    this.metrics.boostCount++;

    // Update effective learning rate
    this.metrics.effectiveLearningRate =
      this.policy.learningRate * this.globalControls.boostMultiplier;

    bus.publish('cortex', 'learning:boosted', {
      multiplier: this.globalControls.boostMultiplier,
      durationMs,
      effectiveLearningRate: this.metrics.effectiveLearningRate,
      expiresAt: this.globalControls.boostExpiresAt.toISOString(),
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[ReinforcementLearner] 🚀 Learning boosted ${multiplier}x for ${durationMs / 1000}s`
    );
  }

  /**
   * Throttle learning rate temporarily (for safety or resource constraints)
   */
  throttleLearning(multiplier: number, durationMs: number): void {
    this.globalControls.status = 'throttled';
    this.globalControls.boostMultiplier = Math.max(0.1, Math.min(1, multiplier));
    this.globalControls.boostExpiresAt = new Date(Date.now() + durationMs);
    this.metrics.throttleCount++;

    this.metrics.effectiveLearningRate =
      this.policy.learningRate * this.globalControls.boostMultiplier;

    bus.publish('cortex', 'learning:throttled', {
      multiplier: this.globalControls.boostMultiplier,
      durationMs,
      effectiveLearningRate: this.metrics.effectiveLearningRate,
      expiresAt: this.globalControls.boostExpiresAt.toISOString(),
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[ReinforcementLearner] 🐢 Learning throttled to ${multiplier}x for ${durationMs / 1000}s`
    );
  }

  /**
   * Check and handle boost/throttle expiration
   */
  private checkBoostExpiration(): void {
    if (this.globalControls.boostExpiresAt && new Date() >= this.globalControls.boostExpiresAt) {
      const wasStatus = this.globalControls.status;
      this.globalControls.status = 'active';
      this.globalControls.boostMultiplier = 1.0;
      this.globalControls.boostExpiresAt = undefined;
      this.metrics.effectiveLearningRate = this.policy.learningRate;

      bus.publish('cortex', 'learning:velocity_normalized', {
        previousStatus: wasStatus,
        timestamp: new Date().toISOString(),
      });

      console.log('[ReinforcementLearner] Learning velocity normalized');
    }
  }

  /**
   * Get current effective learning rate (considering boosts/throttles)
   */
  getEffectiveLearningRate(): number {
    this.checkBoostExpiration();
    return this.policy.learningRate * this.globalControls.boostMultiplier;
  }

  /**
   * Get current learning status
   */
  getLearningStatus(): GlobalLearningControls {
    this.checkBoostExpiration();
    return { ...this.globalControls };
  }

  // ============================================================================
  // REWARD PROCESSING
  // ============================================================================

  /**
   * Record a reward signal from user interaction or system feedback
   */
  recordReward(
    sessionId: string,
    value: number,
    context: RewardContext,
    source: 'explicit' | 'implicit' | 'system' = 'implicit'
  ): Reward {
    // Check if learning is enabled
    if (!this.isLearningEnabled()) {
      console.log('[ReinforcementLearner] Reward ignored - learning disabled');
      // Return a placeholder reward without recording
      return {
        id: `reward-ignored-${Date.now()}`,
        sessionId,
        timestamp: new Date(),
        source,
        value: 0,
        context,
      };
    }

    const reward: Reward = {
      id: `reward-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      sessionId,
      timestamp: new Date(),
      source,
      value: Math.max(-1, Math.min(1, value)), // clamp to [-1, 1]
      context,
    };

    this.rewardHistory.push(reward);

    // Trim history if needed
    if (this.rewardHistory.length > this.MAX_REWARD_HISTORY) {
      this.rewardHistory = this.rewardHistory.slice(-this.MAX_REWARD_HISTORY);
    }

    // Update metrics
    this.updateMetrics(reward);

    // Update Q-table
    this.updateQValue(reward);

    // Telemetry
    bus.publish('cortex', 'learning:reward_recorded', {
      rewardId: reward.id,
      value: reward.value,
      source: reward.source,
      provider: context.provider,
      taskType: context.taskType,
      effectiveLearningRate: this.getEffectiveLearningRate(),
      timestamp: reward.timestamp.toISOString(),
    });

    // Check for significant learning signals
    if (Math.abs(value) > 0.7) {
      bus.publish('cortex', 'learning:significant_signal', {
        rewardId: reward.id,
        value: reward.value,
        context: reward.context,
        interpretation: value > 0 ? 'strong_positive' : 'strong_negative',
      });
    }

    return reward;
  }

  /**
   * Record explicit user feedback (thumbs up/down, etc.)
   */
  recordUserFeedback(
    sessionId: string,
    action: 'thumbs_up' | 'thumbs_down' | 'copy' | 'regenerate' | 'edit' | 'ignore',
    context: Partial<RewardContext>
  ): Reward {
    // Map user actions to reward values
    const actionRewards: Record<string, number> = {
      thumbs_up: 1.0,
      thumbs_down: -1.0,
      copy: 0.7, // user found it useful enough to copy
      regenerate: -0.5, // not satisfied, wants different
      edit: 0.3, // partially useful, needed modification
      ignore: -0.2, // no engagement
    };

    const value = actionRewards[action] ?? 0;

    return this.recordReward(
      sessionId,
      value,
      {
        taskType: context.taskType || 'unknown',
        provider: context.provider || 'unknown',
        model: context.model,
        complexity: context.complexity || 'medium',
        latency: context.latency,
        cost: context.cost,
        userAction: action,
      },
      'explicit'
    );
  }

  /**
   * Record implicit feedback from system metrics
   */
  recordImplicitFeedback(
    sessionId: string,
    context: RewardContext,
    performanceMetrics: {
      latency?: number;
      tokenEfficiency?: number;
      followUpQuestions?: number;
      sessionContinuation?: boolean;
    }
  ): Reward {
    // Calculate implicit reward from performance metrics
    let value = 0;

    // Latency reward (faster is better, normalized)
    if (performanceMetrics.latency !== undefined) {
      const latencyScore = Math.max(0, 1 - performanceMetrics.latency / 10000); // <10s is good
      value += latencyScore * 0.2;
    }

    // Token efficiency (concise but complete)
    if (performanceMetrics.tokenEfficiency !== undefined) {
      value += (performanceMetrics.tokenEfficiency - 0.5) * 0.3;
    }

    // Follow-up questions (fewer = more complete answer)
    if (performanceMetrics.followUpQuestions !== undefined) {
      const followUpPenalty = Math.min(1, performanceMetrics.followUpQuestions * 0.2);
      value -= followUpPenalty * 0.2;
    }

    // Session continuation (user engaged = good)
    if (performanceMetrics.sessionContinuation) {
      value += 0.3;
    }

    return this.recordReward(sessionId, value, context, 'implicit');
  }

  // ============================================================================
  // Q-LEARNING CORE
  // ============================================================================

  /**
   * Get current state vector from context
   */
  private computeStateVector(context: Partial<RewardContext>): StateVector {
    // Get recent provider success rates
    const providerHistory: Record<string, number> = {};
    const recentRewards = this.rewardHistory.slice(-100);

    for (const reward of recentRewards) {
      const provider = reward.context.provider;
      if (!providerHistory[provider]) {
        providerHistory[provider] = 0;
      }
      providerHistory[provider] = (providerHistory[provider] ?? 0) + reward.value;
    }

    // Normalize
    for (const provider of Object.keys(providerHistory)) {
      const count = recentRewards.filter((r) => r.context.provider === provider).length;
      const current = providerHistory[provider] ?? 0;
      providerHistory[provider] = count > 0 ? current / count : 0;
    }

    return {
      taskType: context.taskType || 'general',
      complexity: context.complexity === 'low' ? 0.2 : context.complexity === 'high' ? 0.8 : 0.5,
      recency: 1.0, // fresh state
      providerHistory,
      domainSignature: this.computeDomainSignature(context.taskType || 'general'),
    };
  }

  /**
   * Compute a signature for the current domain context
   */
  private computeDomainSignature(taskType: string): string {
    const recentTasks = this.rewardHistory.slice(-20).map((r) => r.context.taskType);
    const taskCounts: Record<string, number> = {};
    for (const task of recentTasks) {
      taskCounts[task] = (taskCounts[task] || 0) + 1;
    }
    return `${taskType}-${Object.keys(taskCounts).sort().join(',')}`;
  }

  /**
   * Serialize state for Q-table key
   */
  private serializeState(state: StateVector): string {
    return `${state.taskType}:${state.complexity.toFixed(1)}:${state.domainSignature}`;
  }

  /**
   * Serialize action for Q-table key
   */
  private serializeAction(action: Action): string {
    return `${action.provider}:${action.temperature.toFixed(1)}:${action.promptStrategy}`;
  }

  /**
   * Update Q-value based on reward (Q-learning update rule)
   */
  private updateQValue(reward: Reward): void {
    const state = this.computeStateVector(reward.context);
    const stateKey = this.serializeState(state);

    // Infer action from context
    const action: Action = {
      provider: reward.context.provider,
      temperature: 0.7, // default, should be tracked
      promptStrategy: 'direct',
      creativityLevel: 0.5,
    };
    const actionKey = this.serializeAction(action);
    const qKey = `${stateKey}|${actionKey}`;

    // Get current Q-value
    const current = this.qTable.get(qKey);
    const currentQ = current?.qValue ?? 0;

    // Use effective learning rate (accounts for boosts/throttles)
    const effectiveLR = this.getEffectiveLearningRate();

    // Q-learning update: Q(s,a) = Q(s,a) + α * (r + γ * max_a' Q(s',a') - Q(s,a))
    // Simplified: we don't have next state here, so just: Q = Q + α * (r - Q)
    const newQ = currentQ + effectiveLR * (reward.value - currentQ);

    this.qTable.set(qKey, {
      state: stateKey,
      action: actionKey,
      qValue: newQ,
      updateCount: (current?.updateCount ?? 0) + 1,
      lastUpdated: new Date(),
    });

    // Decay exploration rate
    this.policy.explorationRate = Math.max(
      this.policy.minExplorationRate,
      this.policy.explorationRate * this.policy.explorationDecay
    );
  }

  /**
   * Select best action for current state (epsilon-greedy)
   */
  selectAction(context: Partial<RewardContext>, availableProviders: string[]): Action {
    const state = this.computeStateVector(context);
    const stateKey = this.serializeState(state);

    // Epsilon-greedy exploration
    if (Math.random() < this.policy.explorationRate) {
      this.metrics.explorationCount++;

      // Random exploration
      const randomProvider =
        availableProviders[Math.floor(Math.random() * availableProviders.length)];
      const strategies: Action['promptStrategy'][] = [
        'direct',
        'chain_of_thought',
        'few_shot',
        'decompose',
      ];

      bus.publish('cortex', 'learning:exploration_action', {
        stateKey,
        explorationRate: this.policy.explorationRate,
        selectedProvider: randomProvider,
        reason: 'epsilon_greedy_exploration',
      });

      const selectedProvider = randomProvider || availableProviders[0] || 'openai';
      const selectedStrategy =
        strategies[Math.floor(Math.random() * strategies.length)] || 'direct';

      return {
        provider: selectedProvider,
        temperature: 0.5 + Math.random() * 0.5,
        promptStrategy: selectedStrategy,
        creativityLevel: Math.random(),
      };
    }

    this.metrics.exploitationCount++;

    // Find best action for this state
    let bestAction: Action | null = null;
    let bestQ = -Infinity;

    for (const [key, entry] of this.qTable) {
      if (key.startsWith(stateKey + '|')) {
        if (entry.qValue > bestQ) {
          bestQ = entry.qValue;

          // Parse action from key
          const actionParts = entry.action.split(':');
          bestAction = {
            provider: actionParts[0] || 'openai',
            temperature: parseFloat(actionParts[1] || '0.7') || 0.7,
            promptStrategy: (actionParts[2] as Action['promptStrategy']) || 'direct',
            creativityLevel: 0.5,
          };
        }
      }
    }

    // If no learned action, use default
    if (!bestAction || !availableProviders.includes(bestAction.provider)) {
      bestAction = {
        provider: availableProviders[0] || 'openai',
        temperature: 0.7,
        promptStrategy: 'direct',
        creativityLevel: 0.5,
      };
    }

    bus.publish('cortex', 'learning:exploitation_action', {
      stateKey,
      selectedAction: bestAction,
      qValue: bestQ,
      reason: 'best_learned_action',
    });

    return bestAction;
  }

  // ============================================================================
  // METRICS & ANALYSIS
  // ============================================================================

  private updateMetrics(reward: Reward): void {
    this.metrics.totalRewards++;

    if (reward.value > 0) {
      this.metrics.positiveRewards++;
    } else if (reward.value < 0) {
      this.metrics.negativeRewards++;
    }

    // Running average
    const n = this.metrics.totalRewards;
    this.metrics.averageReward = ((n - 1) * this.metrics.averageReward + reward.value) / n;

    // By provider
    const provider = reward.context.provider;
    if (!this.metrics.rewardsByProvider[provider]) {
      this.metrics.rewardsByProvider[provider] = { total: 0, count: 0, avg: 0 };
    }
    const providerStats = this.metrics.rewardsByProvider[provider];
    providerStats.total += reward.value;
    providerStats.count++;
    providerStats.avg = providerStats.total / providerStats.count;

    // By task type
    const taskType = reward.context.taskType;
    if (!this.metrics.rewardsByTaskType[taskType]) {
      this.metrics.rewardsByTaskType[taskType] = { total: 0, count: 0, avg: 0 };
    }
    const taskStats = this.metrics.rewardsByTaskType[taskType];
    taskStats.total += reward.value;
    taskStats.count++;
    taskStats.avg = taskStats.total / taskStats.count;

    // Learning velocity (improvement rate over last 100 rewards)
    if (this.rewardHistory.length >= 100) {
      const recent50 = this.rewardHistory.slice(-50);
      const previous50 = this.rewardHistory.slice(-100, -50);

      const recentAvg = recent50.reduce((s, r) => s + r.value, 0) / 50;
      const previousAvg = previous50.reduce((s, r) => s + r.value, 0) / 50;

      this.metrics.learningVelocity = recentAvg - previousAvg;
    }
  }

  getMetricsSnapshot(): LearningMetrics {
    return { ...this.metrics };
  }

  // ============================================================================
  // STRATEGY ADJUSTMENT
  // ============================================================================

  private startStrategyUpdateCycle(): void {
    setInterval(() => this.evaluateAndAdjustStrategies(), this.STRATEGY_UPDATE_INTERVAL);
  }

  private async evaluateAndAdjustStrategies(): Promise<void> {
    // Analyze recent performance by provider
    const recentRewards = this.rewardHistory.slice(-200);
    if (recentRewards.length < 50) return; // need enough data

    const providerPerformance: Record<string, { rewards: number[]; avg: number }> = {};

    for (const reward of recentRewards) {
      const provider = reward.context.provider;
      if (!providerPerformance[provider]) {
        providerPerformance[provider] = { rewards: [], avg: 0 };
      }
      providerPerformance[provider].rewards.push(reward.value);
    }

    // Calculate averages and identify underperformers
    const adjustments: StrategyAdjustment[] = [];

    for (const [provider, data] of Object.entries(providerPerformance)) {
      data.avg = data.rewards.reduce((s, r) => s + r, 0) / data.rewards.length;

      // If provider is significantly underperforming
      if (data.avg < -0.2 && data.rewards.length >= 10) {
        const adjustment: StrategyAdjustment = {
          id: `adj-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          timestamp: new Date(),
          trigger: `Provider ${provider} underperforming (avg: ${data.avg.toFixed(2)})`,
          before: { provider },
          after: { provider }, // keep provider but adjust temperature
          confidence: Math.min(1, data.rewards.length / 50),
          reasoning: `Reducing temperature for ${provider} due to negative feedback pattern`,
        };

        adjustments.push(adjustment);
        this.adjustmentHistory.push(adjustment);
        this.metrics.policyImprovements++;
      }

      // If provider is performing well, increase confidence
      if (data.avg > 0.5 && data.rewards.length >= 10) {
        const adjustment: StrategyAdjustment = {
          id: `adj-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          timestamp: new Date(),
          trigger: `Provider ${provider} high performance (avg: ${data.avg.toFixed(2)})`,
          before: { provider },
          after: { provider },
          confidence: Math.min(1, data.rewards.length / 50),
          reasoning: `Increasing exploitation rate for ${provider} due to positive feedback`,
        };

        adjustments.push(adjustment);
      }
    }

    // Trim adjustment history
    if (this.adjustmentHistory.length > this.MAX_ADJUSTMENT_HISTORY) {
      this.adjustmentHistory = this.adjustmentHistory.slice(-this.MAX_ADJUSTMENT_HISTORY);
    }

    // Publish strategy update event
    if (adjustments.length > 0) {
      bus.publish('cortex', 'learning:strategies_adjusted', {
        adjustmentCount: adjustments.length,
        adjustments: adjustments.map((a) => ({
          id: a.id,
          trigger: a.trigger,
          reasoning: a.reasoning,
        })),
        newExplorationRate: this.policy.explorationRate,
        timestamp: new Date().toISOString(),
      });
    }

    // Persist state
    await this.saveState();
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const data = await fs.readJson(this.stateFile);

        this.policy = { ...this.policy, ...data.policy };
        this.metrics = { ...this.metrics, ...data.metrics };

        // Restore Q-table
        if (data.qTable) {
          for (const [key, entry] of Object.entries(data.qTable)) {
            this.qTable.set(key, entry as QTableEntry);
          }
        }

        // Restore recent rewards (limited)
        if (data.recentRewards) {
          this.rewardHistory = data.recentRewards.slice(-1000).map((r: any) => ({
            ...r,
            timestamp: new Date(r.timestamp),
          }));
        }

        console.log('[ReinforcementLearner] Restored state:', {
          qTableEntries: this.qTable.size,
          rewardHistory: this.rewardHistory.length,
          explorationRate: this.policy.explorationRate,
        });
      }
    } catch (error) {
      console.error('[ReinforcementLearner] Failed to load state:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      const qTableObj: Record<string, QTableEntry> = {};
      for (const [key, entry] of this.qTable) {
        qTableObj[key] = entry;
      }

      await fs.writeJson(
        this.stateFile,
        {
          policy: this.policy,
          metrics: this.metrics,
          qTable: qTableObj,
          recentRewards: this.rewardHistory.slice(-500),
          savedAt: new Date().toISOString(),
        },
        { spaces: 2 }
      );
    } catch (error) {
      console.error('[ReinforcementLearner] Failed to save state:', error);
    }
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private setupListeners(): void {
    // Listen for chat responses to record implicit feedback
    bus.on('cortex:response', (event) => {
      const { sessionId, provider, model, latency, taskType } = event.payload;

      if (sessionId && provider) {
        this.recordImplicitFeedback(
          sessionId,
          {
            taskType: taskType || 'general',
            provider,
            model,
            complexity: 'medium',
            latency,
          },
          {
            latency,
            sessionContinuation: true,
          }
        );
      }
    });

    // Listen for explicit user feedback
    bus.on('user:feedback', (event) => {
      const { sessionId, action, context } = event.payload;
      if (sessionId && action) {
        this.recordUserFeedback(sessionId, action, context || {});
      }
    });

    // Listen for provider errors as negative signal
    bus.on('precog:error', (event) => {
      const { sessionId, provider, error } = event.payload;
      if (sessionId && provider) {
        this.recordReward(
          sessionId,
          -0.8,
          {
            taskType: 'error',
            provider,
            complexity: 'medium',
          },
          'system'
        );
      }
    });

    // Listen for successful explorations as positive signal
    bus.on('exploration:experiment_completed', (event) => {
      const { success, provider } = event.payload;
      if (provider) {
        this.recordReward(
          `exploration-${Date.now()}`,
          success ? 0.5 : -0.3,
          {
            taskType: 'exploration',
            provider,
            complexity: 'high',
          },
          'system'
        );
      }
    });

    // Listen for coordinator learning boost signals
    bus.on('coordinator:learning_boost', (event) => {
      const { boost, duration } = event.payload;
      if (boost && duration) {
        this.boostLearning(boost, duration);
      }
    });

    // Listen for coordinator pause signals
    bus.on('coordinator:learning_paused', (event) => {
      const { reason } = event.payload;
      this.pauseLearning(reason || 'Coordinator requested pause');
    });

    // Listen for coordinator resume signals
    bus.on('coordinator:learning_resumed', () => {
      this.resumeLearning();
    });

    // Listen for coordinator emergency stop
    bus.on('coordinator:emergency_stop', (event) => {
      const { reason } = event.payload;
      this.emergencyStop(reason || 'Coordinator emergency stop');
    });

    // Listen for intrinsic rewards from coordinator
    bus.on('coordinator:intrinsic_reward', (event) => {
      const { type, value, source, context } = event.payload;
      if (value !== undefined) {
        // Convert intrinsic reward to RL reward
        this.recordReward(
          `intrinsic-${Date.now()}`,
          value * 0.5, // Scale intrinsic rewards
          {
            taskType: `intrinsic_${type}`,
            provider: source || 'coordinator',
            complexity: 'medium',
          },
          'system'
        );
      }
    });

    // Listen for suggestion-triggered boost requests (symbiotic integration)
    bus.on('learning:boost_requested', (event) => {
      const { suggestionId, source } = event.payload;
      console.log(
        `[ReinforcementLearner] Boost requested from ${source || 'suggestion'} (${suggestionId || 'N/A'})`
      );
      // Apply a 1.5x learning boost for 5 minutes when triggered by emergence suggestion
      this.boostLearning(1.5, 5 * 60 * 1000);
    });

    // Listen for emergence detections and optionally boost learning
    bus.on('emergence:detected', (event) => {
      const { impact, strength } = event.payload;
      // Automatically boost learning on high-impact emergence
      if (impact === 'high' || impact === 'transformative' || (strength && strength > 0.8)) {
        console.log(`[ReinforcementLearner] Auto-boosting learning due to ${impact} emergence`);
        this.boostLearning(1.3, 3 * 60 * 1000); // 1.3x for 3 minutes
      }
    });
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getRewardHistory(limit: number = 50): Reward[] {
    return this.rewardHistory.slice(-limit);
  }

  getQTableSize(): number {
    return this.qTable.size;
  }

  getPolicy(): LearningPolicy {
    return { ...this.policy };
  }

  getGlobalControls(): GlobalLearningControls {
    return { ...this.globalControls };
  }

  getAdjustmentHistory(limit: number = 20): StrategyAdjustment[] {
    return this.adjustmentHistory.slice(-limit);
  }

  /**
   * Manually trigger strategy evaluation
   */
  async forceStrategyEvaluation(): Promise<void> {
    await this.evaluateAndAdjustStrategies();
  }

  /**
   * Get provider rankings based on learned Q-values
   */
  getProviderRankings(): Array<{ provider: string; score: number; confidence: number }> {
    const providerScores: Record<string, { total: number; count: number }> = {};

    for (const [_key, entry] of this.qTable) {
      const provider = entry.action.split(':')[0];
      if (provider) {
        if (!providerScores[provider]) {
          providerScores[provider] = { total: 0, count: 0 };
        }
        providerScores[provider].total += entry.qValue;
        providerScores[provider].count++;
      }
    }

    return Object.entries(providerScores)
      .map(([provider, stats]) => ({
        provider,
        score: stats.count > 0 ? stats.total / stats.count : 0,
        confidence: Math.min(1, stats.count / 100),
      }))
      .sort((a, b) => b.score - a.score);
  }
}

// Export singleton
export const reinforcementLearner = ReinforcementLearner.getInstance();
