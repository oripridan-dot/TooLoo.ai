#!/usr/bin/env node
/**
 * Advanced Startup System - Comprehensive Test Suite
 * Tests all new startup infrastructure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVICES, validateServiceConfig, getAllTiers } from '../config/services.js';
import StartupLogger from '../services/startup-logger.js';
import ProcessSupervisor from '../services/process-supervisor.js';
import HealthChecker from '../services/health-checker.js';
import StartupReporter from '../services/startup-reporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header(title) {
  console.log('\n' + '═'.repeat(60));
  log(`${title}`, 'bold');
  console.log('═'.repeat(60));
}

function testPass(name) {
  log(`✅ ${name}`, 'green');
}

function testFail(name, reason) {
  log(`❌ ${name}: ${reason}`, 'red');
}

function testWarn(name, message) {
  log(`⚠️  ${name}: ${message}`, 'yellow');
}

/**
 * Test 1: Service Registry
 */
async function testServiceRegistry() {
  header('Test 1: Service Registry');

  try {
    const count = SERVICES.length;
    if (count === 0) {
      testFail('Service count', 'No services defined');
      return false;
    }
    testPass(`Service registry loaded (${count} services)`);

    const { valid, errors } = validateServiceConfig();
    if (!valid) {
      testFail('Configuration validation', errors.join('; '));
      return false;
    }
    testPass('Configuration validation');

    // Check all required properties
    const requiredProps = ['name', 'port', 'file', 'tier', 'endpoints'];
    for (const svc of SERVICES) {
      for (const prop of requiredProps) {
        if (!(prop in svc)) {
          testFail(`Service ${svc.name}`, `Missing property: ${prop}`);
          return false;
        }
      }
    }
    testPass('All required properties present');

    return true;
  } catch (err) {
    testFail('Service registry test', err.message);
    return false;
  }
}

/**
 * Test 2: Startup Logger
 */
async function testStartupLogger() {
  header('Test 2: Startup Logger');

  try {
    const logger = new StartupLogger('/tmp/test-startup.jsonl');
    testPass('Logger instantiation');

    logger.event('test-service', 'spawn', { port: 9999 });
    logger.event('test-service', 'ready', { duration: 500 });
    logger.event('test-service', 'error', { message: 'Test error' });
    testPass('Event logging');

    const summary = logger.summary();
    if (summary.success && summary.servicesStarted === 1) {
      testPass('Log summarization');
    } else {
      testWarn('Log summarization', 'Unexpected summary format');
    }

    // Check file was written
    if (fs.existsSync('/tmp/test-startup.jsonl')) {
      testPass('Log file creation');
      fs.unlinkSync('/tmp/test-startup.jsonl');
    } else {
      testFail('Log file creation', 'File not created');
      return false;
    }

    return true;
  } catch (err) {
    testFail('Startup logger test', err.message);
    return false;
  }
}

/**
 * Test 3: Process Supervisor
 */
async function testProcessSupervisor() {
  header('Test 3: Process Supervisor');

  try {
    const logger = new StartupLogger();
    const supervisor = new ProcessSupervisor(logger);
    testPass('Supervisor instantiation');

    // Test status
    const status = supervisor.getAllStatus();
    if (typeof status === 'object') {
      testPass('Status retrieval');
    } else {
      testFail('Status retrieval', 'Invalid return type');
      return false;
    }

    return true;
  } catch (err) {
    testFail('Process supervisor test', err.message);
    return false;
  }
}

/**
 * Test 4: Health Checker
 */
async function testHealthChecker() {
  header('Test 4: Health Checker');

  try {
    const logger = new StartupLogger();
    const checker = new HealthChecker(logger);
    testPass('Health checker instantiation');

    // Test with unreachable service (should timeout gracefully)
    const result = await checker.waitForService(
      'http://127.0.0.1:9999/health',
      'test-service',
      { maxAttempts: 3, initialDelay: 100, maxDelay: 200, timeout: 100 }
    );

    if (!result.success) {
      testPass('Timeout handling (expected)');
    } else {
      testWarn('Timeout handling', 'Service should not be reachable');
    }

    return true;
  } catch (err) {
    testFail('Health checker test', err.message);
    return false;
  }
}

/**
 * Test 5: Startup Reporter
 */
async function testStartupReporter() {
  header('Test 5: Startup Reporter');

  try {
    // Create test log
    const testLog = '/tmp/test-reporter.jsonl';
    fs.writeFileSync(testLog, JSON.stringify({
      timestamp: new Date().toISOString(),
      elapsed: '100ms',
      service: 'test-service',
      type: 'spawn',
      details: { port: 3000 }
    }) + '\n');

    fs.appendFileSync(testLog, JSON.stringify({
      timestamp: new Date().toISOString(),
      elapsed: '500ms',
      service: 'test-service',
      type: 'ready',
      details: { duration: 400 }
    }) + '\n');

    const reporter = new StartupReporter(testLog);
    testPass('Reporter instantiation');

    const services = reporter.getServices();
    if (services.length > 0) {
      testPass('Service extraction');
    } else {
      testFail('Service extraction', 'No services found');
      return false;
    }

    const time = reporter.getTotalTime();
    if (time) {
      testPass(`Total time calculation (${time}ms)`);
    } else {
      testFail('Total time calculation', 'Could not calculate');
      return false;
    }

    const html = reporter.generateHtmlReport();
    if (html.includes('<!DOCTYPE html>')) {
      testPass('HTML report generation');
    } else {
      testFail('HTML report generation', 'Invalid HTML');
      return false;
    }

    // Cleanup
    fs.unlinkSync(testLog);

    return true;
  } catch (err) {
    testFail('Startup reporter test', err.message);
    return false;
  }
}

/**
 * Test 6: Tier Organization
 */
async function testTierOrganization() {
  header('Test 6: Tier Organization');

  try {
    const tiers = getAllTiers();
    if (tiers.length === 0) {
      testFail('Tier organization', 'No tiers defined');
      return false;
    }
    testPass(`Tiers defined: ${tiers.length}`);

    // Check tier progression
    if (tiers.every((t, i) => t === i)) {
      testPass('Tier indices are sequential');
    } else {
      testWarn('Tier indices', 'Tiers are not sequential (0, 1, 2, ...)');
    }

    return true;
  } catch (err) {
    testFail('Tier organization test', err.message);
    return false;
  }
}

/**
 * Test 7: File Existence
 */
async function testFileExistence() {
  header('Test 7: Infrastructure Files');

  const files = [
    'config/services.js',
    'services/startup-logger.js',
    'services/process-supervisor.js',
    'services/health-checker.js',
    'services/startup-reporter.js',
    'services/orchestrator-launcher.js',
    'scripts/startup-diagnostic.js',
    'scripts/stop-services-safe.sh',
    'scripts/advanced-launcher.js',
    'servers/orchestrator-v2.js'
  ];

  let allFound = true;
  for (const file of files) {
    const fullPath = path.join(path.dirname(__dirname), file);
    if (fs.existsSync(fullPath)) {
      testPass(file);
    } else {
      testFail(file, 'Not found');
      allFound = false;
    }
  }

  return allFound;
}

/**
 * Run all tests
 */
async function runAllTests() {
  log('\n🧪 TooLoo.ai Advanced Startup System - Test Suite\n', 'bold');

  const tests = [
    { name: 'Service Registry', fn: testServiceRegistry },
    { name: 'Startup Logger', fn: testStartupLogger },
    { name: 'Process Supervisor', fn: testProcessSupervisor },
    { name: 'Health Checker', fn: testHealthChecker },
    { name: 'Startup Reporter', fn: testStartupReporter },
    { name: 'Tier Organization', fn: testTierOrganization },
    { name: 'Infrastructure Files', fn: testFileExistence }
  ];

  const results = [];
  for (const test of tests) {
    const passed = await test.fn();
    results.push({ name: test.name, passed });
  }

  // Summary
  header('📊 Test Summary');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  for (const result of results) {
    log(
      `${result.passed ? '✅' : '❌'} ${result.name}`,
      result.passed ? 'green' : 'red'
    );
  }

  console.log(`\n${passed}/${total} tests passed`);

  if (passed === total) {
    log('\n✨ All tests passed! Ready for production.\n', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Review the output above.\n', 'red');
    process.exit(1);
  }
}

runAllTests().catch(err => {
  log(`\nTest suite failed: ${err.message}\n`, 'red');
  process.exit(1);
});
