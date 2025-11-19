#!/usr/bin/env node

/**
 * WORKBENCH ENDPOINT VALIDATION TEST
 * ==================================
 * 
 * Tests all 4 new Workbench endpoints to verify:
 * - Endpoint routing is working
 * - Request/response format is correct
 * - Intent analysis produces valid output
 * - Work tracking is functional
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:3000';
const TIMEOUT = 5000;

const TESTS = [
  {
    name: 'Analyze Intent - Simple Analysis',
    method: 'POST',
    endpoint: '/api/v1/work/analyze-intent',
    payload: { goal: 'analyze the current system state' },
    validateResponse: (data) => {
      return data.ok && data.analysis && data.analysis.intent === 'analysis';
    }
  },
  {
    name: 'Analyze Intent - Improvement Goal',
    method: 'POST',
    endpoint: '/api/v1/work/analyze-intent',
    payload: { goal: 'improve system performance and reduce latency' },
    validateResponse: (data) => {
      return data.ok && data.analysis && data.analysis.intent === 'improvement';
    }
  },
  {
    name: 'Analyze Intent - Creation Task',
    method: 'POST',
    endpoint: '/api/v1/work/analyze-intent',
    payload: { goal: 'create documentation for the API endpoints' },
    validateResponse: (data) => {
      return data.ok && data.analysis && data.analysis.intent === 'creation';
    }
  },
  {
    name: 'Work Status - Empty (No Active Work)',
    method: 'GET',
    endpoint: '/api/v1/work/status',
    payload: null,
    validateResponse: (data) => {
      return data.ok && ('currentWork' in data);
    }
  },
  {
    name: 'Work History - Retrieve History',
    method: 'GET',
    endpoint: '/api/v1/work/history?limit=10',
    payload: null,
    validateResponse: (data) => {
      return data.ok && Array.isArray(data.history);
    }
  },
  {
    name: 'Missing Goal Error - Should Fail',
    method: 'POST',
    endpoint: '/api/v1/work/analyze-intent',
    payload: {},
    expectError: true,
    validateResponse: (data) => {
      return !data.ok && data.error && data.error.includes('goal');
    }
  }
];

async function runTest(test) {
  try {
    const options = {
      method: test.method,
      timeout: TIMEOUT,
      headers: { 'Content-Type': 'application/json' }
    };

    if (test.method === 'POST' && test.payload) {
      options.body = JSON.stringify(test.payload);
    }

    const response = await fetch(BASE_URL + test.endpoint, options);
    const data = await response.json();

    const passed = test.validateResponse(data);
    const status = passed ? '✅' : '❌';

    console.log(`${status} ${test.name}`);
    if (!passed) {
      console.log(`   Response: ${JSON.stringify(data).substring(0, 100)}...`);
    }

    return passed;

  } catch (error) {
    console.error(`❌ ${test.name} - ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     WORKBENCH ENDPOINT VALIDATION TEST SUITE      ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  // Wait for server to be ready
  console.log('⏳ Waiting for server to be ready...');
  for (let i = 0; i < 10; i++) {
    try {
      await fetch(`${BASE_URL}/api/v1/work/status`, { timeout: 1000 });
      console.log('✅ Server is ready\n');
      break;
    } catch (e) {
      if (i === 9) {
        console.error('❌ Server did not respond in time. Make sure to run: npm run dev');
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }

  for (const test of TESTS) {
    const result = await runTest(test);
    if (result) passed++;
    else failed++;
  }

  console.log(`\n╔════════════════════════════════════════════════════╗`);
  console.log(`║ RESULTS: ${passed} passed, ${failed} failed                  ║`);
  console.log(`╚════════════════════════════════════════════════════╝\n`);

  return failed === 0;
}

// Run tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
});
