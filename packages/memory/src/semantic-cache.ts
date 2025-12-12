/**
 * Semantic Cache Implementation
 * Reduces LLM costs by caching similar queries
 * 
 * @version 2.0.0-alpha.0
 */

import type { 
  SemanticCache, 
  CacheEntry, 
  CacheLookupOptions, 
  CacheHit, 
  CacheInvalidateOptions,
  CacheStats,
  EmbeddingProvider,
} from './types.js';

interface SQLiteDB {
  prepare(sql: string): {
    run(...params: unknown[]): { lastInsertRowid: number; changes: number };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
  exec(sql: string): void;
}

interface CacheConfig {
  /** Minimum similarity score for cache hit (0-1) */
  minSimilarity: number;
  /** Maximum entries to keep */
  maxEntries: number;
  /** Default TTL in milliseconds */
  defaultTtlMs: number;
  /** Cost per 1K tokens (for savings calculation) */
  costPer1kTokens: Record<string, number>;
}

const DEFAULT_COSTS: Record<string, number> = {
  'gpt-4o': 0.0025,
  'gpt-4o-mini': 0.00015,
  'claude-3-5-sonnet': 0.003,
  'claude-3-haiku': 0.00025,
  'deepseek-chat': 0.00014,
  'deepseek-coder': 0.00014,
};

/**
 * SQLite-backed Semantic Cache
 * Uses cosine similarity on embeddings to find similar queries
 */
export class SQLiteSemanticCache implements SemanticCache {
  private db: SQLiteDB;
  private embedder: EmbeddingProvider;
  private config: CacheConfig;
  
  // Stats tracking
  private totalHits = 0;
  private totalMisses = 0;
  private tokensSaved = 0;
  private latencySaved = 0;
  
  constructor(db: SQLiteDB, embedder: EmbeddingProvider, config: Partial<CacheConfig> = {}) {
    this.db = db;
    this.embedder = embedder;
    this.config = {
      minSimilarity: config.minSimilarity ?? 0.92,
      maxEntries: config.maxEntries ?? 10000,
      defaultTtlMs: config.defaultTtlMs ?? 7 * 24 * 60 * 60 * 1000,
      costPer1kTokens: { ...DEFAULT_COSTS, ...config.costPer1kTokens },
    };
    
    this.initSchema();
  }
  
  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS semantic_cache (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        query_embedding TEXT NOT NULL,
        response TEXT NOT NULL,
        response_metadata TEXT,
        model TEXT NOT NULL,
        provider TEXT NOT NULL,
        tokens_used INTEGER NOT NULL,
        latency INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        hit_count INTEGER DEFAULT 0,
        last_hit INTEGER,
        ttl INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_cache_model ON semantic_cache(model);
      CREATE INDEX IF NOT EXISTS idx_cache_provider ON semantic_cache(provider);
      CREATE INDEX IF NOT EXISTS idx_cache_timestamp ON semantic_cache(timestamp);
    `);
  }
  
  async lookup(query: string, options: CacheLookupOptions = {}): Promise<CacheHit | null> {
    const minSimilarity = options.minSimilarity ?? this.config.minSimilarity;
    const maxAge = options.maxAge ?? this.config.defaultTtlMs;
    const minTimestamp = Date.now() - maxAge;
    
    // Generate embedding for query
    const embedding = await this.embedder.embed(query);
    
    // Build SQL query with optional filters
    let sql = `
      SELECT id, query, query_embedding, response, response_metadata, 
             model, provider, tokens_used, latency, timestamp, hit_count, last_hit, ttl
      FROM semantic_cache
      WHERE timestamp >= ?
    `;
    const params: unknown[] = [minTimestamp];
    
    if (options.model) {
      sql += ` AND model = ?`;
      params.push(options.model);
    }
    
    if (options.provider) {
      sql += ` AND provider = ?`;
      params.push(options.provider);
    }
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as Array<{
      id: string;
      query: string;
      query_embedding: string;
      response: string;
      response_metadata: string | null;
      model: string;
      provider: string;
      tokens_used: number;
      latency: number;
      timestamp: number;
      hit_count: number;
      last_hit: number | null;
      ttl: number | null;
    }>;
    
    // Find best match by cosine similarity
    let bestMatch: CacheEntry | null = null;
    let bestSimilarity = 0;
    
    for (const row of rows) {
      const cachedEmbedding = JSON.parse(row.query_embedding) as number[];
      const similarity = this.cosineSimilarity(embedding.vector as number[], cachedEmbedding);
      
      if (similarity >= minSimilarity && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = {
          id: row.id,
          query: row.query,
          queryEmbedding: cachedEmbedding,
          response: row.response,
          responseMetadata: row.response_metadata ? JSON.parse(row.response_metadata) : undefined,
          model: row.model,
          provider: row.provider,
          tokensUsed: row.tokens_used,
          latency: row.latency,
          timestamp: row.timestamp,
          hitCount: row.hit_count,
          lastHit: row.last_hit ?? undefined,
          ttl: row.ttl ?? undefined,
        };
      }
    }
    
    if (!bestMatch) {
      this.totalMisses++;
      return null;
    }
    
    // Update hit count
    this.updateHitCount(bestMatch.id);
    this.totalHits++;
    this.tokensSaved += bestMatch.tokensUsed;
    this.latencySaved += bestMatch.latency;
    
    const costRate = this.config.costPer1kTokens[bestMatch.model] ?? 0.001;
    const estimatedCost = (bestMatch.tokensUsed / 1000) * costRate;
    
    return {
      entry: bestMatch,
      similarity: bestSimilarity,
      savings: {
        tokens: bestMatch.tokensUsed,
        latency: bestMatch.latency,
        estimatedCost,
      },
    };
  }
  
  async store(entry: Omit<CacheEntry, 'id' | 'timestamp' | 'hitCount'>): Promise<CacheEntry> {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO semantic_cache 
        (id, query, query_embedding, response, response_metadata, model, provider, tokens_used, latency, timestamp, ttl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      entry.query,
      JSON.stringify(entry.queryEmbedding),
      entry.response,
      entry.responseMetadata ? JSON.stringify(entry.responseMetadata) : null,
      entry.model,
      entry.provider,
      entry.tokensUsed,
      entry.latency,
      timestamp,
      entry.ttl ?? this.config.defaultTtlMs
    );
    
    // Check if we need to prune
    await this.maybeAutoprune();
    
    return {
      ...entry,
      id,
      timestamp,
      hitCount: 0,
    };
  }
  
  async invalidate(options: CacheInvalidateOptions): Promise<number> {
    let sql = 'DELETE FROM semantic_cache WHERE 1=1';
    const params: unknown[] = [];
    
    if (options.model) {
      sql += ` AND model = ?`;
      params.push(options.model);
    }
    
    if (options.provider) {
      sql += ` AND provider = ?`;
      params.push(options.provider);
    }
    
    if (options.olderThan) {
      sql += ` AND timestamp < ?`;
      params.push(options.olderThan);
    }
    
    if (options.queryPattern) {
      const pattern = typeof options.queryPattern === 'string' 
        ? options.queryPattern 
        : options.queryPattern.source;
      sql += ` AND query LIKE ?`;
      params.push(`%${pattern}%`);
    }
    
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return result.changes;
  }
  
  async getStats(): Promise<CacheStats> {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(hit_count) as totalHits,
        AVG(tokens_used) as avgTokens
      FROM semantic_cache
    `);
    
    const row = stmt.get() as { 
      total: number; 
      totalHits: number | null;
      avgTokens: number | null;
    };
    
    const totalRequests = this.totalHits + this.totalMisses;
    const hitRate = totalRequests > 0 ? this.totalHits / totalRequests : 0;
    
    // Calculate estimated cost saved
    const avgCost = 0.001; // Default cost per 1K tokens
    const estimatedCostSaved = (this.tokensSaved / 1000) * avgCost;
    
    return {
      totalEntries: row.total,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRate,
      totalTokensSaved: this.tokensSaved,
      totalLatencySaved: this.latencySaved,
      estimatedCostSaved,
      avgSimilarity: 0.95, // Would need to track this properly
    };
  }
  
  async prune(options: { maxAge?: number; maxEntries?: number } = {}): Promise<number> {
    let deleted = 0;
    
    // Delete old entries
    if (options.maxAge) {
      const cutoff = Date.now() - options.maxAge;
      const stmt = this.db.prepare('DELETE FROM semantic_cache WHERE timestamp < ?');
      const result = stmt.run(cutoff);
      deleted += result.changes;
    }
    
    // Delete excess entries (keep most recent)
    const maxEntries = options.maxEntries ?? this.config.maxEntries;
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM semantic_cache');
    const { count } = countStmt.get() as { count: number };
    
    if (count > maxEntries) {
      const toDelete = count - maxEntries;
      const deleteStmt = this.db.prepare(`
        DELETE FROM semantic_cache 
        WHERE id IN (
          SELECT id FROM semantic_cache 
          ORDER BY (hit_count * 0.3 + (timestamp / 1000000000) * 0.7) ASC
          LIMIT ?
        )
      `);
      const result = deleteStmt.run(toDelete);
      deleted += result.changes;
    }
    
    return deleted;
  }
  
  private updateHitCount(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE semantic_cache 
      SET hit_count = hit_count + 1, last_hit = ?
      WHERE id = ?
    `);
    stmt.run(Date.now(), id);
  }
  
  private async maybeAutoprune(): Promise<void> {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM semantic_cache');
    const { count } = countStmt.get() as { count: number };
    
    if (count > this.config.maxEntries * 1.1) {
      await this.prune({ maxEntries: this.config.maxEntries });
    }
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      const ai = a[i] ?? 0;
      const bi = b[i] ?? 0;
      dotProduct += ai * bi;
      normA += ai * ai;
      normB += bi * bi;
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}
