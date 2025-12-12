/**
 * @tooloo/core - EventBus Tests
 * Unit tests for the TypedEventBus
 * 
 * @version 2.0.0-alpha.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TypedEventBus } from '../src/events/bus.js';

// =============================================================================
// EVENT BUS TESTS
// =============================================================================

describe('TypedEventBus', () => {
  let bus: TypedEventBus;

  beforeEach(() => {
    bus = new TypedEventBus();
  });

  describe('publish/subscribe', () => {
    it('should emit and receive events via on()', () => {
      const handler = vi.fn();
      
      bus.on('system:boot_complete', handler);
      bus.publish('system', 'system:boot_complete', {
        version: '2.0.0',
        startTime: new Date(),
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system:boot_complete',
          payload: expect.objectContaining({
            version: '2.0.0',
          }),
        })
      );
    });

    it('should support multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on('system:heartbeat', handler1);
      bus.on('system:heartbeat', handler2);
      bus.publish('system', 'system:heartbeat', { uptime: 1000, memoryUsage: 50 });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not call handler for different events', () => {
      const handler = vi.fn();

      bus.on('system:boot_complete', handler);
      bus.publish('system', 'system:shutdown', { reason: 'test', graceful: true });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe handler with returned function', () => {
      const handler = vi.fn();

      const unsubscribe = bus.on('intent:detected', handler);
      bus.publish('cortex', 'intent:detected', {
        intent: { type: 'code', confidence: 0.9, keywords: [] },
        source: 'test',
      });

      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      bus.publish('cortex', 'intent:detected', {
        intent: { type: 'code', confidence: 0.9, keywords: [] },
        source: 'test',
      });

      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should return unsubscribe function from on()', () => {
      const handler = vi.fn();

      const unsub = bus.on('skill:loaded', handler);
      bus.publish('skills', 'skill:loaded', { skillId: 'test', name: 'Test Skill' });

      expect(handler).toHaveBeenCalledTimes(1);

      unsub();
      bus.publish('skills', 'skill:loaded', { skillId: 'test2', name: 'Test Skill 2' });

      expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe('waitFor', () => {
    it('should resolve when event is emitted', async () => {
      const eventPromise = bus.waitFor('memory:cache_hit', { timeout: 1000 });
      
      // Emit event after a short delay
      setTimeout(() => {
        bus.publish('memory', 'memory:cache_hit', { query: 'test', savings: 100 });
      }, 10);

      const event = await eventPromise;
      expect(event.payload.query).toBe('test');
    });

    it('should timeout if event not emitted', async () => {
      await expect(
        bus.waitFor('memory:cache_miss', { timeout: 50 })
      ).rejects.toThrow('Timeout waiting for event');
    });
  });

  describe('event payloads', () => {
    it('should pass correct payload for skill events', () => {
      const handler = vi.fn();

      bus.on('skill:execution_complete', handler);
      bus.publish('skills', 'skill:execution_complete', {
        skillId: 'code-gen',
        duration: 1500,
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            skillId: 'code-gen',
            duration: 1500,
          },
        })
      );
    });

    it('should pass correct payload for routing events', () => {
      const handler = vi.fn();

      bus.on('routing:fallback', handler);
      bus.publish('precog', 'routing:fallback', {
        from: 'anthropic',
        to: 'deepseek',
        reason: 'rate limited',
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            from: 'anthropic',
            to: 'deepseek',
            reason: 'rate limited',
          },
        })
      );
    });

    it('should pass correct payload for memory events', () => {
      const handler = vi.fn();

      bus.on('memory:prune', handler);
      bus.publish('memory', 'memory:prune', {
        removed: 50,
        reason: 'max capacity',
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            removed: 50,
            reason: 'max capacity',
          },
        })
      );
    });
  });

  describe('event history', () => {
    it('should store events in history', () => {
      bus.publish('system', 'system:boot_complete', {
        version: '2.0.0',
        startTime: new Date(),
      });

      const history = bus.getHistory();
      expect(history.length).toBe(1);
      expect(history[0]?.type).toBe('system:boot_complete');
    });

    it('should limit history size', () => {
      const smallBus = new TypedEventBus({ historyLimit: 3 });

      for (let i = 0; i < 5; i++) {
        smallBus.publish('system', 'system:heartbeat', {
          uptime: i * 1000,
          memoryUsage: 50,
        });
      }

      const history = smallBus.getHistory();
      expect(history.length).toBe(3);
    });
  });
});

// =============================================================================
// BUS CONSTRUCTOR TESTS
// =============================================================================

describe('TypedEventBus constructor', () => {
  it('should create a new EventBus instance with default options', () => {
    const bus = new TypedEventBus();
    expect(bus).toBeInstanceOf(TypedEventBus);
  });

  it('should accept custom history limit', () => {
    const bus = new TypedEventBus({ historyLimit: 100 });
    expect(bus).toBeInstanceOf(TypedEventBus);
  });

  it('should create independent bus instances', () => {
    const bus1 = new TypedEventBus();
    const bus2 = new TypedEventBus();
    const handler = vi.fn();

    bus1.on('system:boot_complete', handler);
    bus2.publish('system', 'system:boot_complete', {
      version: '2.0.0',
      startTime: new Date(),
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
