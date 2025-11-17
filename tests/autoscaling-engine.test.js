import assert from 'assert';
import AutoScalingDecisionEngine from '../lib/resilience/AutoScalingDecisionEngine.js';

console.log('🔍 Testing AutoScalingDecisionEngine (Phase 6E)...\n');

let passCount = 0;
let failCount = 0;

// Test 1: SCALE_UP on high CPU
try {
  const engine = new AutoScalingDecisionEngine();
  engine.setScalingPolicy('svc', {
    scaleUpThreshold: { cpuPercent: 70, memoryPercent: 80, latencyP95: 200, queueDepth: 100, errorRate: 5 }
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
  assert(decision === 'SCALE_UP', `Should scale up, got ${decision}`);
  assert(engine.stats.scaleUpDecisions === 1, 'Should increment scale up counter');
  console.log('  ✅ SCALE_UP on high CPU');
  passCount++;
} catch (error) {
  console.log(`  ❌ Scale up test: ${error.message}`);
  failCount++;
}

// Test 2: SCALE_DOWN on low usage
try {
  const engine = new AutoScalingDecisionEngine();
  engine.setScalingPolicy('svc', {
    scaleDownThreshold: { cpuPercent: 30, memoryPercent: 50, latencyP95: 50, queueDepth: 10, errorRate: 1 },
    minInstances: 1
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
  assert(decision === 'SCALE_DOWN', `Should scale down, got ${decision}`);
  assert(engine.stats.scaleDownDecisions === 1, 'Should increment scale down counter');
  console.log('  ✅ SCALE_DOWN on low usage');
  passCount++;
} catch (error) {
  console.log(`  ❌ Scale down test: ${error.message}`);
  failCount++;
}

// Test 3: Policy enforcement verified
try {
  const engine = new AutoScalingDecisionEngine();
  const customPolicy = {
    scaleUpThreshold: { cpuPercent: 50, memoryPercent: 60 },
    minInstances: 2,
    maxInstances: 8
  };
  engine.setScalingPolicy('svc', customPolicy);

  const policy = engine.getScalingPolicy('svc');
  assert(policy.scaleUpThreshold.cpuPercent === 50, 'Policy should be customized');
  assert(policy.minInstances === 2, 'Min instances should be 2');
  assert(policy.maxInstances === 8, 'Max instances should be 8');
  console.log('  ✅ Policy enforcement verified');
  passCount++;
} catch (error) {
  console.log(`  ❌ Policy test: ${error.message}`);
  failCount++;
}

// Test 4: Load prediction calculated
try {
  const engine = new AutoScalingDecisionEngine();
  
  // Record multiple metrics with different CPU usage
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
  assert(predicted >= 1, `Predicted instances should be >= 1, got ${predicted}`);
  assert(predicted <= 10, `Predicted instances should be <= 10, got ${predicted}`);
  console.log('  ✅ Load prediction calculated');
  passCount++;
} catch (error) {
  console.log(`  ❌ Load prediction test: ${error.message}`);
  failCount++;
}

// Test 5: Scaling history tracked
try {
  const engine = new AutoScalingDecisionEngine();
  engine.setScalingPolicy('svc', {
    scaleUpThreshold: { cpuPercent: 70, memoryPercent: 80, latencyP95: 200, queueDepth: 100, errorRate: 5 }
  });

  // Trigger scale up
  engine.recordMetrics('svc', {
    cpuPercent: 85,
    memoryPercent: 40,
    latencyP95: 100,
    queueDepth: 50,
    errorRate: 1,
    instanceCount: 1
  });
  engine.evaluateScaling('svc', 1);

  const history = engine.getScalingHistory('svc');
  assert(history.length === 1, 'Should have 1 history entry');
  assert(history[0].decision === 'SCALE_UP', 'History should record SCALE_UP');
  assert(history[0].metrics.cpuPercent === 85, 'History should store metrics');
  console.log('  ✅ Scaling history tracked');
  passCount++;
} catch (error) {
  console.log(`  ❌ History tracking test: ${error.message}`);
  failCount++;
}

// Test 6: HOLD decision when at max instances
try {
  const engine = new AutoScalingDecisionEngine();
  engine.setScalingPolicy('svc', {
    scaleUpThreshold: { cpuPercent: 70 },
    maxInstances: 2
  });

  engine.recordMetrics('svc', {
    cpuPercent: 85,
    memoryPercent: 40,
    latencyP95: 100,
    queueDepth: 50,
    errorRate: 1,
    instanceCount: 2
  });

  const decision = engine.evaluateScaling('svc', 2);
  assert(decision === 'HOLD', `Should hold at max instances, got ${decision}`);
  console.log('  ✅ HOLD decision at max instances');
  passCount++;
} catch (error) {
  console.log(`  ❌ Max instances test: ${error.message}`);
  failCount++;
}

// Summary
console.log('\n════════════════════════════════════════════════════════');
console.log(`📋 AutoScalingDecisionEngine Tests: ${passCount} passed, ${failCount} failed`);
console.log('════════════════════════════════════════════════════════\n');

if (failCount > 0) {
  process.exit(1);
}
