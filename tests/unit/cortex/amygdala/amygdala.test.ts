// @version 3.3.573
/**
 * Amygdala Tests
 *
 * Tests for the stress monitoring and reflexive response system
 * that protects the system from overload (cortex/amygdala)
 *
 * @version 3.3.510
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock v8 before imports
vi.mock('v8', () => ({
  getHeapStatistics: vi.fn().mockReturnValue({
    used_heap_size: 50_000_000,      // 50MB
    heap_size_limit: 100_000_000,    // 100MB
    total_heap_size: 60_000_000,
    total_available_size: 90_000_000,
  }),
}));

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    readdirSync: vi.fn().mockReturnValue([]),
  },
  existsSync: vi.fn().mockReturnValue(false),
  readdirSync: vi.fn().mockReturnValue([]),
}));

// Mock fs-manager
vi.mock('../../../../src/core/fs-manager.js', () => ({
  smartFS: {
    cleanRecovery: vi.fn().mockResolvedValue(undefined),
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue(null),
  },
}));

// Mock event-bus
const mockBus = {
  publish: vi.fn(),
  on: vi.fn(),
  addInterceptor: vi.fn(),
};

vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: mockBus,
  SynapsysEvent: {},
}));

describe('Amygdala', () => {
  // We'll need to import Amygdala fresh for each test to reset singleton
  let Amygdala: any;
  let AmygdalaState: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Clear module cache to get fresh imports
    vi.resetModules();
    
    // Re-import after mocks are set up
    const mod = await import('../../../../src/cortex/amygdala/index.js');
    Amygdala = mod.Amygdala;
    AmygdalaState = mod.AmygdalaState;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('AmygdalaState Enum', () => {
    it('should have CALM state', () => {
      expect(AmygdalaState.CALM).toBe('CALM');
    });

    it('should have ALERT state', () => {
      expect(AmygdalaState.ALERT).toBe('ALERT');
    });

    it('should have PANIC state', () => {
      expect(AmygdalaState.PANIC).toBe('PANIC');
    });

    it('should have CRITICAL state', () => {
      expect(AmygdalaState.CRITICAL).toBe('CRITICAL');
    });

    it('should have exactly 4 states', () => {
      const states = Object.keys(AmygdalaState);
      expect(states.length).toBe(4);
    });
  });

  describe('Amygdala Class', () => {
    it('should create instance', () => {
      const instance = new Amygdala();
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(Amygdala);
    });

    it('should start in CALM state', () => {
      const instance = new Amygdala();
      expect(instance.currentState).toBe(AmygdalaState.CALM);
    });

    it('should have currentState getter', () => {
      const instance = new Amygdala();
      expect(typeof instance.currentState).toBe('string');
    });

    it('should have spikeCortisol method', () => {
      const instance = new Amygdala();
      expect(typeof instance.spikeCortisol).toBe('function');
    });
  });

  describe('Cortisol Spikes', () => {
    it('should spike cortisol and change state', () => {
      const instance = new Amygdala();
      expect(instance.currentState).toBe(AmygdalaState.CALM);
      
      // Spike to ALERT level (> 0.4)
      instance.spikeCortisol(0.5);
      expect(instance.currentState).toBe(AmygdalaState.ALERT);
    });

    it('should spike to PANIC state', () => {
      const instance = new Amygdala();
      instance.spikeCortisol(0.75);
      expect(instance.currentState).toBe(AmygdalaState.PANIC);
    });

    it('should spike to CRITICAL state', () => {
      const instance = new Amygdala();
      instance.spikeCortisol(0.95);
      expect(instance.currentState).toBe(AmygdalaState.CRITICAL);
    });

    it('should cap cortisol at 1.0', () => {
      const instance = new Amygdala();
      instance.spikeCortisol(2.0);
      // Should be CRITICAL but not above 1.0
      expect(instance.currentState).toBe(AmygdalaState.CRITICAL);
    });

    it('should handle multiple spikes', () => {
      const instance = new Amygdala();
      instance.spikeCortisol(0.3);
      expect(instance.currentState).toBe(AmygdalaState.CALM);
      
      instance.spikeCortisol(0.2);
      expect(instance.currentState).toBe(AmygdalaState.ALERT);
    });
  });

  describe('State Transitions', () => {
    it('should transition CALM -> ALERT at cortisol > 0.4', () => {
      const instance = new Amygdala();
      instance.spikeCortisol(0.41);
      expect(instance.currentState).toBe(AmygdalaState.ALERT);
    });

    it('should transition ALERT -> PANIC at cortisol > 0.7', () => {
      const instance = new Amygdala();
      instance.spikeCortisol(0.71);
      expect(instance.currentState).toBe(AmygdalaState.PANIC);
    });

    it('should transition PANIC -> CRITICAL at cortisol > 0.9', () => {
      const instance = new Amygdala();
      instance.spikeCortisol(0.91);
      expect(instance.currentState).toBe(AmygdalaState.CRITICAL);
    });

    it('should publish state change events', () => {
      mockBus.publish.mockClear();
      const instance = new Amygdala();
      instance.spikeCortisol(0.5);
      
      expect(mockBus.publish).toHaveBeenCalledWith(
        'system',
        'amygdala:state_change',
        expect.objectContaining({
          from: AmygdalaState.CALM,
          to: AmygdalaState.ALERT,
        })
      );
    });
  });

  describe('Reflexes and Interceptors', () => {
    it('should set up event interceptor', () => {
      mockBus.addInterceptor.mockClear();
      const instance = new Amygdala();
      expect(mockBus.addInterceptor).toHaveBeenCalled();
    });

    it('should pass interceptor function to bus', () => {
      mockBus.addInterceptor.mockClear();
      const instance = new Amygdala();
      const interceptorCall = mockBus.addInterceptor.mock.calls[0];
      expect(typeof interceptorCall[0]).toBe('function');
    });
  });

  describe('Emergency Protocols', () => {
    it('should trigger emergency stop at CRITICAL', () => {
      mockBus.publish.mockClear();
      const instance = new Amygdala();
      instance.spikeCortisol(0.95);
      
      // Should publish emergency stop event
      expect(mockBus.publish).toHaveBeenCalledWith(
        'system',
        'system:emergency_stop',
        expect.objectContaining({
          reason: 'Cortisol Overload',
        })
      );
    });
  });

  describe('Monitoring', () => {
    it('should start monitoring on construction', () => {
      // Amygdala constructor calls startMonitoring
      const instance = new Amygdala();
      // The interval is set, we just verify instance exists
      expect(instance.currentState).toBeDefined();
    });
  });
});

describe('Amygdala Export', () => {
  it('should export amygdala singleton', async () => {
    vi.resetModules();
    const mod = await import('../../../../src/cortex/amygdala/index.js');
    expect(mod.amygdala).toBeDefined();
    expect(mod.amygdala).toBeInstanceOf(mod.Amygdala);
  });

  it('should export AmygdalaState enum', async () => {
    vi.resetModules();
    const mod = await import('../../../../src/cortex/amygdala/index.js');
    expect(mod.AmygdalaState).toBeDefined();
    expect(mod.AmygdalaState.CALM).toBe('CALM');
  });

  it('should export Amygdala class', async () => {
    vi.resetModules();
    const mod = await import('../../../../src/cortex/amygdala/index.js');
    expect(mod.Amygdala).toBeDefined();
    expect(typeof mod.Amygdala).toBe('function');
  });
});

describe('Amygdala State Thresholds', () => {
  let instance: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../../../src/cortex/amygdala/index.js');
    instance = new mod.Amygdala();
  });

  it('should be CALM at cortisol 0', () => {
    expect(instance.currentState).toBe('CALM');
  });

  it('should be CALM at cortisol 0.39', () => {
    instance.spikeCortisol(0.39);
    expect(instance.currentState).toBe('CALM');
  });

  it('should be ALERT at cortisol 0.4', () => {
    instance.spikeCortisol(0.41);
    expect(instance.currentState).toBe('ALERT');
  });

  it('should be ALERT at cortisol 0.69', () => {
    instance.spikeCortisol(0.69);
    expect(instance.currentState).toBe('ALERT');
  });

  it('should be PANIC at cortisol 0.71', () => {
    instance.spikeCortisol(0.71);
    expect(instance.currentState).toBe('PANIC');
  });

  it('should be PANIC at cortisol 0.89', () => {
    instance.spikeCortisol(0.89);
    expect(instance.currentState).toBe('PANIC');
  });

  it('should be CRITICAL at cortisol 0.91', () => {
    instance.spikeCortisol(0.91);
    expect(instance.currentState).toBe('CRITICAL');
  });

  it('should be CRITICAL at cortisol 1.0', () => {
    instance.spikeCortisol(1.0);
    expect(instance.currentState).toBe('CRITICAL');
  });
});

describe('Amygdala Memory Stress', () => {
  it('should handle high memory usage', async () => {
    vi.resetModules();
    
    // Mock high memory usage
    vi.mocked(await import('v8')).getHeapStatistics.mockReturnValue({
      used_heap_size: 95_000_000,      // 95MB
      heap_size_limit: 100_000_000,    // 100MB - 95% usage
      total_heap_size: 98_000_000,
      total_available_size: 5_000_000,
    } as any);

    const mod = await import('../../../../src/cortex/amygdala/index.js');
    const instance = new mod.Amygdala();
    // Instance should be created even under high memory
    expect(instance).toBeDefined();
  });
});
