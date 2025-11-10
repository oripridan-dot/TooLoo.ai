#!/usr/bin/env node
/**
 * Codespace Startup Diagnostics
 * Identifies specific issues preventing system from starting
 */

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const ports = {
  web: 3000,
  training: 3001,
  meta: 3002,
  budget: 3003,
  coach: 3004,
  cup: 3005,
  product: 3006,
  segmentation: 3007,
  reports: 3008,
  capabilities: 3009,
  arena: 3011,
  design: 3014,
  orchestrator: 3123,
};

// Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const log = (level, msg) => {
  const timestamp = new Date().toLocaleTimeString();
  const icons = { ERROR: '❌', WARN: '⚠️ ', OK: '✅', INFO: 'ℹ️ ', TEST: '🔍' };
  const colors = { ERROR: RED, WARN: YELLOW, OK: GREEN, INFO: CYAN, TEST: CYAN };
  console.log(`${colors[level]}[${timestamp}] ${icons[level]} ${msg}${RESET}`);
};

// Check if port is listening
function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: '/health', timeout: 2000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Check if a process is running on port
function checkProcessOnPort(port) {
  return new Promise((resolve) => {
    const proc = spawn('lsof', ['-ti:' + port]);
    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString().trim();
    });
    proc.on('close', () => {
      resolve(output ? parseInt(output) : null);
    });
  });
}

// Get file stats
function getFileStats(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return { exists: true, size: stats.size, modified: new Date(stats.mtime).toLocaleString() };
  } catch {
    return { exists: false };
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   TooLoo.ai Codespace Startup Diagnostics');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Phase 1: Check file structure
  log('TEST', 'Phase 1/5: Checking file structure');
  const requiredFiles = [
    'servers/web-server.js',
    'servers/orchestrator.js',
    'servers/training-server.js',
    'servers/meta-server.js',
    'servers/budget-server.js',
    'servers/coach-server.js',
    'package.json',
  ];

  for (const file of requiredFiles) {
    const stat = getFileStats(file);
    if (stat.exists) {
      log('OK', `${file} (${stat.size} bytes)`);
    } else {
      log('ERROR', `${file} - MISSING`);
    }
  }

  // Phase 2: Check Node.js
  log('TEST', '\nPhase 2/5: Checking Node.js runtime');
  const nodeVersion = spawn('node', ['-v']);
  let version = '';
  nodeVersion.stdout.on('data', (data) => {
    version += data.toString().trim();
  });
  await new Promise((resolve) => nodeVersion.on('close', resolve));
  log('OK', `Node.js ${version} available`);

  // Phase 3: Check ports currently in use
  log('TEST', '\nPhase 3/5: Checking port availability');
  for (const [name, port] of Object.entries(ports)) {
    const pid = await checkProcessOnPort(port);
    if (pid) {
      log('WARN', `Port ${port} (${name}) - already in use by PID ${pid}`);
    } else {
      log('OK', `Port ${port} (${name}) - available`);
    }
  }

  // Phase 4: Attempt startup
  log('TEST', '\nPhase 4/5: Starting web-server...');
  const webServerProc = spawn('node', ['servers/web-server.js'], { 
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10000
  });

  let webStarted = false;
  let webError = '';
  let webOutput = '';

  webServerProc.stdout.on('data', (data) => {
    webOutput += data.toString();
  });
  webServerProc.stderr.on('data', (data) => {
    webError += data.toString();
  });

  // Wait for web server to be ready
  let webAttempts = 0;
  while (webAttempts < 20) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await checkPort(3000)) {
      webStarted = true;
      log('OK', 'Web-server responding on port 3000');
      break;
    }
    webAttempts++;
  }

  if (!webStarted) {
    log('ERROR', 'Web-server failed to start');
    if (webError) {
      log('ERROR', `Stderr: ${webError.substring(0, 500)}`);
    }
    if (webOutput) {
      log('ERROR', `Stdout: ${webOutput.substring(0, 500)}`);
    }
    webServerProc.kill();
  }

  // Phase 5: Test key endpoints
  log('TEST', '\nPhase 5/5: Testing critical endpoints');
  const endpoints = [
    { path: '/health', name: 'Health' },
    { path: '/api/v1/system/routes', name: 'Routes' },
    { path: '/control-room', name: 'Control Room' },
    { path: '/tooloo-chat', name: 'Chat' },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:3000${endpoint.path}`, { timeout: 5000 }, (res) => {
          resolve(res.statusCode);
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });

      if (response === 200) {
        log('OK', `GET ${endpoint.path} (${endpoint.name})`);
      } else {
        log('WARN', `GET ${endpoint.path} (${endpoint.name}) - returned ${response}`);
      }
    } catch (err) {
      log('ERROR', `GET ${endpoint.path} (${endpoint.name}) - ${err.message}`);
    }
  }

  // Cleanup
  webServerProc.kill();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   Diagnostics complete. Summary above ↑');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
