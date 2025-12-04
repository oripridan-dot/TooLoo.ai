// @version 2.3.0
/**
 * Circuit Breaker for Safety
 * Auto-pauses autonomous operations when safety thresholds are breached
 */

import { bus } from '../event-bus.js';
import { safetyPolicy } from './safety-policy.js';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit tripped, operations blocked
  HALF_OPEN = 'HALF_OPEN', // Testing if system recovered
}

export interface CircuitBreakerConfig {
  // Safety thresholds
  minSafetyScore: number; // Default 0.3 (below this = trip)
  maxErrorRate: number; // Default 0.5 (50% errors = trip)
  maxConsecutiveFailures: number; // Default 5

  // Resource thresholds
  maxMemoryUsagePercent: number; // Default 85%
  maxCpuUsagePercent: number; // Default 90%

  // Recovery settings
  recoveryTimeout: number; // Default 5 minutes
  testRequestsInHalfOpen: number; // Default 3

  // Reset requirements
  requireManualReset: boolean; // Default true for safety
}

export interface CircuitMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  consecutiveFailures: number;
  lastFailureTime?: number;
  averageSafetyScore: number;
  lastSafetyScore: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private config: CircuitBreakerConfig;
  private metrics: CircuitMetrics;
  private stateChangedAt: number;
  private testRequestsRemaining: number = 0;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private tripReason: string = '';

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      minSafetyScore: 0.3,
      maxErrorRate: 0.5,
      maxConsecutiveFailures: 5,
      maxMemoryUsagePercent: 85,
      maxCpuUsagePercent: 90,
      recoveryTimeout: 300000, // 5 minutes
      testRequestsInHalfOpen: 3,
      requireManualReset: true,
      ...config,
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      consecutiveFailures: 0,
      averageSafetyScore: 1.0,
      lastSafetyScore: 1.0,
    };

    this.stateChangedAt = Date.now();

    // Start monitoring
    this.startMonitoring();
    console.log('[CircuitBreaker] Initialized with config:', this.config);
  }

  /**
   * Check if operation is allowed
   */
  async allowRequest(context: { action: string; safetyScore?: number }): Promise<boolean> {
    // Always block if circuit is OPEN
    if (this.state === CircuitState.OPEN) {
      console.warn(`[CircuitBreaker] ⛔ Request blocked (circuit OPEN): ${context.action}`);

      bus.publish('system', 'circuit:request_blocked', {
        action: context.action,
        reason: this.tripReason,
        state: this.state,
        timestamp: Date.now(),
      });

      return false;
    }

    // In HALF_OPEN, only allow test requests
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.testRequestsRemaining > 0) {
        this.testRequestsRemaining--;
        console.log(
          `[CircuitBreaker] 🧪 Test request allowed (${this.testRequestsRemaining} remaining)`
        );
        return true;
      } else {
        console.warn(`[CircuitBreaker] ⛔ Test quota exhausted`);
        return false;
      }
    }

    // CLOSED state - normal operation
    return true;
  }

  /**
   * Record successful operation
   */
  recordSuccess(safetyScore: number = 1.0): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.lastSafetyScore = safetyScore;
    this.updateAverageSafetyScore(safetyScore);

    // If in HALF_OPEN and all tests passed, close the circuit
    if (this.state === CircuitState.HALF_OPEN && this.testRequestsRemaining === 0) {
      this.closeCircuit();
    }
  }

  /**
   * Record failed operation
   */
  recordFailure(reason: string, safetyScore: number = 0): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    this.metrics.consecutiveFailures++;
    this.metrics.lastFailureTime = Date.now();
    this.metrics.lastSafetyScore = safetyScore;
    this.updateAverageSafetyScore(safetyScore);

    console.warn(
      `[CircuitBreaker] ⚠️ Failure recorded: ${reason} (consecutive: ${this.metrics.consecutiveFailures})`
    );

    // Check if we should trip the circuit
    this.evaluateCircuitState();
  }

  /**
   * Manually reset the circuit breaker
   */
  manualReset(): boolean {
    if (this.state === CircuitState.OPEN) {
      console.log('[CircuitBreaker] ✅ Manual reset initiated');

      // Reset metrics
      this.metrics.consecutiveFailures = 0;
      this.metrics.failedRequests = 0;
      this.metrics.successfulRequests = 0;
      this.metrics.totalRequests = 0;

      this.closeCircuit();

      bus.publish('system', 'circuit:manual_reset', {
        previousState: CircuitState.OPEN,
        timestamp: Date.now(),
      });

      return true;
    }

    return false;
  }

  /**
   * Force trip the circuit (for emergency shutdown)
   */
  forceTrip(reason: string): void {
    console.error(`[CircuitBreaker] 🚨 FORCE TRIP: ${reason}`);
    this.tripCircuit(reason);
  }

  private evaluateCircuitState(): void {
    if (this.state !== CircuitState.CLOSED) return;

    const errorRate =
      this.metrics.totalRequests > 0 ? this.metrics.failedRequests / this.metrics.totalRequests : 0;

    // Check consecutive failures
    if (this.metrics.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.tripCircuit(
        `Consecutive failures threshold exceeded: ${this.metrics.consecutiveFailures}`
      );
      return;
    }

    // Check error rate
    if (this.metrics.totalRequests >= 10 && errorRate > this.config.maxErrorRate) {
      this.tripCircuit(`Error rate too high: ${(errorRate * 100).toFixed(1)}%`);
      return;
    }

    // Check safety score
    if (this.metrics.lastSafetyScore < this.config.minSafetyScore) {
      this.tripCircuit(`Safety score below threshold: ${this.metrics.lastSafetyScore.toFixed(2)}`);
      return;
    }
  }

  private tripCircuit(reason: string): void {
    if (this.state === CircuitState.OPEN) return; // Already tripped

    this.state = CircuitState.OPEN;
    this.tripReason = reason;
    this.stateChangedAt = Date.now();

    console.error(`[CircuitBreaker] 🚨 CIRCUIT TRIPPED: ${reason}`);

    bus.publish('system', 'circuit:tripped', {
      reason,
      metrics: { ...this.metrics },
      timestamp: Date.now(),
      requiresManualReset: this.config.requireManualReset,
    });

    // If auto-recovery is enabled, schedule half-open test
    if (!this.config.requireManualReset) {
      this.scheduleRecovery();
    }
  }

  private scheduleRecovery(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    this.recoveryTimer = setTimeout(() => {
      if (this.state === CircuitState.OPEN) {
        this.enterHalfOpenState();
      }
    }, this.config.recoveryTimeout);
  }

  private enterHalfOpenState(): void {
    this.state = CircuitState.HALF_OPEN;
    this.testRequestsRemaining = this.config.testRequestsInHalfOpen;
    this.stateChangedAt = Date.now();

    console.log(
      `[CircuitBreaker] 🧪 Entering HALF_OPEN state (${this.testRequestsRemaining} test requests)`
    );

    bus.publish('system', 'circuit:half_open', {
      testRequests: this.testRequestsRemaining,
      timestamp: Date.now(),
    });
  }

  private closeCircuit(): void {
    this.state = CircuitState.CLOSED;
    this.stateChangedAt = Date.now();
    this.tripReason = '';

    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    console.log('[CircuitBreaker] ✅ Circuit CLOSED - normal operation resumed');

    bus.publish('system', 'circuit:closed', {
      timestamp: Date.now(),
    });
  }

  private updateAverageSafetyScore(newScore: number): void {
    const alpha = 0.1; // Exponential moving average weight
    this.metrics.averageSafetyScore =
      alpha * newScore + (1 - alpha) * this.metrics.averageSafetyScore;
  }

  /**
   * Monitor system resources and safety policy stats
   */
  private startMonitoring(): void {
    // Check every 30 seconds
    setInterval(() => {
      this.checkSystemHealth();
    }, 30000);
  }

  private async checkSystemHealth(): Promise<void> {
    try {
      // Check safety policy stats
      const policyStats = safetyPolicy.getStats();

      // Trip if too many concurrent high-risk actions
      if (policyStats.activeHighRiskActions >= 3) {
        this.forceTrip(
          `Too many concurrent high-risk actions: ${policyStats.activeHighRiskActions}`
        );
      }

      // Check memory usage (Node.js process)
      const memUsage = process.memoryUsage();
      const memUsedMB = memUsage.heapUsed / 1024 / 1024;
      const memTotalMB = memUsage.heapTotal / 1024 / 1024;
      const memPercent = (memUsedMB / memTotalMB) * 100;

      if (memPercent > this.config.maxMemoryUsagePercent) {
        this.forceTrip(`Memory usage critical: ${memPercent.toFixed(1)}%`);
      }
    } catch (error) {
      console.error('[CircuitBreaker] Health check failed:', error);
    }
  }

  getStatus() {
    return {
      state: this.state,
      tripReason: this.tripReason,
      metrics: { ...this.metrics },
      stateChangedAt: this.stateChangedAt,
      timeSinceStateChange: Date.now() - this.stateChangedAt,
      config: { ...this.config },
      testRequestsRemaining: this.testRequestsRemaining,
    };
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

// Singleton instance
export const circuitBreaker = new CircuitBreaker();
