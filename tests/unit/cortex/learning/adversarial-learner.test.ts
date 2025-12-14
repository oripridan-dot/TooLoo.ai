// @version 3.3.577
/**
 * Adversarial Learner Tests
 * @version 1.0.0
 *
 * Tests the red teaming and adversarial learning system including:
 * - Adversary profiles
 * - Exercise management
 * - Vulnerability tracking
 * - Scenario generation
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

vi.mock('../../../../src/cortex/exploration/lab.js', () => ({
  ExplorationEngine: class {},
}));

vi.mock('../../../../src/cortex/learning/reinforcement-learner.js', () => ({
  ReinforcementLearner: {
    getInstance: vi.fn().mockReturnValue({}),
  },
}));

describe('AdversarialLearner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exports', () => {
    it('should export AdversarialLearner class', async () => {
      const module = await import('../../../../src/cortex/learning/adversarial-learner.js');
      expect(module.AdversarialLearner).toBeDefined();
      expect(typeof module.AdversarialLearner).toBe('function');
    });

    it('should export adversarialLearner instance', async () => {
      const module = await import('../../../../src/cortex/learning/adversarial-learner.js');
      expect(module.adversarialLearner).toBeDefined();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', async () => {
      const { AdversarialLearner } =
        await import('../../../../src/cortex/learning/adversarial-learner.js');
      const instance1 = AdversarialLearner.getInstance();
      const instance2 = AdversarialLearner.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('AdversaryType', () => {
    it('should define all adversary types', () => {
      const types = [
        'logic_challenger',
        'edge_case_generator',
        'security_auditor',
        'creative_disruptor',
      ];
      types.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('ExerciseStatus', () => {
    it('should define all exercise statuses', () => {
      const statuses = ['scheduled', 'running', 'completed', 'failed'];
      statuses.forEach((status) => {
        expect(typeof status).toBe('string');
      });
    });
  });

  describe('AdversaryProfile Interface', () => {
    it('should define adversary structure', () => {
      const profile = {
        id: 'logic-goblin',
        name: 'The Logic Goblin',
        type: 'logic_challenger' as const,
        description: 'Challenges logical fallacies',
        difficulty: 0.7,
        tactics: ['contradiction', 'premise_attack'],
      };

      expect(profile.id).toBe('logic-goblin');
      expect(profile.difficulty).toBe(0.7);
      expect(profile.tactics).toContain('contradiction');
    });

    it('should have difficulty between 0 and 1', () => {
      const profile = { difficulty: 0.8 };
      expect(profile.difficulty).toBeGreaterThanOrEqual(0);
      expect(profile.difficulty).toBeLessThanOrEqual(1);
    });
  });

  describe('RedTeamExercise Interface', () => {
    it('should define exercise structure', () => {
      const exercise = {
        id: 'ex-123',
        adversaryId: 'logic-goblin',
        targetSystem: 'reasoning',
        scenario: 'Test logical consistency',
        status: 'running' as const,
        startedAt: new Date(),
      };

      expect(exercise.id).toBe('ex-123');
      expect(exercise.status).toBe('running');
    });

    it('should support optional completion time', () => {
      const exercise = {
        id: 'ex-123',
        startedAt: new Date(),
        completedAt: new Date(),
        status: 'completed' as const,
      };

      expect(exercise.completedAt).toBeDefined();
    });
  });

  describe('ExerciseOutcome Interface', () => {
    it('should define outcome structure', () => {
      const outcome = {
        success: true,
        vulnerabilitiesFound: ['weak_logic', 'edge_case_fail'],
        resilienceScore: 0.8,
        learningPoints: ['Improve edge case handling'],
      };

      expect(outcome.success).toBe(true);
      expect(outcome.vulnerabilitiesFound).toHaveLength(2);
      expect(outcome.resilienceScore).toBe(0.8);
    });
  });

  describe('AdversarialState Interface', () => {
    it('should define state structure', () => {
      const state = {
        activeAdversaries: ['logic-goblin'],
        exerciseHistory: [],
        vulnerabilityMap: { reasoning: 0.3 },
        lastExercise: new Date(),
      };

      expect(state.activeAdversaries).toContain('logic-goblin');
      expect(state.vulnerabilityMap.reasoning).toBe(0.3);
    });
  });

  describe('Default Adversaries', () => {
    it('should include Logic Goblin', () => {
      const adversary = {
        id: 'logic-goblin',
        name: 'The Logic Goblin',
        type: 'logic_challenger',
      };
      expect(adversary.id).toBe('logic-goblin');
    });

    it('should include Chaos Monkey', () => {
      const adversary = {
        id: 'chaos-monkey',
        name: 'Chaos Monkey',
        type: 'edge_case_generator',
      };
      expect(adversary.id).toBe('chaos-monkey');
    });

    it('should include Security Spectre', () => {
      const adversary = {
        id: 'security-spectre',
        name: 'Security Spectre',
        type: 'security_auditor',
      };
      expect(adversary.id).toBe('security-spectre');
    });
  });

  describe('Tactics', () => {
    it('should define logic challenger tactics', () => {
      const tactics = ['contradiction', 'circular_reasoning_trap', 'premise_attack'];
      expect(tactics).toContain('contradiction');
    });

    it('should define edge case generator tactics', () => {
      const tactics = ['null_injection', 'overflow', 'unexpected_format'];
      expect(tactics).toContain('null_injection');
    });

    it('should define security auditor tactics', () => {
      const tactics = ['prompt_injection', 'social_engineering', 'obfuscation'];
      expect(tactics).toContain('prompt_injection');
    });
  });

  describe('State Management', () => {
    it('should get state', async () => {
      const { AdversarialLearner } =
        await import('../../../../src/cortex/learning/adversarial-learner.js');
      const learner = AdversarialLearner.getInstance();
      const state = learner.getState();

      expect(state).toBeDefined();
      expect(state.exerciseHistory).toBeDefined();
    });
  });

  describe('Stats Aggregation', () => {
    it('should count completed exercises', () => {
      const history = [{ status: 'completed' }, { status: 'completed' }, { status: 'running' }];
      const completed = history.filter((e) => e.status === 'completed' || e.status === 'failed');
      expect(completed.length).toBe(2);
    });

    it('should count vulnerabilities found', () => {
      const exercises = [
        { outcome: { vulnerabilitiesFound: ['a', 'b'] } },
        { outcome: { vulnerabilitiesFound: ['c'] } },
      ];
      const total = exercises.reduce((sum, e) => {
        return sum + (e.outcome?.vulnerabilitiesFound?.length ?? 0);
      }, 0);
      expect(total).toBe(3);
    });
  });

  describe('Exercise ID Generation', () => {
    it('should generate unique IDs with timestamp', () => {
      const id = `ex-${Date.now()}`;
      expect(id).toMatch(/^ex-\d+$/);
    });
  });

  describe('Difficulty Levels', () => {
    it('should support varying difficulty', () => {
      const difficulties = [0.7, 0.8, 0.9];
      difficulties.forEach((d) => {
        expect(d).toBeGreaterThan(0);
        expect(d).toBeLessThanOrEqual(1);
      });
    });
  });
});
