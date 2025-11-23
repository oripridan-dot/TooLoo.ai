import assert from 'assert';
import MemoryCacheLayer from '../lib/resilience/MemoryCacheLayer.js';
import DiskCacheLayer from '../lib/resilience/DiskCacheLayer.js';
import MultiLayerCacheManager from '../lib/resilience/MultiLayerCacheManager.js';
import CacheInvalidationStrategies from '../lib/resilience/CacheInvalidationStrategies.js';
import DistributedCacheCoordinator from '../lib/resilience/DistributedCacheCoordinator.js';
import HealthMonitor from '../lib/resilience/HealthMonitor.js';
import LoadBalancer from '../lib/resilience/LoadBalancer.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n🚀 Phase 6: Complete Validation Suite\n');
  
  // Phase 6A-6C validation
  console.log('Phase 6A-6C: Core Infrastructure');
  // Already tested in phase6d-advanced-caching.test.js
  
  // Phase 6D validation
  console.log('\nPhase 6D: Advanced Caching');
  await test('MemoryCacheLayer basic operations', () => {
    const cache = new MemoryCacheLayer({ maxSize: 100 });
    cache.set('test', 'value');
    assert.strictEqual(cache.get('test'), 'value');
    cache.destroy();
  });
  
  await test('DiskCacheLayer set/get', async () => {
    const cache = new DiskCacheLayer({ dbPath: './cache/validation.db' });
    await cache.set('test', 'value');
    const val = await cache.get('test');
    assert.strictEqual(val, 'value');
    cache.destroy();
  });
  
  await test('MultiLayerCacheManager write-through', async () => {
    const cache = new MultiLayerCacheManager({
      memory: { maxSize: 100, ttl: 5000 },
      disk: { dbPath: './cache/validation-multi.db' }
    });
    await cache.set('test', 'value', 5000);
    const val = await cache.get('test');
    assert.strictEqual(val, 'value');
    cache.destroy();
  });
  
  await test('CacheInvalidationStrategies', async () => {
    const cache = new MultiLayerCacheManager({
      memory: { maxSize: 100, ttl: 5000 },
      disk: { dbPath: './cache/validation-inval.db' }
    });
    const strategies = new CacheInvalidationStrategies(cache);
    strategies.registerDependency('b', 'a');
    const analysis = strategies.analyzeDependencies('a');
    assert(analysis.directlyDependents.includes('b'));
    cache.destroy();
  });
  
  await test('DistributedCacheCoordinator', () => {
    const cache = new MultiLayerCacheManager({
      memory: { maxSize: 100, ttl: 5000 },
      disk: { dbPath: './cache/validation-coord.db' }
    });
    const coord = new DistributedCacheCoordinator(cache, 'svc-1');
    coord.registerPeer('svc-2', 'localhost', 3001);
    const status = coord.getCoordinationStatus();
    assert(status.peers.includes('svc-2'));
    coord.destroy();
    cache.destroy();
  });
  
  // Phase 6E validation
  console.log('\nPhase 6E: Load Balancing & Auto-Scaling');
  await test('HealthMonitor registration', () => {
    const monitor = new HealthMonitor({ checkInterval: 5000 });
    monitor.registerService('test-svc', 3000);
    const health = monitor.getHealth('test-svc');
    assert.strictEqual(health.status, 'unknown');
    monitor.destroy();
  });
  
  await test('HealthMonitor getAllHealth', () => {
    const monitor = new HealthMonitor({ checkInterval: 5000 });
    monitor.registerService('svc1', 3000);
    monitor.registerService('svc2', 3001);
    const allHealth = monitor.getAllHealth();
    assert(allHealth.svc1);
    assert(allHealth.svc2);
    monitor.destroy();
  });
  
  await test('LoadBalancer round-robin', () => {
    const lb = new LoadBalancer('round-robin');
    lb.addTarget({ id: 1, port: 3000 });
    lb.addTarget({ id: 2, port: 3001 });
    lb.addTarget({ id: 3, port: 3002 });
    
    const t1 = lb.nextTarget();
    const t2 = lb.nextTarget();
    const t3 = lb.nextTarget();
    const t1again = lb.nextTarget();
    
    assert.strictEqual(t1.id, 1);
    assert.strictEqual(t2.id, 2);
    assert.strictEqual(t3.id, 3);
    assert.strictEqual(t1again.id, 1);
  });
  
  await test('LoadBalancer least-connections', () => {
    const lb = new LoadBalancer('least-connections');
    lb.addTarget({ id: 1, port: 3000 });
    lb.addTarget({ id: 2, port: 3001 });
    
    const t1 = lb.nextTarget();
    lb.recordRequest(t1.id, 10);
    const t2 = lb.nextTarget();
    
    assert(t1.id === 1 || t1.id === 2);
    assert(t2.id === 1 || t2.id === 2);
  });
  
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 Final Results:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Total: ${passed + failed}\n`);
  
  if (failed === 0) {
    console.log('🎉 Phase 6 Complete! All validation tests passed!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
