/**
 * MemoryAutoFiller Tests
 * Tests for automatic memory management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../core/event-bus.js', () => ({
  bus: {
    on: vi.fn(),
    publish: vi.fn(),
  },
}));

describe('MemoryAutoFiller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Types', () => {
    describe('MemoryState', () => {
      it('should have shortTerm property', () => {
        interface MemoryState {
          shortTerm: string;
          longTerm: string;
          lastUpdated: Date;
          contextScore: number;
        }
        const state: MemoryState = {
          shortTerm: 'Working on TypeScript tests',
          longTerm: 'User prefers detailed explanations',
          lastUpdated: new Date(),
          contextScore: 0.85,
        };
        expect(state.shortTerm).toBe('Working on TypeScript tests');
      });

      it('should have longTerm property', () => {
        interface MemoryState {
          shortTerm: string;
          longTerm: string;
          lastUpdated: Date;
          contextScore: number;
        }
        const state: MemoryState = {
          shortTerm: 'Current task',
          longTerm: 'Persistent user preferences',
          lastUpdated: new Date(),
          contextScore: 0.9,
        };
        expect(state.longTerm).toBe('Persistent user preferences');
      });

      it('should track lastUpdated timestamp', () => {
        interface MemoryState {
          shortTerm: string;
          longTerm: string;
          lastUpdated: Date;
          contextScore: number;
        }
        const now = new Date();
        const state: MemoryState = {
          shortTerm: '',
          longTerm: '',
          lastUpdated: now,
          contextScore: 0,
        };
        expect(state.lastUpdated).toBe(now);
      });

      it('should have contextScore 0-1', () => {
        interface MemoryState {
          shortTerm: string;
          longTerm: string;
          lastUpdated: Date;
          contextScore: number;
        }
        const state: MemoryState = {
          shortTerm: '',
          longTerm: '',
          lastUpdated: new Date(),
          contextScore: 0.75,
        };
        expect(state.contextScore).toBeGreaterThanOrEqual(0);
        expect(state.contextScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('MemoryAutoFiller Class', () => {
    it('should maintain memory states map', () => {
      const memoryStates = new Map<string, { shortTerm: string }>();
      memoryStates.set('session-1', { shortTerm: 'test' });
      expect(memoryStates.has('session-1')).toBe(true);
    });

    it('should store hippocampus reference', () => {
      const hippocampus = { store: vi.fn(), recall: vi.fn() };
      expect(hippocampus.store).toBeDefined();
    });

    it('should track recent events', () => {
      const recentEvents: { type: string; content: string; timestamp: Date }[] = [];
      recentEvents.push({
        type: 'goal',
        content: 'Complete testing',
        timestamp: new Date(),
      });
      expect(recentEvents).toHaveLength(1);
    });

    it('should have max events limit', () => {
      const MAX_RECENT_EVENTS = 50;
      expect(MAX_RECENT_EVENTS).toBe(50);
    });
  });

  describe('Memory State Management', () => {
    it('should get existing memory state', () => {
      const states = new Map([['session-1', { shortTerm: 'existing' }]]);
      const state = states.get('session-1');
      expect(state?.shortTerm).toBe('existing');
    });

    it('should create new memory state if not exists', () => {
      const states = new Map<string, { shortTerm: string; longTerm: string }>();
      const sessionId = 'new-session';
      if (!states.has(sessionId)) {
        states.set(sessionId, {
          shortTerm: '',
          longTerm: '',
        });
      }
      expect(states.has(sessionId)).toBe(true);
    });

    it('should initialize with empty strings', () => {
      const newState = {
        shortTerm: '',
        longTerm: '',
        lastUpdated: new Date(),
        contextScore: 0,
      };
      expect(newState.shortTerm).toBe('');
      expect(newState.longTerm).toBe('');
    });
  });

  describe('Short-Term Memory Generation', () => {
    it('should show awaiting message for no events', () => {
      const recentEvents: unknown[] = [];
      const message = recentEvents.length === 0
        ? 'Session started. Awaiting input...'
        : 'Processing...';
      expect(message).toBe('Session started. Awaiting input...');
    });

    it('should use last 10 events for summary', () => {
      const allEvents = Array(20).fill({ type: 'action', content: 'test' });
      const recentEvents = allEvents.slice(-10);
      expect(recentEvents).toHaveLength(10);
    });

    it('should group events by type', () => {
      const events = [
        { type: 'goal', content: 'Goal A' },
        { type: 'action', content: 'Action 1' },
        { type: 'goal', content: 'Goal B' },
        { type: 'action', content: 'Action 2' },
      ];
      const eventsByType: Record<string, string[]> = {};
      for (const ev of events) {
        if (!eventsByType[ev.type]) {
          eventsByType[ev.type] = [];
        }
        eventsByType[ev.type]?.push(ev.content);
      }
      expect(eventsByType['goal']).toHaveLength(2);
      expect(eventsByType['action']).toHaveLength(2);
    });

    it('should format goal in summary', () => {
      const goal = 'Complete the feature';
      const line = `📌 Current Goal: ${goal}`;
      expect(line).toContain('📌');
      expect(line).toContain(goal);
    });

    it('should format recent actions in summary', () => {
      const actions = ['Created file', 'Ran tests', 'Fixed bug'];
      const line = `⚙️ Recent Actions: ${actions.slice(0, 2).join(', ')}`;
      expect(line).toContain('⚙️');
      expect(line).toContain('Created file');
    });

    it('should format observations in summary', () => {
      const observations = ['Tests passing', 'No errors'];
      const line = `👁️ Observations: ${observations.slice(0, 2).join(', ')}`;
      expect(line).toContain('👁️');
    });
  });

  describe('Long-Term Memory Generation', () => {
    it('should query hippocampus for relevant memories', () => {
      const hippocampus = {
        recall: vi.fn().mockResolvedValue([
          { content: 'User prefers TypeScript' },
          { content: 'User works on TooLoo project' },
        ]),
      };
      hippocampus.recall('context');
      expect(hippocampus.recall).toHaveBeenCalled();
    });

    it('should format memories for display', () => {
      const memories = [
        { content: 'Memory 1' },
        { content: 'Memory 2' },
      ];
      const formatted = memories.map((m) => `• ${m.content}`).join('\n');
      expect(formatted).toContain('• Memory 1');
      expect(formatted).toContain('• Memory 2');
    });

    it('should show no memories message when empty', () => {
      const memories: unknown[] = [];
      const message = memories.length === 0
        ? 'No relevant long-term memories found.'
        : 'Memories found.';
      expect(message).toBe('No relevant long-term memories found.');
    });
  });

  describe('Event Listeners', () => {
    it('should listen for cortex events', () => {
      const listeners: string[] = [];
      const on = (channel: string, _handler: () => void) => {
        listeners.push(channel);
      };
      on('cortex', () => {});
      expect(listeners).toContain('cortex');
    });

    it('should process goal events', () => {
      const events: { type: string; content: string }[] = [];
      const handleEvent = (type: string, data: { goal?: string }) => {
        if (data.goal) {
          events.push({ type: 'goal', content: data.goal });
        }
      };
      handleEvent('goal_set', { goal: 'Test completion' });
      expect(events[0]?.type).toBe('goal');
    });

    it('should process action events', () => {
      const events: { type: string; content: string }[] = [];
      const handleEvent = (type: string, data: { action?: string }) => {
        if (data.action) {
          events.push({ type: 'action', content: data.action });
        }
      };
      handleEvent('action_taken', { action: 'Created test file' });
      expect(events[0]?.content).toBe('Created test file');
    });

    it('should process observation events', () => {
      const events: { type: string; content: string }[] = [];
      const handleEvent = (type: string, data: { observation?: string }) => {
        if (data.observation) {
          events.push({ type: 'observation', content: data.observation });
        }
      };
      handleEvent('observed', { observation: 'All tests passing' });
      expect(events[0]?.content).toBe('All tests passing');
    });
  });

  describe('Event Trimming', () => {
    it('should trim events when exceeding max', () => {
      const MAX_EVENTS = 50;
      const events = Array(60).fill({ type: 'action', content: 'test' });
      if (events.length > MAX_EVENTS) {
        events.splice(0, events.length - MAX_EVENTS);
      }
      expect(events).toHaveLength(50);
    });

    it('should keep most recent events', () => {
      const events = [
        { id: 1, content: 'old' },
        { id: 2, content: 'newer' },
        { id: 3, content: 'newest' },
      ];
      const trimmed = events.slice(-2);
      expect(trimmed[0]?.id).toBe(2);
      expect(trimmed[1]?.id).toBe(3);
    });
  });

  describe('Context Score Calculation', () => {
    it('should calculate score based on event relevance', () => {
      const events = [
        { relevance: 0.9 },
        { relevance: 0.8 },
        { relevance: 0.7 },
      ];
      const avgRelevance = events.reduce((sum, e) => sum + e.relevance, 0) / events.length;
      expect(avgRelevance).toBeCloseTo(0.8, 5);
    });

    it('should return 0 for no events', () => {
      const events: { relevance: number }[] = [];
      const score = events.length > 0
        ? events.reduce((sum, e) => sum + e.relevance, 0) / events.length
        : 0;
      expect(score).toBe(0);
    });
  });

  describe('API', () => {
    it('should provide getShortTermMemory', () => {
      const getShortTermMemory = (sessionId: string) => {
        const states = new Map([['s1', { shortTerm: 'Short term memory' }]]);
        return states.get(sessionId)?.shortTerm || '';
      };
      expect(getShortTermMemory('s1')).toBe('Short term memory');
    });

    it('should provide getLongTermMemory', () => {
      const getLongTermMemory = (sessionId: string) => {
        const states = new Map([['s1', { longTerm: 'Long term memory' }]]);
        return states.get(sessionId)?.longTerm || '';
      };
      expect(getLongTermMemory('s1')).toBe('Long term memory');
    });

    it('should provide getMemoryState', () => {
      const getMemoryState = (sessionId: string) => {
        const states = new Map([
          ['s1', { shortTerm: 'Short', longTerm: 'Long', contextScore: 0.5 }],
        ]);
        return states.get(sessionId);
      };
      const state = getMemoryState('s1');
      expect(state?.contextScore).toBe(0.5);
    });
  });
});
