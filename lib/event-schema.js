/**
 * Event Schema - Define valid event types and validation
 * 
 * Central registry of all events in the system with:
 * - Event type definitions
 * - Required and optional fields
 * - Data validation
 * - Event creation helpers
 */

import { v4 as uuid } from 'uuid';

/**
 * Event type schemas with validation rules
 */
export const EVENT_SCHEMAS = {
  // Learning domain events
  'training.started': {
    domain: 'learning',
    description: 'User starts a training camp',
    requiredFields: ['userId', 'campId', 'topic'],
    optionalFields: ['metadata']
  },
  'training.paused': {
    domain: 'learning',
    description: 'User pauses training',
    requiredFields: ['userId', 'campId'],
    optionalFields: ['reason']
  },
  'training.completed': {
    domain: 'learning',
    description: 'User completes training camp',
    requiredFields: ['userId', 'campId', 'score'],
    optionalFields: ['insights', 'improvements']
  },
  'mastery.improved': {
    domain: 'learning',
    description: 'User improves mastery of a concept',
    requiredFields: ['userId', 'topic', 'previousScore', 'newScore'],
    optionalFields: ['delta', 'milestoneReached']
  },
  'challenge.started': {
    domain: 'learning',
    description: 'User starts a challenge',
    requiredFields: ['userId', 'challengeId', 'topic'],
    optionalFields: ['difficulty']
  },
  'challenge.completed': {
    domain: 'learning',
    description: 'User completes a challenge',
    requiredFields: ['userId', 'challengeId', 'passed'],
    optionalFields: ['attempts', 'timeSpent']
  },

  // Provider domain events
  'provider.selected': {
    domain: 'provider',
    description: 'Provider selected for a query',
    requiredFields: ['userId', 'providerId', 'model'],
    optionalFields: ['reason', 'cost', 'priority']
  },
  'provider.query.started': {
    domain: 'provider',
    description: 'Query started with provider',
    requiredFields: ['userId', 'queryId', 'providerId'],
    optionalFields: ['tokens', 'model']
  },
  'provider.query.completed': {
    domain: 'provider',
    description: 'Query completed with provider',
    requiredFields: ['userId', 'queryId', 'providerId', 'success'],
    optionalFields: ['cost', 'tokensUsed', 'latency']
  },
  'provider.budget.exceeded': {
    domain: 'provider',
    description: 'Budget limit reached for provider',
    requiredFields: ['providerId', 'dailyBudget'],
    optionalFields: ['currentSpend', 'timeRemaining']
  },
  'provider.priority.changed': {
    domain: 'provider',
    description: 'Provider priority changed',
    requiredFields: ['providerId', 'oldPriority', 'newPriority'],
    optionalFields: ['reason']
  },

  // Orchestration domain events
  'intent.created': {
    domain: 'orchestration',
    description: 'User intent detected and created',
    requiredFields: ['userId', 'intentId', 'type', 'target'],
    optionalFields: ['confidence', 'context', 'metadata']
  },
  'dag.built': {
    domain: 'orchestration',
    description: 'Execution DAG built from intent',
    requiredFields: ['userId', 'intentId', 'dagId', 'taskCount'],
    optionalFields: ['estimatedTime', 'dependencies']
  },
  'task.executed': {
    domain: 'orchestration',
    description: 'Task executed in DAG',
    requiredFields: ['userId', 'dagId', 'taskId', 'status'],
    optionalFields: ['output', 'error', 'latency']
  },
  'screen.captured': {
    domain: 'orchestration',
    description: 'Screen state captured',
    requiredFields: ['userId', 'timestamp', 'changes'],
    optionalFields: ['imageUrl', 'hash']
  },

  // Integration domain events
  'oauth.started': {
    domain: 'integration',
    description: 'OAuth flow initiated',
    requiredFields: ['userId', 'provider'],
    optionalFields: ['state', 'redirectUrl']
  },
  'oauth.completed': {
    domain: 'integration',
    description: 'OAuth flow completed',
    requiredFields: ['userId', 'provider', 'success'],
    optionalFields: ['accessToken', 'expiresAt']
  },
  'github.connected': {
    domain: 'integration',
    description: 'GitHub account connected',
    requiredFields: ['userId', 'githubUsername'],
    optionalFields: ['repos', 'scope']
  },
  'github.sync.started': {
    domain: 'integration',
    description: 'GitHub repo sync started',
    requiredFields: ['userId', 'repoId'],
    optionalFields: ['fullSync']
  },
  'github.issue.synced': {
    domain: 'integration',
    description: 'GitHub issue synced',
    requiredFields: ['userId', 'repoId', 'issueId'],
    optionalFields: ['status', 'lastSyncTime']
  },
  'webhook.received': {
    domain: 'integration',
    description: 'Webhook received from external service',
    requiredFields: ['source', 'eventType'],
    optionalFields: ['payload', 'timestamp']
  },

  // Analytics domain events
  'learning.velocity.calculated': {
    domain: 'analytics',
    description: 'Learning velocity metric calculated',
    requiredFields: ['userId', 'velocity'],
    optionalFields: ['period', 'trend', 'comparison']
  },
  'badge.earned': {
    domain: 'analytics',
    description: 'User earned a badge',
    requiredFields: ['userId', 'badgeId', 'badgeName'],
    optionalFields: ['category', 'level']
  },
  'milestone.reached': {
    domain: 'analytics',
    description: 'User reached a milestone',
    requiredFields: ['userId', 'milestoneId', 'milestoneName'],
    optionalFields: ['category', 'reward']
  },
  'engagement.tracked': {
    domain: 'analytics',
    description: 'User engagement metric tracked',
    requiredFields: ['userId', 'eventType'],
    optionalFields: ['duration', 'feature', 'action']
  },

  // Product domain events
  'workflow.created': {
    domain: 'product',
    description: 'Workflow created',
    requiredFields: ['userId', 'workflowId', 'name'],
    optionalFields: ['steps', 'description']
  },
  'artifact.generated': {
    domain: 'product',
    description: 'Product artifact generated',
    requiredFields: ['userId', 'artifactId', 'type'],
    optionalFields: ['content', 'url', 'format']
  },

  // Context domain events
  'context.loaded': {
    domain: 'context',
    description: 'Context loaded from repo',
    requiredFields: ['userId', 'repoId'],
    optionalFields: ['files', 'issues', 'structure']
  },

  // Design domain events
  'design.component.updated': {
    domain: 'design',
    description: 'Design component updated',
    requiredFields: ['componentId', 'version'],
    optionalFields: ['changes', 'author']
  }
};

/**
 * Validate an event against its schema
 * @param {string} type - Event type
 * @param {object} data - Event data
 * @throws {Error} If event is invalid
 */
export function validateEvent(type, data) {
  const schema = EVENT_SCHEMAS[type];
  
  if (!schema) {
    throw new Error(`Unknown event type: ${type}`);
  }

  // Check required fields
  for (const field of schema.requiredFields) {
    if (!(field in data)) {
      throw new Error(`Event ${type} missing required field: ${field}`);
    }
  }

  // Warn about unknown fields (but don't fail)
  const knownFields = new Set([...schema.requiredFields, ...schema.optionalFields]);
  for (const field in data) {
    if (!knownFields.has(field)) {
      console.warn(`Event ${type} has unexpected field: ${field}`);
    }
  }
}

/**
 * Create a validated event
 * @param {string} type - Event type
 * @param {string} aggregateId - Aggregate ID (usually userId or entityId)
 * @param {object} data - Event data
 * @returns {object} Event object
 */
export function createEvent(type, aggregateId, data = {}) {
  // Validate
  validateEvent(type, data);

  // Create event
  return {
    id: uuid(),
    type,
    aggregateId,
    timestamp: Date.now(),
    data,
    metadata: {
      createdBy: 'system',
      environment: process.env.NODE_ENV || 'development'
    }
  };
}

/**
 * Get schema for an event type
 * @param {string} type - Event type
 * @returns {object} Event schema
 */
export function getEventSchema(type) {
  const schema = EVENT_SCHEMAS[type];
  if (!schema) {
    throw new Error(`Unknown event type: ${type}`);
  }
  return schema;
}

/**
 * Get all event types for a domain
 * @param {string} domain - Domain name
 * @returns {string[]} Event types in domain
 */
export function getEventsByDomain(domain) {
  return Object.keys(EVENT_SCHEMAS).filter(
    type => EVENT_SCHEMAS[type].domain === domain
  );
}

/**
 * Get all event types
 * @returns {string[]} All event types
 */
export function getAllEventTypes() {
  return Object.keys(EVENT_SCHEMAS);
}

/**
 * Get summary of event schemas
 * @returns {object} Summary data
 */
export function getSchemaSummary() {
  const domains = {};

  for (const [type, schema] of Object.entries(EVENT_SCHEMAS)) {
    if (!domains[schema.domain]) {
      domains[schema.domain] = [];
    }
    domains[schema.domain].push({
      type,
      description: schema.description,
      requiredFields: schema.requiredFields,
      optionalFields: schema.optionalFields
    });
  }

  return domains;
}

export default {
  EVENT_SCHEMAS,
  validateEvent,
  createEvent,
  getEventSchema,
  getEventsByDomain,
  getAllEventTypes,
  getSchemaSummary
};
