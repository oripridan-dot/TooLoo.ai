// @version 1.0.0
/**
 * Session Store - In-memory conversation context management
 * 
 * Handles:
 * - Session lifecycle (create, get, destroy)
 * - Conversation history
 * - Working memory (7±2 slots, like human cognition)
 * - Session-scoped memories
 * 
 * @version 1.0.0
 * @skill-os true
 */

import { v4 as uuid } from 'uuid';
import type { MemoryEntry, MemoryQuery, SimilarityResult } from './types.js';
import { cosineSimilarity } from './embedding.js';

// ============================================================================
// Session Types
// ============================================================================

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  skillId?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkingMemorySlot {
  key: string;
  value: unknown;
  priority: number;
  expiresAt?: number;
}

export interface SessionContext {
  sessionId: string;
  userId?: string;
  
  // Conversation state
  messages: ConversationMessage[];
  activeSkillId?: string;
  
  // Working memory (current focus, limited capacity)
  workingMemory: WorkingMemorySlot[];
  
  // Session-specific patterns
  sessionPatterns: Map<string, unknown>;
  
  // Timestamps
  startedAt: number;
  lastActivityAt: number;
}

// ============================================================================
// Session Store
// ============================================================================

export class SessionStore {
  private sessions: Map<string, SessionContext> = new Map();
  private memories: Map<string, MemoryEntry> = new Map();
  private sessionMemories: Map<string, Set<string>> = new Map();
  
  // Configuration
  private readonly maxMessagesPerSession: number;
  private readonly maxWorkingMemorySlots: number;
  private readonly sessionTimeoutMs: number;

  constructor(options: SessionStoreOptions = {}) {
    this.maxMessagesPerSession = options.maxMessagesPerSession ?? 100;
    this.maxWorkingMemorySlots = options.maxWorkingMemorySlots ?? 9; // 7±2
    this.sessionTimeoutMs = options.sessionTimeoutMs ?? 3600000; // 1 hour
  }

  // ---------------------------------------------------------------------------
  // Session Lifecycle
  // ---------------------------------------------------------------------------

  createSession(userId?: string): SessionContext {
    const session: SessionContext = {
      sessionId: uuid(),
      userId,
      messages: [],
      workingMemory: [],
      sessionPatterns: new Map(),
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
    };
    
    this.sessions.set(session.sessionId, session);
    this.sessionMemories.set(session.sessionId, new Set());
    
    return session;
  }

  getSession(sessionId: string): SessionContext | null {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
    }
    return session ?? null;
  }

  destroySession(sessionId: string): boolean {
    // Clean up session memories
    const memoryIds = this.sessionMemories.get(sessionId);
    if (memoryIds) {
      for (const id of memoryIds) {
        this.memories.delete(id);
      }
    }
    
    this.sessionMemories.delete(sessionId);
    return this.sessions.delete(sessionId);
  }

  setActiveSkill(sessionId: string, skillId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.activeSkillId = skillId;
      session.lastActivityAt = Date.now();
    }
  }

  // ---------------------------------------------------------------------------
  // Conversation History
  // ---------------------------------------------------------------------------

  addMessage(sessionId: string, message: Omit<ConversationMessage, 'id' | 'timestamp'>): ConversationMessage {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    const fullMessage: ConversationMessage = {
      ...message,
      id: uuid(),
      timestamp: Date.now(),
    };
    
    session.messages.push(fullMessage);
    session.lastActivityAt = Date.now();
    
    // Trim to max messages (keep recent)
    if (session.messages.length > this.maxMessagesPerSession) {
      session.messages = session.messages.slice(-this.maxMessagesPerSession);
    }
    
    return fullMessage;
  }

  getMessages(sessionId: string, limit?: number): ConversationMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    
    if (limit) {
      return session.messages.slice(-limit);
    }
    return [...session.messages];
  }

  getMessageCount(sessionId: string): number {
    return this.sessions.get(sessionId)?.messages.length ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Working Memory (Limited Capacity)
  // ---------------------------------------------------------------------------

  setWorkingMemory(
    sessionId: string, 
    key: string, 
    value: unknown, 
    priority = 0.5,
    ttlMs?: number
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const expiresAt = ttlMs ? Date.now() + ttlMs : undefined;
    
    // Check if key exists
    const existingIndex = session.workingMemory.findIndex(s => s.key === key);
    const slot: WorkingMemorySlot = { key, value, priority, expiresAt };
    
    if (existingIndex >= 0) {
      // Update existing
      session.workingMemory[existingIndex] = slot;
    } else {
      session.workingMemory.push(slot);
      
      // Enforce capacity limit (7±2, like human working memory)
      if (session.workingMemory.length > this.maxWorkingMemorySlots) {
        // Remove expired first
        session.workingMemory = session.workingMemory.filter(
          s => !s.expiresAt || s.expiresAt > Date.now()
        );
        
        // If still over limit, remove lowest priority
        if (session.workingMemory.length > this.maxWorkingMemorySlots) {
          session.workingMemory.sort((a, b) => b.priority - a.priority);
          session.workingMemory = session.workingMemory.slice(0, this.maxWorkingMemorySlots);
        }
      }
    }
    
    session.lastActivityAt = Date.now();
  }

  getWorkingMemory(sessionId: string, key: string): unknown | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    const slot = session.workingMemory.find(s => s.key === key);
    if (!slot) return undefined;
    
    // Check expiry
    if (slot.expiresAt && slot.expiresAt < Date.now()) {
      this.deleteWorkingMemory(sessionId, key);
      return undefined;
    }
    
    return slot.value;
  }

  getAllWorkingMemory(sessionId: string): Record<string, unknown> {
    const session = this.sessions.get(sessionId);
    if (!session) return {};
    
    const now = Date.now();
    const result: Record<string, unknown> = {};
    
    for (const slot of session.workingMemory) {
      if (!slot.expiresAt || slot.expiresAt > now) {
        result[slot.key] = slot.value;
      }
    }
    
    return result;
  }

  deleteWorkingMemory(sessionId: string, key: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    const index = session.workingMemory.findIndex(s => s.key === key);
    if (index >= 0) {
      session.workingMemory.splice(index, 1);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Session Memory Storage (Ephemeral)
  // ---------------------------------------------------------------------------

  store(memory: MemoryEntry): void {
    this.memories.set(memory.id, memory);
    
    if (memory.sessionId) {
      let sessionMemories = this.sessionMemories.get(memory.sessionId);
      if (!sessionMemories) {
        sessionMemories = new Set();
        this.sessionMemories.set(memory.sessionId, sessionMemories);
      }
      sessionMemories.add(memory.id);
    }
  }

  get(id: string): MemoryEntry | null {
    return this.memories.get(id) ?? null;
  }

  delete(id: string): boolean {
    const memory = this.memories.get(id);
    if (!memory) return false;
    
    if (memory.sessionId) {
      this.sessionMemories.get(memory.sessionId)?.delete(id);
    }
    
    return this.memories.delete(id);
  }

  search(query: MemoryQuery, queryEmbedding?: number[]): SimilarityResult<MemoryEntry>[] {
    const results: SimilarityResult<MemoryEntry>[] = [];
    
    for (const memory of this.memories.values()) {
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
      if (queryEmbedding && memory.embedding) {
        score = cosineSimilarity(queryEmbedding, memory.embedding);
        distance = 1 - score;
      }
      // Text match fallback
      else if (query.query) {
        const text = query.query.toLowerCase();
        if (memory.content.toLowerCase().includes(text)) {
          score = 0.5;
          distance = 0.5;
        }
      }
      // No search criteria - include all matching filters
      else {
        score = memory.importance;
        distance = 1 - memory.importance;
      }
      
      if (score > 0 || (!query.query && !queryEmbedding)) {
        results.push({ item: memory, score, distance });
      }
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
  // Stats & Maintenance
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

  sessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clean up inactive sessions
   */
  cleanupInactiveSessions(maxAge?: number): number {
    const cutoff = Date.now() - (maxAge ?? this.sessionTimeoutMs);
    let cleaned = 0;
    
    for (const [sessionId, session] of this.sessions) {
      if (session.lastActivityAt < cutoff) {
        this.destroySession(sessionId);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Get all sessions summary
   */
  getSessionsSummary(): Array<{
    sessionId: string;
    userId?: string;
    messageCount: number;
    workingMemoryCount: number;
    startedAt: number;
    lastActivityAt: number;
    activeSkillId?: string;
  }> {
    return Array.from(this.sessions.values()).map(session => ({
      sessionId: session.sessionId,
      userId: session.userId,
      messageCount: session.messages.length,
      workingMemoryCount: session.workingMemory.length,
      startedAt: session.startedAt,
      lastActivityAt: session.lastActivityAt,
      activeSkillId: session.activeSkillId,
    }));
  }
}

// ============================================================================
// Options
// ============================================================================

export interface SessionStoreOptions {
  maxMessagesPerSession?: number;
  maxWorkingMemorySlots?: number;
  sessionTimeoutMs?: number;
}

// ============================================================================
// Singleton
// ============================================================================

let sessionStoreInstance: SessionStore | null = null;

export function getSessionStore(options?: SessionStoreOptions): SessionStore {
  if (!sessionStoreInstance) {
    sessionStoreInstance = new SessionStore(options);
  }
  return sessionStoreInstance;
}

export function resetSessionStore(): void {
  sessionStoreInstance = null;
}
