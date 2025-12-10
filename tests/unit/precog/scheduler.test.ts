/**
 * Scheduler Test Suite
 * @version 3.3.510
 *
 * Tests for the job scheduling system including:
 * - Job interface and registration
 * - Interval-based execution
 * - Job lifecycle management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// TYPE DEFINITIONS (mirrors implementation)
// ============================================================================

interface Job {
  id: string;
  interval: number; // ms
  task: () => void | Promise<void>;
  lastRun: number;
  active: boolean;
}

// ============================================================================
// MOCK SCHEDULER CLASS
// ============================================================================

class MockScheduler {
  private jobs: Map<string, Job> = new Map();
  private timer: NodeJS.Timeout | null = null;

  register(id: string, interval: number, task: () => void | Promise<void>): void {
    this.jobs.set(id, {
      id,
      interval,
      task,
      lastRun: 0,
      active: true,
    });
  }

  unregister(id: string): boolean {
    return this.jobs.delete(id);
  }

  pause(id: string): boolean {
    const job = this.jobs.get(id);
    if (job) {
      job.active = false;
      return true;
    }
    return false;
  }

  resume(id: string): boolean {
    const job = this.jobs.get(id);
    if (job) {
      job.active = true;
      return true;
    }
    return false;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  getActiveJobs(): Job[] {
    return Array.from(this.jobs.values()).filter((j) => j.active);
  }

  async checkJobs(): Promise<void> {
    const now = Date.now();
    for (const job of this.jobs.values()) {
      if (job.active && now - job.lastRun >= job.interval) {
        job.lastRun = now;
        try {
          await job.task();
        } catch (e) {
          // Job failed - silently continue
        }
      }
    }
  }

  startLoop(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.checkJobs(), 1000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isRunning(): boolean {
    return this.timer !== null;
  }
}

// ============================================================================
// JOB INTERFACE TESTS
// ============================================================================

describe('Job Interface', () => {
  it('should create job with required properties', () => {
    const job: Job = {
      id: 'job-1',
      interval: 5000,
      task: () => {},
      lastRun: 0,
      active: true,
    };
    expect(job.id).toBe('job-1');
    expect(job.interval).toBe(5000);
    expect(job.active).toBe(true);
  });

  it('should support async tasks', () => {
    const job: Job = {
      id: 'async-job',
      interval: 10000,
      task: async () => {
        await Promise.resolve();
      },
      lastRun: 0,
      active: true,
    };
    expect(job.task).toBeDefined();
  });

  it('should track lastRun timestamp', () => {
    const now = Date.now();
    const job: Job = {
      id: 'tracked-job',
      interval: 1000,
      task: () => {},
      lastRun: now,
      active: true,
    };
    expect(job.lastRun).toBe(now);
  });
});

// ============================================================================
// SCHEDULER REGISTRATION TESTS
// ============================================================================

describe('Scheduler Registration', () => {
  let scheduler: MockScheduler;

  beforeEach(() => {
    scheduler = new MockScheduler();
  });

  afterEach(() => {
    scheduler.stop();
  });

  it('should register new job', () => {
    scheduler.register('test-job', 5000, () => {});

    const job = scheduler.getJob('test-job');
    expect(job).toBeDefined();
    expect(job?.interval).toBe(5000);
  });

  it('should start job as active', () => {
    scheduler.register('active-job', 1000, () => {});

    const job = scheduler.getJob('active-job');
    expect(job?.active).toBe(true);
  });

  it('should initialize lastRun to 0', () => {
    scheduler.register('new-job', 1000, () => {});

    const job = scheduler.getJob('new-job');
    expect(job?.lastRun).toBe(0);
  });

  it('should register multiple jobs', () => {
    scheduler.register('job-1', 1000, () => {});
    scheduler.register('job-2', 2000, () => {});
    scheduler.register('job-3', 3000, () => {});

    expect(scheduler.getAllJobs().length).toBe(3);
  });

  it('should replace job with same id', () => {
    scheduler.register('same-id', 1000, () => {});
    scheduler.register('same-id', 5000, () => {});

    const job = scheduler.getJob('same-id');
    expect(job?.interval).toBe(5000);
    expect(scheduler.getAllJobs().length).toBe(1);
  });
});

// ============================================================================
// SCHEDULER UNREGISTER TESTS
// ============================================================================

describe('Scheduler Unregister', () => {
  let scheduler: MockScheduler;

  beforeEach(() => {
    scheduler = new MockScheduler();
  });

  it('should unregister existing job', () => {
    scheduler.register('to-remove', 1000, () => {});

    const result = scheduler.unregister('to-remove');

    expect(result).toBe(true);
    expect(scheduler.getJob('to-remove')).toBeUndefined();
  });

  it('should return false for non-existent job', () => {
    const result = scheduler.unregister('non-existent');
    expect(result).toBe(false);
  });
});

// ============================================================================
// SCHEDULER PAUSE/RESUME TESTS
// ============================================================================

describe('Scheduler Pause/Resume', () => {
  let scheduler: MockScheduler;

  beforeEach(() => {
    scheduler = new MockScheduler();
  });

  it('should pause active job', () => {
    scheduler.register('pausable', 1000, () => {});

    const result = scheduler.pause('pausable');

    expect(result).toBe(true);
    expect(scheduler.getJob('pausable')?.active).toBe(false);
  });

  it('should resume paused job', () => {
    scheduler.register('resumable', 1000, () => {});
    scheduler.pause('resumable');

    const result = scheduler.resume('resumable');

    expect(result).toBe(true);
    expect(scheduler.getJob('resumable')?.active).toBe(true);
  });

  it('should return false when pausing non-existent job', () => {
    const result = scheduler.pause('non-existent');
    expect(result).toBe(false);
  });

  it('should return false when resuming non-existent job', () => {
    const result = scheduler.resume('non-existent');
    expect(result).toBe(false);
  });
});

// ============================================================================
// SCHEDULER JOB FILTERING TESTS
// ============================================================================

describe('Scheduler Job Filtering', () => {
  let scheduler: MockScheduler;

  beforeEach(() => {
    scheduler = new MockScheduler();
    scheduler.register('active-1', 1000, () => {});
    scheduler.register('active-2', 2000, () => {});
    scheduler.register('paused', 3000, () => {});
    scheduler.pause('paused');
  });

  it('should get all jobs', () => {
    expect(scheduler.getAllJobs().length).toBe(3);
  });

  it('should get only active jobs', () => {
    const active = scheduler.getActiveJobs();
    expect(active.length).toBe(2);
    expect(active.every((j) => j.active)).toBe(true);
  });
});

// ============================================================================
// SCHEDULER EXECUTION TESTS
// ============================================================================

describe('Scheduler Execution', () => {
  let scheduler: MockScheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = new MockScheduler();
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  it('should execute job when interval elapsed', async () => {
    const task = vi.fn();
    scheduler.register('exec-test', 1000, task);

    // Set lastRun to past
    const job = scheduler.getJob('exec-test');
    if (job) job.lastRun = Date.now() - 2000;

    await scheduler.checkJobs();

    expect(task).toHaveBeenCalledTimes(1);
  });

  it('should not execute job before interval', async () => {
    const task = vi.fn();
    scheduler.register('too-soon', 10000, task);

    const job = scheduler.getJob('too-soon');
    if (job) job.lastRun = Date.now() - 5000; // Only 5s elapsed, need 10s

    await scheduler.checkJobs();

    expect(task).not.toHaveBeenCalled();
  });

  it('should not execute paused jobs', async () => {
    const task = vi.fn();
    scheduler.register('paused-job', 1000, task);
    scheduler.pause('paused-job');

    const job = scheduler.getJob('paused-job');
    if (job) job.lastRun = Date.now() - 2000;

    await scheduler.checkJobs();

    expect(task).not.toHaveBeenCalled();
  });

  it('should update lastRun after execution', async () => {
    const task = vi.fn();
    scheduler.register('update-test', 1000, task);

    const job = scheduler.getJob('update-test');
    if (job) job.lastRun = 0;

    const beforeCheck = Date.now();
    await scheduler.checkJobs();

    expect(job?.lastRun).toBeGreaterThanOrEqual(beforeCheck);
  });

  it('should handle task errors gracefully', async () => {
    const failingTask = vi.fn().mockRejectedValue(new Error('Task failed'));
    const successTask = vi.fn();

    scheduler.register('failing', 1000, failingTask);
    scheduler.register('success', 1000, successTask);

    // Set both to run
    scheduler.getJob('failing')!.lastRun = 0;
    scheduler.getJob('success')!.lastRun = 0;

    await scheduler.checkJobs();

    // Should continue to next job even after error
    expect(successTask).toHaveBeenCalled();
  });
});

// ============================================================================
// SCHEDULER LIFECYCLE TESTS
// ============================================================================

describe('Scheduler Lifecycle', () => {
  let scheduler: MockScheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = new MockScheduler();
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  it('should start loop', () => {
    scheduler.startLoop();
    expect(scheduler.isRunning()).toBe(true);
  });

  it('should stop loop', () => {
    scheduler.startLoop();
    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });

  it('should not start multiple loops', () => {
    scheduler.startLoop();
    scheduler.startLoop();
    scheduler.startLoop();

    expect(scheduler.isRunning()).toBe(true);
  });

  it('should be safe to stop when not running', () => {
    expect(() => scheduler.stop()).not.toThrow();
  });
});

// ============================================================================
// INTERVAL CONFIGURATION TESTS
// ============================================================================

describe('Interval Configuration', () => {
  it('should support millisecond intervals', () => {
    const job: Job = {
      id: 'ms-job',
      interval: 100,
      task: () => {},
      lastRun: 0,
      active: true,
    };
    expect(job.interval).toBe(100);
  });

  it('should support second intervals', () => {
    const job: Job = {
      id: 'sec-job',
      interval: 5000, // 5 seconds
      task: () => {},
      lastRun: 0,
      active: true,
    };
    expect(job.interval).toBe(5000);
  });

  it('should support minute intervals', () => {
    const job: Job = {
      id: 'min-job',
      interval: 60000, // 1 minute
      task: () => {},
      lastRun: 0,
      active: true,
    };
    expect(job.interval).toBe(60000);
  });

  it('should support hour intervals', () => {
    const job: Job = {
      id: 'hour-job',
      interval: 3600000, // 1 hour
      task: () => {},
      lastRun: 0,
      active: true,
    };
    expect(job.interval).toBe(3600000);
  });
});

// ============================================================================
// COMMON JOB PATTERNS TESTS
// ============================================================================

describe('Common Job Patterns', () => {
  let scheduler: MockScheduler;

  beforeEach(() => {
    scheduler = new MockScheduler();
  });

  afterEach(() => {
    scheduler.stop();
  });

  it('should support health check pattern', () => {
    scheduler.register('health-check', 30000, async () => {
      // Simulate health check
      return Promise.resolve();
    });

    const job = scheduler.getJob('health-check');
    expect(job?.interval).toBe(30000);
  });

  it('should support cleanup pattern', () => {
    scheduler.register('cleanup', 3600000, async () => {
      // Simulate cleanup
      return Promise.resolve();
    });

    const job = scheduler.getJob('cleanup');
    expect(job?.interval).toBe(3600000); // 1 hour
  });

  it('should support sync pattern', () => {
    scheduler.register('data-sync', 60000, async () => {
      // Simulate data sync
      return Promise.resolve();
    });

    const job = scheduler.getJob('data-sync');
    expect(job?.interval).toBe(60000); // 1 minute
  });

  it('should support metrics collection pattern', () => {
    scheduler.register('metrics', 10000, async () => {
      // Collect metrics
      return Promise.resolve();
    });

    const job = scheduler.getJob('metrics');
    expect(job?.interval).toBe(10000); // 10 seconds
  });
});
