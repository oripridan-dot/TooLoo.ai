/**
 * Phase 6D: Achievement Badges System
 * 
 * Tier-based badges, progression tracking, and performance rewards
 */

export class BadgesSystem {
  constructor() {
    this.badges = this.initializeBadges();
    this.userBadges = new Map();
    this.progressTracking = new Map();
  }

  /**
   * Initialize all available badges
   */
  initializeBadges() {
    return {
      // Tier 1: Consensus Mastery
      'consensus-novice': {
        id: 'consensus-novice',
        name: 'Consensus Novice',
        tier: 1,
        icon: '🌱',
        description: 'Completed first consensus challenge',
        requirement: { 
          type: 'challenge',
          challengeId: 'consensus-basic',
          minScore: 60,
          count: 1
        },
        reward: {
          masteryBoost: 1,
          unlockAdvanced: false,
          points: 10
        },
        displayOrder: 1
      },
      'consensus-intermediate': {
        id: 'consensus-intermediate',
        name: 'Consensus Architect',
        tier: 2,
        icon: '⚙️',
        description: 'Scored 75+ on Consensus Algorithm challenge',
        requirement: {
          type: 'challenge',
          challengeId: 'consensus-basic',
          minScore: 75,
          count: 1
        },
        reward: {
          masteryBoost: 2,
          unlockAdvanced: false,
          points: 25
        },
        displayOrder: 2
      },
      'consensus-master': {
        id: 'consensus-master',
        name: 'Consensus Master 🎯',
        tier: 3,
        icon: '🏆',
        description: 'Mastered Consensus Algorithms (85%+ score)',
        requirement: {
          type: 'challenge',
          challengeId: 'consensus-basic',
          minScore: 85,
          count: 1
        },
        reward: {
          masteryBoost: 3,
          unlockAdvanced: true,
          points: 50,
          mentorStatus: true
        },
        displayOrder: 3
      },

      // Tier 2: Distributed Transactions
      'saga-apprentice': {
        id: 'saga-apprentice',
        name: 'Saga Apprentice',
        tier: 1,
        icon: '📖',
        description: 'Completed first distributed transactions challenge',
        requirement: {
          type: 'challenge',
          challengeId: 'distributed-transactions',
          minScore: 60,
          count: 1
        },
        reward: {
          masteryBoost: 1,
          unlockAdvanced: false,
          points: 10
        },
        displayOrder: 4
      },
      'saga-expert': {
        id: 'saga-expert',
        name: 'Saga Expert ⚡',
        tier: 3,
        icon: '⚡',
        description: 'Scored 85+ on Distributed Transactions challenge',
        requirement: {
          type: 'challenge',
          challengeId: 'distributed-transactions',
          minScore: 85,
          count: 1
        },
        reward: {
          masteryBoost: 3,
          unlockAdvanced: true,
          points: 50,
          mentorStatus: true
        },
        displayOrder: 5
      },

      // Tier 3: Byzantine Fault Tolerance
      'byzantine-defender': {
        id: 'byzantine-defender',
        name: 'Byzantine Defender 🛡️',
        tier: 3,
        icon: '🛡️',
        description: 'Mastered Byzantine Fault Tolerance concepts',
        requirement: {
          type: 'challenge',
          challengeId: 'fault-tolerance',
          minScore: 80,
          count: 1
        },
        reward: {
          masteryBoost: 3,
          unlockAdvanced: true,
          points: 50,
          mentorStatus: true
        },
        displayOrder: 6
      },

      // System-wide badges
      'system-designer': {
        id: 'system-designer',
        name: 'System Design Expert',
        tier: 3,
        icon: '🏛️',
        description: 'Completed all 3 personalized system design challenges',
        requirement: {
          type: 'multi_challenge',
          challenges: ['consensus-basic', 'distributed-transactions', 'fault-tolerance'],
          minScore: 75,
          count: 3
        },
        reward: {
          masteryBoost: 5,
          unlockAdvanced: true,
          points: 100,
          mentorStatus: true,
          mentorType: 'system-design'
        },
        displayOrder: 7
      },
      '80-percent-club': {
        id: '80-percent-club',
        name: '80% Club 🎖️',
        tier: 2,
        icon: '🎖️',
        description: 'Achieved 80% mastery in Distributed Systems',
        requirement: {
          type: 'mastery_threshold',
          domain: 'distributed',
          targetMastery: 80
        },
        reward: {
          masteryBoost: 2,
          unlockAdvanced: false,
          points: 40
        },
        displayOrder: 8
      },
      'elite-learner': {
        id: 'elite-learner',
        name: 'Elite Learner 👑',
        tier: 3,
        icon: '👑',
        description: 'Achieved 85% mastery in Distributed Systems',
        requirement: {
          type: 'mastery_threshold',
          domain: 'distributed',
          targetMastery: 85
        },
        reward: {
          masteryBoost: 3,
          unlockAdvanced: true,
          points: 75,
          mentorStatus: true,
          mentorType: 'peer-mentor'
        },
        displayOrder: 9
      },

      // Consistency badges
      'consistency-streak': {
        id: 'consistency-streak',
        name: 'Consistency Streaker 🔥',
        tier: 2,
        icon: '🔥',
        description: '7-day practice streak',
        requirement: {
          type: 'streak',
          days: 7
        },
        reward: {
          masteryBoost: 1,
          unlockAdvanced: false,
          points: 30
        },
        displayOrder: 10
      },
      'ironman-learner': {
        id: 'ironman-learner',
        name: 'Iron Learner 💪',
        tier: 3,
        icon: '💪',
        description: '30-day practice streak',
        requirement: {
          type: 'streak',
          days: 30
        },
        reward: {
          masteryBoost: 3,
          unlockAdvanced: true,
          points: 100
        },
        displayOrder: 11
      },

      // Velocity badges
      'velocity-accelerator': {
        id: 'velocity-accelerator',
        name: 'Velocity Accelerator 📈',
        tier: 2,
        icon: '📈',
        description: 'Learning velocity > 0.5% per day',
        requirement: {
          type: 'velocity',
          domain: 'distributed',
          minVelocity: 0.5
        },
        reward: {
          masteryBoost: 2,
          unlockAdvanced: false,
          points: 35
        },
        displayOrder: 12
      },
      'hyperbolic-learner': {
        id: 'hyperbolic-learner',
        name: 'Hyperbolic Learner 🚀',
        tier: 3,
        icon: '🚀',
        description: 'Achieved 1% mastery gain per day',
        requirement: {
          type: 'velocity',
          domain: 'distributed',
          minVelocity: 1.0
        },
        reward: {
          masteryBoost: 3,
          unlockAdvanced: true,
          points: 75
        },
        displayOrder: 13
      }
    };
  }

  /**
   * Check if user qualifies for a badge
   */
  checkBadgeQualification(userId, badgeId, profile, challengeScores = {}, streakData = {}, velocityData = {}) {
    const badge = this.badges[badgeId];
    if (!badge) return false;

    const req = badge.requirement;

    switch (req.type) {
      case 'challenge':
        return challengeScores[req.challengeId] >= req.minScore;

      case 'multi_challenge':
        const completedCount = req.challenges.filter(
          cId => challengeScores[cId] >= req.minScore
        ).length;
        return completedCount >= req.count;

      case 'mastery_threshold':
        const domainData = profile?.find(d => d.topic === req.domain);
        return domainData && domainData.mastery >= req.targetMastery;

      case 'streak':
        return streakData.days >= req.days;

      case 'velocity':
        return velocityData[req.domain] >= req.minVelocity;

      default:
        return false;
    }
  }

  /**
   * Award badge to user
   */
  awardBadge(userId, badgeId, timestamp = new Date().toISOString()) {
    const badge = this.badges[badgeId];
    if (!badge) return null;

    if (!this.userBadges.has(userId)) {
      this.userBadges.set(userId, []);
    }

    const userBadgeList = this.userBadges.get(userId);

    // Check for duplicate
    if (userBadgeList.find(b => b.id === badgeId)) {
      return { awarded: false, reason: 'Already earned' };
    }

    const awardedBadge = {
      ...badge,
      awardedAt: timestamp,
      awardedDaysAgo: 0
    };

    userBadgeList.push(awardedBadge);

    // Track progress
    if (!this.progressTracking.has(userId)) {
      this.progressTracking.set(userId, {
        totalPoints: 0,
        totalBadges: 0,
        tierBreakdown: { 1: 0, 2: 0, 3: 0 }
      });
    }

    const progress = this.progressTracking.get(userId);
    progress.totalPoints += badge.reward.points;
    progress.totalBadges += 1;
    progress.tierBreakdown[badge.tier]++;

    return {
      awarded: true,
      badge: awardedBadge,
      newPoints: badge.reward.points,
      totalPoints: progress.totalPoints
    };
  }

  /**
   * Get user's badges
   */
  getUserBadges(userId) {
    return this.userBadges.get(userId) || [];
  }

  /**
   * Get user's badge progress
   */
  getUserBadgeProgress(userId) {
    const earnedBadges = this.userBadges.get(userId) || [];
    const earnedIds = new Set(earnedBadges.map(b => b.id));
    const availableBadges = Object.values(this.badges);

    return {
      earned: earnedBadges.sort((a, b) => a.displayOrder - b.displayOrder),
      earnedCount: earnedBadges.length,
      totalAvailable: availableBadges.length,
      progress: `${earnedBadges.length}/${availableBadges.length}`,
      nextBadges: availableBadges
        .filter(b => !earnedIds.has(b.id))
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .slice(0, 3)
        .map(b => ({
          ...b,
          status: 'locked',
          howToUnlock: this.getUnlockInstructions(b)
        })),
      tierDistribution: {
        tier1: earnedBadges.filter(b => b.tier === 1).length,
        tier2: earnedBadges.filter(b => b.tier === 2).length,
        tier3: earnedBadges.filter(b => b.tier === 3).length
      },
      totalPoints: this.progressTracking.get(userId)?.totalPoints || 0,
      mentorStatus: earnedBadges.some(b => b.reward.mentorStatus)
    };
  }

  /**
   * Generate human-readable unlock instructions
   */
  getUnlockInstructions(badge) {
    const req = badge.requirement;

    switch (req.type) {
      case 'challenge':
        return `Score ${req.minScore}+ on the "${req.challengeId}" challenge`;
      case 'multi_challenge':
        return `Complete ${req.count} challenges with ${req.minScore}+ score`;
      case 'mastery_threshold':
        return `Achieve ${req.targetMastery}% mastery in ${req.domain}`;
      case 'streak':
        return `Maintain a ${req.days}-day practice streak`;
      case 'velocity':
        return `Reach ${req.minVelocity}% daily learning velocity`;
      default:
        return 'Unknown condition';
    }
  }

  /**
   * Get badges by tier
   */
  getBadgesByTier(tier) {
    return Object.values(this.badges)
      .filter(b => b.tier === tier)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Get achievement path recommendations
   */
  getAchievementPath(userId) {
    const userBadges = this.userBadges.get(userId) || [];
    const earnedIds = new Set(userBadges.map(b => b.id));

    const paths = [
      {
        name: 'Consensus Mastery Path',
        badges: ['consensus-novice', 'consensus-intermediate', 'consensus-master'],
        progress: ['consensus-novice', 'consensus-intermediate', 'consensus-master']
          .map(id => earnedIds.has(id))
          .filter(v => v).length,
        icon: '🎯'
      },
      {
        name: 'System Designer Path',
        badges: [
          'consensus-master',
          'saga-expert',
          'byzantine-defender',
          'system-designer'
        ],
        progress: [
          'consensus-master',
          'saga-expert',
          'byzantine-defender',
          'system-designer'
        ].filter(id => earnedIds.has(id)).length,
        icon: '🏛️'
      },
      {
        name: 'Elite Learner Path',
        badges: ['consistency-streak', 'velocity-accelerator', '80-percent-club', 'elite-learner'],
        progress: ['consistency-streak', 'velocity-accelerator', '80-percent-club', 'elite-learner']
          .filter(id => earnedIds.has(id)).length,
        icon: '👑'
      }
    ];

    return paths.map(path => ({
      ...path,
      completionPercent: Math.round((path.progress / path.badges.length) * 100),
      nextBadge: path.badges.find(id => !earnedIds.has(id))
    }));
  }

  /**
   * Calculate total rewards from badges
   */
  calculateTotalRewards(userId) {
    const userBadges = this.userBadges.get(userId) || [];
    
    return {
      totalPoints: userBadges.reduce((sum, b) => sum + b.reward.points, 0),
      masteryBoost: userBadges.reduce((sum, b) => sum + b.reward.masteryBoost, 0),
      mentorCount: userBadges.filter(b => b.reward.mentorStatus).length,
      advancedAccessUnlocked: userBadges.some(b => b.reward.unlockAdvanced),
      totalBadges: userBadges.length
    };
  }
}

export default BadgesSystem;
