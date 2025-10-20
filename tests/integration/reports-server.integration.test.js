import http from 'http';
import assert from 'assert';

const PORT = 3008;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Reusable HTTP request utility (consistent with other test suites)
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
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

// Test suite for Reports Server
async function runReportsTests() {
  console.log('\n╭─────────────────────────────────────────────────────╮');
  console.log('│ REPORTS SERVER INTEGRATION TESTS (Port 3008)       │');
  console.log('╰─────────────────────────────────────────────────────╯\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  try {
    console.log('Test 1: Health Check');
    const res = await makeRequest('GET', '/health');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body, 'Expected response body');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 2: Get Comprehensive Report
  try {
    console.log('Test 2: GET /api/v1/reports/comprehensive');
    const res = await makeRequest('GET', '/api/v1/reports/comprehensive');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.report || res.body.data, 'Expected report data in response');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 3: Get AI Comparison Report
  try {
    console.log('Test 3: GET /api/v1/reports/ai-comparison');
    const res = await makeRequest('GET', '/api/v1/reports/ai-comparison');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.comparison || res.body.providers, 'Expected comparison data');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 4: Get Latest AI Comparison
  try {
    console.log('Test 4: GET /api/v1/reports/ai-comparison/latest');
    const res = await makeRequest('GET', '/api/v1/reports/ai-comparison/latest');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.timestamp || res.body.date || res.body.latest, 'Expected latest comparison data');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 5: Get Delta Report
  try {
    console.log('Test 5: GET /api/v1/reports/delta');
    const res = await makeRequest('GET', '/api/v1/reports/delta');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.delta || res.body.changes, 'Expected delta data');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 6: Create AI External Critique
  try {
    console.log('Test 6: POST /api/v1/reports/ai-external-critique');
    const res = await makeRequest('POST', '/api/v1/reports/ai-external-critique', {
      targetAI: 'claude',
      scope: 'general',
    });
    assert([200, 201, 202].includes(res.status), `Expected 200/201/202, got ${res.status}`);
    assert(res.body.critiqueId || res.body.id || res.body.running, 'Expected critique ID or status');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 7: Get Critique Run Status
  try {
    console.log('Test 7: GET /api/v1/reports/ai-external-critique/run');
    const res = await makeRequest('GET', '/api/v1/reports/ai-external-critique/run');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.status || res.body.running !== undefined, 'Expected run status');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 8: Get Latest Critique
  try {
    console.log('Test 8: GET /api/v1/reports/ai-external-critique/latest');
    const res = await makeRequest('GET', '/api/v1/reports/ai-external-critique/latest');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.critique || res.body.latest || res.body.data, 'Expected critique data');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 9: Get Performance Report
  try {
    console.log('Test 9: GET /api/v1/reports/performance');
    const res = await makeRequest('GET', '/api/v1/reports/performance');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.metrics || res.body.performance, 'Expected performance metrics');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 10: Get Evolution Report
  try {
    console.log('Test 10: GET /api/v1/reports/evolution');
    const res = await makeRequest('GET', '/api/v1/reports/evolution');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.evolution || res.body.timeline, 'Expected evolution data');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 11: Get Capabilities Report
  try {
    console.log('Test 11: GET /api/v1/reports/capabilities');
    const res = await makeRequest('GET', '/api/v1/reports/capabilities');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.capabilities || res.body.features, 'Expected capabilities data');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 12: Get Dashboard Report
  try {
    console.log('Test 12: GET /api/v1/reports/dashboard');
    const res = await makeRequest('GET', '/api/v1/reports/dashboard');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.dashboard || res.body.widgets, 'Expected dashboard data');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 13: Get Critiques Analysis
  try {
    console.log('Test 13: GET /api/v1/reports/critiques/analysis');
    const res = await makeRequest('GET', '/api/v1/reports/critiques/analysis');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.analysis || res.body.data, 'Expected analysis data');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 14: Get Comprehensive with Filters
  try {
    console.log('Test 14: GET /api/v1/reports/comprehensive (with query params)');
    const res = await makeRequest('GET', '/api/v1/reports/comprehensive?format=json&details=true');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 15: Get Performance with Time Range
  try {
    console.log('Test 15: GET /api/v1/reports/performance (with time range)');
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const res = await makeRequest(
      'GET',
      `/api/v1/reports/performance?from=${oneHourAgo}&to=${now}`
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Summary
  const total = passed + failed;
  const passRate = Math.round((passed / total) * 100);
  console.log('╭─────────────────────────────────────────────────────╮');
  console.log(`│ RESULTS: ${passed}/${total} passed (${passRate}%)                          │`);
  console.log('╰─────────────────────────────────────────────────────╯\n');

  return { passed, failed, total, passRate };
}

// Run tests
runReportsTests()
  .then((results) => {
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('Test suite error:', err);
    process.exit(1);
  });
