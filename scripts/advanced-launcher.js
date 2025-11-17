#!/usr/bin/env node
/**
 * Advanced TooLoo.ai Launcher
 * Parallel tier-based startup with auto-restart and diagnostics
 * Replaces launch-tooloo.sh with JavaScript for better control
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVICES, getServicesByTier, getAllTiers } from '../config/services.js';
import StartupLogger from '../services/startup-logger.js';
import ProcessSupervisor from '../services/process-supervisor.js';
import HealthChecker from '../services/health-checker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Setup
const logger = new StartupLogger();
const supervisor = new ProcessSupervisor(logger);
const healthChecker = new HealthChecker(logger);
let totalStartTime = Date.now();

// Color codes
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

/**
 * Wait for all services in a tier to be healthy
 */
async function waitForTierServices(tier, maxWaitMs = 60000) {
  const services = getServicesByTier(tier);
  const startTime = Date.now();

  const waits = services.map(svc =>
    healthChecker.waitForService(
      `http://127.0.0.1:${svc.port}${svc.endpoints.health}`,
      svc.name,
      {
        maxAttempts: 60,
        initialDelay: 100,
        maxDelay: 1000,
        timeout: svc.timeout
      }
    ).then(result => ({
      service: svc,
      result
    }))
  );

  const results = await Promise.allSettled(waits);
  const elapsed = Date.now() - startTime;

  const successful = results.filter(
    r => r.status === 'fulfilled' && r.value.result.success
  );

  const failed = results.filter(
    r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.result.success)
  );

  return {
    successful: successful.map(r => r.value.service),
    failed: failed.map(r => r.value?.service?.name || 'unknown'),
    elapsed,
    totalTime: Date.now() - totalStartTime
  };
}

/**
 * Start all services in a tier (in parallel)
 */
function startTierServices(tier) {
  const services = getServicesByTier(tier);

  for (const svc of services) {
    const filePath = path.join(PROJECT_ROOT, svc.file);

    // Check file exists
    if (!fs.existsSync(filePath)) {
      logger.event(svc.name, 'error', {
        message: `Service file not found: ${svc.file}`
      });
      continue;
    }

    // Spawn the service
    supervisor.fork(svc);
  }
}

/**
 * Main startup orchestration
 */
async function runStartup() {
  log('\n🚀 TooLoo.ai Advanced Launcher\n', 'bold');
  log(`Starting ${SERVICES.length} services across ${getAllTiers().length} tiers`, 'blue');

  const tiers = getAllTiers();
  const tierResults = [];

  // Start each tier
  for (const tier of tiers) {
    header(`📍 Tier ${tier} Startup`);

    const servicesInTier = getServicesByTier(tier);
    log(`Services: ${servicesInTier.map(s => s.name).join(', ')}`, 'blue');

    // Start all services in this tier in parallel
    startTierServices(tier);

    // Wait for all to become healthy
    log(`⏳ Waiting for ${servicesInTier.length} service(s) to be ready...`, 'yellow');

    const tierResult = await waitForTierServices(tier);
    tierResults.push({ tier, ...tierResult });

    if (tierResult.successful.length > 0) {
      log(
        `✅ Tier ${tier}: ${tierResult.successful.length} ready (${tierResult.elapsed}ms)`,
        'green'
      );
    }

    if (tierResult.failed.length > 0) {
      log(
        `⚠️  Tier ${tier}: ${tierResult.failed.length} failed or timeout: ${tierResult.failed.join(', ')}`,
        'yellow'
      );
    }
  }

  // Final summary
  header('📊 Startup Summary');

  const allSuccessful = tierResults.flatMap(t => t.successful);
  const allFailed = tierResults.flatMap(t => t.failed);

  log(`Total Time: ${Date.now() - totalStartTime}ms`, 'bold');
  log(`Services Started: ${allSuccessful.length}/${SERVICES.length}`, 'green');

  if (allFailed.length > 0) {
    log(`Failed/Timeout: ${allFailed.join(', ')}`, 'red');
  }

  // Show running services
  console.log('\n📡 Running Services:');
  const status = supervisor.getAllStatus();
  for (const [name, info] of Object.entries(status)) {
    if (info.running) {
      const svc = SERVICES.find(s => s.name === name);
      log(`  ✅ ${name.padEnd(30)} (port ${svc?.port})`, 'green');
    }
  }

  // Print full summary to log
  logger.printSummary();

  // Access points
  console.log('\n🌐 Access Points:');
  const baseUrl = 'http://127.0.0.1:3000';
  log(`  🏠 Hub:           ${baseUrl}`, 'blue');
  log(`  🎛️  Control Room: ${baseUrl}/control-room`, 'blue');
  log(`  💬 Chat:          ${baseUrl}/tooloo-chat`, 'blue');
  log(`  🔍 System Status: ${baseUrl}/system/status`, 'blue');

  // Help text
  console.log('\n📝 Useful Commands:');
  log('  npm run stop:all            Stop all services', 'reset');
  log('  npm run startup:diagnose    Run diagnostics', 'reset');
  log('  tail -f /tmp/tooloo-startup.jsonl   Watch logs', 'reset');

  // Keep process alive
  console.log('\n✨ Startup complete! Press Ctrl+C to stop all services.\n');

  // Graceful shutdown on interrupt
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Stopping all services...');
    await supervisor.stopAll(5000);
    log('✅ All services stopped', 'green');
    process.exit(0);
  });

  // Keep process running
  await new Promise(() => {});
}

/**
 * Error handling
 */
process.on('uncaughtException', (err) => {
  logger.event('launcher', 'error', { message: err.message });
  log(`\n❌ Fatal error: ${err.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.event('launcher', 'error', { message: String(reason) });
  log(`\n❌ Unhandled rejection: ${reason}`, 'red');
  process.exit(1);
});

// Run
runStartup().catch(err => {
  log(`\n❌ Startup failed: ${err.message}`, 'red');
  process.exit(1);
});
