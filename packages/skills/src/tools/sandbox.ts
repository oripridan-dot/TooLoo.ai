/**
 * @tooloo/skills - Docker Sandbox Executor
 * Secure isolated code execution using Docker containers
 *
 * @version 1.0.0
 * @skill-os true
 *
 * Provides safe code execution in isolated Docker containers with:
 * - Resource limits (CPU, memory, time)
 * - Network isolation
 * - Filesystem isolation
 * - Support for multiple languages (Node.js, Python, Bash)
 */

import { spawn, execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type {
  ToolImplementation,
  ToolExecutionContext,
} from './types.js';
import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported languages for sandbox execution
 */
export type SandboxLanguage = 'javascript' | 'typescript' | 'python' | 'bash';

/**
 * Execution mode determines resource limits
 */
export type ExecutionMode = 'quick' | 'standard' | 'extended';

/**
 * Parameters for sandbox execution
 */
export interface SandboxExecuteParams {
  /** Code to execute */
  code: string;
  /** Programming language */
  language: SandboxLanguage;
  /** Execution mode (affects resource limits) */
  mode?: ExecutionMode;
  /** Optional stdin input */
  stdin?: string;
  /** Additional files to mount (name -> content) */
  files?: Record<string, string>;
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * Result of sandbox execution
 */
export interface SandboxExecuteResult {
  /** Exit code from the process */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Whether execution timed out */
  timedOut: boolean;
  /** Whether execution hit memory limit */
  oomKilled: boolean;
  /** Execution duration in ms */
  duration: number;
  /** Container ID (for debugging) */
  containerId?: string;
  /** Memory usage in bytes */
  memoryUsed?: number;
}

/**
 * Zod schema for validation
 */
export const SandboxExecuteParamsSchema = z.object({
  code: z.string().min(1).max(100000), // Max 100KB of code
  language: z.enum(['javascript', 'typescript', 'python', 'bash']),
  mode: z.enum(['quick', 'standard', 'extended']).optional().default('quick'),
  stdin: z.string().max(10000).optional(),
  files: z.record(z.string().max(50000)).optional(),
  env: z.record(z.string().max(1000)).optional(),
});

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Resource limits by execution mode
 */
const MODE_LIMITS: Record<ExecutionMode, {
  timeout: number;     // ms
  memory: string;      // Docker memory limit
  cpus: string;        // Docker CPU limit
  pidsLimit: number;   // Max processes
}> = {
  quick: {
    timeout: 5000,
    memory: '128m',
    cpus: '0.5',
    pidsLimit: 50,
  },
  standard: {
    timeout: 30000,
    memory: '512m',
    cpus: '1',
    pidsLimit: 100,
  },
  extended: {
    timeout: 120000,
    memory: '1g',
    cpus: '2',
    pidsLimit: 200,
  },
};

/**
 * Docker images by language
 */
const LANGUAGE_IMAGES: Record<SandboxLanguage, string> = {
  javascript: 'node:20-alpine',
  typescript: 'node:20-alpine',
  python: 'python:3.11-alpine',
  bash: 'alpine:3.19',
};

/**
 * File extensions by language
 */
const LANGUAGE_EXTENSIONS: Record<SandboxLanguage, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  bash: 'sh',
};

/**
 * Command templates by language
 */
const LANGUAGE_COMMANDS: Record<SandboxLanguage, (filename: string) => string> = {
  javascript: (f) => `node /sandbox/${f}`,
  typescript: (f) => `npx tsx /sandbox/${f}`,
  python: (f) => `python /sandbox/${f}`,
  bash: (f) => `sh /sandbox/${f}`,
};

// =============================================================================
// DOCKER SANDBOX EXECUTOR
// =============================================================================

/**
 * Check if Docker is available
 */
function isDockerAvailable(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Pull Docker image if not present
 */
async function ensureImage(image: string): Promise<void> {
  try {
    execSync(`docker image inspect ${image}`, { stdio: 'ignore' });
  } catch {
    console.log(`[Sandbox] Pulling image: ${image}`);
    execSync(`docker pull ${image}`, { stdio: 'inherit' });
  }
}

/**
 * Execute code in a Docker sandbox
 */
async function executeSandbox(
  params: SandboxExecuteParams,
  context: ToolExecutionContext
): Promise<SandboxExecuteResult> {
  const startTime = Date.now();
  const executionId = randomUUID().slice(0, 8);
  const mode = params.mode || 'quick';
  const limits = MODE_LIMITS[mode];
  const image = LANGUAGE_IMAGES[params.language];
  const ext = LANGUAGE_EXTENSIONS[params.language];
  const mainFile = `main.${ext}`;

  // Create temporary directory for sandbox files
  const sandboxDir = join('/tmp', `tooloo-sandbox-${executionId}`);
  mkdirSync(sandboxDir, { recursive: true });

  let containerId: string | undefined;
  let result: SandboxExecuteResult;

  try {
    // Ensure Docker image is available
    await ensureImage(image);

    // Write main code file
    writeFileSync(join(sandboxDir, mainFile), params.code);

    // Write additional files
    if (params.files) {
      for (const [name, content] of Object.entries(params.files)) {
        // Security: prevent path traversal
        const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
        writeFileSync(join(sandboxDir, safeName), content);
      }
    }

    // Build docker run command
    const dockerArgs: string[] = [
      'run',
      '--rm',                           // Remove container after exit
      '--network=none',                 // No network access
      '--read-only',                    // Read-only root filesystem
      `--memory=${limits.memory}`,      // Memory limit
      `--cpus=${limits.cpus}`,          // CPU limit
      `--pids-limit=${limits.pidsLimit}`, // Process limit
      '--security-opt=no-new-privileges', // No privilege escalation
      '-v', `${sandboxDir}:/sandbox:ro`, // Mount code read-only
      '-w', '/sandbox',                 // Working directory
    ];

    // Add environment variables
    if (params.env) {
      for (const [key, value] of Object.entries(params.env)) {
        // Security: sanitize env var names
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
        dockerArgs.push('-e', `${safeKey}=${value}`);
      }
    }

    // Add image and command
    dockerArgs.push(image);
    dockerArgs.push('sh', '-c', LANGUAGE_COMMANDS[params.language](mainFile));

    // Execute in Docker
    result = await new Promise<SandboxExecuteResult>((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let oomKilled = false;

      const proc = spawn('docker', dockerArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Send stdin if provided
      if (params.stdin) {
        proc.stdin?.write(params.stdin);
        proc.stdin?.end();
      } else {
        proc.stdin?.end();
      }

      // Collect stdout
      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
        // Limit to 1MB
        if (stdout.length > 1024 * 1024) {
          stdout = stdout.slice(-1024 * 1024);
        }
      });

      // Collect stderr
      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > 1024 * 1024) {
          stderr = stderr.slice(-1024 * 1024);
        }
      });

      // Timeout
      const timer = setTimeout(() => {
        timedOut = true;
        // Kill the docker process (container will be cleaned up by --rm)
        proc.kill('SIGTERM');
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 5000);
      }, limits.timeout);

      proc.on('close', (code) => {
        clearTimeout(timer);
        const duration = Date.now() - startTime;

        // Check for OOM kill (exit code 137 often indicates OOM)
        if (code === 137) {
          oomKilled = true;
        }

        resolve({
          exitCode: code ?? -1,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          timedOut,
          oomKilled,
          duration,
          containerId,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          exitCode: -1,
          stdout: '',
          stderr: err.message,
          timedOut: false,
          oomKilled: false,
          duration: Date.now() - startTime,
        });
      });
    });
  } finally {
    // Cleanup sandbox directory
    try {
      if (existsSync(sandboxDir)) {
        rmSync(sandboxDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn(`[Sandbox] Failed to cleanup ${sandboxDir}:`, e);
    }
  }

  return result;
}

/**
 * Fallback execution without Docker (process isolation only)
 * Used when Docker is not available (e.g., some CI environments)
 */
async function executeFallback(
  params: SandboxExecuteParams,
  context: ToolExecutionContext
): Promise<SandboxExecuteResult> {
  const startTime = Date.now();
  const executionId = randomUUID().slice(0, 8);
  const mode = params.mode || 'quick';
  const limits = MODE_LIMITS[mode];
  const ext = LANGUAGE_EXTENSIONS[params.language];

  // Create temporary file
  const tempDir = join('/tmp', `tooloo-sandbox-${executionId}`);
  const mainFile = join(tempDir, `main.${ext}`);

  mkdirSync(tempDir, { recursive: true });
  writeFileSync(mainFile, params.code);

  // Determine command
  let cmd: string;
  switch (params.language) {
    case 'javascript':
      cmd = `node ${mainFile}`;
      break;
    case 'typescript':
      cmd = `npx tsx ${mainFile}`;
      break;
    case 'python':
      cmd = `python3 ${mainFile}`;
      break;
    case 'bash':
      cmd = `bash ${mainFile}`;
      break;
  }

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const proc = spawn(cmd, {
      shell: true,
      cwd: tempDir,
      env: { ...process.env, ...params.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (params.stdin) {
      proc.stdin?.write(params.stdin);
      proc.stdin?.end();
    } else {
      proc.stdin?.end();
    }

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
    }, limits.timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      
      // Cleanup
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {}

      resolve({
        exitCode: code ?? -1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timedOut,
        oomKilled: false,
        duration: Date.now() - startTime,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      rmSync(tempDir, { recursive: true, force: true });
      resolve({
        exitCode: -1,
        stdout: '',
        stderr: err.message,
        timedOut: false,
        oomKilled: false,
        duration: Date.now() - startTime,
      });
    });
  });
}

// =============================================================================
// TOOL IMPLEMENTATION
// =============================================================================

/**
 * Sandbox execution tool
 */
export const sandboxExecuteTool: ToolImplementation<SandboxExecuteParams, SandboxExecuteResult> = {
  name: 'sandbox_execute',
  description: 'Execute code in an isolated Docker sandbox with resource limits',

  parameters: {
    code: {
      type: 'string',
      description: 'The code to execute',
      required: true,
    },
    language: {
      type: 'string',
      description: 'Programming language (javascript, typescript, python, bash)',
      required: true,
    },
    mode: {
      type: 'string',
      description: 'Execution mode: quick (5s/128MB), standard (30s/512MB), extended (120s/1GB)',
      required: false,
      default: 'quick',
    },
    stdin: {
      type: 'string',
      description: 'Optional input to pass to stdin',
      required: false,
    },
    files: {
      type: 'object',
      description: 'Additional files to make available (name -> content)',
      required: false,
    },
    env: {
      type: 'object',
      description: 'Environment variables',
      required: false,
    },
  },

  requiresApproval: false, // Already sandboxed
  riskLevel: 'medium',
  timeout: 150000, // 2.5 minutes max (for extended mode)

  validate: (params: SandboxExecuteParams) => {
    const result = SandboxExecuteParamsSchema.safeParse(params);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: true };
  },

  execute: async (
    params: SandboxExecuteParams,
    context: ToolExecutionContext
  ): Promise<SandboxExecuteResult> => {
    // Check if Docker is available
    const dockerAvailable = isDockerAvailable();

    if (dockerAvailable) {
      console.log(`[Sandbox] Executing ${params.language} code in Docker sandbox`);
      return executeSandbox(params, context);
    } else {
      console.warn('[Sandbox] Docker not available, using fallback execution');
      return executeFallback(params, context);
    }
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Quick helper to run JavaScript code in sandbox
 */
export async function runJavaScript(
  code: string,
  context: ToolExecutionContext
): Promise<SandboxExecuteResult> {
  return sandboxExecuteTool.execute({ code, language: 'javascript' }, context);
}

/**
 * Quick helper to run Python code in sandbox
 */
export async function runPython(
  code: string,
  context: ToolExecutionContext
): Promise<SandboxExecuteResult> {
  return sandboxExecuteTool.execute({ code, language: 'python' }, context);
}

/**
 * Get current sandbox status
 */
export function getSandboxStatus(): {
  dockerAvailable: boolean;
  images: Record<SandboxLanguage, boolean>;
} {
  const dockerAvailable = isDockerAvailable();
  const images: Record<SandboxLanguage, boolean> = {
    javascript: false,
    typescript: false,
    python: false,
    bash: false,
  };

  if (dockerAvailable) {
    for (const [lang, image] of Object.entries(LANGUAGE_IMAGES)) {
      try {
        execSync(`docker image inspect ${image}`, { stdio: 'ignore' });
        images[lang as SandboxLanguage] = true;
      } catch {
        images[lang as SandboxLanguage] = false;
      }
    }
  }

  return { dockerAvailable, images };
}
