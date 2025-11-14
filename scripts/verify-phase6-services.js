#!/usr/bin/env node

/**
 * Phase 6 Service Verification Script
 * Tests observability endpoints and verifies all 8 services
 * 
 * Usage:
 *   node scripts/verify-phase6-services.js
 * 
 * Prerequisites:
 *   - Services must be running (npm run dev)
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const SERVICES = {
  'budget-server': { port: 3003, endpoint: '/api/v1/providers/resilience-status' },
  'web-server': { port: 3000, endpoint: '/api/v1/system/observability' },
  'reports-server': { port: 3008, endpoint: '/api/v1/system/observability' },
  'training-server': { port: 3001, endpoint: '/api/v1/system/observability' },
  'meta-server': { port: 3002, endpoint: '/api/v1/system/observability' },
  'coach-server': { port: 3004, endpoint: '/api/v1/system/observability' },
  'segmentation-server': { port: 3007, endpoint: '/api/v1/system/observability' },
  'capabilities-server': { port: 3009, endpoint: '/api/v1/system/observability' }
};

const results = {
  timestamp: new Date().toISOString(),
  services: {},
  summary: {}
};

// ============ Service Health Check ============
async function checkServiceHealth(name, port) {
  const url = `http://127.0.0.1:${port}/health`;
  try {
    const response = await fetch(url, { timeout: 3000 });
    return response.ok;
  } catch (e) {
    return false;
  }
}

// ============ Test Observability Endpoint ============
async function testObservabilityEndpoint(name, port, endpoint) {
  const url = `http://127.0.0.1:${port}${endpoint}`;
  const result = {
    name,
    port,
    endpoint,
    healthy: false,
    metrics: {},
    errors: []
  };

  try {
    const response = await fetch(url, { timeout: 5000 });
    
    if (!response.ok) {
      result.errors.push(`HTTP ${response.status}: ${response.statusText}`);
      return result;
    }

    const data = await response.json();
    result.healthy = true;

    // Check for expected fields
    if (data.service) {
      result.metrics.service = data.service;
    }

    if (data.tracer) {
      result.metrics.tracer = {
        activeTraces: data.tracer.activeTraces || 0,
        totalTraces: data.tracer.totalTraces || 0,
        avgLatency: data.tracer.avgLatency ? `${data.tracer.avgLatency.toFixed(2)}ms` : 'N/A',
        p99Latency: data.tracer.p99Latency ? `${data.tracer.p99Latency.toFixed(2)}ms` : 'N/A',
        throughput: data.tracer.throughput ? `${data.tracer.throughput.toFixed(2)}/s` : 'N/A',
        errorRate: data.tracer.errorRate ? `${(data.tracer.errorRate * 100).toFixed(2)}%` : 'N/A'
      };
    }

    if (data.cache) {
      result.metrics.cache = {
        hits: data.cache.hits || 0,
        misses: data.cache.misses || 0,
        hitRate: data.cache.hitRate ? `${(data.cache.hitRate * 100).toFixed(1)}%` : 'N/A',
        avgReadTime: data.cache.avgReadTime ? `${data.cache.avgReadTime.toFixed(2)}ms` : 'N/A'
      };
    }

    if (data.rateLimiter) {
      result.metrics.rateLimiter = {
        allowRate: data.rateLimiter.allowRate || 0,
        deniedCount: data.rateLimiter.deniedCount || 0,
        queueSize: data.rateLimiter.queueSize || 0
      };
    }

    if (data.circuitBreakers) {
      result.metrics.circuitBreakerStatus = Object.keys(data.circuitBreakers).length + ' breakers tracked';
    }

  } catch (e) {
    result.errors.push(e.message);
  }

  return result;
}

// ============ Print Results ============
function printResults() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    PHASE 6 SERVICE VERIFICATION REPORT                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const healthyCount = Object.values(results.services).filter(s => s.healthy).length;
  const totalCount = Object.keys(results.services).length;

  console.log(`📊 Overview: ${healthyCount}/${totalCount} services with observability\n`);

  // Group by status
  const healthy = Object.values(results.services).filter(s => s.healthy);
  const unhealthy = Object.values(results.services).filter(s => !s.healthy);

  if (healthy.length > 0) {
    console.log('✅ HEALTHY SERVICES');
    console.log('────────────────────────────────────────────────────────────────────────────');
    
    for (const service of healthy) {
      console.log(`\n  ${service.name} (Port ${service.port})`);
      console.log(`  Endpoint: ${service.endpoint}`);
      
      if (service.metrics.service) {
        console.log(`  Service: ${service.metrics.service}`);
      }

      if (service.metrics.tracer) {
        console.log('  Tracer:');
        console.log(`    ├─ Total Traces: ${service.metrics.tracer.totalTraces}`);
        console.log(`    ├─ Avg Latency: ${service.metrics.tracer.avgLatency}`);
        console.log(`    ├─ P99 Latency: ${service.metrics.tracer.p99Latency}`);
        console.log(`    ├─ Throughput: ${service.metrics.tracer.throughput}`);
        console.log(`    └─ Error Rate: ${service.metrics.tracer.errorRate}`);
      }

      if (service.metrics.cache) {
        console.log('  Cache:');
        console.log(`    ├─ Hit Rate: ${service.metrics.cache.hitRate}`);
        console.log(`    ├─ Hits: ${service.metrics.cache.hits}`);
        console.log(`    ├─ Misses: ${service.metrics.cache.misses}`);
        console.log(`    └─ Avg Read Time: ${service.metrics.cache.avgReadTime}`);
      }

      if (service.metrics.rateLimiter) {
        console.log('  Rate Limiter:');
        console.log(`    ├─ Allow Rate: ${service.metrics.rateLimiter.allowRate}`);
        console.log(`    ├─ Denied: ${service.metrics.rateLimiter.deniedCount}`);
        console.log(`    └─ Queue: ${service.metrics.rateLimiter.queueSize}`);
      }

      if (service.metrics.circuitBreakerStatus) {
        console.log(`  Circuit Breakers: ${service.metrics.circuitBreakerStatus}`);
      }
    }
  }

  if (unhealthy.length > 0) {
    console.log('\n\n❌ UNHEALTHY SERVICES');
    console.log('────────────────────────────────────────────────────────────────────────────');
    
    for (const service of unhealthy) {
      console.log(`\n  ${service.name} (Port ${service.port})`);
      console.log(`  Endpoint: ${service.endpoint}`);
      console.log(`  Status: FAILED`);
      
      if (service.errors.length > 0) {
        console.log('  Errors:');
        for (const error of service.errors) {
          console.log(`    └─ ${error}`);
        }
      }
    }
  }

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║  Verification Complete: ${healthyCount}/${totalCount} services observable                        ║`);
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  // Save detailed results
  const reportPath = path.join(process.cwd(), 'phase6-verification-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed results saved to: phase6-verification-results.json\n`);
}

// ============ Main Execution ============
async function main() {
  console.log('\n🔍 Phase 6 Service Verification\n');
  console.log('Checking observability endpoints on all 8 services...\n');

  // Check which services are actually running
  const runningServices = [];
  console.log('Checking service health...');
  for (const [name, config] of Object.entries(SERVICES)) {
    const healthy = await checkServiceHealth(name, config.port);
    if (healthy) {
      runningServices.push(name);
      console.log(`  ✅ ${name} is running`);
    } else {
      console.log(`  ❌ ${name} is NOT running`);
    }
  }

  if (runningServices.length === 0) {
    console.log('\n⚠️  No services are running! Start them with: npm run dev');
    process.exit(1);
  }

  console.log(`\n${runningServices.length} service(s) running. Testing observability...\n`);

  // Test observability endpoints for running services
  for (const name of runningServices) {
    const config = SERVICES[name];
    const result = await testObservabilityEndpoint(name, config.port, config.endpoint);
    results.services[name] = result;

    if (result.healthy) {
      console.log(`✅ ${name}: Observable`);
    } else {
      console.log(`❌ ${name}: Failed - ${result.errors.join(', ')}`);
    }
  }

  // Summary
  results.summary = {
    timestamp: new Date().toISOString(),
    totalServices: Object.keys(SERVICES).length,
    runningServices: runningServices.length,
    observableServices: Object.values(results.services).filter(s => s.healthy).length,
    failedServices: Object.values(results.services).filter(s => !s.healthy).length
  };

  printResults();
}

main().catch(e => {
  console.error('❌ Verification failed:', e);
  process.exit(1);
});
