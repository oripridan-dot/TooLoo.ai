import assert from 'assert';
import HorizontalScalingManager from '../lib/resilience/HorizontalScalingManager.js';

console.log('🔍 Testing HorizontalScalingManager (Phase 6E)...\n');

let passCount = 0;
let failCount = 0;

// Test 1: Scale up spawns instances
try {
  const manager = new HorizontalScalingManager();
  manager.registerService('training', 3001);

  const newInstances = await manager.scaleUp('training', 2);
  assert(newInstances.length === 2, 'Should spawn 2 instances');
  assert(newInstances[0].port !== undefined, 'Should have ports');
  assert(newInstances[0].pid !== undefined, 'Should have PIDs');

  const count = manager.getInstanceCount('training');
  assert(count === 2, 'Instance count should be 2');
  console.log('  ✅ Scale up spawns instances');
  passCount++;
} catch (error) {
  console.log(`  ❌ Scale up test: ${error.message}`);
  failCount++;
}

// Test 2: Scale down terminates gracefully
try {
  const manager = new HorizontalScalingManager();
  manager.registerService('training', 3001);

  await manager.scaleUp('training', 3);
  const resultDown = await manager.scaleDown('training', 1);
  
  assert(resultDown.stopped === 1, 'Should stop 1 instance');
  const finalCount = manager.getInstanceCount('training');
  assert(finalCount === 2, 'Should have 2 instances left');
  console.log('  ✅ Scale down terminates gracefully');
  passCount++;
} catch (error) {
  console.log(`  ❌ Scale down test: ${error.message}`);
  failCount++;
}

// Test 3: Instance details accurate
try {
  const manager = new HorizontalScalingManager();
  manager.registerService('training', 3001);

  await manager.scaleUp('training', 1);
  const details = manager.getInstanceDetails('training');

  assert(details.length === 1, 'Should have 1 instance');
  assert(details[0].port !== undefined, 'Should have port');
  assert(details[0].pid !== undefined, 'Should have PID');
  assert(details[0].startTime !== undefined, 'Should have startTime');
  assert(details[0].health === 'starting', 'Should have health status');
  console.log('  ✅ Instance details accurate');
  passCount++;
} catch (error) {
  console.log(`  ❌ Instance details test: ${error.message}`);
  failCount++;
}

// Test 4: Port allocation unique
try {
  const manager = new HorizontalScalingManager();
  manager.registerService('svc1', 3001);
  manager.registerService('svc2', 3002);

  const instances1 = await manager.scaleUp('svc1', 2);
  const instances2 = await manager.scaleUp('svc2', 2);

  const allPorts = [
    ...instances1.map(i => i.port),
    ...instances2.map(i => i.port)
  ];

  const uniquePorts = new Set(allPorts);
  assert(uniquePorts.size === allPorts.length, 'All ports should be unique');
  console.log('  ✅ Port allocation unique');
  passCount++;
} catch (error) {
  console.log(`  ❌ Port allocation test: ${error.message}`);
  failCount++;
}

// Test 5: Scaling history maintained
try {
  const manager = new HorizontalScalingManager();
  manager.registerService('training', 3001);

  await manager.scaleUp('training', 1);
  await manager.scaleDown('training', 1);
  await manager.scaleUp('training', 1);

  const history = manager.getScalingHistory('training');
  assert(history.length === 3, 'Should have 3 history entries');
  assert(history[0].action === 'SCALE_UP', 'First should be scale up');
  assert(history[1].action === 'SCALE_DOWN', 'Second should be scale down');
  assert(history[2].action === 'SCALE_UP', 'Third should be scale up');
  console.log('  ✅ Scaling history maintained');
  passCount++;
} catch (error) {
  console.log(`  ❌ Scaling history test: ${error.message}`);
  failCount++;
}

// Test 6: Get specific instance
try {
  const manager = new HorizontalScalingManager();
  manager.registerService('training', 3001);

  await manager.scaleUp('training', 3);
  const instance = manager.getInstance('training', 0);
  
  assert(instance !== null, 'Should get instance');
  assert(instance.port !== undefined, 'Should have port');
  assert(instance.uptime >= 0, 'Should have uptime');
  
  const outOfBounds = manager.getInstance('training', 10);
  assert(outOfBounds === null, 'Should return null for out of bounds');
  console.log('  ✅ Get specific instance');
  passCount++;
} catch (error) {
  console.log(`  ❌ Get instance test: ${error.message}`);
  failCount++;
}

// Summary
console.log('\n════════════════════════════════════════════════════════');
console.log(`📋 HorizontalScalingManager Tests: ${passCount} passed, ${failCount} failed`);
console.log('════════════════════════════════════════════════════════\n');

if (failCount > 0) {
  process.exit(1);
}
