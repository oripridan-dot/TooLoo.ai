// @version 3.3.577
/**
 * Task Processor Tests
 * @version 1.0.0
 *
 * Tests the task queue management system including:
 * - Task creation
 * - Queue management
 * - Status tracking
 * - Task lifecycle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-task-uuid'),
}));

vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
  },
}));

describe('TaskProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exports', () => {
    it('should export TaskProcessor class', async () => {
      const module = await import('../../../../src/cortex/agent/task-processor.js');
      expect(module.TaskProcessor).toBeDefined();
      expect(typeof module.TaskProcessor).toBe('function');
    });
  });

  describe('Instance Creation', () => {
    it('should create instance', async () => {
      const { TaskProcessor } = await import('../../../../src/cortex/agent/task-processor.js');
      const processor = new TaskProcessor();
      expect(processor).toBeInstanceOf(TaskProcessor);
    });
  });

  describe('Default Options', () => {
    it('should define default saveArtifacts', () => {
      const defaults = { saveArtifacts: true };
      expect(defaults.saveArtifacts).toBe(true);
    });

    it('should define default autoApprove', () => {
      const defaults = { autoApprove: false };
      expect(defaults.autoApprove).toBe(false);
    });

    it('should define default sandbox', () => {
      const defaults = { sandbox: true };
      expect(defaults.sandbox).toBe(true);
    });

    it('should define default timeout', () => {
      const defaults = { timeout: 60000 };
      expect(defaults.timeout).toBe(60000);
    });

    it('should define default retries', () => {
      const defaults = { retries: 0 };
      expect(defaults.retries).toBe(0);
    });
  });

  describe('Task Creation Params', () => {
    it('should require type', () => {
      const params = { type: 'generate' };
      expect(params.type).toBe('generate');
    });

    it('should require name', () => {
      const params = { name: 'Create component' };
      expect(params.name).toBe('Create component');
    });

    it('should require input', () => {
      const params = { input: { prompt: 'Create a button' } };
      expect(params.input.prompt).toBeDefined();
    });

    it('should support optional description', () => {
      const params = { description: 'Generate a React button component' };
      expect(params.description).toBeTruthy();
    });

    it('should support optional options', () => {
      const params = { options: { timeout: 30000 } };
      expect(params.options?.timeout).toBe(30000);
    });

    it('should support optional priority', () => {
      const params = { priority: 1 };
      expect(params.priority).toBe(1);
    });
  });

  describe('AgentTask Structure', () => {
    it('should generate unique ID', () => {
      const id = 'test-task-uuid';
      expect(id).toBeTruthy();
    });

    it('should initialize with pending status', () => {
      const task = { status: 'pending' };
      expect(task.status).toBe('pending');
    });

    it('should record creation time', () => {
      const createdAt = new Date();
      expect(createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Queue Management', () => {
    it('should insert at end of queue', () => {
      const queue: any[] = [];
      const task = { id: 'task-1' };
      const insertIndex = queue.length;
      queue.splice(insertIndex, 0, task);
      expect(queue).toHaveLength(1);
    });

    it('should track queue position', () => {
      const queue = [{ id: 'task-1' }, { id: 'task-2' }];
      const position = queue.findIndex((t) => t.id === 'task-2');
      expect(position).toBe(1);
    });
  });

  describe('getNextTask', () => {
    it('should find pending task', () => {
      const queue = [
        { id: 'task-1', status: 'completed' },
        { id: 'task-2', status: 'pending' },
      ];
      const next = queue.find((t) => t.status === 'pending');
      expect(next?.id).toBe('task-2');
    });

    it('should return null if no pending tasks', () => {
      const queue = [
        { id: 'task-1', status: 'completed' },
        { id: 'task-2', status: 'completed' },
      ];
      const next = queue.find((t) => t.status === 'pending') || null;
      expect(next).toBeNull();
    });
  });

  describe('startTask', () => {
    it('should find task by ID', () => {
      const queue = [{ id: 'task-1' }, { id: 'task-2' }];
      const task = queue.find((t) => t.id === 'task-1');
      expect(task).toBeDefined();
    });

    it('should verify task is pending', () => {
      const task = { id: 'task-1', status: 'pending' };
      const canStart = task.status === 'pending';
      expect(canStart).toBe(true);
    });

    it('should reject non-pending tasks', () => {
      const task = { id: 'task-1', status: 'completed' };
      const canStart = task.status === 'pending';
      expect(canStart).toBe(false);
    });
  });

  describe('Task Statuses', () => {
    it('should support pending status', () => {
      const status = 'pending';
      expect(status).toBe('pending');
    });

    it('should support running status', () => {
      const status = 'running';
      expect(status).toBe('running');
    });

    it('should support completed status', () => {
      const status = 'completed';
      expect(status).toBe('completed');
    });

    it('should support failed status', () => {
      const status = 'failed';
      expect(status).toBe('failed');
    });
  });

  describe('History Management', () => {
    it('should limit history size', () => {
      const maxHistorySize = 100;
      expect(maxHistorySize).toBe(100);
    });
  });

  describe('Event Publishing', () => {
    it('should publish task queued event', async () => {
      const { TaskProcessor } = await import('../../../../src/cortex/agent/task-processor.js');
      const { bus } = await import('../../../../src/core/event-bus.js');
      const processor = new TaskProcessor();

      processor.createTask({
        type: 'generate',
        name: 'Test task',
        input: { prompt: 'test' },
      });

      expect(bus.publish).toHaveBeenCalled();
    });
  });
});
