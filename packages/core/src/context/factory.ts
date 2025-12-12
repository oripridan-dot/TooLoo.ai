/**
 * @tooloo/core - Context Factory
 * Create and manage TooLooContext instances
 * 
 * @version 2.0.0-alpha.0
 */

import { v4 as uuid } from 'uuid';
import type { 
  TooLooContext, 
  Intent,
  MemoryState,
  RoutingState,
} from '../types.js';
import { 
  createSessionId, 
  createUserId, 
  createProjectId,
  createArtifactId,
} from '../types.js';
import { eventBus, createCorrelationId } from '../events/bus.js';

// =============================================================================
// CONTEXT FACTORY
// =============================================================================

/**
 * Options for creating a new context
 */
export interface CreateContextOptions {
  userId?: string;
  projectId?: string;
  sessionId?: string;
  userMessage: string;
  attachments?: TooLooContext['request']['attachments'];
}

/**
 * Create a fresh TooLooContext
 */
export function createContext(options: CreateContextOptions): TooLooContext {
  const sessionId = createSessionId(options.sessionId ?? uuid());
  const userId = createUserId(options.userId ?? 'anonymous');
  const projectId = createProjectId(options.projectId ?? 'default');
  const requestId = uuid();
  const correlationId = createCorrelationId();

  const context: TooLooContext = {
    // Identity
    sessionId,
    userId,
    projectId,

    // Memory (empty initial state)
    memory: createEmptyMemoryState(),

    // Intent (unknown until detected)
    intent: {
      type: 'unknown',
      confidence: 0,
      keywords: [],
    },
    confidence: 0,

    // Skills (none selected yet)
    activeSkills: [],

    // Artifacts (empty)
    artifacts: [],

    // Routing (no provider selected yet)
    routing: createEmptyRoutingState(),

    // Request
    request: {
      id: requestId,
      timestamp: new Date(),
      userMessage: options.userMessage,
      attachments: options.attachments,
    },

    // Execution
    execution: {
      stage: 'received',
      startTime: new Date(),
      errors: [],
    },
  };

  // Emit context created event
  eventBus.publish('system', 'context:created', { context }, correlationId);

  return context;
}

/**
 * Create empty memory state
 */
export function createEmptyMemoryState(): MemoryState {
  return {
    shortTerm: [],
    workingMemory: new Map(),
    recentArtifacts: [],
    contextWindow: {
      usedTokens: 0,
      maxTokens: 128000,  // Default to large context
      priority: 'relevance',
    },
  };
}

/**
 * Create empty routing state
 */
export function createEmptyRoutingState(): RoutingState {
  return {
    providerHealth: new Map(),
    fallbackChain: [],
  };
}

// =============================================================================
// CONTEXT MUTATIONS (Immutable Updates)
// =============================================================================

/**
 * Update context with new intent
 */
export function withIntent(ctx: TooLooContext, intent: Intent): TooLooContext {
  const previous = ctx.intent;
  const updated = {
    ...ctx,
    intent,
    confidence: intent.confidence,
    execution: {
      ...ctx.execution,
      currentStep: 'intent-detected',
    },
  };

  eventBus.publish('cortex', 'intent:detected', { intent, source: 'context' });
  if (previous.type !== 'unknown') {
    eventBus.publish('cortex', 'intent:changed', { previous, current: intent });
  }

  return updated;
}

/**
 * Update context with selected skills
 */
export function withSkills(
  ctx: TooLooContext, 
  skillIds: string[], 
  composedPrompt?: string
): TooLooContext {
  const updated = {
    ...ctx,
    activeSkills: skillIds as TooLooContext['activeSkills'],
    composedPrompt,
    execution: {
      ...ctx.execution,
      stage: 'skill-selection' as const,
      currentStep: 'skills-selected',
    },
  };

  eventBus.publish('skills', 'skill:selected', { 
    skillIds, 
    reason: 'context-update' 
  });

  return updated;
}

/**
 * Update context with routing decision
 */
export function withRouting(
  ctx: TooLooContext,
  providerId: string,
  model: string,
  decision?: TooLooContext['routing']['decision']
): TooLooContext {
  return {
    ...ctx,
    routing: {
      ...ctx.routing,
      currentProvider: providerId as TooLooContext['routing']['currentProvider'],
      currentModel: model,
      decision,
    },
    execution: {
      ...ctx.execution,
      stage: 'routing',
      currentStep: 'provider-selected',
    },
  };
}

/**
 * Add message to short-term memory
 */
export function withMessage(
  ctx: TooLooContext,
  message: TooLooContext['memory']['shortTerm'][0]
): TooLooContext {
  return {
    ...ctx,
    memory: {
      ...ctx.memory,
      shortTerm: [...ctx.memory.shortTerm, message],
      contextWindow: {
        ...ctx.memory.contextWindow,
        usedTokens: ctx.memory.contextWindow.usedTokens + (message.metadata?.tokenCount ?? 0),
      },
    },
  };
}

/**
 * Update execution stage
 */
export function withStage(
  ctx: TooLooContext,
  stage: TooLooContext['execution']['stage'],
  currentStep?: string
): TooLooContext {
  const from = ctx.execution.stage;
  const updated = {
    ...ctx,
    execution: {
      ...ctx.execution,
      stage,
      currentStep,
    },
  };

  eventBus.publish('system', 'execution:stage_change', {
    requestId: ctx.request.id,
    from,
    to: stage,
  });

  return updated;
}

/**
 * Add error to context
 */
export function withError(
  ctx: TooLooContext,
  code: string,
  message: string,
  recoverable: boolean
): TooLooContext {
  return {
    ...ctx,
    execution: {
      ...ctx.execution,
      stage: recoverable ? ctx.execution.stage : 'error',
      errors: [
        ...ctx.execution.errors,
        { code, message, recoverable },
      ],
    },
  };
}

/**
 * Set response content
 */
export function withResponse(
  ctx: TooLooContext,
  content: string,
  artifacts: string[] = [],
  suggestions?: string[],
  followUp?: string
): TooLooContext {
  return {
    ...ctx,
    response: {
      content,
      artifacts: artifacts.map(a => createArtifactId(a)),
      suggestions,
      followUp,
    },
    execution: {
      ...ctx.execution,
      stage: 'complete',
    },
  };
}

// =============================================================================
// CONTEXT UTILITIES
// =============================================================================

/**
 * Get total execution time in ms
 */
export function getExecutionTime(ctx: TooLooContext): number {
  return Date.now() - ctx.execution.startTime.getTime();
}

/**
 * Check if context has errors
 */
export function hasErrors(ctx: TooLooContext): boolean {
  return ctx.execution.errors.length > 0;
}

/**
 * Check if context has fatal (non-recoverable) errors
 */
export function hasFatalErrors(ctx: TooLooContext): boolean {
  return ctx.execution.errors.some((e) => !e.recoverable);
}

/**
 * Get remaining token budget
 */
export function getRemainingTokens(ctx: TooLooContext): number {
  return ctx.memory.contextWindow.maxTokens - ctx.memory.contextWindow.usedTokens;
}

/**
 * Serialize context for logging/storage
 */
export function serializeContext(ctx: TooLooContext): string {
  return JSON.stringify(ctx, (_key, value) => {
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }, 2);
}
