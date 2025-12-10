// @version 2.4.0 - Added operation timeouts to prevent hangs
import { spawn, exec } from 'child_process';
import {
  ISandbox,
  SandboxOptions,
  ExecutionResult,
  SandboxMetadata,
  ResourceUsage,
} from './types.js';
import { config } from '../config.js';

// Default timeout for Docker operations (10 seconds)
const DOCKER_OPERATION_TIMEOUT = 10000;

export class DockerSandbox implements ISandbox {
  public id: string;
  private containerId: string | null = null;
  private options: SandboxOptions;
  private image: string;
  private createdAt: number;
  private lastUsedAt: number;
  private executionCount: number = 0;
  private totalDuration: number = 0;

  constructor(options: SandboxOptions) {
    this.id = options.id;
    this.options = options;
    this.image = config.SANDBOX_DOCKER_IMAGE;
    this.createdAt = Date.now();
    this.lastUsedAt = Date.now();
  }

  async start(): Promise<void> {
    // Apply resource limits (defaults if not specified)
    const maxMemoryMB = this.options.maxMemoryMB || 512;
    const maxCpuPercent = this.options.maxCpuPercent || 50;
    const maxProcesses = this.options.maxProcesses || 100;

    // Convert CPU percent to CPU shares (Docker uses 1024 = 100%)
    const cpuShares = Math.floor((maxCpuPercent / 100) * 1024);

    // We mount the current working directory to /workspace in the container
    const cwd = process.cwd();
    const mountPoint = '/workspace';

    // Command with resource limits:
    // --memory: Hard memory limit
    // --memory-swap: Total memory (memory + swap), set equal to memory to disable swap
    // --cpu-shares: Relative CPU weight
    // --pids-limit: Maximum number of processes
    // --network: none for security (can be changed if needed)
    const args = [
      'run',
      '-d',
      '-t',
      '--rm',
      '-v',
      `${cwd}:${mountPoint}`,
      '-w',
      mountPoint,
      '--name',
      `tooloo-sandbox-${this.id}`,
      '--memory',
      `${maxMemoryMB}m`,
      '--memory-swap',
      `${maxMemoryMB}m`, // No swap
      '--cpu-shares',
      cpuShares.toString(),
      '--pids-limit',
      maxProcesses.toString(),
      '--network',
      'none', // Isolated network for security
      '--security-opt',
      'no-new-privileges', // Prevent privilege escalation
      this.image,
      'cat', // Keep the container running
    ];

    return new Promise((resolve, reject) => {
      const child = spawn('docker', args);
      let stdout = '';
      let stderr = '';
      let completed = false;

      // Timeout to prevent hanging
      const timeout = setTimeout(() => {
        if (!completed) {
          completed = true;
          child.kill('SIGKILL');
          reject(new Error(`Docker container start timed out after ${DOCKER_OPERATION_TIMEOUT}ms`));
        }
      }, DOCKER_OPERATION_TIMEOUT);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (completed) return; // Already timed out
        completed = true;
        clearTimeout(timeout);

        if (code === 0) {
          this.containerId = stdout.trim();
          console.log(
            `[DockerSandbox] Started ${this.id} with limits: ` +
              `${maxMemoryMB}MB RAM, ${maxCpuPercent}% CPU, ${maxProcesses} processes`
          );
          resolve();
        } else {
          reject(new Error(`Failed to start Docker sandbox: ${stderr}`));
        }
      });

      child.on('error', (err) => {
        if (completed) return;
        completed = true;
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  async exec(command: string): Promise<ExecutionResult> {
    if (!this.containerId) throw new Error('Sandbox not running');

    const startTime = Date.now();
    const timeout = this.options.timeout || 30000;
    this.lastUsedAt = Date.now();
    this.executionCount++;

    // We use 'docker exec' to run the command inside the container
    const args = ['exec', '-e', 'NODE_ENV=production', this.containerId, 'sh', '-c', command];

    return new Promise((resolve) => {
      const child = spawn('docker', args);
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Enforce timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', async (code) => {
        clearTimeout(timeoutHandle);
        const duration = Date.now() - startTime;
        this.totalDuration += duration;

        // Get resource usage after execution
        const resourceUsage = await this.getResourceUsage();

        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
          duration,
          ok: code === 0 && !timedOut,
          timedOut,
          resourceUsage: resourceUsage || undefined,
        });
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.containerId) return;

    const containerId = this.containerId;
    this.containerId = null; // Mark as stopped immediately

    return new Promise((resolve) => {
      // Use timeout flag to track completion
      let completed = false;

      const timeout = setTimeout(() => {
        if (!completed) {
          completed = true;
          console.warn(`[DockerSandbox] Stop timed out for ${containerId}, force killing...`);
          // Try force remove as last resort
          exec(`docker rm -f ${containerId}`, { timeout: 5000 }, () => {
            resolve(); // Resolve regardless - we tried our best
          });
        }
      }, 5000); // 5 second timeout for stop

      exec(`docker stop -t 2 ${containerId}`, { timeout: 5000 }, (error) => {
        if (completed) return;
        completed = true;
        clearTimeout(timeout);

        if (error) {
          // Container might have already stopped - that's OK
          console.warn(`[DockerSandbox] Stop warning for ${containerId}: ${error.message}`);
        }
        resolve();
      });
    });
  }

  isRunning(): boolean {
    return this.containerId !== null;
  }

  getMetadata(): SandboxMetadata {
    return {
      id: this.id,
      createdAt: this.createdAt,
      lastUsedAt: this.lastUsedAt,
      executionCount: this.executionCount,
      totalDuration: this.totalDuration,
      mode: 'docker',
    };
  }

  /**
   * Get real-time resource usage from Docker stats
   */
  async getResourceUsage(): Promise<ResourceUsage | null> {
    if (!this.containerId) return null;

    return new Promise((resolve) => {
      exec(
        `docker stats ${this.containerId} --no-stream --format "{{.CPUPerc}}|{{.MemUsage}}"`,
        { timeout: 5000 },
        (error, stdout) => {
          if (error) {
            resolve(null);
            return;
          }

          try {
            // Parse output: "12.34%|123.4MiB / 512MiB"
            const [cpuStr, memStr] = stdout.trim().split('|');
            if (!cpuStr || !memStr) {
              resolve(null);
              return;
            }
            const cpuPercent = parseFloat(cpuStr.replace('%', ''));

            // Parse memory: "123.4MiB / 512MiB"
            const memMatch = memStr.match(/([\d.]+)MiB\s*\/\s*([\d.]+)MiB/);
            if (!memMatch || !memMatch[1] || !memMatch[2]) {
              resolve(null);
              return;
            }

            const memoryUsedMB = parseFloat(memMatch[1]);
            const memoryLimitMB = parseFloat(memMatch[2]);

            resolve({
              cpuPercent,
              memoryUsedMB,
              memoryLimitMB,
              peakMemoryMB: memoryUsedMB, // Docker doesn't easily expose peak
            });
          } catch {
            resolve(null);
          }
        }
      );
    });
  }
}
