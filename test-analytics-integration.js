#!/usr/bin/env node

/**
 * Integration Test: Analytics + Training + Coach
 * 
 * Tests the complete integration between:
 * - Analytics Server (3012)
 * - Training Server (3001)
 * - Coach Server (3004)
 * 
 * Usage: node test-analytics-integration.js
 */

import fetch from 'node-fetch';
import AnalyticsIntegration from './modules/analytics-integration.js';

const ANALYTICS_PORT = process.env.ANALYTICS_PORT || 3012;
const TRAINING_PORT = process.env.TRAINING_PORT || 3001;
const COACH_PORT = process.env.COACH_PORT || 3004;

const analytics = new AnalyticsIntegration();

let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  try {
    process.stdout.write(`  ⏳ ${name}... `);
    const result = await fn();
    if (result === false) {
      console.log('❌ FAILED');
      testsFailed++;
    } else {
      console.log('✅');
      testsPassed++;
    }
  } catch (e) {
    console.log(`❌ ERROR: ${e.message}`);
    testsFailed++;
  }
}

async function checkHealth(name, port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, { timeout: 2000 });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║   Integration Test: Analytics + Training + Coach               ║
║                                                                ║
║   Analytics Port: ${ANALYTICS_PORT}
║   Training Port:  ${TRAINING_PORT}
║   Coach Port:     ${COACH_PORT}
╚════════════════════════════════════════════════════════════════╝
`);

  // Phase 1: Service Health
  console.log('🏥 PHASE 1: Service Health Checks');
  console.log('─────────────────────────────────────────────────');

  await test('Analytics server responds to /health', () =>
    checkHealth('analytics', ANALYTICS_PORT)
  );

  const trainingUp = await checkHealth('training', TRAINING_PORT);
  await test('Training server responds to /health', () => trainingUp);

  const coachUp = await checkHealth('coach', COACH_PORT);
  await test('Coach server responds to /health', () => coachUp);

  console.log('');

  // Phase 2: Analytics Functionality
  console.log('📊 PHASE 2: Analytics Core Functionality');
  console.log('─────────────────────────────────────────────────');

  let userId = `test-user-${Date.now()}`;

  // Record milestones
  await test('Record challenge milestone', async () => {
    const res = await analytics.recordChallengeMilestone(
      userId,
      'consensus-basic',
      85,
      'consensus'
    );
    return res.ok !== false;
  });

  // Get velocity
  await test('Get velocity tracking', async () => {
    const res = await analytics.getVelocity('consensus', 30);
    return res.ok !== false && res.velocity !== undefined;
  });

  // Get prediction
  await test('Get 85% achievement prediction', async () => {
    const res = await analytics.predictAchievement('consensus', 75);
    return res.ok !== false && res.prediction !== undefined;
  });

  // Get acceleration
  await test('Get acceleration analysis', async () => {
    const res = await analytics.getAcceleration('consensus');
    return res.ok !== false;
  });

  console.log('');

  // Phase 3: Badge System
  console.log('🎖️  PHASE 3: Badge System (Phase 6D)');
  console.log('─────────────────────────────────────────────────');

  await test('Get badge suggestions', async () => {
    const res = await analytics.getBadgeSuggestions(userId);
    return res.ok !== false || res.suggestions !== undefined;
  });

  await test('Get user badges', async () => {
    const res = await analytics.getUserBadges(userId);
    return res.ok !== false;
  });

  await test('Unlock a badge', async () => {
    const res = await analytics.unlockBadge(userId, 'consensus-master');
    return res.ok !== false;
  });

  console.log('');

  // Phase 4: Leaderboards
  console.log('🏆 PHASE 4: Comparative Leaderboards (Phase 6E)');
  console.log('─────────────────────────────────────────────────');

  // Add some test data
  await test('Update learner profile', async () => {
    const res = await analytics.updateLearnerProfile(userId, {
      masteryScores: { consensus: 85, 'system-design': 70 },
      streakDays: 10,
      totalChallenges: 25
    });
    return res.ok !== false;
  });

  await test('Get domain leaderboard', async () => {
    const res = await analytics.getLeaderboard('consensus', 10);
    return res.ok !== false && res.leaderboard !== undefined;
  });

  await test('Get overall leaderboard', async () => {
    const res = await analytics.getOverallLeaderboard(10);
    return res.ok !== false && res.leaderboard !== undefined;
  });

  await test('Get peer analysis', async () => {
    const res = await analytics.getPeerAnalysis(userId, 5);
    return res.ok !== false;
  });

  console.log('');

  // Phase 5: Training Integration (if available)
  if (trainingUp) {
    console.log('🔗 PHASE 5: Training Server Integration');
    console.log('─────────────────────────────────────────────────');

    await test('Training server reports status', async () => {
      const res = await fetch(`http://127.0.0.1:${TRAINING_PORT}/api/v1/training/status`);
      return res.status === 200;
    });

    await test('Training server has overview data', async () => {
      const res = await fetch(`http://127.0.0.1:${TRAINING_PORT}/api/v1/training/overview`);
      const json = await res.json();
      return json.ok === true && json.data !== undefined;
    });

    console.log('');
  }

  // Phase 6: Coach Integration (if available)
  if (coachUp) {
    console.log('🎯 PHASE 6: Coach Server Integration');
    console.log('─────────────────────────────────────────────────');

    await test('Coach server health check', async () => {
      const res = await fetch(`http://127.0.0.1:${COACH_PORT}/api/v1/auto-coach/status`);
      return res.status === 200;
    });

    console.log('');
  }

  // Phase 7: Dashboard
  console.log('📈 PHASE 7: Analytics Dashboard');
  console.log('─────────────────────────────────────────────────');

  await test('Get analytics dashboard', async () => {
    const res = await analytics.getDashboard();
    return res.ok !== false;
  });

  console.log('');

  // Summary
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST SUMMARY                            ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Passed: ${testsPassed.toString().padEnd(50)} │`);
  console.log(`║  ❌ Failed: ${testsFailed.toString().padEnd(50)} │`);
  console.log('╠════════════════════════════════════════════════════════════════╣');

  if (testsFailed === 0) {
    console.log('║                                                                ║');
    console.log('║          🎉 ALL INTEGRATION TESTS PASSED! 🎉                 ║');
    console.log('║                                                                ║');
    console.log('║  System is ready for:                                         ║');
    console.log('║  • Production deployment                                     ║');
    console.log('║  • Full training integration                                 ║');
    console.log('║  • Analytics-driven coaching                                 ║');
    console.log('║                                                                ║');
  } else {
    console.log('║                                                                ║');
    console.log('║  ⚠️  Some tests failed. Review above for details.             ║');
    console.log('║                                                                ║');
  }

  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (testsFailed === 0) {
    console.log('📚 Next Steps:');
    console.log('  1. Deploy with orchestration: npm run dev');
    console.log('  2. Build analytics UI dashboard');
    console.log('  3. Connect training server data feeds');
    console.log('  4. Configure coach server to use predictions');
    console.log('  5. Monitor production metrics');
    console.log('');
    process.exit(0);
  } else {
    console.log('⚠️  Troubleshooting:');
    console.log(`  • Ensure analytics server is running on port ${ANALYTICS_PORT}`);
    console.log('  • Check analytics-server.log for errors');
    console.log('  • Verify all services are up: npm run dev');
    console.log('');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
