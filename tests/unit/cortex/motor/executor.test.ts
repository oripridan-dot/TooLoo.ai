import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Executor } from '../../../../src/cortex/motor/executor';
import * as child_process from 'child_process';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

describe('Executor', () => {
  let executor: Executor;
  const mockExec = child_process.exec as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    executor = new Executor('/tmp/test-workspace');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should execute a command successfully', async () => {
    // Mock successful execution
    mockExec.mockImplementation((cmd, options, callback) => {
      callback(null, { stdout: 'success', stderr: '' });
    });

    const result = await executor.runCommand('echo test');

    expect(result.ok).toBe(true);
    expect(result.stdout).toBe('success');
    expect(result.exitCode).toBe(0);
    expect(mockExec).toHaveBeenCalledWith('echo test', expect.objectContaining({ cwd: '/tmp/test-workspace' }), expect.any(Function));
  });

  it('should handle execution errors', async () => {
    // Mock failed execution
    mockExec.mockImplementation((cmd, options, callback) => {
      const error = new Error('Command failed');
      (error as any).code = 127;
      (error as any).stderr = 'command not found';
      callback(error, { stdout: '', stderr: 'command not found' });
    });

    const result = await executor.runCommand('invalid-command');

    expect(result.ok).toBe(false);
    expect(result.stderr).toBe('command not found');
    expect(result.exitCode).toBe(127);
  });

  it('should use provided working directory', async () => {
    mockExec.mockImplementation((cmd, options, callback) => {
      callback(null, { stdout: '', stderr: '' });
    });

    await executor.runCommand('ls', '/custom/path');

    expect(mockExec).toHaveBeenCalledWith('ls', expect.objectContaining({ cwd: '/custom/path' }), expect.any(Function));
  });
});
