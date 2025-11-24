// @version 2.1.185
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import fs from "fs-extra";

const execAsync = promisify(exec);

export interface VerificationResult {
  ok: boolean;
  errors: string[];
}

export class Verifier {
  constructor(private workspaceRoot: string) {}

  async checkEslintConfig(): Promise<boolean> {
    const fs = await import("fs-extra");
    const configFiles = [
      ".eslintrc.js",
      ".eslintrc.json",
      ".eslintrc.yaml",
      ".eslintrc.yml",
      "eslint.config.js",
      "package.json", // Check for eslintConfig field
    ];

    for (const file of configFiles) {
      if (await fs.pathExists(path.join(this.workspaceRoot, file))) {
        if (file === "package.json") {
          const pkg = await fs.readJson(path.join(this.workspaceRoot, file));
          if (pkg.eslintConfig) return true;
        } else {
          return true;
        }
      }
    }
    return false;
  }

  async verifyFile(filePath: string): Promise<VerificationResult> {
    console.log(`[Verifier] Verifying file: ${filePath}`);
    const errors: string[] = [];

    // 1. Check if file exists
    // (Assumed handled by caller or fs check)

    // 2. Run Lint (ESLint)
    // We assume eslint is installed in the workspace
    // Only run if config exists to avoid parsing errors on unconfigured files
    const hasEslintConfig = await this.checkEslintConfig();
    if (hasEslintConfig) {
        try {
        // Only run lint on .ts and .js files
        if (filePath.endsWith(".ts") || filePath.endsWith(".js")) {
            await execAsync(`npx eslint "${filePath}"`, { cwd: this.workspaceRoot });
        }
        } catch (error: any) {
        // ESLint returns non-zero exit code on errors
        if (error.stdout) {
            errors.push(`Lint Error: ${error.stdout}`);
        } else {
            errors.push(`Lint Failed: ${error.message}`);
        }
        }
    }

    // 3. Run Type Check (TSC)
    // Only for .ts files
    if (filePath.endsWith(".ts")) {
      try {
                // We use tsc --noEmit and target the specific file
        // We add standard modern flags to avoid "const" errors (ES3 default)
        const cmd = `npx tsc --noEmit "${filePath}" --target es2022 --module NodeNext --moduleResolution NodeNext --esModuleInterop --skipLibCheck`;
        // console.log(`[Verifier] Running: ${cmd}`);

await execAsync(cmd, { cwd: this.workspaceRoot });
} catch (error: any) {
    if (error.stdout) {
        console.log(`[Verifier] Raw TSC Output:
${error.stdout}`);
        // Filter output to only show errors relevant to the file
        const relevantErrors = error.stdout
            .split('\n')
            .filter((line: string) => line.includes(path.basename(filePath)) && line.includes("error"))
            .join('\n');
        
        if (relevantErrors) {
            errors.push(`Type Error: ${relevantErrors}`);
        }
    }
}
    }

    return {
      ok: errors.length === 0,
      errors,
    };
  }
}
