/**
 * @file Tool Execution Tests
 * @description Verifies that the ToolExecutor and all tools work correctly
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  ToolExecutor,
  getToolExecutor,
  registerAllTools,
  type ToolExecutionContext,
} from '@tooloo/skills';
import { writeFileSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Test directory
const TEST_DIR = '/tmp/tooloo-test';

describe('ToolExecutor', () => {
  let executor: ToolExecutor;
  let testContext: ToolExecutionContext;

  beforeAll(async () => {
    // Create test directory
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }

    // Create executor with all tools
    executor = getToolExecutor({
      defaultTimeout: 10000,
      requireApproval: false, // Disable approval for tests
      allowedPaths: [TEST_DIR, '/tmp', process.cwd()],
      deniedPaths: [],
      auditLogging: true,
    });
    registerAllTools(executor);

    // Create test context
    testContext = {
      sessionId: 'test-session',
      userId: 'test-user',
      skillId: 'test-skill',
      workingDirectory: TEST_DIR,
      dryRun: false,
      approvalCallback: async () => true,
    };
  });

  afterAll(() => {
    // Cleanup test directory
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Tool Registration', () => {
    it('should have all expected tools registered', () => {
      const tools = executor.listTools();
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain('file_read');
      expect(toolNames).toContain('file_write');
      expect(toolNames).toContain('file_delete');
      expect(toolNames).toContain('list_dir');
      expect(toolNames).toContain('grep_search');
      expect(toolNames).toContain('semantic_search');
      expect(toolNames).toContain('terminal_execute');
      expect(toolNames).toContain('check_command');
    });

    it('should report correct tool count', () => {
      const stats = executor.getStats();
      expect(stats.registeredTools).toBe(8);
    });
  });

  describe('file_read tool', () => {
    it('should read a file successfully', async () => {
      // Create test file
      const testFile = join(TEST_DIR, 'read-test.txt');
      writeFileSync(testFile, 'Hello, World!\nLine 2\nLine 3');

      const result = await executor.execute<{ content: string; totalLines: number }>(
        'file_read',
        { path: testFile },
        testContext
      );

      expect(result.status).toBe('success');
      expect(result.data?.content).toContain('Hello, World!');
      expect(result.data?.totalLines).toBe(3);
    });

    it('should read specific line ranges', async () => {
      const testFile = join(TEST_DIR, 'read-test.txt');
      writeFileSync(testFile, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

      const result = await executor.execute<{ content: string; totalLines: number }>(
        'file_read',
        { path: testFile, startLine: 2, endLine: 4 },
        testContext
      );

      expect(result.status).toBe('success');
      expect(result.data?.content).toBe('Line 2\nLine 3\nLine 4');
    });

    it('should fail for non-existent files', async () => {
      const result = await executor.execute(
        'file_read',
        { path: join(TEST_DIR, 'non-existent.txt') },
        testContext
      );

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('EXECUTION_ERROR');
    });
  });

  describe('file_write tool', () => {
    it('should write a new file', async () => {
      const testFile = join(TEST_DIR, 'write-test.txt');

      const result = await executor.execute<{ path: string; bytesWritten: number }>(
        'file_write',
        { path: testFile, content: 'New content' },
        testContext
      );

      expect(result.status).toBe('success');
      expect(result.data?.bytesWritten).toBe(11);
      expect(existsSync(testFile)).toBe(true);
    });

    it('should create parent directories', async () => {
      const testFile = join(TEST_DIR, 'subdir', 'nested', 'file.txt');

      const result = await executor.execute<{ path: string }>(
        'file_write',
        { path: testFile, content: 'Nested content', createDirs: true },
        testContext
      );

      expect(result.status).toBe('success');
      expect(existsSync(testFile)).toBe(true);
    });
  });

  describe('list_dir tool', () => {
    it('should list directory contents', async () => {
      // Create some files
      writeFileSync(join(TEST_DIR, 'file1.txt'), 'content');
      writeFileSync(join(TEST_DIR, 'file2.txt'), 'content');

      const result = await executor.execute<{ entries: Array<{ name: string }> }>(
        'list_dir',
        { path: TEST_DIR },
        testContext
      );

      expect(result.status).toBe('success');
      expect(result.data?.entries.length).toBeGreaterThan(0);
    });
  });

  describe('grep_search tool', () => {
    it('should find pattern in files', async () => {
      // Create test files
      writeFileSync(join(TEST_DIR, 'search1.ts'), 'function hello() { return "world"; }');
      writeFileSync(join(TEST_DIR, 'search2.ts'), 'const hello = () => "test";');

      const result = await executor.execute<{ matches: Array<{ file: string; line: number }> }>(
        'grep_search',
        { pattern: 'hello', paths: [TEST_DIR] },
        testContext
      );

      expect(result.status).toBe('success');
      expect(result.data?.matches.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('check_command tool', () => {
    it('should find common commands', async () => {
      const result = await executor.execute<{ exists: boolean; path: string }>(
        'check_command',
        { command: 'ls' },
        testContext
      );

      expect(result.status).toBe('success');
      expect(result.data?.exists).toBe(true);
    });

    it('should report missing commands', async () => {
      const result = await executor.execute<{ exists: boolean }>(
        'check_command',
        { command: 'nonexistent-command-12345' },
        testContext
      );

      expect(result.status).toBe('success');
      expect(result.data?.exists).toBe(false);
    });
  });

  describe('Safety Checks', () => {
    it('should deny access to system paths', async () => {
      const deniedExecutor = getToolExecutor({
        defaultTimeout: 10000,
        requireApproval: false,
        allowedPaths: [TEST_DIR],
        deniedPaths: ['/etc', '/var', '/usr'],
      });
      registerAllTools(deniedExecutor);

      const result = await deniedExecutor.execute(
        'file_read',
        { path: '/etc/passwd' },
        testContext
      );

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('SAFETY_DENIED');
    });
  });

  describe('Audit Logging', () => {
    it('should log tool executions', async () => {
      const auditExecutor = getToolExecutor({
        defaultTimeout: 10000,
        requireApproval: false,
        allowedPaths: [TEST_DIR],
        auditLogging: true,
      });
      registerAllTools(auditExecutor);

      // Execute a tool
      await auditExecutor.execute(
        'list_dir',
        { path: TEST_DIR },
        testContext
      );

      // Check audit log
      const logs = auditExecutor.getAuditLog({ sessionId: 'test-session' });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1]?.toolName).toBe('list_dir');
    });
  });
});
