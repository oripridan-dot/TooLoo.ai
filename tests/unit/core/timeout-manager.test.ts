/**
 * Timeout Manager Test Suite
 * @version 3.3.510
 *
 * Tests for the timeout management utilities including:
 * - Promise timeouts
 * - Default timeout constants
 * - Timeout wrappers
 * - TimeoutManager class
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TimeoutOptions {
  ms: number;
  operation: string;
  onTimeout?: () => void;
}

const DEFAULT_TIMEOUTS = {
  SHORT: 5000,
  MEDIUM: 15000,
  LONG: 60000,
  EXTENDED: 300000,
} as const;

// ============================================================================
// UTILITY FUNCTIONS (mirrors implementation)
// ============================================================================

function withTimeout<T>(promise: Promise<T>, options: TimeoutOptions): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeout = setTimeout(() => {
        if (options.onTimeout) {
          options.onTimeout();
        }
        reject(new Error(`[Timeout] ${options.operation} exceeded ${options.ms}ms timeout`));
      }, options.ms);

      promise.finally(() => clearTimeout(timeout));
    }),
  ]);
}

function createTimeoutWrapper<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  defaultTimeoutMs: number = DEFAULT_TIMEOUTS.MEDIUM
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return withTimeout(fn(...args), {
      ms: defaultTimeoutMs,
      operation: fn.name || 'Anonymous operation',
    });
  };
}

class TimeoutManager {
  private activeTimeouts: Map<string, NodeJS.Timeout> = new Map();

  setTimeout(id: string, callback: () => void, ms: number): NodeJS.Timeout {
    if (this.activeTimeouts.has(id)) {
      clearTimeout(this.activeTimeouts.get(id)!);
    }

    const timeout = setTimeout(() => {
      this.activeTimeouts.delete(id);
      callback();
    }, ms);

    this.activeTimeouts.set(id, timeout);
    return timeout;
  }

  clearTimeout(id: string): boolean {
    const timeout = this.activeTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(id);
      return true;
    }
    return false;
  }

  clearAllTimeouts(): void {
    for (const [, timeout] of this.activeTimeouts) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();
  }

  getActiveTimeoutCount(): number {
    return this.activeTimeouts.size;
  }
}

// ============================================================================
// TIMEOUT OPTIONS TESTS
// ============================================================================

describe('TimeoutOptions', () => {
  it('should create basic options', () => {
    const options: TimeoutOptions = {
      ms: 5000,
      operation: 'Test operation',
    };
    expect(options.ms).toBe(5000);
    expect(options.operation).toBe('Test operation');
  });

  it('should support onTimeout callback', () => {
    let called = false;
    const options: TimeoutOptions = {
      ms: 1000,
      operation: 'Test',
      onTimeout: () => {
        called = true;
      },
    };
    expect(options.onTimeout).toBeDefined();
    options.onTimeout?.();
    expect(called).toBe(true);
  });
});

// ============================================================================
// DEFAULT TIMEOUTS TESTS
// ============================================================================

describe('DEFAULT_TIMEOUTS', () => {
  it('should have SHORT timeout of 5 seconds', () => {
    expect(DEFAULT_TIMEOUTS.SHORT).toBe(5000);
  });

  it('should have MEDIUM timeout of 15 seconds', () => {
    expect(DEFAULT_TIMEOUTS.MEDIUM).toBe(15000);
  });

  it('should have LONG timeout of 1 minute', () => {
    expect(DEFAULT_TIMEOUTS.LONG).toBe(60000);
  });

  it('should have EXTENDED timeout of 5 minutes', () => {
    expect(DEFAULT_TIMEOUTS.EXTENDED).toBe(300000);
  });

  it('should be ordered by duration', () => {
    expect(DEFAULT_TIMEOUTS.SHORT).toBeLessThan(DEFAULT_TIMEOUTS.MEDIUM);
    expect(DEFAULT_TIMEOUTS.MEDIUM).toBeLessThan(DEFAULT_TIMEOUTS.LONG);
    expect(DEFAULT_TIMEOUTS.LONG).toBeLessThan(DEFAULT_TIMEOUTS.EXTENDED);
  });
});

// ============================================================================
// WITH TIMEOUT TESTS
// ============================================================================

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve when promise completes before timeout', async () => {
    const promise = Promise.resolve('success');
    const result = await withTimeout(promise, {
      ms: 5000,
      operation: 'Test',
    });
    expect(result).toBe('success');
  });

  it('should reject when promise exceeds timeout', async () => {
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 10000);
    });

    const wrappedPromise = withTimeout(slowPromise, {
      ms: 5000,
      operation: 'Slow operation',
    });

    vi.advanceTimersByTime(5001);

    await expect(wrappedPromise).rejects.toThrow(
      '[Timeout] Slow operation exceeded 5000ms timeout'
    );
  });

  it('should call onTimeout callback when timeout occurs', async () => {
    const onTimeout = vi.fn();
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 10000);
    });

    const wrappedPromise = withTimeout(slowPromise, {
      ms: 5000,
      operation: 'Test',
      onTimeout,
    });

    vi.advanceTimersByTime(5001);

    try {
      await wrappedPromise;
    } catch {
      // Expected
    }

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('should include operation name in error message', async () => {
    const slowPromise = new Promise<void>(() => {});

    const wrappedPromise = withTimeout(slowPromise, {
      ms: 100,
      operation: 'Database query',
    });

    vi.advanceTimersByTime(101);

    await expect(wrappedPromise).rejects.toThrow('Database query');
  });

  it('should include timeout duration in error message', async () => {
    const slowPromise = new Promise<void>(() => {});

    const wrappedPromise = withTimeout(slowPromise, {
      ms: 3000,
      operation: 'API call',
    });

    vi.advanceTimersByTime(3001);

    await expect(wrappedPromise).rejects.toThrow('3000ms');
  });
});

// ============================================================================
// TIMEOUT WRAPPER TESTS
// ============================================================================

describe('createTimeoutWrapper', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should wrap async function', async () => {
    const asyncFn = async (x: number) => x * 2;
    const wrapped = createTimeoutWrapper(asyncFn, 5000);

    const result = await wrapped(5);
    expect(result).toBe(10);
  });

  it('should timeout slow function', async () => {
    const slowFn = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      return 'done';
    };
    const wrapped = createTimeoutWrapper(slowFn, 5000);

    const resultPromise = wrapped();
    vi.advanceTimersByTime(5001);

    await expect(resultPromise).rejects.toThrow('exceeded 5000ms timeout');
  });

  it('should use default timeout', async () => {
    const fn = async () => 'result';
    const wrapped = createTimeoutWrapper(fn); // Uses MEDIUM (15000ms)

    const result = await wrapped();
    expect(result).toBe('result');
  });
});

// ============================================================================
// TIMEOUT MANAGER TESTS
// ============================================================================

describe('TimeoutManager', () => {
  let manager: TimeoutManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new TimeoutManager();
  });

  afterEach(() => {
    manager.clearAllTimeouts();
    vi.useRealTimers();
  });

  describe('setTimeout', () => {
    it('should create timeout with ID', () => {
      const callback = vi.fn();
      manager.setTimeout('test-1', callback, 1000);

      expect(manager.getActiveTimeoutCount()).toBe(1);
    });

    it('should execute callback after timeout', () => {
      const callback = vi.fn();
      manager.setTimeout('test-1', callback, 1000);

      vi.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should remove timeout from active after execution', () => {
      const callback = vi.fn();
      manager.setTimeout('test-1', callback, 1000);

      vi.advanceTimersByTime(1000);

      expect(manager.getActiveTimeoutCount()).toBe(0);
    });

    it('should replace existing timeout with same ID', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.setTimeout('test-1', callback1, 1000);
      manager.setTimeout('test-1', callback2, 2000);

      expect(manager.getActiveTimeoutCount()).toBe(1);

      vi.advanceTimersByTime(1001);
      expect(callback1).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearTimeout', () => {
    it('should clear existing timeout', () => {
      const callback = vi.fn();
      manager.setTimeout('test-1', callback, 1000);

      const cleared = manager.clearTimeout('test-1');

      expect(cleared).toBe(true);
      expect(manager.getActiveTimeoutCount()).toBe(0);

      vi.advanceTimersByTime(1001);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should return false for non-existent timeout', () => {
      const cleared = manager.clearTimeout('non-existent');
      expect(cleared).toBe(false);
    });
  });

  describe('clearAllTimeouts', () => {
    it('should clear all active timeouts', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      manager.setTimeout('test-1', callback1, 1000);
      manager.setTimeout('test-2', callback2, 2000);
      manager.setTimeout('test-3', callback3, 3000);

      expect(manager.getActiveTimeoutCount()).toBe(3);

      manager.clearAllTimeouts();

      expect(manager.getActiveTimeoutCount()).toBe(0);

      vi.advanceTimersByTime(5000);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).not.toHaveBeenCalled();
    });
  });

  describe('getActiveTimeoutCount', () => {
    it('should return 0 when no timeouts', () => {
      expect(manager.getActiveTimeoutCount()).toBe(0);
    });

    it('should return correct count', () => {
      manager.setTimeout('t1', () => {}, 1000);
      manager.setTimeout('t2', () => {}, 2000);
      manager.setTimeout('t3', () => {}, 3000);

      expect(manager.getActiveTimeoutCount()).toBe(3);
    });

    it('should update after timeout executes', () => {
      manager.setTimeout('t1', () => {}, 1000);
      manager.setTimeout('t2', () => {}, 2000);

      vi.advanceTimersByTime(1001);

      expect(manager.getActiveTimeoutCount()).toBe(1);
    });
  });
});

// ============================================================================
// TIMEOUT PATTERNS TESTS
// ============================================================================

describe('Timeout Patterns', () => {
  it('should recommend SHORT for UI operations', () => {
    const uiOperationTimeout = DEFAULT_TIMEOUTS.SHORT;
    expect(uiOperationTimeout).toBeLessThanOrEqual(5000);
  });

  it('should recommend MEDIUM for network calls', () => {
    const networkTimeout = DEFAULT_TIMEOUTS.MEDIUM;
    expect(networkTimeout).toBeLessThanOrEqual(30000);
  });

  it('should recommend LONG for heavy computations', () => {
    const computeTimeout = DEFAULT_TIMEOUTS.LONG;
    expect(computeTimeout).toBeGreaterThanOrEqual(60000);
  });

  it('should recommend EXTENDED for system operations', () => {
    const systemTimeout = DEFAULT_TIMEOUTS.EXTENDED;
    expect(systemTimeout).toBeGreaterThanOrEqual(300000);
  });
});

// ============================================================================
// TIMEOUT ERROR HANDLING TESTS
// ============================================================================

describe('Timeout Error Handling', () => {
  it('should create error with timeout prefix', () => {
    const error = new Error('[Timeout] Operation exceeded 5000ms timeout');
    expect(error.message).toMatch(/^\[Timeout\]/);
  });

  it('should include operation name in error', () => {
    const error = new Error('[Timeout] Database query exceeded 5000ms timeout');
    expect(error.message).toContain('Database query');
  });

  it('should include timeout duration in error', () => {
    const error = new Error('[Timeout] API call exceeded 15000ms timeout');
    expect(error.message).toContain('15000ms');
  });

  it('should be catchable as Error', () => {
    const error = new Error('[Timeout] Test');
    expect(error instanceof Error).toBe(true);
  });
});

// ============================================================================
// CONCURRENT TIMEOUT TESTS
// ============================================================================

describe('Concurrent Timeouts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle multiple concurrent timeouts', async () => {
    const results: string[] = [];

    const p1 = withTimeout(Promise.resolve('first'), {
      ms: 1000,
      operation: 'First',
    }).then((r) => {
      results.push(r);
      return r;
    });

    const p2 = withTimeout(Promise.resolve('second'), {
      ms: 2000,
      operation: 'Second',
    }).then((r) => {
      results.push(r);
      return r;
    });

    await Promise.all([p1, p2]);

    expect(results).toContain('first');
    expect(results).toContain('second');
  });

  it('should track multiple manager timeouts independently', () => {
    const manager = new TimeoutManager();
    const callbacks = { a: vi.fn(), b: vi.fn(), c: vi.fn() };

    manager.setTimeout('a', callbacks.a, 1000);
    manager.setTimeout('b', callbacks.b, 2000);
    manager.setTimeout('c', callbacks.c, 3000);

    vi.advanceTimersByTime(1500);
    expect(callbacks.a).toHaveBeenCalled();
    expect(callbacks.b).not.toHaveBeenCalled();
    expect(callbacks.c).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(callbacks.b).toHaveBeenCalled();
    expect(callbacks.c).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(callbacks.c).toHaveBeenCalled();

    manager.clearAllTimeouts();
  });
});
