// @version 3.3.354 - Plugin Manager Unit Tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
vi.mock('fs/promises');

// Mock event bus
vi.mock('../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
  },
}));

import { PluginManager } from '../../src/core/plugin-manager.js';

describe('PluginManager', () => {
  let manager: PluginManager;
  const testWorkspace = '/test/workspace';

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default mock implementations
    (fs.mkdir as any).mockResolvedValue(undefined);
    (fs.readFile as any).mockRejectedValue({ code: 'ENOENT' });
    (fs.writeFile as any).mockResolvedValue(undefined);
    (fs.readdir as any).mockResolvedValue([]);
    (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
    (fs.access as any).mockResolvedValue(undefined);

    manager = new PluginManager(testWorkspace);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await manager.initialize();
      expect(fs.mkdir).toHaveBeenCalled();
    });

    it('should create plugins directory if not exists', async () => {
      await manager.initialize();
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('plugins'),
        expect.any(Object)
      );
    });
  });

  describe('plugin registration', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should register a valid plugin', async () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        author: 'Test Author',
        type: 'tool' as const,
        entry: 'index.js',
        hooks: ['before-generate'],
        permissions: ['read-files'],
      };

      await manager.registerPlugin(manifest, async () => {
        return { success: true };
      });

      const plugins = manager.listPlugins();
      expect(plugins.find((p) => p.id === 'test-plugin')).toBeDefined();
    });

    it('should reject duplicate plugin IDs', async () => {
      const manifest = {
        id: 'duplicate-plugin',
        name: 'Duplicate Plugin',
        version: '1.0.0',
        author: 'Test',
        type: 'tool' as const,
        entry: 'index.js',
      };

      await manager.registerPlugin(manifest, async () => ({}));

      await expect(
        manager.registerPlugin(manifest, async () => ({}))
      ).rejects.toThrow(/already registered/);
    });

    it('should validate required manifest fields', async () => {
      const invalidManifest = {
        id: 'invalid',
        // Missing required fields
      } as any;

      await expect(
        manager.registerPlugin(invalidManifest, async () => ({}))
      ).rejects.toThrow();
    });
  });

  describe('plugin lifecycle', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should enable plugin', async () => {
      const manifest = {
        id: 'lifecycle-plugin',
        name: 'Lifecycle Plugin',
        version: '1.0.0',
        author: 'Test',
        type: 'tool' as const,
        entry: 'index.js',
      };

      await manager.registerPlugin(manifest, async () => ({}));
      await manager.enablePlugin('lifecycle-plugin');

      const plugins = manager.listPlugins();
      const plugin = plugins.find((p) => p.id === 'lifecycle-plugin');
      expect(plugin?.enabled).toBe(true);
    });

    it('should disable plugin', async () => {
      const manifest = {
        id: 'disable-plugin',
        name: 'Disable Plugin',
        version: '1.0.0',
        author: 'Test',
        type: 'tool' as const,
        entry: 'index.js',
      };

      await manager.registerPlugin(manifest, async () => ({}));
      await manager.enablePlugin('disable-plugin');
      await manager.disablePlugin('disable-plugin');

      const plugins = manager.listPlugins();
      const plugin = plugins.find((p) => p.id === 'disable-plugin');
      expect(plugin?.enabled).toBe(false);
    });

    it('should unregister plugin', async () => {
      const manifest = {
        id: 'unregister-plugin',
        name: 'Unregister Plugin',
        version: '1.0.0',
        author: 'Test',
        type: 'tool' as const,
        entry: 'index.js',
      };

      await manager.registerPlugin(manifest, async () => ({}));
      await manager.unregisterPlugin('unregister-plugin');

      const plugins = manager.listPlugins();
      expect(plugins.find((p) => p.id === 'unregister-plugin')).toBeUndefined();
    });
  });

  describe('hook execution', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should execute hook on enabled plugins', async () => {
      const hookHandler = vi.fn().mockResolvedValue({ modified: true });

      const manifest = {
        id: 'hook-plugin',
        name: 'Hook Plugin',
        version: '1.0.0',
        author: 'Test',
        type: 'tool' as const,
        entry: 'index.js',
        hooks: ['before-generate'],
      };

      await manager.registerPlugin(manifest, hookHandler);
      await manager.enablePlugin('hook-plugin');

      const results = await manager.executeHook('before-generate', { data: 'test' });

      expect(hookHandler).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should not execute hook on disabled plugins', async () => {
      const hookHandler = vi.fn().mockResolvedValue({ modified: true });

      const manifest = {
        id: 'disabled-hook-plugin',
        name: 'Disabled Hook Plugin',
        version: '1.0.0',
        author: 'Test',
        type: 'tool' as const,
        entry: 'index.js',
        hooks: ['before-generate'],
      };

      await manager.registerPlugin(manifest, hookHandler);
      // Plugin not enabled

      const results = await manager.executeHook('before-generate', { data: 'test' });

      expect(hookHandler).not.toHaveBeenCalled();
      expect(results.length).toBe(0);
    });

    it('should handle hook errors gracefully', async () => {
      const failingHandler = vi.fn().mockRejectedValue(new Error('Hook failed'));

      const manifest = {
        id: 'failing-plugin',
        name: 'Failing Plugin',
        version: '1.0.0',
        author: 'Test',
        type: 'tool' as const,
        entry: 'index.js',
        hooks: ['before-generate'],
      };

      await manager.registerPlugin(manifest, failingHandler);
      await manager.enablePlugin('failing-plugin');

      // Should not throw
      const results = await manager.executeHook('before-generate', {});
      expect(results.some((r) => r.error)).toBe(true);
    });

    it('should execute hooks in priority order', async () => {
      const order: number[] = [];

      const manifest1 = {
        id: 'priority-plugin-1',
        name: 'Priority Plugin 1',
        version: '1.0.0',
        author: 'Test',
        type: 'tool' as const,
        entry: 'index.js',
        hooks: ['before-generate'],
        priority: 10,
      };

      const manifest2 = {
        id: 'priority-plugin-2',
        name: 'Priority Plugin 2',
        version: '1.0.0',
        author: 'Test',
        type: 'tool' as const,
        entry: 'index.js',
        hooks: ['before-generate'],
        priority: 1,
      };

      await manager.registerPlugin(manifest1, async () => {
        order.push(1);
        return {};
      });
      await manager.registerPlugin(manifest2, async () => {
        order.push(2);
        return {};
      });

      await manager.enablePlugin('priority-plugin-1');
      await manager.enablePlugin('priority-plugin-2');

      await manager.executeHook('before-generate', {});

      // Higher priority (lower number) should execute first
      expect(order[0]).toBe(2);
      expect(order[1]).toBe(1);
    });
  });

  describe('plugin information', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should list all plugins', async () => {
      const manifest1 = {
        id: 'list-plugin-1',
        name: 'List Plugin 1',
        version: '1.0.0',
        author: 'Test',
        type: 'tool' as const,
        entry: 'index.js',
      };

      const manifest2 = {
        id: 'list-plugin-2',
        name: 'List Plugin 2',
        version: '2.0.0',
        author: 'Test',
        type: 'provider' as const,
        entry: 'index.js',
      };

      await manager.registerPlugin(manifest1, async () => ({}));
      await manager.registerPlugin(manifest2, async () => ({}));

      const plugins = manager.listPlugins();
      expect(plugins.length).toBeGreaterThanOrEqual(2);
    });

    it('should get plugin by ID', async () => {
      const manifest = {
        id: 'get-plugin',
        name: 'Get Plugin',
        version: '1.0.0',
        author: 'Test',
        type: 'tool' as const,
        entry: 'index.js',
        description: 'A test plugin',
      };

      await manager.registerPlugin(manifest, async () => ({}));

      const plugin = manager.getPlugin('get-plugin');
      expect(plugin).toBeDefined();
      expect(plugin?.manifest.name).toBe('Get Plugin');
      expect(plugin?.manifest.description).toBe('A test plugin');
    });

    it('should return undefined for non-existent plugin', () => {
      const plugin = manager.getPlugin('non-existent');
      expect(plugin).toBeUndefined();
    });
  });

  describe('plugin types', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should accept all valid plugin types', async () => {
      const types = [
        'provider',
        'data-source',
        'processor',
        'tool',
        'integration',
        'theme',
        'analytics',
      ] as const;

      for (const type of types) {
        const manifest = {
          id: `${type}-type-plugin`,
          name: `${type} Type Plugin`,
          version: '1.0.0',
          author: 'Test',
          type,
          entry: 'index.js',
        };

        await manager.registerPlugin(manifest, async () => ({}));
      }

      const plugins = manager.listPlugins();
      expect(plugins.length).toBeGreaterThanOrEqual(types.length);
    });
  });

  describe('configuration', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should get plugin config', async () => {
      const manifest = {
        id: 'config-plugin',
        name: 'Config Plugin',
        version: '1.0.0',
        author: 'Test',
        type: 'tool' as const,
        entry: 'index.js',
        defaultConfig: { setting1: 'value1', setting2: 42 },
      };

      await manager.registerPlugin(manifest, async () => ({}));

      const config = manager.getPluginConfig('config-plugin');
      expect(config).toEqual({ setting1: 'value1', setting2: 42 });
    });

    it('should update plugin config', async () => {
      const manifest = {
        id: 'update-config-plugin',
        name: 'Update Config Plugin',
        version: '1.0.0',
        author: 'Test',
        type: 'tool' as const,
        entry: 'index.js',
        defaultConfig: { setting: 'original' },
      };

      await manager.registerPlugin(manifest, async () => ({}));
      await manager.updatePluginConfig('update-config-plugin', { setting: 'updated' });

      const config = manager.getPluginConfig('update-config-plugin');
      expect(config).toEqual({ setting: 'updated' });
    });
  });
});
