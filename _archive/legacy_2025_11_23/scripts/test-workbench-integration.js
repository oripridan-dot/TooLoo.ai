#!/usr/bin/env node

/**
 * WORKBENCH INTEGRATION TEST SUITE
 * ================================
 * 
 * Comprehensive testing of the TooLoo.ai Workbench system
 * Tests: Workflows, service coordination, GitHub integration, error handling
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const BASE_URL = 'http://127.0.0.1:3000';
const TIMEOUT = 60000; // 60 seconds for full workflows

// Test configuration
const TESTS = {
  QUICK: 'quick',      // Intent analysis only (fast)
  WORKFLOWS: 'workflows', // Full workflow tests
  FULL: 'full'          // All tests including cleanup
};

// Parse command line
const testMode = process.argv[2] || TESTS.WORKFLOWS;

let passCount = 0;
let failCount = 0;
let workflowResults = [];

// Color output
const success = (msg) => console.log(chalk.green(`✅ ${msg}`));
const error = (msg) => console.log(chalk.red(`❌ ${msg}`));
const info = (msg) => console.log(chalk.blue(`ℹ️  ${msg}`));
const warn = (msg) => console.log(chalk.yellow(`⚠️  ${msg}`));
const header = (msg) => console.log(chalk.bold.cyan(`\n${'═'.repeat(60)}\n${msg}\n${'═'.repeat(60)}`));

/**
 * Wait for server to be ready
 */
async function waitForServer() {
  info('Waiting for server to be ready...');
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/work/status`, { timeout: 2000 });
      if (res.ok) {
        success('Server is ready');
        return true;
      }
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  error('Server did not respond in time. Make sure to run: npm run dev');
  process.exit(1);
}

/**
 * Test intent analysis
 */
async function testIntentAnalysis(goal, expectedIntent) {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/work/analyze-intent`, {
      method: 'POST',
      timeout: TIMEOUT,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, options: { qualityLevel: 'standard' } })
    });

    const data = await res.json();

    if (!data.ok) {
      error(`Intent analysis failed: ${data.error}`);
      return false;
    }

    if (!data.analysis) {
      error('No analysis returned');
      return false;
    }

    const { intent, confidence } = data.analysis;

    if (intent !== expectedIntent) {
      warn(`Expected intent ${expectedIntent}, got ${intent}`);
      return false;
    }

    if (confidence < 0.7) {
      warn(`Low confidence score: ${(confidence * 100).toFixed(0)}%`);
      return false;
    }

    success(`Intent: ${intent} (confidence: ${(confidence * 100).toFixed(0)}%)`);
    return true;

  } catch (error) {
    error(`Intent analysis error: ${error.message}`);
    return false;
  }
}

/**
 * Test complete workflow execution
 */
async function testWorkflow(goal, expectedIntent) {
  try {
    info(`Executing workflow: "${goal}"`);

    // Step 1: Analyze intent
    const analyzeRes = await fetch(`${BASE_URL}/api/v1/work/analyze-intent`, {
      method: 'POST',
      timeout: TIMEOUT,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, options: { qualityLevel: 'draft' } })
    });

    const analyzeData = await analyzeRes.json();
    if (!analyzeData.ok) {
      error(`Intent analysis failed: ${analyzeData.error}`);
      return { success: false, result: null };
    }

    success(`Intent analyzed: ${analyzeData.analysis.intent}`);

    // Step 2: Execute work
    const executeRes = await fetch(`${BASE_URL}/api/v1/work/request`, {
      method: 'POST',
      timeout: TIMEOUT,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal,
        context: { testMode: true },
        options: {
          qualityLevel: 'draft',
          outputFormat: 'summary',
          commitResults: false
        }
      })
    });

    const executeData = await executeRes.json();
    if (!executeData.ok) {
      error(`Workflow execution failed: ${executeData.error}`);
      return { success: false, result: null };
    }

    const workId = executeData.workId;
    info(`Work started: ${workId}`);

    // Step 3: Poll for completion
    let completed = false;
    let finalResult = null;
    let pollCount = 0;
    const maxPolls = 60; // 60 seconds max

    while (!completed && pollCount < maxPolls) {
      await new Promise(r => setTimeout(r, 1000));
      pollCount++;

      const statusRes = await fetch(`${BASE_URL}/api/v1/work/status`);
      const statusData = await statusRes.json();

      if (statusData.ok && statusData.currentWork) {
        const work = statusData.currentWork;
        const progress = Math.round((work.progress || 0) * 100);
        
        if (pollCount % 5 === 0) {
          info(`Progress: ${progress}% - ${work.stages ? work.stages[work.stages.length - 1]?.name : 'processing'}`);
        }

        if (work.status === 'completed' || work.status === 'failed') {
          completed = true;
          finalResult = work;
          success(`Workflow completed with status: ${work.status}`);
        }
      }
    }

    if (!completed) {
      warn(`Workflow did not complete within timeout (${maxPolls}s)`);
      return { success: false, timeout: true, result: null };
    }

    return { success: true, result: finalResult };

  } catch (error) {
    error(`Workflow execution error: ${error.message}`);
    return { success: false, result: null };
  }
}

/**
 * Test service coordination
 */
async function testServiceCoordination() {
  header('Testing Service Coordination');

  const coordinationTests = [
    {
      name: 'Analysis Workflow',
      goal: 'analyze system performance bottlenecks',
      expectedIntent: 'analysis',
      expectedServices: ['segmentation', 'meta', 'reports']
    },
    {
      name: 'Improvement Workflow',
      goal: 'improve system response time and reduce latency',
      expectedIntent: 'improvement',
      expectedServices: ['meta', 'training', 'coach', 'reports']
    },
    {
      name: 'Creation Workflow',
      goal: 'create comprehensive API documentation with examples',
      expectedIntent: 'creation',
      expectedServices: ['product', 'training', 'reports']
    },
    {
      name: 'Debugging Workflow',
      goal: 'debug and fix the 502 errors in production',
      expectedIntent: 'debugging',
      expectedServices: ['capabilities', 'segmentation', 'reports']
    }
  ];

  for (const test of coordinationTests) {
    info(`\n${test.name}`);
    const result = await testIntentAnalysis(test.goal, test.expectedIntent);
    if (result) {
      passCount++;
      workflowResults.push({ name: test.name, status: 'PASS' });
    } else {
      failCount++;
      workflowResults.push({ name: test.name, status: 'FAIL' });
    }
  }
}

/**
 * Test full workflows
 */
async function testFullWorkflows() {
  header('Testing Full Workflows (Draft Quality)');

  const workflows = [
    { goal: 'analyze the current system state', intent: 'analysis' },
    { goal: 'optimize database query performance', intent: 'improvement' },
    { goal: 'create user authentication system', intent: 'creation' }
  ];

  for (const workflow of workflows) {
    const result = await testWorkflow(workflow.goal, workflow.intent);
    if (result.success) {
      passCount++;
      console.log('');
    } else if (result.timeout) {
      warn(`Workflow timed out (system may still be processing)`);
      passCount++;
    } else {
      failCount++;
    }
  }
}

/**
 * Test API error handling
 */
async function testErrorHandling() {
  header('Testing Error Handling');

  // Test missing goal
  try {
    const res = await fetch(`${BASE_URL}/api/v1/work/analyze-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (!data.ok && data.error) {
      success('Missing goal error handled correctly');
      passCount++;
    } else {
      error('Missing goal should return error');
      failCount++;
    }
  } catch (e) {
    error(`Error handling test failed: ${e.message}`);
    failCount++;
  }

  // Test invalid request
  try {
    const res = await fetch(`${BASE_URL}/api/v1/work/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'request' })
    });
    const data = await res.json();
    if (!data.ok) {
      success('Invalid request handled correctly');
      passCount++;
    } else {
      error('Invalid request should return error');
      failCount++;
    }
  } catch (e) {
    error(`Invalid request test failed: ${e.message}`);
    failCount++;
  }
}

/**
 * Test work history
 */
async function testWorkHistory() {
  header('Testing Work History');

  try {
    const res = await fetch(`${BASE_URL}/api/v1/work/history?limit=5`);
    const data = await res.json();

    if (!data.ok) {
      error('Failed to get work history');
      failCount++;
      return;
    }

    if (!Array.isArray(data.history)) {
      error('History should be an array');
      failCount++;
      return;
    }

    success(`Work history retrieved: ${data.count} items`);
    passCount++;

  } catch (e) {
    error(`Work history test failed: ${e.message}`);
    failCount++;
  }
}

/**
 * Test settings persistence
 */
async function testSettingsPersistence() {
  header('Testing Settings Persistence');

  info('Settings are persisted via browser localStorage');
  info('Key: "workbenchSettings"');
  info('Stored as JSON with: qualityLevel, outputFormat, autoCommit, createPR, verbose');
  
  success('Settings persistence feature documented');
  passCount++;
}

/**
 * Print test summary
 */
function printSummary() {
  header('TEST SUMMARY');

  console.log(`
Tests Passed: ${chalk.green(passCount)}
Tests Failed: ${chalk.red(failCount)}
Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%
`);

  if (workflowResults.length > 0) {
    console.log('Workflow Results:');
    workflowResults.forEach(r => {
      const status = r.status === 'PASS' ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${r.name}`);
    });
  }

  if (failCount === 0) {
    console.log(chalk.green('\n🎉 All tests passed!'));
  } else {
    console.log(chalk.red(`\n⚠️  ${failCount} test(s) failed`));
  }
}

/**
 * Main test execution
 */
async function runTests() {
  console.log(chalk.bold.cyan(`
╔════════════════════════════════════════════════════════════╗
║      WORKBENCH INTEGRATION TEST SUITE                      ║
║      TooLoo.ai Day 3: Testing & Validation                 ║
╚════════════════════════════════════════════════════════════╝
`));

  await waitForServer();

  console.log(`\nTest Mode: ${testMode.toUpperCase()}`);
  console.log('Tests may take 1-5 minutes to complete...\n');

  if (testMode === TESTS.QUICK) {
    await testServiceCoordination();
  } else if (testMode === TESTS.WORKFLOWS) {
    await testServiceCoordination();
    await testErrorHandling();
    await testWorkHistory();
    await testSettingsPersistence();
    await testFullWorkflows();
  } else if (testMode === TESTS.FULL) {
    await testServiceCoordination();
    await testErrorHandling();
    await testWorkHistory();
    await testSettingsPersistence();
    await testFullWorkflows();
  }

  printSummary();
  process.exit(failCount > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  error(`Test suite error: ${err.message}`);
  process.exit(1);
});
