/**
 * @file useSynapsys Hook
 * @description React hook for interacting with the Skill OS
 * @version 1.0.0
 *
 * This hook provides:
 * - Active skill state
 * - Skill execution dispatch
 * - Loading/error states
 * - Skill navigation
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface SkillManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  ui: {
    icon: string;
    placement: string;
    shortcut?: string;
  };
  intent: {
    triggers: string[];
    priority?: number;
  };
}

export interface SkillExecutionResult<T = unknown> {
  skillId: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

export interface SynapsysState {
  /** Currently active skill ID */
  activeSkillId: string | null;
  /** Active skill manifest */
  activeSkill: SkillManifest | null;
  /** Data from last skill execution */
  skillData: unknown;
  /** Loading state */
  isLoading: boolean;
  /** Error from last operation */
  error: string | null;
  /** All available skills */
  skills: SkillManifest[];
  /** Session ID */
  sessionId: string | null;
}

export interface SynapsysActions {
  /** Execute a skill with input */
  execute: <T = unknown>(skillId: string, input: unknown) => Promise<SkillExecutionResult<T>>;
  /** Execute based on natural language */
  executeIntent: <T = unknown>(text: string) => Promise<SkillExecutionResult<T>>;
  /** Activate a skill (change UI) */
  activate: (skillId: string) => Promise<void>;
  /** Dispatch input to active skill */
  dispatch: (input: unknown) => Promise<void>;
  /** Load available skills */
  loadSkills: () => Promise<void>;
  /** Clear error */
  clearError: () => void;
}

export type UseSynapsysReturn = SynapsysState & SynapsysActions;

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_API_BASE = '/synapsys';

interface SynapsysConfig {
  apiBase?: string;
  defaultSkill?: string;
  onError?: (error: Error) => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useSynapsys(config: SynapsysConfig = {}): UseSynapsysReturn {
  const { apiBase = DEFAULT_API_BASE, defaultSkill = 'core.chat', onError } = config;

  // State
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [activeSkill, setActiveSkill] = useState<SkillManifest | null>(null);
  const [skillData, setSkillData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillManifest[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Refs for stable callbacks
  const abortControllerRef = useRef<AbortController | null>(null);

  // ---------------------------------------------------------------------------
  // API Helpers
  // ---------------------------------------------------------------------------

  const fetchApi = useCallback(
    async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${apiBase}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }

      return response.json();
    },
    [apiBase]
  );

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const loadSkills = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await fetchApi<{ ok: boolean; data: { skills: SkillManifest[] } }>('/skills');

      if (result.ok) {
        setSkills(result.data.skills);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const message = (err as Error).message;
        setError(message);
        onError?.(err as Error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchApi, onError]);

  const execute = useCallback(
    async <T = unknown>(skillId: string, input: unknown): Promise<SkillExecutionResult<T>> => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await fetchApi<SkillExecutionResult<T> & { ok: boolean }>('/execute', {
          method: 'POST',
          body: JSON.stringify({ skillId, input }),
        });

        if (result.success) {
          setSkillData(result.data);
        } else if (result.error) {
          setError(result.error.message);
        }

        return result;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          const message = (err as Error).message;
          setError(message);
          onError?.(err as Error);
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchApi, onError]
  );

  const executeIntent = useCallback(
    async <T = unknown>(text: string): Promise<SkillExecutionResult<T>> => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await fetchApi<
          SkillExecutionResult<T> & { ok: boolean; routing: { matchedSkill: string | null } }
        >('/intent', {
          method: 'POST',
          body: JSON.stringify({ text }),
        });

        if (result.success) {
          setSkillData(result.data);

          // Auto-activate the matched skill
          if (result.routing?.matchedSkill && result.routing.matchedSkill !== activeSkillId) {
            const matched = skills.find((s) => s.id === result.routing.matchedSkill);
            if (matched) {
              setActiveSkillId(matched.id);
              setActiveSkill(matched);
            }
          }
        } else if (result.error) {
          setError(result.error.message);
        }

        return result;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          const message = (err as Error).message;
          setError(message);
          onError?.(err as Error);
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchApi, onError, activeSkillId, skills]
  );

  const activate = useCallback(
    async (skillId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await fetchApi<{ ok: boolean; data: { activeSkill: string | null } }>(
          '/activate',
          {
            method: 'POST',
            body: JSON.stringify({ skillId }),
          }
        );

        if (result.ok) {
          setActiveSkillId(skillId);
          const skill = skills.find((s) => s.id === skillId);
          setActiveSkill(skill ?? null);
          setSkillData(null); // Clear previous skill's data
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          const message = (err as Error).message;
          setError(message);
          onError?.(err as Error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [fetchApi, skills, onError]
  );

  const dispatch = useCallback(
    async (input: unknown) => {
      if (!activeSkillId) {
        setError('No active skill to dispatch to');
        return;
      }
      await execute(activeSkillId, input);
    },
    [activeSkillId, execute]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Load skills on mount
  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  // Activate default skill after skills are loaded
  useEffect(() => {
    if (skills.length > 0 && !activeSkillId && defaultSkill) {
      const defaultSkillManifest = skills.find((s) => s.id === defaultSkill);
      if (defaultSkillManifest) {
        activate(defaultSkill);
      }
    }
  }, [skills, activeSkillId, defaultSkill, activate]);

  // Generate session ID on mount
  useEffect(() => {
    setSessionId(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // State
    activeSkillId,
    activeSkill,
    skillData,
    isLoading,
    error,
    skills,
    sessionId,
    // Actions
    execute,
    executeIntent,
    activate,
    dispatch,
    loadSkills,
    clearError,
  };
}

export default useSynapsys;
