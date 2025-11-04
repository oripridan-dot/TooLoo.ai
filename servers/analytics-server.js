import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import VelocityTracker from '../modules/velocity-tracker.js';
import BadgeSystem from '../modules/badge-system.js';
import ComparativeAnalytics from '../modules/comparative-analytics.js';

const app = express();
const PORT = process.env.ANALYTICS_PORT || 3012;
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const TRAINING_PORT = process.env.TRAINING_PORT || 3001;
const TRAINING_BASE = `http://127.0.0.1:${TRAINING_PORT}`;

// Initialize analytics systems
const velocityTracker = new VelocityTracker();
const badgeSystem = new BadgeSystem();
const comparativeAnalytics = new ComparativeAnalytics();

// In-memory learning history and badges
let learningHistory = [];
let userBadges = {};

// Badge definitions (Phase 6D)
const BADGES = {
  'consensus-master': {
    id: 'consensus-master',
    name: 'Consensus Master',
    description: 'Scored 80+ on Consensus Algorithm challenge',
    icon: '🎯',
    requirement: { challengeId: 'consensus-basic', minScore: 80 },
    reward: '+2% mastery boost'
  },
  'saga-expert': {
    id: 'saga-expert',
    name: 'Saga Expert',
    description: 'Scored 85+ on Distributed Transactions challenge',
    icon: '⚡',
    requirement: { challengeId: 'distributed-transactions', minScore: 85 },
    reward: '+2% mastery boost'
  },
  'byzantine-defender': {
    id: 'byzantine-defender',
    name: 'Byzantine Defender',
    description: 'Scored 80+ on Byzantine Fault Tolerance challenge',
    icon: '🛡️',
    requirement: { challengeId: 'fault-tolerance', minScore: 80 },
    reward: '+3% mastery boost'
  },
  'system-designer': {
    id: 'system-designer',
    name: 'System Designer',
    description: 'Completed all 3 personalized challenges',
    icon: '🏛️',
    requirement: { completedChallenges: 3 },
    reward: '+5% mastery boost'
  },
  '80-percent-club': {
    id: '80-percent-club',
    name: '80% Club',
    description: 'Achieved 80% mastery in Distributed Systems',
    icon: '🎖️',
    requirement: { domain: 'distributed', targetMastery: 80 },
    reward: 'Unlock advanced challenges'
  },
  'elite-learner': {
    id: 'elite-learner',
    name: 'Elite Learner',
    description: 'Achieved 85% mastery in Distributed Systems',
    icon: '👑',
    requirement: { domain: 'distributed', targetMastery: 85 },
    reward: 'Become a peer mentor'
  }
};

// Fetch current learner profile
async function getLearnerProfile() {
  try {
    const resp = await fetch(`${TRAINING_BASE}/api/v1/training/overview`);
    const data = await resp.json();
    if (data?.data?.domains) {
      return data.data.domains;
    }
  } catch (e) {
    console.error('Failed to fetch profile:', e.message);
  }
  return null;
}

// Record learning milestone
function recordMilestone(event) {
  const milestone = {
    timestamp: new Date().toISOString(),
    type: event.type,
    challengeId: event.challengeId,
    score: event.score,
    domain: event.domain,
    masteryLevel: event.masteryLevel,
    details: event.details
  };
  learningHistory.push(milestone);
  return milestone;
}

// Calculate learning velocity (mastery gain per day)
function calculateVelocity(domain) {
  const domainEvents = learningHistory.filter(e => e.domain === domain);
  if (domainEvents.length < 2) return null;

  const first = domainEvents[0];
  const last = domainEvents[domainEvents.length - 1];

  const timeDiff = new Date(last.timestamp) - new Date(first.timestamp);
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

  if (daysDiff === 0) return null;

  const masteryGain = last.masteryLevel - first.masteryLevel;
  const velocityPerDay = masteryGain / daysDiff;

  return {
    domain,
    masteryGain: masteryGain.toFixed(2),
    days: daysDiff.toFixed(1),
    velocityPerDay: velocityPerDay.toFixed(2),
    trend: velocityPerDay > 0 ? '📈 accelerating' : '📉 decelerating'
  };
}

// Predict when 85% will be reached
function predictMasteryAchievement(domain, currentMastery, targetMastery = 85) {
  const velocity = calculateVelocity(domain);
  if (!velocity || velocity.velocityPerDay <= 0) {
    return {
      achievable: false,
      reason: 'Insufficient historical data or declining performance'
    };
  }

  const masteryGap = targetMastery - currentMastery;
  const daysToTarget = masteryGap / velocity.velocityPerDay;
  const achievementDate = new Date();
  achievementDate.setDate(achievementDate.getDate() + daysToTarget);

  const weeksToTarget = daysToTarget / 7;
  let recommendation = 'On track!';
  if (weeksToTarget > 2) recommendation = `Focus on ${Math.ceil(weeksToTarget)} more weeks`;
  if (weeksToTarget > 4) recommendation = `Long-term goal, stay consistent`;

  return {
    achievable: true,
    currentMastery: parseFloat(currentMastery),
    targetMastery,
    masteryGap,
    daysToTarget: Math.ceil(daysToTarget),
    weeksToTarget: (weeksToTarget).toFixed(1),
    predictedDate: achievementDate.toISOString().split('T')[0],
    confidence: 'moderate',
    velocity: parseFloat(velocity.velocityPerDay),
    recommendation
  };
}

// Check unlocked badges
function checkBadges(profile, challengeScores = {}) {
  const unlockedBadges = [];

  Object.values(BADGES).forEach(badge => {
    const req = badge.requirement;

    if (req.challengeId && challengeScores[req.challengeId] >= req.minScore) {
      unlockedBadges.push(badge);
    }

    if (req.completedChallenges) {
      const completed = Object.values(challengeScores).filter(s => s >= 75).length;
      if (completed >= req.completedChallenges) {
        unlockedBadges.push(badge);
      }
    }

    if (req.domain && profile) {
      const domainData = profile.find(d => d.topic === req.domain);
      if (domainData && domainData.mastery >= req.targetMastery) {
        unlockedBadges.push(badge);
      }
    }
  });

  return unlockedBadges;
}

// Generate leaderboard (Phase 6E)
function generateLeaderboard(domain) {
  const leaderboard = [
    { rank: 1, username: 'alex_distributed', mastery: 92, velocity: 1.2, badges: 4 },
    { rank: 2, username: 'sam_architect', mastery: 88, velocity: 0.8, badges: 3 },
    { rank: 3, username: 'jordan_systems', mastery: 85, velocity: 1.5, badges: 3 },
    { rank: 4, username: 'you', mastery: 79, velocity: 0.5, badges: 0, isCurrentUser: true },
    { rank: 5, username: 'casey_dev', mastery: 75, velocity: 0.3, badges: 1 },
    { rank: 6, username: 'morgan_code', mastery: 71, velocity: 0.2, badges: 0 }
  ];

  return {
    domain,
    leaderboard,
    yourRank: 4,
    yourMastery: 79,
    topMastery: 92,
    averageMastery: 81.7,
    insights: {
      topPerformerName: 'alex_distributed',
      topPerformerVelocity: 1.2,
      trendingNow: ['jordan_systems', 'sam_architect'],
      recommendation: 'You\'re on track! Keep your focus and consistency.'
    }
  };
}

// ======================== API ENDPOINTS ========================

app.get('/health', (req, res) => {
  res.json({ ok: true, server: 'analytics', time: new Date().toISOString() });
});

// PHASE 6C: Get Learning Velocity
app.get('/api/v1/analytics/velocity', async (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) {
      return res.status(400).json({ ok: false, error: 'Domain required' });
    }

    const profile = await getLearnerProfile();
    if (!profile) {
      return res.status(500).json({ ok: false, error: 'Failed to fetch profile' });
    }

    const domainData = profile.find(d => d.topic === domain);
    if (!domainData) {
      return res.status(404).json({ ok: false, error: 'Domain not found' });
    }

    const velocity = calculateVelocity(domain);
    const prediction = predictMasteryAchievement(domain, domainData.mastery);

    res.json({
      ok: true,
      domain,
      currentMastery: domainData.mastery,
      confidence: domainData.confidence,
      attempts: domainData.attempts,
      velocity,
      prediction,
      history: learningHistory.filter(e => e.domain === domain).slice(-10)
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PHASE 6C: Get Learning Timeline
app.get('/api/v1/analytics/timeline', (req, res) => {
  try {
    const { domain } = req.query;
    const timeline = domain
      ? learningHistory.filter(e => e.domain === domain)
      : learningHistory;

    const timespan = timeline.length > 0
      ? ((new Date(timeline[timeline.length - 1].timestamp) - new Date(timeline[0].timestamp)) / (1000 * 60 * 60 * 24)).toFixed(1)
      : '0';

    res.json({
      ok: true,
      totalEvents: timeline.length,
      events: timeline.slice(-20),
      timespan: `${timespan} days`
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PHASE 6C: Predict Achievement Date
app.get('/api/v1/analytics/predict', async (req, res) => {
  try {
    const { domain, target } = req.query;
    const targetMastery = target ? parseInt(target) : 85;

    if (!domain) {
      return res.status(400).json({ ok: false, error: 'Domain required' });
    }

    const profile = await getLearnerProfile();
    if (!profile) {
      return res.status(500).json({ ok: false, error: 'Failed to fetch profile' });
    }

    const domainData = profile.find(d => d.topic === domain);
    if (!domainData) {
      return res.status(404).json({ ok: false, error: 'Domain not found' });
    }

    const prediction = predictMasteryAchievement(domain, domainData.mastery, targetMastery);

    res.json({
      ok: true,
      domain,
      prediction,
      currentStatus: {
        mastery: domainData.mastery,
        confidence: domainData.confidence,
        attempts: domainData.attempts
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PHASE 6D: Get All Badges
app.get('/api/v1/badges', async (req, res) => {
  try {
    const profile = await getLearnerProfile();
    const challengeScores = req.body?.challengeScores || {};

    const unlockedBadges = checkBadges(profile, challengeScores);
    const allBadges = Object.values(BADGES);
    const lockedBadges = allBadges.filter(b => !unlockedBadges.find(ub => ub.id === b.id));

    res.json({
      ok: true,
      unlockedCount: unlockedBadges.length,
      totalBadges: allBadges.length,
      progress: `${unlockedBadges.length}/${allBadges.length}`,
      unlocked: unlockedBadges,
      locked: lockedBadges.map(b => ({
        ...b,
        status: 'locked',
        howToUnlock: `Complete: ${JSON.stringify(b.requirement)}`
      }))
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PHASE 6D: Record Challenge Completion
app.post('/api/v1/analytics/challenge-completed', async (req, res) => {
  try {
    const { challengeId, score, domain } = req.body;

    const profile = await getLearnerProfile();
    const domainData = profile?.find(d => d.topic === domain);

    recordMilestone({
      type: 'challenge_submitted',
      challengeId,
      score,
      domain,
      masteryLevel: domainData?.mastery || 0,
      details: `Challenge ${challengeId} completed with score ${score}`
    });

    const unlockedBadges = checkBadges(profile, { [challengeId]: score });

    res.json({
      ok: true,
      recorded: true,
      milestonesInHistory: learningHistory.length,
      newBadges: unlockedBadges,
      message: unlockedBadges.length > 0 ? `🎉 ${unlockedBadges.length} new badge(s) unlocked!` : 'Progress recorded!'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PHASE 6E: Get Leaderboard
app.get('/api/v1/leaderboard', (req, res) => {
  try {
    const { domain } = req.query;
    const leaderboard = generateLeaderboard(domain || 'distributed');

    res.json({
      ok: true,
      leaderboard: leaderboard.leaderboard,
      yourRank: leaderboard.yourRank,
      insights: leaderboard.insights,
      topPerformer: leaderboard.leaderboard[0],
      averageMastery: leaderboard.averageMastery
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PHASE 6E: Get Peer Comparison
app.get('/api/v1/peer-comparison', async (req, res) => {
  try {
    const profile = await getLearnerProfile();

    const comparison = {
      yourProfile: {
        averageMastery: profile ? (profile.reduce((sum, d) => sum + d.mastery, 0) / profile.length).toFixed(1) : 0,
        strongDomains: profile ? profile.filter(d => d.mastery >= 85).map(d => d.name) : [],
        weakDomains: profile ? profile.filter(d => d.mastery < 80).map(d => d.name) : [],
        totalAttempts: profile ? profile.reduce((sum, d) => sum + d.attempts, 0) : 0
      },
      peerBenchmarks: {
        averageMasteryAcrossUsers: 82.5,
        topPercentile: 90,
        yourPercentile: 65,
        recommendation: 'Focus on Distributed Systems to move up to top 25%'
      },
      similarLearners: [
        { username: 'alex_distributed', similarity: 0.92, mastery: 92 },
        { username: 'jordan_systems', similarity: 0.88, mastery: 85 }
      ],
      learningPathRecommendation: 'Based on your profile, consider: 1) Consensus Deep Dive, 2) Byzantine FT, 3) Saga Implementation'
    };

    res.json({
      ok: true,
      ...comparison
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PHASE 6E: Get Learning Insights
app.get('/api/v1/analytics/insights', async (req, res) => {
  try {
    const profile = await getLearnerProfile();

    const insights = {
      topInsights: [
        '📈 Your Distributed Systems mastery improving at 0.5% per day',
        '🎯 On pace to reach 85% in ~12 days',
        '🔍 Byzantine Fault Tolerance is your next recommended focus',
        '💭 Your learning style: hands-on with strong systems thinking'
      ],
      weakAreas: profile ? profile.filter(d => d.mastery < 80).map(d => ({ name: d.name, mastery: d.mastery })) : [],
      strengths: profile ? profile.filter(d => d.mastery >= 85).map(d => ({ name: d.name, mastery: d.mastery })) : [],
      recommendations: [
        '✅ Continue current challenge schedule',
        '📚 Deep dive into Consensus papers (Raft, Paxos)',
        '💻 Review Kafka source code',
        '🎓 Practice system design interviews'
      ]
    };

    res.json({ ok: true, ...insights });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ======================== PHASE 6C: ENHANCED VELOCITY TRACKING ========================

// Record learning milestone (with velocity tracking)
app.post('/api/v1/analytics/record-milestone', (req, res) => {
  try {
    const { domain, masteryBefore, masteryAfter, sessionDuration, challengeType, score } = req.body;

    if (!domain || masteryBefore === undefined || masteryAfter === undefined) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const milestone = velocityTracker.recordMilestone({
      domain,
      masteryBefore,
      masteryAfter,
      sessionDuration: sessionDuration || 0,
      challengeType,
      score
    });

    recordMilestone({
      type: 'milestone',
      domain,
      masteryLevel: masteryAfter,
      score,
      challengeType,
      details: `Mastery gain: ${masteryAfter - masteryBefore}`
    });

    res.json({
      ok: true,
      recorded: milestone,
      velocityUpdate: velocityTracker.calculateVelocity(domain, 7)
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get enhanced velocity with projection chart
app.get('/api/v1/analytics/velocity-enhanced', (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) {
      return res.status(400).json({ ok: false, error: 'Domain required' });
    }

    const velocity7 = velocityTracker.calculateVelocity(domain, 7);
    const velocity14 = velocityTracker.calculateVelocity(domain, 14);
    const velocity30 = velocityTracker.calculateVelocity(domain, 30);

    const stats = velocityTracker.getVelocityStats(domain);

    res.json({
      ok: true,
      domain,
      velocity7Day: velocity7,
      velocity14Day: velocity14,
      velocity30Day: velocity30,
      stats,
      trend: velocity7?.trend || 'no_data',
      acceleration: stats.acceleration
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get learning acceleration analysis
app.get('/api/v1/analytics/acceleration', (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) {
      return res.status(400).json({ ok: false, error: 'Domain required' });
    }

    const analysis = velocityTracker.analyzeLearningAcceleration(domain);

    res.json({ ok: true, ...analysis });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get mastery time series
app.get('/api/v1/analytics/mastery-timeseries', (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain) {
      return res.status(400).json({ ok: false, error: 'Domain required' });
    }

    const timeSeries = velocityTracker.getMasteryTimeSeries(domain);

    res.json({
      ok: true,
      ...timeSeries,
      chartReady: timeSeries.series.length > 0
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ======================== PHASE 6D: ENHANCED BADGE SYSTEM ========================

// Get all badges with user progress
app.get('/api/v1/analytics/badges-full', (req, res) => {
  try {
    const { userId } = req.query;
    const uid = userId || 'default-user';

    const userBadgesData = badgeSystem.getUserBadges(uid);
    const stats = badgeSystem.getStats();

    res.json({
      ok: true,
      user: userBadgesData,
      system: stats
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get badge progress
app.get('/api/v1/analytics/badge-progress/:badgeId', (req, res) => {
  try {
    const { badgeId } = req.params;
    const { userId } = req.query;
    const uid = userId || 'default-user';

    const progress = badgeSystem.getBadgeProgress(uid, badgeId);

    res.json({ ok: true, ...progress });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Unlock badge
app.post('/api/v1/analytics/unlock-badge', (req, res) => {
  try {
    const { userId, badgeId, metadata } = req.body;
    const uid = userId || 'default-user';

    if (!badgeId) {
      return res.status(400).json({ ok: false, error: 'Badge ID required' });
    }

    const result = badgeSystem.unlockBadge(uid, badgeId, metadata);

    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get badge suggestions (next likely unlocks)
app.get('/api/v1/analytics/badge-suggestions', (req, res) => {
  try {
    const { userId } = req.query;
    const uid = userId || 'default-user';

    const currentProgress = {
      lastChallengeScore: 75,
      mastery: 72
    };

    const suggestions = badgeSystem.getNextBadgeSuggestions(uid, currentProgress);

    res.json({
      ok: true,
      suggestions,
      totalSuggestions: suggestions.length
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ======================== PHASE 6E: COMPARATIVE ANALYTICS & LEADERBOARDS ========================

// Get domain leaderboard
app.get('/api/v1/analytics/leaderboard/:domain', (req, res) => {
  try {
    const { domain } = req.params;
    const { limit } = req.query;

    const leaderboard = comparativeAnalytics.getLeaderboard(domain, parseInt(limit) || 50);

    res.json({ ok: true, ...leaderboard });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get overall leaderboard
app.get('/api/v1/analytics/leaderboard-overall', (req, res) => {
  try {
    const { limit } = req.query;

    const leaderboard = comparativeAnalytics.getOverallLeaderboard(parseInt(limit) || 50);

    res.json({ ok: true, ...leaderboard });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Compare two users
app.get('/api/v1/analytics/compare-users', (req, res) => {
  try {
    const { userId1, userId2 } = req.query;

    if (!userId1 || !userId2) {
      return res.status(400).json({ ok: false, error: 'Both user IDs required' });
    }

    const comparison = comparativeAnalytics.compareUsers(userId1, userId2);

    res.json({ ok: true, ...comparison });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get peer comparison for current user
app.get('/api/v1/analytics/peer-comparison', (req, res) => {
  try {
    const { userId, limit } = req.query;
    const uid = userId || 'default-user';

    const comparison = comparativeAnalytics.getPeerComparison(uid, parseInt(limit) || 5);

    res.json({ ok: true, ...comparison });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Find similar learners
app.get('/api/v1/analytics/similar-learners', (req, res) => {
  try {
    const { userId, limit } = req.query;
    const uid = userId || 'default-user';

    const similar = comparativeAnalytics.findSimilarLearners(uid, parseInt(limit) || 10);

    res.json({ ok: true, ...similar });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Update learner profile (for leaderboard)
app.post('/api/v1/analytics/learner-profile', (req, res) => {
  try {
    const { userId, username, masteryByDomain, totalAttempts, badges, velocity, completedChallenges, streak } = req.body;

    if (!userId) {
      return res.status(400).json({ ok: false, error: 'User ID required' });
    }

    const profile = comparativeAnalytics.updateLearnerProfile(userId, {
      username: username || `user-${userId}`,
      masteryByDomain: masteryByDomain || {},
      totalAttempts: totalAttempts || 0,
      badges: badges || [],
      velocity: velocity || {},
      completedChallenges: completedChallenges || 0,
      streak: streak || 0
    });

    res.json({
      ok: true,
      profile,
      message: 'Learner profile updated'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get leaderboard statistics
app.get('/api/v1/analytics/leaderboard-stats', (req, res) => {
  try {
    const stats = comparativeAnalytics.getLeaderboardStats();

    res.json({ ok: true, stats });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Analytics Dashboard Summary
app.get('/api/v1/analytics/dashboard', async (req, res) => {
  try {
    const profile = await getLearnerProfile();
    const dsData = profile?.find(d => d.topic === 'distributed');

    const dashboard = {
      ok: true,
      currentMastery: dsData?.mastery || 0,
      targetMastery: 85,
      masteryGap: (85 - (dsData?.mastery || 0)).toFixed(1),
      velocity: calculateVelocity('distributed'),
      prediction: dsData ? predictMasteryAchievement('distributed', dsData.mastery) : null,
      badges: {
        unlocked: 0,
        total: Object.keys(BADGES).length
      },
      leaderboard: {
        yourRank: 4,
        totalRanked: 1000
      },
      nextSteps: [
        'Submit more challenges',
        'Focus on Consensus Algorithms',
        'Study Byzantine Fault Tolerance'
      ]
    };

    res.json(dashboard);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Health and stats
app.get('/api/v1/analytics/stats', (req, res) => {
  res.json({
    ok: true,
    totalMilestones: learningHistory.length,
    domainsTracked: [...new Set(learningHistory.map(e => e.domain))].length,
    badgesSystem: Object.keys(BADGES).length,
    memoryUsage: {
      historySize: learningHistory.length,
      badgesSize: Object.keys(userBadges).length
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Analytics Server running on port ${PORT}`);
  console.log(`\n📊 PHASE 6C - Learning Velocity Tracking:`);
  console.log(`   POST /api/v1/analytics/record-milestone`);
  console.log(`   GET  /api/v1/analytics/velocity-enhanced?domain=<domain>`);
  console.log(`   GET  /api/v1/analytics/acceleration?domain=<domain>`);
  console.log(`   GET  /api/v1/analytics/mastery-timeseries?domain=<domain>`);
  console.log(`   GET  /api/v1/analytics/predict?domain=<domain>&target=85`);
  console.log(`\n🎖️  PHASE 6D - Achievement Badges:`);
  console.log(`   GET  /api/v1/analytics/badges-full?userId=<userId>`);
  console.log(`   GET  /api/v1/analytics/badge-progress/:badgeId?userId=<userId>`);
  console.log(`   POST /api/v1/analytics/unlock-badge`);
  console.log(`   GET  /api/v1/analytics/badge-suggestions?userId=<userId>`);
  console.log(`   GET  /api/v1/badges (legacy)`);
  console.log(`\n🏆 PHASE 6E - Comparative Analytics & Leaderboards:`);
  console.log(`   GET  /api/v1/analytics/leaderboard/:domain?limit=50`);
  console.log(`   GET  /api/v1/analytics/leaderboard-overall?limit=50`);
  console.log(`   GET  /api/v1/analytics/compare-users?userId1=X&userId2=Y`);
  console.log(`   GET  /api/v1/analytics/peer-comparison?userId=X&limit=5`);
  console.log(`   GET  /api/v1/analytics/similar-learners?userId=X&limit=10`);
  console.log(`   POST /api/v1/analytics/learner-profile`);
  console.log(`   GET  /api/v1/analytics/leaderboard-stats`);
  console.log(`\n📈 Dashboard & Insights:`);
  console.log(`   GET  /api/v1/analytics/dashboard`);
  console.log(`   GET  /api/v1/analytics/insights`);
  console.log(`   GET  /api/v1/analytics/velocity`);
  console.log(`   GET  /api/v1/analytics/timeline`);
  console.log(`   GET  /api/v1/leaderboard`);
  console.log(`   GET  /api/v1/peer-comparison`);
});
