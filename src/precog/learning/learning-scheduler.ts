// @version 3.3.185
/**
 * LearningScheduler
 * Advanced scheduling system for TooLoo's learning operations.
 *
 * Key capabilities:
 * - Scheduled learning bursts (high-intensity learning periods)
 * - Quiet periods (reduced learning for system recovery)
 * - Goal-driven learning cycles (focus on specific objectives)
 * - Cron-like scheduling for automated learning patterns
 * - Adaptive scheduling based on system load and emergence events
 * - Learning quota management with rollover
 *
 * Integrates with:
 * - ReinforcementLearner for learning rate control
 * - EmergenceCoordinator for emergence-driven scheduling
 * - CuriosityEngine for curiosity-driven learning windows
 */

import { bus, SynapsysEvent } from '../../core/event-bus.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export type ScheduleType = 'burst' | 'quiet' | 'goal' | 'maintenance' | 'emergence' | 'custom';
export type ScheduleStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'failed';
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';

export interface LearningSchedule {
  id: string;
  name: string;
  type: ScheduleType;
  description: string;
  enabled: boolean;

  // Timing configuration
  timing: ScheduleTiming;

  // Learning parameters during this schedule
  learningConfig: ScheduleLearningConfig;

  // Goal-specific settings (for type='goal')
  goal?: LearningGoalConfig;

  // Metadata
  createdAt: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  successCount: number;
  status: ScheduleStatus;
  priority: number; // Higher = more important
}

export interface ScheduleTiming {
  // Cron-like pattern: "minute hour dayOfMonth month dayOfWeek"
  // e.g., "0 9 * * mon-fri" = 9 AM every weekday
  cronPattern?: string;

  // Simple scheduling
  daysOfWeek?: DayOfWeek[];
  timeOfDay?: TimeOfDay;
  customHours?: number[]; // 0-23

  // Duration
  durationMinutes: number;

  // Interval-based (alternative to cron)
  intervalMinutes?: number; // Run every N minutes

  // One-time scheduling
  oneTime?: Date;

  // Timezone
  timezone: string;
}

export interface ScheduleLearningConfig {
  // Learning rate multiplier during this schedule
  learningRateMultiplier: number; // 0.1 (quiet) to 3.0 (burst)

  // Exploration settings
  explorationRateOverride?: number;
  explorationBoost?: number;

  // Focus areas
  focusDomains?: string[]; // Specific domains to prioritize
  focusProviders?: string[]; // Specific providers to focus on
  focusTaskTypes?: string[]; // Specific task types

  // Resource limits
  maxOperations?: number;
  maxCost?: number;
  maxConcurrent?: number;

  // Behavior
  allowEmergenceResponse: boolean;
  allowGoalInterrupt: boolean;
  collectMetrics: boolean;
}

export interface LearningGoalConfig {
  goalId: string;
  targetMetric: string; // e.g., 'firstTrySuccess', 'repeatProblems'
  targetValue: number;
  currentValue: number;
  deadline?: Date;
  autoComplete: boolean; // Auto-mark complete when target reached
  strategies: string[]; // Specific strategies to use
}

export interface SchedulerPolicy {
  // Global controls
  enabled: boolean;
  maxConcurrentSchedules: number;
  maxDailyBurstMinutes: number;
  minQuietPeriodMinutes: number;

  // Priority handling
  allowPreemption: boolean; // Can higher priority schedules interrupt lower ones?
  emergenceOverrideEnabled: boolean; // Can emergence events override schedules?

  // Defaults
  defaultBurstMultiplier: number;
  defaultQuietMultiplier: number;
  defaultDuration: number;

  // Safety
  maxConsecutiveBursts: number;
  requiredRestBetweenBursts: number; // Minutes
  pauseOnHighLoad: boolean;
  loadThreshold: number; // CPU/memory threshold for pause

  // Quotas
  dailyLearningQuota: number;
  weeklyLearningQuota: number;
  quotaRolloverEnabled: boolean;
  maxRolloverMinutes: number;
}

export interface SchedulerState {
  status: 'running' | 'paused' | 'stopped';
  activeSchedules: string[]; // IDs of currently running schedules
  pendingSchedules: string[]; // IDs of scheduled but not yet running
  lastCheck: Date;
  currentMultiplier: number;
  quotaUsed: QuotaUsage;
  metrics: SchedulerMetrics;
}

export interface QuotaUsage {
  daily: { used: number; limit: number; remaining: number; resetAt: Date };
  weekly: { used: number; limit: number; remaining: number; resetAt: Date };
  rollover: number;
}

export interface SchedulerMetrics {
  totalSchedulesCreated: number;
  totalSchedulesRun: number;
  totalBurstMinutes: number;
  totalQuietMinutes: number;
  averageBurstDuration: number;
  goalsAchieved: number;
  emergenceInterrupts: number;
  preemptions: number;
  skippedDueToLoad: number;
}

export interface ScheduleExecution {
  id: string;
  scheduleId: string;
  startedAt: Date;
  endedAt?: Date;
  status: 'running' | 'completed' | 'interrupted' | 'failed';
  reason?: string;
  metricsCollected: ExecutionMetrics;
}

export interface ExecutionMetrics {
  learningOperations: number;
  rewardsReceived: number;
  avgReward: number;
  explorations: number;
  emergencesDetected: number;
  goalsProgress: Record<string, number>;
}

// Predefined schedule templates
export const SCHEDULE_TEMPLATES: Record<string, Partial<LearningSchedule>> = {
  morning_burst: {
    name: 'Morning Learning Burst',
    type: 'burst',
    description: 'High-intensity learning every morning',
    timing: {
      daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
      timeOfDay: 'morning',
      customHours: [9],
      durationMinutes: 30,
      timezone: 'UTC',
    },
    learningConfig: {
      learningRateMultiplier: 2.0,
      explorationBoost: 0.2,
      allowEmergenceResponse: true,
      allowGoalInterrupt: false,
      collectMetrics: true,
    },
    priority: 5,
  },
  evening_consolidation: {
    name: 'Evening Consolidation',
    type: 'quiet',
    description: 'Low-intensity period for pattern consolidation',
    timing: {
      daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      timeOfDay: 'evening',
      customHours: [21],
      durationMinutes: 60,
      timezone: 'UTC',
    },
    learningConfig: {
      learningRateMultiplier: 0.3,
      explorationRateOverride: 0.05,
      allowEmergenceResponse: false,
      allowGoalInterrupt: false,
      collectMetrics: true,
    },
    priority: 3,
  },
  weekend_exploration: {
    name: 'Weekend Exploration',
    type: 'burst',
    description: 'High exploration rate on weekends',
    timing: {
      daysOfWeek: ['sat', 'sun'],
      timeOfDay: 'afternoon',
      customHours: [14],
      durationMinutes: 120,
      timezone: 'UTC',
    },
    learningConfig: {
      learningRateMultiplier: 1.5,
      explorationRateOverride: 0.6,
      explorationBoost: 0.3,
      allowEmergenceResponse: true,
      allowGoalInterrupt: true,
      collectMetrics: true,
    },
    priority: 4,
  },
  goal_sprint: {
    name: 'Goal Sprint',
    type: 'goal',
    description: 'Focused learning toward a specific goal',
    timing: {
      intervalMinutes: 60,
      durationMinutes: 15,
      timezone: 'UTC',
    },
    learningConfig: {
      learningRateMultiplier: 2.5,
      allowEmergenceResponse: false,
      allowGoalInterrupt: false,
      collectMetrics: true,
      maxOperations: 100,
    },
    priority: 8,
  },
  maintenance_window: {
    name: 'Maintenance Window',
    type: 'maintenance',
    description: 'System maintenance with minimal learning',
    timing: {
      daysOfWeek: ['sun'],
      customHours: [3],
      durationMinutes: 120,
      timezone: 'UTC',
    },
    learningConfig: {
      learningRateMultiplier: 0.1,
      explorationRateOverride: 0.01,
      allowEmergenceResponse: false,
      allowGoalInterrupt: false,
      collectMetrics: false,
      maxOperations: 10,
    },
    priority: 10,
  },
};

// ============================================================================
// LEARNING SCHEDULER
// ============================================================================

export class LearningScheduler {
  private static instance: LearningScheduler;

  private schedules: Map<string, LearningSchedule> = new Map();
  private executions: ScheduleExecution[] = [];
  private policy: SchedulerPolicy;
  private state: SchedulerState;
  private dataDir: string;
  private stateFile: string;
  private checkInterval?: NodeJS.Timeout;
  private activeExecution?: ScheduleExecution;

  private readonly MAX_EXECUTIONS_HISTORY = 1000;
  private readonly CHECK_INTERVAL_MS = 60000; // Check every minute

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'learning-scheduler');
    this.stateFile = path.join(this.dataDir, 'scheduler-state.json');

    this.policy = {
      enabled: true,
      maxConcurrentSchedules: 1,
      maxDailyBurstMinutes: 240,
      minQuietPeriodMinutes: 30,
      allowPreemption: true,
      emergenceOverrideEnabled: true,
      defaultBurstMultiplier: 2.0,
      defaultQuietMultiplier: 0.3,
      defaultDuration: 30,
      maxConsecutiveBursts: 3,
      requiredRestBetweenBursts: 60,
      pauseOnHighLoad: true,
      loadThreshold: 0.8,
      dailyLearningQuota: 480, // 8 hours
      weeklyLearningQuota: 2400, // 40 hours
      quotaRolloverEnabled: true,
      maxRolloverMinutes: 120,
    };

    const now = new Date();
    this.state = {
      status: 'stopped',
      activeSchedules: [],
      pendingSchedules: [],
      lastCheck: now,
      currentMultiplier: 1.0,
      quotaUsed: {
        daily: {
          used: 0,
          limit: this.policy.dailyLearningQuota,
          remaining: this.policy.dailyLearningQuota,
          resetAt: this.getNextMidnight(),
        },
        weekly: {
          used: 0,
          limit: this.policy.weeklyLearningQuota,
          remaining: this.policy.weeklyLearningQuota,
          resetAt: this.getNextSunday(),
        },
        rollover: 0,
      },
      metrics: {
        totalSchedulesCreated: 0,
        totalSchedulesRun: 0,
        totalBurstMinutes: 0,
        totalQuietMinutes: 0,
        averageBurstDuration: 0,
        goalsAchieved: 0,
        emergenceInterrupts: 0,
        preemptions: 0,
        skippedDueToLoad: 0,
      },
    };

    this.setupListeners();
  }

  static getInstance(): LearningScheduler {
    if (!LearningScheduler.instance) {
      LearningScheduler.instance = new LearningScheduler();
    }
    return LearningScheduler.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    console.log('[LearningScheduler] Initializing learning scheduler...');

    await fs.ensureDir(this.dataDir);
    await this.loadState();

    // Create default schedules if none exist
    if (this.schedules.size === 0) {
      await this.createDefaultSchedules();
    }

    this.start();

    bus.publish('precog', 'scheduler:initialized', {
      scheduleCount: this.schedules.size,
      policy: this.policy,
      state: this.state,
      timestamp: new Date().toISOString(),
    });

    console.log('[LearningScheduler] Ready - Schedules:', this.schedules.size);
  }

  private async createDefaultSchedules(): Promise<void> {
    // Create morning burst by default (disabled)
    await this.createSchedule({
      ...SCHEDULE_TEMPLATES['morning_burst'],
      enabled: false,
    } as Partial<LearningSchedule>);

    // Create evening consolidation by default (disabled)
    await this.createSchedule({
      ...SCHEDULE_TEMPLATES['evening_consolidation'],
      enabled: false,
    } as Partial<LearningSchedule>);
  }

  private setupListeners(): void {
    // Listen for emergence events to potentially override schedules
    bus.on('discovery:emergence_detected', (event: SynapsysEvent) => {
      this.handleEmergenceEvent(event.payload as Record<string, unknown>);
    });

    // Listen for learning events
    bus.on('learning:reward_received', (event: SynapsysEvent) => {
      this.handleLearningEvent(event.payload as Record<string, unknown>);
    });

    // Listen for system load changes
    bus.on('metrics:load_update', (event: SynapsysEvent) => {
      this.handleLoadUpdate(event.payload as { load: number });
    });

    // Listen for goal progress
    bus.on('goal:progress', (event: SynapsysEvent) => {
      this.handleGoalProgress(event.payload as Record<string, unknown>);
    });
  }

  // ============================================================================
  // SCHEDULER LIFECYCLE
  // ============================================================================

  start(): void {
    if (this.state.status === 'running') {
      console.log('[LearningScheduler] Already running');
      return;
    }

    this.state.status = 'running';
    this.checkInterval = setInterval(() => this.checkSchedules(), this.CHECK_INTERVAL_MS);
    this.checkSchedules(); // Initial check

    bus.publish('precog', 'scheduler:started', {
      timestamp: new Date().toISOString(),
    });

    console.log('[LearningScheduler] ▶️ Scheduler started');
  }

  stop(): void {
    if (this.state.status === 'stopped') {
      return;
    }

    this.state.status = 'stopped';
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    // End any active execution
    if (this.activeExecution) {
      this.endExecution('interrupted', 'Scheduler stopped');
    }

    bus.publish('precog', 'scheduler:stopped', {
      timestamp: new Date().toISOString(),
    });

    console.log('[LearningScheduler] ⏹️ Scheduler stopped');
  }

  pause(reason?: string): void {
    this.state.status = 'paused';

    bus.publish('precog', 'scheduler:paused', {
      reason: reason || 'API request',
      timestamp: new Date().toISOString(),
    });

    console.log(`[LearningScheduler] ⏸️ Scheduler paused: ${reason || 'API request'}`);
  }

  resume(): void {
    if (this.state.status !== 'paused') {
      return;
    }

    this.state.status = 'running';

    bus.publish('precog', 'scheduler:resumed', {
      timestamp: new Date().toISOString(),
    });

    console.log('[LearningScheduler] ▶️ Scheduler resumed');
  }

  /**
   * Enter boost mode for intensive learning
   */
  setBoostMode(durationMs: number = 300000, multiplier: number = 1.5): void {
    this.state.currentMultiplier = multiplier;
    this.state.status = 'running';
    this.state.metrics.totalBurstMinutes += durationMs / 60000;

    bus.publish('precog', 'scheduler:boost_started', {
      duration: durationMs,
      multiplier,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[LearningScheduler] 🚀 Boost mode: ${multiplier}x for ${durationMs / 60000} minutes`
    );

    // Reset after duration
    setTimeout(() => {
      if (this.state.currentMultiplier === multiplier) {
        this.state.currentMultiplier = 1.0;
        this.state.status = 'stopped';
        bus.publish('precog', 'scheduler:boost_ended', {
          timestamp: new Date().toISOString(),
        });
        console.log('[LearningScheduler] Boost mode ended');
      }
    }, durationMs);
  }

  /**
   * Enter quiet mode for reduced learning
   */
  setQuietMode(durationMs: number = 600000): void {
    this.state.currentMultiplier = this.policy.defaultQuietMultiplier;
    this.state.status = 'running';
    this.state.metrics.totalQuietMinutes += durationMs / 60000;

    bus.publish('precog', 'scheduler:quiet_started', {
      duration: durationMs,
      multiplier: this.policy.defaultQuietMultiplier,
      timestamp: new Date().toISOString(),
    });

    console.log(`[LearningScheduler] 🌙 Quiet mode for ${durationMs / 60000} minutes`);

    // Reset after duration
    setTimeout(() => {
      if (this.state.currentMultiplier === this.policy.defaultQuietMultiplier) {
        this.state.currentMultiplier = 1.0;
        this.state.status = 'stopped';
        bus.publish('precog', 'scheduler:quiet_ended', {
          timestamp: new Date().toISOString(),
        });
        console.log('[LearningScheduler] Quiet mode ended');
      }
    }, durationMs);
  }

  // ============================================================================
  // SCHEDULE MANAGEMENT
  // ============================================================================

  async createSchedule(config: Partial<LearningSchedule>): Promise<LearningSchedule> {
    const id = `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const schedule: LearningSchedule = {
      id,
      name: config.name || 'Unnamed Schedule',
      type: config.type || 'custom',
      description: config.description || '',
      enabled: config.enabled ?? false,
      timing: {
        durationMinutes: config.timing?.durationMinutes || this.policy.defaultDuration,
        timezone: config.timing?.timezone || 'UTC',
        ...config.timing,
      },
      learningConfig: {
        learningRateMultiplier:
          config.learningConfig?.learningRateMultiplier ||
          (config.type === 'burst'
            ? this.policy.defaultBurstMultiplier
            : config.type === 'quiet'
              ? this.policy.defaultQuietMultiplier
              : 1.0),
        allowEmergenceResponse: config.learningConfig?.allowEmergenceResponse ?? true,
        allowGoalInterrupt: config.learningConfig?.allowGoalInterrupt ?? false,
        collectMetrics: config.learningConfig?.collectMetrics ?? true,
        ...config.learningConfig,
      },
      goal: config.goal,
      createdAt: new Date(),
      runCount: 0,
      successCount: 0,
      status: 'pending',
      priority: config.priority || 5,
    };

    // Calculate next run time
    schedule.nextRunAt = this.calculateNextRunTime(schedule);

    this.schedules.set(id, schedule);
    this.state.metrics.totalSchedulesCreated++;

    await this.saveState();

    bus.publish('precog', 'scheduler:schedule_created', {
      schedule: this.sanitizeSchedule(schedule),
      timestamp: new Date().toISOString(),
    });

    console.log(`[LearningScheduler] Created schedule: ${schedule.name} (${id})`);
    return schedule;
  }

  async updateSchedule(
    id: string,
    updates: Partial<LearningSchedule>
  ): Promise<LearningSchedule | null> {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      return null;
    }

    // Merge updates
    const updated: LearningSchedule = {
      ...schedule,
      ...updates,
      timing: { ...schedule.timing, ...updates.timing },
      learningConfig: { ...schedule.learningConfig, ...updates.learningConfig },
      goal: updates.goal !== undefined ? updates.goal : schedule.goal,
    };

    // Recalculate next run time if timing changed
    if (updates.timing) {
      updated.nextRunAt = this.calculateNextRunTime(updated);
    }

    this.schedules.set(id, updated);
    await this.saveState();

    bus.publish('precog', 'scheduler:schedule_updated', {
      scheduleId: id,
      updates,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      return false;
    }

    // Can't delete an active schedule
    if (this.state.activeSchedules.includes(id)) {
      throw new Error('Cannot delete an active schedule. Stop it first.');
    }

    this.schedules.delete(id);
    await this.saveState();

    bus.publish('precog', 'scheduler:schedule_deleted', {
      scheduleId: id,
      scheduleName: schedule.name,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  async enableSchedule(id: string): Promise<boolean> {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      return false;
    }

    schedule.enabled = true;
    schedule.nextRunAt = this.calculateNextRunTime(schedule);
    await this.saveState();

    console.log(`[LearningScheduler] Enabled schedule: ${schedule.name}`);
    return true;
  }

  async disableSchedule(id: string): Promise<boolean> {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      return false;
    }

    schedule.enabled = false;
    schedule.nextRunAt = undefined;

    // If this schedule is active, end it
    if (this.state.activeSchedules.includes(id)) {
      await this.endExecution('interrupted', 'Schedule disabled');
    }

    await this.saveState();

    console.log(`[LearningScheduler] Disabled schedule: ${schedule.name}`);
    return true;
  }

  getSchedule(id: string): LearningSchedule | undefined {
    return this.schedules.get(id);
  }

  getAllSchedules(): LearningSchedule[] {
    return Array.from(this.schedules.values());
  }

  getActiveSchedules(): LearningSchedule[] {
    return this.state.activeSchedules
      .map((id) => this.schedules.get(id))
      .filter((s): s is LearningSchedule => s !== undefined);
  }

  getUpcomingSchedules(count: number = 5): LearningSchedule[] {
    return Array.from(this.schedules.values())
      .filter((s) => s.enabled && s.nextRunAt)
      .sort((a, b) => (a.nextRunAt?.getTime() || 0) - (b.nextRunAt?.getTime() || 0))
      .slice(0, count);
  }

  // ============================================================================
  // SCHEDULE CHECKING & EXECUTION
  // ============================================================================

  private async checkSchedules(): Promise<void> {
    if (this.state.status !== 'running' || !this.policy.enabled) {
      return;
    }

    const now = new Date();
    this.state.lastCheck = now;

    // Reset quotas if needed
    this.checkQuotaReset(now);

    // Check for schedules that should start
    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled || !schedule.nextRunAt) {
        continue;
      }

      if (now >= schedule.nextRunAt && schedule.status !== 'active') {
        await this.tryStartSchedule(schedule);
      }
    }

    // Check for schedules that should end
    if (this.activeExecution) {
      const elapsed = (now.getTime() - this.activeExecution.startedAt.getTime()) / 60000; // minutes
      const schedule = this.schedules.get(this.activeExecution.scheduleId);

      if (schedule && elapsed >= schedule.timing.durationMinutes) {
        await this.endExecution('completed');
      }
    }

    // Update pending schedules list
    this.state.pendingSchedules = Array.from(this.schedules.values())
      .filter((s) => s.enabled && s.nextRunAt && s.status === 'pending')
      .map((s) => s.id);
  }

  private async tryStartSchedule(schedule: LearningSchedule): Promise<boolean> {
    // Check quota
    if (!this.hasQuota(schedule.timing.durationMinutes)) {
      console.log(`[LearningScheduler] Skipping ${schedule.name}: Insufficient quota`);
      schedule.nextRunAt = this.calculateNextRunTime(schedule);
      return false;
    }

    // Check system load
    if (this.policy.pauseOnHighLoad) {
      const currentLoad = await this.getSystemLoad();
      if (currentLoad > this.policy.loadThreshold) {
        this.state.metrics.skippedDueToLoad++;
        console.log(
          `[LearningScheduler] Skipping ${schedule.name}: System load too high (${(currentLoad * 100).toFixed(1)}%)`
        );
        schedule.nextRunAt = this.calculateNextRunTime(schedule);
        return false;
      }
    }

    // Check if we can preempt current execution
    if (this.activeExecution) {
      const activeSchedule = this.schedules.get(this.activeExecution.scheduleId);
      if (activeSchedule) {
        if (this.policy.allowPreemption && schedule.priority > activeSchedule.priority) {
          console.log(`[LearningScheduler] Preempting ${activeSchedule.name} for ${schedule.name}`);
          await this.endExecution('interrupted', 'Preempted by higher priority schedule');
          this.state.metrics.preemptions++;
        } else {
          // Can't start while another is running
          return false;
        }
      }
    }

    // Start the schedule
    await this.startExecution(schedule);
    return true;
  }

  private async startExecution(schedule: LearningSchedule): Promise<void> {
    const execution: ScheduleExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      scheduleId: schedule.id,
      startedAt: new Date(),
      status: 'running',
      metricsCollected: {
        learningOperations: 0,
        rewardsReceived: 0,
        avgReward: 0,
        explorations: 0,
        emergencesDetected: 0,
        goalsProgress: {},
      },
    };

    this.activeExecution = execution;
    this.executions.push(execution);
    schedule.status = 'active';
    schedule.runCount++;
    schedule.lastRunAt = new Date();
    this.state.activeSchedules = [schedule.id];
    this.state.currentMultiplier = schedule.learningConfig.learningRateMultiplier;

    // Apply learning configuration
    await this.applyLearningConfig(schedule);

    // Trim executions history
    if (this.executions.length > this.MAX_EXECUTIONS_HISTORY) {
      this.executions = this.executions.slice(-this.MAX_EXECUTIONS_HISTORY);
    }

    bus.publish('precog', 'scheduler:execution_started', {
      executionId: execution.id,
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      scheduleType: schedule.type,
      learningConfig: schedule.learningConfig,
      durationMinutes: schedule.timing.durationMinutes,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[LearningScheduler] 🚀 Started: ${schedule.name} (${schedule.type}, ${schedule.learningConfig.learningRateMultiplier}x learning rate)`
    );
  }

  private async endExecution(
    status: 'completed' | 'interrupted' | 'failed',
    reason?: string
  ): Promise<void> {
    if (!this.activeExecution) {
      return;
    }

    const execution = this.activeExecution;
    const schedule = this.schedules.get(execution.scheduleId);

    execution.endedAt = new Date();
    execution.status = status;
    execution.reason = reason;

    const durationMinutes = (execution.endedAt.getTime() - execution.startedAt.getTime()) / 60000;

    // Update quota
    this.useQuota(durationMinutes);

    // Update metrics
    this.state.metrics.totalSchedulesRun++;
    if (schedule) {
      if (schedule.type === 'burst') {
        this.state.metrics.totalBurstMinutes += durationMinutes;
        this.state.metrics.averageBurstDuration =
          this.state.metrics.totalBurstMinutes / this.state.metrics.totalSchedulesRun;
      } else if (schedule.type === 'quiet') {
        this.state.metrics.totalQuietMinutes += durationMinutes;
      }

      if (status === 'completed') {
        schedule.successCount++;
      }
      schedule.status = 'pending';
      schedule.nextRunAt = this.calculateNextRunTime(schedule);
    }

    // Reset learning configuration
    await this.resetLearningConfig();

    this.activeExecution = undefined;
    this.state.activeSchedules = [];
    this.state.currentMultiplier = 1.0;

    bus.publish('precog', 'scheduler:execution_ended', {
      executionId: execution.id,
      scheduleId: execution.scheduleId,
      scheduleName: schedule?.name,
      status,
      reason,
      durationMinutes,
      metricsCollected: execution.metricsCollected,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[LearningScheduler] ${status === 'completed' ? '✅' : status === 'interrupted' ? '⚠️' : '❌'} Ended: ${schedule?.name || 'Unknown'} (${status}${reason ? `: ${reason}` : ''})`
    );

    await this.saveState();
  }

  // ============================================================================
  // LEARNING CONFIGURATION APPLICATION
  // ============================================================================

  private async applyLearningConfig(schedule: LearningSchedule): Promise<void> {
    const config = schedule.learningConfig;

    // Publish event to adjust learning rate
    bus.publish('cortex', 'learning:rate_adjustment', {
      multiplier: config.learningRateMultiplier,
      source: 'scheduler',
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      scheduleType: schedule.type,
      durationMinutes: schedule.timing.durationMinutes,
      timestamp: new Date().toISOString(),
    });

    // Apply exploration override if specified
    if (config.explorationRateOverride !== undefined) {
      bus.publish('cortex', 'exploration:rate_override', {
        rate: config.explorationRateOverride,
        boost: config.explorationBoost || 0,
        source: 'scheduler',
        timestamp: new Date().toISOString(),
      });
    }

    // Set focus domains if specified
    if (config.focusDomains?.length) {
      bus.publish('cortex', 'learning:focus_domains', {
        domains: config.focusDomains,
        source: 'scheduler',
        timestamp: new Date().toISOString(),
      });
    }

    // Set resource limits
    if (config.maxOperations || config.maxCost) {
      bus.publish('cortex', 'learning:resource_limits', {
        maxOperations: config.maxOperations,
        maxCost: config.maxCost,
        maxConcurrent: config.maxConcurrent,
        source: 'scheduler',
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `[LearningScheduler] Applied config: ${config.learningRateMultiplier}x learning rate${
        config.explorationRateOverride !== undefined
          ? `, ${(config.explorationRateOverride * 100).toFixed(0)}% exploration`
          : ''
      }`
    );
  }

  private async resetLearningConfig(): Promise<void> {
    // Reset learning rate
    bus.publish('cortex', 'learning:rate_adjustment', {
      multiplier: 1.0,
      source: 'scheduler',
      reset: true,
      timestamp: new Date().toISOString(),
    });

    // Reset exploration rate
    bus.publish('cortex', 'exploration:rate_override', {
      rate: null,
      boost: 0,
      source: 'scheduler',
      reset: true,
      timestamp: new Date().toISOString(),
    });

    // Clear focus domains
    bus.publish('cortex', 'learning:focus_domains', {
      domains: [],
      source: 'scheduler',
      reset: true,
      timestamp: new Date().toISOString(),
    });

    // Clear resource limits
    bus.publish('cortex', 'learning:resource_limits', {
      maxOperations: undefined,
      maxCost: undefined,
      maxConcurrent: undefined,
      source: 'scheduler',
      reset: true,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private handleEmergenceEvent(payload: Record<string, unknown>): void {
    if (!this.policy.emergenceOverrideEnabled) {
      return;
    }

    if (!this.activeExecution) {
      return;
    }

    const schedule = this.schedules.get(this.activeExecution.scheduleId);
    if (!schedule?.learningConfig.allowEmergenceResponse) {
      console.log('[LearningScheduler] Emergence event ignored (schedule does not allow)');
      return;
    }

    // Record emergence detection
    this.activeExecution.metricsCollected.emergencesDetected++;

    // Optionally boost learning during emergence
    const strength = (payload['strength'] as number) || 0;
    if (strength > 0.8) {
      // High-strength emergence: temporary additional boost
      bus.publish('cortex', 'learning:emergence_boost', {
        additionalMultiplier: 1.5,
        durationMs: 300000, // 5 minutes
        reason: 'High-strength emergence detected',
        timestamp: new Date().toISOString(),
      });
      this.state.metrics.emergenceInterrupts++;
    }
  }

  private handleLearningEvent(payload: Record<string, unknown>): void {
    if (!this.activeExecution) {
      return;
    }

    // Track learning operations
    const type = payload['type'] as string;
    if (type?.includes('reward')) {
      this.activeExecution.metricsCollected.rewardsReceived++;
      const value = (payload['value'] as number) || 0;
      const current = this.activeExecution.metricsCollected;
      current.avgReward =
        (current.avgReward * (current.rewardsReceived - 1) + value) / current.rewardsReceived;
    } else if (type?.includes('exploration')) {
      this.activeExecution.metricsCollected.explorations++;
    } else {
      this.activeExecution.metricsCollected.learningOperations++;
    }
  }

  private handleLoadUpdate(payload: { load: number }): void {
    if (
      this.policy.pauseOnHighLoad &&
      this.state.status === 'running' &&
      payload.load > this.policy.loadThreshold
    ) {
      console.log(
        `[LearningScheduler] High system load detected (${(payload.load * 100).toFixed(1)}%), pausing scheduler`
      );
      this.pause('High system load');
    } else if (this.state.status === 'paused' && payload.load < this.policy.loadThreshold * 0.8) {
      console.log(
        `[LearningScheduler] System load normalized (${(payload.load * 100).toFixed(1)}%), resuming scheduler`
      );
      this.resume();
    }
  }

  private handleGoalProgress(payload: Record<string, unknown>): void {
    if (!this.activeExecution) {
      return;
    }

    const goalId = payload['goalId'] as string;
    const progress = payload['progress'] as number;

    if (goalId && progress !== undefined) {
      this.activeExecution.metricsCollected.goalsProgress[goalId] = progress;
    }

    // Check if goal schedule completed its goal
    const schedule = this.schedules.get(this.activeExecution.scheduleId);
    if (schedule?.type === 'goal' && schedule.goal) {
      if (goalId === schedule.goal.goalId && progress >= schedule.goal.targetValue) {
        this.state.metrics.goalsAchieved++;

        if (schedule.goal.autoComplete) {
          this.endExecution('completed', 'Goal achieved');
        }

        bus.publish('precog', 'scheduler:goal_achieved', {
          scheduleId: schedule.id,
          goalId,
          targetValue: schedule.goal.targetValue,
          achievedValue: progress,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // ============================================================================
  // TIMING CALCULATIONS
  // ============================================================================

  private calculateNextRunTime(schedule: LearningSchedule): Date | undefined {
    if (!schedule.enabled) {
      return undefined;
    }

    const now = new Date();
    const timing = schedule.timing;

    // One-time schedule
    if (timing.oneTime) {
      return timing.oneTime > now ? timing.oneTime : undefined;
    }

    // Interval-based
    if (timing.intervalMinutes) {
      const lastRun = schedule.lastRunAt || now;
      return new Date(lastRun.getTime() + timing.intervalMinutes * 60000);
    }

    // Cron pattern (simplified implementation)
    if (timing.cronPattern) {
      return this.parseCronNext(timing.cronPattern, now);
    }

    // Day/time based
    if (timing.daysOfWeek?.length && timing.customHours?.length) {
      return this.calculateNextDayWindow(timing.daysOfWeek, timing.customHours, now);
    }

    // Default: run at next hour
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return next;
  }

  private parseCronNext(pattern: string, after: Date): Date {
    // Simplified cron parser (minute hour dayOfMonth month dayOfWeek)
    // This is a basic implementation - production would use a library like 'cron-parser'
    const parts = pattern.split(' ');
    const minute = parts[0] ?? '*';
    const hour = parts[1] ?? '*';

    const next = new Date(after);

    // Parse hour
    if (hour !== '*') {
      const targetHour = parseInt(hour, 10);
      if (next.getHours() >= targetHour) {
        next.setDate(next.getDate() + 1);
      }
      next.setHours(targetHour);
    }

    // Parse minute
    if (minute !== '*') {
      next.setMinutes(parseInt(minute, 10), 0, 0);
    } else {
      next.setMinutes(0, 0, 0);
    }

    return next;
  }

  private calculateNextDayWindow(days: DayOfWeek[], hours: number[], after: Date): Date {
    const dayMap: Record<DayOfWeek, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };

    const targetDays = days.map((d) => dayMap[d]).sort((a, b) => a - b);
    const targetHours = [...hours].sort((a, b) => a - b);

    const currentDay = after.getDay();
    const currentHour = after.getHours();

    // Find next valid day and hour
    for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
      const checkDay = (currentDay + dayOffset) % 7;
      if (!targetDays.includes(checkDay)) {
        continue;
      }

      for (const hour of targetHours) {
        if (dayOffset === 0 && hour <= currentHour) {
          continue; // Already passed today
        }

        const next = new Date(after);
        next.setDate(next.getDate() + dayOffset);
        next.setHours(hour, 0, 0, 0);
        return next;
      }
    }

    // Fallback: next week same time
    const next = new Date(after);
    next.setDate(next.getDate() + 7);
    next.setHours(targetHours[0] || 9, 0, 0, 0);
    return next;
  }

  // ============================================================================
  // QUOTA MANAGEMENT
  // ============================================================================

  private hasQuota(minutes: number): boolean {
    const daily = this.state.quotaUsed.daily;
    const weekly = this.state.quotaUsed.weekly;
    const rollover = this.state.quotaUsed.rollover;

    const availableDaily = daily.remaining + rollover;
    const availableWeekly = weekly.remaining;

    return minutes <= availableDaily && minutes <= availableWeekly;
  }

  private useQuota(minutes: number): void {
    // Use rollover first
    let remaining = minutes;
    if (this.state.quotaUsed.rollover > 0) {
      const fromRollover = Math.min(remaining, this.state.quotaUsed.rollover);
      this.state.quotaUsed.rollover -= fromRollover;
      remaining -= fromRollover;
    }

    // Then use daily quota
    this.state.quotaUsed.daily.used += remaining;
    this.state.quotaUsed.daily.remaining = Math.max(
      0,
      this.state.quotaUsed.daily.limit - this.state.quotaUsed.daily.used
    );

    // And weekly quota
    this.state.quotaUsed.weekly.used += minutes;
    this.state.quotaUsed.weekly.remaining = Math.max(
      0,
      this.state.quotaUsed.weekly.limit - this.state.quotaUsed.weekly.used
    );
  }

  private checkQuotaReset(now: Date): void {
    // Daily reset
    if (now >= this.state.quotaUsed.daily.resetAt) {
      // Calculate rollover
      if (this.policy.quotaRolloverEnabled) {
        const unused = this.state.quotaUsed.daily.remaining;
        this.state.quotaUsed.rollover = Math.min(
          this.state.quotaUsed.rollover + unused,
          this.policy.maxRolloverMinutes
        );
      }

      this.state.quotaUsed.daily = {
        used: 0,
        limit: this.policy.dailyLearningQuota,
        remaining: this.policy.dailyLearningQuota,
        resetAt: this.getNextMidnight(),
      };
    }

    // Weekly reset
    if (now >= this.state.quotaUsed.weekly.resetAt) {
      this.state.quotaUsed.weekly = {
        used: 0,
        limit: this.policy.weeklyLearningQuota,
        remaining: this.policy.weeklyLearningQuota,
        resetAt: this.getNextSunday(),
      };
      // Clear rollover on weekly reset
      this.state.quotaUsed.rollover = 0;
    }
  }

  private getNextMidnight(): Date {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private getNextSunday(): Date {
    const next = new Date();
    const daysUntilSunday = (7 - next.getDay()) % 7 || 7;
    next.setDate(next.getDate() + daysUntilSunday);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async getSystemLoad(): Promise<number> {
    // Get system load from metrics
    try {
      const os = await import('os');
      const cpus = os.cpus();
      const avgLoad = os.loadavg()[0] || 0;
      return avgLoad / cpus.length;
    } catch {
      return 0;
    }
  }

  private sanitizeSchedule(schedule: LearningSchedule): Partial<LearningSchedule> {
    return {
      id: schedule.id,
      name: schedule.name,
      type: schedule.type,
      description: schedule.description,
      enabled: schedule.enabled,
      timing: schedule.timing,
      learningConfig: schedule.learningConfig,
      goal: schedule.goal,
      nextRunAt: schedule.nextRunAt,
      lastRunAt: schedule.lastRunAt,
      runCount: schedule.runCount,
      successCount: schedule.successCount,
      status: schedule.status,
      priority: schedule.priority,
    };
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private async saveState(): Promise<void> {
    try {
      const data = {
        schedules: Array.from(this.schedules.entries()),
        executions: this.executions.slice(-100), // Keep last 100
        policy: this.policy,
        state: this.state,
        savedAt: new Date().toISOString(),
      };

      await fs.writeJson(this.stateFile, data, { spaces: 2 });
    } catch (error) {
      console.error('[LearningScheduler] Failed to save state:', error);
    }
  }

  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const data = await fs.readJson(this.stateFile);

        if (data.schedules) {
          this.schedules = new Map(data.schedules);
          // Convert date strings back to Date objects
          for (const schedule of this.schedules.values()) {
            schedule.createdAt = new Date(schedule.createdAt);
            if (schedule.lastRunAt) schedule.lastRunAt = new Date(schedule.lastRunAt);
            if (schedule.nextRunAt) schedule.nextRunAt = new Date(schedule.nextRunAt);
            if (schedule.goal?.deadline) {
              schedule.goal.deadline = new Date(schedule.goal.deadline);
            }
          }
        }

        if (data.executions) {
          this.executions = data.executions.map((e: ScheduleExecution) => ({
            ...e,
            startedAt: new Date(e.startedAt),
            endedAt: e.endedAt ? new Date(e.endedAt) : undefined,
          }));
        }

        if (data.policy) {
          this.policy = { ...this.policy, ...data.policy };
        }

        if (data.state?.metrics) {
          this.state.metrics = { ...this.state.metrics, ...data.state.metrics };
        }

        console.log(
          `[LearningScheduler] Loaded ${this.schedules.size} schedules, ${this.executions.length} executions`
        );
      }
    } catch (error) {
      console.error('[LearningScheduler] Failed to load state:', error);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getPolicy(): SchedulerPolicy {
    return { ...this.policy };
  }

  updatePolicy(updates: Partial<SchedulerPolicy>): SchedulerPolicy {
    this.policy = { ...this.policy, ...updates };
    this.saveState();
    return this.policy;
  }

  getState(): SchedulerState {
    return { ...this.state };
  }

  getMetrics(): SchedulerMetrics {
    return { ...this.state.metrics };
  }

  getQuotaUsage(): QuotaUsage {
    return { ...this.state.quotaUsed };
  }

  getExecutionHistory(limit: number = 50): ScheduleExecution[] {
    return this.executions.slice(-limit);
  }

  getActiveExecution(): ScheduleExecution | undefined {
    return this.activeExecution;
  }

  // Create schedule from template
  async createFromTemplate(
    templateName: string,
    overrides?: Partial<LearningSchedule>
  ): Promise<LearningSchedule | null> {
    const template = SCHEDULE_TEMPLATES[templateName];
    if (!template) {
      console.error(`[LearningScheduler] Template not found: ${templateName}`);
      return null;
    }

    return this.createSchedule({
      ...template,
      ...overrides,
    });
  }

  // Trigger immediate burst
  async triggerImmediateBurst(
    durationMinutes: number = 15,
    multiplier: number = 2.0
  ): Promise<ScheduleExecution | null> {
    const schedule = await this.createSchedule({
      name: `Immediate Burst (${new Date().toISOString()})`,
      type: 'burst',
      description: 'Manually triggered learning burst',
      enabled: true,
      timing: {
        oneTime: new Date(),
        durationMinutes,
        timezone: 'UTC',
      },
      learningConfig: {
        learningRateMultiplier: multiplier,
        allowEmergenceResponse: true,
        allowGoalInterrupt: false,
        collectMetrics: true,
      },
      priority: 9,
    });

    await this.tryStartSchedule(schedule);
    return this.activeExecution || null;
  }

  // Trigger quiet period
  async triggerQuietPeriod(durationMinutes: number = 30): Promise<ScheduleExecution | null> {
    const schedule = await this.createSchedule({
      name: `Quiet Period (${new Date().toISOString()})`,
      type: 'quiet',
      description: 'Manually triggered quiet period',
      enabled: true,
      timing: {
        oneTime: new Date(),
        durationMinutes,
        timezone: 'UTC',
      },
      learningConfig: {
        learningRateMultiplier: 0.2,
        explorationRateOverride: 0.05,
        allowEmergenceResponse: false,
        allowGoalInterrupt: false,
        collectMetrics: true,
      },
      priority: 9,
    });

    await this.tryStartSchedule(schedule);
    return this.activeExecution || null;
  }

  // Get template list
  getTemplates(): Record<string, Partial<LearningSchedule>> {
    return { ...SCHEDULE_TEMPLATES };
  }
}

// Export singleton
export const learningScheduler = LearningScheduler.getInstance();
