/**
 * Integration tests for Design Integration Server
 * Tests API endpoints, caching, and error handling
 */

import { DesignIntegrationServer } from '../servers/design-integration-server.js';
import http from 'http';
import assert from 'assert';

// Helper to make HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3008,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Test suite
async function runTests() {
  console.log('🧪 Running Design Integration Server Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Start server
  const server = new DesignIntegrationServer(3008);
  server.start();
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 1: Health check
  try {
    const response = await makeRequest('GET', '/api/v1/design/health');
    
    assert.strictEqual(response.statusCode, 200, 'Health check should return 200');
    assert.strictEqual(response.data.ok, true, 'Health check should return ok: true');
    assert.strictEqual(response.data.service, 'Design Integration Server', 'Should return service name');
    assert.ok(response.data.uptime >= 0, 'Should return uptime');
    
    console.log('✅ Test 1: Health check - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 1: Health check - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 2: Cache status endpoint
  try {
    const response = await makeRequest('GET', '/api/v1/design/cache-status');
    
    assert.strictEqual(response.statusCode, 200, 'Cache status should return 200');
    assert.strictEqual(response.data.ok, true, 'Cache status should return ok: true');
    assert.ok(response.data.cache, 'Should return cache object');
    assert.ok(Array.isArray(response.data.cache.entries), 'Should return cache entries array');
    
    console.log('✅ Test 2: Cache status endpoint - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 2: Cache status endpoint - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 3: Import Figma - missing figmaUrl
  try {
    const response = await makeRequest('POST', '/api/v1/design/import-figma', {
      apiToken: 'test-token'
    });
    
    assert.strictEqual(response.statusCode, 400, 'Should return 400 for missing figmaUrl');
    assert.strictEqual(response.data.ok, false, 'Should return ok: false');
    assert.ok(response.data.error.includes('figmaUrl'), 'Error should mention figmaUrl');
    
    console.log('✅ Test 3: Import Figma - missing figmaUrl - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 3: Import Figma - missing figmaUrl - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 4: Import Figma - missing apiToken
  try {
    const response = await makeRequest('POST', '/api/v1/design/import-figma', {
      figmaUrl: 'https://figma.com/file/ABC123/Test'
    });
    
    assert.strictEqual(response.statusCode, 400, 'Should return 400 for missing apiToken');
    assert.strictEqual(response.data.ok, false, 'Should return ok: false');
    assert.ok(response.data.error.includes('apiToken'), 'Error should mention apiToken');
    
    console.log('✅ Test 4: Import Figma - missing apiToken - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 4: Import Figma - missing apiToken - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 5: Import Figma - invalid URL format
  try {
    const response = await makeRequest('POST', '/api/v1/design/import-figma', {
      figmaUrl: 'https://invalid-url.com/not-figma',
      apiToken: 'test-token'
    });
    
    assert.strictEqual(response.statusCode, 400, 'Should return 400 for invalid URL');
    assert.strictEqual(response.data.ok, false, 'Should return ok: false');
    assert.ok(response.data.error.includes('Invalid Figma URL'), 'Error should mention invalid URL');
    
    console.log('✅ Test 5: Import Figma - invalid URL format - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 5: Import Figma - invalid URL format - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 6: Import Figma - invalid API token (will fail at Figma API call)
  try {
    const response = await makeRequest('POST', '/api/v1/design/import-figma', {
      figmaUrl: 'https://figma.com/file/ABC123XYZ/TestFile',
      apiToken: 'invalid-token'
    });
    
    // This should fail when trying to connect to real Figma API
    assert.strictEqual(response.data.ok, false, 'Should return ok: false for invalid token');
    assert.ok(response.data.error, 'Should return error message');
    
    console.log('✅ Test 6: Import Figma - invalid API token - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 6: Import Figma - invalid API token - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 7: Unknown endpoint (404)
  try {
    const response = await makeRequest('GET', '/api/v1/unknown');
    
    assert.strictEqual(response.statusCode, 404, 'Should return 404 for unknown endpoint');
    assert.strictEqual(response.data.ok, false, 'Should return ok: false');
    assert.ok(Array.isArray(response.data.availableEndpoints), 'Should list available endpoints');
    
    console.log('✅ Test 7: Unknown endpoint (404) - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 7: Unknown endpoint (404) - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 8: CORS headers
  try {
    const response = await makeRequest('OPTIONS', '/api/v1/design/import-figma');
    
    assert.strictEqual(response.statusCode, 204, 'OPTIONS should return 204');
    
    console.log('✅ Test 8: CORS headers - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 8: CORS headers - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 9: Cache functionality
  try {
    // First, manually set cache
    const testData = {
      ok: true,
      design_system: {
        colors: { test: '#FF0000' },
        typography: {},
        spacing: {},
        components: [],
      },
    };
    
    server.setCached('test-key', testData);
    
    // Verify it's in cache
    const cached = server.getCached('test-key');
    assert.deepStrictEqual(cached, testData, 'Cached data should match original');
    
    // Check cache status shows the entry
    const statusResponse = await makeRequest('GET', '/api/v1/design/cache-status');
    assert.ok(statusResponse.data.cache.count >= 1, 'Cache count should be at least 1');
    
    console.log('✅ Test 9: Cache functionality - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 9: Cache functionality - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 10: Cache expiration
  try {
    // Set cache with custom short TTL
    const originalTTL = server.CACHE_TTL;
    server.CACHE_TTL = 100; // 100ms
    
    server.setCached('expiring-key', { test: 'data' });
    
    // Verify it exists
    let cached = server.getCached('expiring-key');
    assert.ok(cached !== null, 'Cache should exist initially');
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Verify it's expired
    cached = server.getCached('expiring-key');
    assert.strictEqual(cached, null, 'Cache should be expired');
    
    // Restore original TTL
    server.CACHE_TTL = originalTTL;
    
    console.log('✅ Test 10: Cache expiration - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 10: Cache expiration - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Stop server
  server.stop();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Tests completed: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(50));

  return failed === 0;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
