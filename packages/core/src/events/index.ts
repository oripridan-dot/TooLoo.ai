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
