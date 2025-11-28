// @version 2.2.54
import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

export interface CodeExecutionResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export class CodeExecutor {
  constructor(private workspaceRoot: string) {}

  async executeInDocker(
    code: string,
    language: string,
  ): Promise<CodeExecutionResult> {
    const id = uuidv4();
    const tempDir = path.join(this.workspaceRoot, "temp", "execution", id);
    await fs.mkdir(tempDir, { recursive: true });

    let filename = "script";
    let image = "";
    let cmd: string[] = [];

    switch (language) {
      case "python":
        filename = "script.py";
        image = "python:3.9-slim";
        cmd = ["python", `/app/${filename}`];
        break;
      case "javascript":
      case "node":
        filename = "script.js";
        image = "node:18-alpine";
        cmd = ["node", `/app/${filename}`];
        break;
      case "bash":
      case "sh":
        filename = "script.sh";
        image = "alpine:latest";
        cmd = ["sh", `/app/${filename}`];
        break;
      default:
        return {
          ok: false,
          stdout: "",
          stderr: `Unsupported language: ${language}`,
          exitCode: 1,
        };
    }

    const filePath = path.join(tempDir, filename);
    await fs.writeFile(filePath, code, "utf-8");

    // Docker run command
    // Mount temp dir to /app
    // Set working dir to /app
    // Run command
    // Remove container after run (--rm)
    // Limit resources (optional but good practice)
    const dockerArgs = [
      "run",
      "--rm",
      "-v",
      `${tempDir}:/app`,
      "-w",
      "/app",
      "--network",
      "none", // Sandbox: No network access
      image,
      ...cmd,
    ];

    console.log(
      `[CodeExecutor] Executing ${language} in Docker: ${dockerArgs.join(" ")}`,
    );

    return new Promise((resolve) => {
      const child = spawn("docker", dockerArgs);
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", async (code) => {
        // Cleanup
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (e) {
          console.error(
            `[CodeExecutor] Failed to cleanup temp dir: ${tempDir}`,
            e,
          );
        }

        resolve({
          ok: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
        });
      });

      child.on("error", (err) => {
        resolve({
          ok: false,
          stdout: "",
          stderr: `Docker execution failed: ${err.message}`,
          exitCode: 1,
        });
      });
    });
  }
}
