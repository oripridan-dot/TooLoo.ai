/**
 * @file TooLoo Genesis - The Process Planner (Mind)
 * @description Autonomous execution loop: Plan → Execute → Validate → Reflect
 * @version 1.0.0
 * @created 2025-12-16
 *
 * The Mind orchestrates TooLoo's autonomous behavior. It:
 * 1. Receives goals from the human partner or self-generated
 * 2. Plans the steps to achieve them
 * 3. Executes each step with permission checking
 * 4. Validates results against quality standards
 * 5. Reflects and learns from outcomes
 *
 * Core Pursuits Applied:
 * - QUALITY: Validation gates at every step
 * - PERFORMANCE: Accuracy tracking and retry logic
 * - EFFICIENCY: Progress tracking and optimization
 */

import { EventEmitter } from 'events';
import {
  Brain,
  PlanResult,
  PlanStep,
  ValidationResult,
  ReflectionResult,
  ThoughtResult,
} from './brain.js';
import { SkillsMaster } from './skills-master.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';

// =============================================================================
// TYPES
// =============================================================================

export type ProcessPhase =
  | 'idle'
  | 'planning'
  | 'executing'
  | 'validating'
  | 'reflecting'
  | 'awaiting-permission';

export interface Goal {
  id: string;
  description: string;
  source: 'human' | 'self-generated';
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline?: Date;
  context?: string;
  createdAt: Date;
}

export interface ProcessState {
  phase: ProcessPhase;
  currentGoal: Goal | null;
  currentPlan: PlanResult | null;
  currentStepIndex: number;
  pendingPermission: PermissionRequest | null;
  history: ProcessHistoryEntry[];
  metrics: ProcessMetrics;
}

export interface ProcessHistoryEntry {
  goalId: string;
  goal: string;
  plan: PlanResult;
  results: StepResult[];
  reflection: ReflectionResult | null;
  success: boolean;
  startedAt: Date;
  completedAt: Date;
  totalDuration: number;
}

export interface StepResult {
  stepId: number;
  action: string;
  output: string;
  validation: ValidationResult | null;
  success: boolean;
  duration: number;
  retries: number;
}

export interface PermissionRequest {
  id: string;
  step: PlanStep;
  zone: 'yellow' | 'red';
  description: string;
  prompt: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface ProcessMetrics {
  goalsCompleted: number;
  goalsFailed: number;
  totalStepsExecuted: number;
  averageStepDuration: number;
  averageConfidence: number;
  accuracyRate: number;
  efficiencyScore: number;
  lessonsLearned: number;
}

export interface PlannerConfig {
  maxConcurrentGoals: number;
  maxRetriesPerStep: number;
  permissionTimeoutMs: number;
  validationRequired: boolean;
  reflectionRequired: boolean;
  autoMode: boolean;
}

// =============================================================================
// THE PROCESS PLANNER (MIND)
// =============================================================================

export class ProcessPlanner extends EventEmitter {
  private brain: Brain;
  private skills: SkillsMaster;
  private state: ProcessState;
  private config: PlannerConfig;
  private goalQueue: Goal[] = [];
  private lifeLoopInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(brain: Brain, skills: SkillsMaster, config?: Partial<PlannerConfig>) {
    super();
    this.brain = brain;
    this.skills = skills;
    this.config = {
      maxConcurrentGoals: config?.maxConcurrentGoals ?? 1,
      maxRetriesPerStep: config?.maxRetriesPerStep ?? 1, // Reduced to avoid infinite loops
      permissionTimeoutMs: config?.permissionTimeoutMs ?? 300000, // 5 minutes
      validationRequired: config?.validationRequired ?? true,
      reflectionRequired: config?.reflectionRequired ?? true,
      autoMode: config?.autoMode ?? false,
    };

    this.state = this.createInitialState();

    // Listen to brain events
    this.brain.on('brain:low-confidence', (data) => {
      this.emit('mind:quality-warning', data);
    });
  }

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------

  private createInitialState(): ProcessState {
    return {
      phase: 'idle',
      currentGoal: null,
      currentPlan: null,
      currentStepIndex: -1,
      pendingPermission: null,
      history: [],
      metrics: {
        goalsCompleted: 0,
        goalsFailed: 0,
        totalStepsExecuted: 0,
        averageStepDuration: 0,
        averageConfidence: 0,
        accuracyRate: 1,
        efficiencyScore: 1,
        lessonsLearned: 0,
      },
    };
  }

  private setPhase(phase: ProcessPhase): void {
    const previousPhase = this.state.phase;
    this.state.phase = phase;
    this.emit('mind:phase-change', { from: previousPhase, to: phase });
    console.log(`[Mind] Phase: ${previousPhase} → ${phase}`);
  }

  // ---------------------------------------------------------------------------
  // GOAL MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Add a goal to the queue
   */
  addGoal(
    description: string,
    options?: {
      source?: 'human' | 'self-generated';
      priority?: Goal['priority'];
      context?: string;
    }
  ): Goal {
    const goal: Goal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description,
      source: options?.source ?? 'human',
      priority: options?.priority ?? 'medium',
      context: options?.context,
      createdAt: new Date(),
    };

    this.goalQueue.push(goal);
    this.emit('mind:goal-added', goal);
    console.log(`[Mind] Goal added: "${description.slice(0, 50)}..." (${goal.priority})`);

    // Auto-start if in auto mode and idle
    if (this.config.autoMode && this.state.phase === 'idle') {
      this.processNextGoal();
    }

    return goal;
  }

  /**
   * Get the next goal based on priority
   */
  private getNextGoal(): Goal | null {
    if (this.goalQueue.length === 0) return null;

    // Sort by priority (critical > high > medium > low)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    this.goalQueue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return this.goalQueue.shift() ?? null;
  }

  // ---------------------------------------------------------------------------
  // THE LIFE LOOP
  // ---------------------------------------------------------------------------

  /**
   * Start the autonomous life loop
   */
  startLifeLoop(intervalMs = 5000): void {
    if (this.isRunning) {
      console.log('[Mind] Life loop already running');
      return;
    }

    console.log('[Mind] 💓 Starting life loop...');
    this.isRunning = true;
    this.emit('mind:life-loop-started');

    // Initial tick
    this.lifeTick();

    // Regular heartbeat
    this.lifeLoopInterval = setInterval(() => {
      this.lifeTick();
    }, intervalMs);
  }

  /**
   * Stop the life loop
   */
  stopLifeLoop(): void {
    if (this.lifeLoopInterval) {
      clearInterval(this.lifeLoopInterval);
      this.lifeLoopInterval = null;
    }
    this.isRunning = false;
    this.emit('mind:life-loop-stopped');
    console.log('[Mind] 💤 Life loop stopped');
  }

  /**
   * Skip the current step (for when user wants to move on)
   */
  skipCurrentStep(): void {
    if (this.state.currentStepIndex >= 0 && this.state.currentPlan) {
      console.log(`[Mind] ⏭️ Skipping current step`);
      // Clear any pending permission
      if (this.state.pendingPermission) {
        this.emit('permission:response', { approved: false });
        this.state.pendingPermission = null;
      }
      this.emit('mind:step-skipped', { stepIndex: this.state.currentStepIndex });
    }
  }

  /**
   * Single tick of the life loop
   */
  private async lifeTick(): Promise<void> {
    try {
      switch (this.state.phase) {
        case 'idle':
          // Check for new goals or self-generate one
          await this.processNextGoal();
          break;

        case 'planning':
          // Continue planning if needed
          break;

        case 'executing':
          // Execution happens in processGoal
          break;

        case 'awaiting-permission':
          // Check for permission timeout
          this.checkPermissionTimeout();
          break;

        case 'validating':
        case 'reflecting':
          // These phases complete on their own
          break;
      }

      // Emit heartbeat
      this.emit('mind:heartbeat', {
        phase: this.state.phase,
        currentGoal: this.state.currentGoal?.description,
        queueLength: this.goalQueue.length,
        metrics: this.state.metrics,
      });
    } catch (error) {
      console.error('[Mind] Life tick error:', error);
      this.emit('mind:error', error);
    }
  }

  // ---------------------------------------------------------------------------
  // GOAL PROCESSING (The Main Loop)
  // ---------------------------------------------------------------------------

  /**
   * Process the next goal in queue
   */
  async processNextGoal(): Promise<void> {
    if (this.state.currentGoal) {
      console.log('[Mind] Already processing a goal');
      return;
    }

    const goal = this.getNextGoal();
    if (!goal) {
      // No goals - stay idle or self-generate
      if (this.config.autoMode) {
        await this.considerSelfGoal();
      }
      return;
    }

    this.state.currentGoal = goal;
    this.emit('mind:goal-started', goal);
    console.log(`[Mind] 🎯 Processing goal: "${goal.description.slice(0, 50)}..."`);

    try {
      await this.executeGoal(goal);
    } catch (error) {
      console.error('[Mind] Goal execution failed:', error);
      this.handleGoalFailure(goal, error);
    }
  }

  /**
   * Execute a goal through the full cycle
   */
  private async executeGoal(goal: Goal): Promise<void> {
    const startTime = Date.now();
    const stepResults: StepResult[] = [];

    // =========================================================================
    // PHASE 1: PLANNING
    // =========================================================================
    this.setPhase('planning');
    this.emit('mind:planning', { goal });

    const plan = await this.brain.plan(goal.description, goal.context);
    this.state.currentPlan = plan;

    // Quality gate: Check plan confidence
    if (plan.confidence < this.brain.getConfig().confidenceThreshold) {
      this.emit('mind:plan-low-confidence', {
        plan,
        threshold: this.brain.getConfig().confidenceThreshold,
      });
      // Could ask human for guidance here
    }

    this.emit('mind:planned', { goal, plan });
    console.log(
      `[Mind] 📋 Plan created with ${plan.steps.length} steps (confidence: ${plan.confidence.toFixed(2)})`
    );

    // =========================================================================
    // PHASE 2: EXECUTING
    // =========================================================================
    this.setPhase('executing');

    // Track retries per step to prevent infinite loops
    const stepRetries: Map<number, number> = new Map();

    for (let i = 0; i < plan.steps.length; i++) {
      this.state.currentStepIndex = i;
      const step = plan.steps[i];
      if (!step) continue; // Skip if step is undefined

      // Get current retry count for this step
      const currentRetries = stepRetries.get(step.id) ?? 0;

      this.emit('mind:step-starting', { stepIndex: i, step });
      console.log(`[Mind] ▶️ Step ${i + 1}/${plan.steps.length}: ${step.action}`);

      // Check permission based on zone
      const canProceed = await this.checkPermission(step);
      if (!canProceed) {
        console.log(`[Mind] ⛔ Step blocked by permission`);
        stepResults.push({
          stepId: step.id,
          action: step.action,
          output: 'Blocked: Permission denied',
          validation: null,
          success: false,
          duration: 0,
          retries: currentRetries,
        });
        continue;
      }

      // Execute step with retry logic
      const stepResult = await this.executeStep(step);
      stepResult.retries = currentRetries;
      stepResults.push(stepResult);

      // =======================================================================
      // PHASE 3: VALIDATING (Per Step)
      // =======================================================================
      if (this.config.validationRequired && step.validation) {
        this.setPhase('validating');

        const validation = await this.brain.validate(
          stepResult.output,
          step.validation,
          `Step: ${step.action}\nDescription: ${step.description}`
        );

        stepResult.validation = validation;
        stepResult.success = validation.isValid;

        if (!validation.isValid) {
          this.emit('mind:validation-failed', { step, validation });

          // Retry if not at max retries (use map for proper tracking)
          if (currentRetries < this.config.maxRetriesPerStep) {
            console.log(`[Mind] ⚠️ Step failed validation, retrying (${currentRetries + 1}/${this.config.maxRetriesPerStep})...`);
            stepRetries.set(step.id, currentRetries + 1);
            stepResults.pop(); // Remove the failed result, will be re-added on retry
            i--; // Retry this step
            continue;
          } else {
            console.log(`[Mind] ❌ Step max retries reached, moving on`);
          }
        }

        this.setPhase('executing');
      }

      this.emit('mind:step-completed', { stepIndex: i, result: stepResult });

      // Update efficiency metrics
      this.updateStepMetrics(stepResult);
    }

    // =========================================================================
    // PHASE 4: REFLECTING
    // =========================================================================
    let reflection: ReflectionResult | null = null;

    if (this.config.reflectionRequired) {
      this.setPhase('reflecting');

      const overallSuccess = stepResults.filter((r) => r.success).length / stepResults.length > 0.8;
      const resultSummary = stepResults
        .map((r) => `${r.action}: ${r.success ? '✓' : '✗'}`)
        .join('\n');

      reflection = await this.brain.reflect(
        goal.description,
        resultSummary,
        overallSuccess,
        goal.context
      );

      // Record lessons to evolution journal
      if (reflection.lessonsLearned.length > 0) {
        await this.recordToEvolutionJournal(reflection.lessonsLearned);
      }

      this.emit('mind:reflected', { goal, reflection });
    }

    // =========================================================================
    // COMPLETE GOAL
    // =========================================================================
    const endTime = Date.now();
    const overallSuccess = stepResults.filter((r) => r.success).length / stepResults.length > 0.8;

    const historyEntry: ProcessHistoryEntry = {
      goalId: goal.id,
      goal: goal.description,
      plan,
      results: stepResults,
      reflection,
      success: overallSuccess,
      startedAt: new Date(startTime),
      completedAt: new Date(endTime),
      totalDuration: endTime - startTime,
    };

    this.state.history.push(historyEntry);
    this.updateGoalMetrics(overallSuccess);

    // Reset state
    this.state.currentGoal = null;
    this.state.currentPlan = null;
    this.state.currentStepIndex = -1;
    this.setPhase('idle');

    this.emit('mind:goal-completed', { goal, success: overallSuccess, history: historyEntry });
    console.log(
      `[Mind] ${overallSuccess ? '✅' : '❌'} Goal completed: "${goal.description.slice(0, 30)}..." (${endTime - startTime}ms)`
    );
  }

  // ---------------------------------------------------------------------------
  // STEP EXECUTION
  // ---------------------------------------------------------------------------

  /**
   * Execute a single step
   */
  private async executeStep(step: PlanStep): Promise<StepResult> {
    const startTime = Date.now();

    try {
      // Use brain to execute the step
      const thought = await this.brain.execute(
        step.action,
        step.description,
        `This is step ${step.id} of the plan.`
      );

      // Use skills master to actually perform the action
      const output = await this.skills.executeAction(
        step.action,
        step.description,
        thought.content
      );

      return {
        stepId: step.id,
        action: step.action,
        output: output,
        validation: null,
        success: true,
        duration: Date.now() - startTime,
        retries: 0,
      };
    } catch (error) {
      return {
        stepId: step.id,
        action: step.action,
        output: `Error: ${(error as Error).message}`,
        validation: null,
        success: false,
        duration: Date.now() - startTime,
        retries: 0,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // PERMISSION MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Check if permission is needed for a step
   */
  private async checkPermission(step: PlanStep): Promise<boolean> {
    const autonomyMode = this.brain.getAutonomyMode();
    const soul = this.brain.getSoul();

    if (!soul?.autonomy) {
      // No soul = no permission system = proceed
      return true;
    }

    // Get mode config from soul autonomy.modes
    const modes = (soul.autonomy as any).modes;
    const modeConfig = modes?.[autonomyMode];

    if (!modeConfig) {
      // If no mode config, default to allowing green zone
      console.log(`[Mind] ⚠️ No mode config for "${autonomyMode}", defaulting to allow green zone`);
      return step.zone === 'green';
    }

    switch (step.zone) {
      case 'green':
        // Green zone: check if mode allows it
        const greenAllowed = modeConfig.green_zone === true;
        if (!greenAllowed) {
          console.log(`[Mind] 🟢 Green zone blocked by autonomy mode: ${autonomyMode}`);
        }
        return greenAllowed;

      case 'yellow':
        if (modeConfig.yellow_zone === 'notify') {
          // Notify and proceed after delay
          this.emit('mind:permission-notify', {
            step,
            message: `📝 Proceeding with: ${step.action}`,
          });
          const delaySeconds = (soul.autonomy as any).yellow_zone?.delay_seconds ?? 5;
          await this.delay(delaySeconds * 1000);
          return true;
        }
        return modeConfig.yellow_zone === true;

      case 'red':
        if (modeConfig.red_zone === 'ask') {
          // Must ask for permission
          return this.requestPermission(step);
        }
        if (modeConfig.red_zone === 'notify') {
          // Notify but proceed
          this.emit('mind:permission-notify', {
            step,
            message: `🚨 Executing high-impact action: ${step.action}`,
          });
          return true;
        }
        return modeConfig.red_zone === true;

      default:
        return true;
    }
  }

  /**
   * Request permission from human
   */
  private async requestPermission(step: PlanStep): Promise<boolean> {
    const request: PermissionRequest = {
      id: `perm-${Date.now()}`,
      step,
      zone: step.zone as 'yellow' | 'red',
      description: step.description,
      prompt: `⚠️ Permission required for: ${step.action}\n\n${step.description}\n\nApprove? [y/n]`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.permissionTimeoutMs),
    };

    this.state.pendingPermission = request;
    this.setPhase('awaiting-permission');
    this.emit('mind:permission-required', request);

    console.log(`[Mind] ⏳ Awaiting permission for: ${step.action}`);

    // Wait for response or timeout
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.state.pendingPermission) {
          clearInterval(checkInterval);
          resolve(true); // Permission was granted
        } else if (Date.now() > request.expiresAt.getTime()) {
          clearInterval(checkInterval);
          this.handlePermissionTimeout(request);
          resolve(false);
        }
      }, 1000);

      // Listen for approval/denial
      this.once('permission:response', (response: { approved: boolean }) => {
        clearInterval(checkInterval);
        this.state.pendingPermission = null;
        resolve(response.approved);
      });
    });
  }

  /**
   * Handle permission approval from human
   */
  approvePermission(permissionId: string): void {
    if (this.state.pendingPermission?.id === permissionId) {
      console.log(`[Mind] ✅ Permission approved`);
      this.emit('permission:response', { approved: true });
    }
  }

  /**
   * Handle permission denial from human
   */
  denyPermission(permissionId: string): void {
    if (this.state.pendingPermission?.id === permissionId) {
      console.log(`[Mind] ❌ Permission denied`);
      this.emit('permission:response', { approved: false });
    }
  }

  /**
   * Check for permission timeout
   */
  private checkPermissionTimeout(): void {
    const request = this.state.pendingPermission;
    if (request && Date.now() > request.expiresAt.getTime()) {
      this.handlePermissionTimeout(request);
    }
  }

  /**
   * Handle permission timeout
   */
  private handlePermissionTimeout(request: PermissionRequest): void {
    const soul = this.brain.getSoul();
    const autonomyConfig = soul?.autonomy as Record<string, any> | undefined;
    const timeoutBehavior = autonomyConfig?.['timeout_behavior'] ?? 'skip';

    console.log(`[Mind] ⏰ Permission timeout - behavior: ${timeoutBehavior}`);
    this.emit('mind:permission-timeout', { request, behavior: timeoutBehavior });

    switch (timeoutBehavior) {
      case 'wait':
        // Keep waiting (extend timeout)
        request.expiresAt = new Date(Date.now() + this.config.permissionTimeoutMs);
        break;

      case 'skip':
        // Skip this step
        this.state.pendingPermission = null;
        this.emit('permission:response', { approved: false });
        break;

      case 'downgrade':
        // Try a safer alternative
        this.state.pendingPermission = null;
        this.emit('permission:response', { approved: false });
        this.emit('mind:seeking-alternative', { originalStep: request.step });
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // SELF-GENERATED GOALS
  // ---------------------------------------------------------------------------

  /**
   * Consider generating a self-improvement goal
   */
  private async considerSelfGoal(): Promise<void> {
    // Don't self-generate too often
    const recentGoals = this.state.history.filter(
      (h) => Date.now() - h.completedAt.getTime() < 3600000 // Last hour
    );
    if (recentGoals.length >= 5) return;

    // Ask brain what to improve
    const thought = await this.brain.think(`
      Review my recent performance and suggest one small, specific improvement I could make.
      Consider:
      - Recent errors or low-confidence responses
      - Patterns I've noticed
      - Skills I'm missing
      
      Suggest ONLY if there's a clear, actionable improvement. Otherwise say "No improvement needed right now."
    `);

    if (
      thought.confidence > 0.7 &&
      !thought.content.toLowerCase().includes('no improvement needed')
    ) {
      this.addGoal(thought.content, {
        source: 'self-generated',
        priority: 'low',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // METRICS & EVOLUTION
  // ---------------------------------------------------------------------------

  private updateStepMetrics(result: StepResult): void {
    this.state.metrics.totalStepsExecuted++;

    // Update average duration
    this.state.metrics.averageStepDuration =
      (this.state.metrics.averageStepDuration * (this.state.metrics.totalStepsExecuted - 1) +
        result.duration) /
      this.state.metrics.totalStepsExecuted;

    // Update accuracy rate
    const successCount = this.state.metrics.totalStepsExecuted * this.state.metrics.accuracyRate;
    this.state.metrics.accuracyRate =
      (successCount + (result.success ? 1 : 0)) / this.state.metrics.totalStepsExecuted;
  }

  private updateGoalMetrics(success: boolean): void {
    if (success) {
      this.state.metrics.goalsCompleted++;
    } else {
      this.state.metrics.goalsFailed++;
    }
  }

  /**
   * Record lessons to evolution journal
   */
  private async recordToEvolutionJournal(lessons: string[]): Promise<void> {
    const evolutionPath = join(process.cwd(), 'soul', 'evolution.yaml');

    try {
      let evolution: any = { lessons: [], skills_created: [], growth_events: [] };

      if (existsSync(evolutionPath)) {
        evolution = YAML.parse(readFileSync(evolutionPath, 'utf-8'));
      }

      // Add new lessons with timestamp
      for (const lesson of lessons) {
        evolution.lessons = evolution.lessons || [];
        evolution.lessons.push({
          content: lesson,
          timestamp: new Date().toISOString(),
          source: 'reflection',
        });
      }

      // Keep only last 100 lessons for efficiency
      if (evolution.lessons.length > 100) {
        evolution.lessons = evolution.lessons.slice(-100);
      }

      writeFileSync(evolutionPath, YAML.stringify(evolution), 'utf-8');
      this.state.metrics.lessonsLearned += lessons.length;

      this.emit('mind:lessons-recorded', { count: lessons.length });
    } catch (error) {
      console.error('[Mind] Failed to record lessons:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private handleGoalFailure(goal: Goal, error: unknown): void {
    this.state.metrics.goalsFailed++;

    const historyEntry: ProcessHistoryEntry = {
      goalId: goal.id,
      goal: goal.description,
      plan: this.state.currentPlan ?? { goal: goal.description, steps: [], confidence: 0 },
      results: [],
      reflection: null,
      success: false,
      startedAt: goal.createdAt,
      completedAt: new Date(),
      totalDuration: Date.now() - goal.createdAt.getTime(),
    };

    this.state.history.push(historyEntry);
    this.state.currentGoal = null;
    this.state.currentPlan = null;
    this.state.currentStepIndex = -1;
    this.setPhase('idle');

    this.emit('mind:goal-failed', { goal, error });
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  getState(): ProcessState {
    return { ...this.state };
  }

  getMetrics(): ProcessMetrics {
    return { ...this.state.metrics };
  }

  getHistory(): ProcessHistoryEntry[] {
    return [...this.state.history];
  }

  getGoalQueue(): Goal[] {
    return [...this.goalQueue];
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getCurrentPhase(): ProcessPhase {
    return this.state.phase;
  }

  /**
   * Receive a command from the human partner
   */
  async receiveCommand(command: string): Promise<void> {
    // Parse the command - could be a goal, question, or directive
    const thought = await this.brain.think(`
      Interpret this command from my human partner: "${command}"
      
      Is this:
      1. A GOAL to achieve (something to plan and execute)
      2. A QUESTION to answer (requires thinking but no action)
      3. A DIRECTIVE to follow (change my behavior or settings)
      
      Respond with JSON: { "type": "goal|question|directive", "content": "interpreted content" }
    `);

    try {
      const jsonMatch = thought.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        switch (parsed.type) {
          case 'goal':
            this.addGoal(parsed.content, { source: 'human', priority: 'high' });
            break;
          case 'question':
            // Answer directly
            const answer = await this.brain.think(command);
            this.emit('mind:response', { content: answer.content, confidence: answer.confidence });
            break;
          case 'directive':
            // Handle directives (e.g., "be more autonomous", "stop")
            await this.handleDirective(parsed.content);
            break;
        }
      }
    } catch {
      // Fallback: treat as a goal
      this.addGoal(command, { source: 'human', priority: 'high' });
    }
  }

  /**
   * Handle a directive
   */
  private async handleDirective(directive: string): Promise<void> {
    const lowered = directive.toLowerCase();

    if (lowered.includes('stop') || lowered.includes('pause')) {
      this.stopLifeLoop();
      this.emit('mind:response', {
        content: 'I have paused. Let me know when to continue.',
        confidence: 1,
      });
    } else if (lowered.includes('resume') || lowered.includes('continue')) {
      this.startLifeLoop();
      this.emit('mind:response', { content: 'Resuming autonomous operation.', confidence: 1 });
    } else {
      this.emit('mind:response', { content: `I'll remember: ${directive}`, confidence: 0.7 });
    }
  }
}

// =============================================================================
// SINGLETON FACTORY
// =============================================================================

let planner: ProcessPlanner | null = null;

export function getProcessPlanner(brain: Brain, skills: SkillsMaster): ProcessPlanner {
  if (!planner) {
    planner = new ProcessPlanner(brain, skills);
  }
  return planner;
}

export default ProcessPlanner;
