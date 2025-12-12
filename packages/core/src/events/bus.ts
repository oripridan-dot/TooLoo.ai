/**
 * @tooloo/core - Typed Event System
 * Strongly-typed EventBus with Zod validation
 * 
 * @version 2.0.0-alpha.0
 */

import { z } from 'zod';
import type { TooLooContext, Intent, Artifact, RoutingDecision, ProviderHealth, Chunk } from '../types.js';

// =============================================================================
// EVENT TYPE DEFINITIONS
// =============================================================================

/**
 * All possible event sources in the system
 */
export type EventSource = 
  | 'cortex'    // Cognitive processing
  | 'precog'    // Provider routing
  | 'nexus'     // API layer
  | 'memory'    // Memory systems
  | 'skills'    // Skill system
  | 'qa'        // Quality assurance
  | 'system';   // System-level events

/**
 * Event categories and their payloads
 */
export interface EventMap {
  // System Events
  'system:boot_complete': { version: string; startTime: Date };
  'system:shutdown': { reason: string; graceful: boolean };
  'system:error': { code: string; message: string; stack?: string };
  'system:heartbeat': { uptime: number; memoryUsage: number };
  
  // Context Events
  'context:created': { context: TooLooContext };
  'context:updated': { context: TooLooContext; changes: string[] };
  'context:destroyed': { sessionId: string; reason: string };
  
  // Intent Events
  'intent:detected': { intent: Intent; source: string };
  'intent:changed': { previous: Intent; current: Intent };
  'intent:confidence_low': { intent: Intent; threshold: number };
  
  // Skill Events
  'skill:loaded': { skillId: string; name: string };
  'skill:unloaded': { skillId: string; reason: string };
  'skill:selected': { skillIds: string[]; reason: string };
  'skill:composed': { skillIds: string[]; promptLength: number };
  'skill:execution_start': { skillId: string; context: TooLooContext };
  'skill:execution_complete': { skillId: string; duration: number };
  'skill:execution_error': { skillId: string; error: string };
  
  // Routing Events
  'routing:decision': { decision: RoutingDecision };
  'routing:fallback': { from: string; to: string; reason: string };
  'routing:circuit_open': { providerId: string; failures: number };
  'routing:circuit_close': { providerId: string };
  'routing:provider_health': { health: ProviderHealth };
  
  // Memory Events
  'memory:store': { entryId: string; source: string };
  'memory:retrieve': { query: string; results: number };
  'memory:cache_hit': { query: string; savings: number };
  'memory:cache_miss': { query: string };
  'memory:prune': { removed: number; reason: string };
  
  // Artifact Events
  'artifact:created': { artifact: Artifact };
  'artifact:updated': { artifact: Artifact; changes: string[] };
  'artifact:validated': { artifactId: string; score: number; issues: string[] };
  'artifact:saved': { artifactId: string; path: string };
  
  // Execution Events
  'execution:start': { requestId: string; stage: string };
  'execution:stage_change': { requestId: string; from: string; to: string };
  'execution:chunk': { requestId: string; chunk: Chunk };
  'execution:complete': { requestId: string; duration: number; success: boolean };
  'execution:error': { requestId: string; error: string; recoverable: boolean };
  
  // Critique Events (Self-Correction)
  'critique:start': { requestId: string; iteration: number };
  'critique:result': { requestId: string; needsRevision: boolean; score: number };
  'critique:revision_start': { requestId: string; iteration: number };
  'critique:max_iterations': { requestId: string; finalScore: number };
  
  // QA Events
  'qa:validation_pass': { requestId: string; layer: string };
  'qa:validation_fail': { requestId: string; layer: string; reason: string };
  'qa:quality_alert': { metric: string; value: number; threshold: number };
}

/**
 * Event type union
 */
export type EventType = keyof EventMap;

/**
 * Event payload for a specific event type
 */
export type EventPayload<T extends EventType> = EventMap[T];

/**
 * Full event structure
 */
export interface Event<T extends EventType = EventType> {
  id: string;
  type: T;
  source: EventSource;
  payload: EventPayload<T>;
  timestamp: Date;
  correlationId?: string;  // For tracing related events
}

// =============================================================================
// EVENT SCHEMAS (ZOD)
// =============================================================================

/**
 * Base event schema
 */
export const BaseEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  source: z.enum(['cortex', 'precog', 'nexus', 'memory', 'skills', 'qa', 'system']),
  timestamp: z.coerce.date(),
  correlationId: z.string().optional(),
});

// =============================================================================
// TYPED EVENT BUS
// =============================================================================

type EventHandler<T extends EventType> = (event: Event<T>) => void | Promise<void>;
type WildcardHandler = (event: Event) => void | Promise<void>;

/**
 * Typed EventBus with full TypeScript support
 * 
 * Features:
 * - Type-safe publish/subscribe
 * - Wildcard listeners
 * - Async handler support
 * - Event history (optional)
 * - Correlation ID tracking
 */
export class TypedEventBus {
  private handlers: Map<EventType, Set<EventHandler<EventType>>> = new Map();
  private wildcardHandlers: Set<WildcardHandler> = new Set();
  private eventHistory: Event[] = [];
  private historyLimit: number;
  private eventCounter = 0;

  constructor(options: { historyLimit?: number } = {}) {
    this.historyLimit = options.historyLimit ?? 1000;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${++this.eventCounter}`;
  }

  /**
   * Publish a typed event
   */
  publish<T extends EventType>(
    source: EventSource,
    type: T,
    payload: EventPayload<T>,
    correlationId?: string
  ): Event<T> {
    const event: Event<T> = {
      id: this.generateEventId(),
      type,
      source,
      payload,
      timestamp: new Date(),
      correlationId,
    };

    // Store in history
    this.eventHistory.push(event as Event);
    if (this.eventHistory.length > this.historyLimit) {
      this.eventHistory.shift();
    }

    // Notify specific handlers
    const handlers = this.handlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          const result = handler(event as Event<EventType>);
          if (result instanceof Promise) {
            result.catch((err) => {
              console.error(`Event handler error for ${type}:`, err);
            });
          }
        } catch (err) {
          console.error(`Event handler error for ${type}:`, err);
        }
      }
    }

    // Notify wildcard handlers
    for (const handler of this.wildcardHandlers) {
      try {
        const result = handler(event as Event);
        if (result instanceof Promise) {
          result.catch((err) => {
            console.error(`Wildcard handler error:`, err);
          });
        }
      } catch (err) {
        console.error(`Wildcard handler error:`, err);
      }
    }

    return event;
  }

  /**
   * Subscribe to a specific event type
   */
  on<T extends EventType>(type: T, handler: EventHandler<T>): () => void {
    let handlers = this.handlers.get(type);
    if (!handlers) {
      handlers = new Set();
      this.handlers.set(type, handlers);
    }
    handlers.add(handler as EventHandler<EventType>);

    // Return unsubscribe function
    return () => {
      handlers?.delete(handler as EventHandler<EventType>);
    };
  }

  /**
   * Subscribe to all events
   */
  onAll(handler: WildcardHandler): () => void {
    this.wildcardHandlers.add(handler);
    return () => {
      this.wildcardHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to events matching a pattern
   */
  onPattern(pattern: RegExp, handler: WildcardHandler): () => void {
    const filteredHandler: WildcardHandler = (event) => {
      if (pattern.test(event.type)) {
        handler(event);
      }
    };
    return this.onAll(filteredHandler);
  }

  /**
   * Wait for a specific event (Promise-based)
   */
  waitFor<T extends EventType>(
    type: T,
    options: { timeout?: number; filter?: (event: Event<T>) => boolean } = {}
  ): Promise<Event<T>> {
    const { timeout = 30000, filter } = options;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for event: ${type}`));
      }, timeout);

      const unsubscribe = this.on(type, (event) => {
        if (!filter || filter(event)) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(event);
        }
      });
    });
  }

  /**
   * Get recent events (from history)
   */
  getHistory(options: {
    type?: EventType;
    source?: EventSource;
    limit?: number;
    since?: Date;
  } = {}): Event[] {
    let events = [...this.eventHistory];

    if (options.type) {
      events = events.filter((e) => e.type === options.type);
    }
    if (options.source) {
      events = events.filter((e) => e.source === options.source);
    }
    if (options.since !== undefined) {
      const since = options.since;
      events = events.filter((e) => e.timestamp >= since);
    }
    if (options.limit) {
      events = events.slice(-options.limit);
    }

    return events;
  }

  /**
   * Get events by correlation ID
   */
  getCorrelated(correlationId: string): Event[] {
    return this.eventHistory.filter((e) => e.correlationId === correlationId);
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get handler count for debugging
   */
  getStats(): { handlers: number; wildcardHandlers: number; historySize: number } {
    let totalHandlers = 0;
    for (const handlers of this.handlers.values()) {
      totalHandlers += handlers.size;
    }
    return {
      handlers: totalHandlers,
      wildcardHandlers: this.wildcardHandlers.size,
      historySize: this.eventHistory.length,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Global event bus instance
 */
export const eventBus = new TypedEventBus({ historyLimit: 1000 });

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Publish an event (shorthand)
 */
export function emit<T extends EventType>(
  source: EventSource,
  type: T,
  payload: EventPayload<T>,
  correlationId?: string
): Event<T> {
  return eventBus.publish(source, type, payload, correlationId);
}

/**
 * Subscribe to an event (shorthand)
 */
export function on<T extends EventType>(type: T, handler: EventHandler<T>): () => void {
  return eventBus.on(type, handler);
}

/**
 * Create a correlation ID for tracing related events
 */
export function createCorrelationId(): string {
  return `cor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
