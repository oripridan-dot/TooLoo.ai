// @version 2.1.28
/**
 * Continuous Learning Pipeline
 * Tracks provider performance and implements meta-learning for continuous improvement
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class ContinuousLearning {
  constructor() {
    this.performanceData = new Map(); // provider -> { totalQueries, successfulQueries, avgLatency, domainSuccess: { domain: { success: count, total: count } } }
    this.feedbackHistory = []; // Array of { query, domain, provider, success, latency, timestamp, userRating? }
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
    } catch (error) {
      console.warn('Failed to load learning data:', error.message);
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
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('Failed to save learning data:', error.message);
    }
  }

  /**
   * Record a provider interaction
   * @param {string} query - The user query
   * @param {string} domain - Detected domain
   * @param {string} provider - The provider used
   * @param {boolean} success - Whether the response was successful
   * @param {number} latency - Response time in milliseconds
   * @param {number} userRating - Optional user rating (1-5)
   */
  recordInteraction(query, domain, provider, success, latency, userRating = null) {
    const timestamp = new Date().toISOString();

    // Initialize provider data if needed
    if (!this.performanceData.has(provider)) {
      this.performanceData.set(provider, {
        totalQueries: 0,
        successfulQueries: 0,
        totalLatency: 0,
        avgLatency: 0,
        domainSuccess: {}
      });
    }

    const providerData = this.performanceData.get(provider);

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
      timestamp
    });

    // Save periodically (every 10 interactions)
    if (this.feedbackHistory.length % 10 === 0) {
      this.saveData();
    }
  }

  /**
   * Get provider performance metrics
   * @param {string} provider - Provider name (optional, returns all if not specified)
   * @returns {object} - Performance metrics
   */
  getProviderPerformance(provider = null) {
    if (provider) {
      return this.performanceData.get(provider) || null;
    }

    const result = {};
    for (const [prov, data] of this.performanceData.entries()) {
      result[prov] = { ...data };
    }
    return result;
  }

  /**
   * Get success rate for a provider in a specific domain
   * @param {string} provider - Provider name
   * @param {string} domain - Domain name
   * @returns {number} - Success rate (0-1)
   */
  getDomainSuccessRate(provider, domain) {
    const providerData = this.performanceData.get(provider);
    if (!providerData || !providerData.domainSuccess[domain]) {
      return 0.5; // Default neutral rating
    }

    const domainData = providerData.domainSuccess[domain];
    return domainData.total > 0 ? domainData.success / domainData.total : 0.5;
  }

  /**
   * Get the best provider for a specific domain based on historical performance
   * @param {string} domain - Domain name
   * @param {Array<string>} availableProviders - List of available providers
   * @returns {string|null} - Best provider or null if no data
   */
  getBestProviderForDomain(domain, availableProviders) {
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
   * @returns {object} - Insights about provider performance
   */
  getInsights() {
    const insights = {
      totalInteractions: this.feedbackHistory.length,
      providerRankings: {},
      domainSpecializations: {},
      recommendations: []
    };

    // Calculate provider rankings
    const providers = Array.from(this.performanceData.keys());
    providers.forEach(provider => {
      const data = this.performanceData.get(provider);
      const successRate = data.totalQueries > 0 ? data.successfulQueries / data.totalQueries : 0;
      insights.providerRankings[provider] = {
        successRate,
        totalQueries: data.totalQueries,
        avgLatency: data.avgLatency
      };
    });

    // Find domain specializations
    const domains = ['engineering', 'design', 'business', 'research', 'creative'];
    domains.forEach(domain => {
      let bestProvider = null;
      let bestRate = 0;

      providers.forEach(provider => {
        const rate = this.getDomainSuccessRate(provider, domain);
        if (rate > bestRate) {
          bestRate = rate;
          bestProvider = provider;
        }
      });

      if (bestProvider && bestRate > 0.6) { // Only report strong specializations
        insights.domainSpecializations[domain] = {
          bestProvider,
          successRate: bestRate
        };
      }
    });

    // Generate recommendations
    const sortedProviders = providers.sort((a, b) => {
      const aRate = insights.providerRankings[a].successRate;
      const bRate = insights.providerRankings[b].successRate;
      return bRate - aRate;
    });

    if (sortedProviders.length > 1) {
      insights.recommendations.push(`Top performing provider: ${sortedProviders[0]} (${(insights.providerRankings[sortedProviders[0]].successRate * 100).toFixed(1)}% success rate)`);
    }

    // Check for underperforming providers
    providers.forEach(provider => {
      const rate = insights.providerRankings[provider].successRate;
      const queries = insights.providerRankings[provider].totalQueries;
      if (queries > 10 && rate < 0.5) {
        insights.recommendations.push(`Consider reducing usage of ${provider} (${(rate * 100).toFixed(1)}% success rate)`);
      }
    });

    return insights;
  }

  /**
   * Get recent feedback history
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} - Recent feedback entries
   */
  getRecentFeedback(limit = 50) {
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