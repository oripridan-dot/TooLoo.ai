// @version 3.3.195
/* eslint-disable no-console */
/**
 * TooLoo Reflection Loop Orchestrator
 *
 * Manages the execute→test→refine cycle for autonomous code development.
 * This is the brain of TooLoo's self-reflection capability, coordinating:
 *
 * 1. Code Generation - AI generates code modifications
 * 2. Sandbox Execution - Code is applied in isolated sandbox
 * 3. Testing - Full test suite runs against modifications
 * 4. Refinement - If tests fail, AI analyzes and refines
 * 5. Validation - TypeScript check + test pass = ready for handoff
 * 6. Handoff - Validated changes promoted to production
 *
 * The loop continues until:
 * - Tests pass (success)
 * - Max iterations reached (failure with best attempt)
 * - Critical error (abort)
 *
 * @module cortex/self-modification/reflection-loop
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { bus } from '../../core/event-bus.js';
import { ReflectionSandboxManager, reflectionSandbox, TestResult } from './reflection-sandbox.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ReflectionTask {
  /** Unique task ID */
  id: string;
  /** What we're trying to accomplish */
  objective: string;
  /** Target files to modify */
  targetFiles: string[];
  /** Initial code suggestions or context */
  context: string;
  /** Maximum refinement iterations */
  maxIterations: number;
  /** Required test pass rate (0-1) */
  requiredPassRate: number;
  /** Auto-promote if successful */
  autoPromote: boolean;
  /** Created timestamp */
  createdAt: number;
}

export interface ReflectionIteration {
  /** Iteration number (1-based) */
  iteration: number;
  /** Code changes made */
  changes: CodeChange[];
  /** Test results */
  testResult: TestResult | null;
  /** TypeScript check result */
  typeCheckPassed: boolean;
  /** Errors encountered */
  errors: string[];
  /** Refinement reasoning */
  refinementReason: string | null;
  /** Duration in ms */
  duration: number;
  /** Timestamp */
  timestamp: number;
}

export interface CodeChange {
  /** File path (relative) */
  filePath: string;
  /** Type of change */
  operation: 'create' | 'edit' | 'delete';
  /** Old content (for edits) */
  oldContent?: string;
  /** New content */
  newContent: string;
  /** Reason for change */
  reason: string;
}

export interface ReflectionResult {
  /** Task that was executed */
  task: ReflectionTask;
  /** Final status */
  status: 'success' | 'partial' | 'failed' | 'aborted';
  /** All iterations */
  iterations: ReflectionIteration[];
  /** Total iterations attempted */
  totalIterations: number;
  /** Final test results */
  finalTestResult: TestResult | null;
  /** Final commit hash in sandbox */
  commitHash: string | null;
  /** Ready for promotion? */
  readyForPromotion: boolean;
  /** Git diff of final changes */
  diff: string | null;
  /** Total duration */
  duration: number;
  /** Summary message */
  summary: string;
}

export interface RefineRequest {
  /** Original objective */
  objective: string;
  /** Current iteration */
  iteration: number;
  /** Previous code changes */
  previousChanges: CodeChange[];
  /** Test failures */
  testFailures: Array<{ name: string; error: string }>;
  /** TypeScript errors */
  typeErrors: string;
  /** Additional context */
  context: string;
}

export interface RefineResponse {
  /** New code changes to try */
  changes: CodeChange[];
  /** Reasoning for the refinement */
  reasoning: string;
  /** Confidence in this fix (0-1) */
  confidence: number;
  /** Should we abort? */
  abort: boolean;
  /** Abort reason if applicable */
  abortReason?: string;
}

export type RefineFunction = (request: RefineRequest) => Promise<RefineResponse>;

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export interface ReflectionLoopConfig {
  /** Default max iterations */
  defaultMaxIterations: number;
  /** Default required pass rate */
  defaultPassRate: number;
  /** Timeout per iteration in ms */
  iterationTimeout: number;
  /** Minimum confidence to continue */
  minConfidenceToRefine: number;
  /** Enable verbose logging */
  verbose: boolean;
}

const DEFAULT_CONFIG: ReflectionLoopConfig = {
  defaultMaxIterations: 5,
  defaultPassRate: 1.0, // 100% tests must pass
  iterationTimeout: 180000, // 3 minutes
  minConfidenceToRefine: 0.3,
  verbose: true,
};

// ============================================================================
// REFLECTION LOOP ORCHESTRATOR
// ============================================================================

export class ReflectionLoopOrchestrator extends EventEmitter {
  private config: ReflectionLoopConfig;
  private sandbox: ReflectionSandboxManager;
  private refineFunction: RefineFunction | null = null;
  private activeTasks: Map<string, ReflectionTask> = new Map();
  private results: Map<string, ReflectionResult> = new Map();

  constructor(config: Partial<ReflectionLoopConfig> = {}, sandbox?: ReflectionSandboxManager) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sandbox = sandbox || reflectionSandbox;
  }

  /**
   * Set the refinement function (typically calls AI provider)
   */
  setRefineFunction(fn: RefineFunction): void {
    this.refineFunction = fn;
  }

  // --------------------------------------------------------------------------
  // MAIN EXECUTION LOOP
  // --------------------------------------------------------------------------

  /**
   * Execute a reflection task with the execute→test→refine loop
   */
  async execute(task: Partial<ReflectionTask> & { objective: string }): Promise<ReflectionResult> {
    const fullTask: ReflectionTask = {
      id: task.id || uuidv4(),
      objective: task.objective,
      targetFiles: task.targetFiles || [],
      context: task.context || '',
      maxIterations: task.maxIterations || this.config.defaultMaxIterations,
      requiredPassRate: task.requiredPassRate || this.config.defaultPassRate,
      autoPromote: task.autoPromote ?? false,
      createdAt: Date.now(),
    };

    this.activeTasks.set(fullTask.id, fullTask);
    const startTime = Date.now();
    const iterations: ReflectionIteration[] = [];

    console.log(`[ReflectionLoop] Starting task: ${fullTask.objective}`);
    this.log(`Task ID: ${fullTask.id}`);
    this.log(`Max iterations: ${fullTask.maxIterations}`);

    // Ensure sandbox is running
    await this.sandbox.start();

    // Start a reflection session
    await this.sandbox.startSession(fullTask.objective);

    let currentChanges: CodeChange[] = [];
    let lastTestResult: TestResult | null = null;
    let lastTypeErrors = '';
    let commitHash: string | null = null;

    try {
      // Generate initial code if we have a refine function
      if (this.refineFunction && !task.context?.includes('```')) {
        const initialResponse = await this.refineFunction({
          objective: fullTask.objective,
          iteration: 0,
          previousChanges: [],
          testFailures: [],
          typeErrors: '',
          context: fullTask.context,
        });

        if (initialResponse.abort) {
          return this.createAbortedResult(
            fullTask,
            initialResponse.abortReason || 'Initial generation aborted',
            iterations,
            startTime
          );
        }

        currentChanges = initialResponse.changes;
      } else {
        // Parse code changes from context
        currentChanges = this.parseChangesFromContext(fullTask.context, fullTask.targetFiles);
      }

      // Main refinement loop
      for (let i = 1; i <= fullTask.maxIterations; i++) {
        this.log(`\n=== Iteration ${i}/${fullTask.maxIterations} ===`);

        const iterationStart = Date.now();
        const iteration: ReflectionIteration = {
          iteration: i,
          changes: currentChanges,
          testResult: null,
          typeCheckPassed: false,
          errors: [],
          refinementReason: null,
          duration: 0,
          timestamp: iterationStart,
        };

        try {
          // Step 1: Apply changes to sandbox
          this.log('Applying changes...');
          await this.applyChanges(currentChanges);

          // Step 2: TypeScript check
          this.log('Running TypeScript check...');
          const typeCheck = await this.sandbox.typeCheck();
          iteration.typeCheckPassed = typeCheck.passed;
          lastTypeErrors = typeCheck.errors;

          if (!typeCheck.passed) {
            this.log(`TypeScript errors:\n${typeCheck.errors}`);
            iteration.errors.push(`TypeScript: ${typeCheck.errors.split('\n')[0]}`);
          }

          // Step 3: Run tests
          this.log('Running tests...');
          const testResult = await this.sandbox.runTests();
          iteration.testResult = testResult;
          lastTestResult = testResult;

          this.log(`Tests: ${testResult.total - testResult.failed}/${testResult.total} passed`);

          // Step 4: Check success criteria
          const passRate =
            testResult.total > 0 ? (testResult.total - testResult.failed) / testResult.total : 1;

          if (iteration.typeCheckPassed && passRate >= fullTask.requiredPassRate) {
            // Success!
            this.log('✓ All criteria met!');

            // Commit changes
            commitHash = await this.sandbox.commit(
              `Reflection: ${fullTask.objective} (iteration ${i})`
            );

            iteration.duration = Date.now() - iterationStart;
            iterations.push(iteration);

            const result = this.createSuccessResult(
              fullTask,
              iterations,
              testResult,
              commitHash,
              startTime
            );

            // Auto-promote if configured
            if (fullTask.autoPromote) {
              this.log('Auto-promoting to production...');
              bus.publish('cortex', 'reflection:promote_requested', {
                taskId: fullTask.id,
                commitHash,
              });
            }

            this.results.set(fullTask.id, result);
            this.activeTasks.delete(fullTask.id);
            return result;
          }

          // Step 5: Need refinement
          if (i < fullTask.maxIterations && this.refineFunction) {
            this.log('Generating refinement...');

            const refineResponse = await this.refineFunction({
              objective: fullTask.objective,
              iteration: i,
              previousChanges: currentChanges,
              testFailures: testResult.failures,
              typeErrors: lastTypeErrors,
              context: `Previous attempt had ${testResult.failed} test failures`,
            });

            if (refineResponse.abort) {
              iteration.duration = Date.now() - iterationStart;
              iterations.push(iteration);
              return this.createAbortedResult(
                fullTask,
                refineResponse.abortReason || 'Refinement aborted',
                iterations,
                startTime
              );
            }

            if (refineResponse.confidence < this.config.minConfidenceToRefine) {
              this.log(`Low confidence (${refineResponse.confidence}), stopping`);
              iteration.duration = Date.now() - iterationStart;
              iterations.push(iteration);
              break;
            }

            iteration.refinementReason = refineResponse.reasoning;
            currentChanges = refineResponse.changes;
          }

          iteration.duration = Date.now() - iterationStart;
          iterations.push(iteration);

          // Emit progress
          bus.publish('cortex', 'reflection:iteration_completed', {
            taskId: fullTask.id,
            iteration: i,
            testsPassed: testResult.total - testResult.failed,
            testsTotal: testResult.total,
            typeCheckPassed: iteration.typeCheckPassed,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          this.log(`Error in iteration ${i}: ${errorMsg}`);
          iteration.errors.push(errorMsg);
          iteration.duration = Date.now() - iterationStart;
          iterations.push(iteration);

          // Don't abort on single iteration error, try to continue
          if (i === fullTask.maxIterations) {
            break;
          }
        }
      }

      // Max iterations reached without success
      if (lastTestResult && lastTestResult.failed < lastTestResult.total) {
        // Partial success - commit best attempt
        commitHash = await this.sandbox.commit(`Reflection (partial): ${fullTask.objective}`);
      }

      const result = this.createPartialResult(
        fullTask,
        iterations,
        lastTestResult,
        commitHash,
        startTime
      );

      this.results.set(fullTask.id, result);
      this.activeTasks.delete(fullTask.id);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log(`Fatal error: ${errorMsg}`);

      const result: ReflectionResult = {
        task: fullTask,
        status: 'failed',
        iterations,
        totalIterations: iterations.length,
        finalTestResult: lastTestResult,
        commitHash: null,
        readyForPromotion: false,
        diff: null,
        duration: Date.now() - startTime,
        summary: `Failed: ${errorMsg}`,
      };

      this.results.set(fullTask.id, result);
      this.activeTasks.delete(fullTask.id);
      return result;
    }
  }

  // --------------------------------------------------------------------------
  // CHANGE APPLICATION
  // --------------------------------------------------------------------------

  private async applyChanges(changes: CodeChange[]): Promise<void> {
    for (const change of changes) {
      this.log(`  ${change.operation}: ${change.filePath}`);

      switch (change.operation) {
        case 'create':
        case 'edit':
          await this.sandbox.writeFile(change.filePath, change.newContent);
          break;
        case 'delete':
          await this.sandbox.execInContainer(`rm -f ${change.filePath}`);
          break;
      }
    }
  }

  private parseChangesFromContext(context: string, targetFiles: string[]): CodeChange[] {
    const changes: CodeChange[] = [];

    // Pattern: ```language:filepath or ```language // filepath: path
    const codeBlockPattern = /```(\w+)(?::|[\s]*\/\/\s*filepath:\s*)([^\n`]+)\n([\s\S]*?)```/gi;

    let match;
    while ((match = codeBlockPattern.exec(context)) !== null) {
      const filePath = match[2]?.trim();
      const code = match[3]?.trim();

      if (filePath && code) {
        changes.push({
          filePath,
          operation: 'edit',
          newContent: code,
          reason: 'From context',
        });
      }
    }

    // If no explicit paths but we have target files and a single code block
    if (changes.length === 0 && targetFiles.length > 0) {
      const simpleBlockPattern = /```\w*\n([\s\S]*?)```/g;
      const blocks: string[] = [];

      while ((match = simpleBlockPattern.exec(context)) !== null) {
        if (match[1]) {
          blocks.push(match[1].trim());
        }
      }

      if (blocks.length === 1 && targetFiles.length === 1) {
        const targetFile = targetFiles[0];
        const codeBlock = blocks[0];
        if (targetFile && codeBlock) {
          changes.push({
            filePath: targetFile,
            operation: 'edit',
            newContent: codeBlock,
            reason: 'Inferred from target file',
          });
        }
      }
    }

    return changes;
  }

  // --------------------------------------------------------------------------
  // RESULT BUILDERS
  // --------------------------------------------------------------------------

  private createSuccessResult(
    task: ReflectionTask,
    iterations: ReflectionIteration[],
    testResult: TestResult,
    commitHash: string,
    startTime: number
  ): ReflectionResult {
    return {
      task,
      status: 'success',
      iterations,
      totalIterations: iterations.length,
      finalTestResult: testResult,
      commitHash,
      readyForPromotion: true,
      diff: null, // Will be fetched on demand
      duration: Date.now() - startTime,
      summary: `Success after ${iterations.length} iteration(s). All ${testResult.total} tests passed.`,
    };
  }

  private createPartialResult(
    task: ReflectionTask,
    iterations: ReflectionIteration[],
    testResult: TestResult | null,
    commitHash: string | null,
    startTime: number
  ): ReflectionResult {
    const passed = testResult ? testResult.total - testResult.failed : 0;
    const total = testResult?.total || 0;

    return {
      task,
      status: 'partial',
      iterations,
      totalIterations: iterations.length,
      finalTestResult: testResult,
      commitHash,
      readyForPromotion: false,
      diff: null,
      duration: Date.now() - startTime,
      summary: `Partial success after ${iterations.length} iteration(s). ${passed}/${total} tests passed.`,
    };
  }

  private createAbortedResult(
    task: ReflectionTask,
    reason: string,
    iterations: ReflectionIteration[],
    startTime: number
  ): ReflectionResult {
    return {
      task,
      status: 'aborted',
      iterations,
      totalIterations: iterations.length,
      finalTestResult: null,
      commitHash: null,
      readyForPromotion: false,
      diff: null,
      duration: Date.now() - startTime,
      summary: `Aborted: ${reason}`,
    };
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[ReflectionLoop] ${message}`);
    }
  }

  /**
   * Get result for a task
   */
  getResult(taskId: string): ReflectionResult | undefined {
    return this.results.get(taskId);
  }

  /**
   * Get diff for a completed task
   */
  async getDiff(taskId: string): Promise<string | null> {
    const result = this.results.get(taskId);
    if (!result?.commitHash) return null;

    const diff = await this.sandbox.getDiff();
    return diff;
  }

  /**
   * Check if task is active
   */
  isActive(taskId: string): boolean {
    return this.activeTasks.has(taskId);
  }

  /**
   * Get active tasks
   */
  getActiveTasks(): ReflectionTask[] {
    return Array.from(this.activeTasks.values());
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const reflectionLoop = new ReflectionLoopOrchestrator();
export default ReflectionLoopOrchestrator;
