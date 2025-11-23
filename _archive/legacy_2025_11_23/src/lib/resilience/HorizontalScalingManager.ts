import { spawn } from 'child_process';
import { EventEmitter } from 'events';

/**
 * HorizontalScalingManager - Spawn and shutdown service instances
 * Manages instance lifecycle, port allocation, and graceful scaling
 */
export default class HorizontalScalingManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.instances = new Map(); // serviceName -> Map(instanceId -> { port, pid, startTime, health })
    this.serviceBasePorts = new Map(); // serviceName -> basePort (e.g. training-server -> 3001)
    this.runningInstances = new Map(); // serviceName -> count
    this.scalingHistory = [];
    this.shutdownTimeout = options.shutdownTimeout || 5000;
    this.stats = {
      created: Date.now(),
      totalInstancesSpawned: 0,
      totalInstancesTerminated: 0,
      failedScaleAttempts: 0
    };
  }

  /**
   * Register a service with base port
   */
  registerService(serviceName, basePort) {
    this.serviceBasePorts.set(serviceName, basePort);
    this.instances.set(serviceName, new Map());
    this.runningInstances.set(serviceName, 0);
  }

  /**
   * Scale up: spawn new instances
   */
  async scaleUp(serviceName, count = 1) {
    if (!this.serviceBasePorts.has(serviceName)) {
      throw new Error(`Service '${serviceName}' not registered`);
    }

    const basePort = this.serviceBasePorts.get(serviceName);
    const serviceInstances = this.instances.get(serviceName);
    const currentCount = serviceInstances.size;
    const spawnedInstances = [];

    for (let i = 0; i < count; i++) {
      try {
        // Find next available port
        let port = basePort + 10; // Start scaling at basePort + 10
        while (this.isPortInUse(port)) {
          port++;
        }

        // Spawn instance (mock for testing)
        const instanceId = `${serviceName}:${port}`;
        const instance = {
          port,
          pid: Math.random() * 10000 | 0, // Mock PID
          startTime: Date.now(),
          health: 'starting'
        };

        serviceInstances.set(instanceId, instance);
        spawnedInstances.push({ port, pid: instance.pid, startTime: instance.startTime });
        this.stats.totalInstancesSpawned++;

        this.emit('instance-spawned', { serviceName, port, pid: instance.pid });
      } catch (error) {
        this.stats.failedScaleAttempts++;
        this.emit('scale-error', { serviceName, error: error.message });
      }
    }

    const newCount = serviceInstances.size;
    this.runningInstances.set(serviceName, newCount);

    this.scalingHistory.push({
      timestamp: Date.now(),
      action: 'SCALE_UP',
      serviceName,
      count: spawnedInstances.length,
      oldInstanceCount: currentCount,
      newInstanceCount: newCount,
      instances: spawnedInstances
    });

    return spawnedInstances;
  }

  /**
   * Scale down: terminate instances
   */
  async scaleDown(serviceName, count = 1) {
    if (!this.serviceBasePorts.has(serviceName)) {
      throw new Error(`Service '${serviceName}' not registered`);
    }

    const serviceInstances = this.instances.get(serviceName);
    const currentCount = serviceInstances.size;
    let stoppedCount = 0;
    let skippedCount = 0;

    // Get instances to remove (prefer newer ones)
    const instancesList = Array.from(serviceInstances.entries());
    const toRemove = instancesList.slice(-count); // Remove newest instances

    for (const [instanceId, instance] of toRemove) {
      try {
        // Graceful shutdown (mock for testing)
        instance.health = 'stopping';
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulated shutdown
        
        serviceInstances.delete(instanceId);
        stoppedCount++;
        this.stats.totalInstancesTerminated++;

        this.emit('instance-terminated', { serviceName, port: instance.port, pid: instance.pid });
      } catch (error) {
        skippedCount++;
        this.emit('shutdown-error', { serviceName, error: error.message });
      }
    }

    const newCount = serviceInstances.size;
    this.runningInstances.set(serviceName, newCount);

    this.scalingHistory.push({
      timestamp: Date.now(),
      action: 'SCALE_DOWN',
      serviceName,
      count: stoppedCount,
      skipped: skippedCount,
      oldInstanceCount: currentCount,
      newInstanceCount: newCount
    });

    return { stopped: stoppedCount, skipped: skippedCount };
  }

  /**
   * Get instance count for a service
   */
  getInstanceCount(serviceName) {
    const serviceInstances = this.instances.get(serviceName);
    return serviceInstances ? serviceInstances.size : 0;
  }

  /**
   * Get all instances for a service
   */
  getInstanceDetails(serviceName) {
    const serviceInstances = this.instances.get(serviceName);
    if (!serviceInstances) {
      return [];
    }

    return Array.from(serviceInstances.values()).map(instance => ({
      port: instance.port,
      pid: instance.pid,
      startTime: instance.startTime,
      uptime: Date.now() - instance.startTime,
      health: instance.health
    }));
  }

  /**
   * Get specific instance
   */
  getInstance(serviceName, instanceNum) {
    const serviceInstances = this.instances.get(serviceName);
    if (!serviceInstances) {
      return null;
    }

    const instancesList = Array.from(serviceInstances.values());
    if (instanceNum < 0 || instanceNum >= instancesList.length) {
      return null;
    }

    const instance = instancesList[instanceNum];
    return {
      port: instance.port,
      pid: instance.pid,
      startTime: instance.startTime,
      uptime: Date.now() - instance.startTime,
      health: instance.health
    };
  }

  /**
   * Update instance health
   */
  updateInstanceHealth(serviceName, port, health) {
    const serviceInstances = this.instances.get(serviceName);
    if (!serviceInstances) {
      return;
    }

    for (const [instanceId, instance] of serviceInstances.entries()) {
      if (instance.port === port) {
        instance.health = health;
        this.emit('instance-health-updated', { serviceName, port, health });
        return;
      }
    }
  }

  /**
   * Get scaling history
   */
  getScalingHistory(serviceName = null) {
    if (serviceName) {
      return this.scalingHistory.filter(entry => entry.serviceName === serviceName);
    }
    return this.scalingHistory;
  }

  /**
   * Check if port is in use
   */
  isPortInUse(port) {
    for (const [serviceName, instances] of this.instances.entries()) {
      for (const [instanceId, instance] of instances.entries()) {
        if (instance.port === port) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get all active instances
   */
  getAllInstances() {
    const allInstances = {};
    
    for (const [serviceName, instances] of this.instances.entries()) {
      allInstances[serviceName] = Array.from(instances.values()).map(instance => ({
        port: instance.port,
        pid: instance.pid,
        startTime: instance.startTime,
        health: instance.health
      }));
    }

    return allInstances;
  }

  /**
   * Get statistics
   */
  getStats() {
    const serviceStats = {};
    for (const [serviceName, instances] of this.instances.entries()) {
      serviceStats[serviceName] = {
        currentInstanceCount: instances.size,
        totalSpawned: this.stats.totalInstancesSpawned,
        totalTerminated: this.stats.totalInstancesTerminated
      };
    }

    return {
      created: this.stats.created,
      uptime: Date.now() - this.stats.created,
      totalInstancesSpawned: this.stats.totalInstancesSpawned,
      totalInstancesTerminated: this.stats.totalInstancesTerminated,
      failedScaleAttempts: this.stats.failedScaleAttempts,
      scalingHistoryCount: this.scalingHistory.length,
      serviceStats
    };
  }
}
