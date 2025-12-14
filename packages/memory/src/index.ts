// @version 3.3.577
/**
 * @tooloo/memory - Main Entry Point
 * Unified memory store with semantic caching and event projections
 * 
 * @version 2.0.0-alpha.0
 */

// Types
export * from './types.js';

// Event Store (Source of Truth)
export {
  SQLiteEventStore,
  ConcurrencyError,
  EventStoreError,
  type EventStore,
  type AppendOptions,
  type ReadOptions,
  type StreamReadOptions,
} from './event-store.js';

// Event Projections (Read Models)
export {
  VectorProjection,
  GraphProjection,
  defaultProjectionConfig,
  type StoredEvent,
  type ProjectionState,
  type EventProjection,
  type ProjectionManager,
  type ProjectionManagerConfig,
  type VectorDocument,
  type VectorStoreConfig,
  type VectorStoreClient,
  type GraphNode,
  type GraphRelationship,
  type GraphStoreConfig,
  type GraphStoreClient,
} from './projections.js';

// Semantic Cache
export {
  SQLiteSemanticCache,
} from './semantic-cache.js';

// Version
export const VERSION = '2.0.0-alpha.0';
