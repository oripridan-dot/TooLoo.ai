/**
 * CircuitBreaker - Prevent cascading failures
 * 
 * Implements the circuit breaker pattern:
 * - CLOSED: Normal operation, requests go through
 * - OPEN: Service is failing, requests rejected immediately
 * - HALF_OPEN: Testing if service recovered, allow 1 request
 * 
 * Usage:
 * ```javascript
 * const breaker = new CircuitBreaker('training-api', {
 *   failureThreshold: 5,
 *   resetTimeout: 30000 // 30s
 * });
 * 
 * try {
 *   const result = await breaker.execute(async () => {
 *     return await fetch('http://127.0.0.1:3001/api/v1/training/start');
 *   });
 * } catch (err) {
 *   if (err.message.includes('Circuit breaker')) {
 *     // Service is failing, use fallback
 *     return fallbackResult();
 *   }
 *   throw err;
 * }
 * ```
 */

export class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();
    
    // Metrics
    this.metrics = {
      totalAttempts: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      stateChanges: []
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(fn, options = {}) {
    const callName = options.name || 'unnamed';
    const timeout = options.timeout || 5000;
    
    this.metrics.totalAttempts++;

    // OPEN state: reject immediately
    if (this.state === 'OPEN') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      
      if (timeSinceFailure > this.resetTimeout) {
        // Time to try recovery
        this.transition('HALF_OPEN');
      } else {
        // Still in cooldown
        const err = new Error(`Circuit breaker '${this.name}' is OPEN (${callName})`);
        err.code = 'CIRCUIT_BREAKER_OPEN';
        throw err;
      }
    }

    // Execute with timeout
    try {
      const result = await Promise.race([
        fn(),
        new Promise((resolve, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
        )
      ]);

      // Success
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  onSuccess() {
    this.metrics.totalSuccesses++;
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.transition('CLOSED');
      }
    }
  }

  onFailure() {
    this.metrics.totalFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Failed during recovery attempt
      this.transition('OPEN');
    } else if (this.state === 'CLOSED') {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this.transition('OPEN');
      }
    }
  }

  transition(newState) {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    this.failureCount = 0;
    this.successCount = 0;

    this.metrics.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: new Date().toISOString()
    });

    console.log(`[CircuitBreaker] ${this.name}: ${oldState} → ${newState}`);
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      lastStateChange: new Date(this.lastStateChange).toISOString(),
      metrics: this.metrics
    };
  }

  reset() {
    this.transition('CLOSED');
    console.log(`[CircuitBreaker] ${this.name} manually reset`);
  }
}

export default CircuitBreaker;
