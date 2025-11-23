/**
 * Phase 6E: Comparative Analytics & Leaderboards
 * Leaderboards, peer comparison, competitive features
 */

export class ComparativeAnalytics {
  constructor() {
    this.learners = new Map(); // userId -> learner profile
    this.leaderboards = new Map(); // domain -> sorted learner list
    this.peerGroups = new Map(); // learner -> similar learners
  }

  /**
   * Register or update learner profile
   */
  updateLearnerProfile(userId, profile) {
    const learnerData = {
      userId,
      username: profile.username,
      masteryByDomain: profile.masteryByDomain || {},
      averageMastery: this.calculateAverageMastery(profile.masteryByDomain || {}),
      totalAttempts: profile.totalAttempts || 0,
      badges: profile.badges || [],
      joinedAt: this.learners.get(userId)?.joinedAt || new Date().toISOString(),
      lastActive: new Date().toISOString(),
      velocity: profile.velocity || {},
      completedChallenges: profile.completedChallenges || 0,
      streak: profile.streak || 0
    };

    this.learners.set(userId, learnerData);
    this.updateLeaderboards();

    return learnerData;
  }

  /**
   * Calculate average mastery across domains
   */
  calculateAverageMastery(masteryByDomain) {
    const values = Object.values(masteryByDomain);
    if (values.length === 0) return 0;
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  }

  /**
   * Generate leaderboard for a specific domain
   */
  getLeaderboard(domain, limit = 100) {
    const learnerList = Array.from(this.learners.values())
      .map(learner => ({
        userId: learner.userId,
        username: learner.username,
        mastery: learner.masteryByDomain[domain] || 0,
        velocity: learner.velocity[domain] || 0,
        badges: learner.badges.length,
        attempts: learner.totalAttempts,
        trend: this.calculateTrend(learner.velocity[domain] || 0)
      }))
      .filter(l => l.mastery > 0 || l.attempts > 0)
      .sort((a, b) => b.mastery - a.mastery || b.velocity - a.velocity);

    const rankedLeaderboard = learnerList.map((learner, index) => ({
      rank: index + 1,
      ...learner,
      percentile: parseFloat(((index / learnerList.length) * 100).toFixed(1))
    }));

    return {
      domain,
      totalParticipants: rankedLeaderboard.length,
      leaderboard: rankedLeaderboard.slice(0, limit),
      stats: {
        topMastery: rankedLeaderboard[0]?.mastery || 0,
        averageMastery: (
          rankedLeaderboard.reduce((sum, l) => sum + l.mastery, 0) /
          rankedLeaderboard.length
        ).toFixed(1),
        medianMastery: this.calculateMedian(rankedLeaderboard.map(l => l.mastery)),
        topVelocity: rankedLeaderboard[0]?.velocity || 0
      },
      distribution: this.calculateDistribution(rankedLeaderboard.map(l => l.mastery))
    };
  }

  /**
   * Get leaderboard across all domains (overall ranking)
   */
  getOverallLeaderboard(limit = 100) {
    const learnerList = Array.from(this.learners.values())
      .map(learner => ({
        userId: learner.userId,
        username: learner.username,
        averageMastery: parseFloat(learner.averageMastery),
        totalBadges: learner.badges.length,
        totalAttempts: learner.totalAttempts,
        completedChallenges: learner.completedChallenges,
        streak: learner.streak,
        score: this.calculateOverallScore(learner),
        joinedAt: learner.joinedAt
      }))
      .sort((a, b) => b.score - a.score || b.averageMastery - a.averageMastery);

    const rankedLeaderboard = learnerList.map((learner, index) => ({
      rank: index + 1,
      ...learner,
      percentile: parseFloat(((index / learnerList.length) * 100).toFixed(1))
    }));

    return {
      leaderboardType: 'overall',
      totalParticipants: rankedLeaderboard.length,
      leaderboard: rankedLeaderboard.slice(0, limit),
      stats: {
        topScore: rankedLeaderboard[0]?.score || 0,
        averageScore: (
          rankedLeaderboard.reduce((sum, l) => sum + l.score, 0) /
          rankedLeaderboard.length
        ).toFixed(2),
        medianScore: this.calculateMedian(rankedLeaderboard.map(l => l.score))
      }
    };
  }

  /**
   * Calculate overall score for ranking
   */
  calculateOverallScore(learner) {
    const masteryComponent = parseFloat(learner.averageMastery) * 0.5; // 50% weight
    const badgeComponent = learner.badges.length * 10; // 10 points per badge
    const attemptComponent = Math.min(learner.totalAttempts * 0.5, 20); // Cap at 20 points
    const streakComponent = Math.min(learner.streak * 2, 20); // Cap at 20 points

    return parseFloat((masteryComponent + badgeComponent + attemptComponent + streakComponent).toFixed(2));
  }

  /**
   * Compare two learners
   */
  compareUsers(userId1, userId2) {
    const user1 = this.learners.get(userId1);
    const user2 = this.learners.get(userId2);

    if (!user1 || !user2) {
      return { error: 'One or both users not found' };
    }

    const domains = new Set([
      ...Object.keys(user1.masteryByDomain),
      ...Object.keys(user2.masteryByDomain)
    ]);

    const comparison = {
      user1: {
        userId: user1.userId,
        username: user1.username,
        averageMastery: user1.averageMastery,
        badges: user1.badges.length,
        totalAttempts: user1.totalAttempts
      },
      user2: {
        userId: user2.userId,
        username: user2.username,
        averageMastery: user2.averageMastery,
        badges: user2.badges.length,
        totalAttempts: user2.totalAttempts
      },
      byDomain: Array.from(domains).map(domain => ({
        domain,
        user1Mastery: user1.masteryByDomain[domain] || 0,
        user2Mastery: user2.masteryByDomain[domain] || 0,
        difference: (user1.masteryByDomain[domain] || 0) - (user2.masteryByDomain[domain] || 0),
        leader: (user1.masteryByDomain[domain] || 0) > (user2.masteryByDomain[domain] || 0) ? user1.username : user2.username
      })),
      overallLeader: parseFloat(user1.averageMastery) > parseFloat(user2.averageMastery) ? user1.username : user2.username,
      similarity: this.calculateSimilarity(user1, user2)
    };

    return comparison;
  }

  /**
   * Get peer comparison for current user
   */
  getPeerComparison(userId, limit = 5) {
    const user = this.learners.get(userId);

    if (!user) {
      return { error: 'User not found' };
    }

    // Find similar learners
    const similarities = Array.from(this.learners.values())
      .filter(l => l.userId !== userId)
      .map(l => ({
        learner: l,
        similarity: this.calculateSimilarity(user, l),
        overallScore: this.calculateOverallScore(l)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Find learners at similar mastery level
    const mastery = parseFloat(user.averageMastery);
    const cohortsMembers = Array.from(this.learners.values())
      .filter(l => 
        l.userId !== userId &&
        Math.abs(parseFloat(l.averageMastery) - mastery) < 10
      )
      .slice(0, 5);

    return {
      yourProfile: {
        userId: user.userId,
        username: user.username,
        averageMastery: user.averageMastery,
        totalBadges: user.badges.length,
        totalAttempts: user.totalAttempts,
        completedChallenges: user.completedChallenges,
        masteryByDomain: user.masteryByDomain
      },
      yourPercentile: this.getUserPercentile(userId),
      benchmarks: {
        averageMasteryAcrossAllUsers: this.getAverageMasteryAll(),
        topPercentile: this.getTopPercentileMastery(10),
        yourPercentileValue: this.getUserPercentile(userId)
      },
      similarLearners: similarities.map(s => ({
        username: s.learner.username,
        userId: s.learner.userId,
        similarity: parseFloat(s.similarity.toFixed(2)),
        averageMastery: s.learner.averageMastery,
        badges: s.learner.badges.length
      })),
      cohortComparison: {
        cohortMembersAtSimilarLevel: cohortsMembers.length,
        members: cohortsMembers.map(m => ({
          username: m.username,
          mastery: m.averageMastery,
          badges: m.badges.length
        }))
      },
      recommendations: this.generatePeerRecommendations(user)
    };
  }

  /**
   * Find similar learners based on learning pattern
   */
  findSimilarLearners(userId, limit = 10) {
    const user = this.learners.get(userId);

    if (!user) {
      return { error: 'User not found' };
    }

    const similarities = Array.from(this.learners.values())
      .filter(l => l.userId !== userId)
      .map(l => ({
        userId: l.userId,
        username: l.username,
        similarity: this.calculateSimilarity(user, l),
        masteryDelta: Math.abs(parseFloat(l.averageMastery) - parseFloat(user.averageMastery)),
        commonStrengths: this.findCommonStrengths(user, l)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return {
      userId,
      username: user.username,
      similarLearners: similarities,
      avgSimilarity: (
        similarities.reduce((sum, s) => sum + s.similarity, 0) /
        similarities.length
      ).toFixed(2)
    };
  }

  /**
   * Calculate similarity score between two learners (0-100)
   */
  calculateSimilarity(user1, user2) {
    let similarity = 0;

    // Mastery profile similarity (40% weight)
    const masteryDiff = Math.abs(parseFloat(user1.averageMastery) - parseFloat(user2.averageMastery));
    const masteryScore = Math.max(0, 100 - masteryDiff * 5);
    similarity += masteryScore * 0.4;

    // Learning pace similarity (30% weight)
    const vel1 = Object.values(user1.velocity).reduce((a, b) => a + b, 0) / Object.keys(user1.velocity).length || 0;
    const vel2 = Object.values(user2.velocity).reduce((a, b) => a + b, 0) / Object.keys(user2.velocity).length || 0;
    const velDiff = Math.abs(vel1 - vel2);
    const velScore = Math.max(0, 100 - velDiff * 20);
    similarity += velScore * 0.3;

    // Badge collection similarity (20% weight)
    const badgeDiff = Math.abs(user1.badges.length - user2.badges.length);
    const badgeScore = Math.max(0, 100 - badgeDiff * 5);
    similarity += badgeScore * 0.2;

    // Effort level similarity (10% weight)
    const effortDiff = Math.abs(user1.totalAttempts - user2.totalAttempts);
    const effortScore = Math.max(0, 100 - effortDiff * 0.5);
    similarity += effortScore * 0.1;

    return similarity;
  }

  /**
   * Find domains where users have similar mastery
   */
  findCommonStrengths(user1, user2) {
    const domains = new Set([
      ...Object.keys(user1.masteryByDomain),
      ...Object.keys(user2.masteryByDomain)
    ]);

    const strengths = [];

    Array.from(domains).forEach(domain => {
      const m1 = user1.masteryByDomain[domain] || 0;
      const m2 = user2.masteryByDomain[domain] || 0;

      if (m1 >= 75 && m2 >= 75 && Math.abs(m1 - m2) < 10) {
        strengths.push({ domain, user1: m1, user2: m2 });
      }
    });

    return strengths;
  }

  /**
   * Get user's percentile ranking
   */
  getUserPercentile(userId) {
    const allScores = Array.from(this.learners.values())
      .map(l => this.calculateOverallScore(l))
      .sort((a, b) => b - a);

    const userScore = this.calculateOverallScore(this.learners.get(userId));
    const rank = allScores.findIndex(s => s <= userScore) + 1;

    return parseFloat(((rank / allScores.length) * 100).toFixed(1));
  }

  /**
   * Get average mastery across all users
   */
  getAverageMasteryAll() {
    const masteries = Array.from(this.learners.values()).map(l => parseFloat(l.averageMastery));
    return (masteries.reduce((a, b) => a + b, 0) / masteries.length).toFixed(1);
  }

  /**
   * Get top percentile mastery threshold
   */
  getTopPercentileMastery(percentile = 10) {
    const masteries = Array.from(this.learners.values())
      .map(l => parseFloat(l.averageMastery))
      .sort((a, b) => b - a);

    const index = Math.floor((percentile / 100) * masteries.length);
    return masteries[index]?.toFixed(1) || 0;
  }

  /**
   * Generate recommendations based on peer comparison
   */
  generatePeerRecommendations(user) {
    const recommendations = [];

    const avgMastery = parseFloat(this.getAverageMasteryAll());
    if (parseFloat(user.averageMastery) < avgMastery - 5) {
      recommendations.push(`Your mastery is below average. Consider focusing on: ${Object.keys(user.masteryByDomain).filter(d => (user.masteryByDomain[d] || 0) < 70).join(', ')}`);
    }

    if (user.badges.length < 3) {
      recommendations.push('You could unlock more badges. Try tackling specific challenges targeting System Designer and Consensus Master badges.');
    }

    if (user.streak < 7) {
      recommendations.push('Build a learning streak! Consistent daily practice accelerates mastery.');
    }

    if (Object.keys(user.masteryByDomain).some(d => (user.masteryByDomain[d] || 0) >= 85)) {
      recommendations.push('You\'re an expert in some domains! Consider mentoring peers or tackling more advanced challenges.');
    }

    return recommendations;
  }

  /**
   * Calculate median value
   */
  calculateMedian(values) {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculate distribution of scores
   */
  calculateDistribution(values) {
    const ranges = {
      '0-20': 0,
      '20-40': 0,
      '40-60': 0,
      '60-80': 0,
      '80-100': 0
    };

    values.forEach(v => {
      if (v < 20) ranges['0-20']++;
      else if (v < 40) ranges['20-40']++;
      else if (v < 60) ranges['40-60']++;
      else if (v < 80) ranges['60-80']++;
      else ranges['80-100']++;
    });

    return ranges;
  }

  /**
   * Calculate trend
   */
  calculateTrend(velocity) {
    if (velocity > 1) return '🚀 accelerating';
    if (velocity > 0.5) return '📈 improving';
    if (velocity > 0) return '➡️ stable';
    return '📉 declining';
  }

  /**
   * Update leaderboards cache
   */
  updateLeaderboards() {
    // This would typically be called after profile updates
    // In production, this would be optimized with incremental updates
  }

  /**
   * Get leaderboard stats
   */
  getLeaderboardStats() {
    const allLearners = Array.from(this.learners.values());

    return {
      totalLearners: allLearners.length,
      averageMastery: this.getAverageMasteryAll(),
      topMastery: Math.max(...allLearners.map(l => parseFloat(l.averageMastery))),
      totalBadgesDistributed: allLearners.reduce((sum, l) => sum + l.badges.length, 0),
      averageBadgesPerLearner: (
        allLearners.reduce((sum, l) => sum + l.badges.length, 0) /
        allLearners.length
      ).toFixed(2),
      topStreak: Math.max(...allLearners.map(l => l.streak))
    };
  }
}

export default ComparativeAnalytics;
