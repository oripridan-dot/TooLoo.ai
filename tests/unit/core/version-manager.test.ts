/**
 * Version Manager Test Suite
 * @version 3.3.510
 *
 * Tests for the version management system including:
 * - Version interface and formatting
 * - File tagging with @version
 * - Git operations (branch, commit, tag)
 * - shouldTrackFile logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Version {
  major: number;
  minor: number;
  patch: number;
}

interface TaggedFile {
  path: string;
  line: number;
  version: string;
  needsUpdate: boolean;
}

// ============================================================================
// VERSION UTILITIES
// ============================================================================

function formatVersion(version: Version): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function parseVersion(versionString: string): Version | null {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function incrementVersion(version: Version, type: 'major' | 'minor' | 'patch'): Version {
  switch (type) {
    case 'major':
      return { major: version.major + 1, minor: 0, patch: 0 };
    case 'minor':
      return { major: version.major, minor: version.minor + 1, patch: 0 };
    case 'patch':
      return { major: version.major, minor: version.minor, patch: version.patch + 1 };
  }
}

function compareVersions(a: Version, b: Version): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

// File tracking utilities
const TRACKABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];
const IGNORED_PATTERNS = ['node_modules', '.git', 'dist', 'build', 'coverage'];

function shouldTrackFile(filePath: string): boolean {
  // Check if in ignored directory
  if (IGNORED_PATTERNS.some((pattern) => filePath.includes(pattern))) {
    return false;
  }

  // Check extension
  return TRACKABLE_EXTENSIONS.some((ext) => filePath.endsWith(ext));
}

function extractVersionTag(content: string): { version: string; line: number } | null {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/@version\s+(\d+\.\d+\.\d+)/);
    if (match) {
      return { version: match[1], line: i + 1 };
    }
  }
  return null;
}

function updateVersionTag(content: string, newVersion: string): string {
  return content.replace(/@version\s+\d+\.\d+\.\d+/, `@version ${newVersion}`);
}

// ============================================================================
// VERSION INTERFACE TESTS
// ============================================================================

describe('Version Interface', () => {
  it('should create version with major, minor, patch', () => {
    const version: Version = { major: 3, minor: 3, patch: 510 };
    expect(version.major).toBe(3);
    expect(version.minor).toBe(3);
    expect(version.patch).toBe(510);
  });

  it('should support zero values', () => {
    const version: Version = { major: 0, minor: 0, patch: 0 };
    expect(version.major).toBe(0);
    expect(version.minor).toBe(0);
    expect(version.patch).toBe(0);
  });

  it('should support large patch numbers', () => {
    const version: Version = { major: 1, minor: 0, patch: 9999 };
    expect(version.patch).toBe(9999);
  });
});

// ============================================================================
// FORMAT VERSION TESTS
// ============================================================================

describe('formatVersion', () => {
  it('should format standard version', () => {
    const version: Version = { major: 3, minor: 3, patch: 510 };
    expect(formatVersion(version)).toBe('3.3.510');
  });

  it('should format zero version', () => {
    const version: Version = { major: 0, minor: 0, patch: 0 };
    expect(formatVersion(version)).toBe('0.0.0');
  });

  it('should format single digits', () => {
    const version: Version = { major: 1, minor: 2, patch: 3 };
    expect(formatVersion(version)).toBe('1.2.3');
  });

  it('should format mixed digit lengths', () => {
    const version: Version = { major: 10, minor: 0, patch: 100 };
    expect(formatVersion(version)).toBe('10.0.100');
  });
});

// ============================================================================
// PARSE VERSION TESTS
// ============================================================================

describe('parseVersion', () => {
  it('should parse valid version string', () => {
    const version = parseVersion('3.3.510');
    expect(version).toEqual({ major: 3, minor: 3, patch: 510 });
  });

  it('should return null for invalid format', () => {
    expect(parseVersion('invalid')).toBeNull();
    expect(parseVersion('1.2')).toBeNull();
    expect(parseVersion('1.2.3.4')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseVersion('')).toBeNull();
  });

  it('should parse leading zeros correctly', () => {
    const version = parseVersion('0.0.1');
    expect(version).toEqual({ major: 0, minor: 0, patch: 1 });
  });
});

// ============================================================================
// INCREMENT VERSION TESTS
// ============================================================================

describe('incrementVersion', () => {
  const baseVersion: Version = { major: 1, minor: 2, patch: 3 };

  it('should increment patch', () => {
    const result = incrementVersion(baseVersion, 'patch');
    expect(result).toEqual({ major: 1, minor: 2, patch: 4 });
  });

  it('should increment minor and reset patch', () => {
    const result = incrementVersion(baseVersion, 'minor');
    expect(result).toEqual({ major: 1, minor: 3, patch: 0 });
  });

  it('should increment major and reset minor and patch', () => {
    const result = incrementVersion(baseVersion, 'major');
    expect(result).toEqual({ major: 2, minor: 0, patch: 0 });
  });

  it('should not modify original version', () => {
    incrementVersion(baseVersion, 'patch');
    expect(baseVersion.patch).toBe(3);
  });
});

// ============================================================================
// COMPARE VERSIONS TESTS
// ============================================================================

describe('compareVersions', () => {
  it('should return 0 for equal versions', () => {
    const a: Version = { major: 1, minor: 2, patch: 3 };
    const b: Version = { major: 1, minor: 2, patch: 3 };
    expect(compareVersions(a, b)).toBe(0);
  });

  it('should compare major versions', () => {
    const a: Version = { major: 2, minor: 0, patch: 0 };
    const b: Version = { major: 1, minor: 9, patch: 9 };
    expect(compareVersions(a, b)).toBeGreaterThan(0);
    expect(compareVersions(b, a)).toBeLessThan(0);
  });

  it('should compare minor versions when major equal', () => {
    const a: Version = { major: 1, minor: 3, patch: 0 };
    const b: Version = { major: 1, minor: 2, patch: 9 };
    expect(compareVersions(a, b)).toBeGreaterThan(0);
  });

  it('should compare patch versions when major and minor equal', () => {
    const a: Version = { major: 1, minor: 2, patch: 4 };
    const b: Version = { major: 1, minor: 2, patch: 3 };
    expect(compareVersions(a, b)).toBeGreaterThan(0);
  });
});

// ============================================================================
// SHOULD TRACK FILE TESTS
// ============================================================================

describe('shouldTrackFile', () => {
  describe('valid extensions', () => {
    it('should track TypeScript files', () => {
      expect(shouldTrackFile('src/app.ts')).toBe(true);
      expect(shouldTrackFile('src/component.tsx')).toBe(true);
    });

    it('should track JavaScript files', () => {
      expect(shouldTrackFile('src/app.js')).toBe(true);
      expect(shouldTrackFile('src/component.jsx')).toBe(true);
    });

    it('should track Vue files', () => {
      expect(shouldTrackFile('src/Component.vue')).toBe(true);
    });

    it('should track Svelte files', () => {
      expect(shouldTrackFile('src/App.svelte')).toBe(true);
    });
  });

  describe('ignored directories', () => {
    it('should not track node_modules', () => {
      expect(shouldTrackFile('node_modules/package/index.ts')).toBe(false);
    });

    it('should not track .git directory', () => {
      expect(shouldTrackFile('.git/hooks/pre-commit')).toBe(false);
    });

    it('should not track dist directory', () => {
      expect(shouldTrackFile('dist/bundle.js')).toBe(false);
    });

    it('should not track build directory', () => {
      expect(shouldTrackFile('build/output.js')).toBe(false);
    });

    it('should not track coverage directory', () => {
      expect(shouldTrackFile('coverage/lcov.info')).toBe(false);
    });
  });

  describe('non-trackable files', () => {
    it('should not track JSON files', () => {
      expect(shouldTrackFile('package.json')).toBe(false);
    });

    it('should not track CSS files', () => {
      expect(shouldTrackFile('styles/main.css')).toBe(false);
    });

    it('should not track markdown files', () => {
      expect(shouldTrackFile('README.md')).toBe(false);
    });
  });
});

// ============================================================================
// TAGGED FILE TESTS
// ============================================================================

describe('TaggedFile', () => {
  it('should create tagged file record', () => {
    const tagged: TaggedFile = {
      path: 'src/index.ts',
      line: 3,
      version: '3.3.510',
      needsUpdate: false,
    };
    expect(tagged.path).toBe('src/index.ts');
    expect(tagged.line).toBe(3);
    expect(tagged.version).toBe('3.3.510');
    expect(tagged.needsUpdate).toBe(false);
  });

  it('should mark file needing update', () => {
    const tagged: TaggedFile = {
      path: 'src/old.ts',
      line: 5,
      version: '2.0.0',
      needsUpdate: true,
    };
    expect(tagged.needsUpdate).toBe(true);
  });
});

// ============================================================================
// EXTRACT VERSION TAG TESTS
// ============================================================================

describe('extractVersionTag', () => {
  it('should extract version from JSDoc comment', () => {
    const content = `/**
 * Module description
 * @version 3.3.510
 */
export function test() {}`;

    const result = extractVersionTag(content);
    expect(result).toEqual({ version: '3.3.510', line: 3 });
  });

  it('should extract version from single line comment', () => {
    const content = `// @version 3.3.573
export const x = 1;`;

    const result = extractVersionTag(content);
    expect(result).toEqual({ version: '1.0.0', line: 1 });
  });

  it('should return null when no version tag', () => {
    const content = `export function test() {}`;
    expect(extractVersionTag(content)).toBeNull();
  });

  it('should find first version tag', () => {
    const content = `// @version 1.0.0
// @version 2.0.0`;

    const result = extractVersionTag(content);
    expect(result?.version).toBe('1.0.0');
  });
});

// ============================================================================
// UPDATE VERSION TAG TESTS
// ============================================================================

describe('updateVersionTag', () => {
  it('should update version in content', () => {
    const content = `/**
 * @version 1.0.0
 */`;

    const result = updateVersionTag(content, '2.0.0');
    expect(result).toContain('@version 2.0.0');
    expect(result).not.toContain('@version 1.0.0');
  });

  it('should preserve other content', () => {
    const content = `/**
 * Module
 * @version 1.0.0
 * @author Test
 */
export const x = 1;`;

    const result = updateVersionTag(content, '2.0.0');
    expect(result).toContain('Module');
    expect(result).toContain('@author Test');
    expect(result).toContain('export const x = 1;');
  });
});

// ============================================================================
// GIT OPERATIONS TESTS
// ============================================================================

describe('Git Operations', () => {
  describe('branch naming', () => {
    it('should format release branch names', () => {
      const version: Version = { major: 3, minor: 3, patch: 510 };
      const branchName = `release/v${formatVersion(version)}`;
      expect(branchName).toBe('release/v3.3.510');
    });

    it('should format feature branch names', () => {
      const version: Version = { major: 3, minor: 4, patch: 0 };
      const branchName = `feature/v${formatVersion(version)}`;
      expect(branchName).toBe('feature/v3.4.0');
    });
  });

  describe('tag naming', () => {
    it('should format version tag', () => {
      const version: Version = { major: 3, minor: 3, patch: 510 };
      const tag = `v${formatVersion(version)}`;
      expect(tag).toBe('v3.3.510');
    });
  });

  describe('commit message', () => {
    it('should format version bump commit', () => {
      const version: Version = { major: 3, minor: 3, patch: 510 };
      const message = `chore: bump version to ${formatVersion(version)}`;
      expect(message).toBe('chore: bump version to 3.3.510');
    });

    it('should format release commit', () => {
      const version: Version = { major: 3, minor: 3, patch: 510 };
      const message = `release: v${formatVersion(version)}`;
      expect(message).toBe('release: v3.3.510');
    });
  });
});

// ============================================================================
// VERSION HISTORY TESTS
// ============================================================================

describe('Version History', () => {
  it('should sort versions chronologically', () => {
    const versions: Version[] = [
      { major: 1, minor: 2, patch: 0 },
      { major: 1, minor: 0, patch: 0 },
      { major: 2, minor: 0, patch: 0 },
      { major: 1, minor: 1, patch: 0 },
    ];

    const sorted = [...versions].sort(compareVersions);

    expect(formatVersion(sorted[0])).toBe('1.0.0');
    expect(formatVersion(sorted[1])).toBe('1.1.0');
    expect(formatVersion(sorted[2])).toBe('1.2.0');
    expect(formatVersion(sorted[3])).toBe('2.0.0');
  });

  it('should find latest version', () => {
    const versions: Version[] = [
      { major: 3, minor: 3, patch: 500 },
      { major: 3, minor: 3, patch: 510 },
      { major: 3, minor: 3, patch: 505 },
    ];

    const latest = versions.reduce((a, b) => (compareVersions(a, b) > 0 ? a : b));

    expect(formatVersion(latest)).toBe('3.3.510');
  });
});

// ============================================================================
// DEBOUNCE BEHAVIOR TESTS
// ============================================================================

describe('Debounce Behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce rapid updates', async () => {
    const updateFn = vi.fn();
    let timeout: NodeJS.Timeout | null = null;
    const debounceMs = 5000;

    const debouncedUpdate = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(updateFn, debounceMs);
    };

    // Rapid calls
    debouncedUpdate();
    debouncedUpdate();
    debouncedUpdate();

    expect(updateFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);

    expect(updateFn).toHaveBeenCalledTimes(1);
  });

  it('should call immediately after debounce period', () => {
    const updateFn = vi.fn();
    let timeout: NodeJS.Timeout | null = null;
    const debounceMs = 5000;

    const debouncedUpdate = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(updateFn, debounceMs);
    };

    debouncedUpdate();
    vi.advanceTimersByTime(5000);
    expect(updateFn).toHaveBeenCalledTimes(1);

    debouncedUpdate();
    vi.advanceTimersByTime(5000);
    expect(updateFn).toHaveBeenCalledTimes(2);
  });
});

// ============================================================================
// EXTENSION PATTERNS TESTS
// ============================================================================

describe('Trackable Extensions', () => {
  it('should include TypeScript extensions', () => {
    expect(TRACKABLE_EXTENSIONS).toContain('.ts');
    expect(TRACKABLE_EXTENSIONS).toContain('.tsx');
  });

  it('should include JavaScript extensions', () => {
    expect(TRACKABLE_EXTENSIONS).toContain('.js');
    expect(TRACKABLE_EXTENSIONS).toContain('.jsx');
  });

  it('should include framework extensions', () => {
    expect(TRACKABLE_EXTENSIONS).toContain('.vue');
    expect(TRACKABLE_EXTENSIONS).toContain('.svelte');
  });
});

// ============================================================================
// IGNORED PATTERNS TESTS
// ============================================================================

describe('Ignored Patterns', () => {
  it('should include node_modules', () => {
    expect(IGNORED_PATTERNS).toContain('node_modules');
  });

  it('should include .git', () => {
    expect(IGNORED_PATTERNS).toContain('.git');
  });

  it('should include build directories', () => {
    expect(IGNORED_PATTERNS).toContain('dist');
    expect(IGNORED_PATTERNS).toContain('build');
  });

  it('should include coverage', () => {
    expect(IGNORED_PATTERNS).toContain('coverage');
  });
});
