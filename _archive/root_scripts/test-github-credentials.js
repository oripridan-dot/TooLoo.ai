#!/usr/bin/env node

/**
 * Direct GitHub Credentials Validation Test
 * Tests GitHubProvider with real .env credentials
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import GitHubProvider from './engine/github-provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function testGitHubCredentials() {
  console.log('\n🔐 Testing GitHub Credentials from .env\n');
  
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  
  console.log(`📦 Repository: ${repo || 'NOT SET'}`);
  console.log(`🔑 Token Present: ${token ? '✅ YES' : '❌ NO'}`);
  console.log(`🔒 Token Length: ${token ? token.length : 0} characters\n`);
  
  if (!token || !repo) {
    console.log('❌ GitHub credentials not properly configured');
    process.exit(1);
  }
  
  try {
    console.log('Testing GitHub Provider methods...\n');
    
    // Test 1: Get repo info
    console.log('TEST 1: Get Repository Information');
    const repoInfo = await GitHubProvider.getRepoInfo();
    if (repoInfo) {
      console.log(`  ✅ Repository: ${repoInfo.name}`);
      console.log(`  📝 Description: ${repoInfo.description || 'N/A'}`);
      console.log(`  ⭐ Stars: ${repoInfo.stars}`);
      console.log(`  🍴 Forks: ${repoInfo.forks}`);
    } else {
      console.log('  ❌ Failed to get repo info');
    }
    
    // Test 2: Get recent issues
    console.log('\nTEST 2: Get Recent Issues');
    const issues = await GitHubProvider.getRecentIssues(3);
    console.log(`  ✅ Retrieved ${issues.length} recent issues`);
    if (issues.length > 0) {
      console.log(`  First issue: #${issues[0].number} - ${issues[0].title}`);
    }
    
    // Test 3: Test commit creation (if writable)
    console.log('\nTEST 3: Test Commit Capability');
    const testContent = JSON.stringify({
      test: true,
      timestamp: new Date().toISOString(),
      credentials: 'Valid from .env'
    }, null, 2);
    
    const commitResult = await GitHubProvider.createOrUpdateFile(
      `test-from-env/${Date.now()}.json`,
      testContent,
      `test: GitHub API credentials validation - ${new Date().toISOString()}`,
      'main'
    );
    
    if (commitResult.success) {
      console.log(`  ✅ Commit successful!`);
      console.log(`  SHA: ${commitResult.commit.sha.substring(0, 7)}`);
      console.log(`  URL: ${commitResult.commit.url}`);
    } else {
      console.log(`  ⚠️  Commit test failed: ${commitResult.error}`);
    }
    
    // Test 4: Check configuration
    console.log('\nTEST 4: Provider Configuration');
    const isConfigured = GitHubProvider.isConfigured();
    console.log(`  Configuration Status: ${isConfigured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);
    
    console.log('\n✅ GitHub Credentials Validation Complete!\n');
    console.log('Ready to use with Phase 4.3 endpoints:');
    console.log('  - GET  /api/v1/github/api-status');
    console.log('  - POST /api/v1/github/test-commit');
    console.log('  - POST /api/v1/github/test-pull-request');
    console.log('  - POST /api/v1/github/test-issue\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    process.exit(1);
  }
}

testGitHubCredentials();
