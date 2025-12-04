import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileWatcher } from '../../../../src/cortex/sensory/watcher';
import { EventBus } from '../../../../src/core/event-bus';
import * as chokidar from 'chokidar';

// Mock chokidar
vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('FileWatcher', () => {
  let watcher: FileWatcher;
  let bus: EventBus;
  let mockChokidarWatcher: any;

  beforeEach(() => {
    bus = new EventBus();
    vi.spyOn(bus, 'publish');
    
    watcher = new FileWatcher(bus, '/tmp/test-workspace');
    
    // Get the mock watcher instance
    mockChokidarWatcher = (chokidar.watch as any).mock.results[0]?.value;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should start watching files', () => {
    watcher.start();
    expect(chokidar.watch).toHaveBeenCalledWith(['.'], expect.objectContaining({
      cwd: '/tmp/test-workspace',
      ignored: expect.arrayContaining(['**/node_modules/**']),
    }));
  });

  it('should emit events on file changes', () => {
    // Setup mock watcher with event handlers
    const handlers: Record<string, Function> = {};
    const mockOn = vi.fn((event, handler) => {
      handlers[event] = handler;
      return { on: mockOn }; // Chainable
    });
    
    (chokidar.watch as any).mockReturnValue({
      on: mockOn,
      close: vi.fn(),
    });

    watcher.start();

    // Simulate 'add' event
    handlers['add']('test.ts');
    expect(bus.publish).toHaveBeenCalledWith('cortex', 'sensory:file:change', expect.objectContaining({
      type: 'add',
      path: 'test.ts',
    }));

    // Simulate 'change' event
    handlers['change']('test.ts');
    expect(bus.publish).toHaveBeenCalledWith('cortex', 'sensory:file:change', expect.objectContaining({
      type: 'change',
      path: 'test.ts',
    }));

    // Simulate 'unlink' event
    handlers['unlink']('test.ts');
    expect(bus.publish).toHaveBeenCalledWith('cortex', 'sensory:file:change', expect.objectContaining({
      type: 'unlink',
      path: 'test.ts',
    }));
  });

  it('should stop watching', async () => {
    const mockClose = vi.fn().mockResolvedValue(undefined);
    (chokidar.watch as any).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      close: mockClose,
    });

    watcher.start();
    await watcher.stop();

    expect(mockClose).toHaveBeenCalled();
  });
});
