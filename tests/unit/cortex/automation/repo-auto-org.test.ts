// @version 3.3.573
/**
 * RepoAutoOrg Test Suite
 * @version 3.3.510
 *
 * Tests for the automated repository organization system including:
 * - Scope detection from file patterns
 * - Branch naming and creation
 * - Commit message generation
 * - PR creation logic
 * - Organization plan generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock child_process before imports
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn((fn: Function) => async (...args: any[]) => {
    return new Promise((resolve, reject) => {
      fn(...args, (err: Error | null, stdout: string, stderr: string) => {
        if (err) reject(err);
        else resolve({ stdout, stderr });
      });
    });
  }),
}));

vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn().mockResolvedValue(true),
    readJson: vi.fn().mockResolvedValue({}),
    writeJson: vi.fn().mockResolvedValue(undefined),
    ensureDir: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: {
    on: vi.fn(),
    publish: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
  },
}));

// ============================================================================
// TYPE DEFINITIONS FOR TESTING
// ============================================================================

interface ChangeScope {
  type: 'feature' | 'fix' | 'chore' | 'refactor' | 'docs' | 'test' | 'style';
  domain: string;
  summary: string;
  files: string[];
  impact: 'major' | 'minor' | 'patch';
}

interface CommitPlan {
  scope: ChangeScope;
  message: string;
  files: string[];
  branchName?: string;
  createPR?: boolean;
}

interface RepoAutoOrgConfig {
  enabled: boolean;
  autoCommit: boolean;
  autoBranch: boolean;
  autoPR: boolean;
  minChangesForPR: number;
  scopeDetectionEnabled: boolean;
  workspaceRoot: string;
}

interface RepoStats {
  totalCommits: number;
  totalBranches: number;
  totalPRs: number;
  changesByScope: Record<string, number>;
  lastCommitAt?: string;
}

interface OrganizationPlan {
  featureName: string;
  branchName: string;
  suggestedStructure: { path: string; type: 'file' | 'directory'; purpose: string }[];
  commands: {
    createBranch: string;
    stageFiles: string;
    commit: string;
  };
  scope: ChangeScope;
}

// ============================================================================
// SCOPE DETECTION RULE TESTS
// ============================================================================

describe('RepoAutoOrg Scope Detection Rules', () => {
  const SCOPE_RULES: Array<{
    pattern: RegExp;
    type: ChangeScope['type'];
    domain: string;
  }> = [
    { pattern: /src\/web-app\/.*\.jsx?$/, type: 'feature', domain: 'web-app' },
    { pattern: /src\/cortex\/.*\.ts$/, type: 'feature', domain: 'cortex' },
    { pattern: /src\/precog\/.*\.ts$/, type: 'feature', domain: 'precog' },
    { pattern: /src\/nexus\/routes\/.*\.ts$/, type: 'feature', domain: 'nexus' },
    { pattern: /src\/qa\/.*\.ts$/, type: 'fix', domain: 'qa' },
    { pattern: /\.test\.(ts|tsx|js|jsx)$/, type: 'test', domain: 'test' },
    { pattern: /package\.json$/, type: 'chore', domain: 'deps' },
    { pattern: /tsconfig\.json$/, type: 'chore', domain: 'config' },
    { pattern: /\.github\/.*/, type: 'chore', domain: 'ci' },
    { pattern: /scripts\/.*/, type: 'chore', domain: 'scripts' },
    { pattern: /docs\/.*\.md$/, type: 'docs', domain: 'docs' },
    { pattern: /README\.md$/, type: 'docs', domain: 'docs' },
    { pattern: /\.css$/, type: 'style', domain: 'styles' },
    { pattern: /tailwind\.config/, type: 'style', domain: 'styles' },
    { pattern: /src\/core\/.*\.ts$/, type: 'refactor', domain: 'core' },
    { pattern: /src\/shared\/.*\.ts$/, type: 'refactor', domain: 'shared' },
  ];

  describe('Feature patterns', () => {
    it('should match web-app JSX files', () => {
      const rule = SCOPE_RULES.find((r) => r.domain === 'web-app');
      expect(rule?.pattern.test('src/web-app/components/Button.jsx')).toBe(true);
      expect(rule?.pattern.test('src/web-app/pages/Home.js')).toBe(true);
      expect(rule?.type).toBe('feature');
    });

    it('should match cortex TypeScript files', () => {
      const rule = SCOPE_RULES.find((r) => r.domain === 'cortex');
      expect(rule?.pattern.test('src/cortex/agent/executor.ts')).toBe(true);
      expect(rule?.pattern.test('src/cortex/learning/meta-learner.ts')).toBe(true);
      expect(rule?.type).toBe('feature');
    });

    it('should match precog TypeScript files', () => {
      const rule = SCOPE_RULES.find((r) => r.domain === 'precog');
      expect(rule?.pattern.test('src/precog/router.ts')).toBe(true);
      expect(rule?.pattern.test('src/precog/synthesis/index.ts')).toBe(true);
      expect(rule?.type).toBe('feature');
    });

    it('should match nexus route files', () => {
      const rule = SCOPE_RULES.find((r) => r.domain === 'nexus');
      expect(rule?.pattern.test('src/nexus/routes/chat.ts')).toBe(true);
      expect(rule?.pattern.test('src/nexus/routes/api-v1.ts')).toBe(true);
      expect(rule?.type).toBe('feature');
    });
  });

  describe('Test patterns', () => {
    it('should match test files with various extensions', () => {
      const rule = SCOPE_RULES.find((r) => r.type === 'test');
      expect(rule?.pattern.test('file.test.ts')).toBe(true);
      expect(rule?.pattern.test('file.test.tsx')).toBe(true);
      expect(rule?.pattern.test('file.test.js')).toBe(true);
      expect(rule?.pattern.test('file.test.jsx')).toBe(true);
      expect(rule?.domain).toBe('test');
    });
  });

  describe('Chore patterns', () => {
    it('should match package.json', () => {
      const rule = SCOPE_RULES.find((r) => r.domain === 'deps');
      expect(rule?.pattern.test('package.json')).toBe(true);
      expect(rule?.pattern.test('subdir/package.json')).toBe(true);
      expect(rule?.type).toBe('chore');
    });

    it('should match tsconfig.json', () => {
      const rule = SCOPE_RULES.find((r) => r.domain === 'config');
      expect(rule?.pattern.test('tsconfig.json')).toBe(true);
      expect(rule?.type).toBe('chore');
    });

    it('should match GitHub workflow files', () => {
      const rule = SCOPE_RULES.find((r) => r.domain === 'ci');
      expect(rule?.pattern.test('.github/workflows/ci.yml')).toBe(true);
      expect(rule?.pattern.test('.github/CODEOWNERS')).toBe(true);
      expect(rule?.type).toBe('chore');
    });

    it('should match script files', () => {
      const rule = SCOPE_RULES.find((r) => r.domain === 'scripts');
      expect(rule?.pattern.test('scripts/build.sh')).toBe(true);
      expect(rule?.pattern.test('scripts/deploy.ts')).toBe(true);
      expect(rule?.type).toBe('chore');
    });
  });

  describe('Docs patterns', () => {
    it('should match markdown files in docs', () => {
      const rule = SCOPE_RULES.find(
        (r) => r.domain === 'docs' && r.pattern.source.includes('docs')
      );
      expect(rule?.pattern.test('docs/API.md')).toBe(true);
      expect(rule?.pattern.test('docs/guides/getting-started.md')).toBe(true);
      expect(rule?.type).toBe('docs');
    });

    it('should match README.md', () => {
      const rules = SCOPE_RULES.filter((r) => r.type === 'docs');
      const readmeRule = rules.find((r) => r.pattern.test('README.md'));
      expect(readmeRule).toBeDefined();
    });
  });

  describe('Style patterns', () => {
    it('should match CSS files', () => {
      const rule = SCOPE_RULES.find((r) => r.pattern.source.includes('\\.css'));
      expect(rule?.pattern.test('styles/main.css')).toBe(true);
      expect(rule?.pattern.test('src/app.css')).toBe(true);
      expect(rule?.type).toBe('style');
    });

    it('should match tailwind config', () => {
      const rule = SCOPE_RULES.find((r) => r.pattern.source.includes('tailwind'));
      expect(rule?.pattern.test('tailwind.config.js')).toBe(true);
      expect(rule?.pattern.test('tailwind.config.ts')).toBe(true);
      expect(rule?.type).toBe('style');
    });
  });

  describe('Refactor patterns', () => {
    it('should match core module files', () => {
      const rule = SCOPE_RULES.find((r) => r.domain === 'core');
      expect(rule?.pattern.test('src/core/event-bus.ts')).toBe(true);
      expect(rule?.pattern.test('src/core/config.ts')).toBe(true);
      expect(rule?.type).toBe('refactor');
    });

    it('should match shared module files', () => {
      const rule = SCOPE_RULES.find((r) => r.domain === 'shared');
      expect(rule?.pattern.test('src/shared/utils.ts')).toBe(true);
      expect(rule?.pattern.test('src/shared/types/index.ts')).toBe(true);
      expect(rule?.type).toBe('refactor');
    });
  });
});

// ============================================================================
// CHANGE SCOPE TYPE TESTS
// ============================================================================

describe('ChangeScope Type', () => {
  it('should have valid scope types', () => {
    const validTypes = ['feature', 'fix', 'chore', 'refactor', 'docs', 'test', 'style'];

    validTypes.forEach((type) => {
      const scope: ChangeScope = {
        type: type as ChangeScope['type'],
        domain: 'test',
        summary: 'Test summary',
        files: ['file.ts'],
        impact: 'patch',
      };
      expect(scope.type).toBe(type);
    });
  });

  it('should have valid impact levels', () => {
    const validImpacts = ['major', 'minor', 'patch'];

    validImpacts.forEach((impact) => {
      const scope: ChangeScope = {
        type: 'feature',
        domain: 'test',
        summary: 'Test summary',
        files: ['file.ts'],
        impact: impact as ChangeScope['impact'],
      };
      expect(scope.impact).toBe(impact);
    });
  });

  it('should allow multiple files', () => {
    const scope: ChangeScope = {
      type: 'feature',
      domain: 'cortex',
      summary: 'Add new feature',
      files: ['file1.ts', 'file2.ts', 'file3.ts'],
      impact: 'minor',
    };
    expect(scope.files).toHaveLength(3);
  });
});

// ============================================================================
// COMMIT PLAN TYPE TESTS
// ============================================================================

describe('CommitPlan Type', () => {
  it('should create valid commit plans', () => {
    const plan: CommitPlan = {
      scope: {
        type: 'feature',
        domain: 'cortex',
        summary: 'Add agent system',
        files: ['agent.ts'],
        impact: 'minor',
      },
      message: 'feat(cortex): Add agent system',
      files: ['agent.ts'],
    };

    expect(plan.message).toContain('feat');
    expect(plan.files).toHaveLength(1);
  });

  it('should support optional branch name', () => {
    const plan: CommitPlan = {
      scope: {
        type: 'fix',
        domain: 'nexus',
        summary: 'Fix API error',
        files: ['api.ts'],
        impact: 'patch',
      },
      message: 'fix(nexus): Fix API error',
      files: ['api.ts'],
      branchName: 'fix/api-error',
    };

    expect(plan.branchName).toBe('fix/api-error');
  });

  it('should support PR creation flag', () => {
    const plan: CommitPlan = {
      scope: {
        type: 'feature',
        domain: 'web-app',
        summary: 'Add dashboard',
        files: ['Dashboard.tsx'],
        impact: 'minor',
      },
      message: 'feat(web-app): Add dashboard',
      files: ['Dashboard.tsx'],
      createPR: true,
    };

    expect(plan.createPR).toBe(true);
  });
});

// ============================================================================
// REPO CONFIG TYPE TESTS
// ============================================================================

describe('RepoAutoOrgConfig Type', () => {
  it('should have default config structure', () => {
    const defaultConfig: RepoAutoOrgConfig = {
      enabled: true,
      autoCommit: true,
      autoBranch: true,
      autoPR: false,
      minChangesForPR: 5,
      scopeDetectionEnabled: true,
      workspaceRoot: process.cwd(),
    };

    expect(defaultConfig.enabled).toBe(true);
    expect(defaultConfig.autoPR).toBe(false); // Off by default
    expect(defaultConfig.minChangesForPR).toBe(5);
  });

  it('should allow config customization', () => {
    const customConfig: Partial<RepoAutoOrgConfig> = {
      autoPR: true,
      minChangesForPR: 10,
    };

    const merged: RepoAutoOrgConfig = {
      enabled: true,
      autoCommit: true,
      autoBranch: true,
      autoPR: false,
      minChangesForPR: 5,
      scopeDetectionEnabled: true,
      workspaceRoot: '/workspace',
      ...customConfig,
    };

    expect(merged.autoPR).toBe(true);
    expect(merged.minChangesForPR).toBe(10);
  });
});

// ============================================================================
// REPO STATS TYPE TESTS
// ============================================================================

describe('RepoStats Type', () => {
  it('should track commit statistics', () => {
    const stats: RepoStats = {
      totalCommits: 10,
      totalBranches: 3,
      totalPRs: 2,
      changesByScope: {
        feature: 5,
        fix: 3,
        chore: 2,
      },
      lastCommitAt: new Date().toISOString(),
    };

    expect(stats.totalCommits).toBe(10);
    expect(stats.changesByScope.feature).toBe(5);
    expect(stats.lastCommitAt).toBeDefined();
  });

  it('should handle empty stats', () => {
    const emptyStats: RepoStats = {
      totalCommits: 0,
      totalBranches: 0,
      totalPRs: 0,
      changesByScope: {},
    };

    expect(emptyStats.totalCommits).toBe(0);
    expect(Object.keys(emptyStats.changesByScope)).toHaveLength(0);
    expect(emptyStats.lastCommitAt).toBeUndefined();
  });
});

// ============================================================================
// SCOPE DETECTION LOGIC TESTS
// ============================================================================

describe('Scope Detection Logic', () => {
  function detectScope(files: string[]): ChangeScope {
    const SCOPE_RULES = [
      { pattern: /src\/web-app\/.*\.jsx?$/, type: 'feature' as const, domain: 'web-app' },
      { pattern: /src\/cortex\/.*\.ts$/, type: 'feature' as const, domain: 'cortex' },
      { pattern: /src\/precog\/.*\.ts$/, type: 'feature' as const, domain: 'precog' },
      { pattern: /src\/nexus\/routes\/.*\.ts$/, type: 'feature' as const, domain: 'nexus' },
      { pattern: /src\/qa\/.*\.ts$/, type: 'fix' as const, domain: 'qa' },
      { pattern: /\.test\.(ts|tsx|js|jsx)$/, type: 'test' as const, domain: 'test' },
      { pattern: /package\.json$/, type: 'chore' as const, domain: 'deps' },
      { pattern: /docs\/.*\.md$/, type: 'docs' as const, domain: 'docs' },
      { pattern: /\.css$/, type: 'style' as const, domain: 'styles' },
      { pattern: /src\/core\/.*\.ts$/, type: 'refactor' as const, domain: 'core' },
    ];

    const scopeCounts: Record<string, number> = {};
    const domainCounts: Record<string, number> = {};

    for (const file of files) {
      for (const rule of SCOPE_RULES) {
        if (rule.pattern.test(file)) {
          scopeCounts[rule.type] = (scopeCounts[rule.type] || 0) + 1;
          domainCounts[rule.domain] = (domainCounts[rule.domain] || 0) + 1;
          break;
        }
      }
    }

    const dominantType =
      (Object.entries(scopeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] as ChangeScope['type']) ||
      'chore';

    const dominantDomain =
      Object.entries(domainCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'misc';

    let impact: ChangeScope['impact'] = 'patch';
    if (dominantType === 'feature' && files.length >= 3) {
      impact = 'minor';
    }

    return {
      type: dominantType,
      domain: dominantDomain,
      summary: `Update ${files.length} files`,
      files,
      impact,
    };
  }

  it('should detect feature scope for cortex files', () => {
    const scope = detectScope(['src/cortex/agent/executor.ts']);
    expect(scope.type).toBe('feature');
    expect(scope.domain).toBe('cortex');
  });

  it('should detect test scope for test files', () => {
    const scope = detectScope(['file.test.ts', 'other.test.tsx']);
    expect(scope.type).toBe('test');
    expect(scope.domain).toBe('test');
  });

  it('should detect chore scope for config files', () => {
    const scope = detectScope(['package.json']);
    expect(scope.type).toBe('chore');
    expect(scope.domain).toBe('deps');
  });

  it('should detect dominant scope in mixed files', () => {
    const scope = detectScope([
      'src/cortex/a.ts',
      'src/cortex/b.ts',
      'src/cortex/c.ts',
      'package.json',
    ]);
    expect(scope.type).toBe('feature');
    expect(scope.domain).toBe('cortex');
  });

  it('should default to chore for unknown files', () => {
    const scope = detectScope(['unknown-file.xyz']);
    expect(scope.type).toBe('chore');
    expect(scope.domain).toBe('misc');
  });

  it('should set minor impact for multiple feature files', () => {
    const scope = detectScope(['src/cortex/a.ts', 'src/cortex/b.ts', 'src/cortex/c.ts']);
    expect(scope.impact).toBe('minor');
  });

  it('should set patch impact for single files', () => {
    const scope = detectScope(['src/cortex/a.ts']);
    expect(scope.impact).toBe('patch');
  });
});

// ============================================================================
// SUMMARY GENERATION TESTS
// ============================================================================

describe('Summary Generation', () => {
  function generateSummary(type: ChangeScope['type'], domain: string, files: string[]): string {
    const path = { basename: (f: string) => f.split('/').pop() || f };
    const fileCount = files.length;
    const fileList = files
      .slice(0, 3)
      .map((f) => path.basename(f))
      .join(', ');
    const suffix = fileCount > 3 ? ` +${fileCount - 3} more` : '';

    switch (type) {
      case 'feature':
        return `Add ${domain} functionality (${fileList}${suffix})`;
      case 'fix':
        return `Fix ${domain} issues (${fileList}${suffix})`;
      case 'refactor':
        return `Refactor ${domain} (${fileList}${suffix})`;
      case 'docs':
        return `Update documentation (${fileList}${suffix})`;
      case 'test':
        return `Add/update tests (${fileList}${suffix})`;
      case 'style':
        return `Style updates (${fileList}${suffix})`;
      case 'chore':
      default:
        return `Maintenance: ${domain} (${fileList}${suffix})`;
    }
  }

  it('should generate feature summary', () => {
    const summary = generateSummary('feature', 'cortex', ['agent.ts']);
    expect(summary).toBe('Add cortex functionality (agent.ts)');
  });

  it('should generate fix summary', () => {
    const summary = generateSummary('fix', 'nexus', ['api.ts']);
    expect(summary).toBe('Fix nexus issues (api.ts)');
  });

  it('should generate docs summary', () => {
    const summary = generateSummary('docs', 'docs', ['README.md']);
    expect(summary).toBe('Update documentation (README.md)');
  });

  it('should generate test summary', () => {
    const summary = generateSummary('test', 'test', ['file.test.ts']);
    expect(summary).toBe('Add/update tests (file.test.ts)');
  });

  it('should truncate file list with suffix', () => {
    const summary = generateSummary('feature', 'cortex', ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts']);
    expect(summary).toContain('+2 more');
  });

  it('should handle multiple files without suffix', () => {
    const summary = generateSummary('feature', 'cortex', ['a.ts', 'b.ts', 'c.ts']);
    expect(summary).not.toContain('+');
  });
});

// ============================================================================
// FILE TRACKING FILTER TESTS
// ============================================================================

describe('File Tracking Filter', () => {
  function shouldTrackFile(filePath: string): boolean {
    if (filePath.includes('node_modules/')) return false;
    if (filePath.includes('.git/')) return false;
    if (filePath.includes('data/')) return false;
    if (filePath.includes('dist/')) return false;
    if (filePath.includes('coverage/')) return false;

    return /\.(ts|tsx|js|jsx|css|html|md|json)$/.test(filePath);
  }

  it('should track TypeScript files', () => {
    expect(shouldTrackFile('src/index.ts')).toBe(true);
    expect(shouldTrackFile('src/App.tsx')).toBe(true);
  });

  it('should track JavaScript files', () => {
    expect(shouldTrackFile('src/utils.js')).toBe(true);
    expect(shouldTrackFile('src/App.jsx')).toBe(true);
  });

  it('should track CSS files', () => {
    expect(shouldTrackFile('styles/main.css')).toBe(true);
  });

  it('should track HTML files', () => {
    expect(shouldTrackFile('public/index.html')).toBe(true);
  });

  it('should track Markdown files', () => {
    expect(shouldTrackFile('docs/README.md')).toBe(true);
  });

  it('should track JSON files', () => {
    expect(shouldTrackFile('package.json')).toBe(true);
    expect(shouldTrackFile('tsconfig.json')).toBe(true);
  });

  it('should not track node_modules', () => {
    expect(shouldTrackFile('node_modules/lodash/index.js')).toBe(false);
  });

  it('should not track .git files', () => {
    expect(shouldTrackFile('.git/config')).toBe(false);
  });

  it('should not track data directory', () => {
    expect(shouldTrackFile('data/cache.json')).toBe(false);
  });

  it('should not track dist directory', () => {
    expect(shouldTrackFile('dist/bundle.js')).toBe(false);
  });

  it('should not track coverage directory', () => {
    expect(shouldTrackFile('coverage/lcov.info')).toBe(false);
  });

  it('should not track unknown extensions', () => {
    expect(shouldTrackFile('file.exe')).toBe(false);
    expect(shouldTrackFile('image.png')).toBe(false);
    expect(shouldTrackFile('data.xml')).toBe(false);
  });
});

// ============================================================================
// BRANCH NAME SANITIZATION TESTS
// ============================================================================

describe('Branch Name Sanitization', () => {
  function sanitizeBranchName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-/]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  it('should convert to lowercase', () => {
    expect(sanitizeBranchName('Feature/NewStuff')).toBe('feature/newstuff');
  });

  it('should replace spaces with hyphens', () => {
    expect(sanitizeBranchName('my new branch')).toBe('my-new-branch');
  });

  it('should replace special characters with hyphens', () => {
    expect(sanitizeBranchName('feature@#$test')).toBe('feature-test');
  });

  it('should collapse multiple hyphens', () => {
    expect(sanitizeBranchName('feature---test')).toBe('feature-test');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(sanitizeBranchName('-feature-test-')).toBe('feature-test');
  });

  it('should preserve slashes', () => {
    expect(sanitizeBranchName('feature/new-thing')).toBe('feature/new-thing');
  });

  it('should handle complex names', () => {
    expect(sanitizeBranchName('Fix: API Endpoint #123!')).toBe('fix-api-endpoint-123');
  });
});

// ============================================================================
// PR BODY GENERATION TESTS
// ============================================================================

describe('PR Body Generation', () => {
  function generatePRBody(scope: ChangeScope): string {
    return `## Summary
${scope.summary}

## Type
- **Scope**: \`${scope.type}\`
- **Domain**: \`${scope.domain}\`
- **Impact**: \`${scope.impact}\`

## Files Changed
${scope.files.map((f) => `- \`${f}\``).join('\n')}

---
*Auto-generated by TooLoo RepoAutoOrg*`;
  }

  it('should include summary', () => {
    const body = generatePRBody({
      type: 'feature',
      domain: 'cortex',
      summary: 'Add new agent',
      files: ['agent.ts'],
      impact: 'minor',
    });
    expect(body).toContain('Add new agent');
  });

  it('should include scope type', () => {
    const body = generatePRBody({
      type: 'fix',
      domain: 'nexus',
      summary: 'Fix bug',
      files: ['api.ts'],
      impact: 'patch',
    });
    expect(body).toContain('`fix`');
  });

  it('should include domain', () => {
    const body = generatePRBody({
      type: 'feature',
      domain: 'web-app',
      summary: 'Add component',
      files: ['Button.tsx'],
      impact: 'minor',
    });
    expect(body).toContain('`web-app`');
  });

  it('should include impact level', () => {
    const body = generatePRBody({
      type: 'feature',
      domain: 'cortex',
      summary: 'Major change',
      files: ['big.ts'],
      impact: 'major',
    });
    expect(body).toContain('`major`');
  });

  it('should list all files', () => {
    const body = generatePRBody({
      type: 'feature',
      domain: 'cortex',
      summary: 'Add files',
      files: ['a.ts', 'b.ts', 'c.ts'],
      impact: 'minor',
    });
    expect(body).toContain('`a.ts`');
    expect(body).toContain('`b.ts`');
    expect(body).toContain('`c.ts`');
  });

  it('should include footer', () => {
    const body = generatePRBody({
      type: 'feature',
      domain: 'cortex',
      summary: 'Test',
      files: ['test.ts'],
      impact: 'patch',
    });
    expect(body).toContain('Auto-generated by TooLoo RepoAutoOrg');
  });
});

// ============================================================================
// ORGANIZATION PLAN GENERATION TESTS
// ============================================================================

describe('Organization Plan Generation', () => {
  function generateOrganizationPlan(description: string): OrganizationPlan {
    const cleanDesc = description.toLowerCase().trim();
    const words = cleanDesc.split(/\s+/).filter((w) => w.length > 2);

    let type: ChangeScope['type'] = 'feature';
    let domain = 'general';

    if (/fix|bug|error|issue|broken/.test(cleanDesc)) {
      type = 'fix';
    } else if (/refactor|clean|improve|optimize/.test(cleanDesc)) {
      type = 'refactor';
    } else if (/test|spec|coverage/.test(cleanDesc)) {
      type = 'test';
    } else if (/doc|readme|comment/.test(cleanDesc)) {
      type = 'docs';
    } else if (/style|css|ui|design/.test(cleanDesc)) {
      type = 'style';
    }

    if (/api|route|endpoint|server/.test(cleanDesc)) {
      domain = 'nexus';
    } else if (/brain|ai|model|llm|agent/.test(cleanDesc)) {
      domain = 'cortex';
    } else if (/ui|frontend|react|component/.test(cleanDesc)) {
      domain = 'web-app';
    } else if (/test|qa|quality/.test(cleanDesc)) {
      domain = 'qa';
    } else if (/predict|routing|provider/.test(cleanDesc)) {
      domain = 'precog';
    }

    const keyWords = words
      .filter((w) => !/^(the|a|an|is|are|to|for|with|and|or|in|on|at|by)$/.test(w))
      .slice(0, 4);
    const featureName = keyWords.join('-').replace(/[^a-z0-9-]/g, '');
    const branchName = `${type}/${featureName}`;

    return {
      featureName,
      branchName,
      suggestedStructure: [],
      commands: {
        createBranch: `git checkout -b ${branchName}`,
        stageFiles: 'git add .',
        commit: `git commit -m "${type}(${domain}): ${description.slice(0, 50)}"`,
      },
      scope: {
        type,
        domain,
        summary: description.slice(0, 100),
        files: [],
        impact: type === 'feature' ? 'minor' : 'patch',
      },
    };
  }

  it('should detect fix type from description', () => {
    const plan = generateOrganizationPlan('Fix the login bug');
    expect(plan.scope.type).toBe('fix');
  });

  it('should detect refactor type from description', () => {
    const plan = generateOrganizationPlan('Refactor the database layer');
    expect(plan.scope.type).toBe('refactor');
  });

  it('should detect test type from description', () => {
    const plan = generateOrganizationPlan('Add unit tests for API');
    expect(plan.scope.type).toBe('test');
  });

  it('should detect docs type from description', () => {
    const plan = generateOrganizationPlan('Update documentation');
    expect(plan.scope.type).toBe('docs');
  });

  it('should detect cortex domain', () => {
    const plan = generateOrganizationPlan('Add new AI agent');
    expect(plan.scope.domain).toBe('cortex');
  });

  it('should detect nexus domain', () => {
    const plan = generateOrganizationPlan('Create new API endpoint');
    expect(plan.scope.domain).toBe('nexus');
  });

  it('should detect web-app domain', () => {
    const plan = generateOrganizationPlan('Build React component');
    expect(plan.scope.domain).toBe('web-app');
  });

  it('should generate valid branch name', () => {
    const plan = generateOrganizationPlan('Add new feature');
    expect(plan.branchName).toMatch(/^feature\//);
  });

  it('should generate git commands', () => {
    const plan = generateOrganizationPlan('Fix login issue');
    expect(plan.commands.createBranch).toContain('git checkout -b');
    expect(plan.commands.commit).toContain('git commit');
  });

  it('should strip common words from feature name', () => {
    const plan = generateOrganizationPlan('Add the new feature for users');
    expect(plan.featureName).not.toContain('the');
    expect(plan.featureName).not.toContain('for');
  });

  it('should set minor impact for features', () => {
    const plan = generateOrganizationPlan('Add new dashboard feature');
    expect(plan.scope.impact).toBe('minor');
  });

  it('should set patch impact for fixes', () => {
    const plan = generateOrganizationPlan('Fix small bug');
    expect(plan.scope.impact).toBe('patch');
  });
});

// ============================================================================
// SUGGESTED STRUCTURE TESTS
// ============================================================================

describe('Suggested Structure Generation', () => {
  function generateSuggestedStructure(
    domain: string,
    featureName: string,
    type: ChangeScope['type']
  ): { path: string; type: 'file' | 'directory'; purpose: string }[] {
    const structure: { path: string; type: 'file' | 'directory'; purpose: string }[] = [];

    switch (domain) {
      case 'nexus':
        structure.push(
          {
            path: `src/nexus/routes/${featureName}.ts`,
            type: 'file',
            purpose: 'API route handlers',
          },
          { path: `tests/unit/nexus/${featureName}.test.ts`, type: 'file', purpose: 'Unit tests' }
        );
        break;
      case 'cortex':
        structure.push(
          { path: `src/cortex/${featureName}/`, type: 'directory', purpose: 'Feature module' },
          {
            path: `src/cortex/${featureName}/index.ts`,
            type: 'file',
            purpose: 'Main module entry',
          },
          { path: `tests/unit/cortex/${featureName}.test.ts`, type: 'file', purpose: 'Unit tests' }
        );
        break;
      case 'web-app':
        structure.push(
          {
            path: `src/web-app/src/components/${featureName}/`,
            type: 'directory',
            purpose: 'Component folder',
          },
          {
            path: `src/web-app/src/components/${featureName}/${featureName}.tsx`,
            type: 'file',
            purpose: 'React component',
          },
          {
            path: `src/web-app/src/components/${featureName}/${featureName}.stories.tsx`,
            type: 'file',
            purpose: 'Storybook stories',
          }
        );
        break;
      case 'qa':
        structure.push(
          { path: `src/qa/${featureName}.ts`, type: 'file', purpose: 'QA module' },
          { path: `tests/unit/qa/${featureName}.test.ts`, type: 'file', purpose: 'Unit tests' }
        );
        break;
      case 'precog':
        structure.push(
          { path: `src/precog/${featureName}.ts`, type: 'file', purpose: 'Prediction module' },
          { path: `tests/unit/precog/${featureName}.test.ts`, type: 'file', purpose: 'Unit tests' }
        );
        break;
      default:
        structure.push(
          {
            path: `src/${domain}/${featureName}.ts`,
            type: 'file',
            purpose: 'Feature implementation',
          },
          { path: `tests/unit/${featureName}.test.ts`, type: 'file', purpose: 'Unit tests' }
        );
    }

    if (type === 'feature') {
      structure.push({
        path: `docs/${featureName}.md`,
        type: 'file',
        purpose: 'Feature documentation',
      });
    }

    return structure;
  }

  it('should generate nexus structure', () => {
    const structure = generateSuggestedStructure('nexus', 'auth', 'feature');
    expect(structure.some((s) => s.path.includes('src/nexus/routes/'))).toBe(true);
    expect(structure.some((s) => s.path.includes('tests/unit/nexus/'))).toBe(true);
  });

  it('should generate cortex structure with directory', () => {
    const structure = generateSuggestedStructure('cortex', 'agent', 'feature');
    expect(structure.some((s) => s.type === 'directory')).toBe(true);
    expect(structure.some((s) => s.path.includes('index.ts'))).toBe(true);
  });

  it('should generate web-app structure with component files', () => {
    const structure = generateSuggestedStructure('web-app', 'button', 'feature');
    expect(structure.some((s) => s.path.includes('.tsx'))).toBe(true);
    expect(structure.some((s) => s.path.includes('.stories.tsx'))).toBe(true);
  });

  it('should generate qa structure', () => {
    const structure = generateSuggestedStructure('qa', 'validator', 'fix');
    expect(structure.some((s) => s.path.includes('src/qa/'))).toBe(true);
  });

  it('should generate precog structure', () => {
    const structure = generateSuggestedStructure('precog', 'router', 'feature');
    expect(structure.some((s) => s.path.includes('src/precog/'))).toBe(true);
  });

  it('should add docs for features', () => {
    const structure = generateSuggestedStructure('nexus', 'api', 'feature');
    expect(structure.some((s) => s.path.includes('docs/'))).toBe(true);
  });

  it('should not add docs for fixes', () => {
    const structure = generateSuggestedStructure('nexus', 'api', 'fix');
    expect(structure.some((s) => s.path.includes('docs/'))).toBe(false);
  });

  it('should use default structure for unknown domains', () => {
    const structure = generateSuggestedStructure('custom', 'feature', 'feature');
    expect(structure.some((s) => s.path.includes('src/custom/'))).toBe(true);
  });

  it('should include test files for all domains', () => {
    const domains = ['nexus', 'cortex', 'web-app', 'qa', 'precog', 'custom'];
    domains.forEach((domain) => {
      const structure = generateSuggestedStructure(domain, 'test', 'feature');
      expect(
        structure.some((s) => s.path.includes('.test.ts') || s.path.includes('.stories.tsx'))
      ).toBe(true);
    });
  });
});

// ============================================================================
// COMMIT MESSAGE FORMAT TESTS
// ============================================================================

describe('Commit Message Format', () => {
  function formatCommitMessage(scope: ChangeScope): string {
    return `${scope.type}(${scope.domain}): ${scope.summary}`;
  }

  it('should format feature commits', () => {
    const message = formatCommitMessage({
      type: 'feature',
      domain: 'cortex',
      summary: 'Add new agent',
      files: [],
      impact: 'minor',
    });
    expect(message).toBe('feature(cortex): Add new agent');
  });

  it('should format fix commits', () => {
    const message = formatCommitMessage({
      type: 'fix',
      domain: 'nexus',
      summary: 'Fix API error',
      files: [],
      impact: 'patch',
    });
    expect(message).toBe('fix(nexus): Fix API error');
  });

  it('should format chore commits', () => {
    const message = formatCommitMessage({
      type: 'chore',
      domain: 'deps',
      summary: 'Update dependencies',
      files: [],
      impact: 'patch',
    });
    expect(message).toBe('chore(deps): Update dependencies');
  });

  it('should format refactor commits', () => {
    const message = formatCommitMessage({
      type: 'refactor',
      domain: 'core',
      summary: 'Clean up event bus',
      files: [],
      impact: 'patch',
    });
    expect(message).toBe('refactor(core): Clean up event bus');
  });
});

// ============================================================================
// PENDING CHANGES MANAGEMENT TESTS
// ============================================================================

describe('Pending Changes Management', () => {
  it('should store pending changes with timestamps', () => {
    const pendingChanges = new Map<string, { path: string; timestamp: number }>();
    const now = Date.now();

    pendingChanges.set('file1.ts', { path: 'file1.ts', timestamp: now });
    pendingChanges.set('file2.ts', { path: 'file2.ts', timestamp: now + 100 });

    expect(pendingChanges.size).toBe(2);
    expect(pendingChanges.get('file1.ts')?.timestamp).toBe(now);
  });

  it('should update timestamp on re-track', () => {
    const pendingChanges = new Map<string, { path: string; timestamp: number }>();
    const oldTime = Date.now() - 1000;
    const newTime = Date.now();

    pendingChanges.set('file.ts', { path: 'file.ts', timestamp: oldTime });
    pendingChanges.set('file.ts', { path: 'file.ts', timestamp: newTime });

    expect(pendingChanges.get('file.ts')?.timestamp).toBe(newTime);
  });

  it('should clear pending changes', () => {
    const pendingChanges = new Map<string, { path: string; timestamp: number }>();
    pendingChanges.set('file.ts', { path: 'file.ts', timestamp: Date.now() });

    pendingChanges.clear();

    expect(pendingChanges.size).toBe(0);
  });

  it('should get pending file paths', () => {
    const pendingChanges = new Map<string, { path: string; timestamp: number }>();
    pendingChanges.set('a.ts', { path: 'a.ts', timestamp: Date.now() });
    pendingChanges.set('b.ts', { path: 'b.ts', timestamp: Date.now() });

    const paths = Array.from(pendingChanges.values()).map((c) => c.path);

    expect(paths).toContain('a.ts');
    expect(paths).toContain('b.ts');
    expect(paths).toHaveLength(2);
  });
});
