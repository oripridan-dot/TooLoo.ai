# Phase 2 API Testing Reference

## Quick Start

### 1. Start the Server
```bash
cd /workspaces/TooLoo-Synapsys-V3.3
npm run dev
```

Wait 30 seconds for startup to complete.

---

## Test 1: Verify Server Is Running

```bash
curl http://localhost:4000/api/v1/health | jq '.'
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": 1765326651024,
  ...
}
```

---

## Test 2: Get Runtime Configuration

```bash
curl http://localhost:4000/api/v1/system/runtime-config | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": 1765326651024,
    "global": {
      "providerWeights": {
        "latency": 0.4,
        "cost": 0.3,
        "reliability": 0.3
      },
      "defaultModelConfig": {
        "maxTokens": 2048,
        "temperature": 0.7,
        "topP": 0.9,
        "frequencyPenalty": 0,
        "presencePenalty": 0
      },
      "explorationRate": 0.1,
      "updateFrequency": 60000,
      "enabled": true
    },
    "providers": {
      "deepseek": {
        "enabled": true,
        "priority": 1,
        "timeout": 30000
      },
      "gemini": {
        "enabled": true,
        "priority": 2,
        "timeout": 30000
      },
      "anthropic": {
        "enabled": true,
        "priority": 3,
        "timeout": 30000
      },
      "openai": {
        "enabled": true,
        "priority": 4,
        "timeout": 30000
      }
    },
    "features": {
      "smartRouting": true,
      "metricsCollection": true,
      "autoOptimization": true,
      "explorationMode": false,
      "userSegmentation": false,
      "continuousLearning": false
    },
    "metadata": {
      "optimizedBy": "system-init",
      "optimizationScore": 0.5,
      "lastOptimizationTime": 1765326651024,
      "iterationCount": 0
    }
  }
}
```

**What This Shows:**
- ✅ RuntimeConfig loaded successfully
- ✅ Default weights applied
- ✅ All 4 providers enabled
- ✅ Feature flags present

---

## Test 3: Update Runtime Configuration

### Update Provider Weights

```bash
curl -X POST http://localhost:4000/api/v1/system/runtime-config \
  -H "Content-Type: application/json" \
  -d '{
    "weights": {
      "latency": 0.5,
      "cost": 0.2,
      "reliability": 0.3
    }
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "data": {
    "timestamp": 1765326651025,
    "weights": {
      "latency": 0.5,
      "cost": 0.2,
      "reliability": 0.3
    },
    "appliedImmediately": true,
    "savedToDisk": true
  }
}
```

**What This Shows:**
- ✅ Weights updated
- ✅ Applied immediately to SmartRouter
- ✅ Saved to disk automatically

### Update Exploration Rate

```bash
curl -X POST http://localhost:4000/api/v1/system/runtime-config \
  -H "Content-Type: application/json" \
  -d '{
    "explorationRate": 0.15
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "data": {
    "timestamp": 1765326651026,
    "explorationRate": 0.15,
    "appliedImmediately": true
  }
}
```

### Enable/Disable Features

```bash
curl -X POST http://localhost:4000/api/v1/system/runtime-config \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "userSegmentation": true,
      "continuousLearning": false
    }
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "data": {
    "timestamp": 1765326651027,
    "features": {
      "userSegmentation": true,
      "continuousLearning": false
    },
    "appliedImmediately": true
  }
}
```

---

## Test 4: Get Benchmark Results

```bash
curl http://localhost:4000/api/v1/system/benchmark-results | jq '.'
```

**Expected Response (if benchmarks have run):**
```json
{
  "success": true,
  "data": {
    "latest": {
      "id": "benchmark-1765326651024",
      "timestamp": 1765326651024,
      "duration": 45230,
      "results": [
        {
          "provider": "deepseek",
          "prompt": "What is the capital of France?",
          "latency": 245,
          "tokens": 15,
          "qualityScore": 0.95,
          "success": true
        },
        {
          "provider": "deepseek",
          "prompt": "Write a JavaScript function to...",
          "latency": 380,
          "tokens": 250,
          "qualityScore": 0.92,
          "success": true
        },
        ...
      ],
      "summary": {
        "providersAttempted": 40,
        "successCount": 38,
        "failureCount": 2,
        "avgLatency": 312,
        "avgQualityScore": 0.92,
        "reliability": 0.95,
        "improvements": [
          "Best provider: deepseek (avg score: 0.923)",
          "Most reliable: anthropic (98% success)",
          "Fastest: deepseek (avg latency: 245ms)",
          "Best quality: anthropic (avg score: 0.94)"
        ]
      }
    },
    "history": [
      {
        "id": "benchmark-1765326651024",
        "timestamp": 1765326651024,
        "duration": 45230,
        "summary": { ... }
      },
      ...  // Up to 10 previous rounds
    ],
    "totalRounds": 1,
    "nextBenchmarkIn": 3599500  // milliseconds until next run
  }
}
```

**What This Shows:**
- ✅ Benchmarks ran successfully
- ✅ All 40 tests completed (4 providers × 10 prompts)
- ✅ Real latency measurements collected
- ✅ Quality scores calculated
- ✅ Results available for analysis

---

## Test Sequence: Full Phase 2 Validation

### Step 1: Verify Initial State
```bash
echo "1. Check health:"
curl -s http://localhost:4000/api/v1/health | jq '.status'

echo "2. Get initial config:"
curl -s http://localhost:4000/api/v1/system/runtime-config | jq '.data.global.providerWeights'
```

Expected: Status "ok", default weights (0.4, 0.3, 0.3)

### Step 2: Make a Chat Request
```bash
echo "3. Send test message:"
curl -s -X POST http://localhost:4000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is 2+2?"
  }' | jq '.data.result[0] | {provider, text: .text[0:100], quality}'
```

Expected: Response from DeepSeek (highest score)

### Step 3: Update Configuration
```bash
echo "4. Update weights (increase speed importance):"
curl -s -X POST http://localhost:4000/api/v1/system/runtime-config \
  -H "Content-Type: application/json" \
  -d '{
    "weights": {
      "latency": 0.6,
      "cost": 0.2,
      "reliability": 0.2
    }
  }' | jq '.data.weights'
```

Expected: New weights applied

### Step 4: Verify Update Applied
```bash
echo "5. Verify weights updated:"
curl -s http://localhost:4000/api/v1/system/runtime-config | jq '.data.global.providerWeights'
```

Expected: Weights show (0.6, 0.2, 0.2)

### Step 5: Check Benchmark Results (if ready)
```bash
echo "6. Get benchmark results:"
curl -s http://localhost:4000/api/v1/system/benchmark-results | jq '.data.latest.summary'
```

Expected: Summary with improvements list

---

## Common Scenarios

### Scenario 1: Optimize for Speed
```bash
curl -X POST http://localhost:4000/api/v1/system/runtime-config \
  -H "Content-Type: application/json" \
  -d '{
    "weights": {
      "latency": 0.7,
      "cost": 0.15,
      "reliability": 0.15
    },
    "features": {
      "explorationMode": false
    }
  }' | jq '.success'
```

**Effect:** System prioritizes fastest providers, reduces testing

### Scenario 2: Optimize for Reliability
```bash
curl -X POST http://localhost:4000/api/v1/system/runtime-config \
  -H "Content-Type: application/json" \
  -d '{
    "weights": {
      "latency": 0.2,
      "cost": 0.2,
      "reliability": 0.6
    }
  }' | jq '.success'
```

**Effect:** System prefers most reliable providers, slower acceptable

### Scenario 3: Enable Active Testing
```bash
curl -X POST http://localhost:4000/api/v1/system/runtime-config \
  -H "Content-Type: application/json" \
  -d '{
    "explorationRate": 0.25,
    "features": {
      "autoOptimization": true
    }
  }' | jq '.success'
```

**Effect:** System tests alternatives more frequently, learns faster

### Scenario 4: Disable Specific Provider
```bash
curl -X POST http://localhost:4000/api/v1/system/runtime-config \
  -H "Content-Type: application/json" \
  -d '{
    "providers": {
      "openai": {
        "enabled": false
      }
    }
  }' | jq '.success'
```

**Effect:** OpenAI never selected, only 3 providers available

---

## Troubleshooting

### Server Not Responding
```bash
# Check if backend process is running
ps aux | grep "tsx.*main" | grep -v grep

# Check if port 4000 is in use
lsof -i :4000

# Restart server
npm run stop 2>/dev/null
npm run dev
```

### Config File Not Created
```bash
# Check if directory exists
ls -la config/

# Check if file was created
ls -la config/runtime.json

# Create manually if needed
mkdir -p config
cat > config/runtime.json << 'EOF'
{
  "timestamp": $(date +%s000),
  "version": "3.3.499",
  "global": {
    "providerWeights": {
      "latency": 0.4,
      "cost": 0.3,
      "reliability": 0.3
    }
  }
}
EOF
```

### Benchmarks Not Running
```bash
# Check server logs for BenchmarkService startup
grep "BenchmarkService" /tmp/server.log

# Wait for first cycle (up to 60 minutes)
# Or check if it started in background
ps aux | grep "benchmark"
```

---

## Monitoring

### Watch Server Logs
```bash
tail -f /tmp/server.log | grep -E "RuntimeConfig|BenchmarkService|Chat|weights"
```

### Monitor Requests
```bash
# Count chat requests
curl -s http://localhost:4000/api/v1/metrics | jq '.requests.chat'

# Check provider distribution
curl -s http://localhost:4000/api/v1/metrics | jq '.providers'
```

### Check System Health
```bash
curl -s http://localhost:4000/api/v1/health | jq '.systems'
```

---

## Summary

**Phase 2 Endpoints:**
- ✅ GET /api/v1/system/runtime-config (get config)
- ✅ POST /api/v1/system/runtime-config (update config)
- ✅ GET /api/v1/system/benchmark-results (get results)

**Key Tests:**
1. Health check (verify server online)
2. Get config (verify defaults loaded)
3. Update config (verify dynamic updates)
4. Make request (verify routing works)
5. Benchmark results (verify measurements)

**Success Criteria:**
- ✅ All endpoints respond successfully
- ✅ Config can be read and written
- ✅ Updates applied immediately
- ✅ Changes saved to disk
- ✅ Benchmarks run automatically
- ✅ Results feed to scorecard

---

**Ready to test!** 🚀
