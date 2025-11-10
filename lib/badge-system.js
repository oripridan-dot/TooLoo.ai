import { v4 as uuidv4 } from 'uuid';

export class BadgeSystem {
  constructor() {
    this.badgeDefinitions = new Map();
    this.userBadges = new Map();
    this.badgeLog = [];
    this.initializeBadges();
  }

  initializeBadges() {
    this.badgeDefinitions.set('first_session', {
      id: 'first_session',
      name: 'First Steps',
      description: 'Complete your first learning session',
      icon: '🚀',
      criteria: { sessions: 1 },
      rarity: 'common',
      points: 10,
    });

    this.badgeDefinitions.set('week_warrior', {
      id: 'week_warrior',
      name: 'Week Warrior',
      description: 'Complete 7 sessions in a week',
      icon: '⚔️',
      criteria: { sessionsPerWeek: 7 },
      rarity: 'uncommon',
      points: 50,
    });

    this.badgeDefinitions.set('consistency_king', {
      id: 'consistency_king',
      name: 'Consistency King',
      description: 'Maintain a 14-day activity streak',
      icon: '👑',
      criteria: { dayStreak: 14 },
      rarity: 'rare',
      points: 100,
    });

    this.badgeDefinitions.set('time_master', {
      id: 'time_master',
      name: 'Time Master',
      description: 'Complete 50 hours of learning',
      icon: '⏱️',
      criteria: { totalTime: 50 * 60 * 60 * 1000 },
      rarity: 'rare',
      points: 150,
    });

    this.badgeDefinitions.set('engagement_expert', {
      id: 'engagement_expert',
      name: 'Engagement Expert',
      description: 'Achieve 80+ engagement score',
      icon: '💡',
      criteria: { engagementScore: 80 },
      rarity: 'epic',
      points: 200,
    });

    this.badgeDefinitions.set('perfect_score', {
      id: 'perfect_score',
      name: 'Perfect Score',
      description: 'Achieve 100 on an assessment',
      icon: '💯',
      criteria: { assessment: 100 },
      rarity: 'epic',
      points: 250,
    });

    this.badgeDefinitions.set('speed_demon', {
      id: 'speed_demon',
      name: 'Speed Demon',
      description: 'Complete 10 challenges in 1 hour',
      icon: '⚡',
      criteria: { challengesPerHour: 10 },
      rarity: 'rare',
      points: 120,
    });

    this.badgeDefinitions.set('knowledge_seeker', {
      id: 'knowledge_seeker',
      name: 'Knowledge Seeker',
      description: 'Explore 5 different topics',
      icon: '🔍',
      criteria: { uniqueTopics: 5 },
      rarity: 'uncommon',
      points: 75,
    });

    this.badgeDefinitions.set('mentor', {
      id: 'mentor',
      name: 'Mentor',
      description: 'Help 3 other learners',
      icon: '🤝',
      criteria: { helpCount: 3 },
      rarity: 'rare',
      points: 180,
    });

    this.badgeDefinitions.set('milestone_100', {
      id: 'milestone_100',
      name: '100 Sessions',
      description: 'Complete 100 learning sessions',
      icon: '🎯',
      criteria: { sessions: 100 },
      rarity: 'legendary',
      points: 500,
    });

    this.badgeDefinitions.set('comeback_kid', {
      id: 'comeback_kid',
      name: 'Comeback Kid',
      description: 'Return after 30 days away',
      icon: '🔄',
      criteria: { returnAfterGap: 30 },
      rarity: 'uncommon',
      points: 60,
    });

    this.badgeDefinitions.set('hall_of_fame', {
      id: 'hall_of_fame',
      name: 'Hall of Fame',
      description: 'Rank in top 10 globally',
      icon: '🏆',
      criteria: { topRank: 10 },
      rarity: 'legendary',
      points: 1000,
    });
  }

  checkEligibility(userId, userMetrics, engagementScore) {
    const eligible = [];

    for (const [badgeId, definition] of this.badgeDefinitions) {
      const userBadgeIds = (this.userBadges.get(userId) || []).map((b) => b.badgeId);

      if (userBadgeIds.includes(badgeId)) {
        continue;
      }

      const criteria = definition.criteria;

      if (criteria.sessions && userMetrics.totalSessions >= criteria.sessions) {
        eligible.push(badgeId);
      }

      if (criteria.totalTime && userMetrics.totalTime >= criteria.totalTime) {
        eligible.push(badgeId);
      }

      if (criteria.engagementScore && engagementScore >= criteria.engagementScore) {
        eligible.push(badgeId);
      }

      if (criteria.uniqueTopics && userMetrics.activities) {
        const topicCount = Object.keys(userMetrics.activities).length;
        if (topicCount >= criteria.uniqueTopics) {
          eligible.push(badgeId);
        }
      }
    }

    return [...new Set(eligible)];
  }

  awardBadge(userId, badgeId) {
    if (!this.badgeDefinitions.has(badgeId)) {
      return null;
    }

    const userBadges = this.userBadges.get(userId) || [];

    if (userBadges.some((b) => b.badgeId === badgeId)) {
      return null;
    }

    const definition = this.badgeDefinitions.get(badgeId);

    const badgeEntry = {
      id: uuidv4(),
      userId,
      badgeId,
      awardedAt: Date.now(),
      name: definition.name,
      icon: definition.icon,
      points: definition.points,
    };

    userBadges.push(badgeEntry);
    this.userBadges.set(userId, userBadges);
    this.badgeLog.push(badgeEntry);

    return badgeEntry;
  }

  getUserBadges(userId) {
    return (this.userBadges.get(userId) || []).map((badge) => ({
      badgeId: badge.badgeId,
      name: badge.name,
      icon: badge.icon,
      points: badge.points,
      awardedAt: new Date(badge.awardedAt).toISOString(),
    }));
  }

  getBadgeStats(badgeId) {
    if (!this.badgeDefinitions.has(badgeId)) {
      return null;
    }

    const awardedCount = this.badgeLog.filter((entry) => entry.badgeId === badgeId).length;
    const definition = this.badgeDefinitions.get(badgeId);

    return {
      badgeId,
      name: definition.name,
      icon: definition.icon,
      description: definition.description,
      rarity: definition.rarity,
      totalAwarded: awardedCount,
      points: definition.points,
    };
  }

  getUserBadgeCount(userId) {
    return (this.userBadges.get(userId) || []).length;
  }

  getUserTotalPoints(userId) {
    return (this.userBadges.get(userId) || []).reduce((sum, badge) => sum + badge.points, 0);
  }

  getMostAwardedBadges(limit = 5) {
    const badgeCounts = {};

    for (const entry of this.badgeLog) {
      badgeCounts[entry.badgeId] = (badgeCounts[entry.badgeId] || 0) + 1;
    }

    return Object.entries(badgeCounts)
      .map(([badgeId, count]) => {
        const definition = this.badgeDefinitions.get(badgeId);
        return { badgeId, name: definition.name, icon: definition.icon, awardedCount: count };
      })
      .sort((a, b) => b.awardedCount - a.awardedCount)
      .slice(0, limit);
  }

  getRarityDistribution() {
    const distribution = {};

    for (const [, definition] of this.badgeDefinitions) {
      distribution[definition.rarity] = (distribution[definition.rarity] || 0) + 1;
    }

    return distribution;
  }

  getGlobalLeaderboard(limit = 10) {
    const leaderboard = [];

    for (const [userId] of this.userBadges) {
      const points = this.getUserTotalPoints(userId);
      const badgeCount = this.getUserBadgeCount(userId);

      leaderboard.push({ userId, totalPoints: points, badgeCount });
    }

    return leaderboard.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, limit);
  }

  clearBadges() {
    this.userBadges.clear();
    this.badgeLog = [];
  }
}

export default BadgeSystem;
