// @version 3.3.91
/**
 * TooLoo Self-Modification System
 * 
 * This module gives TooLoo the ability to read, edit, and create its own source code.
 * 
 * ⚠️ SAFETY FEATURES:
 * - All modifications create automatic backups
 * - Critical system files have extra protection
 * - Changes are logged and can be reverted
 * - Git integration for version control
 * 
 * CAPABILITIES:
 * - Read source files
 * - Edit existing code (find and replace)
 * - Create new files
 * - Delete files (with backup)
 * - Search codebase
 * - Run tests after changes
 * 
 * @module cortex/motor/self-modification
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import { bus } from '../../core/event-bus.js';

const execAsync = promisify(exec);

// ============================================================================
// TYPES
// ============================================================================

export interface SelfModResult {
  success: boolean;
  message: string;
  filePath?: string;
  backup?: string;
  diff?: string;
  error?: string;
}

export interface CodeEdit {
  filePath: string;
  oldCode: string;
  newCode: string;
  reason: string;
}

export interface FileSearchResult {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  context: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Root workspace path
  workspaceRoot: process.cwd(),
  
  // Backup directory for modified files
  backupDir: '.tooloo-backups',
  
  // Files/patterns that require extra confirmation
  criticalPatterns: [
    /^\.env/,                    // Environment files
    /package\.json$/,            // Package configuration
    /tsconfig\.json$/,           // TypeScript config
    /src\/main\.ts$/,            // Main entry point
    /self-modification\.ts$/,    // This file itself
  ],
  
  // Directories to never modify
  protectedDirs: [
    'node_modules',
    '.git',
    'dist',
  ],
  
  // Maximum file size to read (5MB)
  maxFileSize: 5 * 1024 * 1024,
  
  // Enable git integration
  useGit: true,
};

// ============================================================================
// SELF-MODIFICATION ENGINE
// ============================================================================

export class SelfModificationEngine {
  private modificationLog: Array<{
    timestamp: Date;
    action: string;
    filePath: string;
    backup?: string;
    success: boolean;
  }> = [];
  
  constructor(private workspaceRoot: string = CONFIG.workspaceRoot) {}
  
  // --------------------------------------------------------------------------
  // FILE READING
  // --------------------------------------------------------------------------
  
  /**
   * Read a source file from TooLoo's codebase
   */
  async readFile(relativePath: string): Promise<SelfModResult & { content?: string }> {
    try {
      const fullPath = this.resolvePath(relativePath);
      
      // Security check
      if (!this.isPathAllowed(fullPath)) {
        return {
          success: false,
          message: `Access denied: ${relativePath} is in a protected directory`,
        };
      }
      
      // Check file exists
      const stat = await fs.stat(fullPath);
      if (stat.size > CONFIG.maxFileSize) {
        return {
          success: false,
          message: `File too large: ${stat.size} bytes (max ${CONFIG.maxFileSize})`,
        };
      }
      
      const content = await fs.readFile(fullPath, 'utf-8');
      
      return {
        success: true,
        message: `Read ${relativePath} (${content.length} chars)`,
        filePath: relativePath,
        content,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to read file: ${error.message}`,
        error: error.message,
      };
    }
  }
  
  /**
   * Read multiple files at once
   */
  async readFiles(paths: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    
    for (const p of paths) {
      const result = await this.readFile(p);
      results.set(p, result.success ? (result as any).content : null);
    }
    
    return results;
  }
  
  // --------------------------------------------------------------------------
  // FILE EDITING
  // --------------------------------------------------------------------------
  
  /**
   * Edit a file by replacing specific code
   */
  async editFile(edit: CodeEdit): Promise<SelfModResult> {
    const { filePath, oldCode, newCode, reason } = edit;
    
    console.log(`[SelfMod] Editing ${filePath}: ${reason}`);
    
    try {
      const fullPath = this.resolvePath(filePath);
      
      // Security checks
      if (!this.isPathAllowed(fullPath)) {
        return {
          success: false,
          message: `Access denied: ${filePath} is protected`,
        };
      }
      
      // Check if critical file
      const isCritical = this.isCriticalFile(filePath);
      if (isCritical) {
        console.log(`[SelfMod] ⚠️ Modifying critical file: ${filePath}`);
      }
      
      // Read current content
      const currentContent = await fs.readFile(fullPath, 'utf-8');
      
      // Verify old code exists
      if (!currentContent.includes(oldCode)) {
        return {
          success: false,
          message: `Old code not found in ${filePath}. File may have changed.`,
          error: 'OLD_CODE_NOT_FOUND',
        };
      }
      
      // Check for multiple matches (ambiguous edit)
      const matches = currentContent.split(oldCode).length - 1;
      if (matches > 1) {
        return {
          success: false,
          message: `Ambiguous edit: found ${matches} matches for old code. Please provide more context.`,
          error: 'AMBIGUOUS_EDIT',
        };
      }
      
      // Create backup before modifying
      const backupPath = await this.createBackup(filePath, currentContent);
      
      // Perform replacement
      const newContent = currentContent.replace(oldCode, newCode);
      
      // Write new content
      await fs.writeFile(fullPath, newContent, 'utf-8');
      
      // Generate diff
      const diff = this.generateDiff(oldCode, newCode);
      
      // Log modification
      this.logModification('edit', filePath, backupPath, true);
      
      // Emit event
      bus.publish('cortex', 'self-mod:file-edited', {
        filePath,
        reason,
        backup: backupPath,
        timestamp: new Date().toISOString(),
      });
      
      return {
        success: true,
        message: `✅ Edited ${filePath}: ${reason}`,
        filePath,
        backup: backupPath,
        diff,
      };
    } catch (error: any) {
      this.logModification('edit', filePath, undefined, false);
      return {
        success: false,
        message: `Failed to edit file: ${error.message}`,
        error: error.message,
      };
    }
  }
  
  /**
   * Apply multiple edits atomically
   */
  async multiEdit(edits: CodeEdit[]): Promise<SelfModResult[]> {
    const results: SelfModResult[] = [];
    const backups: string[] = [];
    
    try {
      for (const edit of edits) {
        const result = await this.editFile(edit);
        results.push(result);
        
        if (!result.success) {
          // Rollback previous edits
          console.log('[SelfMod] Edit failed, rolling back...');
          for (const backup of backups) {
            await this.restoreBackup(backup);
          }
          break;
        }
        
        if (result.backup) {
          backups.push(result.backup);
        }
      }
    } catch (error: any) {
      // Emergency rollback
      for (const backup of backups) {
        await this.restoreBackup(backup);
      }
    }
    
    return results;
  }
  
  // --------------------------------------------------------------------------
  // FILE CREATION
  // --------------------------------------------------------------------------
  
  /**
   * Create a new file in the codebase
   */
  async createFile(
    relativePath: string, 
    content: string, 
    reason: string
  ): Promise<SelfModResult> {
    console.log(`[SelfMod] Creating ${relativePath}: ${reason}`);
    
    try {
      const fullPath = this.resolvePath(relativePath);
      
      // Security check
      if (!this.isPathAllowed(fullPath)) {
        return {
          success: false,
          message: `Access denied: cannot create file in protected directory`,
        };
      }
      
      // Check if file already exists
      try {
        await fs.access(fullPath);
        return {
          success: false,
          message: `File already exists: ${relativePath}. Use editFile instead.`,
          error: 'FILE_EXISTS',
        };
      } catch {
        // File doesn't exist, good to proceed
      }
      
      // Create directory if needed
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      // Write file
      await fs.writeFile(fullPath, content, 'utf-8');
      
      // Log modification
      this.logModification('create', relativePath, undefined, true);
      
      // Emit event
      bus.publish('cortex', 'self-mod:file-created', {
        filePath: relativePath,
        reason,
        timestamp: new Date().toISOString(),
      });
      
      return {
        success: true,
        message: `✅ Created ${relativePath}: ${reason}`,
        filePath: relativePath,
      };
    } catch (error: any) {
      this.logModification('create', relativePath, undefined, false);
      return {
        success: false,
        message: `Failed to create file: ${error.message}`,
        error: error.message,
      };
    }
  }
  
  // --------------------------------------------------------------------------
  // FILE DELETION
  // --------------------------------------------------------------------------
  
  /**
   * Delete a file (with backup)
   */
  async deleteFile(relativePath: string, reason: string): Promise<SelfModResult> {
    console.log(`[SelfMod] Deleting ${relativePath}: ${reason}`);
    
    try {
      const fullPath = this.resolvePath(relativePath);
      
      // Security check
      if (!this.isPathAllowed(fullPath)) {
        return {
          success: false,
          message: `Access denied: cannot delete protected file`,
        };
      }
      
      // Extra check for critical files
      if (this.isCriticalFile(relativePath)) {
        return {
          success: false,
          message: `Cannot delete critical system file: ${relativePath}`,
          error: 'CRITICAL_FILE',
        };
      }
      
      // Create backup before deleting
      const content = await fs.readFile(fullPath, 'utf-8');
      const backupPath = await this.createBackup(relativePath, content);
      
      // Delete file
      await fs.unlink(fullPath);
      
      // Log modification
      this.logModification('delete', relativePath, backupPath, true);
      
      return {
        success: true,
        message: `✅ Deleted ${relativePath} (backup: ${backupPath})`,
        filePath: relativePath,
        backup: backupPath,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to delete file: ${error.message}`,
        error: error.message,
      };
    }
  }
  
  // --------------------------------------------------------------------------
  // CODE SEARCH
  // --------------------------------------------------------------------------
  
  /**
   * Search for code patterns in the codebase
   */
  async searchCode(
    pattern: string, 
    options: { 
      isRegex?: boolean; 
      filePattern?: string;
      maxResults?: number;
    } = {}
  ): Promise<FileSearchResult[]> {
    const { isRegex = false, filePattern = '*.ts', maxResults = 50 } = options;
    
    try {
      // Use grep for efficient searching
      const grepPattern = isRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const cmd = `grep -rn --include="${filePattern}" "${grepPattern}" src/ 2>/dev/null | head -${maxResults}`;
      
      const { stdout } = await execAsync(cmd, { 
        cwd: this.workspaceRoot,
        maxBuffer: 10 * 1024 * 1024,
      });
      
      const results: FileSearchResult[] = [];
      const lines = stdout.trim().split('\n').filter(Boolean);
      
      for (const line of lines) {
        const match = line.match(/^([^:]+):(\d+):(.*)$/);
        if (match) {
          results.push({
            filePath: match[1],
            lineNumber: parseInt(match[2], 10),
            lineContent: match[3].trim(),
            context: [],
          });
        }
      }
      
      return results;
    } catch (error) {
      return [];
    }
  }
  
  /**
   * List all files in a directory
   */
  async listFiles(relativePath: string = 'src'): Promise<string[]> {
    const fullPath = this.resolvePath(relativePath);
    const files: string[] = [];
    
    async function walk(dir: string, base: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const rel = path.join(base, entry.name);
        if (entry.isDirectory()) {
          if (!CONFIG.protectedDirs.includes(entry.name)) {
            await walk(path.join(dir, entry.name), rel);
          }
        } else {
          files.push(rel);
        }
      }
    }
    
    await walk(fullPath, relativePath);
    return files;
  }
  
  // --------------------------------------------------------------------------
  // GIT INTEGRATION
  // --------------------------------------------------------------------------
  
  /**
   * Create a git commit for self-modifications
   */
  async commitChanges(message: string): Promise<SelfModResult> {
    if (!CONFIG.useGit) {
      return { success: false, message: 'Git integration disabled' };
    }
    
    try {
      // Stage all changes
      await execAsync('git add -A', { cwd: this.workspaceRoot });
      
      // Create commit
      const commitMessage = `🤖 [TooLoo Self-Mod] ${message}`;
      await execAsync(`git commit -m "${commitMessage}"`, { cwd: this.workspaceRoot });
      
      return {
        success: true,
        message: `✅ Committed: ${commitMessage}`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Git commit failed: ${error.message}`,
        error: error.message,
      };
    }
  }
  
  /**
   * Get current git status
   */
  async getGitStatus(): Promise<string> {
    try {
      const { stdout } = await execAsync('git status --short', { cwd: this.workspaceRoot });
      return stdout;
    } catch {
      return 'Git not available';
    }
  }
  
  /**
   * Get git diff for a file
   */
  async getGitDiff(filePath?: string): Promise<string> {
    try {
      const cmd = filePath ? `git diff ${filePath}` : 'git diff';
      const { stdout } = await execAsync(cmd, { cwd: this.workspaceRoot });
      return stdout;
    } catch {
      return '';
    }
  }
  
  // --------------------------------------------------------------------------
  // BACKUP & RESTORE
  // --------------------------------------------------------------------------
  
  /**
   * Create a backup of a file before modification
   */
  private async createBackup(relativePath: string, content: string): Promise<string> {
    const timestamp = Date.now();
    const backupDir = path.join(this.workspaceRoot, CONFIG.backupDir);
    const backupPath = path.join(
      backupDir, 
      `${relativePath.replace(/\//g, '_')}.${timestamp}.bak`
    );
    
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, content, 'utf-8');
    
    return backupPath;
  }
  
  /**
   * Restore a file from backup
   */
  async restoreBackup(backupPath: string): Promise<SelfModResult> {
    try {
      // Extract original filename from backup name
      const basename = path.basename(backupPath);
      const match = basename.match(/^(.+)\.\d+\.bak$/);
      if (!match) {
        return { success: false, message: 'Invalid backup filename' };
      }
      
      const originalPath = match[1].replace(/_/g, '/');
      const content = await fs.readFile(backupPath, 'utf-8');
      
      await fs.writeFile(
        path.join(this.workspaceRoot, originalPath),
        content,
        'utf-8'
      );
      
      return {
        success: true,
        message: `✅ Restored ${originalPath} from backup`,
        filePath: originalPath,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Restore failed: ${error.message}`,
        error: error.message,
      };
    }
  }
  
  /**
   * List available backups
   */
  async listBackups(): Promise<string[]> {
    try {
      const backupDir = path.join(this.workspaceRoot, CONFIG.backupDir);
      const files = await fs.readdir(backupDir);
      return files.filter(f => f.endsWith('.bak'));
    } catch {
      return [];
    }
  }
  
  // --------------------------------------------------------------------------
  // TESTING
  // --------------------------------------------------------------------------
  
  /**
   * Run tests after making changes
   */
  async runTests(testPattern?: string): Promise<SelfModResult & { passed: boolean }> {
    try {
      const cmd = testPattern 
        ? `npm test -- --reporter=basic ${testPattern}`
        : 'npm test -- --reporter=basic';
      
      const { stdout, stderr } = await execAsync(cmd, { 
        cwd: this.workspaceRoot,
        timeout: 120000, // 2 minute timeout
      });
      
      const passed = !stderr.includes('FAIL') && stdout.includes('passed');
      
      return {
        success: true,
        passed,
        message: passed ? '✅ All tests passed' : '❌ Some tests failed',
      };
    } catch (error: any) {
      return {
        success: false,
        passed: false,
        message: `Tests failed: ${error.message}`,
        error: error.message,
      };
    }
  }
  
  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------
  
  private resolvePath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    return path.join(this.workspaceRoot, relativePath);
  }
  
  private isPathAllowed(fullPath: string): boolean {
    const relative = path.relative(this.workspaceRoot, fullPath);
    
    // Must be within workspace
    if (relative.startsWith('..')) {
      return false;
    }
    
    // Check protected directories
    for (const dir of CONFIG.protectedDirs) {
      if (relative.startsWith(dir + path.sep) || relative === dir) {
        return false;
      }
    }
    
    return true;
  }
  
  private isCriticalFile(relativePath: string): boolean {
    return CONFIG.criticalPatterns.some(pattern => pattern.test(relativePath));
  }
  
  private generateDiff(oldCode: string, newCode: string): string {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    
    let diff = '';
    diff += `--- old\n+++ new\n`;
    
    // Simple line-by-line diff
    const maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
      if (i < oldLines.length && (i >= newLines.length || oldLines[i] !== newLines[i])) {
        diff += `- ${oldLines[i]}\n`;
      }
      if (i < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[i])) {
        diff += `+ ${newLines[i]}\n`;
      }
    }
    
    return diff;
  }
  
  private logModification(
    action: string, 
    filePath: string, 
    backup?: string, 
    success: boolean = true
  ) {
    this.modificationLog.push({
      timestamp: new Date(),
      action,
      filePath,
      backup,
      success,
    });
    
    // Keep only last 100 entries
    if (this.modificationLog.length > 100) {
      this.modificationLog = this.modificationLog.slice(-100);
    }
  }
  
  /**
   * Get modification history
   */
  getModificationLog() {
    return [...this.modificationLog];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const selfMod = new SelfModificationEngine();
export default SelfModificationEngine;
