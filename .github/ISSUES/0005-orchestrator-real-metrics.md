Title: High – Orchestrator multi-instance stats must reflect real metrics

Description:
The Orchestrator (`servers/orchestrator.js` line 867) collects multi-instance shard statistics but uses placeholder values instead of real performance metrics. This prevents operators from seeing true system performance.

What's broken:
- Comment in code: `// Simple collector report (placeholder)`
- Stats are hardcoded estimates: `speedupEstimate: Math.min(multiInstance.pids.length, osCoresSafe())`
- No actual resource utilization tracking
- No real speedup calculation
- No latency or throughput data

Requirements:
1. Collect CPU and memory usage per instance
2. Track actual throughput (requests/sec per shard)
3. Calculate real speedup ratio (compare to single-instance baseline)
4. Monitor request distribution across shards
5. Track latency percentiles (p50, p95, p99)
6. Report efficiency score (throughput per CPU%)

Acceptance Criteria:
- [ ] Real CPU/memory metrics collected for each instance (use `os.cpus()`, `process.memoryUsage()`)
- [ ] Actual speedup ratio calculated (not estimated)
- [ ] Request distribution tracked across shards
- [ ] Latency percentiles included in response
- [ ] Efficiency score computed
- [ ] Stats available on `/api/v1/system/multi-instance/stop` response
- [ ] Metrics accurate within 10% (tested)

Effort: 1.5 hours  
Priority: P1 (High – needed for ops decisions)  
Labels: high, orchestrator, metrics, observability

Files affected:
- `servers/orchestrator.js`

Test command (after fix):
```bash
# Start multi-instance
curl -X POST http://127.0.0.1:3000/system/multi-instance/start

# Run some workload...
sleep 10

# Stop and get real stats
curl -X POST http://127.0.0.1:3000/system/multi-instance/stop
```

Expected response (with real metrics):
```json
{
  "stopped": true,
  "stats": {
    "instances": 4,
    "shards": 2,
    "durationMs": 12000,
    "speedupRatio": 3.2,  // Real speedup (not estimate)
    "cpuUtilization": "65%",
    "memoryUsage": "256MB",
    "throughput": "1250 req/sec",
    "latencyP50": 45,
    "latencyP95": 200,
    "latencyP99": 500,
    "efficiencyScore": 0.78
  }
}
```
