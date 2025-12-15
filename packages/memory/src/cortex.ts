// @version 1.0.0
/**
 * Memory Cortex - Unified Memory Manager
 * 
 * The "brain" that coordinates all memory systems:
 * - Session Store: In-memory conversation context
 * - Short-Term Store: Redis-like cache with TTL
 * - Long-Term Store: Persistent vector storage (via existing event-store)
 * 
 * Provides a single interface for all memory operations.
 * 
 * @version 1.0.0
 * @skill-os true
 */

import { v4 as uuid } from 'uuid';
import { EventEmitter } from 'events';
import type { MemoryEntry, MemoryQuery, SimilarityResult, EmbeddingProvider } from './types.js';
import { SessionStore, type SessionContext, type ConversationMessage } from './session-store.js';
import { ShortTermStore } from './short-term-store.js';
import { createEmbedder, type EmbedderConfig } from './embedding.js';

// ============================================================================
// Types
// ============================================================================

export type MemoryType = 'episodic' | 'semantic' | 'procedural';
export type MemoryTier = 'session' | 'short-term' | 'long-term';

export interface ConsolidationResult {
  promoted: number;     // Moved to longer-term
  decayed: number;      // Importance reduced
  pruned: number;       // Removed
  merged: number;       // Combined similar memories
}

export interface MemoryStats {
  totalMemories: number;
  byTier: Record<MemoryTier, number>;
  activeSessions: number;
  lastConsolidation: number | null;
}

export interface StoreMemoryInput {
  content: string;
  type?: MemoryType;
  tier?: MemoryTier;
  importance?: number;
  ttl?: number;
  sessionId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Memory Cortex
// ============================================================================

export class MemoryCortex extends EventEmitter {
  private sessionStore: SessionStore;
  private shortTermStore: ShortTermStore;
  private embedder: EmbeddingProvider;
  
  private consolidationInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private lastConsolidation: number | null = null;

  constructor(options: MemoryCortexOptions = {}) {
    super();
    
    this.sessionStore = new SessionStore({
      maxMessagesPerSession: options.maxMessagesPerSession ?? 100,
      maxWorkingMemorySlots: options.maxWorkingMemorySlots ?? 9,
      sessionTimeoutMs: options.sessionTimeoutMs ?? 3600000,
    });
    
    this.shortTermStore = new ShortTermStore({
      maxSize: options.shortTermMaxSize ?? 10000,
      defaultTtlMs: options.shortTermTtlMs ?? 24 * 60 * 60 * 1000,
    });
    
    this.embedder = createEmbedder(options.embedding);
    
    // Auto-consolidation
    if (options.autoConsolidate !== false) {
      const interval = options.consolidationIntervalMs ?? 60000; // 1 minute
      this.consolidationInterval = setInterval(() => {
        this.consolidate().catch(err => {
          console.error('[MemoryCortex] Consolidation error:', err);
        });
      }, interval);
    }
    
    // Auto-cleanup inactive sessions
    if (options.autoCleanup !== false) {
      const cleanupInterval = options.cleanupIntervalMs ?? 300000; // 5 minutes
      this.cleanupInterval = setInterval(() => {
        const cleaned = this.sessionStore.cleanupInactiveSessions();
        if (cleaned > 0) {
          this.emit('sessions:cleaned', { count: cleaned });
        }
      }, cleanupInterval);
    }
  }

  // ---------------------------------------------------------------------------
  // Session Management
  // ---------------------------------------------------------------------------

  /**
   * Create a new session
   */
  createSession(userId?: string): SessionContext {
    const session = this.sessionStore.createSession(userId);
    this.emit('session:created', { sessionId: session.sessionId, userId });
    return session;
  }

  /**
   * Get an existing session
   */
  getSession(sessionId: string): SessionContext | null {
    return this.sessionStore.getSession(sessionId);
  }

  /**
   * Destroy a session
   */
  destroySession(sessionId: string): boolean {
    const result = this.sessionStore.destroySession(sessionId);
    if (result) {
      this.emit('session:destroyed', { sessionId });
    }
    return result;
  }

  /**
   * Set the active skill for a session
   */
  setActiveSkill(sessionId: string, skillId: string): void {
    this.sessionStore.setActiveSkill(sessionId, skillId);
  }

  // ---------------------------------------------------------------------------
  // Conversation History
  // ---------------------------------------------------------------------------

  /**
   * Add a message to conversation history
   */
  addMessage(
    sessionId: string, 
    message: Omit<ConversationMessage, 'id' | 'timestamp'>
  ): ConversationMessage {
    const fullMessage = this.sessionStore.addMessage(sessionId, message);
    this.emit('message:added', { sessionId, message: fullMessage });
    
    // Auto-store to short-term memory for cross-session retrieval
    if (message.role === 'user' || message.role === 'assistant') {
      this.store({
        content: message.content,
        type: 'episodic',
        tier: 'short-term',
        importance: message.role === 'user' ? 0.7 : 0.5,
        sessionId,
        metadata: {
          source: 'conversation',
          role: message.role,
          skillId: message.skillId,
        },
      }).catch(err => {
        console.error('[MemoryCortex] Failed to store message:', err);
      });
    }
    
    return fullMessage;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(sessionId: string, limit?: number): ConversationMessage[] {
    return this.sessionStore.getMessages(sessionId, limit);
  }

  /**
   * Get message count for a session
   */
  getMessageCount(sessionId: string): number {
    return this.sessionStore.getMessageCount(sessionId);
  }

  // ---------------------------------------------------------------------------
  // Working Memory
  // ---------------------------------------------------------------------------

  /**
   * Set a value in working memory
   */
  setWorkingMemory(
    sessionId: string, 
    key: string, 
    value: unknown, 
    priority = 0.5,
    ttlMs?: number
  ): void {
    this.sessionStore.setWorkingMemory(sessionId, key, value, priority, ttlMs);
  }

  /**
   * Get a value from working memory
   */
  getWorkingMemory(sessionId: string, key: string): unknown | undefined {
    return this.sessionStore.getWorkingMemory(sessionId, key);
  }

  /**
   * Get all working memory for a session
   */
  getAllWorkingMemory(sessionId: string): Record<string, unknown> {
    return this.sessionStore.getAllWorkingMemory(sessionId);
  }

  /**
   * Delete from working memory
   */
  deleteWorkingMemory(sessionId: string, key: string): boolean {
    return this.sessionStore.deleteWorkingMemory(sessionId, key);
  }

  // ---------------------------------------------------------------------------
  // Core Memory Operations
  // ---------------------------------------------------------------------------

  /**
   * Store a memory
   */
  async store(input: StoreMemoryInput): Promise<MemoryEntry> {
    const now = Date.now();
    
    // Generate embedding if content provided
    let embedding: number[] | undefined;
    if (input.content) {
      try {
        const result = await this.embedder.embed(input.content);
        embedding = result.vector as number[];
      } catch (err) {
        console.warn('[MemoryCortex] Embedding failed:', err);
      }
    }
    
    // Map our memory types to the existing MemoryEntryType
    const typeMap: Record<string, MemoryEntry['type']> = {
      'episodic': 'conversation',
      'semantic': 'artifact',
      'procedural': 'pattern',
    };
    const mappedType = input.type ? typeMap[input.type] ?? 'conversation' : 'conversation';
    
    const memory: MemoryEntry = {
      id: uuid(),
      type: mappedType,
      content: input.content,
      embedding,
      sessionId: input.sessionId,
      projectId: input.projectId,
      metadata: input.metadata ?? {},
      timestamp: now,
      ttl: input.ttl,
      importance: input.importance ?? 0.5,
      accessCount: 0,
      lastAccessed: now,
    };
    
    const tier = input.tier ?? 'short-term';
    
    // Route to appropriate store
    switch (tier) {
      case 'session':
        this.sessionStore.store(memory);
        break;
      case 'short-term':
      case 'long-term':
        // For now, both go to short-term. Long-term would use event-store/vector DB
        await this.shortTermStore.store(memory);
        break;
    }
    
    this.emit('memory:stored', { memory, tier });
    return memory;
  }

  /**
   * Retrieve memories by query
   */
  async retrieve(query: MemoryQuery): Promise<SimilarityResult<MemoryEntry>[]> {
    const results: SimilarityResult<MemoryEntry>[] = [];
    
    // Generate embedding for semantic search
    let queryEmbedding: number[] | undefined;
    if (query.query && query.semantic) {
      try {
        const result = await this.embedder.embed(query.query);
        queryEmbedding = result.vector as number[];
      } catch (err) {
        console.warn('[MemoryCortex] Query embedding failed:', err);
      }
    }
    
    // Search session store
    const sessionResults = this.sessionStore.search(query, queryEmbedding);
    results.push(...sessionResults);
    
    // Search short-term store
    const shortTermResults = await this.shortTermStore.search(query, queryEmbedding);
    results.push(...shortTermResults);
    
    // Sort by score
    results.sort((a, b) => b.score - a.score);
    
    // Update access stats for top results
    const limited = query.limit ? results.slice(0, query.limit) : results;
    for (const result of limited) {
      result.item.accessCount++;
      result.item.lastAccessed = Date.now();
    }
    
    return limited;
  }

  /**
   * Recall a specific memory by ID
   */
  async recall(id: string): Promise<MemoryEntry | null> {
    // Try session store first
    let memory = this.sessionStore.get(id);
    if (!memory) {
      memory = await this.shortTermStore.get(id);
    }
    
    if (memory) {
      memory.accessCount++;
      memory.lastAccessed = Date.now();
      // Boost importance on access
      memory.importance = Math.min(1, memory.importance + 0.02);
    }
    
    return memory;
  }

  /**
   * Forget a memory
   */
  async forget(id: string): Promise<boolean> {
    const deleted = 
      this.sessionStore.delete(id) ||
      await this.shortTermStore.delete(id);
    
    if (deleted) {
      this.emit('memory:forgotten', { id });
    }
    
    return deleted;
  }

  // ---------------------------------------------------------------------------
  // Consolidation
  // ---------------------------------------------------------------------------

  /**
   * Consolidate memories (decay, promote, prune)
   */
  async consolidate(): Promise<ConsolidationResult> {
    const result: ConsolidationResult = {
      promoted: 0,
      decayed: 0,
      pruned: 0,
      merged: 0,
    };
    
    const now = Date.now();
    
    // 1. Get all short-term memories
    const memories = await this.shortTermStore.getAll();
    
    for (const memory of memories) {
      // Apply decay based on age
      const ageHours = (now - memory.timestamp) / 3600000;
      const decayFactor = Math.exp(-0.1 * ageHours); // Decay rate
      memory.importance *= decayFactor;
      
      // Prune very low importance
      if (memory.importance < 0.05) {
        await this.shortTermStore.delete(memory.id);
        result.pruned++;
        continue;
      }
      
      // Promote high importance + frequently accessed
      if (memory.importance > 0.8 && memory.accessCount > 5) {
        // Would move to long-term store here
        // For now, just boost importance
        memory.importance = Math.min(1, memory.importance + 0.1);
        result.promoted++;
      }
      
      // Update the memory
      await this.shortTermStore.update(memory);
      result.decayed++;
    }
    
    // 2. Merge similar memories
    result.merged = await this.shortTermStore.mergeSimilar(0.95);
    
    // 3. Cleanup expired
    const expired = await this.shortTermStore.cleanup();
    result.pruned += expired;
    
    this.lastConsolidation = now;
    this.emit('memory:consolidated', result);
    
    return result;
  }

  // ---------------------------------------------------------------------------
  // Stats & Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Get memory system statistics
   */
  getStats(): MemoryStats {
    return {
      totalMemories: this.sessionStore.count() + this.shortTermStore.count(),
      byTier: {
        'session': this.sessionStore.count(),
        'short-term': this.shortTermStore.count(),
        'long-term': 0, // Would come from event-store
      },
      activeSessions: this.sessionStore.sessionCount(),
      lastConsolidation: this.lastConsolidation,
    };
  }

  /**
   * Get sessions summary
   */
  getSessionsSummary() {
    return this.sessionStore.getSessionsSummary();
  }

  /**
   * Shutdown the cortex
   */
  async shutdown(): Promise<void> {
    if (this.consolidationInterval) {
      clearInterval(this.consolidationInterval);
      this.consolidationInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Final consolidation
    await this.consolidate();
    
    await this.shortTermStore.close();
    
    this.emit('cortex:shutdown');
  }
}

// ============================================================================
// Options
// ============================================================================

export interface MemoryCortexOptions {
  // Session options
  maxMessagesPerSession?: number;
  maxWorkingMemorySlots?: number;
  sessionTimeoutMs?: number;
  
  // Short-term options
  shortTermMaxSize?: number;
  shortTermTtlMs?: number;
  
  // Embedding options
  embedding?: EmbedderConfig;
  
  // Automation
  autoConsolidate?: boolean;
  consolidationIntervalMs?: number;
  autoCleanup?: boolean;
  cleanupIntervalMs?: number;
}

// ============================================================================
// Singleton
// ============================================================================

let cortexInstance: MemoryCortex | null = null;

export function getMemoryCortex(options?: MemoryCortexOptions): MemoryCortex {
  if (!cortexInstance) {
    cortexInstance = new MemoryCortex(options);
  }
  return cortexInstance;
}

export function resetMemoryCortex(): void {
  if (cortexInstance) {
    cortexInstance.shutdown();
    cortexInstance = null;
  }
}
