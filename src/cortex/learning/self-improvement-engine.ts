// @version 3.3.400
/**
 * Self-Improvement Engine
 *
 * The core autonomous improvement loop for TooLoo.
 * This connects memory, learning, and execution into a continuous improvement cycle.
 *
 * Key capabilities:
 * 1. **Automatic Prompt Refinement** - Learns which prompts work best
 * 2. **Strategy A/B Testing** - Tests different approaches and tracks results
 * 3. **Performance Trending** - Tracks improvement over time
 * 4. **Proactive Goal Setting** - Sets improvement targets based on weaknesses
 *
 * @module cortex/learning/self-improvement-engine
 */

import { bus } from '../../core/event-bus.js';
import fs from 'fs-extra';
import path from 'path';
import { ReinforcementLearner } from './reinforcement-learner.js';
import { VectorStore } from '../memory/vector-store.js';

// ============================================================================
// TYPES
// ============================================================================

export interface PromptStrategy {
  id: string;
  name: string;
  template: string;
  taskType: string;
  /** Number of times used */
  usageCount: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Average quality score (0-1) */
  avgQuality: number;
  /** Average latency in ms */
  avgLatency: number;
  /** Created timestamp */
  createdAt: number;
  /** Last used timestamp */
  lastUsedAt: number;
  /** Is this the current winner for this task type? */
  isChampion: boolean;
  /** Parent strategy this was derived from */
  parentId?: string;
  /** Mutation description if derived */
  mutation?: string;
}

export interface ABTest {
  id: string;
  name: string;
  taskType: string;
  strategyA: string; // strategy ID
  strategyB: string; // strategy ID
  status: 'running' | 'completed' | 'cancelled';
  startedAt: number;
  completedAt?: number;
  /** Results for strategy A */
  resultsA: TestResults;
  /** Results for strategy B */
  resultsB: TestResults;
  /** Winner (if completed) */
  winner?: 'A' | 'B' | 'tie';
  /** Statistical confidence (0-1) */
  confidence: number;
  /** Minimum samples before deciding */
  minSamples: number;
}

export interface TestResults {
  samples: number;
  successes: number;
  totalQuality: number;
  totalLatency: number;
}

export interface ImprovementGoal {
  id: string;
  metric: 'successRate' | 'quality' | 'latency' | 'costEfficiency';
  taskType: string;
  targetValue: number;
  currentValue: number;
  deadline?: number;
  status: 'active' | 'achieved' | 'failed' | 'abandoned';
  createdAt: number;
  progress: number; // 0-1
}

export interface PerformanceTrend {
  date: string;
  successRate: number;
  avgQuality: number;
  avgLatency: number;
  totalTasks: number;
  improvements: number;
  regressions: number;
}

export interface SelfImprovementState {
  strategies: PromptStrategy[];
  activeTests: ABTest[];
  completedTests: ABTest[];
  goals: ImprovementGoal[];
  trends: PerformanceTrend[];
  lastAnalysis: number;
  cycleCount: number;
  totalImprovements: number;
  totalRegressions: number;
}

// ============================================================================
// SELF-IMPROVEMENT ENGINE
// ============================================================================

export class SelfImprovementEngine {
  private static instance: SelfImprovementEngine;

  private state: SelfImprovementState;
  private dataDir: string;
  private stateFile: string;
  private reinforcementLearner: ReinforcementLearner;
  private vectorStore: VectorStore;
  private analysisInterval: NodeJS.Timeout | null = null;

  private readonly ANALYSIS_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MIN_SAMPLES_FOR_AB = 20;
  private readonly CONFIDENCE_THRESHOLD = 0.95;
  private readonly MAX_STRATEGIES_PER_TYPE = 10;

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'self-improvement');
    this.stateFile = path.join(this.dataDir, 'improvement-state.json');
    this.reinforcementLearner = ReinforcementLearner.getInstance();
    this.vectorStore = new VectorStore(process.cwd());

    this.state = {
      strategies: [],
      activeTests: [],
      completedTests: [],
      goals: [],
      trends: [],
      lastAnalysis: 0,
      cycleCount: 0,
      totalImprovements: 0,
      totalRegressions: 0,
    };
  }

  static getInstance(): SelfImprovementEngine {
    if (!SelfImprovementEngine.instance) {
      SelfImprovementEngine.instance = new SelfImprovementEngine();
    }
    return SelfImprovementEngine.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    console.log('[SelfImprovement] Initializing autonomous improvement engine...');

    await fs.ensureDir(this.dataDir);
    await this.loadState();
    await this.vectorStore.initialize();

    this.setupEventListeners();
    this.startAnalysisCycle();

    bus.publish('cortex', 'self_improvement:initialized', {
      strategies: this.state.strategies.length,
      activeTests: this.state.activeTests.length,
      goals: this.state.goals.length,
      cycleCount: this.state.cycleCount,
    });

    console.log(`[SelfImprovement] Ready - ${this.state.strategies.length} strategies tracked`);
  }

  // ============================================================================
  // PROMPT STRATEGY MANAGEMENT
  // ============================================================================

  /**
   * Get the best strategy for a task type
   */
  getBestStrategy(taskType: string): PromptStrategy | null {
    const strategies = this.state.strategies.filter((s) => s.taskType === taskType);
    if (strategies.length === 0) return null;

    // Return champion if exists
    const champion = strategies.find((s) => s.isChampion);
    if (champion) return champion;

    // Otherwise return best by success rate
    return strategies.sort((a, b) => b.successRate - a.successRate)[0] || null;
  }

  /**
   * Record a strategy usage and its outcome
   */
  async recordStrategyOutcome(
    strategyId: string,
    outcome: { success: boolean; quality: number; latency: number }
  ): Promise<void> {
    const strategy = this.state.strategies.find((s) => s.id === strategyId);
    if (!strategy) return;

    // Update statistics
    const prevTotal = strategy.usageCount;
    strategy.usageCount++;
    strategy.lastUsedAt = Date.now();

    // Rolling average for success rate
    strategy.successRate =
      (strategy.successRate * prevTotal + (outcome.success ? 1 : 0)) / strategy.usageCount;

    // Rolling average for quality
    strategy.avgQuality = (strategy.avgQuality * prevTotal + outcome.quality) / strategy.usageCount;

    // Rolling average for latency
    strategy.avgLatency = (strategy.avgLatency * prevTotal + outcome.latency) / strategy.usageCount;

    // Update active A/B tests
    await this.updateABTests(strategyId, outcome);

    await this.saveState();
  }

  /**
   * Create a new prompt strategy
   */
  async createStrategy(params: {
    name: string;
    template: string;
    taskType: string;
    parentId?: string;
    mutation?: string;
  }): Promise<PromptStrategy> {
    const strategy: PromptStrategy = {
      id: `strategy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      template: params.template,
      taskType: params.taskType,
      usageCount: 0,
      successRate: 0.5, // Start with neutral assumption
      avgQuality: 0.5,
      avgLatency: 1000,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      isChampion: false,
      parentId: params.parentId,
      mutation: params.mutation,
    };

    this.state.strategies.push(strategy);

    // Prune old strategies if too many
    await this.pruneStrategies(params.taskType);

    await this.saveState();

    bus.publish('cortex', 'self_improvement:strategy_created', {
      strategyId: strategy.id,
      taskType: params.taskType,
      mutation: params.mutation,
    });

    return strategy;
  }

  /**
   * Mutate a strategy to create a variation
   */
  async mutateStrategy(strategyId: string): Promise<PromptStrategy | null> {
    const parent = this.state.strategies.find((s) => s.id === strategyId);
    if (!parent) return null;

    // Generate mutation via AI (simplified - in production would use precog)
    const mutations = [
      { name: 'more_concise', transform: (t: string) => `Be concise. ${t}` },
      { name: 'step_by_step', transform: (t: string) => `${t} Think step by step.` },
      { name: 'examples_first', transform: (t: string) => `First, consider examples. ${t}` },
      { name: 'confidence_check', transform: (t: string) => `${t} Rate your confidence.` },
      { name: 'structured_output', transform: (t: string) => `${t} Format as JSON.` },
    ];

    const mutation = mutations[Math.floor(Math.random() * mutations.length)];
    if (!mutation) return null;

    const newStrategy = await this.createStrategy({
      name: `${parent.name} (${mutation.name})`,
      template: mutation.transform(parent.template),
      taskType: parent.taskType,
      parentId: parent.id,
      mutation: mutation.name,
    });

    console.log(`[SelfImprovement] Created mutation: ${newStrategy.name}`);
    return newStrategy;
  }

  // ============================================================================
  // A/B TESTING
  // ============================================================================

  /**
   * Start an A/B test between two strategies
   */
  async startABTest(strategyAId: string, strategyBId: string): Promise<ABTest | null> {
    const strategyA = this.state.strategies.find((s) => s.id === strategyAId);
    const strategyB = this.state.strategies.find((s) => s.id === strategyBId);

    if (!strategyA || !strategyB) return null;
    if (strategyA.taskType !== strategyB.taskType) return null;

    // Check if test already exists
    const existing = this.state.activeTests.find(
      (t) =>
        (t.strategyA === strategyAId && t.strategyB === strategyBId) ||
        (t.strategyA === strategyBId && t.strategyB === strategyAId)
    );
    if (existing) return existing;

    const test: ABTest = {
      id: `abtest-${Date.now()}`,
      name: `${strategyA.name} vs ${strategyB.name}`,
      taskType: strategyA.taskType,
      strategyA: strategyAId,
      strategyB: strategyBId,
      status: 'running',
      startedAt: Date.now(),
      resultsA: { samples: 0, successes: 0, totalQuality: 0, totalLatency: 0 },
      resultsB: { samples: 0, successes: 0, totalQuality: 0, totalLatency: 0 },
      confidence: 0,
      minSamples: this.MIN_SAMPLES_FOR_AB,
    };

    this.state.activeTests.push(test);
    await this.saveState();

    bus.publish('cortex', 'self_improvement:ab_test_started', {
      testId: test.id,
      strategyA: strategyA.name,
      strategyB: strategyB.name,
      taskType: test.taskType,
    });

    console.log(`[SelfImprovement] Started A/B test: ${test.name}`);
    return test;
  }

  /**
   * Update A/B tests with new outcome data
   */
  private async updateABTests(
    strategyId: string,
    outcome: { success: boolean; quality: number; latency: number }
  ): Promise<void> {
    for (const test of this.state.activeTests) {
      if (test.strategyA === strategyId) {
        test.resultsA.samples++;
        if (outcome.success) test.resultsA.successes++;
        test.resultsA.totalQuality += outcome.quality;
        test.resultsA.totalLatency += outcome.latency;
      } else if (test.strategyB === strategyId) {
        test.resultsB.samples++;
        if (outcome.success) test.resultsB.successes++;
        test.resultsB.totalQuality += outcome.quality;
        test.resultsB.totalLatency += outcome.latency;
      }

      // Check if test can be concluded
      if (test.resultsA.samples >= test.minSamples && test.resultsB.samples >= test.minSamples) {
        await this.concludeABTest(test);
      }
    }
  }

  /**
   * Conclude an A/B test and declare winner
   */
  private async concludeABTest(test: ABTest): Promise<void> {
    const rateA = test.resultsA.successes / test.resultsA.samples;
    const rateB = test.resultsB.successes / test.resultsB.samples;

    // Simple statistical test (in production would use proper stats)
    const diff = Math.abs(rateA - rateB);
    const pooledRate =
      (test.resultsA.successes + test.resultsB.successes) /
      (test.resultsA.samples + test.resultsB.samples);
    const se = Math.sqrt(
      pooledRate * (1 - pooledRate) * (1 / test.resultsA.samples + 1 / test.resultsB.samples)
    );

    const zScore = diff / (se || 0.01);
    test.confidence = Math.min(0.99, 1 - Math.exp(-zScore * 0.5));

    if (test.confidence >= this.CONFIDENCE_THRESHOLD) {
      test.winner = rateA > rateB ? 'A' : 'B';
      test.status = 'completed';
      test.completedAt = Date.now();

      // Crown the winner as champion
      const winnerId = test.winner === 'A' ? test.strategyA : test.strategyB;
      await this.crownChampion(winnerId, test.taskType);

      this.state.totalImprovements++;
    } else if (test.resultsA.samples + test.resultsB.samples > test.minSamples * 3) {
      // Too many samples without significance - call it a tie
      test.winner = 'tie';
      test.status = 'completed';
      test.completedAt = Date.now();
    }

    if (test.status === 'completed') {
      // Move to completed tests
      this.state.activeTests = this.state.activeTests.filter((t) => t.id !== test.id);
      this.state.completedTests.push(test);

      bus.publish('cortex', 'self_improvement:ab_test_completed', {
        testId: test.id,
        winner: test.winner,
        confidence: test.confidence,
        rateA,
        rateB,
      });

      console.log(
        `[SelfImprovement] A/B test completed: ${test.name} - Winner: ${test.winner} (${(test.confidence * 100).toFixed(1)}% confidence)`
      );
    }
  }

  /**
   * Crown a strategy as the champion for its task type
   */
  private async crownChampion(strategyId: string, taskType: string): Promise<void> {
    for (const strategy of this.state.strategies) {
      if (strategy.taskType === taskType) {
        strategy.isChampion = strategy.id === strategyId;
      }
    }

    const champion = this.state.strategies.find((s) => s.id === strategyId);
    if (champion) {
      console.log(`[SelfImprovement] 👑 New champion for ${taskType}: ${champion.name}`);

      bus.publish('cortex', 'self_improvement:new_champion', {
        strategyId,
        taskType,
        strategyName: champion.name,
        successRate: champion.successRate,
      });
    }
  }

  // ============================================================================
  // IMPROVEMENT GOALS
  // ============================================================================

  /**
   * Set an improvement goal
   */
  async setGoal(params: {
    metric: ImprovementGoal['metric'];
    taskType: string;
    targetValue: number;
    deadlineDays?: number;
  }): Promise<ImprovementGoal> {
    const currentValue = await this.getCurrentMetricValue(params.metric, params.taskType);

    const goal: ImprovementGoal = {
      id: `goal-${Date.now()}`,
      metric: params.metric,
      taskType: params.taskType,
      targetValue: params.targetValue,
      currentValue,
      deadline: params.deadlineDays
        ? Date.now() + params.deadlineDays * 24 * 60 * 60 * 1000
        : undefined,
      status: 'active',
      createdAt: Date.now(),
      progress: Math.min(1, currentValue / params.targetValue),
    };

    this.state.goals.push(goal);
    await this.saveState();

    bus.publish('cortex', 'self_improvement:goal_set', {
      goalId: goal.id,
      metric: params.metric,
      taskType: params.taskType,
      target: params.targetValue,
      current: currentValue,
    });

    console.log(
      `[SelfImprovement] Goal set: ${params.metric} for ${params.taskType} → ${params.targetValue}`
    );
    return goal;
  }

  /**
   * Get current value for a metric
   */
  private async getCurrentMetricValue(
    metric: ImprovementGoal['metric'],
    taskType: string
  ): Promise<number> {
    const strategies = this.state.strategies.filter((s) => s.taskType === taskType);
    if (strategies.length === 0) return 0;

    const champion = strategies.find((s) => s.isChampion) || strategies[0];
    if (!champion) return 0;

    switch (metric) {
      case 'successRate':
        return champion.successRate;
      case 'quality':
        return champion.avgQuality;
      case 'latency':
        return 1000 / champion.avgLatency; // Inverse - higher is better
      case 'costEfficiency':
        return champion.successRate / (champion.avgLatency / 1000); // Simple efficiency metric
      default:
        return 0;
    }
  }

  /**
   * Check and update goal progress
   */
  private async updateGoals(): Promise<void> {
    for (const goal of this.state.goals.filter((g) => g.status === 'active')) {
      const current = await this.getCurrentMetricValue(goal.metric, goal.taskType);
      goal.currentValue = current;
      goal.progress = Math.min(1, current / goal.targetValue);

      if (goal.progress >= 1) {
        goal.status = 'achieved';
        bus.publish('cortex', 'self_improvement:goal_achieved', {
          goalId: goal.id,
          metric: goal.metric,
          taskType: goal.taskType,
        });
        console.log(`[SelfImprovement] 🎯 Goal achieved: ${goal.metric} for ${goal.taskType}`);
      } else if (goal.deadline && Date.now() > goal.deadline) {
        goal.status = 'failed';
        bus.publish('cortex', 'self_improvement:goal_failed', {
          goalId: goal.id,
          metric: goal.metric,
          progress: goal.progress,
        });
      }
    }
  }

  // ============================================================================
  // ANALYSIS CYCLE
  // ============================================================================

  /**
   * Run the self-improvement analysis cycle
   */
  private async runAnalysisCycle(): Promise<void> {
    if (!this.reinforcementLearner.isLearningEnabled()) {
      return; // Respect global learning controls
    }

    this.state.cycleCount++;
    this.state.lastAnalysis = Date.now();

    console.log(`[SelfImprovement] Running analysis cycle #${this.state.cycleCount}...`);

    // 1. Update goals
    await this.updateGoals();

    // 2. Identify underperforming areas
    const weakAreas = this.identifyWeakAreas();

    // 3. Create mutations for weak areas
    for (const area of weakAreas.slice(0, 2)) {
      // Max 2 mutations per cycle
      const champion = this.getBestStrategy(area.taskType);
      if (champion && champion.usageCount >= 10) {
        await this.mutateStrategy(champion.id);
      }
    }

    // 4. Start A/B tests for new mutations
    await this.startAutoABTests();

    // 5. Record trend
    await this.recordTrend();

    // 6. Auto-set goals for weak areas without goals
    await this.autoSetGoals(weakAreas);

    await this.saveState();

    bus.publish('cortex', 'self_improvement:cycle_complete', {
      cycleNumber: this.state.cycleCount,
      weakAreas: weakAreas.length,
      activeTests: this.state.activeTests.length,
      improvements: this.state.totalImprovements,
    });
  }

  /**
   * Identify task types that are underperforming
   */
  private identifyWeakAreas(): { taskType: string; successRate: number }[] {
    const byTaskType = new Map<string, { total: number; successes: number }>();

    for (const strategy of this.state.strategies) {
      const existing = byTaskType.get(strategy.taskType) || { total: 0, successes: 0 };
      existing.total += strategy.usageCount;
      existing.successes += strategy.usageCount * strategy.successRate;
      byTaskType.set(strategy.taskType, existing);
    }

    const weak: { taskType: string; successRate: number }[] = [];
    for (const [taskType, stats] of byTaskType) {
      if (stats.total > 0) {
        const rate = stats.successes / stats.total;
        if (rate < 0.8) {
          // Below 80% success rate
          weak.push({ taskType, successRate: rate });
        }
      }
    }

    return weak.sort((a, b) => a.successRate - b.successRate);
  }

  /**
   * Automatically start A/B tests for untested mutations
   */
  private async startAutoABTests(): Promise<void> {
    const taskTypes = new Set(this.state.strategies.map((s) => s.taskType));

    for (const taskType of taskTypes) {
      const strategies = this.state.strategies.filter((s) => s.taskType === taskType);
      const champion = strategies.find((s) => s.isChampion);

      if (!champion) continue;

      // Find mutations that haven't been tested
      const untestedMutations = strategies.filter(
        (s) =>
          s.parentId === champion.id &&
          !this.state.activeTests.some((t) => t.strategyA === s.id || t.strategyB === s.id) &&
          !this.state.completedTests.some((t) => t.strategyA === s.id || t.strategyB === s.id)
      );

      // Start test for first untested mutation
      if (untestedMutations.length > 0 && this.state.activeTests.length < 5) {
        await this.startABTest(champion.id, untestedMutations[0]!.id);
      }
    }
  }

  /**
   * Record performance trend
   */
  private async recordTrend(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]!;

    // Calculate aggregate metrics
    let totalSuccess = 0;
    let totalQuality = 0;
    let totalLatency = 0;
    let totalUsage = 0;

    for (const strategy of this.state.strategies) {
      totalSuccess += strategy.successRate * strategy.usageCount;
      totalQuality += strategy.avgQuality * strategy.usageCount;
      totalLatency += strategy.avgLatency * strategy.usageCount;
      totalUsage += strategy.usageCount;
    }

    const trend: PerformanceTrend = {
      date: today,
      successRate: totalUsage > 0 ? totalSuccess / totalUsage : 0,
      avgQuality: totalUsage > 0 ? totalQuality / totalUsage : 0,
      avgLatency: totalUsage > 0 ? totalLatency / totalUsage : 0,
      totalTasks: totalUsage,
      improvements: this.state.totalImprovements,
      regressions: this.state.totalRegressions,
    };

    // Detect regression: compare to yesterday's trend
    if (this.state.trends.length > 0) {
      const yesterday = this.state.trends[this.state.trends.length - 1];
      if (yesterday && trend.successRate < yesterday.successRate - 0.05) {
        // Success rate dropped by more than 5%
        this.state.totalRegressions++;
        console.log(`[SelfImprovement] ⚠️ Regression detected: success rate dropped ${((yesterday.successRate - trend.successRate) * 100).toFixed(1)}%`);
      }
    }

    // Update or add today's trend
    const existingIndex = this.state.trends.findIndex((t) => t.date === today);
    if (existingIndex >= 0) {
      this.state.trends[existingIndex] = trend;
    } else {
      this.state.trends.push(trend);
      // Keep last 90 days
      if (this.state.trends.length > 90) {
        this.state.trends = this.state.trends.slice(-90);
      }
    }
  }

  /**
   * Auto-set improvement goals for weak areas
   */
  private async autoSetGoals(
    weakAreas: { taskType: string; successRate: number }[]
  ): Promise<void> {
    for (const area of weakAreas) {
      // Check if goal already exists
      const hasGoal = this.state.goals.some(
        (g) => g.taskType === area.taskType && g.status === 'active'
      );

      if (!hasGoal) {
        // Set goal to improve by 10%
        await this.setGoal({
          metric: 'successRate',
          taskType: area.taskType,
          targetValue: Math.min(0.95, area.successRate + 0.1),
          deadlineDays: 7,
        });
      }
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private setupEventListeners(): void {
    // Listen for execution outcomes to update strategies
    bus.on('pipeline:execution:complete', async (event) => {
      const { success, language, errorAnalysis } = event.payload;

      // Find strategy for this task type
      const taskType = errorAnalysis?.errorType || 'general';
      const strategy = this.getBestStrategy(taskType);

      if (strategy) {
        await this.recordStrategyOutcome(strategy.id, {
          success,
          quality: success ? 0.8 : 0.3,
          latency: event.payload.durationMs || 1000,
        });
      }
    });

    // Listen for learning boost events
    bus.on('learning:boosted', () => {
      // Run extra analysis cycle when learning is boosted
      this.runAnalysisCycle().catch(console.error);
    });
  }

  private startAnalysisCycle(): void {
    this.analysisInterval = setInterval(
      () => this.runAnalysisCycle().catch(console.error),
      this.ANALYSIS_INTERVAL_MS
    );

    // Run initial cycle after short delay
    setTimeout(() => this.runAnalysisCycle().catch(console.error), 10000);
  }

  private async pruneStrategies(taskType: string): Promise<void> {
    const strategies = this.state.strategies.filter((s) => s.taskType === taskType);

    if (strategies.length > this.MAX_STRATEGIES_PER_TYPE) {
      // Keep champion and best performers
      const sorted = strategies.sort((a, b) => {
        if (a.isChampion) return -1;
        if (b.isChampion) return 1;
        return b.successRate - a.successRate;
      });

      const toRemove = sorted.slice(this.MAX_STRATEGIES_PER_TYPE);
      this.state.strategies = this.state.strategies.filter((s) => !toRemove.includes(s));
    }
  }

  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const data = await fs.readJson(this.stateFile);
        this.state = { ...this.state, ...data };
      }
    } catch (err) {
      console.warn('[SelfImprovement] Could not load state, starting fresh');
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.writeJson(this.stateFile, this.state, { spaces: 2 });
    } catch (err) {
      console.error('[SelfImprovement] Failed to save state:', err);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getState(): SelfImprovementState {
    return { ...this.state };
  }

  getMetrics(): {
    totalStrategies: number;
    activeTests: number;
    completedTests: number;
    totalImprovements: number;
    activeGoals: number;
    achievedGoals: number;
    cycleCount: number;
    trends: PerformanceTrend[];
  } {
    return {
      totalStrategies: this.state.strategies.length,
      activeTests: this.state.activeTests.length,
      completedTests: this.state.completedTests.length,
      totalImprovements: this.state.totalImprovements,
      activeGoals: this.state.goals.filter((g) => g.status === 'active').length,
      achievedGoals: this.state.goals.filter((g) => g.status === 'achieved').length,
      cycleCount: this.state.cycleCount,
      trends: this.state.trends.slice(-30),
    };
  }

  /**
   * V3.3.401: Get stats for API consumption
   */
  getStats(): Record<string, number | string> {
    return {
      totalStrategies: this.state.strategies.length,
      activeTests: this.state.activeTests.length,
      completedTests: this.state.completedTests.length,
      totalImprovements: this.state.totalImprovements,
      activeGoals: this.state.goals.filter((g) => g.status === 'active').length,
      achievedGoals: this.state.goals.filter((g) => g.status === 'achieved').length,
      cycleCount: this.state.cycleCount,
      lastAnalysis: this.state.lastAnalysis,
      status: 'active',
    };
  }

  /**
   * V3.3.401: Get goals for API consumption
   */
  getGoals(): ImprovementGoal[] {
    return this.state.goals;
  }

  async shutdown(): Promise<void> {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
    await this.saveState();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const selfImprovementEngine = SelfImprovementEngine.getInstance();
export default SelfImprovementEngine;
