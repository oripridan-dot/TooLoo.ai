/**
 * @tooloo/providers - Circuit Breaker
 * Resilient provider management with automatic failover
 * 
 * @version 2.0.0-alpha.0
 */

import { eventBus, type ProviderId, createProviderId } from '@tooloo/core';
import type { 
  CircuitBreakerConfig, 
  CircuitBreakerStatus, 
  CircuitState 
} from './types.js';
import { DEFAULT_CIRCUIT_BREAKER_CONFIG } from './types.js';

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

/**
 * CircuitBreaker - Protects against cascading failures
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failure threshold exceeded, requests fail fast
 * - HALF-OPEN: Testing recovery, limited requests allowed
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private nextRetry?: Date;
  private readonly config: CircuitBreakerConfig;
  private readonly providerId: ProviderId;

  constructor(providerId: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.providerId = createProviderId(providerId);
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  /**
   * Get current status
   */
  get status(): CircuitBreakerStatus {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      nextRetry: this.nextRetry,
    };
  }

  /**
   * Check if request should be allowed
   */
  canRequest(): boolean {
    switch (this.state) {
      case 'closed':
        return true;
        
      case 'open':
        // Check if we should transition to half-open
        if (this.nextRetry && new Date() >= this.nextRetry) {
          this.transitionTo('half-open');
          return true;
        }
        return false;
        
      case 'half-open':
        // Allow limited requests for testing
        return true;
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.lastSuccess = new Date();
    
    switch (this.state) {
      case 'closed':
        // Reset failure count on success
        this.failures = 0;
        break;
        
      case 'half-open':
        this.successes++;
        if (this.successes >= this.config.successThreshold) {
          this.transitionTo('closed');
        }
        break;
        
      case 'open':
        // Shouldn't happen, but handle gracefully
        this.transitionTo('half-open');
        break;
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(_error?: Error): void {
    this.lastFailure = new Date();
    this.failures++;
    
    switch (this.state) {
      case 'closed':
        if (this.failures >= this.config.failureThreshold) {
          this.transitionTo('open');
        }
        break;
        
      case 'half-open':
        // Any failure in half-open returns to open
        this.transitionTo('open');
        break;
        
      case 'open':
        // Already open, just update stats
        break;
    }

    // Emit event
    if (this.state === 'open') {
      eventBus.publish('precog', 'routing:circuit_open', {
        providerId: this.providerId,
        failures: this.failures,
      });
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    
    switch (newState) {
      case 'closed':
        this.failures = 0;
        this.successes = 0;
        this.nextRetry = undefined;
        eventBus.publish('precog', 'routing:circuit_close', {
          providerId: this.providerId,
        });
        break;
        
      case 'open':
        this.successes = 0;
        this.nextRetry = new Date(Date.now() + this.config.resetTimeout);
        break;
        
      case 'half-open':
        this.successes = 0;
        break;
    }

    console.log(`Circuit breaker [${this.providerId}]: ${oldState} -> ${newState}`);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canRequest()) {
      throw new CircuitOpenError(this.providerId, this.nextRetry);
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new CircuitTimeoutError(this.providerId, this.config.callTimeout));
      }, this.config.callTimeout);
    });

    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Force the circuit to a specific state (for testing/admin)
   */
  forceState(state: CircuitState): void {
    this.transitionTo(state);
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = undefined;
    this.lastSuccess = undefined;
    this.nextRetry = undefined;
  }
}

// =============================================================================
// ERRORS
// =============================================================================

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  constructor(
    public readonly providerId: string,
    public readonly nextRetry?: Date
  ) {
    super(`Circuit breaker is open for provider ${providerId}`);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Error thrown on circuit timeout
 */
export class CircuitTimeoutError extends Error {
  constructor(
    public readonly providerId: string,
    public readonly timeoutMs: number
  ) {
    super(`Request to provider ${providerId} timed out after ${timeoutMs}ms`);
    this.name = 'CircuitTimeoutError';
  }
}

// =============================================================================
// CIRCUIT BREAKER MANAGER
// =============================================================================

/**
 * Manages circuit breakers for multiple providers
 */
export class CircuitBreakerManager {
  private breakers: Map<ProviderId, CircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig;

  constructor(defaultConfig: Partial<CircuitBreakerConfig> = {}) {
    this.defaultConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...defaultConfig };
  }

  /**
   * Get or create a circuit breaker for a provider
   */
  getBreaker(providerId: string): CircuitBreaker {
    const id = createProviderId(providerId);
    let breaker = this.breakers.get(id);
    
    if (!breaker) {
      breaker = new CircuitBreaker(providerId, this.defaultConfig);
      this.breakers.set(id, breaker);
    }
    
    return breaker;
  }

  /**
   * Get all healthy providers
   */
  getHealthyProviders(): ProviderId[] {
    return Array.from(this.breakers.entries())
      .filter(([_, breaker]) => breaker.canRequest())
      .map(([id, _]) => id);
  }

  /**
   * Get all provider statuses
   */
  getAllStatuses(): Map<ProviderId, CircuitBreakerStatus> {
    const statuses = new Map<ProviderId, CircuitBreakerStatus>();
    for (const [id, breaker] of this.breakers) {
      statuses.set(id, breaker.status);
    }
    return statuses;
  }

  /**
   * Find first available provider from a list
   */
  findAvailable(providerIds: string[]): ProviderId | undefined {
    for (const id of providerIds) {
      const breaker = this.getBreaker(id);
      if (breaker.canRequest()) {
        return createProviderId(id);
      }
    }
    return undefined;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Global circuit breaker manager
 */
export const circuitManager = new CircuitBreakerManager();
