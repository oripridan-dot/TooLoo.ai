#!/usr/bin/env node
/**
 * safe-kill.js - Safely kill only our application servers without affecting VS Code
 * 
 * Usage:
 *   node scripts/safe-kill.js              # Kill all servers gracefully
 *   node scripts/safe-kill.js web          # Kill only web-server
 *   node scripts/safe-kill.js force        # Force kill (SIGKILL)
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Our application server patterns - ONLY these should be killed
const APP_SERVERS = [
  'web-server.js',
  'orchestrator.js',
  'training-server.js',
  'meta-server.js',
  'budget-server.js',
  'coach-server.js',
  'cup-server.js',
  'product-development-server.js',
  'segmentation-server.js',
  'reports-server.js',
  'capabilities-server.js',
];

// VS Code internal node processes we MUST NOT kill
const VSCODE_PROTECTED = [
  'vscode',
  'tsserver',
  'htmlServerMain',
  'jsonServerMain',
  'eslintServer',
  'bootstrap-fork',
  'extensionHost',
];

async function getPids() {
  try {
    const { stdout } = await execAsync('ps aux');
    const lines = stdout.split('\n');
    const pids = [];

    for (const line of lines) {
      // Skip VS Code processes
      if (VSCODE_PROTECTED.some(pattern => line.includes(pattern))) {
        continue;
      }

      // Match only our application servers
      for (const server of APP_SERVERS) {
        if (line.includes(`node servers/${server}`) && !line.includes('grep')) {
          const parts = line.split(/\s+/);
          const pid = parts[1];
          if (pid && !isNaN(pid)) {
            pids.push({ pid, server });
          }
        }
      }
    }

    return pids;
  } catch (error) {
    console.error('Error getting PIDs:', error.message);
    return [];
  }
}

async function killProcess(pid, force = false) {
  return new Promise((resolve) => {
    const signal = force ? 'SIGKILL' : 'SIGTERM';
    try {
      process.kill(pid, signal);
      console.log(`📍 Sent ${signal} to PID ${pid}`);
      resolve(true);
    } catch (error) {
      console.error(`❌ Error killing PID ${pid}: ${error.message}`);
      resolve(false);
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('force');
  const targetServer = args[0];

  console.log('🔍 Scanning for TooLoo.ai application servers...\n');

  const pids = await getPids();

  if (pids.length === 0) {
    console.log('✅ No TooLoo.ai servers running');
    process.exit(0);
  }

  console.log(`Found ${pids.length} server(s):\n`);

  // Filter by target if specified
  let filtered = pids;
  if (targetServer && targetServer !== 'force') {
    filtered = pids.filter(p => p.server.includes(targetServer));
    if (filtered.length === 0) {
      console.log(`❌ No servers matching "${targetServer}" found`);
      console.log(`Available: ${pids.map(p => p.server).join(', ')}`);
      process.exit(1);
    }
  }

  // Display what will be killed
  for (const { pid, server } of filtered) {
    console.log(`  • ${server.padEnd(30)} (PID: ${pid})`);
  }
  console.log();

  // Kill them
  const killMode = force ? '🔨 FORCE' : '🛑 GRACEFUL';
  console.log(`${killMode} shutdown in progress...\n`);

  for (const { pid } of filtered) {
    await killProcess(pid, force);
    // Give brief pause between kills
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n✅ Done. Servers stopped.');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
