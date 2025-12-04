/**
 * Timeout Manager - Ensures all async operations timeout gracefully
 *
 * Provides utility functions to wrap promises and operations with timeouts
 * to prevent system hangs and ensure predictable behavior.
 *
 * @version 1.0.0
 * @module core/timeout-manager
 */

export interface TimeoutOptions {
  ms: number; // Timeout in milliseconds
  operation: string; // Description of the operation
  onTimeout?: () => void; // Optional callback when timeout occurs
}

/**
 * Wrap a promise with a timeout
 */
export function withTimeout<T>(promise: Promise<T>, options: TimeoutOptions): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeout = setTimeout(() => {
        if (options.onTimeout) {
          options.onTimeout();
        }
        reject(new Error(`[Timeout] ${options.operation} exceeded ${options.ms}ms timeout`));
      }, options.ms);

      // Ensure timeout is cleared when promise resolves
      promise.finally(() => clearTimeout(timeout));
    }),
  ]);
}

/**
 * Default timeout durations for common operations
 */
export const DEFAULT_TIMEOUTS = {
  SHORT: 5000, // 5 seconds - UI operations, quick checks
  MEDIUM: 15000, // 15 seconds - Network calls, file ops
  LONG: 60000, // 1 minute - Heavy computations, full scans
  EXTENDED: 300000, // 5 minutes - System boots, full checks
} as const;

/**
 * Wrap an async function with timeout
 */
export function createTimeoutWrapper<T extends unknown[], R>(
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

/**
 * Execute a command with timeout
 */
export async function executeWithTimeout(
  fn: () => Promise<void>,
  timeoutMs: number = DEFAULT_TIMEOUTS.MEDIUM,
  operationName: string = 'Operation'
): Promise<void> {
  return withTimeout(fn(), {
    ms: timeoutMs,
    operation: operationName,
    onTimeout: () => {
      console.warn(`[Timeout] ${operationName} timed out after ${timeoutMs}ms`);
    },
  });
}

/**
 * Timeout manager singleton
 */
export class TimeoutManager {
  private activeTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a managed timeout
   */
  setTimeout(id: string, callback: () => void, ms: number): NodeJS.Timeout {
    // Clear any existing timeout with the same ID
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

  /**
   * Clear a specific timeout
   */
  clearTimeout(id: string): boolean {
    const timeout = this.activeTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Clear all active timeouts
   */
  clearAllTimeouts(): void {
    for (const [, timeout] of this.activeTimeouts) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();
  }

  /**
   * Get count of active timeouts
   */
  getActiveTimeoutCount(): number {
    return this.activeTimeouts.size;
  }

  /**
   * Reset a timeout
   */
  resetTimeout(id: string, ms: number): boolean {
    const timeout = this.activeTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(id);
      return true;
    }
    return false;
  }
}

export const timeoutManager = new TimeoutManager();
