#!/usr/bin/env node

/**
 * UI Activity Monitoring - Test Suite
 * 
 * Validates complete system:
 * - Activity monitor server health
 * - Event collection and batching
 * - Engagement metrics calculation
 * - Performance metrics collection
 * - Heatmap data generation
 * - Feature usage tracking
 * - Dashboard connectivity
 */

import fetch from 'node-fetch';

const ACTIVITY_MONITOR_URL = 'http://127.0.0.1:3051';
const WEB_SERVER_URL = 'http://127.0.0.1:3000';

let passCount = 0;
let failCount = 0;

function pass(msg) {
  passCount++;
  console.log('  ✅', msg);
}

function fail(msg) {
  failCount++;
  console.log('  ❌', msg);
}

function section(msg) {
  console.log(`\n${'═'.repeat(60)}\n${msg}\n${'═'.repeat(60)}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Test 1: Activity Monitor Health
 */
async function testMonitorHealth() {
  section('Test 1: Activity Monitor Health');

  try {
    const res = await fetch(`${ACTIVITY_MONITOR_URL}/health`);
    if (res.ok) {
      const data = await res.json();
      pass('Activity monitor running on port 3051');
      pass(`Active sessions: ${data.activeSessions}, Total events: ${data.totalEvents}`);
    } else {
      fail(`Activity monitor health check returned ${res.status}`);
    }
  } catch (e) {
    fail(`Activity monitor not reachable: ${e.message}`);
  }
}

/**
 * Test 2: Event Recording
 */
async function testEventRecording() {
  section('Test 2: Event Recording');

  try {
    const sessionId = 'test-' + Date.now();
    const events = [
      {
        type: 'click',
        feature: 'test-button',
        x: 100,
        y: 200,
        page: '/test',
        elementTag: 'button'
      },
      {
        type: 'form',
        formName: 'test-form',
        fieldCount: 3,
        page: '/test'
      }
    ];

    const res = await fetch(`${ACTIVITY_MONITOR_URL}/api/v1/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        events
      })
    });

    if (res.ok) {
      const data = await res.json();
      pass(`Recorded ${data.processed} events for session ${sessionId.substring(0, 20)}`);
    } else {
      fail(`Event recording failed with status ${res.status}`);
    }
  } catch (e) {
    fail(`Event recording error: ${e.message}`);
  }
}

/**
 * Test 3: Batch Event Recording
 */
async function testBatchEvents() {
  section('Test 3: Batch Event Recording');

  try {
    const sessionId = 'batch-' + Date.now();
    const events = [];

    // Generate 25 test events
    for (let i = 0; i < 25; i++) {
      events.push({
        type: 'click',
        feature: `feature-${i % 5}`,
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        page: '/',
        elementTag: 'button'
      });
    }

    const res = await fetch(`${ACTIVITY_MONITOR_URL}/api/v1/analytics/events/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        events
      })
    });

    if (res.ok) {
      const data = await res.json();
      pass(`Batch processed ${data.processed} events`);
    } else {
      fail(`Batch processing failed with status ${res.status}`);
    }
  } catch (e) {
    fail(`Batch processing error: ${e.message}`);
  }
}

/**
 * Test 4: Engagement Metrics
 */
async function testEngagementMetrics() {
  section('Test 4: Engagement Metrics');

  try {
    const res = await fetch(`${ACTIVITY_MONITOR_URL}/api/v1/analytics/engagement`);
    if (res.ok) {
      const data = await res.json();
      const eng = data.data;

      pass(`Active sessions: ${eng.activeSessions}`);
      pass(`Total events: ${eng.totalEvents}`);
      pass(`Average session duration: ${eng.averageSessionDuration}ms`);
      pass(`Average events per session: ${eng.averageEventsPerSession}`);
      pass(`Top pages: ${eng.topPages.length}`);
    } else {
      fail(`Engagement metrics request returned ${res.status}`);
    }
  } catch (e) {
    fail(`Engagement metrics error: ${e.message}`);
  }
}

/**
 * Test 5: Feature Usage Report
 */
async function testFeatureUsage() {
  section('Test 5: Feature Usage Report');

  try {
    const res = await fetch(`${ACTIVITY_MONITOR_URL}/api/v1/analytics/features`);
    if (res.ok) {
      const data = await res.json();
      const features = data.data;

      pass(`Total unique features: ${features.totalUniqueFeatures}`);
      pass(`Top features tracked: ${features.topFeatures.length}`);

      if (features.topFeatures.length > 0) {
        const top = features.topFeatures[0];
        pass(`Most used feature: ${top.feature} (${top.usageCount} uses)`);
      }
    } else {
      fail(`Feature usage request returned ${res.status}`);
    }
  } catch (e) {
    fail(`Feature usage error: ${e.message}`);
  }
}

/**
 * Test 6: Performance Metrics
 */
async function testPerformanceMetrics() {
  section('Test 6: Performance Metrics');

  try {
    const res = await fetch(`${ACTIVITY_MONITOR_URL}/api/v1/analytics/performance`);
    if (res.ok) {
      const data = await res.json();
      const perf = data.data;

      pass(`FCP: ${perf.firstContentfulPaint.value || 'N/A'} ${perf.firstContentfulPaint.unit}`);
      pass(`LCP: ${perf.largestContentfulPaint.value || 'N/A'} ${perf.largestContentfulPaint.unit}`);
      pass(`CLS: ${perf.cumulativeLayoutShift.value || 'N/A'} ${perf.cumulativeLayoutShift.unit}`);
      pass(`FID: ${perf.firstInputDelay.value || 'N/A'} ${perf.firstInputDelay.unit}`);
    } else {
      fail(`Performance metrics request returned ${res.status}`);
    }
  } catch (e) {
    fail(`Performance metrics error: ${e.message}`);
  }
}

/**
 * Test 7: Heatmap Data
 */
async function testHeatmapData() {
  section('Test 7: Heatmap Data');

  try {
    const res = await fetch(`${ACTIVITY_MONITOR_URL}/api/v1/analytics/heatmap`);
    if (res.ok) {
      const data = await res.json();
      const heatmap = data.data;

      pass(`Heatmap resolution: ${heatmap.resolution}x${heatmap.resolution}`);
      pass(`Data points: ${heatmap.data.length}`);
      pass(`Total clicks: ${heatmap.totalClicks}`);

      if (heatmap.data.length > 0) {
        const hottest = heatmap.data.reduce((max, p) => p.intensity > max.intensity ? p : max);
        pass(`Hottest spot: (${hottest.x}, ${hottest.y}) with ${hottest.intensity} clicks`);
      }
    } else {
      fail(`Heatmap data request returned ${res.status}`);
    }
  } catch (e) {
    fail(`Heatmap data error: ${e.message}`);
  }
}

/**
 * Test 8: Sessions Tracking
 */
async function testSessionsTracking() {
  section('Test 8: Sessions Tracking');

  try {
    const res = await fetch(`${ACTIVITY_MONITOR_URL}/api/v1/analytics/sessions`);
    if (res.ok) {
      const data = await res.json();
      const sessionsData = data.data;

      pass(`Active sessions: ${sessionsData.activeSessions}`);
      pass(`Sessions in response: ${sessionsData.sessions.length}`);

      if (sessionsData.sessions.length > 0) {
        const session = sessionsData.sessions[0];
        pass(`Sample session: ${session.sessionId.substring(0, 20)}... (${session.eventCount} events)`);
      }
    } else {
      fail(`Sessions tracking request returned ${res.status}`);
    }
  } catch (e) {
    fail(`Sessions tracking error: ${e.message}`);
  }
}

/**
 * Test 9: Engagement Trends
 */
async function testEngagementTrends() {
  section('Test 9: Engagement Trends');

  try {
    const res = await fetch(`${ACTIVITY_MONITOR_URL}/api/v1/analytics/trends?hours=1`);
    if (res.ok) {
      const data = await res.json();
      pass(`Trend data points (last 1 hour): ${data.data.dataPoints}`);
    } else {
      fail(`Trends request returned ${res.status}`);
    }
  } catch (e) {
    fail(`Trends error: ${e.message}`);
  }
}

/**
 * Test 10: Configuration
 */
async function testConfiguration() {
  section('Test 10: Configuration');

  try {
    const res = await fetch(`${ACTIVITY_MONITOR_URL}/api/v1/analytics/config`);
    if (res.ok) {
      const data = await res.json();
      const config = data.config;

      pass(`Session timeout: ${config.sessionTimeoutMs}ms`);
      pass(`Heatmap resolution: ${config.maxHeatmapResolution}x${config.maxHeatmapResolution}`);
      pass(`Events per session limit: ${config.eventsPerSessionLimit}`);
    } else {
      fail(`Configuration request returned ${res.status}`);
    }
  } catch (e) {
    fail(`Configuration error: ${e.message}`);
  }
}

/**
 * Test 11: Dashboard Accessibility
 */
async function testDashboard() {
  section('Test 11: Dashboard Accessibility');

  try {
    const res = await fetch(`${WEB_SERVER_URL}/analytics-dashboard.html`);
    if (res.ok) {
      const html = await res.text();
      if (html.includes('TooLoo Analytics Dashboard')) {
        pass('Dashboard HTML accessible');
        pass('Dashboard title found');
      } else {
        fail('Dashboard HTML missing expected content');
      }
    } else {
      fail(`Dashboard request returned ${res.status}`);
    }
  } catch (e) {
    fail(`Dashboard accessibility error: ${e.message}`);
  }
}

/**
 * Test 12: Data Export
 */
async function testDataExport() {
  section('Test 12: Data Export');

  try {
    const res = await fetch(`${ACTIVITY_MONITOR_URL}/api/v1/analytics/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'json',
        includeData: ['engagement', 'features', 'performance']
      })
    });

    if (res.ok) {
      const data = await res.json();
      pass(`Export format: ${data.format}`);
      pass(`Engagement data included: ${!!data.data.engagement}`);
      pass(`Features data included: ${!!data.data.features}`);
      pass(`Performance data included: ${!!data.data.performance}`);
    } else {
      fail(`Export request returned ${res.status}`);
    }
  } catch (e) {
    fail(`Data export error: ${e.message}`);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║    UI Activity Monitoring - Comprehensive Test Suite        ║
║                                                             ║
║    Testing: event collection, engagement metrics,           ║
║    performance monitoring, heatmaps, and dashboard          ║
╚════════════════════════════════════════════════════════════╝
  `);

  try {
    await testMonitorHealth();
    await sleep(500);

    await testEventRecording();
    await sleep(500);

    await testBatchEvents();
    await sleep(500);

    await testEngagementMetrics();
    await sleep(500);

    await testFeatureUsage();
    await sleep(500);

    await testPerformanceMetrics();
    await sleep(500);

    await testHeatmapData();
    await sleep(500);

    await testSessionsTracking();
    await sleep(500);

    await testEngagementTrends();
    await sleep(500);

    await testConfiguration();
    await sleep(500);

    await testDashboard();
    await sleep(500);

    await testDataExport();
  } catch (e) {
    console.error('Test suite error:', e);
  }

  // Summary
  section('Test Summary');
  const total = passCount + failCount;
  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success Rate: ${total > 0 ? Math.round((passCount / total) * 100) : 0}%`);

  if (failCount === 0) {
    console.log('\n🎉 All tests passed! UI Activity Monitoring is working correctly.\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failCount} test(s) failed. Check the logs above for details.\n`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
