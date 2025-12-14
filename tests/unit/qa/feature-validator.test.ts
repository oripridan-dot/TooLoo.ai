// @version 3.3.573
/**
 * Feature Validator Test Suite
 * @version 3.3.510
 *
 * Tests for feature validation types and logic including:
 * - ValidationResult structure
 * - ValidationCheck categories and severities
 * - ValidationSummary aggregation
 * - FeatureValidationReport compilation
 */

import { describe, it, expect, vi } from 'vitest';

// ============================================================================
// TYPE DEFINITIONS (mirrors implementation)
// ============================================================================

interface ValidationResult {
  passed: boolean;
  score: number; // 0-100
  timestamp: string;
  duration: number; // ms
  checks: ValidationCheck[];
  summary: ValidationSummary;
  recommendations: string[];
}

interface ValidationCheck {
  name: string;
  category: 'error' | 'quality' | 'performance' | 'connectivity' | 'best-practice';
  passed: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  details?: string[];
  fixSuggestion?: string;
}

interface ValidationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
}

interface FileValidation {
  filePath: string;
  priority: 'critical' | 'high' | 'normal' | 'low' | 'exclude';
  result: ValidationResult;
}

interface FeatureValidationReport {
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
// UTILITY FUNCTIONS
// ============================================================================

function createValidationSummary(checks: ValidationCheck[]): ValidationSummary {
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed);

  return {
    totalChecks: checks.length,
    passed,
    failed: failed.length,
    criticalIssues: failed.filter((c) => c.severity === 'critical').length,
    highIssues: failed.filter((c) => c.severity === 'high').length,
    mediumIssues: failed.filter((c) => c.severity === 'medium').length,
    lowIssues: failed.filter((c) => c.severity === 'low').length,
  };
}

function calculateScore(summary: ValidationSummary): number {
  if (summary.totalChecks === 0) return 100;

  const baseScore = (summary.passed / summary.totalChecks) * 100;

  // Deduct points for severity
  const deductions =
    summary.criticalIssues * 15 +
    summary.highIssues * 10 +
    summary.mediumIssues * 5 +
    summary.lowIssues * 2;

  return Math.max(0, Math.round(baseScore - deductions));
}

function isPassingValidation(result: ValidationResult, minScore: number = 80): boolean {
  return result.passed && result.score >= minScore && result.summary.criticalIssues === 0;
}

function extractBlockers(checks: ValidationCheck[]): ValidationCheck[] {
  return checks.filter((c) => !c.passed && (c.severity === 'critical' || c.severity === 'high'));
}

function extractWarnings(checks: ValidationCheck[]): ValidationCheck[] {
  return checks.filter((c) => !c.passed && (c.severity === 'medium' || c.severity === 'low'));
}

// ============================================================================
// VALIDATION CHECK TESTS
// ============================================================================

describe('ValidationCheck', () => {
  describe('categories', () => {
    it('should support error category', () => {
      const check: ValidationCheck = {
        name: 'TypeScript Errors',
        category: 'error',
        passed: true,
        severity: 'critical',
        message: 'No TypeScript errors found',
      };
      expect(check.category).toBe('error');
    });

    it('should support quality category', () => {
      const check: ValidationCheck = {
        name: 'Code Coverage',
        category: 'quality',
        passed: false,
        severity: 'medium',
        message: 'Coverage below 80%',
        details: ['Current: 65%', 'Target: 80%'],
      };
      expect(check.category).toBe('quality');
      expect(check.details?.length).toBe(2);
    });

    it('should support performance category', () => {
      const check: ValidationCheck = {
        name: 'Bundle Size',
        category: 'performance',
        passed: true,
        severity: 'low',
        message: 'Bundle within limits',
      };
      expect(check.category).toBe('performance');
    });

    it('should support connectivity category', () => {
      const check: ValidationCheck = {
        name: 'API Wiring',
        category: 'connectivity',
        passed: false,
        severity: 'high',
        message: 'Missing route handler',
        fixSuggestion: 'Add handler in src/nexus/routes/',
      };
      expect(check.category).toBe('connectivity');
      expect(check.fixSuggestion).toBeDefined();
    });

    it('should support best-practice category', () => {
      const check: ValidationCheck = {
        name: 'Documentation',
        category: 'best-practice',
        passed: true,
        severity: 'low',
        message: 'All exports documented',
      };
      expect(check.category).toBe('best-practice');
    });
  });

  describe('severities', () => {
    it('should identify critical issues', () => {
      const check: ValidationCheck = {
        name: 'Build Error',
        category: 'error',
        passed: false,
        severity: 'critical',
        message: 'Build failed with 5 errors',
      };
      expect(check.severity).toBe('critical');
      expect(check.passed).toBe(false);
    });

    it('should identify high priority issues', () => {
      const check: ValidationCheck = {
        name: 'Security Issue',
        category: 'quality',
        passed: false,
        severity: 'high',
        message: 'Potential XSS vulnerability',
      };
      expect(check.severity).toBe('high');
    });

    it('should identify medium priority issues', () => {
      const check: ValidationCheck = {
        name: 'Code Smell',
        category: 'quality',
        passed: false,
        severity: 'medium',
        message: 'Function too complex',
      };
      expect(check.severity).toBe('medium');
    });

    it('should identify low priority issues', () => {
      const check: ValidationCheck = {
        name: 'Style Warning',
        category: 'best-practice',
        passed: false,
        severity: 'low',
        message: 'Prefer const over let',
      };
      expect(check.severity).toBe('low');
    });
  });
});

// ============================================================================
// VALIDATION SUMMARY TESTS
// ============================================================================

describe('ValidationSummary', () => {
  it('should aggregate check results', () => {
    const checks: ValidationCheck[] = [
      { name: 'TS', category: 'error', passed: true, severity: 'critical', message: 'OK' },
      { name: 'Lint', category: 'quality', passed: true, severity: 'high', message: 'OK' },
      {
        name: 'Docs',
        category: 'best-practice',
        passed: false,
        severity: 'low',
        message: 'Missing',
      },
    ];

    const summary = createValidationSummary(checks);

    expect(summary.totalChecks).toBe(3);
    expect(summary.passed).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.lowIssues).toBe(1);
  });

  it('should count severity levels correctly', () => {
    const checks: ValidationCheck[] = [
      { name: 'C1', category: 'error', passed: false, severity: 'critical', message: 'Fail' },
      { name: 'C2', category: 'error', passed: false, severity: 'critical', message: 'Fail' },
      { name: 'H1', category: 'quality', passed: false, severity: 'high', message: 'Fail' },
      { name: 'M1', category: 'quality', passed: false, severity: 'medium', message: 'Fail' },
      { name: 'M2', category: 'quality', passed: false, severity: 'medium', message: 'Fail' },
      { name: 'L1', category: 'best-practice', passed: false, severity: 'low', message: 'Fail' },
    ];

    const summary = createValidationSummary(checks);

    expect(summary.criticalIssues).toBe(2);
    expect(summary.highIssues).toBe(1);
    expect(summary.mediumIssues).toBe(2);
    expect(summary.lowIssues).toBe(1);
  });

  it('should handle all passing checks', () => {
    const checks: ValidationCheck[] = [
      { name: 'C1', category: 'error', passed: true, severity: 'critical', message: 'OK' },
      { name: 'C2', category: 'quality', passed: true, severity: 'high', message: 'OK' },
    ];

    const summary = createValidationSummary(checks);

    expect(summary.passed).toBe(2);
    expect(summary.failed).toBe(0);
    expect(summary.criticalIssues).toBe(0);
  });

  it('should handle empty checks', () => {
    const summary = createValidationSummary([]);

    expect(summary.totalChecks).toBe(0);
    expect(summary.passed).toBe(0);
    expect(summary.failed).toBe(0);
  });
});

// ============================================================================
// SCORE CALCULATION TESTS
// ============================================================================

describe('calculateScore', () => {
  it('should return 100 for all passing', () => {
    const summary: ValidationSummary = {
      totalChecks: 5,
      passed: 5,
      failed: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
    };
    expect(calculateScore(summary)).toBe(100);
  });

  it('should return 100 for empty checks', () => {
    const summary: ValidationSummary = {
      totalChecks: 0,
      passed: 0,
      failed: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
    };
    expect(calculateScore(summary)).toBe(100);
  });

  it('should deduct for critical issues', () => {
    const summary: ValidationSummary = {
      totalChecks: 10,
      passed: 9,
      failed: 1,
      criticalIssues: 1,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
    };
    const score = calculateScore(summary);
    expect(score).toBeLessThan(90); // Base 90% minus critical deduction
  });

  it('should handle multiple issue types', () => {
    const summary: ValidationSummary = {
      totalChecks: 10,
      passed: 6,
      failed: 4,
      criticalIssues: 1,
      highIssues: 1,
      mediumIssues: 1,
      lowIssues: 1,
    };
    const score = calculateScore(summary);
    // Base 60% - 15 - 10 - 5 - 2 = 28
    expect(score).toBe(28);
  });

  it('should not go below 0', () => {
    const summary: ValidationSummary = {
      totalChecks: 5,
      passed: 0,
      failed: 5,
      criticalIssues: 5,
      highIssues: 5,
      mediumIssues: 5,
      lowIssues: 5,
    };
    const score = calculateScore(summary);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// VALIDATION RESULT TESTS
// ============================================================================

describe('ValidationResult', () => {
  it('should create passing result', () => {
    const result: ValidationResult = {
      passed: true,
      score: 95,
      timestamp: new Date().toISOString(),
      duration: 1234,
      checks: [],
      summary: {
        totalChecks: 5,
        passed: 5,
        failed: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
      },
      recommendations: [],
    };
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('should create failing result with recommendations', () => {
    const result: ValidationResult = {
      passed: false,
      score: 45,
      timestamp: new Date().toISOString(),
      duration: 2500,
      checks: [],
      summary: {
        totalChecks: 10,
        passed: 5,
        failed: 5,
        criticalIssues: 2,
        highIssues: 1,
        mediumIssues: 1,
        lowIssues: 1,
      },
      recommendations: [
        'Fix TypeScript errors first',
        'Address security vulnerabilities',
        'Improve test coverage',
      ],
    };
    expect(result.passed).toBe(false);
    expect(result.recommendations.length).toBe(3);
  });

  it('should track validation duration', () => {
    const result: ValidationResult = {
      passed: true,
      score: 100,
      timestamp: new Date().toISOString(),
      duration: 567,
      checks: [],
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
    expect(result.duration).toBe(567);
  });
});

// ============================================================================
// IS PASSING VALIDATION TESTS
// ============================================================================

describe('isPassingValidation', () => {
  it('should pass valid result', () => {
    const result: ValidationResult = {
      passed: true,
      score: 85,
      timestamp: new Date().toISOString(),
      duration: 100,
      checks: [],
      summary: {
        totalChecks: 5,
        passed: 5,
        failed: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
      },
      recommendations: [],
    };
    expect(isPassingValidation(result)).toBe(true);
  });

  it('should fail if passed is false', () => {
    const result: ValidationResult = {
      passed: false,
      score: 85,
      timestamp: new Date().toISOString(),
      duration: 100,
      checks: [],
      summary: {
        totalChecks: 5,
        passed: 4,
        failed: 1,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 1,
        lowIssues: 0,
      },
      recommendations: [],
    };
    expect(isPassingValidation(result)).toBe(false);
  });

  it('should fail if score below threshold', () => {
    const result: ValidationResult = {
      passed: true,
      score: 70,
      timestamp: new Date().toISOString(),
      duration: 100,
      checks: [],
      summary: {
        totalChecks: 5,
        passed: 4,
        failed: 1,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 1,
      },
      recommendations: [],
    };
    expect(isPassingValidation(result)).toBe(false);
    expect(isPassingValidation(result, 60)).toBe(true);
  });

  it('should fail if critical issues exist', () => {
    const result: ValidationResult = {
      passed: true,
      score: 90,
      timestamp: new Date().toISOString(),
      duration: 100,
      checks: [],
      summary: {
        totalChecks: 5,
        passed: 4,
        failed: 1,
        criticalIssues: 1,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
      },
      recommendations: [],
    };
    expect(isPassingValidation(result)).toBe(false);
  });
});

// ============================================================================
// FILE VALIDATION TESTS
// ============================================================================

describe('FileValidation', () => {
  it('should create critical file validation', () => {
    const validation: FileValidation = {
      filePath: 'src/core/event-bus.ts',
      priority: 'critical',
      result: {
        passed: true,
        score: 100,
        timestamp: new Date().toISOString(),
        duration: 50,
        checks: [],
        summary: {
          totalChecks: 5,
          passed: 5,
          failed: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
        },
        recommendations: [],
      },
    };
    expect(validation.priority).toBe('critical');
    expect(validation.result.passed).toBe(true);
  });

  it('should support all priority levels', () => {
    const priorities: FileValidation['priority'][] = [
      'critical',
      'high',
      'normal',
      'low',
      'exclude',
    ];
    priorities.forEach((priority) => {
      const validation: FileValidation = {
        filePath: 'test.ts',
        priority,
        result: {
          passed: true,
          score: 100,
          timestamp: new Date().toISOString(),
          duration: 10,
          checks: [],
          summary: {
            totalChecks: 0,
            passed: 0,
            failed: 0,
            criticalIssues: 0,
            highIssues: 0,
            mediumIssues: 0,
            lowIssues: 0,
          },
          recommendations: [],
        },
      };
      expect(validation.priority).toBe(priority);
    });
  });
});

// ============================================================================
// BLOCKER AND WARNING EXTRACTION TESTS
// ============================================================================

describe('extractBlockers', () => {
  it('should extract critical issues', () => {
    const checks: ValidationCheck[] = [
      {
        name: 'C1',
        category: 'error',
        passed: false,
        severity: 'critical',
        message: 'Critical fail',
      },
      {
        name: 'M1',
        category: 'quality',
        passed: false,
        severity: 'medium',
        message: 'Medium fail',
      },
    ];

    const blockers = extractBlockers(checks);
    expect(blockers.length).toBe(1);
    expect(blockers[0].severity).toBe('critical');
  });

  it('should extract high priority issues', () => {
    const checks: ValidationCheck[] = [
      { name: 'H1', category: 'quality', passed: false, severity: 'high', message: 'High fail' },
      {
        name: 'L1',
        category: 'best-practice',
        passed: false,
        severity: 'low',
        message: 'Low fail',
      },
    ];

    const blockers = extractBlockers(checks);
    expect(blockers.length).toBe(1);
    expect(blockers[0].severity).toBe('high');
  });

  it('should exclude passing checks', () => {
    const checks: ValidationCheck[] = [
      { name: 'C1', category: 'error', passed: true, severity: 'critical', message: 'OK' },
    ];

    const blockers = extractBlockers(checks);
    expect(blockers.length).toBe(0);
  });
});

describe('extractWarnings', () => {
  it('should extract medium issues', () => {
    const checks: ValidationCheck[] = [
      {
        name: 'M1',
        category: 'quality',
        passed: false,
        severity: 'medium',
        message: 'Medium fail',
      },
      { name: 'H1', category: 'quality', passed: false, severity: 'high', message: 'High fail' },
    ];

    const warnings = extractWarnings(checks);
    expect(warnings.length).toBe(1);
    expect(warnings[0].severity).toBe('medium');
  });

  it('should extract low priority issues', () => {
    const checks: ValidationCheck[] = [
      {
        name: 'L1',
        category: 'best-practice',
        passed: false,
        severity: 'low',
        message: 'Low fail',
      },
    ];

    const warnings = extractWarnings(checks);
    expect(warnings.length).toBe(1);
    expect(warnings[0].severity).toBe('low');
  });
});

// ============================================================================
// FEATURE VALIDATION REPORT TESTS
// ============================================================================

describe('FeatureValidationReport', () => {
  it('should compile feature report', () => {
    const report: FeatureValidationReport = {
      featureName: 'New Chat Feature',
      files: ['src/chat/index.ts', 'src/chat/handler.ts'],
      timestamp: new Date().toISOString(),
      overallPassed: true,
      overallScore: 92,
      fileResults: [],
      aggregateSummary: {
        totalChecks: 10,
        passed: 9,
        failed: 1,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 1,
      },
      blockers: [],
      warnings: [],
    };

    expect(report.featureName).toBe('New Chat Feature');
    expect(report.files.length).toBe(2);
    expect(report.overallPassed).toBe(true);
  });

  it('should track blockers and warnings', () => {
    const report: FeatureValidationReport = {
      featureName: 'Risky Feature',
      files: ['src/risky.ts'],
      timestamp: new Date().toISOString(),
      overallPassed: false,
      overallScore: 45,
      fileResults: [],
      aggregateSummary: {
        totalChecks: 5,
        passed: 2,
        failed: 3,
        criticalIssues: 1,
        highIssues: 1,
        mediumIssues: 1,
        lowIssues: 0,
      },
      blockers: [
        {
          name: 'TypeScript',
          category: 'error',
          passed: false,
          severity: 'critical',
          message: 'Build error',
        },
        {
          name: 'Security',
          category: 'quality',
          passed: false,
          severity: 'high',
          message: 'XSS risk',
        },
      ],
      warnings: [
        {
          name: 'Docs',
          category: 'best-practice',
          passed: false,
          severity: 'medium',
          message: 'Missing docs',
        },
      ],
    };

    expect(report.overallPassed).toBe(false);
    expect(report.blockers.length).toBe(2);
    expect(report.warnings.length).toBe(1);
  });
});

// ============================================================================
// VALIDATION WORKFLOW TESTS
// ============================================================================

describe('Validation Workflow', () => {
  it('should pass clean file', () => {
    const checks: ValidationCheck[] = [
      {
        name: 'TypeScript',
        category: 'error',
        passed: true,
        severity: 'critical',
        message: 'No errors',
      },
      { name: 'ESLint', category: 'quality', passed: true, severity: 'high', message: 'Clean' },
      {
        name: 'Imports',
        category: 'connectivity',
        passed: true,
        severity: 'medium',
        message: 'Resolved',
      },
      {
        name: 'Docs',
        category: 'best-practice',
        passed: true,
        severity: 'low',
        message: 'Present',
      },
    ];

    const summary = createValidationSummary(checks);
    const score = calculateScore(summary);

    expect(summary.passed).toBe(4);
    expect(summary.failed).toBe(0);
    expect(score).toBe(100);
  });

  it('should block on critical failure', () => {
    const checks: ValidationCheck[] = [
      {
        name: 'TypeScript',
        category: 'error',
        passed: false,
        severity: 'critical',
        message: '3 errors',
      },
      { name: 'ESLint', category: 'quality', passed: true, severity: 'high', message: 'Clean' },
    ];

    const summary = createValidationSummary(checks);
    const blockers = extractBlockers(checks);

    expect(summary.criticalIssues).toBe(1);
    expect(blockers.length).toBe(1);
  });

  it('should warn on medium issues', () => {
    const checks: ValidationCheck[] = [
      { name: 'TypeScript', category: 'error', passed: true, severity: 'critical', message: 'OK' },
      {
        name: 'Coverage',
        category: 'quality',
        passed: false,
        severity: 'medium',
        message: 'Below 80%',
      },
    ];

    const warnings = extractWarnings(checks);

    expect(warnings.length).toBe(1);
    expect(warnings[0].name).toBe('Coverage');
  });
});
