// @version 3.3.194
/**
 * TooLoo Autonomous Self-Modification System
 *
 * This module bridges AI-generated code suggestions to actual file modifications.
 * When TooLoo generates code in a chat response, this system can automatically
 * apply those changes to the codebase.
 *
 * FLOW:
 * 1. AI generates response with code blocks
 * 2. AutonomousModifier parses code blocks, identifies target files
 * 3. Validation gates check safety (TypeScript, tests)
 * 4. SelfModificationEngine applies changes with backups
 * 5. Post-modification verification ensures system stability
 *
 * V3.3.194 SANDBOXED EXECUTION:
 * - New sandboxedApply() routes changes through reflection sandbox first
 * - Execute→Test→Refine loop validates changes before production
 * - Handoff protocol promotes validated changes safely
 *
 * SAFETY LAYERS:
 * - Pre-flight: TypeScript compilation check
 * - Protected files require explicit approval
 * - Automatic rollback on test failures
 * - Full modification audit log
 * - Git integration for version control
 * - Sandbox validation for high-risk changes
 *
 * @module cortex/motor/autonomous-modifier
 */

import { selfMod, SelfModResult, CodeEdit } from './self-modification.js';
import { bus } from '../../core/event-bus.js';
import { execSync } from 'child_process';
import {
  reflectionLoop,
  ReflectionResult,
  CodeChange,
} from '../self-modification/reflection-loop.js';

// ============================================================================
// TYPES
// ============================================================================

export interface CodeSuggestion {
  /** The target file path (relative to workspace root) */
  filePath: string;
  /** The language/type of the code block */
  language: string;
  /** The suggested code content */
  code: string;
  /** Whether this is a new file or edit to existing */
  operation: 'create' | 'edit' | 'replace' | 'append';
  /** Confidence score 0-1 */
  confidence: number;
  /** Reason for the modification */
  reason: string;
  /** Code to find/replace (for edit operations) */
  oldCode?: string;
}

export interface ModificationResult {
  success: boolean;
  applied: number;
  failed: number;
  rolledBack: boolean;
  results: Array<{
    suggestion: CodeSuggestion;
    result: SelfModResult;
  }>;
  validationPassed: boolean;
  testsPassed?: boolean;
  error?: string;
}

export interface SandboxedModificationResult {
  /** Overall success */
  success: boolean;
  /** Status from reflection loop */
  status: 'success' | 'partial' | 'failed' | 'aborted';
  /** Number of refinement iterations */
  iterations: number;
  /** Tests that passed */
  testsPassed: number;
  /** Total tests run */
  testsTotal: number;
  /** Commit hash in sandbox */
  commitHash: string | null;
  /** Ready to promote to production? */
  readyForPromotion: boolean;
  /** Git diff of changes */
  diff: string | null;
  /** Summary message */
  summary: string;
  /** Full reflection result */
  reflectionResult: ReflectionResult;
}

export interface ApprovalStatus {
  approved: boolean;
  requiresHumanApproval: boolean;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ModificationConfig {
  /** Auto-apply low-risk changes without approval */
  autoApplyLowRisk: boolean;
  /** Run tests after modifications */
  runTestsAfterMod: boolean;
  /** TypeScript check before applying */
  typeCheckBeforeMod: boolean;
  /** Auto-rollback on test failure */
  autoRollbackOnFailure: boolean;
  /** Files that always require human approval */
  protectedPatterns: RegExp[];
  /** Maximum number of files to modify in one batch */
  maxBatchSize: number;
  /** Minimum confidence to auto-apply */
  minAutoApplyConfidence: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: ModificationConfig = {
  // V3.3.182: ALL changes require explicit approval - no auto-apply
  autoApplyLowRisk: false,
  runTestsAfterMod: true,
  typeCheckBeforeMod: true,
  autoRollbackOnFailure: true,
  protectedPatterns: [
    /^\.env/,
    /package\.json$/,
    /tsconfig\.json$/,
    /src\/main\.ts$/,
    /autonomous-modifier\.ts$/,
    /self-modification\.ts$/,
  ],
  maxBatchSize: 10,
  // Set to impossible threshold - EVERYTHING requires approval
  minAutoApplyConfidence: 2.0,
};

// ============================================================================
// CODE SUGGESTION PARSER
// ============================================================================

/**
 * Extract code suggestions from AI-generated text
 */
export function parseCodeSuggestions(aiResponse: string): CodeSuggestion[] {
  const suggestions: CodeSuggestion[] = [];

  // Pattern 1: Explicit file path in code block header
  // ```typescript:src/path/to/file.ts or ```ts // filepath: src/path/to/file.ts
  const explicitPathPattern = /```(\w+)(?::|[\s]*\/\/\s*filepath:\s*)([^\n`]+)\n([\s\S]*?)```/gi;

  let match;
  while ((match = explicitPathPattern.exec(aiResponse)) !== null) {
    const language = match[1];
    const filePath = match[2];
    const code = match[3];
    if (language && filePath && code) {
      suggestions.push({
        filePath: filePath.trim(),
        language: language.toLowerCase(),
        code: code.trim(),
        operation: 'replace',
        confidence: 0.9,
        reason: 'Explicit file path in code block',
      });
    }
  }

  // Pattern 2: File creation suggestion
  // "Create file `src/path/file.ts`:" followed by code block
  const createPattern =
    /(?:create|add|make|new)\s+(?:file|module)?\s*[`"]?([^`"\n:]+\.\w+)[`"]?\s*:?\s*\n*```(\w+)\n([\s\S]*?)```/gi;

  while ((match = createPattern.exec(aiResponse)) !== null) {
    const filePath = match[1];
    const language = match[2];
    const code = match[3];
    if (filePath && language && code && !suggestions.some((s) => s.filePath === filePath.trim())) {
      suggestions.push({
        filePath: filePath.trim(),
        language: language.toLowerCase(),
        code: code.trim(),
        operation: 'create',
        confidence: 0.85,
        reason: 'File creation suggestion',
      });
    }
  }

  // Pattern 3: Edit suggestion with old/new code
  // "In `file.ts`, replace:" ... "with:" ...
  const editPattern =
    /(?:in|edit|modify|update|change)\s+[`"]?([^`"\n]+\.\w+)[`"]?\s*,?\s*(?:replace|change)[\s\S]*?```(\w+)\n([\s\S]*?)```[\s\S]*?(?:with|to)[\s\S]*?```\2\n([\s\S]*?)```/gi;

  while ((match = editPattern.exec(aiResponse)) !== null) {
    const filePath = match[1];
    const language = match[2];
    const oldCode = match[3];
    const newCode = match[4];
    if (
      filePath &&
      language &&
      oldCode &&
      newCode &&
      !suggestions.some((s) => s.filePath === filePath.trim())
    ) {
      suggestions.push({
        filePath: filePath.trim(),
        language: language.toLowerCase(),
        code: newCode.trim(),
        oldCode: oldCode.trim(),
        operation: 'edit',
        confidence: 0.85,
        reason: 'Edit with old/new code provided',
      });
    }
  }

  // Pattern 4: Contextual file inference from comments
  // // In src/path/file.ts or /* file: src/path/file.ts */
  const commentPathPattern =
    /```(\w+)\n(?:\/\/|\/\*)\s*(?:in|file:?)\s*([^\n*]+\.\w+)[\s\S]*?\n([\s\S]*?)```/gi;

  while ((match = commentPathPattern.exec(aiResponse)) !== null) {
    const language = match[1];
    const filePath = match[2];
    const code = match[3];
    if (language && filePath && code && !suggestions.some((s) => s.filePath === filePath.trim())) {
      suggestions.push({
        filePath: filePath.trim(),
        language: language.toLowerCase(),
        code: code.trim(),
        operation: 'replace',
        confidence: 0.75,
        reason: 'File path in code comment',
      });
    }
  }

  return suggestions;
}

// ============================================================================
// AUTONOMOUS MODIFIER ENGINE
// ============================================================================

export class AutonomousModifier {
  private config: ModificationConfig;
  private pendingApprovals: Map<string, CodeSuggestion[]> = new Map();
  private modificationHistory: ModificationResult[] = [];

  constructor(config: Partial<ModificationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Listen for approval events
    bus.on('self-mod:approval-received', this.handleApproval.bind(this));
  }

  // --------------------------------------------------------------------------
  // RISK ASSESSMENT
  // --------------------------------------------------------------------------

  /**
   * Assess the risk level of a modification
   */
  assessRisk(suggestion: CodeSuggestion): ApprovalStatus {
    const { filePath, operation, confidence } = suggestion;

    // Check against protected patterns
    const isProtected = this.config.protectedPatterns.some((p) => p.test(filePath));

    if (isProtected) {
      return {
        approved: false,
        requiresHumanApproval: true,
        reason: `Protected file: ${filePath}`,
        riskLevel: 'critical',
      };
    }

    // Check confidence threshold
    if (confidence < this.config.minAutoApplyConfidence) {
      return {
        approved: false,
        requiresHumanApproval: true,
        reason: `Low confidence: ${(confidence * 100).toFixed(0)}%`,
        riskLevel: 'high',
      };
    }

    // Check operation type
    if (operation === 'create') {
      return {
        approved: this.config.autoApplyLowRisk,
        requiresHumanApproval: !this.config.autoApplyLowRisk,
        reason: 'New file creation',
        riskLevel: 'low',
      };
    }

    if (operation === 'edit' && suggestion.oldCode) {
      return {
        approved: this.config.autoApplyLowRisk,
        requiresHumanApproval: !this.config.autoApplyLowRisk,
        reason: 'Targeted edit with context',
        riskLevel: 'low',
      };
    }

    if (operation === 'replace') {
      return {
        approved: false,
        requiresHumanApproval: true,
        reason: 'Full file replacement',
        riskLevel: 'medium',
      };
    }

    return {
      approved: false,
      requiresHumanApproval: true,
      reason: 'Unknown operation type',
      riskLevel: 'high',
    };
  }

  // --------------------------------------------------------------------------
  // VALIDATION
  // --------------------------------------------------------------------------

  /**
   * Run TypeScript compilation check
   */
  async validateTypeScript(): Promise<{ passed: boolean; errors: string }> {
    try {
      execSync('npx tsc --noEmit 2>&1', {
        cwd: process.cwd(),
        timeout: 60000,
        encoding: 'utf-8',
      });
      return { passed: true, errors: '' };
    } catch (error: any) {
      return {
        passed: false,
        errors: error.stdout || error.message,
      };
    }
  }

  /**
   * Run tests (optional pattern)
   */
  async runTests(pattern?: string): Promise<{ passed: boolean; output: string }> {
    try {
      const cmd = pattern ? `npm test -- --grep "${pattern}"` : 'npm test';
      const output = execSync(`${cmd} 2>&1`, {
        cwd: process.cwd(),
        timeout: 120000,
        encoding: 'utf-8',
      });
      return { passed: true, output };
    } catch (error: any) {
      return {
        passed: false,
        output: error.stdout || error.message,
      };
    }
  }

  // --------------------------------------------------------------------------
  // MODIFICATION EXECUTION
  // --------------------------------------------------------------------------

  /**
   * Process AI response and extract/apply modifications
   */
  async processAIResponse(
    aiResponse: string,
    context: { sessionId: string; userQuery: string }
  ): Promise<ModificationResult> {
    console.log('[AutonomousMod] Processing AI response for code suggestions...');

    // Extract suggestions
    const suggestions = parseCodeSuggestions(aiResponse);

    if (suggestions.length === 0) {
      return {
        success: true,
        applied: 0,
        failed: 0,
        rolledBack: false,
        results: [],
        validationPassed: true,
      };
    }

    console.log(`[AutonomousMod] Found ${suggestions.length} code suggestions`);

    // Check batch size
    if (suggestions.length > this.config.maxBatchSize) {
      return {
        success: false,
        applied: 0,
        failed: 0,
        rolledBack: false,
        results: [],
        validationPassed: false,
        error: `Too many modifications (${suggestions.length}). Max batch size: ${this.config.maxBatchSize}`,
      };
    }

    // Assess risk for each suggestion
    const approvedSuggestions: CodeSuggestion[] = [];
    const pendingSuggestions: CodeSuggestion[] = [];

    for (const suggestion of suggestions) {
      const status = this.assessRisk(suggestion);
      console.log(
        `[AutonomousMod] ${suggestion.filePath}: ${status.riskLevel} risk, ${status.approved ? 'auto-approved' : 'pending approval'}`
      );

      if (status.approved) {
        approvedSuggestions.push(suggestion);
      } else {
        pendingSuggestions.push(suggestion);
      }
    }

    // Queue pending for approval
    if (pendingSuggestions.length > 0) {
      this.pendingApprovals.set(context.sessionId, pendingSuggestions);
      bus.publish('cortex', 'self-mod:approval-needed', {
        sessionId: context.sessionId,
        suggestions: pendingSuggestions.map((s) => ({
          filePath: s.filePath,
          operation: s.operation,
          reason: s.reason,
          risk: this.assessRisk(s).riskLevel,
        })),
      });
    }

    // Apply approved suggestions
    return this.applySuggestions(approvedSuggestions, context);
  }

  /**
   * Apply a batch of suggestions with validation
   */
  async applySuggestions(
    suggestions: CodeSuggestion[],
    context: { sessionId: string; userQuery: string }
  ): Promise<ModificationResult> {
    if (suggestions.length === 0) {
      return {
        success: true,
        applied: 0,
        failed: 0,
        rolledBack: false,
        results: [],
        validationPassed: true,
      };
    }

    console.log(`[AutonomousMod] Applying ${suggestions.length} modifications...`);

    // Pre-flight TypeScript check
    if (this.config.typeCheckBeforeMod) {
      const tsCheck = await this.validateTypeScript();
      if (!tsCheck.passed) {
        console.warn('[AutonomousMod] Pre-flight TypeScript check failed (continuing anyway)');
      }
    }

    const results: Array<{ suggestion: CodeSuggestion; result: SelfModResult }> = [];
    const backups: string[] = [];

    for (const suggestion of suggestions) {
      let result: SelfModResult;

      try {
        if (suggestion.operation === 'create') {
          result = await selfMod.createFile(
            suggestion.filePath,
            suggestion.code,
            suggestion.reason
          );
        } else if (suggestion.operation === 'edit' && suggestion.oldCode) {
          result = await selfMod.editFile({
            filePath: suggestion.filePath,
            oldCode: suggestion.oldCode,
            newCode: suggestion.code,
            reason: suggestion.reason,
          });
        } else {
          // Replace: read file, replace content
          const readResult = await selfMod.readFile(suggestion.filePath);
          if (readResult.success && readResult.content) {
            result = await selfMod.editFile({
              filePath: suggestion.filePath,
              oldCode: readResult.content,
              newCode: suggestion.code,
              reason: suggestion.reason,
            });
          } else {
            // File doesn't exist, create it
            result = await selfMod.createFile(
              suggestion.filePath,
              suggestion.code,
              suggestion.reason
            );
          }
        }

        if (result.backup) {
          backups.push(result.backup);
        }

        results.push({ suggestion, result });
        console.log(
          `[AutonomousMod] ${result.success ? '✅' : '❌'} ${suggestion.filePath}: ${result.message}`
        );
      } catch (error: any) {
        results.push({
          suggestion,
          result: {
            success: false,
            message: `Exception: ${error.message}`,
            error: error.message,
          },
        });
      }
    }

    const applied = results.filter((r) => r.result.success).length;
    const failed = results.filter((r) => !r.result.success).length;

    // Post-modification TypeScript check
    let validationPassed = true;
    if (this.config.typeCheckBeforeMod && applied > 0) {
      const tsCheck = await this.validateTypeScript();
      validationPassed = tsCheck.passed;

      if (!tsCheck.passed && this.config.autoRollbackOnFailure) {
        console.error('[AutonomousMod] TypeScript check failed, rolling back...');
        for (const backup of backups) {
          await selfMod.restoreBackup(backup);
        }
        return {
          success: false,
          applied: 0,
          failed: suggestions.length,
          rolledBack: true,
          results,
          validationPassed: false,
          error: `TypeScript errors: ${tsCheck.errors.substring(0, 500)}`,
        };
      }
    }

    // Run tests if configured
    let testsPassed: boolean | undefined;
    if (this.config.runTestsAfterMod && applied > 0) {
      const testResult = await this.runTests();
      testsPassed = testResult.passed;

      if (!testResult.passed && this.config.autoRollbackOnFailure) {
        console.error('[AutonomousMod] Tests failed, rolling back...');
        for (const backup of backups) {
          await selfMod.restoreBackup(backup);
        }
        return {
          success: false,
          applied: 0,
          failed: suggestions.length,
          rolledBack: true,
          results,
          validationPassed,
          testsPassed: false,
          error: `Test failures: ${testResult.output.substring(0, 500)}`,
        };
      }
    }

    // Emit success event
    bus.publish('cortex', 'self-mod:batch-applied', {
      sessionId: context.sessionId,
      applied,
      failed,
      files: suggestions.map((s) => s.filePath),
    });

    const modResult: ModificationResult = {
      success: failed === 0,
      applied,
      failed,
      rolledBack: false,
      results,
      validationPassed,
      testsPassed,
    };

    this.modificationHistory.push(modResult);
    return modResult;
  }

  // --------------------------------------------------------------------------
  // APPROVAL HANDLING
  // --------------------------------------------------------------------------

  /**
   * Handle approval response for pending modifications
   */
  private async handleApproval(data: {
    sessionId: string;
    approved: boolean;
    selectedFiles?: string[];
  }) {
    const pending = this.pendingApprovals.get(data.sessionId);
    if (!pending) return;

    if (data.approved) {
      const toApply = data.selectedFiles
        ? pending.filter((s) => data.selectedFiles!.includes(s.filePath))
        : pending;

      await this.applySuggestions(toApply, {
        sessionId: data.sessionId,
        userQuery: 'Approved modifications',
      });
    }

    this.pendingApprovals.delete(data.sessionId);
  }

  /**
   * Get pending approvals for a session
   */
  getPendingApprovals(sessionId: string): CodeSuggestion[] {
    return this.pendingApprovals.get(sessionId) || [];
  }

  /**
   * Approve specific modifications
   */
  async approveModifications(
    sessionId: string,
    filePathsOrAll: string[] | 'all'
  ): Promise<ModificationResult> {
    const pending = this.pendingApprovals.get(sessionId);
    if (!pending || pending.length === 0) {
      return {
        success: true,
        applied: 0,
        failed: 0,
        rolledBack: false,
        results: [],
        validationPassed: true,
        error: 'No pending modifications',
      };
    }

    const toApply =
      filePathsOrAll === 'all'
        ? pending
        : pending.filter((s) => filePathsOrAll.includes(s.filePath));

    this.pendingApprovals.delete(sessionId);

    return this.applySuggestions(toApply, {
      sessionId,
      userQuery: 'Manual approval',
    });
  }

  /**
   * Reject pending modifications
   */
  rejectModifications(sessionId: string): void {
    this.pendingApprovals.delete(sessionId);
    bus.publish('cortex', 'self-mod:rejected', { sessionId });
  }

  // --------------------------------------------------------------------------
  // DIRECT API
  // --------------------------------------------------------------------------

  /**
   * Directly apply a code modification (bypass AI parsing)
   */
  async applyDirectModification(
    filePath: string,
    code: string,
    operation: 'create' | 'edit' | 'replace',
    options: {
      oldCode?: string;
      reason?: string;
      skipValidation?: boolean;
    } = {}
  ): Promise<SelfModResult> {
    const suggestion: CodeSuggestion = {
      filePath,
      language: filePath.split('.').pop() || 'txt',
      code,
      operation,
      confidence: 1.0,
      reason: options.reason || 'Direct modification',
      oldCode: options.oldCode,
    };

    if (options.skipValidation) {
      // Direct apply without validation
      if (operation === 'create') {
        return selfMod.createFile(filePath, code, suggestion.reason);
      } else if (operation === 'edit' && options.oldCode) {
        return selfMod.editFile({
          filePath,
          oldCode: options.oldCode,
          newCode: code,
          reason: suggestion.reason,
        });
      } else {
        const readResult = await selfMod.readFile(filePath);
        if (readResult.success && readResult.content) {
          return selfMod.editFile({
            filePath,
            oldCode: readResult.content,
            newCode: code,
            reason: suggestion.reason,
          });
        }
        return selfMod.createFile(filePath, code, suggestion.reason);
      }
    }

    const result = await this.applySuggestions([suggestion], {
      sessionId: 'direct',
      userQuery: 'Direct API call',
    });

    return (
      result.results[0]?.result || {
        success: false,
        message: 'No result returned',
      }
    );
  }

  // --------------------------------------------------------------------------
  // SANDBOXED EXECUTION (V3.3.194)
  // --------------------------------------------------------------------------

  /**
   * Apply modifications through reflection sandbox first
   * Uses execute→test→refine loop before promoting to production
   */
  async sandboxedApply(
    suggestions: CodeSuggestion[],
    context: {
      sessionId: string;
      userQuery: string;
      objective?: string;
      maxIterations?: number;
      autoPromote?: boolean;
    }
  ): Promise<SandboxedModificationResult> {
    console.log(`[AutonomousMod] Sandboxed apply: ${suggestions.length} suggestions`);

    // Convert suggestions to CodeChange format for reflection loop
    const changes: CodeChange[] = suggestions.map((s) => ({
      filePath: s.filePath,
      operation: s.operation === 'replace' ? 'edit' : s.operation,
      oldContent: s.oldCode,
      newContent: s.code,
      reason: s.reason,
    }));

    // Build context string with code blocks
    const contextString = changes
      .map((c) => `\`\`\`typescript:${c.filePath}\n${c.newContent}\n\`\`\``)
      .join('\n\n');

    // Execute reflection loop
    const result = await reflectionLoop.execute({
      objective: context.objective || context.userQuery,
      targetFiles: suggestions.map((s) => s.filePath),
      context: contextString,
      maxIterations: context.maxIterations || 3,
      autoPromote: context.autoPromote ?? false,
    });

    // Convert to SandboxedModificationResult
    const sandboxResult: SandboxedModificationResult = {
      success: result.status === 'success',
      status: result.status,
      iterations: result.totalIterations,
      testsPassed: result.finalTestResult
        ? result.finalTestResult.total - result.finalTestResult.failed
        : 0,
      testsTotal: result.finalTestResult?.total || 0,
      commitHash: result.commitHash,
      readyForPromotion: result.readyForPromotion,
      diff: result.diff,
      summary: result.summary,
      reflectionResult: result,
    };

    // Emit event
    bus.publish('cortex', 'self-mod:sandboxed-complete', {
      sessionId: context.sessionId,
      status: result.status,
      readyForPromotion: result.readyForPromotion,
      commitHash: result.commitHash,
    });

    return sandboxResult;
  }

  /**
   * Promote sandboxed changes to production
   * Only call after sandboxedApply returns readyForPromotion: true
   */
  async promoteFromSandbox(
    commitHash: string,
    context: { sessionId: string; reason: string }
  ): Promise<ModificationResult> {
    console.log(`[AutonomousMod] Promoting sandbox commit: ${commitHash}`);

    // Get diff from sandbox
    const diff = await reflectionLoop.getDiff(commitHash);
    if (!diff) {
      return {
        success: false,
        applied: 0,
        failed: 0,
        rolledBack: false,
        results: [],
        validationPassed: false,
        error: 'Could not retrieve diff from sandbox',
      };
    }

    // Parse diff to extract file changes
    const suggestions = this.parseDiffToSuggestions(diff);

    // Apply to production using standard flow (with backups)
    const result = await this.applySuggestions(suggestions, {
      sessionId: context.sessionId,
      userQuery: `Promoted from sandbox: ${context.reason}`,
    });

    if (result.success) {
      bus.publish('cortex', 'self-mod:promoted', {
        sessionId: context.sessionId,
        commitHash,
        filesApplied: result.applied,
      });
    }

    return result;
  }

  /**
   * Parse git diff output to code suggestions
   */
  private parseDiffToSuggestions(diff: string): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];

    // Split by file headers
    const filePattern = /diff --git a\/(.+?) b\/(.+?)[\r\n]/g;
    const files = diff.split(/(?=diff --git)/);

    for (const fileDiff of files) {
      const headerMatch = /diff --git a\/(.+?) b\/(.+?)/.exec(fileDiff);
      if (!headerMatch) continue;

      const filePath = headerMatch[2];

      // Extract new file content (lines starting with +, excluding header)
      const lines = fileDiff.split('\n');
      const newLines: string[] = [];
      let inContent = false;

      for (const line of lines) {
        if (line.startsWith('@@')) {
          inContent = true;
          continue;
        }
        if (!inContent) continue;

        if (line.startsWith('+') && !line.startsWith('+++')) {
          newLines.push(line.slice(1));
        } else if (!line.startsWith('-')) {
          newLines.push(line);
        }
      }

      if (newLines.length > 0) {
        suggestions.push({
          filePath,
          language: filePath.split('.').pop() || 'txt',
          code: newLines.join('\n'),
          operation: 'replace',
          confidence: 1.0,
          reason: 'Promoted from sandbox',
        });
      }
    }

    return suggestions;
  }

  // --------------------------------------------------------------------------
  // STATUS & HISTORY
  // --------------------------------------------------------------------------

  /**
   * Get modification history
   */
  getHistory(): ModificationResult[] {
    return [...this.modificationHistory];
  }

  /**
   * Get current configuration
   */
  getConfig(): ModificationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ModificationConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const autonomousMod = new AutonomousModifier();
export default AutonomousModifier;
