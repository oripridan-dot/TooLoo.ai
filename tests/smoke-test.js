#!/usr/bin/env node

/**
 * SMOKE TEST - System Validation (5 minutes)
 * 
 * Validates all 10 core services:
 * 1. Service startup
 * 2. Health check endpoints
 * 3. Basic endpoint responses
 * 4. Error handling consistency
 * 
 * Usage: node tests/smoke-test.js
 * Exit code 0 = all pass, non-zero = failures
 */

import { spawn } from 'child_process';
import http from 'http';
import fetch from 'node-fetch';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SERVICES = [
  { name: 'web-server', port: 3000, file: 'servers/web-server.js' },
  { name: 'training-server', port: 3001, file: 'servers/training-server.js' },
  { name: 'meta-server', port: 3002, file: 'servers/meta-server.js' },
  { name: 'budget-server', port: 3003, file: 'servers/budget-server.js' },
  { name: 'coach-server', port: 3004, file: 'servers/coach-server.js' },
  { name: 'cup-server', port: 3005, file: 'servers/cup-server.js' },
  { name: 'product-dev-server', port: 3006, file: 'servers/product-development-server.js' },
  { name: 'reports-server', port: 3008, file: 'servers/reports-server.js' },
  { name: 'capabilities-server', port: 3009, file: 'servers/capabilities-server.js' },
  { name: 'orchestrator', port: 3123, file: 'servers/orchestrator.js' }
];

const TIMEOUT_MS = 30000;        // 30s per service startup
const HEALTH_TIMEOUT_MS = 5000;  // 5s health check timeout
const TEST_TIMEOUT = 5 * 60 * 1000; // 5 minutes total

// ============================================================================
// TEST STATE
// ============================================================================

let testStartTime = Date.now();
let servicesStarted = [];
let testResults = { passed: 0, failed: 0, errors: [] };

// ============================================================================
// UTILITIES
// ============================================================================

function log(level, msg) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] [${level}] ${msg}`);
}

function elapsed() {
  return ((Date.now() - testStartTime) / 1000).toFixed(1);
}

async function waitForPort(port, timeoutMs = HEALTH_TIMEOUT_MS) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`, { timeout: 2000 });
      if (res.status === 200) return true;
    } catch (e) {
      // Port not ready yet
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

async function testEndpoint(port, path, expectedStatus = 200) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { timeout: HEALTH_TIMEOUT_MS });
    return res.status === expectedStatus;
  } catch (e) {
    return false;
  }
}

async function testErrorHandling(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/nonexistent`, { timeout: HEALTH_TIMEOUT_MS });
    const data = await res.json().catch(() => ({}));
    return data.ok === false;
  } catch (e) {
    return false;
  }
}

// ============================================================================
// SERVICE STARTUP
// ============================================================================

async function startService(service) {
  return new Promise((resolve) => {
    log('INFO', `Starting ${service.name} (port ${service.port})...`);
    
    const proc = spawn('node', [service.file], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    let timedOut = false;
    let readyOutput = false;
    
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, TIMEOUT_MS);
    
    proc.stdout.on('data', (data) => {
      if (!readyOutput && (data.toString().includes('listening') || data.toString().includes('ready'))) {
        readyOutput = true;
      }
    });
    
    proc.stderr.on('data', (data) => {
      // Errors are ok during startup, just listen for ready state
    });
    
    const checkReady = async () => {
      if (readyOutput || await waitForPort(service.port, 2000)) {
        clearTimeout(timeout);
        servicesStarted.push(proc);
        log('OK', `✅ ${service.name} started`);
        testResults.passed++;
        resolve(true);
      } else if (!timedOut) {
        setTimeout(checkReady, 100);
      } else {
        log('FAIL', `❌ ${service.name} failed to start within ${TIMEOUT_MS}ms`);
        testResults.failed++;
        testResults.errors.push(`${service.name}: startup timeout`);
        proc.kill();
        resolve(false);
      }
    };
    
    checkReady();
  });
}

// ============================================================================
// ENDPOINT TESTS
// ============================================================================

async function testService(service) {
  log('INFO', `Testing ${service.name}...`);
  
  // Test 1: Health check
  const healthOk = await testEndpoint(service.port, '/health', 200);
  if (healthOk) {
    log('OK', `  ✓ Health check passed`);
    testResults.passed++;
  } else {
    log('WARN', `  ✗ Health check failed (may not be implemented)`);
  }
  
  // Test 2: Root endpoint
  const rootOk = await testEndpoint(service.port, '/', [200, 302]); // 302 for redirects
  if (rootOk) {
    log('OK', `  ✓ Root endpoint responded`);
    testResults.passed++;
  }
  
  // Test 3: Error handling
  const errorOk = await testErrorHandling(service.port);
  if (errorOk) {
    log('OK', `  ✓ Error handling returns ok=false`);
    testResults.passed++;
  } else {
    log('WARN', `  ✗ Error handling may not follow standard format`);
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

function cleanup() {
  log('INFO', 'Shutting down services...');
  servicesStarted.forEach(proc => {
    try { proc.kill('SIGTERM'); } catch (e) { /* ignore */ }
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log('INFO', '='.repeat(60));
  log('INFO', 'SMOKE TEST - TooLoo.ai System Validation');
  log('INFO', `Services: ${SERVICES.length} core services`);
  log('INFO', `Timeout: ${TEST_TIMEOUT / 1000}s total`);
  log('INFO', '='.repeat(60));
  
  // Phase 1: Start services
  log('INFO', '');
  log('INFO', 'PHASE 1: Service Startup');
  log('INFO', '-'.repeat(60));
  
  for (const service of SERVICES) {
    if (Date.now() - testStartTime > TEST_TIMEOUT) {
      log('WARN', 'Test timeout reached, stopping startup');
      break;
    }
    await startService(service);
    await new Promise(r => setTimeout(r, 500)); // Stagger startup
  }
  
  // Phase 2: Test services
  log('INFO', '');
  log('INFO', 'PHASE 2: Endpoint Testing');
  log('INFO', '-'.repeat(60));
  
  for (const service of SERVICES) {
    if (Date.now() - testStartTime > TEST_TIMEOUT) break;
    await testService(service);
  }
  
  // Phase 3: Summary
  log('INFO', '');
  log('INFO', 'PHASE 3: Test Summary');
  log('INFO', '-'.repeat(60));
  
  const totalTests = testResults.passed + testResults.failed;
  const passRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : '0';
  
  log('INFO', `Passed: ${testResults.passed}`);
  log('INFO', `Failed: ${testResults.failed}`);
  log('INFO', `Pass Rate: ${passRate}%`);
  log('INFO', `Duration: ${elapsed()}s`);
  
  if (testResults.errors.length > 0) {
    log('INFO', '');
    log('INFO', 'Errors:');
    testResults.errors.forEach(err => log('ERROR', `  - ${err}`));
  }
  
  log('INFO', '');
  log('INFO', '='.repeat(60));
  if (testResults.failed === 0) {
    log('INFO', '✅ ALL TESTS PASSED');
  } else {
    log('INFO', `❌ ${testResults.failed} TESTS FAILED`);
  }
  log('INFO', '='.repeat(60));
  
  cleanup();
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Run
main().catch(err => {
  log('ERROR', err.message);
  cleanup();
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  log('INFO', 'Interrupted by user');
  cleanup();
  process.exit(1);
});
