# Phase 2 Sprint 2: Quick Start Guide
**Status**: 🟢 Ready to Implement  
**Branch**: `feature/phase-2-sprint-2-cohort-gaps`  
**Duration**: 2025-10-25 → 2025-11-01 (7 days)  

---

## 30-Second Summary

Transform the bridge service from **global optimizer** to **cohort-aware learner**:
- Query cohort traits from segmentation-server
- Score capability gaps by archetype (Fast Learner gaps scored 2x, Specialist 2.5x, etc.)
- Suggest workflows that match cohort traits (domain affinity, learning velocity)
- Track ROI per cohort (cost/capability, success trajectory)
- Validate with >80% pass rate acceptance tests

---

## Key Concepts

### Cohort Archetypes (from Sprint 1)
| Archetype | Traits | Gap Priority | Workflow Focus |
|-----------|--------|--------------|-----------------|
| **Fast Learner** | High velocity, high responsiveness | Learning speed gaps (2x) | High difficulty, rapid cycles |
| **Specialist** | High domain affinity | Domain-specific gaps (2.5x) | Deep domain expertise |
| **Power User** | High frequency, consistent engagement | Popular workflows (1.8x) | High-volume capability adoption |
| **Long-term Retainer** | High retention strength | Foundational gaps (2x) | Core capability reinforcement |
| **Generalist** | Balanced traits | Standard severity (1x) | Diverse capability coverage |

### Archetype-Modified Severity Scoring
```javascript
// Base severity from capabilities-server (0-1 scale)
// Multiply by archetype weight based on gap type
modifiedSeverity = baseSeverity * archetypeWeight[archetype]

// Example: "async-patterns" gap
// Base severity: 0.68 (moderate)
// Fast Learner weight: 2.0 (learning speed critical)
// Modified: 0.68 * 2.0 = 1.36 (HIGH priority for this archetype)
```

### ROI Calculation
```javascript
// Track per cohort
costPerCapability = totalTrainingCost / capabilitiesAdded
roiMultiplier = (capabilitiesAdded * successRate) / totalCost
trajectory = analyze(outcomes[-10:])  // Last 10 outcomes

// Example
// Cohort added: 45 capabilities
// Total cost: $38.25
// Success rate: 0.89
// Cost per cap: 0.85
// ROI: (45 * 0.89) / 38.25 = 1.05x
```

---

## Implementation Sequence

### Step 1: Extend Bridge for Cohort Context
**File**: `servers/capability-workflow-bridge.js`  
**Add** (~40 lines):
```javascript
// Cache cohort traits (5-min TTL)
const cohortTraitsCache = {};

async function fetchCohortTraits(cohortId) {
  if (cohortTraitsCache[cohortId]) return cohortTraitsCache[cohortId];
  
  try {
    const res = await fetch(`http://127.0.0.1:3007/api/v1/segmentation/cohorts/${cohortId}`);
    const data = await res.json();
    if (data.ok) {
      cohortTraitsCache[cohortId] = data.cohort;
      setTimeout(() => delete cohortTraitsCache[cohortId], 300000);
      return data.cohort;
    }
  } catch (err) {
    console.warn(`[bridge] Cohort fetch failed:`, err.message);
  }
  return null;
}

// Call on bridge startup
async function warmCohortCache() {
  try {
    const res = await fetch(`http://127.0.0.1:3007/api/v1/segmentation/cohorts`);
    const data = await res.json();
    if (data.ok) {
      data.cohorts.forEach(c => {
        cohortTraitsCache[c.id] = c;
      });
    }
  } catch (err) {
    console.warn(`[bridge] Cohort cache warmup failed`);
  }
}
```

**Checkpoint**: Test with `curl http://127.0.0.1:3010/health` (should still 200)

---

### Step 2: Per-Cohort Gap Analysis Endpoint
**File**: `servers/capability-workflow-bridge.js`  
**Add** (~80 lines):
```javascript
const ARCHETYPE_WEIGHTS = {
  'Fast Learner': { learningGap: 2.0, domainGap: 1.2 },
  'Specialist': { learningGap: 1.2, domainGap: 2.5 },
  'Power User': { learningGap: 1.5, frequencyGap: 1.8 },
  'Long-term Retainer': { foundationGap: 2.0, retention: 2.0 },
  'Generalist': { learningGap: 1.0, domainGap: 1.0 }
};

app.post('/api/v1/bridge/gaps-per-cohort/:cohortId', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const cohort = await fetchCohortTraits(cohortId);
    
    if (!cohort) {
      return res.status(404).json({ ok: false, error: 'Cohort not found' });
    }

    // Fetch global gaps from capabilities-server
    const capsRes = await fetch(`http://127.0.0.1:3009/api/v1/capabilities/gaps`);
    const capsData = await capsRes.json();
    
    // Apply archetype-specific severity scoring
    const gaps = capsData.gaps.map(gap => {
      const weight = ARCHETYPE_WEIGHTS[cohort.archetype] || { learningGap: 1.0 };
      const modifier = weight[gap.type] || 1.0;
      
      return {
        ...gap,
        archetypeWeight: modifier,
        archetypeModifiedSeverity: gap.severity * modifier,
        urgency: gap.severity * modifier > 0.8 ? 'critical' : 
                 gap.severity * modifier > 0.5 ? 'high' : 'medium'
      };
    });

    // Sort by modified severity
    gaps.sort((a, b) => b.archetypeModifiedSeverity - a.archetypeModifiedSeverity);

    res.json({
      ok: true,
      cohortId,
      archetype: cohort.archetype,
      gaps: gaps.slice(0, 20),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});
```

**Checkpoint**: 
```bash
curl -X POST http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-xxx
# Should return 200 with gaps sorted by archetype-modified severity
```

---

### Step 3: Cohort-Specific Workflow Suggestions
**File**: `servers/capability-workflow-bridge.js`  
**Add** (~100 lines):
```javascript
app.post('/api/v1/bridge/workflows-per-cohort/:cohortId', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const { maxSuggestions = 5 } = req.body;
    
    const cohort = await fetchCohortTraits(cohortId);
    if (!cohort) return res.status(404).json({ ok: false, error: 'Cohort not found' });

    // Fetch workflows from product-dev
    const wfRes = await fetch(`http://127.0.0.1:3006/api/v1/workflows`);
    const wfData = await wfRes.json();
    
    // Score workflows based on cohort traits
    const scored = wfData.workflows.map(wf => {
      // Domain match: how well does workflow domain match cohort affinity?
      const domainMatch = (wf.primaryDomain === getCohortPrimaryDomain(cohort)) ? 
        cohort.avgTraits.domainAffinity : 0.5;
      
      // Pace match: does difficulty match learning velocity?
      const paceMatch = 1.0 - Math.abs(wf.difficulty - cohort.avgTraits.learningVelocity);
      
      // Engagement match: time vs interaction frequency
      const engagementMatch = wf.estimatedMinutes < 30 ? 
        cohort.avgTraits.interactionFrequency : 0.5;
      
      // Retention match: does it support retention pattern?
      const retentionMatch = wf.includesSpacedRepetition ? 
        cohort.avgTraits.retentionStrength : 0.7;
      
      const score = (0.4 * domainMatch + 0.3 * paceMatch + 
                     0.2 * engagementMatch + 0.1 * retentionMatch);
      
      return { ...wf, scores: { domainMatch, paceMatch, engagementMatch, retentionMatch }, score };
    });

    // Sort and return top N
    const suggestions = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map((wf, idx) => ({
        rank: idx + 1,
        ...wf,
        reasoning: generateReasoning(wf, cohort)
      }));

    res.json({
      ok: true,
      cohortId,
      archetype: cohort.archetype,
      suggestedWorkflows: suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

function getCohortPrimaryDomain(cohort) {
  // Infer from archetype or avgTraits
  if (cohort.archetype === 'Specialist') return 'design'; // example
  return 'general';
}

function generateReasoning(workflow, cohort) {
  return `Score: ${workflow.score.toFixed(2)} - Domain affinity: ${workflow.scores.domainMatch.toFixed(2)} + Pace match: ${workflow.scores.paceMatch.toFixed(2)}`;
}
```

**Checkpoint**:
```bash
curl -X POST http://127.0.0.1:3010/api/v1/bridge/workflows-per-cohort/cohort-xxx \
  -H 'Content-Type: application/json' -d '{"maxSuggestions":5}'
# Should return 200 with 3-5 ranked workflows
```

---

### Step 4: ROI Tracking Per Cohort
**File**: `servers/capability-workflow-bridge.js`  
**Add** (~60 lines):
```javascript
// Initialize cohort ROI tracker
const cohortROI = {};

function initCohortROI(cohortId) {
  if (!cohortROI[cohortId]) {
    cohortROI[cohortId] = {
      capabilitiesAdded: 0,
      trainingEnqueued: 0,
      feedbackProcessed: 0,
      totalCost: 0,
      outcomes: []
    };
  }
}

async function updateCohortROI(cohortId, outcome) {
  initCohortROI(cohortId);
  
  cohortROI[cohortId].outcomes.push({
    timestamp: new Date().toISOString(),
    result: outcome.result, // 'success' | 'partial' | 'failed'
    cost: outcome.cost || 0,
    capabilitiesAdded: outcome.capabilitiesAdded || 0
  });
  
  // Update totals
  cohortROI[cohortId].totalCost += outcome.cost || 0;
  cohortROI[cohortId].capabilitiesAdded += outcome.capabilitiesAdded || 0;
  
  // Persist
  await persistCohortROI();
}

app.get('/api/v1/bridge/cohort-roi/:cohortId', async (req, res) => {
  try {
    const { cohortId } = req.params;
    initCohortROI(cohortId);
    
    const roi = cohortROI[cohortId];
    const successCount = roi.outcomes.filter(o => o.result === 'success').length;
    const successRate = roi.outcomes.length > 0 ? successCount / roi.outcomes.length : 0;
    
    res.json({
      ok: true,
      cohortId,
      metrics: {
        capabilitiesAdded: roi.capabilitiesAdded,
        trainingEnqueued: roi.trainingEnqueued,
        feedbackProcessed: roi.feedbackProcessed,
        totalCost: roi.totalCost,
        costPerCapability: roi.capabilitiesAdded > 0 ? roi.totalCost / roi.capabilitiesAdded : 0,
        roiMultiplier: roi.totalCost > 0 ? 
          (roi.capabilitiesAdded * successRate) / roi.totalCost : 0,
        successRate,
        trajectory: analyzeTrajectory(roi.outcomes)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

function analyzeTrajectory(outcomes) {
  if (outcomes.length < 3) return 'insufficient_data';
  const recent = outcomes.slice(-10);
  const successCount = recent.filter(o => o.result === 'success').length;
  const rate = successCount / recent.length;
  return rate > 0.7 ? 'improving' : rate > 0.4 ? 'stable' : 'declining';
}

async function persistCohortROI() {
  // Write to data/bridge/cohort-roi.jsonl
  // One JSON object per line
}
```

**Checkpoint**:
```bash
curl http://127.0.0.1:3010/api/v1/bridge/cohort-roi/cohort-xxx
# Should return 200 with ROI metrics
```

---

### Step 5: Acceptance Tests
**File**: `scripts/test-cohort-gaps.js`  
**Create** (~400 lines):
```javascript
// Test structure
// 1. Per-Cohort Gap Analysis (4 assertions)
// 2. Cohort-Specific Workflows (4 assertions)
// 3. ROI Calculation (3 assertions)
// 4. Data Persistence (2 assertions)
// 5. API Integration (4 assertions)

// Run with: node scripts/test-cohort-gaps.js
// Target: >80% (18+ of 22 assertions)
```

---

## Git Commands

```bash
# Create Sprint 2 branch (already done)
git checkout -b feature/phase-2-sprint-2-cohort-gaps

# Work on features
git add <files>
git commit -m "feat: Per-cohort gap analysis endpoint"

# Keep up with Sprint 1 if needed
git rebase feature/phase-2-cohort-learning

# Final push (after all tests passing)
git push origin feature/phase-2-sprint-2-cohort-gaps

# Later: Merge back to Sprint 1 branch
git checkout feature/phase-2-cohort-learning
git merge feature/phase-2-sprint-2-cohort-gaps
```

---

## Testing Workflow

```bash
# 1. Start services
npm run dev

# 2. Wait for services to start
sleep 8

# 3. Run Sprint 2 tests
node scripts/test-cohort-gaps.js

# 4. Verify >80% pass rate
# Expected: "✓ Sprint 2 Acceptance Criteria Met (>80% pass rate: X%)"

# 5. Check bridge health
curl http://127.0.0.1:3010/health

# 6. Test per-cohort endpoints manually
curl -X POST http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-xxx
curl http://127.0.0.1:3010/api/v1/bridge/cohort-roi/cohort-xxx
```

---

## Success Indicators

✅ **Per-Cohort Gap Analysis**
- Fast Learner cohort: Learning gaps scored higher than others
- Specialist cohort: Domain-specific gaps prioritized
- All severity scores in [0, 2] range

✅ **Cohort-Specific Workflows**
- Domain match scores reflect archetype domain affinity
- Pace matches learning velocity of cohort
- Top-ranked workflows change between archetype cohorts

✅ **ROI Tracking**
- Cost/capability computed correctly
- ROI >= 0
- Trajectory reflects success rate trend

✅ **API Integration**
- All 4 endpoints return 200 OK
- Responses include timestamp and valid JSON

✅ **Acceptance Tests**
- 18+ of 22 assertions passing
- No crashes or error states

---

## Timeline (Fast Track)

| Day | Task | Hours |
|-----|------|-------|
| 10/25 | Branch + Cohort context | 1.5 |
| 10/26 | Per-cohort gap analysis | 2.0 |
| 10/27 | Cohort workflows | 2.0 |
| 10/28 | ROI tracking | 1.5 |
| 10/29 | Tests + fixes | 2.0 |
| 10/30 | Final validation | 1.0 |
| 11/01 | Merge ready | 0.5 |
| **Total** | | **10.5 hours** |

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Cohort not found | Check segmentation-server is running on 3007 |
| Cache stale | Clear cache or wait 5 minutes (TTL) |
| Gaps empty | Ensure capabilities-server has gaps computed |
| ROI always 0 | Initialize cohortROI with `initCohortROI()` first |
| Tests timeout | Increase timeout from 5s to 10s if services slow |

---

**Ready to Start?** Proceed to Step 1: Extend Bridge for Cohort Context  
**Questions?** Refer to `PHASE-2-SPRINT-2-PLAN.md` for full architecture details

---
