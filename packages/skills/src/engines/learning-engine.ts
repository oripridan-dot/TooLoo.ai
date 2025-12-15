/**
 * @file Native Learning Engine
 * @description Q-learning engine for Skills OS - NO LEGACY DEPENDENCIES
 * @version 1.2.1
 * @skill-os true
 *
 * Implements reinforcement learning with:
 * - Q-table management
 * - Epsilon-greedy exploration
 * - Reward tracking
 * - Learning velocity metrics
 */

import { randomUUID } from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import type {
  ILearningEngine,
  LearningState,
  LearningAction,
  Reward,
  QTableEntry,
  LearningPolicy,
  LearningEngineConfig,
  LearningMetrics,
  EngineStats,
} from './types.js';

// =============================================================================
// LEARNING ENGINE IMPLEMENTATION
// =============================================================================

export class LearningEngine implements ILearningEngine {
  readonly id = 'learning-engine';
  readonly version = '1.2.1';

  private qTable: Map<string, QTableEntry> = new Map();
  private rewards: Reward[] = [];
  private policy: LearningPolicy;
  private persistPath: string | null;
  private autoSaveInterval: number;
  private saveTimer: NodeJS.Timeout | null = null;
  private learningEnabled = true;
  private startedAt: Date;
  private stats: EngineStats;

  constructor(config?: Partial<LearningEngineConfig>) {
    this.policy = config?.policy ?? {
      explorationRate: 0.2,
      learningRate: 0.1,
      discountFactor: 0.95,
      minExplorationRate: 0.05,
      explorationDecay: 0.995,
    };
    this.persistPath = config?.persistPath ?? null;
    this.autoSaveInterval = config?.autoSaveInterval ?? 60000;
    this.startedAt = new Date();
    this.stats = {
      operationCount: 0,
      successCount: 0,
      errorCount: 0,
      lastOperationAt: null,
      uptime: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    console.log(`[${this.id}] Initializing v${this.version}...`);

    // Load persisted Q-table if path provided
    if (this.persistPath) {
      await this.loadQTable();
    }

    // Start auto-save timer
    if (this.persistPath && this.autoSaveInterval > 0) {
      this.saveTimer = setInterval(() => this.saveQTable(), this.autoSaveInterval);
    }

    console.log(`[${this.id}] ✅ Initialized with ${this.qTable.size} Q-table entries`);
  }

  async shutdown(): Promise<void> {
    console.log(`[${this.id}] Shutting down...`);

    // Clear auto-save timer
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }

    // Final save
    if (this.persistPath) {
      await this.saveQTable();
    }

    console.log(`[${this.id}] ✅ Shutdown complete`);
  }

  isHealthy(): boolean {
    return this.learningEnabled;
  }

  getStats(): EngineStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startedAt.getTime(),
    };
  }

  // ---------------------------------------------------------------------------
  // Core Learning Methods
  // ---------------------------------------------------------------------------

  async recordReward(input: Omit<Reward, 'id' | 'timestamp'>): Promise<Reward> {
    const reward: Reward = {
      ...input,
      id: randomUUID(),
      timestamp: new Date(),
    };

    this.rewards.push(reward);
    this.stats.operationCount++;
    this.stats.lastOperationAt = new Date();

    if (!this.learningEnabled) {
      return reward;
    }

    // Update Q-table with new reward
    const stateKey = this.serializeState(reward.context);
    const actionKey = this.serializeAction(reward.action);
    const key = `${stateKey}:${actionKey}`;

    const entry = this.qTable.get(key);
    if (entry) {
      // Q-learning update: Q(s,a) = Q(s,a) + α * (r - Q(s,a))
      const oldQ = entry.qValue;
      const newQ = oldQ + this.policy.learningRate * (reward.value - oldQ);
      entry.qValue = newQ;
      entry.visitCount++;
      entry.lastUpdated = new Date();
    } else {
      // New entry
      this.qTable.set(key, {
        stateKey,
        actionKey,
        qValue: reward.value,
        visitCount: 1,
        lastUpdated: new Date(),
      });
    }

    // Decay exploration rate
    this.policy.explorationRate = Math.max(
      this.policy.minExplorationRate,
      this.policy.explorationRate * this.policy.explorationDecay
    );

    this.stats.successCount++;
    return reward;
  }

  async getOptimalAction(
    state: LearningState,
    availableActions: LearningAction[]
  ): Promise<LearningAction> {
    if (availableActions.length === 0) {
      throw new Error('No available actions provided');
    }

    this.stats.operationCount++;
    this.stats.lastOperationAt = new Date();

    // Epsilon-greedy: explore with probability epsilon
    if (Math.random() < this.policy.explorationRate) {
      // Explore: random action
      const randomIndex = Math.floor(Math.random() * availableActions.length);
      const randomAction = availableActions[randomIndex]!;
      console.log(`[${this.id}] Exploring: ${randomAction.provider}`);
      return randomAction;
    }

    // Exploit: best known action
    let bestAction = availableActions[0]!;
    let bestQValue = -Infinity;

    for (const action of availableActions) {
      const qValue = this.getQValue(state, action);
      if (qValue > bestQValue) {
        bestQValue = qValue;
        bestAction = action;
      }
    }

    console.log(`[${this.id}] Exploiting: ${bestAction.provider} (Q=${bestQValue.toFixed(3)})`);
    return bestAction;
  }

  getQValue(state: LearningState, action: LearningAction): number {
    const stateKey = this.serializeState(state);
    const actionKey = this.serializeAction(action);
    const key = `${stateKey}:${actionKey}`;

    const entry = this.qTable.get(key);
    return entry?.qValue ?? 0;
  }

  getQTable(): QTableEntry[] {
    return Array.from(this.qTable.values());
  }

  getMetrics(): LearningMetrics {
    const positiveRewards = this.rewards.filter((r) => r.value > 0).length;
    const negativeRewards = this.rewards.filter((r) => r.value < 0).length;
    const totalValue = this.rewards.reduce((sum, r) => sum + r.value, 0);

    // Calculate learning velocity (improvement rate over recent rewards)
    const recentRewards = this.rewards.slice(-100);
    let velocity = 0;
    if (recentRewards.length >= 10) {
      const firstHalf = recentRewards.slice(0, Math.floor(recentRewards.length / 2));
      const secondHalf = recentRewards.slice(Math.floor(recentRewards.length / 2));
      const firstAvg = firstHalf.reduce((s, r) => s + r.value, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, r) => s + r.value, 0) / secondHalf.length;
      velocity = secondAvg - firstAvg;
    }

    return {
      totalRewards: this.rewards.length,
      positiveRewards,
      negativeRewards,
      averageReward: this.rewards.length > 0 ? totalValue / this.rewards.length : 0,
      explorationRate: this.policy.explorationRate,
      learningVelocity: velocity,
      qTableSize: this.qTable.size,
    };
  }

  setLearningEnabled(enabled: boolean): void {
    this.learningEnabled = enabled;
    console.log(`[${this.id}] Learning ${enabled ? 'enabled' : 'disabled'}`);
  }

  // ---------------------------------------------------------------------------
  // Serialization Helpers
  // ---------------------------------------------------------------------------

  private serializeState(state: LearningState): string {
    return `${state.taskType}:${state.complexity}:${state.provider ?? 'any'}`;
  }

  private serializeAction(action: LearningAction): string {
    return `${action.provider}:${action.temperature}:${action.strategy}`;
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private async loadQTable(): Promise<void> {
    if (!this.persistPath) return;

    try {
      const data = await fs.readJson(this.persistPath);
      this.qTable = new Map(data.qTable.map((e: QTableEntry) => [
        `${e.stateKey}:${e.actionKey}`,
        { ...e, lastUpdated: new Date(e.lastUpdated) },
      ]));
      this.rewards = data.rewards.map((r: Reward) => ({
        ...r,
        timestamp: new Date(r.timestamp),
      }));
      this.policy = { ...this.policy, ...data.policy };
      console.log(`[${this.id}] Loaded ${this.qTable.size} Q-table entries from disk`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`[${this.id}] Failed to load Q-table:`, error);
      }
    }
  }

  private async saveQTable(): Promise<void> {
    if (!this.persistPath) return;

    try {
      await fs.ensureDir(path.dirname(this.persistPath));
      await fs.writeJson(
        this.persistPath,
        {
          qTable: Array.from(this.qTable.values()),
          rewards: this.rewards.slice(-1000), // Keep last 1000 rewards
          policy: this.policy,
          savedAt: new Date().toISOString(),
        },
        { spaces: 2 }
      );
    } catch (error) {
      console.error(`[${this.id}] Failed to save Q-table:`, error);
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: LearningEngine | null = null;

export function getLearningEngine(config?: Partial<LearningEngineConfig>): LearningEngine {
  if (!instance) {
    instance = new LearningEngine(config);
  }
  return instance;
}

export function resetLearningEngine(): void {
  instance = null;
}
