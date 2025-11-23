#!/usr/bin/env node

/**
 * Phase 4.3: GitHub API Endpoints Validation
 * Tests real GitHub integration endpoints
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const BASE_URL = 'http://127.0.0.1:3000/api/v1/github';
let testsPassed = 0;
let testsFailed = 0;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testResult(name, passed, details = '') {
  if (passed) {
    testsPassed++;
    log(`✅ ${name}`, 'green');
    if (details) log(`   ${details}`, 'cyan');
  } else {
    testsFailed++;
    log(`❌ ${name}`, 'red');
    if (details) log(`   ERROR: ${details}`, 'red');
  }
}

async function makeRequest(method, endpoint, body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const json = await response.json();
    
    // Handle wrapped responses (TooLoo standard format)
    const data = json.content || json;
    
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function runTests() {
  log('\n╔══════════════════════════════════════════════════════════════╗', 'blue');
  log('║  GitHub API Integration Test (Real Endpoints)                 ║', 'blue');
  log('╚══════════════════════════════════════════════════════════════╝\n', 'blue');
  
  // Wait for server to be ready
  log('⏳ Waiting for server to be ready...', 'yellow');
  
  let serverReady = false;
  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) {
        serverReady = true;
        log('✅ Server is ready!\n', 'green');
        break;
      }
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  
  if (!serverReady) {
    log('❌ Server did not respond. Make sure it\'s running on port 3000', 'red');
    process.exit(1);
  }
  
  // TEST 1: Health Check
  log('TEST 1: GET /api/v1/github/health', 'yellow');
  const healthResult = await makeRequest('GET', '/health');
  
  if (healthResult.ok && healthResult.data.ok) {
    testResult(
      'GitHub API health check',
      true,
      `Configured: ${healthResult.data.configured} | Repo: ${healthResult.data.repo}`
    );
    
    if (!healthResult.data.configured) {
      log('⚠️  GitHub not configured in .env. Skipping write tests.', 'yellow');
      process.exit(0);
    }
  } else {
    testResult(
      'GitHub API health check',
      false,
      healthResult.data?.error || 'Request failed'
    );
    process.exit(1);
  }

  const timestamp = Date.now();
  const branchName = `test-integration-${timestamp}`;
  
  // TEST 2: Create Branch
  log(`\nTEST 2: POST /api/v1/github/create-branch (${branchName})`, 'yellow');
  const branchResult = await makeRequest('POST', '/create-branch', {
    name: branchName,
    from: 'main'
  });
  
  if (branchResult.ok && branchResult.data.success) {
    testResult(
      'Branch creation',
      true,
      `Branch: ${branchResult.data.branch.name} | URL: ${branchResult.data.branch.url}`
    );
  } else {
    testResult(
      'Branch creation',
      false,
      branchResult.data?.error || 'Request failed'
    );
    // If branch creation fails, we can't proceed with file update on that branch
    // But we can try to continue with other tests
  }
  
  // TEST 3: Update File
  log('\nTEST 3: POST /api/v1/github/update-file', 'yellow');
  const fileResult = await makeRequest('POST', '/update-file', {
    path: `test-artifacts/test-${timestamp}.txt`,
    content: `This is a test file created by TooLoo.ai integration test at ${new Date().toISOString()}`,
    message: `test: verify github integration ${timestamp}`,
    branch: branchName
  });
  
  if (fileResult.ok && fileResult.data.success) {
    testResult(
      'File creation',
      true,
      `File: ${fileResult.data.file.path} | Commit: ${fileResult.data.commit.sha.substring(0, 7)}`
    );
  } else {
    testResult(
      'File creation',
      false,
      fileResult.data?.error || 'Request failed'
    );
  }
  
  // TEST 4: Create PR
  log('\nTEST 4: POST /api/v1/github/create-pr', 'yellow');
  const prResult = await makeRequest('POST', '/create-pr', {
    title: `Integration Test PR ${timestamp}`,
    body: `Automated test PR created by TooLoo.ai integration test.\n\nTimestamp: ${timestamp}`,
    head: branchName,
    base: 'main',
    draft: true
  });
  
  if (prResult.ok && prResult.data.success) {
    testResult(
      'Pull request creation',
      true,
      `PR #${prResult.data.number} | URL: ${prResult.data.html_url}`
    );
  } else {
    testResult(
      'Pull request creation',
      false,
      prResult.data?.error || 'Request failed'
    );
  }
  
  // TEST 5: Create Issue
  log('\nTEST 5: POST /api/v1/github/create-issue', 'yellow');
  const issueResult = await makeRequest('POST', '/create-issue', {
    title: `Integration Test Issue ${timestamp}`,
    body: `Automated test issue created by TooLoo.ai integration test.\n\nTimestamp: ${timestamp}`,
    labels: ['test', 'automated']
  });
  
  if (issueResult.ok && issueResult.data.success) {
    testResult(
      'Issue creation',
      true,
      `Issue #${issueResult.data.number} | URL: ${issueResult.data.html_url}`
    );
  } else {
    testResult(
      'Issue creation',
      false,
      issueResult.data?.error || 'Request failed'
    );
  }
  
  // Summary
  log('\n╔══════════════════════════════════════════════════════════════╗', 'blue');
  log('║  TEST SUMMARY                                                 ║', 'blue');
  log('╚══════════════════════════════════════════════════════════════╝\n', 'blue');
  
  const total = testsPassed + testsFailed;
  
  if (testsFailed === 0) {
    log(`✅ All Tests Passed: ${testsPassed}/${total}`, 'green');
    log('\n🎉 GitHub Integration: FULLY OPERATIONAL', 'green');
  } else {
    log(`⚠️  Tests Failed: ${testsFailed}/${total}`, 'red');
    log(`✅ Tests Passed: ${testsPassed}/${total}`, 'green');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
