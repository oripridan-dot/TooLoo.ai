// @version 3.3.194
/* eslint-disable no-console */
/**
 * TooLoo Automated Execution Pipeline
 *
 * A fully automated, self-correcting execution system that:
 * 1. Receives code or objectives
 * 2. Automatically prepares and validates input
 * 3. Executes with proper file-based sandboxing (not eval)
 * 4. Self-corrects on failures
 * 5. Returns clean results
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
}

export interface ExecutionPhase {
  name: string;
  status: 'success' | 'failed' | 'skipped';
  durationMs: number;
  message: string;
}

// ============================================================================
// AUTOMATED EXECUTION PIPELINE
// ============================================================================

export class AutomatedExecutionPipeline {
  private static instance: AutomatedExecutionPipeline;
  private tempDir: string;
  private initialized = false;

  private readonly DEFAULT_TIMEOUT = 30000;
  private readonly DEFAULT_MAX_RETRIES = 3;

  private constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'execution');
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
    this.initialized = true;
    console.log('[AutomatedPipeline] Initialized');
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
        console.log(`[AutomatedPipeline] Generating code for: ${input.objective.substring(0, 50)}...`);
        const generated = await this.generateCode(input.objective, language);
        code = generated.code;
        language = generated.language;
        
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
    // PHASE 2: EXECUTION WITH AUTO-RETRY
    // =========================================================================
    let lastResult: { success: boolean; stdout: string; stderr: string; exitCode: number } | null = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      const execStart = Date.now();

      console.log(`[AutomatedPipeline] Execution attempt ${attempt}/${maxRetries}`);

      try {
        // Execute using file-based approach (not -e flag)
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
          break;
        }

        // Auto-fix on failure if we have retries left
        if (attempt < maxRetries) {
          console.log(`[AutomatedPipeline] Attempting auto-fix...`);
          const fixStart = Date.now();
          
          try {
            const fixedCode = await this.autoFixCode(code, lastResult.stderr, language);
            if (fixedCode && fixedCode !== code) {
              code = fixedCode;
              phases.push({
                name: `auto-fix-${attempt}`,
                status: 'success',
                durationMs: Date.now() - fixStart,
                message: 'Code auto-fixed, retrying...',
              });
            } else {
              phases.push({
                name: `auto-fix-${attempt}`,
                status: 'skipped',
                durationMs: Date.now() - fixStart,
                message: 'No fix available',
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

    // Emit completion event
    bus.publish('cortex', 'pipeline:execution:complete', {
      executionId,
      success: lastResult?.success || false,
      attempts: attempt,
      durationMs: totalDuration,
    });

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
   * Auto-fix code based on error message
   */
  private async autoFixCode(
    code: string,
    error: string,
    language: string
  ): Promise<string | null> {
    try {
      const response = await precog.providers.generate({
        prompt: `Fix this ${language} code that produced the following error:

ERROR:
${error}

CODE:
${code}

Return ONLY the fixed code. No markdown, no explanations.`,
        system: `You are an expert debugger. Fix the code to resolve the error.
Return ONLY the corrected code - no markdown, no explanations.`,
        taskType: 'fix',
      });

      let fixedCode = response.content;
      fixedCode = this.cleanCode(fixedCode, language);

      return fixedCode;
    } catch (e) {
      return null;
    }
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
