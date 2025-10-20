import http from 'http';
import assert from 'assert';

const PORT = 3007;
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

// Test suite for Segmentation Server
async function runSegmentationTests() {
  console.log('\n╭─────────────────────────────────────────────────────╮');
  console.log('│ SEGMENTATION SERVER INTEGRATION TESTS (Port 3007)   │');
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

  // Test 2: Get Segmentation Status
  try {
    console.log('Test 2: GET /api/v1/segmentation/status');
    const res = await makeRequest('GET', '/api/v1/segmentation/status');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.status, 'Expected status field in response');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 3: Configure Segmentation
  try {
    console.log('Test 3: POST /api/v1/segmentation/configure');
    const res = await makeRequest('POST', '/api/v1/segmentation/configure', {
      type: 'behavioral',
      threshold: 0.5,
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 4: Analyze Conversation Segment
  try {
    console.log('Test 4: POST /api/v1/segmentation/analyze');
    const res = await makeRequest('POST', '/api/v1/segmentation/analyze', {
      text: 'This is a test conversation segment for analysis.',
      conversationId: 'test-conv-001',
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.segments !== undefined, 'Expected segments in response');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 5: Get Demo Data
  try {
    console.log('Test 5: GET /api/v1/segmentation/demo');
    const res = await makeRequest('GET', '/api/v1/segmentation/demo');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.segments), 'Expected segments array');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 6: Create Cohort
  try {
    console.log('Test 6: POST /api/v1/segmentation/cohorts');
    const res = await makeRequest('POST', '/api/v1/segmentation/cohorts', {
      name: 'Test Cohort',
      filter: { type: 'behavioral' },
      userIds: ['user-001', 'user-002'],
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body.cohortId || res.body.id, 'Expected cohort ID in response');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 7: Get All Cohorts
  try {
    console.log('Test 7: GET /api/v1/segmentation/cohorts');
    const res = await makeRequest('GET', '/api/v1/segmentation/cohorts');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.cohorts) || Array.isArray(res.body), 'Expected cohorts array');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 8: Get User Cohorts
  try {
    console.log('Test 8: GET /api/v1/segmentation/cohorts/:userId');
    const res = await makeRequest('GET', '/api/v1/segmentation/cohorts/test-user-001');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.cohorts) || Array.isArray(res.body) || res.body.userId, 'Expected cohort data');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 9: Configure with Invalid Type (Edge Case)
  try {
    console.log('Test 9: POST /api/v1/segmentation/configure (Invalid Type)');
    const res = await makeRequest('POST', '/api/v1/segmentation/configure', {
      type: 'invalid_type',
      threshold: 1.5,
    });
    assert([200, 400].includes(res.status), `Expected 200/400, got ${res.status}`);
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 10: Analyze Empty Text (Edge Case)
  try {
    console.log('Test 10: POST /api/v1/segmentation/analyze (Empty Text)');
    const res = await makeRequest('POST', '/api/v1/segmentation/analyze', {
      text: '',
      conversationId: 'empty-conv',
    });
    assert([200, 400].includes(res.status), `Expected 200/400, got ${res.status}`);
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 11: Create Cohort Missing Required Field (Edge Case)
  try {
    console.log('Test 11: POST /api/v1/segmentation/cohorts (Missing Name)');
    const res = await makeRequest('POST', '/api/v1/segmentation/cohorts', {
      filter: { type: 'behavioral' },
    });
    assert([200, 400].includes(res.status), `Expected 200/400, got ${res.status}`);
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 12: Get Cohorts with Filters
  try {
    console.log('Test 12: GET /api/v1/segmentation/cohorts (with query params)');
    const res = await makeRequest('GET', '/api/v1/segmentation/cohorts?type=behavioral&limit=10');
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
runSegmentationTests()
  .then((results) => {
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('Test suite error:', err);
    process.exit(1);
  });
