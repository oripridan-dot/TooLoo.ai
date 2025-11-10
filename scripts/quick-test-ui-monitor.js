#!/usr/bin/env node

/**
 * Quick test - UI Activity Monitor
 */

import fetch from 'node-fetch';

const MONITOR_URL = 'http://127.0.0.1:3051';
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n🧪 Quick Validation Tests\n');

// Test 1: Health
await test('Server health check', async () => {
  const res = await fetch(`${MONITOR_URL}/health`, { timeout: 3000 });
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error('Not OK');
});

// Test 2: Config
await test('Get configuration', async () => {
  const res = await fetch(`${MONITOR_URL}/api/v1/analytics/config`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (!data.config.sessionTimeoutMs) throw new Error('Missing config');
});

// Test 3: Record event
await test('Record single event', async () => {
  const res = await fetch(`${MONITOR_URL}/api/v1/analytics/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'test-' + Date.now(),
      events: [{
        type: 'click',
        feature: 'test-btn',
        x: 100,
        y: 200,
        page: '/'
      }]
    })
  });
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (data.processed !== 1) throw new Error('Event not processed');
});

// Test 4: Batch events
await test('Record batch events', async () => {
  const events = Array.from({ length: 10 }, (_, i) => ({
    type: 'click',
    feature: `feature-${i}`,
    x: Math.random() * 1920,
    y: Math.random() * 1080,
    page: '/'
  }));

  const res = await fetch(`${MONITOR_URL}/api/v1/analytics/events/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'batch-' + Date.now(),
      events
    })
  });
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (data.processed !== 10) throw new Error('Not all events processed');
});

// Test 5: Engagement metrics
await test('Get engagement metrics', async () => {
  const res = await fetch(`${MONITOR_URL}/api/v1/analytics/engagement`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (!data.data || typeof data.data.totalEvents !== 'number') throw new Error('Invalid response');
});

// Test 6: Feature usage
await test('Get feature usage', async () => {
  const res = await fetch(`${MONITOR_URL}/api/v1/analytics/features`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.data.topFeatures)) throw new Error('Invalid response');
});

// Test 7: Heatmap
await test('Get heatmap data', async () => {
  const res = await fetch(`${MONITOR_URL}/api/v1/analytics/heatmap`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.data.data)) throw new Error('Invalid response');
});

// Test 8: Performance
await test('Get performance metrics', async () => {
  const res = await fetch(`${MONITOR_URL}/api/v1/analytics/performance`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (!data.data.firstContentfulPaint) throw new Error('Invalid response');
});

// Test 9: Sessions
await test('Get active sessions', async () => {
  const res = await fetch(`${MONITOR_URL}/api/v1/analytics/sessions`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (typeof data.data.activeSessions !== 'number') throw new Error('Invalid response');
});

// Test 10: Trends
await test('Get engagement trends', async () => {
  const res = await fetch(`${MONITOR_URL}/api/v1/analytics/trends?hours=1`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.data.trends)) throw new Error('Invalid response');
});

// Test 11: Export
await test('Export analytics data', async () => {
  const res = await fetch(`${MONITOR_URL}/api/v1/analytics/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: 'json',
      includeData: ['engagement', 'features']
    })
  });
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (!data.data.engagement) throw new Error('Missing engagement data');
});

// Test 12: Summary
await test('Get analytics summary', async () => {
  const res = await fetch(`${MONITOR_URL}/api/v1/analytics/summary`);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (!data.data.engagement || !data.data.features) throw new Error('Incomplete summary');
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
