/**
 * Enhanced Health Check System
 * 
 * Provides detailed system health information including:
 * - Provider availability
 * - System resources
 * - Database connectivity
 * - Service dependencies
 */

import os from 'os';
import { logger } from '../config/logger.js';

export class HealthCheckService {
  constructor(dependencies = {}) {
    this.dependencies = dependencies; // { providerService, dbClient, etc. }
    this.startTime = Date.now();
    this.checks = new Map();
    
    // Register default checks
    this.registerCheck('uptime', this.checkUptime.bind(this));
    this.registerCheck('memory', this.checkMemory.bind(this));
    this.registerCheck('disk', this.checkDisk.bind(this));
  }

  /**
   * Register a health check
   */
  registerCheck(name, checkFunction) {
    this.checks.set(name, checkFunction);
  }

  /**
   * Run all health checks
   */
  async runChecks() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: {}
    };

    for (const [name, checkFn] of this.checks) {
      try {
        const startTime = Date.now();
        const result = await checkFn();
        const duration = Date.now() - startTime;

        results.checks[name] = {
          status: result.status || 'healthy',
          ...result,
          duration
        };

        if (result.status === 'unhealthy') {
          results.status = 'degraded';
        }
      } catch (error) {
        results.checks[name] = {
          status: 'unhealthy',
          error: error.message
        };
        results.status = 'unhealthy';
        
        logger.error({
          check: name,
          error: error.message
        }, 'Health check failed');
      }
    }

    return results;
  }

  /**
   * Quick liveness check (returns immediately)
   */
  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Readiness check (checks dependencies)
   */
  async readiness() {
    const checks = await this.runChecks();
    return {
      ready: checks.status !== 'unhealthy',
      ...checks
    };
  }

  /**
   * Check system uptime
   */
  async checkUptime() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      status: 'healthy',
      uptimeSeconds,
      uptime: this.formatUptime(uptimeSeconds)
    };
  }

  /**
   * Check memory usage
   */
  async checkMemory() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedPercent = ((totalMem - freeMem) / totalMem) * 100;

    return {
      status: usedPercent > 90 ? 'unhealthy' : 'healthy',
      heap: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        limit: Math.round(memUsage.rss / 1024 / 1024),
        unit: 'MB'
      },
      system: {
        total: Math.round(totalMem / 1024 / 1024),
        free: Math.round(freeMem / 1024 / 1024),
        usedPercent: Math.round(usedPercent),
        unit: 'MB'
      }
    };
  }

  /**
   * Check disk space (basic)
   */
  async checkDisk() {
    // This is a simplified check - in production, use a proper disk space library
    return {
      status: 'healthy',
      message: 'Disk check not yet implemented'
    };
  }

  /**
   * Check provider availability
   */
  async checkProviders() {
    if (!this.dependencies.providerService) {
      return {
        status: 'unknown',
        message: 'Provider service not configured'
      };
    }

    const metrics = this.dependencies.providerService.getMetrics();
    const healthyProviders = this.dependencies.providerService.providers.length - 
                            metrics.failedProviders.length;

    return {
      status: healthyProviders > 0 ? 'healthy' : 'unhealthy',
      totalProviders: this.dependencies.providerService.providers.length,
      healthyProviders,
      failedProviders: metrics.failedProviders,
      metrics: {
        totalRequests: metrics.totalRequests,
        successRate: metrics.successRate,
        providerUsage: metrics.providerUsage
      }
    };
  }

  /**
   * Check database connectivity
   */
  async checkDatabase() {
    if (!this.dependencies.dbClient) {
      return {
        status: 'not_configured',
        message: 'Database not configured'
      };
    }

    try {
      // Simple ping to check connectivity
      await this.dependencies.dbClient.ping();
      return {
        status: 'healthy',
        connected: true
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Get system information
   */
  getSystemInfo() {
    return {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      os: {
        type: os.type(),
        release: os.release(),
        cpus: os.cpus().length,
        uptime: os.uptime()
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    };
  }

  /**
   * Format uptime in human-readable format
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }
}

/**
 * Express route handlers
 */
export function createHealthRoutes(healthService) {
  return {
    // GET /health - Full health check
    async health(req, res) {
      const health = await healthService.runChecks();
      const statusCode = health.status === 'unhealthy' ? 503 : 200;
      res.status(statusCode).json(health);
    },

    // GET /health/liveness - Quick liveness probe
    async liveness(req, res) {
      const liveness = await healthService.liveness();
      res.json(liveness);
    },

    // GET /health/readiness - Readiness probe
    async readiness(req, res) {
      const readiness = await healthService.readiness();
      const statusCode = readiness.ready ? 200 : 503;
      res.status(statusCode).json(readiness);
    },

    // GET /health/system - System information
    system(req, res) {
      const info = healthService.getSystemInfo();
      res.json(info);
    }
  };
}

export default {
  HealthCheckService,
  createHealthRoutes
};
