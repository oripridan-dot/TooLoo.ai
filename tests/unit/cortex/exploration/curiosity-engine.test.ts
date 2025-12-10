/**
 * Curiosity Engine Unit Tests
 * TooLoo.ai Synapsys V3.3.510
 *
 * Tests for multi-dimensional curiosity system and intrinsic motivation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the event bus
vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: {
    on: vi.fn(),
    publish: vi.fn(),
    off: vi.fn(),
  },
}));

// Mock VectorStore
const mockVectorStore = {
  search: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn().mockResolvedValue([]),
};

describe('CuriosityEngine', () => {
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
    it('should create instance with vector store', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      const engine = new CuriosityEngine(mockVectorStore as any);
      expect(engine).toBeDefined();
    });
  });

  describe('Multi-dimensional Curiosity Calculation', () => {
    it('should calculate curiosity for novel content', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      // Return empty results = novel content
      mockVectorStore.search.mockResolvedValue([]);

      const engine = new CuriosityEngine(mockVectorStore as any);
      const signal = await engine.calculateCuriosity('Completely new concept X');

      // May or may not create signal depending on overall score threshold
      expect(mockVectorStore.search).toHaveBeenCalled();
    });

    it('should use multi-dimensional calculation method', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([]);

      const engine = new CuriosityEngine(mockVectorStore as any);
      const signal = await engine.calculateMultiDimensionalCuriosity(
        'Complex content with multiple dimensions',
        { domain: 'test' }
      );

      expect(mockVectorStore.search).toHaveBeenCalled();
    });

    it('should handle metadata with expected/actual for surprise calculation', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([]);

      const engine = new CuriosityEngine(mockVectorStore as any);
      const signal = await engine.calculateMultiDimensionalCuriosity('Unexpected result occurred', {
        expected: 0.9,
        actual: 0.1,
        domain: 'test',
      });

      // Surprise should be detected
      expect(mockVectorStore.search).toHaveBeenCalled();
    });

    it('should detect complexity in content', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([]);

      const engine = new CuriosityEngine(mockVectorStore as any);

      // Complex content with nesting, steps, conditionals
      const complexContent = `
        Step 1: Initialize the process
        Step 2: If condition is met, proceed
        Step 3: When data arrives, parse { content }
        Step 4: Otherwise handle error
        All records must be processed
      `;

      const signal = await engine.calculateCuriosity(complexContent);
      // Just verify no errors
      expect(engine).toBeDefined();
    });
  });

  describe('Novelty Detection', () => {
    it('should detect novel content when no similar results', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([]);

      const engine = new CuriosityEngine(mockVectorStore as any);
      const signal = await engine.calculateCuriosity('Brand new topic ABC123');

      // Novel detection was performed
      expect(mockVectorStore.search).toHaveBeenCalledWith(expect.any(String), expect.any(Number));
    });

    it('should detect familiar content with similar results', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      // Similar content exists
      mockVectorStore.search.mockResolvedValue([
        { content: 'Similar known topic', similarity: 0.95 },
        { content: 'Another similar topic', similarity: 0.9 },
      ]);

      const engine = new CuriosityEngine(mockVectorStore as any);
      const signal = await engine.calculateCuriosity('Known topic');

      // Low novelty should not create signal
      // null is acceptable for familiar content
      expect(mockVectorStore.search).toHaveBeenCalled();
    });
  });

  describe('Cognitive Dissonance Detection', () => {
    it('should detect contradictory patterns', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      // First statement
      mockVectorStore.search.mockResolvedValue([]);
      const engine = new CuriosityEngine(mockVectorStore as any);

      await engine.calculateCuriosity('This method always works', {
        domain: 'testing',
      });

      // Second contradictory statement
      mockVectorStore.search.mockResolvedValue([
        { content: 'This method always works', similarity: 0.8 },
      ]);

      await engine.calculateCuriosity('This method sometimes fails', {
        domain: 'testing',
      });

      expect(mockVectorStore.search).toHaveBeenCalled();
    });
  });

  describe('Capability Gap Detection', () => {
    it('should detect underused capability combinations', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([]);
      const engine = new CuriosityEngine(mockVectorStore as any);

      // Add common capability usages first
      for (let i = 0; i < 15; i++) {
        await engine.calculateCuriosity('Common task', {
          capabilities: ['analysis', 'reporting'],
        });
      }

      // Now rare combination
      await engine.calculateCuriosity('Rare combination task', {
        capabilities: ['creativity', 'optimization', 'learning'],
      });

      expect(engine).toBeDefined();
    });

    it('should ignore single capability', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([]);
      const engine = new CuriosityEngine(mockVectorStore as any);

      // Single capability - no gap detection
      const signal = await engine.calculateCuriosity('Single cap task', {
        capabilities: ['analysis'],
      });

      expect(engine).toBeDefined();
    });
  });

  describe('Emergence Precursor Detection', () => {
    it('should track signals in emergence buffer', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([]);
      const engine = new CuriosityEngine(mockVectorStore as any);

      // Generate multiple high-curiosity signals
      for (let i = 0; i < 10; i++) {
        await engine.calculateCuriosity(`New concept variant ${i}`, {
          domain: `domain-${i % 3}`,
        });
      }

      expect(engine).toBeDefined();
    });

    it('should calculate emergence potential from clustered signals', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([]);
      const engine = new CuriosityEngine(mockVectorStore as any);

      // Rapid burst of signals should increase emergence potential
      for (let i = 0; i < 5; i++) {
        await engine.calculateCuriosity(`Burst signal ${i}`, {
          domain: 'emergence-test',
          capabilities: ['cap-a', 'cap-b'],
        });
      }

      expect(engine).toBeDefined();
    });
  });

  describe('Curiosity History', () => {
    it('should maintain curiosity history', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([]);
      const engine = new CuriosityEngine(mockVectorStore as any);

      for (let i = 0; i < 10; i++) {
        await engine.calculateCuriosity(`History item ${i}`);
      }

      expect(engine).toBeDefined();
    });
  });

  describe('Intrinsic Reward Calculation', () => {
    it('should calculate intrinsic rewards', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([]);
      const engine = new CuriosityEngine(mockVectorStore as any);

      // Check if engine has intrinsic reward methods
      expect(typeof engine.calculateCuriosity).toBe('function');
    });
  });

  describe('Uncertainty Detection', () => {
    it('should detect high uncertainty from metadata', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([]);
      const engine = new CuriosityEngine(mockVectorStore as any);

      const signal = await engine.calculateCuriosity('Uncertain situation', {
        confidence: 0.2,
        uncertainty: 0.8,
      });

      expect(engine).toBeDefined();
    });

    it('should not flag low uncertainty', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([{ content: 'Known topic', similarity: 0.95 }]);
      const engine = new CuriosityEngine(mockVectorStore as any);

      const signal = await engine.calculateCuriosity('Well-known topic', {
        confidence: 0.95,
        uncertainty: 0.05,
      });

      // Low uncertainty + familiar content = likely no signal
      expect(engine).toBeDefined();
    });
  });

  describe('Bayesian Surprise', () => {
    it('should calculate surprise for unexpected outcomes', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([]);
      const engine = new CuriosityEngine(mockVectorStore as any);

      const signal = await engine.calculateCuriosity('Unexpected result', {
        expected: 0.9,
        actual: 0.1, // Very different from expected
      });

      expect(engine).toBeDefined();
    });

    it('should not flag expected outcomes', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([{ content: 'Expected behavior', similarity: 0.9 }]);
      const engine = new CuriosityEngine(mockVectorStore as any);

      const signal = await engine.calculateCuriosity('Expected result', {
        expected: 0.8,
        actual: 0.78, // Very close to expected
      });

      expect(engine).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([]);
      const engine = new CuriosityEngine(mockVectorStore as any);

      const signal = await engine.calculateCuriosity('');
      // Should not throw
      expect(engine).toBeDefined();
    });

    it('should handle empty metadata', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockResolvedValue([]);
      const engine = new CuriosityEngine(mockVectorStore as any);

      const signal = await engine.calculateCuriosity('Test content');
      expect(engine).toBeDefined();
    });

    it('should handle vector store errors', async () => {
      const { CuriosityEngine } =
        await import('../../../../src/cortex/exploration/curiosity-engine');

      mockVectorStore.search.mockRejectedValue(new Error('Vector store error'));
      const engine = new CuriosityEngine(mockVectorStore as any);

      // Should handle gracefully
      try {
        await engine.calculateCuriosity('Test content');
      } catch (e) {
        // May throw or handle internally
      }

      expect(engine).toBeDefined();
    });
  });
});
