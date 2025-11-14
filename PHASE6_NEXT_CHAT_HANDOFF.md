# Phase 6D & 6E – Next Chat Handoff Instructions

**Date**: November 14, 2025  
**Status**: All Phase 6A-6C work complete and tested ✅  
**Next Steps**: Advanced Caching (6D) → Load Balancing (6E)

---

## What's Already Complete

### Phase 6A-6C: Core Infrastructure (Complete ✅)
- **5 Modules Created** (830 LOC):
  - `lib/resilience/PersistentCache.js` - Dual-layer async caching with TTL
  - `lib/resilience/ConnectionPool.js` - Connection pooling with health checks
  - `lib/resilience/QueryOptimizer.js` - Query batching and optimization
  - `lib/resilience/RateLimiter.js` - Token bucket algorithm
  - `lib/resilience/DistributedTracer.js` - Request correlation & tracing

- **8 Services Enhanced**:
  - `budget-server (3003)`: Cache + RateLimiter + DistributedTracer
  - `web-server (3000)`: RateLimiter + DistributedTracer
  - `reports-server (3008)`: Cache + DistributedTracer
  - `training-server (3001)`: DistributedTracer
  - `meta-server (3002)`: DistributedTracer
  - `coach-server (3004)`: DistributedTracer
  - `segmentation-server (3007)`: DistributedTracer
  - `capabilities-server (3009)`: DistributedTracer

- **Testing Infrastructure Created**:
  - `scripts/performance-test-phase6.js` - Performance benchmarking (250+ LOC)
  - `scripts/verify-phase6-services.js` - Service verification (250+ LOC)
  - `PHASE6_TESTING_GUIDE.md` - Testing procedures (400+ LOC)
  - **npm commands**: `test:phase6`, `test:phase6-performance`, `test:phase6-verify`, `test:phase6-full`
  - **All 32 tests passing** ✅

### Test Results Baseline
- **Cache Hit Rate**: 60-75% target (measured with performance tests)
- **Latency Improvement**: 40-60% target
- **Rate Limiter Overhead**: <1%
- **Tracer Overhead**: <1%
- **Service Verification**: 8/8 services responding

---

## Phase 6D: Advanced Caching Strategy

### Objective
Implement multi-layer caching with intelligent invalidation and distributed coordination.

### Implementation Plan

#### 6D.1: Memory Cache Layer Enhancement
**File**: `lib/resilience/MemoryCacheLayer.js` (NEW - 200 LOC)
```javascript
// Purpose: Fast in-process caching with LRU eviction
// Features:
//   - Max size: configurable (default 1000 items)
//   - LRU eviction when full
//   - TTL per entry
//   - Statistics tracking (hits, misses, evictions)
// Usage: First layer in cache hierarchy

Key Methods:
  - set(key, value, ttl)
  - get(key)
  - has(key)
  - delete(key)
  - clear()
  - getStats()
  - setMaxSize(size)
```

#### 6D.2: Disk Cache Layer
**File**: `lib/resilience/DiskCacheLayer.js` (NEW - 250 LOC)
```javascript
// Purpose: Persistent secondary cache layer
// Features:
//   - SQLite-backed persistence
//   - Automatic cleanup (expired entries)
//   - Compression for large values
//   - Transaction support
// Usage: Second layer in cache hierarchy

Key Methods:
  - set(key, value, ttl)
  - get(key)
  - has(key)
  - delete(key)
  - cleanup()  // Remove expired entries
  - getStats()
  - vacuum()  // Optimize database
```

#### 6D.3: Multi-Layer Cache Manager
**File**: `lib/resilience/MultiLayerCacheManager.js` (NEW - 300 LOC)
```javascript
// Purpose: Coordinate memory + disk layers
// Strategy:
//   1. Check memory cache (fast, ~1ms)
//   2. If miss, check disk cache (slow, ~50ms)
//   3. If miss, fetch from source
//   4. Store in both layers (write-through)
// Features:
//   - Unified interface
//   - Automatic promotion (disk hit → memory)
//   - Cache invalidation coordination
//   - Statistics aggregation

Key Methods:
  - set(key, value, ttl, layers=['memory', 'disk'])
  - get(key)
  - invalidate(key)
  - invalidatePattern(pattern)  // Wildcard invalidation
  - getStats()  // Combined stats from both layers
  - optimize()  // Cleanup and compression
```

#### 6D.4: Cache Invalidation Patterns
**File**: `lib/resilience/CacheInvalidationStrategies.js` (NEW - 200 LOC)
```javascript
// Purpose: Smart cache invalidation
// Strategies:
//   1. Time-based (TTL expiry)
//   2. Event-based (manual invalidation)
//   3. Pattern-based (wildcard matching)
//   4. Dependency-based (cascade invalidation)

Key Methods:
  - registerDependency(key, dependsOn)  // key invalidates when dependsOn changes
  - invalidateWithDependents(key)  // Cascade invalidation
  - setInvalidationListener(pattern, callback)
  - broadcastInvalidation(key, serviceId)
```

#### 6D.5: Distributed Cache Coordination
**File**: `lib/resilience/DistributedCacheCoordinator.js` (NEW - 250 LOC)
```javascript
// Purpose: Coordinate caches across services via inter-service messaging
// Features:
//   - Publish invalidation events
//   - Subscribe to remote invalidations
//   - Conflict resolution
//   - Cache coherency checks
// Usage: Sync caches across web-server, budget-server, reports-server

Key Methods:
  - publishInvalidation(key, value)  // Broadcast to all services
  - subscribeToInvalidations(pattern)
  - onRemoteInvalidation(key, handler)
  - getCoordinationStatus()
  - resolveConflict(key, localVersion, remoteVersion)
```

#### 6D.6: Service Integrations
**Modify existing service files**:

`servers/budget-server.js`:
```javascript
// Replace single cache with multi-layer:
//   OLD: cache = new PersistentCache(...)
//   NEW: cache = new MultiLayerCacheManager({
//     memory: { maxSize: 500, ttl: 5000 },
//     disk: { dbPath: './cache/budget.db', ttl: 60000 }
//   })

// Add invalidation coordination:
const coordinator = new DistributedCacheCoordinator(cache, 'budget-server')
coordinator.subscribeToInvalidations('provider:*')
```

`servers/web-server.js`:
```javascript
// Add rate limiter cache integration:
const cache = new MultiLayerCacheManager({
  memory: { maxSize: 1000, ttl: 10000 },
  disk: { dbPath: './cache/web.db', ttl: 120000 }
})

// Cache rate limiter state across requests:
cache.registerDependency('ratelimit:user:*', 'user:*')
```

#### 6D.7: Testing for Phase 6D
**File**: `tests/phase6d-advanced-caching.test.js` (NEW - 350 LOC)
```javascript
// Test Coverage:
//   1. Memory layer: LRU eviction, TTL expiry, size limits
//   2. Disk layer: Persistence, compression, cleanup
//   3. Multi-layer: Write-through, promotion, invalidation
//   4. Invalidation patterns: Wildcards, dependencies, cascades
//   5. Distributed coordination: Sync, conflict resolution, broadcasts
//   6. Performance: Layer latency comparison, overall speedup
//   7. Edge cases: Network partition, partial failures, clock skew

Test Cases (30+ total):
  - testMemoryCacheEviction()
  - testDiskCachePersistence()
  - testMultiLayerWriteThrough()
  - testCachePromotionFromDisk()
  - testWildcardInvalidation()
  - testDependencyInvalidation()
  - testDistributedInvalidationSync()
  - testConflictResolution()
  - testPerformanceImprovement()
```

#### 6D.8: Documentation for Phase 6D
**Files**:
- `PHASE6D_ADVANCED_CACHING.md` - Architecture, strategy, usage examples
- `PHASE6D_TESTING_GUIDE.md` - How to test caching layers
- `PHASE6D_PERFORMANCE_BASELINE.md` - Expected improvements

---

## Phase 6E: Load Balancing & Auto-Scaling

### Objective
Implement health-aware routing, service readiness probes, and scaling triggers.

### Implementation Plan

#### 6E.1: Service Health Monitor
**File**: `lib/resilience/HealthMonitor.js` (NEW - 200 LOC)
```javascript
// Purpose: Track service health across all instances
// Features:
//   - Periodic health checks (/health endpoint)
//   - Liveness checks (responds to requests)
//   - Readiness checks (can handle traffic)
//   - Startup checks (initialization complete)
// Usage: Foundation for load balancing and scaling decisions

Key Methods:
  - registerService(name, port, checkInterval)
  - unregisterService(name, port)
  - getHealth(name)  // Current health status
  - getAllHealth()   // All services + status
  - onHealthChange(name, callback)  // Event listener
  - isReadyForTraffic(name)
```

#### 6E.2: Service Readiness Probe System
**File**: `lib/resilience/ReadinessProbe.js` (NEW - 250 LOC)
```javascript
// Purpose: Determine when a service can accept traffic
// Probe Types:
//   1. Startup: Module initialization complete
//   2. Readiness: Can handle normal traffic
//   3. Liveness: Still running (not deadlocked)
//   4. Resource: CPU/memory/connection pool healthy
// Usage: Each service implements readiness checks

Key Methods:
  - registerStartupProbe(name, checkFn)
  - registerReadinessProbe(name, checkFn)
  - registerLivenessProbe(name, checkFn)
  - registerResourceProbe(name, checkFn)
  - getProbeStatus(name)  // All probe results
  - waitForReady(name, timeout)  // Block until ready
```

#### 6E.3: Intelligent Request Router
**File**: `lib/resilience/IntelligentRouter.js` (NEW - 300 LOC)
```javascript
// Purpose: Route requests to healthy services only
// Strategy:
//   1. Exclude unhealthy services
//   2. Prefer services with lowest latency
//   3. Distribute evenly across healthy instances
//   4. Sticky sessions (optional)
// Usage: Enhance web-server request proxying

Key Methods:
  - addTarget(name, port, weight)
  - getHealthyTargets(name)
  - routeRequest(serviceName)  // Returns best target
  - recordLatency(target, latency)
  - getRoutingStats()
  - setCircuitBreaker(target, threshold)
```

#### 6E.4: Auto-Scaling Decision Engine
**File**: `lib/resilience/AutoScalingDecisionEngine.js` (NEW - 250 LOC)
```javascript
// Purpose: Decide when to scale services up/down
// Metrics Monitored:
//   - CPU utilization (target: 60-70%)
//   - Memory usage (target: 50-75%)
//   - Request queue depth (scale if >10)
//   - Response latency (scale if p99 >500ms)
//   - Error rate (scale if >1%)
// Usage: Driven by monitoring system

Key Methods:
  - evaluateScaling(serviceName)  // Returns: SCALE_UP, SCALE_DOWN, HOLD
  - getScalingMetrics(serviceName)
  - setScalingPolicy(serviceName, config)
  - onScalingDecision(callback)  // Event listener
  - predictLoadNeeded(serviceName, timeWindow)
```

#### 6E.5: Horizontal Scaling Manager
**File**: `lib/resilience/HorizontalScalingManager.js` (NEW - 300 LOC)
```javascript
// Purpose: Spin up/down service instances
// Features:
//   - Port allocation (avoid conflicts)
//   - Graceful startup (wait for readiness)
//   - Graceful shutdown (drain connections)
//   - Data locality (keep related services on same instance)
// Usage: Driven by auto-scaling decisions

Key Methods:
  - scaleUp(serviceName, count)  // Spawn new instances
  - scaleDown(serviceName, count)  // Gracefully shutdown
  - getInstanceCount(serviceName)
  - getInstanceDetails(serviceName)  // Ports, health, load
  - migrateInstance(fromPort, toPort)  // Live migration
  - getScalingHistory()  // Audit log
```

#### 6E.6: Load Balancer
**File**: `lib/resilience/LoadBalancer.js` (NEW - 200 LOC)
```javascript
// Purpose: Distribute traffic across healthy instances
// Algorithms:
//   1. Round-robin (simple, fair)
//   2. Least-connections (favor less busy)
//   3. Weighted (prefer faster/more capable instances)
//   4. IP hash (sticky sessions)
// Usage: Sits in front of service instances

Key Methods:
  - addInstance(target)
  - removeInstance(target)
  - nextTarget()  // Get next instance based on algorithm
  - setAlgorithm(algorithm)
  - getLoadStats()  // Per-instance request counts
  - rebalance()  // Reset counters periodically
```

#### 6E.7: Service Integrations
**Modify**: `servers/orchestrator.js` (NEW endpoints)
```javascript
// Add scaling control endpoints:
//   POST /api/v1/system/scale/{service}/{direction}
//   GET /api/v1/system/scaling-status
//   GET /api/v1/system/load-distribution

// Add scaling decision loop:
const scalingEngine = new AutoScalingDecisionEngine()
const scalingManager = new HorizontalScalingManager()

setInterval(async () => {
  const decision = scalingEngine.evaluateScaling('training-server')
  if (decision === 'SCALE_UP') {
    await scalingManager.scaleUp('training-server', 1)
  }
}, 10000)  // Evaluate every 10 seconds
```

**Modify**: `servers/web-server.js` (Intelligent routing)
```javascript
// Replace simple proxy with intelligent router:
const router = new IntelligentRouter()
router.addTarget('training', 3001)
router.addTarget('training', 3011)  // Scaled instance
router.addTarget('training', 3021)  // Another scaled instance

app.use('/api/v1/training', async (req, res) => {
  const target = router.routeRequest('training')
  // Proxy to target with intelligent retry
})
```

#### 6E.8: Testing for Phase 6E
**File**: `tests/phase6e-load-balancing.test.js` (NEW - 350 LOC)
```javascript
// Test Coverage:
//   1. Health monitoring: Probe accuracy, failure detection
//   2. Readiness: Startup/readiness transitions
//   3. Routing: Distribution fairness, latency-aware routing
//   4. Auto-scaling: Trigger accuracy, scale up/down decisions
//   5. Scaling manager: Port allocation, instance lifecycle
//   6. Load balancer: Distribution algorithms, sticky sessions
//   7. Integration: Full scaling workflow (monitor → decide → execute)
//   8. Resilience: Handle instance failures during scaling

Test Cases (35+ total):
  - testHealthMonitorDetectsFailure()
  - testReadinessProbeWaitsForStartup()
  - testIntelligentRouterPrefersLowLatency()
  - testAutoScalingUpOnHighLoad()
  - testAutoScalingDownOnLowLoad()
  - testHorizontalScalingSpawnsInstances()
  - testGracefulShutdown()
  - testLoadBalancerFairDistribution()
  - testCircuitBreakerOnCascadingFailure()
  - testScalingDuringNetworkPartition()
```

#### 6E.9: Documentation for Phase 6E
**Files**:
- `PHASE6E_LOAD_BALANCING.md` - Architecture, scaling policies, routing strategies
- `PHASE6E_SCALING_GUIDE.md` - How to trigger/monitor scaling
- `PHASE6E_PERFORMANCE_BASELINE.md` - Expected throughput improvements

---

## Getting Started on Phase 6D

### Step 1: Sync and Prepare
```bash
# Ensure all Phase 6A-6C changes are committed
git status
git add -A
git commit -m "Phase 6A-6C: Complete - testing infrastructure ready for Phase 6D/6E"

# Start fresh branch for Phase 6D
git checkout -b feature/phase6d-advanced-caching
```

### Step 2: Verify Phase 6A-6C Still Works
```bash
# Run full test suite to confirm baseline
npm run dev  # Terminal 1
npm run test:phase6-full  # Terminal 2

# Expected: All 32 tests pass, performance baselines match
```

### Step 3: Begin Phase 6D Implementation
1. Create `lib/resilience/MemoryCacheLayer.js` (200 LOC)
2. Create `lib/resilience/DiskCacheLayer.js` (250 LOC)
3. Create `lib/resilience/MultiLayerCacheManager.js` (300 LOC)
4. Create `lib/resilience/CacheInvalidationStrategies.js` (200 LOC)
5. Create `lib/resilience/DistributedCacheCoordinator.js` (250 LOC)
6. Integrate into budget-server, web-server, reports-server
7. Create comprehensive tests (350 LOC)
8. Update documentation

### Step 4: Validate Phase 6D
```bash
npm run test:phase6d
# Should show: All memory layer tests passing
#              All disk layer tests passing
#              All multi-layer tests passing
#              All invalidation tests passing
#              Distributed coordination tests passing
#              Performance improvements measured and documented
```

---

## Expected Time Estimates

| Phase | Task | Time | Test Time | Total |
|-------|------|------|-----------|-------|
| 6D.1 | MemoryCacheLayer | 30 min | 10 min | 40 min |
| 6D.2 | DiskCacheLayer | 40 min | 15 min | 55 min |
| 6D.3 | MultiLayerManager | 50 min | 20 min | 70 min |
| 6D.4 | Invalidation | 30 min | 15 min | 45 min |
| 6D.5 | Distributed Coordinator | 50 min | 20 min | 70 min |
| 6D.6 | Service Integration | 40 min | 20 min | 60 min |
| 6D.7 | Testing | 60 min | 30 min | 90 min |
| 6D | **Total** | **300 min** | **130 min** | **430 min (7.2 hrs)** |
| | | | | |
| 6E.1 | HealthMonitor | 30 min | 10 min | 40 min |
| 6E.2 | ReadinessProbe | 40 min | 15 min | 55 min |
| 6E.3 | IntelligentRouter | 50 min | 20 min | 70 min |
| 6E.4 | AutoScaling | 50 min | 20 min | 70 min |
| 6E.5 | HorizontalScaling | 60 min | 30 min | 90 min |
| 6E.6 | LoadBalancer | 30 min | 15 min | 45 min |
| 6E.7 | Service Integration | 40 min | 20 min | 60 min |
| 6E.8 | Testing | 70 min | 40 min | 110 min |
| 6E | **Total** | **370 min** | **170 min** | **540 min (9.0 hrs)** |
| | | | | |
| **6D+6E** | **TOTAL** | **670 min** | **300 min** | **970 min (16.2 hrs)** |

---

## Key Files to Create

**Phase 6D** (5 core modules + tests + docs):
```
lib/resilience/
  ├── MemoryCacheLayer.js (200 LOC)
  ├── DiskCacheLayer.js (250 LOC)
  ├── MultiLayerCacheManager.js (300 LOC)
  ├── CacheInvalidationStrategies.js (200 LOC)
  └── DistributedCacheCoordinator.js (250 LOC)

tests/
  └── phase6d-advanced-caching.test.js (350 LOC)

docs/
  ├── PHASE6D_ADVANCED_CACHING.md
  ├── PHASE6D_TESTING_GUIDE.md
  └── PHASE6D_PERFORMANCE_BASELINE.md
```

**Phase 6E** (6 core modules + tests + docs):
```
lib/resilience/
  ├── HealthMonitor.js (200 LOC)
  ├── ReadinessProbe.js (250 LOC)
  ├── IntelligentRouter.js (300 LOC)
  ├── AutoScalingDecisionEngine.js (250 LOC)
  ├── HorizontalScalingManager.js (300 LOC)
  └── LoadBalancer.js (200 LOC)

tests/
  └── phase6e-load-balancing.test.js (350 LOC)

docs/
  ├── PHASE6E_LOAD_BALANCING.md
  ├── PHASE6E_SCALING_GUIDE.md
  └── PHASE6E_PERFORMANCE_BASELINE.md
```

---

## Success Criteria

### Phase 6D Success
- ✅ All 30+ cache layer tests passing
- ✅ Memory cache LRU eviction working (verified with metrics)
- ✅ Disk cache persistence verified (data survives process restart)
- ✅ Multi-layer write-through confirmed (hits both layers)
- ✅ Cache invalidation cascades working (dependent keys invalidated)
- ✅ Distributed coordination syncing caches (manual invalidation propagates)
- ✅ Performance: 60-80% cache hit rate, 50-70% latency improvement
- ✅ All documentation complete with examples

### Phase 6E Success
- ✅ All 35+ load balancing tests passing
- ✅ Health monitor detects failures within 10 seconds
- ✅ Readiness probes block traffic until ready
- ✅ Intelligent router distributes fairly across healthy instances
- ✅ Auto-scaling triggers correctly (scale up at >70% CPU, down at <30%)
- ✅ Horizontal scaling spawns/shutdowns cleanly
- ✅ Performance: 2-3x throughput with 3 instances vs 1
- ✅ Graceful degradation when instances fail
- ✅ All documentation complete with scaling strategies

---

## Important Notes

1. **Phase 6A-6C is the foundation**: Don't skip validation. Run `npm run test:phase6-full` before starting 6D.

2. **Database for disk cache**: Use SQLite (`better-sqlite3` or `sqlite3` npm package). Fast, reliable, zero-dependency alternative to Redis.

3. **Distributed coordination**: Use HTTP inter-service calls or lightweight message queue (Redis pub/sub optional). Keep it simple.

4. **Testing approach**: Create unit tests for each module, integration tests for coordination, and load tests for scaling behavior.

5. **Monitoring**: Phase 6E requires metrics tracking. Leverage DistributedTracer from Phase 6C for latency data.

6. **Backward compatibility**: Maintain all Phase 6A-6C APIs. New modules should wrap/extend, not replace.

---

## Next Chat Starting Point

When you start the next chat:

1. **Say**: "Starting Phase 6D: Advanced Caching"
2. **Ask agent to**:
   - Verify Phase 6A-6C with `npm run test:phase6-full`
   - Read this handoff document
   - Create the 5 Phase 6D modules (start with MemoryCacheLayer)
3. **Provide context**: This handoff document has all specifications
4. **Expected first task**: `lib/resilience/MemoryCacheLayer.js` (200 LOC)

---

## Quick Reference: Phase 6 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Phase 6 Stack                        │
├─────────────────────────────────────────────────────────────┤
│ Phase 6E: Load Balancing & Auto-Scaling (NEW)               │
│   ├─ HealthMonitor: Track service health                   │
│   ├─ ReadinessProbe: Startup/readiness checks              │
│   ├─ IntelligentRouter: Health-aware routing               │
│   ├─ AutoScalingDecisionEngine: Scale triggers              │
│   ├─ HorizontalScalingManager: Spawn/shutdown instances    │
│   └─ LoadBalancer: Distribute across instances             │
├─────────────────────────────────────────────────────────────┤
│ Phase 6D: Advanced Caching (NEW)                            │
│   ├─ MemoryCacheLayer: Fast in-process cache               │
│   ├─ DiskCacheLayer: Persistent secondary cache            │
│   ├─ MultiLayerCacheManager: Coordinate layers             │
│   ├─ CacheInvalidationStrategies: Smart invalidation       │
│   └─ DistributedCacheCoordinator: Sync across services     │
├─────────────────────────────────────────────────────────────┤
│ Phase 6A-6C: Core Infrastructure (COMPLETE ✅)             │
│   ├─ PersistentCache: TTL-based caching                    │
│   ├─ ConnectionPool: Connection pooling                    │
│   ├─ QueryOptimizer: Query batching                        │
│   ├─ RateLimiter: Token bucket rate limiting               │
│   └─ DistributedTracer: Request correlation & tracing      │
├─────────────────────────────────────────────────────────────┤
│ All 8 Services Enhanced:                                    │
│   ├─ web-server (3000): RateLimiter + Tracer               │
│   ├─ training-server (3001): Tracer                        │
│   ├─ meta-server (3002): Tracer                            │
│   ├─ budget-server (3003): Cache + RateLimiter + Tracer    │
│   ├─ coach-server (3004): Tracer                           │
│   ├─ segmentation-server (3007): Tracer                    │
│   ├─ reports-server (3008): Cache + Tracer                 │
│   └─ capabilities-server (3009): Tracer                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Commit and Handoff

Current branch: `pre-cleanup-20251113-222430`  
Next branch: `feature/phase6d-advanced-caching`

When ready to handoff:
```bash
git add -A
git commit -m "Phase 6A-6C Complete: Testing infrastructure ready - Phase 6D/6E specifications documented"
git log --oneline | head -5  # Show recent commits
```

All Phase 6 work is preserved in git history. This document provides complete specifications for Phase 6D & 6E continuation.

---

**Status**: ✅ **READY FOR PHASE 6D**

This handoff document contains everything needed to start Phase 6D. No additional context required beyond what's documented here.

---

*Generated: November 14, 2025 - TooLoo.ai Phase 6 Development*
