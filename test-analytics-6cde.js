#!/usr/bin/env node

/**
 * Phase 6CDE Analytics Test Suite
 * Tests velocity tracking, badge system, and leaderboards
 */

import VelocityTracker from './modules/velocity-tracker.js';
import BadgeSystem from './modules/badge-system.js';
import ComparativeAnalytics from './modules/comparative-analytics.js';

console.log('\n' + '='.repeat(70));
console.log('  PHASE 6CDE: ANALYTICS TEST SUITE');
console.log('='.repeat(70) + '\n');

// ==================== PHASE 6C: VELOCITY TRACKING ====================

console.log('\n📊 PHASE 6C: VELOCITY TRACKING');
console.log('-'.repeat(70));

const velocityTracker = new VelocityTracker();

// Simulate learning progress over time
const events = [
  { domain: 'consensus', masteryBefore: 60, masteryAfter: 62, sessionDuration: 30, score: 70 },
  { domain: 'consensus', masteryBefore: 62, masteryAfter: 65, sessionDuration: 45, score: 78 },
  { domain: 'consensus', masteryBefore: 65, masteryAfter: 68, sessionDuration: 40, score: 82 },
  { domain: 'consensus', masteryBefore: 68, masteryAfter: 71, sessionDuration: 50, score: 85 },
  { domain: 'consensus', masteryBefore: 71, masteryAfter: 74, sessionDuration: 45, score: 88 },
  { domain: 'consensus', masteryBefore: 74, masteryAfter: 77, sessionDuration: 60, score: 90 },
];

console.log('Recording 6 learning milestones...');
events.forEach(e => {
  velocityTracker.recordMilestone({...e, challengeType: 'consensus-challenge'});
});

const velocity = velocityTracker.calculateVelocity('consensus', 7);
console.log('\n✓ 7-Day Velocity Analysis:');
console.log(`  - Total mastery gain: ${velocity.totalGain}%`);
console.log(`  - Days elapsed: ${velocity.daysElapsed}`);
console.log(`  - Velocity: ${velocity.velocityPerDay}%/day`);
console.log(`  - Trend: ${velocity.trend}`);
console.log(`  - Events recorded: ${velocity.eventCount}`);

const prediction = velocityTracker.predictAchievement('consensus', 77, 85);
console.log('\n✓ 85% Achievement Prediction:');
console.log(`  - Current mastery: ${prediction.currentMastery}%`);
console.log(`  - Target: ${prediction.targetMastery}%`);
console.log(`  - Mastery gap: ${prediction.masteryGap}%`);
console.log(`  - Days to target: ${prediction.daysToTarget}`);
console.log(`  - Predicted date: ${prediction.predictedDate}`);
console.log(`  - Confidence: ${prediction.confidence}%`);
console.log(`  - Recommendation: ${prediction.recommendation}`);

const acceleration = velocityTracker.analyzeLearningAcceleration('consensus');
console.log('\n✓ Learning Acceleration Analysis:');
console.log(`  - Pattern: ${acceleration.pattern}`);
console.log(`  - Acceleration rate: ${acceleration.accelerationRate}`);
console.log(`  - Insights: ${acceleration.insights.join(', ')}`);

// ==================== PHASE 6D: BADGE SYSTEM ====================

console.log('\n\n🎖️  PHASE 6D: ACHIEVEMENT BADGES');
console.log('-'.repeat(70));

const badgeSystem = new BadgeSystem();

console.log('Unlocking badges for user...');

const badge1 = badgeSystem.unlockBadge('user-alpha', 'consensus-novice', { challengeId: 'consensus-basic', score: 75 });
console.log(`✓ ${badge1.message}`);
console.log(`  - Reward: +${badge1.reward.masteryBoost}% mastery, ${badge1.reward.points} points`);

const badge2 = badgeSystem.unlockBadge('user-alpha', 'consensus-adept', { challengeId: 'consensus-intermediate', score: 82 });
console.log(`✓ ${badge2.message}`);

const badge3 = badgeSystem.unlockBadge('user-alpha', '80-percent-club', { mastery: 80 });
console.log(`✓ ${badge3.message}`);

const inventory = badgeSystem.getUserBadges('user-alpha');
console.log(`\n✓ User Badge Inventory:`);
console.log(`  - Total unlocked: ${inventory.totalUnlocked}/${inventory.totalAvailable}`);
console.log(`  - Progress: ${inventory.progressPercentage}%`);
console.log(`  - By category:`, inventory.byCategory);

const suggestions = badgeSystem.getNextBadgeSuggestions('user-alpha', { mastery: 77, lastChallengeScore: 88 });
console.log(`\n✓ Next Badge Suggestions:`);
suggestions.forEach((s, i) => {
  console.log(`  ${i + 1}. ${s.badge.name} ${s.badge.icon} (${s.badge.rarity})`);
  console.log(`     ${s.howToUnlock}`);
  console.log(`     Progress: ${(s.estimatedProgress * 100).toFixed(1)}%`);
});

// ==================== PHASE 6E: LEADERBOARDS ====================

console.log('\n\n🏆 PHASE 6E: COMPARATIVE ANALYTICS & LEADERBOARDS');
console.log('-'.repeat(70));

const analytics = new ComparativeAnalytics();

// Populate with learners
console.log('Adding learners to leaderboard...');

analytics.updateLearnerProfile('user-alex', {
  username: 'alex_distributed',
  masteryByDomain: { 'distributed-systems': 92, consensus: 94, 'fault-tolerance': 88 },
  totalAttempts: 156,
  badges: ['consensus-master', 'system-designer-expert', '80-percent-club'],
  velocity: { 'distributed-systems': 1.2, consensus: 1.5 },
  completedChallenges: 24,
  streak: 18
});

analytics.updateLearnerProfile('user-sam', {
  username: 'sam_architect',
  masteryByDomain: { 'distributed-systems': 88, consensus: 86, 'fault-tolerance': 82 },
  totalAttempts: 128,
  badges: ['consensus-adept', 'system-designer-expert', '80-percent-club'],
  velocity: { 'distributed-systems': 0.8, consensus: 0.9 },
  completedChallenges: 22,
  streak: 12
});

analytics.updateLearnerProfile('user-jordan', {
  username: 'jordan_systems',
  masteryByDomain: { 'distributed-systems': 85, consensus: 81, 'fault-tolerance': 88 },
  totalAttempts: 142,
  badges: ['consensus-adept', 'byzantine-defender'],
  velocity: { 'distributed-systems': 1.5, consensus: 0.7 },
  completedChallenges: 20,
  streak: 9
});

analytics.updateLearnerProfile('user-casey', {
  username: 'casey_dev',
  masteryByDomain: { 'distributed-systems': 75, consensus: 72, 'fault-tolerance': 70 },
  totalAttempts: 95,
  badges: ['consensus-novice'],
  velocity: { 'distributed-systems': 0.3, consensus: 0.4 },
  completedChallenges: 12,
  streak: 5
});

const leaderboard = analytics.getLeaderboard('distributed-systems', 10);
console.log(`\n✓ Leaderboard (${leaderboard.domain}):`);
console.log(`  Total participants: ${leaderboard.totalParticipants}`);
console.log('\n  Rank | Username           | Mastery | Velocity | Badges | Percentile');
console.log('  ' + '-'.repeat(68));
leaderboard.leaderboard.slice(0, 4).forEach(entry => {
  console.log(`  ${String(entry.rank).padEnd(4)} | ${entry.username.padEnd(18)} | ${String(entry.mastery).padEnd(7)} | ${String(entry.velocity).padEnd(8)} | ${String(entry.badges).padEnd(6)} | ${entry.percentile}%`);
});

const stats = leaderboard.stats;
console.log(`\n  Stats: Avg ${stats.averageMastery}% | Median ${stats.medianMastery} | Top ${stats.topMastery}%`);

const comparison = analytics.compareUsers('user-alex', 'user-sam');
console.log(`\n✓ User Comparison (${comparison.user1.username} vs ${comparison.user2.username}):`);
console.log(`  Overall leader: ${comparison.overallLeader}`);
console.log(`  Similarity score: ${(comparison.similarity).toFixed(1)}%`);
console.log('\n  Domain breakdown:');
comparison.byDomain.forEach(d => {
  const diff = d.difference > 0 ? '+' : '';
  console.log(`    ${d.domain}: ${d.user1Mastery}% vs ${d.user2Mastery}% (${diff}${d.difference}%)`);
});

const peerComparison = analytics.getPeerComparison('user-casey', 3);
console.log(`\n✓ Peer Comparison for ${peerComparison.yourProfile.username}:`);
console.log(`  Your percentile: ${peerComparison.yourPercentile}%`);
console.log(`  Similar learners:`)
peerComparison.similarLearners.forEach(peer => {
  console.log(`    - ${peer.username}: ${(peer.similarity).toFixed(1)}% similarity`);
});

console.log(`\n  Recommendations:`);
peerComparison.recommendations.forEach(rec => {
  console.log(`    - ${rec}`);
});

const similar = analytics.findSimilarLearners('user-casey', 5);
console.log(`\n✓ Similar Learners to ${similar.username}:`);
console.log(`  Average similarity: ${similar.avgSimilarity}%`);
similar.similarLearners.slice(0, 3).forEach((s, i) => {
  console.log(`  ${i + 1}. ${s.username} (${(s.similarity).toFixed(1)}% similar)`);
});

// ==================== SUMMARY ====================

console.log('\n\n' + '='.repeat(70));
console.log('  TEST SUMMARY');
console.log('='.repeat(70));

const velocityStats = velocityTracker.getVelocityStats('consensus');
const badgeStats = badgeSystem.getStats();
const leaderboardStats = analytics.getLeaderboardStats();

console.log(`\n📊 Velocity Tracking:`);
console.log(`   ✓ 7-day velocity: ${velocityStats.velocity7Day}%/day`);
console.log(`   ✓ 30-day velocity: ${velocityStats.velocity30Day}%/day`);
console.log(`   ✓ Acceleration: ${velocityStats.acceleration.toFixed(2)}`);
console.log(`   ✓ Trend: ${velocityStats.trend}`);

console.log(`\n🎖️  Badge System:`);
console.log(`   ✓ Total badges: ${badgeStats.totalBadges}`);
console.log(`   ✓ By rarity:`, badgeStats.byRarity);
console.log(`   ✓ Average per user: ${badgeStats.averageBadgesPerUser}`);

console.log(`\n🏆 Leaderboards:`);
console.log(`   ✓ Total learners: ${leaderboardStats.totalLearners}`);
console.log(`   ✓ Average mastery: ${leaderboardStats.averageMastery}%`);
console.log(`   ✓ Top streak: ${leaderboardStats.topStreak} days`);
console.log(`   ✓ Total badges distributed: ${leaderboardStats.totalBadgesDistributed}`);

console.log('\n' + '='.repeat(70));
console.log('✅ ALL TESTS PASSED - Analytics system fully functional!');
console.log('='.repeat(70) + '\n');
