/**
 * @file memory.test.ts
 * @description Tests for memory module types and structures
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';

// ============= Memory Entry Types =============

describe('Memory Entry Types', () => {
  type MemoryType = 'action' | 'observation' | 'thought' | 'fact' | 'decision';

  interface MemoryEntry {
    id: string;
    timestamp: number;
    type: MemoryType;
    content: unknown;
    tags: string[];
    transactionId?: string;
    affectedFiles?: string[];
  }

  describe('MemoryType enum', () => {
    it('should support action type', () => {
      const t: MemoryType = 'action';
      expect(t).toBe('action');
    });

    it('should support observation type', () => {
      const t: MemoryType = 'observation';
      expect(t).toBe('observation');
    });

    it('should support thought type', () => {
      const t: MemoryType = 'thought';
      expect(t).toBe('thought');
    });

    it('should support fact type', () => {
      const t: MemoryType = 'fact';
      expect(t).toBe('fact');
    });

    it('should support decision type', () => {
      const t: MemoryType = 'decision';
      expect(t).toBe('decision');
    });
  });

  describe('MemoryEntry interface', () => {
    it('should create action memory', () => {
      const entry: MemoryEntry = {
        id: 'mem-001',
        timestamp: Date.now(),
        type: 'action',
        content: { command: 'npm install', exitCode: 0 },
        tags: ['motor', 'exec'],
      };
      expect(entry.type).toBe('action');
      expect(entry.tags).toContain('motor');
    });

    it('should create observation memory', () => {
      const entry: MemoryEntry = {
        id: 'mem-002',
        timestamp: Date.now(),
        type: 'observation',
        content: { file: 'src/main.ts', changeType: 'modified' },
        tags: ['sensory', 'fs'],
      };
      expect(entry.type).toBe('observation');
    });

    it('should create thought memory', () => {
      const entry: MemoryEntry = {
        id: 'mem-003',
        timestamp: Date.now(),
        type: 'thought',
        content: { analysis: 'Code needs refactoring' },
        tags: ['explicit', 'analysis'],
      };
      expect(entry.type).toBe('thought');
    });

    it('should create memory with transaction', () => {
      const entry: MemoryEntry = {
        id: 'mem-004',
        timestamp: Date.now(),
        type: 'action',
        content: { operation: 'refactor' },
        tags: ['motor'],
        transactionId: 'tx-001',
        affectedFiles: ['src/a.ts', 'src/b.ts'],
      };
      expect(entry.transactionId).toBe('tx-001');
      expect(entry.affectedFiles).toHaveLength(2);
    });
  });
});

// ============= Memory Limits =============

describe('Memory Limits', () => {
  const MAX_EPISODIC_ENTRIES = 5000;
  const PRUNE_TARGET = 3000;
  const MAX_FILE_SIZE_MB = 100;
  const STM_LIMIT = 100;

  it('should define episodic entry limit', () => {
    expect(MAX_EPISODIC_ENTRIES).toBe(5000);
  });

  it('should define prune target', () => {
    expect(PRUNE_TARGET).toBe(3000);
    expect(PRUNE_TARGET).toBeLessThan(MAX_EPISODIC_ENTRIES);
  });

  it('should define max file size', () => {
    expect(MAX_FILE_SIZE_MB).toBe(100);
  });

  it('should define short-term memory limit', () => {
    expect(STM_LIMIT).toBe(100);
  });

  it('should need pruning when at limit', () => {
    const currentEntries = 5500;
    const needsPruning = currentEntries >= MAX_EPISODIC_ENTRIES;
    expect(needsPruning).toBe(true);
  });

  it('should calculate entries to prune', () => {
    const currentEntries = 5500;
    const entriesToPrune = currentEntries - PRUNE_TARGET;
    expect(entriesToPrune).toBe(2500);
  });
});

// ============= Vector Store Types =============

describe('Vector Store Types', () => {
  interface VectorEntry {
    id: string;
    content: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
  }

  interface SearchResult {
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, unknown>;
  }

  describe('VectorEntry interface', () => {
    it('should create vector entry', () => {
      const entry: VectorEntry = {
        id: 'vec-001',
        content: 'The quick brown fox',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      };
      expect(entry.embedding).toHaveLength(5);
    });

    it('should create entry with metadata', () => {
      const entry: VectorEntry = {
        id: 'vec-002',
        content: 'API documentation',
        embedding: [0.5, 0.4, 0.3, 0.2, 0.1],
        metadata: { source: 'docs', category: 'api' },
      };
      expect(entry.metadata?.source).toBe('docs');
    });
  });

  describe('SearchResult interface', () => {
    it('should create search result', () => {
      const result: SearchResult = {
        id: 'vec-001',
        content: 'Matching content',
        score: 0.95,
      };
      expect(result.score).toBe(0.95);
    });

    it('should rank results by score', () => {
      const results: SearchResult[] = [
        { id: '1', content: 'A', score: 0.7 },
        { id: '2', content: 'B', score: 0.95 },
        { id: '3', content: 'C', score: 0.85 },
      ];
      const sorted = results.sort((a, b) => b.score - a.score);
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1');
    });
  });
});

// ============= Knowledge Graph Types =============

describe('Knowledge Graph Types', () => {
  interface TaskPerformance {
    taskId: string;
    goal: string;
    provider: string;
    success: boolean;
    responseTime: number;
    quality: number;
    context?: Record<string, unknown>;
  }

  interface GraphNode {
    id: string;
    type: string;
    properties: Record<string, unknown>;
  }

  interface GraphEdge {
    source: string;
    target: string;
    type: string;
    weight?: number;
  }

  describe('TaskPerformance interface', () => {
    it('should create task performance record', () => {
      const perf: TaskPerformance = {
        taskId: 'task-001',
        goal: 'interaction',
        provider: 'openai',
        success: true,
        responseTime: 1500,
        quality: 0.85,
      };
      expect(perf.success).toBe(true);
      expect(perf.quality).toBe(0.85);
    });

    it('should create performance with context', () => {
      const perf: TaskPerformance = {
        taskId: 'task-002',
        goal: 'code-generation',
        provider: 'anthropic',
        success: true,
        responseTime: 2000,
        quality: 0.92,
        context: { language: 'typescript', complexity: 'medium' },
      };
      expect(perf.context?.language).toBe('typescript');
    });
  });

  describe('GraphNode interface', () => {
    it('should create concept node', () => {
      const node: GraphNode = {
        id: 'node-001',
        type: 'concept',
        properties: { name: 'API Design', domain: 'software' },
      };
      expect(node.type).toBe('concept');
    });

    it('should create entity node', () => {
      const node: GraphNode = {
        id: 'node-002',
        type: 'entity',
        properties: { name: 'UserService', file: 'src/user.ts' },
      };
      expect(node.properties.file).toBe('src/user.ts');
    });
  });

  describe('GraphEdge interface', () => {
    it('should create relationship edge', () => {
      const edge: GraphEdge = {
        source: 'node-001',
        target: 'node-002',
        type: 'uses',
      };
      expect(edge.type).toBe('uses');
    });

    it('should create weighted edge', () => {
      const edge: GraphEdge = {
        source: 'node-001',
        target: 'node-003',
        type: 'related_to',
        weight: 0.75,
      };
      expect(edge.weight).toBe(0.75);
    });
  });
});

// ============= Memory Query Types =============

describe('Memory Query Types', () => {
  interface MemoryQuery {
    type?: string;
    tags?: string[];
    timeRange?: {
      start: number;
      end: number;
    };
    limit?: number;
    orderBy?: 'timestamp' | 'relevance';
  }

  describe('MemoryQuery interface', () => {
    it('should create type-filtered query', () => {
      const query: MemoryQuery = {
        type: 'action',
      };
      expect(query.type).toBe('action');
    });

    it('should create tag-filtered query', () => {
      const query: MemoryQuery = {
        tags: ['motor', 'fs'],
      };
      expect(query.tags).toHaveLength(2);
    });

    it('should create time-range query', () => {
      const now = Date.now();
      const query: MemoryQuery = {
        timeRange: {
          start: now - 3600000,
          end: now,
        },
      };
      expect(query.timeRange?.end).toBeGreaterThan(query.timeRange!.start);
    });

    it('should create limited query', () => {
      const query: MemoryQuery = {
        limit: 50,
        orderBy: 'timestamp',
      };
      expect(query.limit).toBe(50);
    });
  });
});

// ============= Memory ID Generation =============

describe('Memory ID Generation', () => {
  it('should generate unique IDs', () => {
    const generateId = () => Math.random().toString(36).substring(7);
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  it('should generate alphanumeric IDs', () => {
    const id = Math.random().toString(36).substring(7);
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});

// ============= Short-Term Memory Management =============

describe('Short-Term Memory Management', () => {
  const STM_LIMIT = 100;

  it('should add to STM within limit', () => {
    const stm: unknown[] = [];
    for (let i = 0; i < 50; i++) {
      stm.push({ id: i });
    }
    expect(stm.length).toBeLessThanOrEqual(STM_LIMIT);
  });

  it('should remove oldest when exceeding limit', () => {
    const stm: { id: number }[] = [];
    for (let i = 0; i < 110; i++) {
      stm.push({ id: i });
      if (stm.length > STM_LIMIT) {
        stm.shift();
      }
    }
    expect(stm.length).toBe(STM_LIMIT);
    expect(stm[0].id).toBe(10);
  });

  it('should maintain FIFO order', () => {
    const stm: { id: number }[] = [];
    stm.push({ id: 1 });
    stm.push({ id: 2 });
    stm.push({ id: 3 });
    expect(stm[0].id).toBe(1);
    expect(stm[stm.length - 1].id).toBe(3);
  });
});

// ============= Event Type Filtering =============

describe('Event Type Filtering', () => {
  it('should filter data directories', () => {
    const filePaths = [
      'src/main.ts',
      'data/config.json',
      'logs/app.log',
      'temp/cache.tmp',
      'src/utils.ts',
    ];
    
    const shouldRecord = (path: string) => {
      return !path.includes('data/') && 
             !path.includes('logs/') && 
             !path.includes('temp/');
    };
    
    const recorded = filePaths.filter(shouldRecord);
    expect(recorded).toHaveLength(2);
    expect(recorded).toContain('src/main.ts');
    expect(recorded).not.toContain('data/config.json');
  });
});

// ============= Cosine Similarity =============

describe('Cosine Similarity', () => {
  const cosineSimilarity = (a: number[], b: number[]): number => {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  it('should return 1 for identical vectors', () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it('should return 0 for orthogonal vectors', () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('should return -1 for opposite vectors', () => {
    const a = [1, 0];
    const b = [-1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it('should handle different length vectors', () => {
    const a = [1, 2, 3];
    const b = [1, 2];
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('should handle zero vectors', () => {
    const a = [0, 0, 0];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBe(0);
  });
});
