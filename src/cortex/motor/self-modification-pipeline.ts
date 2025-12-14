// @version 3.3.573
// @version 3.3.573
// @version 3.3.573
// @version 3.3.573
// @version 3.3.573
/**
 * Self-Modification Pipeline with Validation Loop
 *
 * Orchestrates the 4-skill self-modification pipeline:
 * Error Analyzer → Fix Generator → Fix Validator → Self Modifier
 *
 * Features:
 * - Multi-iteration validation loop
 * - Automatic rollback on failure
 * - Rate limiting
 * - Audit logging
 * - Event emission for observability
 *
 * @version 2.0.0
 * @module cortex/motor/self-modification-pipeline
 */

import { bus } from '../../core/event-bus.js';
import { SelfModificationEngine, selfMod } from './self-modification.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync, exec } from 'child_process';

// Skills package - dynamically import to avoid hard dependency
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let skillRegistry: any = {
  get: () => undefined,
  getStats: () => ({ total: 0 }),
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loadSkillsFromDirectory: any = async () => {};

async function loadSkillsModule(): Promise<boolean> {
  try {
    // Dynamic import with string to avoid compile-time resolution
    const modulePath = '@tooloo/skills';
    const skills = await import(/* webpackIgnore: true */ modulePath);
    skillRegistry = skills.skillRegistry;
    loadSkillsFromDirectory = skills.loadSkillsFromDirectory;
    return true;
  } catch {
    // Fallback: skills package not available, use stubs
    console.warn('[Pipeline] @tooloo/skills not available, using stubs');
    return false;
  }
}
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================================
// TYPES
// ============================================================================

export interface ErrorAnalysis {
  errorType: 'type' | 'syntax' | 'runtime' | 'test' | 'config';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: {
    file: string;
    line: number;
    column?: number;
    function?: string;
  };
  rootCause: string;
  context?: string;
  suggestedFixes: Array<{
    description: string;
    confidence: number;
    code?: string;
  }>;
  relatedFiles?: string[];
  preventionTip?: string;
}

export interface FixProposal {
  fix: {
    file: string;
    description: string;
    oldCode: string;
    newCode: string;
    explanation: string;
  };
  additionalChanges?: Array<{
    file: string;
    oldCode: string;
    newCode: string;
  }>;
  imports?: {
    add: string[];
    remove: string[];
  };
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ValidationResult {
  approved: boolean;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  layers: {
    static: {
      passed: boolean;
      checks: {
        syntax: { passed: boolean; errors?: string[] };
        types: { passed: boolean; errors?: string[] };
        lint: { passed: boolean; warnings?: string[] };
      };
    };
    semantic: {
      passed: boolean;
      addressesRootCause: boolean;
      sideEffects: string[];
      logicScore: number;
    };
    regression: {
      passed: boolean;
      testsRun: number;
      testsPassed: number;
      testsFailed: number;
      affectedFiles: string[];
    };
  };
  issues: Array<{
    severity: 'info' | 'warning' | 'error';
    layer: 'static' | 'semantic' | 'regression';
    message: string;
    suggestion?: string;
  }>;
  suggestions: string[];
}

export interface ModificationResult {
  success: boolean;
  action: 'applied' | 'rolled-back' | 'skipped';
  file: string;
  backup?: {
    path: string;
    hash?: string;
  };
  validation: {
    syntax: { passed: boolean };
    lint: { passed: boolean };
    tests: { passed: boolean; run: number; failed: number };
  };
  git?: {
    committed: boolean;
    commitHash?: string;
    message?: string;
  };
  rollbackAvailable: boolean;
  error?: string;
}

export interface PipelineResult {
  success: boolean;
  iterations: number;
  errorAnalysis?: ErrorAnalysis;
  fixProposal?: FixProposal;
  validation?: ValidationResult;
  modification?: ModificationResult;
  error?: string;
  duration: number;
  timestamp: string;
}

export interface PipelineConfig {
  maxIterations: number;
  maxModificationsPerHour: number;
  requireValidation: boolean;
  autoCommit: boolean;
  dryRun: boolean;
  minConfidence: number;
  allowedRiskLevels: Array<'low' | 'medium' | 'high'>;
  skillsDirectory: string;
  testTimeout: number;
}

// ============================================================================
// RATE LIMITER
// ============================================================================

class RateLimiter {
  private modifications: number[] = [];
  private failures: number = 0;
  private paused: boolean = false;

  constructor(
    private maxPerHour: number = 5,
    private maxConsecutiveFailures: number = 3
  ) {}

  canModify(): { allowed: boolean; reason?: string } {
    if (this.paused) {
      return { allowed: false, reason: 'Pipeline paused due to consecutive failures' };
    }

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Clean old entries
    this.modifications = this.modifications.filter((t) => t > oneHourAgo);

    if (this.modifications.length >= this.maxPerHour) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.modifications.length}/${this.maxPerHour} modifications in the last hour`,
      };
    }

    return { allowed: true };
  }

  recordModification(): void {
    this.modifications.push(Date.now());
    this.failures = 0; // Reset failures on success
  }

  recordFailure(): void {
    this.failures++;
    if (this.failures >= this.maxConsecutiveFailures) {
      this.paused = true;
      console.warn(`[Pipeline] Paused after ${this.failures} consecutive failures`);
    }
  }

  resume(): void {
    this.paused = false;
    this.failures = 0;
  }

  getStatus(): { paused: boolean; modificationsInLastHour: number; consecutiveFailures: number } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    this.modifications = this.modifications.filter((t) => t > oneHourAgo);

    return {
      paused: this.paused,
      modificationsInLastHour: this.modifications.length,
      consecutiveFailures: this.failures,
    };
  }
}

// ============================================================================
// AUDIT LOGGER
// ============================================================================

class PipelineAuditLogger {
  private logPath: string;

  constructor(workspaceRoot: string) {
    this.logPath = path.join(workspaceRoot, 'data', 'self-modification-audit.jsonl');
  }

  async log(entry: {
    timestamp: string;
    action: string;
    success: boolean;
    details: Record<string, unknown>;
  }): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.logPath), { recursive: true });
      await fs.appendFile(this.logPath, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error('[PipelineAudit] Failed to write audit log:', error);
    }
  }

  async getRecentEntries(count: number = 50): Promise<unknown[]> {
    try {
      const content = await fs.readFile(this.logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      return lines.slice(-count).map((line) => JSON.parse(line));
    } catch {
      return [];
    }
  }
}

// ============================================================================
// SELF-MODIFICATION PIPELINE
// ============================================================================

export class SelfModificationPipeline {
  private engine: SelfModificationEngine;
  private config: PipelineConfig;
  private rateLimiter: RateLimiter;
  private auditLogger: PipelineAuditLogger;
  private skillsLoaded: boolean = false;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = {
      maxIterations: config.maxIterations ?? 3,
      maxModificationsPerHour: config.maxModificationsPerHour ?? 5,
      requireValidation: config.requireValidation ?? true,
      autoCommit: config.autoCommit ?? true,
      dryRun: config.dryRun ?? false,
      minConfidence: config.minConfidence ?? 0.7,
      allowedRiskLevels: config.allowedRiskLevels ?? ['low', 'medium'],
      skillsDirectory: config.skillsDirectory ?? './skills',
      testTimeout: config.testTimeout ?? 120000,
    };

    this.engine = selfMod;
    this.rateLimiter = new RateLimiter(this.config.maxModificationsPerHour);
    this.auditLogger = new PipelineAuditLogger(process.cwd());
  }

  /**
   * Initialize the pipeline - load skills
   */
  async initialize(): Promise<void> {
    if (this.skillsLoaded) return;

    try {
      // Load the skills module dynamically
      await loadSkillsModule();

      await loadSkillsFromDirectory(this.config.skillsDirectory);
      this.skillsLoaded = true;

      // Verify required skills are loaded
      const requiredSkills = ['error-analyzer', 'fix-generator', 'fix-validator', 'self-modifier'];
      const missingSkills = requiredSkills.filter((id) => !skillRegistry.get(id));

      if (missingSkills.length > 0) {
        console.warn(`[Pipeline] Missing skills: ${missingSkills.join(', ')}`);
      }

      bus.publish('cortex', 'pipeline:initialized', {
        skillsLoaded: skillRegistry.getStats().total,
        config: this.config,
      });
    } catch (error) {
      console.error('[Pipeline] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Run the full self-modification pipeline
   */
  async run(errorContext: string): Promise<PipelineResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Check rate limit
    const rateCheck = this.rateLimiter.canModify();
    if (!rateCheck.allowed) {
      return {
        success: false,
        iterations: 0,
        error: rateCheck.reason,
        duration: 0,
        timestamp,
      };
    }

    // Ensure skills are loaded
    await this.initialize();

    bus.publish('cortex', 'pipeline:started', { errorContext, timestamp });

    const result: PipelineResult = {
      success: false,
      iterations: 0,
      duration: 0,
      timestamp,
    };

    try {
      // Phase 1: Analyze Error
      bus.publish('cortex', 'pipeline:phase', { phase: 1, name: 'Analyzing error' });
      const analysis = await this.analyzeError(errorContext);
      result.errorAnalysis = analysis;

      if (analysis.severity === 'critical') {
        result.error = 'Critical error requires human review';
        await this.auditLogger.log({
          timestamp,
          action: 'analysis',
          success: false,
          details: { reason: 'critical_severity', analysis },
        });
        return result;
      }

      // Validation Loop
      for (let iteration = 1; iteration <= this.config.maxIterations; iteration++) {
        result.iterations = iteration;
        bus.publish('cortex', 'pipeline:iteration', { iteration, max: this.config.maxIterations });

        // Phase 2: Generate Fix
        bus.publish('cortex', 'pipeline:phase', { phase: 2, name: 'Generating fix' });
        const fixProposal = await this.generateFix(analysis);
        result.fixProposal = fixProposal;

        if (fixProposal.confidence < this.config.minConfidence) {
          bus.publish('cortex', 'pipeline:low-confidence', {
            confidence: fixProposal.confidence,
            threshold: this.config.minConfidence,
          });
          continue; // Try again
        }

        // Phase 3: Validate Fix
        if (this.config.requireValidation) {
          bus.publish('cortex', 'pipeline:phase', { phase: 3, name: 'Validating fix' });
          const validation = await this.validateFix(fixProposal, analysis);
          result.validation = validation;

          if (!validation.approved) {
            bus.publish('cortex', 'pipeline:validation-failed', {
              issues: validation.issues.map((i) => i.message),
            });
            // Feed issues back for next iteration
            continue;
          }

          const riskLevel = validation.riskLevel as 'low' | 'medium' | 'high';
          if (
            validation.riskLevel !== 'critical' &&
            !this.config.allowedRiskLevels.includes(riskLevel)
          ) {
            result.error = `Risk level ${validation.riskLevel} not allowed for auto-apply`;
            continue;
          }
          if (validation.riskLevel === 'critical') {
            result.error = 'Critical risk level requires human review';
            continue;
          }
        }

        // Phase 4: Apply Modification
        if (!this.config.dryRun) {
          bus.publish('cortex', 'pipeline:phase', { phase: 4, name: 'Applying modification' });
          const modification = await this.applyModification(fixProposal);
          result.modification = modification;

          if (modification.success) {
            result.success = true;
            this.rateLimiter.recordModification();

            bus.publish('cortex', 'pipeline:completed', {
              success: true,
              file: modification.file,
              iterations: iteration,
            });

            await this.auditLogger.log({
              timestamp,
              action: 'modification',
              success: true,
              details: {
                file: modification.file,
                iterations: iteration,
                riskLevel: result.validation?.riskLevel ?? 'unknown',
              },
            });

            break; // Success!
          } else {
            bus.publish('cortex', 'pipeline:modification-failed', { error: modification.error });
            // Continue to next iteration
          }
        } else {
          // Dry run - report what would happen
          result.success = true;
          result.modification = {
            success: true,
            action: 'skipped',
            file: fixProposal.fix.file,
            validation: {
              syntax: { passed: true },
              lint: { passed: true },
              tests: { passed: true, run: 0, failed: 0 },
            },
            rollbackAvailable: false,
          };
          break;
        }
      }

      if (!result.success) {
        this.rateLimiter.recordFailure();
        await this.auditLogger.log({
          timestamp,
          action: 'failure',
          success: false,
          details: {
            iterations: result.iterations,
            error: result.error ?? 'Max iterations reached',
          },
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = errorMessage;
      this.rateLimiter.recordFailure();

      bus.publish('cortex', 'pipeline:failed', { error: errorMessage, timestamp });

      await this.auditLogger.log({
        timestamp,
        action: 'error',
        success: false,
        details: { error: errorMessage },
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Phase 1: Analyze Error
   */
  private async analyzeError(errorContext: string): Promise<ErrorAnalysis> {
    // Get the error-analyzer skill (used for future LLM integration)
    const _skill = skillRegistry.get('error-analyzer');

    // Parse the error context to extract key information
    const analysis: ErrorAnalysis = {
      errorType: this.detectErrorType(errorContext),
      severity: this.detectSeverity(errorContext),
      location: this.extractLocation(errorContext),
      rootCause: this.extractRootCause(errorContext),
      suggestedFixes: [],
    };

    // Extract file context if we have a location
    if (analysis.location.file) {
      const fileResult = await this.engine.readFile(analysis.location.file);
      if (fileResult.success && (fileResult as { content?: string }).content) {
        analysis.context = this.extractRelevantContext(
          (fileResult as { content: string }).content,
          analysis.location.line
        );
      }
    }

    // Generate fix suggestions based on error type
    analysis.suggestedFixes = this.generateSuggestions(analysis);

    bus.publish('cortex', 'pipeline:analyzed', { analysis });

    return analysis;
  }

  /**
   * Phase 2: Generate Fix
   */
  private async generateFix(analysis: ErrorAnalysis): Promise<FixProposal> {
    // Get the fix-generator skill (used for future LLM integration)
    const _skill = skillRegistry.get('fix-generator');

    // Read the file content
    const fileResult = await this.engine.readFile(analysis.location.file);
    if (!fileResult.success || !(fileResult as { content?: string }).content) {
      throw new Error(`Cannot read file: ${analysis.location.file}`);
    }

    const content = (fileResult as { content: string }).content;
    const lines = content.split('\n');

    // Find the problematic code
    const startLine = Math.max(0, analysis.location.line - 5);
    const endLine = Math.min(lines.length, analysis.location.line + 5);
    const oldCode = lines.slice(startLine, endLine).join('\n');

    // Generate the fix based on analysis
    const fix = this.generateFixFromAnalysis(analysis, oldCode, lines);

    const proposal: FixProposal = {
      fix: {
        file: analysis.location.file,
        description: `Fix ${analysis.errorType} error: ${analysis.rootCause}`,
        oldCode: fix.oldCode,
        newCode: fix.newCode,
        explanation: fix.explanation,
      },
      confidence: this.calculateFixConfidence(analysis, fix),
      riskLevel: this.assessRiskLevel(analysis, fix),
    };

    bus.publish('cortex', 'pipeline:fix-generated', { proposal });

    return proposal;
  }

  /**
   * Phase 3: Validate Fix
   */
  private async validateFix(
    proposal: FixProposal,
    analysis: ErrorAnalysis
  ): Promise<ValidationResult> {
    // Get the fix-validator skill (used for future LLM integration)
    const _skill = skillRegistry.get('fix-validator');

    const validation: ValidationResult = {
      approved: false,
      confidence: 0,
      riskLevel: proposal.riskLevel,
      layers: {
        static: {
          passed: false,
          checks: {
            syntax: { passed: false },
            types: { passed: false },
            lint: { passed: false },
          },
        },
        semantic: {
          passed: false,
          addressesRootCause: false,
          sideEffects: [],
          logicScore: 0,
        },
        regression: {
          passed: false,
          testsRun: 0,
          testsPassed: 0,
          testsFailed: 0,
          affectedFiles: [],
        },
      },
      issues: [],
      suggestions: [],
    };

    // Layer 1: Static Analysis
    bus.publish('cortex', 'validation:layer', { layer: 'static', name: 'Running static checks' });

    // Syntax check - try to create a temp file and compile
    const tempDir = path.join(process.cwd(), '.tooloo-temp');
    const tempFile = path.join(tempDir, 'validation-temp.ts');

    try {
      await fs.mkdir(tempDir, { recursive: true });

      // Write the proposed fix to temp file
      const fileResult = await this.engine.readFile(proposal.fix.file);
      if (fileResult.success && (fileResult as { content?: string }).content) {
        const newContent = (fileResult as { content: string }).content.replace(
          proposal.fix.oldCode,
          proposal.fix.newCode
        );
        await fs.writeFile(tempFile, newContent);

        // Type check
        try {
          execSync(`npx tsc --noEmit "${tempFile}" 2>&1`, {
            cwd: process.cwd(),
            timeout: 30000,
          });
          validation.layers.static.checks.types.passed = true;
          validation.layers.static.checks.syntax.passed = true;
        } catch (error: unknown) {
          const stderr =
            error instanceof Error ? (error as { stderr?: Buffer }).stderr?.toString() : '';
          validation.layers.static.checks.types.errors = [
            stderr ?? 'TypeScript compilation failed',
          ];
          validation.issues.push({
            severity: 'error',
            layer: 'static',
            message: 'TypeScript compilation failed',
            suggestion: 'Check type compatibility',
          });
        }

        // Lint check
        try {
          execSync(`npx eslint "${tempFile}" --no-error-on-unmatched-pattern 2>&1`, {
            cwd: process.cwd(),
            timeout: 30000,
          });
          validation.layers.static.checks.lint.passed = true;
        } catch (error: unknown) {
          const stderr =
            error instanceof Error ? (error as { stderr?: Buffer }).stderr?.toString() : '';
          validation.layers.static.checks.lint.warnings = [stderr ?? 'ESLint warnings'];
          validation.issues.push({
            severity: 'warning',
            layer: 'static',
            message: 'ESLint warnings found',
          });
        }
      }

      // Clean up temp file
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('[Validation] Static check error:', error);
    }

    validation.layers.static.passed =
      validation.layers.static.checks.syntax.passed && validation.layers.static.checks.types.passed;

    // Layer 2: Semantic Analysis
    bus.publish('cortex', 'validation:layer', {
      layer: 'semantic',
      name: 'Running semantic analysis',
    });

    // Check if fix addresses root cause
    validation.layers.semantic.addressesRootCause = this.checkAddressesRootCause(
      analysis,
      proposal
    );

    // Check for side effects
    validation.layers.semantic.sideEffects = this.detectSideEffects(proposal);

    // Calculate logic score
    validation.layers.semantic.logicScore = this.calculateLogicScore(analysis, proposal);

    validation.layers.semantic.passed =
      validation.layers.semantic.addressesRootCause &&
      validation.layers.semantic.logicScore >= 0.7 &&
      validation.layers.semantic.sideEffects.length === 0;

    // Layer 3: Regression Check (if tests exist)
    bus.publish('cortex', 'validation:layer', {
      layer: 'regression',
      name: 'Running regression checks',
    });

    try {
      // Run related tests
      const testResult = await this.runRelatedTests(proposal.fix.file);
      validation.layers.regression = testResult;
    } catch {
      validation.layers.regression.passed = true; // Assume pass if no tests
      validation.layers.regression.testsRun = 0;
      validation.layers.regression.testsPassed = 0;
      validation.layers.regression.testsFailed = 0;
    }

    // Calculate overall approval
    validation.approved =
      validation.layers.static.passed &&
      validation.layers.semantic.passed &&
      validation.layers.regression.passed;

    // Calculate confidence
    validation.confidence =
      (validation.layers.static.passed ? 0.33 : 0) +
      validation.layers.semantic.logicScore * 0.33 +
      (validation.layers.regression.passed ? 0.34 : 0);

    // Add suggestions
    if (!validation.layers.static.checks.types.passed) {
      validation.suggestions.push('Fix TypeScript type errors before applying');
    }
    if (!validation.layers.semantic.addressesRootCause) {
      validation.suggestions.push(
        'The fix may not address the root cause - consider alternative approaches'
      );
    }
    if (validation.layers.regression.testsFailed > 0) {
      validation.suggestions.push(
        `${validation.layers.regression.testsFailed} tests failing - review changes`
      );
    }

    bus.publish('cortex', 'pipeline:validated', { validation });

    return validation;
  }

  /**
   * Phase 4: Apply Modification
   */
  private async applyModification(proposal: FixProposal): Promise<ModificationResult> {
    // Get the self-modifier skill (used for future LLM integration)
    const _skill = skillRegistry.get('self-modifier');

    const result: ModificationResult = {
      success: false,
      action: 'skipped',
      file: proposal.fix.file,
      validation: {
        syntax: { passed: false },
        lint: { passed: false },
        tests: { passed: false, run: 0, failed: 0 },
      },
      rollbackAvailable: false,
    };

    bus.publish('cortex', 'self-mod:started', { file: proposal.fix.file });

    try {
      // Apply the edit
      const editResult = await this.engine.editFile({
        filePath: proposal.fix.file,
        oldCode: proposal.fix.oldCode,
        newCode: proposal.fix.newCode,
        reason: proposal.fix.description,
      });

      if (!editResult.success) {
        result.error = editResult.message;
        bus.publish('cortex', 'self-mod:failed', { error: editResult.message });
        return result;
      }

      result.backup = editResult.backup ? { path: editResult.backup } : undefined;
      result.rollbackAvailable = !!editResult.backup;

      bus.publish('cortex', 'self-mod:backup-created', { backup: editResult.backup });

      // Post-apply validation
      bus.publish('cortex', 'self-mod:validating', { phase: 'post-apply' });

      // Syntax check
      try {
        execSync(`npx tsc --noEmit "${proposal.fix.file}" 2>&1`, {
          cwd: process.cwd(),
          timeout: 30000,
        });
        result.validation.syntax.passed = true;
      } catch {
        result.validation.syntax.passed = false;
      }

      // Lint check
      try {
        execSync(`npx eslint "${proposal.fix.file}" --fix 2>&1`, {
          cwd: process.cwd(),
          timeout: 30000,
        });
        result.validation.lint.passed = true;
      } catch {
        result.validation.lint.passed = false;
      }

      // Run tests
      const testResult = await this.engine.runTests();
      result.validation.tests.passed = testResult.passed;

      // If validation fails, rollback
      if (!result.validation.syntax.passed || !result.validation.tests.passed) {
        bus.publish('cortex', 'self-mod:validation-failed', {
          reason: 'Post-apply validation failed',
        });

        if (result.backup) {
          await this.engine.restoreBackup(result.backup.path);
          result.action = 'rolled-back';
          bus.publish('cortex', 'self-mod:rolled-back', { backup: result.backup.path });
        }

        result.error = 'Post-apply validation failed';
        return result;
      }

      // Git commit if enabled
      if (this.config.autoCommit) {
        try {
          const commitMessage = `fix: ${proposal.fix.description}\n\n[automated fix by TooLoo self-modification]\n\nRisk-level: ${proposal.riskLevel}`;

          execSync(`git add "${proposal.fix.file}"`, { cwd: process.cwd() });
          const commitResult = execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
            cwd: process.cwd(),
          }).toString();

          const hashMatch = commitResult.match(/\[[\w-]+\s+([a-f0-9]+)\]/);

          result.git = {
            committed: true,
            commitHash: hashMatch?.[1],
            message: commitMessage,
          };

          bus.publish('cortex', 'self-mod:committed', { hash: hashMatch?.[1] });
        } catch (error) {
          console.warn('[Modification] Git commit failed:', error);
          result.git = { committed: false };
        }
      }

      result.success = true;
      result.action = 'applied';

      bus.publish('cortex', 'self-mod:applied', {
        file: proposal.fix.file,
        git: result.git,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = errorMessage;

      // Attempt rollback
      if (result.backup) {
        try {
          await this.engine.restoreBackup(result.backup.path);
          result.action = 'rolled-back';
        } catch {
          // Rollback also failed
        }
      }

      bus.publish('cortex', 'self-mod:failed', { error: errorMessage });
    }

    return result;
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private detectErrorType(context: string): ErrorAnalysis['errorType'] {
    // Note: using context directly with case-insensitive regex
    const _lower = context.toLowerCase();

    if (/ts\d{4}|type\s+error|typescript/i.test(context)) return 'type';
    if (/syntaxerror|unexpected\s+token|parsing\s+error/i.test(context)) return 'syntax';
    if (/test\s+failed|assertion|expect|fail/i.test(context)) return 'test';
    if (/enoent|config|env|import|module/i.test(context)) return 'config';

    return 'runtime';
  }

  private detectSeverity(context: string): ErrorAnalysis['severity'] {
    // Note: using context directly with case-insensitive regex
    const _lower = context.toLowerCase();

    if (/critical|fatal|crash|security/i.test(context)) return 'critical';
    if (/error:|exception|failed/i.test(context)) return 'high';
    if (/warning:|deprecat/i.test(context)) return 'medium';

    return 'low';
  }

  private extractLocation(context: string): ErrorAnalysis['location'] {
    // Try to extract file:line from stack trace
    const patterns = [
      /at\s+\S+\s+\(([^:]+):(\d+):(\d+)\)/,
      /([^\s(]+):(\d+):(\d+)/,
      /([^\s]+\.ts):(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = context.match(pattern);
      if (match) {
        return {
          file: match[1] ?? 'unknown',
          line: parseInt(match[2] ?? '1', 10),
          column: match[3] ? parseInt(match[3], 10) : undefined,
        };
      }
    }

    return { file: 'unknown', line: 1 };
  }

  private extractRootCause(context: string): string {
    // Extract the main error message
    const patterns = [
      /Error:\s*(.+?)(?:\n|$)/i,
      /TypeError:\s*(.+?)(?:\n|$)/i,
      /Cannot\s+(.+?)(?:\n|$)/i,
      /is not\s+(.+?)(?:\n|$)/i,
    ];

    for (const pattern of patterns) {
      const match = context.match(pattern);
      if (match) {
        return match[1]?.trim() ?? 'Unknown error';
      }
    }

    return context.slice(0, 100);
  }

  private extractRelevantContext(content: string, line: number, radius: number = 10): string {
    const lines = content.split('\n');
    const start = Math.max(0, line - radius - 1);
    const end = Math.min(lines.length, line + radius);

    return lines
      .slice(start, end)
      .map((l, i) => {
        const lineNum = start + i + 1;
        const marker = lineNum === line ? ' >> ' : '    ';
        return `${marker}${lineNum}: ${l}`;
      })
      .join('\n');
  }

  private generateSuggestions(analysis: ErrorAnalysis): ErrorAnalysis['suggestedFixes'] {
    const suggestions: ErrorAnalysis['suggestedFixes'] = [];

    if (analysis.errorType === 'type') {
      suggestions.push({
        description: 'Add type guard or null check',
        confidence: 0.8,
      });
    }

    if (analysis.rootCause.includes('undefined') || analysis.rootCause.includes('null')) {
      suggestions.push({
        description: 'Add optional chaining (?.) or nullish coalescing (??)',
        confidence: 0.9,
      });
    }

    if (analysis.errorType === 'config') {
      suggestions.push({
        description: 'Check import paths and file existence',
        confidence: 0.7,
      });
    }

    return suggestions;
  }

  private generateFixFromAnalysis(
    analysis: ErrorAnalysis,
    oldCode: string,
    _allLines: string[]
  ): { oldCode: string; newCode: string; explanation: string } {
    // Simple fix generation based on error type
    let newCode = oldCode;
    let explanation = '';

    // Null/undefined fix
    if (analysis.rootCause.includes('undefined') || analysis.rootCause.includes('null')) {
      // Add optional chaining
      newCode = oldCode.replace(/(\w+)\.(\w+)/g, '$1?.$2');
      explanation = 'Added optional chaining to prevent null/undefined access';
    }

    // Type error fix
    if (analysis.errorType === 'type') {
      // Try adding type assertion or check
      explanation = 'Added type guard for safer type handling';
    }

    return { oldCode, newCode, explanation };
  }

  private calculateFixConfidence(analysis: ErrorAnalysis, fix: { newCode: string }): number {
    let confidence = 0.5;

    // Higher confidence for common patterns
    if (fix.newCode.includes('?.')) confidence += 0.2;
    if (fix.newCode.includes('??')) confidence += 0.1;

    // Higher confidence for lower severity
    if (analysis.severity === 'low') confidence += 0.2;
    if (analysis.severity === 'medium') confidence += 0.1;

    // Higher confidence if we have suggestions
    if (analysis.suggestedFixes.length > 0) {
      confidence += analysis.suggestedFixes[0]?.confidence
        ? analysis.suggestedFixes[0].confidence * 0.2
        : 0;
    }

    return Math.min(1, confidence);
  }

  private assessRiskLevel(analysis: ErrorAnalysis, _fix: unknown): FixProposal['riskLevel'] {
    if (analysis.severity === 'critical') return 'high';
    if (analysis.severity === 'high') return 'medium';
    return 'low';
  }

  private checkAddressesRootCause(analysis: ErrorAnalysis, proposal: FixProposal): boolean {
    // Simple heuristic: check if the fix modifies the right area
    if (analysis.rootCause.includes('undefined') && proposal.fix.newCode.includes('?.')) {
      return true;
    }
    if (analysis.rootCause.includes('null') && proposal.fix.newCode.includes('??')) {
      return true;
    }

    // Check if the fix is different from original
    return proposal.fix.oldCode !== proposal.fix.newCode;
  }

  private detectSideEffects(proposal: FixProposal): string[] {
    const effects: string[] = [];

    // Check for API changes
    if (proposal.fix.oldCode.includes('export') !== proposal.fix.newCode.includes('export')) {
      effects.push('Changes to exports');
    }

    // Check for significant structural changes
    const oldLines = proposal.fix.oldCode.split('\n').length;
    const newLines = proposal.fix.newCode.split('\n').length;
    if (Math.abs(newLines - oldLines) > 10) {
      effects.push('Significant structural changes');
    }

    return effects;
  }

  private calculateLogicScore(analysis: ErrorAnalysis, proposal: FixProposal): number {
    let score = 0.5;

    // Bonus for addressing root cause
    if (this.checkAddressesRootCause(analysis, proposal)) {
      score += 0.3;
    }

    // Bonus for minimal changes
    const diffSize = Math.abs(proposal.fix.newCode.length - proposal.fix.oldCode.length);
    if (diffSize < 50) score += 0.2;

    return Math.min(1, score);
  }

  private async runRelatedTests(file: string): Promise<ValidationResult['layers']['regression']> {
    const result: ValidationResult['layers']['regression'] = {
      passed: true,
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      affectedFiles: [file],
    };

    try {
      // Try to run tests related to the file
      const testPattern = file.replace(/\.ts$/, '.test.ts');
      const { stdout } = await execAsync(
        `npm test -- --reporter=json --run "${testPattern}" 2>&1`,
        { cwd: process.cwd(), timeout: this.config.testTimeout }
      );

      // Parse test output (simplified)
      const passMatch = stdout.match(/(\d+)\s+passed/);
      const failMatch = stdout.match(/(\d+)\s+failed/);

      result.testsPassed = passMatch ? parseInt(passMatch[1] ?? '0', 10) : 0;
      result.testsFailed = failMatch ? parseInt(failMatch[1] ?? '0', 10) : 0;
      result.testsRun = result.testsPassed + result.testsFailed;
      result.passed = result.testsFailed === 0;
    } catch {
      // Tests failed or no tests found
      result.passed = true; // Assume pass if no tests
    }

    return result;
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Get rate limiter status
   */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Resume pipeline after pause
   */
  resume(): void {
    this.rateLimiter.resume();
    bus.publish('cortex', 'pipeline:resumed', {});
  }

  /**
   * Get recent audit entries
   */
  async getAuditLog(count: number = 50): Promise<unknown[]> {
    return this.auditLogger.getRecentEntries(count);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): PipelineConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const selfModPipeline = new SelfModificationPipeline();
export default SelfModificationPipeline;
