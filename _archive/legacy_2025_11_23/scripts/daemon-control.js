#!/usr/bin/env node
/**
 * daemon-control.js - Simple control script for server daemon
 *
 * Wraps server-daemon.js with better formatting and commands
 *
 * Usage:
 *   npm run daemon-control status
 *   npm run daemon-control start-web
 *   npm run daemon-control restart-all
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const commands = {
  'start-web': 'node scripts/server-daemon.js start web-server',
  'start-orch': 'node scripts/server-daemon.js start orchestrator',
  'start-all': 'node scripts/server-daemon.js start',
  'stop-web': 'node scripts/server-daemon.js stop web-server',
  'stop-orch': 'node scripts/server-daemon.js stop orchestrator',
  'stop-all': 'node scripts/server-daemon.js stop',
  'restart-web': 'node scripts/server-daemon.js restart web-server',
  'restart-orch': 'node scripts/server-daemon.js restart orchestrator',
  'restart-all': 'node scripts/server-daemon.js restart',
  'status': 'node scripts/server-daemon.js status',
  'logs-web': 'node scripts/server-daemon.js logs web-server',
  'logs-orch': 'node scripts/server-daemon.js logs orchestrator',
  'logs': 'node scripts/server-daemon.js logs',
};

async function main() {
  const cmd = process.argv[2];

  if (!cmd) {
    console.log(`
Daemon Control - Quick commands

Usage: npm run daemon-control <command>

Quick Commands:
  start-web         Start web-server
  start-orch        Start orchestrator
  start-all         Start all servers

  stop-web          Stop web-server
  stop-orch         Stop orchestrator
  stop-all          Stop all servers

  restart-web       Restart web-server
  restart-orch      Restart orchestrator
  restart-all       Restart all servers

  status            Show server status
  logs              List available logs
  logs-web          View web-server logs
  logs-orch         View orchestrator logs

Examples:
  npm run daemon-control start-all
  npm run daemon-control status
  npm run daemon-control logs-web
    `);
    return;
  }

  const command = commands[cmd];
  if (!command) {
    console.error(`Unknown command: ${cmd}`);
    console.error('Run \'npm run daemon-control\' for available commands');
    process.exit(1);
  }

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

main();
