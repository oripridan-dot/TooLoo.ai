// @version 2.4.0 - Added Docker health check and automatic fallback
import { EventEmitter } from 'events';
import { spawn, exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

import { DockerSandbox } from './docker-sandbox.js';
import { config } from '../config.js';

// Utility: Promise with timeout
function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${ms}ms`));
    }, ms);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
import type {
  ExecutionResult,
  ResourceUsage,
  SandboxOptions,
  SandboxMetadata,
  ISandbox,
} from './types.js';

// Re-export types from the shared types file for backward compatibility
export type {
  ExecutionResult,
  ResourceUsage,
  SandboxOptions,
  SandboxMetadata,
  ISandbox,
} from './types.js';

class LocalSandbox implements ISandbox {
  public id: string;
  private running: boolean = false;
  private options: SandboxOptions;
  private tempDir: string;
  private createdAt: number;
  private lastUsedAt: number;
  private executionCount: number = 0;
  private totalDuration: number = 0;
  private currentProcess: any = null;

  constructor(options: SandboxOptions) {
    this.id = options.id;
    this.options = options;
    this.tempDir = path.join(process.cwd(), 'temp', 'sandbox', this.id);
    this.createdAt = Date.now();
    this.lastUsedAt = Date.now();
  }

  async start(): Promise<void> {
    await fs.mkdir(this.tempDir, { recursive: true });
    this.running = true;
  }

  async exec(command: string): Promise<ExecutionResult> {
    if (!this.running) throw new Error('Sandbox not running');

    const startTime = Date.now();
    const timeout = this.options.timeout || 30000;
    this.lastUsedAt = Date.now();
    this.executionCount++;

    return new Promise((resolve) => {
      const child = exec(
        command,
        {
          cwd: this.options.cwd || this.tempDir,
          env: { ...process.env, ...this.options.env },
          timeout,
          killSignal: 'SIGKILL',
        },
        (error, stdout, stderr) => {
          const duration = Date.now() - startTime;
          this.totalDuration += duration;
          this.currentProcess = null;

          const exitCode = error ? (error.code as number) || 1 : 0;
          const timedOut = error && (error as any).killed && duration >= timeout;

          resolve({
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            exitCode,
            duration,
            ok: exitCode === 0,
            timedOut,
          });
        }
      );

      this.currentProcess = child;
    });
  }

  getMetadata(): SandboxMetadata {
    return {
      id: this.id,
      createdAt: this.createdAt,
      lastUsedAt: this.lastUsedAt,
      executionCount: this.executionCount,
      totalDuration: this.totalDuration,
      mode: 'local',
    };
  }

  async getResourceUsage(): Promise<ResourceUsage | null> {
    // Local sandboxes don't have easy resource monitoring
    return null;
  }

  async stop(): Promise<void> {
    this.running = false;
    // Optional: Cleanup temp dir
    // await fs.rm(this.tempDir, { recursive: true, force: true });
  }

  isRunning(): boolean {
    return this.running;
  }
}

export class SandboxManager extends EventEmitter {
  private sandboxes: Map<string, ISandbox> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxSandboxAge: number = 3600000; // 1 hour
  private maxIdleSandboxes: number = 10;
  private maxTotalSandboxes: number = 20;
  private initialized: boolean = false;
  private dockerHealthy: boolean = true; // Assume healthy until proven otherwise
  private lastDockerCheck: number = 0;
  private dockerCheckInterval: number = 60000; // Re-check every 60 seconds

  constructor() {
    super();
  }

  /**
   * Check if Docker is responsive (with timeout)
   * Returns true if Docker responds within 3 seconds
   */
  private async checkDockerHealth(): Promise<boolean> {
    const now = Date.now();

    // Use cached result if recent
    if (now - this.lastDockerCheck < this.dockerCheckInterval) {
      return this.dockerHealthy;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn(
          '[SandboxManager] ⚠️ Docker health check timed out - Docker appears unresponsive'
        );
        this.dockerHealthy = false;
        this.lastDockerCheck = now;
        resolve(false);
      }, 3000); // 3 second timeout for health check

      exec('docker info --format "{{.ServerVersion}}"', { timeout: 3000 }, (error, stdout) => {
        clearTimeout(timeout);
        this.lastDockerCheck = now;

        if (error) {
          console.warn('[SandboxManager] ⚠️ Docker not available:', error.message);
          this.dockerHealthy = false;
          resolve(false);
        } else {
          const wasUnhealthy = !this.dockerHealthy;
          this.dockerHealthy = true;
          if (wasUnhealthy) {
            console.log(`[SandboxManager] ✅ Docker recovered (version: ${stdout.trim()})`);
          }
          resolve(true);
        }
      });
    });
  }

  /**
   * Initialize the sandbox manager - call this on server startup
   * Cleans up orphaned containers from previous crashes
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[SandboxManager] Initializing...');
    await this.cleanupOrphanedContainers();
    this.startAutoCleanup();
    this.initialized = true;
    console.log('[SandboxManager] Initialized');
  }

  /**
   * Janitor Service: Clean up orphaned TooLoo sandbox containers
   * This handles the case where the server crashed while sandboxes were running
   */
  private async cleanupOrphanedContainers(): Promise<void> {
    return new Promise((resolve) => {
      // Find all containers with the tooloo-sandbox prefix
      exec(
        'docker ps -a --filter "name=tooloo-sandbox-" --format "{{.ID}}|{{.Names}}|{{.Status}}"',
        { timeout: 10000 },
        async (error, stdout) => {
          if (error) {
            // Docker might not be available - that's OK
            console.log('[SandboxManager] Docker not available, skipping orphan cleanup');
            resolve();
            return;
          }

          const lines = stdout.trim().split('\n').filter(Boolean);
          if (lines.length === 0) {
            console.log('[SandboxManager] No orphaned containers found');
            resolve();
            return;
          }

          console.log(
            `[SandboxManager] 🧹 Found ${lines.length} orphaned container(s), cleaning up...`
          );

          const killPromises = lines.map((line) => {
            const [containerId, name] = line.split('|');
            return new Promise<void>((resolveKill) => {
              exec(`docker rm -f ${containerId}`, { timeout: 5000 }, (err) => {
                if (err) {
                  console.warn(`[SandboxManager] Failed to remove ${name}: ${err.message}`);
                } else {
                  console.log(`[SandboxManager] Removed orphan: ${name}`);
                }
                resolveKill();
              });
            });
          });

          await Promise.all(killPromises);
          console.log(`[SandboxManager] 🧹 Cleaned up ${lines.length} orphaned container(s)`);
          resolve();
        }
      );
    });
  }

  private startAutoCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupSandboxes();
    }, 300000);
  }

  async createSandbox(options: SandboxOptions): Promise<ISandbox> {
    // Enforce max sandbox limit
    if (this.sandboxes.size >= this.maxTotalSandboxes) {
      console.warn(
        `[SandboxManager] Max sandboxes reached (${this.maxTotalSandboxes}), cleaning up...`
      );
      await this.cleanupSandboxes();

      if (this.sandboxes.size >= this.maxTotalSandboxes) {
        throw new Error(
          `Cannot create sandbox: maximum limit of ${this.maxTotalSandboxes} reached`
        );
      }
    }

    let sandbox: ISandbox;
    let actualMode: string;
    const requestedMode = options.mode || config.SANDBOX_MODE;

    // If Docker is requested, check health first and fallback if needed
    if (requestedMode === 'docker') {
      const dockerOk = await this.checkDockerHealth();

      if (dockerOk) {
        // Try to create Docker sandbox with timeout
        try {
          sandbox = new DockerSandbox(options);
          await withTimeout(sandbox.start(), 10000, 'Docker sandbox start');
          actualMode = 'docker';
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.warn(`[SandboxManager] ⚠️ Docker sandbox failed: ${errMsg}`);
          console.log('[SandboxManager] 🔄 Falling back to local sandbox');
          this.dockerHealthy = false; // Mark unhealthy to skip Docker for a while
          sandbox = new LocalSandbox(options);
          await sandbox.start();
          actualMode = 'local (fallback)';
        }
      } else {
        // Docker unhealthy, use local directly
        console.log('[SandboxManager] 🔄 Docker unavailable, using local sandbox');
        sandbox = new LocalSandbox(options);
        await sandbox.start();
        actualMode = 'local (fallback)';
      }
    } else {
      sandbox = new LocalSandbox(options);
      await sandbox.start();
      actualMode = 'local';
    }

    this.sandboxes.set(options.id, sandbox);

    this.emit('sandbox:created', { id: options.id, mode: actualMode });
    console.log(`[SandboxManager] Created sandbox ${options.id} (${actualMode})`);

    return sandbox;
  }

  getSandbox(id: string): ISandbox | undefined {
    return this.sandboxes.get(id);
  }

  async terminateAll(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    for (const sandbox of this.sandboxes.values()) {
      await sandbox.stop();
    }
    this.sandboxes.clear();
    console.log('[SandboxManager] All sandboxes terminated');
  }

  /**
   * Auto-cleanup: Remove old or idle sandboxes
   */
  private async cleanupSandboxes(): Promise<void> {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, sandbox] of this.sandboxes.entries()) {
      const metadata = sandbox.getMetadata();
      const age = now - metadata.createdAt;
      const idleTime = now - metadata.lastUsedAt;

      // Remove if too old
      if (age > this.maxSandboxAge) {
        console.log(
          `[SandboxManager] Removing old sandbox ${id} (age: ${Math.round(age / 1000)}s)`
        );
        toRemove.push(id);
        continue;
      }

      // Remove if idle and over limit
      if (this.sandboxes.size > this.maxIdleSandboxes && idleTime > 600000) {
        // 10 min idle
        console.log(
          `[SandboxManager] Removing idle sandbox ${id} (idle: ${Math.round(idleTime / 1000)}s)`
        );
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      const sandbox = this.sandboxes.get(id);
      if (sandbox) {
        await sandbox.stop();
        this.sandboxes.delete(id);
        this.emit('sandbox:cleaned', { id });
      }
    }

    if (toRemove.length > 0) {
      console.log(`[SandboxManager] Cleaned up ${toRemove.length} sandboxes`);
    }
  }

  /**
   * Get statistics about active sandboxes
   */
  getStats() {
    const sandboxStats = Array.from(this.sandboxes.values()).map((s) => s.getMetadata());

    return {
      total: this.sandboxes.size,
      maxTotal: this.maxTotalSandboxes,
      maxIdle: this.maxIdleSandboxes,
      maxAge: this.maxSandboxAge,
      sandboxes: sandboxStats,
    };
  }

  /**
   * Force cleanup of a specific sandbox
   */
  async removeSandbox(id: string): Promise<boolean> {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) return false;

    await sandbox.stop();
    this.sandboxes.delete(id);
    this.emit('sandbox:removed', { id });
    console.log(`[SandboxManager] Removed sandbox ${id}`);
    return true;
  }
}
