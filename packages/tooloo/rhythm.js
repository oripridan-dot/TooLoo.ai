/**
 * Rhythm Module for TooLoo.ai
 * Handles timing, scheduling, recurring tasks, and temporal coordination.
 * Think of it as the heartbeat and clock of your AI system.
 */

const EventEmitter = require('events');

/**
 * Schedule types
 */
const ScheduleType = {
  ONCE: 'once',           // Execute once after delay
  INTERVAL: 'interval',   // Execute repeatedly at fixed intervals
  CRON: 'cron',          // Cron-like expression
  HOURLY: 'hourly',      // Every hour
  DAILY: 'daily',        // Every day at specific time
  WEEKLY: 'weekly',      // Every week on specific day
  CUSTOM: 'custom'       // Custom scheduling logic
};

/**
 * Schedule status
 */
const ScheduleStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Parse cron-like expressions
 * Format: "minute hour dayOfMonth month dayOfWeek"
 * Example: "0 9 * * *" = Every day at 9:00 AM
 * Simplified version - supports: *, specific numbers, and ranges
 */
class CronParser {
  static parse(expression) {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression. Expected 5 parts: minute hour dayOfMonth month dayOfWeek');
    }

    return {
      minute: this.parseField(parts[0], 0, 59),
      hour: this.parseField(parts[1], 0, 23),
      dayOfMonth: this.parseField(parts[2], 1, 31),
      month: this.parseField(parts[3], 1, 12),
      dayOfWeek: this.parseField(parts[4], 0, 6) // 0 = Sunday
    };
  }

  static parseField(field, min, max) {
    if (field === '*') {
      return null; // Any value
    }

    // Specific number
    if (/^\d+$/.test(field)) {
      const num = parseInt(field, 10);
      if (num < min || num > max) {
        throw new Error(`Value ${num} out of range [${min}-${max}]`);
      }
      return [num];
    }

    // Range: 1-5
    if (/^\d+-\d+$/.test(field)) {
      const [start, end] = field.split('-').map(Number);
      const values = [];
      for (let i = start; i <= end; i++) {
        values.push(i);
      }
      return values;
    }

    // List: 1,3,5
    if (/^\d+(,\d+)+$/.test(field)) {
      return field.split(',').map(Number);
    }

    throw new Error(`Invalid cron field: ${field}`);
  }

  static matches(cronSpec, date) {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();

    return (
      (cronSpec.minute === null || cronSpec.minute.includes(minute)) &&
      (cronSpec.hour === null || cronSpec.hour.includes(hour)) &&
      (cronSpec.dayOfMonth === null || cronSpec.dayOfMonth.includes(dayOfMonth)) &&
      (cronSpec.month === null || cronSpec.month.includes(month)) &&
      (cronSpec.dayOfWeek === null || cronSpec.dayOfWeek.includes(dayOfWeek))
    );
  }

  static getNextRun(cronSpec, fromDate = new Date()) {
    const maxIterations = 366 * 24 * 60; // One year in minutes
    let current = new Date(fromDate);
    current.setSeconds(0, 0);

    for (let i = 0; i < maxIterations; i++) {
      current = new Date(current.getTime() + 60000); // Add 1 minute

      if (this.matches(cronSpec, current)) {
        return current;
      }
    }

    return null; // No match found in next year
  }
}

/**
 * Schedule class - represents a scheduled task
 */
class Schedule {
  constructor(config) {
    this.id = config.id || `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.name = config.name || 'Unnamed Schedule';
    this.type = config.type || ScheduleType.ONCE;
    this.handler = config.handler; // Function to execute
    this.status = ScheduleStatus.ACTIVE;

    // Timing configuration
    this.delay = config.delay || 0; // Milliseconds (for ONCE)
    this.interval = config.interval || 60000; // Milliseconds (for INTERVAL)
    this.cronExpression = config.cronExpression; // For CRON
    this.time = config.time; // For DAILY/WEEKLY
    this.dayOfWeek = config.dayOfWeek; // For WEEKLY (0-6, 0=Sunday)

    // Execution tracking
    this.executionCount = 0;
    this.maxExecutions = config.maxExecutions || null; // null = unlimited
    this.lastRun = null;
    this.nextRun = null;
    this.createdAt = new Date();

    // Error handling
    this.retryOnError = config.retryOnError !== false;
    this.maxRetries = config.maxRetries || 3;
    this.retryCount = 0;

    // Context
    this.context = config.context || {};
    this.metadata = config.metadata || {};

    // Timeout
    this.timeout = config.timeout || 30000; // 30 seconds default

    // Internal
    this.timerId = null;
    this.cronSpec = null;

    if (this.type === ScheduleType.CRON) {
      this.cronSpec = CronParser.parse(this.cronExpression);
    }
  }

  shouldExecute() {
    if (this.status !== ScheduleStatus.ACTIVE) {
      return false;
    }

    if (this.maxExecutions && this.executionCount >= this.maxExecutions) {
      return false;
    }

    return true;
  }

  markExecuted() {
    this.executionCount++;
    this.lastRun = new Date();
    this.retryCount = 0;

    if (this.maxExecutions && this.executionCount >= this.maxExecutions) {
      this.status = ScheduleStatus.COMPLETED;
    }
  }

  markFailed() {
    this.retryCount++;
    if (this.retryCount >= this.maxRetries) {
      this.status = ScheduleStatus.FAILED;
    }
  }
}

/**
 * Rhythm class - The timing and scheduling engine
 */
class Rhythm extends EventEmitter {
  constructor(config = {}) {
    super();

    this.id = config.id || `rhythm-${Date.now()}`;
    this.name = config.name || 'TooLoo Rhythm';

    // Schedule management
    this.schedules = new Map(); // scheduleId -> Schedule
    this.activeTimers = new Map(); // scheduleId -> timerId

    // Heartbeat configuration
    this.heartbeatInterval = config.heartbeatInterval || 1000; // 1 second
    this.heartbeatTimer = null;
    this.isRunning = false;

    // Cron checker interval
    this.cronCheckInterval = config.cronCheckInterval || 60000; // 1 minute
    this.cronCheckTimer = null;

    // Statistics
    this.stats = {
      totalSchedules: 0,
      activeSchedules: 0,
      completedSchedules: 0,
      failedSchedules: 0,
      totalExecutions: 0,
      failedExecutions: 0,
      avgExecutionTime: 0,
      totalExecutionTime: 0
    };

    // Health monitoring
    this.health = {
      lastHeartbeat: new Date(),
      uptime: 0,
      isHealthy: true
    };

    this.startTime = new Date();
  }

  /**
   * Start the rhythm engine
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();

    // Start heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.heartbeat();
    }, this.heartbeatInterval);

    // Start cron checker
    this.cronCheckTimer = setInterval(() => {
      this.checkCronSchedules();
    }, this.cronCheckInterval);

    this.emit('rhythm:started');
  }

  /**
   * Stop the rhythm engine
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear all timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.cronCheckTimer) {
      clearInterval(this.cronCheckTimer);
      this.cronCheckTimer = null;
    }

    // Clear all schedule timers
    for (const [scheduleId, timerId] of this.activeTimers.entries()) {
      clearTimeout(timerId);
      clearInterval(timerId);
    }
    this.activeTimers.clear();

    this.emit('rhythm:stopped');
  }

  /**
   * Heartbeat - runs periodically to update health and trigger events
   */
  heartbeat() {
    const now = new Date();
    this.health.lastHeartbeat = now;
    this.health.uptime = now.getTime() - this.startTime.getTime();

    // Update active schedules count
    this.stats.activeSchedules = Array.from(this.schedules.values())
      .filter(s => s.status === ScheduleStatus.ACTIVE).length;

    this.emit('heartbeat', {
      timestamp: now,
      uptime: this.health.uptime,
      stats: this.stats
    });
  }

  /**
   * Schedule a task to run once after a delay
   */
  scheduleOnce(handler, delay = 0, config = {}) {
    const schedule = new Schedule({
      ...config,
      type: ScheduleType.ONCE,
      handler,
      delay
    });

    this.schedules.set(schedule.id, schedule);
    this.stats.totalSchedules++;

    const timerId = setTimeout(async () => {
      await this.executeSchedule(schedule);
      this.schedules.delete(schedule.id);
      this.activeTimers.delete(schedule.id);
    }, delay);

    this.activeTimers.set(schedule.id, timerId);
    schedule.nextRun = new Date(Date.now() + delay);

    this.emit('schedule:created', { schedule });

    return schedule;
  }

  /**
   * Schedule a task to run repeatedly at intervals
   */
  scheduleInterval(handler, interval, config = {}) {
    const schedule = new Schedule({
      ...config,
      type: ScheduleType.INTERVAL,
      handler,
      interval
    });

    this.schedules.set(schedule.id, schedule);
    this.stats.totalSchedules++;

    const timerId = setInterval(async () => {
      if (schedule.shouldExecute()) {
        await this.executeSchedule(schedule);
      } else {
        this.cancelSchedule(schedule.id);
      }
    }, interval);

    this.activeTimers.set(schedule.id, timerId);
    schedule.nextRun = new Date(Date.now() + interval);

    this.emit('schedule:created', { schedule });

    return schedule;
  }

  /**
   * Schedule a task using cron expression
   */
  scheduleCron(handler, cronExpression, config = {}) {
    const schedule = new Schedule({
      ...config,
      type: ScheduleType.CRON,
      handler,
      cronExpression
    });

    this.schedules.set(schedule.id, schedule);
    this.stats.totalSchedules++;

    // Calculate next run
    schedule.nextRun = CronParser.getNextRun(schedule.cronSpec);

    this.emit('schedule:created', { schedule });

    return schedule;
  }

  /**
   * Schedule a task to run daily at specific time
   */
  scheduleDaily(handler, time, config = {}) {
    // Convert time to cron: "0 HH * * *"
    const [hours, minutes = 0] = time.split(':').map(Number);
    const cronExpression = `${minutes} ${hours} * * *`;

    return this.scheduleCron(handler, cronExpression, {
      ...config,
      type: ScheduleType.DAILY,
      time
    });
  }

  /**
   * Schedule a task to run weekly on specific day
   */
  scheduleWeekly(handler, dayOfWeek, time, config = {}) {
    // Convert to cron: "0 HH * * D"
    const [hours, minutes = 0] = time.split(':').map(Number);
    const cronExpression = `${minutes} ${hours} * * ${dayOfWeek}`;

    return this.scheduleCron(handler, cronExpression, {
      ...config,
      type: ScheduleType.WEEKLY,
      time,
      dayOfWeek
    });
  }

  /**
   * Check cron schedules and execute if needed
   */
  checkCronSchedules() {
    const now = new Date();
    now.setSeconds(0, 0); // Round to minute

    for (const schedule of this.schedules.values()) {
      if (schedule.type === ScheduleType.CRON && schedule.shouldExecute()) {
        // Check if it's time to run
        if (CronParser.matches(schedule.cronSpec, now)) {
          // Prevent running multiple times in the same minute
          if (!schedule.lastRun || schedule.lastRun < now) {
            this.executeSchedule(schedule);

            // Calculate next run
            schedule.nextRun = CronParser.getNextRun(schedule.cronSpec, now);
          }
        }
      }
    }
  }

  /**
   * Execute a schedule
   */
  async executeSchedule(schedule) {
    if (!schedule.shouldExecute()) {
      return;
    }

    this.emit('schedule:executing', { schedule });

    const startTime = Date.now();

    try {
      // Execute with timeout
      const result = await Promise.race([
        schedule.handler(schedule.context),
        this.createTimeout(schedule.timeout)
      ]);

      const executionTime = Date.now() - startTime;

      schedule.markExecuted();
      this.stats.totalExecutions++;
      this.stats.totalExecutionTime += executionTime;
      this.stats.avgExecutionTime = this.stats.totalExecutionTime / this.stats.totalExecutions;

      this.emit('schedule:executed', { schedule, result, executionTime });

      // Update stats for completed schedules
      if (schedule.status === ScheduleStatus.COMPLETED) {
        this.stats.completedSchedules++;
      }

    } catch (error) {
      schedule.markFailed();
      this.stats.failedExecutions++;

      this.emit('schedule:error', { schedule, error });

      // Retry if configured
      if (schedule.retryOnError && schedule.retryCount < schedule.maxRetries) {
        this.emit('schedule:retry', {
          schedule,
          attempt: schedule.retryCount,
          error
        });

        // Retry after a delay (exponential backoff)
        const retryDelay = Math.min(1000 * Math.pow(2, schedule.retryCount), 30000);
        setTimeout(() => this.executeSchedule(schedule), retryDelay);
      } else {
        this.stats.failedSchedules++;
        this.emit('schedule:failed', { schedule, error });
      }
    }
  }

  /**
   * Create a timeout promise
   */
  createTimeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Execution timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * Cancel a schedule
   */
  cancelSchedule(scheduleId) {
    const schedule = this.schedules.get(scheduleId);

    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    // Clear timer if exists
    const timerId = this.activeTimers.get(scheduleId);
    if (timerId) {
      clearTimeout(timerId);
      clearInterval(timerId);
      this.activeTimers.delete(scheduleId);
    }

    schedule.status = ScheduleStatus.STOPPED;

    this.emit('schedule:cancelled', { schedule });

    return schedule;
  }

  /**
   * Pause a schedule
   */
  pauseSchedule(scheduleId) {
    const schedule = this.schedules.get(scheduleId);

    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    schedule.status = ScheduleStatus.PAUSED;

    this.emit('schedule:paused', { schedule });

    return schedule;
  }

  /**
   * Resume a paused schedule
   */
  resumeSchedule(scheduleId) {
    const schedule = this.schedules.get(scheduleId);

    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    if (schedule.status !== ScheduleStatus.PAUSED) {
      throw new Error(`Schedule ${scheduleId} is not paused`);
    }

    schedule.status = ScheduleStatus.ACTIVE;

    this.emit('schedule:resumed', { schedule });

    return schedule;
  }

  /**
   * Get schedule by ID
   */
  getSchedule(scheduleId) {
    return this.schedules.get(scheduleId);
  }

  /**
   * Get all schedules with optional filter
   */
  getSchedules(filter = {}) {
    let schedules = Array.from(this.schedules.values());

    if (filter.status) {
      schedules = schedules.filter(s => s.status === filter.status);
    }

    if (filter.type) {
      schedules = schedules.filter(s => s.type === filter.type);
    }

    return schedules;
  }

  /**
   * Get rhythm statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalSchedules: this.schedules.size,
      isRunning: this.isRunning
    };
  }

  /**
   * Get health status
   */
  getHealth() {
    const now = new Date();
    const timeSinceHeartbeat = now.getTime() - this.health.lastHeartbeat.getTime();

    return {
      ...this.health,
      uptime: now.getTime() - this.startTime.getTime(),
      isHealthy: timeSinceHeartbeat < this.heartbeatInterval * 3,
      timeSinceHeartbeat
    };
  }

  /**
   * Clear all completed schedules
   */
  clearCompleted() {
    for (const [scheduleId, schedule] of this.schedules.entries()) {
      if (schedule.status === ScheduleStatus.COMPLETED || schedule.status === ScheduleStatus.STOPPED) {
        this.schedules.delete(scheduleId);
      }
    }

    this.emit('cleanup:completed');
  }
}

module.exports = {
  Rhythm,
  Schedule,
  CronParser,
  ScheduleType,
  ScheduleStatus
};