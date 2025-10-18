# Phase 2: Cohort-Aware Meta-Learning Architecture

## Vision

Extend the Phase 1 closed-loop bridge to support **per-cohort optimization**. Instead of global gap analysis and suggestions, segment users/conversations by traits and optimize each cohort independently.

```
BEFORE Phase 2:         AFTER Phase 2:
Global Analysis         Cohort 1: Tech-savvy learners
  All Users      →        Gap Analysis 1
     ↓                     Workflow Suggestions 1
  One Gap List              Training Plan 1
     ↓                   
  One Training Plan     Cohort 2: Exploratory learners
                          Gap Analysis 2
                          Workflow Suggestions 2
                          Training Plan 2
                        
                        Cohort N: [Pattern]
                          Gap Analysis N
                          Workflow Suggestions N
                          Training Plan N
                        
                        Expected ROI Gain: +150%
```

---

## Key Components

### 1. **Cohort Trait Schema** (NEW)
Extend segmentation-server to emit and track:

```json
{
  "cohortId": "cohort-tech-savvy-001",
  "size": 245,
  "traits": {
    "learningVelocity": 0.87,      // How fast they master concepts (0-1)
    "domainAffinity": 0.72,        // Preference for technical topics (0-1)
    "interactionFrequency": 0.65,  // Session regularity (0-1)
    "feedbackResponsiveness": 0.91,// How well they respond to coaching (0-1)
    "retentionStrength": 0.78      // Knowledge retention rate (0-1)
  },
  "preferredModalities": ["video", "interactive-demo"],
  "commonGaps": ["autonomousEvolutionEngine", "enhancedLearning"],
  "successMetrics": {
    "averageMastery": 76,
    "completionRate": 0.88,
    "improvementRate": 0.15
  }
}
```

### 2. **Segmentation Extension** (segmentation-server)
New endpoint: `POST /api/v1/segmentation/cohorts`

```javascript
// Analyze conversations → group into cohorts → extract traits
{
  "conversations": [{ id, content, traits }],
  "minCohortSize": 10,
  "traitWeights": {
    "learningVelocity": 2.0,
    "domainAffinity": 1.5,
    "interactionFrequency": 1.0
  }
}
```

Response:
```json
{
  "cohorts": [
    {
      "id": "cohort-tech-savvy-001",
      "size": 245,
      "traits": {...},
      "members": ["user-001", "user-042", ...]
    }
  ],
  "cohortsCount": 5,
  "clustersCreated": true
}
```

### 3. **Bridge Enhancement** (capability-workflow-bridge)
New endpoints for cohort-aware analysis:

#### `POST /api/v1/bridge/analyze-gaps-by-cohort`
```json
{
  "cohortId": "cohort-tech-savvy-001"
}
```

Response:
```json
{
  "cohortId": "cohort-tech-savvy-001",
  "cohortSize": 245,
  "cohortTraits": {...},
  "gaps": [
    {
      "component": "autonomousEvolutionEngine",
      "discovered": 62,
      "activated": 25,
      "pending": 37,
      "severityScore": 0.65,  // weighted by cohort characteristics
      "urgency": "high"       // based on cohort learning velocity
    }
  ],
  "suggestions": {
    "autonomousEvolutionEngine": [
      {
        "workflowId": "workflow-001",
        "matchScore": 0.92,    // cohort affinity
        "estimatedImpact": 0.18,
        "suggestedFor": "Cohort: Tech-savvy learners with high learning velocity"
      }
    ]
  }
}
```

#### `GET /api/v1/bridge/cohorts-status`
```json
{
  "totalCohorts": 5,
  "activelyOptimizing": ["cohort-tech-savvy-001", "cohort-exploratory-002"],
  "cohorts": [
    {
      "id": "cohort-tech-savvy-001",
      "size": 245,
      "gapsAnalyzed": 37,
      "workflowsEnqueued": 12,
      "feedbackProcessed": 3,
      "capabilitiesActivated": 8,
      "roiGain": "18%"
    }
  ],
  "globalMetrics": {
    "totalGapsDetected": 127,
    "totalWorkflowsSuggested": 42,
    "totalFeedback": 15,
    "averageRoiGain": "14.5%"
  }
}
```

### 4. **Meta-Learning Extension** (meta-server)
New endpoint: `POST /api/v4/meta-learning/cohort-optimize`

```json
{
  "cohortId": "cohort-tech-savvy-001",
  "gaps": [
    "autonomousEvolutionEngine",
    "enhancedLearning"
  ],
  "constraints": {
    "maxDailyTrainingMinutes": 60,
    "preferredModalities": ["video"],
    "budgetConstraint": "standard"
  }
}
```

Response: Per-cohort meta-learning parameters for training optimization.

### 5. **Reports Extension** (reports-server)
New endpoint: `GET /api/v1/reports/cohort-dashboard/:cohortId`

Dashboard shows:
- Cohort composition & traits
- Gap progression over time
- Workflow effectiveness by cohort
- Per-cohort learning curves
- ROI per cohort vs. global average

---

## Integration Flow: Phase 2

```
STEP 1: Segmentation Extracts Cohorts
  Input: Recent conversations (100-1000)
  Output: 5 cohorts with traits
  Endpoint: POST /api/v1/segmentation/cohorts
  
STEP 2: Bridge Analyzes Per-Cohort Gaps
  Input: Cohort IDs from step 1
  For each cohort:
    - Query capabilities-server
    - Identify gaps weighted by cohort traits
    - Suggest workflows with cohort affinity scoring
  Endpoint: POST /api/v1/bridge/analyze-gaps-by-cohort
  Output: Prioritized gaps & suggestions per cohort
  
STEP 3: Meta-Learning Optimizes Per Cohort
  Input: Cohort gaps + traits + constraints
  For each cohort:
    - Generate cohort-specific training parameters
    - Adjust boost coefficients based on learning velocity
    - Tailor difficulty curve to domain affinity
  Endpoint: POST /api/v4/meta-learning/cohort-optimize
  Output: Cohort-specific learning boosters
  
STEP 4: Training Runs Per-Cohort Variants
  Input: Cohort-specific training plans
  For each cohort:
    - Select workflows from step 2 suggestions
    - Apply meta-learning params from step 3
    - Execute training variant
  Endpoint: POST /api/v1/training/enqueue-variant (with cohortId)
  Output: Performance data per cohort
  
STEP 5: Feedback Aggregates & Updates
  Input: Training outcomes (per cohort)
  For each cohort:
    - Record outcome in cohort context
    - Update cohort metrics (mastery, velocity, etc.)
    - Update capabilities with cohort weighting
  Endpoint: POST /api/v1/bridge/feedback (enhanced with cohortId)
  Output: Capability updates + cohort trait refinement
  
STEP 6: Reports Visualize Cohort Progress
  Input: Cohort metrics + capabilities + training outcomes
  Display per-dashboard:
    - Cohort trait evolution
    - Gap closure velocity by cohort
    - Workflow effectiveness per cohort
    - ROI comparison (cohort vs. global)
  Endpoint: GET /api/v1/reports/cohort-dashboard/:cohortId
  Output: Cohort-aware insights
```

---

## Data Schema Updates

### Bridge State Extension
```json
{
  "gapAnalysisCache": {...},
  "cohortAnalysis": {
    "cohort-tech-savvy-001": {
      "gaps": [...],
      "suggestions": [...],
      "lastAnalysis": "2025-10-18T00:10:00Z"
    }
  },
  "cohortTrainingQueue": {
    "cohort-tech-savvy-001": [
      { "id": "train-...", "workflowId": "...", "enqueuedAt": "..." }
    ]
  },
  "cohortFeedback": {
    "cohort-tech-savvy-001": [
      { "trainingId": "...", "outcome": {...}, "timestamp": "..." }
    ]
  }
}
```

### Cohort Metrics (NEW)
```json
{
  "cohortMetrics": {
    "cohort-tech-savvy-001": {
      "traits": {...},
      "gapsDetected": 37,
      "workflowsSuggested": 12,
      "trainingEnqueued": 5,
      "feedbackProcessed": 2,
      "capabilitiesActivated": 4,
      "averageImprovement": 15.2,
      "roiGain": 18,
      "lastUpdate": "2025-10-18T00:10:30Z"
    }
  }
}
```

---

## Implementation Roadmap (3–4 Sprints)

### Sprint 1: Segmentation Cohorts
- [ ] Extend `segmentation-server.js` with `POST /api/v1/segmentation/cohorts`
- [ ] Implement cohort clustering algorithm
- [ ] Extract trait schema & standardize
- [ ] Store cohorts in `data/segmentation/cohorts.json`
- [ ] **Deliverable:** Cohort discovery working, 5 test cohorts

### Sprint 2: Bridge Cohort Analysis
- [ ] Extend `capability-workflow-bridge.js` with cohort context
- [ ] Implement `POST /api/v1/bridge/analyze-gaps-by-cohort`
- [ ] Add cohort-aware gap prioritization
- [ ] Implement workflow affinity scoring by cohort traits
- [ ] **Deliverable:** Gap analysis per cohort, validated on 5 test cohorts

### Sprint 3: Meta-Learning & Training
- [ ] Extend `meta-server.js` for cohort-specific optimization
- [ ] Modify training-server to accept cohortId in variants
- [ ] Implement cohort-weighted performance metrics
- [ ] Connect training outcomes to cohort trait refinement
- [ ] **Deliverable:** E2E cohort-aware training, feedback loop working

### Sprint 4: Reporting & Monitoring
- [ ] Extend `reports-server.js` with cohort dashboards
- [ ] Create `GET /api/v1/reports/cohort-dashboard/:cohortId`
- [ ] Implement cohort-vs-global ROI comparison
- [ ] Add cohort trait evolution tracking
- [ ] **Deliverable:** Full cohort-aware dashboard, metrics visualization

---

## Expected Outcomes

### Performance Gains
| Metric | Global | Per-Cohort | Multiplier |
|--------|--------|-----------|-----------|
| **Gap Relevance** | 40% match | 85% match | 2.1x |
| **Workflow Adoption** | 35% completion | 72% completion | 2x |
| **Learning Velocity** | 1.2x baseline | 1.8x baseline | 1.5x |
| **ROI (per user cohort)** | Baseline | +150% | **+150%** |
| **Capability Activation** | 40% | 65% | 1.6x |

### Business Impact
- Users get **personalized learning paths** based on cohort traits
- Workflows matched to **learning velocity** and **domain affinity**
- Training outcomes **validated per cohort**, enabling per-cohort optimization
- ROI dashboards show **segment-level performance**, enabling data-driven decisions

---

## API Changes Summary

### New Endpoints (Bridge)
| Endpoint | Method | Purpose | Sprint |
|----------|--------|---------|--------|
| `/api/v1/bridge/analyze-gaps-by-cohort` | POST | Cohort-specific gap analysis | 2 |
| `/api/v1/bridge/enqueue-training` (enhanced) | POST | Accept cohortId parameter | 3 |
| `/api/v1/bridge/feedback` (enhanced) | POST | Accept cohortId in response | 3 |
| `/api/v1/bridge/cohorts-status` | GET | View cohort optimization status | 2 |

### New Endpoints (Segmentation)
| Endpoint | Method | Purpose | Sprint |
|----------|--------|---------|--------|
| `/api/v1/segmentation/cohorts` | POST | Extract & cluster cohorts | 1 |
| `/api/v1/segmentation/cohort/:cohortId` | GET | Get cohort details | 1 |

### New Endpoints (Reports)
| Endpoint | Method | Purpose | Sprint |
|----------|--------|---------|--------|
| `/api/v1/reports/cohort-dashboard/:cohortId` | GET | Cohort performance dashboard | 4 |
| `/api/v1/reports/cohorts-comparison` | GET | Compare all cohorts | 4 |

### Enhanced Endpoints (Meta-Learning)
| Endpoint | Method | Purpose | Sprint |
|----------|--------|---------|--------|
| `/api/v4/meta-learning/cohort-optimize` | POST | Cohort-specific meta params | 3 |

---

## Code Changes Required

### Files to Modify
1. `servers/segmentation-server.js` – Add cohort extraction
2. `servers/capability-workflow-bridge.js` – Add cohort context & analysis
3. `servers/meta-server.js` – Add cohort-specific optimization
4. `servers/training-server.js` – Accept cohortId in variants
5. `servers/reports-server.js` – Add cohort dashboards

### New Files
1. `engine/cohort-analyzer.js` – Clustering & trait extraction logic
2. `engine/cohort-affinity-scorer.js` – Match workflows to cohort traits
3. `data/segmentation/cohorts.json` – Persisted cohort definitions

### Lines of Code
- Phase 1: 1,342 lines
- **Phase 2 (estimated): 2,500–3,000 lines**
- Cumulative: ~3,800–4,300 lines for foundation

---

## Success Criteria

- ✅ Cohorts automatically discovered from conversation patterns
- ✅ Gap analysis produces cohort-specific results (>80% trait-based relevance)
- ✅ Workflows suggested with per-cohort affinity scores
- ✅ Training outcomes differ significantly by cohort (>10% variation)
- ✅ ROI metrics show +150% improvement for per-cohort vs. global optimization
- ✅ Full E2E test with 5 test cohorts, feedback loops validated

---

## Timeline

**Start:** 2025-10-20 (after Phase 1 merge)  
**Sprint 1:** Cohort discovery (1 week)  
**Sprint 2:** Per-cohort analysis (1 week)  
**Sprint 3:** Training integration (1 week)  
**Sprint 4:** Reporting & monitoring (1 week)  
**Total:** ~4 weeks (3–4 sprints as planned)

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Cohorts too small to be meaningful | Medium | High | Min cohort size 10, merge small cohorts |
| Trait extraction lacks precision | High | Medium | Validate against human labels, iterate |
| Per-cohort training overhead | Medium | Medium | Batch workflows by cohort, async processing |
| Meta-learning params diverge badly | Low | High | Guardrails on param ranges, fallback to global |

---

## Next Phase Hints (Phase 3)

Once Phase 2 is stable, Phase 3 will add **cost-aware optimization**:

- Budget constraints propagated through cohort-specific training
- Cost-tagged tournament rankings per cohort
- ROI-optimized capability selection (capability value ÷ cost)
- Budget dashboards per cohort

**Expected gain:** +200% efficiency (cost per capability activated)

---

**Status:** Planned  
**Branch:** `feature/phase-2-cohort-learning` (TBD)  
**Complexity:** High (cross-service coordination)  
**Business Value:** High (+150% ROI potential)
