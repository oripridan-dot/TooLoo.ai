// @version 3.3.401
/* eslint-disable no-console */
/**
 * TooLoo Automated Execution Pipeline
 *
 * A fully automated, self-correcting execution system that:
 * 1. Receives code or objectives
 * 2. Automatically prepares and validates input
 * 3. Executes with proper file-based sandboxing (not eval)
 * 4. Self-corrects on failures using AI error feedback
 * 5. **NEW: Recalls past experiences to inform fixes**
 * 6. Returns clean results with full execution traces
 *
 * OODA Loop Implementation:
 * - Observe: Capture stdout/stderr from execution
 * - Orient: Analyze error patterns and context + RECALL past experiences
 * - Decide: Generate fix suggestions via AI (informed by memory)
 * - Act: Apply fixes and re-execute
 * - **Learn: Record outcome for future recall**
 *
 * This is TooLoo's internal execution engine - it handles all the complexity
 * so the user just sees results.
 *
 * @module cortex/agent/automated-execution-pipeline
 */

import { spawn, SpawnOptions } from 'child_process';
import fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { bus } from '../../core/event-bus.js';
import { precog } from '../../precog/index.js';
import { VectorStore } from '../memory/vector-store.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ExecutionInput {
  /** Code to execute */
  code?: string;
  /** Natural language objective (generates code if no code provided) */
  objective?: string;
  /** Programming language */
  language?: 'javascript' | 'typescript' | 'python' | 'bash';
  /** Additional context */
  context?: Record<string, unknown>;
  /** Timeout in ms */
  timeout?: number;
  /** Max auto-fix attempts */
  maxRetries?: number;
  /** Use Docker sandbox for secure execution */
  useSandbox?: boolean;
}

export interface ExecutionOutput {
  /** Success status */
  success: boolean;
  /** Execution output (stdout) */
  output: string;
  /** Error output (stderr) */
  error: string;
  /** Exit code */
  exitCode: number;
  /** Code that was executed */
  executedCode: string;
  /** Language used */
  language: string;
  /** Number of attempts */
  attempts: number;
  /** Duration in ms */
  durationMs: number;
  /** Execution phases completed */
  phases: ExecutionPhase[];
  /** Error analysis from AI (if auto-fix was attempted) */
  errorAnalysis?: ErrorAnalysis;
}

export interface ExecutionPhase {
  name: string;
  status: 'success' | 'failed' | 'skipped';
  durationMs: number;
  message: string;
}

/** Structured error analysis for learning */
export interface ErrorAnalysis {
  /** Type of error */
  errorType: 'syntax' | 'runtime' | 'logic' | 'import' | 'timeout' | 'unknown';
  /** Root cause identified by AI */
  rootCause: string;
  /** Fix that was attempted */
  fixAttempted: string;
  /** Whether the fix was successful */
  fixSuccessful: boolean;
  /** Confidence in analysis (0-1) */
  confidence: number;
}

// ============================================================================
// AUTOMATED EXECUTION PIPELINE
// ============================================================================

export class AutomatedExecutionPipeline {
  private static instance: AutomatedExecutionPipeline;
  private tempDir: string;
  private initialized = false;
  /** VectorStore for experience-based learning and recall */
  private vectorStore: VectorStore;

  private readonly DEFAULT_TIMEOUT = 30000;
  private readonly DEFAULT_MAX_RETRIES = 3;

  private constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'execution');
    this.vectorStore = new VectorStore(process.cwd());
  }

  static getInstance(): AutomatedExecutionPipeline {
    if (!AutomatedExecutionPipeline.instance) {
      AutomatedExecutionPipeline.instance = new AutomatedExecutionPipeline();
    }
    return AutomatedExecutionPipeline.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await fs.ensureDir(this.tempDir);
    await this.vectorStore.initialize();
    this.initialized = true;
    console.log('[AutomatedPipeline] Initialized with memory recall enabled');
  }

  // --------------------------------------------------------------------------
  // MAIN EXECUTION METHOD
  // --------------------------------------------------------------------------

  /**
   * Execute code or objective with full automation
   * This is the single entry point - it handles everything
   */
  async execute(input: ExecutionInput): Promise<ExecutionOutput> {
    await this.initialize();

    const startTime = Date.now();
    const executionId = uuidv4();
    const phases: ExecutionPhase[] = [];

    const timeout = input.timeout || this.DEFAULT_TIMEOUT;
    const maxRetries = input.maxRetries || this.DEFAULT_MAX_RETRIES;
    let language = input.language || 'javascript';
    let code = input.code || '';

    console.log(`[AutomatedPipeline] Starting execution ${executionId}`);

    // =========================================================================
    // PHASE 1: CODE PREPARATION
    // =========================================================================
    const prepStart = Date.now();
    try {
      if (!code && input.objective) {
        // Generate code from objective
        console.log(
          `[AutomatedPipeline] Generating code for: ${input.objective.substring(0, 50)}...`
        );
        const generated = await this.generateCode(input.objective, language);
        code = generated.code;
        language = generated.language as any;

        phases.push({
          name: 'code-generation',
          status: 'success',
          durationMs: Date.now() - prepStart,
          message: `Generated ${language} code (${code.length} chars)`,
        });
      } else if (code) {
        // Validate and clean existing code
        code = this.cleanCode(code, language);
        phases.push({
          name: 'code-preparation',
          status: 'success',
          durationMs: Date.now() - prepStart,
          message: 'Code prepared for execution',
        });
      } else {
        return this.createErrorResult(
          'No code or objective provided',
          language,
          phases,
          Date.now() - startTime
        );
      }
    } catch (error: any) {
      phases.push({
        name: 'code-preparation',
        status: 'failed',
        durationMs: Date.now() - prepStart,
        message: error.message,
      });
      return this.createErrorResult(
        `Code preparation failed: ${error.message}`,
        language,
        phases,
        Date.now() - startTime
      );
    }

    // =========================================================================
    // PHASE 2: EXECUTION WITH AUTO-RETRY (OODA LOOP)
    // =========================================================================
    let lastResult: { success: boolean; stdout: string; stderr: string; exitCode: number } | null =
      null;
    let attempt = 0;
    let lastErrorAnalysis: ErrorAnalysis | undefined;

    while (attempt < maxRetries) {
      attempt++;
      const execStart = Date.now();

      console.log(`[AutomatedPipeline] Execution attempt ${attempt}/${maxRetries}`);

      try {
        // OBSERVE: Execute using file-based approach (not -e flag)
        lastResult = await this.executeInFile(code, language, executionId, timeout);

        phases.push({
          name: `execution-attempt-${attempt}`,
          status: lastResult.success ? 'success' : 'failed',
          durationMs: Date.now() - execStart,
          message: lastResult.success
            ? 'Execution completed successfully'
            : `Execution failed: ${lastResult.stderr.substring(0, 100)}`,
        });

        if (lastResult.success) {
          // Mark any previous fix as successful
          if (lastErrorAnalysis) {
            lastErrorAnalysis.fixSuccessful = true;
            bus.publish('cortex', 'pipeline:fix_succeeded', {
              errorType: lastErrorAnalysis.errorType,
              attempts: attempt,
            });
          }
          break;
        }

        // ORIENT + DECIDE: Auto-fix on failure if we have retries left
        if (attempt < maxRetries) {
          console.log(`[AutomatedPipeline] OODA: Analyzing error and generating fix...`);
          const fixStart = Date.now();

          try {
            // This is the core OODA feedback - error goes to AI, fix comes back
            const { fixedCode, analysis } = await this.autoFixCode(
              code,
              lastResult.stderr,
              language
            );
            lastErrorAnalysis = analysis;

            console.log(
              `[AutomatedPipeline] Error type: ${analysis.errorType}, Root cause: ${analysis.rootCause}`
            );

            if (fixedCode && fixedCode !== code) {
              code = fixedCode;
              phases.push({
                name: `auto-fix-${attempt}`,
                status: 'success',
                durationMs: Date.now() - fixStart,
                message: `Fix applied (${analysis.errorType}): ${analysis.rootCause.substring(0, 50)}`,
              });
            } else {
              phases.push({
                name: `auto-fix-${attempt}`,
                status: 'skipped',
                durationMs: Date.now() - fixStart,
                message: 'No fix available - same code returned',
              });
              break; // No point retrying with same code
            }
          } catch (fixError: any) {
            phases.push({
              name: `auto-fix-${attempt}`,
              status: 'failed',
              durationMs: Date.now() - fixStart,
              message: fixError.message,
            });
            break;
          }
        }
      } catch (execError: any) {
        phases.push({
          name: `execution-attempt-${attempt}`,
          status: 'failed',
          durationMs: Date.now() - execStart,
          message: execError.message,
        });
        lastResult = {
          success: false,
          stdout: '',
          stderr: execError.message,
          exitCode: 1,
        };
      }
    }

    // =========================================================================
    // PHASE 3: RESULT PACKAGING
    // =========================================================================
    const totalDuration = Date.now() - startTime;

    // Emit completion event with full context for learning
    bus.publish('cortex', 'pipeline:execution:complete', {
      executionId,
      success: lastResult?.success || false,
      attempts: attempt,
      durationMs: totalDuration,
      errorAnalysis: lastErrorAnalysis,
      language,
    });

    // Record for reinforcement learning if we had to fix
    if (lastErrorAnalysis) {
      bus.publish('cortex', 'learning:execution_outcome', {
        errorType: lastErrorAnalysis.errorType,
        fixSuccessful: lastErrorAnalysis.fixSuccessful,
        attempts: attempt,
        language,
      });

      // PHASE 4 (NEW): Record experience to memory for future recall
      // This creates the learning loop: Execute → Learn → Recall → Execute Better
      this.recordExecutionOutcome({
        code: input.code || input.objective || '',
        error: lastResult?.stderr || '',
        fixedCode: code,
        success: lastResult?.success || false,
        language,
        errorType: lastErrorAnalysis.errorType,
        rootCause: lastErrorAnalysis.rootCause,
      }).catch((err) => console.warn('[AutomatedPipeline] Failed to record experience:', err));
    }

    return {
      success: lastResult?.success || false,
      output: lastResult?.stdout || '',
      error: lastResult?.stderr || '',
      exitCode: lastResult?.exitCode || 1,
      executedCode: code,
      language,
      attempts: attempt,
      durationMs: totalDuration,
      phases,
      errorAnalysis: lastErrorAnalysis,
    };
  }

  // --------------------------------------------------------------------------
  // INTERNAL METHODS
  // --------------------------------------------------------------------------

  /**
   * Execute code by writing to file and running (avoids -e flag issues)
   */
  private async executeInFile(
    code: string,
    language: string,
    executionId: string,
    timeout: number
  ): Promise<{ success: boolean; stdout: string; stderr: string; exitCode: number }> {
    const execDir = path.join(this.tempDir, executionId);
    await fs.ensureDir(execDir);

    let filename: string;
    let command: string;
    let args: string[];

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        filename = 'script.js';
        command = 'node';
        args = [path.join(execDir, filename)];
        break;
      case 'typescript':
      case 'ts':
        filename = 'script.ts';
        command = 'npx';
        args = ['tsx', path.join(execDir, filename)];
        break;
      case 'python':
      case 'py':
        filename = 'script.py';
        command = 'python3';
        args = [path.join(execDir, filename)];
        break;
      case 'bash':
      case 'sh':
        filename = 'script.sh';
        command = 'bash';
        args = [path.join(execDir, filename)];
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    // Write code to file
    const filePath = path.join(execDir, filename);
    await fs.writeFile(filePath, code, 'utf-8');

    console.log(`[AutomatedPipeline] Executing: ${command} ${args.join(' ')}`);

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const spawnOptions: SpawnOptions = {
        cwd: execDir,
        timeout,
        env: { ...process.env, NODE_NO_WARNINGS: '1' },
      };

      const proc = spawn(command, args, spawnOptions);

      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
      }, timeout);

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', async (exitCode) => {
        clearTimeout(timeoutHandle);

        // Cleanup
        try {
          await fs.remove(execDir);
        } catch (e) {
          // Ignore cleanup errors
        }

        if (timedOut) {
          resolve({
            success: false,
            stdout,
            stderr: `Execution timed out after ${timeout}ms`,
            exitCode: 124,
          });
        } else {
          resolve({
            success: exitCode === 0,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: exitCode || 0,
          });
        }
      });

      proc.on('error', async (error) => {
        clearTimeout(timeoutHandle);

        try {
          await fs.remove(execDir);
        } catch (e) {
          // Ignore
        }

        resolve({
          success: false,
          stdout: '',
          stderr: error.message,
          exitCode: 1,
        });
      });
    });
  }

  /**
   * Generate code from natural language objective
   */
  private async generateCode(
    objective: string,
    preferredLanguage: string
  ): Promise<{ code: string; language: string }> {
    const response = await precog.providers.generate({
      prompt: `Generate ${preferredLanguage} code to: ${objective}

IMPORTANT: Return ONLY the executable code. No markdown, no explanations, no code blocks.
The code should be complete and runnable as-is.
Include any necessary imports at the top.
For output, use console.log (JS/TS) or print (Python).`,
      system: `You are an expert ${preferredLanguage} developer. Generate clean, executable code.
Return ONLY the code - no markdown code blocks, no explanations.
The code must be complete and run without modifications.`,
      taskType: 'code',
    });

    // Clean the response
    let code = response.content;
    code = this.cleanCode(code, preferredLanguage);

    return { code, language: preferredLanguage };
  }

  /**
   * Auto-fix code based on error message with structured analysis
   * This is the core of the OODA loop's "Decide" phase
   * NOW ENHANCED with experience recall from VectorStore
   */
  private async autoFixCode(
    code: string,
    error: string,
    language: string
  ): Promise<{ fixedCode: string | null; analysis: ErrorAnalysis }> {
    const analysis: ErrorAnalysis = {
      errorType: this.classifyError(error),
      rootCause: '',
      fixAttempted: '',
      fixSuccessful: false,
      confidence: 0,
    };

    try {
      // STEP 0 (NEW): Recall past experiences with similar errors
      const pastExperiences = await this.recallRelevantExperiences(error, language);
      const experienceContext =
        pastExperiences.length > 0
          ? `\n\nPAST SIMILAR EXPERIENCES (${pastExperiences.length} found):\n${pastExperiences
              .map(
                (e, i) =>
                  `${i + 1}. Problem: ${e.problem.substring(0, 100)}...\n   Action: ${e.action}\n   Result: ${e.success ? '✓ SUCCESS' : '✗ FAILED'}`
              )
              .join('\n')}`
          : '';

      if (pastExperiences.length > 0) {
        console.log(
          `[AutomatedPipeline] MEMORY RECALL: Found ${pastExperiences.length} similar past experiences`
        );
      }

      // Step 1: Analyze the error (now with experience context)
      const analysisResponse = await precog.providers.generate({
        prompt: `Analyze this ${language} execution error and identify the root cause:

ERROR:
${error}

CODE:
${code}${experienceContext}

Respond with a brief JSON object:
{
  "rootCause": "one sentence explaining the root cause",
  "fixStrategy": "one sentence explaining how to fix it",
  "confidence": 0.0-1.0,
  "usedPastExperience": true/false
}`,
        system:
          'You are a debugging expert. Analyze errors precisely. If past experiences are provided, use them to inform your analysis. Return only valid JSON.',
        taskType: 'analyze',
      });

      // Parse analysis
      let usedPastExperience = false;
      try {
        const parsed = JSON.parse(analysisResponse.content.replace(/```json\n?|\n?```/g, ''));
        analysis.rootCause = parsed.rootCause || 'Unknown';
        analysis.fixAttempted = parsed.fixStrategy || 'General fix';
        analysis.confidence = parsed.confidence || 0.5;
        usedPastExperience = parsed.usedPastExperience || false;

        // Boost confidence if we learned from past success
        if (usedPastExperience && pastExperiences.some((e) => e.success)) {
          analysis.confidence = Math.min(analysis.confidence + 0.15, 0.95);
        }
      } catch {
        analysis.rootCause = 'Could not parse error analysis';
        analysis.confidence = 0.3;
      }

      // Step 2: Generate the fix (with experience-informed system prompt)
      const successfulFixes = pastExperiences.filter((e) => e.success);
      const experienceSystemHint =
        successfulFixes.length > 0
          ? `\nPast successful fix patterns for similar issues:\n${successfulFixes.map((e) => `- ${e.action}`).join('\n')}`
          : '';

      const response = await precog.providers.generate({
        prompt: `Fix this ${language} code that produced the following error:

ERROR:
${error}

ROOT CAUSE ANALYSIS:
${analysis.rootCause}

CODE:
${code}

Return ONLY the fixed code. No markdown, no explanations.`,
        system: `You are an expert debugger. Fix the code to resolve the error.
Return ONLY the corrected code - no markdown, no explanations.
Based on the analysis: ${analysis.fixAttempted}${experienceSystemHint}`,
        taskType: 'fix',
      });

      let fixedCode = response.content;
      fixedCode = this.cleanCode(fixedCode, language);

      // Emit event for learning
      bus.publish('cortex', 'pipeline:error_analyzed', {
        errorType: analysis.errorType,
        rootCause: analysis.rootCause,
        language,
        confidence: analysis.confidence,
        usedMemory: pastExperiences.length > 0,
      });

      return { fixedCode, analysis };
    } catch (e) {
      analysis.rootCause = 'Auto-fix generation failed';
      return { fixedCode: null, analysis };
    }
  }

  /**
   * Recall relevant past experiences from VectorStore
   * This enables the pipeline to "remember what worked before"
   */
  private async recallRelevantExperiences(
    error: string,
    language: string
  ): Promise<
    { problem: string; action: string; result: string; success: boolean; similarity: number }[]
  > {
    try {
      const experiences = await this.vectorStore.getRelevantExperiences(
        `${language} error: ${error}`,
        {
          preferSuccessful: true, // Prioritize successful fixes
          limit: 3,
        }
      );

      // Filter for high-quality matches
      return experiences.filter((e) => e.similarity > 0.4);
    } catch (err) {
      console.warn('[AutomatedPipeline] Memory recall failed:', err);
      return [];
    }
  }

  /**
   * Record execution outcome to memory for future learning
   * This creates the feedback loop: Execute → Learn → Recall → Execute Better
   */
  async recordExecutionOutcome(input: {
    code: string;
    error: string;
    fixedCode: string | null;
    success: boolean;
    language: string;
    errorType: string;
    rootCause: string;
  }): Promise<void> {
    try {
      await this.vectorStore.recordExperience({
        problem: `${input.language} execution error: ${input.error.substring(0, 200)}`,
        action: input.fixedCode
          ? `Applied fix for ${input.errorType}: ${input.rootCause}`
          : `No fix available for ${input.errorType}`,
        result: input.success
          ? 'Fix successful, code executed correctly'
          : 'Fix did not resolve the issue',
        success: input.success,
        errorType: input.errorType,
        language: input.language,
        fixApplied: !!input.fixedCode,
        context: {
          codeLength: input.code.length,
          errorLength: input.error.length,
        },
      });

      console.log(
        `[AutomatedPipeline] MEMORY STORED: ${input.success ? '✓' : '✗'} ${input.errorType} fix`
      );
    } catch (err) {
      console.warn('[AutomatedPipeline] Failed to record experience:', err);
    }
  }

  /**
   * Classify error type for better learning
   */
  private classifyError(error: string): ErrorAnalysis['errorType'] {
    const errorLower = error.toLowerCase();

    // Syntax errors
    if (
      errorLower.includes('syntaxerror') ||
      errorLower.includes('unexpected token') ||
      errorLower.includes('parsing error')
    ) {
      return 'syntax';
    }

    // Import/module errors
    if (
      errorLower.includes('cannot find module') ||
      errorLower.includes('module not found') ||
      errorLower.includes('importerror') ||
      errorLower.includes('is not defined')
    ) {
      return 'import';
    }

    // Timeout
    if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
      return 'timeout';
    }

    // Runtime errors
    if (
      errorLower.includes('typeerror') ||
      errorLower.includes('referenceerror') ||
      errorLower.includes('rangeerror')
    ) {
      return 'runtime';
    }

    // Logic errors (assertion failures)
    if (
      errorLower.includes('assertion') ||
      errorLower.includes('expected') ||
      errorLower.includes('assert')
    ) {
      return 'logic';
    }

    return 'unknown';
  }

  /**
   * Clean code - remove markdown, extra whitespace, etc.
   */
  private cleanCode(code: string, language: string): string {
    let cleaned = code;

    // Remove markdown code blocks
    cleaned = cleaned.replace(/^```[\w]*\n?/gm, '');
    cleaned = cleaned.replace(/\n?```$/gm, '');
    cleaned = cleaned.replace(/```/g, '');

    // Remove common prefixes/suffixes
    cleaned = cleaned.replace(/^(Here's the code:|Here is the code:|Code:)\s*/i, '');

    // Trim whitespace
    cleaned = cleaned.trim();

    // Ensure proper line endings
    cleaned = cleaned.replace(/\r\n/g, '\n');

    return cleaned;
  }

  /**
   * Create error result
   */
  private createErrorResult(
    message: string,
    language: string,
    phases: ExecutionPhase[],
    durationMs: number
  ): ExecutionOutput {
    return {
      success: false,
      output: '',
      error: message,
      exitCode: 1,
      executedCode: '',
      language,
      attempts: 0,
      durationMs,
      phases,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const automatedPipeline = AutomatedExecutionPipeline.getInstance();
export default AutomatedExecutionPipeline;
