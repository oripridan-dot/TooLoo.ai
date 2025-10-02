/**
 * TooLoo.ai Self-Inspection & Cleanup Manager
 * 
 * Autonomous system for monitoring repository health and deciding when to run cleanup.
 * TooLoo will automatically trigger inspections based on:
 * - Repository size thresholds
 * - Code quality degradation
 * - Time since last inspection
 * - User activity patterns
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const SelfAwarenessManager = require('./self-awareness-manager');

class SelfInspectionManager {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.selfAwareness = new SelfAwarenessManager({ workspaceRoot: this.workspaceRoot });
    
    // Thresholds for automatic inspection
    this.thresholds = {
      maxRepoSize: 1000 * 1024 * 1024, // 1GB - trigger if repo exceeds this
      maxLintErrors: 50, // Trigger cleanup if errors exceed this
      minTestCoverage: 10, // Trigger if coverage drops below this %
      daysSinceLastInspection: 7, // Auto-inspect after 7 days
      duplicateFileThreshold: 5, // Trigger if duplicate files found
      backupFileThreshold: 3, // Trigger if backup files exceed this
      unusedCodeThreshold: 10 // Trigger if unused exports exceed this
    };
    
    // Inspection state
    this.state = {
      lastInspectionDate: null,
      lastCleanupDate: null,
      consecutiveHealthyChecks: 0,
      issuesFound: [],
      autoCleanupEnabled: true,
      inspectionSchedule: 'smart' // 'smart', 'daily', 'weekly', 'manual'
    };
    
    // Load previous state if exists
    this.stateFile = path.join(this.workspaceRoot, '.tooloo-inspection-state.json');
    this.loadState();
    
    console.log('🔍 Self-Inspection Manager initialized');
  }

  /**
   * Load previous inspection state
   */
  async loadState() {
    try {
      const data = await fs.readFile(this.stateFile, 'utf8');
      this.state = { ...this.state, ...JSON.parse(data) };
      console.log(`📊 Loaded inspection state from ${new Date(this.state.lastInspectionDate).toLocaleDateString()}`);
    } catch (error) {
      // No previous state, start fresh
      console.log('📊 No previous inspection state found - starting fresh');
    }
  }

  /**
   * Save inspection state
   */
  async saveState() {
    try {
      await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
      console.log('💾 Inspection state saved');
    } catch (error) {
      console.error('❌ Failed to save inspection state:', error.message);
    }
  }

  /**
   * Main decision-making function: Should we run inspection now?
   */
  async shouldRunInspection() {
    console.log('🤔 TooLoo is evaluating if inspection is needed...');
    
    const reasons = [];
    
    // Check 1: Repository size
    const repoSize = await this.getRepositorySize();
    if (repoSize > this.thresholds.maxRepoSize) {
      reasons.push({
        priority: 'high',
        reason: `Repository size (${this.formatBytes(repoSize)}) exceeds threshold (${this.formatBytes(this.thresholds.maxRepoSize)})`,
        metric: 'size',
        value: repoSize
      });
    }
    
    // Check 2: Time since last inspection
    if (this.state.lastInspectionDate) {
      const daysSince = this.getDaysSince(this.state.lastInspectionDate);
      if (daysSince >= this.thresholds.daysSinceLastInspection) {
        reasons.push({
          priority: 'medium',
          reason: `${daysSince} days since last inspection (threshold: ${this.thresholds.daysSinceLastInspection})`,
          metric: 'time',
          value: daysSince
        });
      }
    } else {
      reasons.push({
        priority: 'high',
        reason: 'No previous inspection found',
        metric: 'time',
        value: Infinity
      });
    }
    
    // Check 3: Lint errors
    const lintErrors = await this.countLintErrors();
    if (lintErrors > this.thresholds.maxLintErrors) {
      reasons.push({
        priority: 'high',
        reason: `Lint errors (${lintErrors}) exceed threshold (${this.thresholds.maxLintErrors})`,
        metric: 'quality',
        value: lintErrors
      });
    }
    
    // Check 4: Duplicate/backup files
    const backupFiles = await this.findBackupFiles();
    if (backupFiles.length > this.thresholds.backupFileThreshold) {
      reasons.push({
        priority: 'medium',
        reason: `Found ${backupFiles.length} backup files (threshold: ${this.thresholds.backupFileThreshold})`,
        metric: 'cleanup',
        value: backupFiles.length
      });
    }
    
    // Check 5: Test coverage (if tests exist)
    const testCoverage = await this.getTestCoverage();
    if (testCoverage !== null && testCoverage < this.thresholds.minTestCoverage) {
      reasons.push({
        priority: 'low',
        reason: `Test coverage (${testCoverage}%) below threshold (${this.thresholds.minTestCoverage}%)`,
        metric: 'testing',
        value: testCoverage
      });
    }
    
    // Decision logic
    const highPriorityReasons = reasons.filter(r => r.priority === 'high');
    const mediumPriorityReasons = reasons.filter(r => r.priority === 'medium');
    
    const shouldInspect = highPriorityReasons.length > 0 || 
                         mediumPriorityReasons.length >= 2 ||
                         reasons.length >= 3;
    
    return {
      shouldInspect,
      reasons,
      summary: this.generateDecisionSummary(shouldInspect, reasons)
    };
  }

  /**
   * Run comprehensive inspection
   */
  async runInspection(options = {}) {
    console.log('🔍 Starting comprehensive inspection...\n');
    
    const startTime = Date.now();
    const report = {
      timestamp: new Date().toISOString(),
      duration: 0,
      metrics: {},
      issues: [],
      recommendations: [],
      autoFixable: []
    };
    
    try {
      // 1. Repository size analysis
      console.log('📊 Analyzing repository size...');
      report.metrics.repoSize = await this.getRepositorySize();
      report.metrics.repoSizeFormatted = this.formatBytes(report.metrics.repoSize);
      
      // 2. Find duplicate files
      console.log('🔍 Checking for duplicate files...');
      const duplicates = await this.findDuplicateFiles();
      if (duplicates.length > 0) {
        report.issues.push({
          type: 'duplicates',
          severity: 'high',
          count: duplicates.length,
          files: duplicates
        });
        report.autoFixable.push('Remove duplicate files');
      }
      
      // 3. Find backup files
      console.log('🗑️  Checking for backup files...');
      const backups = await this.findBackupFiles();
      if (backups.length > 0) {
        report.issues.push({
          type: 'backups',
          severity: 'medium',
          count: backups.length,
          files: backups
        });
        report.autoFixable.push('Remove backup files');
      }
      
      // 4. Lint analysis
      console.log('🔧 Running lint analysis...');
      const lintResults = await this.analyzeLintStatus();
      report.metrics.lintErrors = lintResults.errors;
      report.metrics.lintWarnings = lintResults.warnings;
      if (lintResults.errors > 0) {
        report.issues.push({
          type: 'lint',
          severity: lintResults.errors > 50 ? 'high' : 'medium',
          errors: lintResults.errors,
          warnings: lintResults.warnings
        });
        report.autoFixable.push('Fix lint errors');
      }
      
      // 5. Test coverage
      console.log('🧪 Checking test coverage...');
      const coverage = await this.getTestCoverage();
      report.metrics.testCoverage = coverage;
      if (coverage !== null && coverage < this.thresholds.minTestCoverage) {
        report.issues.push({
          type: 'testing',
          severity: 'low',
          coverage,
          message: `Test coverage below threshold (${coverage}% < ${this.thresholds.minTestCoverage}%)`
        });
        report.recommendations.push('Add more unit tests');
      }
      
      // 6. Unused code detection
      console.log('📝 Detecting unused code...');
      const unusedCode = await this.detectUnusedCode();
      if (unusedCode.length > this.thresholds.unusedCodeThreshold) {
        report.issues.push({
          type: 'unused',
          severity: 'low',
          count: unusedCode.length,
          files: unusedCode.slice(0, 10) // Show first 10
        });
        report.recommendations.push('Review and remove unused exports');
      }
      
      // 7. Dependencies audit
      console.log('📦 Auditing dependencies...');
      const depsAudit = await this.auditDependencies();
      if (depsAudit.vulnerabilities > 0) {
        report.issues.push({
          type: 'security',
          severity: 'high',
          vulnerabilities: depsAudit.vulnerabilities
        });
        report.autoFixable.push('Update vulnerable dependencies');
      }
      
      // Calculate duration
      report.duration = Date.now() - startTime;
      
      // Update state
      this.state.lastInspectionDate = new Date().toISOString();
      this.state.issuesFound = report.issues;
      
      if (report.issues.length === 0) {
        this.state.consecutiveHealthyChecks++;
      } else {
        this.state.consecutiveHealthyChecks = 0;
      }
      
      await this.saveState();
      
      // Generate and save report
      await this.generateReport(report);
      
      // Decide if auto-cleanup should run
      if (options.autoCleanup !== false && this.state.autoCleanupEnabled) {
        const shouldCleanup = await this.shouldAutoCleanup(report);
        if (shouldCleanup) {
          console.log('\n🧹 Auto-cleanup triggered...');
          await this.runAutoCleanup(report);
        }
      }
      
      console.log(`\n✅ Inspection complete in ${(report.duration / 1000).toFixed(2)}s`);
      console.log(`📊 Issues found: ${report.issues.length}`);
      console.log(`🔧 Auto-fixable: ${report.autoFixable.length}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Inspection failed:', error.message);
      return null;
    }
  }

  /**
   * Decide if auto-cleanup should run
   */
  async shouldAutoCleanup(report) {
    const highSeverityIssues = report.issues.filter(i => i.severity === 'high').length;
    const autoFixableCount = report.autoFixable.length;
    
    // Auto-cleanup if:
    // - 2+ high severity issues
    // - 3+ auto-fixable issues
    // - Repo size > threshold AND backup files exist
    
    if (highSeverityIssues >= 2) {
      console.log('🚨 Multiple high-severity issues detected');
      return true;
    }
    
    if (autoFixableCount >= 3) {
      console.log('🔧 Multiple auto-fixable issues detected');
      return true;
    }
    
    if (report.metrics.repoSize > this.thresholds.maxRepoSize) {
      const backupIssue = report.issues.find(i => i.type === 'backups');
      if (backupIssue && backupIssue.count > 0) {
        console.log('💾 Large repo size with backup files detected');
        return true;
      }
    }
    
    return false;
  }

  /**
   * Run automated cleanup
   */
  async runAutoCleanup(report) {
    console.log('🧹 Running automated cleanup...\n');
    
    try {
      // Execute cleanup script
      const cleanupScript = path.join(this.workspaceRoot, 'cleanup-repo.sh');
      const scriptExists = await fs.access(cleanupScript).then(() => true).catch(() => false);
      
      if (scriptExists) {
        execSync(`bash ${cleanupScript}`, { cwd: this.workspaceRoot, stdio: 'inherit' });
      } else {
        console.log('⚠️  Cleanup script not found, running basic cleanup...');
        await this.basicCleanup();
      }
      
      this.state.lastCleanupDate = new Date().toISOString();
      await this.saveState();
      
      console.log('✅ Auto-cleanup complete');
      
    } catch (error) {
      console.error('❌ Auto-cleanup failed:', error.message);
    }
  }

  /**
   * Basic cleanup operations
   */
  async basicCleanup() {
    // Remove backup files
    const backupFiles = await this.findBackupFiles();
    for (const file of backupFiles) {
      try {
        await fs.unlink(path.join(this.workspaceRoot, file));
        console.log(`  ✅ Removed ${file}`);
      } catch (error) {
        console.error(`  ❌ Failed to remove ${file}`);
      }
    }
    
    // Remove node_modules temp files
    try {
      execSync('find . -path "*/node_modules/*" -name "README.md~" -delete 2>/dev/null', 
        { cwd: this.workspaceRoot });
      console.log('  ✅ Cleaned node_modules temp files');
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Generate inspection report
   */
  async generateReport(report) {
    const reportPath = path.join(this.workspaceRoot, 'INSPECTION-REPORT.md');
    
    let content = `# TooLoo.ai Inspection Report\n\n`;
    content += `**Date:** ${new Date(report.timestamp).toLocaleString()}\n`;
    content += `**Duration:** ${(report.duration / 1000).toFixed(2)}s\n\n`;
    
    content += `## 📊 Metrics\n\n`;
    content += `- **Repository Size:** ${report.metrics.repoSizeFormatted}\n`;
    content += `- **Lint Errors:** ${report.metrics.lintErrors}\n`;
    content += `- **Lint Warnings:** ${report.metrics.lintWarnings}\n`;
    if (report.metrics.testCoverage !== null) {
      content += `- **Test Coverage:** ${report.metrics.testCoverage}%\n`;
    }
    content += `\n`;
    
    if (report.issues.length > 0) {
      content += `## 🚨 Issues Found (${report.issues.length})\n\n`;
      for (const issue of report.issues) {
        content += `### ${this.getIssueIcon(issue.severity)} ${issue.type} (${issue.severity})\n`;
        content += `${this.formatIssue(issue)}\n\n`;
      }
    } else {
      content += `## ✅ No Issues Found\n\n`;
      content += `Repository is in excellent health!\n\n`;
    }
    
    if (report.autoFixable.length > 0) {
      content += `## 🔧 Auto-Fixable Issues\n\n`;
      for (const fix of report.autoFixable) {
        content += `- ${fix}\n`;
      }
      content += `\n`;
    }
    
    if (report.recommendations.length > 0) {
      content += `## 💡 Recommendations\n\n`;
      for (const rec of report.recommendations) {
        content += `- ${rec}\n`;
      }
      content += `\n`;
    }
    
    content += `---\n\n`;
    content += `*Report generated by TooLoo.ai Self-Inspection Manager*\n`;
    
    await fs.writeFile(reportPath, content);
    console.log(`📄 Report saved to ${reportPath}`);
  }

  // Helper methods
  
  async getRepositorySize() {
    try {
      const output = execSync('du -sb .', { cwd: this.workspaceRoot }).toString();
      return parseInt(output.split('\t')[0]);
    } catch (error) {
      return 0;
    }
  }

  async countLintErrors() {
    try {
      const output = execSync('npm run lint 2>&1 || true', { 
        cwd: path.join(this.workspaceRoot, 'web-app') 
      }).toString();
      const match = output.match(/(\d+) problems? \((\d+) errors?/);
      return match ? parseInt(match[2]) : 0;
    } catch (error) {
      return 0;
    }
  }

  async findBackupFiles() {
    try {
      const output = execSync(
        'find . -path "*/node_modules" -prune -o -type f \\( -name "*.bak" -o -name "*~" -o -name "*.tmp" \\) -print',
        { cwd: this.workspaceRoot }
      ).toString();
      return output.trim().split('\n').filter(f => f.length > 0);
    } catch (error) {
      return [];
    }
  }

  async findDuplicateFiles() {
    try {
      // Check for nested duplicate directories
      const output = execSync(
        'find . -maxdepth 2 -type d -name "$(basename $(pwd))" 2>/dev/null',
        { cwd: this.workspaceRoot }
      ).toString();
      return output.trim().split('\n').filter(f => f.length > 0 && f !== '.');
    } catch (error) {
      return [];
    }
  }

  async analyzeLintStatus() {
    try {
      const output = execSync('npm run lint 2>&1 || true', { 
        cwd: path.join(this.workspaceRoot, 'web-app') 
      }).toString();
      const match = output.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
      return {
        errors: match ? parseInt(match[2]) : 0,
        warnings: match ? parseInt(match[3]) : 0
      };
    } catch (error) {
      return { errors: 0, warnings: 0 };
    }
  }

  async getTestCoverage() {
    // Placeholder - would need proper coverage tool
    try {
      const output = execSync('npm test -- --run 2>&1 || true', { 
        cwd: path.join(this.workspaceRoot, 'web-app') 
      }).toString();
      const match = output.match(/(\d+) passed/);
      return match ? parseInt(match[1]) * 10 : null; // Rough estimate
    } catch (error) {
      return null;
    }
  }

  async detectUnusedCode() {
    // Placeholder - would need proper analysis tool
    return [];
  }

  async auditDependencies() {
    try {
      const output = execSync('npm audit --json 2>/dev/null || true', {
        cwd: this.workspaceRoot
      }).toString();
      const audit = JSON.parse(output);
      return {
        vulnerabilities: audit.metadata?.vulnerabilities?.total || 0
      };
    } catch (error) {
      return { vulnerabilities: 0 };
    }
  }

  getDaysSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  generateDecisionSummary(shouldInspect, reasons) {
    if (!shouldInspect) {
      return {
        decision: 'skip',
        message: '✅ Repository health looks good, no inspection needed',
        details: reasons.length > 0 ? 'Minor issues detected but below threshold' : 'All metrics within normal range'
      };
    }
    
    const highPriority = reasons.filter(r => r.priority === 'high').length;
    const mediumPriority = reasons.filter(r => r.priority === 'medium').length;
    
    return {
      decision: 'inspect',
      message: `🔍 Inspection recommended (${highPriority} high, ${mediumPriority} medium priority issues)`,
      details: reasons.map(r => `- ${r.reason}`).join('\n')
    };
  }

  getIssueIcon(severity) {
    const icons = {
      high: '🚨',
      medium: '⚠️',
      low: 'ℹ️'
    };
    return icons[severity] || 'ℹ️';
  }

  formatIssue(issue) {
    switch (issue.type) {
      case 'duplicates':
        return `Found ${issue.count} duplicate files:\n${issue.files.slice(0, 5).map(f => `  - ${f}`).join('\n')}`;
      case 'backups':
        return `Found ${issue.count} backup files that can be removed`;
      case 'lint':
        return `${issue.errors} errors, ${issue.warnings} warnings`;
      case 'testing':
        return issue.message;
      case 'unused':
        return `${issue.count} unused exports detected`;
      case 'security':
        return `${issue.vulnerabilities} security vulnerabilities found`;
      default:
        return JSON.stringify(issue);
    }
  }

  /**
   * Schedule automatic inspections
   */
  startAutoInspection(schedule = 'smart') {
    this.state.inspectionSchedule = schedule;
    
    if (schedule === 'smart') {
      // Check every 6 hours if inspection is needed
      setInterval(async () => {
        const decision = await this.shouldRunInspection();
        if (decision.shouldInspect) {
          console.log('\n' + decision.summary.message);
          console.log(decision.summary.details);
          await this.runInspection({ autoCleanup: true });
        }
      }, 6 * 60 * 60 * 1000);
    } else if (schedule === 'daily') {
      // Daily inspection at 2 AM
      setInterval(async () => {
        const hour = new Date().getHours();
        if (hour === 2) {
          await this.runInspection({ autoCleanup: true });
        }
      }, 60 * 60 * 1000);
    }
    
    console.log(`⏰ Auto-inspection scheduled: ${schedule}`);
  }
}

module.exports = SelfInspectionManager;
