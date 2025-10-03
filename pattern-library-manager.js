const fs = require('fs').promises;
const path = require('path');

/**
 * Pattern Library Manager
 * Automatically extracts and catalogs successful code patterns
 */
class PatternLibraryManager {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.patternsDir = path.join(this.workspaceRoot, 'patterns');
    this.projectsDir = path.join(this.workspaceRoot, 'personal-projects');
    this.catalogFile = path.join(this.patternsDir, 'CATALOG.md');
    
    this.categories = [
      'error-handling',
      'api-calls',
      'file-operations',
      'ui-components',
      'data-processing',
      'validation',
      'authentication',
      'state-management',
      'performance',
      'testing'
    ];
    
    this.initialize();
    console.log('📚 Pattern Library Manager initialized');
  }

  async initialize() {
    try {
      await fs.mkdir(this.patternsDir, { recursive: true });
      await this.createCatalog();
    } catch (error) {
      console.warn('⚠️ Pattern Library Manager: initialization warning:', error.message);
    }
  }

  /**
   * Extract patterns from a successful project
   */
  async extractPatternsFromProject(projectPath) {
    const patterns = [];
    
    try {
      const files = await this.getProjectFiles(projectPath);
      
      for (const file of files) {
        const content = await fs.readFile(file.path, 'utf8');
        const extractedPatterns = await this.analyzeCodeForPatterns(content, file);
        patterns.push(...extractedPatterns);
      }
      
      // Save extracted patterns
      for (const pattern of patterns) {
        await this.savePattern(pattern);
      }
      
      console.log(`✅ Extracted ${patterns.length} patterns from ${path.basename(projectPath)}`);
      return patterns;
      
    } catch (error) {
      console.error('Failed to extract patterns:', error.message);
      return [];
    }
  }

  async getProjectFiles(projectPath, extensions = ['.js', '.jsx', '.html', '.css']) {
    const files = [];
    
    try {
      const entries = await fs.readdir(projectPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(projectPath, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const subFiles = await this.getProjectFiles(fullPath, extensions);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            const stats = await fs.stat(fullPath);
            files.push({
              path: fullPath,
              name: entry.name,
              extension: ext,
              size: stats.size
            });
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    
    return files;
  }

  /**
   * Analyze code and identify reusable patterns
   */
  async analyzeCodeForPatterns(code, fileInfo) {
    const patterns = [];
    
    // Pattern 1: Error handling with try-catch
    if (code.includes('try {') && code.includes('catch')) {
      const errorHandlingPattern = this.extractErrorHandlingPattern(code);
      if (errorHandlingPattern) {
        patterns.push({
          name: 'Error Handling Pattern',
          category: 'error-handling',
          source: fileInfo.name,
          code: errorHandlingPattern,
          description: 'Robust error handling with fallback behavior',
          useCase: 'Wrap risky operations like API calls, file operations, or external service calls'
        });
      }
    }
    
    // Pattern 2: API call patterns
    if (code.includes('fetch(') || code.includes('axios')) {
      const apiPattern = this.extractAPIPattern(code);
      if (apiPattern) {
        patterns.push({
          name: 'API Call Pattern',
          category: 'api-calls',
          source: fileInfo.name,
          code: apiPattern,
          description: 'Structured API call with error handling and timeout',
          useCase: 'Making HTTP requests to external APIs'
        });
      }
    }
    
    // Pattern 3: File operations
    if (code.includes('fs.') || code.includes('require(\'fs\')')) {
      const filePattern = this.extractFileOperationPattern(code);
      if (filePattern) {
        patterns.push({
          name: 'File Operation Pattern',
          category: 'file-operations',
          source: fileInfo.name,
          code: filePattern,
          description: 'Safe file operations with error handling',
          useCase: 'Reading, writing, or modifying files with proper error handling'
        });
      }
    }
    
    // Pattern 4: React components (if .jsx)
    if (fileInfo.extension === '.jsx' && code.includes('function') && code.includes('return')) {
      const componentPattern = this.extractReactComponentPattern(code);
      if (componentPattern) {
        patterns.push({
          name: 'React Component Pattern',
          category: 'ui-components',
          source: fileInfo.name,
          code: componentPattern,
          description: 'Reusable React component structure',
          useCase: 'Building UI components with state management'
        });
      }
    }
    
    return patterns;
  }

  extractErrorHandlingPattern(code) {
    const tryMatch = code.match(/try\s*{[\s\S]*?}\s*catch\s*\([^)]+\)\s*{[\s\S]*?}/);
    if (tryMatch) {
      return tryMatch[0].substring(0, 500); // Limit size
    }
    return null;
  }

  extractAPIPattern(code) {
    const fetchMatch = code.match(/(?:async\s+)?(?:function\s+)?.*fetch\([^)]+\)[\s\S]{0,300}/);
    if (fetchMatch) {
      return fetchMatch[0].substring(0, 500);
    }
    return null;
  }

  extractFileOperationPattern(code) {
    const fsMatch = code.match(/(?:await\s+)?fs\.[a-zA-Z]+\([^)]*\)[\s\S]{0,200}/);
    if (fsMatch) {
      return fsMatch[0].substring(0, 400);
    }
    return null;
  }

  extractReactComponentPattern(code) {
    const componentMatch = code.match(/function\s+[A-Z][a-zA-Z]*\s*\([^)]*\)\s*{[\s\S]{0,400}/);
    if (componentMatch) {
      return componentMatch[0].substring(0, 500);
    }
    return null;
  }

  /**
   * Save a pattern to the library
   */
  async savePattern(pattern) {
    const filename = pattern.name.toLowerCase().replace(/\s+/g, '-') + '.md';
    const filepath = path.join(this.patternsDir, filename);
    
    const content = `# ${pattern.name}

**Category**: ${pattern.category}  
**Source**: ${pattern.source}  
**Extracted**: ${new Date().toISOString().split('T')[0]}

## Description
${pattern.description}

## Use Case
${pattern.useCase}

## Code Pattern
\`\`\`javascript
${pattern.code}
\`\`\`

## Application Guidelines
1. Copy this pattern as a starting point
2. Modify variable names and logic to fit your use case
3. Test thoroughly before deploying
4. Document any improvements you make

---
*Auto-extracted by Pattern Library Manager*
`;
    
    try {
      await fs.writeFile(filepath, content);
      await this.updateCatalog();
      console.log(`📝 Saved pattern: ${pattern.name}`);
    } catch (error) {
      console.error('Failed to save pattern:', error.message);
    }
  }

  /**
   * Create or update the pattern catalog
   */
  async createCatalog() {
    try {
      const patternFiles = await fs.readdir(this.patternsDir);
      const patterns = patternFiles.filter(f => f.endsWith('.md') && f !== 'CATALOG.md');
      
      let catalog = `# 📚 Pattern Library Catalog

**Last Updated**: ${new Date().toISOString().split('T')[0]}  
**Total Patterns**: ${patterns.length}

This catalog contains proven, reusable code patterns extracted from successful TooLoo.ai projects.

## Quick Index

`;
      
      // Group by category
      const byCategory = {};
      for (const categoryName of this.categories) {
        byCategory[categoryName] = [];
      }
      
      for (const file of patterns) {
        const content = await fs.readFile(path.join(this.patternsDir, file), 'utf8');
        const categoryMatch = content.match(/\*\*Category\*\*:\s*([^\n]+)/);
        const category = categoryMatch ? categoryMatch[1].trim() : 'other';
        
        if (!byCategory[category]) {
          byCategory[category] = [];
        }
        byCategory[category].push(file);
      }
      
      // Write catalog by category
      for (const [category, files] of Object.entries(byCategory)) {
        if (files.length > 0) {
          catalog += `\n### ${category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ')}\n`;
          for (const file of files) {
            const name = file.replace('.md', '').replace(/-/g, ' ');
            catalog += `- [${name}](./${file})\n`;
          }
        }
      }
      
      catalog += `\n---

## How to Use This Library

1. **Browse by Category**: Find patterns relevant to your current task
2. **Copy & Adapt**: Use patterns as starting points, not rigid templates
3. **Improve & Share**: If you enhance a pattern, update it here
4. **Extract New Patterns**: Run pattern extraction after completing successful projects

## Pattern Quality Guidelines

✅ **Good Patterns:**
- Solve a specific, recurring problem
- Include error handling
- Have clear, documented use cases
- Work across multiple projects

❌ **Avoid:**
- Project-specific code (extract the general pattern)
- Incomplete or untested code
- Over-complicated solutions
- Deprecated or obsolete approaches

---
*Managed by Pattern Library Manager*
`;
      
      await fs.writeFile(this.catalogFile, catalog);
      
    } catch (error) {
      console.error('Failed to create catalog:', error.message);
    }
  }

  async updateCatalog() {
    await this.createCatalog();
  }

  /**
   * Search patterns by category or keyword
   */
  async searchPatterns(query) {
    try {
      const patternFiles = await fs.readdir(this.patternsDir);
      const results = [];
      
      for (const file of patternFiles) {
        if (!file.endsWith('.md') || file === 'CATALOG.md') continue;
        
        const content = await fs.readFile(path.join(this.patternsDir, file), 'utf8');
        
        if (content.toLowerCase().includes(query.toLowerCase())) {
          const nameMatch = content.match(/^#\s+(.+)$/m);
          const categoryMatch = content.match(/\*\*Category\*\*:\s*([^\n]+)/);
          
          results.push({
            file,
            name: nameMatch ? nameMatch[1] : file.replace('.md', ''),
            category: categoryMatch ? categoryMatch[1].trim() : 'unknown',
            path: path.join(this.patternsDir, file)
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Pattern search failed:', error.message);
      return [];
    }
  }

  /**
   * Get pattern by name
   */
  async getPattern(patternName) {
    const filename = patternName.toLowerCase().replace(/\s+/g, '-') + '.md';
    const filepath = path.join(this.patternsDir, filename);
    
    try {
      const content = await fs.readFile(filepath, 'utf8');
      return { success: true, content, path: filepath };
    } catch (error) {
      return { success: false, error: 'Pattern not found' };
    }
  }
}

module.exports = PatternLibraryManager;
