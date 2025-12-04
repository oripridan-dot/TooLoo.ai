// @version 2.2.389
/**
 * Shell Command Runner with Timeout Support
 *
 * Provides safe execution of shell commands with built-in timeout handling
 * to prevent system hangs and ensure predictable behavior.
 *
 * @version 1.0.0
 * @module core/command-runner
 */

import { exec, spawn, ChildProcess } from 'child_process';
import { DEFAULT_TIMEOUTS, withTimeout } from './timeout-manager.js';

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number; // milliseconds (default: 30 seconds)
  maxBuffer?: number; // default: 1MB
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
  timedOut: boolean;
  error?: Error;
}

/**
 * Execute a shell command with timeout protection
 *
 * @param command - The shell command to execute
 * @param options - Execution options including timeout
 * @returns Result containing stdout, stderr, and status
 */
export function execCommandSync(command: string, options: ExecOptions = {}): ExecResult {
  const {
    cwd = process.cwd(),
    timeout = DEFAULT_TIMEOUTS.MEDIUM,
    maxBuffer = 1024 * 1024,
  } = options;

  return new Promise((resolve) => {
    let timedOut = false;
    let childProc: ChildProcess | null = null;

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      if (childProc) {
        childProc.kill('SIGTERM');
        // Force kill after 2 seconds if SIGTERM doesn't work
        setTimeout(() => {
          if (childProc) childProc.kill('SIGKILL');
        }, 2000);
      }
    }, timeout);

    try {
      childProc = exec(
        command,
        {
          cwd,
          maxBuffer,
          timeout, // Also set exec timeout as backup
        },
        (error, stdout, stderr) => {
          clearTimeout(timeoutHandle);

          if (timedOut) {
            resolve({
              stdout,
              stderr: stderr || `Command timed out after ${timeout}ms`,
              code: -1,
              timedOut: true,
              error: new Error(`Command timed out: ${command}`),
            });
          } else if (error) {
            resolve({
              stdout,
              stderr: stderr || error.message,
              code: error.code || -1,
              timedOut: false,
              error,
            });
          } else {
            resolve({
              stdout,
              stderr,
              code: 0,
              timedOut: false,
            });
          }
        }
      );
    } catch (error) {
      clearTimeout(timeoutHandle);
      resolve({
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        code: -1,
        timedOut: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }) as any; // Type coercion for sync API
}

/**
 * Execute a shell command asynchronously with timeout protection
 */
export function execCommandAsync(command: string, options: ExecOptions = {}): Promise<ExecResult> {
  const {
    cwd = process.cwd(),
    timeout = DEFAULT_TIMEOUTS.MEDIUM,
    maxBuffer = 1024 * 1024,
  } = options;

  return new Promise((resolve) => {
    let timedOut = false;
    let childProc: ChildProcess | null = null;

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      if (childProc) {
        childProc.kill('SIGTERM');
        setTimeout(() => {
          if (childProc) childProc.kill('SIGKILL');
        }, 2000);
      }
    }, timeout);

    try {
      childProc = exec(
        command,
        {
          cwd,
          maxBuffer,
          timeout,
        },
        (error, stdout, stderr) => {
          clearTimeout(timeoutHandle);

          if (timedOut) {
            resolve({
              stdout,
              stderr: stderr || `Command timed out after ${timeout}ms`,
              code: -1,
              timedOut: true,
              error: new Error(`Command timed out: ${command}`),
            });
          } else if (error) {
            resolve({
              stdout,
              stderr: stderr || error.message,
              code: error.code || -1,
              timedOut: false,
              error,
            });
          } else {
            resolve({
              stdout,
              stderr,
              code: 0,
              timedOut: false,
            });
          }
        }
      );
    } catch (error) {
      clearTimeout(timeoutHandle);
      resolve({
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        code: -1,
        timedOut: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  });
}

/**
 * Spawn a process with timeout protection
 */
export function spawnWithTimeout(
  command: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number } = {}
): Promise<{ code: number; timedOut: boolean }> {
  const { cwd = process.cwd(), timeout = DEFAULT_TIMEOUTS.LONG } = options;

  return new Promise((resolve) => {
    let timedOut = false;

    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
    });

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
        }
      }, 2000);
    }, timeout);

    child.on('exit', (code) => {
      clearTimeout(timeoutHandle);
      resolve({
        code: code || -1,
        timedOut,
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeoutHandle);
      console.error(`[CommandRunner] Error spawning ${command}:`, error);
      resolve({
        code: -1,
        timedOut: false,
      });
    });
  });
}

/**
 * Safe command runner that logs and handles timeouts gracefully
 */
export class CommandRunner {
  private defaultTimeout: number = DEFAULT_TIMEOUTS.MEDIUM;
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Execute command with logging
   */
  async run(
    command: string,
    timeout: number = this.defaultTimeout,
    logOutput = true
  ): Promise<ExecResult> {
    if (logOutput) {
      console.log(`[CommandRunner] Executing: ${command} (timeout: ${timeout}ms)`);
    }

    const result = await execCommandAsync(command, {
      cwd: this.cwd,
      timeout,
    });

    if (result.timedOut) {
      console.error(`[CommandRunner] TIMEOUT: ${command}`);
    } else if (result.code !== 0) {
      if (logOutput && result.stderr) {
        console.error(`[CommandRunner] Error: ${result.stderr}`);
      }
    } else if (logOutput && result.stdout) {
      console.log(`[CommandRunner] Output: ${result.stdout}`);
    }

    return result;
  }

  /**
   * Set default timeout
   */
  setDefaultTimeout(ms: number): void {
    this.defaultTimeout = ms;
  }

  /**
   * Get default timeout
   */
  getDefaultTimeout(): number {
    return this.defaultTimeout;
  }
}

export const commandRunner = new CommandRunner();
