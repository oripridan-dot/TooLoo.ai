#!/usr/bin/env node
/**
 * TooLoo.ai - Instruction Health Check Script
 * 
 * Quick health check for AI instruction files
 * Returns metrics and recommendations
 */

const fs = require('fs').promises;
const path = require('path');

class InstructionHealthChecker {
  constructor() {
    this.workspaceRoot = process.cwd();
    this.instructionFiles = [
      '.github/copilot-instructions.md',
      '.github/OPENAI-GPT-INSTRUCTIONS.md',
      '.github/CLAUDE-INSTRUCTIONS.md',
      '.github/GEMINI-INSTRUCTIONS.md'
    ];
  }

  /**
   * Run health check
   */
  async run() {
    console.log('🏥 TooLoo.ai Instruction Health Check');
    console.log('='.repeat(60));
    console.log('');

    const health = {
      overall: 'healthy',
      score: 0,
      files: [],
      recommendations: []
    };

    // Check each file
    for (const file of this.instructionFiles) {
      const fileHealth = await this.checkFile(file);
      health.files.push(fileHealth);
    }

    // Calculate overall score
    health.score = Math.floor(
      health.files.reduce((sum, f) => sum + f.score, 0) / health.files.length
    );

    // Determine overall health
    if (health.score >= 90) {
      health.overall = 'excellent';
    } else if (health.score >= 75) {
      health.overall = 'good';
    } else if (health.score >= 60) {
      health.overall = 'fair';
    } else {
      health.overall = 'poor';
    }

    // Generate recommendations
    health.recommendations = this.generateRecommendations(health);

    // Print results
    this.printResults(health);

    // Exit with appropriate code
    if (health.score < 60) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }

  /**
   * Check a single file
   */
  async checkFile(file) {
    const filePath = path.join(this.workspaceRoot, file);
    const health = {
      file,
      exists: false,
      size: 0,
      daysOld: 0,
      score: 0,
      issues: []
    };

    try {
      // Check existence
      const stats = await fs.stat(filePath);
      health.exists = true;
      health.size = stats.size;
      health.daysOld = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));

      // Read content
      const content = await fs.readFile(filePath, 'utf8');

      // Check size
      if (health.size < 1000) {
        health.issues.push('File too small (<1KB)');
      } else if (health.size > 50000) {
        health.issues.push('File very large (>50KB)');
      }

      // Check age
      if (health.daysOld > 60) {
        health.issues.push(`Very outdated (${health.daysOld} days)`);
      } else if (health.daysOld > 30) {
        health.issues.push(`Outdated (${health.daysOld} days)`);
      }

      // Check content quality
      const hasExamples = /```/.test(content);
      const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(content);
      const hasSections = /^#+\s+/m.test(content);

      if (!hasExamples) {
        health.issues.push('No code examples found');
      }
      if (!hasSections) {
        health.issues.push('No clear sections found');
      }

      // Calculate score
      let score = 100;
      score -= health.issues.length * 10;
      score = Math.max(0, score);
      health.score = score;

    } catch (error) {
      health.issues.push('File not found');
      health.score = 0;
    }

    return health;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(health) {
    const recommendations = [];

    // Check for outdated files
    const outdatedFiles = health.files.filter(f => f.daysOld > 30);
    if (outdatedFiles.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Update outdated files',
        files: outdatedFiles.map(f => f.file),
        command: 'npm run update-instructions'
      });
    }

    // Check for missing files
    const missingFiles = health.files.filter(f => !f.exists);
    if (missingFiles.length > 0) {
      recommendations.push({
        priority: 'critical',
        action: 'Create missing files',
        files: missingFiles.map(f => f.file),
        command: 'npm run update-instructions -- --force'
      });
    }

    // Check for files with issues
    const problematicFiles = health.files.filter(f => f.issues.length > 2);
    if (problematicFiles.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Fix file issues',
        files: problematicFiles.map(f => f.file),
        command: 'npm run validate-instructions'
      });
    }

    // Overall health recommendations
    if (health.score < 60) {
      recommendations.push({
        priority: 'critical',
        action: 'Overall health is poor - immediate attention needed',
        command: 'npm run update-instructions -- --force'
      });
    } else if (health.score < 75) {
      recommendations.push({
        priority: 'medium',
        action: 'Overall health is fair - improvements recommended',
        command: 'npm run update-instructions'
      });
    }

    return recommendations;
  }

  /**
   * Print health results
   */
  printResults(health) {
    // Overall status
    const statusEmoji = {
      excellent: '🌟',
      good: '✅',
      fair: '⚠️',
      poor: '❌'
    };

    console.log(`${statusEmoji[health.overall]} Overall Health: ${health.overall.toUpperCase()}`);
    console.log(`📊 Health Score: ${health.score}/100`);
    console.log('');

    // File details
    console.log('📄 File Status:');
    for (const file of health.files) {
      const icon = file.score >= 90 ? '✅' : file.score >= 75 ? '⚠️' : '❌';
      const name = path.basename(file.file);
      console.log(`   ${icon} ${name}`);
      console.log(`      Score: ${file.score}/100`);
      console.log(`      Size: ${this.formatSize(file.size)}`);
      console.log(`      Age: ${file.daysOld} days`);
      
      if (file.issues.length > 0) {
        console.log(`      Issues:`);
        file.issues.forEach(issue => console.log(`        • ${issue}`));
      }
      console.log('');
    }

    // Recommendations
    if (health.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      for (const rec of health.recommendations) {
        const priorityIcon = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢'
        };
        console.log(`   ${priorityIcon[rec.priority]} ${rec.action}`);
        if (rec.files) {
          console.log(`      Files: ${rec.files.map(f => path.basename(f)).join(', ')}`);
        }
        console.log(`      Run: ${rec.command}`);
        console.log('');
      }
    } else {
      console.log('✨ No recommendations - all files are healthy!');
      console.log('');
    }

    // Metrics summary
    console.log('📈 Metrics:');
    const avgAge = Math.floor(
      health.files.reduce((sum, f) => sum + f.daysOld, 0) / health.files.length
    );
    const totalIssues = health.files.reduce((sum, f) => sum + f.issues.length, 0);
    console.log(`   Average file age: ${avgAge} days`);
    console.log(`   Total issues: ${totalIssues}`);
    console.log(`   Files checked: ${health.files.length}`);
    console.log('');
  }

  /**
   * Format file size
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new InstructionHealthChecker();
  checker.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = InstructionHealthChecker;
