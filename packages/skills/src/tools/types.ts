/**
 * @tooloo/skills - Tool Execution Types
 * Type definitions for the tool execution layer
 *
 * @version 1.0.0
 * @skill-os true
 */

import { z } from 'zod';

// =============================================================================
// TOOL RESULT TYPES
// =============================================================================

/**
 * Possible tool execution outcomes
 */
export type ToolResultStatus = 'success' | 'error' | 'denied' | 'timeout';

/**
 * Result of a tool execution
 */
export interface ToolResult<T = unknown> {
  /** Whether the tool executed successfully */
  status: ToolResultStatus;

  /** The result data (if successful) */
  data?: T;

  /** Error message (if failed) */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };

  /** Execution metadata */
  meta: {
    /** Tool that was executed */
    toolName: string;

    /** Time taken in milliseconds */
    duration: number;

    /** Timestamp of execution */
    timestamp: number;

    /** Whether result was cached */
    cached?: boolean;
  };
}

// =============================================================================
// EXECUTION CONTEXT
// =============================================================================

/**
 * Context passed to tool executions
 */
export interface ToolExecutionContext {
  /** Current session ID */
  sessionId: string;

  /** User ID (if authenticated) */
  userId?: string;

  /** Skill that's invoking the tool */
  skillId: string;

  /** Working directory for file operations */
  workingDirectory: string;

  /** Whether this is a dry run (no actual changes) */
  dryRun?: boolean;

  /** Approval callback for dangerous operations */
  approvalCallback?: (operation: ApprovalRequest) => Promise<boolean>;

  /** Maximum execution time in ms */
  timeout?: number;

  /** Rate limiting token bucket */
  rateLimitBucket?: string;
}

/**
 * Request for user approval on dangerous operations
 */
export interface ApprovalRequest {
  /** Type of operation */
  operation: 'file_write' | 'file_delete' | 'terminal_execute' | 'http_request';

  /** Human-readable description */
  description: string;

  /** The data being operated on */
  target: string;

  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  /** Preview of changes (if applicable) */
  preview?: string;
}

// =============================================================================
// TOOL IMPLEMENTATION
// =============================================================================

/**
 * Schema for tool parameters
 */
export interface ToolParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
  properties?: Record<string, ToolParameterSchema>;
  items?: ToolParameterSchema;
}

/**
 * Tool implementation interface
 */
export interface ToolImplementation<TParams = unknown, TResult = unknown> {
  /** Unique tool name */
  name: string;

  /** Human-readable description */
  description: string;

  /** Parameter schema for validation */
  parameters: Record<string, ToolParameterSchema>;

  /** Whether this tool requires approval */
  requiresApproval: boolean;

  /** Risk level of this tool */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  /** Default timeout in milliseconds */
  timeout: number;

  /** Execute the tool */
  execute: (params: TParams, context: ToolExecutionContext) => Promise<TResult>;

  /** Validate parameters before execution */
  validate?: (params: TParams) => { valid: boolean; errors?: string[] };

  /** Optional cleanup function */
  cleanup?: () => Promise<void>;
}

// =============================================================================
// SAFETY & AUDIT
// =============================================================================

/**
 * Safety check result
 */
export interface SafetyCheckResult {
  /** Whether the operation is allowed */
  allowed: boolean;

  /** Reason for denial (if not allowed) */
  reason?: string;

  /** Warnings (even if allowed) */
  warnings?: string[];

  /** Whether approval is needed */
  requiresApproval?: boolean;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  /** Unique entry ID */
  id: string;

  /** Timestamp */
  timestamp: number;

  /** Tool that was executed */
  toolName: string;

  /** Parameters passed */
  params: unknown;

  /** Execution context */
  context: {
    sessionId: string;
    userId?: string;
    skillId: string;
  };

  /** Result of execution */
  result: {
    status: ToolResultStatus;
    data?: unknown;
    error?: unknown;
    duration: number;
  };

  /** Safety check result */
  safetyCheck?: SafetyCheckResult;

  /** Whether approval was granted */
  approved?: boolean;
}

// =============================================================================
// FILE TOOL TYPES
// =============================================================================

/**
 * File read parameters
 */
export interface FileReadParams {
  /** Path to the file (absolute or relative to workingDirectory) */
  path: string;

  /** Start line (1-based, optional) */
  startLine?: number;

  /** End line (1-based, optional) */
  endLine?: number;

  /** Encoding (default: utf-8) */
  encoding?: BufferEncoding;
}

/**
 * File read result
 */
export interface FileReadResult {
  /** File content */
  content: string;

  /** Total number of lines */
  totalLines: number;

  /** Lines returned (start-end) */
  linesReturned: { start: number; end: number };

  /** File size in bytes */
  size: number;

  /** File path (resolved) */
  path: string;
}

/**
 * File write parameters
 */
export interface FileWriteParams {
  /** Path to the file */
  path: string;

  /** Content to write */
  content: string;

  /** Create backup before writing */
  backup?: boolean;

  /** Create directories if they don't exist */
  createDirs?: boolean;

  /** Encoding (default: utf-8) */
  encoding?: BufferEncoding;
}

/**
 * File write result
 */
export interface FileWriteResult {
  /** Whether write was successful */
  success: boolean;

  /** File path (resolved) */
  path: string;

  /** Backup path (if backup was created) */
  backupPath?: string;

  /** Bytes written */
  bytesWritten: number;
}

// =============================================================================
// SEARCH TOOL TYPES
// =============================================================================

/**
 * Grep search parameters
 */
export interface GrepSearchParams {
  /** Pattern to search for */
  pattern: string;

  /** Whether pattern is regex */
  isRegex?: boolean;

  /** Case insensitive search */
  ignoreCase?: boolean;

  /** Paths to search in (default: workingDirectory) */
  paths?: string[];

  /** File patterns to include (glob) */
  include?: string[];

  /** File patterns to exclude (glob) */
  exclude?: string[];

  /** Maximum results to return */
  maxResults?: number;

  /** Lines of context before match */
  contextBefore?: number;

  /** Lines of context after match */
  contextAfter?: number;
}

/**
 * Grep search match
 */
export interface GrepMatch {
  /** File path */
  file: string;

  /** Line number (1-based) */
  line: number;

  /** Column number (1-based) */
  column: number;

  /** The matched line content */
  content: string;

  /** Context lines before */
  before?: string[];

  /** Context lines after */
  after?: string[];
}

/**
 * Grep search result
 */
export interface GrepSearchResult {
  /** Matches found */
  matches: GrepMatch[];

  /** Total matches (may be more than returned if limited) */
  totalMatches: number;

  /** Files searched */
  filesSearched: number;

  /** Whether results were truncated */
  truncated: boolean;
}

/**
 * Semantic search parameters
 */
export interface SemanticSearchParams {
  /** Query string */
  query: string;

  /** Maximum results */
  limit?: number;

  /** Minimum similarity score (0-1) */
  minScore?: number;

  /** Filter by file types */
  fileTypes?: string[];

  /** Filter by paths */
  paths?: string[];
}

/**
 * Semantic search result item
 */
export interface SemanticSearchMatch {
  /** File path */
  file: string;

  /** Content chunk that matched */
  content: string;

  /** Similarity score (0-1) */
  score: number;

  /** Start line of the chunk */
  startLine: number;

  /** End line of the chunk */
  endLine: number;
}

/**
 * Semantic search result
 */
export interface SemanticSearchResult {
  /** Matches found */
  matches: SemanticSearchMatch[];

  /** Query embedding used */
  queryEmbedding?: number[];
}

// =============================================================================
// TERMINAL TOOL TYPES
// =============================================================================

/**
 * Terminal execute parameters
 */
export interface TerminalExecuteParams {
  /** Command to execute */
  command: string;

  /** Working directory for command */
  cwd?: string;

  /** Environment variables */
  env?: Record<string, string>;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Whether to run in background */
  background?: boolean;
}

/**
 * Terminal execute result
 */
export interface TerminalExecuteResult {
  /** Exit code */
  exitCode: number;

  /** Standard output */
  stdout: string;

  /** Standard error */
  stderr: string;

  /** Whether command timed out */
  timedOut: boolean;

  /** Duration in milliseconds */
  duration: number;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const FileReadParamsSchema = z.object({
  path: z.string().min(1),
  startLine: z.number().int().min(1).optional(),
  endLine: z.number().int().min(1).optional(),
  encoding: z.string().optional(),
});

export const FileWriteParamsSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  backup: z.boolean().optional(),
  createDirs: z.boolean().optional(),
  encoding: z.string().optional(),
});

export const GrepSearchParamsSchema = z.object({
  pattern: z.string().min(1),
  isRegex: z.boolean().optional(),
  ignoreCase: z.boolean().optional(),
  paths: z.array(z.string()).optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  maxResults: z.number().int().min(1).max(1000).optional(),
  contextBefore: z.number().int().min(0).max(10).optional(),
  contextAfter: z.number().int().min(0).max(10).optional(),
});

export const SemanticSearchParamsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
  minScore: z.number().min(0).max(1).optional(),
  fileTypes: z.array(z.string()).optional(),
  paths: z.array(z.string()).optional(),
});

export const TerminalExecuteParamsSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.unknown()).optional(),
  timeout: z.number().int().min(100).max(300000).optional(),
  background: z.boolean().optional(),
});
