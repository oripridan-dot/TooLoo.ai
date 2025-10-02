#!/usr/bin/env node
/**
 * TooLoo.ai - AI Instruction Update Script
 * 
 * Analyzes codebase changes and updates AI agent instruction files
 * to keep them synchronized with the current implementation.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class InstructionUpdater {
  constructor() {
    this.workspaceRoot = process.cwd();
    this.instructionFiles = [
      '.github/copilot-instructions.md',
      '.github/OPENAI-GPT-INSTRUCTIONS.md',
      '.github/CLAUDE-INSTRUCTIONS.md',
      '.github/GEMINI-INSTRUCTIONS.md'
    ];
    this.maintenanceFile = '.github/INSTRUCTION-MAINTENANCE.md';
  }

  /**
   * Main update workflow
   */
  async run(options = {}) {
    console.log('📚 TooLoo.ai Instruction Updater');
    console.log('='.repeat(60));

    try {
      // Parse command line options
      const force = options.force || process.argv.includes('--force');
      const dryRun = options.dryRun || process.argv.includes('--dry-run');
      const provider = options.provider || this.getProviderArg();

      console.log(`Mode: ${dryRun ? 'DRY RUN' : force ? 'FORCE UPDATE' : 'SMART UPDATE'}`);
      if (provider) console.log(`Provider: ${provider}`);
      console.log('');

      // Step 1: Analyze codebase changes
      console.log('🔍 Step 1: Analyzing codebase changes...');
      const analysis = await this.analyzeCodebase();
      this.printAnalysis(analysis);

      // Step 2: Determine if update is needed
      if (!force && !analysis.updateNeeded) {
        console.log('\n✅ All instruction files are up to date!');
        console.log('💡 Use --force to update anyway');
        return;
      }

      // Step 3: Validate existing files
      console.log('\n🔍 Step 2: Validating existing instruction files...');
      const validation = await this.validateInstructions();
      this.printValidation(validation);

      // Step 4: Generate updates
      console.log('\n✍️  Step 3: Generating instruction updates...');
      const updates = await this.generateUpdates(analysis, provider);
      
      if (updates.length === 0) {
        console.log('ℹ️  No updates needed');
        return;
      }

      console.log(`📝 Generated ${updates.length} update(s)`);

      // Step 5: Preview or apply
      if (dryRun) {
        console.log('\n📋 DRY RUN - Changes that would be made:');
        this.printUpdates(updates);
        console.log('\n💡 Remove --dry-run to apply changes');
      } else {
        console.log('\n💾 Step 4: Applying updates...');
        await this.applyUpdates(updates);
        console.log('\n✅ All updates applied successfully!');
        
        // Step 6: Validate updated files
        console.log('\n🔍 Step 5: Validating updated files...');
        const postValidation = await this.validateInstructions();
        this.printValidation(postValidation);
      }

      console.log('\n' + '='.repeat(60));
      console.log('✨ Instruction update complete!');

    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Analyze codebase for changes requiring instruction updates
   */
  async analyzeCodebase() {
    const analysis = {
      updateNeeded: false,
      reasons: [],
      stats: {},
      changes: {}
    };

    try {
      // Get git changes in last 7 days
      const gitLog = execSync('git log --since="7 days ago" --oneline', { 
        encoding: 'utf8',
        cwd: this.workspaceRoot 
      }).trim();
      
      const commitCount = gitLog ? gitLog.split('\n').length : 0;
      analysis.stats.commits = commitCount;

      // Check for API endpoint changes
      const apiChanges = execSync(
        'git diff HEAD~5..HEAD -- simple-api-server.js | grep -E "app\\.(get|post|put|delete)" || true',
        { encoding: 'utf8', cwd: this.workspaceRoot }
      ).trim();

      if (apiChanges) {
        analysis.updateNeeded = true;
        analysis.reasons.push('API endpoint changes detected');
        analysis.changes.api = apiChanges.split('\n').length;
      }

      // Check package.json changes
      const packageChanges = execSync(
        'git diff HEAD~5..HEAD -- package.json || true',
        { encoding: 'utf8', cwd: this.workspaceRoot }
      ).trim();

      if (packageChanges) {
        analysis.updateNeeded = true;
        analysis.reasons.push('Dependencies changed');
        analysis.changes.packages = packageChanges.split('\n').filter(l => 
          l.includes('+') && l.includes('dependencies')
        ).length;
      }

      // Check file age
      for (const file of this.instructionFiles) {
        const filePath = path.join(this.workspaceRoot, file);
        try {
          const stats = await fs.stat(filePath);
          const age = Date.now() - stats.mtime.getTime();
          const daysOld = Math.floor(age / (1000 * 60 * 60 * 24));
          
          if (daysOld > 30) {
            analysis.updateNeeded = true;
            analysis.reasons.push(`${file} is ${daysOld} days old`);
          }
        } catch (error) {
          analysis.updateNeeded = true;
          analysis.reasons.push(`${file} not found`);
        }
      }

    } catch (error) {
      console.warn('⚠️  Git analysis failed:', error.message);
    }

    return analysis;
  }

  /**
   * Validate instruction files
   */
  async validateInstructions() {
    const results = {
      valid: true,
      files: []
    };

    for (const file of this.instructionFiles) {
      const filePath = path.join(this.workspaceRoot, file);
      const validation = {
        file,
        exists: false,
        readable: false,
        hasRequiredSections: false,
        linksValid: true,
        score: 0
      };

      try {
        // Check existence and readability
        const content = await fs.readFile(filePath, 'utf8');
        validation.exists = true;
        validation.readable = true;

        // Check required sections
        const requiredSections = [
          'Quick Context',
          'Architecture',
          'API Endpoints',
          'Development Workflow',
          'Key Files'
        ];

        const hasAllSections = requiredSections.every(section => 
          content.toLowerCase().includes(section.toLowerCase())
        );
        validation.hasRequiredSections = hasAllSections;

        // Calculate score
        validation.score = [
          validation.exists,
          validation.readable,
          validation.hasRequiredSections,
          validation.linksValid
        ].filter(Boolean).length * 25;

      } catch (error) {
        validation.error = error.message;
        results.valid = false;
      }

      results.files.push(validation);
    }

    return results;
  }

  /**
   * Generate instruction updates
   */
  async generateUpdates(analysis, specificProvider = null) {
    const updates = [];
    const timestamp = new Date().toISOString();

    for (const file of this.instructionFiles) {
      // Skip if specific provider requested and this isn't it
      if (specificProvider && !file.includes(specificProvider.toUpperCase())) {
        continue;
      }

      const filePath = path.join(this.workspaceRoot, file);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        
        // Update "Last Updated" timestamp
        const updatedContent = content.replace(
          /\*\*Last Updated\*\*:.*$/m,
          `**Last Updated**: ${timestamp.split('T')[0]}`
        );

        if (updatedContent !== content) {
          updates.push({
            file,
            type: 'timestamp',
            before: content,
            after: updatedContent,
            backup: `${filePath}.backup.${Date.now()}`
          });
        }

      } catch (error) {
        console.warn(`⚠️  Could not read ${file}:`, error.message);
      }
    }

    return updates;
  }

  /**
   * Apply updates with backups
   */
  async applyUpdates(updates) {
    for (const update of updates) {
      const filePath = path.join(this.workspaceRoot, update.file);
      
      try {
        // Create backup
        await fs.writeFile(update.backup, update.before, 'utf8');
        console.log(`  📦 Backup: ${path.basename(update.backup)}`);
        
        // Apply update
        await fs.writeFile(filePath, update.after, 'utf8');
        console.log(`  ✅ Updated: ${update.file}`);
        
      } catch (error) {
        console.error(`  ❌ Failed to update ${update.file}:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Get provider from command line args
   */
  getProviderArg() {
    const providerArg = process.argv.find(arg => arg.startsWith('--provider='));
    return providerArg ? providerArg.split('=')[1] : null;
  }

  /**
   * Print analysis results
   */
  printAnalysis(analysis) {
    console.log(`  Commits (last 7 days): ${analysis.stats.commits || 0}`);
    
    if (analysis.changes.api) {
      console.log(`  API changes: ${analysis.changes.api} lines`);
    }
    
    if (analysis.changes.packages) {
      console.log(`  Package changes: ${analysis.changes.packages} dependencies`);
    }

    if (analysis.reasons.length > 0) {
      console.log('\n  Update reasons:');
      analysis.reasons.forEach(reason => console.log(`    • ${reason}`));
    }

    console.log(`\n  Update needed: ${analysis.updateNeeded ? '✅ Yes' : '⏸️  No'}`);
  }

  /**
   * Print validation results
   */
  printValidation(validation) {
    for (const file of validation.files) {
      const icon = file.score === 100 ? '✅' : file.score >= 75 ? '⚠️' : '❌';
      console.log(`  ${icon} ${file.file} - Score: ${file.score}/100`);
      
      if (file.error) {
        console.log(`     Error: ${file.error}`);
      } else {
        if (!file.hasRequiredSections) {
          console.log(`     Missing required sections`);
        }
      }
    }
  }

  /**
   * Print update preview
   */
  printUpdates(updates) {
    for (const update of updates) {
      console.log(`\n  📝 ${update.file}`);
      console.log(`     Type: ${update.type}`);
      console.log(`     Backup: ${path.basename(update.backup)}`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const updater = new InstructionUpdater();
  updater.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = InstructionUpdater;
