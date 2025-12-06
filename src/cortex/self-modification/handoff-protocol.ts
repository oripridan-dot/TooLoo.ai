// @version 3.3.195
/* eslint-disable no-console */
/**
 * TooLoo Handoff Protocol
 *
 * Manages the safe promotion of validated changes from the reflection sandbox
 * to the production codebase. The handoff protocol ensures:
 *
 * 1. Only validated changes (tests pass, TypeScript compiles) can be promoted
 * 2. Full audit trail of what was promoted and when
 * 3. Automatic backup creation before applying to production
 * 4. Rollback capability if production issues are detected
 * 5. Integration with git for proper versioning
 *
 * Flow:
 * 1. Reflection sandbox completes with readyForPromotion: true
 * 2. HandoffProtocol.prepare() extracts and validates the artifact
 * 3. HandoffProtocol.review() allows human inspection (optional)
 * 4. HandoffProtocol.execute() applies changes to production
 * 5. HandoffProtocol.verify() runs production tests
 * 6. HandoffProtocol.commit() creates git commit
 *
 * @module cortex/self-modification/handoff-protocol
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { bus } from '../../core/event-bus.js';
import { selfMod } from '../motor/self-modification.js';
import { reflectionSandbox } from './reflection-sandbox.js';
import { ReflectionResult } from './reflection-loop.js';

// ============================================================================
// TYPES
// ============================================================================

export interface HandoffArtifact {
  /** Unique artifact ID */
  id: string;
  /** Source sandbox ID */
  sandboxId: string;
  /** Session ID from reflection */
  sessionId: string;
  /** Commit hash in sandbox */
  sourceCommit: string;
  /** Files to be modified */
  files: FileChange[];
  /** Git diff */
  diff: string;
  /** Test results from sandbox */
  testResults: {
    passed: number;
    total: number;
    duration: number;
  };
  /** TypeScript compilation status */
  typeCheckPassed: boolean;
  /** Creation timestamp */
  createdAt: number;
  /** Expiration timestamp (artifacts expire) */
  expiresAt: number;
  /** Status */
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'expired';
  /** Objective/purpose */
  objective: string;
  /** Metadata */
  metadata: Record<string, unknown>;
}

export interface FileChange {
  /** Relative file path */
  path: string;
  /** Type of change */
  type: 'create' | 'modify' | 'delete';
  /** New content (for create/modify) */
  content?: string;
  /** Lines added */
  additions: number;
  /** Lines removed */
  deletions: number;
}

export interface HandoffResult {
  /** Success status */
  success: boolean;
  /** Artifact that was processed */
  artifactId: string;
  /** Files successfully applied */
  filesApplied: number;
  /** Files that failed */
  filesFailed: number;
  /** Production commit hash (if committed) */
  productionCommit: string | null;
  /** Backup paths created */
  backups: string[];
  /** Errors encountered */
  errors: string[];
  /** Duration in ms */
  duration: number;
  /** Rollback available? */
  canRollback: boolean;
}

export interface ReviewResult {
  /** Approved for promotion */
  approved: boolean;
  /** Reviewer identifier */
  reviewer: string;
  /** Review timestamp */
  timestamp: number;
  /** Comments */
  comments: string;
  /** Files approved (subset if partial) */
  approvedFiles?: string[];
}

export interface HandoffConfig {
  /** Require human approval before handoff */
  requireApproval: boolean;
  /** Auto-commit after successful handoff */
  autoCommit: boolean;
  /** Run production tests after handoff */
  runProductionTests: boolean;
  /** Auto-rollback on production test failure */
  autoRollbackOnFailure: boolean;
  /** Artifact expiration time in ms */
  artifactExpirationMs: number;
  /** Max artifacts to keep */
  maxArtifacts: number;
  /** Protected paths that cannot be promoted */
  protectedPaths: string[];
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: HandoffConfig = {
  requireApproval: true,
  autoCommit: true,
  runProductionTests: true,
  autoRollbackOnFailure: true,
  artifactExpirationMs: 24 * 60 * 60 * 1000, // 24 hours
  maxArtifacts: 50,
  protectedPaths: [
    '.env',
    '.env.local',
    'package-lock.json',
    'src/main.ts',
    'src/cortex/motor/autonomous-modifier.ts',
    'src/cortex/self-modification/handoff-protocol.ts',
  ],
};

// ============================================================================
// HANDOFF PROTOCOL
// ============================================================================

export class HandoffProtocol extends EventEmitter {
  private config: HandoffConfig;
  private artifacts: Map<string, HandoffArtifact> = new Map();
  private artifactsDir: string;
  private initialized: boolean = false;

  constructor(config: Partial<HandoffConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.artifactsDir = path.join(process.cwd(), 'data', 'handoff-artifacts');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await fs.ensureDir(this.artifactsDir);
    await this.loadArtifacts();
    await this.cleanupExpiredArtifacts();

    this.initialized = true;
    console.log('[HandoffProtocol] Initialized');
  }

  // --------------------------------------------------------------------------
  // ARTIFACT MANAGEMENT
  // --------------------------------------------------------------------------

  private async loadArtifacts(): Promise<void> {
    try {
      const files = await fs.readdir(this.artifactsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const artifact = await fs.readJson(path.join(this.artifactsDir, file));
          this.artifacts.set(artifact.id, artifact);
        }
      }
      console.log(`[HandoffProtocol] Loaded ${this.artifacts.size} artifacts`);
    } catch (error) {
      console.error('[HandoffProtocol] Failed to load artifacts:', error);
    }
  }

  private async saveArtifact(artifact: HandoffArtifact): Promise<void> {
    const filePath = path.join(this.artifactsDir, `${artifact.id}.json`);
    await fs.writeJson(filePath, artifact, { spaces: 2 });
    this.artifacts.set(artifact.id, artifact);
  }

  private async deleteArtifact(artifactId: string): Promise<void> {
    const filePath = path.join(this.artifactsDir, `${artifactId}.json`);
    await fs.unlink(filePath).catch(() => {});
    this.artifacts.delete(artifactId);
  }

  private async cleanupExpiredArtifacts(): Promise<void> {
    const now = Date.now();
    const expired: string[] = [];

    for (const [id, artifact] of this.artifacts) {
      if (artifact.expiresAt < now) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      await this.deleteArtifact(id);
    }

    if (expired.length > 0) {
      console.log(`[HandoffProtocol] Cleaned up ${expired.length} expired artifacts`);
    }

    // Also enforce max artifacts limit
    if (this.artifacts.size > this.config.maxArtifacts) {
      const sorted = Array.from(this.artifacts.values()).sort((a, b) => a.createdAt - b.createdAt);

      const toDelete = sorted.slice(0, this.artifacts.size - this.config.maxArtifacts);
      for (const artifact of toDelete) {
        await this.deleteArtifact(artifact.id);
      }
    }
  }

  // --------------------------------------------------------------------------
  // PREPARATION
  // --------------------------------------------------------------------------

  /**
   * Prepare a handoff artifact from a reflection result
   */
  async prepare(
    reflectionResult: ReflectionResult,
    options: { objective?: string; metadata?: Record<string, unknown> } = {}
  ): Promise<HandoffArtifact> {
    await this.initialize();

    if (!reflectionResult.readyForPromotion) {
      throw new Error('Reflection result is not ready for promotion');
    }

    if (!reflectionResult.commitHash) {
      throw new Error('Reflection result has no commit hash');
    }

    console.log('[HandoffProtocol] Preparing handoff artifact...');

    // Get diff from sandbox
    const diff = (await reflectionSandbox.getDiff()) || '';

    // Get list of changed files
    const filesResult = await reflectionSandbox.execInContainer('git diff --name-only HEAD~1');
    const changedFiles = filesResult.stdout.trim().split('\n').filter(Boolean);

    // Extract file changes with content
    const files: FileChange[] = [];
    for (const filePath of changedFiles) {
      // Check protected paths
      if (this.config.protectedPaths.some((p) => filePath.includes(p))) {
        console.warn(`[HandoffProtocol] Skipping protected path: ${filePath}`);
        continue;
      }

      try {
        const content = await reflectionSandbox.readFile(filePath);

        // Get diff stats for this file
        const statsResult = await reflectionSandbox.execInContainer(
          `git diff --numstat HEAD~1 -- ${filePath}`
        );
        const [additions, deletions] = statsResult.stdout.trim().split('\t').map(Number);

        files.push({
          path: filePath,
          type: 'modify', // Could be smarter about create/delete
          content,
          additions: additions || 0,
          deletions: deletions || 0,
        });
      } catch (error) {
        console.warn(`[HandoffProtocol] Could not read file ${filePath}:`, error);
      }
    }

    // Create artifact
    const artifact: HandoffArtifact = {
      id: uuidv4(),
      sandboxId: reflectionSandbox.getState().id,
      sessionId: reflectionResult.task.id,
      sourceCommit: reflectionResult.commitHash,
      files,
      diff,
      testResults: {
        passed: reflectionResult.finalTestResult
          ? reflectionResult.finalTestResult.total - reflectionResult.finalTestResult.failed
          : 0,
        total: reflectionResult.finalTestResult?.total || 0,
        duration: reflectionResult.finalTestResult?.duration || 0,
      },
      typeCheckPassed: true, // Assumed if ready for promotion
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.artifactExpirationMs,
      status: 'pending',
      objective: options.objective || reflectionResult.task.objective,
      metadata: options.metadata || {},
    };

    await this.saveArtifact(artifact);

    bus.publish('cortex', 'handoff:artifact_prepared', {
      artifactId: artifact.id,
      filesCount: files.length,
      objective: artifact.objective,
    });

    console.log(`[HandoffProtocol] ✓ Artifact prepared: ${artifact.id}`);
    return artifact;
  }

  // --------------------------------------------------------------------------
  // REVIEW
  // --------------------------------------------------------------------------

  /**
   * Review an artifact (human or automated)
   */
  async review(artifactId: string, review: ReviewResult): Promise<HandoffArtifact> {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    if (artifact.status !== 'pending') {
      throw new Error(`Artifact is not pending review: ${artifact.status}`);
    }

    if (review.approved) {
      artifact.status = 'approved';

      // Filter files if partial approval
      if (review.approvedFiles) {
        artifact.files = artifact.files.filter((f) => review.approvedFiles?.includes(f.path));
      }
    } else {
      artifact.status = 'expired'; // Rejected = expired
    }

    artifact.metadata['review'] = review;
    await this.saveArtifact(artifact);

    bus.publish('cortex', 'handoff:artifact_reviewed', {
      artifactId,
      approved: review.approved,
      reviewer: review.reviewer,
    });

    return artifact;
  }

  /**
   * Get artifact for review
   */
  getArtifact(artifactId: string): HandoffArtifact | undefined {
    return this.artifacts.get(artifactId);
  }

  /**
   * Get all pending artifacts
   */
  getPendingArtifacts(): HandoffArtifact[] {
    return Array.from(this.artifacts.values()).filter(
      (a) => a.status === 'pending' || a.status === 'approved'
    );
  }

  // --------------------------------------------------------------------------
  // EXECUTION
  // --------------------------------------------------------------------------

  /**
   * Execute the handoff - apply changes to production
   */
  async execute(
    artifactId: string,
    options: { skipApprovalCheck?: boolean } = {}
  ): Promise<HandoffResult> {
    await this.initialize();

    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    // Check approval requirement
    if (
      this.config.requireApproval &&
      artifact.status !== 'approved' &&
      !options.skipApprovalCheck
    ) {
      throw new Error('Artifact requires approval before execution');
    }

    console.log(`[HandoffProtocol] Executing handoff: ${artifactId}`);
    const startTime = Date.now();
    const backups: string[] = [];
    const errors: string[] = [];
    let filesApplied = 0;
    let filesFailed = 0;

    artifact.status = 'executing';
    await this.saveArtifact(artifact);

    try {
      // Apply each file change
      for (const file of artifact.files) {
        try {
          console.log(`[HandoffProtocol] Applying: ${file.path}`);

          if (file.type === 'delete') {
            // Delete file
            const result = await selfMod.deleteFile(file.path, `Handoff: ${artifact.objective}`);
            if (result.success && result.backup) {
              backups.push(result.backup);
            }
          } else if (file.content) {
            // Create or modify file
            const fullPath = path.join(process.cwd(), file.path);
            const exists = await fs.pathExists(fullPath);

            if (exists) {
              // Edit existing file
              const current = await fs.readFile(fullPath, 'utf-8');
              const result = await selfMod.editFile({
                filePath: file.path,
                oldCode: current,
                newCode: file.content,
                reason: `Handoff: ${artifact.objective}`,
              });
              if (result.success) {
                filesApplied++;
                if (result.backup) backups.push(result.backup);
              } else {
                filesFailed++;
                errors.push(`${file.path}: ${result.message}`);
              }
            } else {
              // Create new file
              const result = await selfMod.createFile(
                file.path,
                file.content,
                `Handoff: ${artifact.objective}`
              );
              if (result.success) {
                filesApplied++;
              } else {
                filesFailed++;
                errors.push(`${file.path}: ${result.message}`);
              }
            }
          }
        } catch (error) {
          filesFailed++;
          errors.push(`${file.path}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Run production tests if configured
      let productionTestsPassed = true;
      if (this.config.runProductionTests && filesApplied > 0) {
        console.log('[HandoffProtocol] Running production tests...');
        const testResult = await selfMod.runTests();
        productionTestsPassed = testResult.passed;

        if (!productionTestsPassed && this.config.autoRollbackOnFailure) {
          console.error('[HandoffProtocol] Production tests failed, rolling back...');

          for (const backup of backups) {
            await selfMod.restoreBackup(backup);
          }

          artifact.status = 'failed';
          artifact.metadata['failureReason'] = 'Production tests failed';
          await this.saveArtifact(artifact);

          return {
            success: false,
            artifactId,
            filesApplied: 0,
            filesFailed: artifact.files.length,
            productionCommit: null,
            backups,
            errors: ['Production tests failed, changes rolled back'],
            duration: Date.now() - startTime,
            canRollback: false,
          };
        }
      }

      // Commit changes if configured
      let productionCommit: string | null = null;
      if (this.config.autoCommit && filesApplied > 0) {
        try {
          execSync('git add -A', { cwd: process.cwd(), stdio: 'pipe' });
          execSync(`git commit -m "Handoff: ${artifact.objective}" -m "Artifact: ${artifactId}"`, {
            cwd: process.cwd(),
            stdio: 'pipe',
          });
          productionCommit = execSync('git rev-parse HEAD', {
            cwd: process.cwd(),
            encoding: 'utf-8',
          }).trim();

          console.log(`[HandoffProtocol] Committed: ${productionCommit}`);
        } catch (error) {
          console.warn('[HandoffProtocol] Git commit failed:', error);
        }
      }

      artifact.status = filesFailed === 0 ? 'completed' : 'failed';
      artifact.metadata['productionCommit'] = productionCommit;
      artifact.metadata['completedAt'] = Date.now();
      await this.saveArtifact(artifact);

      const result: HandoffResult = {
        success: filesFailed === 0,
        artifactId,
        filesApplied,
        filesFailed,
        productionCommit,
        backups,
        errors,
        duration: Date.now() - startTime,
        canRollback: backups.length > 0,
      };

      bus.publish('cortex', 'handoff:executed', {
        artifactId,
        success: result.success,
        filesApplied,
        productionCommit,
      });

      console.log(
        `[HandoffProtocol] ✓ Handoff complete: ${filesApplied}/${artifact.files.length} files`
      );

      return result;
    } catch (error) {
      artifact.status = 'failed';
      artifact.metadata['failureReason'] = error instanceof Error ? error.message : String(error);
      await this.saveArtifact(artifact);

      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // ROLLBACK
  // --------------------------------------------------------------------------

  /**
   * Rollback a completed handoff using backups
   */
  async rollback(artifactId: string): Promise<{ success: boolean; filesRestored: number }> {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    const backups = artifact.metadata['backups'] as string[] | undefined;
    if (!backups || backups.length === 0) {
      throw new Error('No backups available for rollback');
    }

    console.log(`[HandoffProtocol] Rolling back artifact: ${artifactId}`);

    let filesRestored = 0;
    for (const backup of backups) {
      const result = await selfMod.restoreBackup(backup);
      if (result.success) {
        filesRestored++;
      }
    }

    bus.publish('cortex', 'handoff:rolled_back', {
      artifactId,
      filesRestored,
    });

    return { success: filesRestored === backups.length, filesRestored };
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  /**
   * Get handoff history
   */
  getHistory(): HandoffArtifact[] {
    return Array.from(this.artifacts.values())
      .filter((a) => a.status === 'completed' || a.status === 'failed')
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get configuration
   */
  getConfig(): HandoffConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<HandoffConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const handoffProtocol = new HandoffProtocol();
export default HandoffProtocol;
