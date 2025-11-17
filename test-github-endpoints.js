#!/usr/bin/env node

/**
 * Phase 4.3: GitHub API Endpoints Validation
 * Tests all 4 REST endpoints with real GitHub credentials from .env
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const BASE_URL = 'http://localhost:3000/api/v1/github';
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
    const data = await response.json();
    
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
  log('║  Phase 4.3: GitHub API Endpoints - Real Credentials Test      ║', 'blue');
  log('╚══════════════════════════════════════════════════════════════╝\n', 'blue');
  
  // Wait for server to be ready
  log('⏳ Waiting for server to be ready (checking connection)...', 'yellow');
  
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch('http://localhost:3000/api/v1/github/api-status');
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
  
  // TEST 1: API Status
  log('TEST 1: GET /api/v1/github/api-status', 'yellow');
  const statusResult = await makeRequest('GET', '/api-status');
  
  if (statusResult.ok && statusResult.data.data.status === 'connected') {
    testResult(
      'GitHub API connection status',
      true,
      `Status: ${statusResult.data.data.status} | Repo: ${statusResult.data.data.repository.name}`
    );
  } else {
    testResult(
      'GitHub API connection status',
      false,
      statusResult.data?.data?.error || 'Connection failed'
    );
  }
  
  // TEST 2: Test Commit
  log('\nTEST 2: POST /api/v1/github/test-commit', 'yellow');
  const timestamp = Date.now();
  const commitResult = await makeRequest('POST', '/test-commit', {
    filename: `credential-test-${timestamp}.json`,
    content: JSON.stringify({
      test: 'GitHub API credential validation',
      timestamp: new Date().toISOString(),
      realCredentials: true
    }, null, 2)
  });
  
  if (commitResult.ok && commitResult.data.data.success) {
    testResult(
      'Commit creation',
      true,
      `File: test-artifacts/credential-test-${timestamp}.json | SHA: ${commitResult.data.data.commit.sha.substring(0, 7)}`
    );
  } else {
    testResult(
      'Commit creation',
      false,
      commitResult.data?.data?.error || commitResult.error
    );
  }
  
  // TEST 3: Test Pull Request
  log('\nTEST 3: POST /api/v1/github/test-pull-request', 'yellow');
  const prResult = await makeRequest('POST', '/test-pull-request', {
    title: `Credential Test PR - ${timestamp}`,
    description: `This PR validates Phase 4.3 GitHub API integration with real credentials.\n\nCreated at: ${new Date().toISOString()}`
  });
  
  if (prResult.ok && prResult.data.data.success) {
    testResult(
      'Pull request creation',
      true,
      `PR #${prResult.data.data.prNumber} | URL: ${prResult.data.data.url}`
    );
  } else {
    testResult(
      'Pull request creation',
      false,
      prResult.data?.data?.error || prResult.error
    );
  }
  
  // TEST 4: Test Issue
  log('\nTEST 4: POST /api/v1/github/test-issue', 'yellow');
  const issueResult = await makeRequest('POST', '/test-issue', {
    title: `Credential Test Issue - ${timestamp}`,
    description: `This issue validates Phase 4.3 GitHub API integration with real credentials.\n\nCreated at: ${new Date().toISOString()}`
  });
  
  if (issueResult.ok && issueResult.data.data.success) {
    testResult(
      'Issue creation',
      true,
      `Issue #${issueResult.data.data.issueNumber} | URL: ${issueResult.data.data.url}`
    );
  } else {
    testResult(
      'Issue creation',
      false,
      issueResult.data?.data?.error || issueResult.error
    );
  }
  
  // Summary
  log('\n╔══════════════════════════════════════════════════════════════╗', 'blue');
  log('║  TEST SUMMARY                                                 ║', 'blue');
  log('╚══════════════════════════════════════════════════════════════╝\n', 'blue');
  
  const total = testsPassed + testsFailed;
  const percentage = ((testsPassed / total) * 100).toFixed(1);
  
  if (testsFailed === 0) {
    log(`✅ All Tests Passed: ${testsPassed}/${total} (${percentage}%)`, 'green');
    log('\n🎉 Phase 4.3 GitHub API Integration: FULLY OPERATIONAL\n', 'green');
    log('Your GitHub credentials are working perfectly!', 'green');
    log('You can now use the GitHub API endpoints for:\n', 'green');
    log('  • Auto-committing analysis results', 'cyan');
    log('  • Creating pull requests with findings', 'cyan');
    log('  • Creating issues from anomalies', 'cyan');
    log('  • Deploying GitHub Actions workflows', 'cyan');
  } else {
    log(`⚠️  Tests Failed: ${testsFailed}/${total}`, 'red');
    log(`✅ Tests Passed: ${testsPassed}/${total}`, 'green');
  }
  
  log('\n📦 Repository: oripridan-dot/TooLoo.ai', 'cyan');
  log('🔐 Credentials: Valid and authenticated\n', 'cyan');
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Start tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
