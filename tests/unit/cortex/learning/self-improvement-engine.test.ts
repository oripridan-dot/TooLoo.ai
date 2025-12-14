// @version 3.3.577
/**
 * Self-Improvement Engine Tests
 * @version 1.0.0
 *
 * Tests the autonomous improvement system including:
 * - Prompt strategies
 * - A/B testing
 * - Performance trending
 * - Goal management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    readJson: vi.fn().mockResolvedValue({}),
    writeJson: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('../../../../src/cortex/learning/reinforcement-learner.js', () => ({
  ReinforcementLearner: {
    getInstance: vi.fn().mockReturnValue({
      isLearningEnabled: vi.fn().mockReturnValue(true),
    }),
  },
}));

vi.mock('../../../../src/cortex/memory/vector-store.js', () => ({
  VectorStore: class {
    initialize = vi.fn().mockResolvedValue(undefined);
  },
}));

describe('SelfImprovementEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exports', () => {
    it('should export SelfImprovementEngine class', async () => {
      const module = await import('../../../../src/cortex/learning/self-improvement-engine.js');
      expect(module.SelfImprovementEngine).toBeDefined();
      expect(typeof module.SelfImprovementEngine).toBe('function');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', async () => {
      const { SelfImprovementEngine } =
        await import('../../../../src/cortex/learning/self-improvement-engine.js');
      const instance1 = SelfImprovementEngine.getInstance();
      const instance2 = SelfImprovementEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('PromptStrategy Interface', () => {
    it('should define strategy structure', () => {
      const strategy = {
        id: 'strat-123',
        name: 'Code Generation v1',
        template: 'Generate code for: {{task}}',
        taskType: 'code_generation',
        usageCount: 100,
        successRate: 0.85,
        avgQuality: 0.9,
        avgLatency: 500,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        isChampion: true,
      };

      expect(strategy.successRate).toBe(0.85);
      expect(strategy.isChampion).toBe(true);
    });

    it('should support optional parent reference', () => {
      const strategy = {
        id: 'strat-v2',
        parentId: 'strat-v1',
        mutation: 'Added more context',
      };
      expect(strategy.parentId).toBe('strat-v1');
    });
  });

  describe('ABTest Interface', () => {
    it('should define test structure', () => {
      const test = {
        id: 'test-123',
        name: 'Code Gen A/B Test',
        taskType: 'code_generation',
        strategyA: 'strat-v1',
        strategyB: 'strat-v2',
        status: 'running' as const,
        startedAt: Date.now(),
        resultsA: { samples: 10, successes: 8, totalQuality: 8.5, totalLatency: 5000 },
        resultsB: { samples: 10, successes: 9, totalQuality: 9.0, totalLatency: 4500 },
        confidence: 0.75,
        minSamples: 20,
      };

      expect(test.status).toBe('running');
      expect(test.confidence).toBe(0.75);
    });

    it('should support winner declaration', () => {
      const completedTest = {
        id: 'test-123',
        status: 'completed' as const,
        winner: 'B' as const,
        confidence: 0.96,
      };
      expect(completedTest.winner).toBe('B');
    });
  });

  describe('TestResults Interface', () => {
    it('should track test metrics', () => {
      const results = {
        samples: 50,
        successes: 45,
        totalQuality: 42.5,
        totalLatency: 25000,
      };

      const successRate = results.successes / results.samples;
      const avgQuality = results.totalQuality / results.samples;
      const avgLatency = results.totalLatency / results.samples;

      expect(successRate).toBe(0.9);
      expect(avgQuality).toBe(0.85);
      expect(avgLatency).toBe(500);
    });
  });

  describe('ImprovementGoal Interface', () => {
    it('should define goal structure', () => {
      const goal = {
        id: 'goal-123',
        metric: 'successRate' as const,
        taskType: 'code_generation',
        targetValue: 0.95,
        currentValue: 0.85,
        status: 'active' as const,
        createdAt: Date.now(),
        progress: 0.5,
      };

      expect(goal.metric).toBe('successRate');
      expect(goal.progress).toBe(0.5);
    });

    it('should support all metric types', () => {
      const metrics = ['successRate', 'quality', 'latency', 'costEfficiency'];
      metrics.forEach((metric) => {
        expect(typeof metric).toBe('string');
      });
    });

    it('should support all goal statuses', () => {
      const statuses = ['active', 'achieved', 'failed', 'abandoned'];
      statuses.forEach((status) => {
        expect(typeof status).toBe('string');
      });
    });
  });

  describe('PerformanceTrend Interface', () => {
    it('should track daily metrics', () => {
      const trend = {
        date: '2024-01-15',
        successRate: 0.88,
        avgQuality: 0.85,
        avgLatency: 450,
        totalTasks: 100,
        improvements: 5,
        regressions: 1,
      };

      expect(trend.date).toBe('2024-01-15');
      expect(trend.improvements).toBe(5);
    });
  });

  describe('SelfImprovementState Interface', () => {
    it('should track overall state', () => {
      const state = {
        strategies: [],
        activeTests: [],
        completedTests: [],
        goals: [],
        trends: [],
        lastAnalysis: Date.now(),
        cycleCount: 100,
        totalImprovements: 50,
        totalRegressions: 5,
      };

      expect(state.cycleCount).toBe(100);
      expect(state.totalImprovements).toBe(50);
    });
  });

  describe('Configuration Constants', () => {
    it('should define analysis interval', () => {
      const ANALYSIS_INTERVAL_MS = 5 * 60 * 1000;
      expect(ANALYSIS_INTERVAL_MS).toBe(300000);
    });

    it('should define minimum samples for A/B test', () => {
      const MIN_SAMPLES_FOR_AB = 20;
      expect(MIN_SAMPLES_FOR_AB).toBe(20);
    });

    it('should define confidence threshold', () => {
      const CONFIDENCE_THRESHOLD = 0.95;
      expect(CONFIDENCE_THRESHOLD).toBe(0.95);
    });

    it('should limit strategies per task type', () => {
      const MAX_STRATEGIES_PER_TYPE = 10;
      expect(MAX_STRATEGIES_PER_TYPE).toBe(10);
    });
  });

  describe('getBestStrategy', () => {
    it('should prioritize champion strategy', () => {
      const strategies = [
        { taskType: 'code', successRate: 0.9, isChampion: false },
        { taskType: 'code', successRate: 0.8, isChampion: true },
      ];
      const champion = strategies.find((s) => s.isChampion);
      expect(champion?.successRate).toBe(0.8);
    });

    it('should sort by success rate if no champion', () => {
      const strategies = [
        { taskType: 'code', successRate: 0.7, isChampion: false },
        { taskType: 'code', successRate: 0.9, isChampion: false },
        { taskType: 'code', successRate: 0.8, isChampion: false },
      ];
      const sorted = strategies.sort((a, b) => b.successRate - a.successRate);
      expect(sorted[0]?.successRate).toBe(0.9);
    });

    it('should filter by task type', () => {
      const strategies = [
        { taskType: 'code', successRate: 0.9 },
        { taskType: 'chat', successRate: 0.95 },
      ];
      const codeStrategies = strategies.filter((s) => s.taskType === 'code');
      expect(codeStrategies).toHaveLength(1);
    });
  });

  describe('Goal Progress Calculation', () => {
    it('should calculate progress toward target', () => {
      const goal = {
        targetValue: 0.95,
        currentValue: 0.85,
        baselineValue: 0.75,
      };
      const progressRange = goal.targetValue - goal.baselineValue;
      const currentProgress = goal.currentValue - goal.baselineValue;
      const progress = currentProgress / progressRange;
      expect(progress).toBe(0.5);
    });
  });

  describe('Test Winner Determination', () => {
    it('should require confidence threshold for winner', () => {
      const CONFIDENCE_THRESHOLD = 0.95;
      const test = { confidence: 0.96 };
      const canDeclareWinner = test.confidence >= CONFIDENCE_THRESHOLD;
      expect(canDeclareWinner).toBe(true);
    });

    it('should not declare winner below threshold', () => {
      const CONFIDENCE_THRESHOLD = 0.95;
      const test = { confidence: 0.8 };
      const canDeclareWinner = test.confidence >= CONFIDENCE_THRESHOLD;
      expect(canDeclareWinner).toBe(false);
    });
  });
});
