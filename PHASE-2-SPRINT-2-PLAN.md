# Phase 2 Sprint 2 Planning: Per-Cohort Gap Analysis
**Status**: 🟢 Ready to Start  
**Sprint Duration**: Week 2 of 4-week Phase 2 (2025-10-25 → 2025-11-01)  
**Dependency**: Phase 2 Sprint 1 (Cohort Discovery Infrastructure) ✅  
**Branch**: `feature/phase-2-sprint-2-cohort-gaps` (to be created)  

---

## Sprint Overview

### Mission
Transform the global capability-workflow bridge into a **cohort-aware learning optimizer** that provides per-cohort gap analysis, archetype-matched workflow suggestions, and ROI tracking.

### Key Changes
**Phase 1 (Current Production)**:
- Single global bridge: All users treated identically
- Gap analysis: Universal capability gaps
- Workflow suggestions: Generic (highest priority first)
- Training: Uniform variant selection
- Metrics: Aggregate only

**Phase 2 Sprint 2 (New)**:
- Cohort-aware bridge: Per-cohort context
- Gap analysis: Archetype-specific severity scoring
- Workflow suggestions: Trait-matched to cohort archetype
- Training: Cohort-variant selection
- Metrics: Per-cohort ROI tracking

---

## Architecture: Cohort-Aware Bridge

### Current Bridge (Phase 1)
```
Capabilities Server (3009)
      ↓
[Bridge: analyzeGaps()]
      ↓
Product Development (3006) → Training Server (3001)
      ↓
[Bridge: feedback()] → Capability Update
      ↓
Metrics: gapsDetected, workflowsSuggested, trainingEnqueued, ...
```

### Sprint 2 Enhancement
```
Capabilities Server (3009)  +  Segmentation Server (3007)
      ↓                              ↓
[Fetch cohort traits]    [Query user → cohort]
      ↓                              ↓
[Bridge: analyzeGapsPerCohort(cohortId)]
      ↓ (Archetype-aware severity scoring)
Product Dev (3006) → Training (3001) [Cohort variants]
      ↓
[Bridge: feedbackPerCohort()] → Update capabilities
      ↓
Metrics: perCohortROI, archetypeTrajectory, costEfficiency
```

### New Endpoints
```
POST /api/v1/bridge/gaps-per-cohort/:cohortId
  Input: { includeArchetypeContext: true }
  Output: {
    cohortId,
    archetype,
    gaps: [{ component, discovered, activated, severityScore, ...}],
    archetypeRecommendation: "Focus on domain-specific training",
    estimatedImpact: 2.3x
  }

POST /api/v1/bridge/workflows-per-cohort/:cohortId
  Input: { maxSuggestions: 5 }
  Output: {
    cohortId,
    suggestedWorkflows: [{
      id, title, domainAffinity, estimatedRetention, ...
    }],
    reasoning: "High domain affinity + fast learner profile"
  }

GET /api/v1/bridge/cohort-roi/:cohortId
  Output: {
    cohortId,
    archetype,
    metrics: {
      capabilitiesAdded: 45,
      trainingEnqueued: 12,
      feedbackProcessed: 8,
      costPerCapability: 0.85,
      roi: 1.45x
    }
  }

GET /api/v1/bridge/cohort-comparison
  Output: { cohorts: [{id, archetype, roi, gaps, trajectory}] }
```

---

## Implementation Plan

### Task 1: Create Sprint 2 Feature Branch
**Branch**: `feature/phase-2-sprint-2-cohort-gaps`  
**Base**: `feature/phase-2-cohort-learning` (Sprint 1 complete)  
**Goal**: Isolated Sprint 2 development, ready to merge to Sprint 1 branch after testing

### Task 2: Extend Bridge Service for Cohort Context
**File**: `servers/capability-workflow-bridge.js`  
**Changes**:
1. Add cohort trait cache: `cohortTraitsCache = {}`
2. New function: `async fetchCohortTraits(cohortId)`
   - Query segmentation-server `/api/v1/segmentation/cohorts/:cohortId`
   - Cache traits with 5-minute TTL
   - Graceful degradation if unavailable
3. New function: `async getUserCohortId(userId)` (future-proofing)
4. Update initialization to pre-warm cohort cache

**Code Snippet**:
```javascript
async function fetchCohortTraits(cohortId) {
  if (cohortTraitsCache[cohortId]) {
    return cohortTraitsCache[cohortId];
  }
  
  try {
    const response = await fetch(`http://127.0.0.1:3007/api/v1/segmentation/cohorts/${cohortId}`);
    const data = await response.json();
    if (data.ok) {
      cohortTraitsCache[cohortId] = data.cohort;
      // TTL cleanup after 5 minutes
      setTimeout(() => delete cohortTraitsCache[cohortId], 300000);
      return data.cohort;
    }
  } catch (err) {
    console.warn(`[bridge] Failed to fetch cohort traits for ${cohortId}:`, err.message);
  }
  return null;
}
```

### Task 3: Implement Per-Cohort Gap Analysis
**File**: `servers/capability-workflow-bridge.js`  
**New Endpoint**: `POST /api/v1/bridge/gaps-per-cohort/:cohortId`  
**Algorithm**:
1. Fetch cohort traits (archetype, avgTraits)
2. Query capabilities-server for global gaps
3. Apply archetype-specific severity modifiers:
   - **Fast Learner**: Prioritize learning velocity gaps (2x weight)
   - **Specialist**: Prioritize domain-specific gaps (2.5x weight for primary domain)
   - **Power User**: Prioritize high-frequency workflows (1.8x weight)
   - **Long-term Retainer**: Prioritize retention-enabling capabilities (2x weight)
   - **Generalist**: Standard severity (1x weight)
4. Sort by modified severity
5. Return with archetype-specific recommendations

**Severity Formula**:
```javascript
archetypeModifiedSeverity = baseSeverity * archetypeWeight[archetype] * traitMultiplier
```

### Task 4: Build Cohort-Specific Workflow Suggestions
**File**: `servers/capability-workflow-bridge.js`  
**New Endpoint**: `POST /api/v1/bridge/workflows-per-cohort/:cohortId`  
**Matching Algorithm**:
1. Fetch cohort traits & archetype
2. Query workflows from product-dev server
3. Score each workflow on:
   - **Domain Match**: workflow.primaryDomain vs cohort.domainAffinity
   - **Learning Pace**: workflow.difficulty vs cohort.learningVelocity
   - **Engagement**: workflow.estimatedTime vs cohort.interactionFrequency
   - **Retention Fit**: workflow.retentionStrength requirement vs cohort.retentionStrength
4. Weight scores:
   ```javascript
   score = 0.4 * domainMatch + 0.3 * paceMatch + 0.2 * engagementMatch + 0.1 * retentionMatch
   ```
5. Top N workflows (configurable, default 5)
6. Include reasoning for each suggestion

### Task 5: Add ROI Tracking Per Cohort
**File**: `servers/capability-workflow-bridge.js`  
**New Data Structure**: Per-cohort accumulator
```javascript
cohortROI[cohortId] = {
  capabilitiesAdded: 0,
  trainingEnqueued: 0,
  feedbackProcessed: 0,
  totalCost: 0,
  outcomes: {
    success: 0,
    partial: 0,
    failed: 0
  }
}
```

**New Functions**:
- `getCohortROI(cohortId)`: Calculate cost/capability, ROI multiplier
- `updateCohortROI(cohortId, outcome)`: Record training outcome
- `persistCohortROI()`: Save to data/bridge/cohort-roi.jsonl

**ROI Metrics**:
```javascript
costPerCapability = totalCost / capabilitiesAdded
roiMultiplier = (capabilitiesAdded * 0.8 + capabilitiesAdded * successRate * 0.2) / totalCost
trajectory = "improving" | "stable" | "declining" // Last 10 outcomes
```

### Task 6: Create Sprint 2 Acceptance Tests
**File**: `scripts/test-cohort-gaps.js`  
**Test Suites**:
1. **Per-Cohort Gap Analysis** (4 assertions)
   - Fast Learner cohort: Learning gaps prioritized
   - Specialist cohort: Domain gaps prioritized
   - Severity scores within [0-1]
   - Archetype recommendations present

2. **Cohort-Specific Workflows** (4 assertions)
   - Fast Learner: Higher difficulty workflows
   - Specialist: Domain-matched workflows
   - Power User: Time-efficient workflows
   - All suggestions scored & ranked

3. **ROI Calculation** (3 assertions)
   - Cost per capability computed correctly
   - ROI multiplier >= 0
   - Trajectory calculated from outcomes

4. **Data Persistence** (2 assertions)
   - cohort-roi.jsonl created
   - ROI data recoverable

5. **API Integration** (4 assertions)
   - `/gaps-per-cohort/:cohortId` returns 200
   - `/workflows-per-cohort/:cohortId` returns 200
   - `/cohort-roi/:cohortId` returns valid metrics
   - `/cohort-comparison` returns all cohorts

**Pass Threshold**: >80% (18+ of 22 assertions)

---

## Data Structures

### Cohort Gap Entry
```javascript
{
  cohortId: "cohort-1729356000000-0",
  archetype: "Fast Learner",
  component: "async-patterns",
  discovered: 45,
  activated: 28,
  pending: 17,
  baseSeverity: 0.68,
  archetypeWeight: 2.0,
  archetypeModifiedSeverity: 1.36,
  urgency: "high",
  archetypeReason: "Fast learners benefit most from async pattern mastery",
  timestamp: "2025-10-25T00:00:00Z"
}
```

### Cohort Workflow Suggestion
```javascript
{
  cohortId: "cohort-1729356000000-1",
  archetype: "Specialist",
  workflowId: "wf-design-patterns",
  title: "Advanced Design Patterns",
  primaryDomain: "design",
  domainMatchScore: 0.95,
  paceMatchScore: 0.72,
  engagementMatchScore: 0.65,
  retentionMatchScore: 0.80,
  overallScore: 0.78,
  rank: 1,
  reasoning: "High domain affinity (0.95) + Specialist archetype = strong fit"
}
```

### Cohort ROI Record (JSONL)
```jsonl
{"timestamp":"2025-10-25T01:00:00Z","cohortId":"cohort-1729356000000-0","archetype":"Fast Learner","capabilitiesAdded":12,"trainingEnqueued":8,"feedbackProcessed":5,"totalCost":6.80,"costPerCapability":0.57,"roiMultiplier":1.76,"trajectory":"improving"}
```

---

## File Changes Summary

### New Files
- `scripts/test-cohort-gaps.js` (~400 lines) – Acceptance tests
- `data/bridge/cohort-roi.jsonl` – ROI time-series (created on first write)
- `PHASE-2-SPRINT-2-PLAN.md` (this file)

### Modified Files
- `servers/capability-workflow-bridge.js` (~150-200 additional lines)
  - Add cohort context functions
  - Add per-cohort gap analysis endpoint
  - Add per-cohort workflow suggestions endpoint
  - Add ROI tracking functions & endpoints
  - Update feedback handler for cohort ROI updates

---

## Success Criteria

| Criterion | Target | Metric |
|-----------|--------|--------|
| Per-cohort gap analysis | 100% | Fast Learner gaps scored 2x vs Specialist |
| Archetype-matched workflows | 95%+ | Domain match + pace match for specialist |
| ROI tracking accuracy | 100% | Cost/capability computed correctly |
| API coverage | 100% | 3 new endpoints + 1 GET comparison |
| Acceptance test pass rate | >80% | 18+/22 assertions |
| Feature branch cleanliness | 100% | Merge-ready to Sprint 1 branch |

---

## Timeline

| Date | Phase | Tasks |
|------|-------|-------|
| 2025-10-25 | Kickoff | Create branch, extend bridge for cohort context |
| 2025-10-27 | Gap Analysis | Implement per-cohort gap analysis, archetype scoring |
| 2025-10-28 | Workflows | Cohort-specific workflow suggestions |
| 2025-10-29 | ROI Tracking | Add ROI accumulator, cost efficiency metrics |
| 2025-10-30 | Testing | Write acceptance tests, validate >80% pass rate |
| 2025-11-01 | Merge | Merge to Sprint 1 branch, prepare for Sprint 3 |

---

## Handoff from Sprint 1

**Sprint 1 Deliverables** ✅:
- Cohort discovery infrastructure (trait extraction, k-means clustering)
- 3 cohort discovery endpoints in segmentation-server
- Data persistence to `data/segmentation/cohorts.json`
- Acceptance tests passing at 96.2%

**Sprint 2 Starting Points**:
1. Cohorts available via `/api/v1/segmentation/cohorts`
2. User-to-cohort lookup: `/api/v1/segmentation/cohorts/:userId`
3. Trait vectors with 5 dimensions: learningVelocity, domainAffinity, interactionFrequency, feedbackResponsiveness, retentionStrength
4. Archetype labels: Fast Learner, Specialist, Power User, Long-term Retainer, Generalist

**Sprint 2 Assumptions**:
- Segmentation server stable and serving cohort data
- Bridge service fully operational with Phase 1 features
- Training server can handle cohort context (future enhancement)
- No breaking changes to Phase 1 APIs (backward compatibility required)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Cohort data stale | Medium | 5-min cache TTL, graceful fallback to global analysis |
| Archetype weights inaccurate | Medium | Test with real user data post-Sprint 2, adjust in Sprint 3 |
| ROI calculation complexity | Low | Simplified initial model, can enhance in Phase 3 |
| Performance degradation | Low | Per-cohort caching, lazy load cohort traits |

---

## Next Phase: Sprint 3
**Focus**: Cohort-Aware Training Integration  
**Scope**:
- Modify training-server to accept cohort variants
- Implement per-cohort outcome tracking
- Build cohort performance dashboards
- Finalize Sprint 1 + 2 + 3 → Production merge

---

**Document Owner**: TooLoo.ai Platform Team  
**Last Updated**: 2025-10-18  
**Status**: Ready for Sprint 2 Kickoff
