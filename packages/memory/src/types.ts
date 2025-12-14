// @version 3.3.577
/**
 * @tooloo/memory - Memory Types
 * Unified memory store with semantic caching
 * 
 * @version 2.0.0-alpha.0
 */

import { z } from 'zod';

// ============================================================================
// Embedding Types
// ============================================================================

/** Vector embedding for semantic similarity */
export interface Embedding {
  readonly vector: readonly number[];
  readonly model: string;
  readonly dimensions: number;
}

/** Similarity search result */
export interface SimilarityResult<T> {
  item: T;
  score: number;
  distance: number;
}

// ============================================================================
// Memory Entry Types
// ============================================================================

export const MemoryEntryTypeSchema = z.enum([
  'conversation',  // Chat messages
  'artifact',      // Generated code/docs
  'decision',      // Routing/planning decisions
  'error',         // Errors for learning
  'pattern',       // Recognized patterns
  'context',       // Session context snapshots
]);

export type MemoryEntryType = z.infer<typeof MemoryEntryTypeSchema>;

export const MemoryEntrySchema = z.object({
  id: z.string().uuid(),
  type: MemoryEntryTypeSchema,
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  embedding: z.array(z.number()).optional(),
  sessionId: z.string().optional(),
  projectId: z.string().optional(),
  timestamp: z.number(),
  ttl: z.number().optional(),
  importance: z.number().min(0).max(1).default(0.5),
  accessCount: z.number().default(0),
  lastAccessed: z.number().optional(),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

// ============================================================================
// Memory Store Interface
// ============================================================================

/** Query options for memory retrieval */
export interface MemoryQuery {
  /** Text to search for (semantic or keyword) */
  query?: string;
  /** Filter by entry type */
  type?: MemoryEntryType | MemoryEntryType[];
  /** Filter by session */
  sessionId?: string;
  /** Filter by project */
  projectId?: string;
  /** Minimum importance score */
  minImportance?: number;
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Time range filter */
  timeRange?: {
    start?: number;
    end?: number;
  };
  /** Use semantic search (requires embedding) */
  semantic?: boolean;
  /** Minimum similarity score for semantic search */
  minSimilarity?: number;
}

/** Memory store interface */
export interface MemoryStore {
  // Core CRUD
  store(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry>;
  get(id: string): Promise<MemoryEntry | null>;
  update(id: string, updates: Partial<MemoryEntry>): Promise<MemoryEntry>;
  delete(id: string): Promise<boolean>;

  // Query
  query(query: MemoryQuery): Promise<MemoryEntry[]>;
  search(text: string, options?: Omit<MemoryQuery, 'query'>): Promise<MemoryEntry[]>;
  semanticSearch(embedding: number[], options?: MemoryQuery): Promise<SimilarityResult<MemoryEntry>[]>;

  // Bulk operations
  bulkStore(entries: Omit<MemoryEntry, 'id' | 'timestamp'>[]): Promise<MemoryEntry[]>;
  bulkDelete(ids: string[]): Promise<number>;

  // Maintenance
  prune(options: { maxAge?: number; maxEntries?: number; minImportance?: number }): Promise<number>;
  compact(): Promise<void>;
  getStats(): Promise<MemoryStats>;
}

export interface MemoryStats {
  totalEntries: number;
  entriesByType: Record<MemoryEntryType, number>;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
}

// ============================================================================
// Semantic Cache Types
// ============================================================================

export const CacheEntrySchema = z.object({
  id: z.string().uuid(),
  query: z.string(),
  queryEmbedding: z.array(z.number()),
  response: z.string(),
  responseMetadata: z.record(z.string(), z.unknown()).optional(),
  model: z.string(),
  provider: z.string(),
  tokensUsed: z.number(),
  latency: z.number(),
  timestamp: z.number(),
  hitCount: z.number().default(0),
  lastHit: z.number().optional(),
  ttl: z.number().optional(),
});

export type CacheEntry = z.infer<typeof CacheEntrySchema>;

/** Semantic cache interface */
export interface SemanticCache {
  /** Check if similar query exists in cache */
  lookup(query: string, options?: CacheLookupOptions): Promise<CacheHit | null>;
  
  /** Store a new cache entry */
  store(entry: Omit<CacheEntry, 'id' | 'timestamp' | 'hitCount'>): Promise<CacheEntry>;
  
  /** Invalidate cache entries */
  invalidate(options: CacheInvalidateOptions): Promise<number>;
  
  /** Get cache statistics */
  getStats(): Promise<CacheStats>;
  
  /** Prune old/unused entries */
  prune(options?: { maxAge?: number; maxEntries?: number }): Promise<number>;
}

export interface CacheLookupOptions {
  /** Minimum similarity score (0-1) to consider a hit */
  minSimilarity?: number;
  /** Filter by model */
  model?: string;
  /** Filter by provider */
  provider?: string;
  /** Maximum age in ms */
  maxAge?: number;
}

export interface CacheHit {
  entry: CacheEntry;
  similarity: number;
  savings: {
    tokens: number;
    latency: number;
    estimatedCost: number;
  };
}

export interface CacheInvalidateOptions {
  /** Invalidate by query pattern */
  queryPattern?: RegExp | string;
  /** Invalidate by model */
  model?: string;
  /** Invalidate by provider */
  provider?: string;
  /** Invalidate entries older than timestamp */
  olderThan?: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  totalTokensSaved: number;
  totalLatencySaved: number;
  estimatedCostSaved: number;
  avgSimilarity: number;
}

// ============================================================================
// Context Manager Types
// ============================================================================

/** Context window management */
export interface ContextWindow {
  maxTokens: number;
  usedTokens: number;
  messages: ContextMessage[];
  systemPrompt?: string;
}

export interface ContextMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokens: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/** Context manager interface */
export interface ContextManager {
  /** Add a message to context */
  addMessage(message: Omit<ContextMessage, 'tokens'>): Promise<void>;
  
  /** Get current context window */
  getContext(): ContextWindow;
  
  /** Trim context to fit token limit */
  trimToFit(maxTokens: number): ContextMessage[];
  
  /** Compress context using summarization */
  compress(targetTokens: number): Promise<ContextWindow>;
  
  /** Extract key information from context */
  extractKeyInfo(): Promise<{ entities: string[]; topics: string[]; decisions: string[] }>;
  
  /** Estimate tokens for text */
  estimateTokens(text: string): number;
  
  /** Clear context */
  clear(): void;
}

// ============================================================================
// Embedding Provider Interface
// ============================================================================

export interface EmbeddingProvider {
  /** Generate embedding for text */
  embed(text: string): Promise<Embedding>;
  
  /** Generate embeddings for multiple texts */
  embedBatch(texts: string[]): Promise<Embedding[]>;
  
  /** Get model dimensions */
  getDimensions(): number;
  
  /** Get model name */
  getModel(): string;
}

// ============================================================================
// Memory Configuration
// ============================================================================

export interface MemoryConfig {
  /** SQLite database path */
  dbPath: string;
  
  /** Embedding provider */
  embeddingProvider?: EmbeddingProvider;
  
  /** Enable semantic search */
  semanticSearch?: boolean;
  
  /** Cache configuration */
  cache?: {
    enabled: boolean;
    minSimilarity: number;
    maxEntries: number;
    ttlMs: number;
  };
  
  /** Pruning configuration */
  pruning?: {
    enabled: boolean;
    maxAgeDays: number;
    maxEntries: number;
    minImportance: number;
    intervalMs: number;
  };
}

export const defaultMemoryConfig: MemoryConfig = {
  dbPath: './data/memory.db',
  semanticSearch: false,
  cache: {
    enabled: true,
    minSimilarity: 0.92,
    maxEntries: 10000,
    ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  pruning: {
    enabled: true,
    maxAgeDays: 30,
    maxEntries: 100000,
    minImportance: 0.1,
    intervalMs: 60 * 60 * 1000, // 1 hour
  },
};
