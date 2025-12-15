/**
 * @file Memory Cortex Tests
 * @version 1.0.0
 * @skill-os true
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  MemoryCortex, 
  resetMemoryCortex,
  type StoreMemoryInput,
} from '../src/cortex.js';

describe('MemoryCortex', () => {
  let cortex: MemoryCortex;

  beforeEach(() => {
    resetMemoryCortex();
    cortex = new MemoryCortex({
      autoConsolidate: false,
      autoCleanup: false,
    });
  });

  afterEach(async () => {
    await cortex.shutdown();
  });

  describe('Session Management', () => {
    it('should create a new session', () => {
      const session = cortex.createSession('user-123');
      
      expect(session.sessionId).toBeDefined();
      expect(session.userId).toBe('user-123');
      expect(session.messages).toHaveLength(0);
      expect(session.workingMemory).toHaveLength(0);
    });

    it('should retrieve existing session', () => {
      const session = cortex.createSession('user-123');
      const retrieved = cortex.getSession(session.sessionId);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe(session.sessionId);
    });

    it('should destroy session', () => {
      const session = cortex.createSession();
      expect(cortex.getSession(session.sessionId)).toBeDefined();
      
      cortex.destroySession(session.sessionId);
      expect(cortex.getSession(session.sessionId)).toBeNull();
    });
  });

  describe('Conversation History', () => {
    it('should add and retrieve messages', () => {
      const session = cortex.createSession();
      
      cortex.addMessage(session.sessionId, {
        role: 'user',
        content: 'Hello, TooLoo!',
      });
      
      cortex.addMessage(session.sessionId, {
        role: 'assistant',
        content: 'Hello! How can I help you?',
        skillId: 'core.chat',
      });
      
      const history = cortex.getConversationHistory(session.sessionId);
      
      expect(history).toHaveLength(2);
      expect(history[0]?.role).toBe('user');
      expect(history[0]?.content).toBe('Hello, TooLoo!');
      expect(history[1]?.role).toBe('assistant');
      expect(history[1]?.skillId).toBe('core.chat');
    });

    it('should limit conversation history', () => {
      const session = cortex.createSession();
      
      const history = cortex.getConversationHistory(session.sessionId, 1);
      expect(history.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Working Memory', () => {
    it('should set and get working memory', () => {
      const session = cortex.createSession();
      
      cortex.setWorkingMemory(session.sessionId, 'current_task', { task: 'write code' });
      
      const value = cortex.getWorkingMemory(session.sessionId, 'current_task');
      expect(value).toEqual({ task: 'write code' });
    });

    it('should delete working memory', () => {
      const session = cortex.createSession();
      
      cortex.setWorkingMemory(session.sessionId, 'key', 'value');
      expect(cortex.getWorkingMemory(session.sessionId, 'key')).toBe('value');
      
      cortex.deleteWorkingMemory(session.sessionId, 'key');
      expect(cortex.getWorkingMemory(session.sessionId, 'key')).toBeUndefined();
    });

    it('should get all working memory', () => {
      const session = cortex.createSession();
      
      cortex.setWorkingMemory(session.sessionId, 'key1', 'value1');
      cortex.setWorkingMemory(session.sessionId, 'key2', 'value2');
      
      const all = cortex.getAllWorkingMemory(session.sessionId);
      expect(all).toEqual({ key1: 'value1', key2: 'value2' });
    });
  });

  describe('Memory Storage', () => {
    it('should store and retrieve memory', async () => {
      const input: StoreMemoryInput = {
        content: 'User prefers TypeScript',
        type: 'semantic',
        tier: 'short-term',
        importance: 0.8,
      };
      
      const stored = await cortex.store(input);
      
      expect(stored.id).toBeDefined();
      expect(stored.content).toBe('User prefers TypeScript');
      expect(stored.importance).toBe(0.8);
    });

    it('should recall memory by ID', async () => {
      const stored = await cortex.store({
        content: 'Important fact',
        importance: 0.9,
      });
      
      const recalled = await cortex.recall(stored.id);
      
      expect(recalled).toBeDefined();
      expect(recalled?.content).toBe('Important fact');
    });

    it('should forget memory', async () => {
      const stored = await cortex.store({
        content: 'Temporary data',
      });
      
      const forgotten = await cortex.forget(stored.id);
      expect(forgotten).toBe(true);
      
      const recalled = await cortex.recall(stored.id);
      expect(recalled).toBeNull();
    });

    it('should retrieve memories by query', async () => {
      await cortex.store({
        content: 'TypeScript is great for type safety',
        importance: 0.8,
      });
      
      await cortex.store({
        content: 'Python is good for data science',
        importance: 0.7,
      });
      
      const results = await cortex.retrieve({
        query: 'TypeScript',
        limit: 5,
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.item.content).toContain('TypeScript');
    });
  });

  describe('Memory Statistics', () => {
    it('should return stats', async () => {
      const session = cortex.createSession();
      await cortex.store({ content: 'Test memory' });
      
      const stats = cortex.getStats();
      
      expect(stats.activeSessions).toBeGreaterThanOrEqual(1);
      expect(stats.totalMemories).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Consolidation', () => {
    it('should consolidate memories', async () => {
      // Store some memories
      await cortex.store({ content: 'Memory 1', importance: 0.1 });
      await cortex.store({ content: 'Memory 2', importance: 0.9 });
      
      const result = await cortex.consolidate();
      
      expect(result).toHaveProperty('promoted');
      expect(result).toHaveProperty('decayed');
      expect(result).toHaveProperty('pruned');
      expect(result).toHaveProperty('merged');
    });
  });
});
