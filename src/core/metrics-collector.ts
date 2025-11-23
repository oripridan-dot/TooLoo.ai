// @version 2.1.28
/**
 * System Metrics Collector
 * Real-time collection of process metrics, service health, and system statistics
 */

import os from 'os';

export class MetricsCollector {
  constructor() {
    this.startTime = Date.now();
    this.processStartTime = process.uptime() * 1000;
    this.intentStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      avgLatencyMs: 0
    };
    this.serviceMetrics = new Map();
    this.resourceSnapshots = [];
    this.maxSnapshots = 100; // Keep last 100 snapshots
  }

  /**
   * Get current process metrics (CPU, memory, uptime)
   */
  getProcessMetrics() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      pid: process.pid,
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024) // MB
      },
      uptime: {
        seconds: Math.round(uptime),
        hours: (uptime / 3600).toFixed(2),
        human: this.formatUptime(uptime)
      },
      cpuUsage: process.cpuUsage(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get system-level metrics
   */
  getSystemMetrics() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Calculate average CPU load
    const avgLoad = os.loadavg();
    const cpuCount = cpus.length;

    return {
      system: os.type(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: {
        count: cpuCount,
        model: cpus[0]?.model || 'unknown',
        speed: cpus[0]?.speed || 0
      },
      memory: {
        total: Math.round(totalMem / 1024 / 1024), // MB
        used: Math.round(usedMem / 1024 / 1024), // MB
        free: Math.round(freeMem / 1024 / 1024), // MB
        utilization: (usedMem / totalMem * 100).toFixed(2) + '%'
      },
      load: {
        '1min': avgLoad[0].toFixed(2),
        '5min': avgLoad[1].toFixed(2),
        '15min': avgLoad[2].toFixed(2),
        cpuPercent: ((avgLoad[0] / cpuCount) * 100).toFixed(2) + '%'
      },
      uptime: {
        seconds: os.uptime(),
        human: this.formatUptime(os.uptime())
      }
    };
  }

  /**
   * Record service health check
   */
  recordServiceHealth(serviceName, port, healthy, latencyMs, details = {}) {
    if (!this.serviceMetrics.has(serviceName)) {
      this.serviceMetrics.set(serviceName, {
        name: serviceName,
        port,
        checks: [],
        upCount: 0,
        downCount: 0,
        lastStatus: null,
        lastCheck: null,
        avgLatency: 0,
        details: {}
      });
    }

    const metric = this.serviceMetrics.get(serviceName);
    const check = {
      timestamp: new Date().toISOString(),
      healthy,
      latencyMs,
      details
    };

    metric.checks.push(check);
    if (metric.checks.length > 100) metric.checks.shift(); // Keep last 100

    if (healthy) {
      metric.upCount++;
    } else {
      metric.downCount++;
    }

    metric.lastStatus = healthy ? 'up' : 'down';
    metric.lastCheck = check.timestamp;
    metric.avgLatency = Math.round(
      metric.checks.reduce((sum, c) => sum + c.latencyMs, 0) / metric.checks.length
    );
    metric.details = details;
  }

  /**
   * Record intent processing metrics
   */
  recordIntent(successful = true, latencyMs = 0) {
    this.intentStats.totalProcessed++;
    if (successful) {
      this.intentStats.successful++;
    } else {
      this.intentStats.failed++;
    }

    // Update running average latency
    const prevTotal = this.intentStats.avgLatencyMs * (this.intentStats.totalProcessed - 1);
    this.intentStats.avgLatencyMs = Math.round(
      (prevTotal + latencyMs) / this.intentStats.totalProcessed
    );
  }

  /**
   * Record multi-instance metrics (for orchestrator)
   */
  setInstanceMetrics(instances, shards, durationMs, speedupEstimate) {
    this.instanceMetrics = {
      instances,
      shards,
      totalDurationMs: durationMs,
      speedupEstimate: Math.min(instances, speedupEstimate)
    };
    return this.instanceMetrics;
  }

  /**
   * Get summary of system overview
   */
  getSystemOverview() {
    const processMetrics = this.getProcessMetrics();
    const systemMetrics = this.getSystemMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      process: processMetrics,
      system: systemMetrics,
      services: this.getAllServiceMetrics(),
      intents: this.intentStats,
      instanceMetrics: this.instanceMetrics || { instances: 0, shards: 0 }
    };
  }

  /**
   * Get processes report (for orchestrator /api/v1/system/processes)
   */
  async getProcessesReport(services) {
    const report = {
      timestamp: new Date().toISOString(),
      processes: []
    };

    // Import fetch if not available
    const fetchFn = typeof fetch !== 'undefined' ? fetch : (await import('node-fetch')).default;

    for (const service of services) {
      let healthy = false;
      let latency = 0;
      const startTime = Date.now();

      try {
        const res = await fetchFn(`http://127.0.0.1:${service.port}${service.health}`, { timeout: 5000 });
        healthy = res.status === 200;
        latency = Date.now() - startTime;
      } catch {
        latency = Date.now() - startTime;
      }

      this.recordServiceHealth(service.name, service.port, healthy, latency);
      const metrics = this.getServiceMetrics(service.name) || {};

      report.processes.push({
        name: service.name,
        port: service.port,
        health_endpoint: service.health,
        healthy,
        latency,
        lastCheck: new Date().toISOString(),
        uptimePercent: metrics.uptimePercent || 0,
        avgLatency: metrics.avgLatencyMs || 0
      });
    }

    return report;
  }

  /**
   * Get comprehensive system health dashboard
   */
  getHealthDashboard(servicesList = []) {
    const processMetrics = this.getProcessMetrics();
    const systemMetrics = this.getSystemMetrics();

    // Aggregate service health
    const serviceHealth = servicesList.map(s => {
      const metric = this.serviceMetrics.get(s.name);
      if (!metric) {
        return {
          name: s.name,
          port: s.port,
          status: 'unknown',
          uptime: 0,
          downtime: 0
        };
      }

      const total = metric.upCount + metric.downCount;
      const uptime = total > 0 ? Math.round((metric.upCount / total) * 100) : 0;

      return {
        name: s.name,
        port: s.port,
        status: metric.lastStatus,
        uptimePercent: uptime,
        lastCheck: metric.lastCheck,
        avgLatencyMs: metric.avgLatency,
        details: metric.details
      };
    });

    // Calculate overall health score (0-100)
    let healthScore = 100;
    
    // Deduct for memory pressure
    const memPercent = parseFloat(systemMetrics.memory.utilization);
    if (memPercent > 85) healthScore -= 30;
    else if (memPercent > 75) healthScore -= 15;
    else if (memPercent > 65) healthScore -= 5;

    // Deduct for service issues
    const downServices = serviceHealth.filter(s => s.status === 'down').length;
    healthScore -= downServices * 10;

    // Deduct for high failure rate
    if (this.intentStats.totalProcessed > 0) {
      const failureRate = this.intentStats.failed / this.intentStats.totalProcessed;
      healthScore -= failureRate * 20;
    }

    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      timestamp: new Date().toISOString(),
      healthScore: Math.round(healthScore),
      status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'degraded' : 'unhealthy',
      process: processMetrics,
      system: systemMetrics,
      services: serviceHealth,
      intents: {
        total: this.intentStats.totalProcessed,
        successful: this.intentStats.successful,
        failed: this.intentStats.failed,
        successRate: this.intentStats.totalProcessed > 0 
          ? Math.round((this.intentStats.successful / this.intentStats.totalProcessed) * 100)
          : 0,
        avgLatencyMs: this.intentStats.avgLatencyMs
      },
      uptime: {
        seconds: Math.round((Date.now() - this.startTime) / 1000),
        human: this.formatUptime((Date.now() - this.startTime) / 1000)
      }
    };
  }

  /**
   * Get service-specific metrics
   */
  getServiceMetrics(serviceName) {
    const metric = this.serviceMetrics.get(serviceName);
    if (!metric) return null;

    const total = metric.upCount + metric.downCount;
    const uptime = total > 0 ? Math.round((metric.upCount / total) * 100) : 0;

    return {
      name: serviceName,
      port: metric.port,
      status: metric.lastStatus,
      uptimePercent: uptime,
      totalChecks: total,
      upCount: metric.upCount,
      downCount: metric.downCount,
      avgLatencyMs: metric.avgLatency,
      lastCheck: metric.lastCheck,
      recentChecks: metric.checks.slice(-10),
      details: metric.details
    };
  }

  /**
   * Get all service metrics
   */
  getAllServiceMetrics() {
    return Array.from(this.serviceMetrics.values()).map(m => ({
      name: m.name,
      port: m.port,
      status: m.lastStatus,
      upCount: m.upCount,
      downCount: m.downCount,
      avgLatencyMs: m.avgLatency,
      lastCheck: m.lastCheck
    }));
  }

  /**
   * Format uptime in human-readable format
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  /**
   * Reset metrics
   */
  reset() {
    this.intentStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      avgLatencyMs: 0
    };
    this.serviceMetrics.clear();
  }
}

export default new MetricsCollector();
