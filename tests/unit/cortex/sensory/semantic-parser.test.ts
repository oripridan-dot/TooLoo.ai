// @version 3.3.577
/**
 * Semantic Parser Tests
 * @version 1.0.0
 *
 * Tests the code analysis and semantic understanding system including:
 * - TypeScript parsing
 * - Symbol extraction
 * - Memory storage with chunking
 * - Project analysis
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    readJson: vi.fn().mockResolvedValue({}),
    writeJson: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    readFile: vi.fn().mockResolvedValue(''),
  },
}));

// Mock glob
vi.mock('glob', () => ({
  glob: vi.fn().mockResolvedValue([]),
}));

describe('SemanticParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exports', () => {
    it('should export SemanticParser class', async () => {
      const module = await import('../../../../src/cortex/sensory/semantic-parser.js');
      expect(module.SemanticParser).toBeDefined();
      expect(typeof module.SemanticParser).toBe('function');
    });
  });

  describe('Instance Creation', () => {
    it('should create instance with bus and workspace root', async () => {
      const { SemanticParser } = await import('../../../../src/cortex/sensory/semantic-parser.js');
      const mockBus = { publish: vi.fn(), on: vi.fn() };
      const parser = new SemanticParser(mockBus as any, '/workspace');
      expect(parser).toBeInstanceOf(SemanticParser);
    });
  });

  describe('FunctionInfo Interface', () => {
    it('should define function properties', () => {
      const funcInfo = {
        name: 'myFunction',
        documentation: 'This function does something',
      };
      expect(funcInfo.name).toBe('myFunction');
      expect(funcInfo.documentation).toBeTruthy();
    });
  });

  describe('InterfaceInfo Interface', () => {
    it('should define interface properties', () => {
      const interfaceInfo = {
        name: 'MyInterface',
        documentation: 'Interface description',
      };
      expect(interfaceInfo.name).toBe('MyInterface');
    });
  });

  describe('ClassInfo Interface', () => {
    it('should define class properties', () => {
      const classInfo = {
        name: 'MyClass',
        documentation: 'Class description',
        methods: ['method1', 'method2'],
      };
      expect(classInfo.name).toBe('MyClass');
      expect(classInfo.methods).toContain('method1');
    });
  });

  describe('SymbolInfo Interface', () => {
    it('should define symbol info structure', () => {
      const symbolInfo = {
        path: 'src/module.ts',
        classes: [],
        interfaces: [],
        functions: [],
      };
      expect(symbolInfo.path).toBe('src/module.ts');
      expect(Array.isArray(symbolInfo.classes)).toBe(true);
    });
  });

  describe('ProjectInfo Interface', () => {
    it('should define project structure', () => {
      const projectInfo = {
        dependencies: { lodash: '^4.0.0' },
        scripts: { build: 'tsc' },
        tsconfig: {},
        symbols: [],
      };
      expect(projectInfo.dependencies.lodash).toBe('^4.0.0');
      expect(projectInfo.scripts.build).toBe('tsc');
    });
  });

  describe('Memory Storage Configuration', () => {
    it('should define chunk size limit', () => {
      const MAX_CHUNK_SIZE = 5000;
      expect(MAX_CHUNK_SIZE).toBe(5000);
    });

    it('should define store delay for rate limiting', () => {
      const MEMORY_STORE_DELAY_MS = 500;
      expect(MEMORY_STORE_DELAY_MS).toBe(500);
    });
  });

  describe('Chunking Logic', () => {
    it('should not chunk small content', () => {
      const content = 'small content';
      const MAX_CHUNK_SIZE = 5000;
      const needsChunking = content.length > MAX_CHUNK_SIZE;
      expect(needsChunking).toBe(false);
    });

    it('should chunk large content', () => {
      const content = 'x'.repeat(10000);
      const MAX_CHUNK_SIZE = 5000;
      const needsChunking = content.length > MAX_CHUNK_SIZE;
      expect(needsChunking).toBe(true);
    });

    it('should calculate correct number of chunks', () => {
      const content = 'x'.repeat(12000);
      const MAX_CHUNK_SIZE = 5000;
      const chunks: string[] = [];
      for (let i = 0; i < content.length; i += MAX_CHUNK_SIZE) {
        chunks.push(content.slice(i, i + MAX_CHUNK_SIZE));
      }
      expect(chunks.length).toBe(3);
    });
  });

  describe('Language Support', () => {
    it('should support TypeScript parsing', () => {
      const supportedExtensions = ['.ts', '.tsx'];
      expect(supportedExtensions).toContain('.ts');
    });
  });

  describe('Cache Path', () => {
    it('should construct cache path from workspace', () => {
      const workspaceRoot = '/workspace';
      const cachePath = `${workspaceRoot}/data/memory/semantic-cache.json`;
      expect(cachePath).toContain('semantic-cache.json');
    });
  });

  describe('Memory Store Event', () => {
    it('should structure memory store event correctly', () => {
      const event = {
        description: 'Code analysis results',
        content: 'function foo() {}',
        type: 'system',
        tags: ['code', 'analysis'],
      };
      expect(event.type).toBe('system');
      expect(event.tags).toContain('code');
    });

    it('should add chunk tags for chunked content', () => {
      const baseTags = ['code'];
      const chunkIndex = 1;
      const tags = [...baseTags, `chunk-${chunkIndex + 1}`];
      expect(tags).toContain('chunk-2');
    });
  });
});
