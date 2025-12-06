// @version 2.2.273
/**
 * Continuous Learning Pipeline
 * Tracks provider performance and implements meta-learning for continuous improvement
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ProviderPerformance {
  totalQueries: number;
  successfulQueries: number;
  totalLatency: number;
  avgLatency: number;
  domainSuccess: Record<string, { success: number; total: number }>;
}

interface FeedbackEntry {
  query: string;
  domain: string;
  provider: string;
  success: boolean;
  latency: number;
  userRating: number | null;
  timestamp: string;
}

export default class ContinuousLearning {
  private performanceData: Map<string, ProviderPerformance>;
  private feedbackHistory: FeedbackEntry[];
  private dataFile: string;

  constructor() {
    this.performanceData = new Map();
    this.feedbackHistory = [];
    this.dataFile = path.join(__dirname, '../../data/learning-data.json');

    this.loadData();
  }

  /**
   * Load existing learning data from disk
   */
  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        this.performanceData = new Map(data.performanceData || []);
        this.feedbackHistory = data.feedbackHistory || [];
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('Failed to load learning data:', errorMessage);
    }
  }

  /**
   * Save learning data to disk
   */
  saveData() {
    try {
      const data = {
        performanceData: Array.from(this.performanceData.entries()),
        feedbackHistory: this.feedbackHistory.slice(-1000), // Keep last 1000 entries
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('Failed to save learning data:', errorMessage);
    }
  }

  /**
   * Record a provider interaction
   */
  recordInteraction(
    query: string,
    domain: string,
    provider: string,
    success: boolean,
    latency: number,
    userRating: number | null = null
  ) {
    const timestamp = new Date().toISOString();

    // Initialize provider data if needed
    if (!this.performanceData.has(provider)) {
      this.performanceData.set(provider, {
        totalQueries: 0,
        successfulQueries: 0,
        totalLatency: 0,
        avgLatency: 0,
        domainSuccess: {},
      });
    }

    const providerData = this.performanceData.get(provider)!;

    // Update overall metrics
    providerData.totalQueries += 1;
    if (success) providerData.successfulQueries += 1;
    providerData.totalLatency += latency;
    providerData.avgLatency = providerData.totalLatency / providerData.totalQueries;

    // Update domain-specific metrics
    if (!providerData.domainSuccess[domain]) {
      providerData.domainSuccess[domain] = { success: 0, total: 0 };
    }
    providerData.domainSuccess[domain].total += 1;
    if (success) providerData.domainSuccess[domain].success += 1;

    // Record in feedback history
    this.feedbackHistory.push({
      query: query.substring(0, 200), // Truncate for storage
      domain,
      provider,
      success,
      latency,
      userRating,
      timestamp,
    });

    // Save periodically (every 10 interactions)
    if (this.feedbackHistory.length % 10 === 0) {
      this.saveData();
    }
  }

  /**
   * Get provider performance metrics
   */
  getProviderPerformance(
    provider: string | null = null
  ): Record<string, ProviderPerformance> | ProviderPerformance | null {
    if (provider) {
      return this.performanceData.get(provider) || null;
    }

    const result: Record<string, ProviderPerformance> = {};
    for (const [prov, data] of this.performanceData.entries()) {
      result[prov] = { ...data };
    }
    return result;
  }

  /**
   * Get success rate for a provider in a specific domain
   */
  getDomainSuccessRate(provider: string, domain: string): number {
    const providerData = this.performanceData.get(provider);
    if (!providerData || !providerData.domainSuccess[domain]) {
      return 0.5; // Default neutral rating
    }

    const domainData = providerData.domainSuccess[domain];
    return domainData.total > 0 ? domainData.success / domainData.total : 0.5;
  }

  /**
   * Get the best provider for a specific domain based on historical performance
   */
  getBestProviderForDomain(domain: string, availableProviders: string[]): string | null {
    let bestProvider = null;
    let bestScore = -1;

    for (const provider of availableProviders) {
      const successRate = this.getDomainSuccessRate(provider, domain);
      const totalQueries = this.performanceData.get(provider)?.totalQueries || 0;

      // Weight by both success rate and experience (total queries)
      const experienceWeight = Math.min(totalQueries / 100, 1); // Cap at 100 queries
      const score = successRate * (0.7 + 0.3 * experienceWeight);

      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    }

    return bestProvider;
  }

  /**
   * Get learning insights and recommendations
   */
  getInsights(): {
    totalInteractions: number;
    providerRankings: Record<
      string,
      { successRate: number; totalQueries: number; avgLatency: number }
    >;
    domainSpecializations: Record<string, { bestProvider: string; successRate: number }>;
    recommendations: string[];
  } {
    const insights: {
      totalInteractions: number;
      providerRankings: Record<
        string,
        { successRate: number; totalQueries: number; avgLatency: number }
      >;
      domainSpecializations: Record<string, { bestProvider: string; successRate: number }>;
      recommendations: string[];
    } = {
      totalInteractions: this.feedbackHistory.length,
      providerRankings: {},
      domainSpecializations: {},
      recommendations: [],
    };

    // Calculate provider rankings
    const providers = Array.from(this.performanceData.keys());
    providers.forEach((provider) => {
      const data = this.performanceData.get(provider);
      if (!data) return;
      const successRate = data.totalQueries > 0 ? data.successfulQueries / data.totalQueries : 0;
      insights.providerRankings[provider] = {
        successRate,
        totalQueries: data.totalQueries,
        avgLatency: data.avgLatency,
      };
    });

    // Find domain specializations
    const domains = ['engineering', 'design', 'business', 'research', 'creative'];
    domains.forEach((domain) => {
      let bestProvider = null;
      let bestRate = 0;

      providers.forEach((provider) => {
        const rate = this.getDomainSuccessRate(provider, domain);
        if (rate > bestRate) {
          bestRate = rate;
          bestProvider = provider;
        }
      });

      if (bestProvider && bestRate > 0.6) {
        // Only report strong specializations
        insights.domainSpecializations[domain] = {
          bestProvider,
          successRate: bestRate,
        };
      }
    });

    // Generate recommendations
    const sortedProviders = providers.sort((a, b) => {
      const aRate = insights.providerRankings[a]?.successRate ?? 0;
      const bRate = insights.providerRankings[b]?.successRate ?? 0;
      return bRate - aRate;
    });

    if (sortedProviders.length > 1 && sortedProviders[0]) {
      const topProvider = sortedProviders[0];
      const topRanking = insights.providerRankings[topProvider];
      if (topRanking) {
        insights.recommendations.push(
          `Top performing provider: ${topProvider} (${(topRanking.successRate * 100).toFixed(1)}% success rate)`
        );
      }
    }

    // Check for underperforming providers
    providers.forEach((provider) => {
      const ranking = insights.providerRankings[provider];
      if (!ranking) return;
      const rate = ranking.successRate;
      const queries = ranking.totalQueries;
      if (queries > 10 && rate < 0.5) {
        insights.recommendations.push(
          `Consider reducing usage of ${provider} (${(rate * 100).toFixed(1)}% success rate)`
        );
      }
    });

    return insights;
  }

  /**
   * Get recent feedback history
   */
  getRecentFeedback(limit: number = 50): FeedbackEntry[] {
    return this.feedbackHistory.slice(-limit);
  }

  /**
   * Reset all learning data (for testing or manual reset)
   */
  resetData() {
    this.performanceData.clear();
    this.feedbackHistory = [];
    this.saveData();
  }
}
