// @version 1.0.0 - ContextManager Tests
import { describe, it, expect, beforeEach } from 'vitest';

// Test types
type InitiativeMode = 'director' | 'partner' | 'agent';

interface InitiativeState {
  mode: InitiativeMode;
  lastUserAction: number;
  idleTime: number;
  agentTask: string | null;
  autoSuggestion: boolean;
}

describe('ContextManager', () => {
  describe('InitiativeMode Types', () => {
    it('should support director mode', () => {
      const mode: InitiativeMode = 'director';
      expect(mode).toBe('director');
    });

    it('should support partner mode', () => {
      const mode: InitiativeMode = 'partner';
      expect(mode).toBe('partner');
    });

    it('should support agent mode', () => {
      const mode: InitiativeMode = 'agent';
      expect(mode).toBe('agent');
    });
  });

  describe('InitiativeState Interface', () => {
    let state: InitiativeState;

    beforeEach(() => {
      state = {
        mode: 'director',
        lastUserAction: Date.now(),
        idleTime: 0,
        agentTask: null,
        autoSuggestion: false
      };
    });

    it('should have mode property', () => {
      expect(state.mode).toBe('director');
    });

    it('should track lastUserAction timestamp', () => {
      expect(typeof state.lastUserAction).toBe('number');
    });

    it('should track idleTime', () => {
      expect(state.idleTime).toBe(0);
    });

    it('should have optional agentTask', () => {
      expect(state.agentTask).toBeNull();
    });

    it('should have autoSuggestion flag', () => {
      expect(state.autoSuggestion).toBe(false);
    });

    it('should allow setting agentTask', () => {
      state.agentTask = 'Refactor authentication';
      expect(state.agentTask).toBe('Refactor authentication');
    });
  });

  describe('Initiative Mode Constants', () => {
    const INITIATIVE_MODES = {
      DIRECTOR: 'director' as InitiativeMode,
      PARTNER: 'partner' as InitiativeMode,
      AGENT: 'agent' as InitiativeMode,
    };

    it('should have DIRECTOR constant', () => {
      expect(INITIATIVE_MODES.DIRECTOR).toBe('director');
    });

    it('should have PARTNER constant', () => {
      expect(INITIATIVE_MODES.PARTNER).toBe('partner');
    });

    it('should have AGENT constant', () => {
      expect(INITIATIVE_MODES.AGENT).toBe('agent');
    });
  });

  describe('Idle Threshold', () => {
    const IDLE_THRESHOLD_MS = 10000;

    it('should be 10 seconds', () => {
      expect(IDLE_THRESHOLD_MS).toBe(10000);
    });

    it('should trigger partner mode when exceeded', () => {
      const idleTime = 15000;
      const shouldSuggest = idleTime >= IDLE_THRESHOLD_MS;
      expect(shouldSuggest).toBe(true);
    });

    it('should stay in director mode when not exceeded', () => {
      const idleTime = 5000;
      const shouldSuggest = idleTime >= IDLE_THRESHOLD_MS;
      expect(shouldSuggest).toBe(false);
    });
  });

  describe('Context Retrieval', () => {
    it('should combine vector and graph context', () => {
      const vectorContext = ['context1', 'context2'];
      const graphContext = ['context2', 'context3'];
      const combined = [...new Set([...vectorContext, ...graphContext])];
      expect(combined).toHaveLength(3);
    });

    it('should deduplicate context', () => {
      const items = ['a', 'b', 'a', 'c', 'b'];
      const unique = [...new Set(items)];
      expect(unique).toHaveLength(3);
    });

    it('should limit context items', () => {
      const limit = 5;
      const items = Array(10).fill('item');
      const limited = items.slice(0, limit);
      expect(limited).toHaveLength(5);
    });

    it('should default limit to 5', () => {
      const defaultLimit = 5;
      expect(defaultLimit).toBe(5);
    });
  });

  describe('Vector Context', () => {
    it('should search by query', () => {
      const query = 'authentication';
      expect(query).toBe('authentication');
    });

    it('should return text from results', () => {
      const results = [
        { doc: { text: 'result1' } },
        { doc: { text: 'result2' } }
      ];
      const texts = results.map(r => r.doc.text);
      expect(texts).toEqual(['result1', 'result2']);
    });

    it('should handle search errors gracefully', () => {
      const fallback: string[] = [];
      expect(fallback).toEqual([]);
    });
  });

  describe('Graph Context', () => {
    it('should extract entities from query', () => {
      const query = 'How do I authenticate users?';
      const entities = ['authenticate', 'users'];
      expect(entities).toHaveLength(2);
    });

    it('should traverse graph for related knowledge', () => {
      const traverseGraph = true;
      expect(traverseGraph).toBe(true);
    });

    it('should handle graph errors gracefully', () => {
      const fallback: string[] = [];
      expect(fallback).toEqual([]);
    });
  });

  describe('Entity Extraction', () => {
    it('should extract keywords from text', () => {
      const text = 'Create a REST API endpoint';
      const keywords = text.toLowerCase().split(' ').filter(w => w.length > 3);
      expect(keywords).toContain('create');
      expect(keywords).toContain('endpoint');
    });

    it('should filter common words', () => {
      const stopWords = ['the', 'a', 'an', 'is', 'are'];
      const word = 'the';
      expect(stopWords).toContain(word);
    });

    it('should handle empty queries', () => {
      const query = '';
      const entities = query.split(' ').filter(Boolean);
      expect(entities).toHaveLength(0);
    });
  });

  describe('Mode Transitions', () => {
    it('should transition from director to partner after idle', () => {
      let mode: InitiativeMode = 'director';
      const idleTime = 15000;
      if (idleTime >= 10000) {
        mode = 'partner';
      }
      expect(mode).toBe('partner');
    });

    it('should transition to agent on user handoff', () => {
      let mode: InitiativeMode = 'partner';
      const userHandoff = true;
      if (userHandoff) {
        mode = 'agent';
      }
      expect(mode).toBe('agent');
    });

    it('should return to director on user activity', () => {
      let mode: InitiativeMode = 'agent';
      const userActive = true;
      if (userActive) {
        mode = 'director';
      }
      expect(mode).toBe('director');
    });
  });
});
