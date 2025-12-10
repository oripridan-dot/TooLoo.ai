// @version 3.3.496
/**
 * ProviderScorecard - Real Dynamic Provider Ranking
 * 
 * This is the foundation of Phase 1: Smart Router
 * 
 * Tracks live performance metrics for each LLM provider and generates
 * dynamic rankings based on:
 * - Latency (rolling average of last 50 requests)
 * - Error Rate (percentage of failed requests)
 * - Cost per token
 * - Reliability (uptime percentage)
 * 
 * Algorithm: Score = (w1 × normalizedLatency) + (w2 × normalizedCost) + (w3 × errorRate)
 * Lower score = better provider
 * 
 * This replaces hardcoded PROVIDER_PRIORITY arrays with live, performance-based ranking.
 */

interface RequestMetric {
  timestamp: number;
  latency: number;
  success: boolean;
  tokens?: number;
  costPerToken?: number;
  error?: string;
}

interface ProviderStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastErrorRate: number; // 0-100
  avgLatency: number; // ms
  avgCostPerToken: number; // dollars
  lastUpdated: number;
  recentMetrics: RequestMetric[]; // Last 50 requests (rolling window)
}

interface ScoringWeights {
  latency: number; // Weight for latency factor (0-1)
  cost: number;    // Weight for cost factor (0-1)
  reliability: number; // Weight for error rate factor (0-1)
}

export class ProviderScorecard {
  private providers: Map<string, ProviderStats> = new Map();
  private scoringWeights: ScoringWeights;
  private maxMetricsPerProvider = 50; // Rolling window size
  private readonly METRIC_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  // Default provider costs (tokens per $1, approximate)
  private costModel: Record<string, number> = {
    'deepseek': 0.00000028, // Cheapest (~$0.14 per million tokens)
    'anthropic': 0.00000300, // Claude 3.5 Haiku
    'openai': 0.00000150, // GPT-4 Turbo input
    'gemini': 0.00000075, // Gemini 1.5 Flash
  };

  constructor(
    providers: string[] = ['deepseek', 'anthropic', 'openai', 'gemini'],
    weights?: Partial<ScoringWeights>
  ) {
    // Initialize all providers with empty stats
    providers.forEach((provider) => {
      this.providers.set(provider, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        lastErrorRate: 0,
        avgLatency: 0,
        avgCostPerToken: this.costModel[provider] || 0.000001,
        lastUpdated: Date.now(),
        recentMetrics: [],
      });
    });

    // Set scoring weights (must sum to ~1.0 for normalized scoring)
    this.scoringWeights = {
      latency: weights?.latency ?? 0.4, // 40% weight on latency
      cost: weights?.cost ?? 0.3, // 30% weight on cost
      reliability: weights?.reliability ?? 0.3, // 30% weight on reliability
    };

    console.log('[ProviderScorecard] Initialized with providers:', providers);
    console.log('[ProviderScorecard] Scoring weights:', this.scoringWeights);
  }

  /**
   * Record a request result for a provider
   * This is called after every provider call to update the scorecard
   */
  recordRequest(
    provider: string,
    latency: number,
    success: boolean,
    tokens?: number,
    error?: string
  ): void {
    const stats = this.providers.get(provider);
    if (!stats) {
      console.warn(`[ProviderScorecard] Unknown provider: ${provider}`);
      return;
    }

    const metric: RequestMetric = {
      timestamp: Date.now(),
      latency,
      success,
      tokens,
      costPerToken: this.costModel[provider],
      error,
    };

    // Add to rolling window
    stats.recentMetrics.push(metric);
    if (stats.recentMetrics.length > this.maxMetricsPerProvider) {
      stats.recentMetrics.shift(); // Remove oldest metric
    }

    // Update cumulative stats
    stats.totalRequests++;
    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }

    // Update rolling averages from recent metrics
    this.updateRollingAverages(provider);
    stats.lastUpdated = Date.now();
  }

  /**
   * Update rolling averages from the recent metrics window
   */
  private updateRollingAverages(provider: string): void {
    const stats = this.providers.get(provider);
    if (!stats || stats.recentMetrics.length === 0) return;

    // Calculate average latency
    const totalLatency = stats.recentMetrics.reduce((sum, m) => sum + m.latency, 0);
    stats.avgLatency = totalLatency / stats.recentMetrics.length;

    // Calculate error rate from recent window
    const recentErrors = stats.recentMetrics.filter((m) => !m.success).length;
    stats.lastErrorRate = (recentErrors / stats.recentMetrics.length) * 100;

    // Average cost per token (from known cost model)
    stats.avgCostPerToken = this.costModel[provider] || 0.000001;
  }

  /**
   * Get ranked providers sorted by score (best first)
   * Lower score = better provider
   */
  getRankedProviders(): Array<{ provider: string; score: number; stats: ProviderStats }> {
    const ranked = Array.from(this.providers.entries()).map(([provider, stats]) => ({
      provider,
      score: this.calculateProviderScore(stats),
      stats,
    }));

    // Sort by score ascending (lower is better)
    ranked.sort((a, b) => a.score - b.score);

    return ranked;
  }

  /**
   * Get the next best provider to try
   * This is used by the smart router for waterfall fallback logic
   */
  getBestProvider(): string | null {
    const ranked = this.getRankedProviders();
    return ranked.length > 0 ? ranked[0]!.provider : null;
  }

  /**
   * Get providers in priority order for waterfall routing
   */
  getRouteOrder(): string[] {
    return this.getRankedProviders().map((r) => r.provider);
  }

  /**
   * Calculate composite score for a provider
   * Score = (w1 × latencyNorm) + (w2 × costNorm) + (w3 × errorRate)
   * 
   * Returns value typically 0-1, where lower is better
   * Providers with no requests get highest score (will be tried last)
   */
  private calculateProviderScore(stats: ProviderStats): number {
    // Providers with no requests should be tried (score = 0.5, neutral)
    if (stats.totalRequests === 0) {
      return 0.5; // Neutral score for untested providers
    }

    // Normalize metrics to 0-1 range
    // Latency: assume 0ms = perfect, 5000ms = worst (normalize)
    const latencyNorm = Math.min(1, stats.avgLatency / 5000);

    // Cost: assume $0 = perfect, $0.01 per token = worst
    const costNorm = Math.min(1, stats.avgCostPerToken / 0.01);

    // Error rate is already 0-100, convert to 0-1
    const reliabilityScore = (100 - stats.lastErrorRate) / 100;
    const errorNorm = 1 - reliabilityScore; // Higher error = higher score (worse)

    // Calculate composite score
    const score =
      this.scoringWeights.latency * latencyNorm +
      this.scoringWeights.cost * costNorm +
      this.scoringWeights.reliability * errorNorm;

    return score;
  }

  /**
   * Get human-readable report of all provider stats
   */
  getReport(): Record<
    string,
    {
      requests: number;
      successRate: string;
      avgLatency: string;
      errorRate: string;
      score: number;
      recommendation: string;
    }
  > {
    const ranked = this.getRankedProviders();
    const report: Record<string, any> = {};

    ranked.forEach(({ provider, stats, score }) => {
      const successRate =
        stats.totalRequests > 0
          ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
          : 'N/A';

      let recommendation = '';
      if (score < 0.3) {
        recommendation = '✓ Excellent';
      } else if (score < 0.6) {
        recommendation = '→ Good';
      } else if (score < 0.8) {
        recommendation = '⚠ Fair';
      } else {
        recommendation = '✗ Poor';
      }

      report[provider] = {
        requests: stats.totalRequests,
        successRate: `${successRate}%`,
        avgLatency: `${stats.avgLatency.toFixed(0)}ms`,
        errorRate: `${stats.lastErrorRate.toFixed(1)}%`,
        score: parseFloat(score.toFixed(3)),
        recommendation,
      };
    });

    return report;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.providers.forEach((stats) => {
      stats.totalRequests = 0;
      stats.successfulRequests = 0;
      stats.failedRequests = 0;
      stats.lastErrorRate = 0;
      stats.avgLatency = 0;
      stats.recentMetrics = [];
      stats.lastUpdated = Date.now();
    });
  }

  /**
   * Get current stats for a specific provider
   */
  getProviderStats(provider: string): ProviderStats | null {
    return this.providers.get(provider) || null;
  }

  /**
   * Adjust scoring weights dynamically
   * Useful for optimizing behavior based on system goals
   */
  setScoringWeights(weights: Partial<ScoringWeights>): void {
    this.scoringWeights = {
      ...this.scoringWeights,
      ...weights,
    };
    console.log('[ProviderScorecard] Scoring weights updated:', this.scoringWeights);
  }

  /**
   * Update cost model for a provider
   * Called when actual pricing changes
   */
  updateCostModel(provider: string, costPerToken: number): void {
    this.costModel[provider] = costPerToken;
    const stats = this.providers.get(provider);
    if (stats) {
      stats.avgCostPerToken = costPerToken;
    }
  }

  /**
   * Publish metrics to event bus for dashboard visualization
   */
  publishMetrics(bus: any): void {
    const report = this.getReport();
    const ranked = this.getRankedProviders();

    bus.publish('precog', 'provider_scorecard:update', {
      timestamp: Date.now(),
      rankings: ranked.map((r) => ({
        provider: r.provider,
        score: r.score,
        rank: ranked.indexOf(r) + 1,
      })),
      report,
      bestProvider: ranked[0]?.provider || null,
    });
  }
}

// Export singleton instance for use across the system
let scorecardInstance: ProviderScorecard | null = null;

export function initProviderScorecard(
  providers?: string[],
  weights?: Partial<ScoringWeights>
): ProviderScorecard {
  scorecardInstance = new ProviderScorecard(providers, weights);
  return scorecardInstance;
}

export function getProviderScorecard(): ProviderScorecard {
  if (!scorecardInstance) {
    scorecardInstance = new ProviderScorecard();
  }
  return scorecardInstance;
}

export default ProviderScorecard;
