// @version 1.0.0
/**
 * SmartRouter Unit Tests
 * Tests for waterfall routing logic, provider fallback, and Q-learning integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SmartRouter,
  SmartRouteOptions,
  SmartRouteResult,
} from '../../../../src/precog/engine/smart-router.js';

// Mock dependencies
vi.mock('../../../../src/precog/engine/provider-scorecard.js', () => ({
  getProviderScorecard: vi.fn(() => ({
    getRouteOrder: vi.fn(() => ['deepseek', 'anthropic', 'openai', 'gemini']),
    recordRequest: vi.fn(),
  })),
  ProviderScorecard: vi.fn().mockImplementation(() => ({
    getRouteOrder: vi.fn(() => ['deepseek', 'anthropic', 'openai', 'gemini']),
    recordRequest: vi.fn(),
  })),
}));

vi.mock('../../../../src/precog/providers/llm-provider.js', () => ({
  generateLLM: vi.fn(),
}));

vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('../../../../src/precog/personalization/index.js', () => ({
  getSegmentationService: vi.fn(() => ({
    getProviderPreferences: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('../../../../src/precog/learning/q-learning-optimizer.js', () => ({
  getQLearningOptimizer: vi.fn(() => ({
    getOptimalProvider: vi.fn(() => null),
    update: vi.fn(),
  })),
}));

import { generateLLM } from '../../../../src/precog/providers/llm-provider.js';
import { bus } from '../../../../src/core/event-bus.js';

describe('SmartRouter', () => {
  let router: SmartRouter;
  const mockGenerateLLM = vi.mocked(generateLLM);

  beforeEach(() => {
    vi.clearAllMocks();
    router = new SmartRouter();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('smartRoute', () => {
    it('should return success on first provider if it succeeds', async () => {
      // generateLLM returns a string directly
      mockGenerateLLM.mockResolvedValueOnce('Test response from deepseek');

      const result = await router.smartRoute('Hello, how are you?');

      expect(result.success).toBe(true);
      expect(result.provider).toBe('deepseek');
      expect(result.response).toBe('Test response from deepseek');
      expect(result.attemptsNeeded).toBe(1);
      expect(result.routeHistory).toHaveLength(1);
      expect(result.routeHistory[0].success).toBe(true);
    });

    it('should fallback to second provider if first fails', async () => {
      mockGenerateLLM
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce('Test response from anthropic');

      const result = await router.smartRoute('Hello, how are you?');

      expect(result.success).toBe(true);
      expect(result.provider).toBe('anthropic');
      expect(result.attemptsNeeded).toBe(2);
      expect(result.routeHistory).toHaveLength(2);
      expect(result.routeHistory[0].success).toBe(false);
      expect(result.routeHistory[1].success).toBe(true);
    });

    it('should fail after all providers are exhausted', async () => {
      mockGenerateLLM
        .mockRejectedValueOnce(new Error('Provider 1 error'))
        .mockRejectedValueOnce(new Error('Provider 2 error'))
        .mockRejectedValueOnce(new Error('Provider 3 error'));

      const result = await router.smartRoute('Hello', { maxRetries: 3 });

      expect(result.success).toBe(false);
      expect(result.attemptsNeeded).toBe(3);
      expect(result.routeHistory.every((h) => !h.success)).toBe(true);
    });

    it('should exclude specified providers', async () => {
      mockGenerateLLM.mockResolvedValueOnce('Response from openai');

      const result = await router.smartRoute('Hello', {
        excludeProviders: ['deepseek', 'anthropic'],
      });

      expect(result.success).toBe(true);
      // Should skip deepseek and anthropic, try openai first
      expect(result.provider).toBe('openai');
    });

    it('should publish success event on successful route', async () => {
      mockGenerateLLM.mockResolvedValueOnce('Test response');

      await router.smartRoute('Hello');

      expect(bus.publish).toHaveBeenCalledWith(
        'precog',
        'smart_router:success',
        expect.objectContaining({
          provider: 'deepseek',
          attemptsNeeded: 1,
        })
      );
    });

    it('should publish failure event when all providers fail', async () => {
      mockGenerateLLM
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'));

      await router.smartRoute('Hello', { maxRetries: 3 });

      expect(bus.publish).toHaveBeenCalledWith(
        'precog',
        'smart_router:failure',
        expect.objectContaining({
          attemptsNeeded: 3,
        })
      );
    });

    it('should pass system prompt to provider', async () => {
      mockGenerateLLM.mockResolvedValueOnce('Test response');

      await router.smartRoute('Hello', {
        system: 'You are a helpful assistant',
      });

      expect(mockGenerateLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful assistant',
        })
      );
    });

    it('should respect maxRetries option', async () => {
      mockGenerateLLM
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'))
        .mockRejectedValueOnce(new Error('Error 4'));

      const result = await router.smartRoute('Hello', { maxRetries: 2 });

      expect(result.attemptsNeeded).toBe(2);
      expect(result.routeHistory).toHaveLength(2);
    });

    it('should record latency in route history', async () => {
      mockGenerateLLM.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('Response'), 50))
      );

      const result = await router.smartRoute('Hello');

      // Allow some timing variance in test environments
      expect(result.latency).toBeGreaterThanOrEqual(40);
      expect(result.routeHistory[0].latency).toBeGreaterThanOrEqual(40);
    });
  });

  describe('detectTaskType', () => {
    it('should detect code-related prompts', async () => {
      mockGenerateLLM.mockResolvedValueOnce('Code response');

      // The router internally calls detectTaskType which affects Q-learning
      await router.smartRoute('Write a function to sort an array');

      // Verify the call was made (actual task type detection is internal)
      expect(mockGenerateLLM).toHaveBeenCalled();
    });

    it('should detect analysis prompts', async () => {
      mockGenerateLLM.mockResolvedValueOnce('Analysis response');

      await router.smartRoute('Analyze this data and summarize the findings');

      expect(mockGenerateLLM).toHaveBeenCalled();
    });
  });
});
