import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { MultiInstanceOrchestrator } from './orchestrator.js';

describe('MultiInstanceOrchestrator - Real Metrics', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new MultiInstanceOrchestrator();
  });

  afterEach(async () => {
    if (orchestrator.isRunning) {
      await orchestrator.stop();
    }
  });

  it('should start with correct number of instances', async () => {
    const result = await orchestrator.start({ instances: 4, shards: 2 });
    
    assert.strictEqual(result.started, true);
    assert.strictEqual(result.instances, 4);
    assert.strictEqual(result.shards, 2);
    assert.strictEqual(result.pids.length, 4);
  });

  it('should track CPU and memory metrics', async () => {
    await orchestrator.start({ instances: 4 });
    
    // Wait for metrics collection
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const status = orchestrator.getStatus();
    
    assert.ok(status.running);
    assert.ok(status.metrics.cpuUtilization);
    assert.ok(status.metrics.memoryUsage);
    assert.match(status.metrics.cpuUtilization, /\d+%/);
    assert.match(status.metrics.memoryUsage, /\d+MB/);
  });

  it('should calculate real throughput from requests', async () => {
    await orchestrator.start({ instances: 4 });
    
    // Simulate workload
    orchestrator.simulateWorkload(2000, 100); // 2 sec, 100 req/sec
    
    // Wait for workload completion
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const status = orchestrator.getStatus();
    const throughputMatch = status.metrics.throughput.match(/(\d+) req\/sec/);
    
    assert.ok(throughputMatch);
    const throughput = parseInt(throughputMatch[1]);
    
    // Should be approximately 100 req/sec (within 30% tolerance)
    assert.ok(throughput >= 70 && throughput <= 130, 
      `Expected throughput 70-130 req/sec, got ${throughput}`);
  });

  it('should calculate latency percentiles', async () => {
    await orchestrator.start({ instances: 4 });
    
    // Track requests with varied latencies
    for (let i = 0; i < 50; i++) {
      orchestrator.trackRequest(i % 4, 30 + i * 2); // Range from 30ms to 130ms
    }
    
    // Add some outliers for p95 and p99
    for (let i = 0; i < 10; i++) {
      orchestrator.trackRequest(0, 200 + i * 10); // 200-290ms for p95 range
    }
    orchestrator.trackRequest(0, 500); // p99 outlier
    orchestrator.trackRequest(0, 600); // p99 outlier
    
    const percentiles = orchestrator.calculateLatencyPercentiles();
    
    assert.ok(percentiles.p50 > 0);
    assert.ok(percentiles.p95 >= percentiles.p50);
    assert.ok(percentiles.p99 >= percentiles.p95);
    assert.ok(typeof percentiles.p50 === 'number');
    assert.ok(typeof percentiles.p95 === 'number');
    assert.ok(typeof percentiles.p99 === 'number');
  });

  it('should calculate speedup ratio', async () => {
    await orchestrator.start({ instances: 4 });
    
    // Simulate workload
    orchestrator.simulateWorkload(1000, 100);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const speedup = orchestrator.calculateSpeedupRatio();
    
    assert.ok(speedup > 0);
    assert.ok(speedup <= 4); // Can't exceed instance count
    assert.strictEqual(typeof speedup, 'number');
  });

  it('should calculate efficiency score', async () => {
    await orchestrator.start({ instances: 4 });
    
    // Simulate workload
    orchestrator.simulateWorkload(1000, 100);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const efficiency = orchestrator.calculateEfficiencyScore();
    
    assert.ok(efficiency >= 0);
    assert.ok(efficiency <= 1);
    assert.strictEqual(typeof efficiency, 'number');
  });

  it('should track request distribution across shards', async () => {
    await orchestrator.start({ instances: 4, shards: 2 });
    
    // Track requests
    for (let i = 0; i < 100; i++) {
      orchestrator.trackRequest(i % 4, 50);
    }
    
    const distribution = orchestrator.getRequestDistribution();
    
    assert.ok(distribution[0] !== undefined);
    assert.ok(distribution[1] !== undefined);
    assert.strictEqual(distribution[0] + distribution[1], 100);
  });

  it('should return comprehensive stats on stop', async () => {
    await orchestrator.start({ instances: 4, shards: 2 });
    
    // Simulate some workload
    orchestrator.simulateWorkload(1000, 100);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const result = await orchestrator.stop();
    
    assert.strictEqual(result.stopped, true);
    assert.ok(result.stats);
    
    const stats = result.stats;
    
    // Verify all required metrics are present
    assert.strictEqual(stats.instances, 4);
    assert.strictEqual(stats.shards, 2);
    assert.ok(stats.durationMs > 0);
    assert.ok(stats.speedupRatio > 0);
    assert.match(stats.cpuUtilization, /\d+%/);
    assert.match(stats.memoryUsage, /\d+MB/);
    assert.match(stats.throughput, /\d+ req\/sec/);
    assert.ok(typeof stats.latencyP50 === 'number');
    assert.ok(typeof stats.latencyP95 === 'number');
    assert.ok(typeof stats.latencyP99 === 'number');
    assert.ok(typeof stats.efficiencyScore === 'number');
    assert.ok(stats.requestDistribution);
    assert.ok(stats.totalRequests > 0);
  });

  it('should meet accuracy requirement (within 10%)', async () => {
    await orchestrator.start({ instances: 4 });
    
    // Simulate known workload: 100 req/sec for 2 seconds = 200 requests
    const expectedRequests = 200;
    orchestrator.simulateWorkload(2000, 100);
    
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const result = await orchestrator.stop();
    const actualRequests = result.stats.totalRequests;
    
    // Check within 10% tolerance
    const lowerBound = expectedRequests * 0.9;
    const upperBound = expectedRequests * 1.1;
    
    assert.ok(actualRequests >= lowerBound && actualRequests <= upperBound,
      `Expected ${expectedRequests} ±10% requests, got ${actualRequests}`);
  });

  it('should handle multiple start/stop cycles', async () => {
    // First cycle
    await orchestrator.start({ instances: 2 });
    orchestrator.simulateWorkload(500, 50);
    await new Promise(resolve => setTimeout(resolve, 800));
    const result1 = await orchestrator.stop();
    
    assert.strictEqual(result1.stopped, true);
    
    // Second cycle
    await orchestrator.start({ instances: 4 });
    orchestrator.simulateWorkload(500, 50);
    await new Promise(resolve => setTimeout(resolve, 800));
    const result2 = await orchestrator.stop();
    
    assert.strictEqual(result2.stopped, true);
    assert.strictEqual(result2.stats.instances, 4);
  });

  it('should not allow starting when already running', async () => {
    await orchestrator.start({ instances: 2 });
    
    try {
      await orchestrator.start({ instances: 4 });
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.match(error.message, /already running/i);
    }
  });
});
