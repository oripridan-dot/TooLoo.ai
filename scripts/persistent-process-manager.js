#!/usr/bin/env node

/**
 * TooLoo.ai Persistent Process Manager
 * 
 * Keeps services running across npm run dev cycles
 * Uses Node's child_process with auto-restart logic
 * Provides unified logging and health monitoring
 * 
 * Usage:
 *   node scripts/persistent-process-manager.js start
 *   node scripts/persistent-process-manager.js stop
 *   node scripts/persistent-process-manager.js status
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOG_DIR = path.join(PROJECT_ROOT, 'logs', 'processes');
const STATE_FILE = path.join(PROJECT_ROOT, '.process-state.json');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Process configuration
 * Only essential services to avoid overhead
 * Web server is already managed by launch-tooloo.sh
 */
const ESSENTIAL_SERVICES = [
  {
    id: 'web',
    name: 'web-server',
    script: 'servers/web-server.js',
    port: 3000,
    restartDelay: 2000,
    maxRestarts: 5,
    restartWindow: 30000 // Reset restart count after 30s
  },
  {
    id: 'orchestrator',
    name: 'orchestrator',
    script: 'servers/orchestrator.js',
    port: 3123,
    restartDelay: 3000,
    maxRestarts: 3,
    restartWindow: 30000
  }
];

class ProcessManager {
  constructor() {
    this.processes = new Map();
    this.restartCounts = new Map();
    this.lastRestartTime = new Map();
    this.running = false;
  }

  /**
   * Start a service
   */
  startService(service) {
    return new Promise((resolve) => {
      console.log(`\n⏳ Starting ${service.name} (port ${service.port})...`);

      const logFile = path.join(LOG_DIR, `${service.id}.log`);
      const logStream = fs.createWriteStream(logFile, { flags: 'a' });

      const env = {
        ...process.env,
        NODE_ENV: 'development',
        [`${service.id.toUpperCase()}_PORT`]: service.port
      };

      const child = spawn('node', [path.join(PROJECT_ROOT, service.script)], {
        cwd: PROJECT_ROOT,
        env: env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Log stdout/stderr
      child.stdout.pipe(logStream);
      child.stderr.pipe(logStream);

      child.on('error', (error) => {
        console.error(`  ❌ Failed to start ${service.name}:`, error.message);
        this.scheduleRestart(service);
        resolve(false);
      });

      child.on('exit', (code) => {
        if (code !== 0 && this.running) {
          console.log(`  ⚠️  ${service.name} exited with code ${code}`);
          this.scheduleRestart(service);
        } else if (code === 0) {
          console.log(`  ✅ ${service.name} exited cleanly`);
        }
      });

      this.processes.set(service.id, {
        child: child,
        service: service,
        startTime: Date.now(),
        pid: child.pid
      });

      // Wait for service to be ready
      setTimeout(() => {
        console.log(`  ✅ ${service.name} started (PID: ${child.pid})`);
        resolve(true);
      }, 1000);
    });
  }

  /**
   * Schedule service restart with exponential backoff
   */
  scheduleRestart(service) {
    const now = Date.now();
    const lastRestart = this.lastRestartTime.get(service.id) || 0;
    const count = this.restartCounts.get(service.id) || 0;

    // Reset count if restart window has passed
    if (now - lastRestart > service.restartWindow) {
      this.restartCounts.set(service.id, 0);
    } else if (count >= service.maxRestarts) {
      console.error(`  ❌ ${service.name} exceeded max restart attempts (${service.maxRestarts})`);
      console.error(`     Manual intervention required. Check logs: ${LOG_DIR}/${service.id}.log`);
      return;
    }

    this.restartCounts.set(service.id, count + 1);
    this.lastRestartTime.set(service.id, now);

    const delay = service.restartDelay * (count + 1); // Exponential backoff
    console.log(`  🔄 Scheduling restart in ${delay}ms (attempt ${count + 1}/${service.maxRestarts})`);

    setTimeout(() => {
      if (this.running) {
        this.startService(service);
      }
    }, delay);
  }

  /**
   * Stop all services
   */
  stopAll() {
    console.log('\n🛑 Stopping all services...');
    this.running = false;

    this.processes.forEach((proc, serviceId) => {
      console.log(`   Stopping ${proc.service.name} (PID: ${proc.pid})`);
      try {
        proc.child.kill('SIGTERM');
      } catch (e) {
        console.error(`   ❌ Failed to stop ${serviceId}:`, e.message);
      }
    });

    this.processes.clear();
    this.restartCounts.clear();
    this.lastRestartTime.clear();
    console.log('✅ All services stopped');
  }

  /**
   * Get status
   */
  getStatus() {
    const status = {
      running: this.running,
      timestamp: new Date().toISOString(),
      processes: []
    };

    this.processes.forEach((proc) => {
      status.processes.push({
        id: proc.service.id,
        name: proc.service.name,
        port: proc.service.port,
        pid: proc.pid,
        uptime: Date.now() - proc.startTime,
        restartCount: this.restartCounts.get(proc.service.id) || 0,
        healthy: proc.child.exitCode === null // null = still running
      });
    });

    return status;
  }

  /**
   * Start all services
   */
  async startAll() {
    console.log('\n🚀 Starting TooLoo.ai Process Manager');
    console.log('=====================================\n');

    this.running = true;

    for (const service of ESSENTIAL_SERVICES) {
      await this.startService(service);
      // Stagger starts
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n✅ All services started\n');
    this.printStatus();

    // Periodic status check
    setInterval(() => {
      const status = this.getStatus();
      const healthy = status.processes.filter(p => p.healthy).length;
      
      if (healthy < status.processes.length) {
        console.log(`⚠️  Health check: ${healthy}/${status.processes.length} services healthy`);
      }
    }, 30000);

    // Keep process alive
    process.stdin.resume();
  }

  /**
   * Print current status
   */
  printStatus() {
    const status = this.getStatus();

    console.log('\n📊 Process Status:');
    console.log('──────────────────────────────────────────');

    status.processes.forEach(proc => {
      const health = proc.healthy ? '✅' : '❌';
      const uptime = Math.round(proc.uptime / 1000);
      console.log(`${health} ${proc.name.padEnd(20)} PID: ${String(proc.pid).padEnd(6)} Port: ${proc.port} Uptime: ${uptime}s`);
    });

    console.log('──────────────────────────────────────────\n');
  }
}

// ============================================================================
// CLI
// ============================================================================

const command = process.argv[2] || 'start';
const manager = new ProcessManager();

switch (command) {
  case 'start':
    await manager.startAll();
    break;

  case 'stop':
    manager.stopAll();
    process.exit(0);
    break;

  case 'status':
    const status = manager.getStatus();
    console.log(JSON.stringify(status, null, 2));
    process.exit(0);
    break;

  case 'restart':
    manager.stopAll();
    await new Promise(r => setTimeout(r, 1000));
    await manager.startAll();
    break;

  default:
    console.log(`\nUsage: node scripts/persistent-process-manager.js [start|stop|status|restart]\n`);
    process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down...');
  manager.stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  manager.stopAll();
  process.exit(0);
});
