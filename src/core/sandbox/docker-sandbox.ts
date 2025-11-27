import { spawn, exec } from "child_process";
import {
  ISandbox,
  SandboxOptions,
  ExecutionResult,
} from "./sandbox-manager.js";
import { config } from "../config.js";

export class DockerSandbox implements ISandbox {
  public id: string;
  private containerId: string | null = null;
  private options: SandboxOptions;
  private image: string;

  constructor(options: SandboxOptions) {
    this.id = options.id;
    this.options = options;
    this.image = config.SANDBOX_DOCKER_IMAGE;
  }

  async start(): Promise<void> {
    // We mount the current working directory to /workspace in the container
    // This allows the container to access files in the project
    const cwd = process.cwd();
    const mountPoint = "/workspace";

    // Command to start the container in detached mode, keeping it alive with 'cat'
    // We use --rm to automatically remove the container when it stops
    // We mount the host CWD to /workspace
    // We set the working directory inside the container to /workspace
    const args = [
      "run",
      "-d",
      "-t",
      "--rm",
      "-v",
      `${cwd}:${mountPoint}`,
      "-w",
      mountPoint,
      "--name",
      `tooloo-sandbox-${this.id}`,
      this.image,
      "cat", // Keep the container running
    ];

    return new Promise((resolve, reject) => {
      const child = spawn("docker", args);
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          this.containerId = stdout.trim();
          resolve();
        } else {
          reject(new Error(`Failed to start Docker sandbox: ${stderr}`));
        }
      });
    });
  }

  async exec(command: string): Promise<ExecutionResult> {
    if (!this.containerId) throw new Error("Sandbox not running");

    const startTime = Date.now();

    // We use 'docker exec' to run the command inside the container
    const args = [
      "exec",
      "-e",
      "NODE_ENV=production", // Set some defaults
      this.containerId,
      "sh",
      "-c",
      command,
    ];

    return new Promise((resolve) => {
      const child = spawn("docker", args);
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        const duration = Date.now() - startTime;
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
          duration,
          ok: code === 0,
        });
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.containerId) return;

    return new Promise((resolve) => {
      exec(`docker stop ${this.containerId}`, (error) => {
        if (error) {
          // We don't reject here because the container might have already stopped
          console.warn(
            `Failed to stop container ${this.containerId}: ${error.message}`,
          );
        }
        this.containerId = null;
        resolve();
      });
    });
  }

  isRunning(): boolean {
    return this.containerId !== null;
  }
}
