// @version 3.3.194
/**
 * TooLoo.ai Synapsys V3.3.194
 * Configuration API - Centralized Configuration Management
 *
 * Provides comprehensive configuration management:
 * - Version-controlled configuration changes
 * - Rollback capability to previous configurations
 * - Domain-specific overrides (learning, emergence, exploration, etc.)
 * - Runtime updates without restart
 * - Configuration validation and schema checking
 * - Audit trail of all configuration changes
 *
 * This is the single source of truth for all TooLoo configurations.
 */

import { Router, Request, Response } from 'express';
import { bus } from '../../core/event-bus.js';
import fs from 'fs-extra';
import path from 'path';
import { config as systemConfig } from '../../core/config.js';

const router = Router();

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

interface ConfigurationVersion {
  version: number;
  timestamp: string;
  author: string;
  message: string;
  changes: ConfigChange[];
  config: Record<string, any>;
}

interface ConfigChange {
  domain: string;
  key: string;
  oldValue: any;
  newValue: any;
}

interface ConfigurationDomain {
  id: string;
  name: string;
  description: string;
  schema: Record<string, ConfigField>;
  currentValues: Record<string, any>;
  defaultValues: Record<string, any>;
}

interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  description: string;
  default: any;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
    items?: ConfigField;
  };
  runtimeUpdateable: boolean;
  requiresRestart: boolean;
}

interface ConfigurationState {
  currentVersion: number;
  versions: ConfigurationVersion[];
  domains: Record<string, ConfigurationDomain>;
  runtimeOverrides: Record<string, any>;
  lastUpdated: string;
}

// ============================================================================
// CONFIGURATION STORAGE
// ============================================================================

const CONFIG_FILE = path.join(process.cwd(), 'data', 'configuration-state.json');
const MAX_VERSIONS = 50;

let configState: ConfigurationState | null = null;

async function loadConfigState(): Promise<ConfigurationState> {
  if (configState) return configState;

  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      configState = await fs.readJson(CONFIG_FILE);
      return configState!;
    }
  } catch (error) {
    console.error('[Configuration] Failed to load state:', error);
  }

  // Initialize default state
  configState = {
    currentVersion: 1,
    versions: [
      {
        version: 1,
        timestamp: new Date().toISOString(),
        author: 'system',
        message: 'Initial configuration',
        changes: [],
        config: getDefaultConfiguration(),
      },
    ],
    domains: initializeDomains(),
    runtimeOverrides: {},
    lastUpdated: new Date().toISOString(),
  };

  await saveConfigState();
  return configState;
}

async function saveConfigState(): Promise<void> {
  if (!configState) return;

  await fs.ensureDir(path.dirname(CONFIG_FILE));
  await fs.writeJson(CONFIG_FILE, configState, { spaces: 2 });
}

// ============================================================================
// DOMAIN DEFINITIONS
// ============================================================================

function initializeDomains(): Record<string, ConfigurationDomain> {
  return {
    learning: {
      id: 'learning',
      name: 'Reinforcement Learning',
      description: 'Configuration for the Q-learning and reinforcement learning systems',
      schema: {
        enabled: {
          type: 'boolean',
          description: 'Enable/disable learning system',
          default: true,
          required: true,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        epsilon: {
          type: 'number',
          description: 'Exploration rate (0-1)',
          default: 0.1,
          required: true,
          validation: { min: 0, max: 1 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        epsilonDecay: {
          type: 'number',
          description: 'Epsilon decay rate per episode',
          default: 0.995,
          required: true,
          validation: { min: 0.9, max: 1 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        minEpsilon: {
          type: 'number',
          description: 'Minimum epsilon value',
          default: 0.01,
          required: true,
          validation: { min: 0, max: 0.5 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        learningRate: {
          type: 'number',
          description: 'Learning rate (alpha)',
          default: 0.1,
          required: true,
          validation: { min: 0.001, max: 1 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        discountFactor: {
          type: 'number',
          description: 'Discount factor (gamma)',
          default: 0.95,
          required: true,
          validation: { min: 0, max: 1 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        batchSize: {
          type: 'number',
          description: 'Experience replay batch size',
          default: 32,
          required: true,
          validation: { min: 1, max: 256 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        replayBufferSize: {
          type: 'number',
          description: 'Maximum replay buffer entries',
          default: 10000,
          required: true,
          validation: { min: 100, max: 100000 },
          runtimeUpdateable: false,
          requiresRestart: true,
        },
        autoBoostThreshold: {
          type: 'number',
          description: 'Success rate to trigger auto-boost',
          default: 0.8,
          required: false,
          validation: { min: 0.5, max: 1 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
      },
      currentValues: {},
      defaultValues: {},
    },

    emergence: {
      id: 'emergence',
      name: 'Emergence & Discovery',
      description: 'Configuration for emergence detection, amplification, and pattern recognition',
      schema: {
        enabled: {
          type: 'boolean',
          description: 'Enable/disable emergence system',
          default: true,
          required: true,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        signalThreshold: {
          type: 'number',
          description: 'Minimum signal strength to consider (0-1)',
          default: 0.3,
          required: true,
          validation: { min: 0.1, max: 0.9 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        amplificationFactor: {
          type: 'number',
          description: 'Signal amplification multiplier',
          default: 1.5,
          required: true,
          validation: { min: 1, max: 5 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        patternWindow: {
          type: 'number',
          description: 'Time window for pattern detection (ms)',
          default: 3600000,
          required: true,
          validation: { min: 60000, max: 86400000 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        safetyGateEnabled: {
          type: 'boolean',
          description: 'Enable safety gates for emergence',
          default: true,
          required: true,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        maxEmergenceLevel: {
          type: 'number',
          description: 'Maximum allowed emergence level',
          default: 1.0,
          required: true,
          validation: { min: 0.5, max: 2 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        knowledgeGraphPersistence: {
          type: 'boolean',
          description: 'Persist knowledge graph to disk',
          default: true,
          required: false,
          runtimeUpdateable: false,
          requiresRestart: true,
        },
      },
      currentValues: {},
      defaultValues: {},
    },

    exploration: {
      id: 'exploration',
      name: 'Exploration & Curiosity',
      description:
        'Configuration for hypothesis generation, experimentation, and curiosity-driven learning',
      schema: {
        enabled: {
          type: 'boolean',
          description: 'Enable/disable exploration system',
          default: true,
          required: true,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        maxActiveHypotheses: {
          type: 'number',
          description: 'Maximum concurrent hypotheses',
          default: 10,
          required: true,
          validation: { min: 1, max: 50 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        experimentTimeout: {
          type: 'number',
          description: 'Experiment timeout (ms)',
          default: 30000,
          required: true,
          validation: { min: 5000, max: 300000 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        sandboxEnabled: {
          type: 'boolean',
          description: 'Run experiments in sandbox',
          default: true,
          required: true,
          runtimeUpdateable: false,
          requiresRestart: true,
        },
        curiosityDimensions: {
          type: 'array',
          description: 'Active curiosity dimensions',
          default: [
            'novelty',
            'complexity',
            'uncertainty',
            'contradiction',
            'analogy',
            'boundary',
            'meta',
          ],
          required: false,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        intrinsicRewardWeight: {
          type: 'number',
          description: 'Weight for intrinsic curiosity rewards',
          default: 0.3,
          required: true,
          validation: { min: 0, max: 1 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        hypothesisConfidenceThreshold: {
          type: 'number',
          description: 'Minimum confidence to accept hypothesis',
          default: 0.7,
          required: true,
          validation: { min: 0.5, max: 1 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
      },
      currentValues: {},
      defaultValues: {},
    },

    scheduling: {
      id: 'scheduling',
      name: 'Learning Scheduler',
      description: 'Configuration for learning windows, bursts, and goal-driven scheduling',
      schema: {
        enabled: {
          type: 'boolean',
          description: 'Enable/disable scheduler',
          default: true,
          required: true,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        defaultBurstDuration: {
          type: 'number',
          description: 'Default burst duration (ms)',
          default: 300000,
          required: true,
          validation: { min: 60000, max: 3600000 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        defaultQuietDuration: {
          type: 'number',
          description: 'Default quiet period duration (ms)',
          default: 1800000,
          required: true,
          validation: { min: 300000, max: 86400000 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        burstIntensity: {
          type: 'number',
          description: 'Default burst intensity multiplier',
          default: 1.5,
          required: true,
          validation: { min: 1, max: 3 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        maxConcurrentGoals: {
          type: 'number',
          description: 'Maximum concurrent learning goals',
          default: 5,
          required: true,
          validation: { min: 1, max: 20 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        goalCheckInterval: {
          type: 'number',
          description: 'Goal progress check interval (ms)',
          default: 60000,
          required: true,
          validation: { min: 10000, max: 600000 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
      },
      currentValues: {},
      defaultValues: {},
    },

    monitoring: {
      id: 'monitoring',
      name: 'Monitoring & Observability',
      description: 'Configuration for alerts, metrics, and system monitoring',
      schema: {
        enabled: {
          type: 'boolean',
          description: 'Enable/disable monitoring',
          default: true,
          required: true,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        metricsRetentionDays: {
          type: 'number',
          description: 'Days to retain metric history',
          default: 7,
          required: true,
          validation: { min: 1, max: 90 },
          runtimeUpdateable: false,
          requiresRestart: false,
        },
        alertCooldownMs: {
          type: 'number',
          description: 'Alert cooldown period (ms)',
          default: 300000,
          required: true,
          validation: { min: 60000, max: 3600000 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        correlationMinSamples: {
          type: 'number',
          description: 'Minimum samples for correlation analysis',
          default: 10,
          required: true,
          validation: { min: 5, max: 100 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        correlationThreshold: {
          type: 'number',
          description: 'Correlation significance threshold',
          default: 0.7,
          required: true,
          validation: { min: 0.5, max: 1 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        streamHeartbeatInterval: {
          type: 'number',
          description: 'SSE heartbeat interval (ms)',
          default: 30000,
          required: true,
          validation: { min: 5000, max: 60000 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
      },
      currentValues: {},
      defaultValues: {},
    },

    predictions: {
      id: 'predictions',
      name: 'Emergence Predictions',
      description: 'Configuration for emergence prediction and forecasting',
      schema: {
        enabled: {
          type: 'boolean',
          description: 'Enable/disable predictions',
          default: true,
          required: true,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        predictionInterval: {
          type: 'number',
          description: 'Prediction generation interval (ms)',
          default: 300000,
          required: true,
          validation: { min: 60000, max: 3600000 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        minConfidenceToReport: {
          type: 'number',
          description: 'Minimum confidence to report prediction',
          default: 0.3,
          required: true,
          validation: { min: 0.1, max: 0.8 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        maxPredictions: {
          type: 'number',
          description: 'Maximum predictions to maintain',
          default: 20,
          required: true,
          validation: { min: 5, max: 100 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        recencyWeight: {
          type: 'number',
          description: 'Weight for recent patterns in scoring',
          default: 0.3,
          required: true,
          validation: { min: 0, max: 1 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        strengthWeight: {
          type: 'number',
          description: 'Weight for signal strength in scoring',
          default: 0.25,
          required: true,
          validation: { min: 0, max: 1 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
      },
      currentValues: {},
      defaultValues: {},
    },

    agents: {
      id: 'agents',
      name: 'Agent System',
      description: 'Configuration for AI agents and task execution',
      schema: {
        defaultModel: {
          type: 'enum',
          description: 'Default LLM model',
          default: 'gemini',
          required: true,
          validation: { enum: ['openai', 'anthropic', 'gemini', 'ollama'] },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        maxConcurrentTasks: {
          type: 'number',
          description: 'Maximum concurrent agent tasks',
          default: 5,
          required: true,
          validation: { min: 1, max: 20 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        taskTimeout: {
          type: 'number',
          description: 'Task timeout (ms)',
          default: 120000,
          required: true,
          validation: { min: 10000, max: 600000 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        teamValidationThreshold: {
          type: 'number',
          description: 'Minimum quality for team validation',
          default: 0.8,
          required: true,
          validation: { min: 0.5, max: 1 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        enableCodeExecution: {
          type: 'boolean',
          description: 'Allow code execution by agents',
          default: true,
          required: true,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        sandboxExecution: {
          type: 'boolean',
          description: 'Execute code in sandbox',
          default: true,
          required: true,
          runtimeUpdateable: false,
          requiresRestart: true,
        },
      },
      currentValues: {},
      defaultValues: {},
    },

    system: {
      id: 'system',
      name: 'System Settings',
      description: 'Core system configuration',
      schema: {
        logLevel: {
          type: 'enum',
          description: 'Logging verbosity',
          default: 'info',
          required: true,
          validation: { enum: ['debug', 'info', 'warn', 'error'] },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        dataDirectory: {
          type: 'string',
          description: 'Data storage directory',
          default: './data',
          required: true,
          runtimeUpdateable: false,
          requiresRestart: true,
        },
        apiPort: {
          type: 'number',
          description: 'API server port',
          default: 4000,
          required: true,
          validation: { min: 1024, max: 65535 },
          runtimeUpdateable: false,
          requiresRestart: true,
        },
        corsOrigins: {
          type: 'array',
          description: 'Allowed CORS origins',
          default: ['http://localhost:5173'],
          required: false,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        enableMetrics: {
          type: 'boolean',
          description: 'Enable Prometheus metrics endpoint',
          default: true,
          required: false,
          runtimeUpdateable: false,
          requiresRestart: true,
        },
      },
      currentValues: {},
      defaultValues: {},
    },

    reflection: {
      id: 'reflection',
      name: 'Reflection Sandbox',
      description:
        'Configuration for the sandboxed self-reflection and autonomous development system',
      schema: {
        enabled: {
          type: 'boolean',
          description: 'Enable/disable reflection sandbox',
          default: true,
          required: true,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        persistent: {
          type: 'boolean',
          description: 'Keep sandbox container running between sessions',
          default: true,
          required: true,
          runtimeUpdateable: false,
          requiresRestart: true,
        },
        dockerImage: {
          type: 'string',
          description: 'Docker image for sandbox container',
          default: 'node:20-bookworm',
          required: true,
          runtimeUpdateable: false,
          requiresRestart: true,
        },
        maxMemoryMB: {
          type: 'number',
          description: 'Maximum memory for sandbox (MB)',
          default: 2048,
          required: true,
          validation: { min: 512, max: 8192 },
          runtimeUpdateable: false,
          requiresRestart: true,
        },
        maxCpuPercent: {
          type: 'number',
          description: 'Maximum CPU percentage for sandbox',
          default: 80,
          required: true,
          validation: { min: 10, max: 100 },
          runtimeUpdateable: false,
          requiresRestart: true,
        },
        maxIterations: {
          type: 'number',
          description: 'Maximum refinement iterations in reflection loop',
          default: 5,
          required: true,
          validation: { min: 1, max: 20 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        requiredPassRate: {
          type: 'number',
          description: 'Required test pass rate for promotion (0-1)',
          default: 1.0,
          required: true,
          validation: { min: 0.5, max: 1.0 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        autoPromote: {
          type: 'boolean',
          description: 'Automatically promote successful reflection results',
          default: false,
          required: true,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        requireApproval: {
          type: 'boolean',
          description: 'Require human approval before handoff',
          default: true,
          required: true,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        sandboxServerPort: {
          type: 'number',
          description: 'Port for TooLoo server running in sandbox',
          default: 4100,
          required: true,
          validation: { min: 1024, max: 65535 },
          runtimeUpdateable: false,
          requiresRestart: true,
        },
        artifactExpirationHours: {
          type: 'number',
          description: 'Hours before handoff artifacts expire',
          default: 24,
          required: true,
          validation: { min: 1, max: 168 },
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        enableNetwork: {
          type: 'boolean',
          description: 'Allow network access in sandbox (for npm install)',
          default: true,
          required: true,
          runtimeUpdateable: false,
          requiresRestart: true,
        },
        autoStartServer: {
          type: 'boolean',
          description: 'Auto-start TooLoo server in sandbox for integration testing',
          default: false,
          required: false,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        runProductionTests: {
          type: 'boolean',
          description: 'Run production tests after handoff',
          default: true,
          required: true,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
        autoRollbackOnFailure: {
          type: 'boolean',
          description: 'Automatically rollback if production tests fail',
          default: true,
          required: true,
          runtimeUpdateable: true,
          requiresRestart: false,
        },
      },
      currentValues: {},
      defaultValues: {},
    },
  };
}

function getDefaultConfiguration(): Record<string, any> {
  const domains = initializeDomains();
  const config: Record<string, any> = {};

  for (const [domainId, domain] of Object.entries(domains)) {
    config[domainId] = {};
    for (const [key, field] of Object.entries(domain.schema)) {
      config[domainId][key] = field.default;
    }
  }

  return config;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateConfigValue(field: ConfigField, value: any): { valid: boolean; error?: string } {
  // Type checking
  switch (field.type) {
    case 'boolean':
      if (typeof value !== 'boolean') {
        return { valid: false, error: `Expected boolean, got ${typeof value}` };
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { valid: false, error: `Expected number, got ${typeof value}` };
      }
      if (field.validation?.min !== undefined && value < field.validation.min) {
        return { valid: false, error: `Value ${value} is below minimum ${field.validation.min}` };
      }
      if (field.validation?.max !== undefined && value > field.validation.max) {
        return { valid: false, error: `Value ${value} is above maximum ${field.validation.max}` };
      }
      break;

    case 'string':
      if (typeof value !== 'string') {
        return { valid: false, error: `Expected string, got ${typeof value}` };
      }
      if (field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          return {
            valid: false,
            error: `Value does not match pattern ${field.validation.pattern}`,
          };
        }
      }
      break;

    case 'enum':
      if (!field.validation?.enum?.includes(value)) {
        return {
          valid: false,
          error: `Value must be one of: ${field.validation?.enum?.join(', ')}`,
        };
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return { valid: false, error: `Expected array, got ${typeof value}` };
      }
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { valid: false, error: `Expected object, got ${typeof value}` };
      }
      break;
  }

  return { valid: true };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/config
 * Get all configuration with current values
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const state = await loadConfigState();
    const currentConfig =
      state.versions.find((v) => v.version === state.currentVersion)?.config || {};

    res.json({
      success: true,
      data: {
        currentVersion: state.currentVersion,
        lastUpdated: state.lastUpdated,
        domains: Object.keys(state.domains),
        config: currentConfig,
        runtimeOverrides: state.runtimeOverrides,
      },
    });
  } catch (error) {
    console.error('[Configuration] Get config error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get configuration',
    });
  }
});

/**
 * GET /api/v1/config/domains
 * Get all domain definitions with schemas
 */
router.get('/domains', async (_req: Request, res: Response) => {
  try {
    const state = await loadConfigState();

    res.json({
      success: true,
      data: Object.values(state.domains).map((domain) => ({
        id: domain.id,
        name: domain.name,
        description: domain.description,
        fields: Object.entries(domain.schema).map(([key, field]) => ({
          key,
          ...field,
        })),
      })),
    });
  } catch (error) {
    console.error('[Configuration] Get domains error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get domains',
    });
  }
});

/**
 * GET /api/v1/config/domain/:domainId
 * Get specific domain configuration
 */
router.get('/domain/:domainId', async (req: Request, res: Response) => {
  const domainId = req.params['domainId'] ?? '';

  try {
    const state = await loadConfigState();

    if (!domainId || !state.domains[domainId]) {
      return res.status(404).json({
        success: false,
        error: `Domain '${domainId}' not found`,
        availableDomains: Object.keys(state.domains),
      });
    }

    const domain = state.domains[domainId];
    const currentConfig =
      state.versions.find((v) => v.version === state.currentVersion)?.config || {};
    const domainConfig = (currentConfig as Record<string, Record<string, unknown>>)[domainId] || {};
    const runtimeOverrides = state.runtimeOverrides[domainId] || {};

    res.json({
      success: true,
      data: {
        ...domain,
        currentValues: domainConfig,
        runtimeOverrides,
        effectiveValues: { ...domainConfig, ...runtimeOverrides },
      },
    });
  } catch (error) {
    console.error('[Configuration] Get domain error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get domain configuration',
    });
  }
});

/**
 * PUT /api/v1/config/domain/:domainId
 * Update domain configuration (creates new version)
 */
router.put('/domain/:domainId', async (req: Request, res: Response) => {
  const domainId = req.params['domainId'] ?? '';
  const { values, author, message } = req.body;

  if (!values || typeof values !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Configuration values object required',
    });
  }

  try {
    const state = await loadConfigState();

    if (!domainId || !state.domains[domainId]) {
      return res.status(404).json({
        success: false,
        error: `Domain '${domainId}' not found`,
      });
    }

    const domain = state.domains[domainId];
    const currentConfig =
      state.versions.find((v) => v.version === state.currentVersion)?.config || {};
    const oldDomainConfig =
      (currentConfig as Record<string, Record<string, unknown>>)[domainId] || {};
    const changes: ConfigChange[] = [];
    const newDomainConfig: Record<string, unknown> = { ...oldDomainConfig };

    // Validate and apply changes
    for (const [key, value] of Object.entries(values)) {
      const field = domain.schema[key];
      if (!field) {
        return res.status(400).json({
          success: false,
          error: `Unknown configuration key: ${key}`,
        });
      }

      const validation = validateConfigValue(field, value);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: `Validation failed for ${key}: ${validation.error}`,
        });
      }

      if (oldDomainConfig[key] !== value) {
        changes.push({
          domain: domainId,
          key,
          oldValue: oldDomainConfig[key],
          newValue: value,
        });
        newDomainConfig[key] = value;
      }
    }

    if (changes.length === 0) {
      return res.json({
        success: true,
        message: 'No changes detected',
        data: { version: state.currentVersion },
      });
    }

    // Create new version
    const newVersion: ConfigurationVersion = {
      version: state.currentVersion + 1,
      timestamp: new Date().toISOString(),
      author: author || 'api',
      message: message || `Updated ${domainId} configuration`,
      changes,
      config: {
        ...currentConfig,
        [domainId]: newDomainConfig,
      },
    };

    state.versions.push(newVersion);
    state.currentVersion = newVersion.version;
    state.lastUpdated = newVersion.timestamp;

    // Trim old versions
    if (state.versions.length > MAX_VERSIONS) {
      state.versions = state.versions.slice(-MAX_VERSIONS);
    }

    await saveConfigState();

    // Publish change event
    bus.publish('nexus', 'config:updated', {
      domain: domainId,
      version: newVersion.version,
      changes,
    });

    // Apply runtime-updateable changes
    applyRuntimeChanges(domainId, changes, domain.schema);

    res.json({
      success: true,
      message: `Configuration updated to version ${newVersion.version}`,
      data: {
        version: newVersion.version,
        changes,
        requiresRestart: changes.some((c) => domain.schema[c.key]?.requiresRestart),
      },
    });
  } catch (error) {
    console.error('[Configuration] Update domain error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update configuration',
    });
  }
});

/**
 * POST /api/v1/config/override
 * Set runtime override (doesn't create version, temporary)
 */
router.post('/override', async (req: Request, res: Response) => {
  const { domain, key, value } = req.body;

  if (!domain || !key || value === undefined) {
    return res.status(400).json({
      success: false,
      error: 'domain, key, and value are required',
    });
  }

  try {
    const state = await loadConfigState();

    if (!state.domains[domain]) {
      return res.status(404).json({
        success: false,
        error: `Domain '${domain}' not found`,
      });
    }

    const field = state.domains[domain].schema[key];
    if (!field) {
      return res.status(404).json({
        success: false,
        error: `Key '${key}' not found in domain '${domain}'`,
      });
    }

    if (!field.runtimeUpdateable) {
      return res.status(400).json({
        success: false,
        error: `Key '${key}' cannot be updated at runtime`,
      });
    }

    const validation = validateConfigValue(field, value);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${validation.error}`,
      });
    }

    // Set runtime override
    if (!state.runtimeOverrides[domain]) {
      state.runtimeOverrides[domain] = {};
    }
    state.runtimeOverrides[domain][key] = value;
    state.lastUpdated = new Date().toISOString();

    await saveConfigState();

    // Apply immediately
    applyRuntimeChanges(
      domain,
      [
        {
          domain,
          key,
          oldValue: undefined,
          newValue: value,
        },
      ],
      state.domains[domain].schema
    );

    bus.publish('nexus', 'config:override', { domain, key, value });

    res.json({
      success: true,
      message: `Runtime override set for ${domain}.${key}`,
      data: { domain, key, value },
    });
  } catch (error) {
    console.error('[Configuration] Set override error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set override',
    });
  }
});

/**
 * DELETE /api/v1/config/override/:domain/:key
 * Remove runtime override
 */
router.delete('/override/:domain/:key', async (req: Request, res: Response) => {
  const domain = req.params['domain'] ?? '';
  const key = req.params['key'] ?? '';

  try {
    const state = await loadConfigState();

    if (domain && key && state.runtimeOverrides[domain]?.[key] !== undefined) {
      delete state.runtimeOverrides[domain][key];
      if (Object.keys(state.runtimeOverrides[domain] || {}).length === 0) {
        delete state.runtimeOverrides[domain];
      }
      state.lastUpdated = new Date().toISOString();
      await saveConfigState();

      bus.publish('nexus', 'config:override_removed', { domain, key });

      res.json({
        success: true,
        message: `Runtime override removed for ${domain}.${key}`,
      });
    } else {
      res.status(404).json({
        success: false,
        error: `No override found for ${domain}.${key}`,
      });
    }
  } catch (error) {
    console.error('[Configuration] Remove override error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove override',
    });
  }
});

/**
 * GET /api/v1/config/versions
 * Get configuration version history
 */
router.get('/versions', async (req: Request, res: Response) => {
  const limit = parseInt((req.query['limit'] as string) || '20', 10);

  try {
    const state = await loadConfigState();

    const versions = state.versions
      .slice(-limit)
      .reverse()
      .map((v) => ({
        version: v.version,
        timestamp: v.timestamp,
        author: v.author,
        message: v.message,
        changeCount: v.changes.length,
        isCurrent: v.version === state.currentVersion,
      }));

    res.json({
      success: true,
      data: {
        currentVersion: state.currentVersion,
        totalVersions: state.versions.length,
        versions,
      },
    });
  } catch (error) {
    console.error('[Configuration] Get versions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get versions',
    });
  }
});

/**
 * GET /api/v1/config/version/:version
 * Get specific version details
 */
router.get('/version/:version', async (req: Request, res: Response) => {
  const version = parseInt(req.params['version'] ?? '0', 10);

  if (isNaN(version)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid version number',
    });
  }

  try {
    const state = await loadConfigState();
    const versionData = state.versions.find((v) => v.version === version);

    if (!versionData) {
      return res.status(404).json({
        success: false,
        error: `Version ${version} not found`,
      });
    }

    res.json({
      success: true,
      data: versionData,
    });
  } catch (error) {
    console.error('[Configuration] Get version error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get version',
    });
  }
});

/**
 * POST /api/v1/config/rollback/:version
 * Rollback to a previous version
 */
router.post('/rollback/:version', async (req: Request, res: Response) => {
  const targetVersion = parseInt(req.params['version'] ?? '0', 10);
  const { author, reason } = req.body;

  if (isNaN(targetVersion)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid version number',
    });
  }

  try {
    const state = await loadConfigState();
    const targetVersionData = state.versions.find((v) => v.version === targetVersion);

    if (!targetVersionData) {
      return res.status(404).json({
        success: false,
        error: `Version ${targetVersion} not found`,
      });
    }

    if (targetVersion === state.currentVersion) {
      return res.json({
        success: true,
        message: 'Already at this version',
        data: { version: targetVersion },
      });
    }

    const currentConfig =
      state.versions.find((v) => v.version === state.currentVersion)?.config || {};
    const changes: ConfigChange[] = [];

    // Calculate changes for rollback
    for (const [domain, domainConfig] of Object.entries(targetVersionData.config)) {
      const currentDomainConfig = currentConfig[domain] || {};
      for (const [key, value] of Object.entries(domainConfig as Record<string, any>)) {
        if (currentDomainConfig[key] !== value) {
          changes.push({
            domain,
            key,
            oldValue: currentDomainConfig[key],
            newValue: value,
          });
        }
      }
    }

    // Create rollback version
    const newVersion: ConfigurationVersion = {
      version: state.currentVersion + 1,
      timestamp: new Date().toISOString(),
      author: author || 'api',
      message: reason || `Rollback to version ${targetVersion}`,
      changes,
      config: { ...targetVersionData.config },
    };

    state.versions.push(newVersion);
    state.currentVersion = newVersion.version;
    state.lastUpdated = newVersion.timestamp;
    state.runtimeOverrides = {}; // Clear runtime overrides on rollback

    // Trim old versions
    if (state.versions.length > MAX_VERSIONS) {
      state.versions = state.versions.slice(-MAX_VERSIONS);
    }

    await saveConfigState();

    bus.publish('nexus', 'config:rollback', {
      fromVersion: state.currentVersion - 1,
      toVersion: targetVersion,
      newVersion: newVersion.version,
    });

    res.json({
      success: true,
      message: `Rolled back to version ${targetVersion} (new version ${newVersion.version})`,
      data: {
        version: newVersion.version,
        rolledBackFrom: state.currentVersion - 1,
        rolledBackTo: targetVersion,
        changes,
      },
    });
  } catch (error) {
    console.error('[Configuration] Rollback error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rollback',
    });
  }
});

/**
 * GET /api/v1/config/diff/:version1/:version2
 * Compare two versions
 */
router.get('/diff/:version1/:version2', async (req: Request, res: Response) => {
  const version1 = parseInt(req.params['version1'] ?? '0', 10);
  const version2 = parseInt(req.params['version2'] ?? '0', 10);

  if (isNaN(version1) || isNaN(version2)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid version numbers',
    });
  }

  try {
    const state = await loadConfigState();
    const v1Data = state.versions.find((v) => v.version === version1);
    const v2Data = state.versions.find((v) => v.version === version2);

    if (!v1Data || !v2Data) {
      return res.status(404).json({
        success: false,
        error: 'One or both versions not found',
      });
    }

    const differences: ConfigChange[] = [];
    const allDomains = new Set([...Object.keys(v1Data.config), ...Object.keys(v2Data.config)]);

    for (const domain of allDomains) {
      const config1 = v1Data.config[domain] || {};
      const config2 = v2Data.config[domain] || {};
      const allKeys = new Set([...Object.keys(config1), ...Object.keys(config2)]);

      for (const key of allKeys) {
        if (JSON.stringify(config1[key]) !== JSON.stringify(config2[key])) {
          differences.push({
            domain,
            key,
            oldValue: config1[key],
            newValue: config2[key],
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        version1: {
          version: v1Data.version,
          timestamp: v1Data.timestamp,
        },
        version2: {
          version: v2Data.version,
          timestamp: v2Data.timestamp,
        },
        differenceCount: differences.length,
        differences,
      },
    });
  } catch (error) {
    console.error('[Configuration] Diff error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compare versions',
    });
  }
});

/**
 * POST /api/v1/config/export
 * Export configuration to JSON
 */
router.post('/export', async (req: Request, res: Response) => {
  const { version, includeHistory } = req.body;

  try {
    const state = await loadConfigState();
    let exportData: any;

    if (includeHistory) {
      exportData = {
        exportedAt: new Date().toISOString(),
        currentVersion: state.currentVersion,
        versions: state.versions,
        domains: Object.keys(state.domains),
      };
    } else {
      const targetVersion = version || state.currentVersion;
      const versionData = state.versions.find((v) => v.version === targetVersion);

      if (!versionData) {
        return res.status(404).json({
          success: false,
          error: `Version ${targetVersion} not found`,
        });
      }

      exportData = {
        exportedAt: new Date().toISOString(),
        version: versionData.version,
        timestamp: versionData.timestamp,
        config: versionData.config,
      };
    }

    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    console.error('[Configuration] Export error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export configuration',
    });
  }
});

/**
 * POST /api/v1/config/import
 * Import configuration from JSON
 */
router.post('/import', async (req: Request, res: Response) => {
  const { config, author, message } = req.body;

  if (!config || typeof config !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Configuration object required',
    });
  }

  try {
    const state = await loadConfigState();
    const currentConfig =
      state.versions.find((v) => v.version === state.currentVersion)?.config || {};
    const changes: ConfigChange[] = [];

    // Validate and collect changes
    for (const [domain, domainConfig] of Object.entries(config)) {
      if (!state.domains[domain]) {
        return res.status(400).json({
          success: false,
          error: `Unknown domain: ${domain}`,
        });
      }

      const domainSchema = state.domains[domain].schema;
      for (const [key, value] of Object.entries(domainConfig as Record<string, any>)) {
        const field = domainSchema[key];
        if (!field) {
          return res.status(400).json({
            success: false,
            error: `Unknown key ${key} in domain ${domain}`,
          });
        }

        const validation = validateConfigValue(field, value);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            error: `Validation failed for ${domain}.${key}: ${validation.error}`,
          });
        }

        const currentValue = currentConfig[domain]?.[key];
        if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
          changes.push({
            domain,
            key,
            oldValue: currentValue,
            newValue: value,
          });
        }
      }
    }

    if (changes.length === 0) {
      return res.json({
        success: true,
        message: 'No changes from import',
        data: { version: state.currentVersion },
      });
    }

    // Create import version
    const mergedConfig = { ...currentConfig };
    for (const [domain, domainConfig] of Object.entries(config)) {
      mergedConfig[domain] = {
        ...mergedConfig[domain],
        ...(domainConfig as Record<string, any>),
      };
    }

    const newVersion: ConfigurationVersion = {
      version: state.currentVersion + 1,
      timestamp: new Date().toISOString(),
      author: author || 'import',
      message: message || 'Configuration import',
      changes,
      config: mergedConfig,
    };

    state.versions.push(newVersion);
    state.currentVersion = newVersion.version;
    state.lastUpdated = newVersion.timestamp;

    if (state.versions.length > MAX_VERSIONS) {
      state.versions = state.versions.slice(-MAX_VERSIONS);
    }

    await saveConfigState();

    bus.publish('nexus', 'config:imported', {
      version: newVersion.version,
      changeCount: changes.length,
    });

    res.json({
      success: true,
      message: `Configuration imported as version ${newVersion.version}`,
      data: {
        version: newVersion.version,
        changeCount: changes.length,
        changes,
      },
    });
  } catch (error) {
    console.error('[Configuration] Import error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import configuration',
    });
  }
});

// ============================================================================
// RUNTIME APPLICATION
// ============================================================================

function applyRuntimeChanges(
  domain: string,
  changes: ConfigChange[],
  schema: Record<string, ConfigField>
): void {
  for (const change of changes) {
    const field = schema[change.key];
    if (!field || !field.runtimeUpdateable) continue;

    // Publish domain-specific events
    bus.publish('nexus', `config:${domain}:${change.key}`, {
      oldValue: change.oldValue,
      newValue: change.newValue,
    });

    // Handle specific runtime updates
    switch (domain) {
      case 'learning':
        handleLearningConfigChange(change);
        break;
      case 'emergence':
        handleEmergenceConfigChange(change);
        break;
      case 'monitoring':
        handleMonitoringConfigChange(change);
        break;
      case 'reflection':
        handleReflectionConfigChange(change);
        break;
    }
  }
}

function handleLearningConfigChange(change: ConfigChange): void {
  bus.publish('precog', 'learning:config_update', {
    key: change.key,
    value: change.newValue,
  });
}

function handleEmergenceConfigChange(change: ConfigChange): void {
  bus.publish('cortex', 'emergence:config_update', {
    key: change.key,
    value: change.newValue,
  });
}

function handleMonitoringConfigChange(change: ConfigChange): void {
  bus.publish('system', 'monitoring:config_update', {
    key: change.key,
    value: change.newValue,
  });
}

function handleReflectionConfigChange(change: ConfigChange): void {
  bus.publish('cortex', 'reflection:config_update', {
    key: change.key,
    value: change.newValue,
  });
}

// ============================================================================
// EXPORT
// ============================================================================

export default router;
export { router as configurationRoutes };
