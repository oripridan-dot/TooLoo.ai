/**
 * Performance Metrics Service - Track algorithm and response effectiveness
 * Measures response quality, accuracy, latency, and user satisfaction
 */

import fs from 'fs';
import path from 'path';

class PerformanceMetricsService {
  constructor(dataDir = './data/metrics') {
    this.dataDir = dataDir;
    this.ensureDirExists(dataDir);
    this.metrics = {
      responses: [],
      providers: {},
      models: {},
      aggregations: {}
    };
    this.loadMetrics();
  }

  ensureDirExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Record a response and its metrics
   */
  recordResponse(data) {
    const {
      query,
      response,
      provider,
      model,
      responseTime,
      tokensUsed,
      userRating,
      feedbackText,
      accuracy,
      relevance,
      usability,
      timestamp = Date.now()
    } = data;

    const metric = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      query,
      response: response.substring(0, 500), // Store truncated response
      provider,
      model,
      responseTime,
      tokensUsed,
      userRating,
      feedbackText,
      accuracy: accuracy || null,
      relevance: relevance || null,
      usability: usability || null,
      timestamp
    };

    this.metrics.responses.push(metric);

    // Update provider metrics
    this.updateProviderMetrics(provider, metric);

    // Update model metrics
    this.updateModelMetrics(model, metric);

    // Save to disk
    this.saveMetrics();

    return metric.id;
  }

  /**
   * Update provider-level metrics
   */
  updateProviderMetrics(provider, metric) {
    if (!this.metrics.providers[provider]) {
      this.metrics.providers[provider] = {
        responseCount: 0,
        averageTime: 0,
        averageRating: 0,
        accuracy: 0,
        relevance: 0,
        usability: 0
      };
    }

    const stats = this.metrics.providers[provider];
    const n = stats.responseCount;

    stats.responseCount++;
    stats.averageTime = (stats.averageTime * n + metric.responseTime) / stats.responseCount;
    
    if (metric.userRating) {
      stats.averageRating = (stats.averageRating * n + metric.userRating) / stats.responseCount;
    }
    if (metric.accuracy) {
      stats.accuracy = (stats.accuracy * n + metric.accuracy) / stats.responseCount;
    }
    if (metric.relevance) {
      stats.relevance = (stats.relevance * n + metric.relevance) / stats.responseCount;
    }
    if (metric.usability) {
      stats.usability = (stats.usability * n + metric.usability) / stats.responseCount;
    }
  }

  /**
   * Update model-level metrics
   */
  updateModelMetrics(model, metric) {
    if (!this.metrics.models[model]) {
      this.metrics.models[model] = {
        responseCount: 0,
        averageTime: 0,
        averageRating: 0,
        totalTokens: 0
      };
    }

    const stats = this.metrics.models[model];
    const n = stats.responseCount;

    stats.responseCount++;
    stats.averageTime = (stats.averageTime * n + metric.responseTime) / stats.responseCount;
    
    if (metric.userRating) {
      stats.averageRating = (stats.averageRating * n + metric.userRating) / stats.responseCount;
    }
    if (metric.tokensUsed) {
      stats.totalTokens += metric.tokensUsed;
    }
  }

  /**
   * Get provider performance ranking
   */
  getProviderRanking() {
    return Object.entries(this.metrics.providers)
      .map(([provider, stats]) => ({
        provider,
        responseCount: stats.responseCount,
        averageTime: Math.round(stats.averageTime),
        averageRating: parseFloat(stats.averageRating.toFixed(2)),
        accuracy: parseFloat(stats.accuracy.toFixed(3)),
        relevance: parseFloat(stats.relevance.toFixed(3)),
        usability: parseFloat(stats.usability.toFixed(3)),
        score: (
          (stats.averageRating * 0.4) +
          (stats.accuracy * 0.2) +
          (stats.relevance * 0.2) +
          (stats.usability * 0.2)
        ).toFixed(2)
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Get model performance ranking
   */
  getModelRanking() {
    return Object.entries(this.metrics.models)
      .map(([model, stats]) => ({
        model,
        responseCount: stats.responseCount,
        averageTime: Math.round(stats.averageTime),
        averageRating: parseFloat(stats.averageRating.toFixed(2)),
        tokensPerResponse: Math.round(stats.totalTokens / Math.max(1, stats.responseCount)),
        efficiency: (
          stats.averageRating / (Math.max(stats.averageTime, 100) / 1000)
        ).toFixed(2)
      }))
      .sort((a, b) => b.efficiency - a.efficiency);
  }

  /**
   * Get aggregation metrics (multi-provider responses)
   */
  getAggregationMetrics() {
    const multiProvider = this.metrics.responses
      .filter(r => r.provider === 'aggregation')
      .slice(-100);

    if (multiProvider.length === 0) {
      return null;
    }

    const ratings = multiProvider.filter(r => r.userRating).map(r => r.userRating);
    const times = multiProvider.map(r => r.responseTime);

    return {
      count: multiProvider.length,
      averageRating: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2),
      averageTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      consensusQuality: (ratings.length / multiProvider.length * 100).toFixed(1)
    };
  }

  /**
   * Get recent performance trends
   */
  getPerformanceTrends(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const recent = this.metrics.responses.filter(r => r.timestamp > cutoff);

    if (recent.length === 0) {
      return {};
    }

    // Group by provider
    const byProvider = {};
    recent.forEach(r => {
      if (!byProvider[r.provider]) {
        byProvider[r.provider] = [];
      }
      byProvider[r.provider].push(r);
    });

    // Calculate trend for each provider
    const trends = {};
    Object.entries(byProvider).forEach(([provider, responses]) => {
      const ratings = responses.filter(r => r.userRating).map(r => r.userRating);
      if (ratings.length > 0) {
        trends[provider] = {
          count: responses.length,
          avgRating: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2),
          avgTime: Math.round(responses.reduce((a, b) => a + b.responseTime, 0) / responses.length)
        };
      }
    });

    return trends;
  }

  /**
   * Get comprehensive dashboard data
   */
  getDashboardData() {
    return {
      summary: {
        totalResponses: this.metrics.responses.length,
        uniqueProviders: Object.keys(this.metrics.providers).length,
        uniqueModels: Object.keys(this.metrics.models).length,
        averageRating: this.calculateOverallRating()
      },
      providers: this.getProviderRanking(),
      models: this.getModelRanking(),
      aggregation: this.getAggregationMetrics(),
      trends: this.getPerformanceTrends(24),
      lastUpdated: Date.now()
    };
  }

  /**
   * Calculate overall rating across all responses
   */
  calculateOverallRating() {
    const rated = this.metrics.responses.filter(r => r.userRating);
    if (rated.length === 0) return 0;
    return (rated.reduce((a, b) => a + b.userRating, 0) / rated.length).toFixed(2);
  }

  /**
   * Identify best performing provider for a query type
   */
  getBestProviderForQueryType(queryType) {
    // This would benefit from ML classification, but for now use keyword matching
    const ranked = this.getProviderRanking();
    
    // Filter by query type (simplified - in production would use ML)
    return ranked[0] || { provider: 'claude' };
  }

  /**
   * Save metrics to disk
   */
  saveMetrics() {
    const filePath = path.join(this.dataDir, 'metrics.json');
    fs.writeFileSync(filePath, JSON.stringify(this.metrics, null, 2));
  }

  /**
   * Load metrics from disk
   */
  loadMetrics() {
    const filePath = path.join(this.dataDir, 'metrics.json');
    try {
      if (fs.existsSync(filePath)) {
        this.metrics = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (err) {
      console.warn('Could not load metrics:', err.message);
    }
  }

  /**
   * Clear old metrics (keep last 1000 responses)
   */
  pruneOldMetrics() {
    const maxResponses = 1000;
    if (this.metrics.responses.length > maxResponses) {
      this.metrics.responses = this.metrics.responses.slice(-maxResponses);
      this.saveMetrics();
    }
  }
}

export default PerformanceMetricsService;
