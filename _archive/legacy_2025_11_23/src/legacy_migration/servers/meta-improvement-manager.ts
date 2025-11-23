const fs = require('fs').promises;
const path = require('path');

class MetaImprovementManager {
  constructor(filesystemManager, selfAwarenessManager) {
    this.fs = filesystemManager;
    this.selfAwareness = selfAwarenessManager;
    this.projectsDir = filesystemManager.projectsDir;
    this.templatesDir = path.join(filesystemManager.workspaceRoot, 'templates');
  }

  /**
   * Main evolution loop: Analyze -> Plan -> Execute
   */
  async evolve() {
    console.log('🧬 Starting self-evolution process...');
    
    try {
      const analysis = await this.analyzeProjects();
      const improvements = this.generateImprovements(analysis);
      
      if (improvements.length > 0) {
        const results = await this.applyImprovements(improvements);
        return { 
          success: true, 
          analysis,
          improvements: results 
        };
      }
      
      return { 
        success: true, 
        message: 'System is optimized. No new patterns detected to integrate.',
        analysis
      };
    } catch (error) {
      console.error('❌ Evolution failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze user projects to find common patterns
   */
  async analyzeProjects() {
    const projects = await this.fs.listDirectory(this.projectsDir);
    const projectStats = {
      total: 0,
      dependencies: {},
      files: {}
    };

    if (!projects.items) return projectStats;

    for (const item of projects.items) {
      if (item.isDirectory) {
        projectStats.total++;
        const projectPath = path.join(this.projectsDir, item.name);
        
        // Analyze package.json
        try {
          const pkgContent = await fs.readFile(path.join(projectPath, 'package.json'), 'utf8');
          const pkg = JSON.parse(pkgContent);
          const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
          
          for (const dep of Object.keys(allDeps)) {
            projectStats.dependencies[dep] = (projectStats.dependencies[dep] || 0) + 1;
          }
        } catch (e) {
          // No package.json or invalid
        }

        // Analyze file structure (shallow)
        try {
          const files = await fs.readdir(projectPath);
          for (const file of files) {
            projectStats.files[file] = (projectStats.files[file] || 0) + 1;
          }
        } catch (e) {}
      }
    }

    return projectStats;
  }

  /**
   * Decide what to improve based on analysis
   */
  generateImprovements(stats) {
    const improvements = [];
    const threshold = Math.max(2, Math.ceil(stats.total * 0.5)); // Used in >50% of projects (min 2)

    // Check for common dependencies to add to SaaS Starter
    for (const [dep, count] of Object.entries(stats.dependencies)) {
      if (count >= threshold) {
        improvements.push({
          type: 'update-template',
          target: 'saas-starter',
          action: 'add-dependency',
          payload: { name: dep, version: 'latest' }, // In real app, check version
          reason: `Dependency '${dep}' used in ${count}/${stats.total} projects`
        });
      }
    }

    // Check for common files (e.g., .env, Dockerfile)
    const commonFiles = ['Dockerfile', '.dockerignore', 'jsconfig.json', '.eslintrc.json'];
    for (const [file, count] of Object.entries(stats.files)) {
      if (commonFiles.includes(file) && count >= threshold) {
        improvements.push({
          type: 'update-template',
          target: 'saas-starter',
          action: 'add-file',
          payload: { filename: file },
          reason: `File '${file}' present in ${count}/${stats.total} projects`
        });
      }
    }

    return improvements;
  }

  /**
   * Apply the generated improvements
   */
  async applyImprovements(improvements) {
    const results = [];

    for (const imp of improvements) {
      try {
        if (imp.type === 'update-template' && imp.target === 'saas-starter') {
          const templatePath = path.join(this.templatesDir, 'saas-starter');
          
          if (imp.action === 'add-dependency') {
            const pkgPath = path.join(templatePath, 'package.json');
            const pkgContent = await fs.readFile(pkgPath, 'utf8');
            const pkg = JSON.parse(pkgContent);
            
            if (!pkg.dependencies[imp.payload.name]) {
              pkg.dependencies[imp.payload.name] = "^" + (imp.payload.version === 'latest' ? '1.0.0' : imp.payload.version);
              await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2));
              results.push(`✅ Added '${imp.payload.name}' to SaaS Starter (${imp.reason})`);
            }
          }
          
          // Handle other actions...
        }
      } catch (error) {
        results.push(`❌ Failed to apply '${imp.action}': ${error.message}`);
      }
    }

    return results;
  }
}

module.exports = MetaImprovementManager;
