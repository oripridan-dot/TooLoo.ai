/**
 * Secure Filesystem Manager for TooLoo.ai Personal Assistant
 * 
 * Provides controlled filesystem access for personal development projects
 * while maintaining security boundaries for your system.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');

class PersonalFilesystemManager {
  constructor(options = {}) {
    // Define safe working directories for personal projects
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.projectsDir = options.projectsDir || path.join(this.workspaceRoot, 'personal-projects');
    this.allowedExtensions = new Set([
      '.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.txt', '.html', '.css', 
      '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb', '.sh',
      '.yaml', '.yml', '.xml', '.csv', '.sql', '.env', '.gitignore',
      '.dockerfile', '.dockerignore', '.readme', '' // allow files without an extension (e.g., .gitkeep)
    ]);
    
    // Security boundaries - paths that are off-limits
    this.restrictedPaths = new Set([
      '/etc', '/bin', '/sbin', '/usr/bin', '/usr/sbin', '/root',
      '/home/*/.ssh', '/home/*/.aws', '/home/*/.config/git',
      path.join(os.homedir(), '.ssh'),
      path.join(os.homedir(), '.aws'),
      path.join(os.homedir(), '.config', 'git')
    ]);

    this.ensureProjectsDirectory();
  }

  async ensureProjectsDirectory() {
    try {
      await fs.mkdir(this.projectsDir, { recursive: true });
      console.log(`📁 Personal projects directory ready: ${this.projectsDir}`);
    } catch (error) {
      console.warn(`Failed to create projects directory: ${error.message}`);
    }
  }

  // Validate file paths for security
  validatePath(filePath) {
    const normalizedPath = path.resolve(filePath);
    
    // Must be within workspace or projects directory
    const withinWorkspace = normalizedPath.startsWith(path.resolve(this.workspaceRoot));
    const withinProjects = normalizedPath.startsWith(path.resolve(this.projectsDir));
    
    if (!withinWorkspace && !withinProjects) {
      throw new Error(`Access denied: Path outside allowed directories: ${filePath}`);
    }

    // Check against restricted paths
    for (const restricted of this.restrictedPaths) {
      if (normalizedPath.startsWith(restricted) || normalizedPath.includes('/.ssh/') || normalizedPath.includes('/.aws/')) {
        throw new Error(`Access denied: Path is restricted: ${filePath}`);
      }
    }

    return normalizedPath;
  }

  // Validate file extensions
  validateFileExtension(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    // Allow files with no extension and dotfiles like .gitkeep
    if (ext && !this.allowedExtensions.has(ext)) {
      throw new Error(`File type not allowed: ${ext}. Allowed types: ${Array.from(this.allowedExtensions).join(', ')}`);
    }
    return true;
  }

  // Create a new project directory
  async createProject(projectName, description = '') {
    const safeName = projectName.replace(/[^a-zA-Z0-9-_]/g, '-');
    const projectPath = path.join(this.projectsDir, safeName);
    
    try {
      await fs.mkdir(projectPath, { recursive: true });
      
      // Create a README for the project
      const readmeContent = `# ${projectName}\n\n${description}\n\nCreated by TooLoo.ai on ${new Date().toISOString()}\n`;
      await this.writeFile(path.join(projectPath, 'README.md'), readmeContent);
      
      return {
        success: true,
        projectPath,
        message: `Project '${projectName}' created successfully`
      };
    } catch (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  // Read file contents
  async readFile(filePath) {
    const validatedPath = this.validatePath(filePath);
    
    try {
      const content = await fs.readFile(validatedPath, 'utf8');
      const stats = await fs.stat(validatedPath);
      
      return {
        success: true,
        content,
        path: validatedPath,
        size: stats.size,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  // Write file contents
  async writeFile(filePath, content, options = {}) {
    const validatedPath = this.validatePath(filePath);
    this.validateFileExtension(validatedPath);
    
    try {
      // Ensure directory exists
      const dir = path.dirname(validatedPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Create backup if file exists and backup is requested
      if (options.backup && fsSync.existsSync(validatedPath)) {
        const backupPath = `${validatedPath}.bak.${Date.now()}`;
        await fs.copyFile(validatedPath, backupPath);
      }
      
      await fs.writeFile(validatedPath, content, 'utf8');
      
      return {
        success: true,
        path: validatedPath,
        message: `File written successfully: ${path.basename(validatedPath)}`,
        size: Buffer.byteLength(content, 'utf8')
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  // List directory contents
  async listDirectory(dirPath = this.projectsDir) {
    const validatedPath = this.validatePath(dirPath);
    
    try {
      const entries = await fs.readdir(validatedPath, { withFileTypes: true });
      
      const items = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(validatedPath, entry.name);
        let stats = null;
        
        try {
          stats = await fs.stat(fullPath);
        } catch (error) {
          // Skip items we can't stat
          return null;
        }
        
        return {
          name: entry.name,
          path: fullPath,
          isFile: entry.isFile(),
          isDirectory: entry.isDirectory(),
          size: stats ? stats.size : 0,
          modified: stats ? stats.mtime : null,
          extension: entry.isFile() ? path.extname(entry.name) : null
        };
      }));
      
      return {
        success: true,
        path: validatedPath,
        items: items.filter(item => item !== null)
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  // Delete file or directory
  async deleteItem(itemPath, options = {}) {
    const validatedPath = this.validatePath(itemPath);
    
    try {
      const stats = await fs.stat(validatedPath);
      
      if (stats.isDirectory()) {
        if (options.recursive) {
          await fs.rmdir(validatedPath, { recursive: true });
        } else {
          await fs.rmdir(validatedPath);
        }
      } else {
        await fs.unlink(validatedPath);
      }
      
      return {
        success: true,
        message: `${stats.isDirectory() ? 'Directory' : 'File'} deleted: ${path.basename(validatedPath)}`
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Item not found: ${itemPath}`);
      }
      throw new Error(`Failed to delete item: ${error.message}`);
    }
  }

  // Copy file or directory
  async copyItem(sourcePath, destinationPath) {
    const validatedSource = this.validatePath(sourcePath);
    const validatedDest = this.validatePath(destinationPath);
    this.validateFileExtension(validatedDest);
    
    try {
      const stats = await fs.stat(validatedSource);
      
      if (stats.isDirectory()) {
        await fs.mkdir(validatedDest, { recursive: true });
        const entries = await fs.readdir(validatedSource);
        
        for (const entry of entries) {
          const srcPath = path.join(validatedSource, entry);
          const destPath = path.join(validatedDest, entry);
          await this.copyItem(srcPath, destPath);
        }
      } else {
        await fs.copyFile(validatedSource, validatedDest);
      }
      
      return {
        success: true,
        message: `${stats.isDirectory() ? 'Directory' : 'File'} copied successfully`
      };
    } catch (error) {
      throw new Error(`Failed to copy item: ${error.message}`);
    }
  }

  // Search for files containing text
  async searchFiles(searchTerm, searchPath = this.projectsDir, options = {}) {
    const validatedPath = this.validatePath(searchPath);
    const maxResults = options.maxResults || 50;
    const results = [];
    
    try {
      const searchInDirectory = async (dirPath) => {
        if (results.length >= maxResults) return;
        
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (results.length >= maxResults) break;
          
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory() && options.recursive !== false) {
            await searchInDirectory(fullPath);
          } else if (entry.isFile()) {
            try {
              const content = await fs.readFile(fullPath, 'utf8');
              if (content.toLowerCase().includes(searchTerm.toLowerCase())) {
                // Find line numbers
                const lines = content.split('\n');
                const matches = lines
                  .map((line, index) => ({ line: line.trim(), number: index + 1 }))
                  .filter(item => item.line.toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice(0, 5); // Limit matches per file
                
                results.push({
                  file: fullPath,
                  matches: matches.length,
                  lines: matches
                });
              }
            } catch (error) {
              // Skip files that can't be read as text
              continue;
            }
          }
        }
      };
      
      await searchInDirectory(validatedPath);
      
      return {
        success: true,
        searchTerm,
        results,
        totalMatches: results.length
      };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  // Get workspace summary
  async getWorkspaceSummary() {
    try {
      const workspaceStats = await this.listDirectory(this.workspaceRoot);
      const projectsStats = await this.listDirectory(this.projectsDir);
      
      return {
        workspace: {
          path: this.workspaceRoot,
          items: workspaceStats.items.length
        },
        projects: {
          path: this.projectsDir,
          count: projectsStats.items.filter(item => item.isDirectory).length,
          files: projectsStats.items.filter(item => item.isFile).length
        },
        allowedExtensions: Array.from(this.allowedExtensions),
        restrictedPaths: Array.from(this.restrictedPaths)
      };
    } catch (error) {
      throw new Error(`Failed to get workspace summary: ${error.message}`);
    }
  }
}

module.exports = PersonalFilesystemManager;