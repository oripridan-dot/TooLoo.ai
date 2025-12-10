// @version 3.3.498
/**
 * RuntimeConfig - Dynamic System Configuration Management
 * 
 * Phase 2: Self-Optimization
 * 
 * Allows AutonomousEvolutionEngine to write and read runtime configurations
 * that affect system behavior in real-time:
 * 
 * - Provider weights (latency, cost, reliability importance)
 * - Model parameters (max_tokens, temperature, top_p)
 * - Feature flags (enable/disable optimizations)
 * - Provider-specific overrides
 * - Learning parameters (exploration rate, update frequency)
 * 
 * This replaces hardcoded defaults with dynamically optimized values
 * that evolve based on actual system performance.
 */

import fs from 'fs/promises';
import path from 'path';
import { bus } from '../../core/event-bus.js';

interface ProviderWeights {
  latency: number;    // 0-1: importance of response speed
  cost: number;       // 0-1: importance of cost efficiency
  reliability: number; // 0-1: importance of success rate
}

interface ModelConfig {
  maxTokens: number;
  temperature: number; // 0-1: creativity/randomness
  topP: number;        // 0-1: nucleus sampling
  frequencyPenalty: number;
  presencePenalty: number;
}

interface ProviderConfig {
  enabled: boolean;
  weights?: ProviderWeights;
  modelConfig?: ModelConfig;
  priority?: number; // Manual override of automatic ranking
  timeout?: number;  // Provider-specific timeout
}

interface RuntimeConfigData {
  timestamp: number;
  version: string;
  global: {
    providerWeights: ProviderWeights;
    defaultModelConfig: ModelConfig;
    explorationRate: number; // 0-1: how much to try non-optimal providers
    updateFrequency: number; // ms between optimization checks
    enabled: boolean; // Master enable/disable
  };
  providers: {
    [provider: string]: ProviderConfig;
  };
  features: {
    [featureName: string]: boolean;
  };
  metadata: {
    optimizedBy: string; // Which system made last update
    optimizationScore: number; // How well optimized is current config
    lastOptimizationTime: number;
    iterationCount: number;
  };
}

export class RuntimeConfig {
  private config: RuntimeConfigData;
  private configPath: string;
  private updateCallbacks: Set<(config: RuntimeConfigData) => void> = new Set();
  private lastWriteTime = 0;
  private writeDebounceMs = 1000; // Don't write more than once per second
  private isDirty = false;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config', 'runtime.json');
    
    // Initialize with defaults
    this.config = this.getDefaultConfig();
  }

  /**
   * Load config from disk (called at startup)
   */
  async load(): Promise<RuntimeConfigData> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      console.log('[RuntimeConfig] Loaded from disk:', this.configPath);
      return this.config;
    } catch (error) {
      console.log('[RuntimeConfig] No saved config found, using defaults');
      return this.config;
    }
  }

  /**
   * Save config to disk (debounced to avoid excessive I/O)
   */
  async save(): Promise<void> {
    const now = Date.now();
    
    // Skip if wrote recently
    if (now - this.lastWriteTime < this.writeDebounceMs) {
      this.isDirty = true;
      return;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(this.configPath);
      await fs.mkdir(dir, { recursive: true });
      
      this.config.timestamp = now;
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
      
      this.lastWriteTime = now;
      this.isDirty = false;
      
      console.log('[RuntimeConfig] Saved to disk');
      bus.publish('config:updated', this.config);
    } catch (error) {
      console.error('[RuntimeConfig] Save failed:', error);
    }
  }

  /**
   * Force flush pending writes
   */
  async flush(): Promise<void> {
    if (this.isDirty) {
      await this.save();
    }
  }

  /**
   * Get current provider weights
   */
  getProviderWeights(): ProviderWeights {
    return { ...this.config.global.providerWeights };
  }

  /**
   * Update provider weights based on optimization analysis
   */
  updateProviderWeights(weights: Partial<ProviderWeights>, optimizer?: string): void {
    this.config.global.providerWeights = {
      ...this.config.global.providerWeights,
      ...weights,
    };
    
    this.config.metadata.optimizedBy = optimizer || 'manual';
    this.config.metadata.lastOptimizationTime = Date.now();
    this.config.metadata.iterationCount++;
    
    this.notifyUpdates();
    this.isDirty = true;
  }

  /**
   * Get model config for a provider
   */
  getModelConfig(provider?: string): ModelConfig {
    if (provider && this.config.providers[provider]?.modelConfig) {
      return { ...this.config.providers[provider].modelConfig! };
    }
    return { ...this.config.global.defaultModelConfig };
  }

  /**
   * Update model config
   */
  updateModelConfig(config: Partial<ModelConfig>, provider?: string, optimizer?: string): void {
    if (provider && this.config.providers[provider]) {
      this.config.providers[provider].modelConfig = {
        ...this.getModelConfig(provider),
        ...config,
      };
    } else {
      this.config.global.defaultModelConfig = {
        ...this.config.global.defaultModelConfig,
        ...config,
      };
    }
    
    this.config.metadata.optimizedBy = optimizer || 'manual';
    this.config.metadata.lastOptimizationTime = Date.now();
    this.config.metadata.iterationCount++;
    
    this.notifyUpdates();
    this.isDirty = true;
  }

  /**
   * Get provider-specific config
   */
  getProviderConfig(provider: string): ProviderConfig {
    return this.config.providers[provider] || {
      enabled: true,
    };
  }

  /**
   * Update provider-specific config
   */
  updateProviderConfig(provider: string, config: Partial<ProviderConfig>, optimizer?: string): void {
    this.config.providers[provider] = {
      ...this.config.providers[provider],
      ...config,
    };
    
    this.config.metadata.optimizedBy = optimizer || 'manual';
    this.config.metadata.lastOptimizationTime = Date.now();
    this.config.metadata.iterationCount++;
    
    this.notifyUpdates();
    this.isDirty = true;
  }

  /**
   * Get exploration rate (how much to try non-optimal providers)
   */
  getExplorationRate(): number {
    return this.config.global.explorationRate;
  }

  /**
   * Update exploration rate
   */
  setExplorationRate(rate: number, optimizer?: string): void {
    this.config.global.explorationRate = Math.max(0, Math.min(1, rate));
    this.config.metadata.optimizedBy = optimizer || 'manual';
    this.config.metadata.lastOptimizationTime = Date.now();
    this.config.metadata.iterationCount++;
    
    this.notifyUpdates();
    this.isDirty = true;
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(featureName: string): boolean {
    return this.config.features[featureName] ?? false;
  }

  /**
   * Enable/disable a feature
   */
  setFeature(featureName: string, enabled: boolean, optimizer?: string): void {
    this.config.features[featureName] = enabled;
    this.config.metadata.optimizedBy = optimizer || 'manual';
    this.config.metadata.lastOptimizationTime = Date.now();
    
    this.notifyUpdates();
    this.isDirty = true;
  }

  /**
   * Get optimization score (0-1: how good is current config)
   */
  getOptimizationScore(): number {
    return this.config.metadata.optimizationScore;
  }

  /**
   * Update optimization score
   */
  setOptimizationScore(score: number, optimizer?: string): void {
    this.config.metadata.optimizationScore = Math.max(0, Math.min(1, score));
    this.config.metadata.optimizedBy = optimizer || 'manual';
    this.config.metadata.lastOptimizationTime = Date.now();
    
    this.notifyUpdates();
    this.isDirty = true;
  }

  /**
   * Get full config (for inspection/debugging)
   */
  getConfig(): RuntimeConfigData {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(optimizer?: string): void {
    this.config = this.getDefaultConfig();
    this.config.metadata.optimizedBy = optimizer || 'reset';
    this.config.metadata.lastOptimizationTime = Date.now();
    this.config.metadata.iterationCount = 0;
    
    this.notifyUpdates();
    this.isDirty = true;
  }

  /**
   * Register callback for config changes
   */
  onChange(callback: (config: RuntimeConfigData) => void): () => void {
    this.updateCallbacks.add(callback);
    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  /**
   * Get metadata about optimization
   */
  getMetadata() {
    return { ...this.config.metadata };
  }

  /**
   * Internal: Notify all listeners of changes
   */
  private notifyUpdates(): void {
    this.updateCallbacks.forEach((callback) => {
      try {
        callback(this.getConfig());
      } catch (error) {
        console.error('[RuntimeConfig] Callback error:', error);
      }
    });
  }

  /**
   * Internal: Get default configuration
   */
  private getDefaultConfig(): RuntimeConfigData {
    return {
      timestamp: Date.now(),
      version: '3.3.497',
      global: {
        providerWeights: {
          latency: 0.4,      // 40% - speed matters
          cost: 0.3,         // 30% - cost efficiency
          reliability: 0.3,  // 30% - reliability
        },
        defaultModelConfig: {
          maxTokens: 2048,
          temperature: 0.7,
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        explorationRate: 0.1, // 10% chance to try non-optimal provider
        updateFrequency: 60000, // Check for optimization every 60s
        enabled: true,
      },
      providers: {
        deepseek: {
          enabled: true,
          priority: 1, // Try first
          timeout: 30000,
        },
        gemini: {
          enabled: true,
          priority: 2,
          timeout: 30000,
        },
        anthropic: {
          enabled: true,
          priority: 3,
          timeout: 30000,
        },
        openai: {
          enabled: true,
          priority: 4,
          timeout: 30000,
        },
      },
      features: {
        smartRouting: true,
        metricsCollection: true,
        autoOptimization: true,
        explorationMode: false,
        userSegmentation: false,
        continuousLearning: false,
      },
      metadata: {
        optimizedBy: 'system-init',
        optimizationScore: 0.5,
        lastOptimizationTime: Date.now(),
        iterationCount: 0,
      },
    };
  }
}

// Singleton instance
let runtimeConfigInstance: RuntimeConfig | null = null;

/**
 * Initialize runtime config (called once at startup)
 */
export function initRuntimeConfig(configPath?: string): RuntimeConfig {
  if (!runtimeConfigInstance) {
    runtimeConfigInstance = new RuntimeConfig(configPath);
  }
  return runtimeConfigInstance;
}

/**
 * Get the runtime config singleton
 */
export function getRuntimeConfig(): RuntimeConfig {
  if (!runtimeConfigInstance) {
    runtimeConfigInstance = new RuntimeConfig();
  }
  return runtimeConfigInstance;
}

export type {
  RuntimeConfigData,
  ProviderWeights,
  ModelConfig,
  ProviderConfig,
};
