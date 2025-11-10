import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { EventBus } from '../lib/event-bus.js';
import { MetricsCollector } from '../lib/metrics-collector.js';
import { BadgeSystem } from '../lib/badge-system.js';

const app = express();
const eventBus = new EventBus();
const metricsCollector = new MetricsCollector();
const badgeSystem = new BadgeSystem();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Register with event bus
await eventBus.initialize();

// Subscribe to relevant events
eventBus.subscribe('learning.*', (event) => {
  const metadata = {
    duration: event.metadata?.duration || 0,
    score: event.metadata?.score,
    topic: event.metadata?.topic,
  };

  metricsCollector.trackEngagement(event.userId, 'learning', metadata);

  if (event.metadata?.score !== undefined) {
    metricsCollector.trackProgress(event.userId, 'assessment_score', event.metadata.score);
  }
});

eventBus.subscribe('training.*', (event) => {
  const metadata = {
    duration: event.metadata?.duration || 0,
    sessionType: event.metadata?.sessionType,
  };

  metricsCollector.trackEngagement(event.userId, 'training', metadata);
});

// Metrics endpoints
app.get('/api/v1/metrics/user/:userId', (req, res) => {
  const { userId } = req.params;
  const { timeframe } = req.query;

  const metrics = metricsCollector.getUserMetrics(userId, timeframe || 'all');

  if (!metrics) {
    return res.status(404).json({ error: 'User metrics not found' });
  }

  res.json(metrics);
});

app.get('/api/v1/metrics/engagement/:userId', (req, res) => {
  const { userId } = req.params;
  const score = metricsCollector.getEngagementScore(userId);

  res.json({ userId, engagementScore: score });
});

app.get('/api/v1/metrics/progress/:userId', (req, res) => {
  const { userId } = req.params;
  const progress = metricsCollector.getProgressMetrics(userId);

  res.json({ userId, progress });
});

app.get('/api/v1/metrics/learning-path/:userId', (req, res) => {
  const { userId } = req.params;
  const path = metricsCollector.getLearningPath(userId);

  res.json(path);
});

app.get('/api/v1/metrics/trend/:userId', (req, res) => {
  const { userId } = req.params;
  const { metric, days } = req.query;

  const trend = metricsCollector.getMetricsTrend(userId, metric || 'sessions', parseInt(days) || 30);

  res.json(trend);
});

app.get('/api/v1/metrics/global', (req, res) => {
  const { timeframe } = req.query;
  const metrics = metricsCollector.getGlobalMetrics(timeframe || 'week');

  res.json(metrics);
});

app.get('/api/v1/metrics/top-performers', (req, res) => {
  const { limit } = req.query;
  const performers = metricsCollector.getTopPerformers(parseInt(limit) || 10);

  res.json({ topPerformers: performers });
});

// Badge endpoints
app.get('/api/v1/badges/user/:userId', (req, res) => {
  const { userId } = req.params;
  const badges = badgeSystem.getUserBadges(userId);

  res.json({ userId, badges, totalCount: badges.length, totalPoints: badgeSystem.getUserTotalPoints(userId) });
});

app.get('/api/v1/badges/:badgeId', (req, res) => {
  const { badgeId } = req.params;
  const stats = badgeSystem.getBadgeStats(badgeId);

  if (!stats) {
    return res.status(404).json({ error: 'Badge not found' });
  }

  res.json(stats);
});

app.post('/api/v1/badges/award', (req, res) => {
  const { userId, badgeId } = req.body;

  if (!userId || !badgeId) {
    return res.status(400).json({ error: 'userId and badgeId required' });
  }

  const badge = badgeSystem.awardBadge(userId, badgeId);

  if (!badge) {
    return res.status(400).json({ error: 'Badge already awarded or not found' });
  }

  eventBus.emit({
    type: 'achievement.badge_awarded',
    userId,
    metadata: { badgeId, badgeName: badge.name, points: badge.points },
  });

  res.json(badge);
});

app.get('/api/v1/badges/check-eligibility/:userId', (req, res) => {
  const { userId } = req.params;
  const metrics = metricsCollector.getUserMetrics(userId);
  const engagementScore = metricsCollector.getEngagementScore(userId);

  if (!metrics) {
    return res.status(404).json({ error: 'User metrics not found' });
  }

  const eligible = badgeSystem.checkEligibility(userId, metrics, engagementScore);

  res.json({ userId, eligibleBadges: eligible });
});

app.get('/api/v1/badges/most-awarded', (req, res) => {
  const { limit } = req.query;
  const badges = badgeSystem.getMostAwardedBadges(parseInt(limit) || 5);

  res.json({ mostAwarded: badges });
});

app.get('/api/v1/badges/leaderboard', (req, res) => {
  const { limit } = req.query;
  const leaderboard = badgeSystem.getGlobalLeaderboard(parseInt(limit) || 10);

  res.json({ leaderboard });
});

app.get('/api/v1/badges/rarity-distribution', (req, res) => {
  const distribution = badgeSystem.getRarityDistribution();

  res.json({ rarityDistribution: distribution });
});

// Analytics endpoints
app.get('/api/v1/analytics/summary/:userId', (req, res) => {
  const { userId } = req.params;
  const metrics = metricsCollector.getUserMetrics(userId);
  const badges = badgeSystem.getUserBadges(userId);
  const engagementScore = metricsCollector.getEngagementScore(userId);

  if (!metrics) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    userId,
    metrics,
    badges,
    engagementScore,
    totalPoints: badgeSystem.getUserTotalPoints(userId),
  });
});

app.get('/api/v1/analytics/dashboard', (req, res) => {
  const globalMetrics = metricsCollector.getGlobalMetrics('week');
  const topPerformers = metricsCollector.getTopPerformers(5);
  const mostAwardedBadges = badgeSystem.getMostAwardedBadges(5);
  const leaderboard = badgeSystem.getGlobalLeaderboard(10);

  res.json({
    globalMetrics,
    topPerformers,
    mostAwardedBadges,
    leaderboard,
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'analytics-service', timestamp: new Date().toISOString() });
});

// System status
app.get('/api/v1/system/status', (req, res) => {
  res.json({
    service: 'analytics-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
const handleShutdown = async () => {
  console.log('Analytics Service: Shutting down gracefully...');
  process.exit(0);
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

const PORT = process.env.ANALYTICS_PORT || 3300;
app.listen(PORT, () => {
  console.log(`Analytics Service listening on port ${PORT}`);
});

export default app;
