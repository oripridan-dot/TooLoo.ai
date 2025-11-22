/**
 * ProviderQualityLearner - Learn which providers work best
 * 
 * Tracks provider performance and recommends providers based on
 * learned quality/cost/latency tradeoffs.
 */

import crypto from 'crypto';

export class ProviderQualityLearner {
  constructor(options = {}) {
    this.history = new Map(); // hash(prompt) -> [{ provider, score, latency, cost, timestamp }]
    this.maxHistoryPerPrompt = options.maxHistoryPerPrompt || 100;
    this.decayHours = options.decayHours || 24; // Forget after 24h
    
    // Metrics
    this.metrics = {
      totalRecords: 0,
      recommendations: 0,
      learningStartTime: Date.now()
    };
  }

  /**
   * Record the outcome of a provider call
   */
  record(prompt, provider, score, latency, cost) {
    const hash = this.hash(prompt);
    
    if (!this.history.has(hash)) {
      this.history.set(hash, []);
    }

    const entry = {
      provider: String(provider).toLowerCase(),
      score: Math.max(0, Math.min(1, score)), // Clamp 0-1
      latency: Math.max(0, latency),
      cost: Math.max(0, cost),
      timestamp: Date.now()
    };

    const history = this.history.get(hash);
    history.push(entry);

    // Keep only recent entries
    if (history.length > this.maxHistoryPerPrompt) {
      history.shift();
    }

    this.metrics.totalRecords++;
  }

  /**
   * Recommend the best provider for a prompt
   */
  recommend(prompt, options = {}) {
    const {
      maxLatency = 5000,
      maxCost = 1.0,
      minScore = 0.5,
      weights = { score: 0.6, latency: 0.2, cost: 0.2 }
    } = options;

    const hash = this.hash(prompt);
    const history = this.history.get(hash) || [];

    if (history.length === 0) {
      return null; // No data; use default
    }

    const now = Date.now();
    const decayMs = this.decayHours * 3600000;

    // Score each history entry
    const weighted = history
      .filter(h => h.score >= minScore && h.latency <= maxLatency && h.cost <= maxCost)
      .map(h => {
        const recency = Math.exp(-(now - h.timestamp) / decayMs);
        const normalizedScore = h.score;
        const normalizedLatency = 1 - Math.min(1, h.latency / maxLatency);
        const normalizedCost = 1 - Math.min(1, h.cost / maxCost);

        const composite = 
          normalizedScore * weights.score +
          normalizedLatency * weights.latency +
          normalizedCost * weights.cost;

        return {
          ...h,
          recency,
          composite,
          finalScore: composite * recency
        };
      });

    if (weighted.length === 0) {
      return null;
    }

    // Return provider with highest final score
    const best = weighted.reduce((a, b) => a.finalScore > b.finalScore ? a : b);
    
    this.metrics.recommendations++;
    return best.provider;
  }

  /**
   * Get statistics for a prompt
   */
  getStats(prompt) {
    const hash = this.hash(prompt);
    const history = this.history.get(hash) || [];

    if (history.length === 0) {
      return null;
    }

    const providers = {};
    
    for (const entry of history) {
      if (!providers[entry.provider]) {
        providers[entry.provider] = {
          count: 0,
          avgScore: 0,
          avgLatency: 0,
          avgCost: 0,
          minScore: 1,
          maxScore: 0
        };
      }

      const p = providers[entry.provider];
      p.count++;
      p.avgScore += entry.score;
      p.avgLatency += entry.latency;
      p.avgCost += entry.cost;
      p.minScore = Math.min(p.minScore, entry.score);
      p.maxScore = Math.max(p.maxScore, entry.score);
    }

    // Normalize
    for (const provider in providers) {
      const p = providers[provider];
      p.avgScore = (p.avgScore / p.count).toFixed(3);
      p.avgLatency = Math.round(p.avgLatency / p.count);
      p.avgCost = (p.avgCost / p.count).toFixed(4);
    }

    return providers;
  }

  /**
   * Hash a prompt to unique key
   */
  hash(prompt) {
    return crypto
      .createHash('sha256')
      .update(String(prompt))
      .digest('hex')
      .slice(0, 12);
  }

  /**
   * Get learner state
   */
  getState() {
    return {
      learnedPrompts: this.history.size,
      totalRecords: this.metrics.totalRecords,
      recommendations: this.metrics.recommendations,
      learningSinceMs: Date.now() - this.metrics.learningStartTime
    };
  }
}

export default ProviderQualityLearner;
