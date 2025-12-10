/**
 * Orchestrator Unit Tests
 * TooLoo.ai Synapsys V3.3.510
 *
 * Tests for main cortex orchestrator
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock all dependencies
vi.mock('../../../src/core/event-bus.js', () => ({
  bus: {
    on: vi.fn(),
    publish: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock('../../../src/cortex/memory/vector-store.js', () => ({
  VectorStore: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../../src/cortex/memory/knowledge-graph-engine.js', () => ({
  default: vi.fn().mockImplementation(() => ({
    recordTaskPerformance: vi.fn(),
    getProviderRecommendations: vi.fn().mockReturnValue([]),
  })),
}));

vi.mock('../../../src/precog/providers/llm-provider.js', () => ({
  default: vi.fn().mockImplementation(() => ({
    generateSmartLLM: vi.fn().mockResolvedValue({ content: 'Test response' }),
  })),
}));

vi.mock('../../../src/cortex/context-manager.js', () => ({
  ContextManager: vi.fn().mockImplementation(() => ({
    getContext: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('../../../src/cortex/exploration/curiosity-engine.js', () => ({
  CuriosityEngine: vi.fn().mockImplementation(() => ({
    calculateCuriosity: vi.fn().mockResolvedValue(null),
  })),
}));

describe('Cortex Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Exports', () => {
    it('should export Orchestrator class', async () => {
      const module = await import('../../../src/cortex/orchestrator');
      expect(module.Orchestrator).toBeDefined();
    });
  });

  describe('Initialization', () => {
    it('should create instance', async () => {
      const { Orchestrator } = await import('../../../src/cortex/orchestrator');
      const orchestrator = new Orchestrator();
      expect(orchestrator).toBeDefined();
    });

    it('should have getVisionContext method', async () => {
      const { Orchestrator } = await import('../../../src/cortex/orchestrator');
      const orchestrator = new Orchestrator();
      expect(typeof orchestrator.getVisionContext).toBe('function');
    });
  });
});
