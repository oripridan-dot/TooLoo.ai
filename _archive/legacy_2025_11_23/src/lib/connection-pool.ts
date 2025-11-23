/**
 * Connection Pool Manager - Phase 6A Database Optimization
 * 
 * Manages database connections with pooling, health checks, and auto-recovery
 */

export class ConnectionPool {
  constructor(options = {}) {
    this.minConnections = options.minConnections || 2;
    this.maxConnections = options.maxConnections || 10;
    this.connectionTimeout = options.connectionTimeout || 5000;
    this.idleTimeout = options.idleTimeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    
    this.connections = [];
    this.activeConnections = new Set();
    this.waitingQueue = [];
    this.stats = {
      created: 0,
      acquired: 0,
      released: 0,
      failures: 0,
      activeCount: 0
    };
    
    this.initialized = false;
  }

  /**
   * Initialize pool with min connections
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      for (let i = 0; i < this.minConnections; i++) {
        const conn = await this.createConnection();
        if (conn) {
          this.connections.push({ conn, acquired: false, createdAt: Date.now() });
          this.stats.created++;
        }
      }
      this.initialized = true;
    } catch (error) {
      console.error(`Pool initialization error: ${error.message}`);
    }
  }

  /**
   * Acquire connection from pool
   */
  async acquire() {
    if (!this.initialized) await this.initialize();

    // Try to get available connection
    const available = this.connections.find(c => !c.acquired);
    if (available) {
      available.acquired = true;
      this.activeConnections.add(available.conn);
      this.stats.acquired++;
      this.stats.activeCount = this.activeConnections.size;
      return available.conn;
    }

    // Create new connection if under limit
    if (this.connections.length < this.maxConnections) {
      try {
        const conn = await this.createConnection();
        if (conn) {
          const poolItem = { conn, acquired: true, createdAt: Date.now() };
          this.connections.push(poolItem);
          this.activeConnections.add(conn);
          this.stats.created++;
          this.stats.acquired++;
          this.stats.activeCount = this.activeConnections.size;
          return conn;
        }
      } catch (error) {
        this.stats.failures++;
        throw new Error(`Failed to create connection: ${error.message}`);
      }
    }

    // Queue request if at max - return promise
    return new Promise((res, rej) => {
      const timeout = setTimeout(() => {
        this.waitingQueue = this.waitingQueue.filter(r => r.resolve !== res);
        rej(new Error('Connection acquisition timeout'));
      }, this.connectionTimeout);

      this.waitingQueue.push({ resolve: res, reject: rej, timeout });
    });
  }

  /**
   * Release connection back to pool
   */
  release(connection) {
    const poolItem = this.connections.find(c => c.conn === connection);
    if (poolItem) {
      poolItem.acquired = false;
      this.activeConnections.delete(connection);
      this.stats.released++;
      this.stats.activeCount = this.activeConnections.size;

      // Serve waiting request if any
      if (this.waitingQueue.length > 0) {
        const request = this.waitingQueue.shift();
        clearTimeout(request.timeout);
        poolItem.acquired = true;
        this.activeConnections.add(connection);
        this.stats.acquired++;
        this.stats.activeCount = this.activeConnections.size;
        request.resolve(connection);
      }
    }
  }

  /**
   * Health check all connections
   */
  async healthCheck() {
    let healthy = 0;
    let unhealthy = 0;

    for (const poolItem of this.connections) {
      try {
        await this.testConnection(poolItem.conn);
        healthy++;
      } catch (error) {
        unhealthy++;
        // Remove unhealthy connection
        if (!poolItem.acquired) {
          this.connections = this.connections.filter(c => c !== poolItem);
        }
      }
    }

    // Restore minimum connections
    while (this.connections.length < this.minConnections) {
      try {
        const conn = await this.createConnection();
        if (conn) {
          this.connections.push({ conn, acquired: false, createdAt: Date.now() });
          healthy++;
        }
      } catch (error) {
        console.error(`Failed to restore connection: ${error.message}`);
      }
    }

    return { healthy, unhealthy, total: this.connections.length };
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      poolSize: this.connections.length,
      availableConnections: this.connections.filter(c => !c.acquired).length,
      waitingRequests: this.waitingQueue.length,
      utilization: `${((this.stats.activeCount / this.maxConnections) * 100).toFixed(2)}%`
    };
  }

  /**
   * Drain pool (close all connections)
   */
  async drain() {
    for (const poolItem of this.connections) {
      try {
        await this.closeConnection(poolItem.conn);
      } catch (error) {
        console.warn(`Error closing connection: ${error.message}`);
      }
    }
    this.connections = [];
    this.activeConnections.clear();
    this.initialized = false;
  }

  // ============= Private Methods =============

  async createConnection() {
    // Override in subclass or pass factory function
    return { id: Math.random().toString(36) };
  }

  async testConnection(connection) {
    // Override in subclass to implement actual test
    return true;
  }

  async closeConnection(connection) {
    // Override in subclass to implement actual close
    return true;
  }
}

export default ConnectionPool;
