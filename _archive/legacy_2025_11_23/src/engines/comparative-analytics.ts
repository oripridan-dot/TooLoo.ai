/**
 * Phase 6E: Comparative Analytics & Leaderboards
 * 
 * Peer comparison, ranking algorithms, percentile calculation,
 * and learning path recommendations
 */

export class ComparativeAnalytics {
  constructor() {
    this.learnerProfiles = new Map();
    this.leaderboards = new Map();
    this.peerComparisons = new Map();
  }

  /**
   * Register learner profile for analytics
   */
  registerLearnerProfile(userId, profile) {
    this.learnerProfiles.set(userId, {
      userId,
      profile,
      registeredAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });

    // Invalidate caches
    this.leaderboards.clear();
  }

  /**
   * Generate leaderboard for a domain with ranking algorithm
   */
  generateLeaderboard(domain, options = {}) {
    const { limit = 100, includeStats = true } = options;

    if (this.leaderboards.has(domain)) {
      return this.leaderboards.get(domain);
    }

    const entries = [];

    this.learnerProfiles.forEach((data, userId) => {
      const domainData = data.profile.find(d => d.topic === domain);
      if (domainData) {
        entries.push({
          userId,
          username: data.profile.username || `user_${userId.slice(-6)}`,
          mastery: domainData.mastery,
          confidence: domainData.confidence,
          attempts: domainData.attempts,
          badge_count: data.badgeCount || 0,
          velocity: domainData.velocity || 0,
          registered_days_ago: this.daysSince(data.registeredAt),
          profile: data.profile
        });
      }
    });

    // Sort by mastery (primary), then velocity (tie-breaker)
    entries.sort((a, b) => {
      const masteryDiff = b.mastery - a.mastery;
      if (Math.abs(masteryDiff) > 2) return masteryDiff; // If mastery differs by >2%, use that
      return b.velocity - a.velocity; // Otherwise, use velocity
    });

    // Calculate percentiles
    const percentiles = this.calculatePercentiles(entries.map(e => e.mastery));

    const leaderboard = entries.slice(0, limit).map((entry, rank) => ({
      rank: rank + 1,
      userId: entry.userId,
      username: entry.username,
      mastery: entry.mastery,
      confidence: entry.confidence,
      velocity: parseFloat(entry.velocity.toFixed(3)),
      badges: entry.badge_count,
      attempts: entry.attempts,
      percentile: this.calculatePercentileForScore(entry.mastery, percentiles),
      trend: this.getTrendIndicator(entry.velocity),
      momentum: entry.velocity > 0.5 ? '🚀 Rising' : entry.velocity > 0 ? '📈 Steady' : '📉 Declining',
      registeredDaysAgo: entry.registered_days_ago
    }));

    // Compute statistics
    const stats = {
      totalParticipants: entries.length,
      averageMastery: (entries.reduce((s, e) => s + e.mastery, 0) / entries.length).toFixed(1),
      medianMastery: entries[Math.floor(entries.length / 2)]?.mastery || 0,
      topMastery: entries[0]?.mastery || 0,
      masteryStdDev: this.calculateStdDev(entries.map(e => e.mastery)).toFixed(1),
      averageVelocity: (entries.reduce((s, e) => s + e.velocity, 0) / entries.length).toFixed(3),
      percentiles: percentiles
    };

    const result = {
      domain,
      timestamp: new Date().toISOString(),
      leaderboard,
      stats,
      generatedAt: new Date().toISOString()
    };

    this.leaderboards.set(domain, result);
    return result;
  }

  /**
   * Get peer comparison for a specific user
   */
  getPeerComparison(userId, domain) {
    const cacheKey = `${userId}-${domain}`;
    if (this.peerComparisons.has(cacheKey)) {
      return this.peerComparisons.get(cacheKey);
    }

    const userLearnProfile = this.learnerProfiles.get(userId);
    if (!userLearnProfile) {
      return { error: 'User profile not found' };
    }

    const userDomainData = userLearnProfile.profile.find(d => d.topic === domain);
    if (!userDomainData) {
      return { error: 'Domain not found in user profile' };
    }

    const leaderboard = this.generateLeaderboard(domain);
    const userRank = leaderboard.leaderboard.find(e => e.userId === userId);

    // Find similar learners (within ±10% mastery)
    const similarLearners = leaderboard.leaderboard
      .filter(e => 
        e.userId !== userId && 
        Math.abs(e.mastery - userDomainData.mastery) <= 10
      )
      .slice(0, 5);

    // Find learners ahead
    const learnersAhead = leaderboard.leaderboard
      .filter(e => e.mastery > userDomainData.mastery)
      .slice(0, 3);

    // Calculate comparison metrics
    const comparison = {
      yourProfile: {
        userId,
        username: userLearnProfile.profile.username || `user_${userId.slice(-6)}`,
        mastery: userDomainData.mastery,
        confidence: userDomainData.confidence,
        attempts: userDomainData.attempts,
        rank: userRank?.rank || leaderboard.stats.totalParticipants,
        percentile: userRank?.percentile || 0,
        velocity: userDomainData.velocity || 0,
        trend: userDomainData.velocity > 0.5 ? '🚀' : '📈',
        registeredDaysAgo: userLearnProfile.registered_days_ago
      },

      benchmarks: {
        averageMastery: parseFloat(leaderboard.stats.averageMastery),
        medianMastery: leaderboard.stats.medianMastery,
        topMastery: leaderboard.stats.topMastery,
        topPercentile: 95,
        yourPercentile: userRank?.percentile || 0,
        totalParticipants: leaderboard.stats.totalParticipants,
        percentileRank: this.getPercentileRank(userRank?.percentile || 0)
      },

      similarLearners: similarLearners.map(e => ({
        username: e.username,
        mastery: e.mastery,
        velocity: e.velocity,
        similarity: (100 - Math.abs(e.mastery - userDomainData.mastery)).toFixed(0) + '%'
      })),

      learnersToFollow: learnersAhead.map(e => ({
        username: e.username,
        mastery: e.mastery,
        masteryAhead: (e.mastery - userDomainData.mastery).toFixed(1),
        velocity: e.velocity,
        strategy: `${e.username} is ${(e.mastery - userDomainData.mastery).toFixed(0)}% ahead with velocity ${e.velocity}`
      })),

      insights: this.generateComparisonInsights(userDomainData, leaderboard.stats),

      recommendations: this.generateRecommendations(userDomainData, leaderboard, userRank)
    };

    this.peerComparisons.set(cacheKey, comparison);
    return comparison;
  }

  /**
   * Get full peer comparison across all domains
   */
  getFullPeerComparison(userId) {
    const userLearnProfile = this.learnerProfiles.get(userId);
    if (!userLearnProfile) {
      return { error: 'User profile not found' };
    }

    const allDomains = userLearnProfile.profile.map(p => p.topic);
    const comparisons = {};

    allDomains.forEach(domain => {
      comparisons[domain] = this.getPeerComparison(userId, domain);
    });

    return {
      userId,
      username: userLearnProfile.profile.username,
      comparisons,
      overallProfile: this.calculateOverallProfile(userLearnProfile.profile),
      learningPathRecommendation: this.recommendLearningPath(userLearnProfile.profile)
    };
  }

  /**
   * Calculate percentiles for scores
   */
  calculatePercentiles(scores) {
    if (scores.length === 0) return {};

    const sorted = [...scores].sort((a, b) => a - b);
    return {
      p10: sorted[Math.ceil(sorted.length * 0.1) - 1],
      p25: sorted[Math.ceil(sorted.length * 0.25) - 1],
      p50: sorted[Math.ceil(sorted.length * 0.5) - 1],
      p75: sorted[Math.ceil(sorted.length * 0.75) - 1],
      p90: sorted[Math.ceil(sorted.length * 0.9) - 1]
    };
  }

  /**
   * Calculate percentile for a specific score
   */
  calculatePercentileForScore(score, percentiles) {
    if (score >= percentiles.p90) return 90;
    if (score >= percentiles.p75) return 75;
    if (score >= percentiles.p50) return 50;
    if (score >= percentiles.p25) return 25;
    return 10;
  }

  /**
   * Get human-readable percentile rank
   */
  getPercentileRank(percentile) {
    if (percentile >= 95) return 'Top 5% 👑';
    if (percentile >= 90) return 'Top 10% 🏆';
    if (percentile >= 75) return 'Top 25% 🎖️';
    if (percentile >= 50) return 'Above Average 📈';
    return 'Growing 📚';
  }

  /**
   * Generate trend indicator emoji
   */
  getTrendIndicator(velocity) {
    if (velocity > 1.0) return '🚀';
    if (velocity > 0.5) return '📈';
    if (velocity > 0) return '→';
    return '📉';
  }

  /**
   * Generate comparison insights
   */
  generateComparisonInsights(userDomainData, stats) {
    const insights = [];

    const relativeMastery = userDomainData.mastery - stats.averageMastery;
    if (relativeMastery > 10) {
      insights.push('✅ You\'re well above average in this domain');
    } else if (relativeMastery > 5) {
      insights.push('📈 You\'re performing above average');
    } else if (relativeMastery < -10) {
      insights.push('⚠️ Opportunity to catch up with peers');
    }

    if (userDomainData.confidence > 90) {
      insights.push('🎯 High confidence in your mastery');
    } else if (userDomainData.confidence < 60) {
      insights.push('📚 More practice recommended');
    }

    return insights;
  }

  /**
   * Generate recommendations based on comparison
   */
  generateRecommendations(userDomainData, leaderboard, userRank) {
    const recommendations = [];

    if (!userRank || userRank.rank > 10) {
      const topLearner = leaderboard.leaderboard[0];
      recommendations.push(
        `Study ${topLearner.username}'s approach (${topLearner.mastery}% mastery)`
      );
    }

    if (userDomainData.velocity < 0.3) {
      recommendations.push('Increase practice frequency to improve velocity');
    }

    if (userDomainData.confidence < 70) {
      recommendations.push('Focus on conceptual understanding before speed');
    }

    return recommendations;
  }

  /**
   * Calculate overall profile across domains
   */
  calculateOverallProfile(profile) {
    const avgMastery = (profile.reduce((s, d) => s + d.mastery, 0) / profile.length).toFixed(1);
    const strongDomains = profile.filter(d => d.mastery >= 85).map(d => d.name);
    const weakDomains = profile.filter(d => d.mastery < 70).map(d => d.name);

    return {
      averageMastery: parseFloat(avgMastery),
      dominanceCount: strongDomains.length,
      strongDomains,
      weakDomains,
      totalAttempts: profile.reduce((s, d) => s + d.attempts, 0),
      specialization: strongDomains.length > 0 ? strongDomains[0] : 'Generalist'
    };
  }

  /**
   * Recommend personalized learning path
   */
  recommendLearningPath(profile) {
    const sorted = [...profile].sort((a, b) => a.mastery - b.mastery);
    const weakest = sorted.slice(0, 2);
    const strongest = sorted[sorted.length - 1];

    return {
      focusAreas: weakest.map(d => `${d.name} (${d.mastery}%)`),
      leverageStrength: `Build on ${strongest.name} expertise`,
      suggestedSequence: [
        `1. Deep dive into ${weakest[0].name}`,
        `2. Apply ${strongest.name} principles to ${weakest[0].name}`,
        `3. Master ${weakest[1]?.name || 'advanced concepts'}`
      ]
    };
  }

  /**
   * Calculate standard deviation
   */
  calculateStdDev(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate days since timestamp
   */
  daysSince(timestamp) {
    const days = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(days);
  }
}

/**
 * Leaderboard data generator for visualization
 */
export class LeaderboardVisualizationGenerator {
  /**
   * Generate leaderboard table data
   */
  static generateTableData(leaderboard) {
    return {
      headers: ['Rank', 'Username', 'Mastery', 'Velocity', 'Badges', 'Percentile', 'Trend'],
      rows: leaderboard.leaderboard.map(entry => [
        entry.rank,
        entry.username,
        `${entry.mastery}%`,
        `${entry.velocity.toFixed(2)}%/day`,
        entry.badges,
        `${entry.percentile}th`,
        entry.momentum
      ]),
      stats: leaderboard.stats
    };
  }

  /**
   * Generate comparative scatter plot data
   */
  static generateScatterData(leaderboard) {
    return {
      points: leaderboard.leaderboard.map(entry => ({
        x: entry.velocity,
        y: entry.mastery,
        label: entry.username,
        rank: entry.rank,
        radius: 5 + Math.sqrt(entry.badges)
      })),
      axes: {
        x: { label: 'Velocity (% per day)', min: 0 },
        y: { label: 'Mastery %', min: 0, max: 100 }
      }
    };
  }

  /**
   * Generate comparison radar chart
   */
  static generateRadarData(comparison) {
    const userProfile = comparison.yourProfile;
    const benchmarks = comparison.benchmarks;

    return {
      labels: ['Mastery', 'Velocity', 'Attempts', 'Percentile', 'Consistency'],
      datasets: [
        {
          label: userProfile.username,
          data: [
            userProfile.mastery,
            userProfile.velocity * 100,
            Math.min(userProfile.attempts * 10, 100),
            userProfile.percentile,
            75 // placeholder for consistency
          ],
          color: 'rgba(75, 192, 192, 0.8)'
        },
        {
          label: 'Average Peer',
          data: [
            benchmarks.averageMastery,
            10, // assumed avg velocity
            50,
            50,
            60
          ],
          color: 'rgba(255, 99, 132, 0.8)'
        }
      ]
    };
  }
}

export default ComparativeAnalytics;
