/**
 * TooLoo.ai Service Registry
 * Single source of truth for all services in the system
 */

export const SERVICES = [
  // Tier 0: Foundation services (no dependencies)
  {
    name: 'web-server',
    port: 3000,
    file: 'servers/web-server.js',
    tier: 0,
    endpoints: { health: '/health', status: '/system/status' },
    timeout: 5000,
    required: true,
    restartPolicy: 'always',
    description: 'Web proxy and main UI server'
  },

  // Tier 1: Independent services (can start in parallel)
  {
    name: 'training-server',
    port: 3001,
    file: 'servers/training-server.js',
    tier: 1,
    endpoints: { health: '/health', overview: '/api/v1/training/overview' },
    timeout: 8000,
    required: false,
    restartPolicy: 'on-error',
    description: 'Training and selection engine'
  },
  {
    name: 'meta-server',
    port: 3002,
    file: 'servers/meta-server.js',
    tier: 1,
    endpoints: { health: '/health' },
    timeout: 8000,
    required: false,
    restartPolicy: 'on-error',
    description: 'Meta-learning and boost system'
  },
  {
    name: 'budget-server',
    port: 3003,
    file: 'servers/budget-server.js',
    tier: 1,
    endpoints: { health: '/health', status: '/api/v1/providers/status' },
    timeout: 6000,
    required: true,
    restartPolicy: 'always',
    description: 'Provider budget and policy management'
  },

  // Tier 2: Services that depend on tier 1
  {
    name: 'coach-server',
    port: 3004,
    file: 'servers/coach-server.js',
    tier: 2,
    endpoints: { health: '/health', status: '/api/v1/auto-coach/status' },
    timeout: 7000,
    required: false,
    restartPolicy: 'on-error',
    dependsOn: ['budget-server'],
    description: 'Auto-Coach learning loop'
  },
  {
    name: 'cup-server',
    port: 3005,
    file: 'servers/cup-server.js',
    tier: 2,
    endpoints: { health: '/health' },
    timeout: 7000,
    required: false,
    restartPolicy: 'on-error',
    description: 'Provider Cup mini-tournaments'
  },

  // Tier 3: Higher-level services
  {
    name: 'product-development-server',
    port: 3006,
    file: 'servers/product-development-server.js',
    tier: 3,
    endpoints: { health: '/health' },
    timeout: 8000,
    required: false,
    restartPolicy: 'on-error',
    dependsOn: ['training-server', 'budget-server'],
    description: 'Product development and workflows'
  },
  {
    name: 'segmentation-server',
    port: 3007,
    file: 'servers/segmentation-server.js',
    tier: 3,
    endpoints: { health: '/health', status: '/api/v1/segmentation/status' },
    timeout: 8000,
    required: false,
    restartPolicy: 'on-error',
    description: 'Conversation segmentation and traits'
  },

  // Tier 4: Reporting and auxiliary services
  {
    name: 'reports-server',
    port: 3008,
    file: 'servers/reports-server.js',
    tier: 4,
    endpoints: { health: '/health' },
    timeout: 6000,
    required: false,
    restartPolicy: 'on-error',
    description: 'Reporting and analytics'
  },
  {
    name: 'capabilities-server',
    port: 3009,
    file: 'servers/capabilities-server.js',
    tier: 4,
    endpoints: { health: '/health' },
    timeout: 6000,
    required: false,
    restartPolicy: 'on-error',
    description: 'Capability workflows and management'
  }
];

/**
 * Get services by tier (for parallel startup)
 */
export function getServicesByTier(tier) {
  return SERVICES.filter(s => s.tier === tier);
}

/**
 * Get all tiers
 */
export function getAllTiers() {
  return [...new Set(SERVICES.map(s => s.tier))].sort((a, b) => a - b);
}

/**
 * Get service by name
 */
export function getService(name) {
  return SERVICES.find(s => s.name === name);
}

/**
 * Get required services
 */
export function getRequiredServices() {
  return SERVICES.filter(s => s.required);
}

/**
 * Validate service config
 */
export function validateServiceConfig() {
  const errors = [];

  // Check for duplicate ports
  const ports = SERVICES.map(s => s.port);
  const duplicates = ports.filter((p, i) => ports.indexOf(p) !== i);
  if (duplicates.length) {
    errors.push(`Duplicate ports: ${[...new Set(duplicates)].join(', ')}`);
  }

  // Check for duplicate names
  const names = SERVICES.map(s => s.name);
  const dupNames = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupNames.length) {
    errors.push(`Duplicate names: ${[...new Set(dupNames)].join(', ')}`);
  }

  // Check dependencies exist
  SERVICES.forEach(s => {
    if (s.dependsOn) {
      s.dependsOn.forEach(dep => {
        if (!SERVICES.find(svc => svc.name === dep)) {
          errors.push(`${s.name} depends on non-existent service: ${dep}`);
        }
      });
    }
  });

  return { valid: errors.length === 0, errors };
}
