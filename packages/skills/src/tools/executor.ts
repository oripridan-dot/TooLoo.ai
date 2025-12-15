/**
 * @tooloo/skills - Tool Executor Service
 * The central service for executing tools from skills
 *
 * @version 1.0.0
 * @skill-os true
 */

import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import type {
  ToolResult,
  ToolResultStatus,
  ToolExecutionContext,
  ToolImplementation,
  SafetyCheckResult,
  AuditLogEntry,
  ApprovalRequest,
} from './types.js';

// =============================================================================
// TOOL EXECUTOR CLASS
// =============================================================================

/**
 * Configuration for the ToolExecutor
 */
export interface ToolExecutorConfig {
  /** Default timeout for tool execution (ms) */
  defaultTimeout: number;

  /** Whether to require approval for dangerous operations */
  requireApproval: boolean;

  /** Paths that are allowed for file operations */
  allowedPaths: string[];

  /** Paths that are denied for file operations */
  deniedPaths: string[];

  /** Maximum file size for read/write (bytes) */
  maxFileSize: number;

  /** Whether to log all executions */
  auditLogging: boolean;

  /** Audit log file path */
  auditLogPath?: string;

  /** Rate limit per minute */
  rateLimitPerMinute: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ToolExecutorConfig = {
  defaultTimeout: 30000,
  requireApproval: true,
  allowedPaths: ['/workspaces', '/tmp'],
  deniedPaths: ['/etc', '/var', '/usr', '/bin', '/sbin', '/root', '/.'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  auditLogging: true,
  auditLogPath: 'data/tool-audit.jsonl',
  rateLimitPerMinute: 100,
};

/**
 * ToolExecutor - Central service for executing skill tools
 */
export class ToolExecutor extends EventEmitter {
  private tools: Map<string, ToolImplementation> = new Map();
  private config: ToolExecutorConfig;
  private auditLog: AuditLogEntry[] = [];
  private rateLimitCounters: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(config: Partial<ToolExecutorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Tool Registration
  // ---------------------------------------------------------------------------

  /**
   * Register a tool implementation
   */
  register<TParams, TResult>(tool: ToolImplementation<TParams, TResult>): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolExecutor] Tool ${tool.name} already registered, overwriting`);
    }

    this.tools.set(tool.name, tool as ToolImplementation);
    this.emit('tool:registered', { name: tool.name });
    console.log(`[ToolExecutor] ✅ Registered tool: ${tool.name}`);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    const existed = this.tools.delete(name);
    if (existed) {
      this.emit('tool:unregistered', { name });
    }
    return existed;
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): ToolImplementation | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools
   */
  listTools(): Array<{ name: string; description: string; riskLevel: string }> {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      riskLevel: t.riskLevel,
    }));
  }

  // ---------------------------------------------------------------------------
  // Tool Execution
  // ---------------------------------------------------------------------------

  /**
   * Execute a tool with the given parameters
   */
  async execute<TResult = unknown>(
    toolName: string,
    params: unknown,
    context: ToolExecutionContext
  ): Promise<ToolResult<TResult>> {
    const startTime = Date.now();

    // 1. Find the tool
    const tool = this.tools.get(toolName);
    if (!tool) {
      return this.buildErrorResult<TResult>(
        toolName,
        startTime,
        'TOOL_NOT_FOUND',
        `Tool not found: ${toolName}`
      );
    }

    // 2. Rate limit check
    const rateLimitResult = this.checkRateLimit(context.rateLimitBucket ?? context.sessionId);
    if (!rateLimitResult.allowed) {
      return this.buildErrorResult<TResult>(
        toolName,
        startTime,
        'RATE_LIMITED',
        rateLimitResult.reason ?? 'Rate limit exceeded'
      );
    }

    // 3. Validate parameters
    if (tool.validate) {
      const validation = tool.validate(params);
      if (!validation.valid) {
        return this.buildErrorResult<TResult>(
          toolName,
          startTime,
          'VALIDATION_ERROR',
          `Parameter validation failed: ${validation.errors?.join(', ')}`
        );
      }
    }

    // 4. Safety checks
    const safetyResult = await this.performSafetyCheck(tool, params, context);
    if (!safetyResult.allowed) {
      this.logAudit(
        toolName,
        params,
        context,
        {
          status: 'denied',
          duration: Date.now() - startTime,
        },
        safetyResult
      );

      return this.buildErrorResult<TResult>(
        toolName,
        startTime,
        'SAFETY_DENIED',
        safetyResult.reason ?? 'Operation denied by safety check'
      );
    }

    // 5. Approval check (if required)
    if (safetyResult.requiresApproval && this.config.requireApproval) {
      const approved = await this.requestApproval(tool, params, context);
      if (!approved) {
        this.logAudit(
          toolName,
          params,
          context,
          {
            status: 'denied',
            duration: Date.now() - startTime,
          },
          safetyResult,
          false
        );

        return this.buildErrorResult<TResult>(
          toolName,
          startTime,
          'APPROVAL_DENIED',
          'Operation requires approval'
        );
      }
    }

    // 6. Execute with timeout
    try {
      const timeout = context.timeout ?? tool.timeout ?? this.config.defaultTimeout;
      const result = await this.executeWithTimeout(tool.execute(params, context), timeout);

      const duration = Date.now() - startTime;

      this.logAudit(
        toolName,
        params,
        context,
        {
          status: 'success',
          data: result,
          duration,
        },
        safetyResult,
        true
      );

      this.emit('tool:executed', { toolName, params, result, duration });

      return {
        status: 'success',
        data: result as TResult,
        meta: {
          toolName,
          duration,
          timestamp: startTime,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const isTimeout = error instanceof TimeoutError;

      this.logAudit(
        toolName,
        params,
        context,
        {
          status: isTimeout ? 'timeout' : 'error',
          error,
          duration,
        },
        safetyResult
      );

      this.emit('tool:error', { toolName, params, error });

      return {
        status: isTimeout ? 'timeout' : 'error',
        error: {
          code: isTimeout ? 'TIMEOUT' : 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof Error ? error.stack : error,
        },
        meta: {
          toolName,
          duration,
          timestamp: startTime,
        },
      };
    }
  }

  /**
   * Execute multiple tools in sequence
   */
  async executeSequence(
    tools: Array<{ name: string; params: unknown }>,
    context: ToolExecutionContext
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const { name, params } of tools) {
      const result = await this.execute(name, params, context);
      results.push(result);

      // Stop on first error
      if (result.status !== 'success') {
        break;
      }
    }

    return results;
  }

  /**
   * Execute multiple tools in parallel
   */
  async executeParallel(
    tools: Array<{ name: string; params: unknown }>,
    context: ToolExecutionContext
  ): Promise<ToolResult[]> {
    return Promise.all(tools.map(({ name, params }) => this.execute(name, params, context)));
  }

  // ---------------------------------------------------------------------------
  // Safety & Validation
  // ---------------------------------------------------------------------------

  /**
   * Perform safety checks on the tool execution
   */
  private async performSafetyCheck(
    tool: ToolImplementation,
    params: unknown,
    context: ToolExecutionContext
  ): Promise<SafetyCheckResult> {
    const warnings: string[] = [];

    // Check if dry run
    if (context.dryRun) {
      return { allowed: true, warnings: ['Dry run mode - no actual changes will be made'] };
    }

    // Path validation for file operations
    if (tool.name.startsWith('file_') || tool.name === 'grep_search') {
      const pathResult = this.validatePaths(params);
      if (!pathResult.allowed) {
        return pathResult;
      }
      if (pathResult.warnings) {
        warnings.push(...pathResult.warnings);
      }
    }

    // Terminal command validation
    if (tool.name === 'terminal_execute') {
      const cmdResult = this.validateCommand(params);
      if (!cmdResult.allowed) {
        return cmdResult;
      }
      if (cmdResult.warnings) {
        warnings.push(...cmdResult.warnings);
      }
    }

    // Check if approval is required based on risk level
    const requiresApproval =
      tool.requiresApproval || tool.riskLevel === 'high' || tool.riskLevel === 'critical';

    return {
      allowed: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      requiresApproval,
    };
  }

  /**
   * Validate file paths against allowed/denied lists
   */
  private validatePaths(params: unknown): SafetyCheckResult {
    const paramsObj = params as Record<string, unknown>;
    const pathParam = paramsObj?.['path'] || paramsObj?.['paths'];
    const paths = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : [];

    for (const path of paths) {
      if (typeof path !== 'string') continue;

      // Normalize path
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;

      // Check denied paths
      for (const denied of this.config.deniedPaths) {
        if (normalizedPath.startsWith(denied) || normalizedPath.includes('..')) {
          return {
            allowed: false,
            reason: `Path "${path}" is not allowed (denied path: ${denied})`,
          };
        }
      }

      // Check allowed paths
      const isAllowed = this.config.allowedPaths.some((allowed) =>
        normalizedPath.startsWith(allowed)
      );
      if (!isAllowed && this.config.allowedPaths.length > 0) {
        return {
          allowed: false,
          reason: `Path "${path}" is outside allowed directories`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Validate terminal commands for dangerous operations
   */
  private validateCommand(params: unknown): SafetyCheckResult {
    const paramsObj = params as Record<string, unknown>;
    const command = paramsObj?.['command'] as string;
    if (!command) {
      return { allowed: false, reason: 'No command provided' };
    }

    // Dangerous command patterns
    const dangerousPatterns = [
      /rm\s+-rf\s+\/(?!\s|$)/i, // rm -rf /
      /pkill\s+-f\s+["']?node["']?/i, // pkill -f node (dangerous in Codespaces)
      /killall\s+node/i, // killall node
      />\s*\/etc\//i, // Writing to /etc
      /chmod\s+777/i, // Overly permissive chmod
      /curl.*\|\s*(?:ba)?sh/i, // Piping curl to shell
      /wget.*\|\s*(?:ba)?sh/i, // Piping wget to shell
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          allowed: false,
          reason: `Command contains dangerous pattern: ${pattern.source}`,
        };
      }
    }

    // Warn about potentially risky commands
    const warnings: string[] = [];
    if (/rm\s/.test(command)) {
      warnings.push('Command includes file deletion');
    }
    if (/sudo\s/.test(command)) {
      warnings.push('Command includes sudo');
    }
    if (/git\s+push/.test(command)) {
      warnings.push('Command pushes to git remote');
    }

    return {
      allowed: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      requiresApproval: warnings.length > 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Approval Workflow
  // ---------------------------------------------------------------------------

  /**
   * Request approval for a dangerous operation
   */
  private async requestApproval(
    tool: ToolImplementation,
    params: unknown,
    context: ToolExecutionContext
  ): Promise<boolean> {
    // If no approval callback, auto-deny dangerous operations
    if (!context.approvalCallback) {
      console.warn(`[ToolExecutor] No approval callback for ${tool.name}, denying operation`);
      return false;
    }

    const request: ApprovalRequest = {
      operation: tool.name as ApprovalRequest['operation'],
      description: `${tool.description} with params: ${JSON.stringify(params).slice(0, 200)}`,
      target: this.getOperationTarget(params),
      riskLevel: tool.riskLevel,
      preview: this.getOperationPreview(tool, params),
    };

    try {
      return await context.approvalCallback(request);
    } catch (error) {
      console.error('[ToolExecutor] Approval callback failed:', error);
      return false;
    }
  }

  /**
   * Get the target of an operation for approval display
   */
  private getOperationTarget(params: unknown): string {
    const p = params as Record<string, unknown>;
    return (p['path'] || p['command'] || p['query'] || JSON.stringify(params).slice(0, 100)) as string;
  }

  /**
   * Get a preview of what the operation will do
   */
  private getOperationPreview(tool: ToolImplementation, params: unknown): string | undefined {
    const p = params as Record<string, unknown>;

    if (tool.name === 'file_write' && p['content']) {
      const content = p['content'] as string;
      return content.length > 500 ? content.slice(0, 500) + '...' : content;
    }

    if (tool.name === 'terminal_execute' && p['command']) {
      return p['command'] as string;
    }

    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Rate Limiting
  // ---------------------------------------------------------------------------

  /**
   * Check rate limit for a bucket
   */
  private checkRateLimit(bucket: string): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const counter = this.rateLimitCounters.get(bucket);

    if (!counter || counter.resetAt < now) {
      // Reset or create counter
      this.rateLimitCounters.set(bucket, {
        count: 1,
        resetAt: now + 60000, // 1 minute
      });
      return { allowed: true };
    }

    if (counter.count >= this.config.rateLimitPerMinute) {
      return {
        allowed: false,
        reason: `Rate limit exceeded (${this.config.rateLimitPerMinute}/minute)`,
      };
    }

    counter.count++;
    return { allowed: true };
  }

  // ---------------------------------------------------------------------------
  // Timeout Management
  // ---------------------------------------------------------------------------

  /**
   * Execute a promise with a timeout
   */
  private executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError(`Tool execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // ---------------------------------------------------------------------------
  // Audit Logging
  // ---------------------------------------------------------------------------

  /**
   * Log an execution to the audit log
   */
  private logAudit(
    toolName: string,
    params: unknown,
    context: ToolExecutionContext,
    result: { status: ToolResultStatus; data?: unknown; error?: unknown; duration: number },
    safetyCheck?: SafetyCheckResult,
    approved?: boolean
  ): void {
    if (!this.config.auditLogging) return;

    const entry: AuditLogEntry = {
      id: uuid(),
      timestamp: Date.now(),
      toolName,
      params,
      context: {
        sessionId: context.sessionId,
        userId: context.userId,
        skillId: context.skillId,
      },
      result,
      safetyCheck,
      approved,
    };

    this.auditLog.push(entry);
    this.emit('audit:entry', entry);

    // Keep only last 1000 entries in memory
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * Get audit log entries
   */
  getAuditLog(options?: {
    toolName?: string;
    sessionId?: string;
    since?: number;
    limit?: number;
  }): AuditLogEntry[] {
    let entries = [...this.auditLog];

    if (options?.toolName) {
      entries = entries.filter((e) => e.toolName === options.toolName);
    }
    if (options?.sessionId) {
      entries = entries.filter((e) => e.context.sessionId === options.sessionId);
    }
    if (options?.since !== undefined) {
      const since = options.since;
      entries = entries.filter((e) => e.timestamp >= since);
    }
    if (options?.limit) {
      entries = entries.slice(-options.limit);
    }

    return entries;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Build an error result
   */
  private buildErrorResult<TResult = unknown>(
    toolName: string,
    startTime: number,
    code: string,
    message: string
  ): ToolResult<TResult> {
    return {
      status: 'error',
      error: { code, message },
      meta: {
        toolName,
        duration: Date.now() - startTime,
        timestamp: startTime,
      },
    };
  }

  /**
   * Get executor statistics
   */
  getStats(): {
    registeredTools: number;
    auditLogSize: number;
    rateLimitBuckets: number;
  } {
    return {
      registeredTools: this.tools.size,
      auditLogSize: this.auditLog.length,
      rateLimitBuckets: this.rateLimitCounters.size,
    };
  }

  /**
   * Shutdown the executor
   */
  async shutdown(): Promise<void> {
    // Cleanup all tools
    for (const tool of this.tools.values()) {
      if (tool.cleanup) {
        try {
          await tool.cleanup();
        } catch (error) {
          console.error(`[ToolExecutor] Error cleaning up tool ${tool.name}:`, error);
        }
      }
    }

    this.tools.clear();
    this.rateLimitCounters.clear();
  }
}

// =============================================================================
// TIMEOUT ERROR
// =============================================================================

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// =============================================================================
// SINGLETON & FACTORY
// =============================================================================

let executorInstance: ToolExecutor | null = null;

/**
 * Get the singleton ToolExecutor instance
 */
export function getToolExecutor(config?: Partial<ToolExecutorConfig>): ToolExecutor {
  if (!executorInstance) {
    executorInstance = new ToolExecutor(config);
  }
  return executorInstance;
}

/**
 * Create a new ToolExecutor instance (for testing)
 */
export function createToolExecutor(config?: Partial<ToolExecutorConfig>): ToolExecutor {
  return new ToolExecutor(config);
}

export default ToolExecutor;
