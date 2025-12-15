/**
 * @file SkillOrchestrator - Multi-skill composition and execution
 * @version 1.0.0
 * @skill-os true
 * @updated 2025-12-15
 *
 * Provides advanced skill composition patterns:
 * - Sequential: Execute skills in order, pass outputs as inputs
 * - Parallel: Execute skills simultaneously, merge results
 * - Fallback: Try alternatives if primary skill fails
 * - Conditional: Branch based on conditions
 * - Pipeline: Data transformation chains
 */

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type CompositionType = 'sequential' | 'parallel' | 'fallback' | 'conditional' | 'pipeline';

export interface WorkflowStep {
  skillId: string;
  input?: Record<string, unknown>;
  outputMapping?: Record<string, string>; // Map output keys to next input keys
  condition?: (context: WorkflowContext) => boolean;
  timeout?: number;
  retries?: number;
  fallbackSkillId?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  type: CompositionType;
  steps: WorkflowStep[];
  timeout?: number;
  onError?: 'stop' | 'continue' | 'fallback';
}

export interface WorkflowContext {
  workflowId: string;
  startTime: number;
  currentStep: number;
  totalSteps: number;
  stepResults: Map<number, StepResult>;
  variables: Record<string, unknown>;
  errors: WorkflowError[];
}

export interface StepResult {
  stepIndex: number;
  skillId: string;
  success: boolean;
  output?: unknown;
  duration: number;
  error?: string;
}

export interface WorkflowResult {
  workflowId: string;
  success: boolean;
  output?: unknown;
  steps: StepResult[];
  totalDuration: number;
  errors: WorkflowError[];
}

export interface WorkflowError {
  stepIndex: number;
  skillId: string;
  error: string;
  timestamp: number;
}

export interface OrchestratorConfig {
  maxConcurrentWorkflows: number;
  defaultTimeout: number;
  maxRetries: number;
  enableMetrics: boolean;
}

export interface OrchestratorMetrics {
  totalWorkflows: number;
  successfulWorkflows: number;
  failedWorkflows: number;
  activeWorkflows: number;
  averageDuration: number;
  workflowsByType: Record<CompositionType, number>;
}

// Skill executor function type (injected from kernel)
export type SkillExecutor = (skillId: string, input: unknown) => Promise<{
  success: boolean;
  data?: unknown;
  error?: { message: string };
}>;

// =============================================================================
// SKILL ORCHESTRATOR
// =============================================================================

export class SkillOrchestrator extends EventEmitter {
  private config: Required<OrchestratorConfig>;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private activeExecutions: Map<string, WorkflowContext> = new Map();
  private metrics: OrchestratorMetrics;
  private skillExecutor: SkillExecutor | null = null;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super();

    this.config = {
      maxConcurrentWorkflows: config.maxConcurrentWorkflows ?? 10,
      defaultTimeout: config.defaultTimeout ?? 60000,
      maxRetries: config.maxRetries ?? 3,
      enableMetrics: config.enableMetrics ?? true,
    };

    this.metrics = {
      totalWorkflows: 0,
      successfulWorkflows: 0,
      failedWorkflows: 0,
      activeWorkflows: 0,
      averageDuration: 0,
      workflowsByType: {
        sequential: 0,
        parallel: 0,
        fallback: 0,
        conditional: 0,
        pipeline: 0,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  /**
   * Set the skill executor function (called by kernel)
   */
  setSkillExecutor(executor: SkillExecutor): void {
    this.skillExecutor = executor;
  }

  // ---------------------------------------------------------------------------
  // Workflow Management
  // ---------------------------------------------------------------------------

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    if (this.workflows.has(workflow.id)) {
      console.warn(`[Orchestrator] Workflow ${workflow.id} already exists, overwriting`);
    }

    this.validateWorkflow(workflow);
    this.workflows.set(workflow.id, workflow);
    this.emit('workflow:registered', { workflowId: workflow.id });
    console.log(`[Orchestrator] ✅ Registered workflow: ${workflow.id} (${workflow.type})`);
  }

  /**
   * Unregister a workflow
   */
  unregisterWorkflow(workflowId: string): boolean {
    if (this.activeExecutions.has(workflowId)) {
      throw new Error(`Cannot unregister workflow ${workflowId}: currently executing`);
    }

    const deleted = this.workflows.delete(workflowId);
    if (deleted) {
      this.emit('workflow:unregistered', { workflowId });
    }
    return deleted;
  }

  /**
   * Get a workflow by ID
   */
  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * List all registered workflows
   */
  listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Validate a workflow definition
   */
  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.id || !workflow.name) {
      throw new Error('Workflow must have id and name');
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    for (const step of workflow.steps) {
      if (!step.skillId) {
        throw new Error('Each step must have a skillId');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Execution
  // ---------------------------------------------------------------------------

  /**
   * Execute a workflow by ID
   */
  async execute(
    workflowId: string,
    initialInput?: Record<string, unknown>
  ): Promise<WorkflowResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (!this.skillExecutor) {
      throw new Error('Skill executor not set. Call setSkillExecutor first.');
    }

    if (this.activeExecutions.size >= this.config.maxConcurrentWorkflows) {
      throw new Error('Maximum concurrent workflows reached');
    }

    // Create execution context
    const context: WorkflowContext = {
      workflowId,
      startTime: Date.now(),
      currentStep: 0,
      totalSteps: workflow.steps.length,
      stepResults: new Map(),
      variables: initialInput ?? {},
      errors: [],
    };

    this.activeExecutions.set(workflowId, context);
    this.metrics.activeWorkflows++;
    this.emit('workflow:started', { workflowId, context });

    try {
      let result: WorkflowResult;

      switch (workflow.type) {
        case 'sequential':
          result = await this.executeSequential(workflow, context);
          break;
        case 'parallel':
          result = await this.executeParallel(workflow, context);
          break;
        case 'fallback':
          result = await this.executeFallback(workflow, context);
          break;
        case 'conditional':
          result = await this.executeConditional(workflow, context);
          break;
        case 'pipeline':
          result = await this.executePipeline(workflow, context);
          break;
        default:
          throw new Error(`Unknown workflow type: ${workflow.type}`);
      }

      // Update metrics
      this.updateMetrics(workflow.type, result);

      this.emit('workflow:completed', { workflowId, result });
      return result;
    } catch (error) {
      const errorResult: WorkflowResult = {
        workflowId,
        success: false,
        steps: Array.from(context.stepResults.values()),
        totalDuration: Date.now() - context.startTime,
        errors: [
          ...context.errors,
          {
            stepIndex: context.currentStep,
            skillId: workflow.steps[context.currentStep]?.skillId ?? 'unknown',
            error: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
          },
        ],
      };

      this.metrics.failedWorkflows++;
      this.emit('workflow:failed', { workflowId, error: errorResult });
      return errorResult;
    } finally {
      this.activeExecutions.delete(workflowId);
      this.metrics.activeWorkflows--;
    }
  }

  /**
   * Execute steps sequentially (A → B → C)
   */
  private async executeSequential(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    let lastOutput: unknown = context.variables;

    for (let i = 0; i < workflow.steps.length; i++) {
      context.currentStep = i;
      const step = workflow.steps[i]!;

      const stepResult = await this.executeStep(step, lastOutput, context);
      context.stepResults.set(i, stepResult);

      if (!stepResult.success) {
        if (workflow.onError === 'continue') {
          continue;
        } else if (workflow.onError === 'fallback' && step.fallbackSkillId) {
          const fallbackResult = await this.executeStep(
            { ...step, skillId: step.fallbackSkillId },
            lastOutput,
            context
          );
          if (fallbackResult.success) {
            lastOutput = fallbackResult.output;
            continue;
          }
        }

        return {
          workflowId: workflow.id,
          success: false,
          output: lastOutput,
          steps: Array.from(context.stepResults.values()),
          totalDuration: Date.now() - context.startTime,
          errors: context.errors,
        };
      }

      lastOutput = this.mapOutput(stepResult.output, step.outputMapping);
    }

    return {
      workflowId: workflow.id,
      success: true,
      output: lastOutput,
      steps: Array.from(context.stepResults.values()),
      totalDuration: Date.now() - context.startTime,
      errors: context.errors,
    };
  }

  /**
   * Execute steps in parallel (A + B + C simultaneously)
   */
  private async executeParallel(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    const promises = workflow.steps.map((step, index) => {
      context.currentStep = index;
      return this.executeStep(step, context.variables, context).then((result) => {
        context.stepResults.set(index, result);
        return result;
      });
    });

    const results = await Promise.allSettled(promises);
    const successResults: StepResult[] = [];
    const outputs: unknown[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        successResults.push(result.value);
        if (result.value.success && result.value.output) {
          outputs.push(result.value.output);
        }
      }
    }

    const allSuccess = results.every(
      (r) => r.status === 'fulfilled' && r.value.success
    );

    return {
      workflowId: workflow.id,
      success: allSuccess,
      output: outputs,
      steps: Array.from(context.stepResults.values()),
      totalDuration: Date.now() - context.startTime,
      errors: context.errors,
    };
  }

  /**
   * Execute with fallback (try A, if fail try B, if fail try C)
   */
  private async executeFallback(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    for (let i = 0; i < workflow.steps.length; i++) {
      context.currentStep = i;
      const step = workflow.steps[i]!;

      const stepResult = await this.executeStep(step, context.variables, context);
      context.stepResults.set(i, stepResult);

      if (stepResult.success) {
        return {
          workflowId: workflow.id,
          success: true,
          output: stepResult.output,
          steps: Array.from(context.stepResults.values()),
          totalDuration: Date.now() - context.startTime,
          errors: context.errors,
        };
      }
    }

    // All fallbacks failed
    return {
      workflowId: workflow.id,
      success: false,
      steps: Array.from(context.stepResults.values()),
      totalDuration: Date.now() - context.startTime,
      errors: context.errors,
    };
  }

  /**
   * Execute conditionally (branch based on conditions)
   */
  private async executeConditional(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    for (let i = 0; i < workflow.steps.length; i++) {
      context.currentStep = i;
      const step = workflow.steps[i]!;

      // Check condition if present
      if (step.condition && !step.condition(context)) {
        continue;
      }

      const stepResult = await this.executeStep(step, context.variables, context);
      context.stepResults.set(i, stepResult);

      if (stepResult.success) {
        // Update variables with output
        if (stepResult.output && typeof stepResult.output === 'object') {
          context.variables = { ...context.variables, ...stepResult.output as Record<string, unknown> };
        }
      }
    }

    return {
      workflowId: workflow.id,
      success: context.errors.length === 0,
      output: context.variables,
      steps: Array.from(context.stepResults.values()),
      totalDuration: Date.now() - context.startTime,
      errors: context.errors,
    };
  }

  /**
   * Execute as pipeline (data transformation chain)
   */
  private async executePipeline(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    let data = context.variables;

    for (let i = 0; i < workflow.steps.length; i++) {
      context.currentStep = i;
      const step = workflow.steps[i]!;

      const stepResult = await this.executeStep(step, data, context);
      context.stepResults.set(i, stepResult);

      if (!stepResult.success) {
        return {
          workflowId: workflow.id,
          success: false,
          output: data,
          steps: Array.from(context.stepResults.values()),
          totalDuration: Date.now() - context.startTime,
          errors: context.errors,
        };
      }

      // Transform data for next step
      data = stepResult.output as Record<string, unknown> ?? data;
    }

    return {
      workflowId: workflow.id,
      success: true,
      output: data,
      steps: Array.from(context.stepResults.values()),
      totalDuration: Date.now() - context.startTime,
      errors: context.errors,
    };
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: WorkflowStep,
    input: unknown,
    context: WorkflowContext
  ): Promise<StepResult> {
    const startTime = Date.now();
    const retries = step.retries ?? this.config.maxRetries;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const stepInput = step.input
          ? { ...input as object, ...step.input }
          : input;

        this.emit('step:executing', {
          workflowId: context.workflowId,
          stepIndex: context.currentStep,
          skillId: step.skillId,
          attempt,
        });

        const result = await this.executeWithTimeout(
          this.skillExecutor!(step.skillId, stepInput),
          step.timeout ?? this.config.defaultTimeout
        );

        if (result.success) {
          return {
            stepIndex: context.currentStep,
            skillId: step.skillId,
            success: true,
            output: result.data,
            duration: Date.now() - startTime,
          };
        }

        // Record error but continue retrying
        context.errors.push({
          stepIndex: context.currentStep,
          skillId: step.skillId,
          error: result.error?.message ?? 'Unknown error',
          timestamp: Date.now(),
        });
      } catch (error) {
        context.errors.push({
          stepIndex: context.currentStep,
          skillId: step.skillId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
        });
      }
    }

    // All retries exhausted
    return {
      stepIndex: context.currentStep,
      skillId: step.skillId,
      success: false,
      duration: Date.now() - startTime,
      error: 'All retries exhausted',
    };
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      ),
    ]);
  }

  /**
   * Map output keys to input keys for next step
   */
  private mapOutput(
    output: unknown,
    mapping?: Record<string, string>
  ): Record<string, unknown> {
    if (!mapping || !output || typeof output !== 'object') {
      return output as Record<string, unknown> ?? {};
    }

    const result: Record<string, unknown> = { ...output as object };

    for (const [from, to] of Object.entries(mapping)) {
      if (from in result) {
        result[to] = result[from];
        delete result[from];
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  private updateMetrics(type: CompositionType, result: WorkflowResult): void {
    if (!this.config.enableMetrics) return;

    this.metrics.totalWorkflows++;
    this.metrics.workflowsByType[type]++;

    if (result.success) {
      this.metrics.successfulWorkflows++;
    } else {
      this.metrics.failedWorkflows++;
    }

    // Update average duration
    this.metrics.averageDuration =
      (this.metrics.averageDuration * (this.metrics.totalWorkflows - 1) +
        result.totalDuration) /
      this.metrics.totalWorkflows;
  }

  /**
   * Get orchestrator metrics
   */
  getMetrics(): OrchestratorMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalWorkflows: 0,
      successfulWorkflows: 0,
      failedWorkflows: 0,
      activeWorkflows: this.activeExecutions.size,
      averageDuration: 0,
      workflowsByType: {
        sequential: 0,
        parallel: 0,
        fallback: 0,
        conditional: 0,
        pipeline: 0,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    console.log('[Orchestrator] 🚀 Initializing...');
    // Load any persisted workflows here if needed
    console.log('[Orchestrator] ✅ Ready');
  }

  async shutdown(): Promise<void> {
    console.log('[Orchestrator] 🛑 Shutting down...');

    // Wait for active executions to complete (with timeout)
    const timeout = 10000;
    const start = Date.now();

    while (this.activeExecutions.size > 0 && Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, 100));
    }

    if (this.activeExecutions.size > 0) {
      console.warn(
        `[Orchestrator] ${this.activeExecutions.size} workflows still active, forcing shutdown`
      );
    }

    this.workflows.clear();
    this.activeExecutions.clear();
    console.log('[Orchestrator] ✅ Shutdown complete');
  }

  isHealthy(): boolean {
    return this.activeExecutions.size < this.config.maxConcurrentWorkflows;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let orchestratorInstance: SkillOrchestrator | null = null;

export function getSkillOrchestrator(
  config?: Partial<OrchestratorConfig>
): SkillOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new SkillOrchestrator(config);
  }
  return orchestratorInstance;
}

export default SkillOrchestrator;
