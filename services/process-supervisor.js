/**
 * Process Supervisor
 * Manages service lifecycle with auto-restart on failure
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

export class ProcessSupervisor {
  constructor(logger) {
    this.processes = new Map();
    this.logger = logger;
    this.restartAttempts = new Map();
    this.maxRestartAttempts = 3;
    this.restartDelays = { 1: 2000, 2: 5000, 3: 10000 }; // exponential backoff
  }

  /**
   * Fork a service process
   */
  fork(serviceConfig) {
    const { name, file, port } = serviceConfig;

    if (this.processes.has(name)) {
      this.logger?.event(name, 'warning', {
        message: 'Process already exists, skipping fork'
      });
      return this.processes.get(name);
    }

    const filePath = path.join(PROJECT_ROOT, file);
    this.logger?.event(name, 'spawn', { port });

    const proc = spawn('node', [filePath], {
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: process.env.NODE_ENV || 'development'
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    // Log stdout
    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        lines.forEach(line => {
          if (line.includes('listening') || line.includes('ready')) {
            if (this.logger) {
              this.logger.event(name, 'info', { message: line.substring(0, 100) });
            }
          }
        });
      });
    }

    // Log stderr
    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        const line = data.toString().trim();
        if (line) {
          this.logger?.event(name, 'warning', { message: line.substring(0, 100) });
        }
      });
    }

    // Handle exit
    proc.on('exit', (code, signal) => {
      this.processes.delete(name);
      this.restartAttempts.delete(name);

      if (code === 0) {
        this.logger?.event(name, 'info', {
          message: `Exited gracefully (code ${code})`
        });
        return;
      }

      // Restart logic based on policy
      const shouldRestart =
        serviceConfig.restartPolicy === 'always' ||
        (serviceConfig.restartPolicy === 'on-error' && code !== 0 && code !== null);

      if (shouldRestart) {
        const attempts = (this.restartAttempts.get(name) || 0) + 1;
        this.restartAttempts.set(name, attempts);

        if (attempts <= this.maxRestartAttempts) {
          const delay = this.restartDelays[attempts] || 10000;
          this.logger?.event(name, 'restart', {
            exitCode: code,
            signal,
            attempt: attempts,
            delayMs: delay
          });

          setTimeout(() => {
            this.fork(serviceConfig);
          }, delay);
        } else {
          this.logger?.event(name, 'error', {
            message: `Max restart attempts (${this.maxRestartAttempts}) exceeded, giving up`
          });
        }
      }
    });

    proc.on('error', (err) => {
      this.logger?.event(name, 'error', { message: err.message });
    });

    this.processes.set(name, proc);
    return proc;
  }

  /**
   * Stop a single service
   */
  async stop(name, timeout = 5000) {
    const proc = this.processes.get(name);
    if (!proc) return;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve();
      }, timeout);

      proc.on('exit', () => {
        clearTimeout(timer);
        this.processes.delete(name);
        resolve();
      });

      proc.kill('SIGTERM');
    });
  }

  /**
   * Stop all services
   */
  async stopAll(timeout = 5000) {
    const stops = Array.from(this.processes.keys()).map(name =>
      this.stop(name, timeout)
    );

    await Promise.all(stops);
    this.processes.clear();
    this.restartAttempts.clear();
  }

  /**
   * Get process info
   */
  getStatus(name) {
    const proc = this.processes.get(name);
    return {
      running: proc && !proc.killed,
      pid: proc?.pid || null,
      restartAttempts: this.restartAttempts.get(name) || 0
    };
  }

  /**
   * Get all process info
   */
  getAllStatus() {
    const status = {};
    for (const name of this.processes.keys()) {
      status[name] = this.getStatus(name);
    }
    return status;
  }
}

export default ProcessSupervisor;
