// @version 2.3.0
import { EventEmitter } from 'events';
import { spawn, exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

import { DockerSandbox } from './docker-sandbox.js';
import { config } from '../config.js';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  ok: boolean;
  timedOut?: boolean;
  resourceUsage?: ResourceUsage;
}

export interface ResourceUsage {
  cpuPercent: number;
  memoryUsedMB: number;
  memoryLimitMB: number;
  peakMemoryMB: number;
}

export interface SandboxOptions {
  id: string;
  timeout?: number;
  env?: Record<string, string>;
  cwd?: string;
  mode?: 'local' | 'docker';
  // Resource limits
  maxCpuPercent?: number; // Default 50%
  maxMemoryMB?: number; // Default 512MB
  maxProcesses?: number; // Default 100
}

export interface SandboxMetadata {
  id: string;
  createdAt: number;
  lastUsedAt: number;
  executionCount: number;
  totalDuration: number;
  mode: string;
}

export interface ISandbox {
  id: string;
  start(): Promise<void>;
  exec(command: string): Promise<ExecutionResult>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getMetadata(): SandboxMetadata;
  getResourceUsage(): Promise<ResourceUsage | null>;
}

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

  constructor() {
    super();
    this.startAutoCleanup();
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
    const mode = options.mode || config.SANDBOX_MODE;

    if (mode === 'docker') {
      sandbox = new DockerSandbox(options);
    } else {
      sandbox = new LocalSandbox(options);
    }

    await sandbox.start();
    this.sandboxes.set(options.id, sandbox);

    this.emit('sandbox:created', { id: options.id, mode });
    console.log(`[SandboxManager] Created sandbox ${options.id} (${mode})`);

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
