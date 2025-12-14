// @version 3.3.577
/**
 * Session Continuity Manager Tests
 *
 * Tests for the continuity/session-continuity module which
 * ensures TooLoo maintains context across restarts
 *
 * @version 3.3.510
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs-extra before imports
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    readJson: vi.fn().mockResolvedValue(null),
    writeJson: vi.fn().mockResolvedValue(undefined),
  },
  ensureDir: vi.fn().mockResolvedValue(undefined),
  pathExists: vi.fn().mockResolvedValue(false),
  readJson: vi.fn().mockResolvedValue(null),
  writeJson: vi.fn().mockResolvedValue(undefined),
}));

// Mock event bus
vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
    subscribe: vi.fn(),
  },
  SynapsysEvent: {},
}));

describe('SessionContinuityManager', () => {
  let SessionContinuityManager: any;
  let manager: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Re-import to get fresh singleton
    const mod = await import('../../../../src/cortex/continuity/session-continuity.js');
    SessionContinuityManager = mod.SessionContinuityManager;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Singleton Pattern', () => {
    it('should have getInstance method', () => {
      expect(typeof SessionContinuityManager.getInstance).toBe('function');
    });

    it('should return same instance on multiple calls', () => {
      const instance1 = SessionContinuityManager.getInstance();
      const instance2 = SessionContinuityManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should have initialize method', () => {
      manager = SessionContinuityManager.getInstance();
      expect(typeof manager.initialize).toBe('function');
    });

    it('should initialize successfully', async () => {
      manager = SessionContinuityManager.getInstance();
      const report = await manager.initialize();
      expect(report).toBeDefined();
      expect(report.sessionId).toBeDefined();
    });

    it('should return continuity report on init', async () => {
      manager = SessionContinuityManager.getInstance();
      const report = await manager.initialize();
      expect(report).toHaveProperty('sessionId');
      expect(report).toHaveProperty('timeSinceLastSession');
      expect(report).toHaveProperty('resumedTasks');
      expect(report).toHaveProperty('restoredContext');
      expect(report).toHaveProperty('goalsInProgress');
      expect(report).toHaveProperty('continuityScore');
    });

    it('should generate unique session ID', async () => {
      manager = SessionContinuityManager.getInstance();
      const report = await manager.initialize();
      expect(report.sessionId).toMatch(/^session-\d+-[a-z0-9]+$/);
    });
  });

  describe('Task Tracking', () => {
    beforeEach(async () => {
      manager = SessionContinuityManager.getInstance();
      await manager.initialize();
    });

    it('should have trackTask method', () => {
      expect(typeof manager.trackTask).toBe('function');
    });

    it('should track a new task', () => {
      expect(() => {
        manager.trackTask({
          id: 'task-1',
          type: 'execution',
          description: 'Test task',
          progress: 0.5,
          resumeState: {},
          priority: 1,
        });
      }).not.toThrow();
    });

    it('should have updateTaskProgress method', () => {
      expect(typeof manager.updateTaskProgress).toBe('function');
    });

    it('should update task progress', () => {
      manager.trackTask({
        id: 'task-2',
        type: 'analysis',
        description: 'Analysis task',
        progress: 0.3,
        resumeState: {},
        priority: 2,
      });
      expect(() => manager.updateTaskProgress('task-2', 0.5)).not.toThrow();
    });

    it('should have getResumableTasks method', () => {
      expect(typeof manager.getResumableTasks).toBe('function');
    });
  });

  describe('Project Context', () => {
    beforeEach(async () => {
      manager = SessionContinuityManager.getInstance();
      await manager.initialize();
    });

    it('should have setProjectContext method', () => {
      expect(typeof manager.setProjectContext).toBe('function');
    });

    it('should set project context', () => {
      expect(() => {
        manager.setProjectContext({
          projectId: 'proj-1',
          projectName: 'Test Project',
          activeFiles: ['file1.ts', 'file2.ts'],
          recentChanges: [],
        });
      }).not.toThrow();
    });

    it('should have addProjectChange method', () => {
      expect(typeof manager.addProjectChange).toBe('function');
    });
  });

  describe('Conversation Context', () => {
    beforeEach(async () => {
      manager = SessionContinuityManager.getInstance();
      await manager.initialize();
    });

    it('should have addConversationMessage method', () => {
      expect(typeof manager.addConversationMessage).toBe('function');
    });

    it('should add conversation message', () => {
      expect(() => {
        manager.addConversationMessage('user', 'Hello, how are you?');
      }).not.toThrow();
    });
  });

  describe('Persistent Goals', () => {
    beforeEach(async () => {
      manager = SessionContinuityManager.getInstance();
      await manager.initialize();
    });

    it('should have addPersistentGoal method', () => {
      expect(typeof manager.addPersistentGoal).toBe('function');
    });

    it('should add a persistent goal', () => {
      const goal = manager.addPersistentGoal({
        description: 'Achieve 100% test coverage',
        metric: 'coverage',
        targetValue: 100,
        currentValue: 0,
        progress: 0,
      });
      expect(goal).toBeDefined();
      expect(goal.id).toBeDefined();
    });

    it('should have updateGoalProgress method', () => {
      expect(typeof manager.updateGoalProgress).toBe('function');
    });

    it('should have getActiveGoals method', () => {
      expect(typeof manager.getActiveGoals).toBe('function');
    });

    it('should return array of goals', () => {
      const goals = manager.getActiveGoals();
      expect(Array.isArray(goals)).toBe(true);
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      manager = SessionContinuityManager.getInstance();
      await manager.initialize();
    });

    it('should have getState method', () => {
      expect(typeof manager.getState).toBe('function');
    });

    it('should return session state', () => {
      const state = manager.getState();
      expect(state).toBeDefined();
      expect(state.sessionId).toBeDefined();
      expect(state.startedAt).toBeDefined();
    });

    it('should have getSessionId method', () => {
      expect(typeof manager.getSessionId).toBe('function');
    });

    it('should have getSessionCount method', () => {
      expect(typeof manager.getSessionCount).toBe('function');
    });

    it('should have getTotalUptime method', () => {
      expect(typeof manager.getTotalUptime).toBe('function');
    });
  });

  describe('Shutdown', () => {
    beforeEach(async () => {
      manager = SessionContinuityManager.getInstance();
      await manager.initialize();
    });

    it('should have shutdown method', () => {
      expect(typeof manager.shutdown).toBe('function');
    });

    it('should shutdown gracefully', async () => {
      await expect(manager.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Session Info', () => {
    beforeEach(async () => {
      manager = SessionContinuityManager.getInstance();
      await manager.initialize();
    });

    it('should return session ID', () => {
      const sessionId = manager.getSessionId();
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
    });

    it('should return session count', () => {
      const count = manager.getSessionCount();
      expect(count).toBeDefined();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('should return total uptime', () => {
      const uptime = manager.getTotalUptime();
      expect(uptime).toBeDefined();
      expect(typeof uptime).toBe('number');
      expect(uptime).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Session State Types', () => {
  it('should define ActiveTask type', async () => {
    const mod = await import('../../../../src/cortex/continuity/session-continuity.js');
    // Types are compile-time only, so we verify the module exports
    expect(mod).toBeDefined();
  });

  it('should define ProjectContext type', async () => {
    const mod = await import('../../../../src/cortex/continuity/session-continuity.js');
    expect(mod).toBeDefined();
  });

  it('should define PersistentGoal type', async () => {
    const mod = await import('../../../../src/cortex/continuity/session-continuity.js');
    expect(mod).toBeDefined();
  });
});

describe('ContinuityReport Structure', () => {
  it('should have all required fields', async () => {
    vi.resetModules();
    const mod = await import('../../../../src/cortex/continuity/session-continuity.js');
    const manager = mod.SessionContinuityManager.getInstance();
    const report = await manager.initialize();

    expect(typeof report.sessionId).toBe('string');
    expect(typeof report.timeSinceLastSession).toBe('number');
    expect(typeof report.resumedTasks).toBe('number');
    expect(typeof report.restoredContext).toBe('boolean');
    expect(typeof report.goalsInProgress).toBe('number');
    expect(typeof report.continuityScore).toBe('number');
  });

  it('should have continuityScore between 0 and 1', async () => {
    vi.resetModules();
    const mod = await import('../../../../src/cortex/continuity/session-continuity.js');
    const manager = mod.SessionContinuityManager.getInstance();
    const report = await manager.initialize();

    expect(report.continuityScore).toBeGreaterThanOrEqual(0);
    expect(report.continuityScore).toBeLessThanOrEqual(1);
  });
});

describe('Task Types', () => {
  let manager: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../../../src/cortex/continuity/session-continuity.js');
    manager = mod.SessionContinuityManager.getInstance();
    await manager.initialize();
  });

  it('should support execution task type', () => {
    expect(() => {
      manager.trackTask({
        id: 'exec-1',
        type: 'execution',
        description: 'Execute code',
        progress: 0,
        resumeState: {},
        priority: 1,
      });
    }).not.toThrow();
  });

  it('should support analysis task type', () => {
    expect(() => {
      manager.trackTask({
        id: 'analysis-1',
        type: 'analysis',
        description: 'Analyze code',
        progress: 0,
        resumeState: {},
        priority: 1,
      });
    }).not.toThrow();
  });

  it('should support generation task type', () => {
    expect(() => {
      manager.trackTask({
        id: 'gen-1',
        type: 'generation',
        description: 'Generate code',
        progress: 0,
        resumeState: {},
        priority: 1,
      });
    }).not.toThrow();
  });

  it('should support learning task type', () => {
    expect(() => {
      manager.trackTask({
        id: 'learn-1',
        type: 'learning',
        description: 'Learn patterns',
        progress: 0,
        resumeState: {},
        priority: 1,
      });
    }).not.toThrow();
  });

  it('should support optimization task type', () => {
    expect(() => {
      manager.trackTask({
        id: 'opt-1',
        type: 'optimization',
        description: 'Optimize performance',
        progress: 0,
        resumeState: {},
        priority: 1,
      });
    }).not.toThrow();
  });
});
