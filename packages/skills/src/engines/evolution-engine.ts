/**
 * @file Native Evolution Engine
 * @description A/B testing and prompt strategy evolution - NO LEGACY DEPENDENCIES
 * @version 1.2.1
 * @skill-os true
 *
 * Implements skill evolution with:
 * - Prompt strategy management
 * - A/B testing framework
 * - Statistical significance calculation
 * - Improvement goal tracking
 */

import { randomUUID } from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import type {
  IEvolutionEngine,
  PromptStrategy,
  ABTest,
  TestResults,
  ImprovementGoal,
  EvolutionEngineConfig,
  EvolutionMetrics,
  EngineStats,
} from './types.js';

// =============================================================================
// EVOLUTION ENGINE IMPLEMENTATION
// =============================================================================

// Internal config type with required properties (defaults set by constructor)
interface InternalEvolutionConfig {
  minSamplesForDecision: number;
  confidenceThreshold: number;
  maxConcurrentTests: number;
  persistPath?: string;
}

export class EvolutionEngine implements IEvolutionEngine {
  readonly id = 'evolution-engine';
  readonly version = '1.2.1';

  private strategies: Map<string, PromptStrategy> = new Map();
  private tests: Map<string, ABTest> = new Map();
  private goals: Map<string, ImprovementGoal> = new Map();
  private config: InternalEvolutionConfig;
  private startedAt: Date;
  private stats: EngineStats;
  private improvementsDeployed = 0;

  constructor(config?: Partial<EvolutionEngineConfig>) {
    this.config = {
      minSamplesForDecision: config?.minSamplesForDecision ?? 30,
      confidenceThreshold: config?.confidenceThreshold ?? 0.95,
      maxConcurrentTests: config?.maxConcurrentTests ?? 5,
      persistPath: config?.persistPath,
    };
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

    if (this.config.persistPath) {
      await this.loadState();
    }

    console.log(`[${this.id}] ✅ Initialized with ${this.strategies.size} strategies, ${this.tests.size} tests`);
  }

  async shutdown(): Promise<void> {
    console.log(`[${this.id}] Shutting down...`);

    if (this.config.persistPath) {
      await this.saveState();
    }

    console.log(`[${this.id}] ✅ Shutdown complete`);
  }

  isHealthy(): boolean {
    return true;
  }

  getStats(): EngineStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startedAt.getTime(),
    };
  }

  // ---------------------------------------------------------------------------
  // Strategy Management
  // ---------------------------------------------------------------------------

  async createStrategy(
    input: Omit<PromptStrategy, 'id' | 'createdAt' | 'lastUsedAt'>
  ): Promise<PromptStrategy> {
    const strategy: PromptStrategy = {
      ...input,
      id: randomUUID(),
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    this.strategies.set(strategy.id, strategy);
    this.stats.operationCount++;
    this.stats.lastOperationAt = new Date();

    console.log(`[${this.id}] Created strategy: ${strategy.name} for ${strategy.skillId}`);
    return strategy;
  }

  async mutateStrategy(strategyId: string, mutation: string): Promise<PromptStrategy> {
    const parent = this.strategies.get(strategyId);
    if (!parent) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const mutated: PromptStrategy = {
      id: randomUUID(),
      name: `${parent.name} (mutated)`,
      template: mutation,
      skillId: parent.skillId,
      usageCount: 0,
      successRate: 0,
      avgQuality: 0,
      avgLatency: 0,
      isChampion: false,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      parentId: parent.id,
      mutation,
    };

    this.strategies.set(mutated.id, mutated);
    this.stats.operationCount++;
    this.stats.lastOperationAt = new Date();

    console.log(`[${this.id}] Mutated strategy: ${parent.name} → ${mutated.id}`);
    return mutated;
  }

  getChampion(skillId: string): PromptStrategy | null {
    for (const strategy of this.strategies.values()) {
      if (strategy.skillId === skillId && strategy.isChampion) {
        return strategy;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // A/B Testing
  // ---------------------------------------------------------------------------

  async startABTest(
    input: Omit<ABTest, 'id' | 'startedAt' | 'resultsA' | 'resultsB' | 'confidence'>
  ): Promise<ABTest> {
    // Check concurrent test limit
    const activeTests = Array.from(this.tests.values()).filter((t) => t.status === 'running');
    if (activeTests.length >= this.config.maxConcurrentTests) {
      throw new Error(`Maximum concurrent tests (${this.config.maxConcurrentTests}) reached`);
    }

    const test: ABTest = {
      ...input,
      id: randomUUID(),
      startedAt: new Date(),
      resultsA: { samples: 0, successes: 0, totalQuality: 0, totalLatency: 0 },
      resultsB: { samples: 0, successes: 0, totalQuality: 0, totalLatency: 0 },
      confidence: 0,
    };

    this.tests.set(test.id, test);
    this.stats.operationCount++;
    this.stats.lastOperationAt = new Date();

    console.log(`[${this.id}] Started A/B test: ${test.name} (${test.strategyA} vs ${test.strategyB})`);
    return test;
  }

  async recordSample(
    testId: string,
    strategy: 'A' | 'B',
    result: { success: boolean; quality: number; latency: number }
  ): Promise<void> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    if (test.status !== 'running') {
      throw new Error(`Test ${testId} is not running`);
    }

    const results = strategy === 'A' ? test.resultsA : test.resultsB;
    results.samples++;
    if (result.success) results.successes++;
    results.totalQuality += result.quality;
    results.totalLatency += result.latency;

    // Calculate confidence using binomial proportion confidence
    test.confidence = this.calculateConfidence(test.resultsA, test.resultsB);

    this.stats.operationCount++;
    this.stats.lastOperationAt = new Date();

    // Auto-complete if enough samples and high confidence
    if (
      test.resultsA.samples >= test.minSamples &&
      test.resultsB.samples >= test.minSamples &&
      test.confidence >= this.config.confidenceThreshold
    ) {
      await this.completeTest(testId);
    }
  }

  getTestResults(testId: string): ABTest | null {
    return this.tests.get(testId) ?? null;
  }

  async completeTest(testId: string): Promise<ABTest> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    // Calculate winner
    const successRateA =
      test.resultsA.samples > 0 ? test.resultsA.successes / test.resultsA.samples : 0;
    const successRateB =
      test.resultsB.samples > 0 ? test.resultsB.successes / test.resultsB.samples : 0;

    if (Math.abs(successRateA - successRateB) < 0.05) {
      test.winner = 'tie';
    } else {
      test.winner = successRateA > successRateB ? 'A' : 'B';
    }

    test.status = 'completed';
    test.completedAt = new Date();

    // Promote winner to champion
    if (test.winner !== 'tie') {
      const winnerId = test.winner === 'A' ? test.strategyA : test.strategyB;
      const loserId = test.winner === 'A' ? test.strategyB : test.strategyA;

      const winner = this.strategies.get(winnerId);
      const loser = this.strategies.get(loserId);

      if (winner) {
        winner.isChampion = true;
        this.improvementsDeployed++;
      }
      if (loser) {
        loser.isChampion = false;
      }
    }

    this.stats.successCount++;
    console.log(`[${this.id}] Test completed: ${test.name} - Winner: ${test.winner}`);
    return test;
  }

  // ---------------------------------------------------------------------------
  // Goals
  // ---------------------------------------------------------------------------

  async setGoal(
    input: Omit<ImprovementGoal, 'id' | 'createdAt' | 'currentValue' | 'progress'>
  ): Promise<ImprovementGoal> {
    const goal: ImprovementGoal = {
      ...input,
      id: randomUUID(),
      createdAt: new Date(),
      currentValue: 0,
      progress: 0,
    };

    this.goals.set(goal.id, goal);
    this.stats.operationCount++;
    this.stats.lastOperationAt = new Date();

    console.log(`[${this.id}] Set goal: ${goal.metric} for ${goal.skillId} → ${goal.targetValue}`);
    return goal;
  }

  async updateGoalProgress(goalId: string, currentValue: number): Promise<ImprovementGoal> {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    goal.currentValue = currentValue;
    goal.progress = Math.min(1, currentValue / goal.targetValue);

    if (goal.progress >= 1 && goal.status === 'active') {
      goal.status = 'achieved';
      console.log(`[${this.id}] 🎉 Goal achieved: ${goal.metric} for ${goal.skillId}`);
    }

    this.stats.operationCount++;
    return goal;
  }

  getActiveGoals(): ImprovementGoal[] {
    return Array.from(this.goals.values()).filter((g) => g.status === 'active');
  }

  getMetrics(): EvolutionMetrics {
    const tests = Array.from(this.tests.values());
    const goals = Array.from(this.goals.values());

    return {
      totalStrategies: this.strategies.size,
      activeTests: tests.filter((t) => t.status === 'running').length,
      completedTests: tests.filter((t) => t.status === 'completed').length,
      improvementsDeployed: this.improvementsDeployed,
      activeGoals: goals.filter((g) => g.status === 'active').length,
      achievedGoals: goals.filter((g) => g.status === 'achieved').length,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private calculateConfidence(resultsA: TestResults, resultsB: TestResults): number {
    if (resultsA.samples < 5 || resultsB.samples < 5) return 0;

    const pA = resultsA.successes / resultsA.samples;
    const pB = resultsB.successes / resultsB.samples;
    const nA = resultsA.samples;
    const nB = resultsB.samples;

    // Pooled proportion
    const pPooled = (resultsA.successes + resultsB.successes) / (nA + nB);
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / nA + 1 / nB));

    if (se === 0) return 0;

    // Z-score
    const z = Math.abs(pA - pB) / se;

    // Convert Z to confidence (simplified)
    if (z >= 2.58) return 0.99;
    if (z >= 1.96) return 0.95;
    if (z >= 1.64) return 0.9;
    if (z >= 1.28) return 0.8;
    return z / 2.58 * 0.8;
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private async loadState(): Promise<void> {
    if (!this.config.persistPath) return;

    try {
      const data = await fs.readJson(this.config.persistPath);
      
      this.strategies = new Map(
        data.strategies.map((s: PromptStrategy) => [
          s.id,
          { ...s, createdAt: new Date(s.createdAt), lastUsedAt: new Date(s.lastUsedAt) },
        ])
      );
      
      this.tests = new Map(
        data.tests.map((t: ABTest) => [
          t.id,
          {
            ...t,
            startedAt: new Date(t.startedAt),
            completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
          },
        ])
      );
      
      this.goals = new Map(
        data.goals.map((g: ImprovementGoal) => [
          g.id,
          {
            ...g,
            createdAt: new Date(g.createdAt),
            deadline: g.deadline ? new Date(g.deadline) : undefined,
          },
        ])
      );

      this.improvementsDeployed = data.improvementsDeployed ?? 0;
      console.log(`[${this.id}] Loaded state from disk`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`[${this.id}] Failed to load state:`, error);
      }
    }
  }

  private async saveState(): Promise<void> {
    if (!this.config.persistPath) return;

    try {
      await fs.ensureDir(path.dirname(this.config.persistPath));
      await fs.writeJson(
        this.config.persistPath,
        {
          strategies: Array.from(this.strategies.values()),
          tests: Array.from(this.tests.values()),
          goals: Array.from(this.goals.values()),
          improvementsDeployed: this.improvementsDeployed,
          savedAt: new Date().toISOString(),
        },
        { spaces: 2 }
      );
    } catch (error) {
      console.error(`[${this.id}] Failed to save state:`, error);
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: EvolutionEngine | null = null;

export function getEvolutionEngine(config?: Partial<EvolutionEngineConfig>): EvolutionEngine {
  if (!instance) {
    instance = new EvolutionEngine(config);
  }
  return instance;
}

export function resetEvolutionEngine(): void {
  instance = null;
}
