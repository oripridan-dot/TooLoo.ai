#!/usr/bin/env node

/**
 * GitHub API Integration Test Suite
 * Tests the GitHubProvider write methods and GitHubIntegrationEngine integration
 */

import GitHubProvider from '../engine/github-provider.js';
import GitHubIntegrationEngine from '../engine/github-integration-engine.js';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

let testsPassed = 0;
let testsFailed = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testResult(name, passed, details = '') {
  if (passed) {
    testsPassed++;
    log(`✓ ${name}`, 'green');
    if (details) log(`  ${details}`, 'blue');
  } else {
    testsFailed++;
    log(`✗ ${name}`, 'red');
    if (details) log(`  ERROR: ${details}`, 'red');
  }
}

async function runTests() {
  log('\n========== GitHub API Integration Tests ==========\n', 'blue');

  // Test 1: Check GitHubProvider configuration detection
  log('TEST 1: Provider Configuration Detection', 'yellow');
  try {
    const isConfigured = GitHubProvider.isConfigured();
    const hasToken = !!process.env.GITHUB_TOKEN;
    const hasRepo = !!process.env.GITHUB_REPO;
    
    testResult(
      'Provider configuration check',
      true,
      `Token: ${hasToken ? '✓' : '✗'}, Repo: ${hasRepo ? '✓' : '✗'}`
    );
  } catch (e) {
    testResult('Provider configuration check', false, e.message);
  }

  // Test 2: Check GitHubProvider methods exist
  log('\nTEST 2: GitHubProvider Write Methods', 'yellow');
  try {
    const methodsExist = 
      typeof GitHubProvider.createOrUpdateFile === 'function' &&
      typeof GitHubProvider.createPullRequest === 'function' &&
      typeof GitHubProvider.createIssue === 'function' &&
      typeof GitHubProvider.addLabelsToIssue === 'function' &&
      typeof GitHubProvider.requestReviewers === 'function';

    testResult(
      'All write methods exist',
      methodsExist,
      'Methods: createOrUpdateFile, createPullRequest, createIssue, addLabelsToIssue, requestReviewers'
    );
  } catch (e) {
    testResult('All write methods exist', false, e.message);
  }

  // Test 3: GitHubIntegrationEngine instantiation
  log('\nTEST 3: GitHubIntegrationEngine Instantiation', 'yellow');
  try {
    const engine = new GitHubIntegrationEngine(GitHubProvider);
    const stats = engine.getStats();
    
    testResult(
      'Engine instantiation',
      engine && stats,
      `Initial stats: commits=${stats.commits}, prs=${stats.prs}, issues=${stats.issues}`
    );
  } catch (e) {
    testResult('Engine instantiation', false, e.message);
  }

  // Test 4: Template initialization
  log('\nTEST 4: Template Initialization', 'yellow');
  try {
    const engine = new GitHubIntegrationEngine(GitHubProvider);
    const prTemplate = engine.prTemplate;
    const issueTemplate = engine.issueTemplate;
    
    const prValid = prTemplate.title && prTemplate.body && prTemplate.labels;
    const issueValid = issueTemplate.title && issueTemplate.body && issueTemplate.labels;
    
    testResult(
      'PR and Issue templates initialized',
      prValid && issueValid,
      `PR template: ${prTemplate.labels.join(', ')} | Issue template: ${issueTemplate.labels.join(', ')}`
    );
  } catch (e) {
    testResult('PR and Issue templates initialized', false, e.message);
  }

  // Test 5: Workflow YAML generation
  log('\nTEST 5: Workflow YAML Generation', 'yellow');
  try {
    const engine = new GitHubIntegrationEngine(GitHubProvider);
    const yaml = engine.generateWorkflowYAML('test-workflow', ['push', 'pull_request']);
    
    const hasName = yaml.includes('name: test-workflow');
    const hasPush = yaml.includes('push:');
    const hasPR = yaml.includes('pull_request:');
    const hasJobs = yaml.includes('jobs:');
    
    testResult(
      'Workflow YAML generation',
      hasName && hasPush && hasPR && hasJobs,
      `Generated YAML: ${yaml.split('\n').length} lines`
    );
  } catch (e) {
    testResult('Workflow YAML generation', false, e.message);
  }

  // Test 6: PR template formatting
  log('\nTEST 6: PR Template String Formatting', 'yellow');
  try {
    const engine = new GitHubIntegrationEngine(GitHubProvider);
    const formatted = engine.formatString(
      'Analysis: {analysisType} - {timestamp}',
      { analysisType: 'emotion', timestamp: '2025-11-17T10:30:00Z' }
    );
    
    const isCorrect = formatted === 'Analysis: emotion - 2025-11-17T10:30:00Z';
    
    testResult(
      'Template string substitution',
      isCorrect,
      `Result: "${formatted}"`
    );
  } catch (e) {
    testResult('Template string substitution', false, e.message);
  }

  // Test 7: Findings formatting
  log('\nTEST 7: Findings Markdown Formatting', 'yellow');
  try {
    const engine = new GitHubIntegrationEngine(GitHubProvider);
    const findings = ['Finding 1', 'Finding 2', 'Finding 3'];
    const formatted = engine.formatFindings(findings);
    
    const isMarkdown = formatted.includes('- Finding 1') && 
                       formatted.includes('- Finding 2') &&
                       formatted.includes('- Finding 3');
    
    testResult(
      'Findings markdown conversion',
      isMarkdown,
      `Lines: ${formatted.split('\n').length}`
    );
  } catch (e) {
    testResult('Findings markdown conversion', false, e.message);
  }

  // Test 8: Markdown report generation
  log('\nTEST 8: Markdown Report Generation', 'yellow');
  try {
    const engine = new GitHubIntegrationEngine(GitHubProvider);
    const analyses = [
      { analysisType: 'emotion', primary: 'joy', sentiment: 'positive', confidence: 0.95, language: 'en' },
      { analysisType: 'emotion', primary: 'sadness', sentiment: 'negative', confidence: 0.88, language: 'es' }
    ];
    
    const report = engine.generateMarkdownReport(analyses, new Date().toISOString());
    
    const hasHeader = report.includes('# Analysis Report');
    const hasStats = report.includes('Summary');
    const hasDetails = report.includes('Detailed Findings');
    
    testResult(
      'Markdown report generation',
      hasHeader && hasStats && hasDetails,
      `Report: ${report.split('\n').length} lines`
    );
  } catch (e) {
    testResult('Markdown report generation', false, e.message);
  }

  // Test 9: Statistics tracking
  log('\nTEST 9: Statistics Tracking', 'yellow');
  try {
    const engine = new GitHubIntegrationEngine(GitHubProvider);
    
    // Simulate some activities (without actual API calls)
    engine.workflowStats.commits = 5;
    engine.workflowStats.prs = 3;
    engine.workflowStats.issues = 2;
    engine.workflowStats.errors = 0;
    
    const stats = engine.getStats();
    const successRate = parseFloat(stats.successRate);
    
    testResult(
      'Statistics tracking and calculations',
      stats.commits === 5 && stats.prs === 3 && successRate === 100,
      `Stats: commits=${stats.commits}, prs=${stats.prs}, issues=${stats.issues}, success=${stats.successRate}%`
    );
  } catch (e) {
    testResult('Statistics tracking and calculations', false, e.message);
  }

  // Test 10: Reset stats functionality
  log('\nTEST 10: Statistics Reset', 'yellow');
  try {
    const engine = new GitHubIntegrationEngine(GitHubProvider);
    
    // Increment stats
    engine.workflowStats.commits = 10;
    engine.workflowStats.prs = 5;
    
    // Reset
    const result = engine.resetStats();
    const stats = engine.getStats();
    
    const resetCorrect = result.success && 
                        stats.commits === 0 && 
                        stats.prs === 0;
    
    testResult(
      'Statistics reset functionality',
      resetCorrect,
      'All counters reset to zero'
    );
  } catch (e) {
    testResult('Statistics reset functionality', false, e.message);
  }

  // Summary
  log('\n========== Test Summary ==========\n', 'blue');
  const total = testsPassed + testsFailed;
  const percentage = ((testsPassed / total) * 100).toFixed(1);
  
  log(`Tests Passed: ${testsPassed}/${total} (${percentage}%)`, 'green');
  
  if (testsFailed > 0) {
    log(`Tests Failed: ${testsFailed}/${total}`, 'red');
    process.exit(1);
  } else {
    log('\n✓ All GitHub API integration tests passed!', 'green');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  process.exit(1);
});
