// @version 3.3.573
/**
 * Unit tests for RuntimeConfig
 *
 * Tests the dynamic configuration management system that:
 * - Manages provider weights and model parameters
 * - Supports feature flags
 * - Persists configuration changes
 * - Notifies listeners of updates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RuntimeConfig,
  initRuntimeConfig,
  getRuntimeConfig,
} from '../../../../src/precog/engine/runtime-config';
import fs from 'fs/promises';
import path from 'path';

// Mock fs module
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

// Mock event bus
vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
  },
}));

describe('RuntimeConfig', () => {
  let config: RuntimeConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    config = new RuntimeConfig('/tmp/test-config.json');
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const weights = config.getProviderWeights();
      expect(weights.latency).toBe(0.4);
      expect(weights.cost).toBe(0.3);
      expect(weights.reliability).toBe(0.3);
    });

    it('should use custom config path if provided', async () => {
      const customConfig = new RuntimeConfig('/custom/path/config.json');
      (fs.readFile as any).mockRejectedValue(new Error('File not found'));

      await customConfig.load();

      // Should attempt to read from custom path
      expect(fs.readFile).toHaveBeenCalledWith('/custom/path/config.json', 'utf-8');
    });
  });

  describe('load', () => {
    it('should load config from disk if file exists', async () => {
      const savedConfig = {
        timestamp: 1234567890,
        version: '3.3.497',
        global: {
          providerWeights: { latency: 0.5, cost: 0.25, reliability: 0.25 },
          defaultModelConfig: {
            maxTokens: 4096,
            temperature: 0.8,
            topP: 0.95,
            frequencyPenalty: 0.1,
            presencePenalty: 0.1,
          },
          explorationRate: 0.2,
          updateFrequency: 30000,
          enabled: true,
        },
        providers: {},
        features: {},
        metadata: {
          optimizedBy: 'test',
          optimizationScore: 0.8,
          lastOptimizationTime: 1234567890,
          iterationCount: 5,
        },
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(savedConfig));

      const loaded = await config.load();

      expect(loaded.global.providerWeights.latency).toBe(0.5);
      expect(loaded.global.explorationRate).toBe(0.2);
    });

    it('should return defaults if file does not exist', async () => {
      (fs.readFile as any).mockRejectedValue(new Error('File not found'));

      const loaded = await config.load();

      expect(loaded.global.providerWeights.latency).toBe(0.4); // Default value
    });
  });

  describe('save', () => {
    it('should save config to disk', async () => {
      (fs.mkdir as any).mockResolvedValue(undefined);
      (fs.writeFile as any).mockResolvedValue(undefined);

      await config.save();

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should debounce rapid saves', async () => {
      (fs.mkdir as any).mockResolvedValue(undefined);
      (fs.writeFile as any).mockResolvedValue(undefined);

      // First save should work
      await config.save();

      // Immediate second save should be skipped (within debounce window)
      await config.save();

      // Should only have been called once
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProviderWeights', () => {
    it('should return current provider weights', () => {
      const weights = config.getProviderWeights();

      expect(weights).toHaveProperty('latency');
      expect(weights).toHaveProperty('cost');
      expect(weights).toHaveProperty('reliability');
    });

    it('should return a copy, not the original', () => {
      const weights1 = config.getProviderWeights();
      const weights2 = config.getProviderWeights();

      weights1.latency = 0.99;

      expect(weights2.latency).toBe(0.4); // Original unchanged
    });
  });

  describe('updateProviderWeights', () => {
    it('should update provider weights', () => {
      config.updateProviderWeights({ latency: 0.6 });

      const weights = config.getProviderWeights();
      expect(weights.latency).toBe(0.6);
      expect(weights.cost).toBe(0.3); // Unchanged
    });

    it('should track optimizer source', () => {
      config.updateProviderWeights({ latency: 0.6 }, 'neural-optimizer');

      const metadata = config.getMetadata();
      expect(metadata.optimizedBy).toBe('neural-optimizer');
    });

    it('should increment iteration count', () => {
      const initial = config.getMetadata().iterationCount;

      config.updateProviderWeights({ latency: 0.6 });

      expect(config.getMetadata().iterationCount).toBe(initial + 1);
    });
  });

  describe('getModelConfig', () => {
    it('should return default model config', () => {
      const modelConfig = config.getModelConfig();

      expect(modelConfig.maxTokens).toBe(2048);
      expect(modelConfig.temperature).toBe(0.7);
    });

    it('should return provider-specific config if set', () => {
      config.updateModelConfig({ maxTokens: 4096 }, 'openai');

      const openaiConfig = config.getModelConfig('openai');
      expect(openaiConfig.maxTokens).toBe(4096);

      const defaultConfig = config.getModelConfig();
      expect(defaultConfig.maxTokens).toBe(2048);
    });
  });

  describe('updateModelConfig', () => {
    it('should update global model config', () => {
      config.updateModelConfig({ temperature: 0.9 });

      const modelConfig = config.getModelConfig();
      expect(modelConfig.temperature).toBe(0.9);
    });

    it('should update provider-specific model config', () => {
      config.updateModelConfig({ maxTokens: 8192 }, 'anthropic');

      const anthropicConfig = config.getModelConfig('anthropic');
      expect(anthropicConfig.maxTokens).toBe(8192);
    });
  });

  describe('getProviderConfig', () => {
    it('should return provider-specific config', () => {
      const deepseekConfig = config.getProviderConfig('deepseek');

      expect(deepseekConfig.enabled).toBe(true);
      expect(deepseekConfig.priority).toBe(1);
    });

    it('should return default config for unknown provider', () => {
      const unknownConfig = config.getProviderConfig('unknown-provider');

      expect(unknownConfig.enabled).toBe(true);
      expect(unknownConfig.weights).toBeDefined();
    });
  });

  describe('updateProviderConfig', () => {
    it('should update provider config', () => {
      config.updateProviderConfig('openai', { priority: 1, timeout: 60000 });

      const openaiConfig = config.getProviderConfig('openai');
      expect(openaiConfig.priority).toBe(1);
      expect(openaiConfig.timeout).toBe(60000);
    });

    it('should disable a provider', () => {
      config.updateProviderConfig('gemini', { enabled: false });

      const geminiConfig = config.getProviderConfig('gemini');
      expect(geminiConfig.enabled).toBe(false);
    });
  });

  describe('exploration rate', () => {
    it('should get exploration rate', () => {
      const rate = config.getExplorationRate();
      expect(rate).toBe(0.1); // Default
    });

    it('should set exploration rate', () => {
      config.setExplorationRate(0.3, 'q-learning');

      expect(config.getExplorationRate()).toBe(0.3);
      expect(config.getMetadata().optimizedBy).toBe('q-learning');
    });

    it('should clamp exploration rate to valid range', () => {
      config.setExplorationRate(1.5);
      expect(config.getExplorationRate()).toBe(1);

      config.setExplorationRate(-0.5);
      expect(config.getExplorationRate()).toBe(0);
    });
  });

  describe('feature flags', () => {
    it('should check if feature is enabled', () => {
      expect(config.isFeatureEnabled('smartRouting')).toBe(true);
      expect(config.isFeatureEnabled('explorationMode')).toBe(false);
    });

    it('should return false for unknown features', () => {
      expect(config.isFeatureEnabled('unknownFeature')).toBe(false);
    });

    it('should enable/disable features', () => {
      config.setFeature('explorationMode', true);
      expect(config.isFeatureEnabled('explorationMode')).toBe(true);

      config.setFeature('smartRouting', false);
      expect(config.isFeatureEnabled('smartRouting')).toBe(false);
    });

    it('should track optimizer when setting features', () => {
      config.setFeature('newFeature', true, 'auto-optimizer');

      expect(config.getMetadata().optimizedBy).toBe('auto-optimizer');
    });
  });

  describe('optimization score', () => {
    it('should get optimization score', () => {
      const score = config.getOptimizationScore();
      expect(score).toBe(0.5); // Default
    });

    it('should set optimization score', () => {
      config.setOptimizationScore(0.85, 'meta-learning');

      expect(config.getOptimizationScore()).toBe(0.85);
    });

    it('should clamp score to valid range', () => {
      config.setOptimizationScore(1.5);
      expect(config.getOptimizationScore()).toBe(1);

      config.setOptimizationScore(-0.2);
      expect(config.getOptimizationScore()).toBe(0);
    });
  });

  describe('getConfig', () => {
    it('should return full config copy', () => {
      const fullConfig = config.getConfig();

      expect(fullConfig).toHaveProperty('global');
      expect(fullConfig).toHaveProperty('providers');
      expect(fullConfig).toHaveProperty('features');
      expect(fullConfig).toHaveProperty('metadata');
    });

    it('should return a deep copy', () => {
      const config1 = config.getConfig();
      config1.global.providerWeights.latency = 0.99;

      const config2 = config.getConfig();
      expect(config2.global.providerWeights.latency).toBe(0.4); // Original unchanged
    });
  });

  describe('resetToDefaults', () => {
    it('should reset all values to defaults', () => {
      // Modify some values
      config.updateProviderWeights({ latency: 0.9 });
      config.setExplorationRate(0.5);
      config.setFeature('smartRouting', false);

      // Reset
      config.resetToDefaults();

      // Verify defaults restored
      expect(config.getProviderWeights().latency).toBe(0.4);
      expect(config.getExplorationRate()).toBe(0.1);
      expect(config.isFeatureEnabled('smartRouting')).toBe(true);
    });

    it('should reset iteration count', () => {
      config.updateProviderWeights({ latency: 0.9 });
      config.updateProviderWeights({ cost: 0.5 });

      config.resetToDefaults();

      expect(config.getMetadata().iterationCount).toBe(0);
    });

    it('should track reset source', () => {
      config.resetToDefaults('user-request');

      expect(config.getMetadata().optimizedBy).toBe('user-request');
    });
  });

  describe('onChange', () => {
    it('should register callback for changes', () => {
      const callback = vi.fn();

      config.onChange(callback);
      config.updateProviderWeights({ latency: 0.6 });

      expect(callback).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();

      const unsubscribe = config.onChange(callback);
      config.updateProviderWeights({ latency: 0.6 });
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      config.updateProviderWeights({ latency: 0.7 });
      expect(callback).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should pass config copy to callback', () => {
      let receivedConfig: any = null;

      config.onChange((cfg) => {
        receivedConfig = cfg;
      });

      config.updateProviderWeights({ latency: 0.6 });

      expect(receivedConfig).not.toBeNull();
      expect(receivedConfig.global.providerWeights.latency).toBe(0.6);
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = vi.fn();

      config.onChange(errorCallback);
      config.onChange(normalCallback);

      // Should not throw
      expect(() => {
        config.updateProviderWeights({ latency: 0.6 });
      }).not.toThrow();

      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('getMetadata', () => {
    it('should return metadata about optimization', () => {
      const metadata = config.getMetadata();

      expect(metadata).toHaveProperty('optimizedBy');
      expect(metadata).toHaveProperty('optimizationScore');
      expect(metadata).toHaveProperty('lastOptimizationTime');
      expect(metadata).toHaveProperty('iterationCount');
    });

    it('should return a copy', () => {
      const metadata1 = config.getMetadata();
      metadata1.optimizationScore = 0.99;

      const metadata2 = config.getMetadata();
      expect(metadata2.optimizationScore).toBe(0.5); // Original unchanged
    });
  });

  describe('flush', () => {
    it('should save when dirty', async () => {
      (fs.mkdir as any).mockResolvedValue(undefined);
      (fs.writeFile as any).mockResolvedValue(undefined);

      // Make a change (sets isDirty)
      config.updateProviderWeights({ latency: 0.6 });

      // Flush should save if dirty
      await config.flush();

      // writeFile should have been called
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });
});

describe('Singleton functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initRuntimeConfig should create instance', () => {
    const instance = initRuntimeConfig('/tmp/singleton-test.json');
    expect(instance).toBeInstanceOf(RuntimeConfig);
  });

  it('getRuntimeConfig should return singleton', () => {
    const instance1 = getRuntimeConfig();
    const instance2 = getRuntimeConfig();

    expect(instance1).toBe(instance2);
  });
});
