// @version 3.3.573
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hippocampus } from '../../../../src/cortex/memory/hippocampus';
import { bus } from '../../../../src/core/event-bus';
import * as fs from 'fs/promises';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('../../../../src/cortex/memory/vector-store', () => ({
  VectorStore: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
  }))
}));
vi.mock('../../../../src/core/fs-manager', () => ({
  smartFS: {
    writeSafe: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Hippocampus', () => {
  let hippocampus: Hippocampus;

  beforeEach(() => {
    vi.spyOn(bus, 'publish');
    hippocampus = new Hippocampus(bus, '/tmp/test-workspace');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize correctly', async () => {
    await hippocampus.initialize();
    expect(bus.publish).toHaveBeenCalledWith('cortex', 'system:component_ready', expect.objectContaining({
      component: 'hippocampus'
    }));
  });

  it('should record actions', async () => {
    await hippocampus.initialize();

    bus.emit('motor:execute', {
      source: 'cortex',
      type: 'motor:execute',
      payload: { command: 'ls' },
      timestamp: Date.now()
    });

    // Access private shortTermMemory to verify
    const stm = (hippocampus as any).shortTermMemory;
    expect(stm).toHaveLength(1);
    expect(stm[0].type).toBe('action');
    expect(stm[0].content).toEqual({ command: 'ls' });
  });

  it('should record observations', async () => {
    await hippocampus.initialize();

    bus.emit('motor:result', {
      source: 'cortex',
      type: 'motor:result',
      payload: { output: 'file.txt' },
      timestamp: Date.now()
    });

    const stm = (hippocampus as any).shortTermMemory;
    expect(stm).toHaveLength(1);
    expect(stm[0].type).toBe('observation');
  });
});
