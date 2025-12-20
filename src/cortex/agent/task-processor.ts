// @version 3.3.597
/**
 * Task Processor - Task Queue Management
 *
 * Manages the queue of tasks to be executed by the Agent.
 * Handles prioritization, scheduling, and lifecycle.
 *
 * @module cortex/agent/task-processor
 */

import { v4 as uuidv4 } from 'uuid';
import { bus } from '../../core/event-bus.js';
import type {
  AgentTask,
  TaskType,
  TaskInput,
  TaskOptions,
  TaskResult,
} from './types.js';

const DEFAULT_OPTIONS: TaskOptions = {
  saveArtifacts: true,
  autoApprove: false,
  sandbox: true,
  timeout: 60000, // 1 minute
  retries: 0,
};

export class TaskProcessor {
  private queue: AgentTask[] = [];
  private history: AgentTask[] = [];
  private maxHistorySize = 100;
  private processing = false;
  private currentTask: AgentTask | null = null;

  constructor() {
    console.log('[TaskProcessor] Initialized');
  }

  /**
   * Create and queue a new task
   */
  createTask(params: {
    type: TaskType;
    name: string;
    description?: string;
    input: TaskInput;
    options?: Partial<TaskOptions>;
    priority?: number;
  }): AgentTask {
    const task: AgentTask = {
      id: uuidv4(),
      type: params.type,
      name: params.name,
      description: params.description,
      input: params.input,
      options: { ...DEFAULT_OPTIONS, ...params.options },
      status: 'pending',
      createdAt: new Date(),
    };

    // Insert at end of queue (priority logic can be added later)
    const insertIndex = this.queue.length;
    this.queue.splice(insertIndex, 0, task);

    // Emit event
    bus.publish('cortex', 'agent:task:queued', {
      taskId: task.id,
      type: task.type,
      name: task.name,
      queuePosition: insertIndex,
    });

    console.log(`[TaskProcessor] Task queued: ${task.name} (${task.id}) at position ${insertIndex}`);
    return task;
  }

  /**
   * Get next task from queue
   */
  getNextTask(): AgentTask | null {
    const task = this.queue.find((t) => t.status === 'pending');
    return task || null;
  }

  /**
   * Start processing a task
   */
  startTask(taskId: string): AgentTask | null {
    const task = this.queue.find((t) => t.id === taskId);
    if (!task) {
      console.warn(`[TaskProcessor] Task not found: ${taskId}`);
      return null;
    }

    if (task.status !== 'pending') {
      console.warn(`[TaskProcessor] Task ${taskId} is not pending (status: ${task.status})`);
      return null;
    }

    task.status = 'in-progress';
    task.startedAt = new Date();
    this.currentTask = task;

    // Emit event
    bus.publish('cortex', 'agent:task:started', {
      taskId: task.id,
      type: task.type,
      name: task.name,
    });

    console.log(`[TaskProcessor] Task started: ${task.name} (${task.id})`);
    return task;
  }

  /**
   * Complete a task with result
   */
  completeTask(taskId: string, result: TaskResult): AgentTask | null {
    const taskIndex = this.queue.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      console.warn(`[TaskProcessor] Task not found: ${taskId}`);
      return null;
    }

    const task = this.queue[taskIndex];
    if (!task) {
      console.warn(`[TaskProcessor] Task at index ${taskIndex} is undefined`);
      return null;
    }

    task.status = result.success ? 'completed' : 'failed';
    task.completedAt = new Date();
    task.result = result;

    if (!result.success && result.output) {
      task.error = result.output;
    }

    // Move to history
    this.queue.splice(taskIndex, 1);
    this.history.unshift(task);

    // Trim history
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    // Clear current task
    if (this.currentTask?.id === taskId) {
      this.currentTask = null;
    }

    // Emit event
    const eventType = result.success ? 'agent:task:completed' : 'agent:task:failed';
    bus.publish('cortex', eventType, {
      taskId: task.id,
      type: task.type,
      name: task.name,
      success: result.success,
      durationMs: task.completedAt.getTime() - (task.startedAt?.getTime() || task.createdAt.getTime()),
      artifactCount: result.artifacts?.length || 0,
    });

    console.log(
      `[TaskProcessor] Task ${result.success ? 'completed' : 'failed'}: ${task.name} (${task.id})`
    );
    return task;
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): boolean {
    const taskIndex = this.queue.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return false;

    const task = this.queue[taskIndex];
    if (!task) return false;
    
    if (task.status === 'in-progress') {
      console.warn(`[TaskProcessor] Cannot cancel in-progress task: ${taskId}`);
      return false;
    }

    task.status = 'cancelled';
    task.completedAt = new Date();

    // Move to history
    this.queue.splice(taskIndex, 1);
    this.history.unshift(task);

    console.log(`[TaskProcessor] Task cancelled: ${task.name} (${task.id})`);
    return true;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): AgentTask | null {
    const fromQueue = this.queue.find((t) => t.id === taskId);
    if (fromQueue) return fromQueue;
    const fromHistory = this.history.find((t) => t.id === taskId);
    if (fromHistory) return fromHistory;
    return null;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    pending: number;
    inProgress: number;
    total: number;
    currentTask: AgentTask | null;
  } {
    return {
      pending: this.queue.filter((t) => t.status === 'pending').length,
      inProgress: this.queue.filter((t) => t.status === 'in-progress').length,
      total: this.queue.length,
      currentTask: this.currentTask,
    };
  }

  /**
   * Get queue
   */
  getQueue(): AgentTask[] {
    return [...this.queue];
  }

  /**
   * Get history
   */
  getHistory(limit?: number): AgentTask[] {
    if (limit) {
      return this.history.slice(0, limit);
    }
    return [...this.history];
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalProcessed: number;
    successRate: number;
    averageDurationMs: number;
    byType: Record<TaskType, number>;
  } {
    const completed = this.history.filter((t) => t.status === 'completed');
    const failed = this.history.filter((t) => t.status === 'failed');

    const totalProcessed = completed.length + failed.length;
    const successRate = totalProcessed > 0 ? completed.length / totalProcessed : 0;

    // Calculate average duration
    const durations = this.history
      .filter((t) => t.startedAt && t.completedAt)
      .map((t) => (t.completedAt as Date).getTime() - (t.startedAt as Date).getTime());
    const averageDurationMs =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    // Count by type
    const byType: Record<TaskType, number> = {} as Record<TaskType, number>;
    for (const task of this.history) {
      byType[task.type] = (byType[task.type] || 0) + 1;
    }

    return {
      totalProcessed,
      successRate,
      averageDurationMs,
      byType,
    };
  }

  /**
   * Get recent tasks for UI display
   */
  async getRecentTasks(): Promise<AgentTask[]> {
    // Return recent tasks from queue and history
    const allTasks = [...this.queue, ...this.history];
    
    // Sort by created date (most recent first) and limit to last 50
    return allTasks
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 50);
  }

  /**
   * Clear queue (pending tasks only)
   */
  clearQueue(): number {
    const pendingCount = this.queue.filter((t) => t.status === 'pending').length;
    this.queue = this.queue.filter((t) => t.status !== 'pending');
    console.log(`[TaskProcessor] Cleared ${pendingCount} pending tasks from queue`);
    return pendingCount;
  }
}

// Singleton export
export const taskProcessor = new TaskProcessor();
