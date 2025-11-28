// @version 2.2.97
/**
 * ProviderScorecard
 * Tracks latency and user acceptance rate for each provider.
 * Used to weigh routing decisions.
 */
export class ProviderScorecard {
  private stats: Map<
    string,
    { requests: number; totalLatency: number; successful: number }
  > = new Map();

  /**
   * Records the metrics for a provider request.
   * @param provider The name of the provider.
   * @param latencyMs The latency of the request in milliseconds.
   * @param success Whether the result was accepted/successful.
   */
  recordMetric(provider: string, latencyMs: number, success: boolean) {
    const current = this.stats.get(provider) || {
      requests: 0,
      totalLatency: 0,
      successful: 0,
    };

    this.stats.set(provider, {
      requests: current.requests + 1,
      totalLatency: current.totalLatency + latencyMs,
      successful: current.successful + (success ? 1 : 0),
    });
  }

  /**
   * Gets the average latency for a provider.
   * @param provider The name of the provider.
   */
  getAverageLatency(provider: string): number {
    const stats = this.stats.get(provider);
    if (!stats || stats.requests === 0) return 0;
    return stats.totalLatency / stats.requests;
  }

  /**
   * Gets the success rate (acceptance rate) for a provider.
   * @param provider The name of the provider.
   */
  getSuccessRate(provider: string): number {
    const stats = this.stats.get(provider);
    if (!stats || stats.requests === 0) return 0;
    return stats.successful / stats.requests;
  }

  /**
   * Returns a score for the provider (higher is better).
   * Simple formula: Success Rate * (1000 / (Average Latency + 1))
   * @param provider The name of the provider.
   */
  getScore(provider: string): number {
    const successRate = this.getSuccessRate(provider);
    const avgLatency = this.getAverageLatency(provider);

    // Avoid division by zero and weight success heavily
    return successRate * (10000 / (avgLatency + 100));
  }
}
