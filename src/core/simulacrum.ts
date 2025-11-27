// @version 2.2.11
import * as fs from "fs/promises";
import * as path from "path";
import { SandboxManager } from "./sandbox/sandbox-manager.js";
import { config } from "./config.js";

export class Simulacrum {
  private sandboxManager: SandboxManager;
  private tempDir: string;

  constructor() {
    this.sandboxManager = new SandboxManager();
    this.tempDir = path.join(process.cwd(), "temp", "simulacrum");
  }

  /**
   * Tests a set of changes against the codebase in a secure sandbox
   */
  async verifyChanges(
    changes: { filePath: string; content: string }[],
  ): Promise<{ success: boolean; logs: string }> {
    const runId = `simulacrum-${Date.now()}`;
    const runDir = path.join(this.tempDir, runId);

    try {
      // 1. Clone current workspace (simplified: just copy src and package.json)
      // In a real scenario, we might use git clone or rsync
      await this.cloneWorkspace(runDir);

      // 2. Apply changes
      for (const change of changes) {
        const targetPath = path.join(runDir, change.filePath);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, change.content);
      }

      // 3. Spin up sandbox
      const sandbox = await this.sandboxManager.createSandbox({
        id: runId,
        mode: config.SANDBOX_MODE,
        cwd: runDir,
      });

      // 4. Run tests
      // We assume 'npm test' runs the test suite
      // We might want to run specific tests based on changes
      const result = await sandbox.exec("npm test");

      await sandbox.stop();

      return {
        success: result.ok,
        logs: result.stdout + "\n" + result.stderr,
      };
    } catch (error: any) {
      return {
        success: false,
        logs: `Simulacrum failed: ${error.message}`,
      };
    } finally {
      // Cleanup
      // await fs.rm(runDir, { recursive: true, force: true });
    }
  }

  private async cloneWorkspace(targetDir: string) {
    await fs.mkdir(targetDir, { recursive: true });

    // Copy package.json, tsconfig.json
    await fs.copyFile("package.json", path.join(targetDir, "package.json"));
    await fs.copyFile("tsconfig.json", path.join(targetDir, "tsconfig.json"));

    // Copy src recursively
    await fs.cp("src", path.join(targetDir, "src"), { recursive: true });

    // We might need node_modules, but copying them is slow.
    // In Docker sandbox, we might rely on pre-installed modules or mount them.
    // For now, let's assume the sandbox image has dependencies or we mount node_modules.
    // Mounting node_modules from host is faster.
    // The SandboxManager mounts the CWD. So if we pass runDir as CWD, it mounts that.
    // But runDir doesn't have node_modules.
    // We should symlink node_modules?
    try {
      await fs.symlink(
        path.resolve("node_modules"),
        path.join(targetDir, "node_modules"),
        "dir",
      );
    } catch (e) {
      // Ignore if fails (e.g. already exists)
    }
  }
}
