// @version 3.3.577
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus, SynapsysEvent } from '../../../src/core/event-bus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('should initialize with an ID', () => {
    expect(bus).toBeDefined();
    expect((bus as any).id).toBeDefined();
  });

  it('should emit events to listeners', () => {
    const listener = vi.fn();
    bus.on('test-event', listener);

    const event: SynapsysEvent = {
      source: 'system',
      type: 'test-event',
      payload: { data: 'test' },
      timestamp: Date.now(),
    };

    bus.emitEvent(event);

    expect(listener).toHaveBeenCalledWith(event);
  });

  it('should emit wildcard events', () => {
    const listener = vi.fn();
    bus.on('*', listener);

    const event: SynapsysEvent = {
      source: 'system',
      type: 'test-event',
      payload: { data: 'test' },
      timestamp: Date.now(),
    };

    bus.emitEvent(event);

    expect(listener).toHaveBeenCalledWith(event);
  });

  it('should support interceptors', async () => {
    const interceptor = vi.fn().mockResolvedValue(true);
    bus.addInterceptor(interceptor);

    const event: SynapsysEvent = {
      source: 'system',
      type: 'test-event',
      payload: { data: 'test' },
      timestamp: Date.now(),
    };

    await bus.emitEvent(event);

    expect(interceptor).toHaveBeenCalledWith(event);
  });

  it('should block events if interceptor returns false', async () => {
    const interceptor = vi.fn().mockResolvedValue(false);
    bus.addInterceptor(interceptor);

    const listener = vi.fn();
    bus.on('test-event', listener);

    const event: SynapsysEvent = {
      source: 'system',
      type: 'test-event',
      payload: { data: 'test' },
      timestamp: Date.now(),
    };

    await bus.emitEvent(event);

    expect(interceptor).toHaveBeenCalledWith(event);
    expect(listener).not.toHaveBeenCalled();
  });

  it('should publish events using helper', () => {
    const listener = vi.fn();
    bus.on('test-event', listener);

    bus.publish('system', 'test-event', { data: 'test' });

    expect(listener).toHaveBeenCalled();
    const callArg = listener.mock.calls[0][0];
    expect(callArg.source).toBe('system');
    expect(callArg.type).toBe('test-event');
    expect(callArg.payload).toEqual({ data: 'test' });
  });
});
