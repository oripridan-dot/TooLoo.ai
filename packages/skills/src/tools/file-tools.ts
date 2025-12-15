/**
 * @tooloo/skills - File Tools Implementation
 * Tools for reading and writing files
 *
 * @version 1.0.0
 * @skill-os true
 */

import { promises as fs } from 'fs';
import { dirname, resolve, relative, isAbsolute } from 'path';
import type {
  ToolImplementation,
  ToolExecutionContext,
  FileReadParams,
  FileReadResult,
  FileWriteParams,
  FileWriteResult,
} from './types.js';
import { FileReadParamsSchema, FileWriteParamsSchema } from './types.js';

// =============================================================================
// FILE READ TOOL
// =============================================================================

/**
 * Implementation of the file_read tool
 */
export const fileReadTool: ToolImplementation<FileReadParams, FileReadResult> = {
  name: 'file_read',
  description: 'Read the contents of a file. Can read specific line ranges.',

  parameters: {
    path: {
      type: 'string',
      description: 'The path to the file to read (absolute or relative to working directory)',
      required: true,
    },
    startLine: {
      type: 'number',
      description: 'The line number to start reading from (1-based)',
      required: false,
    },
    endLine: {
      type: 'number',
      description: 'The line number to end reading at (1-based, inclusive)',
      required: false,
    },
    encoding: {
      type: 'string',
      description: 'The file encoding (default: utf-8)',
      required: false,
      default: 'utf-8',
    },
  },

  requiresApproval: false,
  riskLevel: 'low',
  timeout: 10000,

  validate: (params: FileReadParams) => {
    const result = FileReadParamsSchema.safeParse(params);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }

    // Additional validation
    if (params.startLine && params.endLine && params.startLine > params.endLine) {
      return {
        valid: false,
        errors: ['startLine must be less than or equal to endLine'],
      };
    }

    return { valid: true };
  },

  execute: async (
    params: FileReadParams,
    context: ToolExecutionContext
  ): Promise<FileReadResult> => {
    // Resolve path
    const filePath = isAbsolute(params.path)
      ? params.path
      : resolve(context.workingDirectory, params.path);

    // Check file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error(`Not a file: ${filePath}`);
    }

    // Read file content
    const encoding = (params.encoding || 'utf-8') as BufferEncoding;
    const content = await fs.readFile(filePath, encoding);
    const lines = content.split('\n');
    const totalLines = lines.length;

    // Calculate line range
    const startLine = params.startLine ?? 1;
    const endLine = params.endLine ?? totalLines;

    // Validate line range
    if (startLine < 1 || startLine > totalLines) {
      throw new Error(`Start line ${startLine} is out of range (1-${totalLines})`);
    }

    // Extract requested lines (1-based to 0-based index)
    const selectedLines = lines.slice(startLine - 1, endLine);
    const resultContent = selectedLines.join('\n');

    return {
      content: resultContent,
      totalLines,
      linesReturned: {
        start: startLine,
        end: Math.min(endLine, totalLines),
      },
      size: stats.size,
      path: filePath,
    };
  },
};

// =============================================================================
// FILE WRITE TOOL
// =============================================================================

/**
 * Implementation of the file_write tool
 */
export const fileWriteTool: ToolImplementation<FileWriteParams, FileWriteResult> = {
  name: 'file_write',
  description: 'Write content to a file. Creates backup before writing and can create directories.',

  parameters: {
    path: {
      type: 'string',
      description: 'The path to write to (absolute or relative to working directory)',
      required: true,
    },
    content: {
      type: 'string',
      description: 'The content to write to the file',
      required: true,
    },
    backup: {
      type: 'boolean',
      description: 'Whether to create a backup of existing file before writing',
      required: false,
      default: true,
    },
    createDirs: {
      type: 'boolean',
      description: 'Whether to create parent directories if they do not exist',
      required: false,
      default: true,
    },
    encoding: {
      type: 'string',
      description: 'The file encoding (default: utf-8)',
      required: false,
      default: 'utf-8',
    },
  },

  requiresApproval: true,
  riskLevel: 'medium',
  timeout: 30000,

  validate: (params: FileWriteParams) => {
    const result = FileWriteParamsSchema.safeParse(params);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }

    return { valid: true };
  },

  execute: async (
    params: FileWriteParams,
    context: ToolExecutionContext
  ): Promise<FileWriteResult> => {
    // Resolve path
    const filePath = isAbsolute(params.path)
      ? params.path
      : resolve(context.workingDirectory, params.path);

    const dir = dirname(filePath);
    let backupPath: string | undefined;

    // Check if dry run
    if (context.dryRun) {
      return {
        success: true,
        path: filePath,
        bytesWritten: Buffer.byteLength(
          params.content,
          (params.encoding as BufferEncoding) || 'utf-8'
        ),
      };
    }

    // Create directories if needed
    if (params.createDirs !== false) {
      await fs.mkdir(dir, { recursive: true });
    }

    // Check if file exists and create backup
    let fileExists = false;
    try {
      await fs.access(filePath);
      fileExists = true;
    } catch {
      fileExists = false;
    }

    if (fileExists && params.backup !== false) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      backupPath = `${filePath}.backup-${timestamp}`;
      await fs.copyFile(filePath, backupPath);
    }

    // Write file
    const encoding = (params.encoding || 'utf-8') as BufferEncoding;
    await fs.writeFile(filePath, params.content, encoding);

    // Get written bytes
    const bytesWritten = Buffer.byteLength(params.content, encoding);

    return {
      success: true,
      path: filePath,
      backupPath,
      bytesWritten,
    };
  },
};

// =============================================================================
// FILE DELETE TOOL
// =============================================================================

export interface FileDeleteParams {
  path: string;
  recursive?: boolean;
}

export interface FileDeleteResult {
  success: boolean;
  path: string;
  isDirectory: boolean;
}

/**
 * Implementation of the file_delete tool
 */
export const fileDeleteTool: ToolImplementation<FileDeleteParams, FileDeleteResult> = {
  name: 'file_delete',
  description: 'Delete a file or directory. Use with caution.',

  parameters: {
    path: {
      type: 'string',
      description: 'The path to delete',
      required: true,
    },
    recursive: {
      type: 'boolean',
      description: 'Whether to recursively delete directories',
      required: false,
      default: false,
    },
  },

  requiresApproval: true,
  riskLevel: 'high',
  timeout: 30000,

  validate: (params: FileDeleteParams) => {
    if (!params.path || params.path.trim() === '') {
      return { valid: false, errors: ['Path is required'] };
    }
    return { valid: true };
  },

  execute: async (
    params: FileDeleteParams,
    context: ToolExecutionContext
  ): Promise<FileDeleteResult> => {
    const filePath = isAbsolute(params.path)
      ? params.path
      : resolve(context.workingDirectory, params.path);

    // Check if dry run
    if (context.dryRun) {
      const stats = await fs.stat(filePath);
      return {
        success: true,
        path: filePath,
        isDirectory: stats.isDirectory(),
      };
    }

    // Get file/dir info
    const stats = await fs.stat(filePath);
    const isDirectory = stats.isDirectory();

    // Delete
    if (isDirectory) {
      if (params.recursive) {
        await fs.rm(filePath, { recursive: true });
      } else {
        await fs.rmdir(filePath);
      }
    } else {
      await fs.unlink(filePath);
    }

    return {
      success: true,
      path: filePath,
      isDirectory,
    };
  },
};

// =============================================================================
// LIST DIRECTORY TOOL
// =============================================================================

export interface ListDirParams {
  path: string;
  recursive?: boolean;
  maxDepth?: number;
}

export interface DirEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink' | 'other';
  size?: number;
}

export interface ListDirResult {
  entries: DirEntry[];
  path: string;
  totalFiles: number;
  totalDirectories: number;
}

/**
 * Implementation of the list_dir tool
 */
export const listDirTool: ToolImplementation<ListDirParams, ListDirResult> = {
  name: 'list_dir',
  description: 'List the contents of a directory.',

  parameters: {
    path: {
      type: 'string',
      description: 'The directory path to list',
      required: true,
    },
    recursive: {
      type: 'boolean',
      description: 'Whether to list recursively',
      required: false,
      default: false,
    },
    maxDepth: {
      type: 'number',
      description: 'Maximum depth for recursive listing',
      required: false,
      default: 3,
    },
  },

  requiresApproval: false,
  riskLevel: 'low',
  timeout: 10000,

  validate: (params: ListDirParams) => {
    if (!params.path || params.path.trim() === '') {
      return { valid: false, errors: ['Path is required'] };
    }
    return { valid: true };
  },

  execute: async (params: ListDirParams, context: ToolExecutionContext): Promise<ListDirResult> => {
    const dirPath = isAbsolute(params.path)
      ? params.path
      : resolve(context.workingDirectory, params.path);

    const entries: DirEntry[] = [];
    let totalFiles = 0;
    let totalDirectories = 0;

    async function scanDir(currentPath: string, depth: number): Promise<void> {
      if (params.recursive && params.maxDepth && depth > params.maxDepth) {
        return;
      }

      const items = await fs.readdir(currentPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = resolve(currentPath, item.name);
        let type: DirEntry['type'] = 'other';
        let size: number | undefined;

        if (item.isFile()) {
          type = 'file';
          totalFiles++;
          const stats = await fs.stat(itemPath);
          size = stats.size;
        } else if (item.isDirectory()) {
          type = 'directory';
          totalDirectories++;
        } else if (item.isSymbolicLink()) {
          type = 'symlink';
        }

        entries.push({
          name: item.name,
          path: relative(dirPath, itemPath) || item.name,
          type,
          size,
        });

        if (params.recursive && item.isDirectory()) {
          await scanDir(itemPath, depth + 1);
        }
      }
    }

    await scanDir(dirPath, 0);

    return {
      entries,
      path: dirPath,
      totalFiles,
      totalDirectories,
    };
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

export const fileTools = [fileReadTool, fileWriteTool, fileDeleteTool, listDirTool];

export default fileTools;
