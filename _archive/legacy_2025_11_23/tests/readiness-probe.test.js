import assert from 'assert';
import ReadinessProbe from '../lib/resilience/ReadinessProbe.js';

console.log('🔍 Testing ReadinessProbe (Phase 6E)...\n');

let passCount = 0;
let failCount = 0;

// Test 1: Startup probe registered and checked
try {
  const probe = new ReadinessProbe();
  let checkCalled = false;
  probe.registerStartupProbe('test-service', async () => {
    checkCalled = true;
    return true;
  });

  await probe.runAllProbes();
  assert(checkCalled, 'Startup probe check should be called');
  const status = probe.getProbeStatus('test-service');
  assert(status.status === 'ready', 'Startup probe should be ready');
  console.log('  ✅ Startup probe registered and checked');
  passCount++;
} catch (error) {
  console.log(`  ❌ Startup probe test: ${error.message}`);
  failCount++;
}

// Test 2: Readiness probe blocks until ready
try {
  const probe = new ReadinessProbe();
  let checkCount = 0;
  probe.registerReadinessProbe('blocking-service', async () => {
    checkCount++;
    return checkCount >= 3; // Ready after 3 checks
  });

  const startTime = Date.now();
  probe.startPolling(50); // Poll every 50ms
  await probe.waitForReady('blocking-service', 5000);
  const elapsed = Date.now() - startTime;
  
  probe.stopPolling();
  assert(elapsed >= 100, 'Should wait for multiple checks');
  assert(checkCount >= 3, 'Should run multiple checks');
  console.log('  ✅ Readiness probe blocks until ready');
  passCount++;
} catch (error) {
  console.log(`  ❌ Readiness probe test: ${error.message}`);
  failCount++;
}

// Test 3: Liveness probe detects failures
try {
  const probe = new ReadinessProbe();
  let failureCount = 0;
  probe.registerLivenessProbe('failing-service', async () => {
    failureCount++;
    return failureCount <= 2; // Fail after 2 passes
  });

  await probe.runAllProbes();
  assert(failureCount === 1, 'Should run probe once');
  
  await probe.runAllProbes();
  assert(failureCount === 2, 'Should run probe twice');
  
  await probe.runAllProbes();
  const status = probe.getProbeStatus('failing-service');
  assert(status.failCount >= 1, 'Should track failures');
  assert(status.passCount >= 2, 'Should track passes');
  console.log('  ✅ Liveness probe detects failures');
  passCount++;
} catch (error) {
  console.log(`  ❌ Liveness probe test: ${error.message}`);
  failCount++;
}

// Test 4: Resource probe checks constraints
try {
  const probe = new ReadinessProbe();
  let resourceCheckCalled = false;
  probe.registerResourceProbe('memory-check', async () => {
    resourceCheckCalled = true;
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    return used < 500; // Check if under 500MB
  });

  await probe.runAllProbes();
  assert(resourceCheckCalled, 'Resource probe should check');
  const status = probe.getProbeStatus('memory-check');
  assert(status.status !== 'pending', 'Resource probe should have status');
  console.log('  ✅ Resource probe checks constraints');
  passCount++;
} catch (error) {
  console.log(`  ❌ Resource probe test: ${error.message}`);
  failCount++;
}

// Test 5: Probe timeout handled gracefully
try {
  const probe = new ReadinessProbe();
  probe.registerReadinessProbe('timeout-service', async () => {
    return false; // Never becomes ready
  });

  let timeoutCaught = false;
  try {
    await probe.waitForReady('timeout-service', 200);
  } catch (error) {
    timeoutCaught = error.message.includes('did not reach ready state');
  }

  assert(timeoutCaught, 'Should throw timeout error');
  console.log('  ✅ Probe timeout handled gracefully');
  passCount++;
} catch (error) {
  console.log(`  ❌ Probe timeout test: ${error.message}`);
  failCount++;
}

// Test 6: Polling covers all probes
try {
  const probe = new ReadinessProbe();
  let startupChecks = 0;
  let readinessChecks = 0;
  let livenessChecks = 0;
  let resourceChecks = 0;

  probe.registerStartupProbe('s1', async () => {
    startupChecks++;
    return true;
  });
  probe.registerReadinessProbe('r1', async () => {
    readinessChecks++;
    return true;
  });
  probe.registerLivenessProbe('l1', async () => {
    livenessChecks++;
    return true;
  });
  probe.registerResourceProbe('res1', async () => {
    resourceChecks++;
    return true;
  });

  probe.startPolling(50);
  await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms
  probe.stopPolling();

  assert(startupChecks >= 1, 'Startup probe should be called');
  assert(readinessChecks >= 1, 'Readiness probe should be called');
  assert(livenessChecks >= 1, 'Liveness probe should be called');
  assert(resourceChecks >= 1, 'Resource probe should be called');
  console.log('  ✅ Polling covers all probes');
  passCount++;
} catch (error) {
  console.log(`  ❌ Polling test: ${error.message}`);
  failCount++;
}

// Summary
console.log('\n════════════════════════════════════════════════════════');
console.log(`📋 ReadinessProbe Tests: ${passCount} passed, ${failCount} failed`);
console.log('════════════════════════════════════════════════════════\n');

if (failCount > 0) {
  process.exit(1);
}
