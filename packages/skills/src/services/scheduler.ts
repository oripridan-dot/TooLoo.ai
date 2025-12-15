/**
 * @file SkillScheduler - Time-based and event-based skill execution
 * @version 1.0.0
 * @skill-os true
 * @updated 2025-12-15
 *
 * Provides scheduling capabilities for skills:
 * - Cron-based triggers (run at specific times)
 * - Event-based triggers (run on events)
 * - Threshold-based triggers (run when conditions met)
 * - Interval-based triggers (run every N milliseconds)
 */

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type TriggerType = 'cron' | 'event' | 'threshold' | 'interval';

export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  skillId: string;
  input?: Record<string, unknown>;
  trigger: TriggerConfig;
  enabled: boolean;
  priority: number;
  maxRetries: number;
  timeout: number;
  lastRun?: number;
  nextRun?: number;
  runCount: number;
  failCount: number;
  createdAt: number;
}

export interface TriggerConfig {
  type: TriggerType;
  // Cron trigger
  cronExpression?: string;
  timezone?: string;
  // Event trigger
  eventName?: string;
  eventFilter?: (payload: unknown) => boolean;
  // Threshold trigger
  metric?: string;
  operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  value?: number;
  // Interval trigger
  intervalMs?: number;
  // Common
  maxRuns?: number; // 0 = unlimited
}

export interface TaskExecution {
  taskId: string;
  skillId: string;
  startTime: number;
  endTime?: number;
  success?: boolean;
  output?: unknown;
  error?: string;
  triggeredBy: TriggerType;
}

export interface SchedulerConfig {
  maxConcurrentTasks: number;
  defaultTimeout: number;
  checkIntervalMs: number;
  enableMetrics: boolean;
  persistPath?: string;
}

export interface SchedulerMetrics {
  totalTasks: number;
  enabledTasks: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  activeExecutions: number;
  tasksByTrigger: Record<TriggerType, number>;
  averageExecutionTime: number;
}

// Skill executor function type (injected from kernel)
export type SkillExecutor = (skillId: string, input: unknown) => Promise<{
  success: boolean;
  data?: unknown;
  error?: { message: string };
}>;

// =============================================================================
// CRON PARSER (Simple implementation)
// =============================================================================

/**
 * Simple cron expression parser
 * Supports: minute hour dayOfMonth month dayOfWeek
 * Examples: "0 2 * * *" (2 AM daily), "star-slash-15 * * * *" (every 15 min)
 */
function parseCron(expression: string): { next: (from: Date) => Date | null } {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: ${expression}`);
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  return {
    next: (from: Date): Date | null => {
      const date = new Date(from);
      date.setSeconds(0);
      date.setMilliseconds(0);

      // Try up to 1 year ahead
      for (let i = 0; i < 525600; i++) {
        date.setMinutes(date.getMinutes() + 1);

        if (
          matchesCronField(date.getMinutes(), minute!) &&
          matchesCronField(date.getHours(), hour!) &&
          matchesCronField(date.getDate(), dayOfMonth!) &&
          matchesCronField(date.getMonth() + 1, month!) &&
          matchesCronField(date.getDay(), dayOfWeek!)
        ) {
          return date;
        }
      }

      return null;
    },
  };
}

function matchesCronField(value: number, pattern: string): boolean {
  if (pattern === '*') return true;

  // Handle step values (*/5)
  if (pattern.startsWith('*/')) {
    const step = parseInt(pattern.slice(2), 10);
    return value % step === 0;
  }

  // Handle ranges (1-5)
  if (pattern.includes('-')) {
    const [start, end] = pattern.split('-').map((n) => parseInt(n, 10));
    return value >= start! && value <= end!;
  }

  // Handle lists (1,3,5)
  if (pattern.includes(',')) {
    const values = pattern.split(',').map((n) => parseInt(n, 10));
    return values.includes(value);
  }

  // Exact match
  return parseInt(pattern, 10) === value;
}

// =============================================================================
// SKILL SCHEDULER
// =============================================================================

export class SkillScheduler extends EventEmitter {
  private config: Required<SchedulerConfig>;
  private tasks: Map<string, ScheduledTask> = new Map();
  private activeExecutions: Map<string, TaskExecution> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private metrics: SchedulerMetrics;
  private skillExecutor: SkillExecutor | null = null;
  private metricValues: Map<string, number> = new Map();

  constructor(config: Partial<SchedulerConfig> = {}) {
    super();

    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks ?? 5,
      defaultTimeout: config.defaultTimeout ?? 60000,
      checkIntervalMs: config.checkIntervalMs ?? 10000, // 10 seconds
      enableMetrics: config.enableMetrics ?? true,
      persistPath: config.persistPath ?? '',
    };

    this.metrics = {
      totalTasks: 0,
      enabledTasks: 0,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      activeExecutions: 0,
      tasksByTrigger: {
        cron: 0,
        event: 0,
        threshold: 0,
        interval: 0,
      },
      averageExecutionTime: 0,
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

  /**
   * Update a metric value (for threshold triggers)
   */
  updateMetric(name: string, value: number): void {
    this.metricValues.set(name, value);
    this.checkThresholdTriggers(name, value);
  }

  /**
   * Emit an event (for event triggers)
   */
  triggerEvent(eventName: string, payload?: unknown): void {
    this.checkEventTriggers(eventName, payload);
  }

  // ---------------------------------------------------------------------------
  // Task Management
  // ---------------------------------------------------------------------------

  /**
   * Register a scheduled task
   */
  registerTask(task: Omit<ScheduledTask, 'runCount' | 'failCount' | 'createdAt'>): ScheduledTask {
    if (this.tasks.has(task.id)) {
      throw new Error(`Task already exists: ${task.id}`);
    }

    const fullTask: ScheduledTask = {
      ...task,
      runCount: 0,
      failCount: 0,
      createdAt: Date.now(),
    };

    // Calculate next run time for cron/interval triggers
    if (task.trigger.type === 'cron' && task.trigger.cronExpression) {
      const cron = parseCron(task.trigger.cronExpression);
      const nextRun = cron.next(new Date());
      fullTask.nextRun = nextRun?.getTime();
    } else if (task.trigger.type === 'interval' && task.trigger.intervalMs) {
      fullTask.nextRun = Date.now() + task.trigger.intervalMs;
    }

    this.tasks.set(task.id, fullTask);
    this.metrics.totalTasks++;
    this.metrics.tasksByTrigger[task.trigger.type]++;
    if (task.enabled) {
      this.metrics.enabledTasks++;
    }

    // Set up interval if needed
    if (task.enabled && task.trigger.type === 'interval' && task.trigger.intervalMs) {
      this.setupInterval(fullTask);
    }

    this.emit('task:registered', { taskId: task.id });
    console.log(`[Scheduler] ✅ Registered task: ${task.id} (${task.trigger.type})`);

    return fullTask;
  }

  /**
   * Update a task
   */
  updateTask(taskId: string, updates: Partial<ScheduledTask>): ScheduledTask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const wasEnabled = task.enabled;
    Object.assign(task, updates);

    // Handle enable/disable
    if (wasEnabled !== task.enabled) {
      if (task.enabled) {
        this.metrics.enabledTasks++;
        if (task.trigger.type === 'interval') {
          this.setupInterval(task);
        }
      } else {
        this.metrics.enabledTasks--;
        this.clearInterval(taskId);
      }
    }

    this.emit('task:updated', { taskId, updates });
    return task;
  }

  /**
   * Remove a task
   */
  removeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    this.clearInterval(taskId);
    this.tasks.delete(taskId);

    this.metrics.totalTasks--;
    this.metrics.tasksByTrigger[task.trigger.type]--;
    if (task.enabled) {
      this.metrics.enabledTasks--;
    }

    this.emit('task:removed', { taskId });
    return true;
  }

  /**
   * Get a task by ID
   */
  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * List all tasks
   */
  listTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Enable a task
   */
  enableTask(taskId: string): void {
    this.updateTask(taskId, { enabled: true });
  }

  /**
   * Disable a task
   */
  disableTask(taskId: string): void {
    this.updateTask(taskId, { enabled: false });
  }

  // ---------------------------------------------------------------------------
  // Execution
  // ---------------------------------------------------------------------------

  /**
   * Execute a task immediately (bypasses schedule)
   */
  async executeNow(taskId: string): Promise<TaskExecution> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return this.executeTask(task, 'interval'); // 'interval' as manual trigger
  }

  /**
   * Execute a task
   */
  private async executeTask(
    task: ScheduledTask,
    triggeredBy: TriggerType
  ): Promise<TaskExecution> {
    if (!this.skillExecutor) {
      throw new Error('Skill executor not set');
    }

    if (this.activeExecutions.size >= this.config.maxConcurrentTasks) {
      throw new Error('Maximum concurrent tasks reached');
    }

    // Check max runs
    if (task.trigger.maxRuns && task.runCount >= task.trigger.maxRuns) {
      this.disableTask(task.id);
      throw new Error(`Task ${task.id} has reached max runs`);
    }

    const execution: TaskExecution = {
      taskId: task.id,
      skillId: task.skillId,
      startTime: Date.now(),
      triggeredBy,
    };

    this.activeExecutions.set(task.id, execution);
    this.metrics.activeExecutions++;
    this.emit('task:executing', { taskId: task.id, execution });

    try {
      const result = await this.executeWithTimeout(
        this.skillExecutor(task.skillId, task.input),
        task.timeout || this.config.defaultTimeout
      );

      execution.endTime = Date.now();
      execution.success = result.success;
      execution.output = result.data;

      if (result.success) {
        task.runCount++;
        this.metrics.successfulExecutions++;
      } else {
        task.failCount++;
        this.metrics.failedExecutions++;
        execution.error = result.error?.message;
      }

      task.lastRun = execution.startTime;
      this.updateNextRun(task);
      this.updateExecutionMetrics(execution);

      this.emit('task:completed', { taskId: task.id, execution });
      return execution;
    } catch (error) {
      execution.endTime = Date.now();
      execution.success = false;
      execution.error = error instanceof Error ? error.message : String(error);

      task.failCount++;
      task.lastRun = execution.startTime;
      this.metrics.failedExecutions++;
      this.updateNextRun(task);

      this.emit('task:failed', { taskId: task.id, execution, error });
      return execution;
    } finally {
      this.activeExecutions.delete(task.id);
      this.metrics.activeExecutions--;
      this.metrics.totalExecutions++;
    }
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
        setTimeout(() => reject(new Error('Task timeout')), timeout)
      ),
    ]);
  }

  /**
   * Update next run time for a task
   */
  private updateNextRun(task: ScheduledTask): void {
    if (task.trigger.type === 'cron' && task.trigger.cronExpression) {
      const cron = parseCron(task.trigger.cronExpression);
      const nextRun = cron.next(new Date());
      task.nextRun = nextRun?.getTime();
    } else if (task.trigger.type === 'interval' && task.trigger.intervalMs) {
      task.nextRun = Date.now() + task.trigger.intervalMs;
    }
  }

  // ---------------------------------------------------------------------------
  // Trigger Handlers
  // ---------------------------------------------------------------------------

  /**
   * Set up interval for a task
   */
  private setupInterval(task: ScheduledTask): void {
    if (!task.trigger.intervalMs) return;

    const interval = setInterval(() => {
      if (task.enabled && !this.activeExecutions.has(task.id)) {
        this.executeTask(task, 'interval').catch((err) =>
          console.error(`[Scheduler] Interval execution failed: ${err.message}`)
        );
      }
    }, task.trigger.intervalMs);

    this.intervals.set(task.id, interval);
  }

  /**
   * Clear interval for a task
   */
  private clearInterval(taskId: string): void {
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(taskId);
    }
  }

  /**
   * Check cron-based tasks
   */
  private checkCronTriggers(): void {
    const now = Date.now();

    for (const task of Array.from(this.tasks.values())) {
      if (
        task.enabled &&
        task.trigger.type === 'cron' &&
        task.nextRun &&
        task.nextRun <= now &&
        !this.activeExecutions.has(task.id)
      ) {
        this.executeTask(task, 'cron').catch((err) =>
          console.error(`[Scheduler] Cron execution failed: ${err.message}`)
        );
      }
    }
  }

  /**
   * Check event triggers
   */
  private checkEventTriggers(eventName: string, payload?: unknown): void {
    for (const task of Array.from(this.tasks.values())) {
      if (
        task.enabled &&
        task.trigger.type === 'event' &&
        task.trigger.eventName === eventName &&
        !this.activeExecutions.has(task.id)
      ) {
        // Apply filter if present
        if (task.trigger.eventFilter && !task.trigger.eventFilter(payload)) {
          continue;
        }

        this.executeTask(task, 'event').catch((err) =>
          console.error(`[Scheduler] Event execution failed: ${err.message}`)
        );
      }
    }
  }

  /**
   * Check threshold triggers
   */
  private checkThresholdTriggers(metricName: string, value: number): void {
    for (const task of Array.from(this.tasks.values())) {
      if (
        task.enabled &&
        task.trigger.type === 'threshold' &&
        task.trigger.metric === metricName &&
        !this.activeExecutions.has(task.id)
      ) {
        const threshold = task.trigger.value ?? 0;
        let shouldTrigger = false;

        switch (task.trigger.operator) {
          case 'gt':
            shouldTrigger = value > threshold;
            break;
          case 'gte':
            shouldTrigger = value >= threshold;
            break;
          case 'lt':
            shouldTrigger = value < threshold;
            break;
          case 'lte':
            shouldTrigger = value <= threshold;
            break;
          case 'eq':
            shouldTrigger = value === threshold;
            break;
        }

        if (shouldTrigger) {
          this.executeTask(task, 'threshold').catch((err) =>
            console.error(`[Scheduler] Threshold execution failed: ${err.message}`)
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  private updateExecutionMetrics(execution: TaskExecution): void {
    if (!this.config.enableMetrics || !execution.endTime) return;

    const duration = execution.endTime - execution.startTime;
    this.metrics.averageExecutionTime =
      (this.metrics.averageExecutionTime * (this.metrics.totalExecutions - 1) +
        duration) /
      this.metrics.totalExecutions;
  }

  /**
   * Get scheduler metrics
   */
  getMetrics(): SchedulerMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalTasks: this.tasks.size,
      enabledTasks: Array.from(this.tasks.values()).filter((t) => t.enabled).length,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      activeExecutions: this.activeExecutions.size,
      tasksByTrigger: {
        cron: 0,
        event: 0,
        threshold: 0,
        interval: 0,
      },
      averageExecutionTime: 0,
    };

    // Recalculate task counts
    for (const task of Array.from(this.tasks.values())) {
      this.metrics.tasksByTrigger[task.trigger.type]++;
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    console.log('[Scheduler] 🚀 Initializing...');

    // Start the cron check interval
    this.checkInterval = setInterval(() => {
      this.checkCronTriggers();
    }, this.config.checkIntervalMs);

    console.log('[Scheduler] ✅ Ready');
  }

  async shutdown(): Promise<void> {
    console.log('[Scheduler] 🛑 Shutting down...');

    // Stop the check interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Clear all task intervals
    for (const [taskId] of Array.from(this.intervals.entries())) {
      this.clearInterval(taskId);
    }

    // Wait for active executions to complete (with timeout)
    const timeout = 10000;
    const start = Date.now();

    while (this.activeExecutions.size > 0 && Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, 100));
    }

    if (this.activeExecutions.size > 0) {
      console.warn(
        `[Scheduler] ${this.activeExecutions.size} tasks still active, forcing shutdown`
      );
    }

    this.tasks.clear();
    this.activeExecutions.clear();
    console.log('[Scheduler] ✅ Shutdown complete');
  }

  isHealthy(): boolean {
    return (
      this.checkInterval !== null &&
      this.activeExecutions.size < this.config.maxConcurrentTasks
    );
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let schedulerInstance: SkillScheduler | null = null;

export function getSkillScheduler(
  config?: Partial<SchedulerConfig>
): SkillScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new SkillScheduler(config);
  }
  return schedulerInstance;
}

export default SkillScheduler;
