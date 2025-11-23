#!/usr/bin/env node
/**
 * daemon-bg.js - Launch daemon in true background mode
 * Detaches from terminal and runs servers independently
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');


async function launchBackground() {
  const daemonScript = path.join(__dirname, 'server-daemon.js');

  // Spawn daemon in true background (detached from parent)
  const daemon = spawn('node', [daemonScript, 'bg'], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
  });

  // Allow parent to exit
  daemon.unref();

  console.log(`\n🚀 Daemon launched in background (PID: ${daemon.pid})`);
  console.log('   Servers running independently');
  console.log('   Check status: npm run daemon:status');
  console.log('   Stop daemon: npm run stop:daemon\n');

  // Give daemon time to write PID file before exiting
  await new Promise(r => setTimeout(r, 500));
}

launchBackground().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
