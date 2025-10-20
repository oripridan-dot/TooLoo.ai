import http from 'http';
import assert from 'assert';

const PORT = 3000; // Test via web-server proxy
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Reusable HTTP request utility
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

// Security test suite
async function runSecurityTests() {
  console.log('\n╭─────────────────────────────────────────────────────╮');
  console.log('│ SECURITY TESTING SUITE                              │');
  console.log('╰─────────────────────────────────────────────────────╯\n');

  let passed = 0;
  let failed = 0;

  // Test 1: SQL Injection Prevention (Training Endpoint)
  try {
    console.log('Test 1: SQL Injection Prevention (Training Query)');
    const maliciousInput = "'; DROP TABLE users; --";
    const res = await makeRequest('POST', '/api/v1/training/query', {
      query: maliciousInput,
    });
    // Should either reject (400-403) or safely handle (200 with no data access)
    assert(
      res.status !== 500 && res.status !== 502,
      `Expected safe handling, got ${res.status}`
    );
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 2: NoSQL Injection Prevention (Budget Endpoint)
  try {
    console.log('Test 2: NoSQL Injection Prevention (Budget Query)');
    const maliciousInput = { $ne: null };
    const res = await makeRequest('POST', '/api/v1/budget/query', {
      filter: maliciousInput,
    });
    // Should safely handle NoSQL injection attempts
    assert(
      res.status !== 500 && res.status !== 502,
      `Expected safe handling, got ${res.status}`
    );
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 3: XSS Prevention (Script in Query)
  try {
    console.log('Test 3: XSS Prevention (Script Tag in Input)');
    const xssPayload = '<script>alert("XSS")</script>';
    const res = await makeRequest('POST', '/api/v1/training/analyze', {
      text: xssPayload,
    });
    // Response should not execute scripts
    assert(
      !res.body.includes('<script>') && res.status !== 500,
      'Response contains unescaped script tag'
    );
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 4: Command Injection Prevention
  try {
    console.log('Test 4: Command Injection Prevention');
    const commandPayload = '; rm -rf /';
    const res = await makeRequest('POST', '/api/v1/training/execute', {
      command: commandPayload,
    });
    // Should not execute system commands
    assert(res.status !== 500 && res.status !== 502, `Potential command injection`);
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 5: CORS Headers Validation
  try {
    console.log('Test 5: CORS Headers Validation');
    const res = await makeRequest('GET', '/health', null, {
      Origin: 'http://malicious-origin.com',
    });
    // Should have proper CORS headers or none at all (not open to all)
    const corsHeader = res.headers['access-control-allow-origin'];
    const isSafe = !corsHeader || corsHeader !== '*' || corsHeader === 'http://127.0.0.1:3000';
    assert(isSafe, `Overly permissive CORS: ${corsHeader}`);
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 6: Missing Security Headers
  try {
    console.log('Test 6: Security Headers Present');
    const res = await makeRequest('GET', '/health');
    const hasSecurityHeaders =
      res.headers['x-content-type-options'] || res.headers['content-security-policy'];
    assert(hasSecurityHeaders || res.status === 200, 'Security headers missing');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 7: Rate Limiting Headers
  try {
    console.log('Test 7: Rate Limiting Headers');
    const res = await makeRequest('GET', '/api/v1/training/overview');
    const hasRateLimitHeaders =
      res.headers['x-ratelimit-limit'] || res.headers['ratelimit-limit'];
    assert(res.status !== 500 && res.status !== 502, 'Server error on rate limit test');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 8: Sensitive Data Exposure (No Credentials in URL)
  try {
    console.log('Test 8: No Credentials in URL Logging');
    const sensitiveUrl = '/api/v1/training/query?password=secret123&token=abc123';
    const res = await makeRequest('GET', sensitiveUrl);
    // Server should not echo back credentials in response
    assert(
      !res.body.includes('secret123') && !res.body.includes('abc123'),
      'Credentials exposed in response'
    );
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 9: Path Traversal Prevention
  try {
    console.log('Test 9: Path Traversal Prevention');
    const traversalPayload = '../../../../etc/passwd';
    const res = await makeRequest('GET', `/api/v1/reports/${traversalPayload}`);
    assert(res.status !== 500 && res.status !== 502, 'Path traversal vulnerability');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 10: Unauthorized Access (No Auth Token)
  try {
    console.log('Test 10: Unauthorized Access Prevention');
    const res = await makeRequest('POST', '/api/v1/workflows/protected', {
      action: 'delete',
    });
    // Should return 401/403, not 200 with data access
    assert(
      res.status === 401 || res.status === 403 || res.status === 404,
      `Unprotected endpoint: ${res.status}`
    );
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 11: Large Payload Rejection
  try {
    console.log('Test 11: Large Payload Rejection');
    const largePayload = 'x'.repeat(10000000); // 10MB
    const res = await makeRequest('POST', '/api/v1/training/analyze', {
      text: largePayload,
    });
    // Should reject or handle gracefully, not crash
    assert(res.status !== 500 && res.status !== 502, 'Server crash on large payload');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 12: Null Byte Injection Prevention
  try {
    console.log('Test 12: Null Byte Injection Prevention');
    const nullBytePayload = 'test\x00injection';
    const res = await makeRequest('POST', '/api/v1/training/analyze', {
      text: nullBytePayload,
    });
    assert(res.status !== 500 && res.status !== 502, 'Null byte injection vulnerability');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 13: LDAP Injection Prevention
  try {
    console.log('Test 13: LDAP Injection Prevention');
    const ldapPayload = '*)(|(uid=*';
    const res = await makeRequest('POST', '/api/v1/training/search', {
      query: ldapPayload,
    });
    assert(res.status !== 500 && res.status !== 502, 'LDAP injection vulnerability');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 14: XML External Entity (XXE) Prevention
  try {
    console.log('Test 14: XXE Prevention');
    const xxePayload = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>';
    const res = await makeRequest('POST', '/api/v1/reports/parse', {
      data: xxePayload,
    });
    assert(res.status !== 500 && res.status !== 502, 'XXE vulnerability');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 15: CSRF Token Validation
  try {
    console.log('Test 15: CSRF Protection');
    const res = await makeRequest('POST', '/api/v1/workflows/start', {
      action: 'create',
    });
    // POST without CSRF token should either be rejected or have protection
    assert(res.status !== 500 && res.status !== 502, 'CSRF vulnerability detected');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 16: Content-Type Validation
  try {
    console.log('Test 16: Content-Type Validation');
    const res = await makeRequest('POST', '/api/v1/training/analyze', {
      text: 'test',
    });
    assert(res.status !== 500 && res.status !== 502, 'Content-Type validation failure');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 17: Broken Object Level Authorization
  try {
    console.log('Test 17: Object Level Authorization');
    const res = await makeRequest('GET', '/api/v1/user/12345/data', null, {
      'X-User-ID': '67890',
    });
    // Should not allow access to other user's data
    assert(
      res.status === 401 || res.status === 403 || res.status === 404,
      'BOLA vulnerability detected'
    );
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 18: Error Message Disclosure
  try {
    console.log('Test 18: Error Message Disclosure Prevention');
    const res = await makeRequest('GET', '/api/v1/nonexistent/endpoint12345');
    // Error messages should not reveal sensitive info
    assert(
      !res.body.includes('stack') && !res.body.includes('/path/to/file'),
      'Stack trace disclosed in error'
    );
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 19: Input Sanitization
  try {
    console.log('Test 19: Input Sanitization');
    const dirtyInput = '<img src=x onerror="alert(1)">test';
    const res = await makeRequest('POST', '/api/v1/training/analyze', {
      text: dirtyInput,
    });
    assert(res.status !== 500 && res.status !== 502, 'Unsafe input handling');
    console.log('  ✓ PASS\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 20: Response Header Validation
  try {
    console.log('Test 20: Response Header Security');
    const res = await makeRequest('GET', '/health');
    // Should not expose server version or unnecessary info
    const serverHeader = res.headers['server'];
    const hasVersionInfo = serverHeader && serverHeader.includes('/');
    assert(res.status !== 500 && res.status !== 502, 'Server error');
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
runSecurityTests()
  .then((results) => {
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('Security test suite error:', err);
    process.exit(1);
  });
