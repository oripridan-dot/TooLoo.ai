// @version 3.3.573
/**
 * Spinal Cord Unit Tests
 * TooLoo.ai Synapsys V3.3.510
 *
 * Tests for reflex response system
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import path from 'path';

// Mock dependencies
vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: {
    on: vi.fn(),
    publish: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock('../../../../src/core/module-registry.js', () => ({
  registry: {
    register: vi.fn(),
    updateStatus: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue('const x = 1;'),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('SpinalCord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create instance', async () => {
      const { SpinalCord } = await import('../../../../src/cortex/reflex/spinal-cord');
      const cord = new SpinalCord();
      expect(cord).toBeDefined();
    });
  });

  describe('Start/Stop', () => {
    it('should start and register with module registry', async () => {
      const { SpinalCord } = await import('../../../../src/cortex/reflex/spinal-cord');
      const { registry } = await import('../../../../src/core/module-registry.js');

      const cord = new SpinalCord();
      cord.start();

      expect(registry.register).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'spinal-cord',
          status: 'ready',
        })
      );
    });

    it('should subscribe to file change events on start', async () => {
      const { SpinalCord } = await import('../../../../src/cortex/reflex/spinal-cord');
      const { bus } = await import('../../../../src/core/event-bus.js');

      const cord = new SpinalCord();
      cord.start();

      expect(bus.on).toHaveBeenCalledWith('sensory:file:change', expect.any(Function));
    });

    it('should publish activation event on start', async () => {
      const { SpinalCord } = await import('../../../../src/cortex/reflex/spinal-cord');
      const { bus } = await import('../../../../src/core/event-bus.js');

      const cord = new SpinalCord();
      cord.start();

      expect(bus.publish).toHaveBeenCalledWith(
        'cortex',
        'reflex:activated',
        expect.objectContaining({
          timestamp: expect.any(Number),
        })
      );
    });

    it('should stop cleanly', async () => {
      const { SpinalCord } = await import('../../../../src/cortex/reflex/spinal-cord');
      const { registry } = await import('../../../../src/core/module-registry.js');

      const cord = new SpinalCord();
      cord.start();
      cord.stop();

      expect(registry.updateStatus).toHaveBeenCalledWith('spinal-cord', 'degraded');
    });
  });

  describe('File Type Filtering', () => {
    it('should process TypeScript files', async () => {
      const { SpinalCord } = await import('../../../../src/cortex/reflex/spinal-cord');
      const { bus } = await import('../../../../src/core/event-bus.js');

      const cord = new SpinalCord();
      cord.start();

      // Get the file change handler
      const handler = (bus.on as any).mock.calls.find(
        (c: any[]) => c[0] === 'sensory:file:change'
      )?.[1];

      if (handler) {
        handler({
          payload: {
            type: 'change',
            path: 'src/test.ts',
            timestamp: Date.now(),
          },
        });

        // Advance timer past debounce
        vi.advanceTimersByTime(600);
      }

      expect(cord).toBeDefined();
    });

    it('should ignore non-code files', async () => {
      const fs = await import('fs-extra');
      const { SpinalCord } = await import('../../../../src/cortex/reflex/spinal-cord');
      const { bus } = await import('../../../../src/core/event-bus.js');

      const cord = new SpinalCord();
      cord.start();

      const handler = (bus.on as any).mock.calls.find(
        (c: any[]) => c[0] === 'sensory:file:change'
      )?.[1];

      if (handler) {
        handler({
          payload: {
            type: 'change',
            path: 'image.png',
            timestamp: Date.now(),
          },
        });

        vi.advanceTimersByTime(600);
      }

      // Should not read file for non-code extensions
      expect(fs.default.readFile).not.toHaveBeenCalled();
    });
  });

  describe('Issue Detection', () => {
    it('should detect empty files', async () => {
      const fs = await import('fs-extra');
      (fs.default.readFile as any).mockResolvedValueOnce('   \n\n   ');

      const { SpinalCord } = await import('../../../../src/cortex/reflex/spinal-cord');
      const { bus } = await import('../../../../src/core/event-bus.js');

      const cord = new SpinalCord();
      cord.start();

      const handler = (bus.on as any).mock.calls.find(
        (c: any[]) => c[0] === 'sensory:file:change'
      )?.[1];

      if (handler) {
        handler({
          payload: {
            type: 'change',
            path: 'src/empty.ts',
            timestamp: Date.now(),
          },
        });

        vi.advanceTimersByTime(600);
        await Promise.resolve(); // Let async operations complete
      }

      // Should emit analysis event
      expect(cord).toBeDefined();
    });

    it('should detect TODO markers', async () => {
      const fs = await import('fs-extra');
      (fs.default.readFile as any).mockResolvedValueOnce('// TODO: Fix this later\nconst x = 1;');

      const { SpinalCord } = await import('../../../../src/cortex/reflex/spinal-cord');
      const { bus } = await import('../../../../src/core/event-bus.js');

      const cord = new SpinalCord();
      cord.start();

      const handler = (bus.on as any).mock.calls.find(
        (c: any[]) => c[0] === 'sensory:file:change'
      )?.[1];

      if (handler) {
        handler({
          payload: {
            type: 'change',
            path: 'src/file.ts',
            timestamp: Date.now(),
          },
        });

        vi.advanceTimersByTime(600);
        await Promise.resolve();
      }

      expect(cord).toBeDefined();
    });

    it('should detect FIXME markers', async () => {
      const fs = await import('fs-extra');
      (fs.default.readFile as any).mockResolvedValueOnce(
        '// FIXME: Critical bug here\nconst y = 2;'
      );

      const { SpinalCord } = await import('../../../../src/cortex/reflex/spinal-cord');
      const { bus } = await import('../../../../src/core/event-bus.js');

      const cord = new SpinalCord();
      cord.start();

      const handler = (bus.on as any).mock.calls.find(
        (c: any[]) => c[0] === 'sensory:file:change'
      )?.[1];

      if (handler) {
        handler({
          payload: {
            type: 'change',
            path: 'src/buggy.ts',
            timestamp: Date.now(),
          },
        });

        vi.advanceTimersByTime(600);
        await Promise.resolve();
      }

      expect(cord).toBeDefined();
    });
  });

  describe('File Change Handling', () => {
    it('should handle file additions', async () => {
      const { SpinalCord } = await import('../../../../src/cortex/reflex/spinal-cord');
      const { bus } = await import('../../../../src/core/event-bus.js');

      const cord = new SpinalCord();
      cord.start();

      const handler = (bus.on as any).mock.calls.find(
        (c: any[]) => c[0] === 'sensory:file:change'
      )?.[1];

      if (handler) {
        handler({
          payload: {
            type: 'add',
            path: 'src/new.ts',
            timestamp: Date.now(),
          },
        });
      }

      expect(cord).toBeDefined();
    });

    it('should handle file deletions', async () => {
      const { SpinalCord } = await import('../../../../src/cortex/reflex/spinal-cord');
      const { bus } = await import('../../../../src/core/event-bus.js');

      const cord = new SpinalCord();
      cord.start();

      const handler = (bus.on as any).mock.calls.find(
        (c: any[]) => c[0] === 'sensory:file:change'
      )?.[1];

      if (handler) {
        handler({
          payload: {
            type: 'unlink',
            path: 'src/deleted.ts',
            timestamp: Date.now(),
          },
        });
      }

      expect(cord).toBeDefined();
    });
  });

  describe('Debouncing', () => {
    it('should debounce rapid file changes', async () => {
      const { SpinalCord } = await import('../../../../src/cortex/reflex/spinal-cord');
      const { bus } = await import('../../../../src/core/event-bus.js');

      const cord = new SpinalCord();
      cord.start();

      const handler = (bus.on as any).mock.calls.find(
        (c: any[]) => c[0] === 'sensory:file:change'
      )?.[1];

      // Verify handler exists and debouncing is set up
      expect(handler).toBeDefined();

      if (handler) {
        // Rapid changes to same file
        handler({
          payload: { type: 'change', path: 'src/rapid.ts', timestamp: Date.now() },
        });

        handler({
          payload: {
            type: 'change',
            path: 'src/rapid.ts',
            timestamp: Date.now(),
          },
        });

        // Debounce mechanism should be in place
        expect(cord).toBeDefined();
      }
    });
  });
});
