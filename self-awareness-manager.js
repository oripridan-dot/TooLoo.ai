/**
 * Self-Awareness Module for TooLoo.ai
 * Allows the assistant to access and modify its own codebase.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class SelfAwarenessManager {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.excludedDirectories = new Set(['node_modules', '.git', 'personal-projects']);
    this.excludedExtensions = new Set(['.log', '.env', '.lock', '.bak']);
    console.log(`📊 Self-awareness initialized for: ${this.workspaceRoot}`);
  }

  /**
   * List all source code files in the project
   */
  async listProjectFiles(directory = this.workspaceRoot) {
    const directoryName = path.basename(directory);
    
    if (this.excludedDirectories.has(directoryName)) {
      return [];
    }

    let files = [];
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        const subDirFiles = await this.listProjectFiles(fullPath);
        files = [...files, ...subDirFiles];
      } else {
        const extension = path.extname(entry.name);
        
        if (!this.excludedExtensions.has(extension)) {
          const stats = await fs.stat(fullPath);
          files.push({
            name: entry.name,
            path: fullPath,
            relativePath: path.relative(this.workspaceRoot, fullPath),
            size: stats.size,
            lastModified: stats.mtime,
            extension: extension
          });
        }
      }
    }
    
    return files;
  }

  /**
   * Get the source code for a specific file
   */
  async getSourceCode(filePath) {
    const fullPath = this.resolveFilePath(filePath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      return {
        path: filePath,
        content,
        size: Buffer.byteLength(content, 'utf8'),
        success: true
      };
    } catch (error) {
      return {
        path: filePath,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Modify a source code file
   */
  async modifySourceCode(filePath, content, options = { backup: true }) {
    const fullPath = this.resolveFilePath(filePath);
    
    try {
      // Create backup if requested
      if (options.backup) {
        const backupPath = `${fullPath}.bak.${Date.now()}`;
        const originalContent = await fs.readFile(fullPath, 'utf8').catch(() => null);
        if (originalContent) {
          await fs.writeFile(backupPath, originalContent, 'utf8');
        }
      }

      await fs.writeFile(fullPath, content, 'utf8');
      
      return {
        path: filePath,
        success: true,
        message: 'File modified successfully'
      };
    } catch (error) {
      return {
        path: filePath,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a project structure overview
   */
  async getProjectStructure(maxDepth = 3) {
    const getStructure = async (dir, depth = 0) => {
      if (depth > maxDepth) return null;
      
      const dirName = path.basename(dir);
      if (this.excludedDirectories.has(dirName)) return null;
      
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const structure = {
        name: dirName,
        path: dir,
        type: 'directory',
        children: []
      };
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subDir = await getStructure(fullPath, depth + 1);
          if (subDir) structure.children.push(subDir);
        } else {
          const ext = path.extname(entry.name);
          if (!this.excludedExtensions.has(ext)) {
            structure.children.push({
              name: entry.name,
              path: fullPath,
              type: 'file',
              extension: ext
            });
          }
        }
      }
      
      return structure;
    };
    
    return getStructure(this.workspaceRoot);
  }

  /**
   * Search for code or patterns in the source code
   */
  async searchCodebase(query, options = {}) {
    const files = await this.listProjectFiles();
    const results = [];
    
    for (const file of files) {
      if (options.extensions && !options.extensions.includes(file.extension)) {
        continue;
      }
      
      try {
        const content = await fs.readFile(file.path, 'utf8');
        const lines = content.split('\n');
        const matches = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.toLowerCase().includes(query.toLowerCase())) {
            matches.push({
              line: i + 1,
              text: line.trim(),
              context: lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join('\n')
            });
          }
        }
        
        if (matches.length > 0) {
          results.push({
            file: file.relativePath,
            matches: matches,
            matchCount: matches.length
          });
        }
      } catch (error) {
        // Skip files with read errors
      }
    }
    
    return {
      query,
      matchingFiles: results.length,
      totalMatches: results.reduce((sum, file) => sum + file.matchCount, 0),
      results
    };
  }

  /**
   * Analyze a file or the whole codebase
   */
  async analyzeCode(filePath = null) {
    if (filePath) {
      const fullPath = this.resolveFilePath(filePath);
      return this.analyzeSingleFile(fullPath);
    } else {
      return this.analyzeCodebase();
    }
  }

  /**
   * Analyze a single file
   */
  async analyzeSingleFile(fullPath) {
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      const extension = path.extname(fullPath);
      const stats = {
        lines: content.split('\n').length,
        size: Buffer.byteLength(content, 'utf8'),
        extension,
        functions: this.countFunctions(content, extension),
        imports: this.extractImports(content, extension),
      };
      
      return {
        path: fullPath,
        stats,
        success: true
      };
    } catch (error) {
      return {
        path: fullPath,
        error: error.message,
        success: false
      };
    }
  }
  
  /**
   * Analyze the entire codebase
   */
  async analyzeCodebase() {
    const files = await this.listProjectFiles();
    const analysis = {
      totalFiles: files.length,
      totalLines: 0,
      totalSize: 0,
      fileTypes: {},
      largestFiles: []
    };
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file.path, 'utf8');
        const lines = content.split('\n').length;
        const size = Buffer.byteLength(content, 'utf8');
        
        analysis.totalLines += lines;
        analysis.totalSize += size;
        
        if (!analysis.fileTypes[file.extension]) {
          analysis.fileTypes[file.extension] = {
            count: 0,
            lines: 0,
            size: 0
          };
        }
        
        analysis.fileTypes[file.extension].count++;
        analysis.fileTypes[file.extension].lines += lines;
        analysis.fileTypes[file.extension].size += size;
        
        analysis.largestFiles.push({
          path: file.relativePath,
          lines,
          size
        });
      } catch (error) {
        // Skip files with read errors
      }
    }
    
    // Sort and limit largest files list
    analysis.largestFiles.sort((a, b) => b.size - a.size);
    analysis.largestFiles = analysis.largestFiles.slice(0, 10);
    
    return analysis;
  }
  
  /**
   * Count functions in a file based on its extension
   */
  countFunctions(content, extension) {
    let count = 0;
    
    if (['.js', '.ts', '.jsx', '.tsx'].includes(extension)) {
      // Count function declarations
      const functionMatches = content.match(/function\s+(\w+)/g) || [];
      count += functionMatches.length;
      
      // Count arrow functions
      const arrowMatches = content.match(/(\w+)\s*=\s*(\([^)]*\)|[^=]+)=>/g) || [];
      count += arrowMatches.length;
      
      // Count method definitions
      const methodMatches = content.match(/(\w+)\s*\([^)]*\)\s*{/g) || [];
      count += methodMatches.length;
    }
    
    return count;
  }
  
  /**
   * Extract imports from a file
   */
  extractImports(content, extension) {
    const imports = [];
    
    if (['.js', '.ts', '.jsx', '.tsx'].includes(extension)) {
      // ES6 imports
      const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
      
      // CommonJS requires
      const requireRegex = /(?:const|let|var)\s+(?:{[^}]*}|\w+)\s+=\s+require\(['"]([^'"]+)['"]\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }
    
    return imports;
  }
  
  /**
   * Resolve a file path to an absolute path
   */
  resolveFilePath(filePath) {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(this.workspaceRoot, filePath);
  }

  /**
   * Helper method to generate a file summary
   */
  async getFileSummary(filePath) {
    const fullPath = this.resolveFilePath(filePath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      const extension = path.extname(fullPath);
      const lines = content.split('\n');
      
      // Get the first non-empty lines as a preview
      let preview = '';
      let count = 0;
      for (const line of lines) {
        if (line.trim() && count < 10) {
          preview += line + '\n';
          count++;
        }
      }
      
      return {
        path: filePath,
        relativePath: path.relative(this.workspaceRoot, fullPath),
        extension,
        lines: lines.length,
        size: Buffer.byteLength(content, 'utf8'),
        preview: preview.trim(),
        success: true
      };
    } catch (error) {
      return {
        path: filePath,
        error: error.message,
        success: false
      };
    }
  }
}

module.exports = SelfAwarenessManager;