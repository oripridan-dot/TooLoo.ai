// @version 2.2.198
/**
 * Issue Tracker - Intelligent issue tracking with deduplication and cleanup
 *
 * Features:
 * - Smart deduplication to prevent issue spam
 * - Automatic cleanup of stale/fixed issues
 * - Validation before tracking (checks if file exists)
 * - Configurable thresholds for what gets tracked
 */

import fs from 'fs-extra';
import path from 'path';

export interface TrackedIssue {
  id: string;
  type: 'duplicate' | 'orphan' | 'corruption' | 'wiring' | 'dead_export' | 'todo';
  description: string;
  file?: string;
  severity: 'critical' | 'warning' | 'info';
  firstSeen: number; // timestamp
  lastSeen: number; // timestamp
  occurrences: number;
  status: 'open' | 'fixing' | 'fixed' | 'ignored';
  fixAttempts: number;
  metadata?: Record<string, unknown>;
}

export interface FixLog {
  id: string;
  issueId: string;
  action: string;
  timestamp: number;
  success: boolean;
  message: string;
  duration?: number;
}

// Files/patterns that should never be flagged
const WHITELIST_PATTERNS = [
  /vite\.config\.(ts|js)$/,
  /tailwind\.config\.(ts|js)$/,
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /index\.(ts|tsx|js|jsx)$/,
  /package\.json$/,
  /tsconfig\.json$/,
  /\.eslintrc/,
  /\.prettierrc/,
  /\.d\.ts$/,
];

// Issue types that should NOT be auto-fixed (informational only)
const INFO_ONLY_TYPES = ['todo', 'dead_export', 'wiring'];

/**
 * IssueTracker - Maintains persistent issue state with timestamps
 */
export class IssueTracker {
  private issues: Map<string, TrackedIssue> = new Map();
  private fixLogs: FixLog[] = [];
  private totalFixCount = 0; // Total fixes ever completed (never decreases)
  private dataPath: string;
  private projectRoot: string;
  private maxLogs = 500;
  private maxIssueAge = 24 * 60 * 60 * 1000; // 24 hours for stale issues

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.dataPath = path.join(projectRoot, 'data', 'qa-issues.json');
    this.loadState();
  }

  /**
   * Load persisted state
   */
  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.dataPath)) {
        const data = await fs.readJson(this.dataPath);
        if (data.issues) {
          this.issues = new Map(Object.entries(data.issues));
          // Clean up stale issues on load
          await this.cleanupStaleIssues();
        }
        if (data.fixLogs) {
          this.fixLogs = data.fixLogs;
        }
        if (typeof data.totalFixCount === 'number') {
          this.totalFixCount = data.totalFixCount;
        }
      }
    } catch (error) {
      console.error('[IssueTracker] Failed to load state:', error);
    }
  }

  /**
   * Clean up issues for files that no longer exist or are stale
   * @returns The number of issues that were cleaned up
   */
  async cleanupStaleIssues(): Promise<number> {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, issue] of this.issues) {
      // Remove issues for files that no longer exist
      if (issue.file) {
        const fullPath = path.join(this.projectRoot, issue.file);
        if (!(await fs.pathExists(fullPath))) {
          toRemove.push(id);
          continue;
        }
      }

      // Remove very old fixed issues
      if (issue.status === 'fixed' && now - issue.lastSeen > this.maxIssueAge) {
        toRemove.push(id);
        continue;
      }

      // Remove stale open issues that haven't been seen in 24 hours
      if (issue.status === 'open' && now - issue.lastSeen > this.maxIssueAge) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.issues.delete(id);
    }

    if (toRemove.length > 0) {
      console.log(`[IssueTracker] 🧹 Cleaned up ${toRemove.length} stale issues`);
      await this.saveState();
    }

    return toRemove.length;
  }

  /**
   * Check if a file should be whitelisted (never flagged)
   */
  private isWhitelisted(filePath: string): boolean {
    return WHITELIST_PATTERNS.some((pattern) => pattern.test(filePath));
  }

  /**
   * Save state to disk
   */
  async saveState(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.dataPath));
      await fs.writeJson(
        this.dataPath,
        {
          issues: Object.fromEntries(this.issues),
          fixLogs: this.fixLogs.slice(-this.maxLogs),
          totalFixCount: this.totalFixCount,
          lastSaved: new Date().toISOString(),
        },
        { spaces: 2 }
      );
    } catch (error) {
      console.error('[IssueTracker] Failed to save state:', error);
    }
  }

  /**
   * Generate a unique ID for an issue based on its properties
   */
  private generateIssueId(type: TrackedIssue['type'], file?: string, detail?: string): string {
    const base = `${type}:${file || 'global'}:${detail || ''}`;
    // Simple hash
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      const char = base.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `issue_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Track a new issue or update existing - with smart validation
   */
  trackIssue(
    type: TrackedIssue['type'],
    description: string,
    options: {
      file?: string;
      severity?: TrackedIssue['severity'];
      metadata?: Record<string, unknown>;
    } = {}
  ): TrackedIssue | null {
    // Skip whitelisted files
    if (options.file && this.isWhitelisted(options.file)) {
      return null;
    }

    // Downgrade severity for info-only types
    let severity = options.severity || 'warning';
    if (INFO_ONLY_TYPES.includes(type) && severity === 'critical') {
      severity = 'info';
    }

    const id = this.generateIssueId(type, options.file, description);
    const now = Date.now();

    const existing = this.issues.get(id);
    if (existing) {
      // Update existing issue
      existing.lastSeen = now;
      existing.occurrences++;
      if (existing.status === 'fixed') {
        // Issue reappeared!
        existing.status = 'open';
        existing.fixAttempts = 0;
      }
      return existing;
    }

    // Create new issue
    const issue: TrackedIssue = {
      id,
      type,
      description,
      file: options.file,
      severity,
      firstSeen: now,
      lastSeen: now,
      occurrences: 1,
      status: 'open',
      fixAttempts: 0,
      metadata: options.metadata,
    };

    this.issues.set(id, issue);

    return issue;
  }

  /**
   * Mark issue as being fixed
   */
  markFixing(issueId: string): void {
    const issue = this.issues.get(issueId);
    if (issue) {
      issue.status = 'fixing';
      issue.fixAttempts++;
    }
  }

  /**
   * Mark issue as fixed
   */
  markFixed(issueId: string, message: string): void {
    const issue = this.issues.get(issueId);
    if (issue) {
      issue.status = 'fixed';
      this.totalFixCount++; // Increment total fix count (never decreases)
      this.logFix(issueId, 'fix_complete', true, message);
    }
  }

  /**
   * Mark issue fix as failed
   */
  markFixFailed(issueId: string, message: string): void {
    const issue = this.issues.get(issueId);
    if (issue) {
      issue.status = 'open'; // Back to open
      this.logFix(issueId, 'fix_failed', false, message);
    }
  }

  /**
   * Log a fix attempt
   */
  logFix(
    issueId: string,
    action: string,
    success: boolean,
    message: string,
    duration?: number
  ): void {
    this.fixLogs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      issueId,
      action,
      timestamp: Date.now(),
      success,
      message,
      duration,
    });

    // Trim logs if too many
    if (this.fixLogs.length > this.maxLogs) {
      this.fixLogs = this.fixLogs.slice(-this.maxLogs);
    }

    // Save state after each fix
    this.saveState();
  }

  /**
   * Get issues sorted by priority (oldest first, then by severity)
   * Only returns auto-fixable issues (duplicates, orphans, corruption)
   */
  getPrioritizedIssues(): TrackedIssue[] {
    // Only these types can be auto-fixed
    const autoFixableTypes = ['duplicate', 'orphan', 'corruption'];

    const open = Array.from(this.issues.values()).filter(
      (i) => i.status === 'open' && autoFixableTypes.includes(i.type)
    );

    // Sort by: severity (critical first), then age (oldest first)
    return open.sort((a, b) => {
      // Severity priority
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;

      // Age priority (oldest first)
      return a.firstSeen - b.firstSeen;
    });
  }

  /**
   * Get all open issues including non-auto-fixable ones (for display)
   */
  getAllOpenIssues(): TrackedIssue[] {
    return Array.from(this.issues.values())
      .filter((i) => i.status === 'open')
      .sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  /**
   * Get issues older than a given age
   */
  getStaleIssues(maxAgeMs: number): TrackedIssue[] {
    const cutoff = Date.now() - maxAgeMs;
    return Array.from(this.issues.values()).filter(
      (i) => i.status === 'open' && i.firstSeen < cutoff
    );
  }

  /**
   * Get issues currently being fixed
   */
  getFixingIssues(): TrackedIssue[] {
    return Array.from(this.issues.values()).filter((i) => i.status === 'fixing');
  }

  /**
   * Get all open issues
   */
  getOpenIssues(): TrackedIssue[] {
    return Array.from(this.issues.values()).filter((i) => i.status === 'open');
  }

  /**
   * Get all open issues by severity
   */
  getIssuesBySeverity(severity: 'critical' | 'error' | 'warning' | 'info'): TrackedIssue[] {
    return Array.from(this.issues.values()).filter(
      (i) => i.status === 'open' && i.severity === severity
    );
  }

  /**
   * Ignore an issue (won't be auto-fixed)
   */
  ignoreIssue(issueId: string): void {
    const issue = this.issues.get(issueId);
    if (issue) {
      issue.status = 'ignored';
      this.saveState();
      console.log(`[IssueTracker] Issue ${issueId} marked as ignored`);
    }
  }

  /**
   * Get recently fixed issues
   */
  getRecentlyFixed(limit = 20): TrackedIssue[] {
    return Array.from(this.issues.values())
      .filter((i) => i.status === 'fixed')
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, limit);
  }

  /**
   * Get fix logs
   */
  getFixLogs(limit = 50): FixLog[] {
    return this.fixLogs.slice(-limit);
  }

  /**
   * Get stats
   */
  getStats(): {
    total: number;
    open: number;
    fixing: number;
    fixed: number;
    totalFixed: number;
    byType: Record<string, number>;
    oldestIssue: TrackedIssue | null;
  } {
    const all = Array.from(this.issues.values());
    const open = all.filter((i) => i.status === 'open');
    const fixing = all.filter((i) => i.status === 'fixing');
    const currentlyFixed = all.filter((i) => i.status === 'fixed');

    const byType: Record<string, number> = {};
    for (const issue of open) {
      byType[issue.type] = (byType[issue.type] || 0) + 1;
    }

    const oldest = open.sort((a, b) => a.firstSeen - b.firstSeen)[0] || null;

    return {
      total: all.length,
      open: open.length,
      fixing: fixing.length,
      fixed: this.totalFixCount, // Total fixes ever completed (never decreases!)
      totalFixed: currentlyFixed.length, // Current issues in fixed state
      byType,
      oldestIssue: oldest,
    };
  }

  /**
   * Clean up old fixed issues
   */
  cleanup(maxAge = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAge;
    let removed = 0;

    for (const [id, issue] of this.issues) {
      if (issue.status === 'fixed' && issue.lastSeen < cutoff) {
        this.issues.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      this.saveState();
    }

    return removed;
  }

  /**
   * Force cleanup of all stale issues
   */
  async forceCleanup(): Promise<number> {
    await this.cleanupStaleIssues();
    await this.saveState();
    return this.issues.size;
  }

  /**
   * Reset all issues (start fresh)
   */
  async reset(): Promise<void> {
    this.issues.clear();
    this.fixLogs = [];
    await this.saveState();
    console.log('[IssueTracker] 🔄 All issues reset');
  }
}

// Singleton instance
export const issueTracker = new IssueTracker();
