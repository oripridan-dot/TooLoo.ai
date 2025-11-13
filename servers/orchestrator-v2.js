#!/usr/bin/env node
/**
 * Enhanced TooLoo.ai Orchestrator v2
 * Uses centralized service registry and advanced startup
 * Replaces old orchestrator.js with better control flow
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

async function start() {
  console.log('\n🎼 TooLoo.ai v2 Orchestrator (Tier-based Startup)\n');

  const tiers = getAllTiers();

  for (const tier of tiers) {
    const servicesInTier = getServicesByTier(tier);

    // Start all services in tier in parallel
    for (const svc of servicesInTier) {
      const filePath = path.join(PROJECT_ROOT, svc.file);

      if (!fs.existsSync(filePath)) {
        logger.event(svc.name, 'error', {
          message: `File not found: ${svc.file}`
        });
        continue;
      }

      supervisor.fork(svc);
    }

    // Wait for this tier to be healthy before moving to next
    console.log(`\n⏳ Tier ${tier}: Waiting for ${servicesInTier.length} service(s)...`);

    const waits = servicesInTier.map(svc =>
      healthChecker.waitForService(
        `http://127.0.0.1:${svc.port}${svc.endpoints.health}`,
        svc.name,
        { maxAttempts: 60, initialDelay: 100, maxDelay: 1000, timeout: svc.timeout }
      )
    );

    const results = await Promise.allSettled(waits);
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    console.log(`✅ Tier ${tier}: ${succeeded}/${servicesInTier.length} ready\n`);

    if (succeeded < servicesInTier.length && svc.required) {
      logger.event('orchestrator', 'warning', {
        message: `Tier ${tier}: Some required services failed to start`
      });
    }
  }

  logger.printSummary();

  // Keep process alive
  console.log('🌟 Orchestrator ready. Services running...\n');
  await new Promise(() => {});
}

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Orchestrator shutting down...');
  await supervisor.stopAll(5000);
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n\n🛑 Orchestrator shutting down...');
  await supervisor.stopAll(5000);
  process.exit(0);
});

start().catch(err => {
  logger.event('orchestrator', 'error', { message: err.message });
  console.error('Orchestrator failed:', err.message);
  process.exit(1);
});
