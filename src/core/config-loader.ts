// @version 3.3.125
/**
 * Configuration Loader
 *
 * Centralized configuration management for TooLoo.ai
 * Loads settings from tooloo.yaml and provides type-safe access
 * with defaults for all configurable parameters.
 *
 * Usage:
 *   import { config } from './config-loader.js';
 *   const rate = config.learning.reinforcement.explorationRate;
 *
 * @module core/config-loader
 */

import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface TooLooConfig {
  project: {
    name: string;
    version: string;
  };
  deploy: {
    target: string;
    resources: {
      cpu: string;
      memory: string;
      gpu: boolean;
    };
  };
  learning: {
    reinforcement: {
      explorationRate: number;
      minExplorationRate: number;
      explorationDecay: number;
      learningRate: number;
      discountFactor: number;
      maxRewardHistory: number;
      maxAdjustmentHistory: number;
      velocityTarget: number;
      adaptiveLearningEnabled: boolean;
    };
    curiosity: {
      maxRewardHistory: number;
      explorationBonus: number;
    };
  };
  memory: {
    eventBus: {
      maxHistorySize: number;
    };
    hippocampus: {
      shortTermLimit: number;
      longTermPruneAt: number;
      longTermPruneTo: number;
    };
    taskProcessor: {
      maxHistorySize: number;
    };
    vectorStore: {
      maxDocuments: number;
    };
  };
  teams: {
    defaultQualityThreshold: number;
    criticalQualityThreshold: number;
    maxIterations: number;
    defaultTimeout: number;
    queuePersistence: boolean;
  };
  providers: {
    parallel: {
      timeout: number;
      minResponses: number;
      synthesizeResults: boolean;
      providers: string[];
    };
    costAware: {
      enabled: boolean;
      maxCostPerRequest: number;
      preferCheaper: boolean;
    };
  };
  qa: {
    enabled: boolean;
    schedules: {
      wireCheck: string;
      filesystemHygiene: string;
      legacyDetection: string;
      qualityScan: string;
    };
    autoFix: {
      enabled: boolean;
      maxFixesPerRun: number;
      requireApproval: boolean;
    };
  };
  exploration: {
    engine: {
      hypothesisPoolSize: number;
      explorationBudget: number;
      cooldownMs: number;
    };
    emergence: {
      breakthroughThreshold: number;
      amplificationSafetyGate: number;
      maxAmplifications: number;
    };
  };
  performance: {
    executionTimeout: number;
    maxConcurrentTasks: number;
    batchSize: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const defaultConfig: TooLooConfig = {
  project: {
    name: 'tooloo-core',
    version: '3.3.125',
  },
  deploy: {
    target: 'local',
    resources: {
      cpu: '2',
      memory: '4Gi',
      gpu: false,
    },
  },
  learning: {
    reinforcement: {
      explorationRate: 0.3,
      minExplorationRate: 0.05,
      explorationDecay: 0.995,
      learningRate: 0.1,
      discountFactor: 0.9,
      maxRewardHistory: 10000,
      maxAdjustmentHistory: 500,
      velocityTarget: 0.1,
      adaptiveLearningEnabled: true,
    },
    curiosity: {
      maxRewardHistory: 500,
      explorationBonus: 0.1,
    },
  },
  memory: {
    eventBus: {
      maxHistorySize: 1000,
    },
    hippocampus: {
      shortTermLimit: 100,
      longTermPruneAt: 5000,
      longTermPruneTo: 3000,
    },
    taskProcessor: {
      maxHistorySize: 100,
    },
    vectorStore: {
      maxDocuments: 10000,
    },
  },
  teams: {
    defaultQualityThreshold: 0.8,
    criticalQualityThreshold: 0.95,
    maxIterations: 5,
    defaultTimeout: 60000,
    queuePersistence: true,
  },
  providers: {
    parallel: {
      timeout: 30000,
      minResponses: 1,
      synthesizeResults: true,
      providers: ['deepseek', 'anthropic', 'openai', 'gemini'],
    },
    costAware: {
      enabled: true,
      maxCostPerRequest: 0.5,
      preferCheaper: true,
    },
  },
  qa: {
    enabled: true,
    schedules: {
      wireCheck: '*/30 * * * *',
      filesystemHygiene: '0 */2 * * *',
      legacyDetection: '0 0 * * *',
      qualityScan: '*/15 * * * *',
    },
    autoFix: {
      enabled: true,
      maxFixesPerRun: 10,
      requireApproval: false,
    },
  },
  exploration: {
    engine: {
      hypothesisPoolSize: 50,
      explorationBudget: 1000,
      cooldownMs: 5000,
    },
    emergence: {
      breakthroughThreshold: 0.9,
      amplificationSafetyGate: 0.7,
      maxAmplifications: 3,
    },
  },
  performance: {
    executionTimeout: 60000,
    maxConcurrentTasks: 10,
    batchSize: 50,
    cacheEnabled: true,
    cacheTTL: 300000,
  },
};

// ============================================================================
// CONFIGURATION LOADER
// ============================================================================

class ConfigLoader {
  private config: TooLooConfig;
  private configPath: string;
  private loaded = false;

  constructor() {
    this.configPath = path.join(process.cwd(), 'tooloo.yaml');
    this.config = { ...defaultConfig };
  }

  /**
   * Load configuration from tooloo.yaml
   */
  async load(): Promise<TooLooConfig> {
    if (this.loaded) {
      return this.config;
    }

    try {
      if (await fs.pathExists(this.configPath)) {
        const content = await fs.readFile(this.configPath, 'utf-8');
        const yamlConfig = YAML.parse(content);
        this.config = this.deepMerge(defaultConfig, yamlConfig);
        console.log('[ConfigLoader] Loaded configuration from tooloo.yaml');
      } else {
        console.log('[ConfigLoader] No tooloo.yaml found, using defaults');
      }
    } catch (error) {
      console.error('[ConfigLoader] Error loading config:', error);
      console.log('[ConfigLoader] Using default configuration');
    }

    this.loaded = true;
    return this.config;
  }

  /**
   * Get the current configuration (sync)
   */
  get(): TooLooConfig {
    return this.config;
  }

  /**
   * Get a specific config value with type safety
   */
  getValue<T>(path: string, defaultValue: T): T {
    const parts = path.split('.');
    let current: any = this.config;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return defaultValue;
      }
    }

    return current as T;
  }

  /**
   * Reload configuration from disk
   */
  async reload(): Promise<TooLooConfig> {
    this.loaded = false;
    return this.load();
  }

  /**
   * Deep merge two objects
   */
  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object'
      ) {
        (result as any)[key] = this.deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        (result as any)[key] = sourceValue;
      }
    }

    return result;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const configLoader = new ConfigLoader();

// Initialize synchronously with defaults, then load async
export const config = configLoader.get();

// Export loader for async initialization
export { configLoader };
export type { TooLooConfig };

// Auto-load on import (async, will update config object)
configLoader.load().catch((err) => {
  console.error('[ConfigLoader] Failed to auto-load:', err);
});
