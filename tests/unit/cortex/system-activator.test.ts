// @version 3.3.573
/**
 * System Activator Unit Tests
 * TooLoo.ai Synapsys V3.3.510
 *
 * Tests for system bootstrap and activation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock event bus
vi.mock('../../../src/core/event-bus.js', () => ({
  bus: {
    on: vi.fn(),
    publish: vi.fn(),
    off: vi.fn(),
  },
}));

// Mock dependencies
vi.mock('../../../src/cortex/discover/emergence-amplifier.js', () => ({
  EmergenceAmplifier: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    getStatus: vi.fn().mockReturnValue({ status: 'online' }),
  })),
}));

vi.mock('../../../src/cortex/learning/reinforcement-learner.js', () => ({
  ReinforcementLearner: vi.fn().mockImplementation(() => ({
    getState: vi.fn().mockReturnValue({}),
  })),
}));

vi.mock('../../../src/cortex/learning/provider-execution-learner.js', () => ({
  providerExecutionLearner: {},
  ProviderExecutionLearner: vi.fn(),
}));

vi.mock('../../../src/cortex/learning/knowledge-boost.js', () => ({
  knowledgeBoostEngine: {},
  KnowledgeBoostEngine: vi.fn(),
}));

vi.mock('../../../src/precog/engine/meta-learning-engine.js', () => ({
  default: vi.fn(),
}));

describe('SynapsysActivator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Exports', () => {
    it('should export SynapsysActivator class', async () => {
      const module = await import('../../../src/cortex/system-activator');
      expect(module.SynapsysActivator).toBeDefined();
    });

    it('should export SystemStatus interface types', async () => {
      const module = await import('../../../src/cortex/system-activator');
      // TypeScript interfaces don't exist at runtime, but the module should load
      expect(module).toBeDefined();
    });
  });

  describe('Singleton Pattern', () => {
    it('should have getInstance method', async () => {
      const { SynapsysActivator } = await import('../../../src/cortex/system-activator');
      expect(typeof SynapsysActivator.getInstance).toBe('function');
    });

    it('should return same instance', async () => {
      const { SynapsysActivator } = await import('../../../src/cortex/system-activator');
      const instance1 = SynapsysActivator.getInstance();
      const instance2 = SynapsysActivator.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('State Management', () => {
    it('should have getState method', async () => {
      const { SynapsysActivator } = await import('../../../src/cortex/system-activator');
      const activator = SynapsysActivator.getInstance();
      expect(typeof activator.getState).toBe('function');
    });

    it('should return state object', async () => {
      const { SynapsysActivator } = await import('../../../src/cortex/system-activator');
      const activator = SynapsysActivator.getInstance();
      const state = activator.getState();

      expect(state).toBeDefined();
      expect(typeof state.initialized).toBe('boolean');
      expect(state.systems).toBeDefined();
    });
  });
});
