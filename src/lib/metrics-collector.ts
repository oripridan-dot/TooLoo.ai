import { v4 as uuidv4 } from 'uuid';

export class MetricsCollector {
  constructor() {
    this.metrics = new Map();
    this.engagementLog = [];
    this.progressLog = [];
    this.achievementLog = [];
  }

  trackEngagement(userId, activity, metadata = {}) {
    const entry = {
      id: uuidv4(),
      userId,
      activity,
      metadata,
      timestamp: Date.now(),
      duration: metadata.duration || 0,
    };

    this.engagementLog.push(entry);

    if (!this.metrics.has(userId)) {
      this.metrics.set(userId, {
        totalSessions: 0,
        totalTime: 0,
        activities: {},
        streaks: {},
        lastActive: Date.now(),
      });
    }

    const userMetrics = this.metrics.get(userId);
    userMetrics.totalSessions += 1;
    userMetrics.totalTime += entry.duration;
    userMetrics.activities[activity] = (userMetrics.activities[activity] || 0) + 1;
    userMetrics.lastActive = Date.now();

    return entry;
  }

  trackProgress(userId, progressType, value) {
    const entry = {
      id: uuidv4(),
      userId,
      progressType,
      value,
      timestamp: Date.now(),
    };

    this.progressLog.push(entry);

    if (!this.metrics.has(userId)) {
      this.metrics.set(userId, {
        totalSessions: 0,
        totalTime: 0,
        activities: {},
        streaks: {},
        lastActive: Date.now(),
      });
    }

    const userMetrics = this.metrics.get(userId);
    if (!userMetrics.progress) {
      userMetrics.progress = {};
    }
    userMetrics.progress[progressType] = value;

    return entry;
  }

  recordAchievement(userId, achievementType, details = {}) {
    const entry = {
      id: uuidv4(),
      userId,
      achievementType,
      details,
      timestamp: Date.now(),
    };

    this.achievementLog.push(entry);

    if (!this.metrics.has(userId)) {
      this.metrics.set(userId, {
        totalSessions: 0,
        totalTime: 0,
        activities: {},
        streaks: {},
        lastActive: Date.now(),
      });
    }

    return entry;
  }

  getUserMetrics(userId, timeframe = 'all') {
    const userMetrics = this.metrics.get(userId);

    if (!userMetrics) {
      return null;
    }

    const now = Date.now();
    let startTime = 0;

    if (timeframe === 'day') startTime = now - 24 * 60 * 60 * 1000;
    if (timeframe === 'week') startTime = now - 7 * 24 * 60 * 60 * 1000;
    if (timeframe === 'month') startTime = now - 30 * 24 * 60 * 60 * 1000;

    const relevantEngagement = this.engagementLog.filter(
      (e) => e.userId === userId && (timeframe === 'all' ? true : e.timestamp >= startTime)
    );

    const avgSessionDuration = relevantEngagement.length > 0 ? 
      (relevantEngagement.reduce((sum, e) => sum + e.duration, 0) / relevantEngagement.length).toFixed(1) : 
      0;

    return {
      userId,
      totalSessions: userMetrics.totalSessions,
      totalTime: userMetrics.totalTime,
      averageSessionDuration: parseFloat(avgSessionDuration),
      activities: userMetrics.activities,
      lastActive: new Date(userMetrics.lastActive).toISOString(),
      timeframe,
    };
  }

  getEngagementScore(userId) {
    const userMetrics = this.metrics.get(userId);

    if (!userMetrics) {
      return 0;
    }

    const recentEngagement = this.engagementLog
      .filter((e) => e.userId === userId && Date.now() - e.timestamp < 30 * 24 * 60 * 60 * 1000)
      .length;

    const sessionQuality = userMetrics.totalTime > 0 ? 
      Math.min(100, (userMetrics.totalSessions * (userMetrics.totalTime / userMetrics.totalSessions)) / 60) :
      0;

    const score = Math.round((recentEngagement * 10 + sessionQuality * 0.5) / 11);

    return Math.min(100, Math.max(0, score));
  }

  getProgressMetrics(userId) {
    const userMetrics = this.metrics.get(userId);

    if (!userMetrics || !userMetrics.progress) {
      return {};
    }

    return { ...userMetrics.progress };
  }

  getLearningPath(userId) {
    const recentProgress = this.progressLog
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      userId,
      recentProgress: recentProgress.map((p) => ({
        type: p.progressType,
        value: p.value,
        date: new Date(p.timestamp).toISOString(),
      })),
      trajectory: recentProgress.length > 0 ? 'progressing' : 'starting',
    };
  }

  getGlobalMetrics(timeframe = 'week') {
    const now = Date.now();
    let startTime = now - 7 * 24 * 60 * 60 * 1000;

    if (timeframe === 'day') startTime = now - 24 * 60 * 60 * 1000;
    if (timeframe === 'month') startTime = now - 30 * 24 * 60 * 60 * 1000;

    const relevantEngagement = this.engagementLog.filter((e) => e.timestamp >= startTime);

    const uniqueUsers = new Set(relevantEngagement.map((e) => e.userId)).size;
    const totalSessions = relevantEngagement.length;
    const totalTime = relevantEngagement.reduce((sum, e) => sum + e.duration, 0);

    const activityDistribution = {};
    for (const entry of relevantEngagement) {
      activityDistribution[entry.activity] = (activityDistribution[entry.activity] || 0) + 1;
    }

    return {
      timeframe,
      uniqueUsers,
      totalSessions,
      totalTime,
      avgSessionDuration: totalSessions > 0 ? (totalTime / totalSessions).toFixed(1) : 0,
      activityDistribution,
    };
  }

  getTopPerformers(limit = 10) {
    const scores = [];

    for (const [userId] of this.metrics) {
      const score = this.getEngagementScore(userId);
      scores.push({ userId, score });
    }

    return scores.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  getMetricsTrend(userId, metric, days = 30) {
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;
    const dayInMs = 24 * 60 * 60 * 1000;

    const trend = {};

    for (let i = 0; i < days; i++) {
      const dayStart = startTime + i * dayInMs;
      const dayEnd = dayStart + dayInMs;

      if (metric === 'sessions') {
        const dayEngagement = this.engagementLog.filter(
          (e) => e.userId === userId && e.timestamp >= dayStart && e.timestamp < dayEnd
        );
        trend[new Date(dayStart).toISOString().split('T')[0]] = dayEngagement.length;
      }

      if (metric === 'time') {
        const dayEngagement = this.engagementLog.filter(
          (e) => e.userId === userId && e.timestamp >= dayStart && e.timestamp < dayEnd
        );
        trend[new Date(dayStart).toISOString().split('T')[0]] = dayEngagement.reduce((sum, e) => sum + e.duration, 0);
      }
    }

    return { userId, metric, trend };
  }

  clearMetrics() {
    this.metrics.clear();
    this.engagementLog = [];
    this.progressLog = [];
    this.achievementLog = [];
  }
}

export default MetricsCollector;
