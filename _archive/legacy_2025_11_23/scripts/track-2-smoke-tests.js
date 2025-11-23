#!/usr/bin/env node

/**
 * Track 2: Staging Deployment Smoke Tests
 * Tests all critical endpoints after deployment
 */

import axios from 'axios';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

class SmokeTests {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  }

  async test(name, fn) {
    try {
      await fn();
      console.log(`${colors.green}✓${colors.reset} ${name}`);
      this.passed++;
      return true;
    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} ${name}`);
      console.log(`  Error: ${error.message}`);
      this.failed++;
      return false;
    }
  }

  async testEndpoint(name, method, url, data = null) {
    try {
      let response;
      if (method === 'GET') {
        response = await axios.get(url, { timeout: 5000 });
      } else if (method === 'POST') {
        response = await axios.post(url, data || {}, { timeout: 5000 });
      }
      
      if (response.status >= 200 && response.status < 300) {
        const time = response.headers['x-response-time'] || 'N/A';
        console.log(`${colors.green}✓${colors.reset} ${name} (${response.status})`);
        this.passed++;
        return true;
      }
    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} ${name}`);
      console.log(`  Error: ${error.message}`);
      this.failed++;
    }
    return false;
  }

  async runAll() {
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  TRACK 2: STAGING DEPLOYMENT SMOKE TESTS   ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}\n`);

    // Test 1: Web Server Health
    console.log(`${colors.blue}→${colors.reset} Web Server Health`);
    await this.testEndpoint('Health check', 'GET', 'http://127.0.0.1:3000/health');

    // Test 2: GitHub Endpoints
    console.log(`\n${colors.blue}→${colors.reset} GitHub Integration Endpoints`);
    await this.testEndpoint('GitHub status', 'GET', 'http://127.0.0.1:3000/api/v1/github/status');
    await this.testEndpoint('GitHub health', 'GET', 'http://127.0.0.1:3000/api/v1/github/health');

    // Test 3: Slack Endpoints
    console.log(`\n${colors.blue}→${colors.reset} Slack Integration Endpoints`);
    await this.testEndpoint('Slack status', 'GET', 'http://127.0.0.1:3000/api/v1/slack/status');
    await this.testEndpoint('Slack stats', 'GET', 'http://127.0.0.1:3000/api/v1/slack/notification-stats');

    // Test 4: System Status
    console.log(`\n${colors.blue}→${colors.reset} System Status Endpoints`);
    await this.testEndpoint('System awareness', 'GET', 'http://127.0.0.1:3000/api/v1/system/awareness');

    // Test 5: Training Server
    console.log(`\n${colors.blue}→${colors.reset} Training Server`);
    await this.testEndpoint('Training overview', 'GET', 'http://127.0.0.1:3001/api/v1/training/overview');

    // Test 6: Response times (all should be < 500ms)
    console.log(`\n${colors.blue}→${colors.reset} Performance Checks`);
    const start = Date.now();
    await axios.get('http://127.0.0.1:3000/api/v1/slack/status');
    const time = Date.now() - start;
    if (time < 500) {
      console.log(`${colors.green}✓${colors.reset} Response time < 500ms (${time}ms)`);
      this.passed++;
    } else {
      console.log(`${colors.red}✗${colors.reset} Response time exceeded 500ms (${time}ms)`);
      this.failed++;
    }

    // Summary
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset}  RESULTS: ${colors.green}${this.passed} PASSED${colors.reset}, ${this.failed > 0 ? colors.red : colors.green}${this.failed} FAILED${colors.reset}${' '.repeat(Math.max(0, 38 - String(this.passed).length - String(this.failed).length))}${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}\n`);

    return this.failed === 0;
  }
}

const tester = new SmokeTests();
tester.runAll().then(success => {
  process.exit(success ? 0 : 1);
});
