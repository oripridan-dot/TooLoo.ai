// @version 3.3.573
/**
 * @file zhipu-provider.test.ts
 * @description Unit tests for ZhiPu GLM-4 provider integration
 * @version 3.3.510
 *
 * Tests cover:
 * - Provider configuration
 * - Model selection
 * - Streaming functionality
 * - Provider availability
 * - Cost estimation
 */

import { describe, it, expect, vi } from 'vitest';
import LLMProvider from '../../../../src/precog/providers/llm-provider.js';

describe('ZhiPu GLM Provider', () => {
  describe('Provider Configuration', () => {
    it('should define zhipu provider builder', () => {
      const provider = new LLMProvider();
      expect(provider).toBeDefined();
    });

    it('should include zhipu in defaultModel', () => {
      const provider = new LLMProvider();
      expect(provider.defaultModel).toBeDefined();
      expect(provider.defaultModel.zhipu).toBeDefined();
      expect(typeof provider.defaultModel.zhipu).toBe('string');
    });

    it('should have glm-4-flash as default model', () => {
      const provider = new LLMProvider();
      // Default is glm-4-flash unless overridden by env
      expect(provider.defaultModel.zhipu).toMatch(/glm-4/);
    });

    it('should include zhipu in providers object', () => {
      const provider = new LLMProvider();
      expect('zhipu' in provider.providers).toBe(true);
    });
  });

  describe('API Key Detection', () => {
    it('should return boolean for zhipu availability', () => {
      const provider = new LLMProvider();
      expect(typeof provider.providers.zhipu).toBe('boolean');
    });

    it('should have zhipu key in providers', () => {
      const provider = new LLMProvider();
      expect(provider.providers).toHaveProperty('zhipu');
    });
  });

  describe('Model Selection', () => {
    it('should list GLM models in provider status', () => {
      const provider = new LLMProvider();
      const status = provider.getProviderStatus();

      const glmModels = status.filter((s: any) => s.id.startsWith('zhipu-'));
      expect(glmModels.length).toBeGreaterThan(0);
    });

    it('should include glm-4-flash in provider status', () => {
      const provider = new LLMProvider();
      const status = provider.getProviderStatus();

      const flashModel = status.find((s: any) => s.model === 'glm-4-flash');
      expect(flashModel).toBeDefined();
      expect(flashModel?.name).toBe('GLM-4 Flash');
    });

    it('should include glm-4-plus in provider status', () => {
      const provider = new LLMProvider();
      const status = provider.getProviderStatus();

      const plusModel = status.find((s: any) => s.model === 'glm-4-plus');
      expect(plusModel).toBeDefined();
      expect(plusModel?.name).toBe('GLM-4 Plus');
    });

    it('should include glm-4v vision model in provider status', () => {
      const provider = new LLMProvider();
      const status = provider.getProviderStatus();

      const visionModel = status.find((s: any) => s.model === 'glm-4v');
      expect(visionModel).toBeDefined();
      expect(visionModel?.name).toBe('GLM-4V (Vision)');
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate cost for zhipu provider', () => {
      const provider = new LLMProvider();

      const cost = provider.estimateCost('zhipu', 1000);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.01); // GLM-4 Flash is very affordable
    });

    it('should return lower cost than premium providers', () => {
      const provider = new LLMProvider();

      const zhipuCost = provider.estimateCost('zhipu', 1000);
      const openaiCost = provider.estimateCost('openai', 1000);
      const anthropicCost = provider.estimateCost('anthropic', 1000);

      expect(zhipuCost).toBeLessThan(openaiCost);
      expect(zhipuCost).toBeLessThan(anthropicCost);
    });
  });

  describe('Model Name Display', () => {
    it('should return model name for UI display', () => {
      const provider = new LLMProvider();

      const modelName = provider.getModelName('zhipu');
      expect(modelName).toBeDefined();
      expect(typeof modelName).toBe('string');
      expect(modelName.length).toBeGreaterThan(0);
    });
  });

  describe('Provider Selection', () => {
    it('should include zhipu in providers object', () => {
      const provider = new LLMProvider();
      const providers = provider.providers;
      expect('zhipu' in providers).toBe(true);
    });

    it('should have selectProvider method', () => {
      const provider = new LLMProvider();
      expect(typeof provider.selectProvider).toBe('function');
    });
  });

  describe('Streaming Configuration', () => {
    it('should have streamZhipu method defined', () => {
      const provider = new LLMProvider();
      expect(typeof provider.streamZhipu).toBe('function');
    });

    it('should have correct streamZhipu signature', () => {
      const provider = new LLMProvider();
      // Method should accept 4 parameters: prompt, system, history, onChunk
      expect(provider.streamZhipu.length).toBe(4);
    });
  });

  describe('API Endpoint Configuration', () => {
    it('should have provider defined', () => {
      const provider = new LLMProvider();
      expect(provider).toBeDefined();
      expect(provider.defaultModel.zhipu).toBeDefined();
    });
  });

  describe('GLM Model Variants', () => {
    it('should support glm-4-flash model', () => {
      const provider = new LLMProvider();
      const status = provider.getProviderStatus();

      expect(status.some((s: any) => s.model === 'glm-4-flash')).toBe(true);
    });

    it('should support glm-4-plus model', () => {
      const provider = new LLMProvider();
      const status = provider.getProviderStatus();

      expect(status.some((s: any) => s.model === 'glm-4-plus')).toBe(true);
    });

    it('should support glm-4v vision model', () => {
      const provider = new LLMProvider();
      const status = provider.getProviderStatus();

      expect(status.some((s: any) => s.model === 'glm-4v')).toBe(true);
    });

    it('should support glm-4-0520 model', () => {
      const provider = new LLMProvider();
      const status = provider.getProviderStatus();

      expect(status.some((s: any) => s.model === 'glm-4-0520')).toBe(true);
    });
  });
});

describe('ZhiPu Provider Builder Integration', () => {
  it('should have zhipu in providers', () => {
    const provider = new LLMProvider();

    // Verify provider is properly configured
    expect('zhipu' in provider.providers).toBe(true);
    expect(provider.defaultModel.zhipu).toBeDefined();
  });

  it('should have available method', () => {
    const provider = new LLMProvider();

    // Verify available method exists
    expect(typeof provider.available).toBe('function');
  });

  it('should have all required methods for zhipu', () => {
    const provider = new LLMProvider();

    // Verify all provider methods exist
    expect(typeof provider.streamZhipu).toBe('function');
    expect(typeof provider.getModelName).toBe('function');
    expect(typeof provider.estimateCost).toBe('function');
    expect(typeof provider.getProviderStatus).toBe('function');
  });
});
