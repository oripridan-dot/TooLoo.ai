// @version 3.3.195
/* eslint-disable no-console */
/**
 * TooLoo Workspace Cloner
 *
 * Creates full mirrors of the TooLoo workspace for use in reflection sandboxes.
 * Supports both full cloning and incremental sync with smart exclusions.
 *
 * Features:
 * - Full workspace mirroring with git state
 * - Incremental sync for changed files only
 * - Smart exclusions (node_modules, dist, temp)
 * - Archive-based transfer for Docker volumes
 * - Git-aware cloning preserves branch/commit info
 *
 * @module core/sandbox/workspace-cloner
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { exec, execSync } from 'child_process';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface CloneOptions {
  /** Source workspace directory */
  source: string;
  /** Destination directory or Docker container:path */
  destination: string;
  /** Whether destination is a Docker container */
  isDocker: boolean;
  /** Container ID if isDocker */
  containerId?: string;
  /** Exclude patterns (glob-like) */
  excludes?: string[];
  /** Include only these paths (relative) */
  includes?: string[];
  /** Preserve git state */
  preserveGit: boolean;
  /** Use archive for transfer (faster for Docker) */
  useArchive: boolean;
  /** Timeout in ms */
  timeout?: number;
}

export interface CloneResult {
  success: boolean;
  filesCloned: number;
  bytesTransferred: number;
  duration: number;
  errors: string[];
  gitBranch?: string;
  gitCommit?: string;
}

export interface SyncOptions extends CloneOptions {
  /** Only sync files changed since this timestamp */
  since?: number;
  /** Checksum verification */
  verifyChecksums?: boolean;
}

export interface SyncResult extends CloneResult {
  filesUpdated: number;
  filesAdded: number;
  filesRemoved: number;
  checksumMismatches: number;
}

export interface WorkspaceManifest {
  timestamp: number;
  gitBranch: string;
  gitCommit: string;
  totalFiles: number;
  totalSize: number;
  fileChecksums: Record<string, string>;
}

// ============================================================================
// DEFAULT EXCLUSIONS
// ============================================================================

const DEFAULT_EXCLUDES = [
  'node_modules',
  '.git/objects',
  '.git/lfs',
  'dist',
  'temp',
  'data/artifacts/versions',
  'data/qa-reports',
  'data/test-reports',
  '*.log',
  '.DS_Store',
  'coverage',
  '.nyc_output',
];

// Files that should ALWAYS be excluded for safety
const CRITICAL_EXCLUDES = [
  '.env',
  '.env.local',
  '.env.production',
  'secrets.json',
  '*.pem',
  '*.key',
];

// ============================================================================
// WORKSPACE CLONER
// ============================================================================

export class WorkspaceCloner extends EventEmitter {
  private defaultTimeout: number = 300000; // 5 minutes

  constructor() {
    super();
  }

  // --------------------------------------------------------------------------
  // FULL CLONE
  // --------------------------------------------------------------------------

  /**
   * Create a full clone of the workspace
   */
  async clone(options: CloneOptions): Promise<CloneResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    console.log(`[WorkspaceCloner] Cloning ${options.source} → ${options.destination}`);

    // Build exclude list
    const excludes = [...DEFAULT_EXCLUDES, ...CRITICAL_EXCLUDES, ...(options.excludes || [])];

    try {
      let result: CloneResult;

      if (options.useArchive && options.isDocker) {
        result = await this.cloneViaArchive(options, excludes);
      } else if (options.isDocker) {
        result = await this.cloneViaDockerCp(options, excludes);
      } else {
        result = await this.cloneViaRsync(options, excludes);
      }

      // Clone git state separately if needed
      if (options.preserveGit) {
        const gitResult = await this.cloneGitState(options);
        result.gitBranch = gitResult.branch;
        result.gitCommit = gitResult.commit;
      }

      result.duration = Date.now() - startTime;
      result.errors = errors;

      this.emit('cloned', result);
      console.log(`[WorkspaceCloner] ✓ Cloned ${result.filesCloned} files in ${result.duration}ms`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      errors.push(error instanceof Error ? error.message : String(error));

      return {
        success: false,
        filesCloned: 0,
        bytesTransferred: 0,
        duration,
        errors,
      };
    }
  }

  private async cloneViaArchive(options: CloneOptions, excludes: string[]): Promise<CloneResult> {
    const archivePath = `/tmp/workspace-clone-${Date.now()}.tar.gz`;

    // Build tar exclude args
    const excludeArgs = excludes.map((e) => `--exclude='${e}'`).join(' ');

    // Create archive
    console.log('[WorkspaceCloner] Creating archive...');
    await this.execCommand(
      `tar -czf ${archivePath} ${excludeArgs} -C ${options.source} .`,
      options.timeout
    );

    // Get archive size
    const stats = await fs.stat(archivePath);
    const bytesTransferred = stats.size;

    // Copy to container
    console.log('[WorkspaceCloner] Copying to container...');
    await this.execCommand(
      `docker cp ${archivePath} ${options.containerId}:/tmp/workspace.tar.gz`,
      options.timeout
    );

    // Extract in container
    console.log('[WorkspaceCloner] Extracting in container...');
    await this.execCommand(
      `docker exec ${options.containerId} tar -xzf /tmp/workspace.tar.gz -C ${options.destination}`,
      options.timeout
    );

    // Cleanup
    await fs.unlink(archivePath);
    await this.execCommand(`docker exec ${options.containerId} rm /tmp/workspace.tar.gz`);

    // Count files
    const countResult = await this.execCommand(
      `docker exec ${options.containerId} find ${options.destination} -type f | wc -l`
    );
    const filesCloned = parseInt(countResult.trim()) || 0;

    return {
      success: true,
      filesCloned,
      bytesTransferred,
      duration: 0, // Will be set by caller
      errors: [],
    };
  }

  private async cloneViaDockerCp(options: CloneOptions, excludes: string[]): Promise<CloneResult> {
    // For docker cp, we need to handle excludes differently
    // Create a temp directory with filtered content
    const tempDir = `/tmp/workspace-filtered-${Date.now()}`;
    await fs.ensureDir(tempDir);

    try {
      // Use rsync to create filtered copy
      const excludeArgs = excludes.map((e) => `--exclude='${e}'`).join(' ');
      await this.execCommand(
        `rsync -a ${excludeArgs} ${options.source}/ ${tempDir}/`,
        options.timeout
      );

      // Copy to container
      await this.execCommand(
        `docker cp ${tempDir}/. ${options.containerId}:${options.destination}`,
        options.timeout
      );

      // Count files
      const countResult = await this.execCommand(`find ${tempDir} -type f | wc -l`);
      const filesCloned = parseInt(countResult.trim()) || 0;

      // Calculate size
      const sizeResult = await this.execCommand(`du -sb ${tempDir} | cut -f1`);
      const bytesTransferred = parseInt(sizeResult.trim()) || 0;

      return {
        success: true,
        filesCloned,
        bytesTransferred,
        duration: 0,
        errors: [],
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  private async cloneViaRsync(options: CloneOptions, excludes: string[]): Promise<CloneResult> {
    const excludeArgs = excludes.map((e) => `--exclude='${e}'`).join(' ');

    await this.execCommand(
      `rsync -av --delete ${excludeArgs} ${options.source}/ ${options.destination}/`,
      options.timeout
    );

    // Count files
    const countResult = await this.execCommand(`find ${options.destination} -type f | wc -l`);
    const filesCloned = parseInt(countResult.trim()) || 0;

    // Calculate size
    const sizeResult = await this.execCommand(`du -sb ${options.destination} | cut -f1`);
    const bytesTransferred = parseInt(sizeResult.trim()) || 0;

    return {
      success: true,
      filesCloned,
      bytesTransferred,
      duration: 0,
      errors: [],
    };
  }

  private async cloneGitState(options: CloneOptions): Promise<{ branch: string; commit: string }> {
    const gitDir = path.join(options.source, '.git');

    if (!(await fs.pathExists(gitDir))) {
      return { branch: 'main', commit: 'unknown' };
    }

    // Get current branch and commit
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: options.source,
      encoding: 'utf-8',
    }).trim();

    const commit = execSync('git rev-parse HEAD', {
      cwd: options.source,
      encoding: 'utf-8',
    }).trim();

    // Copy .git directory
    if (options.isDocker) {
      await this.execCommand(`docker cp ${gitDir} ${options.containerId}:${options.destination}/`);
    } else {
      await fs.copy(gitDir, path.join(options.destination, '.git'));
    }

    return { branch, commit };
  }

  // --------------------------------------------------------------------------
  // INCREMENTAL SYNC
  // --------------------------------------------------------------------------

  /**
   * Incrementally sync changes to destination
   */
  async sync(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    console.log(`[WorkspaceCloner] Syncing ${options.source} → ${options.destination}`);

    const excludes = [...DEFAULT_EXCLUDES, ...CRITICAL_EXCLUDES, ...(options.excludes || [])];

    try {
      let filesUpdated = 0;
      const filesAdded = 0;
      const filesRemoved = 0;
      const checksumMismatches = 0;

      if (options.includes && options.includes.length > 0) {
        // Sync specific files only
        for (const relativePath of options.includes) {
          const srcPath = path.join(options.source, relativePath);

          if (!(await fs.pathExists(srcPath))) {
            continue;
          }

          if (options.isDocker) {
            const destPath = path.posix.join(options.destination, relativePath);
            // Ensure parent directory exists
            await this.execCommand(
              `docker exec ${options.containerId} mkdir -p $(dirname ${destPath})`
            );
            await this.execCommand(`docker cp ${srcPath} ${options.containerId}:${destPath}`);
          } else {
            const destPath = path.join(options.destination, relativePath);
            await fs.ensureDir(path.dirname(destPath));
            await fs.copy(srcPath, destPath);
          }
          filesUpdated++;
        }
      } else {
        // Full sync with rsync
        const result = await this.cloneViaRsync(options as CloneOptions, excludes);
        filesUpdated = result.filesCloned;
      }

      // Sync git state
      let gitBranch: string | undefined;
      let gitCommit: string | undefined;

      if (options.preserveGit) {
        const gitResult = await this.cloneGitState(options as CloneOptions);
        gitBranch = gitResult.branch;
        gitCommit = gitResult.commit;
      }

      const duration = Date.now() - startTime;

      const result: SyncResult = {
        success: true,
        filesCloned: filesUpdated + filesAdded,
        filesUpdated,
        filesAdded,
        filesRemoved,
        bytesTransferred: 0, // Would need to calculate
        checksumMismatches,
        duration,
        errors,
        gitBranch,
        gitCommit,
      };

      this.emit('synced', result);
      console.log(`[WorkspaceCloner] ✓ Synced ${filesUpdated} files in ${duration}ms`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      errors.push(error instanceof Error ? error.message : String(error));

      return {
        success: false,
        filesCloned: 0,
        filesUpdated: 0,
        filesAdded: 0,
        filesRemoved: 0,
        bytesTransferred: 0,
        checksumMismatches: 0,
        duration,
        errors,
      };
    }
  }

  // --------------------------------------------------------------------------
  // MANIFEST
  // --------------------------------------------------------------------------

  /**
   * Generate a manifest of workspace contents
   */
  async generateManifest(workspacePath: string): Promise<WorkspaceManifest> {
    console.log('[WorkspaceCloner] Generating workspace manifest...');

    const fileChecksums: Record<string, string> = {};
    let totalFiles = 0;
    let totalSize = 0;

    // Get git info
    let gitBranch = 'unknown';
    let gitCommit = 'unknown';

    try {
      gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: workspacePath,
        encoding: 'utf-8',
      }).trim();

      gitCommit = execSync('git rev-parse HEAD', {
        cwd: workspacePath,
        encoding: 'utf-8',
      }).trim();
    } catch {
      // Not a git repo
    }

    // Walk directory and compute checksums for important files
    const importantExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.yaml', '.yml'];

    const walkDir = async (dir: string, relativePath: string = ''): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);

        // Skip excluded directories
        if (DEFAULT_EXCLUDES.some((ex) => relPath.includes(ex))) {
          continue;
        }

        if (entry.isDirectory()) {
          await walkDir(fullPath, relPath);
        } else if (entry.isFile()) {
          totalFiles++;
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;

          // Only compute checksums for important files
          if (importantExtensions.some((ext) => entry.name.endsWith(ext))) {
            const content = await fs.readFile(fullPath);
            const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
            fileChecksums[relPath] = hash;
          }
        }
      }
    };

    await walkDir(workspacePath);

    return {
      timestamp: Date.now(),
      gitBranch,
      gitCommit,
      totalFiles,
      totalSize,
      fileChecksums,
    };
  }

  /**
   * Compare two manifests to find differences
   */
  compareManifests(
    source: WorkspaceManifest,
    target: WorkspaceManifest
  ): { added: string[]; removed: string[]; modified: string[] } {
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    const sourceFiles = new Set(Object.keys(source.fileChecksums));
    const targetFiles = new Set(Object.keys(target.fileChecksums));

    // Find added files
    for (const file of sourceFiles) {
      if (!targetFiles.has(file)) {
        added.push(file);
      } else if (source.fileChecksums[file] !== target.fileChecksums[file]) {
        modified.push(file);
      }
    }

    // Find removed files
    for (const file of targetFiles) {
      if (!sourceFiles.has(file)) {
        removed.push(file);
      }
    }

    return { added, removed, modified };
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  private execCommand(command: string, timeout?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(
        command,
        {
          timeout: timeout || this.defaultTimeout,
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Command failed: ${stderr || error.message}`));
          } else {
            resolve(stdout);
          }
        }
      );
    });
  }

  /**
   * Extract a file from Docker container to host
   */
  async extractFromContainer(
    containerId: string,
    containerPath: string,
    hostPath: string
  ): Promise<void> {
    await fs.ensureDir(path.dirname(hostPath));
    await this.execCommand(`docker cp ${containerId}:${containerPath} ${hostPath}`);
  }

  /**
   * Get list of modified files in Docker container git repo
   */
  async getModifiedFiles(containerId: string, workDir: string): Promise<string[]> {
    const result = await this.execCommand(
      `docker exec -w ${workDir} ${containerId} git diff --name-only HEAD`
    );
    return result.trim().split('\n').filter(Boolean);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const workspaceCloner = new WorkspaceCloner();
export default WorkspaceCloner;
