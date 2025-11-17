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

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const EventEmitter = require('events');

class ServerManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.mode = options.mode || 'development'; // development | testing | production
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

  /**
   * Define a server to manage
   */
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

  /**
   * Start all servers
   */
  async startAll(options = {}) {
    const { parallel = true, sequential = false } = options;

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

  /**
   * Start a specific server
   */
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

      // Wait for health check
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

  /**
   * Stop a specific server gracefully
   */
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

  /**
   * Stop all servers
   */
  async stopAll() {
    this.log('info', '🛑 Stopping all servers...');
    await Promise.all(
      Array.from(this.servers.keys()).map(name => this.stop(name))
    );
    this.log('info', '✅ All servers stopped');
  }

  /**
   * Restart a specific server
   */
  async restart(name) {
    await this.stop(name);
    await new Promise(resolve => setTimeout(resolve, this.config.restartDelay));
    return this.start(name);
  }

  /**
   * Check server health
   */
  async checkHealth(name) {
    const config = this.servers.get(name);
    if (!config || !config.healthUrl) return false;

    try {
      const response = await fetch(config.healthUrl, {
        timeout: 5000,
      });
      config.healthy = response.ok;
      return config.healthy;
    } catch (err) {
      config.healthy = false;
      return false;
    }
  }

  /**
   * Handle automatic restart with backoff
   */
  async handleRestart(name) {
    const config = this.servers.get(name);

    // Check restart limits
    if (config.restarts >= config.maxRestarts) {
      this.log('error', `❌ Max restarts exceeded for ${name}`);
      this.emit('max-restarts', { name, restarts: config.restarts });
      return;
    }

    // Backoff delay
    const delay = Math.min(1000 * Math.pow(2, config.restarts), 30000);
    this.log('info', `⏳ Restarting ${name} in ${delay}ms...`);

    config.restarts++;
    await new Promise(resolve => setTimeout(resolve, delay));
    await this.restart(name);
  }

  /**
   * Setup hot reload on file changes
   */
  setupHotReload(name) {
    const config = this.servers.get(name);
    if (!config.watch.length) return;

    const watchFs = require('fs');

    config.watch.forEach(pattern => {
      const watcher = watchFs.watch(pattern, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.endsWith('.js') || filename.endsWith('.json'))) {
          this.log('info', `📝 ${name}: detected change in ${filename}`);
          this.log('info', `🔄 Hot reloading ${name}...`);
          this.restart(name).catch(err => {
            this.log('error', `❌ Hot reload failed: ${err.message}`);
          });
        }
      });

      this.watchers.set(`${name}:${pattern}`, watcher);
    });

    this.log('info', `👁️  Hot reload enabled for ${name}`);
  }

  /**
   * Get server status
   */
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

  /**
   * Get all server statuses
   */
  statusAll() {
    const statuses = {};
    for (const name of this.servers.keys()) {
      statuses[name] = this.status(name);
    }
    return statuses;
  }

  /**
   * Logging utility
   */
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

  /**
   * Graceful shutdown handler
   */
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

module.exports = ServerManager;

/**
 * CLI Usage Example
 */
if (require.main === module) {
  const manager = new ServerManager({ mode: process.env.NODE_ENV || 'development' });

  // Define servers from package.json scripts
  const packageJson = require('../package.json');

  const servers = [
    {
      name: 'web-server',
      script: 'servers/web-server.js',
      port: 3000,
      watch: ['servers/**/*.js', 'web-app/**/*.html'],
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
  ];

  servers.forEach(config => manager.defineServer(config.name, config));

  // CLI commands
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
