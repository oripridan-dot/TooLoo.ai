// @version 2.1.11
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { EventBus } from "../../core/event-bus.js";

interface Version {
  major: number;
  minor: number;
  patch: number;
}

export class VersionManager {
  private currentVersion: Version;
  private packageJsonPath: string;
  private pendingChanges: Set<string> = new Set();
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastWriteTime: number = 0;
  private isInitialized: boolean = false;

  // Configuration
  private readonly DEBOUNCE_MS = 5000; // 5 seconds of silence before tagging
  private readonly IGNORE_WINDOW_MS = 10000; // Ignore events 10s after write to prevent loops

  constructor(
    private bus: EventBus,
    private workspaceRoot: string
  ) {
    this.packageJsonPath = path.join(workspaceRoot, "package.json");
    this.currentVersion = this.readVersion();

    console.log(
      `[VersionManager] Initialized. Current version: ${this.formatVersion(this.currentVersion)}`
    );
    this.checkGitStatus();
  }

  private checkGitStatus() {
    this.execGit("rev-parse --abbrev-ref HEAD", (err, branch) => {
      if (!err && branch) {
        console.log(
          `[VersionManager] Connected to git branch: ${branch.trim()}`
        );
      } else {
        console.warn(
          "[VersionManager] Warning: Not in a git repository or git not available."
        );
      }
    });
  }

  public start() {
    if (this.isInitialized) return;

    this.bus.on("sensory:file:change", (event: any) => {
      // event.payload contains the data from watcher
      if (event.payload && event.payload.path) {
        this.handleFileChange(event.payload.path);
      }
    });

    this.isInitialized = true;
  }

  private readVersion(): Version {
    try {
      const pkg = JSON.parse(fs.readFileSync(this.packageJsonPath, "utf8"));
      const [major, minor, patch] = pkg.version.split(".").map(Number);
      return { major, minor, patch };
    } catch (error) {
      console.error("[VersionManager] Failed to read package.json:", error);
      return { major: 0, minor: 0, patch: 0 };
    }
  }

  private formatVersion(v: Version): string {
    return `${v.major}.${v.minor}.${v.patch}`;
  }

  private handleFileChange(filePath: string) {
    // Ignore changes that happen immediately after we write
    if (Date.now() - this.lastWriteTime < this.IGNORE_WINDOW_MS) {
      return;
    }

    // Filter relevant files
    if (!this.shouldTrackFile(filePath)) {
      return;
    }

    this.pendingChanges.add(filePath);
    this.scheduleUpdate();
  }

  private shouldTrackFile(filePath: string): boolean {
    // Ignore package.json itself to avoid loops
    if (filePath.endsWith("package.json")) return false;

    // Track source files
    return /\.(ts|js|tsx|jsx|css|html)$/.test(filePath);
  }

  private scheduleUpdate() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.performUpdate();
    }, this.DEBOUNCE_MS);
  }

  private performUpdate() {
    if (this.pendingChanges.size === 0) return;

    console.log(
      `[VersionManager] Processing ${this.pendingChanges.size} file changes...`
    );

    // 1. Increment Version (Patch by default)
    this.currentVersion.patch++;
    const newVersionString = this.formatVersion(this.currentVersion);

    // 2. Update package.json
    this.updatePackageJson(newVersionString);

    // 3. Tag Files
    const filesToTag = Array.from(this.pendingChanges);
    this.pendingChanges.clear();

    let taggedCount = 0;
    for (const file of filesToTag) {
      if (this.tagFile(path.join(this.workspaceRoot, file), newVersionString)) {
        taggedCount++;
      }
    }

    this.lastWriteTime = Date.now();
    console.log(
      `[VersionManager] Upgraded to v${newVersionString}. Tagged ${taggedCount} files.`
    );

    // 4. Git Commit & Tag
    const changedFiles = ["package.json", ...filesToTag];
    this.commitAndTag(newVersionString, changedFiles);
  }

  private updatePackageJson(newVersion: string) {
    try {
      const content = fs.readFileSync(this.packageJsonPath, "utf8");
      const pkg = JSON.parse(content);
      pkg.version = newVersion;
      fs.writeFileSync(
        this.packageJsonPath,
        JSON.stringify(pkg, null, 2) + "\n"
      );
    } catch (error) {
      console.error("[VersionManager] Failed to update package.json:", error);
    }
  }

  private commitAndTag(version: string, files: string[]) {
    // 1. Always add package.json first
    this.execGit("add package.json", (err) => {
      if (err) {
        console.error("[VersionManager] Failed to stage package.json:", err);
        return;
      }

      // 2. Try to add other files (ignoring errors for ignored files)
      const otherFiles = files.filter((f) => f !== "package.json");
      if (otherFiles.length > 0) {
        const filesStr = otherFiles.map((f) => `"${f}"`).join(" ");
        // We run this but don't stop on error, as some files might be ignored
        exec(`git add ${filesStr}`, { cwd: this.workspaceRoot }, () => {
          this.performCommit(version);
        });
      } else {
        this.performCommit(version);
      }
    });
  }

  private performCommit(version: string) {
    // 3. Commit (disable GPG signing for automated commits to avoid environment issues)
    const message = `chore(release): v${version} [skip ci]`;
    this.execGit(`-c commit.gpgsign=false commit -m "${message}"`, (err) => {
      if (err) {
        // If nothing to commit (e.g. only ignored files changed and package.json didn't change effectively?), just warn
        console.warn(
          "[VersionManager] Git commit failed (possibly nothing to commit):",
          err.message
        );
        return;
      }

      // 4. Tag
      this.execGit(`tag v${version}`, (err) => {
        if (err) {
          console.error("[VersionManager] Git tag failed:", err);
        } else {
          console.log(`[VersionManager] Git tag v${version} created.`);
        }
      });
    });
  }

  private execGit(
    command: string,
    callback: (error: Error | null, stdout?: string) => void
  ) {
    exec(`git ${command}`, { cwd: this.workspaceRoot }, (error, stdout) => {
      if (error) {
        callback(error);
      } else {
        callback(null, stdout);
      }
    });
  }

  private tagFile(filePath: string, version: string): boolean {
    try {
      if (!fs.existsSync(filePath)) return false;

      const ext = path.extname(filePath);
      const content = fs.readFileSync(filePath, "utf8");
      let newContent = content;
      let tag = "";
      let regex: RegExp | null = null;

      // Define tag styles
      if ([".js", ".ts", ".tsx", ".jsx"].includes(ext)) {
        tag = `// @version ${version}`;
        regex = /\/\/ @version [0-9]+\.[0-9]+\.[0-9]+/;
      } else if (ext === ".css") {
        tag = `/* @version ${version} */`;
        regex = /\/\* @version [0-9]+\.[0-9]+\.[0-9]+ \*\//;
      } else if (ext === ".html") {
        tag = `<!-- @version ${version} -->`;
        regex = /<!-- @version [0-9]+\.[0-9]+\.[0-9]+ -->/;
      } else {
        return false;
      }

      if (regex.test(content)) {
        newContent = content.replace(regex, tag);
      } else {
        // Insert at top
        if (
          ext === ".html" &&
          content.toLowerCase().includes("<!doctype html>")
        ) {
          newContent = content.replace(
            /<!doctype html>/i,
            `<!DOCTYPE html>\n${tag}`
          );
        } else {
          newContent = `${tag}\n${content}`;
        }
      }

      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        return true;
      }
    } catch (error) {
      console.error(`[VersionManager] Error tagging ${filePath}:`, error);
    }
    return false;
  }
}
