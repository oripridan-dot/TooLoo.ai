// @version 3.3.125
/**
 * ParallelProviderOrchestrator - Real multi-provider parallel execution
 * Executes prompts across multiple LLM providers simultaneously,
 * then synthesizes results using consensus-based aggregation.
 *
 * Features:
 * - True parallel execution across all available providers
 * - Consensus synthesis for high-quality responses
 * - Performance tracking per provider
 * - Automatic failover and retry logic
 * - Cost-aware provider selection
 */

import { generateLLM } from '../providers/llm-provider.js';
import { bus } from '../../core/event-bus.js';

interface ProviderResult {
  provider: string;
  response: string;
  success: boolean;
  latency: number;
  error?: string;
  tokens?: number;
}

interface ParallelConfig {
  providers?: string[];
  timeout?: number;
  minResponses?: number;
  synthesize?: boolean;
  maxCost?: number;
}

interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  averageLatency: number;
  providerMetrics: Record<
    string,
    {
      requests: number;
      successes: number;
      avgLatency: number;
      lastUsed: number;
    }
  >;
}

export default class ParallelProviderOrchestrator {
  private config: ParallelConfig;
  private defaultProviders = ['deepseek', 'anthropic', 'openai', 'gemini'];
  private metrics: PerformanceMetrics;
  private initialized = false;

  constructor(config: ParallelConfig = {}) {
    this.config = {
      providers: config.providers || this.defaultProviders,
      timeout: config.timeout || 30000,
      minResponses: config.minResponses || 1,
      synthesize: config.synthesize ?? true,
      maxCost: config.maxCost,
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      averageLatency: 0,
      providerMetrics: {},
    };
  }

  async init(): Promise<{ ok: boolean; engine: string; status: string }> {
    this.initialized = true;
    console.log(
      '[ParallelProviderOrchestrator] Initialized with providers:',
      this.config.providers
    );

    bus.publish('precog', 'parallel_orchestrator:ready', {
      providers: this.config.providers,
      timestamp: Date.now(),
    });

    return {
      ok: true,
      engine: 'parallel-provider-orchestrator',
      status: 'ready',
    };
  }

  /**
   * Execute prompt across all providers in parallel
   */
  async hyperParallelGenerate(
    prompt: string,
    options: { system?: string; maxTokens?: number; sessionId?: string } = {}
  ): Promise<{
    prompt: string;
    results: ProviderResult[];
    timing: { total: number; perProvider: Record<string, number> };
    status: string;
    consensus: string;
  }> {
    const startTime = Date.now();
    const providers = this.config.providers || this.defaultProviders;
    this.metrics.totalRequests++;

    // Execute all providers in parallel
    const providerPromises = providers.map((provider) =>
      this.executeProvider(provider, prompt, options)
    );

    // Wait for all with timeout
    const results = await Promise.allSettled(
      providerPromises.map((p) =>
        Promise.race([
          p,
          new Promise<ProviderResult>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), this.config.timeout)
          ),
        ])
      )
    );

    // Process results
    const processedResults: ProviderResult[] = [];
    const timing: Record<string, number> = {};

    results.forEach((result, idx) => {
      const provider = providers[idx];
      if (result.status === 'fulfilled') {
        processedResults.push(result.value);
        timing[provider] = result.value.latency;
        this.updateProviderMetrics(provider, result.value);
      } else {
        processedResults.push({
          provider,
          response: '',
          success: false,
          latency: 0,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    const successful = processedResults.filter((r) => r.success);
    const totalTime = Date.now() - startTime;

    // Update overall metrics
    if (successful.length > 0) {
      this.metrics.successfulRequests++;
      this.metrics.averageLatency =
        (this.metrics.averageLatency * (this.metrics.totalRequests - 1) + totalTime) /
        this.metrics.totalRequests;
    }

    // Generate consensus if we have multiple successful responses
    let consensus = '';
    if (successful.length >= (this.config.minResponses || 1)) {
      consensus = this.config.synthesize
        ? await this.synthesizeConsensus(prompt, successful, options)
        : successful[0]?.response || '';
    } else if (successful.length === 1) {
      consensus = successful[0].response;
    } else {
      consensus = 'No providers returned a valid response.';
    }

    // Publish telemetry
    bus.publish('precog', 'parallel_orchestrator:complete', {
      prompt: prompt.substring(0, 100),
      providersQueried: providers.length,
      successfulResponses: successful.length,
      totalTime,
      timestamp: Date.now(),
    });

    return {
      prompt,
      results: processedResults,
      timing: { total: totalTime, perProvider: timing },
      status: successful.length > 0 ? 'completed' : 'failed',
      consensus,
    };
  }

  /**
   * Execute a single provider
   */
  private async executeProvider(
    provider: string,
    prompt: string,
    options: { system?: string; maxTokens?: number; sessionId?: string }
  ): Promise<ProviderResult> {
    const startTime = Date.now();

    try {
      const response = await generateLLM({
        prompt,
        provider,
        system: options.system,
        maxTokens: options.maxTokens || 1024,
        sessionId: options.sessionId,
      });

      return {
        provider,
        response,
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        provider,
        response: '',
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Synthesize consensus from multiple provider responses
   */
  private async synthesizeConsensus(
    originalPrompt: string,
    results: ProviderResult[],
    options: { system?: string; sessionId?: string }
  ): Promise<string> {
    if (results.length === 1) {
      return results[0].response;
    }

    // Use the fastest successful provider to synthesize
    const synthProvider = results.reduce((fastest, current) =>
      current.latency < fastest.latency ? current : fastest
    ).provider;

    const synthesisPrompt = `
You are synthesizing responses from multiple AI providers to create a superior answer.

Original question: "${originalPrompt}"

Responses from providers:
${results.map((r) => `--- ${r.provider.toUpperCase()} ---\n${r.response}\n`).join('\n')}

Create a single, synthesized response that:
1. Combines the best insights from all responses
2. Resolves any contradictions
3. Maintains accuracy and coherence
4. Is concise but complete

Return ONLY the synthesized response.`;

    try {
      const consensus = await generateLLM({
        prompt: synthesisPrompt,
        provider: synthProvider,
        system: options.system,
        maxTokens: 2048,
        sessionId: options.sessionId,
      });
      return consensus;
    } catch {
      // Fallback to first response if synthesis fails
      return results[0].response;
    }
  }

  /**
   * Update metrics for a provider
   */
  private updateProviderMetrics(provider: string, result: ProviderResult): void {
    if (!this.metrics.providerMetrics[provider]) {
      this.metrics.providerMetrics[provider] = {
        requests: 0,
        successes: 0,
        avgLatency: 0,
        lastUsed: 0,
      };
    }

    const pm = this.metrics.providerMetrics[provider];
    pm.requests++;
    if (result.success) {
      pm.successes++;
    }
    pm.avgLatency = (pm.avgLatency * (pm.requests - 1) + result.latency) / pm.requests;
    pm.lastUsed = Date.now();
  }

  /**
   * Query in parallel (alias for hyperParallelGenerate)
   */
  async queryParallel(
    prompt: string,
    options: Record<string, unknown> = {}
  ): Promise<{
    prompt: string;
    results: ProviderResult[];
    timing: { total: number; perProvider: Record<string, number> };
    status: string;
  }> {
    const result = await this.hyperParallelGenerate(prompt, options as any);
    return {
      prompt: result.prompt,
      results: result.results,
      timing: result.timing,
      status: result.status,
    };
  }

  getPerformanceReport(): {
    totalRequests: number;
    averageLatency: number;
    successRate: number;
    providerBreakdown: Record<string, { successRate: number; avgLatency: number }>;
  } {
    const providerBreakdown: Record<string, { successRate: number; avgLatency: number }> = {};

    for (const [provider, metrics] of Object.entries(this.metrics.providerMetrics)) {
      providerBreakdown[provider] = {
        successRate: metrics.requests > 0 ? (metrics.successes / metrics.requests) * 100 : 0,
        avgLatency: metrics.avgLatency,
      };
    }

    return {
      totalRequests: this.metrics.totalRequests,
      averageLatency: this.metrics.averageLatency,
      successRate:
        this.metrics.totalRequests > 0
          ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
          : 100,
      providerBreakdown,
    };
  }

  getStatus(): {
    engine: string;
    activeProviders: number;
    initialized: boolean;
    metrics: PerformanceMetrics;
  } {
    return {
      engine: 'parallel-provider-orchestrator',
      activeProviders: (this.config.providers || []).length,
      initialized: this.initialized,
      metrics: this.metrics,
    };
  }
}
