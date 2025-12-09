// @version 3.3.470
/**
 * Neural Learning Optimizer
 *
 * Uses Q-Learning (Reinforcement Learning) to optimize HOW the system learns.
 * This is the "Strategist" that advises the ModelChooser on which learning
 * strategy to employ based on current system state.
 *
 * Strategies:
 * - gradient_ascent: Prioritize quality/accuracy improvements
 * - random_exploration: High entropy, try diverse models
 * - efficiency: Optimize for speed and cost
 * - meta_learning: Learn from learning patterns
 * - weakness_targeting: Focus on weak areas
 * - parallel_training: High volume, diverse parallel execution
 *
 * @module precog/engine/neural-learning-optimizer
 */

import { promises as fs } from 'fs';
import path from 'path';
import { bus } from '../../core/event-bus.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type LearningStrategy =
  | 'gradient_ascent'
  | 'random_exploration'
  | 'efficiency'
  | 'meta_learning'
  | 'weakness_targeting'
  | 'parallel_training';

export interface LearningState {
  // Core metrics (0-1 normalized)
  mastery: number; // Overall skill level
  confidence: number; // How confident in decisions
  explorationRate: number; // Current exploration tendency
  budgetUtilization: number; // How much budget used (0-1)

  // Performance metrics
  recentSuccessRate: number; // Last N requests success rate
  averageLatency: number; // Average response time
  averageQuality: number; // Average quality score
  learningVelocity: number; // How fast improving

  // Context
  domainStrengths: Record<string, number>; // Performance by domain
  modelPerformance: Record<string, number>; // Performance by model
  recentFailures: string[]; // Recent failure domains
}

export interface QTableEntry {
  strategy: LearningStrategy;
  stateHash: string;
  qValue: number;
  visits: number;
  lastUpdated: number;
}

export interface OptimizerConfig {
  learningRate: number; // Alpha (0-1)
  discountFactor: number; // Gamma (0-1)
  explorationRate: number; // Epsilon (0-1)
  explorationDecay: number; // How fast epsilon decays
  minExploration: number; // Minimum exploration rate
}

export interface StrategyMapping {
  strategy: LearningStrategy;
  preferredModels: string[];
  budgetTier: 'low' | 'medium' | 'high';
  qualityThreshold: number;
}

// ============================================================================
// NEURAL LEARNING OPTIMIZER CLASS
// ============================================================================

export class NeuralLearningOptimizer {
  private dataDir: string;
  private stateFile: string;
  private qTable: Map<string, QTableEntry[]>;
  private config: OptimizerConfig;
  private currentState: LearningState;
  private actionHistory: Array<{
    state: string;
    action: LearningStrategy;
    reward: number;
    timestamp: number;
  }>;

  // Strategy to model mapping
  private strategyMappings: Record<LearningStrategy, StrategyMapping> = {
    gradient_ascent: {
      strategy: 'gradient_ascent',
      preferredModels: ['anthropic', 'openai'], // High quality models
      budgetTier: 'high',
      qualityThreshold: 0.85,
    },
    random_exploration: {
      strategy: 'random_exploration',
      preferredModels: ['deepseek', 'huggingface', 'gemini'], // Diverse/experimental
      budgetTier: 'low',
      qualityThreshold: 0.5,
    },
    efficiency: {
      strategy: 'efficiency',
      preferredModels: ['gemini', 'deepseek'], // Fast and cheap
      budgetTier: 'low',
      qualityThreshold: 0.7,
    },
    meta_learning: {
      strategy: 'meta_learning',
      preferredModels: ['anthropic', 'gemini'], // Good at reasoning
      budgetTier: 'medium',
      qualityThreshold: 0.8,
    },
    weakness_targeting: {
      strategy: 'weakness_targeting',
      preferredModels: ['anthropic', 'openai'], // Strongest for hard tasks
      budgetTier: 'high',
      qualityThreshold: 0.9,
    },
    parallel_training: {
      strategy: 'parallel_training',
      preferredModels: ['gemini', 'deepseek', 'anthropic'], // Volume play
      budgetTier: 'medium',
      qualityThreshold: 0.65,
    },
  };

  // All available strategies for action space
  private strategies: LearningStrategy[] = [
    'gradient_ascent',
    'random_exploration',
    'efficiency',
    'meta_learning',
    'weakness_targeting',
    'parallel_training',
  ];

  constructor(config?: Partial<OptimizerConfig>) {
    this.dataDir = path.join(process.cwd(), 'data', 'neural-optimizer');
    this.stateFile = path.join(this.dataDir, 'q-table.json');
    this.qTable = new Map();
    this.actionHistory = [];

    this.config = {
      learningRate: 0.1, // Alpha
      discountFactor: 0.95, // Gamma
      explorationRate: 0.3, // Epsilon (start with exploration)
      explorationDecay: 0.995, // Decay per episode
      minExploration: 0.05, // Never go below 5%
      ...config,
    };

    // Initialize default state
    this.currentState = this.getDefaultState();

    console.log('[NeuralLearningOptimizer] 🧠 Q-Learning optimizer initialized');
    console.log(
      `[NeuralLearningOptimizer] ε=${this.config.explorationRate}, α=${this.config.learningRate}, γ=${this.config.discountFactor}`
    );
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  async init(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await this.loadQTable();
    console.log(`[NeuralLearningOptimizer] Loaded ${this.qTable.size} Q-table entries`);
  }

  private async loadQTable(): Promise<void> {
    try {
      const data = await fs.readFile(this.stateFile, 'utf-8');
      const parsed = JSON.parse(data);

      if (parsed.qTable && Array.isArray(parsed.qTable)) {
        for (const [hash, entries] of parsed.qTable) {
          this.qTable.set(hash, entries);
        }
      }

      if (parsed.config) {
        this.config = { ...this.config, ...parsed.config };
      }

      if (parsed.actionHistory) {
        this.actionHistory = parsed.actionHistory.slice(-100); // Keep last 100
      }
    } catch {
      // No existing data, start fresh
      console.log('[NeuralLearningOptimizer] Starting with fresh Q-table');
    }
  }

  async saveQTable(): Promise<void> {
    const data = {
      qTable: Array.from(this.qTable.entries()),
      config: this.config,
      actionHistory: this.actionHistory.slice(-100),
      lastSaved: Date.now(),
    };
    await fs.writeFile(this.stateFile, JSON.stringify(data, null, 2));
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  private getDefaultState(): LearningState {
    return {
      mastery: 0.5,
      confidence: 0.5,
      explorationRate: this.config.explorationRate,
      budgetUtilization: 0.3,
      recentSuccessRate: 0.7,
      averageLatency: 2000,
      averageQuality: 0.7,
      learningVelocity: 0.1,
      domainStrengths: {
        coding: 0.6,
        creative: 0.5,
        analysis: 0.6,
        general: 0.7,
      },
      modelPerformance: {
        anthropic: 0.8,
        gemini: 0.75,
        openai: 0.75,
        deepseek: 0.7,
      },
      recentFailures: [],
    };
  }

  /**
   * Get current learning state
   */
  getCurrentLearningState(): LearningState {
    return { ...this.currentState };
  }

  /**
   * Update learning state based on new observations
   */
  updateLearningState(observations: Partial<LearningState>): void {
    this.currentState = {
      ...this.currentState,
      ...observations,
    };
  }

  /**
   * Create a hash of the state for Q-table lookup
   */
  private hashState(state: LearningState): string {
    // Discretize continuous values for tractable state space
    const discretize = (value: number, bins: number): number =>
      Math.floor(value * bins) / bins;

    const key = {
      m: discretize(state.mastery, 5), // 5 levels
      c: discretize(state.confidence, 5),
      s: discretize(state.recentSuccessRate, 5),
      q: discretize(state.averageQuality, 5),
      b: discretize(state.budgetUtilization, 3), // 3 levels (low/med/high)
      f: state.recentFailures.length > 0 ? 1 : 0, // Binary: has failures
    };

    return JSON.stringify(key);
  }

  // ==========================================================================
  // Q-LEARNING CORE
  // ==========================================================================

  /**
   * Select the best learning action (strategy) for current state
   * Uses epsilon-greedy policy
   */
  selectLearningAction(state?: LearningState): LearningStrategy {
    const currentState = state || this.currentState;
    const stateHash = this.hashState(currentState);

    // Epsilon-greedy exploration
    if (Math.random() < this.config.explorationRate) {
      // Explore: random action
      const action = this.strategies[Math.floor(Math.random() * this.strategies.length)];
      console.log(`[NeuralLearningOptimizer] 🎲 Exploring: ${action}`);
      return action;
    }

    // Exploit: choose best Q-value action
    const qEntries = this.qTable.get(stateHash) || [];

    if (qEntries.length === 0) {
      // No data for this state, use heuristic
      return this.selectHeuristicAction(currentState);
    }

    // Find action with highest Q-value
    const best = qEntries.reduce(
      (max, entry) => (entry.qValue > max.qValue ? entry : max),
      qEntries[0]
    );

    console.log(
      `[NeuralLearningOptimizer] 🎯 Exploiting: ${best.strategy} (Q=${best.qValue.toFixed(3)})`
    );
    return best.strategy;
  }

  /**
   * Heuristic action selection for unexplored states
   */
  private selectHeuristicAction(state: LearningState): LearningStrategy {
    // If we have recent failures, target weaknesses
    if (state.recentFailures.length > 0) {
      return 'weakness_targeting';
    }

    // If budget is tight, be efficient
    if (state.budgetUtilization > 0.8) {
      return 'efficiency';
    }

    // If mastery is low, prioritize learning
    if (state.mastery < 0.5) {
      return 'gradient_ascent';
    }

    // If doing well, try meta-learning
    if (state.recentSuccessRate > 0.8 && state.mastery > 0.7) {
      return 'meta_learning';
    }

    // Default to balanced exploration
    return Math.random() < 0.5 ? 'random_exploration' : 'parallel_training';
  }

  /**
   * Update Q-value based on reward signal
   * Q(s,a) = Q(s,a) + α * [R + γ * max(Q(s',a')) - Q(s,a)]
   */
  updateQValue(
    state: LearningState,
    action: LearningStrategy,
    reward: number,
    nextState: LearningState
  ): void {
    const stateHash = this.hashState(state);
    const nextStateHash = this.hashState(nextState);

    // Get or create Q-table entries for this state
    let qEntries = this.qTable.get(stateHash);
    if (!qEntries) {
      qEntries = this.strategies.map((s) => ({
        strategy: s,
        stateHash,
        qValue: 0,
        visits: 0,
        lastUpdated: Date.now(),
      }));
      this.qTable.set(stateHash, qEntries);
    }

    // Find entry for the taken action
    const entry = qEntries.find((e) => e.strategy === action);
    if (!entry) return;

    // Get max Q-value for next state
    const nextQEntries = this.qTable.get(nextStateHash) || [];
    const maxNextQ = nextQEntries.length > 0 ? Math.max(...nextQEntries.map((e) => e.qValue)) : 0;

    // Q-learning update
    const oldQ = entry.qValue;
    const newQ =
      oldQ +
      this.config.learningRate * (reward + this.config.discountFactor * maxNextQ - oldQ);

    entry.qValue = newQ;
    entry.visits++;
    entry.lastUpdated = Date.now();

    // Record in history
    this.actionHistory.push({
      state: stateHash,
      action,
      reward,
      timestamp: Date.now(),
    });

    // Decay exploration rate
    this.config.explorationRate = Math.max(
      this.config.minExploration,
      this.config.explorationRate * this.config.explorationDecay
    );

    console.log(
      `[NeuralLearningOptimizer] Q-update: ${action} Q=${oldQ.toFixed(3)} → ${newQ.toFixed(3)} (reward=${reward.toFixed(3)})`
    );

    // Emit learning event
    bus.publish('precog', 'neural-optimizer:q-update', {
      state: stateHash,
      action,
      oldQ,
      newQ,
      reward,
      explorationRate: this.config.explorationRate,
    });

    // Persist periodically
    if (this.actionHistory.length % 10 === 0) {
      this.saveQTable().catch(console.error);
    }
  }

  // ==========================================================================
  // STRATEGY MAPPING
  // ==========================================================================

  /**
   * Get the model recommendation based on strategy
   */
  getStrategyMapping(strategy: LearningStrategy): StrategyMapping {
    return this.strategyMappings[strategy];
  }

  /**
   * Map strategy to preferred models for the intent
   */
  mapStrategyToModels(strategy: LearningStrategy, domain?: string): string[] {
    const mapping = this.strategyMappings[strategy];

    // If domain has known weakness and strategy is weakness_targeting
    if (strategy === 'weakness_targeting' && domain) {
      const domainStrength = this.currentState.domainStrengths[domain] || 0.5;
      if (domainStrength < 0.6) {
        // Use strongest models for weak domains
        return ['anthropic', 'openai'];
      }
    }

    return mapping.preferredModels;
  }

  // ==========================================================================
  // REWARD CALCULATION
  // ==========================================================================

  /**
   * Calculate reward from execution outcome
   */
  calculateReward(outcome: {
    success: boolean;
    quality: number;
    latency: number;
    cost: number;
    domain?: string;
  }): number {
    let reward = 0;

    // Success is primary
    if (outcome.success) {
      reward += 0.5;
    } else {
      reward -= 0.3;
    }

    // Quality bonus (0-0.3)
    reward += outcome.quality * 0.3;

    // Speed bonus (faster is better, up to 0.1)
    const speedBonus = Math.max(0, 0.1 - outcome.latency / 50000);
    reward += speedBonus;

    // Cost penalty (higher cost reduces reward, up to -0.1)
    const costPenalty = Math.min(0.1, outcome.cost / 10);
    reward -= costPenalty;

    // Normalize to [-1, 1]
    return Math.max(-1, Math.min(1, reward));
  }

  /**
   * Record an interaction outcome for learning
   */
  recordInteraction(interaction: {
    strategy: LearningStrategy;
    model: string;
    domain: string;
    success: boolean;
    quality: number;
    latency: number;
    cost: number;
  }): void {
    // Calculate reward
    const reward = this.calculateReward({
      success: interaction.success,
      quality: interaction.quality,
      latency: interaction.latency,
      cost: interaction.cost,
      domain: interaction.domain,
    });

    // Capture current state before update
    const prevState = { ...this.currentState };

    // Update learning state
    const alpha = 0.1; // Moving average weight
    this.currentState = {
      ...this.currentState,
      recentSuccessRate:
        this.currentState.recentSuccessRate * (1 - alpha) + (interaction.success ? 1 : 0) * alpha,
      averageQuality:
        this.currentState.averageQuality * (1 - alpha) + interaction.quality * alpha,
      averageLatency:
        this.currentState.averageLatency * (1 - alpha) + interaction.latency * alpha,
      domainStrengths: {
        ...this.currentState.domainStrengths,
        [interaction.domain]:
          (this.currentState.domainStrengths[interaction.domain] || 0.5) * (1 - alpha) +
          (interaction.success ? interaction.quality : 0.3) * alpha,
      },
      modelPerformance: {
        ...this.currentState.modelPerformance,
        [interaction.model]:
          (this.currentState.modelPerformance[interaction.model] || 0.5) * (1 - alpha) +
          (interaction.success ? interaction.quality : 0.3) * alpha,
      },
      recentFailures: interaction.success
        ? this.currentState.recentFailures.filter((d) => d !== interaction.domain)
        : [...new Set([...this.currentState.recentFailures, interaction.domain])].slice(-5),
    };

    // Update Q-value
    this.updateQValue(prevState, interaction.strategy, reward, this.currentState);

    console.log(
      `[NeuralLearningOptimizer] Recorded: ${interaction.model}/${interaction.domain} → reward=${reward.toFixed(3)}`
    );
  }

  // ==========================================================================
  // STATUS & METRICS
  // ==========================================================================

  /**
   * Get optimizer status
   */
  getStatus(): {
    state: LearningState;
    config: OptimizerConfig;
    qTableSize: number;
    recentActions: number;
    topStrategies: Array<{ strategy: string; avgQ: number }>;
  } {
    // Calculate average Q per strategy
    const strategyQs: Record<string, number[]> = {};
    for (const entries of this.qTable.values()) {
      for (const entry of entries) {
        if (!strategyQs[entry.strategy]) {
          strategyQs[entry.strategy] = [];
        }
        strategyQs[entry.strategy].push(entry.qValue);
      }
    }

    const topStrategies = Object.entries(strategyQs)
      .map(([strategy, qs]) => ({
        strategy,
        avgQ: qs.reduce((a, b) => a + b, 0) / qs.length,
      }))
      .sort((a, b) => b.avgQ - a.avgQ);

    return {
      state: this.currentState,
      config: this.config,
      qTableSize: this.qTable.size,
      recentActions: this.actionHistory.length,
      topStrategies,
    };
  }
}

// Export singleton instance
export const neuralLearningOptimizer = new NeuralLearningOptimizer();

// Initialize on import
neuralLearningOptimizer.init().catch(console.error);

export default NeuralLearningOptimizer;
