// @version 2.2.174
/**
 * ProviderFeedbackEngine
 * Tracks active/used providers during session.
 * Filters providers starting with 'non' prefix and maintains usage metrics.
 *
 * @version 2.2.121
 */

import { bus } from '../../core/event-bus.js';

export interface ProviderFeedback {
  name: string;
  provider: string;
  model?: string;
  status: 'idle' | 'processing' | 'success' | 'error';
  lastUsed: Date;
  callCount: number;
  successCount: number;
  avgLatencyMs: number;
  totalLatencyMs: number;
  successRate: number;
  confidenceScore: number;
  currentRequest?: string;
}

export class ProviderFeedbackEngine {
  private activeProviders: Map<string, ProviderFeedback> = new Map();
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private static readonly PROVIDER_PREFIX = 'non'; // Track providers starting with 'non'

  constructor() {
    this.setupListeners();
    this.startCleanupInterval();
  }

  /**
   * Check if provider should be tracked
   * Modified: Now tracks all providers, not just 'non' prefix
   */
  private shouldTrack(_providerName: string): boolean {
    // return providerName.toLowerCase().startsWith(ProviderFeedbackEngine.PROVIDER_PREFIX);
    return true;
  }

  /**
   * Get or create provider feedback record
   */
  private getOrCreateProvider(providerName: string): ProviderFeedback {
    const normalizedName = providerName.toLowerCase();

    if (!this.activeProviders.has(normalizedName)) {
      this.activeProviders.set(normalizedName, {
        name: providerName,
        provider: normalizedName,
        status: 'idle',
        lastUsed: new Date(),
        callCount: 0,
        successCount: 0,
        avgLatencyMs: 0,
        totalLatencyMs: 0,
        successRate: 0,
        confidenceScore: 0.5,
      });
    }

    const feedback = this.activeProviders.get(normalizedName)!;
    feedback.lastUsed = new Date();
    return feedback;
  }

  /**
   * Track provider request start
   */
  recordRequestStart(providerName: string, requestId?: string, model?: string) {
    if (!this.shouldTrack(providerName)) return;

    const feedback = this.getOrCreateProvider(providerName);
    feedback.status = 'processing';
    feedback.currentRequest = requestId;
    feedback.callCount++;
    if (model) feedback.model = model;

    this.publishUpdate();
  }

  /**
   * Track provider request success
   */
  recordRequestSuccess(
    providerName: string,
    latencyMs: number,
    confidenceScore?: number,
    model?: string
  ) {
    if (!this.shouldTrack(providerName)) return;

    const feedback = this.getOrCreateProvider(providerName);
    feedback.status = 'success';
    feedback.successCount++;
    feedback.totalLatencyMs += latencyMs;
    feedback.avgLatencyMs = Math.round(feedback.totalLatencyMs / feedback.successCount);
    feedback.successRate = feedback.successCount / feedback.callCount;
    feedback.confidenceScore = confidenceScore ?? feedback.successRate;
    feedback.currentRequest = undefined;
    if (model) feedback.model = model;

    this.publishUpdate();
  }

  /**
   * Track provider request error
   */
  recordRequestError(providerName: string, _errorMessage?: string) {
    if (!this.shouldTrack(providerName)) return;

    const feedback = this.getOrCreateProvider(providerName);
    feedback.status = 'error';
    feedback.successRate = feedback.successCount / feedback.callCount;
    feedback.confidenceScore = Math.max(0, feedback.confidenceScore - 0.1);
    feedback.currentRequest = undefined;

    this.publishUpdate();
  }

  /**
   * Get all active providers (used in current session)
   */
  getActiveProviders(): ProviderFeedback[] {
    return Array.from(this.activeProviders.values())
      .filter((p) => this.shouldTrack(p.provider))
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }

  /**
   * Get active provider (most recently used)
   */
  getActiveProvider(): ProviderFeedback | null {
    const active = this.getActiveProviders();
    return active.length > 0 ? (active[0] ?? null) : null;
  }

  /**
   * Get provider by name
   */
  getProvider(providerName: string): ProviderFeedback | null {
    const normalized = providerName.toLowerCase();
    return this.activeProviders.get(normalized) ?? null;
  }

  /**
   * Get serializable feedback data for frontend
   */
  getSerializableFeedback(): Array<{
    name: string;
    provider: string;
    status: string;
    callCount: number;
    successRate: number;
    avgLatencyMs: number;
    confidenceScore: number;
    isActive: boolean;
  }> {
    return this.getActiveProviders().map((p) => ({
      name: p.name,
      provider: p.provider,
      status: p.status,
      callCount: p.callCount,
      successRate: p.successRate,
      avgLatencyMs: p.avgLatencyMs,
      confidenceScore: p.confidenceScore,
      isActive: p.status === 'processing',
    }));
  }

  /**
   * Reset session providers
   */
  resetSession() {
    this.activeProviders.clear();
    this.publishUpdate();
  }

  /**
   * Setup event listeners
   */
  private setupListeners() {
    // Provider telemetry from precog
    bus.on('precog:telemetry', (event) => {
      const { provider, status, latency, confidence } = event.payload;

      if (status === 'processing') {
        this.recordRequestStart(provider, event.payload.requestId);
      } else if (status === 'success') {
        this.recordRequestSuccess(provider, latency, confidence);
      } else if (status === 'error') {
        this.recordRequestError(provider, event.payload.error);
      }
    });

    // Provider response tracking
    bus.on('precog:response', (event) => {
      const { provider, success, latency, confidence } = event.payload;

      if (success) {
        this.recordRequestSuccess(provider, latency, confidence);
      } else {
        this.recordRequestError(provider);
      }
    });

    // LLM provider calls
    bus.on('llm:request', (event) => {
      const { provider } = event.payload;
      this.recordRequestStart(provider, event.payload.requestId);
    });

    bus.on('llm:response', (event) => {
      const { provider, latency } = event.payload;
      this.recordRequestSuccess(provider, latency);
    });

    bus.on('llm:error', (event) => {
      const { provider, error } = event.payload;
      this.recordRequestError(provider, error);
    });
  }

  /**
   * Publish feedback update
   */
  private publishUpdate() {
    bus.publish('cortex', 'feedback:providers_updated', {
      providers: this.getSerializableFeedback(),
      activeProvider: this.getActiveProvider(),
    });
  }

  /**
   * Cleanup inactive providers
   */
  private startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, feedback] of this.activeProviders.entries()) {
        if (now - feedback.lastUsed.getTime() > this.SESSION_TIMEOUT) {
          this.activeProviders.delete(key);
        }
      }
    }, 60 * 1000); // Cleanup every minute
  }
}

export const providerFeedbackEngine = new ProviderFeedbackEngine();
