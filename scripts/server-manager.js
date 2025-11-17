#!/usr/bin/env node
/**
 * TooLoo Server Manager
 * Professional server lifecycle management for development & testing
 * 
 * Features:
 * - Hot reload on file changes
 * - Graceful shutdown with health checks
 * - Process monitoring and auto-restart
 * - Development/testing/production modes
 * - Concurrent service management
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

class ServerManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.mode = options.mode || 'development';
    this.servers = new Map();
    this.watchers = new Map();
    this.config = {
      healthCheckInterval: 5000,
      restartDelay: 2000,
      maxRestarts: 5,
      restartWindow: 60000,
      hotReload: options.mode === 'development',
      logLevel: options.logLevel || 'info',
    };
  }

  defineServer(name, config) {
    if (!name || !config.script) {
      throw new Error(`Invalid server config for "${name}"`);
    }

    const serverConfig = {
      name,
      script: config.script,
      port: config.port,
      env: config.env || {},
      watch: config.watch || [],
      maxRestarts: config.maxRestarts || this.config.maxRestarts,
      healthUrl: config.healthUrl || `http://127.0.0.1:${config.port}/health`,
      timeout: config.timeout || 30000,
      process: null,
      restarts: 0,
      lastRestartTime: null,
      healthy: false,
    };

    this.servers.set(name, serverConfig);
    return this;
  }

  async startAll(options = {}) {
    const { parallel = true } = options;

    this.log('info', `🚀 Starting all servers (${this.mode} mode)...`);

    if (parallel) {
      await Promise.all(
        Array.from(this.servers.keys()).map(name => this.start(name))
      );
    } else {
      for (const name of this.servers.keys()) {
        await this.start(name);
      }
    }

    this.log('info', '✅ All servers started');
    return this;
  }

  async start(name) {
    const config = this.servers.get(name);
    if (!config) throw new Error(`Server "${name}" not defined`);

    if (config.process && config.process.pid) {
      this.log('warn', `⚠️  Server "${name}" already running (PID: ${config.process.pid})`);
      return config;
    }

    return new Promise((resolve, reject) => {
      this.log('info', `▶️  Starting ${name} on port ${config.port}...`);

      const env = { ...process.env, ...config.env, NODE_ENV: this.mode };
      const proc = spawn('node', [config.script], { env, stdio: 'inherit' });

      config.process = proc;
      config.restarts = 0;
      config.lastRestartTime = Date.now();

      proc.on('error', (err) => {
        this.log('error', `❌ Failed to start ${name}: ${err.message}`);
        reject(err);
      });

      proc.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          this.log('error', `⚠️  ${name} exited with code ${code}`);
          this.handleRestart(name);
        }
        config.process = null;
        config.healthy = false;
      });

      setTimeout(() => {
        this.checkHealth(name).then(() => {
          this.log('info', `✅ ${name} is healthy`);
          if (config.watch.length > 0 && this.config.hotReload) {
            this.setupHotReload(name);
          }
          resolve(config);
        }).catch(() => {
          this.log('warn', `⚠️  ${name} health check timeout (continuing)`);
          resolve(config);
        });
      }, 1000);
    });
  }

  async stop(name) {
    const config = this.servers.get(name);
    if (!config || !config.process) {
      this.log('warn', `⚠️  Server "${name}" not running`);
      return;
    }

    return new Promise((resolve) => {
      this.log('info', `⏹️  Stopping ${name}...`);

      if (this.watchers.has(name)) {
        this.watchers.get(name).close();
        this.watchers.delete(name);
      }

      const proc = config.process;
      const timeout = setTimeout(() => {
        this.log('warn', `⚠️  Force killing ${name} (timeout)`);
        proc.kill('SIGKILL');
        resolve();
      }, 5000);

      proc.on('exit', () => {
        clearTimeout(timeout);
        config.process = null;
        config.healthy = false;
        this.log('info', `✅ ${name} stopped`);
        resolve();
      });

      proc.kill('SIGTERM');
    });
  }

  async stopAll() {
    this.log('info', '🛑 Stopping all servers...');
    await Promise.all(
      Array.from(this.servers.keys()).map(name => this.stop(name))
    );
    this.log('info', '✅ All servers stopped');
  }

  async restart(name) {
    await this.stop(name);
    await new Promise(resolve => setTimeout(resolve, this.config.restartDelay));
    return this.start(name);
  }

  async checkHealth(name) {
    const config = this.servers.get(name);
    if (!config || !config.healthUrl) return false;

    try {
      const response = await fetch(config.healthUrl, { timeout: 5000 });
      config.healthy = response.ok;
      return config.healthy;
    } catch {
      config.healthy = false;
      return false;
    }
  }

  async handleRestart(name) {
    const config = this.servers.get(name);

    if (config.restarts >= config.maxRestarts) {
      this.log('error', `❌ Max restarts exceeded for ${name}`);
      this.emit('max-restarts', { name, restarts: config.restarts });
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, config.restarts), 30000);
    this.log('info', `⏳ Restarting ${name} in ${delay}ms...`);

    config.restarts++;
    await new Promise(resolve => setTimeout(resolve, delay));
    await this.restart(name);
  }

  setupHotReload(name) {
    const config = this.servers.get(name);
    if (!config.watch.length) return;

    import('fs').then(({ watch }) => {
      // Convert glob patterns to actual directories
      const dirsToWatch = config.watch
        .map(pattern => {
          // Remove globs and get base directory
          const dir = pattern.split('*')[0].replace(/\/$/, '');
          return dir || '.';
        })
        .filter((dir, _idx, arr) => arr.indexOf(dir) === _idx); // Remove duplicates

      dirsToWatch.forEach(dir => {
        try {
          const watcher = watch(dir, { recursive: true }, (eventType, filename) => {
            if (filename && (filename.endsWith('.js') || filename.endsWith('.json'))) {
              this.log('info', `📝 ${name}: detected change in ${filename}`);
              this.log('info', `🔄 Hot reloading ${name}...`);
              this.restart(name).catch(err => {
                this.log('error', `❌ Hot reload failed: ${err.message}`);
              });
            }
          });

          this.watchers.set(`${name}:${dir}`, watcher);
        } catch (err) {
          this.log('warn', `⚠️  Could not watch ${dir}: ${err.message}`);
        }
      });

      this.log('info', `👁️  Hot reload enabled for ${name}`);
    });
  }

  status(name) {
    const config = this.servers.get(name);
    if (!config) return null;

    return {
      name,
      port: config.port,
      running: config.process && config.process.pid ? true : false,
      pid: config.process?.pid || null,
      healthy: config.healthy,
      restarts: config.restarts,
      url: `http://127.0.0.1:${config.port}`,
    };
  }

  statusAll() {
    const statuses = {};
    for (const name of this.servers.keys()) {
      statuses[name] = this.status(name);
    }
    return statuses;
  }

  log(level, message) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const levels = { error: '❌', warn: '⚠️ ', info: 'ℹ️ ' };
    const prefix = levels[level] || '•';

    if (level === 'error' || this.config.logLevel === 'debug') {
      console.log(`[${timestamp}] ${prefix} ${message}`);
    } else if (level !== 'debug') {
      console.log(`[${timestamp}] ${prefix} ${message}`);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      this.log('info', `\n${signal} received. Shutting down gracefully...`);
      await this.stopAll();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

export default ServerManager;

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new ServerManager({ mode: process.env.NODE_ENV || 'development' });

  // CORE REQUIRED SERVERS (from copilot-instructions.md)
  // Port 3000-3009 are the main service tier
  // Port 3123 (orchestrator) runs alongside web-server
  const servers = [
    {
      name: 'web-server',
      script: 'servers/web-server.js',
      port: 3000,
      watch: ['servers/web-server.js', 'web-app/**/*.html'],
      healthUrl: 'http://127.0.0.1:3000/health',
    },
    {
      name: 'training-server',
      script: 'servers/training-server.js',
      port: 3001,
      watch: ['servers/training-server.js', 'engine/**/*.js'],
    },
    {
      name: 'meta-server',
      script: 'servers/meta-server.js',
      port: 3002,
      watch: ['servers/meta-server.js', 'engine/**/*.js'],
    },
    {
      name: 'budget-server',
      script: 'servers/budget-server.js',
      port: 3003,
      watch: ['servers/budget-server.js'],
    },
    {
      name: 'coach-server',
      script: 'servers/coach-server.js',
      port: 3004,
      watch: ['servers/coach-server.js'],
    },
    {
      name: 'product-server',
      script: 'servers/product-development-server.js',
      port: 3006,
      watch: ['servers/product-development-server.js'],
    },
    {
      name: 'segmentation-server',
      script: 'servers/segmentation-server.js',
      port: 3007,
      watch: ['servers/segmentation-server.js'],
    },
    {
      name: 'reports-server',
      script: 'servers/reports-server.js',
      port: 3008,
      watch: ['servers/reports-server.js'],
    },
    {
      name: 'capabilities-server',
      script: 'servers/capabilities-server.js',
      port: 3009,
      watch: ['servers/capabilities-server.js'],
    },
  ];

  servers.forEach(config => manager.defineServer(config.name, config));

  const command = process.argv[2];
  const serverName = process.argv[3];

  (async () => {
    try {
      switch (command) {
      case 'start':
        if (serverName) {
          await manager.start(serverName);
        } else {
          await manager.startAll();
        }
        manager.setupGracefulShutdown();
        break;

      case 'stop':
        if (serverName) {
          await manager.stop(serverName);
        } else {
          await manager.stopAll();
        }
        process.exit(0);
        break;

      case 'restart':
        if (serverName) {
          await manager.restart(serverName);
        } else {
          await manager.stopAll();
          await manager.startAll();
        }
        manager.setupGracefulShutdown();
        break;

      case 'status':
        if (serverName) {
          console.log(manager.status(serverName));
        } else {
          console.table(manager.statusAll());
        }
        process.exit(0);
        break;

      default:
        console.log(`
  TooLoo Server Manager

  Usage: node scripts/server-manager.js <command> [server]

  Commands:
    start [name]    - Start server(s)
    stop [name]     - Stop server(s)
    restart [name]  - Restart server(s)
    status [name]   - Show status
          `);
        process.exit(0);
      }
    } catch (err) {
      manager.log('error', err.message);
      process.exit(1);
    }
  })();
}
