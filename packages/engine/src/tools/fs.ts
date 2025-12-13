// @version 2.0.NaN
// @version 2.0.NaN
/**
 * @tooloo/engine - File System Tools
 * Secure file operations for AI self-modification
 * 
 * Security:
 * - Path traversal prevention
 * - Root boundary enforcement
 * - Operation logging
 * 
 * @version 2.0.0-alpha.0
 */

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import type { ToolDefinition, ToolResult } from '../types.js';

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

/**
 * Project root - all file operations are sandboxed to this directory
 * Uses the current working directory by default, but can be overridden
 */
let PROJECT_ROOT = process.cwd();

/**
 * Directories that are FORBIDDEN from modification
 */
const FORBIDDEN_PATHS = [
  'node_modules',
  '.git',
  '.env',
  '.env.local',
  '.env.production',
  'secrets',
  'credentials',
  '*.key',
  '*.pem',
  '*.cert',
];

/**
 * File extensions that require extra confirmation
 */
const SENSITIVE_EXTENSIONS = [
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.env',
  '.config',
  '.lock',
];

/**
 * Set the project root for file operations
 */
export function setProjectRoot(root: string): void {
  PROJECT_ROOT = path.resolve(root);
}

/**
 * Get current project root
 */
export function getProjectRoot(): string {
  return PROJECT_ROOT;
}

// =============================================================================
// SECURITY HELPERS
// =============================================================================

/**
 * Validate a file path is safe to access
 * Throws if path attempts directory traversal or accesses forbidden paths
 */
function validatePath(filePath: string): string {
  const fullPath = path.resolve(PROJECT_ROOT, filePath);
  
  // Prevent directory traversal attacks
  if (!fullPath.startsWith(PROJECT_ROOT)) {
    throw new SecurityError(
      `Access denied: Path "${filePath}" escapes project root`
    );
  }
  
  // Check against forbidden paths
  const relativePath = path.relative(PROJECT_ROOT, fullPath);
  for (const forbidden of FORBIDDEN_PATHS) {
    if (forbidden.startsWith('*')) {
      // Wildcard match for extensions
      const ext = forbidden.slice(1);
      if (relativePath.endsWith(ext)) {
        throw new SecurityError(
          `Access denied: Cannot modify files with extension "${ext}"`
        );
      }
    } else {
      // Exact or prefix match
      if (relativePath === forbidden || 
          relativePath.startsWith(forbidden + path.sep)) {
        throw new SecurityError(
          `Access denied: Path "${forbidden}" is protected`
        );
      }
    }
  }
  
  return fullPath;
}

/**
 * Check if a path is sensitive (config files, etc.)
 */
function isSensitivePath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SENSITIVE_EXTENSIONS.includes(ext);
}

/**
 * Log file operations for auditing
 */
function logOperation(
  operation: string,
  filePath: string,
  details?: Record<string, unknown>
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    operation,
    path: filePath,
    projectRoot: PROJECT_ROOT,
    ...details,
  };
  
  // TODO: Integrate with event bus for proper audit logging
  console.log(`[FS-TOOL] ${JSON.stringify(entry)}`);
}

// =============================================================================
// ERROR CLASSES
// =============================================================================

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class FileOperationError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly operation: string
  ) {
    super(message);
    this.name = 'FileOperationError';
  }
}

// =============================================================================
// TOOL SCHEMAS
// =============================================================================

export const FileWriteSchema = z.object({
  path: z.string().describe('Relative path from project root'),
  content: z.string().describe('Content to write to the file'),
  createDirectories: z.boolean().optional().default(true)
    .describe('Create parent directories if they do not exist'),
  backup: z.boolean().optional().default(true)
    .describe('Create a backup of existing file before overwriting'),
});

export const FileReadSchema = z.object({
  path: z.string().describe('Relative path from project root'),
  encoding: z.enum(['utf-8', 'base64', 'hex']).optional().default('utf-8')
    .describe('File encoding'),
});

export const FileDeleteSchema = z.object({
  path: z.string().describe('Relative path from project root'),
  recursive: z.boolean().optional().default(false)
    .describe('Recursively delete directories'),
});

export const FileListSchema = z.object({
  path: z.string().optional().default('.')
    .describe('Directory path relative to project root'),
  pattern: z.string().optional()
    .describe('Glob pattern to filter files'),
  recursive: z.boolean().optional().default(false)
    .describe('List files recursively'),
});

export const FileExistsSchema = z.object({
  path: z.string().describe('Relative path from project root'),
});

export const FileMoveSchema = z.object({
  source: z.string().describe('Source path relative to project root'),
  destination: z.string().describe('Destination path relative to project root'),
  overwrite: z.boolean().optional().default(false)
    .describe('Overwrite destination if it exists'),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type FileWriteInput = z.infer<typeof FileWriteSchema>;
export type FileReadInput = z.infer<typeof FileReadSchema>;
export type FileDeleteInput = z.infer<typeof FileDeleteSchema>;
export type FileListInput = z.infer<typeof FileListSchema>;
export type FileExistsInput = z.infer<typeof FileExistsSchema>;
export type FileMoveInput = z.infer<typeof FileMoveSchema>;

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

/**
 * File Write Tool
 * Writes content to a file with security checks and optional backup
 */
export const fileWrite: ToolDefinition<FileWriteInput> = {
  schema: FileWriteSchema,
  description: 'Write content to a file. Creates directories if needed.',
  requiresConfirmation: true,
  riskLevel: 'high',
  
  execute: async (input): Promise<ToolResult> => {
    const { path: filePath, content, createDirectories, backup } = input;
    
    try {
      const fullPath = validatePath(filePath);
      const sensitive = isSensitivePath(filePath);
      
      // Create directories if needed
      if (createDirectories) {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
      }
      
      // Backup existing file if requested
      let backupPath: string | undefined;
      try {
        await fs.access(fullPath);
        if (backup) {
          backupPath = `${fullPath}.bak.${Date.now()}`;
          await fs.copyFile(fullPath, backupPath);
        }
      } catch {
        // File doesn't exist, no backup needed
      }
      
      // Write the file
      await fs.writeFile(fullPath, content, 'utf-8');
      
      // Log the operation
      logOperation('write', filePath, {
        bytes: content.length,
        backup: backupPath,
        sensitive,
      });
      
      return {
        success: true,
        output: `✓ Wrote ${content.length} bytes to ${filePath}${backupPath ? ` (backup: ${path.basename(backupPath)})` : ''}`,
        metadata: {
          path: filePath,
          bytes: content.length,
          backupPath,
          sensitive,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logOperation('write_failed', filePath, { error: message });
      
      return {
        success: false,
        output: '',
        error: `Failed to write ${filePath}: ${message}`,
      };
    }
  },
};

/**
 * File Read Tool
 * Reads content from a file with security checks
 */
export const fileRead: ToolDefinition<FileReadInput> = {
  schema: FileReadSchema,
  description: 'Read content from a file.',
  requiresConfirmation: false,
  riskLevel: 'low',
  
  execute: async (input): Promise<ToolResult> => {
    const { path: filePath, encoding } = input;
    
    try {
      const fullPath = validatePath(filePath);
      
      const content = await fs.readFile(fullPath, encoding);
      const contentStr = typeof content === 'string' ? content : content.toString();
      
      logOperation('read', filePath, { bytes: contentStr.length });
      
      return {
        success: true,
        output: contentStr,
        metadata: {
          path: filePath,
          bytes: contentStr.length,
          encoding,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logOperation('read_failed', filePath, { error: message });
      
      return {
        success: false,
        output: '',
        error: `Failed to read ${filePath}: ${message}`,
      };
    }
  },
};

/**
 * File Delete Tool
 * Deletes a file or directory with security checks
 */
export const fileDelete: ToolDefinition<FileDeleteInput> = {
  schema: FileDeleteSchema,
  description: 'Delete a file or directory.',
  requiresConfirmation: true,
  riskLevel: 'high',
  
  execute: async (input): Promise<ToolResult> => {
    const { path: filePath, recursive } = input;
    
    try {
      const fullPath = validatePath(filePath);
      
      const stats = await fs.stat(fullPath);
      const isDir = stats.isDirectory();
      
      if (isDir && !recursive) {
        return {
          success: false,
          output: '',
          error: `${filePath} is a directory. Use recursive=true to delete directories.`,
        };
      }
      
      await fs.rm(fullPath, { recursive, force: false });
      
      logOperation('delete', filePath, { isDir, recursive });
      
      return {
        success: true,
        output: `✓ Deleted ${isDir ? 'directory' : 'file'}: ${filePath}`,
        metadata: {
          path: filePath,
          isDirectory: isDir,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logOperation('delete_failed', filePath, { error: message });
      
      return {
        success: false,
        output: '',
        error: `Failed to delete ${filePath}: ${message}`,
      };
    }
  },
};

/**
 * File List Tool
 * Lists files in a directory
 */
export const fileList: ToolDefinition<FileListInput> = {
  schema: FileListSchema,
  description: 'List files in a directory.',
  requiresConfirmation: false,
  riskLevel: 'low',
  
  execute: async (input): Promise<ToolResult> => {
    const { path: dirPath, recursive } = input;
    
    try {
      const fullPath = validatePath(dirPath);
      
      const entries: string[] = [];
      
      async function listDir(dir: string, prefix = ''): Promise<void> {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          const relativePath = prefix ? `${prefix}/${item.name}` : item.name;
          
          if (item.isDirectory()) {
            entries.push(`${relativePath}/`);
            if (recursive) {
              await listDir(path.join(dir, item.name), relativePath);
            }
          } else {
            entries.push(relativePath);
          }
        }
      }
      
      await listDir(fullPath);
      
      logOperation('list', dirPath, { count: entries.length, recursive });
      
      return {
        success: true,
        output: entries.join('\n'),
        metadata: {
          path: dirPath,
          count: entries.length,
          entries,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logOperation('list_failed', dirPath, { error: message });
      
      return {
        success: false,
        output: '',
        error: `Failed to list ${dirPath}: ${message}`,
      };
    }
  },
};

/**
 * File Exists Tool
 * Checks if a file or directory exists
 */
export const fileExists: ToolDefinition<FileExistsInput> = {
  schema: FileExistsSchema,
  description: 'Check if a file or directory exists.',
  requiresConfirmation: false,
  riskLevel: 'low',
  
  execute: async (input): Promise<ToolResult> => {
    const { path: filePath } = input;
    
    try {
      const fullPath = validatePath(filePath);
      
      try {
        const stats = await fs.stat(fullPath);
        const type = stats.isDirectory() ? 'directory' : 'file';
        
        return {
          success: true,
          output: `exists:true,type:${type}`,
          metadata: {
            path: filePath,
            exists: true,
            type,
            size: stats.size,
            modified: stats.mtime.toISOString(),
          },
        };
      } catch {
        return {
          success: true,
          output: 'exists:false',
          metadata: {
            path: filePath,
            exists: false,
          },
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      return {
        success: false,
        output: '',
        error: `Failed to check ${filePath}: ${message}`,
      };
    }
  },
};

/**
 * File Move Tool
 * Moves or renames a file
 */
export const fileMove: ToolDefinition<FileMoveInput> = {
  schema: FileMoveSchema,
  description: 'Move or rename a file.',
  requiresConfirmation: true,
  riskLevel: 'medium',
  
  execute: async (input): Promise<ToolResult> => {
    const { source, destination, overwrite } = input;
    
    try {
      const srcPath = validatePath(source);
      const destPath = validatePath(destination);
      
      // Check if destination exists
      try {
        await fs.access(destPath);
        if (!overwrite) {
          return {
            success: false,
            output: '',
            error: `Destination ${destination} already exists. Use overwrite=true to replace.`,
          };
        }
      } catch {
        // Destination doesn't exist, good to proceed
      }
      
      // Create destination directory if needed
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      
      // Move the file
      await fs.rename(srcPath, destPath);
      
      logOperation('move', source, { destination });
      
      return {
        success: true,
        output: `✓ Moved ${source} → ${destination}`,
        metadata: {
          source,
          destination,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logOperation('move_failed', source, { destination, error: message });
      
      return {
        success: false,
        output: '',
        error: `Failed to move ${source}: ${message}`,
      };
    }
  },
};

// =============================================================================
// TOOL REGISTRY
// =============================================================================

/**
 * All file system tools
 */
export const FileTools = {
  file_write: fileWrite,
  file_read: fileRead,
  file_delete: fileDelete,
  file_list: fileList,
  file_exists: fileExists,
  file_move: fileMove,
};

export type FileToolName = keyof typeof FileTools;
