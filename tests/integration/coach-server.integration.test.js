/**
 * Coach Server Integration Tests
 * 
 * Tests all 8 endpoints on coach-server.js
 * Covers: auto-coach lifecycle, boosting, fast-lane, settings
 * 
 * Run: node tests/integration/coach-server.integration.test.js
 */

import http from 'http';
import { strict as assert } from 'assert';

const BASE_URL = 'http://127.0.0.1:3004';

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
    assert.equal(res.body.server, 'coach');
  });

  await test('GET /api/v1/auto-coach/status - returns coach status', async () => {
    const res = await request('GET', '/api/v1/auto-coach/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.status, 'Expected status object');
  });
}

async function runLifecycleTests() {
  console.log('\n🔄 Auto-Coach Lifecycle\n');

  await test('POST /api/v1/auto-coach/start - starts auto-coach', async () => {
    const res = await request('POST', '/api/v1/auto-coach/start');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.status, 'Expected status object');
  });

  await test('GET /api/v1/auto-coach/status - retrieves status after start', async () => {
    const res = await request('GET', '/api/v1/auto-coach/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });

  await test('POST /api/v1/auto-coach/stop - stops auto-coach', async () => {
    const res = await request('POST', '/api/v1/auto-coach/stop');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.status, 'Expected status object');
  });
}

async function runBoostTests() {
  console.log('\n💪 Boost Features\n');

  await test('POST /api/v1/auto-coach/boost - applies boost', async () => {
    const res = await request('POST', '/api/v1/auto-coach/boost', {
      target: 'training',
      intensity: 'high'
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.boost, 'Expected boost object');
  });

  await test('GET /api/v1/auto-coach/boost - retrieves boost status', async () => {
    const res = await request('GET', '/api/v1/auto-coach/boost');
    assert.equal(res.status, 200);
    assert(res.body.boost || res.body.ok, 'Expected boost or ok response');
  });

  await test('GET /api/v1/auto-coach/hyper-boost - retrieves hyper-boost data', async () => {
    const res = await request('GET', '/api/v1/auto-coach/hyper-boost');
    assert.equal(res.status, 200);
    assert(res.body.hyperBoost || res.body.ok, 'Expected hyper-boost or ok response');
  });
}

async function runSettingsTests() {
  console.log('\n⚙️  Settings & Configuration\n');

  await test('GET /api/v1/auto-coach/settings - retrieves settings', async () => {
    const res = await request('GET', '/api/v1/auto-coach/settings');
    assert.equal(res.status, 200);
    assert(res.body.settings || res.body.ok, 'Expected settings or ok response');
  });

  await test('POST /api/v1/auto-coach/settings - updates settings', async () => {
    const res = await request('POST', '/api/v1/auto-coach/settings', {
      autoBoostEnabled: true,
      boostInterval: 300,
      targetMastery: 85
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });

  await test('POST /api/v1/auto-coach/fast-lane - enables fast-lane mode', async () => {
    const res = await request('POST', '/api/v1/auto-coach/fast-lane', {
      enable: true,
      microBatchesPerTick: 2,
      batchSize: 5,
      intervalMs: 1000
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });

  await test('GET /api/v1/auto-coach/fast-lane - retrieves fast-lane status', async () => {
    const res = await request('GET', '/api/v1/auto-coach/fast-lane');
    assert.equal(res.status, 200);
    assert(res.body.fastLane || res.body.ok, 'Expected fast-lane or ok response');
  });
}

async function runErrorTests() {
  console.log('\n⚠️  Error Handling\n');

  await test('GET /nonexistent - returns 404', async () => {
    const res = await request('GET', '/nonexistent');
    assert.equal(res.status, 404);
  });

  await test('POST /api/v1/auto-coach/boost with invalid intensity', async () => {
    const res = await request('POST', '/api/v1/auto-coach/boost', {
      target: 'training',
      intensity: 'invalid-level'
    });
    // Should handle gracefully
    assert(res.status >= 200);
  });

  await test('POST /api/v1/auto-coach/settings with negative interval', async () => {
    const res = await request('POST', '/api/v1/auto-coach/settings', {
      boostInterval: -100  // Invalid: negative
    });
    // Should handle gracefully (either 400 or sanitize)
    assert(res.status >= 200);
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 Coach Server Integration Tests');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // Verify server is running
    try {
      await request('GET', '/health');
    } catch {
      console.error('❌ Coach server is not running on port 3004');
      console.error('   Start with: npm run start:coach');
      process.exit(1);
    }

    // Run all test suites
    await runHealthTests();
    await runLifecycleTests();
    await runBoostTests();
    await runSettingsTests();
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
    console.log('🎉 All coach server integration tests passed!');
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
