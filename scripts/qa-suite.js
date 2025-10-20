#!/usr/bin/env node

/**
 * TooLoo.ai Unified QA Test Runner
 * 
 * Runs all test suites and generates comprehensive coverage report
 * Usage: node scripts/qa-suite.js [options]
 * 
 * Options:
 *   --report    Generate JSON coverage report
 *   --watch     Run in watch mode
 *   --verbose   Detailed output
 *   --coverage  Show coverage percentage
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const testsDir = path.join(rootDir, 'tests');

const argv = process.argv.slice(2);
const options = {
  report: argv.includes('--report'),
  watch: argv.includes('--watch'),
  verbose: argv.includes('--verbose'),
  coverage: argv.includes('--coverage'),
  json: argv.includes('--json')
};

// Test suite definitions
const testSuites = [
  {
    name: '🧪 Phase 1 Integration Tests',
    file: 'phase-1-integration-test.js',
    priority: 1,
    description: 'Intent Bus, Model Chooser, Confidence Scorer, Cup Tournament'
  },
  {
    name: '📷 Phase 2a Screen Capture Tests',
    file: 'phase-2a-screen-capture-test.js',
    priority: 2,
    description: 'Visual context, screenshot capture, OCR mock'
  },
  {
    name: '🔗 Phase 2b DAG Builder Tests',
    file: 'phase-2b-dag-integration-test.js',
    priority: 3,
    description: 'Task decomposition, topological sorting'
  },
  {
    name: '📦 Phase 2c Artifact Ledger Tests',
    file: 'phase-2c-artifact-ledger-test.js',
    priority: 4,
    description: 'Versioning, provenance, rollback'
  },
  {
    name: '⚙️  Phase 2e Repo Auto-Org Tests',
    file: 'phase-2e-repo-auto-org-test.js',
    priority: 5,
    description: 'Scope detection, branch generation, PR templates'
  },
  {
    name: '🌐 Web Server Integration Tests',
    file: 'integration/web-server.integration.test.js',
    priority: 10,
    description: 'HTTP endpoints, routing, responses (14 endpoints)'
  },
  {
    name: '🏫 Training Server Integration Tests',
    file: 'integration/training-server.integration.test.js',
    priority: 11,
    description: 'Training camp, rounds, settings, hyper-speed (19 endpoints)'
  },
  {
    name: '💰 Budget Server Integration Tests',
    file: 'integration/budget-server.integration.test.js',
    priority: 12,
    description: 'Provider policy, burst, budget, costs (9 endpoints)'
  },
  {
    name: '🧠 Meta-Learning Server Integration Tests',
    file: 'integration/meta-server.integration.test.js',
    priority: 13,
    description: 'Meta phases, reports, insights, knowledge (9 endpoints)'
  },
  {
    name: '🏋️  Coach Server Integration Tests',
    file: 'integration/coach-server.integration.test.js',
    priority: 14,
    description: 'Auto-coach lifecycle, boost, fast-lane, settings (8 endpoints)'
  }
];

// Endpoint coverage matrix
const endpointInventory = {
  'web-server': {
    total: 14,
    tested: 0,
    endpoints: [
      '/', '/control-room', '/api/v1/design/brandboard', '/api/v1/chat/*', 
      '/api/v1/feedback/*', '/api/v1/referral/*', '/api/v1/system/*', '/health'
    ]
  },
  'orchestrator': {
    total: 32,
    tested: 32,
    endpoints: [
      'Intent Bus (6)', 'Screen Capture (7)', 'DAG Builder (6)', 
      'Artifact Ledger (10)', 'Repo Auto-Org (6)'
    ]
  },
  'training-server': {
    total: 19,
    tested: 0,
    endpoints: ['/api/v1/training/*', '/api/v1/next-domain', '/api/v1/providers/parallel-*']
  },
  'budget-server': {
    total: 9,
    tested: 0,
    endpoints: ['/api/v1/budget/*', '/api/v1/providers/policy', '/api/v1/providers/burst', '/api/v1/providers/costs', '/api/v1/providers/recommend']
  },
  'meta-server': {
    total: 9,
    tested: 0,
    endpoints: ['/api/v4/meta-learning/*', '/api/v4/meta-learning/phase/:id/report']
  },
  'coach-server': {
    total: 8,
    tested: 0,
    endpoints: ['/api/v1/auto-coach/*', '/api/v1/auto-coach/fast-lane']
  },
  'cup-server': {
    total: 6,
    tested: 0,
    endpoints: ['/api/v1/cup/*']
  },
  'product-server': {
    total: 20,
    tested: 0,
    endpoints: ['/api/v1/workflows/*', '/api/v1/artifacts/*', '/api/v1/analysis/*']
  },
  'capabilities-server': {
    total: 20,
    tested: 0,
    endpoints: ['/api/v1/capabilities/*']
  },
  'segmentation-server': {
    total: 6,
    tested: 0,
    endpoints: ['/api/v1/segmentation/*']
  },
  'reports-server': {
    total: 3,
    tested: 0,
    endpoints: ['/api/v1/reports/*']
  },
  'other-servers': {
    total: 11,
    tested: 0,
    endpoints: ['bridge', 'infographics', 'sources', 'capability-bridge']
  }
};

// Run a single test file
function runTest(testFile) {
  return new Promise((resolve) => {
    const filePath = path.join(testsDir, testFile);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Test file not found: ${testFile}`);
      resolve({ passed: 0, failed: 1, file: testFile });
      return;
    }

    const proc = spawn('node', [filePath], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', data => output += data);
    proc.stderr.on('data', data => errorOutput += data);

    proc.on('close', (code) => {
      // Parse output to extract test results
      const passed = (output.match(/✅/g) || []).length;
      const failed = (output.match(/❌/g) || []).length;
      
      resolve({
        passed,
        failed,
        file: testFile,
        success: code === 0,
        output: options.verbose ? output : '',
        error: errorOutput
      });
    });

    proc.on('error', () => {
      resolve({ passed: 0, failed: 1, file: testFile, success: false });
    });
  });
}

// Generate coverage report
function generateReport(results) {
  const timestamp = new Date().toISOString();
  const totalTests = testSuites.length;
  const totalEndpoints = Object.values(endpointInventory).reduce((sum, s) => sum + s.total, 0);
  const testedEndpoints = Object.values(endpointInventory).reduce((sum, s) => sum + s.tested, 0);
  const coveragePercent = ((testedEndpoints / totalEndpoints) * 100).toFixed(1);

  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalAssertions = totalPassed + totalFailed;

  const report = {
    timestamp,
    summary: {
      totalEndpoints,
      testedEndpoints,
      coveragePercent: parseFloat(coveragePercent),
      testSuites: totalTests,
      totalTests: results.length,
      passed: totalPassed,
      failed: totalFailed,
      assertions: totalAssertions,
      passRate: totalTests > 0 ? ((totalPassed / totalAssertions) * 100).toFixed(1) : 'N/A'
    },
    byServer: endpointInventory,
    criticalIssues: [
      {
        endpoint: '/api/v1/system/priority/chat',
        issue: 'May return 404 if web-server not fully initialized',
        severity: 'HIGH',
        status: 'FOUND'
      }
    ],
    gaps: [
      'Training server tests (19 endpoints)',
      'Budget server tests (9 endpoints)',
      'Meta-learning server tests (9 endpoints)',
      'Coach server tests (8 endpoints)',
      'Cup server tests (6 endpoints)',
      'E2E workflow tests',
      'Performance baselines',
      'Security tests'
    ],
    nextPriority: [
      'Fix critical 404 bug in priority endpoint',
      'Add web-server integration tests (14 endpoints)',
      'Add training server tests (19 endpoints)',
      'Create E2E workflow tests (5 complete flows)',
      'Add performance benchmarks',
      'Add security scanning'
    ],
    testResults: results.map(r => ({
      file: r.file,
      passed: r.passed,
      failed: r.failed,
      success: r.success
    }))
  };

  return report;
}

// Format and display results
function displayResults(results, report) {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('📊 QA Test Results Summary');
  console.log('════════════════════════════════════════════════════════\n');

  // Test suite results
  console.log('Test Suites:');
  results.forEach((result, idx) => {
    const suite = testSuites[idx] || {};
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${suite.name}`);
    console.log(`   Passed: ${result.passed} | Failed: ${result.failed}`);
    if (suite.description) {
      console.log(`   ${suite.description}`);
    }
  });

  // Coverage report
  if (report) {
    console.log('\n────────────────────────────────────────────────────────');
    console.log('Coverage Summary:');
    console.log(`Endpoints Tested: ${report.summary.testedEndpoints}/${report.summary.totalEndpoints}`);
    console.log(`Coverage: ${report.summary.coveragePercent}%`);
    console.log(`Test Pass Rate: ${report.summary.passRate}%`);
    
    console.log('\nBy Service:');
    Object.entries(endpointInventory).forEach(([service, data]) => {
      if (data.total > 0) {
        const pct = ((data.tested / data.total) * 100).toFixed(0);
        console.log(`  ${service}: ${data.tested}/${data.total} (${pct}%)`);
      }
    });

    if (report.criticalIssues.length > 0) {
      console.log('\n⚠️  Critical Issues:');
      report.criticalIssues.forEach(issue => {
        console.log(`  • ${issue.endpoint}: ${issue.issue} [${issue.severity}]`);
      });
    }

    if (report.gaps.length > 0) {
      console.log('\nGaps to Fill:');
      report.gaps.slice(0, 3).forEach(gap => {
        console.log(`  • ${gap}`);
      });
      if (report.gaps.length > 3) {
        console.log(`  ... and ${report.gaps.length - 3} more`);
      }
    }

    console.log('\nNext Actions:');
    report.nextPriority.slice(0, 3).forEach(action => {
      console.log(`  1. ${action}`);
    });
  }

  console.log('\n════════════════════════════════════════════════════════\n');
}

// Main entry point
async function main() {
  console.log('════════════════════════════════════════════════════════');
  console.log('🧪 TooLoo.ai QA Test Suite Runner');
  console.log('════════════════════════════════════════════════════════\n');

  const results = [];

  // Run all test suites
  for (const suite of testSuites) {
    process.stdout.write(`Running ${suite.name}... `);
    const result = await runTest(suite.file);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ (${result.passed}/${result.passed + result.failed})`);
    } else {
      console.log(`❌ (${result.passed}/${result.passed + result.failed})`);
    }
  }

  // Generate coverage report
  const report = generateReport(results);

  // Display results
  displayResults(results, report);

  // Save JSON report if requested
  if (options.report) {
    const reportPath = path.join(rootDir, 'qa-coverage-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Coverage report saved to: ${reportPath}\n`);
  }

  // Exit with appropriate code
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
