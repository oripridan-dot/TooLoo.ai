// @version 2.2.125
/**
 * ProviderMetricsService
 * 
 * Unified service for tracking provider performance metrics.
 * Consolidates functionality from:
 * - ProviderFeedbackEngine (session tracking, real-time updates)
 * - ProviderScorecard (latency, success rates, scoring)
 *
 * @version 2.2.125
 * @responsibility provider-metrics
 * @category provider-management
 * @uses ProviderFeedbackEngine (consolidated)
 * @uses ProviderScorecard (consolidated)
 */

import { bus } from "../../core/event-bus.js";
import { serviceRegistry } from "../../core/service-registry.js";

/**
 * Provider metrics data structure
 */
export interface ProviderMetrics {
  name: string;
  provider: string;
  
  // Status tracking
  status: "idle" | "processing" | "success" | "error";
  lastUsed: Date;
  currentRequest?: string;
  
  // Performance metrics
  callCount: number;
  successCount: number;
  errorCount: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  
  // Calculated scores
  successRate: number;
  confidenceScore: number;
  routingScore: number;
  
  // Session tracking
  sessionCallCount: number;
  sessionSuccessCount: number;
}

/**
 * Request tracking for latency calculation
 */
interface PendingRequest {
  requestId: string;
  provider: string;
  startTime: number;
}

/**
 * Configuration options
 */
export interface ProviderMetricsConfig {
  sessionTimeoutMs?: number;
  cleanupIntervalMs?: number;
  latencyWeight?: number;
  successWeight?: number;
  enableEventBroadcast?: boolean;
}

/**
 * ProviderMetricsService - Single source of truth for provider performance
 */
export class ProviderMetricsService {
  private metrics: Map<string, ProviderMetrics> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private config: Required<ProviderMetricsConfig>;
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(config: ProviderMetricsConfig = {}) {
    this.config = {
      sessionTimeoutMs: config.sessionTimeoutMs ?? 5 * 60 * 1000, // 5 minutes
      cleanupIntervalMs: config.cleanupIntervalMs ?? 60 * 1000,   // 1 minute
      latencyWeight: config.latencyWeight ?? 0.3,
      successWeight: config.successWeight ?? 0.7,
      enableEventBroadcast: config.enableEventBroadcast ?? true,
    };

    this.setupEventListeners();
    this.startCleanupInterval();
    
    // Register with service registry
    try {
      serviceRegistry.register(
        "provider-tracking",
        "ProviderMetricsService",
        this,
        {
          version: "2.2.125",
          metadata: { consolidatedFrom: ["ProviderFeedbackEngine", "ProviderScorecard"] },
          healthCheck: async () => true,
        }
      );
    } catch (error) {
      // Service may already be registered in strict mode
      console.warn("[ProviderMetricsService] Registration skipped:", error);
    }

    console.log("[ProviderMetricsService] Initialized");
  }

  /**
   * Get or create metrics for a provider
   */
  private getOrCreateMetrics(providerName: string): ProviderMetrics {
    const normalized = providerName.toLowerCase();

    if (!this.metrics.has(normalized)) {
      this.metrics.set(normalized, {
        name: providerName,
        provider: normalized,
        status: "idle",
        lastUsed: new Date(),
        callCount: 0,
        successCount: 0,
        errorCount: 0,
        totalLatencyMs: 0,
        avgLatencyMs: 0,
        minLatencyMs: Infinity,
        maxLatencyMs: 0,
        successRate: 0,
        confidenceScore: 0.5,
        routingScore: 0,
        sessionCallCount: 0,
        sessionSuccessCount: 0,
      });
    }

    const metrics = this.metrics.get(normalized)!;
    metrics.lastUsed = new Date();
    return metrics;
  }

  /**
   * Record the start of a provider request
   */
  recordRequestStart(providerName: string, requestId?: string): void {
    const reqId = requestId || crypto.randomUUID();
    const metrics = this.getOrCreateMetrics(providerName);

    metrics.status = "processing";
    metrics.currentRequest = reqId;
    metrics.callCount++;
    metrics.sessionCallCount++;

    this.pendingRequests.set(reqId, {
      requestId: reqId,
      provider: providerName.toLowerCase(),
      startTime: Date.now(),
    });

    this.broadcastUpdate();
  }

  /**
   * Record a successful provider response
   */
  recordRequestSuccess(
    providerName: string,
    latencyMs?: number,
    confidenceScore?: number,
    requestId?: string
  ): void {
    const metrics = this.getOrCreateMetrics(providerName);
    
    // Calculate latency from pending request if not provided
    let actualLatency = latencyMs;
    if (requestId && this.pendingRequests.has(requestId)) {
      const pending = this.pendingRequests.get(requestId)!;
      actualLatency = latencyMs ?? (Date.now() - pending.startTime);
      this.pendingRequests.delete(requestId);
    } else if (metrics.currentRequest && this.pendingRequests.has(metrics.currentRequest)) {
      const pending = this.pendingRequests.get(metrics.currentRequest)!;
      actualLatency = latencyMs ?? (Date.now() - pending.startTime);
      this.pendingRequests.delete(metrics.currentRequest);
    }

    metrics.status = "success";
    metrics.successCount++;
    metrics.sessionSuccessCount++;
    metrics.currentRequest = undefined;

    if (actualLatency !== undefined) {
      metrics.totalLatencyMs += actualLatency;
      metrics.avgLatencyMs = Math.round(metrics.totalLatencyMs / metrics.successCount);
      metrics.minLatencyMs = Math.min(metrics.minLatencyMs, actualLatency);
      metrics.maxLatencyMs = Math.max(metrics.maxLatencyMs, actualLatency);
    }

    // Update calculated scores
    metrics.successRate = metrics.successCount / metrics.callCount;
    metrics.confidenceScore = confidenceScore ?? metrics.successRate;
    metrics.routingScore = this.calculateRoutingScore(metrics);

    this.broadcastUpdate();
  }

  /**
   * Record a failed provider request
   */
  recordRequestError(
    providerName: string,
    errorMessage?: string,
    requestId?: string
  ): void {
    const metrics = this.getOrCreateMetrics(providerName);

    // Clean up pending request
    if (requestId && this.pendingRequests.has(requestId)) {
      this.pendingRequests.delete(requestId);
    } else if (metrics.currentRequest) {
      this.pendingRequests.delete(metrics.currentRequest);
    }

    metrics.status = "error";
    metrics.errorCount++;
    metrics.currentRequest = undefined;

    // Update calculated scores
    metrics.successRate = metrics.successCount / metrics.callCount;
    metrics.confidenceScore = Math.max(0, metrics.confidenceScore - 0.1);
    metrics.routingScore = this.calculateRoutingScore(metrics);

    this.broadcastUpdate();
  }

  /**
   * Calculate routing score for provider selection
   * Higher score = better provider for routing
   */
  private calculateRoutingScore(metrics: ProviderMetrics): number {
    const { successWeight, latencyWeight } = this.config;

    // Normalize latency (lower is better, max 10000ms reference)
    const normalizedLatency = metrics.avgLatencyMs > 0 
      ? Math.max(0, 1 - (metrics.avgLatencyMs / 10000))
      : 0.5;

    // Combined score
    const score = (metrics.successRate * successWeight) + (normalizedLatency * latencyWeight);
    
    // Bonus for high call count (more reliable data)
    const reliabilityBonus = Math.min(0.1, metrics.callCount * 0.01);
    
    return Math.min(1, score + reliabilityBonus);
  }

  /**
   * Get average latency for a provider (ProviderScorecard compatibility)
   */
  getAverageLatency(providerName: string): number {
    const metrics = this.metrics.get(providerName.toLowerCase());
    return metrics?.avgLatencyMs ?? 0;
  }

  /**
   * Get success rate for a provider (ProviderScorecard compatibility)
   */
  getSuccessRate(providerName: string): number {
    const metrics = this.metrics.get(providerName.toLowerCase());
    return metrics?.successRate ?? 0;
  }

  /**
   * Get routing score for a provider (ProviderScorecard compatibility)
   */
  getScore(providerName: string): number {
    const metrics = this.metrics.get(providerName.toLowerCase());
    return metrics?.routingScore ?? 0;
  }

  /**
   * Record a metric (ProviderScorecard compatibility)
   */
  recordMetric(providerName: string, latencyMs: number, success: boolean): void {
    if (success) {
      this.recordRequestSuccess(providerName, latencyMs);
    } else {
      this.recordRequestError(providerName);
    }
  }

  /**
   * Get all active providers (used in current session)
   */
  getActiveProviders(): ProviderMetrics[] {
    return Array.from(this.metrics.values())
      .filter(m => m.sessionCallCount > 0)
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }

  /**
   * Get the most recently active provider
   */
  getActiveProvider(): ProviderMetrics | null {
    const active = this.getActiveProviders();
    return active.length > 0 ? active[0] : null;
  }

  /**
   * Get metrics for a specific provider
   */
  getProvider(providerName: string): ProviderMetrics | null {
    return this.metrics.get(providerName.toLowerCase()) ?? null;
  }

  /**
   * Get all provider metrics
   */
  getAllMetrics(): ProviderMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get serializable data for frontend (ProviderFeedbackEngine compatibility)
   */
  getSerializableFeedback(): Array<{
    name: string;
    provider: string;
    status: string;
    callCount: number;
    successRate: number;
    avgLatencyMs: number;
    confidenceScore: number;
    routingScore: number;
    isActive: boolean;
  }> {
    return this.getActiveProviders().map(m => ({
      name: m.name,
      provider: m.provider,
      status: m.status,
      callCount: m.callCount,
      successRate: m.successRate,
      avgLatencyMs: m.avgLatencyMs,
      confidenceScore: m.confidenceScore,
      routingScore: m.routingScore,
      isActive: m.status === "processing",
    }));
  }

  /**
   * Get ranked providers for routing decisions
   */
  getRankedProviders(): Array<{ provider: string; score: number }> {
    return Array.from(this.metrics.values())
      .filter(m => m.callCount > 0)
      .map(m => ({ provider: m.provider, score: m.routingScore }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Reset session-specific metrics
   */
  resetSession(): void {
    for (const metrics of this.metrics.values()) {
      metrics.sessionCallCount = 0;
      metrics.sessionSuccessCount = 0;
      metrics.status = "idle";
      metrics.currentRequest = undefined;
    }
    this.pendingRequests.clear();
    this.broadcastUpdate();
  }

  /**
   * Setup event listeners for automatic tracking
   */
  private setupEventListeners(): void {
    // Provider telemetry from precog
    bus.on("precog:telemetry", (event: { payload: { provider: string; status: string; latency?: number; confidence?: number; requestId?: string; error?: string } }) => {
      const { provider, status, latency, confidence, requestId, error } = event.payload;

      if (status === "processing") {
        this.recordRequestStart(provider, requestId);
      } else if (status === "success") {
        this.recordRequestSuccess(provider, latency, confidence, requestId);
      } else if (status === "error") {
        this.recordRequestError(provider, error, requestId);
      }
    });

    // Provider response tracking
    bus.on("precog:response", (event: { payload: { provider: string; success: boolean; latency?: number; confidence?: number } }) => {
      const { provider, success, latency, confidence } = event.payload;

      if (success) {
        this.recordRequestSuccess(provider, latency, confidence);
      } else {
        this.recordRequestError(provider);
      }
    });

    // LLM provider calls
    bus.on("llm:request", (event: { payload: { provider: string; requestId?: string } }) => {
      const { provider, requestId } = event.payload;
      this.recordRequestStart(provider, requestId);
    });

    bus.on("llm:response", (event: { payload: { provider: string; latency?: number; requestId?: string } }) => {
      const { provider, latency, requestId } = event.payload;
      this.recordRequestSuccess(provider, latency, undefined, requestId);
    });

    bus.on("llm:error", (event: { payload: { provider: string; error?: string; requestId?: string } }) => {
      const { provider, error, requestId } = event.payload;
      this.recordRequestError(provider, error, requestId);
    });
  }

  /**
   * Broadcast metrics update via event bus
   */
  private broadcastUpdate(): void {
    if (!this.config.enableEventBroadcast) return;

    bus.publish("cortex", "feedback:providers_updated", {
      providers: this.getSerializableFeedback(),
      activeProvider: this.getActiveProvider(),
      rankedProviders: this.getRankedProviders(),
    });
  }

  /**
   * Cleanup stale metrics and pending requests
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.sessionTimeoutMs;

      // Clean up stale pending requests
      for (const [reqId, pending] of this.pendingRequests) {
        if (now - pending.startTime > timeout) {
          this.pendingRequests.delete(reqId);
          const metrics = this.metrics.get(pending.provider);
          if (metrics && metrics.currentRequest === reqId) {
            metrics.status = "idle";
            metrics.currentRequest = undefined;
          }
        }
      }

      // Reset status for stale providers
      for (const metrics of this.metrics.values()) {
        if (now - metrics.lastUsed.getTime() > timeout && metrics.status !== "idle") {
          metrics.status = "idle";
          metrics.currentRequest = undefined;
        }
      }
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalProviders: number;
    activeProviders: number;
    totalCalls: number;
    overallSuccessRate: number;
    averageLatency: number;
  } {
    const allMetrics = Array.from(this.metrics.values());
    const active = allMetrics.filter(m => m.sessionCallCount > 0);
    const totalCalls = allMetrics.reduce((sum, m) => sum + m.callCount, 0);
    const totalSuccess = allMetrics.reduce((sum, m) => sum + m.successCount, 0);
    const totalLatency = allMetrics.reduce((sum, m) => sum + m.totalLatencyMs, 0);

    return {
      totalProviders: allMetrics.length,
      activeProviders: active.length,
      totalCalls,
      overallSuccessRate: totalCalls > 0 ? totalSuccess / totalCalls : 0,
      averageLatency: totalSuccess > 0 ? Math.round(totalLatency / totalSuccess) : 0,
    };
  }
}

// Singleton instance
export const providerMetricsService = new ProviderMetricsService();

// Legacy exports for backwards compatibility
export { providerMetricsService as providerFeedbackEngine };
export { providerMetricsService as providerScorecard };
