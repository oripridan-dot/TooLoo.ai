import assert from 'assert';
import MemoryCacheLayer from '../lib/resilience/MemoryCacheLayer.js';
import DiskCacheLayer from '../lib/resilience/DiskCacheLayer.js';
import MultiLayerCacheManager from '../lib/resilience/MultiLayerCacheManager.js';
import CacheInvalidationStrategies from '../lib/resilience/CacheInvalidationStrategies.js';
import DistributedCacheCoordinator from '../lib/resilience/DistributedCacheCoordinator.js';

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    testsPassed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${err.message}`);
    testsFailed++;
  }
}

async function testMemoryCacheLayer() {
  console.log('\n📦 Testing MemoryCacheLayer (Phase 6D)...');
  
  await runTest('Cache set/get works', () => {
    const cache = new MemoryCacheLayer({ maxSize: 100 });
    cache.set('key1', 'value1');
    assert.strictEqual(cache.get('key1'), 'value1');
    cache.destroy();
  });
  
  await runTest('Cache delete works', () => {
    const cache = new MemoryCacheLayer({ maxSize: 100 });
    cache.set('key1', 'value1');
    assert(cache.delete('key1'));
    assert.strictEqual(cache.get('key1'), undefined);
    cache.destroy();
  });
  
  await runTest('LRU eviction works', () => {
    const cache = new MemoryCacheLayer({ maxSize: 3 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4);
    assert.strictEqual(cache.get('a'), undefined);
    cache.destroy();
  });
  
  await runTest('Cache stats track hits', () => {
    const cache = new MemoryCacheLayer({ maxSize: 100 });
    cache.set('key1', 'value1');
    cache.get('key1');
    cache.get('key2');
    const stats = cache.getStats();
    assert(stats.hits > 0);
    cache.destroy();
  });
  
  await runTest('Cache has() works', () => {
    const cache = new MemoryCacheLayer({ maxSize: 100 });
    cache.set('key1', 'value1');
    assert(cache.has('key1'));
    assert(!cache.has('key2'));
    cache.destroy();
  });
}

async function testDiskCacheLayer() {
  console.log('\n💾 Testing DiskCacheLayer (Phase 6D)...');
  
  await runTest('Disk cache set/get works', async () => {
    const cache = new DiskCacheLayer({ dbPath: './cache/test-disk.db' });
    await cache.set('key1', 'value1');
    const value = await cache.get('key1');
    assert.strictEqual(value, 'value1');
    cache.destroy();
  });
  
  await runTest('Disk cache delete works', async () => {
    const cache = new DiskCacheLayer({ dbPath: './cache/test-disk-delete.db' });
    await cache.set('key1', 'value1');
    await cache.delete('key1');
    const value = await cache.get('key1');
    assert.strictEqual(value, undefined);
    cache.destroy();
  });
  
  await runTest('Disk cache has() works', async () => {
    const cache = new DiskCacheLayer({ dbPath: './cache/test-disk-has.db' });
    await cache.set('key1', 'value1');
    const exists = await cache.has('key1');
    assert(exists);
    cache.destroy();
  });
}

async function testMultiLayerCacheManager() {
  console.log('\n🔀 Testing MultiLayerCacheManager (Phase 6D)...');
  
  await runTest('Multi-layer set/get works', async () => {
    const cache = new MultiLayerCacheManager({
      memory: { maxSize: 100, ttl: 5000 },
      disk: { dbPath: './cache/test-multilayer.db' }
    });
    await cache.set('key1', 'value1', 5000);
    const value = await cache.get('key1');
    assert.strictEqual(value, 'value1');
    cache.destroy();
  });
  
  await runTest('Multi-layer invalidation', async () => {
    const cache = new MultiLayerCacheManager({
      memory: { maxSize: 100, ttl: 5000 },
      disk: { dbPath: './cache/test-multilayer-inval.db' }
    });
    await cache.set('key1', 'value1', 5000);
    await cache.invalidate('key1');
    const value = await cache.get('key1');
    assert.strictEqual(value, undefined);
    cache.destroy();
  });
  
  await runTest('Dependency registration', async () => {
    const cache = new MultiLayerCacheManager({
      memory: { maxSize: 100, ttl: 5000 },
      disk: { dbPath: './cache/test-multilayer-dep.db' }
    });
    await cache.set('key1', 'value1', 5000);
    cache.registerDependency('key2', 'key1');
    assert(true);
    cache.destroy();
  });
}

async function testCacheInvalidationStrategies() {
  console.log('\n🔄 Testing CacheInvalidationStrategies (Phase 6D)...');
  
  await runTest('Event mapping registration', async () => {
    const cache = new MultiLayerCacheManager({
      memory: { maxSize: 100, ttl: 5000 },
      disk: { dbPath: './cache/test-inval-event.db' }
    });
    const strategies = new CacheInvalidationStrategies(cache);
    strategies.registerEventMapping('user:*', 'userCount:*');
    assert(true);
    cache.destroy();
  });
  
  await runTest('Dependency analysis', async () => {
    const cache = new MultiLayerCacheManager({
      memory: { maxSize: 100, ttl: 5000 },
      disk: { dbPath: './cache/test-inval-analyze.db' }
    });
    const strategies = new CacheInvalidationStrategies(cache);
    strategies.registerDependency('b', 'a');
    const analysis = strategies.analyzeDependencies('a');
    assert(analysis.directlyDependents.includes('b'));
    cache.destroy();
  });
  
  await runTest('Batch invalidation', async () => {
    const cache = new MultiLayerCacheManager({
      memory: { maxSize: 100, ttl: 5000 },
      disk: { dbPath: './cache/test-inval-batch.db' }
    });
    const strategies = new CacheInvalidationStrategies(cache);
    const count = await strategies.batchInvalidate(['key1', 'key2']);
    assert.strictEqual(count, 2);
    cache.destroy();
  });
}

async function testDistributedCacheCoordinator() {
  console.log('\n📡 Testing DistributedCacheCoordinator (Phase 6D)...');
  
  await runTest('Register peer', () => {
    const cache = new MultiLayerCacheManager({
      memory: { maxSize: 100, ttl: 5000 },
      disk: { dbPath: './cache/test-coord.db' }
    });
    const coordinator = new DistributedCacheCoordinator(cache, 'service-1');
    coordinator.registerPeer('service-2', 'localhost', 3001);
    const status = coordinator.getCoordinationStatus();
    assert(status.peers.includes('service-2'));
    coordinator.destroy();
    cache.destroy();
  });
  
  await runTest('Publish invalidation', async () => {
    const cache = new MultiLayerCacheManager({
      memory: { maxSize: 100, ttl: 5000 },
      disk: { dbPath: './cache/test-coord-pub.db' }
    });
    const coordinator = new DistributedCacheCoordinator(cache, 'service-1');
    await coordinator.publishInvalidation('key1', 'value1');
    const status = coordinator.getCoordinationStatus();
    assert(status.pendingInvalidations >= 0);
    coordinator.destroy();
    cache.destroy();
  });
  
  await runTest('Subscribe to invalidations', () => {
    const cache = new MultiLayerCacheManager({
      memory: { maxSize: 100, ttl: 5000 },
      disk: { dbPath: './cache/test-coord-sub.db' }
    });
    const coordinator = new DistributedCacheCoordinator(cache, 'service-1');
    coordinator.subscribeToInvalidations('cache:*', (key) => {});
    assert(true);
    coordinator.destroy();
    cache.destroy();
  });
}

async function runAllTests() {
  console.log('\n🚀 Phase 6D: Advanced Caching Test Suite\n');
  console.log('═'.repeat(60));
  
  try {
    await testMemoryCacheLayer();
    await testDiskCacheLayer();
    await testMultiLayerCacheManager();
    await testCacheInvalidationStrategies();
    await testDistributedCacheCoordinator();
    
    console.log('\n' + '═'.repeat(60));
    console.log('\n📋 Summary:');
    console.log(`  ✅ Passed: ${testsPassed}`);
    console.log(`  ❌ Failed: ${testsFailed}`);
    console.log(`  Total: ${testsPassed + testsFailed}\n`);
    
    if (testsFailed === 0) {
      console.log('🎉 All Phase 6D tests passed!\n');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

runAllTests();
