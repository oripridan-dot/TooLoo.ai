import { EventEmitter } from 'events';

/**
 * AutoScalingDecisionEngine - Scale up/down decision logic based on metrics
 * Evaluates CPU, memory, latency, queue depth, and error rate to make scaling decisions
 */
export default class AutoScalingDecisionEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.policies = new Map(); // serviceName -> policy config
    this.metrics = new Map(); // serviceName -> metrics history
    this.scalingHistory = new Map(); // serviceName -> [{ timestamp, decision, metrics }]
    this.defaultPolicy = {
      scaleUpThreshold: {
        cpuPercent: 70,
        memoryPercent: 80,
        latencyP95: 200,
        queueDepth: 100,
        errorRate: 5
      },
      scaleDownThreshold: {
        cpuPercent: 30,
        memoryPercent: 50,
        latencyP95: 50,
        queueDepth: 10,
        errorRate: 1
      },
      minInstances: 1,
      maxInstances: 10,
      cooldownSeconds: 300
    };
    this.stats = {
      created: Date.now(),
      scaleUpDecisions: 0,
      scaleDownDecisions: 0,
      holdDecisions: 0
    };
  }

  /**
   * Set scaling policy for a service
   */
  setScalingPolicy(serviceName, policy) {
    this.policies.set(serviceName, {
      ...this.defaultPolicy,
      ...policy
    });

    if (!this.scalingHistory.has(serviceName)) {
      this.scalingHistory.set(serviceName, []);
    }
  }

  /**
   * Get scaling policy for a service
   */
  getScalingPolicy(serviceName) {
    return this.policies.get(serviceName) || this.defaultPolicy;
  }

  /**
   * Record metrics for a service
   */
  recordMetrics(serviceName, metrics) {
    if (!this.metrics.has(serviceName)) {
      this.metrics.set(serviceName, []);
    }

    const metricsHistory = this.metrics.get(serviceName);
    metricsHistory.push({
      timestamp: Date.now(),
      ...metrics
    });

    // Keep only last 60 data points
    if (metricsHistory.length > 60) {
      metricsHistory.shift();
    }
  }

  /**
   * Get current metrics for a service
   */
  getScalingMetrics(serviceName) {
    const metricsHistory = this.metrics.get(serviceName) || [];

    if (metricsHistory.length === 0) {
      return null;
    }

    const latest = metricsHistory[metricsHistory.length - 1];
    return {
      timestamp: latest.timestamp,
      cpuPercent: latest.cpuPercent || 0,
      memoryPercent: latest.memoryPercent || 0,
      latencyP95: latest.latencyP95 || 0,
      queueDepth: latest.queueDepth || 0,
      errorRate: latest.errorRate || 0,
      instanceCount: latest.instanceCount || 1,
      requestsPerSecond: latest.requestsPerSecond || 0
    };
  }

  /**
   * Evaluate scaling decision for a service
   */
  evaluateScaling(serviceName, currentInstanceCount = 1) {
    const policy = this.getScalingPolicy(serviceName);
    const metrics = this.getScalingMetrics(serviceName);

    if (!metrics) {
      return 'HOLD';
    }

    // Check for scale up conditions
    const scaleUpConditions = [
      metrics.cpuPercent > policy.scaleUpThreshold.cpuPercent,
      metrics.memoryPercent > policy.scaleUpThreshold.memoryPercent,
      metrics.latencyP95 > policy.scaleUpThreshold.latencyP95,
      metrics.queueDepth > policy.scaleUpThreshold.queueDepth,
      metrics.errorRate > policy.scaleUpThreshold.errorRate
    ];

    if (scaleUpConditions.some(condition => condition)) {
      if (currentInstanceCount < policy.maxInstances) {
        this.stats.scaleUpDecisions++;
        const history = this.scalingHistory.get(serviceName) || [];
        history.push({
          timestamp: Date.now(),
          decision: 'SCALE_UP',
          metrics,
          reason: this.getScaleUpReason(metrics, policy)
        });
        this.scalingHistory.set(serviceName, history);
        this.emit('scaling-decision', { serviceName, decision: 'SCALE_UP', metrics });
        return 'SCALE_UP';
      }
    }

    // Check for scale down conditions (all must be true)
    const scaleDownConditions = [
      metrics.cpuPercent < policy.scaleDownThreshold.cpuPercent,
      metrics.memoryPercent < policy.scaleDownThreshold.memoryPercent,
      metrics.latencyP95 < policy.scaleDownThreshold.latencyP95,
      metrics.queueDepth < policy.scaleDownThreshold.queueDepth,
      metrics.errorRate < policy.scaleDownThreshold.errorRate
    ];

    if (scaleDownConditions.every(condition => condition)) {
      if (currentInstanceCount > policy.minInstances) {
        // Check cooldown
        const lastScalingEvent = this.getLastScalingEvent(serviceName);
        if (lastScalingEvent && lastScalingEvent.decision === 'SCALE_UP') {
          const timeSinceLastScale = Date.now() - lastScalingEvent.timestamp;
          if (timeSinceLastScale < policy.cooldownSeconds * 1000) {
            this.stats.holdDecisions++;
            return 'HOLD';
          }
        }

        this.stats.scaleDownDecisions++;
        const history = this.scalingHistory.get(serviceName) || [];
        history.push({
          timestamp: Date.now(),
          decision: 'SCALE_DOWN',
          metrics,
          reason: 'All metrics below thresholds'
        });
        this.scalingHistory.set(serviceName, history);
        this.emit('scaling-decision', { serviceName, decision: 'SCALE_DOWN', metrics });
        return 'SCALE_DOWN';
      }
    }

    this.stats.holdDecisions++;
    return 'HOLD';
  }

  /**
   * Get reason for scale up decision
   */
  getScaleUpReason(metrics, policy) {
    const reasons = [];

    if (metrics.cpuPercent > policy.scaleUpThreshold.cpuPercent) {
      reasons.push(`CPU ${metrics.cpuPercent}% > ${policy.scaleUpThreshold.cpuPercent}%`);
    }
    if (metrics.memoryPercent > policy.scaleUpThreshold.memoryPercent) {
      reasons.push(`Memory ${metrics.memoryPercent}% > ${policy.scaleUpThreshold.memoryPercent}%`);
    }
    if (metrics.latencyP95 > policy.scaleUpThreshold.latencyP95) {
      reasons.push(`Latency P95 ${metrics.latencyP95}ms > ${policy.scaleUpThreshold.latencyP95}ms`);
    }
    if (metrics.queueDepth > policy.scaleUpThreshold.queueDepth) {
      reasons.push(`Queue depth ${metrics.queueDepth} > ${policy.scaleUpThreshold.queueDepth}`);
    }
    if (metrics.errorRate > policy.scaleUpThreshold.errorRate) {
      reasons.push(`Error rate ${metrics.errorRate}% > ${policy.scaleUpThreshold.errorRate}%`);
    }

    return reasons.join('; ');
  }

  /**
   * Predict load needed for time window
   */
  predictLoadNeeded(serviceName, timeWindowSeconds = 300) {
    const metricsHistory = this.metrics.get(serviceName) || [];

    if (metricsHistory.length === 0) {
      return 1;
    }

    // Look at recent metrics (last 5 minutes)
    const now = Date.now();
    const recentMetrics = metricsHistory.filter(m => now - m.timestamp < timeWindowSeconds * 1000);

    if (recentMetrics.length === 0) {
      return 1;
    }

    // Use max CPU and memory from recent metrics
    const maxCpu = Math.max(...recentMetrics.map(m => m.cpuPercent || 0));
    const maxMemory = Math.max(...recentMetrics.map(m => m.memoryPercent || 0));

    // Estimate needed instances (simple heuristic)
    // Assume each instance can handle ~70% CPU safely
    const estimatedInstancesCpu = Math.ceil((maxCpu / 70) * (recentMetrics[0]?.instanceCount || 1));
    const estimatedInstancesMemory = Math.ceil((maxMemory / 80) * (recentMetrics[0]?.instanceCount || 1));

    return Math.max(1, Math.max(estimatedInstancesCpu, estimatedInstancesMemory));
  }

  /**
   * Get scaling history for a service
   */
  getScalingHistory(serviceName) {
    return this.scalingHistory.get(serviceName) || [];
  }

  /**
   * Get last scaling event
   */
  getLastScalingEvent(serviceName) {
    const history = this.scalingHistory.get(serviceName) || [];
    return history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      created: this.stats.created,
      uptime: Date.now() - this.stats.created,
      scaleUpDecisions: this.stats.scaleUpDecisions,
      scaleDownDecisions: this.stats.scaleDownDecisions,
      holdDecisions: this.stats.holdDecisions,
      totalDecisions: this.stats.scaleUpDecisions + this.stats.scaleDownDecisions + this.stats.holdDecisions,
      policiesConfigured: this.policies.size
    };
  }
}
