// @version 1.0.0
/**
 * @tooloo/memory - Main Entry Point
 * Unified memory store with semantic caching, session context, and memory cortex
 * 
 * @version 2.0.0
 * @skill-os true
 */

// Types
export * from './types.js';

// =============================================================================
// NEW: Memory Cortex (Unified Memory Manager)
// =============================================================================

export {
  MemoryCortex,
  getMemoryCortex,
  resetMemoryCortex,
  type MemoryType,
  type MemoryTier,
  type ConsolidationResult,
  type MemoryStats,
  type StoreMemoryInput,
  type MemoryCortexOptions,
} from './cortex.js';

// =============================================================================
// NEW: Session Store (Conversation Context)
// =============================================================================

export {
  SessionStore,
  getSessionStore,
  resetSessionStore,
  type SessionContext,
  type ConversationMessage,
  type WorkingMemorySlot,
  type SessionStoreOptions,
} from './session-store.js';

// =============================================================================
// NEW: Short-Term Store (LRU Cache with TTL)
// =============================================================================

export {
  ShortTermStore,
  type ShortTermStoreOptions,
  type ShortTermStats,
} from './short-term-store.js';

// =============================================================================
// NEW: Embedding Utilities
// =============================================================================

export {
  cosineSimilarity,
  euclideanDistance,
  normalizeVector,
  averageVectors,
  LocalEmbedder,
  OpenAIEmbedder,
  createEmbedder,
  type EmbedderConfig,
} from './embedding.js';

// =============================================================================
// Existing: Event Store (Source of Truth)
// =============================================================================

export {
  SQLiteEventStore,
  ConcurrencyError,
  EventStoreError,
  type EventStore,
  type AppendOptions,
  type ReadOptions,
  type StreamReadOptions,
} from './event-store.js';

// =============================================================================
// Existing: Event Projections (Read Models)
// =============================================================================

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

// =============================================================================
// Existing: Semantic Cache
// =============================================================================

export {
  SQLiteSemanticCache,
} from './semantic-cache.js';

// Version
export const VERSION = '2.0.0';
