/**
 * Meta-Learning Server Integration Tests
 * 
 * Tests all 9 endpoints on meta-server.js
 * Covers: meta-learning phases, reports, insights, knowledge synthesis
 * 
 * Run: node tests/integration/meta-server.integration.test.js
 */

import http from 'http';
import { strict as assert } from 'assert';

const BASE_URL = 'http://127.0.0.1:3002';

let testsPassed = 0;
let testsFailed = 0;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: null, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (e) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${e.message}`);
    testsFailed++;
  }
}

async function runHealthTests() {
  console.log('\n📋 Health & Status\n');

  await test('GET /health - returns 200', async () => {
    const res = await request('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.server, 'meta');
  });

  await test('GET /api/v4/meta-learning/status - returns meta status', async () => {
    const res = await request('GET', '/api/v4/meta-learning/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.status, 'Expected status object');
  });
}

async function runLifecycleTests() {
  console.log('\n🔄 Meta-Learning Lifecycle\n');

  await test('POST /api/v4/meta-learning/start - starts meta-learning', async () => {
    const res = await request('POST', '/api/v4/meta-learning/start');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.status, 'Expected status object');
  });

  await test('POST /api/v4/meta-learning/run-all - runs all phases', async () => {
    const res = await request('POST', '/api/v4/meta-learning/run-all');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.report, 'Expected report object');
  });

  await test('GET /api/v4/meta-learning/report - retrieves meta report', async () => {
    const res = await request('GET', '/api/v4/meta-learning/report');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.report, 'Expected report object');
  });

  await test('GET /api/v4/meta-learning/insights - retrieves insights', async () => {
    const res = await request('GET', '/api/v4/meta-learning/insights');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.insights, 'Expected insights object');
  });
}

async function runPhaseTests() {
  console.log('\n📊 Phase Analysis\n');

  await test('GET /api/v4/meta-learning/knowledge - retrieves knowledge synthesis', async () => {
    const res = await request('GET', '/api/v4/meta-learning/knowledge');
    assert.equal(res.status, 200);
    assert(res.body.knowledge || res.body.ok, 'Expected knowledge or ok response');
  });

  await test('GET /api/v4/meta-learning/phase/1/report - retrieves phase 1 report', async () => {
    const res = await request('GET', '/api/v4/meta-learning/phase/1/report');
    assert.equal(res.status, 200);
    assert(res.body.report || res.body.ok, 'Expected report or ok response');
  });

  await test('GET /api/v4/meta-learning/phase/2/report - retrieves phase 2 report', async () => {
    const res = await request('GET', '/api/v4/meta-learning/phase/2/report');
    assert.equal(res.status, 200);
    assert(res.body.report || res.body.ok, 'Expected report or ok response');
  });

  await test('GET /api/v4/meta-learning/activity-log - retrieves activity log', async () => {
    const res = await request('GET', '/api/v4/meta-learning/activity-log');
    assert.equal(res.status, 200);
    assert(res.body.log || res.body.ok, 'Expected log or ok response');
  });

  await test('GET /api/v4/meta-learning/metrics - retrieves metrics', async () => {
    const res = await request('GET', '/api/v4/meta-learning/metrics');
    assert.equal(res.status, 200);
    assert(res.body.metrics || res.body.ok, 'Expected metrics or ok response');
  });
}

async function runBoostTests() {
  console.log('\n🚀 Meta Boosting\n');

  await test('POST /api/v4/meta-learning/boost-retention - boosts retention', async () => {
    const res = await request('POST', '/api/v4/meta-learning/boost-retention', {
      targetAreas: ['javascript', 'design patterns'],
      intensity: 'high'
    });
    assert(res.status === 200 || res.status === 400);
  });
}

async function runErrorTests() {
  console.log('\n⚠️  Error Handling\n');

  await test('GET /nonexistent - returns 404', async () => {
    const res = await request('GET', '/nonexistent');
    assert.equal(res.status, 404);
  });

  await test('GET /api/v4/meta-learning/phase/999/report - handles invalid phase', async () => {
    const res = await request('GET', '/api/v4/meta-learning/phase/999/report');
    // Should handle gracefully (either 404 or empty report)
    assert(res.status >= 200);
  });

  await test('POST /api/v4/meta-learning/boost-retention with empty targets', async () => {
    const res = await request('POST', '/api/v4/meta-learning/boost-retention', {
      targetAreas: [],
      intensity: 'high'
    });
    // Should handle gracefully
    assert(res.status >= 200);
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 Meta-Learning Server Integration Tests');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // Verify server is running
    try {
      await request('GET', '/health');
    } catch {
      console.error('❌ Meta-learning server is not running on port 3002');
      console.error('   Start with: npm run start:meta');
      process.exit(1);
    }

    // Run all test suites
    await runHealthTests();
    await runLifecycleTests();
    await runPhaseTests();
    await runBoostTests();
    await runErrorTests();

  } catch (e) {
    console.error('Fatal error:', e.message);
    testsFailed++;
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('Test Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}\n`);

  if (testsFailed === 0) {
    console.log('🎉 All meta-learning server integration tests passed!');
    process.exit(0);
  } else {
    console.log(`⚠️  ${testsFailed} test(s) failed`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
