// @version 2.2.201
/**
 * Legacy Hunter - Dead Code and Technical Debt Detection
 *
 * Finds and tracks:
 * - TODO/FIXME markers
 * - Dead exports (never imported)
 * - Deprecated component usage
 * - Legacy code patterns
 *
 * Uses Essential Files Registry to focus on files that matter.
 *
 * @module qa/hygiene/legacy-hunter
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { TODOItem, DeadExport, DeprecatedUsage, LegacyReport } from '../types/index.js';
import { shouldExcludeFile } from '../registry/index.js';

/**
 * LegacyHunter - Tracks and manages technical debt
 */
export class LegacyHunter {
  private projectRoot: string;
  private lastReport: LegacyReport | null = null;
  private legacyMapPath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.legacyMapPath = path.join(projectRoot, 'src/cortex/legacy-map.json');
  }

  /**
   * Run all legacy detection scans
   */
  async runAllScans(): Promise<LegacyReport> {
    console.log('[LegacyHunter] 🔍 Starting legacy detection...');

    const [todos, deadExports, deprecatedUsage] = await Promise.all([
      this.findTODOs(),
      this.findDeadExports(),
      this.checkDeprecatedUsage(),
    ]);

    const recommendations = this.generateRecommendations(todos, deadExports, deprecatedUsage);

    // Group TODOs by type
    const byType: Record<string, number> = {};
    for (const todo of todos) {
      byType[todo.type] = (byType[todo.type] || 0) + 1;
    }

    const report: LegacyReport = {
      timestamp: new Date().toISOString(),
      todos: {
        count: todos.length,
        items: todos,
        byType,
      },
      deadExports: {
        count: deadExports.length,
        items: deadExports,
      },
      deprecatedUsage: {
        count: deprecatedUsage.length,
        items: deprecatedUsage,
      },
      recommendations,
    };

    this.lastReport = report;

    console.log(
      `[LegacyHunter] ✅ Legacy scan complete: ${todos.length} TODOs, ${deadExports.length} dead exports, ${deprecatedUsage.length} deprecated`
    );

    return report;
  }

  /**
   * Find all TODO/FIXME markers in codebase
   * Only checks essential files per registry
   */
  async findTODOs(): Promise<TODOItem[]> {
    const todos: TODOItem[] = [];
    const allFiles = await glob('src/**/*.{ts,tsx,js,jsx}', {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**'],
    });

    // Filter to essential files only
    const files = allFiles.filter((file) => !shouldExcludeFile(file));

    const todoRegex =
      /\/\/\s*(TODO|FIXME|HACK|XXX)\s*:?\s*(.+?)(?:\s*-\s*(\w+))?(?:\s*\(([^)]+)\))?$/gim;

    for (const file of files) {
      const fullPath = path.join(this.projectRoot, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const matches = [...line.matchAll(todoRegex)];
        for (const match of matches) {
          if (!match[1] || !match[2]) continue;
          todos.push({
            file,
            line: index + 1,
            type: match[1].toUpperCase() as TODOItem['type'],
            message: match[2].trim(),
            author: match[3],
            date: match[4],
          });
        }
      });
    }

    // Sort by type priority: FIXME > HACK > TODO > XXX
    const priority = { FIXME: 0, HACK: 1, TODO: 2, XXX: 3 };
    todos.sort((a, b) => priority[a.type] - priority[b.type]);

    return todos;
  }

  /**
   * Find exports that are never imported
   * Only checks essential files per registry
   */
  async findDeadExports(): Promise<DeadExport[]> {
    const deadExports: DeadExport[] = [];
    const allFiles = await glob('src/**/*.ts', {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**', '**/*.test.ts', '**/*.d.ts', '**/types/**'],
    });

    // Filter to essential files only
    const files = allFiles.filter((file) => !shouldExcludeFile(file));

    // Collect all exports
    const allExports: Map<string, DeadExport> = new Map();

    // Collect all imports
    const allImports: Set<string> = new Set();

    for (const file of files) {
      const fullPath = path.join(this.projectRoot, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      // Track if we're inside a template literal (backtick string)
      let inTemplateLiteral = false;

      // Find exports
      lines.forEach((line, index) => {
        // Simple template literal tracking: count backticks
        const backtickCount = (line.match(/`/g) || []).length;
        // If we see an odd number of backticks, toggle state
        if (backtickCount % 2 === 1) {
          inTemplateLiteral = !inTemplateLiteral;
        }

        // Skip export detection if inside template literal
        if (inTemplateLiteral) return;

        // Named exports: export { foo, bar }
        const namedMatch = line.match(/export\s+\{\s*([^}]+)\s*\}/);
        if (namedMatch && namedMatch[1]) {
          const names = namedMatch[1].split(',').map((n) => n.trim().split(' ')[0] ?? '');
          names.forEach((name) => {
            allExports.set(`${file}:${name}`, {
              file,
              exportName: name,
              exportType: 'const',
              line: index + 1,
            });
          });
        }

        // Direct exports: export function/class/const/type/interface
        const directMatch = line.match(
          /export\s+(function|class|const|let|type|interface)\s+(\w+)/
        );
        if (directMatch && directMatch[1] && directMatch[2]) {
          allExports.set(`${file}:${directMatch[2]}`, {
            file,
            exportName: directMatch[2],
            exportType: directMatch[1] as DeadExport['exportType'],
            line: index + 1,
          });
        }

        // Default exports: export default
        if (line.match(/export\s+default/)) {
          allExports.set(`${file}:default`, {
            file,
            exportName: 'default',
            exportType: 'const',
            line: index + 1,
          });
        }
      });

      // Find imports
      const importMatches = content.matchAll(/import\s+(?:\{([^}]+)\}|(\w+))\s+from/g);
      for (const match of importMatches) {
        if (match[1]) {
          // Named imports
          const names = match[1].split(',').map((n) => {
            const parts = n.trim().split(/\s+as\s+/);
            return parts[0]?.trim() ?? '';
          });
          names.forEach((name) => allImports.add(name));
        }
        if (match[2]) {
          // Default import
          allImports.add(match[2]);
        }
      }
    }

    // Find exports that are not imported
    // Exclude intentional public API exports that are meant for external use
    const intentionalPublicAPI = new Set([
      // Core utilities meant for future use
      'withTimeout',
      'createTimeoutWrapper',
      'executeWithTimeout',
      'timeoutManager',
      'withMetadata',
      'successResponse',
      'errorResponse',
      'PIIScrubber',
      'chaosMiddleware',
      'circuitBreaker',
      'execCommandSync',
      'spawnWithTimeout',
      'commandRunner',
      // Registry utilities for extensibility
      'isEssentialDirectory',
      'getFilePriority',
      'REGISTRY_STATS',
      // Provider interfaces for extensibility
      'ProviderConfig',
      'DesignProvider',
      'ContextAwareImageProvider',
      // Store hooks for component use
      'useVisualStore',
      'useThemeStore',
      // Validation framework
      'createValidationFramework',
      // Singleton instances (getInstance() pattern used, but singletons exported for convenience)
      'discoverAgent',
      'critic',
      'featureValidator',
      'serendipityInjector',
      'reinforcementLearner',
      'emergenceCoordinator',
      'emergenceAmplifier',
      'workspaceCloner',
      // Config type exports
      'Config',
      // QA validation and fuzzing classes (used via scripts)
      'ContractFuzzer',
      'ContractToolProvider',
      // Creative engine type exports for external consumers
      'getAvailableExamples',
      'ChartPalette',
      'TimingPreset',
      // Curiosity engine types
      'CognitiveDissonance',
      // Agent system types (part of public type API)
      'ArtifactVersion',
      'ProcessDefinition',
      'AgentState',
      'ExecutionContext',
      'AgentEvent',
      'CodeTemplate',
      'CodePattern',
    ]);

    for (const exp of allExports.values()) {
      // Skip index files (re-exports)
      if (exp.file.endsWith('/index.ts')) continue;

      // Skip intentional public API
      if (intentionalPublicAPI.has(exp.exportName)) continue;

      // Skip if the export name is imported somewhere
      if (!allImports.has(exp.exportName) && exp.exportName !== 'default') {
        // Additional check: ensure it's not used in the same file
        const content = await fs.readFile(path.join(this.projectRoot, exp.file), 'utf-8');
        const usageRegex = new RegExp(`\\b${exp.exportName}\\b`, 'g');
        const usages = (content.match(usageRegex) || []).length;

        // If only used once (the export itself), it's dead
        if (usages <= 1) {
          deadExports.push(exp);
        }
      }
    }

    return deadExports;
  }

  /**
   * Check for deprecated component usage
   */
  async checkDeprecatedUsage(): Promise<DeprecatedUsage[]> {
    const deprecatedUsages: DeprecatedUsage[] = [];

    // Check if legacy-map.json exists
    if (!(await fs.pathExists(this.legacyMapPath))) {
      return deprecatedUsages;
    }

    interface LegacyMapEntry {
      status: string;
      deprecatedIn?: string;
      replacement?: string;
    }

    const legacyMap: Record<string, LegacyMapEntry> = await fs.readJson(this.legacyMapPath);
    const deprecatedComponents = Object.entries(legacyMap).filter(
      ([, info]) => info.status === 'deprecated'
    );

    if (deprecatedComponents.length === 0) {
      return deprecatedUsages;
    }

    // Scan source files for deprecated usage
    const files = await glob('src/**/*.ts', {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**', '**/*.test.ts'],
    });

    for (const file of files) {
      const fullPath = path.join(this.projectRoot, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      for (const [component, info] of deprecatedComponents) {
        const regex = new RegExp(`\\b${component}\\b`, 'g');

        lines.forEach((line, index) => {
          if (regex.test(line)) {
            deprecatedUsages.push({
              file,
              component,
              line: index + 1,
              deprecatedIn: info.deprecatedIn || 'unknown',
              replacement: info.replacement,
            });
          }
        });
      }
    }

    return deprecatedUsages;
  }

  /**
   * Find legacy patterns in code
   */
  async findLegacyPatterns(): Promise<Array<{ file: string; pattern: string; line: number }>> {
    const patterns: Array<{ file: string; pattern: string; line: number }> = [];
    const files = await glob('src/**/*.ts', {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**'],
    });

    const legacyPatterns = [
      { regex: /require\s*\(/, name: 'CommonJS require' },
      { regex: /module\.exports/, name: 'CommonJS exports' },
      { regex: /\bvar\s+/, name: 'var declaration' },
      { regex: /\/\/ @ts-ignore/, name: 'TypeScript ignore' },
      { regex: /any\s*[;,)]/, name: 'Explicit any type' },
    ];

    for (const file of files) {
      const fullPath = path.join(this.projectRoot, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const { regex, name } of legacyPatterns) {
          if (regex.test(line)) {
            patterns.push({
              file,
              pattern: name,
              line: index + 1,
            });
          }
        }
      });
    }

    return patterns;
  }

  /**
   * Generate recommendations based on findings
   */
  private generateRecommendations(
    todos: TODOItem[],
    deadExports: DeadExport[],
    deprecatedUsage: DeprecatedUsage[]
  ): string[] {
    const recommendations: string[] = [];

    // Prioritize FIXMEs
    const fixmes = todos.filter((t) => t.type === 'FIXME');
    if (fixmes.length > 0) {
      recommendations.push(`Address ${fixmes.length} FIXME item(s) - these indicate known bugs`);
    }

    // Old TODOs (by looking for dates or assuming old)
    if (todos.length > 20) {
      recommendations.push(
        `Review and triage ${todos.length} TODO items - consider creating issues for tracking`
      );
    }

    // Dead exports
    if (deadExports.length > 0) {
      recommendations.push(`Remove ${deadExports.length} unused export(s) to reduce code surface`);
    }

    // Deprecated usage
    if (deprecatedUsage.length > 0) {
      recommendations.push(
        `Update ${deprecatedUsage.length} deprecated component usage(s) to use replacements`
      );
    }

    return recommendations;
  }

  /**
   * Get last report
   */
  getLastReport(): LegacyReport | null {
    return this.lastReport;
  }

  /**
   * Get quick summary
   */
  getSummary(): string {
    if (!this.lastReport) {
      return 'No legacy report available. Run runAllScans() first.';
    }

    const { todos, deadExports, deprecatedUsage } = this.lastReport;
    const total = todos.count + deadExports.count + deprecatedUsage.count;
    const status = total === 0 ? '✅' : '📋';

    return `${status} Legacy: ${todos.count} TODOs, ${deadExports.count} dead exports, ${deprecatedUsage.count} deprecated`;
  }
}

// Singleton instance
export const legacyHunter = new LegacyHunter();
