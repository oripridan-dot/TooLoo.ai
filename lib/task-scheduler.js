import { v4 as uuidv4 } from 'uuid';

export class TaskScheduler {
  constructor() {
    this.tasks = new Map();
    this.schedules = new Map();
    this.executionLog = [];
  }

  scheduleTask(taskName, action, schedule, metadata = {}) {
    const id = uuidv4();

    const task = {
      id,
      name: taskName,
      action,
      schedule,
      metadata,
      createdAt: Date.now(),
      enabled: true,
      lastRun: null,
      nextRun: this.calculateNextRun(schedule),
      executionCount: 0,
    };

    this.tasks.set(id, task);

    return {
      taskId: id,
      name: taskName,
      nextRun: new Date(task.nextRun).toISOString(),
    };
  }

  calculateNextRun(schedule) {
    const now = Date.now();

    if (schedule.type === 'once') {
      return new Date(schedule.at).getTime();
    }

    if (schedule.type === 'delay') {
      return now + schedule.delay;
    }

    if (schedule.type === 'cron') {
      return this.calculateCronNext(schedule.pattern);
    }

    if (schedule.type === 'interval') {
      return now + schedule.interval;
    }

    return now + 60000;
  }

  calculateCronNext(pattern) {
    // Simple cron implementation for common patterns
    const now = new Date();

    if (pattern === '0 * * * *') {
      // Every hour
      const next = new Date(now);
      next.setHours(next.getHours() + 1);
      next.setMinutes(0, 0, 0);
      return next.getTime();
    }

    if (pattern === '0 0 * * *') {
      // Daily at midnight
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      return next.getTime();
    }

    if (pattern === '0 0 * * 1') {
      // Weekly on Monday
      const next = new Date(now);
      const day = next.getDay();
      const diff = 1 - day;
      if (diff <= 0) next.setDate(next.getDate() + diff + 7);
      else next.setDate(next.getDate() + diff);
      next.setHours(0, 0, 0, 0);
      return next.getTime();
    }

    // Default: 1 hour from now
    return now.getTime() + 60 * 60 * 1000;
  }

  executeTask(taskId) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    if (!task.enabled) {
      return { success: false, error: 'Task is disabled' };
    }

    const execution = {
      id: uuidv4(),
      taskId,
      taskName: task.name,
      action: task.action,
      timestamp: Date.now(),
      status: 'completed',
      result: {},
    };

    // Simulate action execution
    if (task.action === 'run_training') {
      execution.result = { sessionsStarted: 1, progressLogged: true };
    } else if (task.action === 'generate_report') {
      execution.result = { reportGenerated: true, type: 'performance' };
    } else if (task.action === 'send_notification') {
      execution.result = { notificationSent: true, recipients: 1 };
    } else if (task.action === 'sync_data') {
      execution.result = { recordsSynced: 42, duration: 1500 };
    } else {
      execution.result = { executed: true };
    }

    this.executionLog.push(execution);
    task.lastRun = execution.timestamp;
    task.executionCount += 1;
    task.nextRun = this.calculateNextRun(task.schedule);

    return {
      success: true,
      executionId: execution.id,
      result: execution.result,
      nextRun: new Date(task.nextRun).toISOString(),
    };
  }

  getTask(taskId) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return null;
    }

    return {
      id: task.id,
      name: task.name,
      action: task.action,
      schedule: task.schedule,
      enabled: task.enabled,
      lastRun: task.lastRun ? new Date(task.lastRun).toISOString() : null,
      nextRun: new Date(task.nextRun).toISOString(),
      executionCount: task.executionCount,
    };
  }

  updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    const updated = {
      ...task,
      ...updates,
    };

    if (updates.schedule) {
      updated.nextRun = this.calculateNextRun(updates.schedule);
    }

    this.tasks.set(taskId, updated);

    return { success: true, task: updated };
  }

  disableTask(taskId) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    task.enabled = false;

    return { success: true };
  }

  enableTask(taskId) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    task.enabled = true;
    task.nextRun = this.calculateNextRun(task.schedule);

    return { success: true };
  }

  deleteTask(taskId) {
    const deleted = this.tasks.delete(taskId);

    return { success: deleted };
  }

  listTasks() {
    return Array.from(this.tasks.values()).map((task) => ({
      id: task.id,
      name: task.name,
      action: task.action,
      enabled: task.enabled,
      nextRun: new Date(task.nextRun).toISOString(),
      executionCount: task.executionCount,
    }));
  }

  getDueTasksIds() {
    const now = Date.now();
    const dueTasks = [];

    for (const [taskId, task] of this.tasks) {
      if (task.enabled && task.nextRun <= now) {
        dueTasks.push(taskId);
      }
    }

    return dueTasks;
  }

  getExecutionHistory(taskId, limit = 10) {
    const taskExecutions = this.executionLog
      .filter((e) => e.taskId === taskId)
      .slice(-limit)
      .reverse();

    return taskExecutions.map((exec) => ({
      executionId: exec.id,
      timestamp: new Date(exec.timestamp).toISOString(),
      status: exec.status,
      result: exec.result,
    }));
  }

  getScheduleStats() {
    const totalTasks = this.tasks.size;
    const enabledTasks = Array.from(this.tasks.values()).filter((t) => t.enabled).length;
    const totalExecutions = this.executionLog.length;
    const avgExecutionsPerTask = totalTasks > 0 ? 
      (totalExecutions / totalTasks).toFixed(1) :
      0;

    return {
      totalTasks,
      enabledTasks,
      disabledTasks: totalTasks - enabledTasks,
      totalExecutions,
      avgExecutionsPerTask: parseFloat(avgExecutionsPerTask),
    };
  }

  rescheduleTask(taskId, newSchedule) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    task.schedule = newSchedule;
    task.nextRun = this.calculateNextRun(newSchedule);

    return {
      success: true,
      nextRun: new Date(task.nextRun).toISOString(),
    };
  }

  clearExecutionLog() {
    this.executionLog = [];
  }
}

export default TaskScheduler;
