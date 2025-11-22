// config/system-manifest.js
// Single source of truth for system configuration
// Updated: November 4, 2025

export const SYSTEM = {
  // ========================================================================
  // SERVICE REGISTRY
  // ========================================================================
  
  services: {
    web: {
      port: 3000,
      name: 'Web Server',
      required: true,
      file: 'servers/web-server.js',
      description: 'UI hub + API proxy'
    },
    
    orchestrator: {
      port: 3123,
      name: 'Orchestrator',
      required: true,
      file: 'servers/orchestrator.js',
      description: 'Command center + health monitoring'
    },
    
    training: {
      port: 3001,
      name: 'Training Server',
      required: true,
      file: 'servers/training-server.js',
      depends_on: ['orchestrator'],
      description: 'Hyper-speed learning'
    },
    
    meta: {
      port: 3002,
      name: 'Meta-Learning Server',
      required: true,
      file: 'servers/meta-server.js',
      depends_on: ['orchestrator'],
      description: 'Learning strategy optimization'
    },
    
    budget: {
      port: 3003,
      name: 'Budget Server',
      required: true,
      file: 'servers/budget-server.js',
      depends_on: ['orchestrator'],
      description: 'Provider management + cost control'
    },
    
    coach: {
      port: 3004,
      name: 'Coach Server',
      required: true,
      file: 'servers/coach-server.js',
      depends_on: ['orchestrator'],
      description: 'Adaptive coaching + feedback'
    },
    
    cup: {
      port: 3005,
      name: 'Provider Cup Server',
      required: false,
      file: 'servers/cup-server.js',
      depends_on: ['orchestrator'],
      description: 'Provider tournaments'
    },
    
    product: {
      port: 3006,
      name: 'Product Development Server',
      required: false,
      file: 'servers/product-development-server.js',
      depends_on: ['orchestrator'],
      description: 'Product innovation + workflows'
    },
    
    reports: {
      port: 3008,
      name: 'Reports Server',
      required: false,
      file: 'servers/reports-server.js',
      depends_on: ['orchestrator'],
      description: 'Analytics + trend analysis'
    },
    
    capabilities: {
      port: 3009,
      name: 'Capabilities Server',
      required: false,
      file: 'servers/capabilities-server.js',
      depends_on: ['orchestrator'],
      description: 'System capability management'
    }
  },

  // ========================================================================
  // PROVIDER CONFIGURATION
  // ========================================================================
  
  providers: {
    default: 'gemini',
    
    available: [
      {
        id: 'gemini',
        name: 'Gemini (Google)',
        model: 'gemini-2.0-pro-exp-02-05',
        timeout: 30000,
        retries: 2
      },
      {
        id: 'anthropic',
        name: 'Claude (Anthropic)',
        model: 'claude-3-5-haiku-20241022',
        timeout: 30000,
        retries: 3
      },
      {
        id: 'openai',
        name: 'GPT (OpenAI)',
        model: 'gpt-4o-mini',
        timeout: 30000,
        retries: 2
      },
      {
        id: 'ollama',
        name: 'Ollama (Local)',
        model: 'llama3.2:latest',
        timeout: 45000,
        retries: 1
      },
      {
        id: 'deepseek',
        name: 'DeepSeek',
        model: 'deepseek-chat',
        timeout: 30000,
        retries: 2
      }
    ],
    
    fallback_chain: ['gemini', 'anthropic', 'openai', 'ollama', 'deepseek'],
    
    global_timeout: 30000,
    max_concurrent_calls: 6
  },

  // ========================================================================
  // FEATURE FLAGS
  // ========================================================================
  
  features: {
    autoCoach: true,
    providerCup: true,
    metaLearning: true,
    semanticSegmentation: true,
    analyticsEngine: true,
    capabilitiesManager: true
  },

  // ========================================================================
  // TRAINING PARAMETERS
  // ========================================================================
  
  training: {
    round_duration: 60000,           // ms per round
    max_rounds: 1000,
    convergence_threshold: 0.001,
    early_stopping_patience: 10,
    
    phases: {
      exploration: {
        name: 'Exploration',
        duration: 30,                 // rounds
        learning_rate: 0.1,
        description: 'Try diverse strategies'
      },
      exploitation: {
        name: 'Exploitation',
        duration: 20,                 // rounds
        learning_rate: 0.05,
        description: 'Refine best strategies'
      },
      refinement: {
        name: 'Refinement',
        duration: 10,                 // rounds
        learning_rate: 0.01,
        description: 'Fine-tune parameters'
      }
    }
  },

  // ========================================================================
  // COST MANAGEMENT
  // ========================================================================
  
  budget: {
    monthly_limit: 100.00,           // USD
    daily_limit: 10.00,              // USD
    per_call_max: 0.10,              // USD
    
    cost_per_provider: {
      anthropic: 0.003,              // per 1K tokens
      openai: 0.002,
      ollama: 0,                      // Free (local)
      gemini: 0.001,
      deepseek: 0.0001
    },
    
    burst_mode: {
      enabled: true,
      cache_multiplier: 2,           // 2x cheaper for cached calls
      max_burst_cost: 50.00          // USD per burst
    }
  },

  // ========================================================================
  // SEGMENTATION (16 Traits)
  // ========================================================================
  
  segmentation_traits: [
    'decision_speed',
    'detail_orientation',
    'risk_tolerance',
    'context_switching',
    'pattern_recognition',
    'communication_style',
    'explanation_preference',
    'feedback_receptiveness',
    'collaboration_preference',
    'urgency_level',
    'structure_expectation',
    'authority_acceptance',
    'validation_need',
    'analytical_vs_intuitive',
    'breadth_vs_depth',
    'iterative_mindset'
  ],

  // ========================================================================
  // SYSTEM METRICS
  // ========================================================================
  
  metrics: {
    collection_interval: 5000,       // ms
    retention_period: 24 * 60 * 60 * 1000,  // 24 hours
    anomaly_threshold: 2.0,          // standard deviations
    
    monitored: [
      'cpu_usage',
      'memory_usage',
      'request_latency',
      'error_rate',
      'provider_response_time',
      'provider_success_rate',
      'training_accuracy',
      'training_loss',
      'validation_accuracy'
    ]
  },

  // ========================================================================
  // LOGGING
  // ========================================================================
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',  // debug, info, warn, error
    format: 'json',
    include_timestamp: true,
    include_service: true,
    include_trace_id: true
  },

  // ========================================================================
  // HEALTH CHECK
  // ========================================================================
  
  health_check: {
    interval: 10000,                 // ms
    timeout: 5000,                   // ms
    retries: 3,
    restart_on_failure: true
  },

  // ========================================================================
  // DEPRECATED / ARCHIVED
  // ========================================================================
  
  deprecated_services: [
    'analytics-server',
    'segmentation-server',
    'design-integration-server',
    'integrations-server',
    'oauth-server',
    'events-server',
    'domains-server',
    'planning-api-routes',
    'self-improvement-server',
    'github-context-server',
    'webhooks-server',
    'chat-api-bridge',
    'aggregator-server',
    'server-dashboard',
    'server-manager',
    'server-monitor',
    'deployment-controller',
    'deployment-monitor',
    'ide-server',
    'challenge-server',
    'automated-commit-service',
    'sources-server',
    'web-server-lite',
    'capability-workflow-bridge',
    'ui-activity-monitor',
    'infographics-server'
  ],

  deprecated_engines: [
    'advanced-consensus',
    'autonomous-evolution-engine',
    'book-mastery-engine',
    'doctoral-mastery-engine',
    'evolving-product-genesis-engine',
    'hyper-speed-training-camp',
    'multi-modal-validator',
    'parallel-provider-orchestrator',
    'pattern-extractor',
    'predictive-context-engine',
    'real-engine-integrator',
    'screen-capture-service',
    'summarizer',
    'tooloo-vs-baseline-comparison',
    'user-feedback',
    'web-source-pipeline-manager',
    'enhanced-learning-accumulator'
  ],

  // ========================================================================
  // ENVIRONMENT
  // ========================================================================
  
  environment: process.env.NODE_ENV || 'development',
  
  port_range: {
    min: 3000,
    max: 3010,
    orchestrator: 3123
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getService(name) {
  return SYSTEM.services[name] || null;
}

export function getAllServices() {
  return Object.values(SYSTEM.services);
}

export function getRequiredServices() {
  return Object.values(SYSTEM.services).filter(s => s.required);
}

export function getProvider(id) {
  return SYSTEM.providers.available.find(p => p.id === id) || null;
}

export function getAllProviders() {
  return SYSTEM.providers.available;
}

export function getFeature(name) {
  return SYSTEM.features[name] ?? false;
}

export function getCostPerProvider(providerId) {
  return SYSTEM.budget.cost_per_provider[providerId] || 0;
}

export function isServiceDeprecated(serviceName) {
  return SYSTEM.deprecated_services.includes(serviceName);
}

export function isEngineDeprecated(engineName) {
  return SYSTEM.deprecated_engines.includes(engineName);
}

export default SYSTEM;
