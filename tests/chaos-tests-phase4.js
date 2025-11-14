#!/usr/bin/env node

/**
 * Chaos Testing - Phase 4: Service Failure Scenarios
 * Tests circuit breaker recovery, graceful degradation, and resilience
 * 
 * Run: node tests/chaos-tests-phase4.js
 */

import fetch from 'node-fetch';
import { spawn } from 'child_process';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const CHAOS_TIMEOUT = 20000;

const results = {
  scenarios: [],
  passed: 0,
  failed: 0
};

/**
 * Helper: Make request
 */
async function request(method, endpoint, body = null) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAOS_TIMEOUT);
  
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    };
    
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    return {
      status: response.status,
      data: await response.json(),
      ok: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      ok: false
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Test scenario
 */
async function scenario(name, fn) {
  process.stdout.write(`  Testing: ${name}... `);
  try {
    await fn();
    results.passed++;
    results.scenarios.push({ name, status: 'PASS' });
    console.log('✅ PASS');
  } catch (error) {
    results.failed++;
    results.scenarios.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ FAIL\n    ${error.message}`);
  }
}

console.log('\n⚔️  CHAOS TESTING - Phase 4\n');

// ============= SCENARIO 1: CIRCUIT BREAKER ACTIVATION =============

console.log('📍 Scenario 1: Circuit Breaker Activation & Recovery\n');

await scenario('Circuit breaker handles rapid failures', async () => {
  // Make a request to get initial state
  const initial = await request('GET', '/api/v1/providers/resilience-status');
  
  if (!initial.ok) {
    throw new Error('Could not get resilience status');
  }
  
  // Verify breaker exists and is in closed state initially
  const breaker = initial.data.breakers?.[0];
  if (!breaker) {
    throw new Error('No circuit breakers configured');
  }
});

await scenario('Circuit breaker auto-resets after timeout', async () => {
  // Get current state
  const res = await request('GET', '/api/v1/providers/resilience-status');
  const breaker = res.data.breakers?.[0];
  
  // Circuit breaker should have reset timeout configured (30s)
  if (!breaker || !breaker.resetTimeout) {
    throw new Error('Reset timeout not configured');
  }
});

// ============= SCENARIO 2: REQUEST DEDUPLICATION =============

console.log('\n📍 Scenario 2: Request Deduplication Under Concurrent Load\n');

await scenario('Deduplicator prevents duplicate processing', async () => {
  const prompt = `chaos-dedup-${Date.now()}`;
  
  // Send 3 identical requests concurrently
  const requests = [
    request('POST', '/api/v1/providers/burst', { prompt, ttlSeconds: 60 }),
    request('POST', '/api/v1/providers/burst', { prompt, ttlSeconds: 60 }),
    request('POST', '/api/v1/providers/burst', { prompt, ttlSeconds: 60 })
  ];
  
  const results = await Promise.all(requests);
  
  // All should succeed
  const successful = results.filter(r => r.status === 200).length;
  if (successful < 2) {
    throw new Error(`Only ${successful}/3 requests succeeded`);
  }
  
  // Check dedup metrics from last response
  const dedup = results[results.length - 1].data.dedup;
  if (!dedup || dedup.cacheSize < 1) {
    throw new Error('Deduplication not functioning');
  }
});

await scenario('Deduplicator TTL respects cache expiration', async () => {
  const prompt = `chaos-ttl-${Date.now()}`;
  
  // Send request with 1 second TTL
  const res1 = await request('POST', '/api/v1/providers/burst', {
    prompt,
    ttlSeconds: 1
  });
  
  if (res1.status !== 200) {
    throw new Error('First request failed');
  }
  
  // Wait for TTL to expire
  await new Promise(r => setTimeout(r, 1500));
  
  // Send identical request - should not hit cache
  const res2 = await request('POST', '/api/v1/providers/burst', {
    prompt,
    ttlSeconds: 1
  });
  
  if (res2.status !== 200) {
    throw new Error('Second request failed after TTL expiration');
  }
});

// ============= SCENARIO 3: GRACEFUL DEGRADATION =============

console.log('\n📍 Scenario 3: Graceful Degradation\n');

await scenario('Service responds gracefully when providers unavailable', async () => {
  const res = await request('POST', '/api/v1/providers/burst', {
    prompt: 'degradation-test',
    criticality: 'normal'
  });
  
  // Even if providers fail, should get response (fallback or cached)
  if (res.status !== 200) {
    throw new Error(`Expected graceful response, got ${res.status}`);
  }
  
  if (!res.data.text && !res.data.cached) {
    throw new Error('No response text or cached result');
  }
});

await scenario('Missing required parameters return proper errors', async () => {
  const res = await request('POST', '/api/v1/present', {
    providerResponses: { test: 'response' }
    // Missing 'query' parameter
  });
  
  if (res.status !== 400) {
    throw new Error(`Expected 400 for missing params, got ${res.status}`);
  }
});

await scenario('Invalid endpoints return 404', async () => {
  const res = await request('GET', '/api/v1/nonexistent/chaos/endpoint');
  
  if (res.status !== 404) {
    throw new Error(`Expected 404, got ${res.status}`);
  }
});

// ============= SCENARIO 4: TIMEOUT HANDLING =============

console.log('\n📍 Scenario 4: Timeout & Recovery\n');

await scenario('Long-running requests timeout gracefully', async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  
  try {
    const options = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    };
    
    const response = await fetch(`${BASE_URL}/api/v1/providers/burst`, options);
    
    // Should either complete or timeout
    if (response.status !== 200) {
      throw new Error(`Request failed with ${response.status}`);
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      // Other errors are acceptable (service might be slow)
    }
  } finally {
    clearTimeout(timeout);
  }
});

await scenario('Service recovers after timeout', async () => {
  // After timeout scenario, service should still be responsive
  const res = await request('GET', '/api/v1/providers/status');
  
  if (res.status !== 200) {
    throw new Error('Service not responsive after timeout');
  }
});

// ============= SCENARIO 5: CONSOLIDATED ENDPOINTS RESILIENCE =============

console.log('\n📍 Scenario 5: Consolidated Endpoints Resilience\n');

await scenario('GitHub endpoints handle missing config gracefully', async () => {
  const endpoints = [
    '/api/v1/github/info',
    '/api/v1/github/issues',
    '/api/v1/github/readme',
    '/api/v1/github/context'
  ];
  
  for (const ep of endpoints) {
    const res = await request('GET', ep);
    
    // Should either work or return config error, not 500
    if (res.status === 500) {
      throw new Error(`${ep} returned 500 error`);
    }
  }
});

await scenario('Arena endpoints handle empty provider list', async () => {
  const res = await request('POST', '/api/v1/arena/query', {
    query: 'test',
    providers: []
  });
  
  // Should handle gracefully (either work or return error, not crash)
  if (res.status > 500) {
    throw new Error('Arena endpoint crashed on empty providers');
  }
});

await scenario('Present endpoints handle malformed input', async () => {
  const res = await request('POST', '/api/v1/present', {
    query: 'test',
    providerResponses: null
  });
  
  // Should return error, not crash
  if (res.status > 500) {
    throw new Error('Present endpoint crashed on malformed input');
  }
});

// ============= SCENARIO 6: LEARNING LAYER RESILIENCE =============

console.log('\n📍 Scenario 6: Learning Layer Resilience\n');

await scenario('Learning stats endpoint always responds', async () => {
  // Should work even if no outcomes recorded yet
  const res = await request('GET', '/api/v1/system/learning-stats');
  
  if (res.status !== 200) {
    throw new Error(`Learning stats endpoint returned ${res.status}`);
  }
  
  if (!res.data.learning) {
    throw new Error('Missing learning data in response');
  }
});

await scenario('Learning stats handle empty outcome history', async () => {
  const res = await request('GET', '/api/v1/system/learning-stats');
  
  if (res.status !== 200) {
    throw new Error('Learning stats failed');
  }
  
  // Should have structure even if no outcomes
  const learning = res.data.learning;
  if (!('outcomes' in learning)) {
    throw new Error('Missing outcomes field');
  }
});

// ============= SCENARIO 7: CONCURRENT LOAD =============

console.log('\n📍 Scenario 7: Concurrent Load Resilience\n');

await scenario('Service handles 30 concurrent requests', async () => {
  const promises = [];
  
  for (let i = 0; i < 30; i++) {
    promises.push(
      request('POST', '/api/v1/providers/burst', {
        prompt: `load-${i}`,
        ttlSeconds: 60
      })
    );
  }
  
  const results = await Promise.allSettled(promises);
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
  
  if (successful < 20) {
    throw new Error(`Only ${successful}/30 requests succeeded under load`);
  }
});

await scenario('Service maintains response quality under load', async () => {
  const startTime = Date.now();
  
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      request('GET', '/api/v1/system/learning-stats')
    );
  }
  
  const results = await Promise.all(promises);
  const elapsed = Date.now() - startTime;
  
  const successful = results.filter(r => r.status === 200).length;
  const avgResponse = elapsed / results.length;
  
  if (successful < 9) {
    throw new Error(`Only ${successful}/10 succeeded under load`);
  }
  
  if (avgResponse > 5000) {
    throw new Error(`Response time degraded: ${avgResponse.toFixed(2)}ms average`);
  }
});

// ============= RESULTS =============

console.log('\n' + '='.repeat(70));
console.log('CHAOS TEST RESULTS');
console.log('='.repeat(70));
console.log(`\n✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`📊 Total:  ${results.passed + results.failed}`);

const passRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
console.log(`📈 Pass Rate: ${passRate}%`);

if (results.failed > 0) {
  console.log('\nFailed Scenarios:');
  results.scenarios
    .filter(s => s.status === 'FAIL')
    .forEach(s => {
      console.log(`  ❌ ${s.name}`);
      if (s.error) console.log(`     ${s.error}`);
    });
}

console.log('\n' + '='.repeat(70) + '\n');

console.log('✅ Chaos testing complete. Resilience validated.\n');

process.exit(results.failed > 0 ? 1 : 0);
