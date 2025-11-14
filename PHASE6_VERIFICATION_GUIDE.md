# Phase 6 Verification & Testing Guide

## Quick Test Commands

### Run All Phase 6 Tests
```bash
npm run test:phase6
```
Expected: 32 tests passing, 0 failures

### Verify All Services Start
```bash
npm run dev
```
This starts:
- Port 3000: web-server (API proxy)
- Port 3001: training-server (training with tracing)
- Port 3002: meta-server (meta-learning with tracing)
- Port 3003: budget-server (provider burst with cache + rate limiting + tracing)
- Port 3004: coach-server (auto-coach with tracing)
- Port 3007: segmentation-server (segmentation with tracing)
- Port 3008: reports-server (analytics with cache + tracing)
- Port 3009: capabilities-server (method discovery with tracing)
- Port 3123: orchestrator (system control)

---

## Observability Endpoint Tests

### Test All 8 Observability Endpoints

```bash
# Budget Server (Enhanced - has cache stats + rate limiter stats)
curl http://127.0.0.1:3003/api/v1/providers/resilience-status | jq .

# Web Server
curl http://127.0.0.1:3000/api/v1/system/observability | jq .

# Reports Server
curl http://127.0.0.1:3008/api/v1/system/observability | jq .

# Training Server (NEW)
curl http://127.0.0.1:3001/api/v1/system/observability | jq .

# Meta Server (NEW)
curl http://127.0.0.1:3002/api/v1/system/observability | jq .

# Coach Server (NEW)
curl http://127.0.0.1:3004/api/v1/system/observability | jq .

# Segmentation Server (NEW)
curl http://127.0.0.1:3007/api/v1/system/observability | jq .

# Capabilities Server (NEW)
curl http://127.0.0.1:3009/api/v1/system/observability | jq .
```

### Expected Observability Response

```json
{
  "service": "service-name",
  "tracer": {
    "activeTraces": 0,
    "totalTraces": 123,
    "avgLatency": 45.2,
    "p99Latency": 234.5,
    "throughput": 12.3,
    "errorRate": 0.01,
    "spans": [...]
  },
  "circuitBreakers": {
    "provider-service": {
      "status": "closed",
      "callCount": 1500,
      "failureCount": 2,
      "lastFailureTime": "2025-11-14T12:30:00Z"
    }
  }
}
```

---

## Rate Limiting Verification (Web Server)

### Test Rate Limiting Behavior

```bash
# Send multiple rapid requests to trigger rate limiting
for i in {1..10}; do
  curl -X GET http://127.0.0.1:3000/api/v1/training/overview \
    -H "X-Client-ID: test-client-1" \
    -w "\nStatus: %{http_code}\n"
done
```

### Expected Response Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1731534600
```

### When Rate Limited (429 Response)
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 10
}
```

---

## Cache Hit Rate Testing (Budget Server)

### Test Cache Functionality

```bash
# First request - should MISS cache
curl -X POST http://127.0.0.1:3003/api/v1/providers/burst \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test query"}' | jq '.cache'

# Second request - should HIT cache (same prompt)
curl -X POST http://127.0.0.1:3003/api/v1/providers/burst \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test query"}' | jq '.cache'
```

### Expected Cache Tags
- First: `"cache": "miss"`
- Second: `"cache": "hit"`

### View Cache Statistics

```bash
curl http://127.0.0.1:3003/api/v1/providers/resilience-status | jq '.cache'
```

Expected output:
```json
{
  "cache": {
    "hits": 15,
    "misses": 5,
    "reads": 20,
    "writes": 5,
    "hitRate": 0.75,
    "avgReadTime": 1.2,
    "avgWriteTime": 3.5
  }
}
```

---

## Distributed Tracing Verification

### Test Trace ID Returns

```bash
# Budget Server
curl -X POST http://127.0.0.1:3003/api/v1/providers/burst \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}' | jq '.traceId'

# Training Server
curl http://127.0.0.1:3001/api/v1/training/overview | jq '.traceId'

# Reports Server
curl http://127.0.0.1:3008/api/v1/reports/comprehensive | jq '.traceId'
```

Expected: UUID-like trace ID in each response

### View Tracer Metrics

```bash
# Check any service's tracer metrics
curl http://127.0.0.1:3001/api/v1/system/observability | jq '.tracer'
```

Expected output:
```json
{
  "activeTraces": 0,
  "totalTraces": 543,
  "avgLatency": 45.2,
  "p99Latency": 234.5,
  "throughput": 23.4,
  "errorRate": 0.01,
  "spans": [
    {
      "traceId": "abc-123",
      "name": "fetch-data",
      "duration": 12.5,
      "status": "success"
    }
  ]
}
```

---

## Performance Measurement

### Measure Baseline Latency (With Tracing)

```bash
# Time a training request
time curl http://127.0.0.1:3001/api/v1/training/overview > /dev/null 2>&1
```

### Measure Tracer Overhead

```bash
# Get tracer metrics
curl http://127.0.0.1:3001/api/v1/system/observability | jq '.tracer | {avgLatency, throughput}'
```

Expected tracer overhead: <1% of total request latency

### Cache Performance Improvement

```bash
# Compare cache hit vs miss latency from observability endpoint
curl http://127.0.0.1:3003/api/v1/providers/resilience-status | jq '.cache | {avgReadTime, avgWriteTime, hitRate}'
```

Expected improvement: 40-60% lower latency for cache hits

---

## Syntax Validation

### Verify All Services Compile

```bash
# All at once
for srv in training-server meta-server coach-server segmentation-server capabilities-server budget-server web-server reports-server; do
  echo "Checking $srv..."
  node -c servers/$srv.js && echo "✅ Valid" || echo "❌ Error"
done
```

Expected: 8/8 services valid

---

## Test Coverage Summary

### Phase 6 Test Suite (npm run test:phase6)
- ✅ PersistentCache: 5 tests
- ✅ ConnectionPool: 4 tests
- ✅ QueryOptimizer: 3 tests
- ✅ RateLimiter: 5 tests
- ✅ DistributedTracer: 6 tests
- ✅ Cross-Module Integration: 5 tests
- ✅ Performance Benchmarks: 3 tests
- ✅ Error Handling: 1 test

**Total**: 32/32 tests passing

---

## Troubleshooting

### Service Won't Start
```bash
# Check if port is in use
lsof -i :3001  # Replace 3001 with service port

# Check syntax
node -c servers/training-server.js

# Check dependencies
npm list | grep -E "express|cors"
```

### Observability Endpoint Returns 404
```bash
# Verify service started
curl http://127.0.0.1:3001/health

# Check if endpoint is registered
grep -n "system/observability" servers/training-server.js
```

### Rate Limiting Not Working
```bash
# Verify rate limiter initialized
grep -n "RateLimiter" servers/web-server.js

# Check rate limit stats
curl http://127.0.0.1:3000/api/v1/system/observability | jq '.rateLimiter'
```

### Cache Not Hitting
```bash
# Check cache stats
curl http://127.0.0.1:3003/api/v1/providers/resilience-status | jq '.cache.hitRate'

# If hitRate is 0, cache may not be persisting
# Check cache configuration in budget-server.js around line 30
```

---

## Integration Checklist

- [ ] Run `npm run test:phase6` - All 32 tests pass
- [ ] Run `npm run dev` - All 8 services start without errors
- [ ] Test all 8 observability endpoints - Return valid JSON with tracer metrics
- [ ] Test rate limiting on web-server - Returns 429 when exceeded
- [ ] Test cache hit rate on budget-server - Shows cache hits/misses
- [ ] Verify traceIds return in responses - Each request has unique trace ID
- [ ] Check tracer metrics - avgLatency and throughput calculated
- [ ] Verify no regressions - All existing endpoints still work
- [ ] Confirm syntax validation - All 8 services valid with `node -c`
- [ ] Review performance baseline - <1% tracer overhead measured

---

## Next Steps

Once verification complete:

1. **Performance Testing** (Phase 6D prep)
   - Measure cache effectiveness (target 40-60% improvement)
   - Measure rate limiter overhead (target <1%)
   - Baseline latency metrics for comparison

2. **Advanced Caching** (Phase 6D)
   - Multi-layer caching (memory → disk → CDN)
   - Cache invalidation strategies
   - Distributed cache coordination

3. **Load Balancing** (Phase 6E)
   - Health check optimization
   - Service readiness probes
   - Horizontal scaling preparation

---

## Quick Reference

| Task | Command |
|------|---------|
| Run all tests | `npm run test:phase6` |
| Start all services | `npm run dev` |
| Check training tracer | `curl http://127.0.0.1:3001/api/v1/system/observability \| jq .` |
| Check rate limiter | `curl http://127.0.0.1:3000/api/v1/system/observability \| jq .` |
| Check cache stats | `curl http://127.0.0.1:3003/api/v1/providers/resilience-status \| jq .cache` |
| Test rate limiting | `for i in {1..10}; do curl http://127.0.0.1:3000/api/v1/training/overview; done` |
| Validate syntax | `for srv in training-server meta-server coach-server segmentation-server capabilities-server budget-server web-server reports-server; do node -c servers/$srv.js; done` |

All Phase 6A-6C integrations complete and ready for verification!
