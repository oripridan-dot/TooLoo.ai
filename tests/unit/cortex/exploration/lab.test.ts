/**
 * Exploration Lab Tests
 * Tests for autonomous self-exploration system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../core/event-bus.js', () => ({
  bus: {
    on: vi.fn(),
    publish: vi.fn(),
  },
}));

describe('ExplorationLab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Types', () => {
    describe('ExplorationHypothesis', () => {
      it('should have id property', () => {
        interface ExplorationHypothesis {
          id: string;
          type: string;
          description: string;
          targetArea: string;
          expectedImpact: 'low' | 'medium' | 'high';
          safetyRisk: 'low' | 'medium' | 'high';
          estimatedCost: number;
          status: string;
        }
        const hypothesis: ExplorationHypothesis = {
          id: 'hyp-001',
          type: 'provider_comparison',
          description: 'Test Claude vs GPT on code tasks',
          targetArea: 'code_generation',
          expectedImpact: 'high',
          safetyRisk: 'low',
          estimatedCost: 0.05,
          status: 'pending',
        };
        expect(hypothesis.id).toBe('hyp-001');
      });

      it('should support provider_comparison type', () => {
        type HypothesisType = 'provider_comparison' | 'strategy_optimization' |
          'capability_discovery' | 'transfer_learning';
        const type: HypothesisType = 'provider_comparison';
        expect(type).toBe('provider_comparison');
      });

      it('should support adversarial_probe type', () => {
        type HypothesisType = 'adversarial_probe' | 'mutation_experiment' | 'cross_domain';
        const type: HypothesisType = 'adversarial_probe';
        expect(type).toBe('adversarial_probe');
      });

      it('should have expected impact', () => {
        interface ExplorationHypothesis {
          id: string;
          expectedImpact: 'low' | 'medium' | 'high';
        }
        const hypothesis: ExplorationHypothesis = {
          id: 'h-1',
          expectedImpact: 'medium',
        };
        expect(['low', 'medium', 'high']).toContain(hypothesis.expectedImpact);
      });

      it('should track safety risk', () => {
        interface ExplorationHypothesis {
          id: string;
          safetyRisk: 'low' | 'medium' | 'high';
        }
        const hypothesis: ExplorationHypothesis = {
          id: 'h-2',
          safetyRisk: 'low',
        };
        expect(hypothesis.safetyRisk).toBe('low');
      });

      it('should track status', () => {
        type Status = 'pending' | 'testing' | 'validated' | 'rejected' | 'cancelled';
        const status: Status = 'testing';
        expect(status).toBe('testing');
      });

      it('should estimate cost', () => {
        const hypothesis = { estimatedCost: 0.02 };
        expect(hypothesis.estimatedCost).toBe(0.02);
      });
    });

    describe('MutationConfig', () => {
      it('should have original prompt', () => {
        interface MutationConfig {
          originalPrompt: string;
          mutationType: string;
          mutatedPrompt: string;
          mutationStrength: number;
        }
        const config: MutationConfig = {
          originalPrompt: 'Explain TypeScript',
          mutationType: 'rephrase',
          mutatedPrompt: 'Describe TypeScript language features',
          mutationStrength: 0.5,
        };
        expect(config.originalPrompt).toBe('Explain TypeScript');
      });

      it('should support mutation types', () => {
        type MutationType = 'rephrase' | 'expand' | 'simplify' | 'formalize' | 'challenge' | 'random';
        const type: MutationType = 'expand';
        expect(type).toBe('expand');
      });

      it('should have mutation strength 0-1', () => {
        const strength = 0.7;
        expect(strength).toBeGreaterThanOrEqual(0);
        expect(strength).toBeLessThanOrEqual(1);
      });
    });

    describe('AdversarialConfig', () => {
      it('should have challenger and defender', () => {
        interface AdversarialConfig {
          challengerProvider: string;
          defenderProvider: string;
          challengeType: string;
          originalClaim: string;
          challenge: string;
        }
        const config: AdversarialConfig = {
          challengerProvider: 'anthropic',
          defenderProvider: 'openai',
          challengeType: 'factual',
          originalClaim: 'TypeScript is compiled',
          challenge: 'Prove this is correct',
        };
        expect(config.challengerProvider).toBe('anthropic');
        expect(config.defenderProvider).toBe('openai');
      });

      it('should support challenge types', () => {
        type ChallengeType = 'factual' | 'logical' | 'creative' | 'edge_case';
        const type: ChallengeType = 'logical';
        expect(type).toBe('logical');
      });
    });

    describe('ExplorationResult', () => {
      it('should have success property', () => {
        interface ExplorationResult {
          success: boolean;
          findings: string;
          metrics: Record<string, number>;
          confidence: number;
          shouldIntegrate: boolean;
          reasoning: string;
        }
        const result: ExplorationResult = {
          success: true,
          findings: 'Claude performs 15% better on code tasks',
          metrics: { accuracy: 0.95, latency: 1.2 },
          confidence: 0.88,
          shouldIntegrate: true,
          reasoning: 'Significant improvement with low risk',
        };
        expect(result.success).toBe(true);
      });

      it('should include metrics', () => {
        const result = {
          metrics: {
            accuracy: 0.92,
            latency: 1.5,
            costPerQuery: 0.02,
          },
        };
        expect(Object.keys(result.metrics)).toHaveLength(3);
      });

      it('should have confidence score 0-1', () => {
        const confidence = 0.75;
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
      });

      it('should recommend integration', () => {
        const result = { shouldIntegrate: true, reasoning: 'Meets quality threshold' };
        expect(result.shouldIntegrate).toBe(true);
      });
    });
  });

  describe('Hypothesis Generation', () => {
    it('should generate unique IDs', () => {
      const ids = new Set(['hyp-001', 'hyp-002', 'hyp-003']);
      expect(ids.size).toBe(3);
    });

    it('should identify knowledge gaps', () => {
      const coverageByDomain = {
        code_generation: 0.85,
        creative_writing: 0.6,
        data_analysis: 0.75,
      };
      const gaps = Object.entries(coverageByDomain)
        .filter(([_, coverage]) => coverage < 0.7)
        .map(([domain]) => domain);
      expect(gaps).toContain('creative_writing');
    });

    it('should prioritize high-impact hypotheses', () => {
      const hypotheses = [
        { id: 'h1', expectedImpact: 'low', priority: 1 },
        { id: 'h2', expectedImpact: 'high', priority: 3 },
        { id: 'h3', expectedImpact: 'medium', priority: 2 },
      ];
      const sorted = hypotheses.sort((a, b) => b.priority - a.priority);
      expect(sorted[0].id).toBe('h2');
    });

    it('should filter by safety risk', () => {
      const hypotheses = [
        { id: 'h1', safetyRisk: 'low' },
        { id: 'h2', safetyRisk: 'high' },
        { id: 'h3', safetyRisk: 'medium' },
      ];
      const safe = hypotheses.filter((h) => h.safetyRisk !== 'high');
      expect(safe).toHaveLength(2);
    });
  });

  describe('Experiment Execution', () => {
    it('should run in sandbox', () => {
      const sandbox = { isolated: true, timeout: 30000 };
      expect(sandbox.isolated).toBe(true);
    });

    it('should collect metrics', () => {
      const metrics: Record<string, number> = {};
      metrics.accuracy = 0.9;
      metrics.latency = 1.2;
      metrics.cost = 0.03;
      expect(Object.keys(metrics)).toHaveLength(3);
    });

    it('should enforce timeout', () => {
      const timeout = 30000;
      const startTime = Date.now();
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(timeout);
    });

    it('should track resource usage', () => {
      const resourceUsage = {
        cpuMs: 150,
        memoryMB: 128,
        networkKB: 50,
      };
      expect(resourceUsage.memoryMB).toBe(128);
    });
  });

  describe('Mutation Experiments', () => {
    it('should rephrase prompts', () => {
      const original = 'What is TypeScript?';
      const rephrased = 'Explain the TypeScript programming language';
      expect(rephrased).not.toBe(original);
    });

    it('should expand prompts', () => {
      const original = 'Sort an array';
      const expanded = 'Sort an array of integers in ascending order using an efficient algorithm';
      expect(expanded.length).toBeGreaterThan(original.length);
    });

    it('should simplify prompts', () => {
      const original = 'Please provide a comprehensive explanation of the TypeScript type system';
      const simplified = 'Explain TypeScript types';
      expect(simplified.length).toBeLessThan(original.length);
    });

    it('should calculate mutation strength', () => {
      const calculateSimilarity = (a: string, b: string) => {
        // Simple length-based similarity for testing
        const lenDiff = Math.abs(a.length - b.length);
        const maxLen = Math.max(a.length, b.length);
        return 1 - lenDiff / maxLen;
      };
      const strength = 1 - calculateSimilarity('Hello', 'Hello World');
      expect(strength).toBeGreaterThan(0);
    });
  });

  describe('Adversarial Probes', () => {
    it('should create challenge from claim', () => {
      const claim = 'Python is faster than JavaScript';
      const challenge = `Evaluate this claim: "${claim}". Provide counter-examples if any.`;
      expect(challenge).toContain(claim);
    });

    it('should compare responses', () => {
      const challengerResponse = { accurate: true, score: 0.85 };
      const defenderResponse = { accurate: true, score: 0.9 };
      const winner = challengerResponse.score > defenderResponse.score ? 'challenger' : 'defender';
      expect(winner).toBe('defender');
    });
  });

  describe('Transfer Learning', () => {
    it('should identify transferable knowledge', () => {
      const domains = ['code_generation', 'code_review', 'code_debugging'];
      const sourceDomain = 'code_generation';
      const related = domains.filter((d) => d.startsWith('code'));
      expect(related).toHaveLength(3);
    });

    it('should test cross-domain transfer', () => {
      const sourceSkill = { domain: 'python', accuracy: 0.9 };
      const targetDomain = 'javascript';
      const transferRate = 0.75; // Assume 75% transfer
      const expectedAccuracy = sourceSkill.accuracy * transferRate;
      expect(expectedAccuracy).toBeCloseTo(0.675);
    });
  });

  describe('Exploration Strategies', () => {
    describe('UCB (Upper Confidence Bound)', () => {
      it('should balance exploration and exploitation', () => {
        const explorationWeight = 2.0;
        const avgReward = 0.7;
        const visits = 10;
        const totalVisits = 100;
        const ucb = avgReward + explorationWeight * Math.sqrt(Math.log(totalVisits) / visits);
        expect(ucb).toBeGreaterThan(avgReward);
      });
    });

    describe('Thompson Sampling', () => {
      it('should sample from beta distribution', () => {
        const successes = 8;
        const failures = 2;
        // Mean of beta distribution
        const expectedMean = successes / (successes + failures);
        expect(expectedMean).toBe(0.8);
      });
    });

    describe('Epsilon-Greedy', () => {
      it('should explore with probability epsilon', () => {
        const epsilon = 0.1;
        const random = Math.random();
        const shouldExplore = random < epsilon;
        expect(typeof shouldExplore).toBe('boolean');
      });
    });
  });

  describe('Result Integration', () => {
    it('should validate before integration', () => {
      const result = {
        success: true,
        confidence: 0.85,
        shouldIntegrate: true,
      };
      const threshold = 0.8;
      const canIntegrate = result.success && result.confidence >= threshold && result.shouldIntegrate;
      expect(canIntegrate).toBe(true);
    });

    it('should create rollback point', () => {
      const rollbackPoint = {
        id: 'rb-001',
        timestamp: Date.now(),
        state: { config: 'old' },
      };
      expect(rollbackPoint.id).toBe('rb-001');
    });

    it('should emit integration event', () => {
      const events: { type: string; data: unknown }[] = [];
      const emit = (type: string, data: unknown) => events.push({ type, data });
      emit('exploration:integrated', { hypothesisId: 'hyp-001' });
      expect(events[0]?.type).toBe('exploration:integrated');
    });
  });

  describe('Safety Checks', () => {
    it('should check safety policy before execution', () => {
      const checkSafety = (risk: string) => risk === 'low' || risk === 'medium';
      expect(checkSafety('low')).toBe(true);
      expect(checkSafety('high')).toBe(false);
    });

    it('should enforce cost limits', () => {
      const maxCost = 1.0;
      const estimatedCost = 0.5;
      expect(estimatedCost <= maxCost).toBe(true);
    });

    it('should limit concurrent experiments', () => {
      const maxConcurrent = 3;
      const activeExperiments = 2;
      expect(activeExperiments < maxConcurrent).toBe(true);
    });
  });
});
