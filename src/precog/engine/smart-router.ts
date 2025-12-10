// @version 3.3.497
/**
 * SmartRouter - Real Waterfall Fallback Logic
 * 
 * Phase 1 Implementation: Smart Router
 * 
 * Replaces the simple try-catch approach with real waterfall routing:
 * 1. Get ranked providers from ProviderScorecard
 * 2. Try each in order until one succeeds
 * 3. Update scorecard after each attempt
 * 4. Return first successful response or final failure
 * 
 * This is the core of intelligent provider routing.
 */

import { ProviderScorecard, getProviderScorecard } from './provider-scorecard.js';
import { generateLLM } from '../providers/llm-provider.js';
import { bus } from '../../core/event-bus.js';

interface SmartRouteOptions {
  system?: string;
  maxTokens?: number;
  sessionId?: string;
  timeout?: number;
  maxRetries?: number;
  excludeProviders?: string[];
}

interface SmartRouteResult {
  provider: string;
  response: string;
  success: boolean;
  latency: number;
  error?: string;
  tokens?: number;
  attemptsNeeded: number;
  routeHistory: Array<{
    provider: string;
    success: boolean;
    latency: number;
    error?: string;
  }>;
}

export class SmartRouter {
  private scorecard: ProviderScorecard;
  private defaultTimeout = 30000; // 30 seconds per provider
  private defaultMaxRetries = 3;

  constructor(scorecard?: ProviderScorecard) {
    this.scorecard = scorecard || getProviderScorecard();
  }

  /**
   * Smart waterfall routing: try providers in ranked order until one succeeds
   * This is the core intelligent routing logic
   */
  async smartRoute(
    prompt: string,
    options: SmartRouteOptions = {}
  ): Promise<SmartRouteResult> {
    const startTime = Date.now();
    const timeout = options.timeout || this.defaultTimeout;
    const maxRetries = options.maxRetries || this.defaultMaxRetries;
    const routeHistory: SmartRouteResult['routeHistory'] = [];
    let attemptsNeeded = 0;

    // Get ranked providers from scorecard
    let rankedProviders = this.scorecard.getRouteOrder();

    // Exclude any providers specified
    if (options.excludeProviders && options.excludeProviders.length > 0) {
      rankedProviders = rankedProviders.filter((p) => !options.excludeProviders!.includes(p));
    }

    // Waterfall: try each provider in ranked order
    for (let attempt = 0; attempt < Math.min(maxRetries, rankedProviders.length); attempt++) {
      const provider = rankedProviders[attempt];
      if (!provider) break;

      attemptsNeeded++;
      const providerStartTime = Date.now();

      try {
        console.log(
          `[SmartRouter] Attempt ${attempt + 1}: Trying ${provider} (rank #${attempt + 1})`
        );

        // Try to get response with timeout
        const response = await this.callProviderWithTimeout(provider, prompt, options, timeout);

        const latency = Date.now() - providerStartTime;

        // Record success in scorecard
        this.scorecard.recordRequest(provider, latency, true, response.tokens);

        routeHistory.push({
          provider,
          success: true,
          latency,
        });

        // Publish success event
        bus.publish('precog', 'smart_router:success', {
          provider,
          prompt: prompt.substring(0, 50),
          latency,
          attemptsNeeded,
          timestamp: Date.now(),
        });

        console.log(
          `[SmartRouter] ✓ Success on ${provider} (${latency}ms, attempt ${attempt + 1})`
        );

        return {
          provider,
          response: response.text,
          success: true,
          latency,
          tokens: response.tokens,
          attemptsNeeded,
          routeHistory,
        };
      } catch (error) {
        const latency = Date.now() - providerStartTime;
        const errorMsg = error instanceof Error ? error.message : String(error);

        // Record failure in scorecard
        this.scorecard.recordRequest(provider, latency, false, undefined, errorMsg);

        routeHistory.push({
          provider,
          success: false,
          latency,
          error: errorMsg,
        });

        console.warn(
          `[SmartRouter] ✗ Failed on ${provider} (attempt ${attempt + 1}): ${errorMsg}`
        );

        // Continue to next provider
      }
    }

    // All providers exhausted
    const totalLatency = Date.now() - startTime;

    console.error(`[SmartRouter] ✗ All ${attemptsNeeded} providers failed in ${totalLatency}ms`);

    // Publish failure event
    bus.publish('precog', 'smart_router:failure', {
      attemptsNeeded,
      totalLatency,
      providers: rankedProviders.slice(0, attemptsNeeded),
      timestamp: Date.now(),
    });

    return {
      provider: 'none',
      response: '',
      success: false,
      latency: totalLatency,
      error: `All ${attemptsNeeded} providers failed`,
      attemptsNeeded,
      routeHistory,
    };
  }

  /**
   * Call a single provider with timeout protection
   */
  private async callProviderWithTimeout(
    provider: string,
    prompt: string,
    options: SmartRouteOptions,
    timeout: number
  ): Promise<{ text: string; tokens?: number }> {
    return Promise.race([
      this.callProvider(provider, prompt, options),
      new Promise<{ text: string; tokens?: number }>((_, reject) =>
        setTimeout(() => reject(new Error(`Provider timeout (${timeout}ms)`)), timeout)
      ),
    ]);
  }

  /**
   * Call a single provider
   */
  private async callProvider(
    provider: string,
    prompt: string,
    options: SmartRouteOptions
  ): Promise<{ text: string; tokens?: number }> {
    const response = await generateLLM({
      prompt,
      provider,
      system: options.system,
      maxTokens: options.maxTokens || 1024,
      sessionId: options.sessionId,
    });

    return {
      text: response,
      tokens: undefined, // Would be extracted from provider response if available
    };
  }

  /**
   * Get the scorecard for external access (e.g., dashboard)
   */
  getScorecard(): ProviderScorecard {
    return this.scorecard;
  }

  /**
   * Get current provider rankings
   */
  getProviderRankings(): Array<{
    rank: number;
    provider: string;
    score: number;
    recommendation: string;
  }> {
    const ranked = this.scorecard.getRankedProviders();
    return ranked.map((r, index) => ({
      rank: index + 1,
      provider: r.provider,
      score: r.score,
      recommendation:
        r.score < 0.3
          ? '✓ Excellent'
          : r.score < 0.6
            ? '→ Good'
            : r.score < 0.8
              ? '⚠ Fair'
              : '✗ Poor',
    }));
  }

  /**
   * Manually add request metrics (for testing or external sources)
   */
  recordMetric(
    provider: string,
    latency: number,
    success: boolean,
    tokens?: number,
    error?: string
  ): void {
    this.scorecard.recordRequest(provider, latency, success, tokens, error);
  }
}

// Export singleton for system-wide use
let routerInstance: SmartRouter | null = null;

export function initSmartRouter(scorecard?: ProviderScorecard): SmartRouter {
  routerInstance = new SmartRouter(scorecard);
  console.log('[SmartRouter] Initialized with ProviderScorecard');
  return routerInstance;
}

export function getSmartRouter(): SmartRouter {
  if (!routerInstance) {
    routerInstance = new SmartRouter();
  }
  return routerInstance;
}

export default SmartRouter;
