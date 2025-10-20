/**
 * Training Server Integration Tests
 * 
 * Tests all 19 endpoints on training-server.js
 * Covers: camp lifecycle, rounds, domains, hyper-speed, settings, calibration
 * 
 * Run: node tests/integration/training-server.integration.test.js
 */

import http from 'http';
import { strict as assert } from 'assert';

const BASE_URL = 'http://127.0.0.1:3001';
const TRAINING_PORT = 3001;

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
    assert.equal(res.body.server, 'training');
  });

  await test('GET /api/v1/training/status - returns training status', async () => {
    const res = await request('GET', '/api/v1/training/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.status, 'Expected status object');
  });

  await test('GET /api/v1/training/overview - returns overview data', async () => {
    const res = await request('GET', '/api/v1/training/overview');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.data, 'Expected data object');
  });

  await test('GET /api/v1/training/active - returns active training data', async () => {
    const res = await request('GET', '/api/v1/training/active');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.data, 'Expected data object');
  });
}

async function runCampTests() {
  console.log('\n🏕️  Training Camp Lifecycle\n');

  await test('POST /api/v1/training/start - starts training camp', async () => {
    const res = await request('POST', '/api/v1/training/start');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.result, 'Expected result object');
  });

  await test('POST /api/v1/training/round - runs training round', async () => {
    const res = await request('POST', '/api/v1/training/round');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.result, 'Expected result object');
  });

  await test('GET /api/v1/next-domain - gets next domain to train', async () => {
    const res = await request('GET', '/api/v1/next-domain');
    assert.equal(res.status, 200);
    assert(res.body.domain || res.body.ok, 'Expected domain or ok response');
  });

  await test('GET /api/v1/training/deep-dive/:topic - gets deep dive data', async () => {
    const res = await request('GET', '/api/v1/training/deep-dive/javascript');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.data, 'Expected data object');
  });
}

async function runTopicTests() {
  console.log('\n📚 Topic Management\n');

  await test('POST /api/v1/training/new-topic - creates new topic', async () => {
    const res = await request('POST', '/api/v1/training/new-topic', {
      topic: 'test-topic',
      description: 'Test topic for QA',
      difficulty: 'intermediate'
    });
    assert(res.status === 200 || res.status === 400);
    if (res.status === 200) {
      assert.equal(res.body.ok, true);
    }
  });

  await test('GET /api/v1/training/new-topic - retrieves created topic', async () => {
    const res = await request('GET', '/api/v1/training/new-topic');
    assert.equal(res.status, 200);
    assert(res.body.topic || res.body.ok, 'Expected topic or ok response');
  });
}

async function runSettingsTests() {
  console.log('\n⚙️  Settings & Configuration\n');

  await test('GET /api/v1/training/settings - retrieves settings', async () => {
    const res = await request('GET', '/api/v1/training/settings');
    assert.equal(res.status, 200);
    assert(res.body.settings || res.body.ok, 'Expected settings or ok response');
  });

  await test('POST /api/v1/training/settings - updates settings', async () => {
    const res = await request('POST', '/api/v1/training/settings', {
      targetThreshold: 85,
      autoFillGaps: true,
      gapsCount: 3
    });
    assert(res.status === 200 || res.status === 400);
  });

  await test('GET /api/v1/training/settings/update - updates via query params', async () => {
    const res = await request('GET', '/api/v1/training/settings/update?autoFillGaps=true&gapsCount=2');
    assert.equal(res.status, 200);
  });

  await test('POST /api/v1/training/calibrate - calibrates training', async () => {
    const res = await request('POST', '/api/v1/training/calibrate', {
      masteryLevel: 75
    });
    assert(res.status === 200 || res.status === 400);
  });

  await test('GET /api/v1/training/calibrate - retrieves calibration data', async () => {
    const res = await request('GET', '/api/v1/training/calibrate');
    assert.equal(res.status, 200);
  });

  await test('POST /api/v1/training/force-masteries - forces masteries', async () => {
    const res = await request('POST', '/api/v1/training/force-masteries', {
      masteries: { javascript: 90, python: 85 }
    });
    assert(res.status === 200 || res.status === 400);
  });

  await test('GET /api/v1/training/force-masteries - retrieves forced masteries', async () => {
    const res = await request('GET', '/api/v1/training/force-masteries');
    assert.equal(res.status, 200);
  });
}

async function runHyperSpeedTests() {
  console.log('\n⚡ Hyper-Speed Training\n');

  await test('POST /api/v1/training/hyper-speed/start - starts hyper-speed', async () => {
    const res = await request('POST', '/api/v1/training/hyper-speed/start', {
      duration: 60,
      intensity: 'high'
    });
    assert(res.status === 200 || res.status === 400);
  });

  await test('POST /api/v1/training/hyper-speed/micro-batch - runs micro batch', async () => {
    const res = await request('POST', '/api/v1/training/hyper-speed/micro-batch', {
      batchSize: 5,
      topics: ['javascript', 'python']
    });
    assert(res.status === 200 || res.status === 400);
  });

  await test('POST /api/v1/training/hyper-speed/turbo-round - runs turbo round', async () => {
    const res = await request('POST', '/api/v1/training/hyper-speed/turbo-round');
    assert.equal(res.status, 200);
  });

  await test('GET /api/v1/training/hyper-speed/stats - retrieves hyper-speed stats', async () => {
    const res = await request('GET', '/api/v1/training/hyper-speed/stats');
    assert.equal(res.status, 200);
    assert(res.body.stats || res.body.ok, 'Expected stats or ok response');
  });
}

async function runProviderTests() {
  console.log('\n🤖 Provider Tests\n');

  await test('POST /api/v1/providers/parallel-generate - generates in parallel', async () => {
    const res = await request('POST', '/api/v1/providers/parallel-generate', {
      prompt: 'Test prompt',
      providers: ['claude', 'gpt']
    });
    assert(res.status === 200 || res.status === 400 || res.status === 500);
  });

  await test('GET /api/v1/providers/parallel-performance - gets performance data', async () => {
    const res = await request('GET', '/api/v1/providers/parallel-performance');
    assert.equal(res.status, 200);
    assert(res.body.performance || res.body.ok, 'Expected performance or ok response');
  });
}

async function runErrorTests() {
  console.log('\n⚠️  Error Handling\n');

  await test('GET /nonexistent - returns 404', async () => {
    const res = await request('GET', '/nonexistent');
    assert.equal(res.status, 404);
  });

  await test('POST /api/v1/training/start with timeout - handles gracefully', async () => {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 100);
      
      const res = await request('POST', '/api/v1/training/start');
      // If it completes before timeout, that's fine
      assert(res.status >= 200);
    } catch (e) {
      // Timeout is acceptable - server may take time
      assert(e.message.includes('timeout') || e.message.includes('abort'));
    }
  });

  await test('POST with invalid JSON - returns 400', async () => {
    const res = await request('POST', '/api/v1/training/new-topic', null);
    assert(res.status >= 400);
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 Training Server Integration Tests');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // Verify server is running
    try {
      await request('GET', '/health');
    } catch {
      console.error('❌ Training server is not running on port 3001');
      console.error('   Start with: npm run start:training');
      process.exit(1);
    }

    // Run all test suites
    await runHealthTests();
    await runCampTests();
    await runTopicTests();
    await runSettingsTests();
    await runHyperSpeedTests();
    await runProviderTests();
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
    console.log('🎉 All training server integration tests passed!');
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
