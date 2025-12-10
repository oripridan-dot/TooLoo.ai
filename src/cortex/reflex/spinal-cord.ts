// @version 3.3.406
/**
 * Spinal Cord - Reflex Arc for Immediate File Change Response
 *
 * Part of Project Pinocchio: The Realization Protocol
 *
 * This subsystem acts as TooLoo's "spinal cord" - providing immediate,
 * reflexive responses to sensory input (file changes) without requiring
 * higher cognitive processing. Like human reflexes, these reactions are
 * fast, automatic, and pattern-based.
 *
 * Flow:
 * 1. Subscribe to sensory:file:change events from FileWatcher
 * 2. Fast Check: Filter for code files (.ts, .js, .jsx, .tsx)
 * 3. Heuristic Analysis: Detect common issues (empty files, missing imports, etc.)
 * 4. Trigger: Construct FixTask and submit to ExecutionAgent
 * 5. Self-Healing: Attempt automatic repair for known issue patterns
 *
 * @module cortex/reflex/spinal-cord
 */

import { bus, SynapsysEvent } from '../../core/event-bus.js';
import { registry } from '../../core/module-registry.js';
import fs from 'fs-extra';
import path from 'path';

// Types for issue detection
interface FileIssue {
  type: 'empty' | 'missing_import' | 'syntax_marker' | 'todo' | 'broken_reference';
  severity: 'critical' | 'warning' | 'info';
  line?: number;
  message: string;
  autoFixable: boolean;
}

interface FileAnalysis {
  file: string;
  language: string;
  issues: FileIssue[];
  timestamp: number;
}

interface FixTask {
  id: string;
  file: string;
  issues: FileIssue[];
  priority: number;
  createdAt: number;
}

// Code file extensions we care about
const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.json',
  '.yaml',
  '.yml',
]);

// Patterns that indicate issues
const ISSUE_PATTERNS = {
  // Critical: These need immediate attention
  emptyFile: /^\s*$/,
  syntaxError: /SyntaxError|Unexpected token|Parse error/i,
  brokenImport: /Cannot find module|Module not found/,

  // Warnings: Things that should be fixed
  todoMarker: /\/\/\s*TODO:|\/\*\s*TODO:/gi,
  fixmeMarker: /\/\/\s*FIXME:|\/\*\s*FIXME:/gi,
  hackMarker: /\/\/\s*HACK:|\/\*\s*HACK:/gi,

  // Info: Tracked but not auto-fixed
  debugStatement: /console\.(log|debug|info)\(/g,
  unusedImport: /^import .* from .* \/\/ unused$/gm,
};

// Missing import patterns by file extension
const IMPORT_PATTERNS: Record<string, RegExp[]> = {
  '.ts': [
    /^import .* from ['"]([^'"]+)['"]/gm,
    /^import \{ .* \} from ['"]([^'"]+)['"]/gm,
    /^export .* from ['"]([^'"]+)['"]/gm,
  ],
  '.tsx': [/^import .* from ['"]([^'"]+)['"]/gm, /^import \{ .* \} from ['"]([^'"]+)['"]/gm],
  '.js': [/^import .* from ['"]([^'"]+)['"]/gm, /require\(['"]([^'"]+)['"]\)/gm],
  '.jsx': [/^import .* from ['"]([^'"]+)['"]/gm],
};

/**
 * SpinalCord - The reflex response system
 */
export class SpinalCord {
  private enabled: boolean = true;
  private issueQueue: FixTask[] = [];
  private recentAnalyses: Map<string, FileAnalysis> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_MS = 500; // Wait 500ms after last change before analyzing
  private readonly MAX_QUEUE_SIZE = 50;

  constructor() {
    console.log('[SpinalCord] Initializing reflex system...');
  }

  /**
   * Start the reflex arc - begin listening for file changes
   */
  start(): void {
    if (!this.enabled) {
      console.log('[SpinalCord] Reflex system disabled');
      return;
    }

    // Register with module registry
    registry.register({
      name: 'spinal-cord',
      version: '3.3.405',
      status: 'ready',
      meta: {
        role: 'Reflex Response System',
        capabilities: ['file-analysis', 'auto-fix', 'issue-detection'],
      },
    });

    // Subscribe to file change events from FileWatcher
    bus.on('sensory:file:change', (event: SynapsysEvent) => {
      this.handleFileChange(event);
    });

    // Start the issue processor (runs every 5 seconds)
    this.processingInterval = setInterval(() => {
      this.processIssueQueue();
    }, 5000);

    console.log('[SpinalCord] Reflex arc active - listening for file changes');

    bus.publish('cortex', 'reflex:activated', {
      timestamp: Date.now(),
      patterns: Object.keys(ISSUE_PATTERNS).length,
    });
  }

  /**
   * Stop the reflex arc
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    registry.updateStatus('spinal-cord', 'degraded');
    console.log('[SpinalCord] Reflex arc deactivated');
  }

  /**
   * Handle incoming file change event
   */
  private handleFileChange(event: SynapsysEvent): void {
    const {
      type,
      path: filePath,
      timestamp,
    } = event.payload as {
      type: 'add' | 'change' | 'unlink';
      path: string;
      timestamp: number;
    };

    // Fast check: Only process code files
    const ext = path.extname(filePath).toLowerCase();
    if (!CODE_EXTENSIONS.has(ext)) {
      return; // Not a code file, skip
    }

    // For deleted files, just remove from tracking
    if (type === 'unlink') {
      this.recentAnalyses.delete(filePath);
      return;
    }

    // Debounce: Wait for rapid changes to settle
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.debounceTimers.set(
      filePath,
      setTimeout(() => {
        this.debounceTimers.delete(filePath);
        this.analyzeFile(filePath, ext, timestamp);
      }, this.DEBOUNCE_MS)
    );
  }

  /**
   * Analyze a file for issues (The Heuristic)
   */
  private async analyzeFile(filePath: string, ext: string, timestamp: number): Promise<void> {
    try {
      const fullPath = path.resolve(process.cwd(), filePath);

      // Check if file exists
      if (!(await fs.pathExists(fullPath))) {
        console.log(`[SpinalCord] File no longer exists: ${filePath}`);
        return;
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      const issues: FileIssue[] = [];

      // Check for empty file
      if (ISSUE_PATTERNS.emptyFile.test(content)) {
        issues.push({
          type: 'empty',
          severity: 'critical',
          message: 'File is empty or contains only whitespace',
          autoFixable: false, // Can't auto-fix empty files
        });
      }

      // Check for TODOs
      const todoMatches = content.match(ISSUE_PATTERNS.todoMarker);
      if (todoMatches) {
        issues.push({
          type: 'todo',
          severity: 'info',
          message: `Found ${todoMatches.length} TODO marker(s)`,
          autoFixable: false,
        });
      }

      // Check for FIXMEs (more urgent than TODOs)
      const fixmeMatches = content.match(ISSUE_PATTERNS.fixmeMarker);
      if (fixmeMatches) {
        issues.push({
          type: 'todo',
          severity: 'warning',
          message: `Found ${fixmeMatches.length} FIXME marker(s) requiring attention`,
          autoFixable: false,
        });
      }

      // Check for HACKs (technical debt indicators)
      const hackMatches = content.match(ISSUE_PATTERNS.hackMarker);
      if (hackMatches) {
        issues.push({
          type: 'todo',
          severity: 'warning',
          message: `Found ${hackMatches.length} HACK marker(s) - technical debt`,
          autoFixable: false,
        });
      }

      // Check for potential missing imports (TypeScript/JavaScript)
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        const missingImportIssues = this.detectMissingImports(content, ext, fullPath);
        issues.push(...missingImportIssues);
      }

      // Store analysis
      const analysis: FileAnalysis = {
        file: filePath,
        language: ext.slice(1),
        issues,
        timestamp,
      };
      this.recentAnalyses.set(filePath, analysis);

      // If there are critical/warning issues, queue for fixing
      const actionableIssues = issues.filter((i) => i.severity !== 'info' && i.autoFixable);

      if (actionableIssues.length > 0) {
        this.queueFixTask(filePath, actionableIssues);
      }

      // Emit analysis event
      bus.publish('cortex', 'reflex:file:analyzed', {
        file: filePath,
        issues: issues.length,
        critical: issues.filter((i) => i.severity === 'critical').length,
        warnings: issues.filter((i) => i.severity === 'warning').length,
        timestamp,
      });

      // Log summary
      if (issues.length > 0) {
        console.log(`[SpinalCord] Analyzed ${filePath}: ${issues.length} issue(s) found`);
      }
    } catch (error) {
      console.error(`[SpinalCord] Error analyzing ${filePath}:`, error);
    }
  }

  /**
   * Detect potential missing imports
   */
  private detectMissingImports(content: string, ext: string, fullPath: string): FileIssue[] {
    const issues: FileIssue[] = [];
    const patterns = IMPORT_PATTERNS[ext] || [];

    for (const pattern of patterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const importPath = match[1];

        // Skip if no import path captured or if node_modules import
        if (!importPath || (!importPath.startsWith('.') && !importPath.startsWith('/'))) {
          continue;
        }

        // Check if the imported file exists
        try {
          const resolvedPath = this.resolveImportPath(importPath, fullPath, ext);
          if (resolvedPath && !fs.existsSync(resolvedPath)) {
            issues.push({
              type: 'broken_reference',
              severity: 'critical',
              message: `Import '${importPath}' could not be resolved`,
              autoFixable: false, // Can't auto-create missing files
            });
          }
        } catch {
          // Resolution failed, might be a dynamic import or alias
        }
      }
    }

    return issues;
  }

  /**
   * Resolve an import path to an absolute path
   */
  private resolveImportPath(importPath: string, fromFile: string, ext: string): string | null {
    const dir = path.dirname(fromFile);

    // Try exact path first
    const resolved = path.resolve(dir, importPath);
    if (fs.existsSync(resolved)) return resolved;

    // Try with extension
    const extensions = [ext, '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
    for (const tryExt of extensions) {
      const tryPath = resolved + tryExt;
      if (fs.existsSync(tryPath)) return tryPath;
    }

    return null;
  }

  /**
   * Queue a fix task for processing
   */
  private queueFixTask(file: string, issues: FileIssue[]): void {
    // Calculate priority based on issue severity
    const priority = issues.reduce((score, issue) => {
      if (issue.severity === 'critical') return score + 10;
      if (issue.severity === 'warning') return score + 5;
      return score + 1;
    }, 0);

    const task: FixTask = {
      id: `fix-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      issues,
      priority,
      createdAt: Date.now(),
    };

    // Add to queue (sorted by priority)
    this.issueQueue.push(task);
    this.issueQueue.sort((a, b) => b.priority - a.priority);

    // Trim queue if too large
    if (this.issueQueue.length > this.MAX_QUEUE_SIZE) {
      this.issueQueue = this.issueQueue.slice(0, this.MAX_QUEUE_SIZE);
    }

    console.log(`[SpinalCord] Queued fix task for ${file} (priority: ${priority})`);

    bus.publish('cortex', 'reflex:task:queued', {
      taskId: task.id,
      file,
      issueCount: issues.length,
      priority,
    });
  }

  /**
   * Process the issue queue - attempt automatic fixes
   */
  private async processIssueQueue(): Promise<void> {
    if (this.issueQueue.length === 0) return;

    // Get highest priority task
    const task = this.issueQueue.shift();
    if (!task) return;

    console.log(`[SpinalCord] Processing fix task: ${task.file}`);

    try {
      // Emit task to ExecutionAgent for fixing
      bus.publish('cortex', 'agent:task:request', {
        type: 'fix',
        name: `Auto-fix: ${task.file}`,
        input: {
          files: [task.file],
          issues: task.issues.map((i) => i.message),
          prompt: `Analyze and fix the following issues in ${task.file}:\n${task.issues.map((i) => `- [${i.severity}] ${i.message}`).join('\n')}`,
        },
        options: {
          autoApprove: false, // Don't auto-approve fixes, require review
          sandbox: true,
        },
      });

      bus.publish('cortex', 'reflex:task:submitted', {
        taskId: task.id,
        file: task.file,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`[SpinalCord] Error processing fix task:`, error);

      // Re-queue with lower priority
      task.priority = Math.max(1, task.priority - 5);
      this.issueQueue.push(task);
    }
  }

  /**
   * Get current status for monitoring
   */
  getStatus(): {
    enabled: boolean;
    queueLength: number;
    recentAnalyses: number;
    patterns: number;
  } {
    return {
      enabled: this.enabled,
      queueLength: this.issueQueue.length,
      recentAnalyses: this.recentAnalyses.size,
      patterns: Object.keys(ISSUE_PATTERNS).length,
    };
  }

  /**
   * Get recent analyses for a file
   */
  getAnalysis(filePath: string): FileAnalysis | undefined {
    return this.recentAnalyses.get(filePath);
  }

  /**
   * Enable/disable the reflex system
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    } else {
      this.start();
    }
  }
}

// Singleton export
export const spinalCord = new SpinalCord();

// Default export
export default spinalCord;
