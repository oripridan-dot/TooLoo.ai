/**
 * @tooloo/core - Legacy EventBus Adapter
 * Provides backward compatibility with src/core/event-bus.ts
 * 
 * This adapter wraps the new TypedEventBus and exposes the legacy
 * API used throughout the existing codebase.
 * 
 * @version 2.0.0-alpha.0
 */

import { TypedEventBus, type EventType, type EventSource, type EventPayload } from './bus.js';

// =============================================================================
// LEGACY TYPE DEFINITIONS (from src/core/event-bus.ts)
// =============================================================================

/**
 * Visual data for rich events
 */
export interface VisualData {
  type: 'image' | 'diagram' | 'component' | 'comparison' | 'process' | 'data';
  data: string; // base64 encoded image, mermaid diagram, or JSON component definition
  mimeType?: string;
  altText?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Designer action for component events
 */
export interface DesignerAction {
  action: 'create' | 'update' | 'delete' | 'get' | 'sync' | 'broadcast';
  target: 'component' | 'design' | 'style' | 'system' | 'layout';
  payload: unknown;
  componentId?: string;
  timestamp?: number;
}

/**
 * Event context for tracing
 */
export interface EventContext {
  userId?: string;
  conversationId?: string;
  projectId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

/**
 * Enhanced payload structure (legacy format)
 */
export interface EnhancedEventPayload<T = unknown> {
  type: string;
  data: T;
  visual?: VisualData;
  designerAction?: DesignerAction;
  context?: EventContext;
  metadata?: {
    intent?: string;
    reason?: string;
    priority?: 'low' | 'normal' | 'high';
    retryable?: boolean;
    timeout?: number;
    [key: string]: unknown;
  };
}

/**
 * Legacy event source type (superset of new EventSource)
 */
export type LegacyEventSource =
  | EventSource
  | 'ui'
  | 'learning'
  | 'agent'
  | 'initiative'
  | 'suggestions'
  | 'user';

/**
 * Legacy event shape
 */
export interface SynapsysEvent<T = unknown> {
  source: LegacyEventSource;
  type: string;
  payload: T | EnhancedEventPayload<T>;
  timestamp: number;
  id?: string;
}

/**
 * Event filter for selective subscriptions
 */
export interface EventFilter {
  types?: string[];
  visualTypes?: VisualData['type'][];
  designerTargets?: DesignerAction['target'][];
  sources?: SynapsysEvent['source'][];
}

/**
 * Event interceptor function
 */
export type EventInterceptor = (event: SynapsysEvent) => boolean | Promise<boolean>;

// =============================================================================
// LEGACY ADAPTER CLASS
// =============================================================================

/**
 * LegacyEventBusAdapter - Bridge between old and new event systems
 * 
 * Maintains backward compatibility while routing events through
 * the new TypedEventBus where possible.
 */
export class LegacyEventBusAdapter {
  private typedBus: TypedEventBus;
  private interceptors: EventInterceptor[] = [];
  private eventHistory: SynapsysEvent[] = [];
  private maxHistorySize: number = 1000;
  private eventFilters: Map<string, EventFilter> = new Map();
  private legacyHandlers: Map<string, Set<(event: SynapsysEvent) => void>> = new Map();
  private wildcardHandlers: Set<(event: SynapsysEvent) => void> = new Set();

  constructor(typedBus?: TypedEventBus) {
    this.typedBus = typedBus ?? new TypedEventBus();
  }

  /**
   * Get the underlying TypedEventBus
   */
  get typed(): TypedEventBus {
    return this.typedBus;
  }

  /**
   * Add an interceptor
   */
  addInterceptor(interceptor: EventInterceptor): void {
    this.interceptors.push(interceptor);
  }

  /**
   * Register an event filter for a subscriber
   */
  registerFilter(subscriberId: string, filter: EventFilter): void {
    this.eventFilters.set(subscriberId, filter);
  }

  /**
   * Check if event matches filter
   */
  private matchesFilter(event: SynapsysEvent, filter: EventFilter): boolean {
    if (filter.types && !filter.types.includes(event.type)) return false;

    const payload = event.payload as EnhancedEventPayload | undefined;

    if (filter.visualTypes && payload?.visual && !filter.visualTypes.includes(payload.visual.type)) {
      return false;
    }

    if (filter.designerTargets && payload?.designerAction && 
        !filter.designerTargets.includes(payload.designerAction.target)) {
      return false;
    }

    if (filter.sources && !filter.sources.includes(event.source)) {
      return false;
    }

    return true;
  }

  /**
   * Emit an event (legacy method)
   */
  async emitEvent(event: SynapsysEvent): Promise<void> {
    // Add unique ID if missing
    if (!event.id) {
      event.id = crypto.randomUUID();
    }

    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Run interceptors
    for (const interceptor of this.interceptors) {
      try {
        const allow = await interceptor(event);
        if (!allow) return;
      } catch (e) {
        console.error('[LegacyEventBusAdapter] Interceptor error:', e);
      }
    }

    // Try to route through typed bus if event type is known
    if (this.isKnownEventType(event.type)) {
      this.routeToTypedBus(event);
    }

    // Notify legacy wildcard listeners
    for (const handler of this.wildcardHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('[LegacyEventBusAdapter] Wildcard handler error:', e);
      }
    }

    // Notify legacy specific listeners
    const handlers = this.legacyHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (e) {
          console.error(`[LegacyEventBusAdapter] Handler error for ${event.type}:`, e);
        }
      }
    }

    // Emit visual updates if present
    const payload = event.payload as EnhancedEventPayload | undefined;
    if (payload?.visual) {
      this.notifyHandlers('visual:update', event);
      this.notifyHandlers(`visual:${payload.visual.type}`, event);
    }

    // Emit designer updates if present
    if (payload?.designerAction) {
      this.notifyHandlers('designer:action', event);
      this.notifyHandlers(`designer:${payload.designerAction.target}`, event);
    }
  }

  /**
   * Helper to notify handlers for a specific event type
   */
  private notifyHandlers(type: string, event: SynapsysEvent): void {
    const handlers = this.legacyHandlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (e) {
          console.error(`[LegacyEventBusAdapter] Handler error for ${type}:`, e);
        }
      }
    }
  }

  /**
   * Check if event type exists in TypedEventBus
   */
  private isKnownEventType(type: string): type is EventType {
    // Known event type prefixes
    const knownPrefixes = [
      'system:',
      'context:',
      'intent:',
      'skill:',
      'routing:',
      'memory:',
      'artifact:',
      'execution:',
      'critique:',
      'qa:',
    ];
    return knownPrefixes.some(prefix => type.startsWith(prefix));
  }

  /**
   * Route legacy event to typed bus
   */
  private routeToTypedBus(event: SynapsysEvent): void {
    // Map legacy source to typed source
    const source = this.mapSource(event.source);
    const type = event.type as EventType;
    
    try {
      this.typedBus.publish(source, type, event.payload as EventPayload<typeof type>);
    } catch {
      // Silently ignore if event doesn't match typed schema
    }
  }

  /**
   * Map legacy source to typed source
   */
  private mapSource(source: LegacyEventSource): EventSource {
    const mapping: Record<string, EventSource> = {
      ui: 'nexus',
      learning: 'cortex',
      agent: 'cortex',
      initiative: 'cortex',
      suggestions: 'cortex',
      user: 'nexus',
    };
    return (mapping[source] as EventSource) ?? (source as EventSource);
  }

  /**
   * Publish event (legacy API)
   */
  publish(source: LegacyEventSource, type: string, payload: unknown): void {
    const event: SynapsysEvent = {
      source,
      type,
      payload,
      timestamp: Date.now(),
    };
    void this.emitEvent(event);
  }

  /**
   * Publish visual event (legacy API)
   */
  publishVisual(
    source: LegacyEventSource,
    type: string,
    data: unknown,
    visual: VisualData,
    context?: EventContext
  ): void {
    const payload: EnhancedEventPayload = {
      type,
      data,
      visual,
      context,
    };
    this.publish(source, type, payload);
  }

  /**
   * Publish designer action (legacy API)
   */
  publishDesignerAction(
    source: LegacyEventSource,
    type: string,
    action: DesignerAction,
    context?: EventContext
  ): void {
    const payload: EnhancedEventPayload = {
      type,
      data: action.payload,
      designerAction: action,
      context,
    };
    this.publish(source, type, payload);
  }

  /**
   * Subscribe to event (legacy API)
   */
  on(eventName: string, handler: (event: SynapsysEvent) => void): void {
    if (eventName === '*') {
      this.wildcardHandlers.add(handler);
    } else {
      let handlers = this.legacyHandlers.get(eventName);
      if (!handlers) {
        handlers = new Set();
        this.legacyHandlers.set(eventName, handlers);
      }
      handlers.add(handler);
    }
  }

  /**
   * Unsubscribe from event (legacy API)
   */
  off(eventName: string, handler: (event: SynapsysEvent) => void): void {
    if (eventName === '*') {
      this.wildcardHandlers.delete(handler);
    } else {
      const handlers = this.legacyHandlers.get(eventName);
      handlers?.delete(handler);
    }
  }

  /**
   * Subscribe with filtering (legacy API)
   */
  subscribeTo(
    eventName: string,
    handler: (event: SynapsysEvent) => void,
    filter?: EventFilter
  ): string {
    const subscriberId = crypto.randomUUID();

    if (filter) {
      this.registerFilter(subscriberId, filter);
    }

    const wrappedHandler = (event: SynapsysEvent) => {
      if (filter && !this.matchesFilter(event, filter)) {
        return;
      }
      handler(event);
    };

    this.on(eventName, wrappedHandler);
    return subscriberId;
  }

  /**
   * Get event history
   */
  getEventHistory(limit: number = 50): SynapsysEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }
}

// =============================================================================
// SINGLETON EXPORTS
// =============================================================================

/**
 * Shared TypedEventBus instance
 */
export const typedEventBus = new TypedEventBus();

/**
 * Legacy-compatible EventBus (use for backward compatibility)
 */
export const legacyBus = new LegacyEventBusAdapter(typedEventBus);

/**
 * Alias for backward compatibility - exports the legacy adapter
 * Code using `import { bus } from './event-bus'` will get this
 */
export const bus = legacyBus;
