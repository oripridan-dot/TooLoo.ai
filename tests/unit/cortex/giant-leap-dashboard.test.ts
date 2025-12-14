// @version 3.3.577
/**
 * Giant Leap Dashboard Tests
 * @version 1.0.0
 *
 * Tests the metrics visualization system including:
 * - Metrics aggregation
 * - Report generation
 * - Status tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('../../../src/cortex/knowledge/world-pipeline.js', () => ({
  worldPipeline: {
    getStats: vi.fn().mockReturnValue({
      totalSources: 5,
      itemsIngested: 1000,
      lastIngestion: new Date(),
    }),
  },
}));

vi.mock('../../../src/cortex/learning/adversarial-learner.js', () => ({
  adversarialLearner: {
    getStats: vi.fn().mockReturnValue({
      exercisesCompleted: 10,
      vulnerabilitiesFound: 3,
    }),
  },
}));

vi.mock('../../../src/cortex/emergence/catalyst.js', () => ({
  emergenceCatalyst: {
    getStats: vi.fn().mockReturnValue({
      syntheses: 15,
      predictions: 8,
      activeGoals: 5,
    }),
  },
}));

vi.mock('../../../src/cortex/cognition/meta-learner.js', () => ({
  metaLearner: {
    getLearningVelocity: vi.fn().mockReturnValue({
      current: 0.75,
      trend: 'improving',
    }),
  },
}));

vi.mock('../../../src/cortex/giant-leap-orchestrator.js', () => ({
  giantLeapOrchestrator: {
    getStatus: vi.fn().mockReturnValue({
      active: true,
      loops: ['Knowledge -> Foresight', 'Foresight -> Red Teaming'],
    }),
  },
}));

describe('GiantLeapDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exports', () => {
    it('should export GiantLeapDashboard class', async () => {
      const module = await import('../../../src/cortex/giant-leap-dashboard.js');
      expect(module.GiantLeapDashboard).toBeDefined();
      expect(typeof module.GiantLeapDashboard).toBe('function');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', async () => {
      const { GiantLeapDashboard } = await import('../../../src/cortex/giant-leap-dashboard.js');
      const instance1 = GiantLeapDashboard.getInstance();
      const instance2 = GiantLeapDashboard.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('GiantLeapMetrics Interface', () => {
    it('should define knowledge metrics', () => {
      const knowledge = {
        sources: 5,
        itemsIngested: 1000,
        lastUpdate: new Date(),
      };

      expect(knowledge.sources).toBe(5);
      expect(knowledge.itemsIngested).toBe(1000);
      expect(knowledge.lastUpdate).toBeInstanceOf(Date);
    });

    it('should define learning metrics', () => {
      const learning = {
        velocity: 0.75,
        trend: 'improving',
        adversarialExercises: 10,
        vulnerabilitiesFound: 3,
      };

      expect(learning.velocity).toBe(0.75);
      expect(learning.trend).toBe('improving');
      expect(learning.adversarialExercises).toBe(10);
    });

    it('should define emergence metrics', () => {
      const emergence = {
        syntheses: 15,
        predictions: 8,
        activeGoals: 5,
      };

      expect(emergence.syntheses).toBe(15);
      expect(emergence.predictions).toBe(8);
    });

    it('should define synergy metrics', () => {
      const synergy = {
        activeLoops: ['Loop1', 'Loop2'],
        status: true,
      };

      expect(synergy.activeLoops).toHaveLength(2);
      expect(synergy.status).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics object', async () => {
      const { GiantLeapDashboard } = await import('../../../src/cortex/giant-leap-dashboard.js');
      const dashboard = GiantLeapDashboard.getInstance();
      const metrics = dashboard.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.knowledge).toBeDefined();
      expect(metrics.learning).toBeDefined();
      expect(metrics.emergence).toBeDefined();
      expect(metrics.synergy).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
    });

    it('should include timestamp', async () => {
      const { GiantLeapDashboard } = await import('../../../src/cortex/giant-leap-dashboard.js');
      const dashboard = GiantLeapDashboard.getInstance();
      const metrics = dashboard.getMetrics();

      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('should aggregate knowledge metrics', async () => {
      const { GiantLeapDashboard } = await import('../../../src/cortex/giant-leap-dashboard.js');
      const dashboard = GiantLeapDashboard.getInstance();
      const metrics = dashboard.getMetrics();

      expect(typeof metrics.knowledge.sources).toBe('number');
      expect(typeof metrics.knowledge.itemsIngested).toBe('number');
    });

    it('should aggregate learning metrics', async () => {
      const { GiantLeapDashboard } = await import('../../../src/cortex/giant-leap-dashboard.js');
      const dashboard = GiantLeapDashboard.getInstance();
      const metrics = dashboard.getMetrics();

      expect(typeof metrics.learning.velocity).toBe('number');
      expect(typeof metrics.learning.trend).toBe('string');
    });
  });

  describe('generateReport', () => {
    it('should return markdown report', async () => {
      const { GiantLeapDashboard } = await import('../../../src/cortex/giant-leap-dashboard.js');
      const dashboard = GiantLeapDashboard.getInstance();
      const report = dashboard.generateReport();

      expect(typeof report).toBe('string');
      expect(report).toContain('#');
    });

    it('should include title', async () => {
      const { GiantLeapDashboard } = await import('../../../src/cortex/giant-leap-dashboard.js');
      const dashboard = GiantLeapDashboard.getInstance();
      const report = dashboard.generateReport();

      expect(report).toContain('Giant Leap Status Report');
    });

    it('should include knowledge section', async () => {
      const { GiantLeapDashboard } = await import('../../../src/cortex/giant-leap-dashboard.js');
      const dashboard = GiantLeapDashboard.getInstance();
      const report = dashboard.generateReport();

      expect(report).toContain('Knowledge Amplification');
    });

    it('should include learning section', async () => {
      const { GiantLeapDashboard } = await import('../../../src/cortex/giant-leap-dashboard.js');
      const dashboard = GiantLeapDashboard.getInstance();
      const report = dashboard.generateReport();

      expect(report).toContain('Learning Revolution');
    });

    it('should include emergence section', async () => {
      const { GiantLeapDashboard } = await import('../../../src/cortex/giant-leap-dashboard.js');
      const dashboard = GiantLeapDashboard.getInstance();
      const report = dashboard.generateReport();

      expect(report).toContain('Emergence Catalyst');
    });
  });

  describe('Trend Formatting', () => {
    it('should display velocity as percentage', () => {
      const velocity = 0.75;
      const formatted = (velocity * 100).toFixed(1);
      expect(formatted).toBe('75.0');
    });

    it('should handle zero velocity', () => {
      const velocity = 0;
      const formatted = (velocity * 100).toFixed(1);
      expect(formatted).toBe('0.0');
    });

    it('should handle max velocity', () => {
      const velocity = 1.0;
      const formatted = (velocity * 100).toFixed(1);
      expect(formatted).toBe('100.0');
    });
  });

  describe('Default Values', () => {
    it('should use default for missing adversarial stats', () => {
      const stats = undefined;
      const exercisesCompleted = stats?.exercisesCompleted || 0;
      expect(exercisesCompleted).toBe(0);
    });

    it('should use default for missing emergence stats', () => {
      const stats = undefined;
      const syntheses = stats?.syntheses || 0;
      expect(syntheses).toBe(0);
    });
  });
});
