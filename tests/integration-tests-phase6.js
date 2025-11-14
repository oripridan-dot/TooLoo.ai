/**
 * Phase 6 Integration Tests - Database Optimization & Performance
 *
 * Comprehensive tests for Phases 6A (Database Opt), 6B (Rate Limiting), 6C (Observability)
 */

import { PersistentCache } from '../lib/persistent-cache.js';
import { ConnectionPool } from '../lib/connection-pool.js';
import { QueryOptimizer } from '../lib/query-optimizer.js';
import { RateLimiter } from '../lib/rate-limiter.js';
import { DistributedTracer } from '../lib/distributed-tracer.js';

class Phase6Tests {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * Test PersistentCache functionality
   */
  async testPersistentCache() {
    console.log('\n📦 Testing PersistentCache (Phase 6A)...');
    
    const cache = new PersistentCache({
      ttl: 5000,
      compression: true,
      memoryLimit: 100
    });

    // Test 1: Set and get
    await cache.set('test-key', { data: 'test-value' });
    const retrieved = await cache.get('test-key');
    this.assert(retrieved?.data === 'test-value', 'Cache set/get works');

    // Test 2: TTL expiration
    await cache.set('ttl-key', { data: 'expires' }, 100);
    await new Promise(r => setTimeout(r, 150));
    const expired = await cache.get('ttl-key');
    this.assert(expired === null, 'TTL expiration works');

    // Test 3: Delete
    await cache.set('delete-key', { data: 'test' });
    await cache.delete('delete-key');
    const deleted = await cache.get('delete-key');
    this.assert(deleted === null, 'Cache delete works');

    // Test 4: Stats
    await cache.set('stat1', { data: '1' });
    await cache.get('stat1'); // Hit
    await cache.get('stat1'); // Hit
    await cache.get('nonexist'); // Miss
    const stats = cache.getStats();
    this.assert(stats.hits >= 2, 'Cache stats track hits');
    this.assert(stats.misses >= 1, 'Cache stats track misses');
  }

  /**
   * Test ConnectionPool functionality
   */
  async testConnectionPool() {
    console.log('\n🔗 Testing ConnectionPool (Phase 6A)...');
    
    const pool = new ConnectionPool({
      minConnections: 2,
      maxConnections: 5,
      connectionTimeout: 1000,
      idleTimeout: 5000
    });

    await pool.initialize();
    this.assert(pool.connections.length >= 2, 'Pool initializes min connections');

    // Test acquire
    const conn = await pool.acquire();
    this.assert(conn !== null, 'Can acquire connection');

    // Test release
    pool.release(conn);
    this.assert(!pool.activeConnections.has(conn), 'Connection released properly');

    // Test stats
    const stats = pool.getStats();
    this.assert(stats.activeCount >= 0, 'Pool stats available');

    await pool.drain();
  }

  /**
   * Test QueryOptimizer functionality
   */
  async testQueryOptimizer() {
    console.log('\n⚡ Testing QueryOptimizer (Phase 6A)...');
    
    const optimizer = new QueryOptimizer({
      batchSize: 5,
      batchTimeout: 100,
      slowQueryThreshold: 100
    });

    // Test 1: Query optimization analysis
    const badQuery = 'SELECT * FROM users WHERE id = 1';
    const analysis = optimizer.optimizeQuery(badQuery);
    this.assert(analysis.suggestions.length > 0, 'Optimizer identifies issues');

    // Test 2: Query normalization
    const q1 = 'SELECT  *  FROM  users';
    const q2 = 'select * from users';
    const norm1 = optimizer.normalizeQuery(q1);
    const norm2 = optimizer.normalizeQuery(q2);
    this.assert(norm1 === norm2, 'Query normalization works');

    // Test 3: Stats
    const stats = optimizer.getStats();
    this.assert(stats.queueSize >= 0, 'Optimizer stats available');
  }

  /**
   * Test RateLimiter functionality
   */
  async testRateLimiter() {
    console.log('\n⏱️  Testing RateLimiter (Phase 6B)...');
    
    const limiter = new RateLimiter({
      rateLimit: 10,
      refillRate: 1,
      maxWaitTime: 1000,
      fairQueueing: true
    });

    // Test 1: Token bucket
    const allowed1 = limiter.isAllowed('client1', 5);
    this.assert(allowed1, 'Allows request within limit');

    const allowed2 = limiter.isAllowed('client1', 10);
    this.assert(!allowed2, 'Denies request exceeding limit');

    // Test 2: Acquire with waiting
    limiter.resetBucket('client2');
    const result = await limiter.acquire('client2', 1);
    this.assert(result.acquired, 'Acquire returns result');

    // Test 3: Stats
    const stats = limiter.getStats();
    this.assert(stats.totalRequests > 0, 'Rate limiter stats available');
    this.assert(stats.allowRate !== undefined, 'Rate limiter tracks allow rate');

    limiter.shutdown();
  }

  /**
   * Test DistributedTracer functionality
   */
  async testDistributedTracer() {
    console.log('\n📊 Testing DistributedTracer (Phase 6C)...');
    
    const tracer = new DistributedTracer({
      serviceName: 'test-service',
      samplingRate: 1.0,
      flushInterval: 100
    });

    // Test 1: Start trace
    const { traceId, spanId } = tracer.startTrace();
    this.assert(traceId && spanId, 'Trace starts with IDs');

    // Test 2: Child spans
    const childSpan = tracer.startSpan(traceId, 'query-db');
    this.assert(childSpan, 'Can create child span');

    tracer.endSpan(traceId, childSpan, 'success');

    // Test 3: End trace
    tracer.endTrace(traceId, 'success', { responseTime: 100 });
    const trace = tracer.getTrace(traceId);
    this.assert(trace.status === 'success', 'Trace status recorded');
    this.assert(trace.spans.length > 0, 'Trace has child spans');

    // Test 4: Metrics
    const metrics = tracer.getMetrics();
    this.assert(metrics.service === 'test-service', 'Tracer metrics available');
    this.assert(metrics.averageLatency !== undefined, 'Latency metrics recorded');

    tracer.shutdown();
  }

  /**
   * Test cross-module integration
   */
  async testIntegration() {
    console.log('\n🔀 Testing Cross-Module Integration...');
    
    // Scenario: Request with caching, rate limiting, and tracing
    const cache = new PersistentCache({ ttl: 1000 });
    const limiter = new RateLimiter({ rateLimit: 5 });
    const tracer = new DistributedTracer({ serviceName: 'integration-test' });

    // Request 1: Cache miss -> rate limit check -> trace
    const { traceId } = tracer.startTrace();
    const spanId = tracer.startSpan(traceId, 'api-call');

    const rateCheck = await limiter.acquire('user1');
    this.assert(rateCheck.acquired, 'Rate limit acquired');

    // Simulate cache miss
    let data = await cache.get('api-result');
    this.assert(data === null, 'Initial cache miss');

    // Store result
    const result = { value: 42 };
    await cache.set('api-result', result);

    tracer.endSpan(traceId, spanId, 'success', { cached: false });
    tracer.endTrace(traceId);

    // Request 2: Cache hit -> rate limit check -> trace
    const { traceId: traceId2 } = tracer.startTrace();
    const spanId2 = tracer.startSpan(traceId2, 'api-call');

    const rateCheck2 = await limiter.acquire('user1');
    this.assert(rateCheck2.acquired, 'Rate limit still available');

    data = await cache.get('api-result');
    this.assert(data?.value === 42, 'Cache hit returns data');

    tracer.endSpan(traceId2, spanId2, 'success', { cached: true });
    tracer.endTrace(traceId2);

    const metrics = tracer.getMetrics();
    this.assert(metrics.activeTraces >= 0, 'Metrics aggregated');

    await cache.cleanup();
    limiter.shutdown();
    tracer.shutdown();
  }

  /**
   * Performance benchmark
   */
  async testPerformance() {
    console.log('\n⚙️  Running Performance Benchmarks...');
    
    const cache = new PersistentCache();
    const iterations = 1000;

    // Cache write performance
    let start = Date.now();
    for (let i = 0; i < iterations; i++) {
      await cache.set(`key-${i}`, { value: i });
    }
    const writeTime = Date.now() - start;
    console.log(`  💾 Cache writes (${iterations}x): ${writeTime}ms (${(writeTime/iterations).toFixed(3)}ms/op)`);
    this.assert(writeTime < iterations * 10, 'Cache writes performant');

    // Cache read performance
    start = Date.now();
    for (let i = 0; i < iterations; i++) {
      await cache.get(`key-${i}`);
    }
    const readTime = Date.now() - start;
    console.log(`  📖 Cache reads (${iterations}x): ${readTime}ms (${(readTime/iterations).toFixed(3)}ms/op)`);
    this.assert(readTime < iterations * 10, 'Cache reads performant');

    // Rate limiter performance
    const limiter = new RateLimiter();
    start = Date.now();
    for (let i = 0; i < iterations; i++) {
      await limiter.acquire(`client-${i % 10}`);
    }
    const rateLimitTime = Date.now() - start;
    console.log(`  ⏱️  Rate limit checks (${iterations}x): ${rateLimitTime}ms (${(rateLimitTime/iterations).toFixed(3)}ms/op)`);
    this.assert(rateLimitTime < iterations * 5, 'Rate limiting performant');

    limiter.shutdown();
    await cache.cleanup();
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('\n🛡️  Testing Error Handling...');
    
    const limiter = new RateLimiter({ maxWaitTime: 100 });

    try {
      // Exhaust tokens and wait for timeout
      limiter.resetBucket('testclient');
      const limited = limiter.getBucket('testclient');
      limited.tokens = 0;

      await limiter.acquire('testclient', 10);
      this.fail('Should timeout on exhausted tokens');
    } catch (error) {
      this.assert(error.message.includes('timeout'), 'Timeout error thrown correctly');
    }

    limiter.shutdown();
  }

  // ============= Test Framework =============

  assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      this.passed++;
    } else {
      console.log(`  ❌ ${message}`);
      this.failed++;
    }
    this.results.push({ message, passed: condition });
  }

  fail(message) {
    console.log(`  ❌ ${message}`);
    this.failed++;
    this.results.push({ message, passed: false });
  }

  async runAll() {
    console.log('🚀 Phase 6 Integration Tests\n');
    console.log('═'.repeat(50));

    try {
      await this.testPersistentCache();
      await this.testConnectionPool();
      await this.testQueryOptimizer();
      await this.testRateLimiter();
      await this.testDistributedTracer();
      await this.testIntegration();
      await this.testPerformance();
      await this.testErrorHandling();
    } catch (error) {
      console.error(`\n❌ Test suite error: ${error.message}`);
      this.failed++;
    }

    console.log('\n' + '═'.repeat(50));
    console.log(`\n📋 Summary: ${this.passed} passed, ${this.failed} failed\n`);

    return { passed: this.passed, failed: this.failed, total: this.passed + this.failed };
  }
}

// Run tests
const tests = new Phase6Tests();
await tests.runAll().catch(console.error);
