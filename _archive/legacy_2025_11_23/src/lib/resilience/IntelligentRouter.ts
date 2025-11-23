import { EventEmitter } from 'events';

/**
 * IntelligentRouter - Health-aware request routing with latency tracking
 * Supports multiple routing algorithms and circuit breaker patterns
 */
export default class IntelligentRouter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.targets = new Map(); // serviceName -> Map(targetId -> { port, weight, health, latencies })
    this.routingAlgorithm = options.algorithm || 'weighted-round-robin';
    this.roundRobinCounters = new Map(); // serviceName -> counter
    this.circuitBreakers = new Map(); // targetId -> { tripped, failureCount, lastFailure }
    this.latencyHistogram = new Map(); // targetId -> [latencies]
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.stats = {
      created: Date.now(),
      routeCount: 0,
      healthFilters: 0,
      circuitBreakerTrips: 0,
      errors: 0
    };
  }

  /**
   * Add a target service instance
   */
  addTarget(serviceName, port, weight = 1) {
    if (!this.targets.has(serviceName)) {
      this.targets.set(serviceName, new Map());
      this.roundRobinCounters.set(serviceName, 0);
    }

    const targetId = `${serviceName}:${port}`;
    const serviceTargets = this.targets.get(serviceName);
    serviceTargets.set(targetId, {
      serviceName,
      port,
      weight: Math.max(1, weight),
      health: 'healthy',
      lastHealthCheck: Date.now(),
      latencies: []
    });

    this.latencyHistogram.set(targetId, []);
    this.circuitBreakers.set(targetId, {
      tripped: false,
      failureCount: 0,
      successCount: 0,
      lastFailure: null,
      threshold: 5,
      timeout: 60000
    });

    this.emit('target-added', { serviceName, port, targetId });
  }

  /**
   * Get healthy targets for a service
   */
  getHealthyTargets(serviceName) {
    const serviceTargets = this.targets.get(serviceName);
    if (!serviceTargets) {
      return [];
    }

    const healthy = [];
    for (const [targetId, target] of serviceTargets.entries()) {
      const breaker = this.circuitBreakers.get(targetId);
      
      // Check if circuit breaker is still tripped
      if (breaker.tripped) {
        const timeSinceFailure = Date.now() - breaker.lastFailure;
        if (timeSinceFailure > breaker.timeout) {
          breaker.tripped = false;
          breaker.failureCount = 0;
          breaker.successCount = 0;
        } else {
          continue; // Skip this target
        }
      }

      if (target.health === 'healthy') {
        healthy.push(target);
      }
    }

    this.stats.healthFilters += Math.max(0, serviceTargets.size - healthy.length);
    return healthy;
  }

  /**
   * Route a request to a target (main routing logic)
   */
  routeRequest(serviceName) {
    const healthyTargets = this.getHealthyTargets(serviceName);

    if (healthyTargets.length === 0) {
      throw new Error(`No healthy targets available for service '${serviceName}'`);
    }

    let selectedTarget;

    switch (this.routingAlgorithm) {
      case 'weighted-round-robin':
        selectedTarget = this.weightedRoundRobin(serviceName, healthyTargets);
        break;
      case 'least-connections':
        selectedTarget = this.leastConnections(healthyTargets);
        break;
      case 'latency-aware':
        selectedTarget = this.latencyAware(healthyTargets);
        break;
      case 'random':
        selectedTarget = healthyTargets[Math.floor(Math.random() * healthyTargets.length)];
        break;
      default:
        selectedTarget = this.weightedRoundRobin(serviceName, healthyTargets);
    }

    this.stats.routeCount++;
    return {
      host: '127.0.0.1',
      port: selectedTarget.port,
      weight: selectedTarget.weight,
      serviceName: selectedTarget.serviceName
    };
  }

  /**
   * Weighted round-robin algorithm
   */
  weightedRoundRobin(serviceName, targets) {
    const counter = this.roundRobinCounters.get(serviceName) || 0;
    const totalWeight = targets.reduce((sum, t) => sum + t.weight, 0);
    const index = counter % totalWeight;

    let accumulated = 0;
    for (const target of targets) {
      accumulated += target.weight;
      if (index < accumulated) {
        this.roundRobinCounters.set(serviceName, counter + 1);
        return target;
      }
    }

    this.roundRobinCounters.set(serviceName, counter + 1);
    return targets[0];
  }

  /**
   * Least connections algorithm
   */
  leastConnections(targets) {
    if (targets.length === 0) {
      throw new Error('No targets available');
    }

    let minConnections = Infinity;
    let selectedTarget = targets[0];

    for (const target of targets) {
      const connections = target.activeConnections || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedTarget = target;
      }
    }

    return selectedTarget;
  }

  /**
   * Latency-aware algorithm (prefers low-latency targets)
   */
  latencyAware(targets) {
    if (targets.length === 0) {
      throw new Error('No targets available');
    }

    let bestTarget = targets[0];
    let bestLatency = this.getAverageLatency(bestTarget);

    for (const target of targets) {
      const latency = this.getAverageLatency(target);
      if (latency < bestLatency) {
        bestLatency = latency;
        bestTarget = target;
      }
    }

    return bestTarget;
  }

  /**
   * Record latency for a target
   */
  recordLatency(target, latency) {
    const targetId = `${target.serviceName}:${target.port}`;
    const histogram = this.latencyHistogram.get(targetId);

    if (histogram) {
      histogram.push(latency);
      if (histogram.length > this.maxHistorySize) {
        histogram.shift();
      }
    }

    const serviceTarget = this.targets.get(target.serviceName)?.get(targetId);
    if (serviceTarget) {
      serviceTarget.latencies = histogram || [];
    }
  }

  /**
   * Get average latency for a target
   */
  getAverageLatency(target) {
    const targetId = `${target.serviceName}:${target.port}`;
    const histogram = this.latencyHistogram.get(targetId) || [];

    if (histogram.length === 0) {
      return 0;
    }

    const sum = histogram.reduce((a, b) => a + b, 0);
    return sum / histogram.length;
  }

  /**
   * Get percentile latency
   */
  getLatencyPercentile(target, percentile) {
    const targetId = `${target.serviceName}:${target.port}`;
    const histogram = this.latencyHistogram.get(targetId) || [];

    if (histogram.length === 0) {
      return 0;
    }

    const sorted = [...histogram].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Set circuit breaker for a target
   */
  setCircuitBreaker(targetId, config) {
    const breaker = this.circuitBreakers.get(targetId);
    if (breaker) {
      Object.assign(breaker, {
        threshold: config.threshold || breaker.threshold,
        timeout: config.timeout || breaker.timeout
      });
    }
  }

  /**
   * Record a failure for circuit breaker
   */
  recordFailure(targetId) {
    const breaker = this.circuitBreakers.get(targetId);
    if (breaker) {
      breaker.failureCount++;
      breaker.lastFailure = Date.now();
      breaker.successCount = 0;

      if (breaker.failureCount >= breaker.threshold) {
        breaker.tripped = true;
        this.stats.circuitBreakerTrips++;
        this.emit('circuit-breaker-tripped', { targetId });
      }
    }
  }

  /**
   * Record a success for circuit breaker
   */
  recordSuccess(targetId) {
    const breaker = this.circuitBreakers.get(targetId);
    if (breaker) {
      breaker.successCount++;
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);

      if (breaker.tripped && breaker.successCount > breaker.threshold / 2) {
        breaker.tripped = false;
        this.emit('circuit-breaker-reset', { targetId });
      }
    }
  }

  /**
   * Reset circuit breaker for a target
   */
  resetCircuitBreaker(targetId) {
    const breaker = this.circuitBreakers.get(targetId);
    if (breaker) {
      breaker.tripped = false;
      breaker.failureCount = 0;
      breaker.successCount = 0;
    }
  }

  /**
   * Update target health status
   */
  updateTargetHealth(serviceName, port, health) {
    const targetId = `${serviceName}:${port}`;
    const serviceTargets = this.targets.get(serviceName);
    
    if (serviceTargets && serviceTargets.has(targetId)) {
      const target = serviceTargets.get(targetId);
      target.health = health;
      target.lastHealthCheck = Date.now();
      this.emit('health-updated', { serviceName, port, health, targetId });
    }
  }

  /**
   * Get routing metrics for a service
   */
  getRoutingMetrics(serviceName) {
    const serviceTargets = this.targets.get(serviceName);
    if (!serviceTargets) {
      return null;
    }

    const metrics = {
      serviceName,
      targetCount: serviceTargets.size,
      healthyCount: this.getHealthyTargets(serviceName).length,
      targets: []
    };

    for (const [targetId, target] of serviceTargets.entries()) {
      const histogram = this.latencyHistogram.get(targetId) || [];
      metrics.targets.push({
        port: target.port,
        weight: target.weight,
        health: target.health,
        latencyStats: {
          count: histogram.length,
          avg: this.getAverageLatency(target),
          p95: this.getLatencyPercentile(target, 95),
          p99: this.getLatencyPercentile(target, 99)
        },
        circuitBreakerStatus: this.circuitBreakers.get(targetId).tripped ? 'tripped' : 'closed'
      });
    }

    return metrics;
  }

  /**
   * Get overall statistics
   */
  getStats() {
    return {
      created: this.stats.created,
      uptime: Date.now() - this.stats.created,
      routingAlgorithm: this.routingAlgorithm,
      routeCount: this.stats.routeCount,
      healthFilters: this.stats.healthFilters,
      circuitBreakerTrips: this.stats.circuitBreakerTrips,
      errors: this.stats.errors,
      serviceCount: this.targets.size
    };
  }
}
