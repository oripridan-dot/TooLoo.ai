// @version 3.3.577
/**
 * @tooloo/providers - Base Provider
 * Abstract base class for LLM providers
 * 
 * @version 2.0.0-alpha.0
 */

import { eventBus, type ProviderId, createProviderId } from '@tooloo/core';
import type {
  Provider,
  ProviderConfig,
  ModelInfo,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  HealthCheckResult,
  CircuitBreakerStatus,
  ChatMessage,
} from './types.js';
import { CircuitBreaker } from './circuit-breaker.js';

// =============================================================================
// BASE PROVIDER
// =============================================================================

/**
 * BaseProvider - Abstract base class for all LLM providers
 * 
 * Provides:
 * - Circuit breaker integration
 * - Health check management
 * - Token counting approximation
 * - Common error handling
 */
export abstract class BaseProvider implements Provider {
  readonly id: ProviderId;
  readonly name: string;
  readonly models: ModelInfo[];
  protected config: ProviderConfig;
  protected circuitBreaker: CircuitBreaker;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.models = config.models;
    this.circuitBreaker = new CircuitBreaker(config.id);
  }

  /**
   * Get circuit breaker status
   */
  get circuitStatus(): CircuitBreakerStatus {
    return this.circuitBreaker.status;
  }

  /**
   * Check if provider is available
   */
  isAvailable(): boolean {
    return this.config.enabled && this.circuitBreaker.canRequest();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple completion request to verify connectivity
      await this.doHealthCheck();
      
      const latencyMs = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        healthy: true,
        latencyMs,
        checkedAt: new Date(),
      };

      eventBus.publish('precog', 'routing:provider_health', {
        health: {
          providerId: this.id,
          status: 'healthy',
          circuitState: this.circuitBreaker.status.state,
          latencyMs,
          errorRate: 0,
          lastCheck: new Date(),
          consecutiveFailures: 0,
        },
      });

      return result;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        healthy: false,
        latencyMs,
        error: errorMessage,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Get model information
   */
  getModel(modelId: string): ModelInfo | undefined {
    return this.models.find((m) => m.id === modelId);
  }

  /**
   * Approximate token count for messages
   * Uses rough estimate: ~4 characters per token
   */
  countTokens(messages: ChatMessage[]): number {
    let charCount = 0;
    
    for (const msg of messages) {
      charCount += msg.content.length;
      charCount += msg.role.length + 4;  // Role overhead
      if (msg.name) charCount += msg.name.length;
    }
    
    return Math.ceil(charCount / 4);
  }

  /**
   * Complete a request with circuit breaker protection
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    return this.circuitBreaker.execute(async () => {
      const startTime = Date.now();
      const response = await this.doComplete(request);
      response.latencyMs = Date.now() - startTime;
      return response;
    });
  }

  /**
   * Stream a request with circuit breaker protection
   */
  async *stream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
    if (!this.circuitBreaker.canRequest()) {
      yield {
        id: 'error',
        type: 'error',
        error: `Circuit breaker is open for provider ${this.id}`,
      };
      return;
    }

    try {
      yield* this.doStream(request);
      this.circuitBreaker.recordSuccess();
    } catch (error) {
      this.circuitBreaker.recordFailure(
        error instanceof Error ? error : new Error(String(error))
      );
      
      yield {
        id: 'error',
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ===========================================================================
  // ABSTRACT METHODS (to be implemented by subclasses)
  // ===========================================================================

  /**
   * Perform health check (provider-specific)
   */
  protected abstract doHealthCheck(): Promise<void>;

  /**
   * Perform completion request (provider-specific)
   */
  protected abstract doComplete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Perform streaming request (provider-specific)
   */
  protected abstract doStream(request: CompletionRequest): AsyncGenerator<StreamChunk>;
}

// =============================================================================
// PROVIDER REGISTRY
// =============================================================================

/**
 * ProviderRegistry - Manages available providers
 */
export class ProviderRegistry {
  private providers: Map<ProviderId, Provider> = new Map();

  /**
   * Register a provider
   */
  register(provider: Provider): void {
    this.providers.set(provider.id, provider);
    console.log(`Registered provider: ${provider.name}`);
  }

  /**
   * Unregister a provider
   */
  unregister(providerId: string): boolean {
    const id = createProviderId(providerId);
    return this.providers.delete(id);
  }

  /**
   * Get a provider by ID
   */
  get(providerId: string): Provider | undefined {
    const id = createProviderId(providerId);
    return this.providers.get(id);
  }

  /**
   * Get all providers
   */
  getAll(): Provider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all available providers
   */
  getAvailable(): Provider[] {
    return this.getAll().filter((p) => p.isAvailable());
  }

  /**
   * Find provider with specific capability
   */
  findByCapability(
    domain: string,
    minScore: number = 70
  ): Provider | undefined {
    for (const provider of this.getAvailable()) {
      for (const model of provider.models) {
        const capability = model.capabilities.find(
          (c) => c.domain === domain && c.score >= minScore
        );
        if (capability) {
          return provider;
        }
      }
    }
    return undefined;
  }

  /**
   * Get provider health summary
   */
  getHealthSummary(): Map<ProviderId, CircuitBreakerStatus> {
    const summary = new Map<ProviderId, CircuitBreakerStatus>();
    for (const [id, provider] of this.providers) {
      summary.set(id, provider.circuitStatus);
    }
    return summary;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Global provider registry
 */
export const providerRegistry = new ProviderRegistry();
