// @version 3.3.125
/**
 * Agent Team Framework
 *
 * Creates automatic agent pairings where every specialized agent
 * is coupled with a validator colleague. Teams work in perfect
 * harmony to ensure 100% validated and refined results with
 * top quality and efficiency.
 *
 * Architecture:
 * - Every agent automatically gets a validator partner
 * - Teams have defined roles: executor + validator
 * - Validation loops ensure quality before output
 * - Cross-system integration with chat, creative, learning, emergence
 * - V3.3.125: Added persistent task queue that survives restarts
 *
 * @module cortex/agent/team-framework
 */

import { bus } from '../../core/event-bus.js';
import { v4 as uuidv4 } from 'uuid';
import { executionAgent, ExecutionAgent } from './execution-agent.js';
import fs from 'fs-extra';
import path from 'path';
import type { AgentTask, TaskResult, TaskType } from './types.js';

// ============================================================================
// TYPES
// ============================================================================

export type AgentRole =
  | 'executor' // Primary task executor
  | 'validator' // Quality validator
  | 'planner' // Strategy and planning
  | 'critic' // Critical analysis
  | 'optimizer' // Performance optimization
  | 'guardian' // Safety and ethics
  | 'researcher' // Knowledge gathering
  | 'creative'; // Creative generation

export type TeamStatus =
  | 'idle'
  | 'planning'
  | 'executing'
  | 'validating'
  | 'refining'
  | 'completed'
  | 'failed';

export interface AgentProfile {
  id: string;
  name: string;
  role: AgentRole;
  specialization: string;
  capabilities: string[];
  performanceMetrics: AgentMetrics;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface AgentMetrics {
  tasksCompleted: number;
  successRate: number;
  avgDurationMs: number;
  avgQualityScore: number;
  validationPassRate: number;
}

export interface AgentTeam {
  id: string;
  name: string;
  purpose: string;
  executor: AgentProfile;
  validator: AgentProfile;
  status: TeamStatus;
  currentTask?: TeamTask;
  history: TeamTaskHistory[];
  createdAt: Date;
  metrics: TeamMetrics;
}

export interface TeamMetrics {
  tasksCompleted: number;
  successRate: number;
  avgIterations: number;
  avgDurationMs: number;
  qualityScore: number;
  efficiency: number; // tasks per hour
}

export interface TeamTask {
  id: string;
  teamId: string;
  type: TaskType;
  input: TeamTaskInput;
  status: TeamStatus;
  iterations: TeamIteration[];
  currentIteration: number;
  maxIterations: number;
  startedAt: Date;
  completedAt?: Date;
  finalResult?: TeamTaskResult;
}

export interface TeamTaskInput {
  prompt: string;
  context?: Record<string, unknown>;
  requirements?: string[];
  qualityThreshold?: number;
  maxIterations?: number;
  timeout?: number;
  source: 'chat' | 'creative' | 'learning' | 'emergence' | 'api' | 'internal';
}

export interface TeamIteration {
  number: number;
  executorResult: TaskResult;
  validatorResult: ValidationResult;
  refinements?: string[];
  status: 'passed' | 'needs_refinement' | 'failed';
  durationMs: number;
}

export interface ValidationResult {
  passed: boolean;
  score: number; // 0-1
  issues: ValidationIssue[];
  suggestions: string[];
  confidence: number;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'improvement';
  category: string;
  description: string;
  location?: string;
  fix?: string;
}

export interface TeamTaskResult {
  success: boolean;
  output: string;
  artifacts?: any[];
  qualityScore: number;
  iterations: number;
  totalDurationMs: number;
  validationReport: ValidationResult;
}

export interface TeamTaskHistory {
  taskId: string;
  type: TaskType;
  success: boolean;
  iterations: number;
  qualityScore: number;
  durationMs: number;
  completedAt: Date;
}

// ============================================================================
// AGENT FACTORY
// ============================================================================

export class AgentFactory {
  private static agentCounter = 0;

  /**
   * Create an executor agent with a specific specialization
   */
  static createExecutor(specialization: string, capabilities: string[] = []): AgentProfile {
    AgentFactory.agentCounter++;
    return {
      id: `exec-${uuidv4().slice(0, 8)}`,
      name: `${specialization} Executor #${AgentFactory.agentCounter}`,
      role: 'executor',
      specialization,
      capabilities: ['execute', 'generate', 'analyze', ...capabilities],
      performanceMetrics: {
        tasksCompleted: 0,
        successRate: 1.0,
        avgDurationMs: 0,
        avgQualityScore: 0.8,
        validationPassRate: 0.85,
      },
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };
  }

  /**
   * Create a validator agent that pairs with an executor
   */
  static createValidator(executorSpecialization: string): AgentProfile {
    AgentFactory.agentCounter++;
    return {
      id: `val-${uuidv4().slice(0, 8)}`,
      name: `${executorSpecialization} Validator #${AgentFactory.agentCounter}`,
      role: 'validator',
      specialization: `${executorSpecialization} validation`,
      capabilities: ['validate', 'critique', 'improve', 'analyze'],
      performanceMetrics: {
        tasksCompleted: 0,
        successRate: 1.0,
        avgDurationMs: 0,
        avgQualityScore: 0.9,
        validationPassRate: 1.0,
      },
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };
  }

  /**
   * Create a specialized agent based on role
   */
  static createAgent(role: AgentRole, specialization: string): AgentProfile {
    AgentFactory.agentCounter++;
    const roleCapabilities: Record<AgentRole, string[]> = {
      executor: ['execute', 'generate', 'deploy'],
      validator: ['validate', 'critique', 'analyze'],
      planner: ['plan', 'strategize', 'decompose'],
      critic: ['critique', 'analyze', 'improve'],
      optimizer: ['optimize', 'benchmark', 'refine'],
      guardian: ['safety-check', 'ethics-review', 'risk-assess'],
      researcher: ['research', 'gather', 'synthesize'],
      creative: ['generate', 'imagine', 'innovate'],
    };

    return {
      id: `${role.slice(0, 4)}-${uuidv4().slice(0, 8)}`,
      name: `${specialization} ${role.charAt(0).toUpperCase() + role.slice(1)} #${AgentFactory.agentCounter}`,
      role,
      specialization,
      capabilities: roleCapabilities[role] || [],
      performanceMetrics: {
        tasksCompleted: 0,
        successRate: 1.0,
        avgDurationMs: 0,
        avgQualityScore: 0.85,
        validationPassRate: 0.9,
      },
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };
  }
}

// ============================================================================
// TEAM REGISTRY
// ============================================================================

export class TeamRegistry {
  private static instance: TeamRegistry;
  private teams: Map<string, AgentTeam> = new Map();
  private agentIndex: Map<string, AgentProfile> = new Map();
  private specializationIndex: Map<string, string[]> = new Map(); // specialization -> team IDs

  private constructor() {
    this.setupEventListeners();
    console.log('[TeamRegistry] Initialized');
  }

  static getInstance(): TeamRegistry {
    if (!TeamRegistry.instance) {
      TeamRegistry.instance = new TeamRegistry();
    }
    return TeamRegistry.instance;
  }

  private setupEventListeners() {
    // Auto-create teams when requested
    bus.on('team:create:request', async (event) => {
      const { specialization, purpose } = event.payload;
      const team = this.createTeam(specialization, purpose);
      bus.publish('cortex', 'team:created', { team });
    });

    // Handle team task requests
    bus.on('team:task:submit', async (event) => {
      const { teamId, specialization, input } = event.payload;

      // Find or create team
      let team: AgentTeam | undefined;
      if (teamId) {
        team = this.teams.get(teamId);
      } else if (specialization) {
        team = this.findOrCreateTeam(specialization);
      }

      if (team) {
        bus.publish('cortex', 'team:task:accepted', {
          teamId: team.id,
          taskId: input.taskId || uuidv4(),
        });
      }
    });
  }

  /**
   * Create a new team with executor + validator pair
   */
  createTeam(specialization: string, purpose?: string): AgentTeam {
    const executor = AgentFactory.createExecutor(specialization);
    const validator = AgentFactory.createValidator(specialization);

    const team: AgentTeam = {
      id: `team-${uuidv4().slice(0, 8)}`,
      name: `${specialization} Team`,
      purpose: purpose || `Execute and validate ${specialization} tasks`,
      executor,
      validator,
      status: 'idle',
      history: [],
      createdAt: new Date(),
      metrics: {
        tasksCompleted: 0,
        successRate: 1.0,
        avgIterations: 1.5,
        avgDurationMs: 0,
        qualityScore: 0.85,
        efficiency: 0,
      },
    };

    this.teams.set(team.id, team);
    this.agentIndex.set(executor.id, executor);
    this.agentIndex.set(validator.id, validator);

    // Index by specialization
    const specTeams = this.specializationIndex.get(specialization) || [];
    specTeams.push(team.id);
    this.specializationIndex.set(specialization, specTeams);

    console.log(`[TeamRegistry] Created team: ${team.name} (${team.id})`);
    bus.publish('cortex', 'team:registered', { teamId: team.id, name: team.name });

    return team;
  }

  /**
   * Find existing team by specialization or create new one
   */
  findOrCreateTeam(specialization: string): AgentTeam {
    const teamIds = this.specializationIndex.get(specialization);

    if (teamIds && teamIds.length > 0) {
      // Find idle team
      for (const id of teamIds) {
        const team = this.teams.get(id);
        if (team && team.status === 'idle') {
          return team;
        }
      }
    }

    // Create new team
    return this.createTeam(specialization);
  }

  /**
   * Get team by ID
   */
  getTeam(teamId: string): AgentTeam | undefined {
    return this.teams.get(teamId);
  }

  /**
   * Get all teams
   */
  getAllTeams(): AgentTeam[] {
    return Array.from(this.teams.values());
  }

  /**
   * Get teams by specialization
   */
  getTeamsBySpecialization(specialization: string): AgentTeam[] {
    const teamIds = this.specializationIndex.get(specialization) || [];
    return teamIds.map((id) => this.teams.get(id)).filter((t): t is AgentTeam => t !== undefined);
  }

  /**
   * Update team metrics
   */
  updateTeamMetrics(teamId: string, taskResult: TeamTaskResult): void {
    const team = this.teams.get(teamId);
    if (!team) return;

    const m = team.metrics;
    const totalTasks = m.tasksCompleted + 1;

    m.successRate = (m.successRate * m.tasksCompleted + (taskResult.success ? 1 : 0)) / totalTasks;
    m.avgIterations = (m.avgIterations * m.tasksCompleted + taskResult.iterations) / totalTasks;
    m.avgDurationMs =
      (m.avgDurationMs * m.tasksCompleted + taskResult.totalDurationMs) / totalTasks;
    m.qualityScore = (m.qualityScore * m.tasksCompleted + taskResult.qualityScore) / totalTasks;
    m.tasksCompleted = totalTasks;

    // Efficiency: tasks per hour
    const hoursActive = (Date.now() - team.createdAt.getTime()) / (1000 * 60 * 60);
    m.efficiency = hoursActive > 0 ? totalTasks / hoursActive : 0;
  }
}

// ============================================================================
// TEAM EXECUTOR
// ============================================================================

export class TeamExecutor {
  private static instance: TeamExecutor;
  private registry: TeamRegistry;
  private executionAgent: ExecutionAgent;
  private activeExecutions: Map<string, TeamTask> = new Map();
  private pendingQueue: TeamTask[] = [];
  private queueFilePath: string;

  private readonly DEFAULT_MAX_ITERATIONS = 3;
  private readonly DEFAULT_QUALITY_THRESHOLD = 0.8;

  private constructor() {
    this.registry = TeamRegistry.getInstance();
    this.executionAgent = executionAgent;
    this.queueFilePath = path.join(process.cwd(), 'data', 'task-queue.json');
    this.setupEventListeners();
    this.loadPersistentQueue();
    console.log('[TeamExecutor] Initialized');
  }

  static getInstance(): TeamExecutor {
    if (!TeamExecutor.instance) {
      TeamExecutor.instance = new TeamExecutor();
    }
    return TeamExecutor.instance;
  }

  /**
   * Load persistent queue from disk on startup
   */
  private async loadPersistentQueue(): Promise<void> {
    try {
      if (await fs.pathExists(this.queueFilePath)) {
        const data = await fs.readJson(this.queueFilePath);
        if (Array.isArray(data.queue)) {
          // Restore pending tasks (convert date strings back to Date objects)
          this.pendingQueue = data.queue.map((task: any) => ({
            ...task,
            startedAt: new Date(task.startedAt),
            completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
          }));
          console.log(
            `[TeamExecutor] Restored ${this.pendingQueue.length} pending tasks from queue`
          );

          // Resume processing if we have pending tasks
          if (this.pendingQueue.length > 0) {
            this.processQueue();
          }
        }
      }
    } catch (error) {
      console.warn('[TeamExecutor] Could not load persistent queue:', error);
    }
  }

  /**
   * Save queue to disk for persistence
   */
  private async savePersistentQueue(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.queueFilePath));
      await fs.writeJson(
        this.queueFilePath,
        {
          queue: this.pendingQueue,
          savedAt: new Date().toISOString(),
          version: '3.3.125',
        },
        { spaces: 2 }
      );
    } catch (error) {
      console.warn('[TeamExecutor] Could not save persistent queue:', error);
    }
  }

  /**
   * Add task to persistent queue
   */
  async enqueue(task: TeamTask): Promise<void> {
    this.pendingQueue.push(task);
    await this.savePersistentQueue();

    bus.publish('cortex', 'team:task:queued', {
      taskId: task.id,
      teamId: task.teamId,
      queueLength: this.pendingQueue.length,
    });

    console.log(`[TeamExecutor] Task ${task.id} queued (${this.pendingQueue.length} pending)`);
  }

  /**
   * Remove completed task from queue
   */
  private async dequeue(taskId: string): Promise<void> {
    this.pendingQueue = this.pendingQueue.filter((t) => t.id !== taskId);
    await this.savePersistentQueue();
  }

  /**
   * Process queued tasks
   */
  private async processQueue(): Promise<void> {
    while (this.pendingQueue.length > 0) {
      const task = this.pendingQueue[0];
      if (!task) break;

      console.log(`[TeamExecutor] Processing queued task: ${task.id}`);

      try {
        const team =
          this.registry.getTeam(task.teamId) || this.registry.findOrCreateTeam('general');

        await this.executeWithTeam(team, task);
        await this.dequeue(task.id);
      } catch (error) {
        console.error(`[TeamExecutor] Failed to process queued task ${task.id}:`, error);
        // Move to end of queue for retry
        this.pendingQueue.shift();
        this.pendingQueue.push(task);
        await this.savePersistentQueue();
        break; // Avoid infinite loop on persistent failures
      }
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { pending: number; active: number; tasks: string[] } {
    return {
      pending: this.pendingQueue.length,
      active: this.activeExecutions.size,
      tasks: this.pendingQueue.map((t) => t.id),
    };
  }

  private setupEventListeners() {
    // Listen for execution requests from various sources
    bus.on('chat:execute:request', (event) => this.handleExecutionRequest(event.payload, 'chat'));
    bus.on('creative:execute:request', (event) =>
      this.handleExecutionRequest(event.payload, 'creative')
    );
    bus.on('learning:execute:request', (event) =>
      this.handleExecutionRequest(event.payload, 'learning')
    );
    bus.on('emergence:execute:request', (event) =>
      this.handleExecutionRequest(event.payload, 'emergence')
    );
    bus.on('api:execute:request', (event) => this.handleExecutionRequest(event.payload, 'api'));
  }

  private async handleExecutionRequest(
    payload: {
      prompt: string;
      type?: TaskType;
      context?: Record<string, unknown>;
      requestId?: string;
    },
    source: TeamTaskInput['source']
  ): Promise<void> {
    const { prompt, type = 'execute', context, requestId } = payload;

    // Determine specialization from context or prompt
    const specialization = this.inferSpecialization(prompt, type, context);

    // Find or create appropriate team
    const team = this.registry.findOrCreateTeam(specialization);

    // Create team task
    const teamTask: TeamTask = {
      id: requestId || uuidv4(),
      teamId: team.id,
      type,
      input: {
        prompt,
        context,
        source,
        qualityThreshold: this.DEFAULT_QUALITY_THRESHOLD,
        maxIterations: this.DEFAULT_MAX_ITERATIONS,
      },
      status: 'planning',
      iterations: [],
      currentIteration: 0,
      maxIterations: this.DEFAULT_MAX_ITERATIONS,
      startedAt: new Date(),
    };

    this.activeExecutions.set(teamTask.id, teamTask);

    // Execute with team
    const result = await this.executeWithTeam(team, teamTask);

    // Emit result
    bus.publish('cortex', `${source}:execute:result`, {
      requestId: teamTask.id,
      teamId: team.id,
      result,
    });
  }

  private inferSpecialization(
    prompt: string,
    type: TaskType,
    context?: Record<string, unknown>
  ): string {
    const lower = prompt.toLowerCase();

    // Check for explicit specialization in context
    if (context?.['specialization']) {
      return String(context['specialization']);
    }

    // Infer from type
    const typeSpecializations: Record<TaskType, string> = {
      generate: 'code-generation',
      execute: 'code-execution',
      analyze: 'code-analysis',
      fix: 'code-fixing',
      deploy: 'deployment',
      validate: 'validation',
    };

    // Infer from keywords
    if (lower.includes('test')) return 'testing';
    if (lower.includes('deploy')) return 'deployment';
    if (lower.includes('api')) return 'api-development';
    if (lower.includes('component')) return 'ui-components';
    if (lower.includes('database') || lower.includes('sql')) return 'database';
    if (lower.includes('security')) return 'security';
    if (lower.includes('performance')) return 'optimization';

    return typeSpecializations[type] || 'general';
  }

  /**
   * Execute a task with a team (executor + validator loop)
   */
  async executeWithTeam(team: AgentTeam, task: TeamTask): Promise<TeamTaskResult> {
    const startTime = Date.now();
    team.status = 'executing';
    team.currentTask = task;

    console.log(`[TeamExecutor] Team ${team.name} starting task: ${task.id}`);

    const qualityThreshold = task.input.qualityThreshold || this.DEFAULT_QUALITY_THRESHOLD;
    let currentOutput: TaskResult | null = null;
    let finalValidation: ValidationResult | null = null;

    // Iteration loop: execute → validate → refine
    while (task.currentIteration < task.maxIterations) {
      task.currentIteration++;
      const iterationStart = Date.now();

      console.log(`[TeamExecutor] Iteration ${task.currentIteration}/${task.maxIterations}`);

      // Phase 1: Execute
      task.status = 'executing';
      team.executor.lastActiveAt = new Date();

      const executorInput = this.buildExecutorInput(task, currentOutput, finalValidation);
      currentOutput = await this.runExecutor(task.type, executorInput);

      // Phase 2: Validate
      task.status = 'validating';
      team.validator.lastActiveAt = new Date();

      finalValidation = await this.runValidator(task, currentOutput);

      // Record iteration
      const iteration: TeamIteration = {
        number: task.currentIteration,
        executorResult: currentOutput,
        validatorResult: finalValidation,
        status: finalValidation.passed ? 'passed' : 'needs_refinement',
        durationMs: Date.now() - iterationStart,
      };
      task.iterations.push(iteration);

      // Check if quality threshold met
      if (finalValidation.passed && finalValidation.score >= qualityThreshold) {
        console.log(
          `[TeamExecutor] Quality threshold met (${finalValidation.score.toFixed(2)} >= ${qualityThreshold})`
        );
        break;
      }

      // Check if we should continue refining
      if (!finalValidation.passed && task.currentIteration < task.maxIterations) {
        task.status = 'refining';
        console.log(
          `[TeamExecutor] Refining output based on ${finalValidation.issues.length} issues`
        );
      }
    }

    // Finalize
    const totalDurationMs = Date.now() - startTime;
    task.status = 'completed';
    task.completedAt = new Date();

    const result: TeamTaskResult = {
      success: currentOutput?.success || false,
      output: currentOutput?.output || '',
      artifacts: currentOutput?.artifacts,
      qualityScore: finalValidation?.score || 0,
      iterations: task.currentIteration,
      totalDurationMs,
      validationReport: finalValidation || {
        passed: false,
        score: 0,
        issues: [],
        suggestions: [],
        confidence: 0,
      },
    };

    task.finalResult = result;

    // Update team metrics
    this.registry.updateTeamMetrics(team.id, result);

    // Add to history
    team.history.push({
      taskId: task.id,
      type: task.type,
      success: result.success,
      iterations: result.iterations,
      qualityScore: result.qualityScore,
      durationMs: totalDurationMs,
      completedAt: new Date(),
    });

    // Update team status
    team.status = 'idle';
    team.currentTask = undefined;

    // Emit completion event
    bus.publish('cortex', 'team:task:completed', {
      teamId: team.id,
      taskId: task.id,
      result,
    });

    console.log(
      `[TeamExecutor] Team ${team.name} completed task: ${result.success ? '✅' : '❌'} (${result.iterations} iterations, ${totalDurationMs}ms)`
    );

    return result;
  }

  private buildExecutorInput(
    task: TeamTask,
    previousOutput: TaskResult | null,
    previousValidation: ValidationResult | null
  ): { prompt: string; code?: string; context: Record<string, unknown> } {
    let prompt = task.input.prompt;

    // Add refinement instructions if we have previous results
    if (previousOutput && previousValidation && !previousValidation.passed) {
      const issues = previousValidation.issues
        .map((i) => `- ${i.type.toUpperCase()}: ${i.description}${i.fix ? ` (Fix: ${i.fix})` : ''}`)
        .join('\n');

      const suggestions = previousValidation.suggestions.join('\n- ');

      prompt = `REFINEMENT REQUIRED:
Previous attempt had the following issues:
${issues}

Suggestions for improvement:
- ${suggestions}

Original request: ${task.input.prompt}

Please address these issues and improve the output.`;
    }

    return {
      prompt,
      code: previousOutput?.output,
      context: {
        ...task.input.context,
        iteration: task.currentIteration,
        previousScore: previousValidation?.score,
        source: task.input.source,
      },
    };
  }

  private async runExecutor(
    type: TaskType,
    input: { prompt: string; code?: string; context: Record<string, unknown> }
  ): Promise<TaskResult> {
    // Use the execution agent to run the task
    const agentTask = await this.executionAgent.submitTask({
      type,
      name: `Team execution: ${input.prompt.slice(0, 50)}...`,
      description: input.prompt,
      input: {
        prompt: input.prompt,
        code: input.code,
        context: input.context,
      },
      options: {
        saveArtifacts: true,
        autoApprove: true,
        sandbox: true,
      },
    });

    // Wait for completion
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const status = this.executionAgent.getTaskStatus(agentTask.id);
        if (status?.status === 'completed' || status?.status === 'failed') {
          clearInterval(checkInterval);
          resolve(status.result || { success: false, output: 'Task failed' });
        }
      }, 500);

      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve({ success: false, output: 'Execution timeout' });
      }, 60000);
    });
  }

  private async runValidator(
    task: TeamTask,
    executorResult: TaskResult
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];

    // Basic validation checks
    if (!executorResult.success) {
      issues.push({
        type: 'error',
        category: 'execution',
        description: 'Execution failed',
        fix: 'Review error message and fix root cause',
      });
    }

    if (!executorResult.output || executorResult.output.trim().length === 0) {
      issues.push({
        type: 'error',
        category: 'output',
        description: 'No output produced',
        fix: 'Ensure the code generates meaningful output',
      });
    }

    // Code quality checks
    const output = executorResult.output || '';

    if (output.includes('TODO')) {
      issues.push({
        type: 'warning',
        category: 'completeness',
        description: 'Output contains TODO markers',
        fix: 'Complete all TODO items before finalizing',
      });
    }

    if (output.includes('console.log') && !task.input.context?.['allowConsoleLogs']) {
      issues.push({
        type: 'improvement',
        category: 'code-quality',
        description: 'Contains debug console.log statements',
        fix: 'Remove or convert to proper logging',
      });
    }

    // Check for error handling
    if (
      (task.type === 'generate' || task.type === 'execute') &&
      !output.includes('try') &&
      !output.includes('catch') &&
      output.includes('async')
    ) {
      suggestions.push('Consider adding error handling (try/catch) for async operations');
    }

    // Calculate score
    const errorCount = issues.filter((i) => i.type === 'error').length;
    const warningCount = issues.filter((i) => i.type === 'warning').length;
    const improvementCount = issues.filter((i) => i.type === 'improvement').length;

    let score = 1.0;
    score -= errorCount * 0.3;
    score -= warningCount * 0.15;
    score -= improvementCount * 0.05;
    score = Math.max(0, Math.min(1, score));

    const passed = errorCount === 0 && score >= (task.input.qualityThreshold || 0.8);

    // Add suggestions based on score
    if (score < 0.9 && suggestions.length === 0) {
      suggestions.push('Consider adding more comprehensive error handling');
      suggestions.push('Review code for potential edge cases');
    }

    return {
      passed,
      score,
      issues,
      suggestions,
      confidence: 0.9 - issues.length * 0.1,
    };
  }

  /**
   * Get active execution by ID
   */
  getActiveExecution(taskId: string): TeamTask | undefined {
    return this.activeExecutions.get(taskId);
  }

  /**
   * Get all active executions
   */
  getAllActiveExecutions(): TeamTask[] {
    return Array.from(this.activeExecutions.values());
  }
}

// ============================================================================
// SPECIALIZED TEAMS
// ============================================================================

/**
 * Pre-create common specialized teams
 */
export function initializeDefaultTeams(): void {
  const registry = TeamRegistry.getInstance();

  // Core execution teams
  registry.createTeam('code-generation', 'Generate high-quality code from prompts');
  registry.createTeam('code-execution', 'Execute and test code safely');
  registry.createTeam('testing', 'Create and run comprehensive tests');
  registry.createTeam('deployment', 'Deploy applications and services');

  // Specialized teams
  registry.createTeam('api-development', 'Design and implement APIs');
  registry.createTeam('ui-components', 'Create React/UI components');
  registry.createTeam('database', 'Database design and queries');
  registry.createTeam('security', 'Security review and hardening');
  registry.createTeam('optimization', 'Performance optimization');

  console.log('[TeamFramework] Default teams initialized');
}

// ============================================================================
// EXPORTS
// ============================================================================

export const teamRegistry = TeamRegistry.getInstance();
export const teamExecutor = TeamExecutor.getInstance();

// Initialize on import
export function initializeTeamFramework(): void {
  initializeDefaultTeams();
  bus.publish('cortex', 'team:framework:ready', { timestamp: Date.now() });
  console.log('[TeamFramework] Ready');
}
