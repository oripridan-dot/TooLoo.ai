# Phase 1 Quick Start: Capability-Workflow Bridge

## 🚀 Launch

### Option 1: Full System (Recommended)
```bash
npm run dev
```
Starts the entire TooLoo.ai network including the new bridge service on port 3010.

### Option 2: Just the Bridge
```bash
npm run start:bridge
```
Launches the bridge service standalone (requires capabilities, product-dev, training running separately).

---

## 🔍 Verify Bridge is Operational

```bash
# Health check
curl http://127.0.0.1:3010/health

# Bridge status (with service health)
curl http://127.0.0.1:3010/api/v1/bridge/status | jq .
```

Expected output:
```json
{
  "ok": true,
  "bridge": {
    "status": "operational",
    "port": 3010
  },
  "services": {
    "capabilities": {"healthy": true},
    "productDevelopment": {"healthy": true},
    "training": {"healthy": true}
  }
}
```

---

## 📊 Run the Closed-Loop Workflow

### Step 1: Analyze Gaps
```bash
curl -X POST http://127.0.0.1:3010/api/v1/bridge/analyze-gaps \
  -H 'Content-Type: application/json' | jq .
```

Output: Shows discovered capabilities vs. activated, identifies gaps, prioritizes by component.

### Step 2: Get Workflow Suggestions
```bash
curl http://127.0.0.1:3010/api/v1/bridge/suggested-workflows | jq '.suggestions'
```

Output: Lists workflows that can fill capability gaps.

### Step 3: Enqueue a Workflow as Training Variant
```bash
# Copy a workflow ID from step 2 output, then:
curl -X POST http://127.0.0.1:3010/api/v1/bridge/enqueue-training \
  -H 'Content-Type: application/json' \
  -d '{
    "workflowId": "workflow-001",
    "metadata": {
      "targetCapabilities": ["autonomousEvolutionEngine"],
      "expectedOutcome": "Improve evolution performance"
    }
  }' | jq '.variant.id'
```

Output: Returns `trainingId` for use in step 5.

### Step 4: Monitor Loop
```bash
curl http://127.0.0.1:3010/api/v1/bridge/loop-status | jq '.stats'
```

Shows real-time stats: gaps detected, workflows suggested, training enqueued, feedback processed.

### Step 5: Send Feedback (Simulated Training Outcome)
```bash
# Use trainingId from step 3:
curl -X POST http://127.0.0.1:3010/api/v1/bridge/feedback \
  -H 'Content-Type: application/json' \
  -d '{
    "trainingId": "train-workflow-001-1729175037000",
    "performanceOutcome": {
      "success": true,
      "capabilitiesActivated": ["autonomousEvolutionEngine_01", "autonomousEvolutionEngine_02"],
      "improvementPercent": 15.5
    }
  }' | jq .
```

Output: Confirms loop closure, capabilities updated.

---

## 📈 Performance Metrics

### Bridge Stats (Via Status Endpoint)
```bash
curl http://127.0.0.1:3010/api/v1/bridge/status | jq '.bridge.stats'
```

Track:
- `gapsDetected` – Number of capability gaps identified
- `workflowsSuggested` – Workflows recommended for gaps
- `trainingEnqueued` – Variants fed into training
- `feedbackProcessed` – Training outcomes recorded
- `capabilitiesUpdated` – Methods activated from feedback

---

## 🔗 Integration with Web Proxy

The bridge is automatically available through the main web server proxy:

```bash
# Via proxy on port 3000
curl http://127.0.0.1:3000/api/v1/bridge/status

# Direct on port 3010
curl http://127.0.0.1:3010/api/v1/bridge/status
```

---

## 🐛 Troubleshooting

### Bridge service won't start
```bash
# Check logs
npm run start:bridge

# Verify port 3010 is free
lsof -i :3010

# Kill any stray processes
npm run stop:all
```

### "Service unavailable" errors in bridge status
This is expected if dependent services aren't running. The bridge will gracefully timeout and continue.

```bash
# Start all services
npm run dev

# Wait 30 seconds, then check
curl http://127.0.0.1:3010/api/v1/bridge/status
```

### No workflow suggestions returned
- Verify product-dev service has workflows: `curl http://127.0.0.1:3006/api/v1/workflows`
- Check gap analysis ran first: `curl -X POST http://127.0.0.1:3010/api/v1/bridge/analyze-gaps`

### Feedback not updating capabilities
- Confirm trainingId is in queue: `curl http://127.0.0.1:3010/api/v1/bridge/loop-status`
- Verify capabilities-server is running: `curl http://127.0.0.1:3009/health`
- Check bridge logs for POST to capabilities-server

---

## 📚 Key Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Service health |
| `/api/v1/bridge/status` | GET | Bridge + service health + stats |
| `/api/v1/bridge/analyze-gaps` | POST | Identify capability gaps |
| `/api/v1/bridge/suggested-workflows` | GET | Get workflow suggestions for gaps |
| `/api/v1/bridge/enqueue-training` | POST | Add workflow as training variant |
| `/api/v1/bridge/feedback` | POST | Record training outcome → close loop |
| `/api/v1/bridge/loop-status` | GET | View loop history + stats |

---

## 🎯 What's Happening Under the Hood

```
Your Request
    ↓
Bridge Service (3010)
    ├─ Queries Capabilities Server (3009)
    │  "Give me activation status of 242 discovered methods"
    │
    ├─ Fetches Product Dev Server (3006)
    │  "List all workflows with descriptions"
    │
    ├─ Matches Gaps → Workflows
    │  "autonomousEvolutionEngine has 37 pending methods"
    │  "These workflows target that component"
    │
    ├─ Enqueues in Training Server (3001)
    │  "Here's a variant combining this workflow"
    │
    └─ Processes Feedback
       "Training succeeded, updating 2 capabilities"
       
    → Loop Closed ✓
```

---

## 🚀 Next Phase: Cohort-Aware Meta-Learning

The bridge scaffolding is complete and operational. Phase 2 will extend this coupling to:

1. **Segmentation traits** → Per-cohort gap analysis
2. **Meta-learning** → Cohort-specific optimization
3. **Reports** → Per-cohort performance dashboards

**Estimated timeline:** 3–4 sprints

---

## 📝 Files Changed

- ✅ Created `/servers/capability-workflow-bridge.js` (420 lines)
- ✅ Updated `/package.json` (added `npm run start:bridge`)
- ✅ Updated `/servers/orchestrator.js` (registered bridge service)
- ✅ Created `/scripts/test-bridge-integration.js` (integration test)
- ✅ Created `/PHASE-1-BRIDGE-IMPLEMENTATION.md` (full API docs)

**Total Lines Added:** ~650  
**Services Coupled:** 3 (capabilities, workflows, training)  
**New Endpoints:** 6  
**Loop Closure Ready:** ✅ Yes

---

**Support:** Refer to `PHASE-1-BRIDGE-IMPLEMENTATION.md` for full API documentation and troubleshooting.
