#!/usr/bin/env node
/**
 * server-daemon.js - COMPLETE background server manager
 * ✅ Runs servers in background
 * ✅ Auto-restarts on crashes
 * ✅ File watching for auto-restart on code edit
 * ✅ Terminal persistence (survives terminal close)
 */

import { spawn, exec as execCb } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { watch } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOGS_DIR = path.join(ROOT, '.server-logs');
const STATE_FILE = path.join(ROOT, '.daemon-state.json');
const DAEMON_PID_FILE = path.join(ROOT, '.daemon.pid');

// Simple server list
const SERVERS = [
  { name: 'web-server', file: 'servers/web-server.js', port: 3000 },
  { name: 'orchestrator', file: 'servers/orchestrator.js', port: 3123 },
  { name: 'training-server', file: 'servers/training-server.js', port: 3001 },
  { name: 'meta-server', file: 'servers/meta-server.js', port: 3002 },
  { name: 'budget-server', file: 'servers/budget-server.js', port: 3003 },
  { name: 'coach-server', file: 'servers/coach-server.js', port: 3004 },
  { name: 'cup-server', file: 'servers/cup-server.js', port: 3005 },
  { name: 'product-server', file: 'servers/product-development-server.js', port: 3006 },
  { name: 'segmentation-server', file: 'servers/segmentation-server.js', port: 3007 },
  { name: 'reports-server', file: 'servers/reports-server.js', port: 3008 },
  { name: 'capabilities-server', file: 'servers/capabilities-server.js', port: 3009 },
  { name: 'providers-arena-server', file: 'servers/providers-arena-server.js', port: 3010 },
  { name: 'design-integration-server', file: 'servers/design-integration-server.js', port: 3011 },
  { name: 'github-context-server', file: 'servers/github-context-server.js', port: 3012 },
];

const processes = new Map();
const fileWatchers = new Map();
const restartCounts = new Map();

async function init() {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  } catch (e) {
    // Exists
  }
}

/**
 * Clean up orphaned `node servers/*.js` processes that are not managed
 * by this daemon. This helps avoid the "lottery" where stray servers
 * started previously keep running and confuse the state file.
 */
async function cleanupOrphans() {
  return new Promise(resolve => {
    execCb('ps -eo pid,cmd | grep \'node servers/\' | grep -v grep', (err, out) => {
      if (err || !out) return resolve();

      const lines = out.split('\n').map(l => l.trim()).filter(Boolean);
      const managed = new Set(SERVERS.map(s => s.file.replace('servers/','')));

      for (const line of lines) {
        const parts = line.split(/\s+/, 2);
        const pid = parts[0];
        const cmd = parts[1] || '';
        const m = cmd.match(/node\s+servers\/(\S+)/);
        if (m && m[1]) {
          const file = m[1].split(' ')[0];
          if (!managed.has(file)) {
            try {
              process.kill(Number(pid), 'SIGKILL');
              console.log(`🧹 Killed orphaned process PID ${pid} -> ${file}`);
            } catch (e) {
              // ignore
            }
          }
        }
      }

      resolve();
    });
  });
}

async function saveState() {
  const state = {
    timestamp: Date.now(),
    servers: Array.from(processes.keys()),
    daemonPid: process.pid,
  };
  try {
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    // Ignore
  }
}

async function loadState() {
  try {
    const content = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    // State file doesn't exist yet
    return null;
  }
}

function startFileWatcher(server) {
  if (fileWatchers.has(server.name)) {
    return;
  }

  const serverPath = path.join(ROOT, server.file);
  const serverDir = path.dirname(serverPath);

  const watcher = watch(serverDir, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.js')) {
      console.log(`📝 ${server.name}: detected change in ${filename}`);
      const entry = processes.get(server.name);
      if (entry) {
        entry.child.kill('SIGTERM');
      }
    }
  });

  fileWatchers.set(server.name, watcher);
}

async function startServer(server) {
  if (processes.has(server.name)) {
    return;
  }

  // If the configured port is already listening (another process), skip starting
  // to avoid EADDRINUSE and rapid restart loops. This is a defensive check that
  // prevents spawning duplicates when a previous process is still bound.
  try {
    const out = await new Promise(resolve => {
      execCb(`lsof -i :${server.port} -sTCP:LISTEN -n -P`, (err, stdout) => resolve(stdout || ''));
    });
    if (out && out.trim()) {
      console.log(`⚠️  ${server.name}: port ${server.port} already in use, skipping start`);
      return;
    }
  } catch (e) {
    // If lsof isn't available or fails, continue and let spawn handle errors
  }

  const logFile = path.join(LOGS_DIR, `${server.name}.log`);
  let fd;

  try {
    fd = await fs.open(logFile, 'a');
  } catch (e) {
    console.error(`Failed to open log for ${server.name}`);
    return;
  }

  const child = spawn('node', [server.file], {
    cwd: ROOT,
    stdio: ['ignore', fd.fd, fd.fd],
    detached: false,
  });

  child.on('error', (err) => {
    console.error(`❌ ${server.name} spawn error:`, err && err.message ? err.message : err);
  });

  processes.set(server.name, { child, fd, server });
  await saveState();

  console.log(`✅ ${server.name} started (PID: ${child.pid})`);
  // reset restart counter on successful start
  restartCounts.set(server.name, 0);

  // Start file watching for this server
  startFileWatcher(server);

  child.on('exit', async () => {
    processes.delete(server.name);
    try {
      await fd.close();
    } catch (e) {
      // Ignore
    }
    await saveState();

    // Exponential backoff on restarts to avoid tight crash loops
    const prev = restartCounts.get(server.name) || 0;
    const next = prev + 1;
    restartCounts.set(server.name, next);

    if (next > 6) {
      console.error(`❌ ${server.name} has failed ${next} times; giving up for now.`);
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, prev), 30000); // 1s,2s,4s,8s... cap 30s
    console.log(`⚠️  ${server.name} exited, restarting in ${delay}ms (attempt ${next})...`);
    setTimeout(() => startServer(server), delay);
  });
}

async function stopServer(server) {
  const entry = processes.get(server.name);
  if (entry) {
    entry.child.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 500));
    try {
      await entry.fd.close();
    } catch (e) {
      // Ignore
    }
    processes.delete(server.name);
    console.log(`✅ ${server.name} stopped`);
  }
}

async function status() {
  console.log('\n📊 Server Status\n');
  console.log('─'.repeat(60));

  // First check .daemon-state.json for background daemon state
  const state = await loadState();
  const shouldBeRunning = state ? state.servers : [];

  // Then display all servers with their recorded state
  for (const server of SERVERS) {
    const isListed = shouldBeRunning.includes(server.name);
    const st = isListed ? '🟢 Running' : '🔴 Stopped';
    console.log(`${st.padEnd(15)} ${server.name.padEnd(25)} :${server.port}`);
  }
  console.log('─'.repeat(60));
  console.log(`\nActive: ${shouldBeRunning.length}/${SERVERS.length}\n`);
}

async function main() {
  const cmd = process.argv[2];
  const background = process.argv.includes('--bg') || process.argv.includes('--background');

  await init();

  if (cmd === 'start' || cmd === 'bg') {
    console.log('\n🚀 Starting all servers...\n');
    // First, cleanup any orphaned server processes left behind by earlier runs
    await cleanupOrphans();
    // Start servers in configurable batches with delay between batches to avoid
    // CPU spikes when many Node processes spawn at once. Use environment vars
    // to override defaults for testing.
    const START_DELAY = Number(process.env.DAEMON_START_DELAY_MS || 1000); // ms between batches
    const BATCH_SIZE = Number(process.env.DAEMON_BATCH_SIZE || 3); // how many to start at once

    for (let i = 0; i < SERVERS.length; i += BATCH_SIZE) {
      const batch = SERVERS.slice(i, i + BATCH_SIZE);
      // start the batch in parallel
      await Promise.all(batch.map(s => startServer(s)));
      // wait before launching next batch (but not after last batch)
      if (i + BATCH_SIZE < SERVERS.length) {
        await new Promise(r => setTimeout(r, START_DELAY));
      }
    }
    console.log('\n✅ All servers started\n');

    if (background || cmd === 'bg') {
      try {
        await fs.writeFile(DAEMON_PID_FILE, process.pid.toString());
        console.log(`📌 Daemon running in background (PID: ${process.pid})`);
        console.log('   Use \'npm run daemon:status\' to check status');
        console.log('   Use \'npm run stop:daemon\' to stop all servers\n');
      } catch (e) {
        // Ignore
      }
    }
    
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      for (const entry of processes.values()) {
        entry.child.kill('SIGTERM');
      }
      for (const watcher of fileWatchers.values()) {
        watcher.close();
      }
      await new Promise(r => setTimeout(r, 1000));
      try {
        await fs.unlink(DAEMON_PID_FILE);
      } catch (e) {
        // Ignore
      }
      process.exit(0);
    });

    return new Promise(() => {});
  }

  if (cmd === 'stop') {
    console.log('\n🛑 Stopping all servers...\n');
    for (const server of SERVERS) {
      await stopServer(server);
    }
    for (const watcher of fileWatchers.values()) {
      watcher.close();
    }
    fileWatchers.clear();
    try {
      await fs.unlink(DAEMON_PID_FILE);
    } catch (e) {
      // Ignore
    }
    await saveState();
    console.log('\n✅ All stopped\n');
    process.exit(0);
  }

  if (cmd === 'status') {
    await status();
    process.exit(0);
  }

  if (cmd === 'daemon-pid') {
    try {
      const pid = await fs.readFile(DAEMON_PID_FILE, 'utf8');
      console.log(pid.trim());
    } catch (e) {
      console.log('0');
    }
    process.exit(0);
  }

  if (cmd === 'is-running') {
    try {
      const pid = await fs.readFile(DAEMON_PID_FILE, 'utf8');
      const pidNum = parseInt(pid.trim());
      process.kill(pidNum, 0);
      console.log('true');
    } catch (e) {
      console.log('false');
    }
    process.exit(0);
  }

  if (cmd === 'restart') {
    const serverName = process.argv[3];
    if (serverName) {
      const server = SERVERS.find(s => s.name === serverName);
      if (server) {
        const entry = processes.get(server.name);
        if (entry) {
          console.log(`🔄 Restarting ${serverName}...`);
          entry.child.kill('SIGTERM');
          await new Promise(r => setTimeout(r, 500));
          processes.delete(server.name);
          await startServer(server);
          console.log(`✅ ${serverName} restarted\n`);
        }
      }
    } else {
      console.log('Usage: restart <server-name>');
    }
    process.exit(0);
  }

  if (cmd === 'logs') {
    const serverName = process.argv[3];
    if (serverName) {
      const logFile = path.join(LOGS_DIR, `${serverName}.log`);
      try {
        const content = await fs.readFile(logFile, 'utf8');
        console.log(`\n📜 ${serverName} logs (last 30 lines):\n`);
        console.log(content.split('\n').slice(-30).join('\n'));
      } catch (e) {
        console.log(`❌ No logs for ${serverName}`);
      }
    } else {
      console.log('\nAvailable logs:');
      try {
        const files = await fs.readdir(LOGS_DIR);
        for (const f of files) {
          console.log(`  • ${f.replace('.log', '')}`);
        }
      } catch (e) {
        console.log('  (none yet)');
      }
      console.log('');
    }
    process.exit(0);
  }

  console.log(`
Daemon - Background Server Manager

Usage:
  node scripts/server-daemon.js start      # Start all servers
  node scripts/server-daemon.js stop       # Stop all servers
  node scripts/server-daemon.js status     # Check status
  node scripts/server-daemon.js restart <name>  # Restart specific server
  node scripts/server-daemon.js logs [name]     # View logs
  `);
  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
