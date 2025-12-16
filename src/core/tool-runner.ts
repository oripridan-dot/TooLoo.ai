/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TooLoo.ai - Tool Runner
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Executes real-world operations: file read/write, terminal commands, search.
 * This is how TooLoo affects the physical world.
 *
 * @version Genesis
 * @born 2025-12-16
 */

import { EventEmitter } from 'events';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  unlinkSync,
  statSync,
} from 'fs';
import { join, dirname, basename, extname } from 'path';
import { execSync, spawn } from 'child_process';
import { createInterface } from 'readline';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration_ms: number;
}

export interface FileReadResult {
  content: string;
  path: string;
  lines: number;
  size: number;
}

export interface FileWriteResult {
  path: string;
  bytesWritten: number;
  created: boolean;
  backupPath?: string;
}

export interface DirectoryListResult {
  path: string;
  entries: Array<{
    name: string;
    type: 'file' | 'directory';
    size?: number;
  }>;
}

export interface SearchResult {
  matches: Array<{
    file: string;
    line: number;
    content: string;
    context?: string;
  }>;
  totalMatches: number;
}

export interface TerminalResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

export class ToolRunner extends EventEmitter {
  private workingDirectory: string;
  private allowedPaths: string[];
  private deniedPaths: string[];
  private auditLog: Array<{ timestamp: string; tool: string; params: unknown; result: string }> =
    [];

  constructor(config?: {
    workingDirectory?: string;
    allowedPaths?: string[];
    deniedPaths?: string[];
  }) {
    super();
    this.workingDirectory = config?.workingDirectory || process.cwd();
    this.allowedPaths = config?.allowedPaths || ['/workspaces', '/tmp', process.cwd()];
    this.deniedPaths = config?.deniedPaths || ['/etc', '/var', '/usr', '/bin', '/sbin', '/root'];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PATH SAFETY
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Validate that a path is safe to access
   */
  private validatePath(path: string): { valid: boolean; error?: string } {
    const absolutePath = path.startsWith('/') ? path : join(this.workingDirectory, path);

    // Check denied paths
    for (const denied of this.deniedPaths) {
      if (absolutePath.startsWith(denied)) {
        return { valid: false, error: `Access denied to path: ${denied}` };
      }
    }

    // Check allowed paths
    const isAllowed = this.allowedPaths.some((allowed) => absolutePath.startsWith(allowed));
    if (!isAllowed) {
      return { valid: false, error: `Path not in allowed directories: ${absolutePath}` };
    }

    return { valid: true };
  }

  /**
   * Log a tool execution for audit
   */
  private log(tool: string, params: unknown, result: string): void {
    const entry = {
      timestamp: new Date().toISOString(),
      tool,
      params,
      result,
    };
    this.auditLog.push(entry);
    this.emit('tool:executed', entry);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FILE OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Read a file
   */
  async readFile(
    path: string,
    options?: {
      startLine?: number;
      endLine?: number;
    }
  ): Promise<ToolResult<FileReadResult>> {
    const start = Date.now();

    const validation = this.validatePath(path);
    if (!validation.valid) {
      return { success: false, error: validation.error, duration_ms: Date.now() - start };
    }

    try {
      const absolutePath = path.startsWith('/') ? path : join(this.workingDirectory, path);

      if (!existsSync(absolutePath)) {
        return {
          success: false,
          error: `File not found: ${path}`,
          duration_ms: Date.now() - start,
        };
      }

      const content = readFileSync(absolutePath, 'utf-8');
      const lines = content.split('\n');

      let resultContent = content;
      if (options?.startLine || options?.endLine) {
        const startIdx = (options.startLine || 1) - 1;
        const endIdx = options.endLine || lines.length;
        resultContent = lines.slice(startIdx, endIdx).join('\n');
      }

      const result: FileReadResult = {
        content: resultContent,
        path: absolutePath,
        lines: lines.length,
        size: Buffer.byteLength(content, 'utf-8'),
      };

      this.log('file_read', { path, options }, 'success');
      return { success: true, data: result, duration_ms: Date.now() - start };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('file_read', { path, options }, `error: ${errorMsg}`);
      return { success: false, error: errorMsg, duration_ms: Date.now() - start };
    }
  }

  /**
   * Write a file
   */
  async writeFile(
    path: string,
    content: string,
    options?: {
      createBackup?: boolean;
      createDirectories?: boolean;
    }
  ): Promise<ToolResult<FileWriteResult>> {
    const start = Date.now();

    const validation = this.validatePath(path);
    if (!validation.valid) {
      return { success: false, error: validation.error, duration_ms: Date.now() - start };
    }

    try {
      const absolutePath = path.startsWith('/') ? path : join(this.workingDirectory, path);
      const existed = existsSync(absolutePath);
      let backupPath: string | undefined;

      // Create directories if needed
      if (options?.createDirectories !== false) {
        const dir = dirname(absolutePath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      }

      // Create backup if file exists
      if (existed && options?.createBackup) {
        backupPath = `${absolutePath}.backup.${Date.now()}`;
        const existingContent = readFileSync(absolutePath, 'utf-8');
        writeFileSync(backupPath, existingContent);
      }

      writeFileSync(absolutePath, content);

      const result: FileWriteResult = {
        path: absolutePath,
        bytesWritten: Buffer.byteLength(content, 'utf-8'),
        created: !existed,
        backupPath,
      };

      this.log('file_write', { path, contentLength: content.length, options }, 'success');
      this.emit('file:written', result);
      return { success: true, data: result, duration_ms: Date.now() - start };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('file_write', { path, options }, `error: ${errorMsg}`);
      return { success: false, error: errorMsg, duration_ms: Date.now() - start };
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<ToolResult<{ path: string }>> {
    const start = Date.now();

    const validation = this.validatePath(path);
    if (!validation.valid) {
      return { success: false, error: validation.error, duration_ms: Date.now() - start };
    }

    try {
      const absolutePath = path.startsWith('/') ? path : join(this.workingDirectory, path);

      if (!existsSync(absolutePath)) {
        return {
          success: false,
          error: `File not found: ${path}`,
          duration_ms: Date.now() - start,
        };
      }

      unlinkSync(absolutePath);
      this.log('file_delete', { path }, 'success');
      return { success: true, data: { path: absolutePath }, duration_ms: Date.now() - start };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('file_delete', { path }, `error: ${errorMsg}`);
      return { success: false, error: errorMsg, duration_ms: Date.now() - start };
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(path: string): Promise<ToolResult<DirectoryListResult>> {
    const start = Date.now();

    const validation = this.validatePath(path);
    if (!validation.valid) {
      return { success: false, error: validation.error, duration_ms: Date.now() - start };
    }

    try {
      const absolutePath = path.startsWith('/') ? path : join(this.workingDirectory, path);

      if (!existsSync(absolutePath)) {
        return {
          success: false,
          error: `Directory not found: ${path}`,
          duration_ms: Date.now() - start,
        };
      }

      const entries = readdirSync(absolutePath).map((name) => {
        const entryPath = join(absolutePath, name);
        const stats = statSync(entryPath);
        return {
          name: stats.isDirectory() ? `${name}/` : name,
          type: (stats.isDirectory() ? 'directory' : 'file') as 'file' | 'directory',
          size: stats.isFile() ? stats.size : undefined,
        };
      });

      const result: DirectoryListResult = {
        path: absolutePath,
        entries,
      };

      this.log('list_directory', { path }, 'success');
      return { success: true, data: result, duration_ms: Date.now() - start };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('list_directory', { path }, `error: ${errorMsg}`);
      return { success: false, error: errorMsg, duration_ms: Date.now() - start };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SEARCH OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Search for text in files (grep-like)
   */
  async grepSearch(
    pattern: string,
    options?: {
      paths?: string[];
      maxResults?: number;
      includeContext?: boolean;
    }
  ): Promise<ToolResult<SearchResult>> {
    const start = Date.now();
    const maxResults = options?.maxResults || 100;

    try {
      const searchPaths = options?.paths || [this.workingDirectory];
      const matches: SearchResult['matches'] = [];

      for (const searchPath of searchPaths) {
        const validation = this.validatePath(searchPath);
        if (!validation.valid) continue;

        const absolutePath = searchPath.startsWith('/')
          ? searchPath
          : join(this.workingDirectory, searchPath);

        // Use grep for efficiency
        try {
          const grepCmd = `grep -rn "${pattern.replace(/"/g, '\\"')}" "${absolutePath}" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.yaml" --include="*.yml" --include="*.json" --include="*.md" 2>/dev/null | head -${maxResults}`;
          const output = execSync(grepCmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });

          for (const line of output.split('\n').filter(Boolean)) {
            const match = line.match(/^([^:]+):(\d+):(.*)$/);
            if (match) {
              matches.push({
                file: match[1],
                line: parseInt(match[2], 10),
                content: match[3].trim(),
              });
            }
            if (matches.length >= maxResults) break;
          }
        } catch {
          // grep returns non-zero if no matches, that's OK
        }
      }

      const result: SearchResult = {
        matches,
        totalMatches: matches.length,
      };

      this.log('grep_search', { pattern, options }, `found ${matches.length} matches`);
      return { success: true, data: result, duration_ms: Date.now() - start };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('grep_search', { pattern, options }, `error: ${errorMsg}`);
      return { success: false, error: errorMsg, duration_ms: Date.now() - start };
    }
  }

  /**
   * Find files by name pattern
   */
  async findFiles(
    pattern: string,
    options?: {
      path?: string;
      maxResults?: number;
    }
  ): Promise<ToolResult<{ files: string[] }>> {
    const start = Date.now();
    const maxResults = options?.maxResults || 100;

    try {
      const searchPath = options?.path || this.workingDirectory;
      const validation = this.validatePath(searchPath);
      if (!validation.valid) {
        return { success: false, error: validation.error, duration_ms: Date.now() - start };
      }

      const absolutePath = searchPath.startsWith('/')
        ? searchPath
        : join(this.workingDirectory, searchPath);

      const findCmd = `find "${absolutePath}" -name "${pattern}" -type f 2>/dev/null | head -${maxResults}`;
      const output = execSync(findCmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });

      const files = output.split('\n').filter(Boolean);

      this.log('find_files', { pattern, options }, `found ${files.length} files`);
      return { success: true, data: { files }, duration_ms: Date.now() - start };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('find_files', { pattern, options }, `error: ${errorMsg}`);
      return { success: false, error: errorMsg, duration_ms: Date.now() - start };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TERMINAL OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Execute a shell command
   */
  async runCommand(
    command: string,
    options?: {
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
    }
  ): Promise<ToolResult<TerminalResult>> {
    const start = Date.now();
    const timeout = options?.timeout || 30000;

    // Safety check for dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf\s+[\/~]/,
      />\s*\/dev\/sd[a-z]/,
      /mkfs/,
      /dd\s+if=/,
      /:(){ :\|:& };:/,
      /chmod\s+-R\s+777\s+\//,
      /pkill\s+-f\s+.*node/, // Don't kill node in Codespace!
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          success: false,
          error: `Dangerous command blocked: ${command}`,
          duration_ms: Date.now() - start,
        };
      }
    }

    try {
      const cwd = options?.cwd || this.workingDirectory;
      const validation = this.validatePath(cwd);
      if (!validation.valid) {
        return { success: false, error: validation.error, duration_ms: Date.now() - start };
      }

      const stdout = execSync(command, {
        encoding: 'utf-8',
        cwd,
        timeout,
        env: { ...process.env, ...options?.env },
        maxBuffer: 10 * 1024 * 1024,
      });

      const result: TerminalResult = {
        stdout,
        stderr: '',
        exitCode: 0,
      };

      this.log('run_command', { command, options }, 'success');
      this.emit('command:executed', { command, result });
      return { success: true, data: result, duration_ms: Date.now() - start };
    } catch (error: any) {
      const result: TerminalResult = {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.status || 1,
      };

      this.log('run_command', { command, options }, `exit code: ${result.exitCode}`);
      return {
        success: false,
        data: result,
        error: result.stderr,
        duration_ms: Date.now() - start,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get audit log
   */
  getAuditLog(): typeof this.auditLog {
    return [...this.auditLog];
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Set working directory
   */
  setWorkingDirectory(path: string): void {
    this.workingDirectory = path;
  }

  /**
   * Get stats
   */
  getStats(): { operationsCount: number; workingDirectory: string } {
    return {
      operationsCount: this.auditLog.length,
      workingDirectory: this.workingDirectory,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const toolRunner = new ToolRunner({
  workingDirectory: process.cwd(),
  allowedPaths: ['/workspaces', '/tmp', process.cwd()],
  deniedPaths: ['/etc', '/var', '/usr', '/bin', '/sbin', '/root'],
});

export default toolRunner;
