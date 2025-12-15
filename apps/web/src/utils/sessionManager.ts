/**
 * Session Manager Utility
 * Auto-implemented by TooLoo.ai Safe Implementation
 * @version 1.0.0
 */

import { v4 as uuidv4 } from "uuid";

export interface Session {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  context: Record<string, unknown>;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private currentSessionId: string | null = null;
  private storageKey = "tooloo-sessions";

  constructor() {
    this.loadSessions();
  }

  createSession(name: string): Session {
    const session: Session = {
      id: uuidv4(),
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      context: {},
    };
    this.sessions.set(session.id, session);
    this.currentSessionId = session.id;
    this.persist();
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  getCurrentSession(): Session | undefined {
    return this.currentSessionId ? this.sessions.get(this.currentSessionId) : undefined;
  }

  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  switchSession(id: string): boolean {
    if (this.sessions.has(id)) {
      this.currentSessionId = id;
      return true;
    }
    return false;
  }

  deleteSession(id: string): boolean {
    const deleted = this.sessions.delete(id);
    if (deleted && this.currentSessionId === id) {
      this.currentSessionId = null;
    }
    this.persist();
    return deleted;
  }

  private persist(): void {
    const sessions = Array.from(this.sessions.values());
    localStorage.setItem(this.storageKey, JSON.stringify(sessions));
    localStorage.setItem("tooloo-current-session", this.currentSessionId || "");
  }

  private loadSessions(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.forEach((s: Session) => {
          s.createdAt = new Date(s.createdAt);
          s.updatedAt = new Date(s.updatedAt);
          this.sessions.set(s.id, s);
        });
      }
      this.currentSessionId = localStorage.getItem("tooloo-current-session") || null;
    } catch (e) {
      console.error("Failed to load sessions", e);
    }
  }
}

export const sessionManager = new SessionManager();
