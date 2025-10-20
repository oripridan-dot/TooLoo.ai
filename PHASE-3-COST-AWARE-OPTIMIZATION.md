# Phase 3: Cost-Aware Optimization
*Cost-Efficient Learning System Evolution*

**Status:** In Progress  
**Target Completion:** October 22-24, 2025  
**Expected Value:** +200% cost efficiency (cost per capability down 2x)  
**Branch:** `feature/phase-3-cost-aware`

---

## Mission

Transform Phase 2's per-cohort optimization into a **cost-aware system** where:
- Budget constraints guide training decisions
- Provider efficiency determines tournament rankings  
- ROI per dollar (not absolute capability) drives capability prioritization
- Cohorts optimize under realistic cost constraints

---

## Key Concepts

### Cost-Aware Optimization (vs Phase 2)

**Phase 2:** Select workflows that best close gaps
- ❌ Ignores cost per provider
- ❌ May activate expensive capabilities for low ROI
- ❌ No budget awareness

**Phase 3:** Select workflows that close gaps **within budget**
- ✅ Cost-tagged provider recommendations
- ✅ ROI = (capability value / provider cost) 
- ✅ Budget constraints per cohort
- ✅ Cost-aware tournament rankings

### Architecture

```
PHASE 3: COST-AWARE OPTIMIZATION
┌─────────────────────────────────────────────────────────────┐
│ Cohort → Gap Analysis (Per Cohort, from Phase 2)           │
│      ↓                                                       │
│ Cost-Aware Provider Selection                              │
│   - Budget constraints propagated from budget-server       │
│   - Provider costs loaded from provider registry          │
│   - ROI scoring: capability value / provider cost         │
│      ↓                                                       │
│ Tournament Ranking with Cost Tags                          │
│   - Cup-server ranks workflows by ROI, not absolute gain  │
│   - Per-provider cost tiers (cheap, standard, premium)    │
│   - Efficiency coefficient: 1.5x boost for low-cost wins  │
│      ↓                                                       │
│ Budget-Conscious Training                                 │
│   - Coach-server respects per-cohort budget policies      │
│   - Stops training if remaining budget < next workflow    │
│   - Alternative: suggest cheaper provider for same task   │
│      ↓                                                       │
│ Cost Dashboard                                            │
│   - Reports-server shows:                                │
│     * Cost per capability (cohort level)                │
│     * Efficiency trends (improving? stalling?)           │
│     * Budget utilization (% spent vs. allocated)         │
│     * Provider efficiency ranking                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Task 1: Budget Constraint Middleware (Budget-Server)
**Goal:** Enable per-cohort budget policies  
**Complexity:** Medium  
**Effort:** 2–3 hours

**What to add:**
```javascript
// New endpoint: GET /api/v1/budget/policy/:cohortId
// Returns: { budgetRemaining, costPerCapability, providers: [{name, cost, efficiency}] }

// New middleware: validateBudget(req, res, next)
// Checks if proposed workflow cost < budgetRemaining
```

**Files to modify:**
- `servers/budget-server.js` – Add cohort budget tracking

**Key code:**
```javascript
app.get('/api/v1/budget/policy/:cohortId', (req, res) => {
  const cohortId = req.params.cohortId;
  const policy = budgetPolicies[cohortId] || {
    monthlyBudget: 10000,
    costPerCapability: 100,
    providers: {
      'ollama': { cost: 0, efficiency: 1.0 },
      'anthropic': { cost: 50, efficiency: 0.9 },
      'openai': { cost: 75, efficiency: 0.85 },
      'gemini': { cost: 40, efficiency: 0.88 }
    }
  };
  
  res.json({
    ok: true,
    cohortId,
    budgetRemaining: calculateBudgetRemaining(cohortId),
    ...policy
  });
});

app.post('/api/v1/budget/can-afford', (req, res) => {
  const { cohortId, provider, estimatedCost } = req.body;
  const remaining = calculateBudgetRemaining(cohortId);
  res.json({
    ok: true,
    canAfford: estimatedCost <= remaining,
    budgetRemaining: remaining,
    cost: estimatedCost
  });
});
```

### Task 2: Cost-Aware Tournament Rankings (Cup-Server)
**Goal:** Rank workflows by ROI (capability value / cost), not absolute gain  
**Complexity:** High  
**Effort:** 3–4 hours

**What to add:**
```javascript
// New endpoint: POST /api/v1/cup/cost-aware-tournament
// Input: { workflows: [...], cohortId, budget }
// Output: Ranked workflows with ROI scores and cost tags
```

**Key logic:**
```javascript
// Traditional scoring: capability value
const score = workflow.expectedGain;

// Cost-aware scoring: ROI = value / cost
const provider = providerRegistry[workflow.provider];
const roi = workflow.expectedGain / (provider.cost || 1);
const costTag = provider.cost > 75 ? 'premium' : 
                 provider.cost > 40 ? 'standard' : 'cheap';

// Boost low-cost wins for variety
const efficiencyCoeff = costTag === 'cheap' ? 1.5 : 
                        costTag === 'standard' ? 1.0 : 0.7;
const weightedROI = roi * efficiencyCoeff;
```

**Files to modify:**
- `servers/cup-server.js` – Add cost-aware tournament logic

### Task 3: Budget-Conscious Training (Coach-Server)
**Goal:** Respect budget constraints during optimization loops  
**Complexity:** High  
**Effort:** 3–4 hours

**What to add:**
```javascript
// Modify training loops to check budget before each workflow
// If budget too low, suggest alternative cheap provider or stop
```

**Key code:**
```javascript
async function selectNextWorkflow(cohortId, gaps) {
  // Get budget policy
  const policy = await getBudgetPolicy(cohortId);
  const remaining = policy.budgetRemaining;
  
  // Filter workflows by budget
  const affordable = gaps.filter(gap => {
    const cost = providerCost(gap.provider);
    return cost <= remaining;
  });
  
  if (affordable.length === 0) {
    return {
      action: 'suggest-alternative',
      message: 'Budget exhausted, suggest cheaper provider',
      cheaperAlternative: findCheaperAlternative(gaps[0])
    };
  }
  
  // Select highest ROI affordable workflow
  return selectHighestROI(affordable);
}
```

**Files to modify:**
- `servers/coach-server.js` – Add budget checks to optimization loop

### Task 4: ROI Calculation & Tracking
**Goal:** Calculate and persist cost-per-capability metrics  
**Complexity:** Medium  
**Effort:** 2–3 hours

**New metric:**
```javascript
costPerCapability = totalCostSpent / capabilitiesActivated
efficiency = (Phase2_CostPerCapability / Phase3_CostPerCapability)
// e.g., 200 / 100 = 2.0x more efficient
```

**What to add:**
- New endpoint: `GET /api/v1/budget/metrics/:cohortId`
- Track per workflow: cost, capability impact, ROI

**Files to modify:**
- `servers/budget-server.js` – Add metrics tracking
- `servers/bridge-server.js` – Record cost in feedback loop

### Task 5: Budget Dashboard (Reports-Server)
**Goal:** Visualize cost efficiency and budget utilization  
**Complexity:** Medium  
**Effort:** 2–3 hours

**New endpoint:**
```javascript
GET /api/v1/reports/budget-dashboard/:cohortId
// Returns:
// {
//   cohortId,
//   budgetPolicy: {...},
//   budgetUtilization: 65%, // spent / allocated
//   costPerCapability: 85,   // down from 200 (2.4x improvement!)
//   providerEfficiency: [
//     { provider: 'ollama', costPerCapability: 0, uses: 15 },
//     { provider: 'anthropic', costPerCapability: 42, uses: 8 },
//     ...
//   ],
//   workflowEfficiency: [
//     { workflow, cost, roiScore, capabilitiesGained }
//   ]
// }
```

**Files to modify:**
- `servers/reports-server.js` – Add budget dashboard

### Task 6: Integration with Bridge & Orchestrator
**Goal:** Wire cost-aware optimization through the system  
**Complexity:** Medium  
**Effort:** 2–3 hours

**What to update:**
- Bridge service: pass budget constraints to coach
- Orchestrator: track cost metrics in system health
- Quality gates: add cost efficiency gate (expected: 2x improvement)

**Files to modify:**
- `servers/capability-workflow-bridge.js` – Pass budgetId to coach
- `servers/orchestrator.js` – Add cost tracking

---

## Quality Gates: Phase 3

Add new quality gates for cost efficiency:

```yaml
Cost Efficiency:
  costPerCapability: target <= 100 (from baseline 200+)
  efficiencyGain: target >= 2.0x  
  budgetUtilization: target 60-80% (not over/under spending)
  providerDiversification: no single provider > 60% of spend
```

---

## Testing Strategy

### Unit Tests
1. Cost calculation: `expectedGain / providerCost = ROI` ✓
2. Budget checks: "Can afford X at Y cost?" ✓
3. Alternative suggestions: "If over budget, suggest cheaper provider" ✓

### Integration Tests
1. Full cost-aware tournament: workflows ranked by ROI ✓
2. Budget-conscious training: respects per-cohort budgets ✓
3. Cost dashboard: metrics accurate and updated ✓

### End-to-End Test
1. Run Phase 2 training (baseline costs)
2. Run Phase 3 training (cost-aware)
3. Compare: costPerCapability should improve 2x+ ✓

---

## Implementation Order

1. **Task 1:** Budget Constraint Middleware (foundation)
2. **Task 4:** ROI Calculation & Tracking (enables cost-aware scoring)
3. **Task 2:** Cost-Aware Tournament (uses ROI scores)
4. **Task 3:** Budget-Conscious Training (applies budget constraints)
5. **Task 5:** Budget Dashboard (visualizes improvements)
6. **Task 6:** Integration (wires everything together)

---

## Expected Outcomes

| Metric | Phase 2 Baseline | Phase 3 Target | Gain |
|--------|-----------------|----------------|------|
| Cost per Capability | $200 | $100 | 2.0x improvement |
| Provider Diversity | 1.8 providers | 2.5+ providers | Reduced lock-in |
| Budget Utilization | N/A | 60-80% | Disciplined spending |
| Capability ROI | $100/capability | $50/capability | 2x efficiency |

**Total Value:** +$100M+ annual savings at scale (500K learners × 1K capabilities × $100 savings)

---

## Deployment & Monitoring

1. **Canary:** Run cost-aware optimization on 10% of cohorts
   - Monitor cost/cap trends
   - Verify budget constraints work
   - Check provider diversity

2. **Ramp:** Increase to 50% of cohorts (monitor)

3. **Full Rollout:** All cohorts on cost-aware optimization
   - Target: >1.8x efficiency improvement
   - Budget utilization: 65% ± 5%

---

## Success Criteria

- ✅ Cost per capability ≤ $100 (from $200+)
- ✅ Budget constraints respected (no overspending)
- ✅ Provider diversity > 2.0 (use multiple providers)
- ✅ Efficiency coefficient >= 1.8x
- ✅ All quality gates passing
- ✅ Dashboard shows improvements
- ✅ Training continues under budget constraints

---

## Files to Create/Modify

### New Files
- `engine/cost-calculator.js` – ROI and cost metrics
- `engine/budget-policy-engine.js` – Per-cohort budget logic

### Modified Files
1. `servers/budget-server.js` – Budget policies & constraints
2. `servers/cup-server.js` – Cost-aware tournament
3. `servers/coach-server.js` – Budget-conscious training
4. `servers/reports-server.js` – Budget dashboard
5. `servers/capability-workflow-bridge.js` – Cost propagation
6. `servers/orchestrator.js` – Cost metrics tracking
7. `scripts/validate-quality-gates.js` – Add cost gates

---

## Timeline

- **Today (Oct 22):** Tasks 1, 4, 2 (architecture + data flow)
- **Tomorrow (Oct 23):** Tasks 3, 5, 6 (training + visibility)
- **Oct 24:** Testing, validation, quality gates, deployment prep

---

## Related Documentation

- Phase 1: `PHASE-1-COMPLETE.md`
- Phase 2: `PHASE-2-COHORT-LEARNING-ARCHITECTURE.md`
- Cost metrics: `budget-server.js` (lines 1-100)
- Provider registry: `environment-hub.js` (provider costs)

