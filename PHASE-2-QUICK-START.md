# Phase 2 Quick Start: Cohort-Aware Meta-Learning

## 📋 Overview

Phase 2 extends Phase 1's closed-loop bridge to support **per-cohort optimization**. Instead of one global gap analysis, you'll segment users into cohorts and run parallel optimization for each cohort.

**Expected Impact:** +150% ROI through segment-specific learning paths

---

## 🚀 Getting Started

### Prerequisites
- ✅ Phase 1 merged to main (`capability-workflow-bridge` service running)
- ✅ All 11 services operational (`npm run dev`)
- ✅ Monitor script ready (`scripts/monitor-bridge-metrics.js`)

### What You'll Build
1. Cohort discovery from conversation traits
2. Per-cohort gap analysis
3. Cohort-specific workflow suggestions
4. Cohort-aware training & feedback loops
5. Cohort dashboards & ROI tracking

---

## 📊 Architecture at a Glance

```
Phase 1: Global                    Phase 2: Per-Cohort
  Capabilities (3009)                Capabilities (3009)
       ↕                                  ↕
    Bridge (3010)           →    Bridge (3010) + Segmentation (3007)
       ↕                         ├─ Cohort 1: Tech-savvy
   Training (3001)               │  ├─ Gap Analysis 1
                                 │  ├─ Workflow Suggestions 1
                                 │  └─ Training Plan 1
                                 │
                                 ├─ Cohort 2: Exploratory
                                 │  ├─ Gap Analysis 2
                                 │  ├─ Workflow Suggestions 2
                                 │  └─ Training Plan 2
                                 │
                                 └─ Cohort N: [Pattern]
                                    ├─ Gap Analysis N
                                    ├─ Workflow Suggestions N
                                    └─ Training Plan N
                                    
Expected ROI Gain: +150% per cohort
```

---

## 🔧 Implementation Sprints

### Sprint 1: Cohort Discovery (1 week)

**Goal:** Extract cohorts from conversation traits

**File to modify:** `servers/segmentation-server.js`

**New endpoint:**
```javascript
app.post('/api/v1/segmentation/cohorts', async (req, res) => {
  // INPUT: conversation data
  // LOGIC:
  //   1. Extract traits (learning velocity, domain affinity, etc.)
  //   2. Cluster conversations by trait similarity
  //   3. Label cohorts
  // OUTPUT: cohorts with traits
  //   [
  //     { id: "cohort-tech-savvy", size: 245, traits: {...} },
  //     { id: "cohort-exploratory", size: 180, traits: {...} }
  //   ]
});
```

**Test command:**
```bash
curl -X POST http://127.0.0.1:3007/api/v1/segmentation/cohorts \
  -H 'Content-Type: application/json' \
  -d '{"conversations": [...]}'  | jq .
```

**Acceptance criteria:**
- ✅ Discovers 3–5 meaningful cohorts
- ✅ Trait extraction consistent (>80% precision on human labels)
- ✅ Cohort size >10 members each
- ✅ Traits normalized 0–1 scale

---

### Sprint 2: Per-Cohort Gap Analysis (1 week)

**Goal:** Analyze capability gaps per cohort (not globally)

**File to modify:** `servers/capability-workflow-bridge.js`

**New endpoint:**
```javascript
app.post('/api/v1/bridge/analyze-gaps-by-cohort', async (req, res) => {
  const { cohortId } = req.body;
  
  // INPUT: cohortId
  // LOGIC:
  //   1. Get cohort traits from segmentation-server
  //   2. Query capabilities-server for global activation status
  //   3. Weight gaps by cohort traits (learning velocity → urgency, etc.)
  //   4. Suggest workflows with cohort affinity scoring
  // OUTPUT:
  //   {
  //     cohortId, cohortSize, cohortTraits,
  //     gaps: [{component, pending, severityScore, urgency}],
  //     suggestions: {component: [{workflowId, matchScore}]}
  //   }
});

app.get('/api/v1/bridge/cohorts-status', async (req, res) => {
  // OUTPUT: status of all cohort optimizations
  // { totalCohorts, activelyOptimizing, cohorts: [...], globalMetrics }
});
```

**Test command:**
```bash
# Analyze gaps for a specific cohort
curl -X POST http://127.0.0.1:3010/api/v1/bridge/analyze-gaps-by-cohort \
  -H 'Content-Type: application/json' \
  -d '{"cohortId": "cohort-tech-savvy-001"}' | jq .

# View all cohort statuses
curl http://127.0.0.1:3010/api/v1/bridge/cohorts-status | jq .
```

**Acceptance criteria:**
- ✅ Gap severity weighted by cohort learning velocity
- ✅ Suggestions ranked by cohort affinity (>70% for top match)
- ✅ Results differ significantly between cohorts (>15% variance)
- ✅ Performance <2s response time

---

### Sprint 3: Cohort-Aware Training & Feedback (1 week)

**Goal:** Run training variants per cohort, track feedback by cohort

**Files to modify:** 
- `servers/capability-workflow-bridge.js` (track cohort context)
- `servers/training-server.js` (accept cohortId)
- `servers/meta-server.js` (generate cohort-specific params)

**Enhancements:**
```javascript
// Enhanced training enqueue
app.post('/api/v1/bridge/enqueue-training', async (req, res) => {
  const { workflowId, cohortId, metadata } = req.body;
  
  // Create training variant tagged with cohortId
  // Route to training-server with cohort context
  // Store in cohortTrainingQueue (not global queue)
});

// Enhanced feedback
app.post('/api/v1/bridge/feedback', async (req, res) => {
  const { trainingId, cohortId, performanceOutcome } = req.body;
  
  // Record feedback in cohort-specific history
  // Update cohort traits based on outcome
  // Update capabilities with cohort weighting
  // Close loop per cohort
});
```

**Test command:**
```bash
# Enqueue training for a cohort
curl -X POST http://127.0.0.1:3010/api/v1/bridge/enqueue-training \
  -H 'Content-Type: application/json' \
  -d '{
    "workflowId": "workflow-001",
    "cohortId": "cohort-tech-savvy-001",
    "metadata": {"targetCapabilities": ["autonomousEvolutionEngine"]}
  }' | jq '.variant.id'

# Send feedback with cohort context
curl -X POST http://127.0.0.1:3010/api/v1/bridge/feedback \
  -H 'Content-Type: application/json' \
  -d '{
    "trainingId": "train-...",
    "cohortId": "cohort-tech-savvy-001",
    "performanceOutcome": {"success": true, "capabilitiesActivated": 2}
  }' | jq .
```

**Acceptance criteria:**
- ✅ Training variants tracked per cohort
- ✅ Feedback aggregates by cohort
- ✅ Cohort metrics update after each feedback
- ✅ Loop closure working for all test cohorts

---

### Sprint 4: Cohort Dashboards & Reporting (1 week)

**Goal:** Visualize per-cohort performance and ROI

**File to modify:** `servers/reports-server.js`

**New endpoints:**
```javascript
app.get('/api/v1/reports/cohort-dashboard/:cohortId', async (req, res) => {
  // OUTPUT: Cohort-specific dashboard with:
  //   - Trait evolution over time
  //   - Gap closure velocity
  //   - Workflow effectiveness
  //   - ROI vs. global average
  //   - Learning curves per cohort
});

app.get('/api/v1/reports/cohorts-comparison', async (req, res) => {
  // OUTPUT: Side-by-side comparison of all cohorts
  //   - Performance metrics
  //   - ROI rankings
  //   - Trait profiles
});
```

**Test command:**
```bash
# View dashboard for one cohort
curl http://127.0.0.1:3008/api/v1/reports/cohort-dashboard/cohort-tech-savvy-001 | jq .

# Compare all cohorts
curl http://127.0.0.1:3008/api/v1/reports/cohorts-comparison | jq .
```

**Acceptance criteria:**
- ✅ Dashboard loads in <1s
- ✅ Metrics update in real-time from bridge
- ✅ ROI comparisons show >15% variance between cohorts
- ✅ Visual charts render correctly

---

## 📈 Monitoring & Metrics

### Start the Monitor
```bash
node scripts/monitor-bridge-metrics.js --interval 5000 --output data/bridge-metrics.jsonl
```

### Track Per-Cohort Metrics
```bash
# View cohort status
curl http://127.0.0.1:3010/api/v1/bridge/cohorts-status | jq '.cohorts[] | {id, gapsDetected, roiGain}'

# Example output:
# {
#   "id": "cohort-tech-savvy-001",
#   "gapsDetected": 37,
#   "roiGain": "18%"
# },
# {
#   "id": "cohort-exploratory-002",
#   "gapsDetected": 42,
#   "roiGain": "12%"
# }
```

### Measure Success
Track over 2–4 weeks:
- **Gap Relevance:** Percentage of suggested workflows actually adopted per cohort (target: 85%)
- **Learning Velocity:** Speed of capability activation (target: 1.5x global baseline)
- **ROI per Cohort:** Improvement relative to global optimization (target: +150%)
- **Cohort Stability:** Trait consistency over time (target: >90%)

---

## 🔄 E2E Workflow Test

### Manual Test: Full Closed Loop

```bash
# 1. Discover cohorts
curl -X POST http://127.0.0.1:3007/api/v1/segmentation/cohorts \
  -H 'Content-Type: application/json' \
  -d '{"conversations": [...]}'

# Copy first cohortId, e.g., "cohort-tech-savvy-001"

# 2. Analyze gaps for cohort
curl -X POST http://127.0.0.1:3010/api/v1/bridge/analyze-gaps-by-cohort \
  -H 'Content-Type: application/json' \
  -d '{"cohortId": "cohort-tech-savvy-001"}'

# 3. Get suggestions (from step 2 output)
curl http://127.0.0.1:3010/api/v1/bridge/suggested-workflows?component=autonomousEvolutionEngine

# 4. Enqueue training for cohort
curl -X POST http://127.0.0.1:3010/api/v1/bridge/enqueue-training \
  -H 'Content-Type: application/json' \
  -d '{
    "workflowId": "workflow-001",
    "cohortId": "cohort-tech-savvy-001",
    "metadata": {"targetCapabilities": ["autonomousEvolutionEngine"]}
  }'

# Copy trainingId from response

# 5. Send feedback for cohort
curl -X POST http://127.0.0.1:3010/api/v1/bridge/feedback \
  -H 'Content-Type: application/json' \
  -d '{
    "trainingId": "<trainingId from step 4>",
    "cohortId": "cohort-tech-savvy-001",
    "performanceOutcome": {
      "success": true,
      "capabilitiesActivated": ["autonomousEvolutionEngine_01", "autonomousEvolutionEngine_02"],
      "improvementPercent": 18.5
    }
  }'

# 6. Check cohort status
curl http://127.0.0.1:3010/api/v1/bridge/cohorts-status | jq '.cohorts[0]'

# 7. View cohort dashboard
curl http://127.0.0.1:3008/api/v1/reports/cohort-dashboard/cohort-tech-savvy-001
```

---

## 🎯 Success Checklist

- ✅ Cohorts discovered (3–5 per test run)
- ✅ Gap analysis produces cohort-specific results
- ✅ Workflows suggested with cohort affinity >70%
- ✅ Training variants tracked per cohort
- ✅ Feedback updates cohort metrics
- ✅ Dashboards render with <1s latency
- ✅ ROI metrics show >15% variance between cohorts
- ✅ E2E loop closes with per-cohort outcome tracking

---

## 🚦 Milestones

| Sprint | Goal | Endpoint | Status |
|--------|------|----------|--------|
| 1 | Cohort discovery | `/api/v1/segmentation/cohorts` | TBD |
| 2 | Per-cohort gaps | `/api/v1/bridge/analyze-gaps-by-cohort` | TBD |
| 3 | Cohort training | `/api/v1/bridge/enqueue-training` (enhanced) | TBD |
| 4 | Dashboards | `/api/v1/reports/cohort-dashboard/:cohortId` | TBD |

---

## 📚 Documentation

- **Full Architecture:** `PHASE-2-COHORT-LEARNING-ARCHITECTURE.md`
- **API Reference:** TBD (Sprint 4)
- **Deployment Guide:** TBD (Sprint 4)

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| **Cohorts too small** | Lower min cohort size or merge by trait similarity |
| **Suggestions not cohort-specific** | Verify affinity scoring weights, check trait data |
| **Slow response times** | Cache cohort analyses, implement pagination for large datasets |
| **Feedback not updating cohort metrics** | Verify cohortId in feedback body, check route mapping |

---

**Next:** Begin Sprint 1 with segmentation-server cohort extraction.

**Timeline:** 4 weeks (1 week per sprint)  
**Status:** Planning → Ready for implementation  
**Expected ROI:** +150% per cohort
