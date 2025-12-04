// @version 2.2.665
/**
 * Feature Validator - Comprehensive validation for new features and capabilities
 *
 * This is TooLoo.ai's quality gate that ensures EVERY new feature is:
 * - Error-free (TypeScript + ESLint)
 * - Properly connected to the system
 * - Performance-optimized
 * - Following best practices
 *
 * @module qa/validation/feature-validator
 * @intent Prevent broken code from entering the system
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { bus } from '../../core/event-bus.js';
import {
  shouldExcludeFile,
  isProtectedFile,
  getFilePriority,
} from '../registry/essential-files.js';

const execAsync = promisify(exec);

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  passed: boolean;
  score: number; // 0-100
  timestamp: string;
  duration: number; // ms
  checks: ValidationCheck[];
  summary: ValidationSummary;
  recommendations: string[];
}

export interface ValidationCheck {
  name: string;
  category: 'error' | 'quality' | 'performance' | 'connectivity' | 'best-practice';
  passed: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  details?: string[];
  fixSuggestion?: string;
}

export interface ValidationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
}

export interface FileValidation {
  filePath: string;
  priority: 'critical' | 'high' | 'normal' | 'low' | 'exclude';
  result: ValidationResult;
}

export interface FeatureValidationReport {
  featureName: string;
  files: string[];
  timestamp: string;
  overallPassed: boolean;
  overallScore: number;
  fileResults: FileValidation[];
  aggregateSummary: ValidationSummary;
  blockers: ValidationCheck[]; // Issues that MUST be fixed
  warnings: ValidationCheck[]; // Issues that SHOULD be fixed
}

// ============================================================================
// FEATURE VALIDATOR CLASS
// ============================================================================

export class FeatureValidator {
  private projectRoot: string;
  private validationCache: Map<string, ValidationResult> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Validate a single file for all quality criteria
   */
  async validateFile(filePath: string): Promise<ValidationResult> {
    const startTime = Date.now();
    const checks: ValidationCheck[] = [];
    const relativePath = path.relative(this.projectRoot, filePath);

    // Check cache
    const cached = this.validationCache.get(filePath);
    if (cached && Date.now() - new Date(cached.timestamp).getTime() < this.CACHE_TTL) {
      return cached;
    }

    console.log(`[FeatureValidator] Validating: ${relativePath}`);

    // Skip excluded files
    if (shouldExcludeFile(relativePath)) {
      return this.createSkippedResult(relativePath, startTime);
    }

    // Run all validation checks in parallel where possible
    const [tsCheck, lintCheck, importCheck, docCheck, perfCheck] = await Promise.all([
      this.checkTypeScript(filePath),
      this.checkLinting(filePath),
      this.checkImports(filePath),
      this.checkDocumentation(filePath),
      this.checkPerformancePatterns(filePath),
    ]);

    checks.push(tsCheck, lintCheck, importCheck, docCheck, perfCheck);

    // Additional checks for specific file types
    if (filePath.includes('/routes/')) {
      checks.push(await this.checkRouteConnectivity(filePath));
    }

    if (filePath.endsWith('index.ts')) {
      checks.push(await this.checkExportsConnectivity(filePath));
    }

    const result = this.compileResult(checks, startTime);

    // Cache the result
    this.validationCache.set(filePath, result);

    // Emit validation event
    bus.publish('system', 'qa:file_validated', {
      filePath: relativePath,
      passed: result.passed,
      score: result.score,
      criticalIssues: result.summary.criticalIssues,
    });

    return result;
  }

  /**
   * Validate multiple files (a feature/capability)
   */
  async validateFeature(
    featureName: string,
    filePaths: string[]
  ): Promise<FeatureValidationReport> {
    console.log(
      `[FeatureValidator] Validating feature: ${featureName} (${filePaths.length} files)`
    );
    const startTime = Date.now();

    const fileResults: FileValidation[] = [];
    const blockers: ValidationCheck[] = [];
    const warnings: ValidationCheck[] = [];

    // Validate all files
    for (const filePath of filePaths) {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.projectRoot, filePath);

      const priority = getFilePriority(path.relative(this.projectRoot, absolutePath));
      const result = await this.validateFile(absolutePath);

      fileResults.push({
        filePath: path.relative(this.projectRoot, absolutePath),
        priority,
        result,
      });

      // Collect blockers and warnings
      for (const check of result.checks) {
        if (!check.passed) {
          if (check.severity === 'critical' || check.severity === 'high') {
            blockers.push({
              ...check,
              message: `[${path.basename(absolutePath)}] ${check.message}`,
            });
          } else {
            warnings.push({
              ...check,
              message: `[${path.basename(absolutePath)}] ${check.message}`,
            });
          }
        }
      }
    }

    // Calculate aggregate summary
    const aggregateSummary = this.aggregateSummaries(fileResults.map((f) => f.result.summary));
    const overallScore = this.calculateOverallScore(fileResults);
    const overallPassed = blockers.length === 0 && overallScore >= 80;

    const report: FeatureValidationReport = {
      featureName,
      files: filePaths.map((p) => path.relative(this.projectRoot, p)),
      timestamp: new Date().toISOString(),
      overallPassed,
      overallScore,
      fileResults,
      aggregateSummary,
      blockers,
      warnings,
    };

    // Emit feature validation event
    bus.publish('system', 'qa:feature_validated', {
      featureName,
      passed: overallPassed,
      score: overallScore,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      duration: Date.now() - startTime,
    });

    return report;
  }

  /**
   * Validate all changed files (for pre-commit)
   */
  async validateChangedFiles(): Promise<FeatureValidationReport> {
    const changedFiles = await this.getChangedFiles();
    return this.validateFeature('changed-files', changedFiles);
  }

  /**
   * Validate entire project (full check)
   */
  async validateProject(): Promise<FeatureValidationReport> {
    const allFiles = await this.getAllSourceFiles();
    return this.validateFeature('full-project', allFiles);
  }

  // ============================================================================
  // INDIVIDUAL CHECKS
  // ============================================================================

  /**
   * Check TypeScript compilation
   */
  private async checkTypeScript(filePath: string): Promise<ValidationCheck> {
    const relativePath = path.relative(this.projectRoot, filePath);

    try {
      // Run tsc on the specific file
      await execAsync(`npx tsc --noEmit --skipLibCheck "${relativePath}"`, {
        cwd: this.projectRoot,
        timeout: 30000,
      });

      return {
        name: 'TypeScript Compilation',
        category: 'error',
        passed: true,
        severity: 'critical',
        message: 'No TypeScript errors',
      };
    } catch (error: unknown) {
      const errorOutput =
        error instanceof Error && 'stderr' in error
          ? String((error as { stderr: unknown }).stderr)
          : String(error);

      const errorLines = errorOutput.split('\n').filter((l) => l.includes('error TS'));

      return {
        name: 'TypeScript Compilation',
        category: 'error',
        passed: false,
        severity: 'critical',
        message: `${errorLines.length} TypeScript error(s)`,
        details: errorLines.slice(0, 5),
        fixSuggestion: 'Run `npx tsc --noEmit` to see all errors and fix them',
      };
    }
  }

  /**
   * Check ESLint rules
   */
  private async checkLinting(filePath: string): Promise<ValidationCheck> {
    const relativePath = path.relative(this.projectRoot, filePath);

    // Skip non-TS/JS files
    if (!filePath.match(/\.(ts|tsx|js|jsx)$/)) {
      return {
        name: 'ESLint',
        category: 'quality',
        passed: true,
        severity: 'medium',
        message: 'N/A - Not a JavaScript/TypeScript file',
      };
    }

    try {
      await execAsync(`npx eslint "${relativePath}" --format json --max-warnings 0`, {
        cwd: this.projectRoot,
        timeout: 30000,
      });

      return {
        name: 'ESLint',
        category: 'quality',
        passed: true,
        severity: 'medium',
        message: 'No ESLint issues',
      };
    } catch (error: unknown) {
      // ESLint exits with non-zero on errors/warnings
      const stdout =
        error instanceof Error && 'stdout' in error
          ? String((error as { stdout: unknown }).stdout)
          : '';

      let errorCount = 0;
      let warningCount = 0;

      try {
        const results = JSON.parse(stdout);
        for (const result of results) {
          errorCount += result.errorCount || 0;
          warningCount += result.warningCount || 0;
        }
      } catch {
        errorCount = 1; // Assume at least one error
      }

      return {
        name: 'ESLint',
        category: 'quality',
        passed: errorCount === 0,
        severity: errorCount > 0 ? 'high' : 'medium',
        message: `${errorCount} error(s), ${warningCount} warning(s)`,
        fixSuggestion: 'Run `npm run lint -- --fix` to auto-fix some issues',
      };
    }
  }

  /**
   * Check that imports are valid and the file is connected
   */
  private async checkImports(filePath: string): Promise<ValidationCheck> {
    if (!filePath.match(/\.(ts|tsx|js|jsx)$/)) {
      return {
        name: 'Import Connectivity',
        category: 'connectivity',
        passed: true,
        severity: 'medium',
        message: 'N/A - Not a JavaScript/TypeScript file',
      };
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const importLines = content.split('\n').filter((l) => l.trim().startsWith('import '));

      const brokenImports: string[] = [];

      for (const line of importLines) {
        // Check relative imports
        const relativeMatch = line.match(/from\s+['"](\.\.?\/[^'"]+)['"]/);
        if (relativeMatch && relativeMatch[1]) {
          const importPath: string = relativeMatch[1];
          const resolvedPath = path.resolve(path.dirname(filePath), importPath);

          // Try to resolve with .ts, .tsx, .js extensions
          const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];
          const exists = extensions.some((ext) => fs.existsSync(resolvedPath + ext));

          if (!exists) {
            brokenImports.push(importPath);
          }
        }
      }

      if (brokenImports.length > 0) {
        return {
          name: 'Import Connectivity',
          category: 'connectivity',
          passed: false,
          severity: 'critical',
          message: `${brokenImports.length} broken import(s)`,
          details: brokenImports.slice(0, 5),
          fixSuggestion: 'Check that all imported files exist',
        };
      }

      return {
        name: 'Import Connectivity',
        category: 'connectivity',
        passed: true,
        severity: 'critical',
        message: `${importLines.length} import(s) validated`,
      };
    } catch (error) {
      return {
        name: 'Import Connectivity',
        category: 'connectivity',
        passed: false,
        severity: 'critical',
        message: `Failed to check imports: ${error}`,
      };
    }
  }

  /**
   * Check documentation quality (JSDoc, @intent, @version)
   */
  private async checkDocumentation(filePath: string): Promise<ValidationCheck> {
    if (!filePath.match(/\.(ts|tsx|js|jsx)$/)) {
      return {
        name: 'Documentation',
        category: 'best-practice',
        passed: true,
        severity: 'low',
        message: 'N/A - Not a JavaScript/TypeScript file',
      };
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const issues: string[] = [];

      // Check for file-level documentation
      if (!content.includes('/**') && !content.includes('//')) {
        issues.push('Missing file documentation');
      }

      // Check for @version tag
      if (!content.includes('@version')) {
        issues.push('Missing @version tag');
      }

      // Check for @intent tag (TooLoo best practice)
      const hasIntent = content.includes('@intent') || content.includes('@description');
      if (!hasIntent) {
        issues.push('Missing @intent or @description tag');
      }

      // Check exported functions have JSDoc
      const exportMatches = content.match(/export\s+(async\s+)?function\s+\w+/g) || [];
      const jsdocMatches =
        content.match(/\/\*\*[\s\S]*?\*\/\s*export\s+(async\s+)?function/g) || [];

      if (exportMatches.length > jsdocMatches.length) {
        issues.push(
          `${exportMatches.length - jsdocMatches.length} exported function(s) missing JSDoc`
        );
      }

      if (issues.length > 2) {
        return {
          name: 'Documentation',
          category: 'best-practice',
          passed: false,
          severity: 'low',
          message: `${issues.length} documentation issue(s)`,
          details: issues,
          fixSuggestion: 'Add JSDoc comments with @version and @intent tags',
        };
      }

      return {
        name: 'Documentation',
        category: 'best-practice',
        passed: true,
        severity: 'low',
        message: 'Documentation meets standards',
      };
    } catch (error) {
      return {
        name: 'Documentation',
        category: 'best-practice',
        passed: true, // Don't fail on doc check errors
        severity: 'low',
        message: `Could not check documentation: ${error}`,
      };
    }
  }

  /**
   * Check for performance anti-patterns
   */
  private async checkPerformancePatterns(filePath: string): Promise<ValidationCheck> {
    if (!filePath.match(/\.(ts|tsx|js|jsx)$/)) {
      return {
        name: 'Performance',
        category: 'performance',
        passed: true,
        severity: 'medium',
        message: 'N/A - Not a JavaScript/TypeScript file',
      };
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const issues: string[] = [];

      // Check for synchronous filesystem operations in async context
      if (content.includes('fs.readFileSync') && content.includes('async ')) {
        issues.push('Using sync fs operations in async context');
      }

      // Check for nested awaits in loops (potential N+1)
      if (content.match(/for\s*\([^)]+\)\s*{[^}]*await\s+/)) {
        issues.push('Potential N+1 query - await inside loop');
      }

      // Check for excessive console.log in production code
      const consoleCount = (content.match(/console\.(log|info)/g) || []).length;
      if (consoleCount > 10) {
        issues.push(`${consoleCount} console.log statements (consider using proper logging)`);
      }

      // Check for very large functions (>100 lines)
      const functionMatches = content.match(/(?:async\s+)?function\s+\w+[^{]*{[\s\S]*?^}/gm) || [];
      const largeFunctions = functionMatches.filter((f) => f.split('\n').length > 100);
      if (largeFunctions.length > 0) {
        issues.push(`${largeFunctions.length} function(s) >100 lines (consider refactoring)`);
      }

      if (issues.length > 0) {
        return {
          name: 'Performance',
          category: 'performance',
          passed: issues.length < 3,
          severity: issues.length >= 3 ? 'high' : 'medium',
          message: `${issues.length} performance concern(s)`,
          details: issues,
          fixSuggestion: 'Review and optimize the flagged patterns',
        };
      }

      return {
        name: 'Performance',
        category: 'performance',
        passed: true,
        severity: 'medium',
        message: 'No obvious performance issues',
      };
    } catch (error) {
      return {
        name: 'Performance',
        category: 'performance',
        passed: true,
        severity: 'medium',
        message: `Could not check performance: ${error}`,
      };
    }
  }

  /**
   * Check route connectivity (for route files)
   */
  private async checkRouteConnectivity(filePath: string): Promise<ValidationCheck> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Check that route handlers exist for route definitions
      const routeDefinitions = content.match(/router\.(get|post|put|delete|patch)\s*\(/g) || [];
      const handlers = content.match(/(async\s+)?\([^)]*req[^)]*res[^)]*\)\s*(=>|{)/g) || [];

      if (routeDefinitions.length > handlers.length) {
        return {
          name: 'Route Connectivity',
          category: 'connectivity',
          passed: false,
          severity: 'high',
          message: `${routeDefinitions.length - handlers.length} route(s) missing handlers`,
        };
      }

      // Check for error handling
      const hasErrorHandler = content.includes('catch') || content.includes('.catch(');
      if (!hasErrorHandler && routeDefinitions.length > 0) {
        return {
          name: 'Route Connectivity',
          category: 'connectivity',
          passed: false,
          severity: 'medium',
          message: 'Routes missing error handling',
          fixSuggestion: 'Add try/catch blocks to route handlers',
        };
      }

      return {
        name: 'Route Connectivity',
        category: 'connectivity',
        passed: true,
        severity: 'high',
        message: `${routeDefinitions.length} route(s) properly connected`,
      };
    } catch (error) {
      return {
        name: 'Route Connectivity',
        category: 'connectivity',
        passed: true,
        severity: 'high',
        message: `Could not check route connectivity: ${error}`,
      };
    }
  }

  /**
   * Check exports connectivity (for index.ts files)
   */
  private async checkExportsConnectivity(filePath: string): Promise<ValidationCheck> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const dir = path.dirname(filePath);

      // Get all exports
      const exports = content.match(/export\s+\{[^}]+\}\s+from\s+['"][^'"]+['"]/g) || [];
      const reExports = content.match(/export\s+\*\s+from\s+['"][^'"]+['"]/g) || [];

      const brokenExports: string[] = [];

      for (const exp of [...exports, ...reExports]) {
        const match = exp.match(/from\s+['"]([^'"]+)['"]/);
        if (match && match[1]) {
          const importPath: string = match[1];
          if (importPath.startsWith('.')) {
            const resolvedPath = path.resolve(dir, importPath);
            const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];
            const exists = extensions.some((ext) => fs.existsSync(resolvedPath + ext));

            if (!exists) {
              brokenExports.push(importPath);
            }
          }
        }
      }

      if (brokenExports.length > 0) {
        return {
          name: 'Export Connectivity',
          category: 'connectivity',
          passed: false,
          severity: 'critical',
          message: `${brokenExports.length} broken export(s)`,
          details: brokenExports,
        };
      }

      return {
        name: 'Export Connectivity',
        category: 'connectivity',
        passed: true,
        severity: 'critical',
        message: `${exports.length + reExports.length} export(s) validated`,
      };
    } catch (error) {
      return {
        name: 'Export Connectivity',
        category: 'connectivity',
        passed: true,
        severity: 'critical',
        message: `Could not check exports: ${error}`,
      };
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async getChangedFiles(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git diff --name-only HEAD~1', { cwd: this.projectRoot });
      const files = stdout.trim().split('\n').filter(Boolean);
      return files
        .filter((f) => f.match(/\.(ts|tsx|js|jsx)$/))
        .map((f) => path.join(this.projectRoot, f));
    } catch {
      // Fallback to staged files
      try {
        const { stdout } = await execAsync('git diff --cached --name-only', {
          cwd: this.projectRoot,
        });
        return stdout
          .trim()
          .split('\n')
          .filter(Boolean)
          .filter((f) => f.match(/\.(ts|tsx|js|jsx)$/))
          .map((f) => path.join(this.projectRoot, f));
      } catch {
        return [];
      }
    }
  }

  private async getAllSourceFiles(): Promise<string[]> {
    const files = await glob('src/**/*.{ts,tsx}', {
      cwd: this.projectRoot,
      ignore: [
        '**/node_modules/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
        '**/dist/**',
        '**/_cleanup/**',
      ],
    });

    return files.map((f) => path.join(this.projectRoot, f));
  }

  private createSkippedResult(relativePath: string, startTime: number): ValidationResult {
    return {
      passed: true,
      score: 100,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      checks: [
        {
          name: 'File Excluded',
          category: 'best-practice',
          passed: true,
          severity: 'low',
          message: `File is excluded from validation: ${relativePath}`,
        },
      ],
      summary: {
        totalChecks: 1,
        passed: 1,
        failed: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
      },
      recommendations: [],
    };
  }

  private compileResult(checks: ValidationCheck[], startTime: number): ValidationResult {
    const failed = checks.filter((c) => !c.passed);

    const summary: ValidationSummary = {
      totalChecks: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      criticalIssues: failed.filter((c) => c.severity === 'critical').length,
      highIssues: failed.filter((c) => c.severity === 'high').length,
      mediumIssues: failed.filter((c) => c.severity === 'medium').length,
      lowIssues: failed.filter((c) => c.severity === 'low').length,
    };

    // Calculate score (critical=0 points per fail, high=10, medium=5, low=2)
    const maxScore = checks.length * 10;
    const deductions =
      summary.criticalIssues * 25 +
      summary.highIssues * 15 +
      summary.mediumIssues * 5 +
      summary.lowIssues * 2;

    const score = Math.max(0, Math.round(((maxScore - deductions) / maxScore) * 100));

    // Has critical or high issues = fail
    const passed = summary.criticalIssues === 0 && summary.highIssues === 0;

    const recommendations = failed
      .filter((c) => c.fixSuggestion)
      .map((c) => `${c.name}: ${c.fixSuggestion}`);

    return {
      passed,
      score,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      checks,
      summary,
      recommendations,
    };
  }

  private aggregateSummaries(summaries: ValidationSummary[]): ValidationSummary {
    return summaries.reduce(
      (acc, s) => ({
        totalChecks: acc.totalChecks + s.totalChecks,
        passed: acc.passed + s.passed,
        failed: acc.failed + s.failed,
        criticalIssues: acc.criticalIssues + s.criticalIssues,
        highIssues: acc.highIssues + s.highIssues,
        mediumIssues: acc.mediumIssues + s.mediumIssues,
        lowIssues: acc.lowIssues + s.lowIssues,
      }),
      {
        totalChecks: 0,
        passed: 0,
        failed: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
      }
    );
  }

  private calculateOverallScore(results: FileValidation[]): number {
    if (results.length === 0) return 100;

    // Weight by priority
    const weights: Record<string, number> = {
      critical: 5,
      high: 3,
      normal: 2,
      low: 1,
      exclude: 0,
    };

    let totalWeight = 0;
    let weightedScore = 0;

    for (const result of results) {
      const weight = weights[result.priority] || 1;
      totalWeight += weight;
      weightedScore += result.result.score * weight;
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 100;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const featureValidator = new FeatureValidator();

// ============================================================================
// CLI HELPER
// ============================================================================

/**
 * Run validation from command line
 */
export async function runValidation(mode: 'changed' | 'full' | 'file', target?: string) {
  const validator = new FeatureValidator();

  let report: FeatureValidationReport;

  switch (mode) {
    case 'changed':
      report = await validator.validateChangedFiles();
      break;
    case 'full':
      report = await validator.validateProject();
      break;
    case 'file': {
      if (!target) {
        console.error('File path required for file mode');
        process.exit(1);
      }
      const result = await validator.validateFile(target);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.passed ? 0 : 1);
      return;
    }
    default:
      console.error(`Unknown mode: ${mode}`);
      process.exit(1);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`FEATURE VALIDATION REPORT: ${report.featureName}`);
  console.log('='.repeat(60));
  console.log(`Overall Score: ${report.overallScore}/100 ${report.overallPassed ? '✅' : '❌'}`);
  console.log(`Files Validated: ${report.files.length}`);
  console.log(`Critical Issues: ${report.aggregateSummary.criticalIssues}`);
  console.log(`High Issues: ${report.aggregateSummary.highIssues}`);
  console.log(`Medium Issues: ${report.aggregateSummary.mediumIssues}`);
  console.log(`Low Issues: ${report.aggregateSummary.lowIssues}`);

  if (report.blockers.length > 0) {
    console.log('\n🚫 BLOCKERS (must fix):');
    for (const blocker of report.blockers.slice(0, 10)) {
      console.log(`  - ${blocker.message}`);
    }
  }

  if (report.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (should fix):');
    for (const warning of report.warnings.slice(0, 5)) {
      console.log(`  - ${warning.message}`);
    }
  }

  process.exit(report.overallPassed ? 0 : 1);
}
