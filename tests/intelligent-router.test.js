import assert from 'assert';
import IntelligentRouter from '../lib/resilience/IntelligentRouter.js';

console.log('🔍 Testing IntelligentRouter (Phase 6E)...\n');

let passCount = 0;
let failCount = 0;

// Test 1: Targets added with weights
try {
  const router = new IntelligentRouter();
  router.addTarget('training-server', 3001, 1);
  router.addTarget('training-server', 3011, 2);

  const metrics = router.getRoutingMetrics('training-server');
  assert(metrics.targetCount === 2, 'Should have 2 targets');
  assert(metrics.targets[0].weight === 1, 'First target weight should be 1');
  assert(metrics.targets[1].weight === 2, 'Second target weight should be 2');
  console.log('  ✅ Targets added with weights');
  passCount++;
} catch (error) {
  console.log(`  ❌ Targets test: ${error.message}`);
  failCount++;
}

// Test 2: Healthy targets preferred
try {
  const router = new IntelligentRouter();
  router.addTarget('svc', 3001);
  router.addTarget('svc', 3002);

  router.updateTargetHealth('svc', 3001, 'unhealthy');
  const healthyTargets = router.getHealthyTargets('svc');
  assert(healthyTargets.length === 1, 'Should have 1 healthy target');
  assert(healthyTargets[0].port === 3002, 'Healthy target should be port 3002');
  console.log('  ✅ Healthy targets preferred');
  passCount++;
} catch (error) {
  console.log(`  ❌ Healthy targets test: ${error.message}`);
  failCount++;
}

// Test 3: Round-robin distribution verified
try {
  const router = new IntelligentRouter({ algorithm: 'weighted-round-robin' });
  router.addTarget('svc', 3001, 1);
  router.addTarget('svc', 3002, 1);

  const routes = [];
  for (let i = 0; i < 10; i++) {
    const route = router.routeRequest('svc');
    routes.push(route.port);
  }

  const port3001Count = routes.filter(p => p === 3001).length;
  const port3002Count = routes.filter(p => p === 3002).length;
  assert(port3001Count > 0, 'Port 3001 should be used');
  assert(port3002Count > 0, 'Port 3002 should be used');
  assert(Math.abs(port3001Count - port3002Count) <= 2, 'Distribution should be fairly even');
  console.log('  ✅ Round-robin distribution verified');
  passCount++;
} catch (error) {
  console.log(`  ❌ Round-robin test: ${error.message}`);
  failCount++;
}

// Test 4: Latency tracking updates metrics
try {
  const router = new IntelligentRouter();
  router.addTarget('svc', 3001);

  const target = { serviceName: 'svc', port: 3001 };
  router.recordLatency(target, 10);
  router.recordLatency(target, 20);
  router.recordLatency(target, 30);

  const metrics = router.getRoutingMetrics('svc');
  const targetMetrics = metrics.targets[0];
  assert(targetMetrics.latencyStats.count === 3, 'Should track 3 latencies');
  assert(targetMetrics.latencyStats.avg === 20, 'Average should be 20');
  console.log('  ✅ Latency tracking updates metrics');
  passCount++;
} catch (error) {
  console.log(`  ❌ Latency tracking test: ${error.message}`);
  failCount++;
}

// Test 5: Circuit breaker trips on failures
try {
  const router = new IntelligentRouter();
  router.addTarget('svc', 3001);

  const targetId = 'svc:3001';
  router.setCircuitBreaker(targetId, { threshold: 2 });

  router.recordFailure(targetId);
  router.recordFailure(targetId);

  const breaker = router.circuitBreakers.get(targetId);
  assert(breaker.tripped === true, 'Circuit breaker should trip after threshold');

  const healthyTargets = router.getHealthyTargets('svc');
  // Should be empty because circuit breaker tripped
  // But we need to check healthy status first
  router.updateTargetHealth('svc', 3001, 'healthy');
  const healthyAfter = router.getHealthyTargets('svc');
  assert(healthyAfter.length === 0, 'Target should be unavailable with tripped circuit breaker');
  console.log('  ✅ Circuit breaker trips on failures');
  passCount++;
} catch (error) {
  console.log(`  ❌ Circuit breaker test: ${error.message}`);
  failCount++;
}

// Test 6: Latency-aware routing works
try {
  const router = new IntelligentRouter({ algorithm: 'latency-aware' });
  router.addTarget('svc', 3001);
  router.addTarget('svc', 3002);

  const target1 = { serviceName: 'svc', port: 3001 };
  const target2 = { serviceName: 'svc', port: 3002 };

  // Make target1 have higher latency
  for (let i = 0; i < 10; i++) {
    router.recordLatency(target1, 100);
    router.recordLatency(target2, 10);
  }

  let target2Selected = 0;
  for (let i = 0; i < 10; i++) {
    const route = router.routeRequest('svc');
    if (route.port === 3002) {
      target2Selected++;
    }
  }

  assert(target2Selected >= 7, 'Lower latency target should be preferred (got ' + target2Selected + ')');
  console.log('  ✅ Latency-aware routing works');
  passCount++;
} catch (error) {
  console.log(`  ❌ Latency-aware test: ${error.message}`);
  failCount++;
}

// Summary
console.log('\n════════════════════════════════════════════════════════');
console.log(`📋 IntelligentRouter Tests: ${passCount} passed, ${failCount} failed`);
console.log('════════════════════════════════════════════════════════\n');

if (failCount > 0) {
  process.exit(1);
}
