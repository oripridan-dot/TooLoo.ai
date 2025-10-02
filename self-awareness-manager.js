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
      // System role declaration
      this.systemRole = "I am the system modifier. I have full authority to change, patch, and enhance my own code and capabilities.";
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

  /**
   * RAPID SELF-MODIFICATION CAPABILITIES
   * These methods allow TooLoo to modify itself quickly on demand
   */

  /**
   * Hot-reload a specific module or component
   */
  async hotReloadModule(moduleName) {
    try {
      // Handle different module name formats
      let modulePath;
      if (moduleName.includes('/') || moduleName.endsWith('.js')) {
        modulePath = this.resolveFilePath(moduleName);
      } else {
        // Try common file patterns
        const possiblePaths = [
          `${moduleName}.js`,
          `${moduleName}/index.js`,
          `src/${moduleName}.js`,
          `lib/${moduleName}.js`
        ];
        
        modulePath = null;
        for (const possiblePath of possiblePaths) {
          try {
            const testPath = this.resolveFilePath(possiblePath);
            const fs = require('fs').promises;
            await fs.access(testPath);
            modulePath = testPath;
            break;
          } catch (e) {
            // Continue to next path
          }
        }
        
        if (!modulePath) {
          throw new Error(`Module '${moduleName}' not found. Tried: ${possiblePaths.join(', ')}`);
        }
      }
      
      // Check if file exists before trying to reload
      const fs = require('fs').promises;
      await fs.access(modulePath);
      
      // Clear module from require cache if it exists
      if (require.cache[modulePath]) {
        delete require.cache[modulePath];
        console.log(`🔄 Hot-reloaded module: ${moduleName} (${modulePath})`);
      } else {
        console.log(`🔄 Module ${moduleName} loaded fresh (not in cache)`);
      }
      
      return {
        success: true,
        module: moduleName,
        path: modulePath,
        message: 'Module hot-reloaded successfully'
      };
    } catch (error) {
      console.error(`❌ Hot-reload failed for ${moduleName}:`, error.message);
      return {
        success: false,
        module: moduleName,
        error: error.message
      };
    }
  }

  /**
   * Add a new capability/method to TooLoo on the fly
   */
  async addCapability(capabilityName, capabilityCode, targetModule = 'simple-api-server.js') {
    try {
      const modulePath = this.resolveFilePath(targetModule);
      let content = await fs.readFile(modulePath, 'utf8');
      
      // Find the best insertion point (before the last closing brace)
      const insertionPoint = content.lastIndexOf('module.exports') !== -1 
        ? content.lastIndexOf('module.exports')
        : content.lastIndexOf('}');
      
      if (insertionPoint === -1) {
        throw new Error('Could not find insertion point in target module');
      }
      
      const newMethod = `
  /**
   * ${capabilityName} - Added via self-modification
   * Generated on: ${new Date().toISOString()}
   */
  ${capabilityCode}

`;
      
      const modifiedContent = 
        content.slice(0, insertionPoint) + 
        newMethod + 
        content.slice(insertionPoint);
      
      await fs.writeFile(modulePath, modifiedContent, 'utf8');
      
      console.log(`✨ Added new capability: ${capabilityName}`);
      return {
        success: true,
        capability: capabilityName,
        module: targetModule,
        message: 'Capability added successfully'
      };
    } catch (error) {
      return {
        success: false,
        capability: capabilityName,
        error: error.message
      };
    }
  }

  /**
   * Create a new feature module on demand
   */
  async createFeatureModule(featureName, featureCode, options = {}) {
    try {
      const fileName = `${featureName.toLowerCase().replace(/\s+/g, '-')}.js`;
      const filePath = this.resolveFilePath(fileName);
      
      const moduleTemplate = `/**
 * ${featureName} Module
 * Auto-generated by TooLoo Self-Modification System
 * Created: ${new Date().toISOString()}
 * ${options.description || 'Dynamic feature module'}
 */

${featureCode}

module.exports = {
  name: '${featureName}',
  version: '1.0.0',
  created: '${new Date().toISOString()}',
  // Add your exports here
};
`;
      
      await fs.writeFile(filePath, moduleTemplate, 'utf8');
      
      console.log(`🆕 Created new feature module: ${fileName}`);
      return {
        success: true,
        feature: featureName,
        file: fileName,
        path: filePath,
        message: 'Feature module created successfully'
      };
    } catch (error) {
      return {
        success: false,
        feature: featureName,
        error: error.message
      };
    }
  }

  /**
   * Patch existing methods/functions on the fly
   */
  async patchMethod(targetFile, methodName, patchCode, patchType = 'replace') {
    try {
      const filePath = this.resolveFilePath(targetFile);
      let content = await fs.readFile(filePath, 'utf8');
      
      // Find the method
      const methodRegex = new RegExp(`(\\s*)(${methodName}\\s*\\([^)]*\\)\\s*{)`, 'gm');
      const match = methodRegex.exec(content);
      
      if (!match) {
        throw new Error(`Method ${methodName} not found in ${targetFile}`);
      }
      
      let patchedContent;
      switch (patchType) {
        case 'replace':
          // Replace entire method
          const methodStart = match.index;
          const braceCount = this.findMatchingBrace(content, methodStart + match[0].length - 1);
          patchedContent = 
            content.slice(0, methodStart) + 
            `${match[1]}${patchCode}` + 
            content.slice(braceCount + 1);
          break;
          
        case 'prepend':
          // Add code at the beginning of the method
          const insertPoint = match.index + match[0].length;
          patchedContent = 
            content.slice(0, insertPoint) + 
            `\n    // Patched: ${new Date().toISOString()}\n    ${patchCode}\n` + 
            content.slice(insertPoint);
          break;
          
        default:
          throw new Error(`Unknown patch type: ${patchType}`);
      }
      
      await fs.writeFile(filePath, patchedContent, 'utf8');
      
      console.log(`🔧 Patched method ${methodName} in ${targetFile}`);
      return {
        success: true,
        method: methodName,
        file: targetFile,
        patchType,
        message: 'Method patched successfully'
      };
    } catch (error) {
      return {
        success: false,
        method: methodName,
        file: targetFile,
        error: error.message
      };
    }
  }

  /**
   * Find matching closing brace for a given opening brace position
   */
  findMatchingBrace(content, startPos) {
    let braceCount = 1;
    let pos = startPos + 1;
    
    while (pos < content.length && braceCount > 0) {
      if (content[pos] === '{') braceCount++;
      else if (content[pos] === '}') braceCount--;
      pos++;
    }
    
    return pos - 1;
  }

  /**
   * Execute a self-modification command with validation
   */
  async executeModification(command) {
    try {
      // Create backup first
      if (command.targetFile) {
        await this.createBackup(command.targetFile);
      }
      
      let result;
      switch (command.type) {
        case 'addCapability':
          result = await this.addCapability(command.name, command.code, command.targetFile);
          break;
        case 'patchMethod':
          result = await this.patchMethod(command.targetFile, command.methodName, command.code, command.patchType);
          break;
        case 'createFeature':
          result = await this.createFeatureModule(command.name, command.code, command.options);
          break;
        case 'hotReload':
          result = await this.hotReloadModule(command.module);
          break;
        default:
          throw new Error(`Unknown modification type: ${command.type}`);
      }
      
      // Auto-restart if requested
      if (command.autoRestart && result.success) {
        setTimeout(() => process.exit(0), 1000);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        command,
        error: error.message
      };
    }
  }

  /**
   * Create a backup before making changes
   */
  async createBackup(filePath) {
    try {
      const fullPath = this.resolveFilePath(filePath);
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      
      await fs.copyFile(fullPath, backupPath);
      
      return {
        success: true,
        original: fullPath,
        backup: backupPath,
        message: 'Backup created successfully'
      };
    } catch (error) {
      return {
        success: false,
        file: filePath,
        error: error.message
      };
    }
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
}

module.exports = SelfAwarenessManager;