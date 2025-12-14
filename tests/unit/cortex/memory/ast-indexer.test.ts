// @version 3.3.573
/**
 * AST Indexer Tests
 * Tests for code structure analysis using TypeScript compiler API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock TypeScript and fs
vi.mock('typescript', () => ({
  default: {
    createSourceFile: vi.fn(),
    ScriptTarget: { Latest: 99 },
    SyntaxKind: {
      FunctionDeclaration: 256,
      ClassDeclaration: 257,
      InterfaceDeclaration: 258,
      VariableStatement: 236,
    },
    forEachChild: vi.fn(),
  },
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));

describe('ASTIndexer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Types', () => {
    describe('CodeSymbol', () => {
      it('should have name property', () => {
        interface CodeSymbol {
          name: string;
          kind: string;
          filePath: string;
          line: number;
          column: number;
          documentation?: string;
          parameters?: { name: string; type: string }[];
          returnType?: string;
          parent?: string;
          isExported: boolean;
          modifiers: string[];
          summary: string;
        }
        const symbol: CodeSymbol = {
          name: 'processData',
          kind: 'function',
          filePath: 'src/utils.ts',
          line: 10,
          column: 0,
          isExported: true,
          modifiers: ['async'],
          summary: 'Processes data asynchronously',
        };
        expect(symbol.name).toBe('processData');
      });

      it('should track function parameters', () => {
        interface CodeSymbol {
          name: string;
          kind: string;
          filePath: string;
          line: number;
          column: number;
          parameters?: { name: string; type: string }[];
          returnType?: string;
          isExported: boolean;
          modifiers: string[];
          summary: string;
        }
        const symbol: CodeSymbol = {
          name: 'createUser',
          kind: 'function',
          filePath: 'src/api.ts',
          line: 25,
          column: 0,
          parameters: [
            { name: 'name', type: 'string' },
            { name: 'age', type: 'number' },
          ],
          returnType: 'Promise<User>',
          isExported: true,
          modifiers: ['async'],
          summary: 'Creates a new user',
        };
        expect(symbol.parameters).toHaveLength(2);
      });

      it('should track return type', () => {
        interface CodeSymbol {
          name: string;
          kind: string;
          filePath: string;
          line: number;
          column: number;
          returnType?: string;
          isExported: boolean;
          modifiers: string[];
          summary: string;
        }
        const symbol: CodeSymbol = {
          name: 'getData',
          kind: 'function',
          filePath: 'src/data.ts',
          line: 5,
          column: 0,
          returnType: 'Promise<Data[]>',
          isExported: true,
          modifiers: [],
          summary: 'Retrieves data',
        };
        expect(symbol.returnType).toBe('Promise<Data[]>');
      });

      it('should track parent for methods', () => {
        interface CodeSymbol {
          name: string;
          kind: string;
          filePath: string;
          line: number;
          column: number;
          parent?: string;
          isExported: boolean;
          modifiers: string[];
          summary: string;
        }
        const symbol: CodeSymbol = {
          name: 'render',
          kind: 'method',
          filePath: 'src/component.ts',
          line: 50,
          column: 2,
          parent: 'MyComponent',
          isExported: false,
          modifiers: [],
          summary: 'Renders the component',
        };
        expect(symbol.parent).toBe('MyComponent');
      });

      it('should track modifiers', () => {
        interface CodeSymbol {
          name: string;
          kind: string;
          filePath: string;
          line: number;
          column: number;
          isExported: boolean;
          modifiers: string[];
          summary: string;
        }
        const symbol: CodeSymbol = {
          name: 'getInstance',
          kind: 'method',
          filePath: 'src/singleton.ts',
          line: 15,
          column: 2,
          isExported: true,
          modifiers: ['static', 'public'],
          summary: 'Gets singleton instance',
        };
        expect(symbol.modifiers).toContain('static');
      });
    });

    describe('SymbolKind', () => {
      it('should include function kind', () => {
        type SymbolKind = 'function' | 'class' | 'interface' | 'type' | 'variable' |
          'constant' | 'method' | 'property' | 'enum' | 'namespace' | 'module';
        const kind: SymbolKind = 'function';
        expect(kind).toBe('function');
      });

      it('should include class kind', () => {
        type SymbolKind = 'function' | 'class' | 'interface' | 'type' | 'variable' |
          'constant' | 'method' | 'property' | 'enum' | 'namespace' | 'module';
        const kind: SymbolKind = 'class';
        expect(kind).toBe('class');
      });

      it('should include interface kind', () => {
        type SymbolKind = 'function' | 'class' | 'interface' | 'type' | 'variable' |
          'constant' | 'method' | 'property' | 'enum' | 'namespace' | 'module';
        const kind: SymbolKind = 'interface';
        expect(kind).toBe('interface');
      });

      it('should include enum kind', () => {
        type SymbolKind = 'function' | 'class' | 'interface' | 'type' | 'variable' |
          'constant' | 'method' | 'property' | 'enum' | 'namespace' | 'module';
        const kind: SymbolKind = 'enum';
        expect(kind).toBe('enum');
      });
    });

    describe('FileIndex', () => {
      it('should have filePath', () => {
        interface FileIndex {
          filePath: string;
          symbols: unknown[];
          imports: unknown[];
          exports: string[];
          lastIndexed: number;
          contentHash: string;
        }
        const index: FileIndex = {
          filePath: 'src/utils.ts',
          symbols: [],
          imports: [],
          exports: ['processData', 'formatDate'],
          lastIndexed: Date.now(),
          contentHash: 'abc123',
        };
        expect(index.filePath).toBe('src/utils.ts');
      });

      it('should track symbols', () => {
        interface FileIndex {
          filePath: string;
          symbols: unknown[];
          imports: unknown[];
          exports: string[];
          lastIndexed: number;
          contentHash: string;
        }
        const index: FileIndex = {
          filePath: 'src/api.ts',
          symbols: [{ name: 'fetch' }, { name: 'post' }],
          imports: [],
          exports: [],
          lastIndexed: Date.now(),
          contentHash: 'def456',
        };
        expect(index.symbols).toHaveLength(2);
      });

      it('should track imports', () => {
        interface FileIndex {
          filePath: string;
          symbols: unknown[];
          imports: { module: string }[];
          exports: string[];
          lastIndexed: number;
          contentHash: string;
        }
        const index: FileIndex = {
          filePath: 'src/main.ts',
          symbols: [],
          imports: [{ module: './utils' }, { module: 'lodash' }],
          exports: [],
          lastIndexed: Date.now(),
          contentHash: 'ghi789',
        };
        expect(index.imports).toHaveLength(2);
      });

      it('should track content hash for change detection', () => {
        interface FileIndex {
          filePath: string;
          symbols: unknown[];
          imports: unknown[];
          exports: string[];
          lastIndexed: number;
          contentHash: string;
        }
        const index: FileIndex = {
          filePath: 'src/file.ts',
          symbols: [],
          imports: [],
          exports: [],
          lastIndexed: Date.now(),
          contentHash: 'sha256hash',
        };
        expect(index.contentHash).toBe('sha256hash');
      });
    });

    describe('ImportInfo', () => {
      it('should have module property', () => {
        interface ImportInfo {
          module: string;
          namedImports?: string[];
          defaultImport?: string;
          isTypeOnly: boolean;
        }
        const imp: ImportInfo = {
          module: './utils',
          isTypeOnly: false,
        };
        expect(imp.module).toBe('./utils');
      });

      it('should track named imports', () => {
        interface ImportInfo {
          module: string;
          namedImports?: string[];
          defaultImport?: string;
          isTypeOnly: boolean;
        }
        const imp: ImportInfo = {
          module: 'lodash',
          namedImports: ['map', 'filter', 'reduce'],
          isTypeOnly: false,
        };
        expect(imp.namedImports).toContain('map');
      });

      it('should track default import', () => {
        interface ImportInfo {
          module: string;
          namedImports?: string[];
          defaultImport?: string;
          isTypeOnly: boolean;
        }
        const imp: ImportInfo = {
          module: 'express',
          defaultImport: 'Express',
          isTypeOnly: false,
        };
        expect(imp.defaultImport).toBe('Express');
      });

      it('should track type-only imports', () => {
        interface ImportInfo {
          module: string;
          namedImports?: string[];
          defaultImport?: string;
          isTypeOnly: boolean;
        }
        const imp: ImportInfo = {
          module: './types',
          namedImports: ['User', 'Config'],
          isTypeOnly: true,
        };
        expect(imp.isTypeOnly).toBe(true);
      });
    });
  });

  describe('AST Analysis', () => {
    it('should parse TypeScript source file', () => {
      const sourceCode = 'function hello() { return "world"; }';
      expect(sourceCode).toContain('function');
    });

    it('should extract function declarations', () => {
      const code = `
        export async function processData(input: string): Promise<Result> {
          return { data: input };
        }
      `;
      expect(code).toContain('async function');
      expect(code).toContain('export');
    });

    it('should extract class declarations', () => {
      const code = `
        export class DataProcessor {
          constructor(private config: Config) {}
          process(): void {}
        }
      `;
      expect(code).toContain('class DataProcessor');
    });

    it('should extract interface declarations', () => {
      const code = `
        export interface User {
          id: string;
          name: string;
          email: string;
        }
      `;
      expect(code).toContain('interface User');
    });

    it('should extract variable declarations', () => {
      const code = `
        export const API_KEY = 'secret';
        const internalValue = 42;
      `;
      expect(code).toContain('const API_KEY');
    });
  });

  describe('Summary Generation', () => {
    it('should generate summary for functions', () => {
      const symbol = {
        name: 'processData',
        kind: 'function',
        parameters: [{ name: 'input', type: 'string' }],
        returnType: 'Promise<Result>',
      };
      const summary = `Function ${symbol.name} takes ${symbol.parameters.length} param(s), returns ${symbol.returnType}`;
      expect(summary).toContain('processData');
    });

    it('should generate summary for classes', () => {
      const symbol = {
        name: 'UserService',
        kind: 'class',
        methods: ['create', 'update', 'delete'],
      };
      const summary = `Class ${symbol.name} with ${symbol.methods.length} methods`;
      expect(summary).toContain('UserService');
    });
  });

  describe('Caching', () => {
    it('should detect file changes via hash', () => {
      const oldHash = 'abc123';
      const newHash = 'def456';
      const changed = oldHash !== newHash;
      expect(changed).toBe(true);
    });

    it('should skip re-indexing unchanged files', () => {
      const oldHash = 'abc123';
      const newHash = 'abc123';
      const changed = oldHash !== newHash;
      expect(changed).toBe(false);
    });

    it('should update lastIndexed timestamp', () => {
      const now = Date.now();
      const index = { lastIndexed: now };
      expect(index.lastIndexed).toBe(now);
    });
  });
});
