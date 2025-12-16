/**
 * useSession.ts - Persistent Session Management
 * Maintains session continuity across socket reconnections
 * 
 * @version 1.0.0
 * @skill-os true
 */

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Session storage keys
const SESSION_ID_KEY = 'tooloo-session-id';
const SESSION_DATA_KEY = 'tooloo-session-data';
const SESSION_HISTORY_KEY = 'tooloo-session-history';

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  skill?: {
    id: string;
    name: string;
    confidence: number;
  };
  metadata?: Record<string, unknown>;
}

export interface SessionData {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  messages: SessionMessage[];
  context: Record<string, unknown>;
  // Memory context for LLM
  memoryContext?: {
    summary?: string;
    keyFacts?: string[];
    userPreferences?: Record<string, unknown>;
    conversationTone?: string;
  };
}

export interface UseSessionReturn {
  sessionId: string;
  session: SessionData;
  messages: SessionMessage[];
  addMessage: (message: Omit<SessionMessage, 'id' | 'timestamp'>) => SessionMessage;
  updateMessage: (id: string, updates: Partial<SessionMessage>) => void;
  clearMessages: () => void;
  setContext: (key: string, value: unknown) => void;
  getContext: (key: string) => unknown;
  updateMemoryContext: (updates: Partial<SessionData['memoryContext']>) => void;
  resetSession: () => void;
  exportSession: () => string;
  importSession: (data: string) => boolean;
}

/**
 * Get or create a persistent session ID
 */
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return uuidv4();
  
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${uuidv4().slice(0, 8)}`;
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Load session data from storage
 */
function loadSessionData(sessionId: string): SessionData {
  if (typeof window === 'undefined') {
    return createNewSession(sessionId);
  }
  
  try {
    const stored = localStorage.getItem(`${SESSION_DATA_KEY}-${sessionId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Restore Date objects
      parsed.createdAt = new Date(parsed.createdAt);
      parsed.updatedAt = new Date(parsed.updatedAt);
      parsed.messages = parsed.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      return parsed;
    }
  } catch (e) {
    console.error('[Session] Failed to load session data:', e);
  }
  
  return createNewSession(sessionId);
}

/**
 * Create a new session
 */
function createNewSession(sessionId: string): SessionData {
  return {
    id: sessionId,
    name: `Session ${new Date().toLocaleDateString()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
    context: {},
    memoryContext: {
      keyFacts: [],
      userPreferences: {},
      conversationTone: 'helpful',
    },
  };
}

/**
 * Save session data to storage
 */
function saveSessionData(session: SessionData): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(`${SESSION_DATA_KEY}-${session.id}`, JSON.stringify(session));
    
    // Also save to history list
    const historyRaw = localStorage.getItem(SESSION_HISTORY_KEY);
    const history: string[] = historyRaw ? JSON.parse(historyRaw) : [];
    if (!history.includes(session.id)) {
      history.unshift(session.id);
      // Keep only last 20 sessions
      if (history.length > 20) history.pop();
      localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history));
    }
  } catch (e) {
    console.error('[Session] Failed to save session data:', e);
  }
}

/**
 * Hook for persistent session management
 */
export function useSession(): UseSessionReturn {
  const [sessionId] = useState(() => getOrCreateSessionId());
  const [session, setSession] = useState<SessionData>(() => loadSessionData(sessionId));
  
  // Auto-save on session changes
  useEffect(() => {
    saveSessionData(session);
  }, [session]);
  
  const addMessage = useCallback((message: Omit<SessionMessage, 'id' | 'timestamp'>): SessionMessage => {
    const newMessage: SessionMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(),
    };
    
    setSession(prev => ({
      ...prev,
      updatedAt: new Date(),
      messages: [...prev.messages, newMessage],
    }));
    
    return newMessage;
  }, []);
  
  const updateMessage = useCallback((id: string, updates: Partial<SessionMessage>) => {
    setSession(prev => ({
      ...prev,
      updatedAt: new Date(),
      messages: prev.messages.map(m => m.id === id ? { ...m, ...updates } : m),
    }));
  }, []);
  
  const clearMessages = useCallback(() => {
    setSession(prev => ({
      ...prev,
      updatedAt: new Date(),
      messages: [],
    }));
  }, []);
  
  const setContext = useCallback((key: string, value: unknown) => {
    setSession(prev => ({
      ...prev,
      updatedAt: new Date(),
      context: { ...prev.context, [key]: value },
    }));
  }, []);
  
  const getContext = useCallback((key: string): unknown => {
    return session.context[key];
  }, [session.context]);
  
  const updateMemoryContext = useCallback((updates: Partial<SessionData['memoryContext']>) => {
    setSession(prev => ({
      ...prev,
      updatedAt: new Date(),
      memoryContext: { ...prev.memoryContext, ...updates },
    }));
  }, []);
  
  const resetSession = useCallback(() => {
    const newId = `session_${Date.now()}_${uuidv4().slice(0, 8)}`;
    localStorage.setItem(SESSION_ID_KEY, newId);
    const newSession = createNewSession(newId);
    setSession(newSession);
  }, []);
  
  const exportSession = useCallback((): string => {
    return JSON.stringify(session, null, 2);
  }, [session]);
  
  const importSession = useCallback((data: string): boolean => {
    try {
      const imported = JSON.parse(data);
      imported.createdAt = new Date(imported.createdAt);
      imported.updatedAt = new Date(imported.updatedAt);
      imported.messages = imported.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      setSession(imported);
      return true;
    } catch (e) {
      console.error('[Session] Failed to import session:', e);
      return false;
    }
  }, []);
  
  return {
    sessionId,
    session,
    messages: session.messages,
    addMessage,
    updateMessage,
    clearMessages,
    setContext,
    getContext,
    updateMemoryContext,
    resetSession,
    exportSession,
    importSession,
  };
}

export default useSession;
