// @version 1.0.0
/**
 * Short-Term Memory Store
 * 
 * Redis-like in-memory cache with TTL and LRU eviction.
 * For memories that need to persist across requests but not permanently.
 * 
 * @version 1.0.0
 * @skill-os true
 */

import type { MemoryEntry, MemoryQuery, SimilarityResult } from './types.js';
import { cosineSimilarity } from './embedding.js';

// ============================================================================
// Short-Term Store
// ============================================================================

export class ShortTermStore {
  private memories: Map<string, MemoryEntry> = new Map();
  private accessOrder: string[] = []; // For LRU eviction
  
  // Configuration
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;

  constructor(options: ShortTermStoreOptions = {}) {
    this.maxSize = options.maxSize ?? 10000;
    this.defaultTtlMs = options.defaultTtlMs ?? 24 * 60 * 60 * 1000; // 24 hours
  }

  // ---------------------------------------------------------------------------
  // Core Operations
  // ---------------------------------------------------------------------------

  async store(memory: MemoryEntry): Promise<void> {
    // Apply TTL if not set
    if (!memory.ttl) {
      memory.ttl = this.defaultTtlMs;
    }
    
    // Remove from access order if exists (will be re-added at end)
    const existingIndex = this.accessOrder.indexOf(memory.id);
    if (existingIndex !== -1) {
      this.accessOrder.splice(existingIndex, 1);
    }
    
    // Store the memory
    this.memories.set(memory.id, memory);
    this.accessOrder.push(memory.id);
    
    // Enforce size limit (LRU eviction)
    await this.evictIfNeeded();
  }

  async get(id: string): Promise<MemoryEntry | null> {
    const memory = this.memories.get(id);
    if (!memory) return null;
    
    // Check expiry
    if (this.isExpired(memory)) {
      this.memories.delete(id);
      this.removeFromAccessOrder(id);
      return null;
    }
    
    // Update access stats
    memory.accessCount++;
    memory.lastAccessed = Date.now();
    
    // Move to end of access order (most recently used)
    this.removeFromAccessOrder(id);
    this.accessOrder.push(id);
    
    return memory;
  }

  async update(memory: MemoryEntry): Promise<void> {
    if (this.memories.has(memory.id)) {
      this.memories.set(memory.id, memory);
    }
  }

  async delete(id: string): Promise<boolean> {
    this.removeFromAccessOrder(id);
    return this.memories.delete(id);
  }

  async getAll(): Promise<MemoryEntry[]> {
    const validMemories: MemoryEntry[] = [];
    
    for (const memory of this.memories.values()) {
      if (!this.isExpired(memory)) {
        validMemories.push(memory);
      }
    }
    
    return validMemories;
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  async search(query: MemoryQuery, queryEmbedding?: number[]): Promise<SimilarityResult<MemoryEntry>[]> {
    const results: SimilarityResult<MemoryEntry>[] = [];
    
    for (const memory of this.memories.values()) {
      // Skip expired
      if (this.isExpired(memory)) continue;
      
      // Apply filters
      if (query.type) {
        const types = Array.isArray(query.type) ? query.type : [query.type];
        if (!types.includes(memory.type)) continue;
      }
      if (query.sessionId && memory.sessionId !== query.sessionId) continue;
      if (query.projectId && memory.projectId !== query.projectId) continue;
      if (query.minImportance && memory.importance < query.minImportance) continue;
      
      // Time range filter
      if (query.timeRange) {
        if (query.timeRange.start && memory.timestamp < query.timeRange.start) continue;
        if (query.timeRange.end && memory.timestamp > query.timeRange.end) continue;
      }
      
      let score = 0;
      let distance = 1;
      
      // Semantic similarity
      if (query.semantic && queryEmbedding && memory.embedding) {
        score = cosineSimilarity(queryEmbedding, memory.embedding);
        distance = 1 - score;
        
        // Apply minimum similarity threshold
        if (query.minSimilarity && score < query.minSimilarity) continue;
      }
      // Text match fallback
      else if (query.query) {
        const text = query.query.toLowerCase();
        if (memory.content.toLowerCase().includes(text)) {
          score = 0.5;
          distance = 0.5;
        } else {
          continue;
        }
      }
      // No search criteria - include all matching filters
      else {
        score = memory.importance;
        distance = 1 - memory.importance;
      }
      
      results.push({ item: memory, score, distance });
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    // Apply limit
    if (query.limit) {
      return results.slice(0, query.limit);
    }
    
    return results;
  }

  // ---------------------------------------------------------------------------
  // Maintenance
  // ---------------------------------------------------------------------------

  /**
   * Evict entries if over size limit (LRU policy)
   */
  private async evictIfNeeded(): Promise<number> {
    let evicted = 0;
    
    while (this.memories.size > this.maxSize && this.accessOrder.length > 0) {
      const oldestId = this.accessOrder.shift();
      if (oldestId) {
        this.memories.delete(oldestId);
        evicted++;
      }
    }
    
    return evicted;
  }

  /**
   * Remove expired entries
   */
  async cleanup(): Promise<number> {
    let removed = 0;
    
    for (const [id, memory] of this.memories) {
      if (this.isExpired(memory)) {
        this.memories.delete(id);
        this.removeFromAccessOrder(id);
        removed++;
      }
    }
    
    return removed;
  }

  /**
   * Merge similar memories
   */
  async mergeSimilar(threshold: number): Promise<number> {
    // Simple implementation: find highly similar memories and keep the higher importance one
    const memories = await this.getAll();
    const toDelete: Set<string> = new Set();
    let merged = 0;
    
    for (let i = 0; i < memories.length; i++) {
      if (toDelete.has(memories[i]!.id)) continue;
      
      for (let j = i + 1; j < memories.length; j++) {
        if (toDelete.has(memories[j]!.id)) continue;
        
        const m1 = memories[i]!;
        const m2 = memories[j]!;
        
        // Only compare if both have embeddings
        if (!m1.embedding || !m2.embedding) continue;
        
        const similarity = cosineSimilarity(m1.embedding, m2.embedding);
        
        if (similarity >= threshold) {
          // Keep the one with higher importance, delete the other
          if (m1.importance >= m2.importance) {
            toDelete.add(m2.id);
            // Boost importance of kept memory
            m1.importance = Math.min(1, m1.importance + 0.1);
          } else {
            toDelete.add(m1.id);
            m2.importance = Math.min(1, m2.importance + 0.1);
          }
          merged++;
        }
      }
    }
    
    // Delete merged memories
    for (const id of toDelete) {
      await this.delete(id);
    }
    
    return merged;
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  count(): number {
    return this.memories.size;
  }

  countByType(type: string): number {
    let count = 0;
    for (const memory of this.memories.values()) {
      if (memory.type === type) count++;
    }
    return count;
  }

  async getStats(): Promise<ShortTermStats> {
    let expired = 0;
    let totalImportance = 0;
    let totalAccessCount = 0;
    
    for (const memory of this.memories.values()) {
      if (this.isExpired(memory)) {
        expired++;
      }
      totalImportance += memory.importance;
      totalAccessCount += memory.accessCount;
    }
    
    return {
      total: this.memories.size,
      expired,
      avgImportance: this.memories.size > 0 ? totalImportance / this.memories.size : 0,
      avgAccessCount: this.memories.size > 0 ? totalAccessCount / this.memories.size : 0,
      oldestAccess: this.accessOrder.length > 0 
        ? this.memories.get(this.accessOrder[0]!)?.lastAccessed ?? 0 
        : 0,
    };
  }

  async close(): Promise<void> {
    // Nothing to close for in-memory store
    // Would close Redis connection in production
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private isExpired(memory: MemoryEntry): boolean {
    if (!memory.ttl) return false;
    return Date.now() > memory.timestamp + memory.ttl;
  }

  private removeFromAccessOrder(id: string): void {
    const index = this.accessOrder.indexOf(id);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}

// ============================================================================
// Types
// ============================================================================

export interface ShortTermStoreOptions {
  maxSize?: number;
  defaultTtlMs?: number;
}

export interface ShortTermStats {
  total: number;
  expired: number;
  avgImportance: number;
  avgAccessCount: number;
  oldestAccess: number;
}
