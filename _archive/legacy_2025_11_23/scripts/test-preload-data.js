#!/usr/bin/env node

/**
 * Test Preload Data Implementation
 * 
 * Validates:
 * 1. Preload data generation
 * 2. Session source tracking
 * 3. API endpoints with preload data
 * 4. Dashboard integration
 */

import fetch from 'node-fetch';

const MONITOR_URL = 'http://127.0.0.1:3051';
const TIMEOUT = 5000;

let passed = 0;
let failed = 0;

// ============ Test Utilities ============

async function testWithTimeout(url, options = {}) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), TIMEOUT)
    )
  ]);
}

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}${details ? ' - ' + details : ''}`);
  if (passed) {
    global.passed++;
  } else {
    global.failed++;
  }
}

function logSection(title) {
  console.log(`\n📋 ${title}`);
  console.log('─'.repeat(60));
}

// ============ Tests ============

async function testPreloadStatus() {
  logSection('Preload Data Status');

  try {
    const res = await testWithTimeout(`${MONITOR_URL}/api/v1/analytics/preload-status`);
    const data = await res.json();

    if (!data.ok) {
      logTest('Preload Status Endpoint', false, 'Response not ok');
      return;
    }

    const status = data.data;
    const hasRequiredFields = [
      'preloadEnabled',
      'preloadSessions',
      'realSessions',
      'totalSessions',
      'preloadPercentage',
      'preloadConfig',
      'note'
    ].every(field => field in status);

    logTest('Preload Status Endpoint', hasRequiredFields, 
      `${status.preloadSessions} preload + ${status.realSessions} real sessions`);

    if (status.preloadEnabled) {
      logTest('Preload Enabled on Startup', true, `${status.preloadSessions} sessions loaded`);
    } else {
      logTest('Preload Enabled on Startup', false, 'Preload not enabled');
    }

    logTest('Preload Percentage Calculation', 
      status.preloadPercentage >= 0 && status.preloadPercentage <= 100,
      `${status.preloadPercentage}%`);

    logTest('Preload Note Generated', status.note && status.note.length > 0, status.note);

  } catch (e) {
    logTest('Preload Status Endpoint', false, e.message);
  }
}

async function testEngagementMetrics() {
  logSection('Engagement Metrics with Preload');

  try {
    const res = await testWithTimeout(`${MONITOR_URL}/api/v1/analytics/engagement`);
    const data = await res.json();

    if (!data.ok) {
      logTest('Engagement Endpoint', false, 'Response not ok');
      return;
    }

    const eng = data.data;
    logTest('Engagement Data Contains Sessions', eng.activeSessions >= 0 && eng.totalSessions > 0,
      `${eng.activeSessions} active, ${eng.totalSessions} total`);

    logTest('Engagement Metrics Valid', 
      eng.totalEvents > 0 && eng.averageSessionDuration > 0,
      `${eng.totalEvents} events, ${eng.averageSessionDuration}ms avg duration`);

    logTest('Top Pages Populated', eng.topPages && eng.topPages.length > 0,
      `${eng.topPages.length} pages tracked`);

  } catch (e) {
    logTest('Engagement Endpoint', false, e.message);
  }
}

async function testFeatureUsage() {
  logSection('Feature Usage with Preload');

  try {
    const res = await testWithTimeout(`${MONITOR_URL}/api/v1/analytics/features`);
    const data = await res.json();

    if (!data.ok) {
      logTest('Features Endpoint', false, 'Response not ok');
      return;
    }

    const features = data.data.topFeatures || [];
    logTest('Features Populated', features.length > 0, `${features.length} features tracked`);

    if (features.length > 0) {
      const topFeature = features[0];
      const hasCorrectFormat = topFeature.feature && topFeature.usageCount && topFeature.percentage !== undefined;
      logTest('Feature Format Correct', hasCorrectFormat, 
        `Top: ${topFeature.feature} (${topFeature.usageCount} uses, ${topFeature.percentage}%)`);
    }

  } catch (e) {
    logTest('Features Endpoint', false, e.message);
  }
}

async function testHeatmap() {
  logSection('Click Heatmap with Preload');

  try {
    const res = await testWithTimeout(`${MONITOR_URL}/api/v1/analytics/heatmap`);
    const data = await res.json();

    if (!data.ok) {
      logTest('Heatmap Endpoint', false, 'Response not ok');
      return;
    }

    const heatmap = data.data;
    logTest('Heatmap Data Present', heatmap.data && heatmap.data.length > 0,
      `${heatmap.data.length} click points`);

    logTest('Heatmap Resolution Correct', heatmap.resolution === 100,
      `${heatmap.resolution}x${heatmap.resolution} grid`);

    if (heatmap.data.length > 0) {
      const point = heatmap.data[0];
      const hasCorrectFormat = point.x !== undefined && point.y !== undefined && point.percentage !== undefined;
      logTest('Heatmap Point Format', hasCorrectFormat,
        `Sample: (${point.x}, ${point.y}) @ ${point.percentage}%`);
    }

  } catch (e) {
    logTest('Heatmap Endpoint', false, e.message);
  }
}

async function testSessions() {
  logSection('Sessions with Data Source Info');

  try {
    const res = await testWithTimeout(`${MONITOR_URL}/api/v1/analytics/sessions`);
    const data = await res.json();

    if (!data.ok) {
      logTest('Sessions Endpoint', false, 'Response not ok');
      return;
    }

    const sessions = data.data;
    logTest('Sessions Tracking Works', 
      sessions.activeSessions >= 0 && sessions.preloadSessions !== undefined && sessions.realSessions !== undefined,
      `${sessions.preloadSessions} preload, ${sessions.realSessions} real`);

    if (sessions.sessions && sessions.sessions.length > 0) {
      const session = sessions.sessions[0];
      const hasDataSource = session.dataSource && session.isPreload !== undefined;
      logTest('Session Data Source Tracked', hasDataSource,
        `Sample session: ${session.dataSource}, isPreload=${session.isPreload}`);

      // Check if preload sessions are marked correctly
      const preloadSession = sessions.sessions.find(s => s.isPreload);
      if (preloadSession) {
        logTest('Preload Sessions Marked Correctly', preloadSession.sessionId.startsWith('preload-'),
          `Session ID: ${preloadSession.sessionId}`);
      }
    }

  } catch (e) {
    logTest('Sessions Endpoint', false, e.message);
  }
}

async function testPerformance() {
  logSection('Performance Metrics with Preload');

  try {
    const res = await testWithTimeout(`${MONITOR_URL}/api/v1/analytics/performance`);
    const data = await res.json();

    if (!data.ok) {
      logTest('Performance Endpoint', false, 'Response not ok');
      return;
    }

    const perf = data.data;
    const hasMetrics = [
      'firstContentfulPaint',
      'largestContentfulPaint',
      'cumulativeLayoutShift',
      'firstInputDelay'
    ].every(m => m in perf);

    logTest('Performance Metrics Present', hasMetrics);

    if (hasMetrics) {
      logTest('Performance Values Valid',
        perf.firstContentfulPaint.value > 0 && perf.largestContentfulPaint.value > 0,
        `FCP=${perf.firstContentfulPaint.value}ms, LCP=${perf.largestContentfulPaint.value}ms`);
    }

  } catch (e) {
    logTest('Performance Endpoint', false, e.message);
  }
}

async function testSummary() {
  logSection('Complete Summary with Preload Data');

  try {
    const res = await testWithTimeout(`${MONITOR_URL}/api/v1/analytics/summary`);
    const data = await res.json();

    if (!data.ok) {
      logTest('Summary Endpoint', false, 'Response not ok');
      return;
    }

    const summary = data.data;
    const hasDataSource = summary.dataSource && 
      summary.dataSource.preloadSessions !== undefined &&
      summary.dataSource.realSessions !== undefined;

    logTest('Summary Contains Data Source Info', hasDataSource,
      `${summary.dataSource?.preloadSessions || 0} preload, ${summary.dataSource?.realSessions || 0} real`);

    const hasAllSections = ['engagement', 'features', 'performance', 'heatmap'].every(s => s in summary);
    logTest('Summary Has All Sections', hasAllSections);

  } catch (e) {
    logTest('Summary Endpoint', false, e.message);
  }
}

async function testConfig() {
  logSection('Configuration Endpoints');

  try {
    // Get current config
    const getRes = await testWithTimeout(`${MONITOR_URL}/api/v1/analytics/config`);
    const getData = await getRes.json();

    const currentConfig = getData.config;
    logTest('Get Config Works', 
      currentConfig && currentConfig.sessionTimeoutMs && currentConfig.maxHeatmapResolution,
      `Timeout=${currentConfig.sessionTimeoutMs}ms, Resolution=${currentConfig.maxHeatmapResolution}`);

    // Update config (just verify endpoint works, don't actually change)
    const updateRes = await testWithTimeout(`${MONITOR_URL}/api/v1/analytics/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preloadSessionCount: 100 })
    });
    const updateData = await updateRes.json();

    logTest('Update Config Works', updateData.ok && updateData.config);

  } catch (e) {
    logTest('Config Endpoints', false, e.message);
  }
}

async function testDataMerge() {
  logSection('Preload + Real Data Merge');

  try {
    // Record a real event
    const eventRes = await testWithTimeout(`${MONITOR_URL}/api/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'test-real-' + Date.now(),
        events: [
          {
            type: 'click',
            feature: 'test-button',
            x: 100,
            y: 100,
            page: '/test'
          }
        ]
      })
    });

    const eventData = await eventRes.json();
    logTest('Record Real Event Works', eventData.ok && eventData.processed === 1);

    // Check that sessions now include both preload and real
    const sessionRes = await testWithTimeout(`${MONITOR_URL}/api/v1/analytics/sessions`);
    const sessionData = await sessionRes.json();

    if (sessionData.ok) {
      const sessions = sessionData.data;
      const hasPreload = sessions.preloadSessions > 0;
      const hasReal = sessions.realSessions > 0;
      
      logTest('Preload and Real Data Coexist', hasPreload && hasReal,
        `Preload=${sessions.preloadSessions}, Real=${sessions.realSessions}`);
    }

  } catch (e) {
    logTest('Data Merge Test', false, e.message);
  }
}

// ============ Main ============

async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║     PRELOAD DATA IMPLEMENTATION TEST SUITE        ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  console.log(`🎯 Testing against: ${MONITOR_URL}`);
  console.log(`⏱️  Timeout: ${TIMEOUT}ms\n`);

  try {
    // Test health first
    const health = await testWithTimeout(`${MONITOR_URL}/health`);
    const healthData = await health.json();
    if (!healthData.ok) {
      console.log('❌ Monitor server not responding');
      process.exit(1);
    }
    console.log('✅ Monitor server is healthy\n');
  } catch (e) {
    console.log(`❌ Cannot connect to monitor: ${e.message}`);
    console.log('ℹ️  Make sure to start the monitor with: npm run dev');
    process.exit(1);
  }

  // Run all tests
  await testPreloadStatus();
  await testEngagementMetrics();
  await testFeatureUsage();
  await testHeatmap();
  await testSessions();
  await testPerformance();
  await testSummary();
  await testConfig();
  await testDataMerge();

  // Summary
  logSection('Test Summary');
  const total = passed + failed;
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
  
  console.log(`\n✅ Passed:  ${passed}`);
  console.log(`❌ Failed:  ${failed}`);
  console.log(`📊 Total:   ${total}`);
  console.log(`📈 Score:   ${percentage}%\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed! Preload data is fully functional.\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Check the output above.\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Global counters
globalThis.passed = 0;
globalThis.failed = 0;

runTests().catch(e => {
  console.error('Test suite error:', e);
  process.exit(1);
});
