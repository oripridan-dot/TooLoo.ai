#!/usr/bin/env node

/**
 * Track 2: Continuous Staging Monitoring Dashboard
 * Monitors system health, performance, and stability during 24-48h period
 * Run this periodically: every 4 hours or when needed
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

class StagingMonitor {
  constructor() {
    this.logFile = '/tmp/staging-monitoring.log';
    this.metricsFile = '/tmp/staging-metrics.json';
    this.startTime = Date.now();
    this.checks = [];
    this.metrics = {
      startTime: new Date().toISOString(),
      checks: [],
      endpoints: {},
      errors: [],
      warnings: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logEntry);
    
    try {
      fs.appendFileSync(this.logFile, logEntry + '\n');
    } catch (e) {
      // Ignore write errors
    }
  }

  async checkEndpoint(name, url, method = 'GET', timeout = 5000) {
    const startTime = Date.now();
    try {
      let response;
      if (method === 'GET') {
        response = await axios.get(url, { timeout });
      } else {
        response = await axios.post(url, {}, { timeout });
      }
      
      const duration = Date.now() - startTime;
      const status = response.status;
      const success = status >= 200 && status < 300;

      this.metrics.endpoints[name] = {
        status,
        duration,
        timestamp: new Date().toISOString(),
        success
      };

      if (success) {
        console.log(`${colors.green}✓${colors.reset} ${name.padEnd(40)} ${duration}ms ${colors.gray}(${status})${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠${colors.reset} ${name.padEnd(40)} ${duration}ms ${colors.yellow}(${status})${colors.reset}`);
        this.metrics.warnings.push(`${name}: HTTP ${status}`);
      }

      // Performance check
      if (duration > 500) {
        this.metrics.warnings.push(`${name}: Slow response (${duration}ms)`);
      }

      return success;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`${colors.red}✗${colors.reset} ${name.padEnd(40)} ${colors.red}${error.message}${colors.reset}`);
      this.metrics.errors.push(`${name}: ${error.message}`);
      this.metrics.endpoints[name] = {
        status: 0,
        duration,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      };
      return false;
    }
  }

  async checkProcesses() {
    console.log(`\n${colors.blue}→${colors.reset} Process Status`);
    try {
      const { execSync } = await import('child_process');
      
      const processes = [
        { name: 'web-server', port: 3000 },
        { name: 'orchestrator', port: 3123 },
        { name: 'training-server', port: 3001 }
      ];

      for (const proc of processes) {
        try {
          const output = execSync(`lsof -i :${proc.port} 2>/dev/null | grep node | wc -l`).toString().trim();
          const running = parseInt(output) > 0;
          if (running) {
            console.log(`${colors.green}✓${colors.reset} ${proc.name.padEnd(20)} Port ${proc.port} - running`);
            this.metrics.warnings.push(`${proc.name} running on port ${proc.port}`);
          } else {
            console.log(`${colors.red}✗${colors.reset} ${proc.name.padEnd(20)} Port ${proc.port} - NOT running`);
            this.metrics.errors.push(`${proc.name} not running on port ${proc.port}`);
          }
        } catch (e) {
          // Process check failed
        }
      }
    } catch (e) {
      console.log(`${colors.gray}  (Process check skipped)${colors.reset}`);
    }
  }

  async runAll() {
    const monitorTime = new Date().toISOString();
    
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  STAGING MONITORING DASHBOARD                      ║${colors.reset}`);
    console.log(`${colors.cyan}║  ${monitorTime.substring(0, 44).padEnd(48)}║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Check processes
    await this.checkProcesses();

    // Check endpoints
    console.log(`\n${colors.blue}→${colors.reset} Endpoint Health`);
    const endpoints = [
      ['Web Server Health', 'http://127.0.0.1:3000/health'],
      ['Slack Status', 'http://127.0.0.1:3000/api/v1/slack/status'],
      ['Slack Stats', 'http://127.0.0.1:3000/api/v1/slack/notification-stats'],
      ['GitHub Health', 'http://127.0.0.1:3000/api/v1/github/health'],
      ['System Awareness', 'http://127.0.0.1:3000/api/v1/system/awareness'],
      ['Training Overview', 'http://127.0.0.1:3001/api/v1/training/overview'],
    ];

    let passed = 0;
    for (const [name, url] of endpoints) {
      const success = await this.checkEndpoint(name, url);
      if (success) passed++;
    }

    // Check response time
    console.log(`\n${colors.blue}→${colors.reset} Performance Metrics`);
    const times = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      try {
        await axios.get('http://127.0.0.1:3000/api/v1/slack/status', { timeout: 5000 });
        times.push(Date.now() - start);
      } catch (e) {
        // Ignored
      }
    }

    if (times.length > 0) {
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      console.log(`${colors.green}✓${colors.reset} Average response time: ${avg}ms`);
      console.log(`  Min: ${min}ms | Max: ${max}ms`);

      if (avg > 500) {
        this.metrics.warnings.push(`Average response time high: ${avg}ms`);
      }
    }

    // Summary
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset}  Summary: ${passed}/${endpoints.length} endpoints healthy`);
    
    if (this.metrics.errors.length === 0) {
      console.log(`${colors.cyan}║${colors.reset}  Status: ${colors.green}✓ NO ERRORS${colors.reset}`);
    } else {
      console.log(`${colors.cyan}║${colors.reset}  Status: ${colors.red}✗ ${this.metrics.errors.length} ERRORS${colors.reset}`);
    }

    if (this.metrics.warnings.length > 0) {
      console.log(`${colors.cyan}║${colors.reset}  Warnings: ${this.metrics.warnings.length}`);
    }

    console.log(`${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Save metrics
    try {
      fs.writeFileSync(this.metricsFile, JSON.stringify(this.metrics, null, 2));
    } catch (e) {
      // Ignore
    }

    this.log(`Monitoring check completed. Endpoints: ${passed}/${endpoints.length} healthy`);

    return this.metrics.errors.length === 0;
  }
}

const monitor = new StagingMonitor();
monitor.runAll().then(success => {
  process.exit(success ? 0 : 1);
});
