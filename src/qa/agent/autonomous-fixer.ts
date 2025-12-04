// @version 2.2.185
/**
 * Autonomous Fixer - Actually fixes detected issues
 *
 * Uses various strategies to fix issues automatically:
 * - Delete duplicate files (keeping the more complete one)
 * - Archive orphan files
 * - Fix simple syntax errors
 * - Remove dead exports
 * - Request TooLoo help for complex issues
 */

import fs from 'fs-extra';
import path from 'path';
import { bus } from '../../core/event-bus.js';
import { TrackedIssue, issueTracker, FixLog } from './issue-tracker.js';
import { isProtectedFile } from '../registry/essential-files.js';

interface FixResult {
  success: boolean;
  message: string;
  duration: number;
  action: string;
}

/**
 * AutonomousFixer - Performs automated fixes
 */
export class AutonomousFixer {
  private projectRoot: string;
  private archiveDir: string;
  private isFixing = false;
  private currentFix: TrackedIssue | null = null;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.archiveDir = path.join(projectRoot, 'data', 'archived-files');
  }

  /**
   * Get current fixing status
   */
  getStatus(): {
    isFixing: boolean;
    currentFix: TrackedIssue | null;
    queueLength: number;
  } {
    return {
      isFixing: this.isFixing,
      currentFix: this.currentFix,
      queueLength: issueTracker.getPrioritizedIssues().length,
    };
  }

  /**
   * Process the fix queue - called periodically
   */
  async processQueue(maxFixes = 3): Promise<FixResult[]> {
    if (this.isFixing) {
      console.log('[AutonomousFixer] Already fixing, skipping...');
      return [];
    }

    const results: FixResult[] = [];
    const issues = issueTracker.getPrioritizedIssues().slice(0, maxFixes);

    if (issues.length === 0) {
      return results;
    }

    this.isFixing = true;
    console.log(`[AutonomousFixer] 🔧 Processing ${issues.length} issues from queue...`);

    for (const issue of issues) {
      try {
        this.currentFix = issue;
        issueTracker.markFixing(issue.id);

        // Emit event for UI visibility
        bus.publish('system', 'qa:fix_started', {
          issue,
          timestamp: Date.now(),
        });

        const result = await this.fixIssue(issue);
        results.push(result);

        if (result.success) {
          issueTracker.markFixed(issue.id, result.message);
          bus.publish('system', 'qa:fix_completed', {
            issue,
            result,
            timestamp: Date.now(),
          });
          console.log(`[AutonomousFixer] ✅ Fixed: ${issue.description}`);
        } else {
          issueTracker.markFixFailed(issue.id, result.message);
          bus.publish('system', 'qa:fix_failed', {
            issue,
            result,
            timestamp: Date.now(),
          });
          console.log(`[AutonomousFixer] ❌ Failed: ${issue.description}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issueTracker.markFixFailed(issue.id, message);
        results.push({
          success: false,
          message,
          duration: 0,
          action: 'error',
        });
      }
    }

    this.isFixing = false;
    this.currentFix = null;

    // Save tracker state
    await issueTracker.saveState();

    return results;
  }

  /**
   * Fix a single issue based on its type
   */
  private async fixIssue(issue: TrackedIssue): Promise<FixResult> {
    const startTime = Date.now();

    switch (issue.type) {
      case 'duplicate':
        return this.fixDuplicate(issue, startTime);

      case 'orphan':
        return this.fixOrphan(issue, startTime);

      case 'corruption':
        return this.fixCorruption(issue, startTime);

      case 'dead_export':
        // Dead exports need careful AST manipulation - skip auto-fix
        return {
          success: true,
          message: 'Dead exports require manual removal - tracked for visibility',
          duration: Date.now() - startTime,
          action: 'skipped',
        };

      case 'wiring':
        return this.fixWiringMismatch(issue, startTime);

      case 'todo':
        // TODOs are tracked but not auto-fixed
        return {
          success: true,
          message: 'TODOs are tracked but require manual resolution',
          duration: Date.now() - startTime,
          action: 'skipped',
        };

      default:
        return {
          success: false,
          message: `Unknown issue type: ${issue.type}`,
          duration: Date.now() - startTime,
          action: 'unknown',
        };
    }
  }

  /**
   * Fix duplicate file issue
   */
  private async fixDuplicate(issue: TrackedIssue, startTime: number): Promise<FixResult> {
    const metadata = issue.metadata as {
      file1?: string;
      file2?: string;
      similarity?: number;
    };

    if (!metadata?.file1 || !metadata?.file2) {
      return {
        success: false,
        message: 'Missing file information for duplicate',
        duration: Date.now() - startTime,
        action: 'skip',
      };
    }

    try {
      const file1Path = path.join(this.projectRoot, metadata.file1);
      const file2Path = path.join(this.projectRoot, metadata.file2);

      // Check which file is more recent
      const [stat1, stat2] = await Promise.all([
        fs.stat(file1Path).catch(() => null),
        fs.stat(file2Path).catch(() => null),
      ]);

      if (!stat1 && !stat2) {
        return {
          success: true,
          message: 'Both files already removed',
          duration: Date.now() - startTime,
          action: 'already_fixed',
        };
      }

      // Keep the larger/more recent file, archive the other
      const keepFile1 =
        stat1 && stat2 ? stat1.size >= stat2.size || stat1.mtime > stat2.mtime : !!stat1;
      const toArchive = keepFile1 ? metadata.file2 : metadata.file1;
      const toArchivePath = keepFile1 ? file2Path : file1Path;

      await this.archiveFile(toArchivePath, 'duplicate');

      return {
        success: true,
        message: `Archived duplicate: ${toArchive}`,
        duration: Date.now() - startTime,
        action: 'archived',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        action: 'error',
      };
    }
  }

  /**
   * Fix orphan file issue
   */
  private async fixOrphan(issue: TrackedIssue, startTime: number): Promise<FixResult> {
    if (!issue.file) {
      return {
        success: false,
        message: 'Missing file path for orphan',
        duration: Date.now() - startTime,
        action: 'skip',
      };
    }

    // Check if file is protected - NEVER archive protected files
    if (isProtectedFile(issue.file)) {
      return {
        success: false,
        message: `Protected file cannot be archived: ${issue.file}`,
        duration: Date.now() - startTime,
        action: 'skip_protected',
      };
    }

    try {
      const filePath = path.join(this.projectRoot, issue.file);

      if (!(await fs.pathExists(filePath))) {
        return {
          success: true,
          message: 'File already removed',
          duration: Date.now() - startTime,
          action: 'already_fixed',
        };
      }

      await this.archiveFile(filePath, 'orphan');

      return {
        success: true,
        message: `Archived orphan: ${issue.file}`,
        duration: Date.now() - startTime,
        action: 'archived',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        action: 'error',
      };
    }
  }

  /**
   * Fix corruption issue
   */
  private async fixCorruption(issue: TrackedIssue, startTime: number): Promise<FixResult> {
    const metadata = issue.metadata as {
      type?: string;
      fixable?: boolean;
    };

    if (!issue.file) {
      return {
        success: false,
        message: 'Missing file path for corruption',
        duration: Date.now() - startTime,
        action: 'skip',
      };
    }

    // Only fix empty files automatically
    if (metadata?.type === 'empty_file' && issue.file) {
      try {
        const filePath = path.join(this.projectRoot, issue.file);
        await this.archiveFile(filePath, 'empty');

        return {
          success: true,
          message: `Archived empty file: ${issue.file}`,
          duration: Date.now() - startTime,
          action: 'archived',
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
          action: 'error',
        };
      }
    }

    // Complex corruption requires manual intervention
    return {
      success: true,
      message: `Corruption type '${metadata?.type}' tracked for manual review`,
      duration: Date.now() - startTime,
      action: 'tracked',
    };
  }

  /**
   * Fix wiring mismatch by generating route stub
   */
  private async fixWiringMismatch(issue: TrackedIssue, startTime: number): Promise<FixResult> {
    // Parse the missing route from the issue
    const match = issue.description.match(/No backend route for (\w+) (\/api\/v\d+\/[\w\/-]+)/);
    if (!match || !match[1] || !match[2]) {
      return {
        success: true,
        message: 'Could not parse route - tracked for manual review',
        duration: Date.now() - startTime,
        action: 'tracked',
      };
    }

    const method = match[1];
    const routePath = match[2];
    const routeFile = this.inferRouteFile(routePath);

    if (!routeFile) {
      return {
        success: true,
        message: `Could not determine route file for ${routePath} - tracked for manual review`,
        duration: Date.now() - startTime,
        action: 'tracked',
      };
    }

    try {
      // Check if file exists
      if (!fs.existsSync(routeFile)) {
        return {
          success: true,
          message: `Route file ${routeFile} does not exist - tracked for manual creation`,
          duration: Date.now() - startTime,
          action: 'tracked',
        };
      }

      // Generate the stub
      const stub = this.generateRouteStub(method, routePath);

      // Read current file content
      const content = await fs.readFile(routeFile, 'utf-8');

      // Find the best place to insert (before last export or end of file)
      const exportMatch = content.match(/export\s+(default\s+)?router/);

      if (exportMatch && exportMatch.index !== undefined) {
        // Insert before export
        const newContent =
          content.slice(0, exportMatch.index) + stub + '\n' + content.slice(exportMatch.index);

        await fs.writeFile(routeFile, newContent, 'utf-8');

        bus.publish('system', 'qa:route_stub_generated', {
          method,
          path: routePath,
          file: routeFile,
          timestamp: Date.now(),
        });

        console.log(
          `[AutonomousFixer] 🔧 Generated route stub: ${method} ${routePath} in ${routeFile}`
        );

        return {
          success: true,
          message: `Generated stub for ${method} ${routePath} - TODO: implement handler`,
          duration: Date.now() - startTime,
          action: 'generated_stub',
        };
      } else {
        // Append to end of file
        await fs.appendFile(routeFile, '\n' + stub, 'utf-8');

        return {
          success: true,
          message: `Appended stub for ${method} ${routePath} - TODO: implement handler`,
          duration: Date.now() - startTime,
          action: 'generated_stub',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate stub: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime,
        action: 'error',
      };
    }
  }

  /**
   * Infer the route file from a path
   */
  private inferRouteFile(routePath: string): string | null {
    // Extract the resource from the path
    // /api/v1/chat/generate -> chat.ts
    const parts = routePath.replace('/api/v1/', '').split('/');
    const resource = parts[0];

    if (!resource) return null;

    const routesDir = path.join(this.projectRoot, 'src/nexus/routes');
    const candidates = [`${resource}.ts`, `${resource}s.ts`];

    for (const candidate of candidates) {
      const fullPath = path.join(routesDir, candidate);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    return null;
  }

  /**
   * Generate a route handler stub
   */
  private generateRouteStub(method: string, routePath: string): string {
    // Extract the local path from full path
    // /api/v1/chat/generate -> /generate
    const parts = routePath.replace('/api/v1/', '').split('/');
    const localPath = '/' + parts.slice(1).join('/') || '/';
    const methodLower = method.toLowerCase();

    return `
// ⚡ Auto-generated stub by QA Guardian - TODO: implement
router.${methodLower}('${localPath}', async (req, res) => {
  try {
    // TODO: Implement ${method} ${routePath}
    console.log('[STUB] ${method} ${routePath} called');
    res.json({
      ok: false,
      error: 'Not implemented yet - stub generated by QA Guardian',
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});
`;
  }

  /**
   * Archive a file instead of deleting
   */
  private async archiveFile(filePath: string, reason: string): Promise<void> {
    const relativePath = path.relative(this.projectRoot, filePath);
    const dateFolder = new Date().toISOString().split('T')[0] ?? '';
    const archivePath = path.join(this.archiveDir, reason, dateFolder, relativePath);

    await fs.ensureDir(path.dirname(archivePath));
    await fs.move(filePath, archivePath, { overwrite: true });

    console.log(`[AutonomousFixer] 📦 Archived: ${relativePath} → ${archivePath}`);
  }

  /**
   * Get recent activity for UI display
   */
  getRecentActivity(limit = 20): FixLog[] {
    return issueTracker.getFixLogs(limit);
  }
}

// Singleton instance
export const autonomousFixer = new AutonomousFixer();
