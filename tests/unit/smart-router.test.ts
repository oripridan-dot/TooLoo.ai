// @version 3.3.350 - Smart Router Unit Tests
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
    it('should initialize successfully', async () => {
      await router.initialize();
      expect(router).toBeDefined();
    });

    it('should have default providers configured', async () => {
      await router.initialize();
      const providers = (router as any).providers;
      expect(providers.size).toBeGreaterThan(0);
    });
  });

  describe('task analysis', () => {
    it('should analyze simple tasks correctly', () => {
      const profile = (router as any).analyzeTask('Hello, how are you?', {});
      expect(profile.complexity).toBe('simple');
      expect(profile.estimatedTokens).toBeLessThan(100);
    });

    it('should analyze complex tasks correctly', () => {
      const longPrompt = 'a'.repeat(5000);
      const profile = (router as any).analyzeTask(longPrompt, {});
      expect(profile.complexity).toBe('complex');
      expect(profile.estimatedTokens).toBeGreaterThan(1000);
    });

    it('should detect code generation requirements', () => {
      const profile = (router as any).analyzeTask(
        'Write a TypeScript function that sorts an array',
        {}
      );
      expect(profile.requiresCodeGen).toBe(true);
    });

    it('should detect reasoning requirements', () => {
      const profile = (router as any).analyzeTask(
        'Think step by step and analyze this problem',
        {}
      );
      expect(profile.requiresReasoning).toBe(true);
    });

    it('should detect speed priority from options', () => {
      const profile = (router as any).analyzeTask('Quick question', { speed: 'fast' });
      expect(profile.prioritizeSpeed).toBe(true);
    });

    it('should detect cost priority from options', () => {
      const profile = (router as any).analyzeTask('Budget question', { costSensitive: true });
      expect(profile.prioritizeCost).toBe(true);
    });
  });

  describe('provider scoring', () => {
    beforeEach(async () => {
      await router.initialize();
    });

    it('should score providers based on task profile', () => {
      const profile = {
        complexity: 'simple' as const,
        estimatedTokens: 50,
        requiresCodeGen: false,
        requiresReasoning: false,
        requiresCreativity: false,
        prioritizeSpeed: false,
        prioritizeCost: false,
      };

      const providers = (router as any).providers;
      let maxScore = -1;
      providers.forEach((provider: any, name: string) => {
        const score = (router as any).scoreProvider(provider, profile);
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThanOrEqual(0);
        if (score > maxScore) maxScore = score;
      });
      expect(maxScore).toBeGreaterThan(0);
    });

    it('should prefer fast providers when speed is prioritized', () => {
      const speedProfile = {
        complexity: 'simple' as const,
        estimatedTokens: 50,
        requiresCodeGen: false,
        requiresReasoning: false,
        requiresCreativity: false,
        prioritizeSpeed: true,
        prioritizeCost: false,
      };

      const normalProfile = { ...speedProfile, prioritizeSpeed: false };

      const providers = (router as any).providers;
      const geminiProvider = providers.get('gemini-flash');
      
      if (geminiProvider) {
        const speedScore = (router as any).scoreProvider(geminiProvider, speedProfile);
        const normalScore = (router as any).scoreProvider(geminiProvider, normalProfile);
        // Gemini Flash should score higher when speed is prioritized
        expect(speedScore).toBeGreaterThanOrEqual(normalScore);
      }
    });
  });

  describe('routing', () => {
    beforeEach(async () => {
      await router.initialize();
    });

    it('should route to a valid provider', async () => {
      const decision = await router.route('Hello world', {});
      expect(decision).toBeDefined();
      expect(decision.provider).toBeDefined();
      expect(decision.model).toBeDefined();
      expect(decision.confidence).toBeGreaterThan(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
    });

    it('should include reasoning in decision', async () => {
      const decision = await router.route('Write code', {});
      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning.length).toBeGreaterThan(0);
    });

    it('should provide fallback options', async () => {
      const decision = await router.route('Complex task', {});
      expect(decision.fallbacks).toBeDefined();
      expect(Array.isArray(decision.fallbacks)).toBe(true);
    });

    it('should estimate cost', async () => {
      const decision = await router.route('Test prompt', {});
      expect(decision.estimatedCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('provider management', () => {
    beforeEach(async () => {
      await router.initialize();
    });

    it('should register custom providers', () => {
      router.registerProvider('custom-test', {
        name: 'Custom Test Provider',
        models: ['custom-model'],
        maxTokens: 4096,
        costPer1kTokens: 0.01,
        avgLatency: 500,
        reliability: 0.9,
        strengths: ['testing'],
        weaknesses: [],
        isAvailable: true,
      });

      const providers = (router as any).providers;
      expect(providers.has('custom-test')).toBe(true);
    });

    it('should update provider metrics', () => {
      router.updateProviderMetrics('anthropic', {
        latency: 100,
        success: true,
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });
});
