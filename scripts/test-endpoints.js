#!/usr/bin/env node
/**
 * TooLoo.ai Endpoint Response Test
 * Tests all critical endpoints for responsiveness (max 5s per endpoint)
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:3000';
const TIMEOUT_MS = 5000;

// Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const results = {
  passed: 0,
  failed: 0,
  slow: 0,
  tests: []
};

// Test a single endpoint
async function testEndpoint(method, path, name, description) {
  const startTime = Date.now();
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
  );

  try {
    let url = `${BASE_URL}${path}`;
    
    const requestPromise = fetch(url, {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: TIMEOUT_MS
    });

    const response = await Promise.race([requestPromise, timeout]);
    const elapsed = Date.now() - startTime;
    
    // Check if response is OK (200-299)
    const isSuccess = response.status >= 200 && response.status < 300;
    const isSlow = elapsed > 2000;

    const status = isSuccess ? (isSlow ? '⏱️ SLOW' : '✅ OK') : '⚠️ ERROR';
    const color = isSuccess ? (isSlow ? YELLOW : GREEN) : RED;

    console.log(`${color}${status}${RESET} [${elapsed}ms] ${method.padEnd(4)} ${path.padEnd(40)} ${description}`);

    results.tests.push({
      method,
      path,
      status: response.status,
      elapsed,
      success: isSuccess,
      slow: isSlow
    });

    if (isSuccess) {
      if (isSlow) results.slow++;
      else results.passed++;
    } else {
      results.failed++;
    }
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.log(`${RED}✗ FAIL${RESET} [${elapsed}ms] ${method.padEnd(4)} ${path.padEnd(40)} ${description} - ${err.message}`);
    
    results.tests.push({
      method,
      path,
      elapsed,
      success: false,
      error: err.message
    });
    results.failed++;
  }
}

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('   TooLoo.ai Endpoint Response Tests');
  console.log('═'.repeat(80) + '\n');

  // Critical UI/Navigation endpoints
  console.log(`${CYAN}📄 UI & Navigation Endpoints:${RESET}`);
  await testEndpoint('GET', '/', 'Home', 'Main hub');
  await testEndpoint('GET', '/health', 'Health', 'System health check');
  await testEndpoint('GET', '/control-room', 'Control Room', 'Admin control panel');
  await testEndpoint('GET', '/tooloo-chat', 'Chat', 'Chat interface');
  await testEndpoint('GET', '/providers-arena-v2', 'Arena', 'Provider comparison');
  console.log('');

  // API endpoints
  console.log(`${CYAN}🔌 API Endpoints:${RESET}`);
  await testEndpoint('GET', '/api/v1/system/routes', 'Routes', 'Available routes');
  await testEndpoint('GET', '/system/status', 'Status', 'System status');
  await testEndpoint('GET', '/api/v1/training/overview', 'Training', 'Training status');
  await testEndpoint('GET', '/api/v1/meta-learning/status', 'Meta', 'Meta-learning status');
  await testEndpoint('GET', '/api/v1/providers/status', 'Providers', 'Provider status');
  console.log('');

  // Service health checks
  console.log(`${CYAN}🏥 Service Health (Direct):${RESET}`);
  const ports = {
    '3001': 'Training',
    '3002': 'Meta',
    '3003': 'Budget',
    '3004': 'Coach'
  };

  for (const [port, name] of Object.entries(ports)) {
    const startTime = Date.now();
    try {
      const response = await Promise.race([
        fetch(`http://127.0.0.1:${port}/health`, { timeout: TIMEOUT_MS }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS))
      ]);
      const elapsed = Date.now() - startTime;
      const status = response.ok ? '✅ OK' : '⚠️  ERROR';
      console.log(`${GREEN}${status}${RESET} [${elapsed}ms] PORT ${port.padEnd(4)} ${name}`);
    } catch (err) {
      const elapsed = Date.now() - startTime;
      console.log(`${RED}✗ FAIL${RESET} [${elapsed}ms] PORT ${port.padEnd(4)} ${name} - ${err.message}`);
    }
  }
  console.log('');

  // Results summary
  console.log('═'.repeat(80));
  console.log('📊 Results Summary:');
  console.log(`   ✅ Passed:  ${results.passed}`);
  console.log(`   ⏱️  Slow:    ${results.slow}`);
  console.log(`   ❌ Failed:  ${results.failed}`);
  
  const total = results.passed + results.slow + results.failed;
  const passRate = ((results.passed + results.slow) / total * 100).toFixed(1);
  console.log(`   📈 Pass Rate: ${passRate}%`);
  console.log('═'.repeat(80));
  console.log('');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(console.error);
