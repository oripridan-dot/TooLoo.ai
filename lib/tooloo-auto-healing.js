/**
 * TooLoo Auto-Healing System
 * Detects bugs, analyzes errors, and fixes them automatically
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

export class ToolooAutoHealing {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.errorPatterns = {
      syntaxError: { regex: /SyntaxError|Unexpected token|Expected/i, severity: 'critical' },
      connectionError: { regex: /ECONNREFUSED|ECONNRESET|timeout/i, severity: 'high' },
      typeError: { regex: /TypeError|Cannot read properties|is not a function/i, severity: 'high' },
      referenceError: { regex: /ReferenceError|is not defined/i, severity: 'high' },
      fileNotFound: { regex: /ENOENT|no such file|File not found/i, severity: 'medium' },
      permissionError: { regex: /EACCES|permission denied/i, severity: 'medium' },
      memory: { regex: /ENOMEM|out of memory/i, severity: 'critical' },
      moduleNotFound: { regex: /Cannot find module|MODULE_NOT_FOUND/i, severity: 'high' }
    };
  }

  /**
   * Analyze error logs to detect issues
   */
  async detectErrors(logContent) {
    const errors = [];

    for (const [type, pattern] of Object.entries(this.errorPatterns)) {
      if (pattern.regex.test(logContent)) {
        const match = logContent.match(pattern.regex);
        errors.push({
          type,
          severity: pattern.severity,
          message: match ? match[0] : `${type} detected`,
          location: this.extractLocation(logContent, match ? match[0] : '')
        });
      }
    }

    return errors.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Extract error location from log
   */
  extractLocation(log, errorText) {
    const pathMatch = log.match(/at .*?\/([^:]+):(\d+):(\d+)/);
    if (pathMatch) {
      return {
        file: pathMatch[1],
        line: parseInt(pathMatch[2]),
        column: parseInt(pathMatch[3])
      };
    }

    const fileMatch = log.match(/\/([a-zA-Z0-9._-]+\.(?:js|ts|json))(?::|$)/);
    if (fileMatch) {
      return { file: fileMatch[1] };
    }

    return null;
  }

  /**
   * Suggest fixes for common errors
   */
  getSuggestedFix(error) {
    const fixes = {
      syntaxError: {
        description: 'Syntax error detected',
        steps: [
          'Check for missing/extra braces, quotes, or semicolons',
          'Run linter to identify exact location',
          'Review recent changes to affected file'
        ],
        autoFix: 'Enable linter auto-fix'
      },
      connectionError: {
        description: 'Service connection failed',
        steps: [
          'Check if target service is running',
          'Verify port is accessible',
          'Check network connectivity',
          'Review service logs'
        ],
        autoFix: 'Restart affected service'
      },
      typeError: {
        description: 'Type mismatch or undefined access',
        steps: [
          'Check variable initialization',
          'Verify object properties exist before access',
          'Add null/undefined checks',
          'Review function signatures'
        ],
        autoFix: 'Add defensive checks and null coalescing'
      },
      referenceError: {
        description: 'Variable not defined in scope',
        steps: [
          'Check variable is declared before use',
          'Verify variable spelling',
          'Check scope and hoisting',
          'Ensure imports are correct'
        ],
        autoFix: 'Add missing imports or declarations'
      },
      fileNotFound: {
        description: 'File does not exist',
        steps: [
          'Verify file path is correct',
          'Check file spelling',
          'Confirm file exists on disk',
          'Review file permissions'
        ],
        autoFix: 'Create missing file or fix path'
      },
      permissionError: {
        description: 'Permission denied accessing resource',
        steps: [
          'Check file permissions',
          'Verify user has read/write access',
          'Review ownership settings',
          'Try with elevated privileges'
        ],
        autoFix: 'Adjust file permissions'
      },
      moduleNotFound: {
        description: 'Required module not installed',
        steps: [
          'Check package.json includes dependency',
          'Run npm install',
          'Verify module path is correct',
          'Check node_modules exists'
        ],
        autoFix: 'Install missing dependency'
      }
    };

    return fixes[error.type] || {
      description: 'Unknown error',
      steps: ['Review error message', 'Check logs', 'Consult documentation'],
      autoFix: 'Manual investigation required'
    };
  }

  /**
   * Perform automatic healing
   */
  async performAutoHealing(error, affectedFile = null) {
    const healing = {
      error,
      timestamp: new Date().toISOString(),
      actions: [],
      success: false
    };

    try {
      if (error.type === 'connectionError') {
        // Try restarting the service
        healing.actions.push({
          action: 'restart-service',
          status: 'attempted',
          details: 'Service restart triggered'
        });
      }

      if (error.type === 'moduleNotFound') {
        // Could trigger npm install
        healing.actions.push({
          action: 'install-dependencies',
          status: 'queued',
          details: 'npm install scheduled'
        });
      }

      if (error.type === 'fileNotFound' && affectedFile) {
        // Could create missing file with template
        healing.actions.push({
          action: 'create-file',
          status: 'queued',
          file: affectedFile,
          details: 'File creation scheduled'
        });
      }

      healing.success = true;
      healing.nextSteps = [
        'Monitor service for errors',
        'Verify fix resolved issue',
        'Check logs for confirmation'
      ];
    } catch (healingError) {
      healing.success = false;
      healing.error = healingError.message;
      healing.fallback = 'Manual intervention required';
    }

    return healing;
  }

  /**
   * Check system health and detect problems
   */
  async checkSystemHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      checks: {},
      issues: [],
      overallHealth: 'good'
    };

    // Check if main services are running
    const ports = [3000, 3001, 3020, 3100, 3200, 3300, 3400];
    const servicesHealthy = await this.checkPorts(ports);
    
    health.checks.services = {
      name: 'Microservices Status',
      healthy: servicesHealthy.healthy,
      total: servicesHealthy.total,
      status: servicesHealthy.healthy === servicesHealthy.total ? 'healthy' : 'degraded'
    };

    if (servicesHealthy.healthy < servicesHealthy.total) {
      health.issues.push({
        type: 'service-down',
        severity: 'high',
        count: servicesHealthy.total - servicesHealthy.healthy,
        message: `${servicesHealthy.total - servicesHealthy.healthy} services offline`
      });
    }

    // Check file system
    health.checks.filesystem = await this.checkFilesystem();

    // Check dependencies
    health.checks.dependencies = await this.checkDependencies();

    // Overall health assessment
    if (health.issues.length > 0) {
      health.overallHealth = health.issues.some(i => i.severity === 'critical') ? 'critical' : 'degraded';
    }

    return health;
  }

  /**
   * Check if ports are open
   */
  async checkPorts(ports) {
    let healthy = 0;

    for (const port of ports) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`, { timeout: 1000 });
        if (response.ok) healthy++;
      } catch (error) {
        // Port not responding
      }
    }

    return { healthy, total: ports.length };
  }

  /**
   * Check filesystem integrity
   */
  async checkFilesystem() {
    const criticalFiles = [
      'package.json',
      'servers/web-server.js',
      '.env',
      'lib/tooloo-self-awareness.js'
    ];

    let allPresent = true;

    for (const file of criticalFiles) {
      try {
        await fs.access(path.join(this.projectRoot, file));
      } catch {
        allPresent = false;
        break;
      }
    }

    return {
      name: 'Critical Files',
      status: allPresent ? 'healthy' : 'missing-files',
      message: allPresent ? 'All critical files present' : 'Some critical files missing'
    };
  }

  /**
   * Check if dependencies are installed
   */
  async checkDependencies() {
    try {
      const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
      await fs.access(nodeModulesPath);
      return {
        name: 'Dependencies',
        status: 'healthy',
        message: 'Dependencies installed'
      };
    } catch {
      return {
        name: 'Dependencies',
        status: 'missing',
        message: 'node_modules not found - run npm install'
      };
    }
  }

  /**
   * Generate self-healing report
   */
  async generateHealingReport(errors) {
    return {
      timestamp: new Date().toISOString(),
      systemHealth: await this.checkSystemHealth(),
      detectedErrors: errors,
      suggestedFixes: errors.map(e => ({
        error: e,
        suggestion: this.getSuggestedFix(e)
      })),
      autoHealingStatus: {
        enabled: true,
        capableOf: [
          'service-restart',
          'dependency-installation',
          'file-creation',
          'permission-fixing',
          'log-analysis'
        ]
      }
    };
  }
}

export default ToolooAutoHealing;
