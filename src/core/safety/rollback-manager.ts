// @version 2.3.0
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

export interface Snapshot {
  id: string;
  timestamp: number;
  description: string;
  actionType: string;
  actor: string;
  sessionId: string;
  scope: string[]; // Files affected
  gitCommit?: string; // Git SHA if available
  backupPath?: string; // Path to backup files
  metadata: Record<string, any>;
}

export interface RollbackResult {
  success: boolean;
  snapshotId: string;
  filesRestored: string[];
  errors: string[];
  duration: number;
}

export class RollbackManager {
  private snapshotsDir: string;
  private maxSnapshots: number;
  private activeSnapshots: Map<string, Snapshot>;

  constructor(snapshotsDir = './data/snapshots', maxSnapshots = 100) {
    this.snapshotsDir = snapshotsDir;
    this.maxSnapshots = maxSnapshots;
    this.activeSnapshots = new Map();
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.snapshotsDir, { recursive: true });
    console.log(`[RollbackManager] Initialized at ${this.snapshotsDir}`);
  }

  /**
   * Create a snapshot before a risky operation
   */
  async createSnapshot(options: {
    description: string;
    actionType: string;
    actor: string;
    sessionId: string;
    scope: string[];
    metadata?: Record<string, any>;
  }): Promise<Snapshot> {
    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    const snapshot: Snapshot = {
      id: snapshotId,
      timestamp,
      description: options.description,
      actionType: options.actionType,
      actor: options.actor,
      sessionId: options.sessionId,
      scope: options.scope,
      metadata: options.metadata || {},
    };

    try {
      // 1. Try to capture Git commit (best option)
      snapshot.gitCommit = await this.captureGitCommit();

      // 2. If Git is not available or fails, backup files directly
      if (!snapshot.gitCommit || snapshot.scope.length > 0) {
        snapshot.backupPath = await this.backupFiles(snapshotId, options.scope);
      }

      // 3. Save snapshot metadata
      const metadataPath = path.join(this.snapshotsDir, `${snapshotId}.json`);
      await fs.writeFile(metadataPath, JSON.stringify(snapshot, null, 2));

      this.activeSnapshots.set(snapshotId, snapshot);

      // 4. Cleanup old snapshots
      await this.cleanupOldSnapshots();

      console.log(`[RollbackManager] ✓ Created snapshot: ${snapshotId}`);
      return snapshot;
    } catch (error) {
      console.error(`[RollbackManager] ✗ Failed to create snapshot:`, error);
      throw new Error(`Snapshot creation failed: ${error}`);
    }
  }

  /**
   * Rollback to a specific snapshot
   */
  async rollback(snapshotId: string): Promise<RollbackResult> {
    const startTime = Date.now();
    const filesRestored: string[] = [];
    const errors: string[] = [];

    try {
      // 1. Load snapshot metadata
      const snapshot = await this.loadSnapshot(snapshotId);
      if (!snapshot) {
        throw new Error(`Snapshot not found: ${snapshotId}`);
      }

      console.log(`[RollbackManager] Rolling back to snapshot: ${snapshotId}`);

      // 2. Try Git rollback first (cleanest)
      if (snapshot.gitCommit) {
        try {
          console.log(`[RollbackManager] Attempting Git rollback to ${snapshot.gitCommit}`);

          // Create a new branch for the rollback
          const rollbackBranch = `rollback-${snapshotId}`;
          execSync(`git checkout -b ${rollbackBranch}`, { stdio: 'pipe' });

          // Reset to the snapshot commit
          execSync(`git reset --hard ${snapshot.gitCommit}`, { stdio: 'pipe' });

          filesRestored.push(...snapshot.scope);
          console.log(`[RollbackManager] ✓ Git rollback successful`);
        } catch (gitError) {
          console.warn(`[RollbackManager] Git rollback failed, trying file restoration:`, gitError);
          // Fall through to file restoration
        }
      }

      // 3. If Git failed or not available, restore from backup
      if (filesRestored.length === 0 && snapshot.backupPath) {
        console.log(`[RollbackManager] Restoring files from backup: ${snapshot.backupPath}`);

        for (const file of snapshot.scope) {
          try {
            const backupFile = path.join(snapshot.backupPath, this.sanitizePath(file));
            const fileExists = await fs
              .access(backupFile)
              .then(() => true)
              .catch(() => false);

            if (fileExists) {
              // Restore the file
              await fs.copyFile(backupFile, file);
              filesRestored.push(file);
            } else {
              errors.push(`Backup file not found: ${backupFile}`);
            }
          } catch (error) {
            errors.push(`Failed to restore ${file}: ${error}`);
          }
        }
      }

      const duration = Date.now() - startTime;
      const success = filesRestored.length > 0 && errors.length === 0;

      console.log(
        `[RollbackManager] ${success ? '✓' : '✗'} Rollback complete: ` +
          `${filesRestored.length} files restored, ${errors.length} errors`
      );

      return {
        success,
        snapshotId,
        filesRestored,
        errors,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[RollbackManager] ✗ Rollback failed:`, error);

      return {
        success: false,
        snapshotId,
        filesRestored,
        errors: [...errors, `Rollback exception: ${error}`],
        duration,
      };
    }
  }

  /**
   * Delete a snapshot after successful operation
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    try {
      const snapshot = await this.loadSnapshot(snapshotId);
      if (!snapshot) return;

      // Delete backup files
      if (snapshot.backupPath) {
        await fs.rm(snapshot.backupPath, { recursive: true, force: true });
      }

      // Delete metadata
      const metadataPath = path.join(this.snapshotsDir, `${snapshotId}.json`);
      await fs.unlink(metadataPath);

      this.activeSnapshots.delete(snapshotId);
      console.log(`[RollbackManager] ✓ Deleted snapshot: ${snapshotId}`);
    } catch (error) {
      console.error(`[RollbackManager] Failed to delete snapshot ${snapshotId}:`, error);
    }
  }

  /**
   * List all available snapshots
   */
  async listSnapshots(): Promise<Snapshot[]> {
    try {
      const files = await fs.readdir(this.snapshotsDir);
      const snapshots: Snapshot[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(this.snapshotsDir, file), 'utf-8');
          snapshots.push(JSON.parse(content));
        }
      }

      return snapshots.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('[RollbackManager] Failed to list snapshots:', error);
      return [];
    }
  }

  // Private helper methods

  private async captureGitCommit(): Promise<string | undefined> {
    try {
      const commit = execSync('git rev-parse HEAD', { stdio: 'pipe' }).toString().trim();
      return commit;
    } catch {
      return undefined;
    }
  }

  private async backupFiles(snapshotId: string, files: string[]): Promise<string> {
    const backupDir = path.join(this.snapshotsDir, snapshotId);
    await fs.mkdir(backupDir, { recursive: true });

    for (const file of files) {
      try {
        const fileExists = await fs
          .access(file)
          .then(() => true)
          .catch(() => false);
        if (!fileExists) continue;

        const backupPath = path.join(backupDir, this.sanitizePath(file));
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.copyFile(file, backupPath);
      } catch (error) {
        console.warn(`[RollbackManager] Failed to backup ${file}:`, error);
      }
    }

    return backupDir;
  }

  private async loadSnapshot(snapshotId: string): Promise<Snapshot | null> {
    try {
      // Check cache first
      if (this.activeSnapshots.has(snapshotId)) {
        return this.activeSnapshots.get(snapshotId)!;
      }

      // Load from disk
      const metadataPath = path.join(this.snapshotsDir, `${snapshotId}.json`);
      const content = await fs.readFile(metadataPath, 'utf-8');
      const snapshot = JSON.parse(content) as Snapshot;
      this.activeSnapshots.set(snapshotId, snapshot);
      return snapshot;
    } catch {
      return null;
    }
  }

  private async cleanupOldSnapshots(): Promise<void> {
    const snapshots = await this.listSnapshots();

    if (snapshots.length > this.maxSnapshots) {
      const toDelete = snapshots.slice(this.maxSnapshots);

      for (const snapshot of toDelete) {
        await this.deleteSnapshot(snapshot.id);
      }

      console.log(`[RollbackManager] Cleaned up ${toDelete.length} old snapshots`);
    }
  }

  private sanitizePath(filePath: string): string {
    // Convert absolute paths to relative safe paths
    return filePath.replace(/^\//, '').replace(/\.\./g, '__');
  }

  getStats() {
    return {
      snapshotsDir: this.snapshotsDir,
      maxSnapshots: this.maxSnapshots,
      activeSnapshots: this.activeSnapshots.size,
    };
  }
}

// Singleton instance
export const rollbackManager = new RollbackManager();
