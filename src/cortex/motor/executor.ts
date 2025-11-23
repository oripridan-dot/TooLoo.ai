// @version 2.1.11
import { spawn, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ExecutionResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
}

export class Executor {
  constructor(private workspaceRoot: string) {}

  /**
   * Execute a shell command safely
   */
  async runCommand(command: string, cwd?: string): Promise<ExecutionResult> {
    const start = Date.now();
    const workingDir = cwd || this.workspaceRoot;

    console.log(`[Motor:Executor] Running: "${command}" in ${workingDir}`);

    try {
      const { stdout, stderr } = await execAsync(command, { cwd: workingDir });
      return {
        ok: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
        duration: Date.now() - start,
      };
    } catch (error: any) {
      return {
        ok: false,
        stdout: error.stdout ? error.stdout.trim() : "",
        stderr: error.stderr ? error.stderr.trim() : error.message,
        exitCode: error.code || 1,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Spawn a long-running process (placeholder for future "Daemon" capability)
   */
  spawnProcess(command: string, args: string[]) {
    // TODO: Implement managed process spawning
    console.log("[Motor:Executor] Spawn not yet implemented");
  }
}
