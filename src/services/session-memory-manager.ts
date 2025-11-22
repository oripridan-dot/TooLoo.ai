/**
 * Session Memory Manager
 * Maintains conversation history and context for real conversations with TooLoo
 * Integrates with LLM providers to enable coherent multi-turn dialogues
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ConversationMemoryEngine, {
  getConversationMemoryEngine,
} from '../engine/conversation-memory-engine.js';
import { getContextInjectionEngine } from '../engine/context-injection-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = path.join(__dirname, '../data/sessions');
// const SESSION_FILE = path.join(SESSION_DIR, 'sessions.json'); // Deprecated in favor of individual files
const MEMORY_WINDOW = 10; // Keep last 10 messages for context

/**
 * SessionMemoryManager - Maintains conversation memory across turns
 */
export class SessionMemoryManager {
  constructor() {
    this.sessions = new Map();
    this.memoryEngines = new Map(); // Per-session memory engines
    this.contextInjectors = new Map(); // Per-session context injectors
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    try {
      await fs.mkdir(SESSION_DIR, { recursive: true });
      const files = await fs.readdir(SESSION_DIR);

      for (const file of files) {
        if (file.endsWith('.json') && file !== 'sessions.json') {
          try {
            const data = await fs.readFile(path.join(SESSION_DIR, file), 'utf8');
            const session = JSON.parse(data);
            if (session.id) {
              this.sessions.set(session.id, {
                ...session,
                messages: session.messages || [],
              });
            }
          } catch (e) {
            console.warn(`[SessionMemory] Failed to load session file ${file}:`, e.message);
          }
        }
      }
      console.log(`[SessionMemory] Loaded ${this.sessions.size} sessions`);
    } catch (err) {
      console.log('[SessionMemory] Starting with fresh sessions');
    }
    this.initialized = true;
  }

  /**
   * Create or get session
   */
  async getOrCreateSession(sessionId, userId = 'anonymous', projectId = null) {
    await this.initialize();

    if (!this.sessions.has(sessionId)) {
      const session = {
        id: sessionId,
        userId,
        projectId, // Link to project
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        metadata: {
          title: 'Chat Session',
          description: '',
          tags: [],
        },
        context: {
          providers: [],
          topics: [],
          sentiment: null,
          complexity: 'low',
          keyInsights: [],
        },
        stats: {
          messageCount: 0,
          questionCount: 0,
          responseCount: 0,
          averageRating: 0,
          totalTokens: 0,
        },
      };
      this.sessions.set(sessionId, session);
    }

    return this.sessions.get(sessionId);
  }

  /**
   * Add message to session and maintain conversation history
   */
  async addMessage(sessionId, userId, role, content, metadata = {}) {
    await this.initialize();

    const session = await this.getOrCreateSession(sessionId, userId);
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      provider: metadata.provider || null,
      timestamp: Date.now(),
      metadata: {
        tokens: metadata.tokens || 0,
        responseTime: metadata.responseTime || 0,
        model: metadata.model || null,
        confidence: metadata.confidence || null,
        ...metadata,
      },
      feedback: null,
    };

    session.messages.push(message);
    session.updatedAt = Date.now();
    session.stats.messageCount++;

    if (role === 'user') {
      session.stats.questionCount++;
    } else if (role === 'assistant') {
      session.stats.responseCount++;
    }

    // Add to advanced memory engine (Phase 7 upgrade)
    const memoryEngine = this._getOrCreateMemoryEngine(sessionId, userId);
    memoryEngine.addMessage(role, content, metadata);

    await this.saveSession(session);
    return message;
  }

  /**
   * Get conversation history for a session
   * Returns last N messages for context window
   */
  getConversationHistory(sessionId, limit = MEMORY_WINDOW) {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return session.messages.slice(-limit).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Get full message history (for display)
   */
  getFullHistory(sessionId) {
    const session = this.sessions.get(sessionId);
    return session?.messages || [];
  }

  /**
   * Get session context for AI reasoning
   */
  getSessionContext(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const recent = session.messages.slice(-5);
    const topics = [...new Set(recent.map((m) => this.extractTopics(m.content)).flat())];
    const userMessages = session.messages.filter((m) => m.role === 'user');
    const assistantMessages = session.messages.filter((m) => m.role === 'assistant');

    return {
      sessionId,
      messageCount: session.messages.length,
      topics,
      recentExchanges: recent.length,
      averageResponseTime:
        assistantMessages.length > 0
          ? assistantMessages.reduce((sum, m) => sum + (m.metadata?.responseTime || 0), 0) /
            assistantMessages.length
          : 0,
      providers: [...new Set(assistantMessages.map((m) => m.provider).filter(Boolean))],
      sentiment: session.context.sentiment,
      complexity: session.context.complexity,
      keyInsights: session.context.keyInsights,
    };
  }

  /**
   * Build system prompt with session awareness
   */
  buildAwareSystemPrompt(sessionId, basePrompt) {
    const context = this.getSessionContext(sessionId);
    if (!context || context.messageCount === 0) {
      return basePrompt;
    }

    const topicsInfo =
      context.topics.length > 0
        ? `\n\nCurrent conversation topics: ${context.topics.join(', ')}`
        : '';

    const historyInfo = `\n\nThis is message #${context.messageCount} in the conversation (${context.recentExchanges} recent exchanges).`;

    return basePrompt + topicsInfo + historyInfo;
  }

  /**
   * Extract topics from message (simple keyword extraction)
   */
  extractTopics(content) {
    const keywords = [
      'learning',
      'training',
      'coaching',
      'mastery',
      'domain',
      'algorithm',
      'system',
      'network',
      'database',
    ];
    return keywords.filter((k) => content.toLowerCase().includes(k));
  }

  /**
   * Update session metadata after provider call
   */
  async updateSessionMetadata(sessionId, metadata = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (metadata.sentiment) session.context.sentiment = metadata.sentiment;
    if (metadata.complexity) session.context.complexity = metadata.complexity;
    if (metadata.provider && !session.context.providers.includes(metadata.provider)) {
      session.context.providers.push(metadata.provider);
    }
    if (metadata.tokens) session.stats.totalTokens += metadata.tokens;

    session.updatedAt = Date.now();
    await this.saveSession(session);
  }

  /**
   * Save session to disk
   */
  async saveSession(session) {
    if (!session || !session.id) return;
    try {
      const filePath = path.join(SESSION_DIR, `${session.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf8');
    } catch (err) {
      console.error('[SessionMemory] Failed to save session:', err.message);
    }
  }

  /**
   * Generate new session ID
   */
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * List all sessions for a user, optionally filtered by project
   */
  listSessions(userId = 'anonymous', limit = 20, projectId = null) {
    let sessions = Array.from(this.sessions.values()).filter((s) => s.userId === userId);

    if (projectId) {
      sessions = sessions.filter((s) => s.projectId === projectId);
    }

    return sessions
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit)
      .map((s) => ({
        id: s.id,
        projectId: s.projectId,
        title: s.metadata?.title || 'Chat Session',
        messageCount: s.stats.messageCount,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        topics: s.context?.topics || [],
      }));
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    this.sessions.delete(sessionId);
    try {
      const filePath = path.join(SESSION_DIR, `${sessionId}.json`);
      await fs.unlink(filePath);
    } catch (e) {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Clear old sessions (keep last 50)
   */
  async cleanup() {
    const allSessions = Array.from(this.sessions.values()).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );

    if (allSessions.length > 50) {
      const toRemove = allSessions.slice(50);
      const toKeep = allSessions.slice(0, 50);

      this.sessions.clear();
      toKeep.forEach((s) => this.sessions.set(s.id, s));

      // Delete removed files
      for (const session of toRemove) {
        try {
          const filePath = path.join(SESSION_DIR, `${session.id}.json`);
          await fs.unlink(filePath);
        } catch (e) {
          // Ignore
        }
      }
      console.log(`[SessionMemory] Cleaned up sessions, keeping last 50`);
    }
  }

  /**
   * ============ PHASE 7: ADVANCED MEMORY FEATURES ============
   */

  /**
   * Get intelligent conversation history with context injection
   * @param {string} sessionId
   * @param {string} userId
   * @param {string} currentMessage - User's current message
   * @param {object} options - { strategy: 'hybrid' | 'relevance' | 'recency', limit: 50 }
   * @returns {object} { history, contextInjection, stats }
   */
  async getIntelligentHistory(sessionId, userId, currentMessage = '', options = {}) {
    const memoryEngine = this._getOrCreateMemoryEngine(sessionId, userId);
    const injector = this._getOrCreateInjector(sessionId, userId, options);

    // Get raw conversation history
    const history = memoryEngine.getConversationHistory({
      limit: options.limit || 50,
      includeContext: true,
    });

    // Build intelligent context injection
    const contextData = injector.buildContextInjection(memoryEngine, currentMessage, {
      strategy: options.strategy || 'hybrid',
    });

    // Get memory statistics
    const stats = memoryEngine.getMemoryStats();

    // Get session metadata to retrieve projectId
    const session = this.sessions.get(sessionId);

    return {
      projectId: session?.projectId || null,
      history,
      contextInjection: contextData.injection,
      contextMessages: contextData.contextMessages,
      stats: {
        ...contextData.stats,
        memoryStats: stats,
      },
    };
  }

  /**
   * Record interaction outcome for learning
   */
  recordInteractionOutcome(sessionId, userId, message, intent, success, metadata = {}) {
    const injector = this._getOrCreateInjector(sessionId, userId);
    const memoryEngine = this._getOrCreateMemoryEngine(sessionId, userId);

    const contextMessages = memoryEngine.getConversationHistory({ limit: 10 });

    injector.recordResult(message, intent, contextMessages, success, metadata);
  }

  /**
   * Search conversation by keyword or topic
   */
  searchConversation(sessionId, userId, query, options = {}) {
    const memoryEngine = this._getOrCreateMemoryEngine(sessionId, userId);
    return memoryEngine.searchMessages(query, {
      maxResults: options.maxResults || 10,
      recentOnly: options.recentOnly || false,
    });
  }

  /**
   * Get memory statistics
   */
  getMemoryStatistics(sessionId, userId) {
    const memoryEngine = this._getOrCreateMemoryEngine(sessionId, userId);
    return memoryEngine.getMemoryStats();
  }

  /**
   * Export conversation for analysis
   */
  exportConversation(sessionId, userId, format = 'json') {
    const memoryEngine = this._getOrCreateMemoryEngine(sessionId, userId);
    return memoryEngine.exportConversation(format);
  }

  /**
   * Truncate old memory (keep last N messages for privacy)
   */
  truncateHistory(sessionId, userId, keepMessages = 100) {
    const memoryEngine = this._getOrCreateMemoryEngine(sessionId, userId);
    return memoryEngine.truncateHistory(keepMessages);
  }

  /**
   * ============ PRIVATE HELPERS ============
   */

  /**
   * Get or create memory engine for session
   */
  _getOrCreateMemoryEngine(sessionId, userId) {
    const key = `${userId}:${sessionId}`;
    if (!this.memoryEngines.has(key)) {
      const engine = new ConversationMemoryEngine({ sessionId, userId });
      this.memoryEngines.set(key, engine);
    }
    return this.memoryEngines.get(key);
  }

  /**
   * Get or create context injector for session
   */
  _getOrCreateInjector(sessionId, userId, options = {}) {
    const key = `${userId}:${sessionId}`;
    if (!this.contextInjectors.has(key)) {
      const injector = getContextInjectionEngine({
        strategy: options.strategy || 'hybrid',
        maxContextTokens: options.maxContextTokens || 1500,
        recentLimit: options.recentLimit || 5,
      });
      this.contextInjectors.set(key, injector);
    }
    return this.contextInjectors.get(key);
  }
}

// Singleton instance
let sessionManager = null;

export async function getSessionManager() {
  if (!sessionManager) {
    sessionManager = new SessionMemoryManager();
    await sessionManager.initialize();
  }
  return sessionManager;
}

export default SessionMemoryManager;
