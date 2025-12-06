// @version 3.3.8
import { spawn, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface ExecutionResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
}

export interface ManagedProcess {
  id: string;
  command: string;
  args: string[];
  pid: number | undefined;
  status: 'starting' | 'running' | 'stopped' | 'crashed';
  startedAt: number;
  stoppedAt?: number;
  restartCount: number;
  stdout: string[];
  stderr: string[];
}

export interface SpawnOptions {
  id?: string;
  cwd?: string;
  env?: Record<string, string>;
  autoRestart?: boolean;
  maxRestarts?: number;
  restartDelayMs?: number;
  captureOutput?: boolean;
  maxOutputLines?: number;
}

export class Executor extends EventEmitter {
  private managedProcesses: Map<string, { process: ChildProcess; meta: ManagedProcess }> =
    new Map();
  private readonly DEFAULT_MAX_RESTARTS = 3;
  private readonly DEFAULT_RESTART_DELAY = 1000;
  private readonly DEFAULT_MAX_OUTPUT_LINES = 100;

  constructor(private workspaceRoot: string) {
    super();
  }

  /**
   * Execute a shell command safely
   */
  async runCommand(command: string, cwd?: string): Promise<ExecutionResult> {
    const start = Date.now();
    const workingDir = cwd || this.workspaceRoot;

    console.log(`[Motor:Executor] Running: "${command}" in ${workingDir}`);

    try {
      const { stdout, stderr } = await execAsync(command, { cwd: workingDir });
      return {
        ok: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
        duration: Date.now() - start,
      };
    } catch (error: any) {
      return {
        ok: false,
        stdout: error.stdout ? error.stdout.trim() : '',
        stderr: error.stderr ? error.stderr.trim() : error.message,
        exitCode: error.code || 1,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Spawn a managed long-running process (Daemon capability)
   * Supports auto-restart, output capture, and lifecycle management.
   */
  spawnProcess(command: string, args: string[], options: SpawnOptions = {}): ManagedProcess {
    const id = options.id || `proc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cwd = options.cwd || this.workspaceRoot;
    const maxOutputLines = options.maxOutputLines ?? this.DEFAULT_MAX_OUTPUT_LINES;

    console.log(`[Motor:Executor] Spawning managed process: ${id} -> ${command} ${args.join(' ')}`);

    const meta: ManagedProcess = {
      id,
      command,
      args,
      pid: undefined,
      status: 'starting',
      startedAt: Date.now(),
      restartCount: 0,
      stdout: [],
      stderr: [],
    };

    const startProcess = () => {
      const child = spawn(command, args, {
        cwd,
        env: { ...process.env, ...options.env },
        stdio: options.captureOutput !== false ? 'pipe' : 'inherit',
        detached: false,
      });

      meta.pid = child.pid;
      meta.status = 'running';

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          const lines = data
            .toString()
            .split('\n')
            .filter((l: string) => l.trim());
          meta.stdout.push(...lines);
          if (meta.stdout.length > maxOutputLines) {
            meta.stdout = meta.stdout.slice(-maxOutputLines);
          }
          this.emit('stdout', { id, data: data.toString() });
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          const lines = data
            .toString()
            .split('\n')
            .filter((l: string) => l.trim());
          meta.stderr.push(...lines);
          if (meta.stderr.length > maxOutputLines) {
            meta.stderr = meta.stderr.slice(-maxOutputLines);
          }
          this.emit('stderr', { id, data: data.toString() });
        });
      }

      child.on('error', (error) => {
        console.error(`[Motor:Executor] Process ${id} error:`, error.message);
        meta.status = 'crashed';
        this.emit('error', { id, error });
      });

      child.on('exit', (code, signal) => {
        console.log(`[Motor:Executor] Process ${id} exited with code ${code}, signal ${signal}`);
        meta.stoppedAt = Date.now();

        const maxRestarts = options.maxRestarts ?? this.DEFAULT_MAX_RESTARTS;
        const shouldRestart = options.autoRestart && meta.restartCount < maxRestarts && code !== 0;

        if (shouldRestart) {
          meta.status = 'starting';
          meta.restartCount++;
          console.log(
            `[Motor:Executor] Auto-restarting ${id} (attempt ${meta.restartCount}/${maxRestarts})`
          );

          setTimeout(() => {
            startProcess();
          }, options.restartDelayMs ?? this.DEFAULT_RESTART_DELAY);
        } else {
          meta.status = code === 0 ? 'stopped' : 'crashed';
        }

        this.emit('exit', { id, code, signal, willRestart: shouldRestart });
      });

      this.managedProcesses.set(id, { process: child, meta });
    };

    startProcess();
    return meta;
  }

  /**
   * Stop a managed process by ID
   */
  stopProcess(id: string, signal: NodeJS.Signals = 'SIGTERM'): boolean {
    const entry = this.managedProcesses.get(id);
    if (!entry) {
      console.warn(`[Motor:Executor] Process ${id} not found`);
      return false;
    }

    // Disable auto-restart before killing
    entry.meta.restartCount = Infinity;

    if (entry.process.pid) {
      console.log(`[Motor:Executor] Stopping process ${id} (PID: ${entry.process.pid})`);
      entry.process.kill(signal);
      return true;
    }
    return false;
  }

  /**
   * Get status of a managed process
   */
  getProcessStatus(id: string): ManagedProcess | null {
    const entry = this.managedProcesses.get(id);
    return entry ? { ...entry.meta } : null;
  }

  /**
   * List all managed processes
   */
  listProcesses(): ManagedProcess[] {
    return Array.from(this.managedProcesses.values()).map((e) => ({ ...e.meta }));
  }

  /**
   * Stop all managed processes
   */
  stopAll(signal: NodeJS.Signals = 'SIGTERM'): void {
    console.log(`[Motor:Executor] Stopping all ${this.managedProcesses.size} managed processes`);
    for (const [id] of this.managedProcesses) {
      this.stopProcess(id, signal);
    }
  }

  /**
   * Clean up stopped/crashed processes from the registry
   */
  cleanup(): number {
    let cleaned = 0;
    for (const [id, entry] of this.managedProcesses) {
      if (entry.meta.status === 'stopped' || entry.meta.status === 'crashed') {
        this.managedProcesses.delete(id);
        cleaned++;
      }
    }
    console.log(`[Motor:Executor] Cleaned up ${cleaned} finished processes`);
    return cleaned;
  }
}
