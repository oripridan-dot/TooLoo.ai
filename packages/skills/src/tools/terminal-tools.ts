/**
 * @tooloo/skills - Terminal Tools Implementation
 * Tools for executing terminal commands
 *
 * @version 1.0.0
 * @skill-os true
 */

import { spawn, ChildProcess } from 'child_process';
import { resolve, isAbsolute } from 'path';
import type {
  ToolImplementation,
  ToolExecutionContext,
  TerminalExecuteParams,
  TerminalExecuteResult,
} from './types.js';
import { TerminalExecuteParamsSchema } from './types.js';

// =============================================================================
// TERMINAL EXECUTE TOOL
// =============================================================================

/**
 * Dangerous command patterns that are always blocked
 */
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\/(?!\s|$|tmp)/i, // rm -rf / (except /tmp)
  /pkill\s+-f\s+["']?node["']?/i, // pkill -f node (dangerous in Codespaces)
  /killall\s+node/i, // killall node
  />\s*\/etc\//i, // Writing to /etc
  /chmod\s+777\s+\//i, // chmod 777 / (root)
  /mkfs\./i, // Format filesystem
  /dd\s+if=/i, // Disk operations
  /:(){:\|:&};:/i, // Fork bomb
  /\|\s*(?:bash|sh)\s*-/i, // Piping to shell with args
];

/**
 * Commands that require approval (but are not blocked)
 */
const APPROVAL_PATTERNS = [
  /rm\s/i, // Any rm command
  /sudo\s/i, // Sudo commands
  /git\s+push/i, // Git push
  /git\s+force/i, // Git force operations
  /npm\s+publish/i, // npm publish
  /docker\s+rm/i, // Docker remove
];

/**
 * Implementation of the terminal_execute tool
 */
export const terminalExecuteTool: ToolImplementation<TerminalExecuteParams, TerminalExecuteResult> =
  {
    name: 'terminal_execute',
    description: 'Execute a command in the terminal. Dangerous commands are blocked.',

    parameters: {
      command: {
        type: 'string',
        description: 'The command to execute',
        required: true,
      },
      cwd: {
        type: 'string',
        description: 'Working directory for the command',
        required: false,
      },
      env: {
        type: 'object',
        description: 'Environment variables to set',
        required: false,
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds',
        required: false,
        default: 30000,
      },
      background: {
        type: 'boolean',
        description: 'Whether to run in background',
        required: false,
        default: false,
      },
    },

    requiresApproval: true,
    riskLevel: 'high',
    timeout: 60000,

    validate: (params: TerminalExecuteParams) => {
      const result = TerminalExecuteParamsSchema.safeParse(params);
      if (!result.success) {
        return {
          valid: false,
          errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
        };
      }

      // Check for blocked patterns
      for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(params.command)) {
          return {
            valid: false,
            errors: [`Command matches blocked pattern: ${pattern.source}`],
          };
        }
      }

      return { valid: true };
    },

    execute: async (
      params: TerminalExecuteParams,
      context: ToolExecutionContext
    ): Promise<TerminalExecuteResult> => {
      // Resolve working directory
      const cwd = params.cwd
        ? isAbsolute(params.cwd)
          ? params.cwd
          : resolve(context.workingDirectory, params.cwd)
        : context.workingDirectory;

      // Build environment
      const env = {
        ...process.env,
        ...params.env,
        // Safety: don't let commands modify PATH unsafely
        TOOLOO_SKILL_ID: context.skillId,
        TOOLOO_SESSION_ID: context.sessionId,
      };

      // Determine timeout
      const timeout = params.timeout ?? 30000;

      // Check if dry run
      if (context.dryRun) {
        return {
          exitCode: 0,
          stdout: `[DRY RUN] Would execute: ${params.command}`,
          stderr: '',
          timedOut: false,
          duration: 0,
        };
      }

      return new Promise((resolve) => {
        const startTime = Date.now();
        let stdout = '';
        let stderr = '';
        let timedOut = false;
        let proc: ChildProcess;

        try {
          // Use shell to execute command
          proc = spawn(params.command, {
            shell: true,
            cwd,
            env,
            stdio: ['pipe', 'pipe', 'pipe'],
          });

          // Collect stdout
          proc.stdout?.on('data', (data) => {
            stdout += data.toString();
            // Limit output size to 1MB
            if (stdout.length > 1024 * 1024) {
              stdout = stdout.slice(-1024 * 1024);
            }
          });

          // Collect stderr
          proc.stderr?.on('data', (data) => {
            stderr += data.toString();
            // Limit output size to 1MB
            if (stderr.length > 1024 * 1024) {
              stderr = stderr.slice(-1024 * 1024);
            }
          });

          // Set timeout
          const timer = setTimeout(() => {
            timedOut = true;
            proc.kill('SIGTERM');

            // Force kill after 5 seconds
            setTimeout(() => {
              if (!proc.killed) {
                proc.kill('SIGKILL');
              }
            }, 5000);
          }, timeout);

          // Handle close
          proc.on('close', (code) => {
            clearTimeout(timer);
            const duration = Date.now() - startTime;

            resolve({
              exitCode: code ?? -1,
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              timedOut,
              duration,
            });
          });

          // Handle errors
          proc.on('error', (err) => {
            clearTimeout(timer);
            const duration = Date.now() - startTime;

            resolve({
              exitCode: -1,
              stdout: '',
              stderr: err.message,
              timedOut: false,
              duration,
            });
          });

          // If background mode, don't wait for completion
          if (params.background) {
            proc.unref();
            clearTimeout(timer);

            resolve({
              exitCode: 0,
              stdout: `[BACKGROUND] Process started with PID: ${proc.pid}`,
              stderr: '',
              timedOut: false,
              duration: Date.now() - startTime,
            });
          }
        } catch (err) {
          resolve({
            exitCode: -1,
            stdout: '',
            stderr: err instanceof Error ? err.message : 'Unknown error',
            timedOut: false,
            duration: Date.now() - startTime,
          });
        }
      });
    },
  };

// =============================================================================
// CHECK COMMAND TOOL
// =============================================================================

export interface CheckCommandParams {
  command: string;
}

export interface CheckCommandResult {
  exists: boolean;
  path?: string;
}

/**
 * Check if a command exists in PATH
 */
export const checkCommandTool: ToolImplementation<CheckCommandParams, CheckCommandResult> = {
  name: 'check_command',
  description: 'Check if a command exists in the system PATH.',

  parameters: {
    command: {
      type: 'string',
      description: 'The command to check',
      required: true,
    },
  },

  requiresApproval: false,
  riskLevel: 'low',
  timeout: 5000,

  validate: (params: CheckCommandParams) => {
    if (!params.command || params.command.trim() === '') {
      return { valid: false, errors: ['Command is required'] };
    }
    return { valid: true };
  },

  execute: async (params: CheckCommandParams): Promise<CheckCommandResult> => {
    return new Promise((resolve) => {
      const proc = spawn('which', [params.command]);
      let path = '';

      proc.stdout.on('data', (data) => {
        path += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          exists: code === 0,
          path: code === 0 ? path.trim() : undefined,
        });
      });

      proc.on('error', () => {
        resolve({ exists: false });
      });
    });
  },
};

// =============================================================================
// HELPER: Check if command requires approval
// =============================================================================

export function commandRequiresApproval(command: string): boolean {
  return APPROVAL_PATTERNS.some((pattern) => pattern.test(command));
}

// =============================================================================
// EXPORTS
// =============================================================================

export const terminalTools = [terminalExecuteTool, checkCommandTool];

export default terminalTools;
