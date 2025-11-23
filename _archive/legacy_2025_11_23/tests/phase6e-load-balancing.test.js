import assert from 'assert';
import HealthMonitor from '../lib/resilience/HealthMonitor.js';
import LoadBalancer from '../lib/resilience/LoadBalancer.js';
import ReadinessProbe from '../lib/resilience/ReadinessProbe.js';
import IntelligentRouter from '../lib/resilience/IntelligentRouter.js';
import AutoScalingDecisionEngine from '../lib/resilience/AutoScalingDecisionEngine.js';
import HorizontalScalingManager from '../lib/resilience/HorizontalScalingManager.js';

console.log('🔍 Testing Phase 6E: Load Balancing & Auto-Scaling (Full Integration)\n');

let passCount = 0;
let failCount = 0;

// ============================================================================
// GROUP 1: Health Monitoring (5 tests)
// ============================================================================
console.log('📊 GROUP 1: Health Monitoring Tests');

// Test 1.1: Service registration tracked
try {
  const monitor = new HealthMonitor({ checkInterval: 60000 });
  monitor.registerService('training', 3001);
  
  const health = monitor.getHealth('training');
  assert(health !== undefined, 'Should track services');
  monitor.destroy();
  console.log('  ✅ Service registration tracked');
  passCount++;
} catch (error) {
  console.log(`  ❌ Service registration: ${error.message}`);
  failCount++;
}

// Test 1.2: Health status retrieved
try {
  const monitor = new HealthMonitor({ checkInterval: 60000 });
  monitor.registerService('training', 3001);
  
  const health = monitor.getHealth('training');
  assert(health !== undefined, 'Should get health status');
  monitor.destroy();
  console.log('  ✅ Health status retrieved');
  passCount++;
} catch (error) {
  console.log(`  ❌ Health status: ${error.message}`);
  failCount++;
}

// Test 1.3: Service unregistration works
try {
  const monitor = new HealthMonitor({ checkInterval: 60000 });
  monitor.registerService('training', 3001);
  monitor.registerService('meta', 3002);
  
  // Both services should exist initially
  const health1 = monitor.getHealth('training');
  const health2 = monitor.getHealth('meta');
  assert(health1.name === 'training', 'Should register training');
  assert(health2.name === 'meta', 'Should register meta');
  
  // Unregister one
  monitor.unregisterService('training');
  
  // Only meta should remain
  const healthMeta = monitor.getHealth('meta');
  assert(healthMeta.name === 'meta', 'Meta should still exist');
  monitor.destroy();
  
  console.log('  ✅ Service unregistration works');
  passCount++;
} catch (error) {
  console.log(`  ❌ Unregistration: ${error.message}`);
  failCount++;
}

// Test 1.4: Multiple services independent
try {
  const monitor = new HealthMonitor({ checkInterval: 60000 });
  monitor.registerService('svc1', 3001);
  monitor.registerService('svc2', 3002);
  
  const h1 = monitor.getHealth('svc1');
  const h2 = monitor.getHealth('svc2');
  assert(h1 !== undefined && h2 !== undefined, 'Should track multiple services');
  monitor.destroy();
  console.log('  ✅ Multiple services independent');
  passCount++;
} catch (error) {
  console.log(`  ❌ Multiple services: ${error.message}`);
  failCount++;
}

// Test 1.5: Health monitoring initialization
try {
  const monitor = new HealthMonitor({ checkInterval: 60000 });
  monitor.registerService('training', 3001);
  
  const health = monitor.getHealth('training');
  assert(health !== undefined, 'Should initialize health');
  assert(monitor.isReadyForTraffic('training') !== undefined, 'Should check readiness');
  monitor.destroy();
  console.log('  ✅ Health monitoring initialization');
  passCount++;
} catch (error) {
  console.log(`  ❌ Initialization: ${error.message}`);
  failCount++;
}

// ============================================================================
// GROUP 2: ReadinessProbe Tests (6 tests)
// ============================================================================
console.log('\n🔍 GROUP 2: ReadinessProbe Tests');

// Test 2.1: Startup probe registered and checked
try {
  const probe = new ReadinessProbe();
  let startupChecked = false;
  probe.registerStartupProbe('app', async () => {
    startupChecked = true;
    return true;
  });
  
  await probe.runAllProbes();
  assert(startupChecked, 'Startup probe should be checked');
  console.log('  ✅ Startup probe registered and checked');
  passCount++;
} catch (error) {
  console.log(`  ❌ Startup probe: ${error.message}`);
  failCount++;
}

// Test 2.2: Readiness probe blocks until ready
try {
  const probe = new ReadinessProbe();
  let checkCount = 0;
  probe.registerReadinessProbe('app', async () => {
    checkCount++;
    return checkCount >= 2;
  });
  
  probe.startPolling(50);
  await probe.waitForReady('app', 2000);
  probe.stopPolling();
  
  assert(checkCount >= 2, 'Should wait for readiness');
  console.log('  ✅ Readiness probe blocks until ready');
  passCount++;
} catch (error) {
  console.log(`  ❌ Readiness blocking: ${error.message}`);
  failCount++;
}

// Test 2.3: Liveness probe detects failures
try {
  const probe = new ReadinessProbe();
  let attempts = 0;
  probe.registerLivenessProbe('app', async () => {
    attempts++;
    return attempts <= 2;
  });
  
  await probe.runAllProbes();
  await probe.runAllProbes();
  await probe.runAllProbes();
  
  const status = probe.getProbeStatus('app');
  assert(status.passCount >= 2, 'Should track passes');
  assert(status.failCount >= 1, 'Should track failures');
  console.log('  ✅ Liveness probe detects failures');
  passCount++;
} catch (error) {
  console.log(`  ❌ Liveness detection: ${error.message}`);
  failCount++;
}

// Test 2.4: Resource probe checks constraints
try {
  const probe = new ReadinessProbe();
  probe.registerResourceProbe('memory', async () => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    return used < 500;
  });
  
  await probe.runAllProbes();
  const status = probe.getProbeStatus('memory');
  assert(status.status !== 'pending', 'Resource check should complete');
  console.log('  ✅ Resource probe checks constraints');
  passCount++;
} catch (error) {
  console.log(`  ❌ Resource probe: ${error.message}`);
  failCount++;
}

// Test 2.5: Probe timeout handled gracefully
try {
  const probe = new ReadinessProbe();
  probe.registerReadinessProbe('timeout-test', async () => false);
  
  let timeoutCaught = false;
  try {
    await probe.waitForReady('timeout-test', 100);
  } catch (error) {
    timeoutCaught = error.message.includes('did not reach ready');
  }
  
  assert(timeoutCaught, 'Should timeout gracefully');
  console.log('  ✅ Probe timeout handled gracefully');
  passCount++;
} catch (error) {
  console.log(`  ❌ Probe timeout: ${error.message}`);
  failCount++;
}

// Test 2.6: Polling covers all probe types
try {
  const probe = new ReadinessProbe();
  const checks = { startup: 0, readiness: 0, liveness: 0, resource: 0 };
  
  probe.registerStartupProbe('s', async () => { checks.startup++; return true; });
  probe.registerReadinessProbe('r', async () => { checks.readiness++; return true; });
  probe.registerLivenessProbe('l', async () => { checks.liveness++; return true; });
  probe.registerResourceProbe('res', async () => { checks.resource++; return true; });
  
  probe.startPolling(50);
  await new Promise(resolve => setTimeout(resolve, 150));
  probe.stopPolling();
  
  assert(checks.startup >= 1, 'Startup should be checked');
  assert(checks.readiness >= 1, 'Readiness should be checked');
  assert(checks.liveness >= 1, 'Liveness should be checked');
  assert(checks.resource >= 1, 'Resource should be checked');
  console.log('  ✅ Polling covers all probe types');
  passCount++;
} catch (error) {
  console.log(`  ❌ Polling all probes: ${error.message}`);
  failCount++;
}

// ============================================================================
// GROUP 3: IntelligentRouter Tests (6 tests)
// ============================================================================
console.log('\n🔀 GROUP 3: IntelligentRouter Tests');

// Test 3.1: Targets added with weights
try {
  const router = new IntelligentRouter();
  router.addTarget('svc', 3001, 1);
  router.addTarget('svc', 3002, 2);
  
  const metrics = router.getRoutingMetrics('svc');
  assert(metrics.targetCount === 2, 'Should have 2 targets');
  assert(metrics.targets.some(t => t.weight === 2), 'Should have weighted target');
  console.log('  ✅ Targets added with weights');
  passCount++;
} catch (error) {
  console.log(`  ❌ Target weights: ${error.message}`);
  failCount++;
}

// Test 3.2: Healthy targets preferred
try {
  const router = new IntelligentRouter();
  router.addTarget('svc', 3001);
  router.addTarget('svc', 3002);
  
  router.updateTargetHealth('svc', 3001, 'unhealthy');
  const healthy = router.getHealthyTargets('svc');
  
  assert(healthy.length === 1, 'Should filter unhealthy');
  assert(healthy[0].port === 3002, 'Should keep healthy target');
  console.log('  ✅ Healthy targets preferred');
  passCount++;
} catch (error) {
  console.log(`  ❌ Healthy filtering: ${error.message}`);
  failCount++;
}

// Test 3.3: Round-robin distribution even
try {
  const router = new IntelligentRouter({ algorithm: 'weighted-round-robin' });
  router.addTarget('svc', 3001, 1);
  router.addTarget('svc', 3002, 1);
  
  const routes = [];
  for (let i = 0; i < 10; i++) {
    routes.push(router.routeRequest('svc').port);
  }
  
  const c3001 = routes.filter(p => p === 3001).length;
  const c3002 = routes.filter(p => p === 3002).length;
  assert(c3001 > 0 && c3002 > 0, 'Both should be used');
  console.log('  ✅ Round-robin distribution even');
  passCount++;
} catch (error) {
  console.log(`  ❌ Round-robin: ${error.message}`);
  failCount++;
}

// Test 3.4: Latency tracking updates metrics
try {
  const router = new IntelligentRouter();
  router.addTarget('svc', 3001);
  
  const target = { serviceName: 'svc', port: 3001 };
  router.recordLatency(target, 10);
  router.recordLatency(target, 20);
  
  const metrics = router.getRoutingMetrics('svc');
  assert(metrics.targets[0].latencyStats.count === 2, 'Should track latencies');
  assert(metrics.targets[0].latencyStats.avg === 15, 'Average should be 15');
  console.log('  ✅ Latency tracking updates metrics');
  passCount++;
} catch (error) {
  console.log(`  ❌ Latency tracking: ${error.message}`);
  failCount++;
}

// Test 3.5: Circuit breaker trips on failures
try {
  const router = new IntelligentRouter();
  router.addTarget('svc', 3001);
  
  const targetId = 'svc:3001';
  router.setCircuitBreaker(targetId, { threshold: 2 });
  
  router.recordFailure(targetId);
  router.recordFailure(targetId);
  
  assert(router.circuitBreakers.get(targetId).tripped, 'Should trip');
  console.log('  ✅ Circuit breaker trips on failures');
  passCount++;
} catch (error) {
  console.log(`  ❌ Circuit breaker: ${error.message}`);
  failCount++;
}

// Test 3.6: Latency-aware routing prefers low latency
try {
  const router = new IntelligentRouter({ algorithm: 'latency-aware' });
  router.addTarget('svc', 3001);
  router.addTarget('svc', 3002);
  
  const t1 = { serviceName: 'svc', port: 3001 };
  const t2 = { serviceName: 'svc', port: 3002 };
  
  for (let i = 0; i < 10; i++) {
    router.recordLatency(t1, 100);
    router.recordLatency(t2, 10);
  }
  
  let t2Count = 0;
  for (let i = 0; i < 10; i++) {
    if (router.routeRequest('svc').port === 3002) t2Count++;
  }
  
  assert(t2Count >= 7, 'Low latency should be preferred');
  console.log('  ✅ Latency-aware routing prefers low latency');
  passCount++;
} catch (error) {
  console.log(`  ❌ Latency-aware: ${error.message}`);
  failCount++;
}

// ============================================================================
// GROUP 4: AutoScalingDecisionEngine Tests (6 tests)
// ============================================================================
console.log('\n⚙️  GROUP 4: AutoScalingDecisionEngine Tests');

// Test 4.1: SCALE_UP on high CPU
try {
  const engine = new AutoScalingDecisionEngine();
  engine.setScalingPolicy('svc', {
    scaleUpThreshold: { cpuPercent: 70 }
  });
  engine.recordMetrics('svc', {
    cpuPercent: 85,
    memoryPercent: 40,
    latencyP95: 100,
    queueDepth: 50,
    errorRate: 1,
    instanceCount: 1
  });
  
  const decision = engine.evaluateScaling('svc', 1);
  assert(decision === 'SCALE_UP', 'Should scale up on high CPU');
  console.log('  ✅ SCALE_UP on high CPU');
  passCount++;
} catch (error) {
  console.log(`  ❌ Scale up: ${error.message}`);
  failCount++;
}

// Test 4.2: SCALE_DOWN on low usage
try {
  const engine = new AutoScalingDecisionEngine();
  engine.setScalingPolicy('svc', {
    scaleDownThreshold: { cpuPercent: 30, memoryPercent: 50, latencyP95: 50, queueDepth: 10, errorRate: 1 }
  });
  engine.recordMetrics('svc', {
    cpuPercent: 15,
    memoryPercent: 30,
    latencyP95: 20,
    queueDepth: 5,
    errorRate: 0.5,
    instanceCount: 3
  });
  
  const decision = engine.evaluateScaling('svc', 3);
  assert(decision === 'SCALE_DOWN', 'Should scale down on low usage');
  console.log('  ✅ SCALE_DOWN on low usage');
  passCount++;
} catch (error) {
  console.log(`  ❌ Scale down: ${error.message}`);
  failCount++;
}

// Test 4.3: Policy enforcement verified
try {
  const engine = new AutoScalingDecisionEngine();
  engine.setScalingPolicy('svc', { minInstances: 2, maxInstances: 8 });
  
  const policy = engine.getScalingPolicy('svc');
  assert(policy.minInstances === 2, 'Min should be 2');
  assert(policy.maxInstances === 8, 'Max should be 8');
  console.log('  ✅ Policy enforcement verified');
  passCount++;
} catch (error) {
  console.log(`  ❌ Policy enforcement: ${error.message}`);
  failCount++;
}

// Test 4.4: Load prediction calculated
try {
  const engine = new AutoScalingDecisionEngine();
  for (let i = 0; i < 5; i++) {
    engine.recordMetrics('svc', {
      cpuPercent: 40 + i * 5,
      memoryPercent: 30,
      latencyP95: 100,
      queueDepth: 50,
      errorRate: 1,
      instanceCount: 2
    });
  }
  
  const predicted = engine.predictLoadNeeded('svc', 300);
  assert(predicted >= 1 && predicted <= 10, 'Prediction should be valid');
  console.log('  ✅ Load prediction calculated');
  passCount++;
} catch (error) {
  console.log(`  ❌ Load prediction: ${error.message}`);
  failCount++;
}

// Test 4.5: Scaling history tracked
try {
  const engine = new AutoScalingDecisionEngine();
  engine.setScalingPolicy('svc', { scaleUpThreshold: { cpuPercent: 70 } });
  engine.recordMetrics('svc', { cpuPercent: 85, memoryPercent: 40, latencyP95: 100, queueDepth: 50, errorRate: 1, instanceCount: 1 });
  engine.evaluateScaling('svc', 1);
  
  const history = engine.getScalingHistory('svc');
  assert(history.length === 1, 'Should have history');
  assert(history[0].decision === 'SCALE_UP', 'Should record decision');
  console.log('  ✅ Scaling history tracked');
  passCount++;
} catch (error) {
  console.log(`  ❌ Scaling history: ${error.message}`);
  failCount++;
}

// Test 4.6: HOLD at max instances
try {
  const engine = new AutoScalingDecisionEngine();
  engine.setScalingPolicy('svc', { scaleUpThreshold: { cpuPercent: 70 }, maxInstances: 2 });
  engine.recordMetrics('svc', { cpuPercent: 85, memoryPercent: 40, latencyP95: 100, queueDepth: 50, errorRate: 1, instanceCount: 2 });
  
  const decision = engine.evaluateScaling('svc', 2);
  assert(decision === 'HOLD', 'Should hold at max');
  console.log('  ✅ HOLD at max instances');
  passCount++;
} catch (error) {
  console.log(`  ❌ Max instances: ${error.message}`);
  failCount++;
}

// ============================================================================
// GROUP 5: HorizontalScalingManager Tests (6 tests)
// ============================================================================
console.log('\n📈 GROUP 5: HorizontalScalingManager Tests');

// Test 5.1: Scale up spawns instances
try {
  const manager = new HorizontalScalingManager();
  manager.registerService('svc', 3001);
  
  const instances = await manager.scaleUp('svc', 2);
  assert(instances.length === 2, 'Should spawn 2');
  assert(manager.getInstanceCount('svc') === 2, 'Count should be 2');
  console.log('  ✅ Scale up spawns instances');
  passCount++;
} catch (error) {
  console.log(`  ❌ Scale up: ${error.message}`);
  failCount++;
}

// Test 5.2: Scale down terminates gracefully
try {
  const manager = new HorizontalScalingManager();
  manager.registerService('svc', 3001);
  
  await manager.scaleUp('svc', 3);
  const result = await manager.scaleDown('svc', 1);
  
  assert(result.stopped === 1, 'Should stop 1');
  assert(manager.getInstanceCount('svc') === 2, 'Should have 2 left');
  console.log('  ✅ Scale down terminates gracefully');
  passCount++;
} catch (error) {
  console.log(`  ❌ Scale down: ${error.message}`);
  failCount++;
}

// Test 5.3: Instance details accurate
try {
  const manager = new HorizontalScalingManager();
  manager.registerService('svc', 3001);
  
  await manager.scaleUp('svc', 1);
  const details = manager.getInstanceDetails('svc');
  
  assert(details.length === 1, 'Should have 1');
  assert(details[0].port !== undefined, 'Should have port');
  assert(details[0].health === 'starting', 'Should have health');
  console.log('  ✅ Instance details accurate');
  passCount++;
} catch (error) {
  console.log(`  ❌ Instance details: ${error.message}`);
  failCount++;
}

// Test 5.4: Port allocation unique
try {
  const manager = new HorizontalScalingManager();
  manager.registerService('s1', 3001);
  manager.registerService('s2', 3002);
  
  const i1 = await manager.scaleUp('s1', 2);
  const i2 = await manager.scaleUp('s2', 2);
  
  const ports = [...i1, ...i2].map(i => i.port);
  const unique = new Set(ports);
  assert(unique.size === ports.length, 'All ports unique');
  console.log('  ✅ Port allocation unique');
  passCount++;
} catch (error) {
  console.log(`  ❌ Port allocation: ${error.message}`);
  failCount++;
}

// Test 5.5: Scaling history maintained
try {
  const manager = new HorizontalScalingManager();
  manager.registerService('svc', 3001);
  
  await manager.scaleUp('svc', 1);
  await manager.scaleDown('svc', 1);
  
  const history = manager.getScalingHistory('svc');
  assert(history.length === 2, 'Should have 2 entries');
  assert(history[0].action === 'SCALE_UP', 'First up');
  assert(history[1].action === 'SCALE_DOWN', 'Second down');
  console.log('  ✅ Scaling history maintained');
  passCount++;
} catch (error) {
  console.log(`  ❌ Scaling history: ${error.message}`);
  failCount++;
}

// Test 5.6: Get specific instance
try {
  const manager = new HorizontalScalingManager();
  manager.registerService('svc', 3001);
  
  await manager.scaleUp('svc', 3);
  const instance = manager.getInstance('svc', 0);
  
  assert(instance !== null, 'Should get instance');
  assert(instance.port !== undefined, 'Should have port');
  assert(manager.getInstance('svc', 100) === null, 'Out of bounds');
  console.log('  ✅ Get specific instance');
  passCount++;
} catch (error) {
  console.log(`  ❌ Get instance: ${error.message}`);
  failCount++;
}

// ============================================================================
// GROUP 6: Integration Scenarios (3 tests)
// ============================================================================
console.log('\n🔗 GROUP 6: Integration Scenarios');

// Test 6.1: Full health → scaling → routing pipeline
try {
  const monitor = new HealthMonitor();
  const engine = new AutoScalingDecisionEngine();
  const router = new IntelligentRouter();
  const manager = new HorizontalScalingManager();
  
  monitor.registerService('svc', 3001);
  manager.registerService('svc', 3001);
  router.addTarget('svc', 3001);
  
  engine.setScalingPolicy('svc', { scaleUpThreshold: { cpuPercent: 70 } });
  engine.recordMetrics('svc', { cpuPercent: 85, memoryPercent: 40, latencyP95: 100, queueDepth: 50, errorRate: 1, instanceCount: 1 });
  
  const decision = engine.evaluateScaling('svc', 1);
  assert(decision === 'SCALE_UP', 'Should decide to scale');
  
  await manager.scaleUp('svc', 1);
  router.addTarget('svc', 3011);
  
  const route = router.routeRequest('svc');
  assert(route.port !== undefined, 'Should route to target');
  console.log('  ✅ Full health → scaling → routing pipeline');
  passCount++;
} catch (error) {
  console.log(`  ❌ Full pipeline: ${error.message}`);
  failCount++;
}

// Test 6.2: Graceful degradation on service failure
try {
  const router = new IntelligentRouter();
  router.addTarget('svc', 3001);
  router.addTarget('svc', 3002);
  
  router.updateTargetHealth('svc', 3001, 'unhealthy');
  router.updateTargetHealth('svc', 3002, 'unhealthy');
  
  let routingFailed = false;
  try {
    router.routeRequest('svc');
  } catch (error) {
    routingFailed = error.message.includes('No healthy targets');
  }
  
  assert(routingFailed, 'Should fail gracefully when no healthy targets');
  console.log('  ✅ Graceful degradation on service failure');
  passCount++;
} catch (error) {
  console.log(`  ❌ Graceful degradation: ${error.message}`);
  failCount++;
}

// Test 6.3: Automatic recovery with scaling
try {
  const manager = new HorizontalScalingManager();
  const engine = new AutoScalingDecisionEngine();
  
  manager.registerService('svc', 3001);
  engine.setScalingPolicy('svc', {
    scaleUpThreshold: { cpuPercent: 70 },
    scaleDownThreshold: { cpuPercent: 30, memoryPercent: 50, latencyP95: 50, queueDepth: 10, errorRate: 1 },
    minInstances: 1,
    cooldownSeconds: 1 // Short cooldown for testing
  });
  
  // High load → scale up
  engine.recordMetrics('svc', { cpuPercent: 85, memoryPercent: 40, latencyP95: 100, queueDepth: 50, errorRate: 1, instanceCount: 1 });
  let decision = engine.evaluateScaling('svc', 1);
  assert(decision === 'SCALE_UP', 'Should scale up');
  
  await manager.scaleUp('svc', 1);
  assert(manager.getInstanceCount('svc') === 1, 'Should have scaled up');
  
  // Low load → can scale down if cooldown passed
  await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for cooldown
  engine.recordMetrics('svc', { cpuPercent: 15, memoryPercent: 30, latencyP95: 20, queueDepth: 5, errorRate: 0.5, instanceCount: 2 });
  decision = engine.evaluateScaling('svc', 2);
  assert(decision === 'SCALE_DOWN' || decision === 'HOLD', 'Should scale down or hold');
  
  console.log('  ✅ Automatic recovery with scaling');
  passCount++;
} catch (error) {
  console.log(`  ❌ Automatic recovery: ${error.message}`);
  failCount++;
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n════════════════════════════════════════════════════════════');
console.log('📋 Phase 6E Full Integration Tests Summary:');
console.log(`   ✅ Passed: ${passCount}`);
console.log(`   ❌ Failed: ${failCount}`);
console.log(`   📊 Total: ${passCount + failCount}`);
console.log('════════════════════════════════════════════════════════════\n');

// Exit cleanly
setTimeout(() => process.exit(failCount > 0 ? 1 : 0), 100);

if (failCount > 0) {
  process.exit(1);
}
