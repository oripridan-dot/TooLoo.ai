/**
 * TooLoo.ai Information Hub
 * 
 * Centralized system that pulls and pushes information to all system parties,
 * making the whole system aware of its environment and state.
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class InformationHub extends EventEmitter {
  constructor(options = {}) {
    super();
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.updateInterval = options.updateInterval || 5000; // 5 second updates
    this.subscribers = new Map(); // Component subscriptions
    this.systemState = {
      timestamp: null,
      workspace: {},
      providers: {},
      github: {},
      filesystem: {},
      security: {},
      performance: {},
      network: {},
      users: {},
      processes: {}
    };
    
    this.watchers = new Map(); // File system watchers
    this.isRunning = false;
    
    console.log('🌐 Information Hub initialized - Creating system-wide awareness');
  }

  /**
   * Start the information hub - begins continuous monitoring
   */
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Information Hub starting - Establishing awareness network');
    
    // Initial system scan
    await this.fullSystemScan();
    
    // Setup file system watchers
    await this.setupFilesystemWatchers();
    
    // Start continuous monitoring
    this.monitoringInterval = setInterval(() => {
      this.continuousUpdate();
    }, this.updateInterval);
    
    // Setup network health monitoring
    this.setupNetworkMonitoring();
    
    this.emit('hub:started', { timestamp: new Date().toISOString() });
    console.log('✅ Information Hub active - System awareness established');
  }

  /**
   * Stop the information hub
   */
  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Close file watchers
    for (const [path, watcher] of this.watchers) {
      try {
        await watcher.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    this.watchers.clear();
    
    this.emit('hub:stopped', { timestamp: new Date().toISOString() });
    console.log('⏹️ Information Hub stopped');
  }

  /**
   * Register a system component to receive updates
   */
  subscribe(componentId, filters = [], callback) {
    this.subscribers.set(componentId, { filters, callback });
    console.log(`📡 Component '${componentId}' subscribed to hub with filters:`, filters);
    
    // Send current state immediately
    this.pushToSubscriber(componentId, 'initial', this.systemState);
    
    return () => this.unsubscribe(componentId);
  }

  /**
   * Unregister a component
   */
  unsubscribe(componentId) {
    this.subscribers.delete(componentId);
    console.log(`📡 Component '${componentId}' unsubscribed from hub`);
  }

  /**
   * Accept information from system components
   */
  receiveFromComponent(componentId, dataType, data) {
    const timestamp = new Date().toISOString();
    
    // Update system state
    if (!this.systemState[dataType]) {
      this.systemState[dataType] = {};
    }
    
    this.systemState[dataType][componentId] = {
      ...data,
      lastUpdate: timestamp,
      source: componentId
    };
    
    this.systemState.timestamp = timestamp;
    
    // Broadcast update to interested subscribers
    this.broadcastUpdate(dataType, {
      source: componentId,
      type: dataType,
      data,
      timestamp
    });
    
    this.emit('data:received', { componentId, dataType, timestamp });
  }

  /**
   * Get current system state for a component
   */
  getStateFor(componentId, filters = []) {
    if (filters.length === 0) {
      return this.systemState;
    }
    
    const filtered = {};
    for (const filter of filters) {
      if (this.systemState[filter]) {
        filtered[filter] = this.systemState[filter];
      }
    }
    
    return {
      ...filtered,
      timestamp: this.systemState.timestamp
    };
  }

  /**
   * Perform full system environmental scan
   */
  async fullSystemScan() {
    console.log('🔍 Performing full system scan...');
    
    try {
      // Workspace analysis
      await this.scanWorkspace();
      
      // Process monitoring
      await this.scanProcesses();
      
      // Network status
      await this.scanNetwork();
      
      // Security posture
      await this.scanSecurity();
      
      // Performance metrics
      await this.scanPerformance();
      
      this.systemState.timestamp = new Date().toISOString();
      
      console.log('✅ Full system scan completed');
      this.broadcastUpdate('system', { type: 'full_scan_complete', data: this.systemState });
      
    } catch (error) {
      console.error('❌ System scan error:', error.message);
      this.emit('error', error);
    }
  }

  /**
   * Scan workspace and filesystem
   */
  async scanWorkspace() {
    try {
      const workspaceStats = await fs.stat(this.workspaceRoot);
      const contents = await fs.readdir(this.workspaceRoot);
      
      // Count different file types
      const fileTypes = {};
      let totalFiles = 0;
      
      for (const item of contents) {
        const itemPath = path.join(this.workspaceRoot, item);
        try {
          const stat = await fs.stat(itemPath);
          if (stat.isFile()) {
            totalFiles++;
            const ext = path.extname(item) || 'no-extension';
            fileTypes[ext] = (fileTypes[ext] || 0) + 1;
          }
        } catch (e) {
          // Skip items we can't read
        }
      }
      
      this.systemState.workspace = {
        path: this.workspaceRoot,
        modified: workspaceStats.mtime,
        totalItems: contents.length,
        totalFiles,
        fileTypes,
        lastScan: new Date().toISOString()
      };
      
    } catch (error) {
      console.warn('Workspace scan error:', error.message);
    }
  }

  /**
   * Scan running processes
   */
  async scanProcesses() {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      // Get Node.js processes
      const { stdout } = await execAsync('ps aux | grep node | grep -v grep || true');
      const nodeProcesses = stdout.trim().split('\n').filter(line => line.length > 0);
      
      this.systemState.processes = {
        nodeCount: nodeProcesses.length,
        processes: nodeProcesses.map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            pid: parts[1],
            cpu: parts[2],
            memory: parts[3],
            command: parts.slice(10).join(' ')
          };
        }),
        lastScan: new Date().toISOString()
      };
      
    } catch (error) {
      console.warn('Process scan error:', error.message);
    }
  }

  /**
   * Scan network connectivity and status
   */
  async scanNetwork() {
    try {
      const startTime = Date.now();
      
      // Test connectivity to key services
      const tests = [
        { name: 'GitHub API', url: 'https://api.github.com' },
        { name: 'OpenAI API', url: 'https://api.openai.com' },
        { name: 'Local Health', url: 'http://localhost:3001/api/v1/health' }
      ];
      
      const results = await Promise.allSettled(
        tests.map(async test => {
          const testStart = Date.now();
          try {
            const response = await fetch(test.url, { 
              method: 'HEAD',
              timeout: 5000 
            });
            return {
              name: test.name,
              status: 'ok',
              responseTime: Date.now() - testStart,
              statusCode: response.status
            };
          } catch (error) {
            return {
              name: test.name,
              status: 'error',
              responseTime: Date.now() - testStart,
              error: error.message
            };
          }
        })
      );
      
      this.systemState.network = {
        connectivity: results.map(r => r.value || { name: 'unknown', status: 'error' }),
        totalTestTime: Date.now() - startTime,
        lastScan: new Date().toISOString()
      };
      
    } catch (error) {
      console.warn('Network scan error:', error.message);
    }
  }

  /**
   * Scan security posture
   */
  async scanSecurity() {
    try {
      // Check for security-related files and configurations
      const securityChecks = {
        dotEnvExists: false,
        gitignoreExists: false,
        packageLockExists: false,
        dockerfileExists: false,
        securityHeaders: false
      };
      
      const files = ['.env', '.gitignore', 'package-lock.json', 'Dockerfile'];
      
      for (const file of files) {
        try {
          await fs.access(path.join(this.workspaceRoot, file));
          securityChecks[file.replace(/[.-]/g, '') + 'Exists'] = true;
        } catch (e) {
          // File doesn't exist
        }
      }
      
      // Check if server has security middleware
      try {
        const serverContent = await fs.readFile(
          path.join(this.workspaceRoot, 'simple-api-server.js'),
          'utf8'
        );
        securityChecks.securityHeaders = 
          serverContent.includes('helmet') || 
          serverContent.includes('rateLimit');
      } catch (e) {
        // Can't read server file
      }
      
      this.systemState.security = {
        checks: securityChecks,
        score: Object.values(securityChecks).filter(Boolean).length,
        maxScore: Object.keys(securityChecks).length,
        lastScan: new Date().toISOString()
      };
      
    } catch (error) {
      console.warn('Security scan error:', error.message);
    }
  }

  /**
   * Scan system performance metrics
   */
  async scanPerformance() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.systemState.performance = {
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external
        },
        cpu: cpuUsage,
        uptime: process.uptime(),
        lastScan: new Date().toISOString()
      };
      
    } catch (error) {
      console.warn('Performance scan error:', error.message);
    }
  }

  /**
   * Setup filesystem watchers for real-time updates
   */
  async setupFilesystemWatchers() {
    try {
      const watchPaths = [
        this.workspaceRoot,
        path.join(this.workspaceRoot, 'packages'),
        path.join(this.workspaceRoot, 'personal-projects')
      ];
      
      for (const watchPath of watchPaths) {
        try {
          const watcher = await fs.watch(watchPath, { recursive: false });
          this.watchers.set(watchPath, watcher);
          
          // Listen for changes
          watcher.on('change', (eventType, filename) => {
            this.handleFileSystemChange(watchPath, eventType, filename);
          });
          
        } catch (error) {
          // Path might not exist, skip
        }
      }
      
      console.log(`📁 Watching ${this.watchers.size} filesystem locations`);
      
    } catch (error) {
      console.warn('Filesystem watcher setup error:', error.message);
    }
  }

  /**
   * Handle filesystem changes
   */
  handleFileSystemChange(watchPath, eventType, filename) {
    const timestamp = new Date().toISOString();
    
    this.broadcastUpdate('filesystem', {
      type: 'file_change',
      data: {
        path: watchPath,
        filename,
        eventType,
        timestamp
      }
    });
    
    // Trigger partial workspace rescan
    setTimeout(() => this.scanWorkspace(), 1000);
  }

  /**
   * Setup network monitoring
   */
  setupNetworkMonitoring() {
    // Monitor network every 30 seconds
    setInterval(() => {
      this.scanNetwork();
    }, 30000);
  }

  /**
   * Continuous system updates
   */
  async continuousUpdate() {
    if (!this.isRunning) return;
    
    try {
      // Update performance metrics
      await this.scanPerformance();
      
      // Update process information
      await this.scanProcesses();
      
      // Broadcast continuous update
      this.broadcastUpdate('continuous', {
        type: 'heartbeat',
        data: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        }
      });
      
    } catch (error) {
      console.warn('Continuous update error:', error.message);
    }
  }

  /**
   * Broadcast update to all subscribers
   */
  broadcastUpdate(dataType, updateData) {
    for (const [componentId, subscription] of this.subscribers) {
      const { filters, callback } = subscription;
      
      // Check if subscriber is interested in this type of update
      if (filters.length === 0 || filters.includes(dataType)) {
        try {
          this.pushToSubscriber(componentId, dataType, updateData);
        } catch (error) {
          console.warn(`Failed to push to subscriber ${componentId}:`, error.message);
        }
      }
    }
  }

  /**
   * Push data to a specific subscriber
   */
  pushToSubscriber(componentId, dataType, data) {
    const subscription = this.subscribers.get(componentId);
    if (subscription && subscription.callback) {
      subscription.callback(dataType, data, this.systemState);
    }
  }

  /**
   * Get comprehensive system summary
   */
  getSystemSummary() {
    return {
      timestamp: this.systemState.timestamp,
      status: this.isRunning ? 'active' : 'stopped',
      subscribers: Array.from(this.subscribers.keys()),
      watchers: Array.from(this.watchers.keys()),
      workspace: this.systemState.workspace,
      network: this.systemState.network,
      security: this.systemState.security,
      performance: this.systemState.performance,
      processes: this.systemState.processes
    };
  }

  /**
   * Emergency system shutdown
   */
  async emergencyShutdown(reason = 'Unknown') {
    console.log(`🚨 Emergency shutdown triggered: ${reason}`);
    
    this.broadcastUpdate('emergency', {
      type: 'shutdown',
      reason,
      timestamp: new Date().toISOString()
    });
    
    await this.stop();
  }
}

module.exports = InformationHub;