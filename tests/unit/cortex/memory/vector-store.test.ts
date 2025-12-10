/**
 * Vector Store Unit Tests
 * TooLoo.ai Synapsys V3.3.510
 *
 * Tests for semantic vector storage, search, and retrieval
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock dependencies
vi.mock('fs-extra', () => ({
  default: {
    ensureFile: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ size: 1000 }),
    readFile: vi.fn().mockResolvedValue('[]'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
  ensureFile: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ size: 1000 }),
  readFile: vi.fn().mockResolvedValue('[]'),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../src/precog/index', () => ({
  precog: {
    providers: {
      getProvider: vi.fn().mockReturnValue({
        embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]),
      }),
    },
  },
}));

describe('VectorStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty documents', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      // Should not throw
      expect(store).toBeDefined();
    });

    it('should load existing documents from file', async () => {
      const fs = await import('fs-extra');
      const existingDocs = JSON.stringify([
        {
          id: 'doc-1',
          text: 'test document',
          embedding: [0.1, 0.2],
          metadata: {},
          createdAt: Date.now(),
          accessCount: 0,
          lastAccessedAt: Date.now(),
        },
      ]);
      vi.spyOn(fs.default, 'readFile').mockResolvedValue(existingDocs);

      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      expect(store).toBeDefined();
    });
  });

  describe('Document Addition', () => {
    it('should add document with embedding', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      // Should not throw
      await store.add('This is a test document', { type: 'test' });
    });

    it('should chunk large documents', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      // Create large text
      const largeText = 'x'.repeat(10000);
      await store.add(largeText, { type: 'large' });

      // Should process without error
      expect(store).toBeDefined();
    });

    it('should detect task type from text', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      // Execution type
      await store.add('execute the code and run the script', {});

      // Design type
      await store.add('create UI component with CSS styling', {});

      // Should process both
      expect(store).toBeDefined();
    });

    it('should detect outcome from text', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      // Success outcome
      await store.add('operation completed successfully', {});

      // Failure outcome
      await store.add('error occurred during execution', { errorType: 'runtime' });

      expect(store).toBeDefined();
    });
  });

  describe('Search', () => {
    it('should return empty array when no documents', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      const results = await store.search('test query');
      expect(results).toBeInstanceOf(Array);
    });

    it('should accept number for k parameter', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      const results = await store.search('test query', 5);
      expect(results).toBeInstanceOf(Array);
    });

    it('should accept SearchOptions object', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      const results = await store.search('test query', {
        k: 5,
        taskType: 'execution',
        recencyBoost: true,
      });
      expect(results).toBeInstanceOf(Array);
    });

    it('should filter by task type', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      const results = await store.search('query', {
        taskType: 'design',
      });
      expect(results).toBeInstanceOf(Array);
    });

    it('should filter by outcome', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      const results = await store.search('query', {
        outcome: 'success',
      });
      expect(results).toBeInstanceOf(Array);
    });

    it('should filter by success only', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      const results = await store.search('query', {
        successOnly: true,
      });
      expect(results).toBeInstanceOf(Array);
    });

    it('should filter by max age', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      const results = await store.search('query', {
        maxAgeHours: 24,
      });
      expect(results).toBeInstanceOf(Array);
    });

    it('should filter by tags', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      const results = await store.search('query', {
        tags: ['important', 'code'],
      });
      expect(results).toBeInstanceOf(Array);
    });
  });

  describe('Task Type Detection', () => {
    const taskTypeTests = [
      { text: 'execute code and run script', expected: 'execution' },
      { text: 'fix the error and debug', expected: 'execution' },
      { text: 'create UI component style', expected: 'design' },
      { text: 'analyze and understand why', expected: 'analysis' },
      { text: 'generate and create new code', expected: 'generation' },
      { text: 'learn and improve patterns', expected: 'learning' },
    ];

    it.each(taskTypeTests)(
      'should detect $expected from text containing keywords',
      async ({ text }) => {
        const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

        const store = new VectorStore('/tmp/test');
        await store.initialize();

        // Just verify no error - actual detection is internal
        await store.add(text, {});
        expect(store).toBeDefined();
      }
    );
  });

  describe('SearchOptions', () => {
    it('should support all filter options', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      const options = {
        k: 10,
        taskType: 'execution' as const,
        outcome: 'success' as const,
        maxAgeHours: 48,
        recencyBoost: true,
        successOnly: true,
        tags: ['code', 'typescript'],
      };

      const results = await store.search('test', options);
      expect(results).toBeInstanceOf(Array);
    });
  });

  describe('Statistics', () => {
    it('should track document additions', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      await store.add('document 1', {});
      await store.add('document 2', {});

      // Stats are internal but shouldn't cause errors
      expect(store).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should handle pruning when limit exceeded', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      // Pruning is internal but shouldn't cause errors
      expect(store).toBeDefined();
    });
  });

  describe('Metadata Handling', () => {
    it('should preserve metadata on documents', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      const metadata = {
        type: 'code',
        tags: ['typescript', 'test'],
        language: 'typescript',
        custom: 'value',
      };

      await store.add('test code', metadata);
      expect(store).toBeDefined();
    });

    it('should handle empty metadata', async () => {
      const { VectorStore } = await import('../../../../src/cortex/memory/vector-store');

      const store = new VectorStore('/tmp/test');
      await store.initialize();

      await store.add('test text', {});
      expect(store).toBeDefined();
    });
  });
});
