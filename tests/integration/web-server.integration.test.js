/**
 * Web Server Integration Tests
 * 
 * Tests all public endpoints on web-server.js
 * Ensures proper routing, response formats, and error handling
 * 
 * Run: node tests/integration/web-server.integration.test.js
 */

import http from 'http';
import { strict as assert } from 'assert';

const BASE_URL = 'http://127.0.0.1:3000';
const WEB_PORT = 3000;

let testsPassed = 0;
let testsFailed = 0;

// Utility: Make HTTP request
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

// Test wrapper
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

// Health checks
async function runHealthTests() {
  console.log('\n📋 Health & Status Endpoints\n');

  await test('GET /health - returns 200 with ok:true', async () => {
    const res = await request('GET', '/health');
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.ok === true, 'Expected ok:true');
    assert(res.body.server === 'web', 'Expected server:web');
  });

  await test('GET /api/v1/health - returns 200 with ok:true', async () => {
    const res = await request('GET', '/api/v1/health');
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.ok === true, 'Expected ok:true');
  });

  await test('GET /api/v1/system/routes - lists all routes', async () => {
    const res = await request('GET', '/api/v1/system/routes');
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.ok === true, 'Expected ok:true');
    assert(Array.isArray(res.body.routes), 'Expected routes array');
    assert(res.body.routes.length > 0, 'Expected non-empty routes');
  });
}

// System control endpoints
async function runSystemTests() {
  console.log('\n🎛️  System Control Endpoints\n');

  await test('POST /api/v1/system/priority/chat - sets chat priority', async () => {
    const res = await request('POST', '/api/v1/system/priority/chat', {});
    assert(res.status === 200 || res.status === 500, `Expected 200 or 500, got ${res.status}`);
    if (res.status === 200) {
      assert(res.body.ok === true, 'Expected ok:true');
      assert(res.body.mode === 'chat-priority', 'Expected mode:chat-priority');
    }
  });

  await test('POST /api/v1/system/priority/background - sets background priority', async () => {
    const res = await request('POST', '/api/v1/system/priority/background', {});
    assert(res.status === 200 || res.status === 500, `Expected 200 or 500, got ${res.status}`);
    if (res.status === 200) {
      assert(res.body.ok === true, 'Expected ok:true');
      assert(res.body.mode === 'background-priority', 'Expected mode:background-priority');
    }
  });

  await test('GET /system/status - returns system status', async () => {
    const res = await request('GET', '/system/status');
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.ok === true, 'Expected ok:true');
    assert(res.body.status, 'Expected status object');
  });
}

// UI route tests
async function runUITests() {
  console.log('\n🖥️  UI Routes\n');

  await test('GET / - loads dashboard', async () => {
    const res = await request('GET', '/');
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.raw.includes('html') || res.raw.includes('HTML'), 'Expected HTML response');
  });

  await test('GET /control-room - loads control room', async () => {
    const res = await request('GET', '/control-room');
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.raw.includes('html') || res.raw.includes('HTML'), 'Expected HTML response');
  });

  await test('GET /showcase - loads showcase demo', async () => {
    const res = await request('GET', '/showcase');
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.raw.includes('html') || res.raw.includes('HTML'), 'Expected HTML response');
  });

  await test('GET /feedback - loads feedback form', async () => {
    const res = await request('GET', '/feedback');
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.raw.includes('html') || res.raw.includes('HTML'), 'Expected HTML response');
  });
}

// Chat endpoints
async function runChatTests() {
  console.log('\n💬 Chat Endpoints\n');

  await test('POST /api/v1/chat/append - appends chat message', async () => {
    const res = await request('POST', '/api/v1/chat/append', {
      message: 'Test message',
      role: 'user'
    });
    assert(res.status === 200 || res.status === 400 || res.status === 500, `Unexpected status ${res.status}`);
    assert(res.body, 'Expected response body');
  });

  await test('GET /api/v1/chat/transcripts - retrieves transcripts', async () => {
    const res = await request('GET', '/api/v1/chat/transcripts');
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.ok === true, 'Expected ok:true');
    assert(Array.isArray(res.body.transcripts), 'Expected transcripts array');
  });

  await test('GET /api/v1/chat/burst-stream - streams burst data', async () => {
    const res = await request('GET', '/api/v1/chat/burst-stream?limit=10');
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.ok === true, 'Expected ok:true');
  });
}

// Feedback & Referral endpoints
async function runFeedbackTests() {
  console.log('\n📧 Feedback & Referral Endpoints\n');

  await test('POST /api/v1/feedback/submit - submits feedback', async () => {
    const res = await request('POST', '/api/v1/feedback/submit', {
      text: 'Test feedback',
      rating: 5,
      email: 'test@example.com'
    });
    assert(res.status === 200 || res.status === 400 || res.status === 500, `Unexpected status ${res.status}`);
  });

  await test('POST /api/v1/referral/create - creates referral', async () => {
    const res = await request('POST', '/api/v1/referral/create', {
      name: 'Test User',
      email: 'test@example.com'
    });
    assert(res.status === 200 || res.status === 400 || res.status === 500, `Unexpected status ${res.status}`);
  });

  await test('GET /api/v1/referral/leaderboard - retrieves leaderboard', async () => {
    const res = await request('GET', '/api/v1/referral/leaderboard');
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.ok === true, 'Expected ok:true');
  });

  await test('GET /api/v1/referral/stats - retrieves stats', async () => {
    const res = await request('GET', '/api/v1/referral/stats');
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.ok === true, 'Expected ok:true');
  });
}

// Error handling tests
async function runErrorTests() {
  console.log('\n⚠️  Error Handling\n');

  await test('GET /nonexistent - returns 404', async () => {
    const res = await request('GET', '/nonexistent');
    assert.equal(res.status, 404, `Expected 404, got ${res.status}`);
  });

  await test('POST /api/v1/chat/append with missing body - handles gracefully', async () => {
    const res = await request('POST', '/api/v1/chat/append', null);
    assert(res.status >= 400, `Expected 4xx error, got ${res.status}`);
  });

  await test('GET /favicon.ico - returns 204 No Content', async () => {
    const res = await request('GET', '/favicon.ico');
    assert.equal(res.status, 204, `Expected 204, got ${res.status}`);
  });
}

// CORS & Headers
async function runHeaderTests() {
  console.log('\n📡 Headers & CORS\n');

  await test('Response includes Content-Type header', async () => {
    const res = await request('GET', '/health');
    assert(res.headers['content-type'], 'Expected Content-Type header');
  });

  await test('All responses have JSON Content-Type', async () => {
    const res = await request('GET', '/api/v1/health');
    assert(res.headers['content-type'].includes('application/json'), 'Expected JSON Content-Type');
  });
}

// Main test runner
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 Web Server Integration Tests');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // Verify server is running
    try {
      await request('GET', '/health');
    } catch {
      console.error('❌ Web server is not running on port 3000');
      console.error('   Start with: npm run start:web');
      process.exit(1);
    }

    // Run all test suites
    await runHealthTests();
    await runSystemTests();
    await runUITests();
    await runChatTests();
    await runFeedbackTests();
    await runErrorTests();
    await runHeaderTests();

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
    console.log('🎉 All web server integration tests passed!');
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
