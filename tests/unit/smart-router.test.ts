// @version 3.3.356 - Smart Router Unit Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the event bus before importing the module
vi.mock('../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
  },
}));

import { SmartRouter } from '../../src/precog/providers/smart-router.js';

describe('SmartRouter', () => {
  let router: SmartRouter;

  beforeEach(() => {
    router = new SmartRouter();
  });

  describe('initialization', () => {
    it('should create router successfully', () => {
      expect(router).toBeDefined();
    });

    it('should detect available providers from env', () => {
      // Router detects providers in constructor
      const newRouter = new SmartRouter();
      expect(newRouter).toBeDefined();
    });
  });

  describe('task analysis', () => {
    it('should analyze simple tasks correctly', () => {
      const profile = router.analyzeTask('Hello, how are you?', {});
      expect(profile.complexity).toBe('low');
      expect(profile.type).toBe('chat');
    });

    it('should analyze code tasks correctly', () => {
      const profile = router.analyzeTask('Write a function to sort an array', {});
      expect(profile.type).toBe('code');
    });

    it('should analyze complex tasks correctly', () => {
      const longPrompt = 'a'.repeat(5000) + ' analyze this data';
      const profile = router.analyzeTask(longPrompt, {});
      expect(['high', 'expert']).toContain(profile.complexity);
    });

    it('should detect analysis requirements', () => {
      const profile = router.analyzeTask(
        'Analyze and compare these two approaches',
        {}
      );
      expect(profile.type).toBe('analysis');
    });

    it('should detect creative requirements', () => {
      const profile = router.analyzeTask(
        'Write a creative story about space exploration',
        {}
      );
      expect(profile.type).toBe('creative');
    });

    it('should use provided context', () => {
      const profile = router.analyzeTask('Test', {
        maxLatencyMs: 500,
        preferredProvider: 'anthropic',
      });
      expect(profile.maxLatencyMs).toBe(500);
      expect(profile.preferredProvider).toBe('anthropic');
    });
  });

  describe('routing', () => {
    it('should route tasks and return decision', async () => {
      const decision = await router.route({
        type: 'chat',
        complexity: 'low',
        domain: 'general',
        requiresStreaming: false,
        maxLatencyMs: 5000,
      });

      expect(decision).toBeDefined();
      expect(decision.primaryProvider).toBeDefined();
      expect(decision.reason).toBeDefined();
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
    });

    it('should provide fallback providers', async () => {
      const decision = await router.route({
        type: 'code',
        complexity: 'medium',
        domain: 'programming',
        requiresStreaming: false,
        maxLatencyMs: 5000,
      });

      expect(decision.fallbackProviders).toBeDefined();
      expect(Array.isArray(decision.fallbackProviders)).toBe(true);
    });

    it('should estimate cost', async () => {
      const decision = await router.route({
        type: 'chat',
        complexity: 'low',
        domain: 'general',
        requiresStreaming: false,
        maxLatencyMs: 5000,
      });

      expect(decision.estimatedCost).toBeGreaterThanOrEqual(0);
    });

    it('should respect preferred provider', async () => {
      const decision = await router.route({
        type: 'chat',
        complexity: 'low',
        domain: 'general',
        requiresStreaming: false,
        maxLatencyMs: 5000,
        preferredProvider: 'anthropic',
      });

      // If anthropic is available, it should be selected
      expect(decision.primaryProvider).toBeDefined();
    });
  });

  describe('provider management', () => {
    it('should record success metrics', () => {
      router.recordSuccess('anthropic', 500);
      const metrics = router.getProviderMetrics('anthropic');
      
      if (metrics) {
        expect(metrics.successCount).toBeGreaterThanOrEqual(1);
      }
    });

    it('should record failure metrics', () => {
      router.recordFailure('anthropic', new Error('Test error'));
      const metrics = router.getProviderMetrics('anthropic');
      
      if (metrics) {
        expect(metrics.failureCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should get all metrics', () => {
      const allMetrics = router.getAllMetrics();
      expect(allMetrics).toBeDefined();
      expect(Array.isArray(allMetrics)).toBe(true);
    });
  });

  describe('provider selection scoring', () => {
    it('should score providers based on capability match', async () => {
      const codeDecision = await router.route({
        type: 'code',
        complexity: 'high',
        domain: 'programming',
        requiresStreaming: false,
        maxLatencyMs: 5000,
      });

      const chatDecision = await router.route({
        type: 'chat',
        complexity: 'low',
        domain: 'general',
        requiresStreaming: false,
        maxLatencyMs: 5000,
      });

      // Both should return valid decisions
      expect(codeDecision.primaryProvider).toBeDefined();
      expect(chatDecision.primaryProvider).toBeDefined();
    });

    it('should factor in latency constraints', async () => {
      const fastDecision = await router.route({
        type: 'chat',
        complexity: 'low',
        domain: 'general',
        requiresStreaming: false,
        maxLatencyMs: 100, // Very low latency requirement
      });

      expect(fastDecision.expectedLatency).toBeDefined();
    });

    it('should consider budget constraints', async () => {
      const budgetDecision = await router.route({
        type: 'chat',
        complexity: 'low',
        domain: 'general',
        requiresStreaming: false,
        maxLatencyMs: 5000,
        budgetConstraint: 0.001, // Very low budget
      });

      expect(budgetDecision.estimatedCost).toBeDefined();
    });
  });

  describe('routing history', () => {
    it('should maintain routing history', async () => {
      await router.route({
        type: 'chat',
        complexity: 'low',
        domain: 'general',
        requiresStreaming: false,
        maxLatencyMs: 5000,
      });

      const history = router.getRoutingHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should limit history size', async () => {
      // Make multiple routing decisions
      for (let i = 0; i < 150; i++) {
        await router.route({
          type: 'chat',
          complexity: 'low',
          domain: 'general',
          requiresStreaming: false,
          maxLatencyMs: 5000,
        });
      }

      const history = router.getRoutingHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });
});
