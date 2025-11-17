#!/usr/bin/env node

/**
 * Provider Performance Scorecard Module
 * Extends reports-server with detailed provider metrics and leaderboard
 * 
 * Exports:
 * - ProviderScorecard class
 * - setupScorecardRoutes() - Mount routes on an Express app
 */

import fetch from 'node-fetch';
import { PersistentCache } from '../lib/persistent-cache.js';

export class ProviderScorecard {
  constructor(options = {}) {
    this.cache = new PersistentCache({ ttl: options.cacheTtl || 60000 });
    this.metrics = new Map();
    this.history = [];
    this.maxHistory = options.maxHistory || 1000;
  }

  /**
   * Fetch provider metrics from budget service
   */
  async collectProviderMetrics() {
    try {
      const response = await fetch('http://127.0.0.1:3003/api/v1/providers/status', {
        timeout: 5000
      });

      if (!response.ok) throw new Error(`Budget service returned ${response.status}`);

      const data = await response.json();
      return data.providers || [];
    } catch (error) {
      console.error('Failed to collect provider metrics:', error);
      return [];
    }
  }

  /**
   * Calculate provider scores based on multiple metrics
   */
  calculateScores(providers) {
    return providers.map((p) => {
      // Weighted scoring: latency (40%), success (40%), cost (20%)
      const latencyScore = Math.max(0, 100 - (p.avgLatency || 0) / 10); // 1s = 10 pts
      const successScore = (p.successRate || 0) * 100;
      const costScore = Math.max(0, 100 - ((p.costPer1kTokens || 0) * 10)); // Higher cost = lower score

      const overallScore = (
        latencyScore * 0.4 +
        successScore * 0.4 +
        costScore * 0.2
      );

      return {
        ...p,
        scores: {
          latency: Math.round(latencyScore),
          success: Math.round(successScore),
          cost: Math.round(costScore),
          overall: Math.round(overallScore)
        }
      };
    });
  }

  /**
   * Generate leaderboard
   */
  async getLeaderboard(limit = 10) {
    const cached = this.cache.get('provider-leaderboard');
    if (cached) return cached;

    try {
      const providers = await this.collectProviderMetrics();
      const scored = this.calculateScores(providers);
      
      const leaderboard = scored
        .sort((a, b) => (b.scores?.overall || 0) - (a.scores?.overall || 0))
        .slice(0, limit)
        .map((p, i) => ({
          rank: i + 1,
          name: p.name,
          status: p.status,
          scores: p.scores,
          metrics: {
            avgLatency: p.avgLatency || 0,
            successRate: p.successRate || 0,
            costPer1kTokens: p.costPer1kTokens || 0,
            requestsProcessed: p.requestsProcessed || 0,
            tokensProcessed: p.tokensProcessed || 0
          }
        }));

      this.cache.set('provider-leaderboard', leaderboard);
      
      // Add to history
      this.history.push({
        timestamp: new Date().toISOString(),
        leaderboard: leaderboard
      });
      
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }

      return leaderboard;
    } catch (error) {
      console.error('Failed to generate leaderboard:', error);
      return [];
    }
  }

  /**
   * Get provider comparison
   */
  async compareProviders(providerNames) {
    try {
      const providers = await this.collectProviderMetrics();
      const scored = this.calculateScores(providers);

      const comparison = scored
        .filter(p => providerNames.includes(p.name))
        .map(p => ({
          name: p.name,
          status: p.status,
          scores: p.scores,
          metrics: {
            avgLatency: p.avgLatency,
            successRate: p.successRate,
            costPer1kTokens: p.costPer1kTokens,
            requestsProcessed: p.requestsProcessed
          }
        }));

      return comparison;
    } catch (error) {
      console.error('Provider comparison error:', error);
      return [];
    }
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(limit = 10) {
    return this.history.slice(-limit).map(h => ({
      timestamp: h.timestamp,
      topProvider: h.leaderboard[0] || null,
      averageScore: h.leaderboard.length > 0
        ? Math.round(
          h.leaderboard.reduce((sum, p) => sum + (p.scores?.overall || 0), 0) /
            h.leaderboard.length
        )
        : 0
    }));
  }

  /**
   * Get provider insights
   */
  async getInsights() {
    const leaderboard = await this.getLeaderboard();
    const trends = this.getPerformanceTrends(20);

    if (leaderboard.length === 0) {
      return { insights: [] };
    }

    const insights = [];

    // Top performer
    const top = leaderboard[0];
    insights.push({
      type: 'top-performer',
      provider: top.name,
      message: `${top.name} is the top-performing provider with a score of ${top.scores.overall}/100`,
      metrics: top.metrics
    });

    // Consistency check
    if (trends.length > 0) {
      const lastTrend = trends[trends.length - 1];
      const prevTrend = trends[trends.length - 2];

      if (prevTrend && lastTrend.averageScore < prevTrend.averageScore) {
        insights.push({
          type: 'performance-decline',
          message: 'Overall provider performance has declined. Consider rotating providers or investigating issues.'
        });
      }
    }

    // Cost analysis
    const lowCost = leaderboard.find(p => p.metrics.costPer1kTokens < 0.05);
    if (lowCost) {
      insights.push({
        type: 'cost-leader',
        provider: lowCost.name,
        message: `${lowCost.name} offers the lowest cost at $${lowCost.metrics.costPer1kTokens.toFixed(4)}/1k tokens`
      });
    }

    // Reliability analysis
    const reliable = leaderboard.find(p => p.metrics.successRate > 0.99);
    if (reliable) {
      insights.push({
        type: 'reliability-leader',
        provider: reliable.name,
        message: `${reliable.name} has >99% success rate (${(reliable.metrics.successRate * 100).toFixed(1)}%)`
      });
    }

    return { insights, leaderboard, trends };
  }
}

/**
 * Setup routes on an Express app
 */
export function setupScorecardRoutes(app) {
  const scorecard = new ProviderScorecard();

  /**
   * GET /api/v1/reports/provider-performance
   * Full leaderboard and metrics
   */
  app.get('/api/v1/reports/provider-performance', async (req, res) => {
    try {
      const { limit = 10, comparison, trends = false } = req.query;

      let data = {};

      if (comparison) {
        // Provider comparison
        const providers = comparison.split(',');
        data.comparison = await scorecard.compareProviders(providers);
      } else {
        // Standard leaderboard
        data.leaderboard = await scorecard.getLeaderboard(parseInt(limit));
      }

      if (trends === 'true') {
        data.trends = scorecard.getPerformanceTrends();
      }

      data.timestamp = new Date().toISOString();
      res.json(data);
    } catch (error) {
      console.error('Provider performance error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/v1/reports/provider-insights
   * AI-powered insights about provider performance
   */
  app.get('/api/v1/reports/provider-insights', async (req, res) => {
    try {
      const insights = await scorecard.getInsights();
      res.json(insights);
    } catch (error) {
      console.error('Provider insights error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/v1/reports/provider-trends
   * Performance trends over time
   */
  app.get('/api/v1/reports/provider-trends', (req, res) => {
    const { limit = 50 } = req.query;
    res.json({
      trends: scorecard.getPerformanceTrends(parseInt(limit)),
      timestamp: new Date().toISOString()
    });
  });

  return scorecard;
}

export default ProviderScorecard;
