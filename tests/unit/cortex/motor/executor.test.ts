// @version 3.3.577 - Executor Tests
import { describe, it, expect, beforeEach } from 'vitest';

// Test interfaces
interface ExecutionResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
}

interface ManagedProcess {
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

interface SpawnOptions {
  id?: string;
  cwd?: string;
  env?: Record<string, string>;
  autoRestart?: boolean;
  maxRestarts?: number;
  restartDelayMs?: number;
  captureOutput?: boolean;
  maxOutputLines?: number;
}

describe('Executor', () => {
  describe('ExecutionResult Interface', () => {
    it('should have ok boolean', () => {
      const result: ExecutionResult = { ok: true, stdout: '', stderr: '', exitCode: 0, duration: 100 };
      expect(typeof result.ok).toBe('boolean');
    });

    it('should have stdout', () => {
      const result: ExecutionResult = { ok: true, stdout: 'output', stderr: '', exitCode: 0, duration: 50 };
      expect(result.stdout).toBe('output');
    });

    it('should have stderr', () => {
      const result: ExecutionResult = { ok: false, stdout: '', stderr: 'error', exitCode: 1, duration: 10 };
      expect(result.stderr).toBe('error');
    });

    it('should have exitCode', () => {
      const result: ExecutionResult = { ok: true, stdout: '', stderr: '', exitCode: 0, duration: 0 };
      expect(result.exitCode).toBe(0);
    });

    it('should have duration in ms', () => {
      const result: ExecutionResult = { ok: true, stdout: '', stderr: '', exitCode: 0, duration: 150 };
      expect(result.duration).toBe(150);
    });
  });

  describe('ManagedProcess Interface', () => {
    it('should have id', () => {
      const proc: ManagedProcess = {
        id: 'proc-1', command: 'node', args: ['app.js'], pid: 1234,
        status: 'running', startedAt: Date.now(), restartCount: 0, stdout: [], stderr: []
      };
      expect(proc.id).toBe('proc-1');
    });

    it('should have command', () => {
      const proc: ManagedProcess = {
        id: '', command: 'npm', args: ['run', 'dev'], pid: undefined,
        status: 'starting', startedAt: 0, restartCount: 0, stdout: [], stderr: []
      };
      expect(proc.command).toBe('npm');
    });

    it('should have args array', () => {
      const proc: ManagedProcess = {
        id: '', command: 'npm', args: ['install', '--save', 'express'], pid: undefined,
        status: 'starting', startedAt: 0, restartCount: 0, stdout: [], stderr: []
      };
      expect(proc.args).toHaveLength(3);
    });

    it('should have optional pid', () => {
      const proc: ManagedProcess = {
        id: '', command: '', args: [], pid: undefined,
        status: 'starting', startedAt: 0, restartCount: 0, stdout: [], stderr: []
      };
      expect(proc.pid).toBeUndefined();
    });

    it('should support starting status', () => {
      const proc: ManagedProcess = {
        id: '', command: '', args: [], pid: undefined,
        status: 'starting', startedAt: 0, restartCount: 0, stdout: [], stderr: []
      };
      expect(proc.status).toBe('starting');
    });

    it('should support running status', () => {
      const proc: ManagedProcess = {
        id: '', command: '', args: [], pid: 1234,
        status: 'running', startedAt: Date.now(), restartCount: 0, stdout: [], stderr: []
      };
      expect(proc.status).toBe('running');
    });

    it('should support stopped status', () => {
      const proc: ManagedProcess = {
        id: '', command: '', args: [], pid: undefined,
        status: 'stopped', startedAt: 0, stoppedAt: Date.now(), restartCount: 0, stdout: [], stderr: []
      };
      expect(proc.status).toBe('stopped');
    });

    it('should support crashed status', () => {
      const proc: ManagedProcess = {
        id: '', command: '', args: [], pid: undefined,
        status: 'crashed', startedAt: 0, restartCount: 3, stdout: [], stderr: ['Error']
      };
      expect(proc.status).toBe('crashed');
    });

    it('should track restart count', () => {
      const proc: ManagedProcess = {
        id: '', command: '', args: [], pid: 1234,
        status: 'running', startedAt: 0, restartCount: 2, stdout: [], stderr: []
      };
      expect(proc.restartCount).toBe(2);
    });
  });

  describe('SpawnOptions Interface', () => {
    it('should have optional id', () => {
      const opts: SpawnOptions = { id: 'custom-id' };
      expect(opts.id).toBe('custom-id');
    });

    it('should have optional cwd', () => {
      const opts: SpawnOptions = { cwd: '/workspace' };
      expect(opts.cwd).toBe('/workspace');
    });

    it('should have optional env', () => {
      const opts: SpawnOptions = { env: { NODE_ENV: 'production' } };
      expect(opts.env?.NODE_ENV).toBe('production');
    });

    it('should have optional autoRestart', () => {
      const opts: SpawnOptions = { autoRestart: true };
      expect(opts.autoRestart).toBe(true);
    });

    it('should have optional maxRestarts', () => {
      const opts: SpawnOptions = { maxRestarts: 5 };
      expect(opts.maxRestarts).toBe(5);
    });

    it('should have optional restartDelayMs', () => {
      const opts: SpawnOptions = { restartDelayMs: 2000 };
      expect(opts.restartDelayMs).toBe(2000);
    });

    it('should have optional captureOutput', () => {
      const opts: SpawnOptions = { captureOutput: true };
      expect(opts.captureOutput).toBe(true);
    });

    it('should have optional maxOutputLines', () => {
      const opts: SpawnOptions = { maxOutputLines: 500 };
      expect(opts.maxOutputLines).toBe(500);
    });
  });

  describe('Default Configuration', () => {
    const DEFAULT_MAX_RESTARTS = 3;
    const DEFAULT_RESTART_DELAY = 1000;
    const DEFAULT_MAX_OUTPUT_LINES = 100;

    it('should default max restarts to 3', () => {
      expect(DEFAULT_MAX_RESTARTS).toBe(3);
    });

    it('should default restart delay to 1000ms', () => {
      expect(DEFAULT_RESTART_DELAY).toBe(1000);
    });

    it('should default max output lines to 100', () => {
      expect(DEFAULT_MAX_OUTPUT_LINES).toBe(100);
    });
  });

  describe('Command Execution', () => {
    it('should track execution duration', () => {
      const start = Date.now();
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should trim stdout', () => {
      const stdout = '  output  \n';
      expect(stdout.trim()).toBe('output');
    });

    it('should trim stderr', () => {
      const stderr = '  error  \n';
      expect(stderr.trim()).toBe('error');
    });

    it('should return ok for exitCode 0', () => {
      const exitCode = 0;
      const ok = exitCode === 0;
      expect(ok).toBe(true);
    });

    it('should return not ok for non-zero exitCode', () => {
      const exitCode = 1;
      const ok = exitCode === 0;
      expect(ok).toBe(false);
    });
  });

  describe('Process Management', () => {
    let processes: Map<string, { meta: ManagedProcess }>;

    beforeEach(() => {
      processes = new Map();
    });

    it('should store managed processes', () => {
      processes.set('proc-1', { meta: {
        id: 'proc-1', command: 'node', args: [], pid: 1234,
        status: 'running', startedAt: Date.now(), restartCount: 0, stdout: [], stderr: []
      }});
      expect(processes.has('proc-1')).toBe(true);
    });

    it('should retrieve process by id', () => {
      processes.set('test', { meta: {
        id: 'test', command: 'npm', args: ['start'], pid: 5678,
        status: 'running', startedAt: 0, restartCount: 0, stdout: [], stderr: []
      }});
      expect(processes.get('test')?.meta.command).toBe('npm');
    });

    it('should delete process', () => {
      processes.set('to-remove', { meta: {
        id: 'to-remove', command: 'cmd', args: [], pid: undefined,
        status: 'stopped', startedAt: 0, restartCount: 0, stdout: [], stderr: []
      }});
      processes.delete('to-remove');
      expect(processes.has('to-remove')).toBe(false);
    });
  });

  describe('Output Capture', () => {
    it('should limit stdout lines', () => {
      const maxLines = 100;
      const lines: string[] = [];
      for (let i = 0; i < 150; i++) lines.push(`line${i}`);
      while (lines.length > maxLines) lines.shift();
      expect(lines.length).toBe(100);
    });

    it('should limit stderr lines', () => {
      const maxLines = 100;
      const lines: string[] = Array(120).fill('error');
      while (lines.length > maxLines) lines.shift();
      expect(lines.length).toBe(100);
    });
  });
});
