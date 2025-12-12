/**
 * @tooloo/core - Events Module
 * Re-exports all event-related functionality
 * 
 * @version 2.0.0-alpha.0
 */

export {
  TypedEventBus,
  eventBus,
  emit,
  on,
  createCorrelationId,
  BaseEventSchema,
  type EventMap,
  type EventType,
  type EventPayload,
  type Event,
  type EventSource,
} from './bus.js';

// Legacy adapter for backward compatibility
export {
  LegacyEventBusAdapter,
  typedEventBus,
  legacyBus,
  bus,
  type VisualData,
  type DesignerAction,
  type EventContext,
  type EnhancedEventPayload,
  type LegacyEventSource,
  type SynapsysEvent,
  type EventFilter,
  type EventInterceptor,
} from './legacy-adapter.js';
