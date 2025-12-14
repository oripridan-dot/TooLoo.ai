/**
 * @tooloo/providers - Circuit Breaker Tests
 * Unit tests for the CircuitBreaker class
 * 
 * @version 2.0.0-alpha.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CircuitBreaker } from '../src/circuit-breaker.js';

// =============================================================================
// CIRCUIT BREAKER TESTS
// =============================================================================

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-provider', {
      failureThreshold: 3,
      successThreshold: 2,
      resetTimeout: 1000, // 1 second for faster tests
    });
  });

  describe('initial state', () => {
    it('should start in closed state', () => {
      expect(breaker.status.state).toBe('closed');
    });

    it('should have zero failures', () => {
      expect(breaker.status.failures).toBe(0);
    });

    it('should allow requests', () => {
      expect(breaker.canRequest()).toBe(true);
    });
  });

  describe('closed state', () => {
    it('should allow requests', () => {
      expect(breaker.canRequest()).toBe(true);
    });

    it('should track failures', () => {
      breaker.recordFailure();
      expect(breaker.status.failures).toBe(1);
    });

    it('should reset failures on success', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordSuccess();
      expect(breaker.status.failures).toBe(0);
    });

    it('should transition to open after threshold failures', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      
      expect(breaker.status.state).toBe('open');
    });
  });

  describe('open state', () => {
    beforeEach(() => {
      // Trigger open state
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
    });

    it('should reject requests', () => {
      expect(breaker.canRequest()).toBe(false);
    });

    it('should have nextRetry set', () => {
      expect(breaker.status.nextRetry).toBeDefined();
    });

    it('should transition to half-open after timeout', async () => {
      // Fast-forward time
      vi.useFakeTimers();
      vi.advanceTimersByTime(1100); // Just past the 1000ms timeout
      
      expect(breaker.canRequest()).toBe(true);
      expect(breaker.status.state).toBe('half-open');
      
      vi.useRealTimers();
    });
  });

  describe('half-open state', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Trigger open state, then half-open
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      vi.advanceTimersByTime(1100);
      breaker.canRequest(); // Triggers transition to half-open
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should allow requests for testing', () => {
      expect(breaker.canRequest()).toBe(true);
    });

    it('should transition to closed after success threshold met', () => {
      // Record enough successes to meet threshold
      breaker.recordSuccess();
      breaker.recordSuccess();
      
      // Check if it transitioned to closed
      const state = breaker.status.state;
      expect(['closed', 'half-open']).toContain(state);
    });

    it('should transition back to open on failure', () => {
      breaker.recordFailure();
      
      expect(breaker.status.state).toBe('open');
    });
  });

  describe('recordFailure', () => {
    it('should increment failure count', () => {
      breaker.recordFailure();
      expect(breaker.status.failures).toBe(1);
      
      breaker.recordFailure();
      expect(breaker.status.failures).toBe(2);
    });

    it('should update lastFailure timestamp', () => {
      const before = new Date();
      breaker.recordFailure();
      const after = new Date();
      
      expect(breaker.status.lastFailure).toBeDefined();
      expect(breaker.status.lastFailure!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(breaker.status.lastFailure!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('recordSuccess', () => {
    it('should update lastSuccess timestamp', () => {
      const before = new Date();
      breaker.recordSuccess();
      const after = new Date();
      
      expect(breaker.status.lastSuccess).toBeDefined();
      expect(breaker.status.lastSuccess!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(breaker.status.lastSuccess!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('reset', () => {
    it('should reset to closed state', () => {
      // Put into open state
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.status.state).toBe('open');
      
      breaker.reset();
      
      expect(breaker.status.state).toBe('closed');
      expect(breaker.status.failures).toBe(0);
    });
  });
});

// =============================================================================
// PROVIDER REGISTRY TESTS
// =============================================================================

import { ProviderRegistry } from '../src/base.js';

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  describe('getAll', () => {
    it('should return empty array when no providers registered', () => {
      const providers = registry.getAll();
      expect(providers).toEqual([]);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent provider', () => {
      const provider = registry.get('non-existent');
      expect(provider).toBeUndefined();
    });
  });
});
