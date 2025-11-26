import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registry, SystemModule } from '../../../src/core/module-registry';

describe('ModuleRegistry', () => {
  beforeEach(() => {
    // Clear registry (it's a singleton, so we need to clear the map if possible, but it's private)
    // We can cast to any to access private property
    (registry as any).modules.clear();
  });

  it('should register a module', () => {
    const module: SystemModule = {
      name: 'test-module',
      version: '1.0.0',
      status: 'booting',
    };

    const listener = vi.fn();
    registry.on('module:registered', listener);

    registry.register(module);

    expect(registry.get('test-module')).toEqual(module);
    expect(listener).toHaveBeenCalledWith(module);
  });

  it('should update module status', () => {
    const module: SystemModule = {
      name: 'test-module',
      version: '1.0.0',
      status: 'booting',
    };
    registry.register(module);

    const listener = vi.fn();
    registry.on('module:status_change', listener);

    registry.updateStatus('test-module', 'ready', { extra: 'data' });

    const updated = registry.get('test-module');
    expect(updated?.status).toBe('ready');
    expect(updated?.meta).toEqual({ extra: 'data' });
    expect(listener).toHaveBeenCalledWith({ name: 'test-module', status: 'ready', meta: { extra: 'data' } });
  });

  it('should get all modules', () => {
    registry.register({ name: 'mod1', version: '1.0', status: 'ready' });
    registry.register({ name: 'mod2', version: '1.0', status: 'ready' });

    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all[0].uptime).toBeDefined();
  });
});
