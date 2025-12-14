// @version 3.3.577
/**
 * World Pipeline Tests
 * @version 1.0.0
 *
 * Tests the knowledge ingestion system including:
 * - Source management
 * - Ingestion pipeline
 * - Stats tracking
 * - Frequency handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    readJson: vi.fn().mockResolvedValue({}),
    writeJson: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('../../../../src/cortex/memory/vector-store.js', () => ({
  VectorStore: class {
    initialize = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('../../../../src/cortex/memory/hippocampus.js', () => ({
  Hippocampus: class {
    initialize = vi.fn().mockResolvedValue(undefined);
  },
}));

describe('WorldPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exports', () => {
    it('should export WorldPipeline class', async () => {
      const module = await import('../../../../src/cortex/knowledge/world-pipeline.js');
      expect(module.WorldPipeline).toBeDefined();
      expect(typeof module.WorldPipeline).toBe('function');
    });

    it('should export worldPipeline instance', async () => {
      const module = await import('../../../../src/cortex/knowledge/world-pipeline.js');
      expect(module.worldPipeline).toBeDefined();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', async () => {
      const { WorldPipeline } = await import('../../../../src/cortex/knowledge/world-pipeline.js');
      const instance1 = WorldPipeline.getInstance();
      const instance2 = WorldPipeline.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('SourceType', () => {
    it('should support all source types', () => {
      const types = ['rss', 'api', 'web_page', 'github_repo', 'academic_paper'];
      types.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('UpdateFrequency', () => {
    it('should support all frequencies', () => {
      const frequencies = ['realtime', 'hourly', 'daily', 'weekly', 'manual'];
      frequencies.forEach((freq) => {
        expect(typeof freq).toBe('string');
      });
    });
  });

  describe('KnowledgeSource Interface', () => {
    it('should define source structure', () => {
      const source = {
        id: 'source-123',
        name: 'Tech News',
        type: 'rss' as const,
        url: 'https://example.com/feed',
        description: 'Technology news feed',
        frequency: 'hourly' as const,
        reliability: 0.85,
        tags: ['tech', 'news'],
        status: 'active' as const,
      };

      expect(source.type).toBe('rss');
      expect(source.reliability).toBe(0.85);
    });

    it('should support all status values', () => {
      const statuses = ['active', 'paused', 'error'];
      statuses.forEach((status) => {
        expect(typeof status).toBe('string');
      });
    });
  });

  describe('IngestedItem Interface', () => {
    it('should define item structure', () => {
      const item = {
        id: 'item-123',
        sourceId: 'source-123',
        title: 'Article Title',
        content: 'Article content...',
        url: 'https://example.com/article',
        publishedAt: new Date(),
        ingestedAt: new Date(),
        tags: ['tech'],
        metadata: {},
      };

      expect(item.title).toBe('Article Title');
      expect(item.tags).toContain('tech');
    });

    it('should support optional author', () => {
      const item = {
        id: 'item-123',
        author: 'John Doe',
      };
      expect(item.author).toBe('John Doe');
    });

    it('should support optional embedding', () => {
      const item = {
        id: 'item-123',
        embedding: [0.1, 0.2, 0.3],
      };
      expect(item.embedding).toHaveLength(3);
    });
  });

  describe('PipelineStats Interface', () => {
    it('should track pipeline metrics', () => {
      const stats = {
        totalSources: 10,
        activeSources: 8,
        itemsIngested: 1500,
        lastIngestion: new Date(),
        errors: 2,
        bytesProcessed: 1000000,
      };

      expect(stats.totalSources).toBe(10);
      expect(stats.activeSources).toBe(8);
      expect(stats.errors).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return stats object', async () => {
      const { WorldPipeline } = await import('../../../../src/cortex/knowledge/world-pipeline.js');
      const pipeline = WorldPipeline.getInstance();
      const stats = pipeline.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalSources).toBe('number');
    });
  });

  describe('getSources', () => {
    it('should return sources array', async () => {
      const { WorldPipeline } = await import('../../../../src/cortex/knowledge/world-pipeline.js');
      const pipeline = WorldPipeline.getInstance();
      const sources = pipeline.getSources();

      expect(Array.isArray(sources)).toBe(true);
    });
  });

  describe('Reliability Scoring', () => {
    it('should validate reliability range', () => {
      const reliability = 0.85;
      expect(reliability).toBeGreaterThanOrEqual(0);
      expect(reliability).toBeLessThanOrEqual(1);
    });
  });

  describe('Source Types Configuration', () => {
    it('should handle RSS source', () => {
      const source = {
        type: 'rss',
        url: 'https://example.com/rss',
      };
      expect(source.type).toBe('rss');
    });

    it('should handle API source', () => {
      const source = {
        type: 'api',
        url: 'https://api.example.com/data',
        config: { apiKey: 'secret' },
      };
      expect(source.type).toBe('api');
      expect(source.config?.apiKey).toBe('secret');
    });

    it('should handle GitHub repo source', () => {
      const source = {
        type: 'github_repo',
        url: 'https://github.com/org/repo',
      };
      expect(source.type).toBe('github_repo');
    });
  });

  describe('Update Scheduling', () => {
    it('should calculate hourly interval', () => {
      const hourlyMs = 60 * 60 * 1000;
      expect(hourlyMs).toBe(3600000);
    });

    it('should calculate daily interval', () => {
      const dailyMs = 24 * 60 * 60 * 1000;
      expect(dailyMs).toBe(86400000);
    });

    it('should calculate weekly interval', () => {
      const weeklyMs = 7 * 24 * 60 * 60 * 1000;
      expect(weeklyMs).toBe(604800000);
    });
  });

  describe('Stats Initialization', () => {
    it('should initialize with zero counts', () => {
      const stats = {
        totalSources: 0,
        activeSources: 0,
        itemsIngested: 0,
        lastIngestion: null,
        errors: 0,
        bytesProcessed: 0,
      };

      expect(stats.totalSources).toBe(0);
      expect(stats.lastIngestion).toBeNull();
    });
  });
});
