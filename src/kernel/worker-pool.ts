/**
 * @file TooLoo.ai Skills OS - Worker Thread Pool
 * @description Manages worker threads for CPU-intensive operations
 * @version 1.0.0
 * @skill-os true
 *
 * Provides a pool of worker threads for parallelizing CPU-bound tasks:
 * - Code analysis and parsing
 * - Large data processing
 * - Image/document processing preparation
 * - Search indexing
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { EventEmitter } from 'events';
import { cpus } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Task to be executed by a worker
 */
export interface WorkerTask<T = unknown> {
  /** Unique task ID */
  id: string;
  /** Type of task */
  type: string;
  /** Task payload */
  data: T;
  /** Priority (higher = more urgent) */
  priority?: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Result from a worker task
 */
export interface WorkerResult<T = unknown> {
  /** Task ID that produced this result */
  taskId: string;
  /** Whether task completed successfully */
  success: boolean;
  /** Result data (if successful) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
  /** Execution time in ms */
  duration: number;
  /** Worker that executed the task */
  workerId: number;
}

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
  /** Minimum number of workers to keep alive */
  minWorkers: number;
  /** Maximum number of workers */
  maxWorkers: number;
  /** Idle timeout before killing excess workers (ms) */
  idleTimeout: number;
  /** Default task timeout (ms) */
  taskTimeout: number;
  /** Path to worker script */
  workerScript?: string;
}

/**
 * Worker state
 */
interface WorkerState {
  worker: Worker;
  id: number;
  busy: boolean;
  currentTask?: string;
  createdAt: number;
  lastUsedAt: number;
  tasksCompleted: number;
}

/**
 * Queued task with resolver
 */
interface QueuedTask<T = unknown, R = unknown> {
  task: WorkerTask<T>;
  resolve: (result: WorkerResult<R>) => void;
  reject: (error: Error) => void;
  queuedAt: number;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: WorkerPoolConfig = {
  minWorkers: 1,
  maxWorkers: Math.max(1, cpus().length - 1), // Leave 1 core for main thread
  idleTimeout: 30000, // 30 seconds
  taskTimeout: 60000, // 1 minute
};

// =============================================================================
// WORKER POOL CLASS
// =============================================================================

/**
 * Pool of worker threads for parallel task execution
 */
export class WorkerPool extends EventEmitter {
  private config: WorkerPoolConfig;
  private workers: Map<number, WorkerState> = new Map();
  private taskQueue: QueuedTask[] = [];
  private nextWorkerId = 1;
  private nextTaskId = 1;
  private running = false;
  private idleCheckInterval?: NodeJS.Timeout;
  private taskHandlers: Map<string, (data: unknown) => Promise<unknown>> = new Map();

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Start the worker pool
   */
  async start(): Promise<void> {
    if (this.running) return;

    console.log(
      `[WorkerPool] Starting with ${this.config.minWorkers}-${this.config.maxWorkers} workers`
    );

    this.running = true;

    // Spawn minimum workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      await this.spawnWorker();
    }

    // Start idle check
    this.idleCheckInterval = setInterval(() => this.checkIdleWorkers(), 10000);

    this.emit('started', { workerCount: this.workers.size });
  }

  /**
   * Stop the worker pool
   */
  async shutdown(): Promise<void> {
    if (!this.running) return;

    console.log('[WorkerPool] Shutting down...');
    this.running = false;

    // Clear idle check
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
    }

    // Reject queued tasks
    for (const queued of this.taskQueue) {
      queued.reject(new Error('Worker pool shutting down'));
    }
    this.taskQueue = [];

    // Terminate all workers
    const terminatePromises = Array.from(this.workers.values()).map((state) =>
      this.terminateWorker(state.id)
    );
    await Promise.all(terminatePromises);

    this.emit('shutdown');
    console.log('[WorkerPool] Shutdown complete');
  }

  // ---------------------------------------------------------------------------
  // Task Submission
  // ---------------------------------------------------------------------------

  /**
   * Submit a task for execution
   */
  async execute<T, R>(
    type: string,
    data: T,
    options: { priority?: number; timeout?: number } = {}
  ): Promise<WorkerResult<R>> {
    if (!this.running) {
      throw new Error('Worker pool not running');
    }

    const task: WorkerTask<T> = {
      id: `task_${this.nextTaskId++}`,
      type,
      data,
      priority: options.priority ?? 0,
      timeout: options.timeout ?? this.config.taskTimeout,
    };

    return new Promise<WorkerResult<R>>((resolve, reject) => {
      const queuedTask: QueuedTask<T, R> = {
        task,
        resolve: resolve as (result: WorkerResult<unknown>) => void,
        reject,
        queuedAt: Date.now(),
      };

      // Insert by priority (higher first)
      const insertIndex = this.taskQueue.findIndex(
        (t) => (t.task.priority ?? 0) < (task.priority ?? 0)
      );
      if (insertIndex === -1) {
        this.taskQueue.push(queuedTask as QueuedTask);
      } else {
        this.taskQueue.splice(insertIndex, 0, queuedTask as QueuedTask);
      }

      this.emit('task:queued', { taskId: task.id, queueLength: this.taskQueue.length });

      // Try to process immediately
      this.processQueue();
    });
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeMany<T, R>(
    type: string,
    dataItems: T[],
    options: { priority?: number; timeout?: number } = {}
  ): Promise<WorkerResult<R>[]> {
    const promises = dataItems.map((data) => this.execute<T, R>(type, data, options));
    return Promise.all(promises);
  }

  /**
   * Register a task handler for in-process execution
   * (Used when worker thread communication isn't needed)
   */
  registerHandler<T, R>(type: string, handler: (data: T) => Promise<R>): void {
    this.taskHandlers.set(type, handler as (data: unknown) => Promise<unknown>);
  }

  // ---------------------------------------------------------------------------
  // Worker Management
  // ---------------------------------------------------------------------------

  /**
   * Spawn a new worker
   */
  private async spawnWorker(): Promise<WorkerState> {
    const workerId = this.nextWorkerId++;

    // Use embedded worker code for simplicity
    const workerCode = `
      const { parentPort, workerData } = require('worker_threads');
      
      // Built-in task handlers
      const handlers = {
        // JSON parsing (CPU-bound for large payloads)
        'parse-json': async (data) => {
          return JSON.parse(data);
        },
        
        // JSON stringifying
        'stringify-json': async (data) => {
          return JSON.stringify(data);
        },
        
        // Text processing
        'process-text': async ({ text, operation }) => {
          switch (operation) {
            case 'uppercase':
              return text.toUpperCase();
            case 'lowercase':
              return text.toLowerCase();
            case 'wordcount':
              return text.split(/\\s+/).filter(Boolean).length;
            case 'lines':
              return text.split('\\n').length;
            default:
              return text;
          }
        },
        
        // Array operations
        'sort-array': async ({ array, key, direction }) => {
          const sorted = [...array].sort((a, b) => {
            const aVal = key ? a[key] : a;
            const bVal = key ? b[key] : b;
            if (aVal < bVal) return direction === 'desc' ? 1 : -1;
            if (aVal > bVal) return direction === 'desc' ? -1 : 1;
            return 0;
          });
          return sorted;
        },
        
        // Search/filter
        'filter-array': async ({ array, predicate }) => {
          const fn = new Function('item', 'index', 'return ' + predicate);
          return array.filter((item, index) => fn(item, index));
        },
        
        // Compute hash
        'hash-string': async ({ text, algorithm }) => {
          const crypto = require('crypto');
          return crypto.createHash(algorithm || 'sha256').update(text).digest('hex');
        },
        
        // Regex operations
        'regex-match': async ({ text, pattern, flags }) => {
          const regex = new RegExp(pattern, flags || 'g');
          const matches = [];
          let match;
          while ((match = regex.exec(text)) !== null) {
            matches.push({
              match: match[0],
              groups: match.groups || {},
              index: match.index,
            });
            if (!flags?.includes('g')) break;
          }
          return matches;
        },
        
        // Code analysis (basic)
        'analyze-code': async ({ code, language }) => {
          const lines = code.split('\\n');
          const result = {
            lines: lines.length,
            characters: code.length,
            emptyLines: lines.filter(l => !l.trim()).length,
            functions: 0,
            classes: 0,
            imports: 0,
          };
          
          // Simple pattern matching
          if (language === 'javascript' || language === 'typescript') {
            result.functions = (code.match(/function\\s+\\w+|=>|async\\s+function/g) || []).length;
            result.classes = (code.match(/class\\s+\\w+/g) || []).length;
            result.imports = (code.match(/import\\s+/g) || []).length;
          } else if (language === 'python') {
            result.functions = (code.match(/def\\s+\\w+/g) || []).length;
            result.classes = (code.match(/class\\s+\\w+/g) || []).length;
            result.imports = (code.match(/import\\s+|from\\s+/g) || []).length;
          }
          
          return result;
        },
        
        // Sleep (for testing)
        'sleep': async ({ ms }) => {
          await new Promise(resolve => setTimeout(resolve, ms));
          return { slept: ms };
        },
      };
      
      parentPort.on('message', async (message) => {
        const { task } = message;
        const startTime = Date.now();
        
        try {
          const handler = handlers[task.type];
          if (!handler) {
            throw new Error('Unknown task type: ' + task.type);
          }
          
          const result = await handler(task.data);
          
          parentPort.postMessage({
            type: 'result',
            taskId: task.id,
            success: true,
            data: result,
            duration: Date.now() - startTime,
          });
        } catch (error) {
          parentPort.postMessage({
            type: 'result',
            taskId: task.id,
            success: false,
            error: error.message,
            duration: Date.now() - startTime,
          });
        }
      });
      
      parentPort.postMessage({ type: 'ready' });
    `;

    const worker = new Worker(workerCode, { eval: true });

    const state: WorkerState = {
      worker,
      id: workerId,
      busy: false,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      tasksCompleted: 0,
    };

    // Wait for worker to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker startup timeout'));
      }, 5000);

      worker.once('message', (msg) => {
        if (msg.type === 'ready') {
          clearTimeout(timeout);
          resolve();
        }
      });

      worker.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // Set up message handler
    worker.on('message', (msg) => {
      if (msg.type === 'result') {
        this.handleWorkerResult(workerId, msg);
      }
    });

    worker.on('error', (err) => {
      console.error(`[WorkerPool] Worker ${workerId} error:`, err);
      this.emit('worker:error', { workerId, error: err.message });
      this.handleWorkerCrash(workerId);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.warn(`[WorkerPool] Worker ${workerId} exited with code ${code}`);
        this.handleWorkerCrash(workerId);
      }
    });

    this.workers.set(workerId, state);
    this.emit('worker:spawned', { workerId });
    console.log(`[WorkerPool] Worker ${workerId} spawned`);

    return state;
  }

  /**
   * Terminate a worker
   */
  private async terminateWorker(workerId: number): Promise<void> {
    const state = this.workers.get(workerId);
    if (!state) return;

    await state.worker.terminate();
    this.workers.delete(workerId);
    this.emit('worker:terminated', { workerId });
    console.log(`[WorkerPool] Worker ${workerId} terminated`);
  }

  /**
   * Handle worker crash
   */
  private async handleWorkerCrash(workerId: number): Promise<void> {
    const state = this.workers.get(workerId);
    if (!state) return;

    // If worker was busy, fail the current task
    if (state.busy && state.currentTask) {
      const queuedIndex = this.taskQueue.findIndex(
        (q) => q.task.id === state.currentTask
      );
      if (queuedIndex !== -1) {
        const queued = this.taskQueue.splice(queuedIndex, 1)[0];
        queued.reject(new Error('Worker crashed during execution'));
      }
    }

    this.workers.delete(workerId);

    // Respawn if below minimum
    if (this.running && this.workers.size < this.config.minWorkers) {
      await this.spawnWorker();
    }

    this.processQueue();
  }

  /**
   * Handle result from worker
   */
  private handleWorkerResult(workerId: number, msg: any): void {
    const state = this.workers.get(workerId);
    if (!state) return;

    // Find the queued task
    const taskId = msg.taskId;
    // Note: The task might have been removed from queue when sent to worker
    // We store it in state.currentTask

    state.busy = false;
    state.currentTask = undefined;
    state.lastUsedAt = Date.now();
    state.tasksCompleted++;

    const result: WorkerResult = {
      taskId,
      success: msg.success,
      data: msg.data,
      error: msg.error,
      duration: msg.duration,
      workerId,
    };

    this.emit('task:completed', result);

    // Try to process next task
    this.processQueue();
  }

  /**
   * Process queued tasks
   */
  private async processQueue(): Promise<void> {
    if (!this.running || this.taskQueue.length === 0) return;

    // Find an idle worker
    let idleWorker: WorkerState | undefined;
    for (const state of this.workers.values()) {
      if (!state.busy) {
        idleWorker = state;
        break;
      }
    }

    // If no idle worker, try to spawn one if under max
    if (!idleWorker && this.workers.size < this.config.maxWorkers) {
      idleWorker = await this.spawnWorker();
    }

    if (!idleWorker) {
      // All workers busy and at max capacity
      return;
    }

    // Get next task
    const queued = this.taskQueue.shift();
    if (!queued) return;

    // Check if handler registered for in-process execution
    const handler = this.taskHandlers.get(queued.task.type);
    if (handler) {
      // Execute in-process
      const startTime = Date.now();
      try {
        const data = await handler(queued.task.data);
        queued.resolve({
          taskId: queued.task.id,
          success: true,
          data,
          duration: Date.now() - startTime,
          workerId: 0, // 0 indicates main thread
        });
      } catch (err) {
        queued.resolve({
          taskId: queued.task.id,
          success: false,
          error: err instanceof Error ? err.message : String(err),
          duration: Date.now() - startTime,
          workerId: 0,
        });
      }
      this.processQueue();
      return;
    }

    // Send to worker
    idleWorker.busy = true;
    idleWorker.currentTask = queued.task.id;

    // Set up timeout
    const timeout = setTimeout(() => {
      if (idleWorker!.currentTask === queued.task.id) {
        queued.resolve({
          taskId: queued.task.id,
          success: false,
          error: 'Task timeout',
          duration: queued.task.timeout ?? this.config.taskTimeout,
          workerId: idleWorker!.id,
        });
        this.handleWorkerCrash(idleWorker!.id);
      }
    }, queued.task.timeout ?? this.config.taskTimeout);

    // Store resolve for when result comes back
    const originalResolve = queued.resolve;
    queued.resolve = (result) => {
      clearTimeout(timeout);
      originalResolve(result);
    };

    idleWorker.worker.postMessage({ task: queued.task });

    // Store queued task for result handling
    this.taskQueue.unshift(queued);
  }

  /**
   * Check and terminate idle workers
   */
  private checkIdleWorkers(): void {
    const now = Date.now();
    const toTerminate: number[] = [];

    for (const state of this.workers.values()) {
      if (
        !state.busy &&
        this.workers.size > this.config.minWorkers &&
        now - state.lastUsedAt > this.config.idleTimeout
      ) {
        toTerminate.push(state.id);
      }
    }

    for (const workerId of toTerminate) {
      this.terminateWorker(workerId);
    }
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  /**
   * Get pool statistics
   */
  getStats(): {
    running: boolean;
    workers: number;
    busyWorkers: number;
    idleWorkers: number;
    queueLength: number;
    totalTasksCompleted: number;
  } {
    let busyCount = 0;
    let totalCompleted = 0;

    for (const state of this.workers.values()) {
      if (state.busy) busyCount++;
      totalCompleted += state.tasksCompleted;
    }

    return {
      running: this.running,
      workers: this.workers.size,
      busyWorkers: busyCount,
      idleWorkers: this.workers.size - busyCount,
      queueLength: this.taskQueue.length,
      totalTasksCompleted: totalCompleted,
    };
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let poolInstance: WorkerPool | null = null;

/**
 * Get the global worker pool instance
 */
export function getWorkerPool(config?: Partial<WorkerPoolConfig>): WorkerPool {
  if (!poolInstance) {
    poolInstance = new WorkerPool(config);
  }
  return poolInstance;
}

/**
 * Create a new worker pool (for testing or isolated use)
 */
export function createWorkerPool(config?: Partial<WorkerPoolConfig>): WorkerPool {
  return new WorkerPool(config);
}

export default WorkerPool;
