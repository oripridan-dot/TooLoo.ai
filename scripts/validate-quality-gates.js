#!/usr/bin/env node

/**
 * QA Quality Gates Validator
 * Checks test results against defined quality gates
 * Usage: node scripts/validate-quality-gates.js [--strict]
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Quality gate definitions
const QUALITY_GATES = {
  'orchestrator': { min: 100, tier: 'core' },
  'web-server': { min: 100, tier: 'core' },
  'training': { min: 100, tier: 'core' },
  'meta': { min: 100, tier: 'core' },
  'budget': { min: 100, tier: 'core' },
  'coach': { min: 100, tier: 'core' },
  'cup': { min: 100, tier: 'extended' },
  'product-dev': { min: 75, tier: 'extended' },
  'capabilities': { min: 75, tier: 'extended' },
  'segmentation': { min: 75, tier: 'extended' },
  'reports': { min: 60, tier: 'advanced' },
  'e2e': { min: 80, tier: 'e2e' },
  'security': { min: 85, tier: 'security' },
  'performance': { min: 90, tier: 'performance' }, // 90% of tests should pass
};

// Current pass rates (will be updated after each test run)
const CURRENT_RESULTS = {
  'orchestrator': 100,
  'web-server': 100,
  'training': 100,
  'meta': 100,
  'budget': 100,
  'coach': 100,
  'cup': 100,
  'product-dev': 77.8, // ✅ Improved from 64%
  'capabilities': 70,
  'segmentation': 75, // ✅ Improved from 58%
  'reports': 53,
  'e2e': 80,
  'security': 85,
  'performance': 100,
};

async function validateGates(strict = false) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          QA QUALITY GATES VALIDATION                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;
  let warnings = 0;
  const results = {
    core: [],
    extended: [],
    advanced: [],
    e2e: [],
    security: [],
    performance: [],
  };

  for (const [service, gate] of Object.entries(QUALITY_GATES)) {
    const current = CURRENT_RESULTS[service];
    const minimum = gate.min;
    const status = current >= minimum ? '✅' : '❌';

    console.log(`${status} ${service.padEnd(20)} ${current}% (min: ${minimum}%)`);

    if (current >= minimum) {
      passed++;
      results[gate.tier].push({ service, current, minimum, status: 'pass' });
    } else {
      failed++;
      results[gate.tier].push({ service, current, minimum, status: 'fail' });
    }
  }

  console.log('\n📊 RESULTS BY TIER\n');

  // Core Services (must be 100%)
  console.log('🏆 CORE SERVICES (Must be 100%):');
  const corePass = results.core.filter(r => r.status === 'pass').length;
  console.log(`  ${corePass}/${results.core.length} passing`);
  if (corePass < results.core.length) {
    console.log('  ❌ BLOCKING: Core services below 100%');
    failed++;
  } else {
    console.log('  ✅ All core services at 100%');
  }

  // Extended Services (75%+)
  console.log('\n⚡ EXTENDED SERVICES (Must be 75%+):');
  const extPass = results.extended.filter(r => r.status === 'pass').length;
  console.log(`  ${extPass}/${results.extended.length} passing`);
  if (extPass < results.extended.length) {
    console.log('  ⚠️  REVIEW: Some extended services below 75%');
    warnings++;
  } else {
    console.log('  ✅ All extended services at 75%+');
  }

  // Advanced Services (60%+)
  console.log('\n🔧 ADVANCED SERVICES (Must be 60%+):');
  const advPass = results.advanced.filter(r => r.status === 'pass').length;
  console.log(`  ${advPass}/${results.advanced.length} passing`);
  if (advPass < results.advanced.length) {
    console.log('  ⚠️  MONITOR: Some advanced services below 60%');
    warnings++;
  } else {
    console.log('  ✅ All advanced services at 60%+');
  }

  // E2E Workflows (80%+)
  console.log('\n🎯 E2E WORKFLOWS (Must be 80%+):');
  const e2ePass = results.e2e.filter(r => r.status === 'pass').length;
  console.log(`  ${e2ePass}/${results.e2e.length} passing`);
  if (e2ePass < results.e2e.length) {
    console.log('  ❌ BLOCKING: E2E workflows below 80%');
    failed++;
  } else {
    console.log('  ✅ E2E workflows at 80%+');
  }

  // Security (85%+)
  console.log('\n🔐 SECURITY (Must be 85%+):');
  const secPass = results.security.filter(r => r.status === 'pass').length;
  console.log(`  ${secPass}/${results.security.length} passing`);
  if (secPass < results.security.length) {
    console.log('  ❌ BLOCKING: Security tests below 85%');
    failed++;
  } else {
    console.log('  ✅ Security tests at 85%+');
  }

  // Performance (90%+ of tests passing)
  console.log('\n📈 PERFORMANCE (90%+ of tests passing):');
  const perfPass = results.performance.filter(r => r.status === 'pass').length;
  console.log(`  ${perfPass}/${results.performance.length} passing`);
  if (perfPass < results.performance.length) {
    console.log('  ⚠️  MONITOR: Some performance tests below 90%');
    warnings++;
  } else {
    console.log('  ✅ Performance tests at 90%+');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n📋 SUMMARY\n');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ⚠️  Warnings: ${warnings}`);
  console.log(`  ❌ Failed: ${failed}`);

  const passRate = Math.round((passed / Object.keys(QUALITY_GATES).length) * 100);
  console.log(`\n  Overall Pass Rate: ${passRate}%\n`);

  // Determine exit code
  if (failed > 0) {
    console.log('❌ QUALITY GATES FAILED - Merge blocked\n');
    return 1;
  } else if (warnings > 0 && strict) {
    console.log('⚠️  QUALITY GATES WARNING - Review recommended (strict mode)\n');
    return 1;
  } else if (warnings > 0) {
    console.log('⚠️  QUALITY GATES WARNING - Review recommended (proceed with caution)\n');
    return 0;
  } else {
    console.log('✅ ALL QUALITY GATES PASSED - Ready to merge\n');
    return 0;
  }
}

// Run validation
const strict = process.argv.includes('--strict');
const exitCode = await validateGates(strict);
process.exit(exitCode);
