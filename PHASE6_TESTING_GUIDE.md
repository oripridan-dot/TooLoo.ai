# Phase 6 Performance Testing & Verification Guide

## Overview

This guide walks through comprehensive testing and verification of Phase 6 integration including:
- Performance benchmarking (cache, rate limiting, tracing)
- Observability endpoint verification
- Service health and metrics validation

---

## Quick Start

### Option 1: Full Automated Testing (Recommended)
```bash
# Run all Phase 6 tests, performance benchmarks, and service verification
npm run test:phase6-full
```

This runs:
1. `test:phase6` - 32 module tests
2. `test:phase6-performance` - Performance benchmarks
3. `test:phase6-verify` - Service verification

### Option 2: Individual Test Commands

```bash
# Just the module tests
npm run test:phase6

# Just performance benchmarks
npm run test:phase6-performance

# Just service verification
npm run test:phase6-verify
```

---

## Prerequisites

### Services Must Be Running
Before running performance tests, start all services:
```bash
npm run dev
```

This starts:
- Port 3000: web-server
- Port 3001: training-server
- Port 3002: meta-server
- Port 3003: budget-server
- Port 3004: coach-server
- Port 3007: segmentation-server
- Port 3008: reports-server
- Port 3009: capabilities-server

### Dependencies
The scripts require Node.js 16+ and the following (already in dependencies):
- `node-fetch` (for HTTP requests)
- Standard Node.js modules (fs, path)

---

## Detailed Testing Procedures

### Phase 6 Module Tests

**Command:**
```bash
npm run test:phase6
```

**What It Tests:**
- PersistentCache (5 tests): Set/get, TTL, deletion, stats
- ConnectionPool (4 tests): Connection management, health checks
- QueryOptimizer (3 tests): Query optimization, stats
- RateLimiter (5 tests): Token bucket, rate limiting
- DistributedTracer (6 tests): Tracing, spans, metrics
- Cross-module integration (5 tests)
- Performance benchmarks (3 tests)
- Error handling (1 test)

**Expected Output:**
```
🚀 Phase 6 Integration Tests
══════════════════════════════════════════════════════════

📦 Testing PersistentCache (Phase 6A)...
  ✅ Cache set/get works
  ✅ TTL expiration works
  ... (5 total)

⏱️  Testing RateLimiter (Phase 6B)...
  ✅ Allows request within limit
  ... (5 total)

📊 Testing DistributedTracer (Phase 6C)...
  ✅ Trace starts with IDs
  ... (6 total)

📋 Summary: 32 passed, 0 failed
```

**Success Criteria:**
- ✅ 32/32 tests passing
- ✅ 0 failures
- ✅ All benchmarks performant (<0.12ms for writes, <0.002ms for checks)

---

### Performance Benchmarks

**Command:**
```bash
npm run test:phase6-performance
```

**Prerequisites:**
- All services running (`npm run dev`)
- Services healthy and responding to /health endpoints

**What It Tests:**

#### 1. Cache Performance
- Measures first request latency (cache miss)
- Measures repeated request latency (cache hit)
- Calculates latency improvement percentage
- Verifies cache statistics (hits, misses, hit rate)

**Expected Results:**
```
📦 Testing Cache Performance (budget-server)...
  Testing cache MISS (first request)...
    Average miss time: 45.30ms
  Testing cache HITS (repeated requests)...
    Average hit time: 2.15ms
    Cache hits: 15
    Cache misses: 5
    Hit rate: 75.0%
    Latency improvement: 95.3%
```

**Success Criteria:**
- ✅ Hit rate > 50% (target: 60-75%)
- ✅ Latency improvement > 40% (target: 40-60%)
- ✅ Cache statistics match response counts

#### 2. Rate Limiter Testing
- Sends 20 rapid requests to web-server
- Tracks successful requests vs. rate-limited (429) responses
- Measures average latency
- Verifies rate limit headers

**Expected Results:**
```
⏱️  Testing Rate Limiter (web-server)...
  Results:
    Successful: 19/20
    Rate limited: 1/20
    Average latency: 12.45ms
    Total time: 248.90ms
    Rate limit: 1000 tokens
    Remaining: 981 tokens
```

**Success Criteria:**
- ✅ Some requests succeed, demonstrating rate limiting works
- ✅ Average latency < 50ms (target: <20ms)
- ✅ Rate limit headers present in responses

#### 3. Distributed Tracing Overhead
- Tests 3 services (training, meta, coach)
- Sends 10 requests to each
- Measures latency and trace capture rate

**Expected Results:**
```
📊 Testing Distributed Tracing Overhead...
  Testing training-server...
    Average latency: 34.20ms
    Min/Max: 28.15ms / 42.80ms
    Traces captured: 10/10
```

**Success Criteria:**
- ✅ Trace capture rate = 100% (all requests traced)
- ✅ Latency consistent (low variance)
- ✅ No overhead spike (latency <100ms)

#### 4. Observability Endpoints
- Tests all 8 service observability endpoints
- Verifies metrics are properly formatted
- Checks for tracer, cache, rate limiter, circuit breaker data

**Expected Results:**
```
🔍 Testing Observability Endpoints...
  Total observable: 8/8
```

**Success Criteria:**
- ✅ 8/8 endpoints responding (100%)
- ✅ Responses contain valid JSON
- ✅ Tracer metrics present in all responses
- ✅ Cache metrics present where applicable

**Output Files:**
- `phase6-performance-results.json` - Detailed metrics and statistics

---

### Service Verification

**Command:**
```bash
npm run test:phase6-verify
```

**Prerequisites:**
- Services running (`npm run dev`)

**What It Tests:**
- Service health checks (/health endpoint)
- Observability endpoint availability
- Metrics completeness (tracer, cache, rate limiter, circuit breakers)
- Response format validation

**Expected Output:**
```
🔍 Phase 6 Service Verification

Checking service health...
  ✅ budget-server is running
  ✅ web-server is running
  ✅ training-server is running
  ✅ meta-server is running
  ✅ coach-server is running
  ✅ segmentation-server is running
  ✅ reports-server is running
  ✅ capabilities-server is running

8 service(s) running. Testing observability...

✅ budget-server: Observable
✅ web-server: Observable
... (8 total)

╔════════════════════════════════════════════════════╗
║  Verification Complete: 8/8 services observable   ║
╚════════════════════════════════════════════════════╝
```

**Success Criteria:**
- ✅ 8/8 services running
- ✅ 8/8 services responding to observability requests
- ✅ All responses contain valid JSON
- ✅ Metrics properly populated

**Output Files:**
- `phase6-verification-results.json` - Detailed verification results

---

## Manual Testing Procedures

### Test Cache Hit Rate
```bash
# Start services
npm run dev

# In another terminal, test cache performance:
# First request (should be miss)
curl -X POST http://127.0.0.1:3003/api/v1/providers/burst \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test query"}' | jq '.cache'

# Expected: "cache": "miss"

# Second request (should be hit)
curl -X POST http://127.0.0.1:3003/api/v1/providers/burst \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test query"}' | jq '.cache'

# Expected: "cache": "hit"
```

### Test Rate Limiting
```bash
# Send rapid requests to trigger rate limiting
for i in {1..10}; do
  curl -s -X GET http://127.0.0.1:3000/api/v1/training/overview \
    -H "X-Client-ID: test-client-1" \
    -w "\n%{http_code}\n"
done

# Expected: Mostly 200, possibly some 429 (rate limited)
```

### Test Observability Endpoints
```bash
# Test budget-server (enhanced endpoint)
curl http://127.0.0.1:3003/api/v1/providers/resilience-status | jq '.'

# Test web-server
curl http://127.0.0.1:3000/api/v1/system/observability | jq '.'

# Test training-server (new observability endpoint)
curl http://127.0.0.1:3001/api/v1/system/observability | jq '.'

# Test all services
for port in 3000 3001 3002 3003 3004 3007 3008 3009; do
  echo "Port $port:"
  curl -s http://127.0.0.1:$port/api/v1/system/observability | jq '.service' || \
  curl -s http://127.0.0.1:$port/api/v1/providers/resilience-status | jq '.service'
done
```

### Inspect Detailed Metrics
```bash
# View cache statistics
curl http://127.0.0.1:3003/api/v1/providers/resilience-status | jq '.cache'

# View rate limiter statistics
curl http://127.0.0.1:3000/api/v1/system/observability | jq '.rateLimiter'

# View tracer metrics
curl http://127.0.0.1:3001/api/v1/system/observability | jq '.tracer'

# View circuit breaker status
curl http://127.0.0.1:3003/api/v1/providers/resilience-status | jq '.circuitBreakers'
```

---

## Interpreting Results

### Cache Hit Rate
- **Target**: 60-75%
- **Good**: >50% (indicates cache is being used)
- **Excellent**: >70% (high cache effectiveness)
- **Poor**: <30% (cache not helping much, review TTL)

### Latency Improvement
- **Target**: 40-60%
- **Good**: >30% (meaningful improvement)
- **Excellent**: >50% (cache is very effective)
- **Minimum**: >10% (worth keeping the cache)

### Rate Limiter
- **Target**: <1% overhead
- **Good**: <5ms per check
- **Excellent**: <2ms per check
- Distributed rate limiting with per-client fairness

### Tracer Overhead
- **Target**: <1% latency overhead
- **Good**: Negligible difference with/without tracing
- **Trace capture**: 100% of requests should have traceIds
- **Sampling**: 10-20% of traces should be full (rest sampled)

### Service Health
- **All 8 services**: Should respond to /health
- **Observability**: 8/8 endpoints should be accessible
- **Metrics**: All services should expose relevant metrics

---

## Troubleshooting

### Services Not Running
```bash
# Check which services are running
for port in 3000 3001 3002 3003 3004 3007 3008 3009; do
  curl -s http://127.0.0.1:$port/health && echo "Port $port ✅" || echo "Port $port ❌"
done

# Start all services
npm run dev
```

### Performance Tests Timing Out
```bash
# Services might be slow. Check health:
curl http://127.0.0.1:3003/health
curl http://127.0.0.1:3000/health

# Restart services if needed
npm run stop:all
npm run dev
```

### Cache Not Showing Improvement
- Check cache TTL in budget-server.js (currently 5 seconds)
- Verify repeated requests are using exact same prompt
- Check cache stats to confirm hits > 0

### Rate Limiter Not Triggering
- Default limit is 1000 tokens with 100/sec refill
- Need very rapid requests to trigger (20+ per second)
- Check rate limit headers in responses

---

## Performance Baseline Reference

From Phase 6 module tests:
- Cache writes: 0.119ms/op
- Cache reads: 0.001ms/op
- Rate limit checks: 0.002ms/op
- Tracer overhead: <1% (adaptive sampling at 10-20%)

Expected service-level improvements:
- Query latency: 40-60% reduction (via caching)
- API resilience: Cascading failures eliminated (via rate limiting)
- Observability: Real-time tracing enabled (<1% overhead)

---

## Next Steps After Verification

### If All Tests Pass ✅
1. **Document Results**: Save performance-results.json and verification-results.json
2. **Performance Report**: Review metrics against targets
3. **Production Readiness**: System is ready for deployment
4. **Phase 6D**: Proceed to advanced caching (multi-layer strategy)
5. **Phase 6E**: Proceed to load balancing & auto-scaling

### If Any Tests Fail ❌
1. **Check Service Logs**: Look for errors in service startup
2. **Verify Dependencies**: Ensure all modules are properly imported
3. **Review Configurations**: Check cache TTL, rate limits, sampling rates
4. **Restart Services**: `npm run stop:all && npm run dev`
5. **Re-run Tests**: Execute failing tests individually for details

---

## Summary

| Test Suite | Command | Duration | Success Criteria |
|-----------|---------|----------|-----------------|
| Module Tests | `npm run test:phase6` | 2-3 min | 32/32 passing |
| Performance | `npm run test:phase6-performance` | 3-5 min | Latency improvement >40% |
| Verification | `npm run test:phase6-verify` | 1-2 min | 8/8 services observable |
| **Full Suite** | **`npm run test:phase6-full`** | **6-10 min** | **All above passing** |

**Total Verification Time**: ~10 minutes for complete Phase 6 validation

All Phase 6A-6C integrations are now testable and verifiable!
