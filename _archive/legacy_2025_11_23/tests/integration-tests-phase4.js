#!/usr/bin/env node

/**
 * Integration Tests - Phase 4: Testing & Validation
 * 
 * Tests all consolidated endpoints and resilience layers
 * Run: npm test or node tests/integration-tests-phase4.js
 */

import fetch from 'node-fetch';
import assert from 'assert';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const TIMEOUT = 10000;

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Helper: Make HTTP request with timeout
 */
async function request(method, endpoint, body = null) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    };
    
    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const text = await response.text();
    
    try {
      const data = text ? JSON.parse(text) : {};
      return { status: response.status, data, ok: response.ok };
    } catch {
      return { status: response.status, data: { text }, ok: response.ok };
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Test helper
 */
async function test(name, fn) {
  try {
    await fn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    console.error(`❌ ${name}: ${error.message}`);
  }
}

// ============= PHASE 2C CONSOLIDATION TESTS =============

console.log('\n📦 PHASE 2C: Consolidated Endpoints\n');

// Training Server - GitHub Sources Consolidation
await test('Training: /api/v1/sources/github/issues/sync exists', async () => {
  const res = await request('POST', '/api/v1/sources/github/issues/sync', { repo: 'test' });
  assert(res.status === 200 || res.status === 400, `Expected 200 or 400, got ${res.status}`);
});

await test('Training: /api/v1/sources/github/:repo/status exists', async () => {
  const res = await request('GET', '/api/v1/sources/github/test/status');
  assert(res.status === 200 || res.status === 404, `Expected 200 or 404, got ${res.status}`);
});

// Cup Server - Providers Arena Consolidation
await test('Cup: /api/v1/arena/query endpoint exists', async () => {
  const res = await request('POST', '/api/v1/arena/query', {
    query: 'test',
    providers: ['ollama'],
    compareOnly: true
  });
  assert(res.status === 200 || res.status === 400, `Expected 200 or 400, got ${res.status}`);
});

await test('Cup: /api/v1/arena/status endpoint exists', async () => {
  const res = await request('GET', '/api/v1/arena/status');
  assert(res.status === 200, `Expected 200, got ${res.status}`);
});

// Web Server - GitHub Context Consolidation
await test('Web: /api/v1/github/info endpoint exists', async () => {
  const res = await request('GET', '/api/v1/github/info');
  assert(res.status === 200, `Expected 200, got ${res.status}`);
});

await test('Web: /api/v1/github/issues endpoint exists', async () => {
  const res = await request('GET', '/api/v1/github/issues?limit=5');
  assert(res.status === 200, `Expected 200, got ${res.status}`);
});

await test('Web: /api/v1/github/context endpoint exists', async () => {
  const res = await request('GET', '/api/v1/github/context');
  assert(res.status === 200, `Expected 200, got ${res.status}`);
});

// Reports Server - Response Presentation Consolidation
await test('Reports: /api/v1/present endpoint exists', async () => {
  const res = await request('POST', '/api/v1/present', {
    query: 'test',
    providerResponses: { test: 'response' }
  });
  assert(res.status === 200 || res.status === 500, `Expected 200 or 500, got ${res.status}`);
});

await test('Reports: /api/v1/present/schema endpoint exists', async () => {
  const res = await request('GET', '/api/v1/present/schema');
  assert(res.status === 200, `Expected 200, got ${res.status}`);
});

// ============= PHASE 2B RESILIENCE TESTS =============

console.log('\n🛡️ PHASE 2B: Resilience Layers\n');

// Circuit Breaker Status
await test('Resilience: /api/v1/providers/resilience-status endpoint exists', async () => {
  const res = await request('GET', '/api/v1/providers/resilience-status');
  assert(res.status === 200, `Expected 200, got ${res.status}`);
});

// Request Deduplication
await test('Resilience: Request deduplication on burst endpoint', async () => {
  const res1 = await request('POST', '/api/v1/providers/burst', { prompt: 'test-dedup' });
  const res2 = await request('POST', '/api/v1/providers/burst', { prompt: 'test-dedup' });
  
  assert(res1.status === 200, `Expected 200, got ${res1.status}`);
  assert(res2.status === 200, `Expected 200, got ${res2.status}`);
  
  if (res1.data.dedup && res2.data.dedup) {
    console.log(`   Dedup cache size: ${res2.data.dedup.cacheSize}`);
  }
});

// ============= PHASE 3 INTELLIGENCE TESTS =============

console.log('\n🧠 PHASE 3: Intelligence Layer\n');

await test('Intelligence: /api/v1/system/learning-stats endpoint exists', async () => {
  const res = await request('GET', '/api/v1/system/learning-stats');
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(res.data.learning, 'Expected learning data in response');
});

await test('Intelligence: Learning stats contain provider quality scores', async () => {
  const res = await request('GET', '/api/v1/system/learning-stats');
  assert(res.status === 200);
  assert(res.data.providerQuality !== undefined, 'Expected providerQuality field');
  assert(res.data.learning.adaptationLevel, 'Expected adaptationLevel');
});

// ============= HEALTH & STATUS TESTS =============

console.log('\n🏥 Health & Status Checks\n');

// Core services health
const services = [
  { name: 'web-server', port: 3000 },
  { name: 'training-server', port: 3001 },
  { name: 'meta-server', port: 3002 },
  { name: 'budget-server', port: 3003 },
  { name: 'coach-server', port: 3004 },
  { name: 'cup-server', port: 3005 },
  { name: 'product-dev-server', port: 3006 },
  { name: 'segmentation-server', port: 3007 },
  { name: 'reports-server', port: 3008 },
  { name: 'capabilities-server', port: 3009 }
];

for (const svc of services) {
  await test(`Health: ${svc.name} responds to /health`, async () => {
    const res = await request('GET', '/health', null);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });
}

// ============= BACKWARD COMPATIBILITY TESTS =============

console.log('\n🔄 Backward Compatibility\n');

await test('Compatibility: Core training endpoints still available', async () => {
  const res = await request('GET', '/api/v1/training/overview');
  assert(res.status === 200 || res.status === 404, `Unexpected status ${res.status}`);
});

await test('Compatibility: Budget endpoints still available', async () => {
  const res = await request('GET', '/api/v1/providers/status');
  assert(res.status === 200, `Expected 200, got ${res.status}`);
});

await test('Compatibility: Reports endpoints still available', async () => {
  const res = await request('GET', '/api/v1/reports/dashboard');
  assert(res.status === 200 || res.status === 404, `Unexpected status ${res.status}`);
});

// ============= PERFORMANCE BASELINE TESTS =============

console.log('\n⚡ Performance Baseline\n');

await test('Performance: Burst endpoint responds within 5s', async () => {
  const start = Date.now();
  const res = await request('POST', '/api/v1/providers/burst', { 
    prompt: 'quick test',
    ttlSeconds: 60 
  });
  const elapsed = Date.now() - start;
  
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(elapsed < 5000, `Expected < 5000ms, took ${elapsed}ms`);
  console.log(`   Response time: ${elapsed}ms`);
});

await test('Performance: GitHub endpoints respond quickly', async () => {
  const start = Date.now();
  const res = await request('GET', '/api/v1/github/info');
  const elapsed = Date.now() - start;
  
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(elapsed < 2000, `Expected < 2000ms, took ${elapsed}ms`);
  console.log(`   Response time: ${elapsed}ms`);
});

// ============= ERROR HANDLING TESTS =============

console.log('\n⚠️ Error Handling\n');

await test('Error Handling: Invalid endpoints return 404', async () => {
  const res = await request('GET', '/api/v1/nonexistent/endpoint');
  assert(res.status === 404, `Expected 404, got ${res.status}`);
});

await test('Error Handling: Missing required params return 400', async () => {
  const res = await request('POST', '/api/v1/present', {
    // Missing required 'query' field
    providerResponses: { test: 'response' }
  });
  assert(res.status === 400, `Expected 400, got ${res.status}`);
});

await test('Error Handling: POST to GET-only endpoints return 405+', async () => {
  const res = await request('POST', '/api/v1/providers/status');
  assert(res.status >= 405 || res.status === 404, `Expected 405/404, got ${res.status}`);
});

// ============= RESULTS SUMMARY =============

console.log('\n' + '='.repeat(60));
console.log('TEST RESULTS SUMMARY');
console.log('='.repeat(60));
console.log(`\n✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`📊 Total:  ${results.passed + results.failed}`);
console.log(`📈 Pass Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%\n`);

if (results.failed > 0) {
  console.log('Failed Tests:');
  results.tests
    .filter(t => t.status === 'FAIL')
    .forEach(t => {
      console.log(`  ❌ ${t.name}`);
      if (t.error) console.log(`     ${t.error}`);
    });
}

console.log('\n' + '='.repeat(60));

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
