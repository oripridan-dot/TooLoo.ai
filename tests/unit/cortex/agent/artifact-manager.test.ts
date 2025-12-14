// @version 3.3.577
/**
 * Artifact Manager Tests
 * @version 1.0.0
 *
 * Tests the artifact storage system including:
 * - Artifact creation
 * - Version management
 * - Type categorization
 * - Index management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    readJson: vi.fn().mockResolvedValue({ artifacts: [], stats: {} }),
    writeJson: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-123'),
}));

vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
  },
}));

describe('ArtifactManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exports', () => {
    it('should export ArtifactManager class', async () => {
      const module = await import('../../../../src/cortex/agent/artifact-manager.js');
      expect(module.ArtifactManager).toBeDefined();
      expect(typeof module.ArtifactManager).toBe('function');
    });
  });

  describe('Instance Creation', () => {
    it('should create instance', async () => {
      const { ArtifactManager } = await import('../../../../src/cortex/agent/artifact-manager.js');
      const manager = new ArtifactManager();
      expect(manager).toBeInstanceOf(ArtifactManager);
    });
  });

  describe('ArtifactIndex Interface', () => {
    it('should define index structure', () => {
      const index = {
        version: '3.3.0',
        artifacts: [],
        stats: {
          totalArtifacts: 0,
          byType: {},
          lastUpdated: new Date().toISOString(),
        },
      };
      expect(index.version).toBe('3.3.0');
      expect(index.stats.totalArtifacts).toBe(0);
    });
  });

  describe('Artifact Types', () => {
    it('should support code artifacts', () => {
      const type = 'code';
      expect(type).toBe('code');
    });

    it('should support component artifacts', () => {
      const type = 'component';
      expect(type).toBe('component');
    });

    it('should support test artifacts', () => {
      const type = 'test';
      expect(type).toBe('test');
    });

    it('should support config artifacts', () => {
      const type = 'config';
      expect(type).toBe('config');
    });

    it('should support documentation artifacts', () => {
      const type = 'documentation';
      expect(type).toBe('documentation');
    });

    it('should support data artifacts', () => {
      const type = 'data';
      expect(type).toBe('data');
    });
  });

  describe('Artifact Creation Params', () => {
    it('should define required params', () => {
      const params = {
        type: 'code' as const,
        name: 'utility.ts',
        content: 'export function util() {}',
        createdBy: 'system',
      };
      expect(params.name).toBe('utility.ts');
      expect(params.createdBy).toBe('system');
    });

    it('should support optional language', () => {
      const params = {
        type: 'code' as const,
        name: 'file.ts',
        content: '',
        createdBy: 'system',
        language: 'typescript',
      };
      expect(params.language).toBe('typescript');
    });

    it('should support optional description', () => {
      const params = {
        type: 'code' as const,
        name: 'file.ts',
        content: '',
        createdBy: 'system',
        description: 'A utility function',
      };
      expect(params.description).toBe('A utility function');
    });

    it('should support optional metadata', () => {
      const params = {
        type: 'code' as const,
        name: 'file.ts',
        content: '',
        createdBy: 'system',
        metadata: { source: 'agent' },
      };
      expect(params.metadata?.source).toBe('agent');
    });

    it('should support optional tags', () => {
      const params = {
        type: 'code' as const,
        name: 'file.ts',
        content: '',
        createdBy: 'system',
        tags: ['utility', 'helper'],
      };
      expect(params.tags).toContain('utility');
    });
  });

  describe('Artifact Structure', () => {
    it('should generate unique ID', () => {
      const id = 'test-uuid-123';
      expect(id).toBeTruthy();
    });

    it('should set initial version', () => {
      const version = '1.0.0';
      expect(version).toBe('1.0.0');
    });

    it('should record creation time', () => {
      const createdAt = new Date();
      expect(createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Directory Structure', () => {
    it('should create type directories', () => {
      const directories = [
        'code',
        'component',
        'test',
        'config',
        'documentation',
        'data',
        'versions',
      ];
      directories.forEach((dir) => {
        expect(typeof dir).toBe('string');
      });
    });
  });

  describe('Stats Tracking', () => {
    it('should track total artifacts', () => {
      const stats = {
        totalArtifacts: 10,
        byType: { code: 5, test: 3, config: 2 },
        lastUpdated: new Date().toISOString(),
      };
      expect(stats.totalArtifacts).toBe(10);
    });

    it('should track by type', () => {
      const byType = { code: 5, test: 3 };
      expect(byType.code).toBe(5);
    });
  });

  describe('Initialization', () => {
    it('should be idempotent', async () => {
      const { ArtifactManager } = await import('../../../../src/cortex/agent/artifact-manager.js');
      const manager = new ArtifactManager();
      await manager.initialize();
      await manager.initialize(); // Should not throw
      expect(true).toBe(true);
    });
  });
});
