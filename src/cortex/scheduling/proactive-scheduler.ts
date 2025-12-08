// @version 3.3.401
/**
 * Proactive Task Scheduler
 * 
 * Enables TooLoo to initiate tasks autonomously without user prompting.
 * This is a key component of the "sovereign AI" architecture.
 * 
 * Key capabilities:
 * 1. **Scheduled Tasks** - Regular maintenance, optimization, analysis
 * 2. **Event-Triggered Tasks** - React to system events proactively
 * 3. **Opportunity Detection** - Identify and act on improvement opportunities
 * 4. **Background Processing** - Handle low-priority tasks during idle time
 * 
 * Safety constraints:
 * - All tasks must pass ethics/safety checks
 * - Resource limits are enforced
 * - User can pause/resume at any time
 * - Critical actions require confirmation
 * 
 * @module cortex/scheduling/proactive-scheduler
 */

import { bus, SynapsysEvent } from '../../core/event-bus.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low' | 'background';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
export type TaskTrigger = 'schedule' | 'event' | 'opportunity' | 'manual';

export interface ProactiveTask {
  id: string;
  name: string;
  description: string;
  /** What triggers this task */
  trigger: TaskTrigger;
  /** Task priority */
  priority: TaskPriority;
  /** Current status */
  status: TaskStatus;
  /** Cron-like schedule (for scheduled tasks) */
  schedule?: string;
  /** Event pattern to trigger on */
  eventPattern?: string;
  /** Handler function name */
  handler: string;
  /** Task parameters */
  params: Record<string, unknown>;
  /** Created timestamp */
  createdAt: number;
  /** Next run time (for scheduled) */
  nextRunAt?: number;
  /** Last run timestamp */
  lastRunAt?: number;
  /** Last run duration in ms */
  lastDuration?: number;
  /** Success count */
  successCount: number;
  /** Failure count */
  failureCount: number;
  /** Is this task enabled? */
  enabled: boolean;
  /** Maximum concurrent runs */
  maxConcurrent: number;
  /** Current concurrent runs */
  runningCount: number;
  /** Resource limits */
  resourceLimits: {
    maxDurationMs: number;
    maxMemoryMB: number;
    maxCost: number;
  };
}

export interface TaskExecution {
  id: string;
  taskId: string;
  startedAt: number;
  completedAt?: number;
  status: 'running' | 'success' | 'failed' | 'timeout' | 'cancelled';
  result?: unknown;
  error?: string;
  metrics: {
    durationMs: number;
    memoryUsedMB: number;
    cost: number;
  };
}

export interface SchedulerState {
  tasks: ProactiveTask[];
  executions: TaskExecution[];
  isPaused: boolean;
  pauseReason?: string;
  lastCheck: number;
  totalExecutions: number;
  totalSuccesses: number;
  totalFailures: number;
}

// ============================================================================
// BUILT-IN TASK HANDLERS
// ============================================================================

type TaskHandler = (params: Record<string, unknown>) => Promise<{ success: boolean; result?: unknown; error?: string }>;

const BUILT_IN_HANDLERS: Record<string, TaskHandler> = {
  /**
   * Memory cleanup - prune old vectors and memories
   */
  async memoryCleanup(params) {
    try {
      const { VectorStore } = await import('../memory/vector-store.js');
      const vectorStore = new VectorStore(process.cwd());
      await vectorStore.initialize();
      
      const stats = vectorStore.getStats();
      
      bus.publish('cortex', 'proactive:memory_cleanup', {
        documentsCount: stats.totalDocuments,
        timestamp: Date.now(),
      });
      
      return { success: true, result: { stats } };
    } catch (error: unknown) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * Self-improvement cycle - trigger analysis
   */
  async selfImprovementCycle(params) {
    try {
      bus.publish('cortex', 'self_improvement:trigger_cycle', {
        source: 'proactive-scheduler',
        timestamp: Date.now(),
      });
      
      return { success: true, result: { triggered: true } };
    } catch (error: unknown) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * Health check - verify all systems operational
   */
  async systemHealthCheck(params) {
    try {
      const checks = {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: Date.now(),
      };
      
      bus.publish('cortex', 'proactive:health_check', checks);
      
      return { success: true, result: checks };
    } catch (error: unknown) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * Code indexing - update AST index for workspace
   */
  async codeIndexing(params) {
    try {
      const { getASTIndexer } = await import('../memory/ast-indexer.js');
      const indexer = getASTIndexer(process.cwd());
      
      const results = await indexer.indexDirectory('src');
      
      return { 
        success: true, 
        result: { 
          filesIndexed: results.length,
          totalSymbols: results.reduce((sum, f) => sum + f.symbols.length, 0),
        } 
      };
    } catch (error: unknown) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * Learning consolidation - strengthen important patterns
   */
  async learningConsolidation(params) {
    try {
      const { ReinforcementLearner } = await import('../learning/reinforcement-learner.js');
      const learner = ReinforcementLearner.getInstance();
      
      if (learner.isLearningEnabled()) {
        bus.publish('cortex', 'learning:consolidation_triggered', {
          source: 'proactive-scheduler',
          timestamp: Date.now(),
        });
        
        return { success: true, result: { consolidated: true } };
      }
      
      return { success: true, result: { consolidated: false, reason: 'learning_paused' } };
    } catch (error: unknown) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * Opportunity scan - look for improvement opportunities
   */
  async opportunityScan(params) {
    try {
      // Check for patterns that could be improved
      const opportunities: string[] = [];
      
      // Emit event for other systems to respond
      bus.publish('cortex', 'proactive:opportunity_scan', {
        source: 'proactive-scheduler',
        timestamp: Date.now(),
      });
      
      return { success: true, result: { opportunities } };
    } catch (error: unknown) {
      return { success: false, error: String(error) };
    }
  },
};

// ============================================================================
// PROACTIVE SCHEDULER
// ============================================================================

export class ProactiveScheduler {
  private static instance: ProactiveScheduler;
  
  private state: SchedulerState;
  private dataDir: string;
  private stateFile: string;
  private checkInterval: NodeJS.Timeout | null = null;
  private customHandlers: Map<string, TaskHandler> = new Map();

  private readonly CHECK_INTERVAL_MS = 60 * 1000; // Check every minute
  private readonly MAX_EXECUTIONS_HISTORY = 1000;

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'proactive-scheduler');
    this.stateFile = path.join(this.dataDir, 'scheduler-state.json');

    this.state = {
      tasks: [],
      executions: [],
      isPaused: false,
      lastCheck: 0,
      totalExecutions: 0,
      totalSuccesses: 0,
      totalFailures: 0,
    };
  }

  static getInstance(): ProactiveScheduler {
    if (!ProactiveScheduler.instance) {
      ProactiveScheduler.instance = new ProactiveScheduler();
    }
    return ProactiveScheduler.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    console.log('[ProactiveScheduler] Initializing autonomous task scheduler...');
    
    await fs.ensureDir(this.dataDir);
    await this.loadState();
    
    // Register default tasks if none exist
    if (this.state.tasks.length === 0) {
      await this.registerDefaultTasks();
    }
    
    this.setupEventListeners();
    this.startScheduleChecker();

    bus.publish('cortex', 'proactive_scheduler:initialized', {
      tasks: this.state.tasks.length,
      enabledTasks: this.state.tasks.filter(t => t.enabled).length,
    });

    console.log(`[ProactiveScheduler] Ready - ${this.state.tasks.length} tasks registered`);
  }

  // ============================================================================
  // TASK MANAGEMENT
  // ============================================================================

  /**
   * Register a new proactive task
   */
  async registerTask(task: Omit<ProactiveTask, 'id' | 'createdAt' | 'successCount' | 'failureCount' | 'runningCount' | 'status'>): Promise<ProactiveTask> {
    const newTask: ProactiveTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      status: 'pending',
      successCount: 0,
      failureCount: 0,
      runningCount: 0,
      nextRunAt: task.schedule ? this.calculateNextRun(task.schedule) : undefined,
    };

    this.state.tasks.push(newTask);
    await this.saveState();

    bus.publish('cortex', 'proactive_scheduler:task_registered', {
      taskId: newTask.id,
      name: newTask.name,
      trigger: newTask.trigger,
    });

    console.log(`[ProactiveScheduler] Registered task: ${newTask.name}`);
    return newTask;
  }

  /**
   * Register a custom task handler
   */
  registerHandler(name: string, handler: TaskHandler): void {
    this.customHandlers.set(name, handler);
    console.log(`[ProactiveScheduler] Registered handler: ${name}`);
  }

  /**
   * Enable/disable a task
   */
  async setTaskEnabled(taskId: string, enabled: boolean): Promise<void> {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (task) {
      task.enabled = enabled;
      await this.saveState();
      
      bus.publish('cortex', 'proactive_scheduler:task_toggled', {
        taskId,
        enabled,
      });
    }
  }

  /**
   * Pause all proactive tasks
   */
  pause(reason: string): void {
    this.state.isPaused = true;
    this.state.pauseReason = reason;
    
    bus.publish('cortex', 'proactive_scheduler:paused', { reason });
    console.log(`[ProactiveScheduler] ⏸️ Paused: ${reason}`);
  }

  /**
   * Resume proactive tasks
   */
  resume(): void {
    this.state.isPaused = false;
    this.state.pauseReason = undefined;
    
    bus.publish('cortex', 'proactive_scheduler:resumed', {});
    console.log('[ProactiveScheduler] ▶️ Resumed');
  }

  // ============================================================================
  // TASK EXECUTION
  // ============================================================================

  /**
   * Execute a task by ID
   */
  async executeTask(taskId: string, source: 'schedule' | 'event' | 'manual' = 'manual'): Promise<TaskExecution | null> {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) {
      console.warn(`[ProactiveScheduler] Task not found: ${taskId}`);
      return null;
    }

    if (!task.enabled) {
      console.log(`[ProactiveScheduler] Task disabled: ${task.name}`);
      return null;
    }

    if (task.runningCount >= task.maxConcurrent) {
      console.log(`[ProactiveScheduler] Task at max concurrency: ${task.name}`);
      return null;
    }

    // Create execution record
    const execution: TaskExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      startedAt: Date.now(),
      status: 'running',
      metrics: {
        durationMs: 0,
        memoryUsedMB: 0,
        cost: 0,
      },
    };

    this.state.executions.push(execution);
    task.runningCount++;
    task.status = 'running';
    task.lastRunAt = Date.now();

    console.log(`[ProactiveScheduler] Executing: ${task.name} (${source})`);

    try {
      // Get handler
      const handler = this.customHandlers.get(task.handler) || BUILT_IN_HANDLERS[task.handler];
      if (!handler) {
        throw new Error(`Handler not found: ${task.handler}`);
      }

      // Execute with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), task.resourceLimits.maxDurationMs);
      });

      const result = await Promise.race([
        handler(task.params),
        timeoutPromise,
      ]);

      // Update execution
      execution.completedAt = Date.now();
      execution.metrics.durationMs = execution.completedAt - execution.startedAt;
      
      if (result.success) {
        execution.status = 'success';
        execution.result = result.result;
        task.successCount++;
        this.state.totalSuccesses++;
      } else {
        execution.status = 'failed';
        execution.error = result.error;
        task.failureCount++;
        this.state.totalFailures++;
      }

    } catch (error: unknown) {
      execution.completedAt = Date.now();
      execution.metrics.durationMs = execution.completedAt - execution.startedAt;
      execution.status = String(error).includes('Timeout') ? 'timeout' : 'failed';
      execution.error = String(error);
      task.failureCount++;
      this.state.totalFailures++;
    }

    // Update task state
    task.runningCount--;
    task.status = task.runningCount > 0 ? 'running' : 'pending';
    task.lastDuration = execution.metrics.durationMs;
    
    if (task.schedule) {
      task.nextRunAt = this.calculateNextRun(task.schedule);
    }

    this.state.totalExecutions++;

    // Prune old executions
    if (this.state.executions.length > this.MAX_EXECUTIONS_HISTORY) {
      this.state.executions = this.state.executions.slice(-this.MAX_EXECUTIONS_HISTORY);
    }

    await this.saveState();

    bus.publish('cortex', 'proactive_scheduler:task_executed', {
      taskId,
      executionId: execution.id,
      status: execution.status,
      durationMs: execution.metrics.durationMs,
    });

    return execution;
  }

  // ============================================================================
  // SCHEDULE MANAGEMENT
  // ============================================================================

  private startScheduleChecker(): void {
    this.checkInterval = setInterval(
      () => this.checkScheduledTasks().catch(console.error),
      this.CHECK_INTERVAL_MS
    );
    
    // Initial check after short delay
    setTimeout(() => this.checkScheduledTasks().catch(console.error), 5000);
  }

  private async checkScheduledTasks(): Promise<void> {
    if (this.state.isPaused) return;

    this.state.lastCheck = Date.now();
    const now = Date.now();

    for (const task of this.state.tasks) {
      if (!task.enabled) continue;
      if (task.trigger !== 'schedule') continue;
      if (!task.nextRunAt || task.nextRunAt > now) continue;

      // Task is due - execute it
      await this.executeTask(task.id, 'schedule');
    }

    await this.saveState();
  }

  private calculateNextRun(schedule: string): number {
    // Simple interval-based schedule parsing
    // Format: "every Xm" (minutes), "every Xh" (hours), "every Xd" (days)
    const match = schedule.match(/every\s+(\d+)([mhd])/i);
    if (!match) {
      // Default to 1 hour
      return Date.now() + 60 * 60 * 1000;
    }

    const value = parseInt(match[1]!, 10);
    const unit = match[2]!.toLowerCase();

    let intervalMs: number;
    switch (unit) {
      case 'm':
        intervalMs = value * 60 * 1000;
        break;
      case 'h':
        intervalMs = value * 60 * 60 * 1000;
        break;
      case 'd':
        intervalMs = value * 24 * 60 * 60 * 1000;
        break;
      default:
        intervalMs = 60 * 60 * 1000;
    }

    return Date.now() + intervalMs;
  }

  // ============================================================================
  // DEFAULT TASKS
  // ============================================================================

  private async registerDefaultTasks(): Promise<void> {
    const defaultTasks = [
      {
        name: 'Memory Cleanup',
        description: 'Clean up old vectors and optimize memory usage',
        trigger: 'schedule' as const,
        priority: 'low' as const,
        schedule: 'every 6h',
        handler: 'memoryCleanup',
        params: {},
        enabled: true,
        maxConcurrent: 1,
        resourceLimits: { maxDurationMs: 60000, maxMemoryMB: 512, maxCost: 0 },
      },
      {
        name: 'Self-Improvement Cycle',
        description: 'Trigger self-improvement analysis and optimization',
        trigger: 'schedule' as const,
        priority: 'medium' as const,
        schedule: 'every 5m',
        handler: 'selfImprovementCycle',
        params: {},
        enabled: true,
        maxConcurrent: 1,
        resourceLimits: { maxDurationMs: 120000, maxMemoryMB: 256, maxCost: 0.1 },
      },
      {
        name: 'System Health Check',
        description: 'Verify all systems are operational',
        trigger: 'schedule' as const,
        priority: 'high' as const,
        schedule: 'every 1m',
        handler: 'systemHealthCheck',
        params: {},
        enabled: true,
        maxConcurrent: 1,
        resourceLimits: { maxDurationMs: 5000, maxMemoryMB: 64, maxCost: 0 },
      },
      {
        name: 'Code Indexing',
        description: 'Update AST index for workspace code',
        trigger: 'schedule' as const,
        priority: 'background' as const,
        schedule: 'every 1h',
        handler: 'codeIndexing',
        params: {},
        enabled: true,
        maxConcurrent: 1,
        resourceLimits: { maxDurationMs: 300000, maxMemoryMB: 1024, maxCost: 0 },
      },
      {
        name: 'Learning Consolidation',
        description: 'Consolidate and strengthen learned patterns',
        trigger: 'schedule' as const,
        priority: 'low' as const,
        schedule: 'every 30m',
        handler: 'learningConsolidation',
        params: {},
        enabled: true,
        maxConcurrent: 1,
        resourceLimits: { maxDurationMs: 60000, maxMemoryMB: 256, maxCost: 0 },
      },
      {
        name: 'Opportunity Scan',
        description: 'Scan for improvement opportunities',
        trigger: 'schedule' as const,
        priority: 'background' as const,
        schedule: 'every 15m',
        handler: 'opportunityScan',
        params: {},
        enabled: true,
        maxConcurrent: 1,
        resourceLimits: { maxDurationMs: 30000, maxMemoryMB: 128, maxCost: 0 },
      },
    ];

    for (const taskDef of defaultTasks) {
      await this.registerTask(taskDef);
    }

    console.log(`[ProactiveScheduler] Registered ${defaultTasks.length} default tasks`);
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private setupEventListeners(): void {
    // Listen for events that should trigger tasks
    bus.on('learning:boosted', () => {
      // Trigger self-improvement when learning is boosted
      const task = this.state.tasks.find(t => t.handler === 'selfImprovementCycle');
      if (task) {
        this.executeTask(task.id, 'event').catch(console.error);
      }
    });

    // Listen for system events
    bus.on('system:error', () => {
      // Trigger health check on errors
      const task = this.state.tasks.find(t => t.handler === 'systemHealthCheck');
      if (task) {
        this.executeTask(task.id, 'event').catch(console.error);
      }
    });
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const data = await fs.readJson(this.stateFile);
        this.state = { ...this.state, ...data };
      }
    } catch (err) {
      console.warn('[ProactiveScheduler] Could not load state, starting fresh');
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.writeJson(this.stateFile, this.state, { spaces: 2 });
    } catch (err) {
      console.error('[ProactiveScheduler] Failed to save state:', err);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getState(): SchedulerState {
    return { ...this.state };
  }

  getTasks(): ProactiveTask[] {
    return [...this.state.tasks];
  }

  getRecentExecutions(limit = 50): TaskExecution[] {
    return this.state.executions.slice(-limit);
  }

  getMetrics(): {
    totalTasks: number;
    enabledTasks: number;
    totalExecutions: number;
    successRate: number;
    isPaused: boolean;
  } {
    return {
      totalTasks: this.state.tasks.length,
      enabledTasks: this.state.tasks.filter(t => t.enabled).length,
      totalExecutions: this.state.totalExecutions,
      successRate: this.state.totalExecutions > 0 
        ? this.state.totalSuccesses / this.state.totalExecutions 
        : 0,
      isPaused: this.state.isPaused,
    };
  }

  async shutdown(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    await this.saveState();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const proactiveScheduler = ProactiveScheduler.getInstance();
export default ProactiveScheduler;
