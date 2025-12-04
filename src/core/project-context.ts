// @version 2.2.273
import fs from 'fs/promises';
import path from 'path';

export class ProjectContext {
  private rootDir: string;
  private cache: string | null = null;
  private lastUpdate: number = 0;
  private cacheDuration: number = 60000; // 1 minute

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  async getStructure(): Promise<string> {
    if (this.cache && Date.now() - this.lastUpdate < this.cacheDuration) {
      return this.cache;
    }

    try {
      const structure = await this.generateTree(this.rootDir);
      this.cache = structure;
      this.lastUpdate = Date.now();
      return structure;
    } catch (error) {
      console.error('Failed to generate project structure:', error);
      return 'Error generating project structure.';
    }
  }

  private async generateTree(dir: string, prefix: string = '', depth: number = 0): Promise<string> {
    if (depth > 3) return ''; // Limit depth

    const ignore = ['.git', 'node_modules', 'dist', 'coverage', '.DS_Store', 'package-lock.json'];
    let output = '';

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      // Sort: directories first, then files
      entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry || ignore.includes(entry.name)) continue;

        const isLast = i === entries.length - 1;
        const marker = isLast ? '└── ' : '├── ';

        output += `${prefix}${marker}${entry.name}${entry.isDirectory() ? '/' : ''}\n`;

        if (entry.isDirectory()) {
          const newPrefix = prefix + (isLast ? '    ' : '│   ');
          output += await this.generateTree(path.join(dir, entry.name), newPrefix, depth + 1);
        }
      }
    } catch (e) {
      // Ignore access errors
    }

    return output;
  }
}

export const projectContext = new ProjectContext();
