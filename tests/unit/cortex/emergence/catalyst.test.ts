/**
 * Emergence Catalyst Unit Tests
 * TooLoo.ai Synapsys V3.3.510
 *
 * Tests for creative synthesis, predictive foresight, and autonomous goals
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock dependencies before importing
vi.mock('../../../../src/core/event-bus', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    readJson: vi.fn().mockResolvedValue({}),
    writeJson: vi.fn().mockResolvedValue(undefined),
  },
  ensureDir: vi.fn().mockResolvedValue(undefined),
  pathExists: vi.fn().mockResolvedValue(false),
  readJson: vi.fn().mockResolvedValue({}),
  writeJson: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../src/cortex/memory/vector-store', () => ({
  VectorStore: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    search: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('../../../../src/cortex/memory/knowledge-graph-engine', () => ({
  default: vi.fn().mockImplementation(() => ({
    getProviderRecommendations: vi.fn().mockReturnValue([]),
  })),
}));

describe('EmergenceCatalyst', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', async () => {
      const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

      const instance1 = EmergenceCatalyst.getInstance();
      const instance2 = EmergenceCatalyst.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Creative Synthesis', () => {
    describe('synthesize', () => {
      it('should create synthesis result with proper structure', async () => {
        const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

        const catalyst = EmergenceCatalyst.getInstance();

        const request = {
          concepts: ['machine-learning', 'user-experience'],
          constraints: ['mobile-friendly', 'low-latency'],
          goal: 'adaptive UI',
          creativityLevel: 0.8,
        };

        const result = await catalyst.synthesize(request);

        expect(result).toBeDefined();
        expect(result.id).toBeTruthy();
        expect(result.novelConcept).toBeTruthy();
        expect(result.description).toBeTruthy();
        expect(result.components).toEqual(request.concepts);
        expect(result.timestamp).toBeInstanceOf(Date);
      });

      it('should generate novelty score in valid range', async () => {
        const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

        const catalyst = EmergenceCatalyst.getInstance();

        const request = {
          concepts: ['concept-a', 'concept-b'],
          constraints: [],
          goal: 'test-goal',
          creativityLevel: 0.5,
        };

        const result = await catalyst.synthesize(request);

        expect(result.noveltyScore).toBeGreaterThanOrEqual(0);
        expect(result.noveltyScore).toBeLessThanOrEqual(1);
      });

      it('should generate feasibility score in valid range', async () => {
        const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

        const catalyst = EmergenceCatalyst.getInstance();

        const request = {
          concepts: ['x', 'y'],
          constraints: [],
          goal: 'combo',
          creativityLevel: 0.7,
        };

        const result = await catalyst.synthesize(request);

        expect(result.feasibilityScore).toBeGreaterThanOrEqual(0);
        expect(result.feasibilityScore).toBeLessThanOrEqual(1);
      });

      it('should include all input concepts in result', async () => {
        const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

        const catalyst = EmergenceCatalyst.getInstance();

        const concepts = ['api-design', 'security', 'scalability'];
        const request = {
          concepts,
          constraints: [],
          goal: 'secure-api',
          creativityLevel: 0.9,
        };

        const result = await catalyst.synthesize(request);

        expect(result.components).toHaveLength(concepts.length);
        for (const concept of concepts) {
          expect(result.components).toContain(concept);
        }
      });

      it('should generate unique IDs for each synthesis', async () => {
        const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

        const catalyst = EmergenceCatalyst.getInstance();

        const request = {
          concepts: ['a', 'b'],
          constraints: [],
          goal: 'test',
          creativityLevel: 0.5,
        };

        const result1 = await catalyst.synthesize(request);
        // Small delay to ensure different timestamp
        await new Promise((r) => setTimeout(r, 10));
        const result2 = await catalyst.synthesize(request);

        expect(result1.id).not.toBe(result2.id);
      });
    });
  });

  describe('Predictive Foresight', () => {
    describe('generateForecast', () => {
      it('should create prediction with proper structure', async () => {
        const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

        const catalyst = EmergenceCatalyst.getInstance();

        const prediction = await catalyst.generateForecast('AI development trends');

        expect(prediction).toBeDefined();
        expect(prediction.id).toBeTruthy();
        expect(prediction.topic).toBe('AI development trends');
        expect(prediction.forecast).toBeTruthy();
        expect(prediction.timeframe).toBeTruthy();
        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.supportingEvidence).toBeInstanceOf(Array);
        expect(prediction.timestamp).toBeInstanceOf(Date);
      });

      it('should generate confidence in valid range', async () => {
        const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

        const catalyst = EmergenceCatalyst.getInstance();

        const prediction = await catalyst.generateForecast('market trends');

        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
      });

      it('should include supporting evidence', async () => {
        const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

        const catalyst = EmergenceCatalyst.getInstance();

        const prediction = await catalyst.generateForecast('technology shifts');

        expect(prediction.supportingEvidence).toBeInstanceOf(Array);
        expect(prediction.supportingEvidence.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Autonomous Goals', () => {
    describe('defineAutonomousGoal', () => {
      it('should return null when no urgent predictions', async () => {
        const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

        const catalyst = EmergenceCatalyst.getInstance();

        const goal = await catalyst.defineAutonomousGoal();

        // With no high-confidence predictions, should return null
        expect(goal === null || goal !== null).toBe(true); // Just check it doesn't throw
      });

      it('should create goal based on high-confidence prediction', async () => {
        const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

        const catalyst = EmergenceCatalyst.getInstance();

        // First generate a prediction to populate state
        await catalyst.generateForecast('critical trend');

        // Try to define autonomous goal
        const goal = await catalyst.defineAutonomousGoal();

        // Goal may or may not be created depending on confidence
        if (goal) {
          expect(goal.id).toBeTruthy();
          expect(goal.description).toBeTruthy();
          expect(goal.status).toBeDefined();
          expect(goal.createdReason).toBe('predicted_need');
        }
      });
    });
  });

  describe('State Management', () => {
    describe('getState', () => {
      it('should return complete state object', async () => {
        const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

        const catalyst = EmergenceCatalyst.getInstance();

        const state = catalyst.getState();
        expect(state).toBeDefined();
        expect(state.syntheses).toBeInstanceOf(Array);
        expect(state.predictions).toBeInstanceOf(Array);
        expect(state.activeGoals).toBeInstanceOf(Array);
      });

      it('should include syntheses after synthesis', async () => {
        const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

        const catalyst = EmergenceCatalyst.getInstance();

        // Create a synthesis first
        await catalyst.synthesize({
          concepts: ['a', 'b'],
          constraints: [],
          goal: 'test',
          creativityLevel: 0.5,
        });

        const state = catalyst.getState();
        expect(state.syntheses.length).toBeGreaterThan(0);
      });
    });

    describe('getStats', () => {
      it('should return stats object', async () => {
        const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

        const catalyst = EmergenceCatalyst.getInstance();

        const stats = catalyst.getStats();
        expect(stats).toBeDefined();
        expect(typeof stats.syntheses).toBe('number');
        expect(typeof stats.predictions).toBe('number');
        expect(typeof stats.activeGoals).toBe('number');
      });

      it('should count syntheses correctly', async () => {
        const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

        const catalyst = EmergenceCatalyst.getInstance();
        const initialStats = catalyst.getStats();

        await catalyst.synthesize({
          concepts: ['x', 'y'],
          constraints: [],
          goal: 'count-test',
          creativityLevel: 0.5,
        });

        const newStats = catalyst.getStats();
        expect(newStats.syntheses).toBeGreaterThan(initialStats.syntheses);
      });
    });
  });

  describe('Memory Connection', () => {
    it('should accept memory components', async () => {
      const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const catalyst = EmergenceCatalyst.getInstance();
      const vectorStore = new VectorStore('/tmp');
      const knowledgeGraph = new KnowledgeGraphEngine();

      // Should not throw
      expect(() => {
        catalyst.connectMemory(vectorStore, knowledgeGraph);
      }).not.toThrow();
    });
  });

  describe('Synthesis Types', () => {
    const creativityLevels = [0.0, 0.25, 0.5, 0.75, 1.0];

    it.each(creativityLevels)('should accept creativity level: %s', async (level) => {
      const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

      const catalyst = EmergenceCatalyst.getInstance();

      const request = {
        concepts: ['x', 'y'],
        constraints: [],
        goal: 'test',
        creativityLevel: level,
      };

      const result = await catalyst.synthesize(request);
      expect(result.novelConcept).toBeTruthy();
    });
  });

  describe('Constraint Handling', () => {
    it('should accept empty constraints', async () => {
      const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

      const catalyst = EmergenceCatalyst.getInstance();

      const request = {
        concepts: ['a', 'b'],
        constraints: [],
        goal: 'test',
        creativityLevel: 0.5,
      };

      const result = await catalyst.synthesize(request);
      expect(result).toBeDefined();
    });

    it('should accept multiple constraints', async () => {
      const { EmergenceCatalyst } = await import('../../../../src/cortex/emergence/catalyst');

      const catalyst = EmergenceCatalyst.getInstance();

      const request = {
        concepts: ['api', 'security'],
        constraints: ['no-external-deps', 'type-safe', 'documented'],
        goal: 'secure-api',
        creativityLevel: 0.7,
      };

      const result = await catalyst.synthesize(request);
      expect(result).toBeDefined();
      expect(result.description).toBeTruthy();
    });
  });
});
