/**
 * SessionContextService
 * Manages session highlights and context extraction from cortex events.
 * Provides current session state for frontend display.
 *
 * @version 2.2.121
 */

import { bus, SynapsysEvent } from "../core/event-bus.js";

export interface SessionHighlight {
  type: "goal" | "achievement" | "insight" | "error" | "milestone";
  content: string;
  timestamp: Date;
  relevanceScore: number;
  icon?: string;
}

export interface SessionContext {
  sessionId: string;
  startTime: Date;
  lastActivityTime: Date;
  highlights: SessionHighlight[];
  currentGoal?: string;
  keyDecisions: string[];
  activeTools: Set<string>;
  errorsSinceLast: number;
  successCount: number;
}

export class SessionContextService {
  private sessions: Map<string, SessionContext> = new Map();
  private readonly MAX_HIGHLIGHTS = 20;
  private readonly MAX_DECISION_LOG = 10;

  constructor() {
    this.setupListeners();
  }

  /**
   * Get or create session context
   */
  getSessionContext(sessionId: string): SessionContext {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        startTime: new Date(),
        lastActivityTime: new Date(),
        highlights: [],
        keyDecisions: [],
        activeTools: new Set(),
        errorsSinceLast: 0,
        successCount: 0,
      });
    }

    const context = this.sessions.get(sessionId)!;
    context.lastActivityTime = new Date();
    return context;
  }

  /**
   * Add a highlight to session context
   */
  addHighlight(
    sessionId: string,
    highlight: Omit<SessionHighlight, "timestamp">,
  ) {
    const context = this.getSessionContext(sessionId);
    const fullHighlight: SessionHighlight = {
      ...highlight,
      timestamp: new Date(),
    };

    context.highlights.unshift(fullHighlight);
    if (context.highlights.length > this.MAX_HIGHLIGHTS) {
      context.highlights.pop();
    }

    this.publishSessionUpdate(sessionId);
  }

  /**
   * Record a key decision in the session
   */
  recordDecision(sessionId: string, decision: string) {
    const context = this.getSessionContext(sessionId);
    context.keyDecisions.unshift(decision);
    if (context.keyDecisions.length > this.MAX_DECISION_LOG) {
      context.keyDecisions.pop();
    }
    this.publishSessionUpdate(sessionId);
  }

  /**
   * Update current goal
   */
  setCurrentGoal(sessionId: string, goal: string) {
    const context = this.getSessionContext(sessionId);
    context.currentGoal = goal;
    this.addHighlight(sessionId, {
      type: "goal",
      content: goal,
      relevanceScore: 1.0,
      icon: "🎯",
    });
    this.publishSessionUpdate(sessionId);
  }

  /**
   * Track tool usage
   */
  addActiveTool(sessionId: string, toolName: string) {
    const context = this.getSessionContext(sessionId);
    context.activeTools.add(toolName);
    this.publishSessionUpdate(sessionId);
  }

  /**
   * Record success
   */
  recordSuccess(sessionId: string, message: string) {
    const context = this.getSessionContext(sessionId);
    context.successCount++;
    this.addHighlight(sessionId, {
      type: "achievement",
      content: message,
      relevanceScore: 0.9,
      icon: "✅",
    });
    this.publishSessionUpdate(sessionId);
  }

  /**
   * Record error
   */
  recordError(sessionId: string, errorMessage: string) {
    const context = this.getSessionContext(sessionId);
    context.errorsSinceLast++;
    this.addHighlight(sessionId, {
      type: "error",
      content: errorMessage,
      relevanceScore: 0.7,
      icon: "⚠️",
    });
    this.publishSessionUpdate(sessionId);
  }

  /**
   * Get serializable session context for frontend
   */
  getSerializableContext(sessionId: string) {
    const context = this.getSessionContext(sessionId);
    return {
      sessionId: context.sessionId,
      startTime: context.startTime.toISOString(),
      lastActivityTime: context.lastActivityTime.toISOString(),
      highlights: context.highlights.map((h) => ({
        ...h,
        timestamp: h.timestamp.toISOString(),
      })),
      currentGoal: context.currentGoal,
      keyDecisions: context.keyDecisions,
      activeTools: Array.from(context.activeTools),
      errorsSinceLast: context.errorsSinceLast,
      successCount: context.successCount,
      sessionDurationMs: Date.now() - context.startTime.getTime(),
    };
  }

  /**
   * Setup event listeners to capture cortex events
   */
  private setupListeners() {
    // Plan created
    bus.on("planning:intent", (event) => {
      const sessionId = event.payload.sessionId || "default";
      if (event.payload.goal) {
        this.setCurrentGoal(sessionId, event.payload.goal);
      }
    });

    // Plan completed
    bus.on("planning:plan:completed", (event) => {
      const sessionId = event.payload.sessionId || "default";
      this.recordSuccess(sessionId, "Plan execution completed");
    });

    // Tool calls
    bus.on("cortex:tool:call", (event) => {
      const sessionId = event.payload.sessionId || "default";
      this.addActiveTool(sessionId, event.payload.type);
    });

    // Errors
    bus.on("cortex:error", (event) => {
      const sessionId = event.payload.sessionId || "default";
      this.recordError(sessionId, event.payload.error || "Unknown error");
    });

    // Decision making
    bus.on("cortex:decision", (event) => {
      const sessionId = event.payload.sessionId || "default";
      if (event.payload.decision) {
        this.recordDecision(sessionId, event.payload.decision);
      }
    });

    // Insight generation
    bus.on("cortex:insight", (event) => {
      const sessionId = event.payload.sessionId || "default";
      this.addHighlight(sessionId, {
        type: "insight",
        content: event.payload.insight || "",
        relevanceScore: event.payload.confidence || 0.8,
        icon: "💡",
      });
    });
  }

  /**
   * Publish session update to event bus
   */
  private publishSessionUpdate(sessionId: string) {
    bus.publish("cortex", "session:context_updated", {
      sessionId,
      context: this.getSerializableContext(sessionId),
    });
  }

  /**
   * Clear old sessions (older than 1 hour)
   */
  cleanupOldSessions() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [id, context] of this.sessions.entries()) {
      if (context.lastActivityTime.getTime() < oneHourAgo) {
        this.sessions.delete(id);
      }
    }
  }
}

export const sessionContextService = new SessionContextService();
