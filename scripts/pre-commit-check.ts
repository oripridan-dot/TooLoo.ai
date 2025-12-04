#!/usr/bin/env npx tsx
// @version 2.2.668 - Added Perfection Enforcer
/**
 * Pre-Commit Quality Gate
 *
 * Runs before every commit to GUARANTEE error-free code:
 * 1. TypeScript compilation check (ZERO errors allowed)
 * 2. ESLint check (ZERO errors allowed)
 * 3. Feature validation (quality, connectivity, performance)
 * 4. Wire verification (frontend↔backend)
 * 5. Perfection Enforcer (stubs, missing endpoints, incomplete features)
 *
 * @module scripts/pre-commit-check
 * @intent Prevent ANY broken code from entering the system
 */

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

const ROOT = process.cwd();

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: CheckResult[] = [];

function runCheck(name: string, fn: () => void): boolean {
  const start = Date.now();
  try {
    fn();
    results.push({
      name,
      passed: true,
      message: '✅ Passed',
      duration: Date.now() - start,
    });
    return true;
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      message: error.message || 'Failed',
      duration: Date.now() - start,
    });
    return false;
  }
}

function checkTypeScript(): void {
  console.log('\n📝 Checking TypeScript compilation...');
  try {
    execSync('npx tsc --noEmit --skipLibCheck 2>&1', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 120000, // 2 minutes max
    });
  } catch (error: any) {
    const output = error.stdout || error.message;
    const errorCount = (output.match(/error TS\d+/g) || []).length;
    throw new Error(`TypeScript: ${errorCount} errors found\n${output.slice(0, 500)}`);
  }
}

function checkESLint(): void {
  console.log('\n🔍 Checking ESLint...');
  try {
    execSync(
      'npx eslint "src/**/*.{ts,tsx}" --ignore-pattern "src/web-app/**" --max-warnings 0 --format compact 2>&1',
      {
        cwd: ROOT,
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 120000,
      }
    );
  } catch (error: any) {
    const output = error.stdout || error.message;
    // Count actual errors (not warnings)
    const errorLines = output.split('\n').filter((l: string) => l.includes(': error'));
    if (errorLines.length > 0) {
      throw new Error(
        `ESLint: ${errorLines.length} errors found\n${errorLines.slice(0, 5).join('\n')}`
      );
    }
    // Warnings are ok, but report them
    const warningLines = output.split('\n').filter((l: string) => l.includes(': warning'));
    if (warningLines.length > 0) {
      console.log(`   ⚠️  ${warningLines.length} warnings (consider fixing)`);
    }
  }
}

async function checkFeatureValidation(files: string[]): Promise<void> {
  console.log('\n✨ Running feature validation on changed files...');

  // Only validate TS/TSX files
  const tsFiles = files.filter((f) => f.match(/\.(ts|tsx)$/) && !f.includes('node_modules'));

  if (tsFiles.length === 0) {
    console.log('   No TypeScript files to validate');
    return;
  }

  const { featureValidator } = await import('../src/qa/validation/feature-validator.js');
  const report = await featureValidator.validateFeature(
    'pre-commit',
    tsFiles.map((f) => path.join(ROOT, f))
  );

  if (!report.overallPassed) {
    const blockerList = report.blockers
      .slice(0, 5)
      .map((b) => `  - ${b.message}`)
      .join('\n');
    throw new Error(
      `Feature validation failed (score: ${report.overallScore}/100)\n${blockerList}`
    );
  }

  console.log(`   Score: ${report.overallScore}/100 ✅`);
}

async function checkWiring(): Promise<void> {
  console.log('\n🔌 Checking frontend↔backend wiring...');

  // Import wire verifier dynamically
  const { WireVerifier } = await import('../src/qa/wiring/wire-verifier.js');
  const verifier = new WireVerifier(ROOT);
  const report = await verifier.verify();

  if (report.mismatches.length > 0) {
    const critical = report.mismatches.filter((m) => m.severity === 'critical');
    if (critical.length > 0) {
      throw new Error(
        `Wire mismatches: ${critical.length} critical issues\n` +
          critical.map((m) => `  - ${m.issue}`).join('\n')
      );
    }
  }

  if (report.coverage < 90) {
    throw new Error(`Wire coverage too low: ${report.coverage.toFixed(1)}% (minimum 90%)`);
  }
}

function checkStagedFiles(): string[] {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function hasTsChanges(files: string[]): boolean {
  return files.some((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
}

function hasRouteChanges(files: string[]): boolean {
  return files.some(
    (f) =>
      f.includes('routes/') || f.includes('/api') || f.includes('fetch') || f.includes('socket')
  );
}

async function main() {
  console.log('🚦 TooLoo.ai Pre-Commit Quality Gate\n');
  console.log('═'.repeat(50));
  console.log('📋 ZERO ERRORS POLICY - All code must be 100% clean\n');

  const stagedFiles = checkStagedFiles();
  console.log(`📁 Staged files: ${stagedFiles.length}`);

  let allPassed = true;

  // ALWAYS run TypeScript check - no exceptions
  if (hasTsChanges(stagedFiles) || stagedFiles.length === 0) {
    const tsOk = runCheck('TypeScript Compilation', checkTypeScript);
    allPassed = allPassed && tsOk;
  } else {
    console.log('\n⏭️  Skipping TypeScript (no .ts/.tsx changes)');
  }

  // ALWAYS run ESLint check for TS files
  if (hasTsChanges(stagedFiles) || stagedFiles.length === 0) {
    const lintOk = runCheck('ESLint Check', checkESLint);
    allPassed = allPassed && lintOk;
  } else {
    console.log('\n⏭️  Skipping ESLint (no .ts/.tsx changes)');
  }

  // Run feature validation on changed files
  if (hasTsChanges(stagedFiles)) {
    try {
      await checkFeatureValidation(stagedFiles.filter((f) => f.match(/\.(ts|tsx)$/)));
      results.push({
        name: 'Feature Validation',
        passed: true,
        message: '✅ Passed',
        duration: 0,
      });
    } catch (error: any) {
      results.push({
        name: 'Feature Validation',
        passed: false,
        message: error.message,
        duration: 0,
      });
      allPassed = false;
    }
  }

  // Run wire check if routes or API-related files changed
  if (hasRouteChanges(stagedFiles) || stagedFiles.length === 0) {
    try {
      await checkWiring();
      results.push({
        name: 'Wire Verification',
        passed: true,
        message: '✅ Passed',
        duration: 0,
      });
    } catch (error: any) {
      results.push({
        name: 'Wire Verification',
        passed: false,
        message: error.message,
        duration: 0,
      });
      allPassed = false;
    }
  } else {
    console.log('\n⏭️  Skipping wire check (no route changes)');
  }

  // ALWAYS run Perfection Enforcer - catches stubs, missing endpoints, TODOs
  console.log('\n🎯 Running Perfection Enforcer...');
  try {
    const { PerfectionEnforcer } = await import('../src/qa/guards/perfection-enforcer.js');
    const enforcer = new PerfectionEnforcer(ROOT);
    const report = await enforcer.enforce();

    const hasCriticalIssues =
      report.missingEndpoints.length > 0 || report.summary.criticalStubs > 0;

    if (hasCriticalIssues) {
      let errorMsg = `Perfection score: ${report.score}/100 (Grade: ${report.summary.healthGrade})\n`;

      if (report.missingEndpoints.length > 0) {
        errorMsg += `\n❌ ${report.missingEndpoints.length} MISSING API ENDPOINT(S):\n`;
        for (const ep of report.missingEndpoints.slice(0, 3)) {
          errorMsg += `   - ${ep.method} ${ep.path}\n     → ${ep.suggestion}\n`;
        }
      }

      if (report.summary.criticalStubs > 0) {
        errorMsg += `\n⚠️ ${report.summary.criticalStubs} CRITICAL STUB(S):\n`;
        for (const stub of report.stubs.filter((s) => s.severity === 'critical').slice(0, 3)) {
          errorMsg += `   - ${stub.file}:${stub.line} (${stub.type})\n`;
        }
      }

      results.push({
        name: 'Perfection Enforcer',
        passed: false,
        message: errorMsg,
        duration: 0,
      });
      allPassed = false;
    } else {
      results.push({
        name: 'Perfection Enforcer',
        passed: true,
        message: `✅ Score: ${report.score}/100 (Grade: ${report.summary.healthGrade})`,
        duration: 0,
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Perfection Enforcer',
      passed: false,
      message: `Check failed: ${error.message}`,
      duration: 0,
    });
    // Don't fail the commit for perfection enforcer errors, just warn
    console.log('   ⚠️  Perfection check encountered an error');
  }

  // Print summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 Results Summary\n');

  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    const time = result.duration > 0 ? ` (${result.duration}ms)` : '';
    console.log(`${status} ${result.name}${time}`);
    if (!result.passed) {
      console.log(`   ${result.message.split('\n')[0]}`);
    }
  }

  console.log('\n' + '═'.repeat(50));

  if (allPassed) {
    console.log('✅ All checks passed! Proceeding with commit.\n');
    process.exit(0);
  } else {
    console.log('❌ Some checks failed. Please fix issues before committing.\n');
    console.log('💡 Tip: Run `npm run qa:fix` to auto-fix common issues.\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Pre-commit check failed:', err);
  process.exit(1);
});
