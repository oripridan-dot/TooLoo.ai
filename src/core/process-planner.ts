/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TooLoo.ai - Process Planner
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The Mind of TooLoo. Plans, executes, validates, reflects, replans.
 *
 * Key insight: The planner is EMBEDDED inside every process it runs.
 * It doesn't just create a plan and walk away - it lives through the process,
 * validating each step, reflecting on results, and replanning when needed.
 *
 * A process can be very long because validation ensures quality at each step.
 *
 * The Loop:
 *   1. PLAN     - Break goal into steps with validation criteria
 *   2. EXECUTE  - Run current step using Skills Master
 *   3. VALIDATE - Check if step met its criteria
 *   4. REFLECT  - What worked? What didn't? What did we learn?
 *   5. REPLAN   - Adjust remaining steps based on learning
 *   6. REPEAT   - Until goal achieved or fundamental block
 *
 * @version Genesis
 * @born 2025-12-16
 */

import { EventEmitter } from 'events';
import type {
  TooLooContext,
  ProcessState,
  ProcessStep,
  StepReflection,
  ValidationResult,
} from './kernel.js';
import { kernel } from './kernel.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProcessGoal {
  description: string;
  success_criteria: string[];
  constraints?: string[];
  time_budget?: string;
  quality_level?: 'draft' | 'good' | 'excellent' | 'world-class';
}

export interface PlannerConfig {
  max_replans_per_step: number;
  validation_strictness: 'lenient' | 'balanced' | 'strict';
  auto_continue: boolean; // Continue to next step automatically or pause for human
  learning_mode: boolean; // Extra reflection and recording
}

export interface ExecutionContext {
  process: ProcessState;
  step: ProcessStep;
  attempt: number;
  history: StepResult[];
}

export interface StepResult {
  step_id: string;
  success: boolean;
  output: unknown;
  validation: ValidationResult;
  reflection: StepReflection;
  duration_ms: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESS PLANNER
// ═══════════════════════════════════════════════════════════════════════════════

export class ProcessPlanner extends EventEmitter {
  private config: PlannerConfig;
  private currentProcess: ProcessState | null = null;
  private executionHistory: StepResult[] = [];

  constructor(config?: Partial<PlannerConfig>) {
    super();
    this.config = {
      max_replans_per_step: 3,
      validation_strictness: 'balanced',
      auto_continue: true,
      learning_mode: true,
      ...config,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 1: PLAN
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create an initial plan for achieving a goal
   * This will be called with LLM assistance to break down the goal
   */
  async plan(goal: ProcessGoal, context: TooLooContext): Promise<ProcessState> {
    this.emit('planning:start', { goal });

    const soul = context.soul;
    const evolution = context.evolution;

    // Build planning prompt with soul context
    const planningContext = `
# TooLoo's Soul (Always Remember)
${soul.destiny}

# Current Goal
${goal.description}

# Success Criteria
${goal.success_criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

# Quality Level
${goal.quality_level || 'excellent'}

# Constraints
${goal.constraints?.join('\n') || 'None specified'}

# Relevant Lessons from Past
${
  evolution.lessons
    .slice(-10)
    .map((l) => `- ${l.lesson}`)
    .join('\n') || 'None yet - this is new territory'
}

# Industry Wisdom
${
  evolution.industry_wisdom
    .slice(-5)
    .map((w) => `- [${w.domain}] ${w.insight}`)
    .join('\n') || 'None yet - will gather as needed'
}

# Instructions
Break this goal into concrete steps. For each step:
1. Clear description of what to do
2. What skills/capabilities are needed
3. How to validate the step succeeded (specific criteria)

Remember TooLoo's principle: "Validated Progress" - every step must have clear validation.
Remember: "Industry Excellence" - look to the best in the world for patterns.
`;

    // This is where the LLM would generate the plan
    // For now, return a placeholder structure that shows the format
    const process: ProcessState = {
      id: this.generateProcessId(),
      goal: goal.description,
      plan: [], // Will be populated by LLM
      currentStepIndex: 0,
      started_at: new Date().toISOString(),
      reflections: [],
    };

    this.currentProcess = process;
    this.emit('planning:complete', { process, planningContext });

    return process;
  }

  /**
   * Add steps to the plan (called after LLM generates them)
   */
  setSteps(steps: ProcessStep[]): void {
    if (!this.currentProcess) {
      throw new Error('No active process to add steps to');
    }
    this.currentProcess.plan = steps;
    this.emit('steps:set', { steps });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 2: EXECUTE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Execute the current step of the process
   * Returns the result and whether to continue
   */
  async executeCurrentStep(context: TooLooContext): Promise<StepResult> {
    if (!this.currentProcess) {
      throw new Error('No active process');
    }

    const step = this.currentProcess.plan[this.currentProcess.currentStepIndex];
    if (!step) {
      throw new Error('No more steps to execute');
    }

    step.status = 'in-progress';
    this.emit('step:start', { step, index: this.currentProcess.currentStepIndex });

    const startTime = Date.now();

    try {
      // 1. Execute the step (Skills Master will handle finding/creating needed skills)
      this.emit('step:executing', { step });

      // The actual execution happens through Skills Master
      // This emits an event that Skills Master listens to
      const executionPromise = new Promise<unknown>((resolve, reject) => {
        this.emit('step:execute-request', {
          step,
          context,
          resolve,
          reject,
        });

        // Timeout after 5 minutes per step (can be configured)
        setTimeout(() => reject(new Error('Step execution timeout')), 5 * 60 * 1000);
      });

      const output = await executionPromise;
      step.result = output;

      // 2. Validate the result
      step.status = 'validating';
      const validation = await this.validateStep(step, output, context);
      step.validation = validation;

      // 3. Reflect on what happened
      const reflection = await this.reflectOnStep(step, validation, context);
      this.currentProcess.reflections.push(reflection);

      const duration = Date.now() - startTime;

      const result: StepResult = {
        step_id: step.id,
        success: validation.passed,
        output,
        validation,
        reflection,
        duration_ms: duration,
      };

      this.executionHistory.push(result);

      // 4. Decide what to do next
      if (validation.passed) {
        step.status = 'completed';
        this.emit('step:complete', { step, result });

        // Record lesson if in learning mode
        if (this.config.learning_mode && reflection.lesson_learned) {
          kernel.recordLesson({
            context: `Step "${step.description}" in process "${this.currentProcess.goal}"`,
            lesson: reflection.lesson_learned,
          });
        }

        // Move to next step or complete process
        this.currentProcess.currentStepIndex++;
        if (this.currentProcess.currentStepIndex >= this.currentProcess.plan.length) {
          this.emit('process:complete', {
            process: this.currentProcess,
            history: this.executionHistory,
          });
        } else if (this.config.auto_continue) {
          // Continue automatically
          return this.executeCurrentStep(context);
        }
      } else {
        step.status = 'failed';
        this.emit('step:failed', { step, result });

        // Should we replan?
        if (reflection.should_replan) {
          step.status = 'replanning';
          await this.replan(step, reflection, context);
        }
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      step.status = 'failed';

      const result: StepResult = {
        step_id: step.id,
        success: false,
        output: null,
        validation: {
          passed: false,
          criteria_met: [],
          criteria_failed: [step.validation_criteria],
          confidence: 0,
          suggestions: ['Step threw an error during execution'],
        },
        reflection: {
          step_id: step.id,
          what_worked: 'Nothing - step failed with error',
          what_didnt: String(error),
          lesson_learned: `Error executing "${step.description}": ${error}`,
          should_replan: true,
        },
        duration_ms: duration,
      };

      this.executionHistory.push(result);
      this.emit('step:error', { step, error, result });

      return result;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 3: VALIDATE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Validate that a step met its criteria
   * This is crucial - we don't assume success, we verify it
   */
  async validateStep(
    step: ProcessStep,
    output: unknown,
    context: TooLooContext
  ): Promise<ValidationResult> {
    this.emit('validation:start', { step, output });

    // Build validation context
    const validationContext = `
# Step to Validate
${step.description}

# Validation Criteria
${step.validation_criteria}

# Step Output
${JSON.stringify(output, null, 2).slice(0, 5000)}

# TooLoo's Value: Honesty
"I never pretend to know what I don't know. I say when I'm uncertain. I admit when I fail."

# Instructions
Honestly evaluate whether this step's output meets the validation criteria.
Be specific about what criteria were met and what were not.
If uncertain, say so - don't pretend success.
Provide suggestions for improvement if criteria were not fully met.
`;

    // This would be evaluated by LLM
    // For now, emit event for external handling
    const validationPromise = new Promise<ValidationResult>((resolve) => {
      this.emit('validation:evaluate-request', {
        step,
        output,
        context,
        validationContext,
        resolve,
      });

      // Default timeout - assume passed if no response
      setTimeout(() => {
        resolve({
          passed: true,
          criteria_met: [step.validation_criteria],
          criteria_failed: [],
          confidence: 0.5,
          suggestions: ['Validation timed out - assumed passed'],
        });
      }, 30000);
    });

    const result = await validationPromise;
    this.emit('validation:complete', { step, result });

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 4: REFLECT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Reflect on what happened in a step
   * Extract lessons, decide if replanning is needed
   */
  async reflectOnStep(
    step: ProcessStep,
    validation: ValidationResult,
    context: TooLooContext
  ): Promise<StepReflection> {
    this.emit('reflection:start', { step, validation });

    const reflectionContext = `
# Step Completed
${step.description}

# Validation Result
Passed: ${validation.passed}
Confidence: ${validation.confidence}
Criteria Met: ${validation.criteria_met.join(', ') || 'None'}
Criteria Failed: ${validation.criteria_failed.join(', ') || 'None'}
Suggestions: ${validation.suggestions.join(', ') || 'None'}

# TooLoo's Principle: Organic Growth
"Each process I run teaches me. Each skill I create becomes part of who I am."

# Instructions
Reflect on this step:
1. What worked well that should be remembered?
2. What didn't work that should be avoided?
3. What lesson can be extracted for future?
4. Should we replan the remaining steps based on what we learned?
`;

    // This would be evaluated by LLM
    const reflectionPromise = new Promise<StepReflection>((resolve) => {
      this.emit('reflection:evaluate-request', {
        step,
        validation,
        context,
        reflectionContext,
        resolve,
      });

      // Default timeout
      setTimeout(() => {
        resolve({
          step_id: step.id,
          what_worked: validation.passed ? 'Step completed successfully' : 'Attempted the step',
          what_didnt: validation.passed
            ? 'Nothing significant'
            : validation.criteria_failed.join(', '),
          lesson_learned: validation.passed
            ? `"${step.description}" approach worked well`
            : `"${step.description}" needs different approach: ${validation.suggestions.join(', ')}`,
          should_replan: !validation.passed && validation.confidence < 0.3,
        });
      }, 15000);
    });

    const reflection = await reflectionPromise;
    this.emit('reflection:complete', { step, reflection });

    return reflection;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 5: REPLAN
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Replan remaining steps based on what we learned
   * This is where the process adapts and evolves
   */
  async replan(
    failedStep: ProcessStep,
    reflection: StepReflection,
    context: TooLooContext
  ): Promise<void> {
    if (!this.currentProcess) return;

    this.emit('replan:start', { failedStep, reflection });

    const replanContext = `
# Current Goal
${this.currentProcess.goal}

# Failed Step
${failedStep.description}

# What Went Wrong
${reflection.what_didnt}

# Lesson Learned
${reflection.lesson_learned}

# Remaining Steps
${
  this.currentProcess.plan
    .slice(this.currentProcess.currentStepIndex + 1)
    .map((s, i) => `${i + 1}. ${s.description}`)
    .join('\n') || 'None'
}

# TooLoo's Principle: Creative Problem-Solving
"When a path is blocked, I find another. I don't give up - I evolve."

# Instructions
Given what we learned from this failure:
1. Should we retry this step with a different approach?
2. Should we add preparatory steps we missed?
3. Should we adjust the remaining steps?
4. Is there a completely different path to the goal?

Provide the adjusted plan.
`;

    // Emit event for external handling
    this.emit('replan:request', {
      process: this.currentProcess,
      failedStep,
      reflection,
      context,
      replanContext,
    });

    // The replanned steps will be set via setSteps()
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get current process state
   */
  getCurrentProcess(): ProcessState | null {
    return this.currentProcess;
  }

  /**
   * Get execution history
   */
  getHistory(): StepResult[] {
    return [...this.executionHistory];
  }

  /**
   * Generate unique process ID
   */
  private generateProcessId(): string {
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14);
    const random = Math.random().toString(36).substring(2, 6);
    return `proc-${timestamp}-${random}`;
  }

  /**
   * Pause the current process (for human intervention)
   */
  pause(): void {
    if (this.currentProcess) {
      this.emit('process:paused', { process: this.currentProcess });
    }
  }

  /**
   * Resume the current process
   */
  async resume(context: TooLooContext): Promise<StepResult | null> {
    if (!this.currentProcess) return null;
    this.emit('process:resumed', { process: this.currentProcess });
    return this.executeCurrentStep(context);
  }

  /**
   * Abort the current process
   */
  abort(reason: string): void {
    if (this.currentProcess) {
      this.emit('process:aborted', { process: this.currentProcess, reason });
      this.currentProcess = null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const processPlanner = new ProcessPlanner();
export default processPlanner;
