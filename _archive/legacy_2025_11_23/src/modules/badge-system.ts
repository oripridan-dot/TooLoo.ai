/**
 * Phase 6D: Achievement Badges System
 * Sophisticated badge criteria including consensus mastery and system design expertise
 */

export class BadgeSystem {
  constructor() {
    this.badges = this.initializeBadges();
    this.userBadges = new Map(); // userId -> { badge: Badge, unlockedAt, progress }
    this.badgeHistory = new Map(); // userId -> [badge unlock events]
  }

  /**
   * Initialize all available badges
   */
  initializeBadges() {
    return {
      // Consensus Algorithms
      'consensus-novice': {
        id: 'consensus-novice',
        name: 'Consensus Novice',
        description: 'Scored 70+ on Consensus Algorithms challenge',
        icon: '🤝',
        category: 'consensus',
        tier: 1,
        requirement: {
          type: 'challenge_score',
          challengeId: 'consensus-basic',
          minScore: 70
        },
        reward: { masteryBoost: 1, points: 100 },
        rarity: 'common'
      },
      'consensus-adept': {
        id: 'consensus-adept',
        name: 'Consensus Adept',
        description: 'Scored 80+ on Consensus Algorithms challenge',
        icon: '🎯',
        category: 'consensus',
        tier: 2,
        requirement: {
          type: 'challenge_score',
          challengeId: 'consensus-intermediate',
          minScore: 80
        },
        reward: { masteryBoost: 2, points: 250 },
        rarity: 'uncommon'
      },
      'consensus-master': {
        id: 'consensus-master',
        name: 'Consensus Master',
        description: 'Achieved 85+ mastery in Consensus Algorithms + 90+ on advanced challenge',
        icon: '👑',
        category: 'consensus',
        tier: 3,
        requirement: {
          type: 'combined',
          conditions: [
            { type: 'mastery', domain: 'consensus', minMastery: 85 },
            { type: 'challenge_score', challengeId: 'consensus-advanced', minScore: 90 }
          ]
        },
        reward: { masteryBoost: 5, points: 500, unlockAdvanced: true },
        rarity: 'rare'
      },

      // Distributed Systems Design
      'system-designer-novice': {
        id: 'system-designer-novice',
        name: 'System Designer',
        description: 'Completed first system design challenge',
        icon: '🏗️',
        category: 'design',
        tier: 1,
        requirement: {
          type: 'challenge_completion',
          challengeId: 'system-design-101',
          minScore: 60
        },
        reward: { masteryBoost: 2, points: 150 },
        rarity: 'common'
      },
      'system-designer-expert': {
        id: 'system-designer-expert',
        name: 'System Design Expert',
        description: 'Achieved 85+ mastery in Distributed Systems Design',
        icon: '🌐',
        category: 'design',
        tier: 3,
        requirement: {
          type: 'mastery_threshold',
          domain: 'distributed-systems-design',
          minMastery: 85
        },
        reward: { masteryBoost: 5, points: 500, unlockMentor: true },
        rarity: 'rare'
      },

      // Byzantine Fault Tolerance
      'byzantine-defender': {
        id: 'byzantine-defender',
        name: 'Byzantine Defender',
        description: 'Scored 80+ on Byzantine Fault Tolerance challenge',
        icon: '🛡️',
        category: 'resilience',
        tier: 2,
        requirement: {
          type: 'challenge_score',
          challengeId: 'fault-tolerance',
          minScore: 80
        },
        reward: { masteryBoost: 3, points: 300 },
        rarity: 'uncommon'
      },

      // Saga Pattern & Distributed Transactions
      'saga-expert': {
        id: 'saga-expert',
        name: 'Saga Expert',
        description: 'Scored 85+ on Distributed Transactions/Saga Pattern challenge',
        icon: '⚡',
        category: 'transactions',
        tier: 2,
        requirement: {
          type: 'challenge_score',
          challengeId: 'distributed-transactions',
          minScore: 85
        },
        reward: { masteryBoost: 3, points: 300 },
        rarity: 'uncommon'
      },

      // Milestones
      'first-challenge': {
        id: 'first-challenge',
        name: 'First Steps',
        description: 'Completed your first challenge',
        icon: '🎬',
        category: 'milestone',
        tier: 1,
        requirement: {
          type: 'milestone',
          challengesCompleted: 1
        },
        reward: { masteryBoost: 0.5, points: 50 },
        rarity: 'common'
      },
      'challenge-streak-5': {
        id: 'challenge-streak-5',
        name: 'On Fire 🔥',
        description: 'Completed 5 challenges in a row with 75+ score',
        icon: '🔥',
        category: 'streak',
        tier: 2,
        requirement: {
          type: 'streak',
          consecutiveChallenges: 5,
          minScorePerChallenge: 75
        },
        reward: { masteryBoost: 3, points: 250 },
        rarity: 'uncommon'
      },
      'perfect-week': {
        id: 'perfect-week',
        name: 'Perfect Week',
        description: 'Completed 7+ challenges in one week with avg 80+ score',
        icon: '📅',
        category: 'time',
        tier: 2,
        requirement: {
          type: 'timeframe',
          challengesInWeek: 7,
          minAverageScore: 80
        },
        reward: { masteryBoost: 4, points: 400 },
        rarity: 'uncommon'
      },

      // Comprehensive Mastery
      '80-percent-club': {
        id: '80-percent-club',
        name: '80% Club',
        description: 'Achieved 80%+ mastery in any domain',
        icon: '🎖️',
        category: 'mastery',
        tier: 2,
        requirement: {
          type: 'domain_mastery',
          minMastery: 80
        },
        reward: { masteryBoost: 2, points: 200 },
        rarity: 'uncommon'
      },
      'polymath': {
        id: 'polymath',
        name: 'Polymath',
        description: 'Achieved 70%+ mastery in 5+ different domains',
        icon: '🧠',
        category: 'mastery',
        tier: 3,
        requirement: {
          type: 'multi_domain',
          domains: 5,
          minMasteryPerDomain: 70
        },
        reward: { masteryBoost: 5, points: 500, unlockAdvanced: true },
        rarity: 'rare'
      },
      'elite-learner': {
        id: 'elite-learner',
        name: 'Elite Learner',
        description: 'Achieved 85%+ mastery in all tracked domains',
        icon: '👑',
        category: 'mastery',
        tier: 3,
        requirement: {
          type: 'universal_mastery',
          minMastery: 85
        },
        reward: { masteryBoost: 10, points: 1000, unlockMentor: true },
        rarity: 'legendary'
      },

      // Consistency & Dedication
      'marathon-runner': {
        id: 'marathon-runner',
        name: 'Marathon Runner',
        description: 'Maintained 30+ day consecutive learning streak',
        icon: '🏃',
        category: 'dedication',
        tier: 3,
        requirement: {
          type: 'daily_streak',
          consecutiveDays: 30
        },
        reward: { masteryBoost: 5, points: 500 },
        rarity: 'rare'
      },
      'evergreen': {
        id: 'evergreen',
        name: 'Evergreen',
        description: 'Logged 365+ days of learning',
        icon: '🌲',
        category: 'dedication',
        tier: 3,
        requirement: {
          type: 'cumulative_days',
          totalDays: 365
        },
        reward: { masteryBoost: 10, points: 1000 },
        rarity: 'legendary'
      }
    };
  }

  /**
   * Check if user has unlocked a badge
   */
  hasBadge(userId, badgeId) {
    const userBadges = this.userBadges.get(userId) || [];
    return userBadges.some(b => b.badge.id === badgeId);
  }

  /**
   * Unlock a badge for a user
   */
  unlockBadge(userId, badgeId, metadata = {}) {
    const badge = this.badges[badgeId];

    if (!badge) {
      return { success: false, error: 'Badge not found' };
    }

    if (this.hasBadge(userId, badgeId)) {
      return { success: false, error: 'Badge already unlocked' };
    }

    const unlockData = {
      badge,
      unlockedAt: new Date().toISOString(),
      progress: metadata.progress || 100,
      metadata
    };

    if (!this.userBadges.has(userId)) {
      this.userBadges.set(userId, []);
    }

    this.userBadges.get(userId).push(unlockData);

    // Track in history
    if (!this.badgeHistory.has(userId)) {
      this.badgeHistory.set(userId, []);
    }

    this.badgeHistory.get(userId).push({
      badgeId,
      unlockedAt: unlockData.unlockedAt,
      reward: badge.reward
    });

    return {
      success: true,
      badge,
      unlockedAt: unlockData.unlockedAt,
      reward: badge.reward,
      message: `🎉 Congratulations! You unlocked: ${badge.name} (${badge.icon})`
    };
  }

  /**
   * Get user's badge inventory
   */
  getUserBadges(userId) {
    const userBadges = this.userBadges.get(userId) || [];

    return {
      totalUnlocked: userBadges.length,
      totalAvailable: Object.keys(this.badges).length,
      progressPercentage: parseFloat(((userBadges.length / Object.keys(this.badges).length) * 100).toFixed(1)),
      badges: userBadges.map(b => ({
        id: b.badge.id,
        name: b.badge.name,
        icon: b.badge.icon,
        category: b.badge.category,
        tier: b.badge.tier,
        rarity: b.badge.rarity,
        unlockedAt: b.unlockedAt,
        reward: b.badge.reward
      })),
      byCategory: this.groupBadgesByCategory(userBadges),
      byRarity: this.groupBadgesByRarity(userBadges)
    };
  }

  /**
   * Get progress toward locked badges
   */
  getBadgeProgress(userId, badgeId) {
    const badge = this.badges[badgeId];

    if (!badge) {
      return { error: 'Badge not found' };
    }

    if (this.hasBadge(userId, badgeId)) {
      return {
        badgeId,
        name: badge.name,
        status: 'unlocked',
        unlockedAt: this.userBadges.get(userId)
          ?.find(b => b.badge.id === badgeId)?.unlockedAt
      };
    }

    return {
      badgeId,
      name: badge.name,
      icon: badge.icon,
      status: 'locked',
      requirement: badge.requirement,
      reward: badge.reward,
      rarity: badge.rarity,
      howToUnlock: this.getUnlockInstructions(badge)
    };
  }

  /**
   * Get human-readable unlock instructions
   */
  getUnlockInstructions(badge) {
    const req = badge.requirement;

    switch (req.type) {
      case 'challenge_score':
        return `Score ${req.minScore}+ on ${req.challengeId} challenge`;
      case 'mastery_threshold':
        return `Achieve ${req.minMastery}% mastery in ${req.domain}`;
      case 'combined':
        return `${req.conditions.map(c => this.getUnlockInstructions({requirement: c})).join(' AND ')}`;
      case 'milestone':
        return `Complete ${req.challengesCompleted} challenge(s)`;
      case 'streak':
        return `Complete ${req.consecutiveChallenges} challenges in a row with ${req.minScorePerChallenge}+ score`;
      case 'multi_domain':
        return `Achieve ${req.minMasteryPerDomain}%+ mastery in ${req.domains} different domains`;
      default:
        return JSON.stringify(req);
    }
  }

  /**
   * Group badges by category
   */
  groupBadgesByCategory(userBadges) {
    const grouped = {};

    userBadges.forEach(b => {
      const cat = b.badge.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(b.badge.name);
    });

    return grouped;
  }

  /**
   * Group badges by rarity
   */
  groupBadgesByRarity(userBadges) {
    const grouped = {};

    userBadges.forEach(b => {
      const rarity = b.badge.rarity;
      if (!grouped[rarity]) grouped[rarity] = [];
      grouped[rarity].push(b.badge.name);
    });

    return grouped;
  }

  /**
   * Get badge suggestions for next unlock
   */
  getNextBadgeSuggestions(userId, currentProgress) {
    const unlockedIds = new Set(
      this.userBadges.get(userId)?.map(b => b.badge.id) || []
    );

    const suggestions = [];

    Object.values(this.badges)
      .filter(b => !unlockedIds.has(b.id))
      .forEach(badge => {
        const closeToUnlock = this.estimateProgress(badge, currentProgress);
        if (closeToUnlock > 0) {
          suggestions.push({
            badge: {
              id: badge.id,
              name: badge.name,
              icon: badge.icon,
              rarity: badge.rarity
            },
            estimatedProgress: closeToUnlock,
            howToUnlock: this.getUnlockInstructions(badge),
            reward: badge.reward
          });
        }
      });

    return suggestions.sort((a, b) => b.estimatedProgress - a.estimatedProgress).slice(0, 3);
  }

  /**
   * Estimate progress toward a badge
   */
  estimateProgress(badge, currentProgress) {
    // Simplified estimation - would be more sophisticated with actual tracking
    if (badge.requirement.type === 'challenge_score') {
      return (currentProgress.lastChallengeScore || 0) / badge.requirement.minScore;
    }

    if (badge.requirement.type === 'mastery_threshold') {
      return (currentProgress.mastery || 0) / badge.requirement.minMastery;
    }

    return 0;
  }

  /**
   * Get badge statistics
   */
  getStats() {
    return {
      totalBadges: Object.keys(this.badges).length,
      byRarity: Object.values(this.badges).reduce((acc, b) => {
        acc[b.rarity] = (acc[b.rarity] || 0) + 1;
        return acc;
      }, {}),
      byCategory: Object.values(this.badges).reduce((acc, b) => {
        acc[b.category] = (acc[b.category] || 0) + 1;
        return acc;
      }, {}),
      totalUsers: this.userBadges.size,
      averageBadgesPerUser: (
        Array.from(this.userBadges.values())
          .reduce((sum, badges) => sum + badges.length, 0) /
        (this.userBadges.size || 1)
      ).toFixed(2)
    };
  }
}

export default BadgeSystem;
