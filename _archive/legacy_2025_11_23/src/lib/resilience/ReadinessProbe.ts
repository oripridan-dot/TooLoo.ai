import { EventEmitter } from 'events';

/**
 * ReadinessProbe - Service readiness and liveness probing
 * Manages startup, readiness, liveness, and resource probes with polling
 */
export default class ReadinessProbe extends EventEmitter {
  constructor(options = {}) {
    super();
    this.probes = {
      startup: new Map(),
      readiness: new Map(),
      liveness: new Map(),
      resource: new Map()
    };
    this.probeStatus = new Map();
    this.pollingInterval = options.pollingInterval || 10000;
    this.pollingTimeout = null;
    this.isPolling = false;
    this.stats = {
      created: Date.now(),
      probeCheckCount: 0,
      probePassCount: 0,
      probeFailureCount: 0,
      totalProbes: 0
    };
  }

  /**
   * Register a startup probe (runs once at service startup)
   */
  registerStartupProbe(name, checkFn) {
    if (typeof checkFn !== 'function') {
      throw new Error('checkFn must be a function');
    }
    this.probes.startup.set(name, checkFn);
    this.probeStatus.set(`startup:${name}`, { status: 'pending', lastCheck: null, passCount: 0, failCount: 0 });
    this.stats.totalProbes++;
  }

  /**
   * Register a readiness probe (indicates if service is ready to accept traffic)
   */
  registerReadinessProbe(name, checkFn) {
    if (typeof checkFn !== 'function') {
      throw new Error('checkFn must be a function');
    }
    this.probes.readiness.set(name, checkFn);
    this.probeStatus.set(`readiness:${name}`, { status: 'pending', lastCheck: null, passCount: 0, failCount: 0 });
    this.stats.totalProbes++;
  }

  /**
   * Register a liveness probe (indicates if service is still running)
   */
  registerLivenessProbe(name, checkFn) {
    if (typeof checkFn !== 'function') {
      throw new Error('checkFn must be a function');
    }
    this.probes.liveness.set(name, checkFn);
    this.probeStatus.set(`liveness:${name}`, { status: 'pending', lastCheck: null, passCount: 0, failCount: 0 });
    this.stats.totalProbes++;
  }

  /**
   * Register a resource probe (checks CPU, memory, disk constraints)
   */
  registerResourceProbe(name, checkFn) {
    if (typeof checkFn !== 'function') {
      throw new Error('checkFn must be a function');
    }
    this.probes.resource.set(name, checkFn);
    this.probeStatus.set(`resource:${name}`, { status: 'pending', lastCheck: null, passCount: 0, failCount: 0 });
    this.stats.totalProbes++;
  }

  /**
   * Get status of a specific probe
   */
  getProbeStatus(name) {
    // Check all probe types for this name
    for (const [type, probes] of Object.entries(this.probes)) {
      if (probes.has(name)) {
        const key = `${type}:${name}`;
        return {
          name,
          type,
          ...this.probeStatus.get(key)
        };
      }
    }
    return null;
  }

  /**
   * Get all probe statuses
   */
  getAllProbeStatus() {
    const statuses = [];
    for (const [key, status] of this.probeStatus.entries()) {
      const [type, name] = key.split(':');
      statuses.push({ name, type, ...status });
    }
    return statuses;
  }

  /**
   * Wait for a probe to be ready (blocking)
   */
  async waitForReady(name, timeout = 30000) {
    const startTime = Date.now();
    const pollInterval = 100; // Check every 100ms

    while (Date.now() - startTime < timeout) {
      const status = this.getProbeStatus(name);
      
      if (status && status.status === 'ready') {
        return true;
      }

      // Check if probe exists
      let probeFound = false;
      for (const typeProbes of Object.values(this.probes)) {
        if (typeProbes.has(name)) {
          probeFound = true;
          break;
        }
      }

      if (!probeFound) {
        throw new Error(`Probe '${name}' not found`);
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Probe '${name}' did not reach ready state within ${timeout}ms`);
  }

  /**
   * Run a single probe check
   */
  async runProbeCheck(type, name, checkFn) {
    const key = `${type}:${name}`;
    const status = this.probeStatus.get(key);

    try {
      this.stats.probeCheckCount++;
      const result = await Promise.resolve(checkFn());

      if (result) {
        status.status = 'ready';
        status.passCount++;
        this.stats.probePassCount++;
      } else {
        status.status = 'not-ready';
        status.failCount++;
        this.stats.probeFailureCount++;
      }
      status.lastCheck = Date.now();
      this.emit('probe-check', { type, name, status: status.status });
    } catch (error) {
      status.status = 'error';
      status.failCount++;
      status.error = error.message;
      status.lastCheck = Date.now();
      this.stats.probeFailureCount++;
      this.emit('probe-error', { type, name, error: error.message });
    }
  }

  /**
   * Run all registered probes once
   */
  async runAllProbes() {
    const checks = [];

    // Run startup probes
    for (const [name, checkFn] of this.probes.startup.entries()) {
      checks.push(this.runProbeCheck('startup', name, checkFn));
    }

    // Run readiness probes
    for (const [name, checkFn] of this.probes.readiness.entries()) {
      checks.push(this.runProbeCheck('readiness', name, checkFn));
    }

    // Run liveness probes
    for (const [name, checkFn] of this.probes.liveness.entries()) {
      checks.push(this.runProbeCheck('liveness', name, checkFn));
    }

    // Run resource probes
    for (const [name, checkFn] of this.probes.resource.entries()) {
      checks.push(this.runProbeCheck('resource', name, checkFn));
    }

    await Promise.all(checks);
  }

  /**
   * Start polling all probes at regular intervals
   */
  startPolling(interval = null) {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    if (interval) {
      this.pollingInterval = interval;
    }

    const poll = async () => {
      try {
        await this.runAllProbes();
      } catch (error) {
        this.emit('polling-error', error);
      }

      if (this.isPolling) {
        this.pollingTimeout = setTimeout(poll, this.pollingInterval);
      }
    };

    // Run immediately, then on interval
    poll();
  }

  /**
   * Stop polling
   */
  stopPolling() {
    this.isPolling = false;
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
  }

  /**
   * Get failure rate for a probe
   */
  getProbeFailureRate(name) {
    const status = this.getProbeStatus(name);
    if (!status) {
      return null;
    }

    const total = status.passCount + status.failCount;
    if (total === 0) {
      return 0;
    }

    return status.failCount / total;
  }

  /**
   * Get statistics
   */
  getStats() {
    const probeStats = {};
    for (const [key, status] of this.probeStatus.entries()) {
      const [type, name] = key.split(':');
      probeStats[key] = {
        type,
        name,
        status: status.status,
        passCount: status.passCount,
        failCount: status.failCount,
        failureRate: this.getProbeFailureRate(name),
        lastCheck: status.lastCheck
      };
    }

    return {
      created: this.stats.created,
      uptime: Date.now() - this.stats.created,
      isPolling: this.isPolling,
      pollingInterval: this.pollingInterval,
      probeCheckCount: this.stats.probeCheckCount,
      probePassCount: this.stats.probePassCount,
      probeFailureCount: this.stats.probeFailureCount,
      totalProbes: this.stats.totalProbes,
      probeStats
    };
  }
}
