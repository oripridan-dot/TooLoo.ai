#!/usr/bin/env node

/**
 * Phase 6 Performance Testing Suite
 * Measures cache hit rates, latency improvements, and overhead
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BASE_URLS = {
  'budget-server': 'http://127.0.0.1:3003',
  'web-server': 'http://127.0.0.1:3000',
  'reports-server': 'http://127.0.0.1:3008',
  'training-server': 'http://127.0.0.1:3001',
  'meta-server': 'http://127.0.0.1:3002',
  'coach-server': 'http://127.0.0.1:3004',
  'segmentation-server': 'http://127.0.0.1:3007',
  'capabilities-server': 'http://127.0.0.1:3009',
};

const results = {
  timestamp: new Date().toISOString(),
  services: {},
  cachePerformance: {},
  rateLimit: {},
  tracing: {},
  summary: {}
};

// ============ Health Check ============
async function checkServiceHealth() {
  console.log('\n🏥 Checking service health...\n');
  const healthStatus = {};
  
  for (const [service, baseUrl] of Object.entries(BASE_URLS)) {
    try {
      const response = await fetch(`${baseUrl}/health`, { timeout: 5000 });
      healthStatus[service] = response.ok;
      console.log(`  ${response.ok ? '✅' : '❌'} ${service} (${baseUrl})`);
    } catch (e) {
      healthStatus[service] = false;
      console.log(`  ❌ ${service} - ${e.message}`);
    }
  }
  
  const allHealthy = Object.values(healthStatus).every(v => v);
  if (!allHealthy) {
    console.log('\n⚠️  Some services are not running. Start with: npm run dev');
    process.exit(1);
  }
  console.log('\n✅ All services healthy!\n');
  return healthStatus;
}

// ============ Cache Performance Testing ============
async function testCachePerformance() {
  console.log('📦 Testing Cache Performance (budget-server)...\n');
  const baseUrl = BASE_URLS['budget-server'];
  const testData = { prompt: 'test-query-' + Date.now() };
  const iterations = 5;
  const metrics = {
    firstRequestTimes: [],
    cacheHitTimes: [],
    cacheStats: null,
    hitRate: 0,
    improvement: 0
  };

  try {
    // First request (cache miss)
    console.log('  Testing cache MISS (first request)...');
    let totalMissTime = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const response = await fetch(`${baseUrl}/api/v1/providers/burst`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `test-miss-${i}` }),
        timeout: 30000
      });
      const elapsed = performance.now() - start;
      const data = await response.json();
      
      if (data.cache === 'miss') {
        totalMissTime += elapsed;
      }
    }
    const avgMissTime = totalMissTime / iterations;
    metrics.firstRequestTimes.push(avgMissTime);
    console.log(`    Average miss time: ${avgMissTime.toFixed(2)}ms`);

    // Cache hit requests (same prompt)
    console.log('  Testing cache HITS (repeated requests)...');
    let totalHitTime = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const response = await fetch(`${baseUrl}/api/v1/providers/burst`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
        timeout: 30000
      });
      const elapsed = performance.now() - start;
      const data = await response.json();
      
      if (data.cache === 'hit') {
        totalHitTime += elapsed;
      }
    }
    const avgHitTime = totalHitTime / iterations;
    metrics.firstRequestTimes.push(avgHitTime);
    console.log(`    Average hit time: ${avgHitTime.toFixed(2)}ms`);

    // Get cache statistics
    console.log('  Fetching cache statistics...');
    const statsResponse = await fetch(`${baseUrl}/api/v1/providers/resilience-status`);
    const statsData = await statsResponse.json();
    
    if (statsData.cache) {
      metrics.cacheStats = statsData.cache;
      metrics.hitRate = statsData.cache.hitRate || 0;
      console.log(`    Cache hits: ${statsData.cache.hits || 0}`);
      console.log(`    Cache misses: ${statsData.cache.misses || 0}`);
      console.log(`    Hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
      
      // Calculate improvement
      if (avgMissTime > 0) {
        metrics.improvement = ((avgMissTime - avgHitTime) / avgMissTime * 100);
        console.log(`    Latency improvement: ${metrics.improvement.toFixed(1)}%`);
      }
    }

    results.cachePerformance = metrics;
    console.log('');
  } catch (e) {
    console.log(`  ❌ Cache testing failed: ${e.message}\n`);
    results.cachePerformance = { error: e.message };
  }
}

// ============ Rate Limiter Testing ============
async function testRateLimiter() {
  console.log('⏱️  Testing Rate Limiter (web-server)...\n');
  const baseUrl = BASE_URLS['web-server'];
  const metrics = {
    successCount: 0,
    limitedCount: 0,
    totalRequests: 20,
    avgLatency: 0,
    rateLimit: {}
  };

  try {
    console.log('  Sending 20 rapid requests...');
    const startTime = performance.now();
    let totalLatency = 0;

    for (let i = 0; i < metrics.totalRequests; i++) {
      const start = performance.now();
      try {
        const response = await fetch(`${baseUrl}/api/v1/training/overview`, {
          headers: { 'X-Client-ID': 'test-client' },
          timeout: 5000
        });
        const elapsed = performance.now() - start;
        totalLatency += elapsed;

        if (response.status === 429) {
          metrics.limitedCount++;
          console.log(`    Request ${i + 1}: Rate limited (429)`);
        } else if (response.ok) {
          metrics.successCount++;
          // Capture rate limit headers
          const rateLimit = response.headers.get('X-RateLimit-Limit');
          const remaining = response.headers.get('X-RateLimit-Remaining');
          if (rateLimit) {
            metrics.rateLimit = {
              limit: rateLimit,
              remaining: remaining
            };
          }
        }
      } catch (e) {
        console.log(`    Request ${i + 1}: Error - ${e.message}`);
      }
    }

    const totalTime = performance.now() - startTime;
    metrics.avgLatency = totalLatency / metrics.totalRequests;
    
    console.log('  Results:');
    console.log(`    Successful: ${metrics.successCount}/${metrics.totalRequests}`);
    console.log(`    Rate limited: ${metrics.limitedCount}/${metrics.totalRequests}`);
    console.log(`    Average latency: ${metrics.avgLatency.toFixed(2)}ms`);
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    
    if (metrics.rateLimit.limit) {
      console.log(`    Rate limit: ${metrics.rateLimit.limit} tokens`);
      console.log(`    Remaining: ${metrics.rateLimit.remaining} tokens`);
    }

    results.rateLimit = metrics;
    console.log('');
  } catch (e) {
    console.log(`  ❌ Rate limiter testing failed: ${e.message}\n`);
    results.rateLimit = { error: e.message };
  }
}

// ============ Tracing Overhead Testing ============
async function testTracingOverhead() {
  console.log('📊 Testing Distributed Tracing Overhead...\n');
  const services = ['training-server', 'meta-server', 'coach-server'];
  const endpoints = {
    'training-server': '/api/v1/training/overview',
    'meta-server': '/api/v4/meta-learning/report',
    'coach-server': '/api/v1/auto-coach/status'
  };

  try {
    for (const service of services) {
      const baseUrl = BASE_URLS[service];
      const endpoint = endpoints[service];
      console.log(`  Testing ${service}...`);

      const metrics = {
        requests: 10,
        times: [],
        avgLatency: 0,
        minLatency: Infinity,
        maxLatency: 0,
        traces: 0
      };

      for (let i = 0; i < metrics.requests; i++) {
        const start = performance.now();
        try {
          const response = await fetch(`${baseUrl}${endpoint}`, { timeout: 10000 });
          const elapsed = performance.now() - start;
          metrics.times.push(elapsed);
          metrics.avgLatency += elapsed;

          if (elapsed < metrics.minLatency) metrics.minLatency = elapsed;
          if (elapsed > metrics.maxLatency) metrics.maxLatency = elapsed;

          const data = await response.json();
          if (data.traceId) metrics.traces++;
        } catch (e) {
          // Ignore individual request errors
        }
      }

      metrics.avgLatency /= metrics.requests;
      results.tracing[service] = metrics;

      console.log(`    Average latency: ${metrics.avgLatency.toFixed(2)}ms`);
      console.log(`    Min/Max: ${metrics.minLatency.toFixed(2)}ms / ${metrics.maxLatency.toFixed(2)}ms`);
      console.log(`    Traces captured: ${metrics.traces}/${metrics.requests}`);
    }
    console.log('');
  } catch (e) {
    console.log(`  ❌ Tracing overhead testing failed: ${e.message}\n`);
  }
}

// ============ Observability Endpoints Testing ============
async function testObservabilityEndpoints() {
  console.log('🔍 Testing Observability Endpoints...\n');
  const endpoints = {
    'budget-server': '/api/v1/providers/resilience-status',
    'web-server': '/api/v1/system/observability',
    'reports-server': '/api/v1/system/observability',
    'training-server': '/api/v1/system/observability',
    'meta-server': '/api/v1/system/observability',
    'coach-server': '/api/v1/system/observability',
    'segmentation-server': '/api/v1/system/observability',
    'capabilities-server': '/api/v1/system/observability'
  };

  const observabilityStatus = {
    available: 0,
    total: Object.keys(endpoints).length,
    endpoints: {}
  };

  for (const [service, endpoint] of Object.entries(endpoints)) {
    const baseUrl = BASE_URLS[service];
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, { timeout: 5000 });
      if (response.ok) {
        const data = await response.json();
        observabilityStatus.endpoints[service] = {
          status: 'ok',
          hasTracer: !!data.tracer,
          hasCircuitBreakers: !!data.circuitBreakers,
          hasCache: !!data.cache,
          hasRateLimit: !!data.rateLimiter
        };
        observabilityStatus.available++;
        console.log(`  ✅ ${service}: Observable`);
        
        if (data.tracer) {
          console.log(`     └─ Traces: ${data.tracer.totalTraces || 0}, Avg latency: ${data.tracer.avgLatency?.toFixed(1) || 'N/A'}ms`);
        }
      } else {
        observabilityStatus.endpoints[service] = { status: 'failed', code: response.status };
        console.log(`  ❌ ${service}: HTTP ${response.status}`);
      }
    } catch (e) {
      observabilityStatus.endpoints[service] = { status: 'error', error: e.message };
      console.log(`  ❌ ${service}: ${e.message}`);
    }
  }

  results.summary.observability = observabilityStatus;
  console.log(`\n  Total observable: ${observabilityStatus.available}/${observabilityStatus.total}\n`);
}

// ============ Generate Report ============
function generateReport() {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('                    PERFORMANCE TEST REPORT');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Cache Performance Summary
  if (results.cachePerformance && !results.cachePerformance.error) {
    console.log('📦 CACHE PERFORMANCE');
    console.log('─────────────────────────────────────────────────────────────────');
    console.log(`  Hit Rate: ${(results.cachePerformance.hitRate * 100).toFixed(1)}%`);
    console.log(`  Latency Improvement: ${results.cachePerformance.improvement.toFixed(1)}%`);
    if (results.cachePerformance.cacheStats) {
      console.log(`  Total Hits: ${results.cachePerformance.cacheStats.hits || 0}`);
      console.log(`  Total Misses: ${results.cachePerformance.cacheStats.misses || 0}`);
    }
    console.log('');
  }

  // Rate Limiter Summary
  if (results.rateLimit && !results.rateLimit.error) {
    console.log('⏱️  RATE LIMITER');
    console.log('─────────────────────────────────────────────────────────────────');
    console.log(`  Success Rate: ${((results.rateLimit.successCount / results.rateLimit.totalRequests) * 100).toFixed(1)}%`);
    console.log(`  Average Latency: ${results.rateLimit.avgLatency.toFixed(2)}ms`);
    console.log(`  Requests Successful: ${results.rateLimit.successCount}/${results.rateLimit.totalRequests}`);
    console.log('');
  }

  // Tracing Summary
  if (Object.keys(results.tracing).length > 0) {
    console.log('📊 DISTRIBUTED TRACING');
    console.log('─────────────────────────────────────────────────────────────────');
    for (const [service, metrics] of Object.entries(results.tracing)) {
      console.log(`  ${service}:`);
      console.log(`    Average latency: ${metrics.avgLatency.toFixed(2)}ms`);
      console.log(`    Traces captured: ${metrics.traces}/${metrics.requests}`);
    }
    console.log('');
  }

  // Observability Summary
  if (results.summary.observability) {
    console.log('🔍 OBSERVABILITY');
    console.log('─────────────────────────────────────────────────────────────────');
    const { available, total } = results.summary.observability;
    console.log(`  Services Observable: ${available}/${total} (${((available/total)*100).toFixed(0)}%)`);
    console.log('');
  }

  // Save results to file
  const reportPath = path.join(process.cwd(), 'phase6-performance-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log('📄 Full results saved to: phase6-performance-results.json\n');

  console.log('═══════════════════════════════════════════════════════════════════\n');
}

// ============ Main Execution ============
async function main() {
  console.log('\n🚀 Phase 6 Performance Testing Suite\n');
  console.log('Prerequisites: Services should be running (npm run dev)\n');

  try {
    await checkServiceHealth();
    await testCachePerformance();
    await testRateLimiter();
    await testTracingOverhead();
    await testObservabilityEndpoints();
    generateReport();
    
    console.log('✅ Performance testing complete!\n');
  } catch (e) {
    console.error('❌ Testing failed:', e.message);
    process.exit(1);
  }
}

main();
