// @version 2.2.200
/**
 * Filesystem Hygiene - Duplicate/Orphan/Corruption Detection
 *
 * Maintains filesystem health by detecting:
 * - Duplicate or highly similar files
 * - Orphan files (not imported anywhere)
 * - Corrupted files (syntax errors, broken imports)
 * - Unused configuration
 *
 * Uses the Essential Files Registry to focus on files that matter.
 *
 * @module qa/hygiene/filesystem-hygiene
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import * as ts from 'typescript';
import { shouldExcludeFile, isValidEntryPoint } from '../registry/index.js';
import {
  DuplicateFile,
  OrphanFile,
  CorruptionIssue,
  UnusedConfig,
  HygieneReport,
} from '../types/index.js';

/**
 * FileSystemHygiene - Keeps the codebase clean and healthy
 */
export class FileSystemHygiene {
  private projectRoot: string;
  private lastReport: HygieneReport | null = null;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run all hygiene checks
   */
  async runAllChecks(): Promise<HygieneReport> {
    console.log('[FileSystemHygiene] 🧹 Starting hygiene checks...');

    const [duplicates, orphans, corruption, unusedConfig] = await Promise.all([
      this.findDuplicates(),
      this.findOrphans(),
      this.detectCorruption(),
      this.findUnusedConfig(),
    ]);

    const recommendations = this.generateRecommendations(
      duplicates,
      orphans,
      corruption,
      unusedConfig
    );

    const report: HygieneReport = {
      timestamp: new Date().toISOString(),
      duplicates: {
        count: duplicates.length,
        files: duplicates,
      },
      orphans: {
        count: orphans.length,
        files: orphans,
        totalSize: orphans.reduce((sum, o) => sum + o.size, 0),
      },
      corruption: {
        count: corruption.length,
        issues: corruption,
      },
      unusedConfig: {
        count: unusedConfig.length,
        items: unusedConfig,
      },
      recommendations,
    };

    this.lastReport = report;

    console.log(
      `[FileSystemHygiene] ✅ Hygiene check complete: ${duplicates.length} duplicates, ${orphans.length} orphans, ${corruption.length} corrupted`
    );

    return report;
  }

  /**
   * Find duplicate or highly similar files
   * Only checks essential files, skipping excluded directories
   */
  async findDuplicates(): Promise<DuplicateFile[]> {
    const duplicates: DuplicateFile[] = [];
    const allFiles = await glob('src/**/*.ts', {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**', '**/*.test.ts', '**/*.d.ts'],
    });

    // Filter to only essential files using registry
    const files = allFiles.filter((file) => !shouldExcludeFile(file));

    // Build content hashes
    const hashes: Map<string, string[]> = new Map();

    for (const file of files) {
      const fullPath = path.join(this.projectRoot, file);
      const content = await fs.readFile(fullPath, 'utf-8');

      // Simple hash for exact duplicates
      const hash = this.simpleHash(content);

      if (!hashes.has(hash)) {
        hashes.set(hash, []);
      }
      hashes.get(hash)!.push(file);
    }

    // Find exact duplicates
    for (const [, paths] of hashes) {
      if (paths.length > 1) {
        for (let i = 0; i < paths.length; i++) {
          for (let j = i + 1; j < paths.length; j++) {
            duplicates.push({
              file1: paths[i] ?? '',
              file2: paths[j] ?? '',
              similarity: 1.0,
              type: 'exact',
            });
          }
        }
      }
    }

    // For similar files, use trigram comparison on a sample
    // (Full comparison would be too slow for large codebases)
    const sampleSize = Math.min(100, files.length);
    const sampleFiles = files.slice(0, sampleSize);

    for (let i = 0; i < sampleFiles.length; i++) {
      for (let j = i + 1; j < sampleFiles.length; j++) {
        const file1 = path.join(this.projectRoot, sampleFiles[i] ?? '');
        const file2 = path.join(this.projectRoot, sampleFiles[j] ?? '');

        const content1 = await fs.readFile(file1, 'utf-8');
        const content2 = await fs.readFile(file2, 'utf-8');

        // Skip if sizes are very different
        if (
          Math.abs(content1.length - content2.length) >
          Math.max(content1.length, content2.length) * 0.5
        ) {
          continue;
        }

        const similarity = this.calculateSimilarity(content1, content2);

        if (similarity > 0.7 && similarity < 1.0) {
          duplicates.push({
            file1: sampleFiles[i] ?? '',
            file2: sampleFiles[j] ?? '',
            similarity,
            type: 'similar',
          });
        }
      }
    }

    return duplicates;
  }

  /**
   * Find orphan files (not imported anywhere)
   * Uses Essential Files Registry to filter out excluded directories
   */
  async findOrphans(): Promise<OrphanFile[]> {
    const orphans: OrphanFile[] = [];
    const allFiles = await glob('src/**/*.ts', {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**', '**/*.test.ts', '**/*.d.ts'],
    });

    // Filter out files in excluded directories - they're already known to be orphans
    const files = allFiles.filter((file) => !shouldExcludeFile(file));

    // Build import graph - maps filename (basename) to importers
    const importsByBasename = new Map<string, Set<string>>();
    const importsByFullPath = new Map<string, Set<string>>();

    for (const file of files) {
      const fullPath = path.join(this.projectRoot, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const importedFiles = this.extractImports(content, file);

      for (const imported of importedFiles) {
        // Track by full resolved path
        if (!importsByFullPath.has(imported)) {
          importsByFullPath.set(imported, new Set());
        }
        importsByFullPath.get(imported)!.add(file);

        // Also track by basename (e.g., "session-context-service")
        const basename = path.basename(imported).replace(/\.(ts|js)$/, '');
        if (!importsByBasename.has(basename)) {
          importsByBasename.set(basename, new Set());
        }
        importsByBasename.get(basename)!.add(file);
      }
    }

    // Find files that are not imported and are not entry points
    for (const file of files) {
      // Skip files that are valid entry points per registry
      if (isValidEntryPoint(file)) {
        continue;
      }

      // Skip index files (re-exports)
      if (file.endsWith('/index.ts')) {
        continue;
      }

      // Get different forms of the file path for matching
      const normalizedFile = file.replace(/\.ts$/, '');
      const basename = path.basename(file).replace(/\.ts$/, '');

      // Check if imported by any method
      const isImported =
        importsByFullPath.has(file) ||
        importsByFullPath.has(normalizedFile) ||
        importsByFullPath.has(normalizedFile + '.ts') ||
        importsByFullPath.has(normalizedFile + '.js') ||
        importsByBasename.has(basename);

      if (!isImported) {
        const fullPath = path.join(this.projectRoot, file);
        const stats = await fs.stat(fullPath);

        orphans.push({
          file,
          reason: 'Not imported by any file',
          lastModified: stats.mtime,
          size: stats.size,
        });
      }
    }

    return orphans;
  }

  /**
   * Detect corrupted files
   * Only checks essential files, skipping excluded directories
   */
  async detectCorruption(): Promise<CorruptionIssue[]> {
    const issues: CorruptionIssue[] = [];
    const allFiles = await glob('src/**/*.ts', {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**'],
    });

    // Filter to only essential files using registry
    const files = allFiles.filter((file) => !shouldExcludeFile(file));

    for (const file of files) {
      const fullPath = path.join(this.projectRoot, file);

      try {
        const content = await fs.readFile(fullPath, 'utf-8');

        // Check for empty files
        if (content.trim().length === 0) {
          issues.push({
            file,
            type: 'empty_file',
            details: 'File is empty',
            fixable: true,
          });
          continue;
        }

        // Check for syntax errors using TypeScript parser
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

        // Check for parse errors by examining the source file's diagnostics
        // Note: For template literals, regex patterns, and JSX, brace counting doesn't work
        // We rely on TypeScript's parser for more accurate detection
        // parseDiagnostics is on the internal API, so we cast to access it
        const parseDiagnostics =
          (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics || [];
        const hasSyntaxErrors = parseDiagnostics.length > 0;

        if (hasSyntaxErrors) {
          const firstError = parseDiagnostics[0];
          const message = firstError
            ? ts.flattenDiagnosticMessageText(firstError.messageText, '\n')
            : 'Syntax error detected';
          issues.push({
            file,
            type: 'syntax_error',
            details: message,
            fixable: false,
          });
        }

        // Check for broken imports
        const importMatches = content.matchAll(/import\s+.*?from\s+['"](\.\.?\/[^'"]+)['"]/g);

        for (const match of importMatches) {
          const importPath = match[1];
          if (!importPath) continue;

          // Skip template literal imports (e.g., ./${componentName}) - these are code generation templates
          if (importPath.includes('${')) continue;

          const resolvedPath = this.resolveImportPath(file, importPath);

          if (resolvedPath && !(await fs.pathExists(resolvedPath))) {
            issues.push({
              file,
              type: 'broken_import',
              details: `Cannot resolve import: ${importPath}`,
              fixable: false,
            });
          }
        }
      } catch (error) {
        issues.push({
          file,
          type: 'syntax_error',
          details: `Failed to parse: ${error instanceof Error ? error.message : String(error)}`,
          fixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Find unused configuration
   */
  async findUnusedConfig(): Promise<UnusedConfig[]> {
    const unused: UnusedConfig[] = [];
    const envPath = path.join(this.projectRoot, '.env');

    if (!(await fs.pathExists(envPath))) {
      return unused;
    }

    const envContent = await fs.readFile(envPath, 'utf-8');
    const envVars: string[] = [];

    // Parse .env file
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
      if (match && match[1]) {
        envVars.push(match[1]);
      }
    }

    // Scan source files for usage
    const srcContent = await this.getAllSourceContent();

    for (const envVar of envVars) {
      const isUsed =
        srcContent.includes(`process.env.${envVar}`) ||
        srcContent.includes(`process.env["${envVar}"]`) ||
        srcContent.includes(`process.env['${envVar}']`);

      if (!isUsed) {
        // Categorize the unused variable
        let category: UnusedConfig['category'] = 'other';
        if (envVar.includes('PORT')) category = 'port';
        else if (envVar.includes('KEY') || envVar.includes('SECRET')) category = 'api_key';
        else if (envVar.includes('PATH') || envVar.includes('DIR')) category = 'path';
        else if (
          envVar.includes('ENABLE') ||
          envVar.includes('DISABLE') ||
          envVar.includes('ON') ||
          envVar.includes('OFF')
        )
          category = 'feature_flag';

        unused.push({
          key: envVar,
          source: '.env',
          category,
        });
      }
    }

    return unused;
  }

  /**
   * Archive orphan files (with approval mode)
   */
  async archiveOrphans(dryRun = true): Promise<{ archived: string[]; dryRun: boolean }> {
    const orphans = await this.findOrphans();
    const archived: string[] = [];

    if (dryRun) {
      return { archived: orphans.map((o) => o.file), dryRun: true };
    }

    const dateFolder = new Date().toISOString().split('T')[0] ?? '';
    const archiveDir = path.join(this.projectRoot, '_cleanup', dateFolder);
    await fs.ensureDir(archiveDir);

    for (const orphan of orphans) {
      const srcPath = path.join(this.projectRoot, orphan.file);
      const destPath = path.join(archiveDir, orphan.file);

      await fs.ensureDir(path.dirname(destPath));
      await fs.move(srcPath, destPath);
      archived.push(orphan.file);
    }

    console.log(`[FileSystemHygiene] Archived ${archived.length} orphan files to ${archiveDir}`);

    return { archived, dryRun: false };
  }

  /**
   * Generate recommendations based on findings
   */
  private generateRecommendations(
    duplicates: DuplicateFile[],
    orphans: OrphanFile[],
    corruption: CorruptionIssue[],
    unusedConfig: UnusedConfig[]
  ): string[] {
    const recommendations: string[] = [];

    if (duplicates.length > 0) {
      const exactCount = duplicates.filter((d) => d.type === 'exact').length;
      if (exactCount > 0) {
        recommendations.push(
          `Remove ${exactCount} exact duplicate file(s) to reduce codebase size`
        );
      }
      const similarCount = duplicates.length - exactCount;
      if (similarCount > 0) {
        recommendations.push(`Review ${similarCount} similar file(s) for potential consolidation`);
      }
    }

    if (orphans.length > 0) {
      const oldOrphans = orphans.filter(
        (o) => Date.now() - o.lastModified.getTime() > 30 * 24 * 60 * 60 * 1000
      );
      if (oldOrphans.length > 0) {
        recommendations.push(
          `Archive ${oldOrphans.length} orphan file(s) not modified in 30+ days`
        );
      }
    }

    if (corruption.length > 0) {
      const brokenImports = corruption.filter((c) => c.type === 'broken_import');
      if (brokenImports.length > 0) {
        recommendations.push(
          `Fix ${brokenImports.length} broken import(s) to prevent runtime errors`
        );
      }
    }

    if (unusedConfig.length > 0) {
      const unusedPorts = unusedConfig.filter((c) => c.category === 'port');
      if (unusedPorts.length > 0) {
        recommendations.push(`Remove ${unusedPorts.length} unused port configuration(s) from .env`);
      }
    }

    return recommendations;
  }

  // ============= Helper Methods =============

  private simpleHash(content: string): string {
    // Simple hash for quick duplicate detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private calculateSimilarity(content1: string, content2: string): number {
    // Trigram-based similarity (simplified)
    const trigrams1 = this.getTrigrams(content1);
    const trigrams2 = this.getTrigrams(content2);

    const intersection = new Set([...trigrams1].filter((t) => trigrams2.has(t)));
    const union = new Set([...trigrams1, ...trigrams2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private getTrigrams(text: string): Set<string> {
    const trigrams = new Set<string>();
    const normalized = text.replace(/\s+/g, ' ').toLowerCase();

    for (let i = 0; i < normalized.length - 2; i++) {
      trigrams.add(normalized.substring(i, i + 3));
    }

    return trigrams;
  }

  private extractImports(content: string, sourceFile: string): string[] {
    const imports: string[] = [];
    const matches = content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);

    for (const match of matches) {
      const importPath = match[1];
      if (importPath && importPath.startsWith('.')) {
        // Relative import - resolve to file path
        const resolved = this.resolveImportPath(sourceFile, importPath);
        if (resolved) {
          imports.push(resolved.replace(this.projectRoot + '/', ''));
        }
      }
    }

    return imports;
  }

  private resolveImportPath(sourceFile: string, importPath: string): string | null {
    const sourceDir = path.dirname(path.join(this.projectRoot, sourceFile));
    const basePath = path.resolve(sourceDir, importPath.replace(/\.js$/, ''));

    // Try with different extensions
    for (const ext of ['.ts', '.tsx', '/index.ts', '.js', '/index.js']) {
      const fullPath = basePath + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    return basePath + '.ts';
  }

  private async getAllSourceContent(): Promise<string> {
    const files = await glob('src/**/*.ts', {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**'],
    });

    let content = '';
    for (const file of files.slice(0, 200)) {
      // Limit for performance
      const fullPath = path.join(this.projectRoot, file);
      content += await fs.readFile(fullPath, 'utf-8');
    }

    return content;
  }

  /**
   * Get last report
   */
  getLastReport(): HygieneReport | null {
    return this.lastReport;
  }

  /**
   * Get quick summary
   */
  getSummary(): string {
    if (!this.lastReport) {
      return 'No hygiene report available. Run runAllChecks() first.';
    }

    const { duplicates, orphans, corruption, unusedConfig } = this.lastReport;
    const issues = duplicates.count + orphans.count + corruption.count + unusedConfig.count;
    const status = issues === 0 ? '✅' : '⚠️';

    return `${status} Hygiene: ${duplicates.count} duplicates, ${orphans.count} orphans, ${corruption.count} corrupted, ${unusedConfig.count} unused config`;
  }
}

// Singleton instance
export const filesystemHygiene = new FileSystemHygiene();
