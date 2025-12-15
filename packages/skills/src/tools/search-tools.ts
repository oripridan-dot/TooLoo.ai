/**
 * @tooloo/skills - Search Tools Implementation
 * Tools for searching code and content
 *
 * @version 1.0.0
 * @skill-os true
 */

import { promises as fs } from 'fs';
import { resolve, relative, isAbsolute, extname } from 'path';
import { spawn } from 'child_process';
import type {
  ToolImplementation,
  ToolExecutionContext,
  GrepSearchParams,
  GrepSearchResult,
  GrepMatch,
  SemanticSearchParams,
  SemanticSearchResult,
  SemanticSearchMatch,
} from './types.js';
import { GrepSearchParamsSchema, SemanticSearchParamsSchema } from './types.js';

// =============================================================================
// GREP SEARCH TOOL
// =============================================================================

/**
 * Implementation of the grep_search tool
 */
export const grepSearchTool: ToolImplementation<GrepSearchParams, GrepSearchResult> = {
  name: 'grep_search',
  description: 'Search for text patterns in files using grep/ripgrep.',

  parameters: {
    pattern: {
      type: 'string',
      description: 'The pattern to search for',
      required: true,
    },
    isRegex: {
      type: 'boolean',
      description: 'Whether the pattern is a regular expression',
      required: false,
      default: false,
    },
    ignoreCase: {
      type: 'boolean',
      description: 'Whether to ignore case when matching',
      required: false,
      default: true,
    },
    paths: {
      type: 'array',
      description: 'Paths to search in (default: working directory)',
      required: false,
    },
    include: {
      type: 'array',
      description: 'File patterns to include (glob)',
      required: false,
    },
    exclude: {
      type: 'array',
      description: 'File patterns to exclude (glob)',
      required: false,
    },
    maxResults: {
      type: 'number',
      description: 'Maximum number of results to return',
      required: false,
      default: 100,
    },
    contextBefore: {
      type: 'number',
      description: 'Lines of context before match',
      required: false,
      default: 0,
    },
    contextAfter: {
      type: 'number',
      description: 'Lines of context after match',
      required: false,
      default: 0,
    },
  },

  requiresApproval: false,
  riskLevel: 'low',
  timeout: 60000,

  validate: (params: GrepSearchParams) => {
    const result = GrepSearchParamsSchema.safeParse(params);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: true };
  },

  execute: async (
    params: GrepSearchParams,
    context: ToolExecutionContext
  ): Promise<GrepSearchResult> => {
    // Determine search paths
    const searchPaths = params.paths?.map((p) =>
      isAbsolute(p) ? p : resolve(context.workingDirectory, p)
    ) ?? [context.workingDirectory];

    // Try ripgrep first, fall back to grep
    const hasRipgrep = await checkCommand('rg');

    if (hasRipgrep) {
      return executeRipgrep(params, searchPaths, context);
    } else {
      return executeGrep(params, searchPaths, context);
    }
  },
};

/**
 * Check if a command is available
 */
async function checkCommand(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('which', [cmd]);
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

/**
 * Execute search using ripgrep
 */
async function executeRipgrep(
  params: GrepSearchParams,
  searchPaths: string[],
  context: ToolExecutionContext
): Promise<GrepSearchResult> {
  const args: string[] = ['--json'];

  if (!params.isRegex) {
    args.push('--fixed-strings');
  }

  if (params.ignoreCase !== false) {
    args.push('--ignore-case');
  }

  if (params.maxResults) {
    args.push('--max-count', String(params.maxResults));
  }

  if (params.contextBefore) {
    args.push('--before-context', String(params.contextBefore));
  }

  if (params.contextAfter) {
    args.push('--after-context', String(params.contextAfter));
  }

  // Include patterns
  if (params.include) {
    for (const pattern of params.include) {
      args.push('--glob', pattern);
    }
  }

  // Exclude patterns - always exclude common directories
  const defaultExcludes = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
  const excludes = [...defaultExcludes, ...(params.exclude ?? [])];
  for (const pattern of excludes) {
    args.push('--glob', `!${pattern}`);
  }

  args.push(params.pattern);
  args.push(...searchPaths);

  return new Promise((resolve, reject) => {
    const proc = spawn('rg', args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data;
    });
    proc.stderr.on('data', (data) => {
      stderr += data;
    });

    proc.on('close', (code) => {
      // ripgrep returns 1 if no matches found, which is OK
      if (code !== 0 && code !== 1) {
        reject(new Error(`ripgrep failed: ${stderr}`));
        return;
      }

      const matches: GrepMatch[] = [];
      let filesSearched = 0;
      const seenFiles = new Set<string>();

      // Parse JSON output
      const lines = stdout.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);

          if (entry.type === 'match') {
            const data = entry.data;
            const file = data.path?.text ?? '';

            if (!seenFiles.has(file)) {
              seenFiles.add(file);
              filesSearched++;
            }

            matches.push({
              file: relative(context.workingDirectory, file),
              line: data.line_number,
              column: data.submatches?.[0]?.start ?? 1,
              content: data.lines?.text?.trim() ?? '',
            });
          }
        } catch {
          // Skip malformed lines
        }
      }

      resolve({
        matches: matches.slice(0, params.maxResults ?? 100),
        totalMatches: matches.length,
        filesSearched,
        truncated: matches.length > (params.maxResults ?? 100),
      });
    });

    proc.on('error', reject);
  });
}

/**
 * Execute search using grep (fallback)
 */
async function executeGrep(
  params: GrepSearchParams,
  searchPaths: string[],
  context: ToolExecutionContext
): Promise<GrepSearchResult> {
  const args: string[] = ['-rn'];

  if (!params.isRegex) {
    args.push('-F'); // Fixed string
  }

  if (params.ignoreCase !== false) {
    args.push('-i');
  }

  if (params.contextBefore) {
    args.push(`-B${params.contextBefore}`);
  }

  if (params.contextAfter) {
    args.push(`-A${params.contextAfter}`);
  }

  // Include patterns
  if (params.include) {
    for (const pattern of params.include) {
      args.push('--include', pattern);
    }
  }

  // Exclude patterns
  const defaultExcludes = ['node_modules', '.git', 'dist', 'build'];
  const excludes = [...defaultExcludes, ...(params.exclude ?? [])];
  for (const pattern of excludes) {
    args.push('--exclude-dir', pattern);
  }

  args.push(params.pattern);
  args.push(...searchPaths);

  return new Promise((resolve, reject) => {
    const proc = spawn('grep', args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data;
    });
    proc.stderr.on('data', (data) => {
      stderr += data;
    });

    proc.on('close', (code) => {
      // grep returns 1 if no matches, 2+ for errors
      if (code && code > 1) {
        reject(new Error(`grep failed: ${stderr}`));
        return;
      }

      const matches: GrepMatch[] = [];
      const seenFiles = new Set<string>();

      // Parse grep output (file:line:content)
      const lines = stdout.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        const lineMatch = line.match(/^(.+?):(\d+):(.*)$/);
        if (lineMatch) {
          const file = lineMatch[1] as string;
          const lineNum = lineMatch[2] as string;
          const content = lineMatch[3] as string;
          seenFiles.add(file);

          matches.push({
            file: relative(context.workingDirectory, file),
            line: parseInt(lineNum, 10),
            column: 1,
            content: content.trim(),
          });
        }
      }

      resolve({
        matches: matches.slice(0, params.maxResults ?? 100),
        totalMatches: matches.length,
        filesSearched: seenFiles.size,
        truncated: matches.length > (params.maxResults ?? 100),
      });
    });

    proc.on('error', reject);
  });
}

// =============================================================================
// SEMANTIC SEARCH TOOL
// =============================================================================

/**
 * In-memory semantic search implementation
 * This is a simplified version - production would use VectorStore
 */
export const semanticSearchTool: ToolImplementation<SemanticSearchParams, SemanticSearchResult> = {
  name: 'semantic_search',
  description: 'Search for code and content using semantic similarity.',

  parameters: {
    query: {
      type: 'string',
      description: 'The query to search for',
      required: true,
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results',
      required: false,
      default: 10,
    },
    minScore: {
      type: 'number',
      description: 'Minimum similarity score (0-1)',
      required: false,
      default: 0.5,
    },
    fileTypes: {
      type: 'array',
      description: 'Filter by file extensions',
      required: false,
    },
    paths: {
      type: 'array',
      description: 'Filter by paths',
      required: false,
    },
  },

  requiresApproval: false,
  riskLevel: 'low',
  timeout: 30000,

  validate: (params: SemanticSearchParams) => {
    const result = SemanticSearchParamsSchema.safeParse(params);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: true };
  },

  execute: async (
    params: SemanticSearchParams,
    context: ToolExecutionContext
  ): Promise<SemanticSearchResult> => {
    // For now, use keyword-based search as a fallback
    // In production, this would connect to the VectorStore
    const matches: SemanticSearchMatch[] = [];

    // Simple keyword extraction from query
    const keywords = params.query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    // Search files
    const files = await findFiles(context.workingDirectory, params.fileTypes);

    for (const file of files.slice(0, 100)) {
      // Limit files to search
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        // Score based on keyword matches
        let matchCount = 0;
        let matchLines: number[] = [];

        for (let i = 0; i < lines.length; i++) {
          const currentLine = lines[i];
          if (!currentLine) continue;
          const lineLower = currentLine.toLowerCase();
          for (const keyword of keywords) {
            if (lineLower.includes(keyword)) {
              matchCount++;
              matchLines.push(i + 1);
            }
          }
        }

        if (matchCount > 0) {
          const score = Math.min(matchCount / keywords.length / 3, 1);

          if (score >= (params.minScore ?? 0.5)) {
            // Get context around first match
            const firstMatchLine = matchLines[0] ?? 1;
            const startLine = Math.max(1, firstMatchLine - 2);
            const endLine = Math.min(lines.length, firstMatchLine + 10);
            const linesSlice = lines.slice(startLine - 1, endLine);
            const snippet = linesSlice.join('\n');

            matches.push({
              file: relative(context.workingDirectory, file),
              content: snippet,
              score,
              startLine,
              endLine,
            });
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    // Sort by score and limit
    matches.sort((a, b) => b.score - a.score);

    return {
      matches: matches.slice(0, params.limit ?? 10),
    };
  },
};

/**
 * Find files in a directory
 */
async function findFiles(dir: string, extensions?: string[]): Promise<string[]> {
  const files: string[] = [];
  const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__'];

  async function scan(currentDir: string, depth: number): Promise<void> {
    if (depth > 5) return; // Max depth

    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = resolve(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            await scan(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          if (!extensions || extensions.includes(extname(entry.name))) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  await scan(dir, 0);
  return files;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const searchTools = [grepSearchTool, semanticSearchTool];

export default searchTools;
