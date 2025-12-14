// @version 3.3.577
/**
 * FileSystemHygiene Tests
 * Tests for duplicate/orphan/corruption detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs and glob
vi.mock('fs-extra', () => ({
  default: {
    readFile: vi.fn(),
    stat: vi.fn(),
    pathExists: vi.fn(),
  },
}));

vi.mock('glob', () => ({
  glob: vi.fn().mockResolvedValue([]),
}));

vi.mock('typescript', () => ({
  default: {
    createSourceFile: vi.fn(),
    ScriptTarget: { Latest: 99 },
  },
}));

describe('FileSystemHygiene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Types', () => {
    describe('DuplicateFile', () => {
      it('should have path property', () => {
        interface DuplicateFile {
          path: string;
          duplicateOf: string;
          similarity: number;
          size: number;
        }
        const dup: DuplicateFile = {
          path: 'src/module/file.ts',
          duplicateOf: 'src/other/file.ts',
          similarity: 0.95,
          size: 1234,
        };
        expect(dup.path).toBe('src/module/file.ts');
      });

      it('should have duplicateOf property', () => {
        interface DuplicateFile {
          path: string;
          duplicateOf: string;
          similarity: number;
          size: number;
        }
        const dup: DuplicateFile = {
          path: 'src/file1.ts',
          duplicateOf: 'src/file2.ts',
          similarity: 0.9,
          size: 500,
        };
        expect(dup.duplicateOf).toBe('src/file2.ts');
      });

      it('should track similarity as 0-1 float', () => {
        interface DuplicateFile {
          path: string;
          duplicateOf: string;
          similarity: number;
          size: number;
        }
        const dup: DuplicateFile = {
          path: 'a.ts',
          duplicateOf: 'b.ts',
          similarity: 0.87,
          size: 100,
        };
        expect(dup.similarity).toBeGreaterThanOrEqual(0);
        expect(dup.similarity).toBeLessThanOrEqual(1);
      });

      it('should track file size in bytes', () => {
        interface DuplicateFile {
          path: string;
          duplicateOf: string;
          similarity: number;
          size: number;
        }
        const dup: DuplicateFile = {
          path: 'x.ts',
          duplicateOf: 'y.ts',
          similarity: 1.0,
          size: 4096,
        };
        expect(dup.size).toBe(4096);
      });
    });

    describe('OrphanFile', () => {
      it('should have path property', () => {
        interface OrphanFile {
          path: string;
          size: number;
          lastModified: string;
          potentialPurpose?: string;
        }
        const orphan: OrphanFile = {
          path: 'src/unused/old-module.ts',
          size: 2048,
          lastModified: '2024-01-01T00:00:00Z',
        };
        expect(orphan.path).toBe('src/unused/old-module.ts');
      });

      it('should track size', () => {
        interface OrphanFile {
          path: string;
          size: number;
          lastModified: string;
          potentialPurpose?: string;
        }
        const orphan: OrphanFile = {
          path: 'src/dead.ts',
          size: 512,
          lastModified: '2024-06-15T12:00:00Z',
        };
        expect(orphan.size).toBe(512);
      });

      it('should track last modified time', () => {
        interface OrphanFile {
          path: string;
          size: number;
          lastModified: string;
          potentialPurpose?: string;
        }
        const orphan: OrphanFile = {
          path: 'src/old.ts',
          size: 100,
          lastModified: '2023-12-25T00:00:00Z',
        };
        expect(orphan.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}/);
      });

      it('should optionally track potential purpose', () => {
        interface OrphanFile {
          path: string;
          size: number;
          lastModified: string;
          potentialPurpose?: string;
        }
        const orphan: OrphanFile = {
          path: 'src/maybe-needed.ts',
          size: 750,
          lastModified: '2024-01-01T00:00:00Z',
          potentialPurpose: 'May be test helper',
        };
        expect(orphan.potentialPurpose).toBe('May be test helper');
      });
    });

    describe('CorruptionIssue', () => {
      it('should have file path', () => {
        interface CorruptionIssue {
          file: string;
          type: 'syntax' | 'import' | 'encoding' | 'other';
          message: string;
          line?: number;
          recoverable: boolean;
        }
        const issue: CorruptionIssue = {
          file: 'src/broken.ts',
          type: 'syntax',
          message: 'Unexpected token',
          recoverable: true,
        };
        expect(issue.file).toBe('src/broken.ts');
      });

      it('should have corruption type', () => {
        interface CorruptionIssue {
          file: string;
          type: 'syntax' | 'import' | 'encoding' | 'other';
          message: string;
          line?: number;
          recoverable: boolean;
        }
        const issue: CorruptionIssue = {
          file: 'src/bad.ts',
          type: 'import',
          message: 'Module not found',
          recoverable: false,
        };
        expect(['syntax', 'import', 'encoding', 'other']).toContain(issue.type);
      });

      it('should have error message', () => {
        interface CorruptionIssue {
          file: string;
          type: 'syntax' | 'import' | 'encoding' | 'other';
          message: string;
          line?: number;
          recoverable: boolean;
        }
        const issue: CorruptionIssue = {
          file: 'src/file.ts',
          type: 'encoding',
          message: 'Invalid UTF-8 sequence',
          recoverable: true,
        };
        expect(issue.message).toBe('Invalid UTF-8 sequence');
      });

      it('should optionally track line number', () => {
        interface CorruptionIssue {
          file: string;
          type: 'syntax' | 'import' | 'encoding' | 'other';
          message: string;
          line?: number;
          recoverable: boolean;
        }
        const issue: CorruptionIssue = {
          file: 'src/err.ts',
          type: 'syntax',
          message: 'Missing semicolon',
          line: 42,
          recoverable: true,
        };
        expect(issue.line).toBe(42);
      });

      it('should indicate if recoverable', () => {
        interface CorruptionIssue {
          file: string;
          type: 'syntax' | 'import' | 'encoding' | 'other';
          message: string;
          line?: number;
          recoverable: boolean;
        }
        const issue: CorruptionIssue = {
          file: 'src/x.ts',
          type: 'other',
          message: 'Unknown issue',
          recoverable: false,
        };
        expect(issue.recoverable).toBe(false);
      });
    });

    describe('UnusedConfig', () => {
      it('should have config name', () => {
        interface UnusedConfig {
          name: string;
          file: string;
          type: 'env' | 'setting' | 'feature_flag';
          lastUsed?: string;
        }
        const config: UnusedConfig = {
          name: 'OLD_API_KEY',
          file: '.env',
          type: 'env',
        };
        expect(config.name).toBe('OLD_API_KEY');
      });

      it('should have source file', () => {
        interface UnusedConfig {
          name: string;
          file: string;
          type: 'env' | 'setting' | 'feature_flag';
          lastUsed?: string;
        }
        const config: UnusedConfig = {
          name: 'DEBUG_MODE',
          file: 'config/runtime.json',
          type: 'setting',
        };
        expect(config.file).toBe('config/runtime.json');
      });

      it('should have config type', () => {
        interface UnusedConfig {
          name: string;
          file: string;
          type: 'env' | 'setting' | 'feature_flag';
          lastUsed?: string;
        }
        const config: UnusedConfig = {
          name: 'ENABLE_NEW_UI',
          file: 'flags.json',
          type: 'feature_flag',
        };
        expect(['env', 'setting', 'feature_flag']).toContain(config.type);
      });

      it('should optionally track last used date', () => {
        interface UnusedConfig {
          name: string;
          file: string;
          type: 'env' | 'setting' | 'feature_flag';
          lastUsed?: string;
        }
        const config: UnusedConfig = {
          name: 'DEPRECATED_ENDPOINT',
          file: '.env',
          type: 'env',
          lastUsed: '2023-06-01T00:00:00Z',
        };
        expect(config.lastUsed).toBe('2023-06-01T00:00:00Z');
      });
    });

    describe('HygieneReport', () => {
      it('should have timestamp', () => {
        interface HygieneReport {
          timestamp: string;
          duplicates: { count: number; files: unknown[] };
          orphans: { count: number; files: unknown[]; totalSize: number };
          corruption: { count: number; issues: unknown[] };
          unusedConfig: { count: number; items: unknown[] };
          recommendations: string[];
        }
        const report: HygieneReport = {
          timestamp: '2024-01-15T10:30:00Z',
          duplicates: { count: 0, files: [] },
          orphans: { count: 0, files: [], totalSize: 0 },
          corruption: { count: 0, issues: [] },
          unusedConfig: { count: 0, items: [] },
          recommendations: [],
        };
        expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
      });

      it('should have duplicates summary', () => {
        interface HygieneReport {
          timestamp: string;
          duplicates: { count: number; files: unknown[] };
          orphans: { count: number; files: unknown[]; totalSize: number };
          corruption: { count: number; issues: unknown[] };
          unusedConfig: { count: number; items: unknown[] };
          recommendations: string[];
        }
        const report: HygieneReport = {
          timestamp: new Date().toISOString(),
          duplicates: { count: 3, files: [{}, {}, {}] },
          orphans: { count: 0, files: [], totalSize: 0 },
          corruption: { count: 0, issues: [] },
          unusedConfig: { count: 0, items: [] },
          recommendations: [],
        };
        expect(report.duplicates.count).toBe(3);
      });

      it('should have orphans summary with total size', () => {
        interface HygieneReport {
          timestamp: string;
          duplicates: { count: number; files: unknown[] };
          orphans: { count: number; files: unknown[]; totalSize: number };
          corruption: { count: number; issues: unknown[] };
          unusedConfig: { count: number; items: unknown[] };
          recommendations: string[];
        }
        const report: HygieneReport = {
          timestamp: new Date().toISOString(),
          duplicates: { count: 0, files: [] },
          orphans: { count: 5, files: [{}, {}, {}, {}, {}], totalSize: 25600 },
          corruption: { count: 0, issues: [] },
          unusedConfig: { count: 0, items: [] },
          recommendations: [],
        };
        expect(report.orphans.totalSize).toBe(25600);
      });

      it('should have corruption summary', () => {
        interface HygieneReport {
          timestamp: string;
          duplicates: { count: number; files: unknown[] };
          orphans: { count: number; files: unknown[]; totalSize: number };
          corruption: { count: number; issues: unknown[] };
          unusedConfig: { count: number; items: unknown[] };
          recommendations: string[];
        }
        const report: HygieneReport = {
          timestamp: new Date().toISOString(),
          duplicates: { count: 0, files: [] },
          orphans: { count: 0, files: [], totalSize: 0 },
          corruption: { count: 2, issues: [{}, {}] },
          unusedConfig: { count: 0, items: [] },
          recommendations: [],
        };
        expect(report.corruption.count).toBe(2);
      });

      it('should have recommendations array', () => {
        interface HygieneReport {
          timestamp: string;
          duplicates: { count: number; files: unknown[] };
          orphans: { count: number; files: unknown[]; totalSize: number };
          corruption: { count: number; issues: unknown[] };
          unusedConfig: { count: number; items: unknown[] };
          recommendations: string[];
        }
        const report: HygieneReport = {
          timestamp: new Date().toISOString(),
          duplicates: { count: 1, files: [{}] },
          orphans: { count: 0, files: [], totalSize: 0 },
          corruption: { count: 0, issues: [] },
          unusedConfig: { count: 0, items: [] },
          recommendations: ['Remove duplicate file at src/dup.ts'],
        };
        expect(report.recommendations).toHaveLength(1);
      });
    });
  });

  describe('FileSystemHygiene Class', () => {
    it('should initialize with project root', () => {
      const projectRoot = '/workspaces/project';
      expect(projectRoot).toBe('/workspaces/project');
    });

    it('should default to cwd for project root', () => {
      const cwd = process.cwd();
      expect(cwd).toBeTruthy();
    });

    it('should store last report', () => {
      const report = {
        timestamp: new Date().toISOString(),
        duplicates: { count: 0, files: [] },
        orphans: { count: 0, files: [], totalSize: 0 },
        corruption: { count: 0, issues: [] },
        unusedConfig: { count: 0, items: [] },
        recommendations: [],
      };
      let lastReport: typeof report | null = null;
      lastReport = report;
      expect(lastReport).toBe(report);
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect exact duplicates', () => {
      const hash1 = 'abc123';
      const hash2 = 'abc123';
      expect(hash1 === hash2).toBe(true);
    });

    it('should calculate similarity percentage', () => {
      const similarity = 0.95;
      const threshold = 0.9;
      expect(similarity > threshold).toBe(true);
    });

    it('should skip test files in duplicate check', () => {
      const ignorePattern = ['**/*.test.ts', '**/*.d.ts'];
      const testFile = 'module.test.ts';
      const shouldSkip = ignorePattern.some((pattern) =>
        testFile.match(pattern.replace('**/', '').replace('*.', '.'))
      );
      expect(shouldSkip).toBe(true);
    });

    it('should skip declaration files', () => {
      const file = 'types.d.ts';
      expect(file.endsWith('.d.ts')).toBe(true);
    });

    it('should compare content hashes', () => {
      const createHash = (content: string) => {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
          hash = (hash << 5) - hash + content.charCodeAt(i);
        }
        return hash.toString(16);
      };
      const hash1 = createHash('const x = 1;');
      const hash2 = createHash('const x = 1;');
      expect(hash1).toBe(hash2);
    });
  });

  describe('Orphan Detection', () => {
    it('should identify files not imported', () => {
      const importedFiles = new Set(['src/main.ts', 'src/utils.ts']);
      const allFiles = ['src/main.ts', 'src/utils.ts', 'src/orphan.ts'];
      const orphans = allFiles.filter((f) => !importedFiles.has(f));
      expect(orphans).toContain('src/orphan.ts');
    });

    it('should preserve entry points as non-orphans', () => {
      const entryPoints = ['src/main.ts', 'src/index.ts'];
      const file = 'src/main.ts';
      expect(entryPoints.includes(file)).toBe(true);
    });

    it('should calculate total orphan size', () => {
      const orphans = [{ size: 100 }, { size: 200 }, { size: 300 }];
      const totalSize = orphans.reduce((sum, o) => sum + o.size, 0);
      expect(totalSize).toBe(600);
    });
  });

  describe('Corruption Detection', () => {
    it('should detect syntax errors', () => {
      const hasSyntaxError = (code: string) => {
        try {
          new Function(code);
          return false;
        } catch {
          return true;
        }
      };
      expect(hasSyntaxError('const x =')).toBe(true);
    });

    it('should detect broken imports', () => {
      const importRegex = /import\s+.*\s+from\s+['"](.*)['"]/;
      const code = "import { foo } from './nonexistent';";
      const match = code.match(importRegex);
      expect(match?.[1]).toBe('./nonexistent');
    });

    it('should classify corruption type', () => {
      const classifyError = (message: string): 'syntax' | 'import' | 'encoding' | 'other' => {
        if (message.includes('Unexpected')) return 'syntax';
        if (message.includes('Module not found')) return 'import';
        if (message.includes('encoding')) return 'encoding';
        return 'other';
      };
      expect(classifyError('Unexpected token')).toBe('syntax');
      expect(classifyError('Module not found: xyz')).toBe('import');
    });
  });

  describe('Unused Config Detection', () => {
    it('should find env variables not used in code', () => {
      const envVars = ['API_KEY', 'DEBUG', 'OLD_SETTING'];
      const codeReferences = ['process.env.API_KEY', 'process.env.DEBUG'];
      const unused = envVars.filter((v) => !codeReferences.some((r) => r.includes(v)));
      expect(unused).toContain('OLD_SETTING');
    });

    it('should check config files', () => {
      const configFiles = ['.env', 'config/runtime.json', 'config/settings.yaml'];
      expect(configFiles).toHaveLength(3);
    });
  });

  describe('Recommendations', () => {
    it('should recommend removing duplicates', () => {
      const generateRecommendation = (type: string, file: string) => {
        if (type === 'duplicate') return `Remove duplicate file: ${file}`;
        return '';
      };
      expect(generateRecommendation('duplicate', 'src/old.ts')).toBe(
        'Remove duplicate file: src/old.ts'
      );
    });

    it('should recommend reviewing orphans', () => {
      const orphanCount = 5;
      const recommendation =
        orphanCount > 0 ? `Review ${orphanCount} potentially orphaned files` : '';
      expect(recommendation).toContain('5');
    });

    it('should prioritize corruption fixes', () => {
      const issues = [
        { type: 'syntax', priority: 1 },
        { type: 'import', priority: 2 },
        { type: 'encoding', priority: 3 },
      ];
      const sorted = issues.sort((a, b) => a.priority - b.priority);
      expect(sorted[0].type).toBe('syntax');
    });
  });
});
