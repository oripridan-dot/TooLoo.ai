// @version 2.2.200
/**
 * Session Context Service
 *
 * Manages session-specific context including:
 * - Session highlights (milestones, achievements, discoveries)
 * - Current goals and objectives
 * - Conversation state and flow
 *
 * @module cortex/session-context-service
 */

/** Types of highlights that can be tracked in a session */
export type HighlightType =
  | 'milestone'
  | 'achievement'
  | 'discovery'
  | 'decision'
  | 'error'
  | 'info';

/** A single highlight entry in a session */
export interface SessionHighlight {
  id: string;
  type: HighlightType;
  content: string;
  icon?: string;
  relevanceScore: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/** Current goal being pursued in a session */
export interface SessionGoal {
  description: string;
  priority: 'high' | 'medium' | 'low';
  progress: number;
  createdAt: number;
  updatedAt: number;
}

/** Complete context for a single session */
export interface SessionContext {
  sessionId: string;
  highlights: SessionHighlight[];
  currentGoal: SessionGoal | null;
  createdAt: number;
  lastActivityAt: number;
  messageCount: number;
  metadata: Record<string, unknown>;
}

/** Serializable version of session context for API responses */
export interface SerializableSessionContext {
  sessionId: string;
  highlights: SessionHighlight[];
  currentGoal: SessionGoal | null;
  stats: {
    messageCount: number;
    highlightCount: number;
    sessionDurationMs: number;
  };
}

/**
 * SessionContextService - Manages context and highlights for chat sessions
 */
export class SessionContextService {
  private sessions: Map<string, SessionContext> = new Map();
  private maxHighlightsPerSession = 100;
  private sessionTimeout = 24 * 60 * 60 * 1000;

  constructor() {
    this.getOrCreateSession('default');
    console.log('[SessionContextService] Initialized');
  }

  /** Get or create a session context */
  getOrCreateSession(sessionId: string): SessionContext {
    if (!this.sessions.has(sessionId)) {
      const now = Date.now();
      this.sessions.set(sessionId, {
        sessionId,
        highlights: [],
        currentGoal: null,
        createdAt: now,
        lastActivityAt: now,
        messageCount: 0,
        metadata: {},
      });
      console.log(`[SessionContextService] Created new session: ${sessionId}`);
    }
    return this.sessions.get(sessionId)!;
  }

  /** Add a highlight to a session */
  addHighlight(
    sessionId: string,
    highlight: Omit<SessionHighlight, 'id' | 'timestamp'>
  ): SessionHighlight {
    const session = this.getOrCreateSession(sessionId);
    const now = Date.now();

    const newHighlight: SessionHighlight = {
      ...highlight,
      id: `hl-${now}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: now,
    };

    session.highlights.push(newHighlight);
    session.lastActivityAt = now;

    if (session.highlights.length > this.maxHighlightsPerSession) {
      session.highlights.sort((a, b) => b.relevanceScore - a.relevanceScore);
      session.highlights = session.highlights.slice(0, this.maxHighlightsPerSession);
      session.highlights.sort((a, b) => a.timestamp - b.timestamp);
    }

    return newHighlight;
  }

  /** Set the current goal for a session */
  setCurrentGoal(
    sessionId: string,
    description: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): SessionGoal {
    const session = this.getOrCreateSession(sessionId);
    const now = Date.now();

    session.currentGoal = {
      description,
      priority,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    session.lastActivityAt = now;
    return session.currentGoal;
  }

  /** Update goal progress */
  updateGoalProgress(sessionId: string, progress: number): void {
    const session = this.sessions.get(sessionId);
    if (session?.currentGoal) {
      session.currentGoal.progress = Math.min(100, Math.max(0, progress));
      session.currentGoal.updatedAt = Date.now();
      session.lastActivityAt = Date.now();
    }
  }

  /** Complete the current goal */
  completeGoal(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session?.currentGoal) {
      this.addHighlight(sessionId, {
        type: 'achievement',
        icon: '🎯',
        content: `Goal completed: ${session.currentGoal.description}`,
        relevanceScore: 1.0,
      });
      session.currentGoal = null;
    }
  }

  /** Get session context (internal use) */
  getSessionContext(sessionId: string): SessionContext | undefined {
    return this.sessions.get(sessionId);
  }

  /** Get serializable context for API responses */
  getSerializableContext(sessionId: string): SerializableSessionContext {
    const session = this.getOrCreateSession(sessionId);
    const now = Date.now();

    return {
      sessionId: session.sessionId,
      highlights: session.highlights,
      currentGoal: session.currentGoal,
      stats: {
        messageCount: session.messageCount,
        highlightCount: session.highlights.length,
        sessionDurationMs: now - session.createdAt,
      },
    };
  }

  /** Increment message count for a session */
  incrementMessageCount(sessionId: string): void {
    const session = this.getOrCreateSession(sessionId);
    session.messageCount++;
    session.lastActivityAt = Date.now();
  }

  /** Get recent highlights for a session */
  getRecentHighlights(sessionId: string, limit: number = 10): SessionHighlight[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.highlights.slice(-limit);
  }

  /** Get highlights by type */
  getHighlightsByType(sessionId: string, type: HighlightType): SessionHighlight[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.highlights.filter((h) => h.type === type);
  }

  /** Clear a session */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /** Cleanup stale sessions */
  cleanupStaleSessions(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivityAt > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[SessionContextService] Cleaned ${cleaned} stale sessions`);
    }

    return cleaned;
  }

  /** Get all active session IDs */
  getActiveSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /** Set session metadata */
  setMetadata(sessionId: string, key: string, value: unknown): void {
    const session = this.getOrCreateSession(sessionId);
    session.metadata[key] = value;
    session.lastActivityAt = Date.now();
  }

  /** Get session metadata */
  getMetadata(sessionId: string, key: string): unknown {
    const session = this.sessions.get(sessionId);
    return session?.metadata[key];
  }
}

// Export singleton instance
export const sessionContextService = new SessionContextService();
