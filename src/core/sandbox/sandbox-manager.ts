// @version 2.2.3
import { EventEmitter } from 'events';
import { spawn, exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export interface SandboxOptions {
  id: string;
  timeout?: number;
  env?: Record<string, string>;
  cwd?: string;
}

export interface ISandbox {
  id: string;
  start(): Promise<void>;
  exec(command: string): Promise<ExecutionResult>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

class LocalSandbox implements ISandbox {
  public id: string;
  private running: boolean = false;
  private options: SandboxOptions;
  private tempDir: string;

  constructor(options: SandboxOptions) {
    this.id = options.id;
    this.options = options;
    this.tempDir = path.join(process.cwd(), 'temp', 'sandbox', this.id);
  }

  async start(): Promise<void> {
    await fs.mkdir(this.tempDir, { recursive: true });
    this.running = true;
  }

  async exec(command: string): Promise<ExecutionResult> {
    if (!this.running) throw new Error("Sandbox not running");

    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const child = exec(command, {
        cwd: this.options.cwd || this.tempDir,
        env: { ...process.env, ...this.options.env },
        timeout: this.options.timeout || 30000
      }, (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        resolve({
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          exitCode: error ? (error.code as number || 1) : 0,
          duration
        });
      });
    });
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

  constructor() {
    super();
  }

  async createSandbox(options: SandboxOptions): Promise<ISandbox> {
    // Fallback to LocalSandbox since Docker is not available
    const sandbox = new LocalSandbox(options);
    await sandbox.start();
    this.sandboxes.set(options.id, sandbox);
    return sandbox;
  }

  getSandbox(id: string): ISandbox | undefined {
    return this.sandboxes.get(id);
  }

  async terminateAll(): Promise<void> {
    for (const sandbox of this.sandboxes.values()) {
      await sandbox.stop();
    }
    this.sandboxes.clear();
  }
}
