// @version 3.3.405
/**
 * System Metrics Collector
 * Real-time collection of process metrics, service health, and system statistics
 *
 * V3.3.405: Added real-time request/latency/token tracking via EventBus
 */

import os from 'os';
import { bus } from './event-bus.js';

interface IntentStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  avgLatencyMs: number;
}

interface ServiceMetric {
  name: string;
  port: number;
  checks: Array<{
    timestamp: string;
    healthy: boolean;
    latencyMs: number;
    details: Record<string, unknown>;
  }>;
  upCount: number;
  downCount: number;
  lastStatus: string | null;
  lastCheck: string | null;
  avgLatency: number;
  details: Record<string, unknown>;
}

interface InstanceMetrics {
  instances: number;
  shards: number;
  totalDurationMs: number;
  speedupEstimate: number;
}

// V3.3.405: Real-time metrics tracking
interface RealTimeMetrics {
  requests: {
    total: number;
    perMinute: number;
    timestamps: number[]; // Last 60 seconds of request timestamps
  };
  latency: {
    samples: number[];
    average: number;
    p95: number;
    p99: number;
  };
  tokens: {
    total: number;
    input: number;
    output: number;
  };
  cost: {
    today: number;
    total: number;
    lastReset: number;
  };
}

export class MetricsCollector {
  private startTime: number;
  private processStartTime: number;
  private intentStats: IntentStats;
  private serviceMetrics: Map<string, ServiceMetric>;
  private resourceSnapshots: unknown[];
  private maxSnapshots: number;
  private instanceMetrics: InstanceMetrics | null = null;

  // V3.3.405: Real-time metrics
  private realTimeMetrics: RealTimeMetrics;
  private metricsCleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startTime = Date.now();
    this.processStartTime = process.uptime() * 1000;
    this.intentStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      avgLatencyMs: 0,
    };
    this.serviceMetrics = new Map();
    this.resourceSnapshots = [];
    this.maxSnapshots = 100; // Keep last 100 snapshots

    // V3.3.405: Initialize real-time metrics
    this.realTimeMetrics = {
      requests: { total: 0, perMinute: 0, timestamps: [] },
      latency: { samples: [], average: 0, p95: 0, p99: 0 },
      tokens: { total: 0, input: 0, output: 0 },
      cost: { today: 0, total: 0, lastReset: Date.now() },
    };

    // Wire up event listeners for real-time tracking
    this.setupEventListeners();

    // Cleanup old timestamps every minute
    this.metricsCleanupInterval = setInterval(() => this.cleanupOldMetrics(), 60000);
  }

  /**
   * V3.3.405: Setup event listeners for real-time metrics
   */
  private setupEventListeners(): void {
    // Track incoming requests
    bus.on('nexus:request', () => {
      this.recordRequest();
    });

    // Track chat requests specifically
    bus.on('nexus:chat_request', () => {
      this.recordRequest();
    });

    // Track response latency
    bus.on('cortex:response', (event) => {
      if (event.payload?.latencyMs) {
        this.recordLatency(event.payload.latencyMs);
      }
    });

    // Track token usage from precog
    bus.on('precog:token_usage', (event) => {
      const { inputTokens, outputTokens, cost } = event.payload || {};
      this.recordTokenUsage(inputTokens || 0, outputTokens || 0, cost || 0);
    });

    // Track cost from provider completions
    bus.on('precog:completion', (event) => {
      const { usage, cost_usd } = event.payload || {};
      if (usage) {
        this.recordTokenUsage(
          usage.prompt_tokens || 0,
          usage.completion_tokens || 0,
          cost_usd || 0
        );
      }
    });
  }

  /**
   * V3.3.405: Record a request for per-minute tracking
   */
  recordRequest(): void {
    const now = Date.now();
    this.realTimeMetrics.requests.total++;
    this.realTimeMetrics.requests.timestamps.push(now);

    // Calculate requests per minute
    const oneMinuteAgo = now - 60000;
    const recentRequests = this.realTimeMetrics.requests.timestamps.filter((t) => t > oneMinuteAgo);
    this.realTimeMetrics.requests.perMinute = recentRequests.length;
  }

  /**
   * V3.3.405: Record response latency
   */
  recordLatency(latencyMs: number): void {
    const samples = this.realTimeMetrics.latency.samples;
    samples.push(latencyMs);

    // Keep last 100 samples
    if (samples.length > 100) {
      samples.shift();
    }

    // Calculate statistics
    const sorted = [...samples].sort((a, b) => a - b);
    this.realTimeMetrics.latency.average = samples.reduce((a, b) => a + b, 0) / samples.length;
    this.realTimeMetrics.latency.p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    this.realTimeMetrics.latency.p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  }

  /**
   * V3.3.405: Record token usage
   */
  recordTokenUsage(input: number, output: number, cost: number): void {
    this.realTimeMetrics.tokens.input += input;
    this.realTimeMetrics.tokens.output += output;
    this.realTimeMetrics.tokens.total += input + output;

    this.realTimeMetrics.cost.total += cost;

    // Reset daily cost at midnight
    const now = new Date();
    const lastResetDate = new Date(this.realTimeMetrics.cost.lastReset);
    if (now.getDate() !== lastResetDate.getDate()) {
      this.realTimeMetrics.cost.today = cost;
      this.realTimeMetrics.cost.lastReset = Date.now();
    } else {
      this.realTimeMetrics.cost.today += cost;
    }
  }

  /**
   * V3.3.405: Cleanup old request timestamps
   */
  private cleanupOldMetrics(): void {
    const oneMinuteAgo = Date.now() - 60000;
    this.realTimeMetrics.requests.timestamps = this.realTimeMetrics.requests.timestamps.filter(
      (t) => t > oneMinuteAgo
    );
  }

  /**
   * V3.3.405: Get real-time metrics for the health endpoint
   */
  getRealTimeMetrics(): RealTimeMetrics {
    // Recalculate requests per minute
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = this.realTimeMetrics.requests.timestamps.filter((t) => t > oneMinuteAgo);
    this.realTimeMetrics.requests.perMinute = recentRequests.length;

    return { ...this.realTimeMetrics };
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
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      },
      uptime: {
        seconds: Math.round(uptime),
        hours: (uptime / 3600).toFixed(2),
        human: this.formatUptime(uptime),
      },
      cpuUsage: process.cpuUsage(),
      timestamp: new Date().toISOString(),
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
        speed: cpus[0]?.speed || 0,
      },
      memory: {
        total: Math.round(totalMem / 1024 / 1024), // MB
        used: Math.round(usedMem / 1024 / 1024), // MB
        free: Math.round(freeMem / 1024 / 1024), // MB
        utilization: ((usedMem / totalMem) * 100).toFixed(2) + '%',
      },
      load: {
        '1min': (avgLoad[0] ?? 0).toFixed(2),
        '5min': (avgLoad[1] ?? 0).toFixed(2),
        '15min': (avgLoad[2] ?? 0).toFixed(2),
        cpuPercent: (((avgLoad[0] ?? 0) / cpuCount) * 100).toFixed(2) + '%',
      },
      uptime: {
        seconds: os.uptime(),
        human: this.formatUptime(os.uptime()),
      },
    };
  }

  /**
   * Record service health check
   */
  recordServiceHealth(
    serviceName: string,
    port: number,
    healthy: boolean,
    latencyMs: number,
    details: Record<string, unknown> = {}
  ) {
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
        details: {},
      });
    }

    const metric = this.serviceMetrics.get(serviceName);
    if (!metric) return; // Should never happen after set above

    const check = {
      timestamp: new Date().toISOString(),
      healthy,
      latencyMs,
      details,
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
  setInstanceMetrics(
    instances: number,
    shards: number,
    durationMs: number,
    speedupEstimate: number
  ) {
    this.instanceMetrics = {
      instances,
      shards,
      totalDurationMs: durationMs,
      speedupEstimate: Math.min(instances, speedupEstimate),
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
      instanceMetrics: this.instanceMetrics || { instances: 0, shards: 0 },
    };
  }

  /**
   * Get processes report (for orchestrator /api/v1/system/processes)
   */
  async getProcessesReport(services: Array<{ name: string; port: number; health: string }>) {
    const report: {
      timestamp: string;
      processes: Array<{
        name: string;
        port: number;
        health_endpoint: string;
        healthy: boolean;
        latency: number;
        lastCheck: string;
        uptimePercent: number;
        avgLatency: number;
      }>;
    } = {
      timestamp: new Date().toISOString(),
      processes: [],
    };

    // Import fetch if not available
    const fetchFn = typeof fetch !== 'undefined' ? fetch : (await import('node-fetch')).default;

    for (const service of services) {
      let healthy = false;
      let latency = 0;
      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetchFn(`http://127.0.0.1:${service.port}${service.health}`, {
          signal: controller.signal as AbortSignal,
        });
        clearTimeout(timeoutId);
        healthy = res.status === 200;
        latency = Date.now() - startTime;
      } catch {
        latency = Date.now() - startTime;
      }

      this.recordServiceHealth(service.name, service.port, healthy, latency);
      const metrics = this.getServiceMetrics(service.name);

      report.processes.push({
        name: service.name,
        port: service.port,
        health_endpoint: service.health,
        healthy,
        latency,
        lastCheck: new Date().toISOString(),
        uptimePercent: metrics?.uptimePercent ?? 0,
        avgLatency: metrics?.avgLatencyMs ?? 0,
      });
    }

    return report;
  }

  /**
   * Get comprehensive system health dashboard
   */
  getHealthDashboard(servicesList: Array<{ name: string; port: number }> = []) {
    const processMetrics = this.getProcessMetrics();
    const systemMetrics = this.getSystemMetrics();

    // Aggregate service health
    const serviceHealth = servicesList.map((s) => {
      const metric = this.serviceMetrics.get(s.name);
      if (!metric) {
        return {
          name: s.name,
          port: s.port,
          status: 'unknown' as const,
          uptime: 0,
          downtime: 0,
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
        details: metric.details,
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
    const downServices = serviceHealth.filter((s) => s.status === 'down').length;
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
        successRate:
          this.intentStats.totalProcessed > 0
            ? Math.round((this.intentStats.successful / this.intentStats.totalProcessed) * 100)
            : 0,
        avgLatencyMs: this.intentStats.avgLatencyMs,
      },
      uptime: {
        seconds: Math.round((Date.now() - this.startTime) / 1000),
        human: this.formatUptime((Date.now() - this.startTime) / 1000),
      },
    };
  }

  /**
   * Get service-specific metrics
   */
  getServiceMetrics(serviceName: string) {
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
      details: metric.details,
    };
  }

  /**
   * Get all service metrics
   */
  getAllServiceMetrics() {
    return Array.from(this.serviceMetrics.values()).map((m) => ({
      name: m.name,
      port: m.port,
      status: m.lastStatus,
      upCount: m.upCount,
      downCount: m.downCount,
      avgLatencyMs: m.avgLatency,
      lastCheck: m.lastCheck,
    }));
  }

  /**
   * Format uptime in human-readable format
   */
  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
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
      avgLatencyMs: 0,
    };
    this.serviceMetrics.clear();
  }
}

export default new MetricsCollector();
