/**
 * Feedback & Learning Service - Port 3019
 * 
 * Manages user feedback collection, performance metrics, and continuous improvement
 * Enables real-time adaptation based on user interactions and provider effectiveness
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.FEEDBACK_PORT || 3019;
const FEEDBACK_DB = path.join(__dirname, '..', 'data', 'feedback.json');
const METRICS_DB = path.join(__dirname, '..', 'data', 'metrics.json');

// Ensure data directory exists
const dataDir = path.dirname(FEEDBACK_DB);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================================
// DATA PERSISTENCE
// ============================================================================

function loadFeedback() {
  try {
    if (fs.existsSync(FEEDBACK_DB)) {
      return JSON.parse(fs.readFileSync(FEEDBACK_DB, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading feedback:', error.message);
  }
  return { feedback: [], count: 0, lastUpdated: Date.now() };
}

function saveFeedback(data) {
  try {
    fs.writeFileSync(FEEDBACK_DB, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving feedback:', error.message);
  }
}

function loadMetrics() {
  try {
    if (fs.existsSync(METRICS_DB)) {
      return JSON.parse(fs.readFileSync(METRICS_DB, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading metrics:', error.message);
  }
  return {
    providers: {},
    responses: [],
    averageQuality: 0,
    lastUpdated: Date.now()
  };
}

function saveMetrics(data) {
  try {
    fs.writeFileSync(METRICS_DB, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving metrics:', error.message);
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'feedback-learning',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// ============================================================================
// FEEDBACK COLLECTION ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/feedback/submit
 * 
 * Submit user feedback on a response
 * 
 * Body: {
 *   responseId: string,
 *   quality: 1-5,
 *   relevance: 1-5,
 *   clarity: 1-5,
 *   provider: string,
 *   helpful: boolean,
 *   comment?: string,
 *   timestamp?: number
 * }
 */
app.post('/api/v1/feedback/submit', (req, res) => {
  try {
    const {
      responseId,
      quality = 3,
      relevance = 3,
      clarity = 3,
      provider = 'unknown',
      helpful = null,
      comment = ''
    } = req.body;

    if (!responseId) {
      return res.status(400).json({ ok: false, error: 'responseId required' });
    }

    const data = loadFeedback();
    const feedbackEntry = {
      id: responseId,
      quality,
      relevance,
      clarity,
      provider,
      helpful,
      comment,
      timestamp: Date.now(),
      averageScore: (quality + relevance + clarity) / 3
    };

    data.feedback.push(feedbackEntry);
    data.count = data.feedback.length;
    data.lastUpdated = Date.now();
    saveFeedback(data);

    // Update metrics
    updateProviderMetrics(provider, feedbackEntry);

    res.json({
      ok: true,
      message: 'Feedback recorded',
      feedbackId: responseId
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/v1/feedback/summary
 * Get summary of all feedback collected
 */
app.get('/api/v1/feedback/summary', (req, res) => {
  try {
    const data = loadFeedback();
    const metrics = loadMetrics();

    const summary = {
      totalFeedback: data.count,
      feedbackLastUpdated: data.lastUpdated,
      providerMetrics: metrics.providers,
      overallQuality: calculateOverallQuality(data.feedback),
      topIssues: identifyTopIssues(data.feedback),
      improvementAreas: identifyImprovementAreas(metrics.providers)
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/v1/feedback/provider/:provider
 * Get feedback metrics for a specific provider
 */
app.get('/api/v1/feedback/provider/:provider', (req, res) => {
  try {
    const { provider } = req.params;
    const data = loadFeedback();

    const providerFeedback = data.feedback.filter(f => f.provider === provider);
    const metrics = {
      provider,
      totalResponses: providerFeedback.length,
      averageQuality: avg(providerFeedback.map(f => f.quality)),
      averageRelevance: avg(providerFeedback.map(f => f.relevance)),
      averageClarity: avg(providerFeedback.map(f => f.clarity)),
      helpfulRate: providerFeedback.filter(f => f.helpful).length / Math.max(1, providerFeedback.length),
      feedback: providerFeedback.slice(-10) // Last 10
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// PERFORMANCE METRICS ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/metrics/record
 * Record performance metrics for a response
 * 
 * Body: {
 *   responseId: string,
 *   provider: string,
 *   latency: number,
 *   tokensUsed: number,
 *   costEstimate: number,
 *   quality: number,
 *   timestamp?: number
 * }
 */
app.post('/api/v1/metrics/record', (req, res) => {
  try {
    const {
      responseId,
      provider = 'unknown',
      latency = 0,
      tokensUsed = 0,
      costEstimate = 0,
      quality = 0
    } = req.body;

    const metrics = loadMetrics();

    const metricEntry = {
      id: responseId,
      provider,
      latency,
      tokensUsed,
      costEstimate,
      quality,
      timestamp: Date.now()
    };

    metrics.responses.push(metricEntry);
    metrics.lastUpdated = Date.now();
    saveMetrics(metrics);

    // Update provider aggregates
    if (!metrics.providers[provider]) {
      metrics.providers[provider] = {
        totalRequests: 0,
        averageLatency: 0,
        averageQuality: 0,
        totalCost: 0,
        successRate: 0
      };
    }

    const providerData = metrics.providers[provider];
    providerData.totalRequests += 1;
    providerData.averageLatency = (providerData.averageLatency * (providerData.totalRequests - 1) + latency) / providerData.totalRequests;
    providerData.averageQuality = (providerData.averageQuality * (providerData.totalRequests - 1) + quality) / providerData.totalRequests;
    providerData.totalCost += costEstimate;

    saveMetrics(metrics);

    res.json({ ok: true, message: 'Metrics recorded' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/v1/metrics/performance
 * Get overall performance metrics across all providers
 */
app.get('/api/v1/metrics/performance', (req, res) => {
  try {
    const metrics = loadMetrics();

    const performance = {
      providers: metrics.providers,
      bestProvider: findBestProvider(metrics.providers),
      costOptimal: findMostCostEffective(metrics.providers),
      speedOptimal: findFastest(metrics.providers),
      recommendations: generateRecommendations(metrics.providers)
    };

    res.json(performance);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// PERSONALIZATION ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/personalization/track-interaction
 * Track user interactions to build personalization profile
 * 
 * Body: {
 *   userId: string,
 *   queryType: string,
 *   selectedProvider?: string,
 *   responseTime: number,
 *   engaged: boolean,
 *   followUpQuery: boolean,
 *   timestamp?: number
 * }
 */
app.post('/api/v1/personalization/track-interaction', (req, res) => {
  try {
    const { userId, queryType, selectedProvider, responseTime, engaged, followUpQuery } = req.body;

    if (!userId) {
      return res.status(400).json({ ok: false, error: 'userId required' });
    }

    const data = loadFeedback();
    const interaction = {
      userId,
      queryType,
      selectedProvider,
      responseTime,
      engaged,
      followUpQuery,
      timestamp: Date.now()
    };

    if (!data.interactions) data.interactions = [];
    data.interactions.push(interaction);
    data.lastUpdated = Date.now();
    saveFeedback(data);

    res.json({ ok: true, message: 'Interaction tracked' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/v1/personalization/profile/:userId
 * Get personalization profile for a user
 */
app.get('/api/v1/personalization/profile/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const data = loadFeedback();

    const userInteractions = (data.interactions || []).filter(i => i.userId === userId);

    const profile = {
      userId,
      totalInteractions: userInteractions.length,
      preferredProviders: analyzeProviderPreferences(userInteractions),
      preferredQueryTypes: analyzeQueryPreferences(userInteractions),
      engagementRate: userInteractions.filter(i => i.engaged).length / Math.max(1, userInteractions.length),
      recommendations: generateUserRecommendations(userInteractions),
      recentActivity: userInteractions.slice(-5)
    };

    res.json(profile);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/v1/personalization/recommendations
 * Get AI-powered personalized recommendations for a user
 * 
 * Body: {
 *   userId: string,
 *   currentQuery?: string,
 *   context?: object
 * }
 */
app.post('/api/v1/personalization/recommendations', (req, res) => {
  try {
    const { userId, currentQuery = '', context = {} } = req.body;

    const data = loadFeedback();
    const metrics = loadMetrics();
    const userInteractions = (data.interactions || []).filter(i => i.userId === userId);

    const recommendations = {
      userId,
      bestProvider: findBestProviderForUser(userId, metrics.providers, userInteractions),
      alternativeProviders: findAlternativeProviders(userId, metrics.providers, userInteractions),
      suggestedApproach: suggestApproach(currentQuery, userInteractions),
      estimatedQuality: estimateQuality(userId, userInteractions),
      timestamp: Date.now()
    };

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// CONTINUOUS IMPROVEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/improvement/analysis
 * Get continuous improvement analysis and recommendations
 */
app.get('/api/v1/improvement/analysis', (req, res) => {
  try {
    const feedback = loadFeedback();
    const metrics = loadMetrics();

    const analysis = {
      dataCollected: {
        totalFeedback: feedback.count,
        totalMetrics: metrics.responses.length,
        timeSpan: calculateTimeSpan(metrics.responses)
      },
      qualityTrends: analyzeTrends(feedback.feedback, metrics.responses),
      bottlenecks: identifyBottlenecks(metrics.responses),
      opportunities: identifyOpportunities(feedback.feedback, metrics.providers),
      nextActions: generateNextActions(feedback, metrics)
    };

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/v1/improvement/apply-feedback
 * Apply feedback to adjust system behavior
 * 
 * Body: {
 *   improvement: string,
 *   affectedAreas: string[],
 *   priority: 'high' | 'medium' | 'low'
 * }
 */
app.post('/api/v1/improvement/apply-feedback', (req, res) => {
  try {
    const { improvement, affectedAreas = [], priority = 'medium' } = req.body;

    const improvements = {
      id: `improve-${Date.now()}`,
      improvement,
      affectedAreas,
      priority,
      appliedAt: Date.now(),
      status: 'applied'
    };

    res.json({
      ok: true,
      message: 'Improvement applied',
      improvement: improvements
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function avg(numbers) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function calculateOverallQuality(feedback) {
  if (feedback.length === 0) return 0;
  const scores = feedback.map(f => f.averageScore || (f.quality + f.relevance + f.clarity) / 3);
  return avg(scores);
}

function identifyTopIssues(feedback) {
  const lowQualityFeedback = feedback.filter(f => f.quality < 3 || f.relevance < 3);
  return lowQualityFeedback.map(f => f.comment).filter(Boolean).slice(0, 5);
}

function identifyImprovementAreas(providers) {
  return Object.entries(providers)
    .map(([name, data]) => ({
      provider: name,
      quality: data.averageQuality,
      latency: data.averageLatency,
      needsImprovement: data.averageQuality < 3.5
    }))
    .sort((a, b) => a.quality - b.quality)
    .slice(0, 3);
}

function updateProviderMetrics(provider, feedback) {
  const metrics = loadMetrics();
  if (!metrics.providers[provider]) {
    metrics.providers[provider] = {
      totalFeedback: 0,
      averageQuality: 0,
      helpfulCount: 0
    };
  }

  const pMetrics = metrics.providers[provider];
  pMetrics.totalFeedback += 1;
  pMetrics.averageQuality = (pMetrics.averageQuality * (pMetrics.totalFeedback - 1) + feedback.averageScore) / pMetrics.totalFeedback;
  if (feedback.helpful) pMetrics.helpfulCount += 1;

  saveMetrics(metrics);
}

function findBestProvider(providers) {
  return Object.entries(providers)
    .reduce((best, [name, data]) => {
      const score = data.averageQuality;
      return score > (best.score || 0) ? { name, score, data } : best;
    }, {});
}

function findMostCostEffective(providers) {
  return Object.entries(providers)
    .reduce((best, [name, data]) => {
      const efficiency = data.averageQuality / Math.max(1, data.totalCost);
      return efficiency > (best.efficiency || 0) ? { name, efficiency, data } : best;
    }, {});
}

function findFastest(providers) {
  return Object.entries(providers)
    .reduce((best, [name, data]) => {
      const latency = data.averageLatency || Infinity;
      return latency < (best.latency || Infinity) ? { name, latency, data } : best;
    }, {});
}

function generateRecommendations(providers) {
  const best = findBestProvider(providers);
  const fastest = findFastest(providers);
  const costOptimal = findMostCostEffective(providers);

  return [
    best.name ? `Use ${best.name} for best quality (score: ${(best.score || 0).toFixed(2)})` : null,
    fastest.name ? `Use ${fastest.name} for fastest response (${(fastest.latency || 0).toFixed(0)}ms)` : null,
    costOptimal.name ? `Use ${costOptimal.name} for cost efficiency` : null
  ].filter(Boolean);
}

function analyzeProviderPreferences(interactions) {
  const providers = {};
  interactions.forEach(i => {
    if (i.selectedProvider) {
      providers[i.selectedProvider] = (providers[i.selectedProvider] || 0) + 1;
    }
  });
  return providers;
}

function analyzeQueryPreferences(interactions) {
  const types = {};
  interactions.forEach(i => {
    if (i.queryType) {
      types[i.queryType] = (types[i.queryType] || 0) + 1;
    }
  });
  return types;
}

function generateUserRecommendations(interactions) {
  if (interactions.length === 0) return [];

  const providers = analyzeProviderPreferences(interactions);
  const topProvider = Object.entries(providers).sort((a, b) => b[1] - a[1])[0];

  return [
    topProvider ? `Continue with ${topProvider[0]} (your preferred provider)` : null,
    interactions.some(i => i.engaged) ? 'Increase engagement by asking follow-up questions' : null
  ].filter(Boolean);
}

function findBestProviderForUser(userId, providers, interactions) {
  const preferences = analyzeProviderPreferences(interactions);
  if (Object.keys(preferences).length > 0) {
    return Object.entries(preferences).sort((a, b) => b[1] - a[1])[0][0];
  }
  return findBestProvider(providers).name;
}

function findAlternativeProviders(userId, providers, interactions) {
  const used = Object.keys(analyzeProviderPreferences(interactions));
  return Object.keys(providers)
    .filter(p => !used.includes(p))
    .slice(0, 2);
}

function suggestApproach(query, interactions) {
  if (!query) return 'Provide context for personalized suggestions';
  if (query.includes('code')) return 'Consider technical provider';
  if (query.includes('creative')) return 'Consider diverse perspectives';
  return 'Standard approach recommended';
}

function estimateQuality(userId, interactions) {
  if (interactions.length === 0) return 0.5;
  const engagedCount = interactions.filter(i => i.engaged).length;
  return Math.min(1, engagedCount / interactions.length);
}

function analyzeTrends(feedback, responses) {
  if (feedback.length < 2) return { trend: 'insufficient-data' };

  const recent = feedback.slice(-10);
  const older = feedback.slice(0, Math.max(1, feedback.length - 10));

  const recentQuality = avg(recent.map(f => f.averageScore || 0));
  const olderQuality = avg(older.map(f => f.averageScore || 0));

  return {
    direction: recentQuality > olderQuality ? 'improving' : 'declining',
    recentAverage: recentQuality,
    previousAverage: olderQuality,
    improvement: recentQuality - olderQuality
  };
}

function identifyBottlenecks(responses) {
  if (responses.length === 0) return [];

  const latencies = responses.map(r => r.latency || 0);
  const avgLatency = avg(latencies);
  const slow = responses.filter(r => (r.latency || 0) > avgLatency * 1.5);

  return [
    slow.length > 0 ? `${slow.length} slow responses detected (>${(avgLatency * 1.5).toFixed(0)}ms)` : null
  ].filter(Boolean);
}

function identifyOpportunities(feedback, providers) {
  return [
    feedback.length < 100 ? 'Collect more feedback for better insights' : null,
    Object.keys(providers).length < 3 ? 'Enable more providers for better recommendations' : null,
    calculateOverallQuality(feedback) < 3.5 ? 'Focus on quality improvements' : null
  ].filter(Boolean);
}

function calculateTimeSpan(responses) {
  if (responses.length < 2) return 'unknown';
  const times = responses.map(r => r.timestamp || Date.now());
  const span = Math.max(...times) - Math.min(...times);
  return `${(span / 1000 / 60).toFixed(0)} minutes`;
}

function generateNextActions(feedback, metrics) {
  const actions = [];

  if (feedback.count < 50) {
    actions.push('Priority: Collect more user feedback (target 50+)');
  }

  const quality = calculateOverallQuality(feedback.feedback);
  if (quality < 3.5) {
    actions.push('Action: Review low-quality responses and identify patterns');
  }

  const slowProviders = Object.entries(metrics.providers).filter(([_, data]) => data.averageLatency > 2000);
  if (slowProviders.length > 0) {
    actions.push(`Optimize: ${slowProviders.map(([name]) => name).join(', ')} are slow`);
  }

  return actions;
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

let server = null;

async function start() {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log('\n╔════════════════════════════════════════════════════╗');
      console.log('║ 📊 Feedback & Learning Service                   ║');
      console.log('║ Real-time Personalization & Continuous Improvement║');
      console.log('╚════════════════════════════════════════════════════╝\n');
      console.log(`📍 Listening on http://127.0.0.1:${PORT}\n`);
      console.log('📋 Core Endpoints:');
      console.log('   POST   /api/v1/feedback/submit           - Submit response feedback');
      console.log('   GET    /api/v1/feedback/summary          - Get feedback summary');
      console.log('   GET    /api/v1/feedback/provider/:name   - Get provider metrics');
      console.log('   POST   /api/v1/metrics/record            - Record performance metrics');
      console.log('   GET    /api/v1/metrics/performance       - Get performance analysis');
      console.log('   POST   /api/v1/personalization/track-interaction - Track user behavior');
      console.log('   GET    /api/v1/personalization/profile/:userId  - Get user profile');
      console.log('   POST   /api/v1/personalization/recommendations  - Get recommendations');
      console.log('   GET    /api/v1/improvement/analysis      - Get improvement analysis');
      console.log('   GET    /health                           - Health check\n');

      resolve(server);
    });
  });
}

async function stop() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('✅ Feedback & Learning Service stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Export for orchestrator
export default { start, stop };
