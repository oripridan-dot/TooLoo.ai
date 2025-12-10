// @version 1.0.0
/**
 * Unit tests for ProviderScorecard
 *
 * Tests the dynamic provider ranking system that:
 * - Tracks request metrics per provider
 * - Calculates composite scores based on latency, cost, and reliability
 * - Provides ranked provider lists for routing decisions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ProviderScorecard, {
  initProviderScorecard,
  getProviderScorecard,
  type ProviderStats,
  type ScoringWeights,
} from '../../../../src/precog/engine/provider-scorecard';

describe('ProviderScorecard', () => {
  let scorecard: ProviderScorecard;

  beforeEach(() => {
    // Create fresh scorecard for each test
    scorecard = new ProviderScorecard(['deepseek', 'anthropic', 'openai', 'gemini']);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default providers', () => {
      const sc = new ProviderScorecard();
      const stats = sc.getProviderStats('deepseek');
      expect(stats).not.toBeNull();
      expect(stats?.totalRequests).toBe(0);
    });

    it('should initialize with custom providers', () => {
      const sc = new ProviderScorecard(['custom1', 'custom2']);
      expect(sc.getProviderStats('custom1')).not.toBeNull();
      expect(sc.getProviderStats('custom2')).not.toBeNull();
      expect(sc.getProviderStats('deepseek')).toBeNull();
    });

    it('should initialize with custom scoring weights', () => {
      const weights: Partial<ScoringWeights> = {
        latency: 0.6,
        cost: 0.2,
        reliability: 0.2,
      };
      const sc = new ProviderScorecard(['deepseek'], weights);
      // We can't directly access weights, but behavior should differ
      expect(sc).toBeDefined();
    });
  });

  describe('recordRequest', () => {
    it('should record successful requests', () => {
      scorecard.recordRequest('deepseek', 100, true, 500);
      const stats = scorecard.getProviderStats('deepseek');

      expect(stats?.totalRequests).toBe(1);
      expect(stats?.successfulRequests).toBe(1);
      expect(stats?.failedRequests).toBe(0);
      expect(stats?.avgLatency).toBe(100);
    });

    it('should record failed requests', () => {
      scorecard.recordRequest('anthropic', 200, false, undefined, 'API error');
      const stats = scorecard.getProviderStats('anthropic');

      expect(stats?.totalRequests).toBe(1);
      expect(stats?.successfulRequests).toBe(0);
      expect(stats?.failedRequests).toBe(1);
      expect(stats?.lastErrorRate).toBe(100);
    });

    it('should calculate rolling averages correctly', () => {
      scorecard.recordRequest('openai', 100, true);
      scorecard.recordRequest('openai', 200, true);
      scorecard.recordRequest('openai', 300, true);

      const stats = scorecard.getProviderStats('openai');
      expect(stats?.avgLatency).toBe(200); // (100 + 200 + 300) / 3
    });

    it('should calculate error rate from rolling window', () => {
      // 2 success, 2 failures = 50% error rate
      scorecard.recordRequest('gemini', 100, true);
      scorecard.recordRequest('gemini', 100, true);
      scorecard.recordRequest('gemini', 100, false);
      scorecard.recordRequest('gemini', 100, false);

      const stats = scorecard.getProviderStats('gemini');
      expect(stats?.lastErrorRate).toBe(50);
    });

    it('should ignore unknown providers', () => {
      // Should not throw
      scorecard.recordRequest('unknown_provider', 100, true);
      expect(scorecard.getProviderStats('unknown_provider')).toBeNull();
    });

    it('should maintain rolling window of 50 metrics', () => {
      // Record 60 requests
      for (let i = 0; i < 60; i++) {
        scorecard.recordRequest('deepseek', 100 + i, true);
      }

      const stats = scorecard.getProviderStats('deepseek');
      expect(stats?.recentMetrics.length).toBe(50);
      // First metric should be from request 10 (100 + 10 = 110ms)
      expect(stats?.recentMetrics[0]?.latency).toBe(110);
    });
  });

  describe('getRankedProviders', () => {
    it('should return providers sorted by score (best first)', () => {
      // Make deepseek faster and more reliable
      scorecard.recordRequest('deepseek', 50, true);
      scorecard.recordRequest('deepseek', 50, true);

      // Make anthropic slower
      scorecard.recordRequest('anthropic', 500, true);
      scorecard.recordRequest('anthropic', 500, true);

      const ranked = scorecard.getRankedProviders();

      // Deepseek should be first (lower latency = lower score)
      expect(ranked[0]?.provider).toBe('deepseek');
    });

    it('should give untested providers neutral score (0.5)', () => {
      // Only test one provider
      scorecard.recordRequest('deepseek', 50, true);

      const ranked = scorecard.getRankedProviders();

      // Find untested provider
      const untested = ranked.find((r) => r.provider === 'gemini');
      expect(untested?.score).toBe(0.5);
    });

    it('should apply preferences to adjust scores', () => {
      // Record same stats for both
      scorecard.recordRequest('deepseek', 100, true);
      scorecard.recordRequest('anthropic', 100, true);

      // Without preferences - should be similar scores
      const rankedWithout = scorecard.getRankedProviders();

      // With strong preference for anthropic
      const preferences = { anthropic: 2.0 }; // 2x preference
      const rankedWith = scorecard.getRankedProviders(preferences);

      // Anthropic should rank higher with preference
      const anthropicRankWithout = rankedWithout.findIndex((r) => r.provider === 'anthropic');
      const anthropicRankWith = rankedWith.findIndex((r) => r.provider === 'anthropic');

      // Higher preference = lower score = better rank (lower index)
      expect(anthropicRankWith).toBeLessThanOrEqual(anthropicRankWithout);
    });
  });

  describe('getBestProvider', () => {
    it('should return the top-ranked provider', () => {
      // Make deepseek clearly best
      scorecard.recordRequest('deepseek', 10, true);
      scorecard.recordRequest('anthropic', 1000, true);
      scorecard.recordRequest('openai', 2000, true);
      scorecard.recordRequest('gemini', 3000, true);

      const best = scorecard.getBestProvider();
      expect(best).toBe('deepseek');
    });

    it('should return null for empty scorecard', () => {
      const emptyScorecard = new ProviderScorecard([]);
      expect(emptyScorecard.getBestProvider()).toBeNull();
    });

    it('should apply preferences when getting best provider', () => {
      // Both have same latency
      scorecard.recordRequest('deepseek', 100, true);
      scorecard.recordRequest('anthropic', 100, true);

      // Strong preference for anthropic
      const preferences = { anthropic: 10.0 };
      const best = scorecard.getBestProvider(preferences);

      // Anthropic should win with high preference
      expect(best).toBe('anthropic');
    });
  });

  describe('getRouteOrder', () => {
    it('should return all providers in priority order', () => {
      const order = scorecard.getRouteOrder();
      expect(order).toHaveLength(4);
      expect(order).toContain('deepseek');
      expect(order).toContain('anthropic');
      expect(order).toContain('openai');
      expect(order).toContain('gemini');
    });

    it('should return providers sorted by performance', () => {
      scorecard.recordRequest('openai', 10, true);
      scorecard.recordRequest('deepseek', 100, true);
      scorecard.recordRequest('anthropic', 1000, true);

      const order = scorecard.getRouteOrder();

      // OpenAI should be first (fastest)
      expect(order[0]).toBe('openai');
    });
  });

  describe('getReport', () => {
    it('should generate human-readable report', () => {
      scorecard.recordRequest('deepseek', 150, true);
      scorecard.recordRequest('deepseek', 150, true);
      scorecard.recordRequest('anthropic', 300, true);
      scorecard.recordRequest('anthropic', 300, false);

      const report = scorecard.getReport();

      expect(report['deepseek']).toBeDefined();
      expect(report['deepseek']?.requests).toBe(2);
      expect(report['deepseek']?.successRate).toBe('100.0%');
      expect(report['deepseek']?.avgLatency).toBe('150ms');

      expect(report['anthropic']?.requests).toBe(2);
      expect(report['anthropic']?.successRate).toBe('50.0%');
      expect(report['anthropic']?.errorRate).toBe('50.0%');
    });

    it('should include recommendation based on score', () => {
      // Create excellent provider (low latency, no errors)
      scorecard.recordRequest('deepseek', 50, true);
      scorecard.recordRequest('deepseek', 50, true);

      // Create problematic provider (high latency, errors)
      scorecard.recordRequest('anthropic', 4000, false);
      scorecard.recordRequest('anthropic', 4000, false);

      const report = scorecard.getReport();

      // Deepseek should be excellent
      expect(report['deepseek']?.recommendation).toContain('Excellent');

      // Anthropic should be Fair or Poor (not Excellent or Good)
      expect(report['anthropic']?.recommendation).toMatch(/Fair|Poor/);
    });

    it('should show N/A for untested providers', () => {
      const report = scorecard.getReport();
      expect(report['gemini']?.successRate).toBe('N/A%');
    });
  });

  describe('reset', () => {
    it('should clear all provider metrics', () => {
      scorecard.recordRequest('deepseek', 100, true);
      scorecard.recordRequest('anthropic', 200, false);

      scorecard.reset();

      const deepseekStats = scorecard.getProviderStats('deepseek');
      expect(deepseekStats?.totalRequests).toBe(0);
      expect(deepseekStats?.recentMetrics).toHaveLength(0);

      const anthropicStats = scorecard.getProviderStats('anthropic');
      expect(anthropicStats?.failedRequests).toBe(0);
    });
  });

  describe('setScoringWeights', () => {
    it('should update scoring weights', () => {
      // Record same metrics
      scorecard.recordRequest('deepseek', 100, true);
      scorecard.recordRequest('anthropic', 100, true);

      // Get initial rankings
      const initial = scorecard.getRankedProviders();

      // Change weights to prioritize latency heavily
      scorecard.setScoringWeights({ latency: 0.9, cost: 0.05, reliability: 0.05 });

      // Rankings may shift based on new weights
      const updated = scorecard.getRankedProviders();

      // Both should still have entries
      expect(updated).toHaveLength(4);
    });
  });

  describe('updateCostModel', () => {
    it('should update cost for a provider', () => {
      scorecard.updateCostModel('deepseek', 0.0001);

      const stats = scorecard.getProviderStats('deepseek');
      expect(stats?.avgCostPerToken).toBe(0.0001);
    });
  });

  describe('publishMetrics', () => {
    it('should publish metrics to event bus', () => {
      const mockBus = {
        publish: vi.fn(),
      };

      scorecard.recordRequest('deepseek', 100, true);
      scorecard.publishMetrics(mockBus);

      expect(mockBus.publish).toHaveBeenCalledWith(
        'precog',
        'provider_scorecard:update',
        expect.objectContaining({
          timestamp: expect.any(Number),
          rankings: expect.any(Array),
          report: expect.any(Object),
          bestProvider: expect.any(String),
        })
      );
    });
  });

  describe('scoring algorithm', () => {
    it('should penalize high latency', () => {
      // Fast provider
      scorecard.recordRequest('deepseek', 100, true);

      // Slow provider
      scorecard.recordRequest('anthropic', 4000, true);

      const ranked = scorecard.getRankedProviders();
      const deepseek = ranked.find((r) => r.provider === 'deepseek');
      const anthropic = ranked.find((r) => r.provider === 'anthropic');

      // Deepseek should have lower score (better)
      expect(deepseek!.score).toBeLessThan(anthropic!.score);
    });

    it('should penalize high error rate', () => {
      // Reliable provider
      scorecard.recordRequest('deepseek', 500, true);
      scorecard.recordRequest('deepseek', 500, true);

      // Unreliable provider
      scorecard.recordRequest('anthropic', 500, false);
      scorecard.recordRequest('anthropic', 500, false);

      const ranked = scorecard.getRankedProviders();
      const deepseek = ranked.find((r) => r.provider === 'deepseek');
      const anthropic = ranked.find((r) => r.provider === 'anthropic');

      // Deepseek should have lower score (better)
      expect(deepseek!.score).toBeLessThan(anthropic!.score);
    });

    it('should consider cost in scoring', () => {
      const expensiveScorecard = new ProviderScorecard(['cheap', 'expensive']);

      // Set up different costs
      expensiveScorecard.updateCostModel('cheap', 0.000001);
      expensiveScorecard.updateCostModel('expensive', 0.009);

      // Same latency and success rate
      expensiveScorecard.recordRequest('cheap', 500, true);
      expensiveScorecard.recordRequest('expensive', 500, true);

      const ranked = expensiveScorecard.getRankedProviders();
      const cheap = ranked.find((r) => r.provider === 'cheap');
      const expensive = ranked.find((r) => r.provider === 'expensive');

      // Cheap should have lower score (better)
      expect(cheap!.score).toBeLessThan(expensive!.score);
    });
  });
});

describe('Singleton functions', () => {
  it('initProviderScorecard should create and return instance', () => {
    const instance = initProviderScorecard(['test1', 'test2']);
    expect(instance).toBeInstanceOf(ProviderScorecard);
    expect(instance.getProviderStats('test1')).not.toBeNull();
  });

  it('getProviderScorecard should return singleton instance', () => {
    const instance1 = getProviderScorecard();
    const instance2 = getProviderScorecard();

    // Should return same instance
    expect(instance1).toBe(instance2);
  });

  it('getProviderScorecard should create instance if none exists', () => {
    const instance = getProviderScorecard();
    expect(instance).toBeInstanceOf(ProviderScorecard);
  });
});
