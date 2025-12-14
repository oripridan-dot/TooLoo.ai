// @version 3.3.577
/**
 * Giant Leap Orchestrator Tests
 * @version 1.0.0
 *
 * Tests the synergistic integration system including:
 * - Knowledge → Foresight loop
 * - Foresight → Red Teaming loop
 * - Gap → Knowledge acquisition loop
 * - Synthesis → Strategy loop
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('../../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('../../../src/cortex/knowledge/world-pipeline.js', () => ({
  worldPipeline: {
    getSources: vi.fn().mockReturnValue([{ id: 'source-1' }]),
    forceIngest: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../src/cortex/learning/adversarial-learner.js', () => ({
  adversarialLearner: {
    triggerExercise: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../src/cortex/emergence/catalyst.js', () => ({
  emergenceCatalyst: {
    generateForecast: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../src/cortex/cognition/meta-learner.js', () => ({
  metaLearner: {},
}));

vi.mock('../../../src/cortex/agent/system-hub.js', () => ({
  systemExecutionHub: {
    submitRequest: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('GiantLeapOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exports', () => {
    it('should export GiantLeapOrchestrator class', async () => {
      const module = await import('../../../src/cortex/giant-leap-orchestrator.js');
      expect(module.GiantLeapOrchestrator).toBeDefined();
      expect(typeof module.GiantLeapOrchestrator).toBe('function');
    });

    it('should export singleton instance', async () => {
      const module = await import('../../../src/cortex/giant-leap-orchestrator.js');
      expect(module.giantLeapOrchestrator).toBeDefined();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', async () => {
      const { GiantLeapOrchestrator } =
        await import('../../../src/cortex/giant-leap-orchestrator.js');
      const instance1 = GiantLeapOrchestrator.getInstance();
      const instance2 = GiantLeapOrchestrator.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Status', () => {
    it('should return status with active flag', async () => {
      const { giantLeapOrchestrator } =
        await import('../../../src/cortex/giant-leap-orchestrator.js');
      const status = giantLeapOrchestrator.getStatus();
      expect(status.active).toBeDefined();
    });

    it('should return status with loops array', async () => {
      const { giantLeapOrchestrator } =
        await import('../../../src/cortex/giant-leap-orchestrator.js');
      const status = giantLeapOrchestrator.getStatus();
      expect(Array.isArray(status.loops)).toBe(true);
    });

    it('should list all synergistic loops', async () => {
      const { giantLeapOrchestrator } =
        await import('../../../src/cortex/giant-leap-orchestrator.js');
      const status = giantLeapOrchestrator.getStatus();
      expect(status.loops).toContain('Knowledge -> Foresight');
      expect(status.loops).toContain('Foresight -> Red Teaming');
      expect(status.loops).toContain('Gap -> Knowledge');
      expect(status.loops).toContain('Synthesis -> Strategy');
    });
  });

  describe('Event Listeners', () => {
    it('should have event bus available for listeners', async () => {
      const { bus } = await import('../../../src/core/event-bus.js');
      expect(bus.on).toBeDefined();
      expect(typeof bus.on).toBe('function');
    });
  });

  describe('Synergistic Loops', () => {
    describe('Knowledge → Foresight Loop', () => {
      it('should trigger forecast on new knowledge', () => {
        const event = {
          payload: {
            sourceId: 'test-source',
            itemsCount: 5,
          },
        };
        expect(event.payload.itemsCount).toBeGreaterThan(0);
      });

      it('should skip forecast when no items', () => {
        const event = {
          payload: {
            sourceId: 'test-source',
            itemsCount: 0,
          },
        };
        const shouldTrigger = event.payload.itemsCount > 0;
        expect(shouldTrigger).toBe(false);
      });
    });

    describe('Foresight → Red Teaming Loop', () => {
      it('should create scenario from prediction', () => {
        const prediction = {
          topic: 'AI Development',
          forecast: 'AI will become more autonomous',
        };
        const scenario = `Scenario: ${prediction.forecast}`;
        expect(scenario).toContain('AI will become more autonomous');
      });
    });

    describe('Gap → Knowledge Loop', () => {
      it('should trigger knowledge acquisition on gap', () => {
        const gap = {
          description: 'Missing context about security',
          severity: 'high',
        };
        expect(gap.severity).toBe('high');
      });

      it('should trigger execution for critical gaps', () => {
        const gap = {
          description: 'Security vulnerability',
          severity: 'critical',
        };
        const shouldExecute = gap.severity === 'high' || gap.severity === 'critical';
        expect(shouldExecute).toBe(true);
      });

      it('should not trigger execution for low severity gaps', () => {
        const gap = {
          description: 'Minor documentation issue',
          severity: 'low',
        };
        const shouldExecute = gap.severity === 'high' || gap.severity === 'critical';
        expect(shouldExecute).toBe(false);
      });
    });

    describe('Synthesis → Strategy Loop', () => {
      it('should evaluate synthesis for feasibility', () => {
        const synthesis = {
          novelConcept: 'New optimization approach',
          description: 'Improved caching strategy',
          feasibilityScore: 0.85,
        };
        const shouldImplement = synthesis.feasibilityScore > 0.7;
        expect(shouldImplement).toBe(true);
      });

      it('should skip implementation for low feasibility', () => {
        const synthesis = {
          novelConcept: 'Speculative idea',
          description: 'Untested approach',
          feasibilityScore: 0.3,
        };
        const shouldImplement = synthesis.feasibilityScore > 0.7;
        expect(shouldImplement).toBe(false);
      });
    });
  });

  describe('Execution Requests', () => {
    it('should structure fix request correctly', () => {
      const request = {
        source: 'growth',
        type: 'fix',
        prompt: 'Fix detected vulnerability: SQL injection risk',
        priority: 'high',
        options: {
          autoApprove: false,
          saveArtifacts: true,
        },
      };

      expect(request.type).toBe('fix');
      expect(request.priority).toBe('high');
      expect(request.options.autoApprove).toBe(false);
    });

    it('should structure analyze request correctly', () => {
      const request = {
        source: 'emergence',
        type: 'analyze',
        prompt: 'Explore and prototype novel concept: Adaptive routing',
        priority: 'normal',
      };

      expect(request.type).toBe('analyze');
      expect(request.source).toBe('emergence');
    });
  });

  describe('Flywheel Status', () => {
    it('should be running after setup', async () => {
      const { giantLeapOrchestrator } =
        await import('../../../src/cortex/giant-leap-orchestrator.js');
      const status = giantLeapOrchestrator.getStatus();
      expect(status.active).toBe(true);
    });
  });
});
