/**
 * Integrated Learning Analytics Service
 * 
 * Combines Phase 6C (Velocity), 6D (Badges), and 6E (Leaderboards)
 * into a unified, cohesive analytics platform
 */

import LearningVelocityTracker from './learning-velocity-tracker.js';
import BadgesSystem from './badges-system.js';
import ComparativeAnalytics from './comparative-analytics.js';

export class LearningAnalyticsService {
  constructor() {
    this.velocityTracker = new LearningVelocityTracker();
    this.badgesSystem = new BadgesSystem();
    this.comparativeAnalytics = new ComparativeAnalytics();
    
    this.userSessions = new Map();
  }

  /**
   * Initialize analytics for a user
   */
  initializeUserAnalytics(userId, initialProfile = {}) {
    this.userSessions.set(userId, {
      userId,
      profile: initialProfile,
      createdAt: new Date().toISOString(),
      stats: {
        milestonesRecorded: 0,
        badgesEarned: 0,
        leaderboardRank: null
      }
    });
  }

  /**
   * Record a learning milestone and trigger automatic analysis
   */
  recordMilestone(userId, domain, mastery, metadata = {}) {
    if (!this.userSessions.has(userId)) {
      this.initializeUserAnalytics(userId);
    }

    // Record in velocity tracker
    const milestone = this.velocityTracker.recordMilestone(domain, mastery, {
      userId,
      ...metadata
    });

    const session = this.userSessions.get(userId);
    session.stats.milestonesRecorded++;

    // Check for badge eligibility
    const eligibleBadges = this.checkBadgeEligibility(userId, domain, mastery);
    const newBadges = eligibleBadges.filter(badgeId => {
      const result = this.badgesSystem.awardBadge(userId, badgeId);
      return result && result.awarded;
    });

    if (newBadges.length > 0) {
      session.stats.badgesEarned += newBadges.length;
    }

    return {
      milestone,
      newBadges,
      analysis: this.getQuickAnalysis(userId, domain)
    };
  }

  /**
   * Check which badges user might have earned
   */
  checkBadgeEligibility(userId, domain, mastery) {
    const profile = this.userSessions.get(userId)?.profile || [];
    const domainData = profile.find(d => d.topic === domain);

    const eligible = [];

    // Check velocity badges
    const velocity = this.velocityTracker.calculateVelocityWithEMA(domain);
    if (velocity?.velocityPerDay >= 0.5) {
      eligible.push('velocity-accelerator');
    }
    if (velocity?.velocityPerDay >= 1.0) {
      eligible.push('hyperbolic-learner');
    }

    // Check mastery badges (domain-specific)
    if (domain === 'distributed') {
      if (mastery >= 80) eligible.push('80-percent-club');
      if (mastery >= 85) eligible.push('elite-learner');
    }

    return eligible;
  }

  /**
   * Get quick analysis for a domain
   */
  getQuickAnalysis(userId, domain) {
    const velocity = this.velocityTracker.calculateVelocityWithEMA(domain);
    const history = this.velocityTracker.getDomainHistory(domain);
    
    if (history.length === 0) return null;

    const currentMastery = history[history.length - 1].mastery;
    const prediction = this.velocityTracker.predictAchievementDate(domain, currentMastery, 85);

    return {
      domain,
      currentMastery,
      velocity: velocity?.velocityPerDay || 0,
      trend: velocity?.trend || 'N/A',
      prediction: prediction.achievable ? {
        predictedDate: prediction.predictedDate,
        daysRemaining: prediction.daysToTarget,
        confidence: prediction.confidenceLevel
      } : null
    };
  }

  /**
   * Get comprehensive user dashboard
   */
  getUserDashboard(userId) {
    if (!this.userSessions.has(userId)) {
      return { error: 'User not found' };
    }

    const session = this.userSessions.get(userId);
    const domains = [...new Set(
      this.velocityTracker.history
        .filter(m => m.userId === userId)
        .map(m => m.domain)
    )];

    // Velocity data
    const velocityData = {};
    const predictions = {};

    domains.forEach(domain => {
      const velocity = this.velocityTracker.calculateVelocityWithEMA(domain);
      const history = this.velocityTracker.getDomainHistory(domain);
      
      if (history.length > 0) {
        const currentMastery = history[history.length - 1].mastery;
        velocityData[domain] = {
          currentMastery,
          velocity: velocity?.velocityPerDay || 0,
          trend: velocity?.trend || 'N/A',
          dataPoints: history.length
        };

        predictions[domain] = this.velocityTracker.predictAchievementDate(domain, currentMastery, 85);
      }
    });

    // Badge data
    const badgeProgress = this.badgesSystem.getUserBadgeProgress(userId);
    const achievementPaths = this.badgesSystem.getAchievementPath(userId);
    const rewards = this.badgesSystem.calculateTotalRewards(userId);

    // Leaderboard data (this will be populated when peer profiles are registered)
    const leaderboardData = {};
    domains.forEach(domain => {
      const leaderboard = this.comparativeAnalytics.generateLeaderboard(domain);
      const userRank = leaderboard.leaderboard.find(e => e.userId === userId);
      leaderboardData[domain] = {
        yourRank: userRank?.rank || leaderboard.stats.totalParticipants,
        totalParticipants: leaderboard.stats.totalParticipants,
        yourMastery: userRank?.mastery || 0,
        averageMastery: parseFloat(leaderboard.stats.averageMastery),
        percentile: userRank?.percentile || 0
      };
    });

    return {
      userId,
      session: {
        createdAt: session.createdAt,
        milestonesRecorded: session.stats.milestonesRecorded,
        badgesEarned: session.stats.badgesEarned
      },
      velocity: {
        domains: velocityData,
        predictions,
        comparativeAnalysis: this.velocityTracker.getComparativeAnalysis()
      },
      badges: {
        progress: badgeProgress,
        paths: achievementPaths,
        totalRewards: rewards
      },
      leaderboards: leaderboardData,
      nextActions: this.generateNextActions(userId, velocityData, badgeProgress)
    };
  }

  /**
   * Generate personalized next actions
   */
  generateNextActions(userId, velocityData, badgeProgress) {
    const actions = [];

    // Velocity-based actions
    Object.entries(velocityData).forEach(([domain, data]) => {
      if (data.velocity < 0.3) {
        actions.push({
          priority: 'high',
          action: `Increase practice in ${domain} (current velocity: ${data.velocity}%/day)`,
          impact: 'Accelerate progress toward 85% mastery'
        });
      }

      if (data.currentMastery > 80 && data.currentMastery < 85) {
        actions.push({
          priority: 'high',
          action: `Push for 85% in ${domain} (you're at ${data.currentMastery}%)`,
          impact: 'Unlock elite learner status'
        });
      }
    });

    // Badge-based actions
    if (badgeProgress.nextBadges.length > 0) {
      badgeProgress.nextBadges.forEach(badge => {
        actions.push({
          priority: 'medium',
          action: `Earn "${badge.name}" badge: ${badge.howToUnlock}`,
          impact: badge.reward.points + ' points'
        });
      });
    }

    return actions.sort((a, b) => {
      const priorityMap = { high: 0, medium: 1, low: 2 };
      return priorityMap[a.priority] - priorityMap[b.priority];
    });
  }

  /**
   * Get full peer comparison including all phases
   */
  getPeerAnalysis(userId, domain) {
    // Get velocity comparison
    const velocityData = this.velocityTracker.calculateVelocityWithEMA(domain);
    const history = this.velocityTracker.getDomainHistory(domain);
    const currentMastery = history.length > 0 ? history[history.length - 1].mastery : 0;

    // Get leaderboard comparison
    const comparison = this.comparativeAnalytics.getPeerComparison(userId, domain);

    // Get badge comparison
    const userBadges = this.badgesSystem.getUserBadges(userId);

    return {
      domain,
      yourMetrics: {
        mastery: currentMastery,
        velocity: velocityData?.velocityPerDay || 0,
        badges: userBadges.length,
        trend: velocityData?.trend || 'N/A'
      },
      peerComparison: comparison,
      actionItems: [
        comparison.recommendations[0] || 'Continue learning',
        comparison.learningPathRecommendation || 'Focus on weak areas',
        comparison.learnersToFollow[0]?.strategy || 'Study top performers'
      ]
    };
  }

  /**
   * Generate analytics report
   */
  generateAnalyticsReport(userId) {
    const dashboard = this.getUserDashboard(userId);

    if (dashboard.error) {
      return { error: dashboard.error };
    }

    const report = {
      generatedAt: new Date().toISOString(),
      userId,
      summary: {
        totalMilestones: dashboard.session.milestonesRecorded,
        totalBadges: dashboard.session.badgesEarned,
        activeDomains: Object.keys(dashboard.velocity.domains).length
      },
      performanceByDomain: Object.entries(dashboard.velocity.domains).map(([domain, data]) => ({
        domain,
        mastery: data.currentMastery,
        velocity: data.velocity,
        trend: data.trend,
        prediction: dashboard.velocity.predictions[domain],
        leaderboardRank: dashboard.leaderboards[domain]?.yourRank || 'N/A'
      })),
      badgeProgression: {
        earned: dashboard.badges.progress.earned.length,
        nextBadges: dashboard.badges.progress.nextBadges.slice(0, 3),
        paths: dashboard.badges.paths
      },
      recommendations: dashboard.nextActions.slice(0, 5)
    };

    return report;
  }

  /**
   * Export analytics data (for visualization/charts)
   */
  exportVisualizationData(userId) {
    const dashboard = this.getUserDashboard(userId);

    return {
      velocity: {
        trajectory: this.velocityTracker.getMasteryTrajectory('distributed', 50),
        comparative: dashboard.velocity.comparativeAnalysis
      },
      badges: {
        earned: this.badgesSystem.getUserBadges(userId),
        progress: dashboard.badges.progress
      },
      leaderboards: dashboard.leaderboards
    };
  }

  /**
   * System-wide analytics
   */
  getSystemAnalytics() {
    const totalUsers = this.userSessions.size;
    const totalMilestones = this.velocityTracker.history.length;
    const totalBadgesAwarded = Array.from(this.badgesSystem.userBadges.values())
      .reduce((sum, badges) => sum + badges.length, 0);

    const domains = [...new Set(this.velocityTracker.history.map(m => m.domain))];
    const domainStats = {};

    domains.forEach(domain => {
      const leaderboard = this.comparativeAnalytics.generateLeaderboard(domain);
      domainStats[domain] = leaderboard.stats;
    });

    return {
      generatedAt: new Date().toISOString(),
      totalUsers,
      totalMilestones,
      totalBadgesAwarded,
      averageBadgesPerUser: (totalBadgesAwarded / Math.max(totalUsers, 1)).toFixed(1),
      domains: domainStats
    };
  }
}

export default LearningAnalyticsService;
