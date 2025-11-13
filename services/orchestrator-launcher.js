/**
 * Orchestrator Service Launcher
 * Manages the orchestrator process that spawns all tier-based services
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVICES } from '../config/services.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

class OrchestratorLauncher {
  constructor(logger) {
    this.logger = logger;
    this.process = null;
    this.restartAttempts = 0;
    this.maxRestarts = 3;
    this.restartDelays = { 1: 2000, 2: 5000, 3: 10000 };
  }

  /**
   * Start the orchestrator
   */
  start() {
    const filePath = path.join(PROJECT_ROOT, 'servers/orchestrator.js');

    this.logger?.event('orchestrator', 'spawn', {
      port: 3123,
      message: 'Starting central orchestrator'
    });

    this.process = spawn('node', [filePath], {
      env: {
        ...process.env,
        PORT: '3123',
        NODE_ENV: process.env.NODE_ENV || 'development'
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    // Log output
    if (this.process.stdout) {
      this.process.stdout.on('data', (data) => {
        const line = data.toString().trim();
        if (line && (line.includes('listening') || line.includes('ready'))) {
          this.logger?.event('orchestrator', 'info', { message: line.substring(0, 100) });
        }
      });
    }

    if (this.process.stderr) {
      this.process.stderr.on('data', (data) => {
        const line = data.toString().trim();
        if (line) {
          this.logger?.event('orchestrator', 'warning', { message: line.substring(0, 100) });
        }
      });
    }

    // Handle exit
    this.process.on('exit', (code, signal) => {
      if (code === 0) {
        this.logger?.event('orchestrator', 'info', { message: 'Exited gracefully' });
        return;
      }

      // Auto-restart with backoff
      if (this.restartAttempts < this.maxRestarts) {
        this.restartAttempts++;
        const delay = this.restartDelays[this.restartAttempts] || 10000;

        this.logger?.event('orchestrator', 'restart', {
          exitCode: code,
          signal,
          attempt: this.restartAttempts,
          delayMs: delay
        });

        setTimeout(() => this.start(), delay);
      } else {
        this.logger?.event('orchestrator', 'error', {
          message: `Max restart attempts (${this.maxRestarts}) exceeded`
        });
      }
    });

    this.process.on('error', (err) => {
      this.logger?.event('orchestrator', 'error', { message: err.message });
    });

    return this.process;
  }

  /**
   * Stop the orchestrator
   */
  async stop(timeout = 5000) {
    if (!this.process) return;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.process.kill('SIGKILL');
        resolve();
      }, timeout);

      this.process.on('exit', () => {
        clearTimeout(timer);
        this.process = null;
        resolve();
      });

      this.process.kill('SIGTERM');
    });
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      running: this.process && !this.process.killed,
      pid: this.process?.pid || null,
      restartAttempts: this.restartAttempts
    };
  }
}

export default OrchestratorLauncher;
