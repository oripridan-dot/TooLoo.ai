// @version 2.3.0
/**
 * Audit Logger
 * Tracks all autonomous actions for compliance, debugging, and transparency
 */

import fs from 'fs/promises';
import path from 'path';
import { bus } from '../event-bus.js';

export interface AuditEntry {
  id: string;
  timestamp: number;
  actor: string; // Which agent/system
  action: string; // What was done
  actionType: string; // CODE_MODIFICATION, EXPERIMENT, etc.
  scope: string[]; // Files/modules affected
  riskLevel: string; // LOW, MEDIUM, HIGH, CRITICAL
  safetyScore: number;
  outcome: 'success' | 'failure' | 'blocked' | 'pending';
  duration: number; // milliseconds
  metadata: Record<string, any>;
  error?: string;
  rollbackAvailable: boolean;
  snapshotId?: string;
  sandboxId?: string;
}

export interface AuditStats {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  blockedActions: number;
  averageRiskLevel: string;
  actorBreakdown: Record<string, number>;
  actionTypeBreakdown: Record<string, number>;
  timeRange: {
    earliest: number;
    latest: number;
  };
}

export class AuditLogger {
  private logFilePath: string;
  private writeQueue: AuditEntry[] = [];
  private isWriting: boolean = false;
  private flushInterval: NodeJS.Timeout | null = null;
  private inMemoryCache: AuditEntry[] = [];
  private maxCacheSize: number = 1000;

  constructor(logDir: string = './data') {
    this.logFilePath = path.join(logDir, 'audit-log.jsonl');
    this.startAutoFlush();
    this.setupEventListeners();
    console.log(`[AuditLogger] Initialized: ${this.logFilePath}`);
  }

  /**
   * Log an autonomous action
   */
  async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<string> {
    const auditEntry: AuditEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    // Add to write queue
    this.writeQueue.push(auditEntry);

    // Add to in-memory cache
    this.inMemoryCache.push(auditEntry);
    if (this.inMemoryCache.length > this.maxCacheSize) {
      this.inMemoryCache.shift();
    }

    // Trigger flush if queue is large
    if (this.writeQueue.length >= 10) {
      await this.flush();
    }

    return auditEntry.id;
  }

  /**
   * Flush pending entries to disk
   */
  async flush(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0) {
      return;
    }

    this.isWriting = true;
    const entriesToWrite = [...this.writeQueue];
    this.writeQueue = [];

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.logFilePath), { recursive: true });

      // Append entries as JSONL (one JSON object per line)
      const lines = entriesToWrite.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
      await fs.appendFile(this.logFilePath, lines, 'utf-8');

      // Publish telemetry
      bus.publish('system', 'audit:entries_written', {
        count: entriesToWrite.length,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[AuditLogger] Failed to write entries:', error);
      // Re-queue failed entries
      this.writeQueue.unshift(...entriesToWrite);
    } finally {
      this.isWriting = false;
    }
  }

  /**
   * Query audit log by filters
   */
  async query(filters: {
    actor?: string;
    actionType?: string;
    outcome?: string;
    riskLevel?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<AuditEntry[]> {
    // First check in-memory cache
    let results = this.inMemoryCache.filter((entry) => {
      if (filters.actor && entry.actor !== filters.actor) return false;
      if (filters.actionType && entry.actionType !== filters.actionType) return false;
      if (filters.outcome && entry.outcome !== filters.outcome) return false;
      if (filters.riskLevel && entry.riskLevel !== filters.riskLevel) return false;
      if (filters.startTime && entry.timestamp < filters.startTime) return false;
      if (filters.endTime && entry.timestamp > filters.endTime) return false;
      return true;
    });

    // If cache doesn't have enough results, read from disk
    if (results.length < (filters.limit || 100)) {
      const diskResults = await this.readFromDisk(filters);

      // Merge and deduplicate
      const allResults = [...results, ...diskResults];
      const uniqueMap = new Map<string, AuditEntry>();
      allResults.forEach((entry) => uniqueMap.set(entry.id, entry));
      results = Array.from(uniqueMap.values());
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    return results.slice(0, filters.limit || 100);
  }

  /**
   * Get audit statistics
   */
  async getStats(timeRange?: { start: number; end: number }): Promise<AuditStats> {
    const entries = await this.query({
      startTime: timeRange?.start,
      endTime: timeRange?.end,
      limit: 10000,
    });

    const stats: AuditStats = {
      totalActions: entries.length,
      successfulActions: 0,
      failedActions: 0,
      blockedActions: 0,
      averageRiskLevel: 'MEDIUM',
      actorBreakdown: {},
      actionTypeBreakdown: {},
      timeRange: {
        earliest: entries.length > 0 ? Math.min(...entries.map((e) => e.timestamp)) : 0,
        latest: entries.length > 0 ? Math.max(...entries.map((e) => e.timestamp)) : 0,
      },
    };

    const riskScores: Record<string, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };

    let totalRiskScore = 0;

    entries.forEach((entry) => {
      // Outcome counts
      if (entry.outcome === 'success') stats.successfulActions++;
      else if (entry.outcome === 'failure') stats.failedActions++;
      else if (entry.outcome === 'blocked') stats.blockedActions++;

      // Actor breakdown
      stats.actorBreakdown[entry.actor] = (stats.actorBreakdown[entry.actor] || 0) + 1;

      // Action type breakdown
      stats.actionTypeBreakdown[entry.actionType] =
        (stats.actionTypeBreakdown[entry.actionType] || 0) + 1;

      // Risk level average
      totalRiskScore += riskScores[entry.riskLevel] || 2;
    });

    // Calculate average risk level
    if (entries.length > 0) {
      const avgScore = totalRiskScore / entries.length;
      if (avgScore < 1.5) stats.averageRiskLevel = 'LOW';
      else if (avgScore < 2.5) stats.averageRiskLevel = 'MEDIUM';
      else if (avgScore < 3.5) stats.averageRiskLevel = 'HIGH';
      else stats.averageRiskLevel = 'CRITICAL';
    }

    return stats;
  }

  /**
   * Get recent entries (from cache)
   */
  getRecent(limit: number = 50): AuditEntry[] {
    return this.inMemoryCache.slice(-limit).reverse();
  }

  /**
   * Clear old entries (for maintenance)
   */
  async archiveOldEntries(olderThanDays: number = 90): Promise<number> {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    try {
      // Read all entries
      const content = await fs.readFile(this.logFilePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      // Filter and separate
      const toKeep: string[] = [];
      const toArchive: string[] = [];

      lines.forEach((line) => {
        try {
          const entry = JSON.parse(line) as AuditEntry;
          if (entry.timestamp >= cutoffTime) {
            toKeep.push(line);
          } else {
            toArchive.push(line);
          }
        } catch {
          toKeep.push(line); // Keep malformed entries to avoid data loss
        }
      });

      // Write active entries back
      await fs.writeFile(this.logFilePath, toKeep.join('\n') + '\n', 'utf-8');

      // Write archive
      if (toArchive.length > 0) {
        const archivePath = this.logFilePath.replace('.jsonl', `-archive-${Date.now()}.jsonl`);
        await fs.writeFile(archivePath, toArchive.join('\n') + '\n', 'utf-8');
        console.log(`[AuditLogger] Archived ${toArchive.length} old entries to ${archivePath}`);
      }

      return toArchive.length;
    } catch (error) {
      console.error('[AuditLogger] Archive failed:', error);
      return 0;
    }
  }

  private async readFromDisk(filters: any): Promise<AuditEntry[]> {
    try {
      const content = await fs.readFile(this.logFilePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      const entries: AuditEntry[] = [];
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as AuditEntry;

          // Apply filters
          if (filters.actor && entry.actor !== filters.actor) continue;
          if (filters.actionType && entry.actionType !== filters.actionType) continue;
          if (filters.outcome && entry.outcome !== filters.outcome) continue;
          if (filters.riskLevel && entry.riskLevel !== filters.riskLevel) continue;
          if (filters.startTime && entry.timestamp < filters.startTime) continue;
          if (filters.endTime && entry.timestamp > filters.endTime) continue;

          entries.push(entry);
        } catch {
          // Skip malformed entries
        }
      }

      return entries;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return []; // File doesn't exist yet
      }
      console.error('[AuditLogger] Failed to read from disk:', error);
      return [];
    }
  }

  private startAutoFlush(): void {
    // Flush every 10 seconds
    this.flushInterval = setInterval(() => {
      this.flush().catch((err) => console.error('[AuditLogger] Auto-flush failed:', err));
    }, 10000);
  }

  private setupEventListeners(): void {
    // Listen for system events and auto-log important ones
    bus.subscribeTo('exploration:experiment_completed', (data: any) => {
      this.log({
        actor: 'ExplorationEngine',
        action: `Experiment completed: ${data.type}`,
        actionType: 'EXPERIMENT_EXECUTION',
        scope: [data.targetArea],
        riskLevel: data.riskLevel || 'MEDIUM',
        safetyScore: data.confidence || 0.5,
        outcome: data.success ? 'success' : 'failure',
        duration: 0,
        metadata: data,
        rollbackAvailable: !!data.snapshotId,
        snapshotId: data.snapshotId,
        sandboxId: data.sandboxId,
      }).catch((err) => console.error('[AuditLogger] Failed to log experiment:', err));
    });

    bus.subscribeTo('qa:fix_completed', (data: any) => {
      this.log({
        actor: 'AutonomousFixer',
        action: `Fix completed: ${data.issue.type}`,
        actionType: 'CODE_MODIFICATION',
        scope: data.issue.files || [],
        riskLevel: 'MEDIUM',
        safetyScore: 0.7,
        outcome: data.result.success ? 'success' : 'failure',
        duration: data.result.duration || 0,
        metadata: data,
        rollbackAvailable: false,
      }).catch((err) => console.error('[AuditLogger] Failed to log fix:', err));
    });

    bus.subscribeTo('circuit:tripped', (data: any) => {
      this.log({
        actor: 'CircuitBreaker',
        action: `Circuit tripped: ${data.reason}`,
        actionType: 'SYSTEM_COMMAND',
        scope: ['system'],
        riskLevel: 'CRITICAL',
        safetyScore: 0,
        outcome: 'blocked',
        duration: 0,
        metadata: data,
        rollbackAvailable: false,
      }).catch((err) => console.error('[AuditLogger] Failed to log circuit trip:', err));
    });
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
    console.log('[AuditLogger] Shutdown complete');
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();
