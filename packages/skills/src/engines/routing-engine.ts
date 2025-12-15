/**
 * @file Native Routing Engine
 * @description Provider routing and waterfall fallback - NO LEGACY DEPENDENCIES
 * @version 1.2.1
 * @skill-os true
 *
 * Implements intelligent routing with:
 * - Multi-provider support (DeepSeek, Anthropic, OpenAI, Gemini)
 * - Waterfall fallback logic
 * - Health monitoring
 * - Cost optimization
 */

import { randomUUID } from 'crypto';
import type {
  IRoutingEngine,
  ProviderConfig,
  ProviderHealth,
  RouteDecision,
  RouteResult,
  RouteAttempt,
  RouteOptions,
  RoutingEngineConfig,
  RoutingMetrics,
  EngineStats,
} from './types.js';

// =============================================================================
// DEFAULT PROVIDER CONFIGURATIONS
// =============================================================================

const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    models: ['deepseek-chat', 'deepseek-coder'],
    defaultModel: 'deepseek-chat',
    maxTokens: 128000,
    costPer1kTokens: 0.0002,
    priority: 1,
    enabled: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    models: ['claude-sonnet-4-20250514', 'claude-3-haiku-20240307'],
    defaultModel: 'claude-sonnet-4-20250514',
    maxTokens: 200000,
    costPer1kTokens: 0.003,
    priority: 2,
    enabled: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    apiKeyEnv: 'OPENAI_API_KEY',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    defaultModel: 'gpt-4o',
    maxTokens: 128000,
    costPer1kTokens: 0.005,
    priority: 3,
    enabled: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    apiKeyEnv: 'GOOGLE_API_KEY',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro'],
    defaultModel: 'gemini-2.0-flash',
    maxTokens: 1000000,
    costPer1kTokens: 0.00025,
    priority: 4,
    enabled: true,
  },
];

// =============================================================================
// ROUTING ENGINE IMPLEMENTATION
// =============================================================================

export class RoutingEngine implements IRoutingEngine {
  readonly id = 'routing-engine';
  readonly version = '1.2.1';

  private providers: Map<string, ProviderConfig> = new Map();
  private health: Map<string, ProviderHealth> = new Map();
  private _config: RoutingEngineConfig;
  private startedAt: Date;
  private stats: EngineStats;
  private metrics: RoutingMetrics;

  constructor(config?: Partial<RoutingEngineConfig>) {
    const providers = config?.providers ?? DEFAULT_PROVIDERS;
    
    this._config = {
      providers,
      defaultTimeout: config?.defaultTimeout ?? 30000,
      maxRetries: config?.maxRetries ?? 3,
      healthCheckInterval: config?.healthCheckInterval ?? 60000,
    };

    // Initialize provider map
    for (const provider of providers) {
      this.providers.set(provider.id, provider);
    }

    this.startedAt = new Date();
    this.stats = {
      operationCount: 0,
      successCount: 0,
      errorCount: 0,
      lastOperationAt: null,
      uptime: 0,
    };
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgLatency: 0,
      averageLatency: 0,
      providerUsage: {},
      fallbackCount: 0,
      successRate: 1.0,
      healthyProviders: providers.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    console.log(`[${this.id}] Initializing v${this.version}...`);

    // Initialize health for all providers
    for (const provider of this.providers.values()) {
      const hasApiKey = !!process.env[provider.apiKeyEnv];
      this.health.set(provider.id, {
        providerId: provider.id,
        status: hasApiKey ? 'healthy' : 'offline',
        latency: 0,
        successRate: 1,
        lastChecked: new Date(),
        errorCount: 0,
      });

      if (hasApiKey) {
        console.log(`[${this.id}] ✅ ${provider.name} configured`);
      } else {
        console.log(`[${this.id}] ⚠️ ${provider.name} missing API key (${provider.apiKeyEnv})`);
      }
    }

    console.log(`[${this.id}] ✅ Initialized with ${this.getAvailableProviders().length} available providers`);
  }

  async shutdown(): Promise<void> {
    console.log(`[${this.id}] Shutting down...`);
    console.log(`[${this.id}] ✅ Shutdown complete`);
  }

  isHealthy(): boolean {
    return this.getAvailableProviders().length > 0;
  }

  getStats(): EngineStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startedAt.getTime(),
    };
  }

  getConfig(): RoutingEngineConfig {
    return this._config;
  }

  // ---------------------------------------------------------------------------
  // Routing
  // ---------------------------------------------------------------------------

  async route(prompt: string, options?: RouteOptions): Promise<RouteResult> {
    const startTime = Date.now();
    const attempts: RouteAttempt[] = [];
    this.stats.operationCount++;
    this.stats.lastOperationAt = new Date();
    this.metrics.totalRequests++;

    // Get route decision
    const decision = this.decideRoute(options?.taskType);
    let lastError: string | undefined;

    // Try providers in order
    const providersToTry = options?.preferredProvider
      ? [options.preferredProvider, ...decision.fallbackOrder.filter((p) => p !== options.preferredProvider)]
      : [decision.selectedProvider, ...decision.fallbackOrder];

    const excludeSet = new Set(options?.excludeProviders ?? []);

    for (const providerId of providersToTry) {
      if (excludeSet.has(providerId)) continue;

      const provider = this.providers.get(providerId);
      if (!provider || !provider.enabled) continue;

      const health = this.health.get(providerId);
      if (health?.status === 'offline') continue;

      const attemptStart = Date.now();

      try {
        // Actual LLM call would go here
        // For now, we simulate the call structure
        const response = await this.callProvider(providerId, prompt, options);
        const latency = Date.now() - attemptStart;

        attempts.push({
          provider: providerId,
          success: true,
          latency,
        });

        // Update metrics
        this.metrics.successfulRequests++;
        this.metrics.providerUsage[providerId] = (this.metrics.providerUsage[providerId] ?? 0) + 1;
        this.updateAvgLatency(latency);
        this.stats.successCount++;

        // Update health
        this.updateHealth(providerId, {
          latency,
          successRate: this.calculateSuccessRate(providerId, true),
          lastChecked: new Date(),
        });

        if (attempts.length > 1) {
          this.metrics.fallbackCount++;
        }

        return {
          provider: providerId,
          model: provider.defaultModel,
          response,
          success: true,
          latency: Date.now() - startTime,
          attempts,
        };
      } catch (error) {
        const latency = Date.now() - attemptStart;
        lastError = error instanceof Error ? error.message : 'Unknown error';

        attempts.push({
          provider: providerId,
          success: false,
          latency,
          error: lastError,
        });

        // Update health
        const currentHealth = this.health.get(providerId);
        this.updateHealth(providerId, {
          latency,
          successRate: this.calculateSuccessRate(providerId, false),
          lastChecked: new Date(),
          errorCount: (currentHealth?.errorCount ?? 0) + 1,
          status: (currentHealth?.errorCount ?? 0) >= 3 ? 'degraded' : currentHealth?.status,
        });

        console.warn(`[${this.id}] ${providerId} failed: ${lastError}`);
      }
    }

    // All providers failed
    this.metrics.failedRequests++;
    this.stats.errorCount++;

    return {
      provider: 'none',
      model: 'none',
      response: '',
      success: false,
      latency: Date.now() - startTime,
      attempts,
    };
  }

  /**
   * Simulated provider call - in production, this would use actual LLM SDKs
   */
  private async callProvider(
    providerId: string,
    _prompt: string,
    _options?: RouteOptions
  ): Promise<string> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const apiKey = process.env[provider.apiKeyEnv];
    if (!apiKey) {
      throw new Error(`API key not configured: ${provider.apiKeyEnv}`);
    }

    // In a real implementation, this would call the actual LLM API
    // For now, we'll throw to simulate that the actual SDK isn't integrated here
    throw new Error(
      `Direct LLM calls should go through @tooloo/providers. ` +
      `Provider: ${providerId}, Model: ${provider.defaultModel}`
    );
  }

  // ---------------------------------------------------------------------------
  // Decision Making
  // ---------------------------------------------------------------------------

  decideRoute(_taskType?: string): RouteDecision {
    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      return {
        id: randomUUID(),
        selectedProvider: 'none',
        selectedModel: 'none',
        reason: 'No providers available',
        fallbackOrder: [],
        timestamp: new Date(),
      };
    }

    // Sort by priority and health
    const sorted = availableProviders.sort((a, b) => {
      const healthA = this.health.get(a.id);
      const healthB = this.health.get(b.id);

      // Prioritize healthy providers
      if (healthA?.status === 'healthy' && healthB?.status !== 'healthy') return -1;
      if (healthB?.status === 'healthy' && healthA?.status !== 'healthy') return 1;

      // Then by success rate
      const rateA = healthA?.successRate ?? 1;
      const rateB = healthB?.successRate ?? 1;
      if (Math.abs(rateA - rateB) > 0.1) return rateB - rateA;

      // Finally by configured priority
      return a.priority - b.priority;
    });

    const selected = sorted[0];
    if (!selected) {
      return {
        id: randomUUID(),
        selectedProvider: 'none',
        selectedModel: 'none',
        reason: 'No providers available after sorting',
        fallbackOrder: [],
        timestamp: new Date(),
      };
    }
    
    const fallback = sorted.slice(1).map((p) => p.id);

    return {
      id: randomUUID(),
      selectedProvider: selected.id,
      selectedModel: selected.defaultModel,
      reason: `Best available (priority: ${selected.priority}, health: ${this.health.get(selected.id)?.status})`,
      fallbackOrder: fallback,
      timestamp: new Date(),
    };
  }

  // ---------------------------------------------------------------------------
  // Health Management
  // ---------------------------------------------------------------------------

  getProviderHealth(providerId: string): ProviderHealth | null {
    return this.health.get(providerId) ?? null;
  }

  getAllHealth(): ProviderHealth[] {
    return Array.from(this.health.values());
  }

  updateHealth(providerId: string, health: Partial<ProviderHealth>): void {
    const existing = this.health.get(providerId);
    if (existing) {
      Object.assign(existing, health);
    }
  }

  setProviderEnabled(providerId: string, enabled: boolean): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.enabled = enabled;
      console.log(`[${this.id}] ${providerId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  getProviders(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }

  getMetrics(): RoutingMetrics {
    // Calculate success rate and healthy providers
    const successRate = this.metrics.totalRequests > 0
      ? this.metrics.successfulRequests / this.metrics.totalRequests
      : 1.0;
    const healthyProviders = Array.from(this.health.values()).filter(
      (h) => h.status === 'healthy'
    ).length;

    return {
      ...this.metrics,
      averageLatency: this.metrics.avgLatency,
      successRate,
      healthyProviders,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getAvailableProviders(): ProviderConfig[] {
    return Array.from(this.providers.values()).filter((p) => {
      if (!p.enabled) return false;
      const health = this.health.get(p.id);
      return health?.status !== 'offline';
    });
  }

  private calculateSuccessRate(providerId: string, success: boolean): number {
    const current = this.health.get(providerId);
    if (!current) return success ? 1 : 0;

    // Exponential moving average
    const alpha = 0.2;
    return current.successRate * (1 - alpha) + (success ? 1 : 0) * alpha;
  }

  private updateAvgLatency(newLatency: number): void {
    const alpha = 0.1;
    this.metrics.avgLatency = this.metrics.avgLatency * (1 - alpha) + newLatency * alpha;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: RoutingEngine | null = null;

export function getRoutingEngine(config?: Partial<RoutingEngineConfig>): RoutingEngine {
  if (!instance) {
    instance = new RoutingEngine(config);
  }
  return instance;
}

export function resetRoutingEngine(): void {
  instance = null;
}
