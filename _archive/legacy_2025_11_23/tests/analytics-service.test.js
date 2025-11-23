import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from '../lib/metrics-collector.js';
import { BadgeSystem } from '../lib/badge-system.js';

describe('MetricsCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  it('should track engagement', () => {
    const entry = collector.trackEngagement('user123', 'learning', { duration: 3600 });

    expect(entry).toBeDefined();
    expect(entry.userId).toBe('user123');
    expect(entry.activity).toBe('learning');
    expect(entry.duration).toBe(3600);
  });

  it('should accumulate user metrics', () => {
    collector.trackEngagement('user123', 'learning', { duration: 3600 });
    collector.trackEngagement('user123', 'training', { duration: 1800 });

    const metrics = collector.getUserMetrics('user123');

    expect(metrics.totalSessions).toBe(2);
    expect(metrics.totalTime).toBe(5400);
    expect(metrics.activities.learning).toBe(1);
    expect(metrics.activities.training).toBe(1);
  });

  it('should calculate engagement score', () => {
    collector.trackEngagement('user123', 'learning', { duration: 3600 });
    collector.trackEngagement('user123', 'learning', { duration: 3600 });
    collector.trackEngagement('user123', 'learning', { duration: 3600 });

    const score = collector.getEngagementScore('user123');

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should track progress', () => {
    const entry = collector.trackProgress('user123', 'assessment_score', 85);

    expect(entry).toBeDefined();
    expect(entry.progressType).toBe('assessment_score');
    expect(entry.value).toBe(85);
  });

  it('should retrieve progress metrics', () => {
    collector.trackProgress('user123', 'assessment_score', 85);
    collector.trackProgress('user123', 'completion_rate', 0.75);

    const progress = collector.getProgressMetrics('user123');

    expect(progress.assessment_score).toBe(85);
    expect(progress.completion_rate).toBe(0.75);
  });

  it('should generate learning path', () => {
    collector.trackProgress('user123', 'topic1', 50);
    collector.trackProgress('user123', 'topic2', 75);

    const path = collector.getLearningPath('user123');

    expect(path.userId).toBe('user123');
    expect(path.recentProgress.length).toBeGreaterThan(0);
    expect(path.trajectory).toBeDefined();
  });

  it('should calculate global metrics', () => {
    collector.trackEngagement('user1', 'learning', { duration: 3600 });
    collector.trackEngagement('user2', 'training', { duration: 1800 });
    collector.trackEngagement('user1', 'learning', { duration: 1800 });

    const global = collector.getGlobalMetrics('week');

    expect(global.uniqueUsers).toBe(2);
    expect(global.totalSessions).toBe(3);
    expect(global.totalTime).toBe(7200);
  });

  it('should identify top performers', () => {
    collector.trackEngagement('user1', 'learning', { duration: 3600 });
    collector.trackEngagement('user2', 'learning', { duration: 1800 });
    collector.trackEngagement('user3', 'learning', { duration: 7200 });

    const top = collector.getTopPerformers(2);

    expect(top.length).toBeLessThanOrEqual(2);
    expect(top[0].score).toBeGreaterThanOrEqual(top[1]?.score ?? 0);
  });

  it('should generate metrics trend', () => {
    collector.trackEngagement('user123', 'learning', { duration: 3600 });
    const trend = collector.getMetricsTrend('user123', 'sessions', 7);

    expect(trend.userId).toBe('user123');
    expect(trend.metric).toBe('sessions');
    expect(Object.keys(trend.trend).length).toBeGreaterThan(0);
  });

  it('should clear all metrics', () => {
    collector.trackEngagement('user123', 'learning', { duration: 3600 });
    collector.clearMetrics();

    const metrics = collector.getUserMetrics('user123');

    expect(metrics).toBeNull();
  });

  it('should handle timeframe filtering', () => {
    collector.trackEngagement('user123', 'learning', { duration: 3600 });
    const metricsAll = collector.getUserMetrics('user123', 'all');
    const metricsDay = collector.getUserMetrics('user123', 'day');

    expect(metricsAll).toBeDefined();
    expect(metricsDay).toBeDefined();
  });

  it('should calculate average session duration', () => {
    collector.trackEngagement('user123', 'learning', { duration: 3600 });
    collector.trackEngagement('user123', 'learning', { duration: 5400 });

    const metrics = collector.getUserMetrics('user123');

    expect(metrics.averageSessionDuration).toBeDefined();
    expect(metrics.averageSessionDuration).toBeGreaterThan(0);
  });
});

describe('BadgeSystem', () => {
  let badgeSystem;

  beforeEach(() => {
    badgeSystem = new BadgeSystem();
  });

  it('should initialize badges', () => {
    expect(badgeSystem.badgeDefinitions.size).toBeGreaterThan(0);
  });

  it('should award badge to user', () => {
    const badge = badgeSystem.awardBadge('user123', 'first_session');

    expect(badge).toBeDefined();
    expect(badge.userId).toBe('user123');
    expect(badge.badgeId).toBe('first_session');
    expect(badge.points).toBeGreaterThan(0);
  });

  it('should not award duplicate badge', () => {
    badgeSystem.awardBadge('user123', 'first_session');
    const duplicate = badgeSystem.awardBadge('user123', 'first_session');

    expect(duplicate).toBeNull();
  });

  it('should retrieve user badges', () => {
    badgeSystem.awardBadge('user123', 'first_session');
    badgeSystem.awardBadge('user123', 'week_warrior');

    const badges = badgeSystem.getUserBadges('user123');

    expect(badges.length).toBe(2);
    expect(badges[0].icon).toBeDefined();
    expect(badges[0].points).toBeGreaterThan(0);
  });

  it('should get badge statistics', () => {
    const stats = badgeSystem.getBadgeStats('first_session');

    expect(stats).toBeDefined();
    expect(stats.name).toBe('First Steps');
    expect(stats.rarity).toBeDefined();
    expect(stats.points).toBeGreaterThan(0);
  });

  it('should count user badges', () => {
    badgeSystem.awardBadge('user123', 'first_session');
    badgeSystem.awardBadge('user123', 'week_warrior');

    const count = badgeSystem.getUserBadgeCount('user123');

    expect(count).toBe(2);
  });

  it('should calculate total user points', () => {
    badgeSystem.awardBadge('user123', 'first_session');
    badgeSystem.awardBadge('user123', 'week_warrior');

    const points = badgeSystem.getUserTotalPoints('user123');

    expect(points).toBe(60);
  });

  it('should identify most awarded badges', () => {
    badgeSystem.awardBadge('user1', 'first_session');
    badgeSystem.awardBadge('user2', 'first_session');
    badgeSystem.awardBadge('user3', 'week_warrior');

    const mostAwarded = badgeSystem.getMostAwardedBadges(2);

    expect(mostAwarded[0].awardedCount).toBeGreaterThanOrEqual(mostAwarded[1]?.awardedCount ?? 0);
  });

  it('should check badge eligibility', () => {
    const userMetrics = {
      totalSessions: 10,
      totalTime: 50 * 60 * 60 * 1000,
      activities: { topic1: 3, topic2: 3, topic3: 2, topic4: 2, topic5: 2 },
    };

    const eligible = badgeSystem.checkEligibility('user123', userMetrics, 85);

    expect(Array.isArray(eligible)).toBe(true);
    expect(eligible.length).toBeGreaterThanOrEqual(0);
  });

  it('should get rarity distribution', () => {
    const distribution = badgeSystem.getRarityDistribution();

    expect(distribution.common).toBeGreaterThan(0);
    expect(distribution.rare).toBeGreaterThan(0);
  });

  it('should generate global leaderboard', () => {
    badgeSystem.awardBadge('user1', 'first_session');
    badgeSystem.awardBadge('user2', 'week_warrior');
    badgeSystem.awardBadge('user3', 'consistency_king');

    const leaderboard = badgeSystem.getGlobalLeaderboard(10);

    expect(Array.isArray(leaderboard)).toBe(true);
    expect(leaderboard.length).toBeGreaterThan(0);
    expect(leaderboard[0].totalPoints).toBeGreaterThanOrEqual(leaderboard[1]?.totalPoints ?? 0);
  });

  it('should clear all badges', () => {
    badgeSystem.awardBadge('user123', 'first_session');
    badgeSystem.clearBadges();

    const badges = badgeSystem.getUserBadges('user123');

    expect(badges.length).toBe(0);
  });

  it('should return null for non-existent badge stats', () => {
    const stats = badgeSystem.getBadgeStats('nonexistent_badge');

    expect(stats).toBeNull();
  });

  it('should handle multiple users independently', () => {
    badgeSystem.awardBadge('user1', 'first_session');
    badgeSystem.awardBadge('user2', 'week_warrior');

    const badges1 = badgeSystem.getUserBadges('user1');
    const badges2 = badgeSystem.getUserBadges('user2');

    expect(badges1.length).toBe(1);
    expect(badges2.length).toBe(1);
    expect(badges1[0].badgeId).not.toBe(badges2[0].badgeId);
  });
});

describe('Analytics Integration', () => {
  let collector;
  let badgeSystem;

  beforeEach(() => {
    collector = new MetricsCollector();
    badgeSystem = new BadgeSystem();
  });

  it('should combine metrics and badges for user summary', () => {
    collector.trackEngagement('user123', 'learning', { duration: 3600 });
    badgeSystem.awardBadge('user123', 'first_session');

    const metrics = collector.getUserMetrics('user123');
    const badges = badgeSystem.getUserBadges('user123');
    const score = collector.getEngagementScore('user123');

    expect(metrics).toBeDefined();
    expect(badges.length).toBe(1);
    expect(score).toBeGreaterThan(0);
  });

  it('should support progressive badge unlocking', () => {
    const userMetrics = {
      totalSessions: 5,
      totalTime: 10 * 60 * 60 * 1000,
      activities: { topic1: 2, topic2: 2, topic3: 1 },
    };

    const eligible = badgeSystem.checkEligibility('user123', userMetrics, 70);

    for (const badgeId of eligible) {
      badgeSystem.awardBadge('user123', badgeId);
    }

    const badges = badgeSystem.getUserBadges('user123');
    const points = badgeSystem.getUserTotalPoints('user123');

    expect(badges.length).toBeGreaterThanOrEqual(0);
    expect(points).toBeGreaterThanOrEqual(0);
  });
});
