import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Oracle } from '../../../src/precog/oracle';
import { bus } from '../../../src/core/event-bus';

// Mock smartFS
vi.mock('../../../src/core/fs-manager', () => ({
  smartFS: {
    getGoldenPlate: vi.fn().mockResolvedValue({}),
  }
}));

describe('Oracle', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let oracle: Oracle;

  beforeEach(() => {
    vi.spyOn(bus, 'publish');
    oracle = new Oracle();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update shadow on file change', async () => {
    // Simulate file change event
    bus.emit('sensory:file:change', {
      source: 'cortex',
      type: 'sensory:file:change',
      payload: {
        type: 'change',
        path: 'src/test.ts',
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });

    // We can't easily inspect private contextShadow, but we can check if it triggered a prediction
    // The prediction logic calls bus.publish('cortex', 'cortex:metaprogram_request', ...)
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(bus.publish).toHaveBeenCalledWith('cortex', 'cortex:metaprogram_request', expect.objectContaining({
      task: 'generate_code',
      context: expect.objectContaining({
        prompt: expect.stringContaining('Generate a Vitest suite for src/test.ts')
      })
    }));
  });

  it('should not predict tests for non-ts files', async () => {
    bus.emit('sensory:file:change', {
      source: 'cortex',
      type: 'sensory:file:change',
      payload: {
        type: 'change',
        path: 'README.md',
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(bus.publish).not.toHaveBeenCalledWith('cortex', 'cortex:metaprogram_request', expect.anything());
  });
});
