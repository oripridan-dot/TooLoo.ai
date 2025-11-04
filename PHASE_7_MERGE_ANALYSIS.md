# Phase 7: Merge Overlapping Logic in Engines

**Status:** PLANNING (Ready to execute)  
**Date:** November 4, 2025  
**Estimated Duration:** 45-60 minutes

---

## OBJECTIVE

Consolidate duplicate/overlapping implementations in the 12 core engines to:
- ✅ Eliminate code duplication
- ✅ Reduce maintenance burden
- ✅ Improve consistency
- ✅ Centralize shared logic

---

## CORE ENGINES AUDIT

### 12 Current Engines

```
AI Layer:
  1. llm-provider.js (1200+ lines)
     - Main AI provider selection + fallback chain
     - Shared by ALL services
  
  2. product-analysis-engine.js (800+ lines)
     - Innovation idea generation
     - Used by: product-dev-server

Learning:
  3. meta-learning-engine.js (1100+ lines)
     - Strategy optimization
     - Used by: meta-server, coach-server, training-server
  
  4. training-camp.js (1400+ lines)
     - Hyper-speed training rounds
     - Used by: training-server
  
  5. adaptive-learning-engine.js (900+ lines)
     - User personalization
     - Used by: coach-server
  
  6. auto-coach-engine.js (700+ lines)
     - Feedback loops + coaching
     - Used by: coach-server

System:
  7. metrics-collector.js (600+ lines)
     - Telemetry collection
     - Used by: orchestrator, all services

  8. cost-calculator.js (500+ lines)
     - Budget tracking + provider cost
     - Used by: budget-server

  9. user-model-engine.js (400+ lines)
     - User profile + preferences
     - Used by: coach-server

  10. segmentation-guardian.js (1000+ lines)
      - 16-trait user segmentation
      - Used by: coach-server, reports-server

  11. provider-cup.js (600+ lines)
      - Provider tournament logic
      - Used by: cup-server

  12. repo-auto-org.js (300+ lines)
      - Repository hygiene
      - Used by: orchestrator
```

---

## IDENTIFIED OVERLAPS

### 1. **ProductAnalysisEngine ↔ Multiple Services** (PRIORITY: HIGH)

**Problem:** ProductAnalysisEngine logic duplicated in:
- `product-dev-server.js` (lines 200-400: inline analysis)
- `training-camp.js` (lines 150-250: learning from product data)
- Potential: `meta-learning-engine.js` (optimization applied to product ideas)

**Current State:**
```javascript
// In product-dev-server.js (duplicate logic):
async function analyzeMarketGap(ideaText) {
  const gap = await ProductAnalysisEngine.analyze(ideaText);
  // Then duplicates competitor analysis
  const competitors = await fetchCompetitors(gap);
  // ...
}

// In training-camp.js (same logic, different context):
async function trainOnProductData(ideas) {
  const analyzed = ideas.map(idea => ProductAnalysisEngine.analyze(idea));
  // Then duplicates competitor analysis
  // ...
}
```

**Solution:**
- ✅ Keep ProductAnalysisEngine as single source
- ✅ Extract: `analyzeMarketGap()` → engine method
- ✅ Extract: `fetchCompetitors()` → reusable helper
- ✅ Remove inline duplication from servers
- ✅ Result: Single entry point for all product analysis

---

### 2. **MetricsCollector ↔ Reports Analytics** (PRIORITY: HIGH)

**Problem:** Metrics collection duplicated in:
- `metrics-collector.js` (core telemetry)
- `reports-server.js` (lines 100-200: inline metrics aggregation)
- `orchestrator.js` (lines 500-600: manual health tracking)
- Potential: `meta-learning-engine.js` (optimization based on metrics)

**Current State:**
```javascript
// In metrics-collector.js:
async function collectMetrics() {
  const cpu = os.cpus().length;
  const mem = process.memoryUsage();
  return { cpu, mem, timestamp: Date.now() };
}

// In reports-server.js (duplicates collection):
app.get('/api/v1/reports/metrics', async (req, res) => {
  const metrics = {
    cpu: os.cpus().length,
    mem: process.memoryUsage(),
    // DUPLICATE of metrics-collector.js
  };
});

// In orchestrator.js (manual tracking):
const healthState = {
  cpu: os.cpus().length,
  services: {},
  // DUPLICATE tracking
};
```

**Solution:**
- ✅ MetricsCollector becomes central authority
- ✅ reports-server queries metrics-collector, doesn't calculate
- ✅ orchestrator queries metrics-collector for health
- ✅ Single source of truth for all telemetry
- ✅ Result: Centralized metrics pipeline

---

### 3. **LLMProvider Wrapper Calls** (PRIORITY: MEDIUM)

**Problem:** Multiple services wrap the LLMProvider with different patterns:
- `training-server.js`: `await generateSmartLLM(prompt, model)`
- `coach-server.js`: `await LLMProvider.generate(prompt)`
- `product-dev-server.js`: `const { generateSmartLLM } = await import(...)`
- `reports-server.js`: `await generateSmartLLM(question, 'analysis')`

**Current State:**
```javascript
// Inconsistent patterns across servers:

// Pattern 1: generateSmartLLM wrapper
const response = await generateSmartLLM(prompt, model);

// Pattern 2: Direct LLMProvider
const response = await LLMProvider.generate(prompt, { model });

// Pattern 3: Dynamic import then call
const { generateSmartLLM } = await import('../engine/llm-provider.js');
const response = await generateSmartLLM(prompt);

// Pattern 4: Named wrapper with different signature
const response = await generateLLMResponse(prompt, { temperature, max_tokens });
```

**Solution:**
- ✅ Standardize on single wrapper: `LLMProvider.generate()`
- ✅ All servers import: `import LLMProvider from '../engine/llm-provider.js'`
- ✅ All calls: `await LLMProvider.generate(prompt, options)`
- ✅ Result: Consistent interface across system

---

### 4. **UserModel ↔ Segmentation** (PRIORITY: MEDIUM)

**Problem:** User profiling logic split across engines:
- `user-model-engine.js` (profiles user, 400 lines)
- `segmentation-guardian.js` (segments user via 16 traits, 1000 lines)
- Potential overlap: Both maintain user state/preferences

**Current State:**
```javascript
// user-model-engine.js: Tracks user profile
class UserModelEngine {
  updateProfile(userId, traits) { /* store user */ }
  getProfile(userId) { /* retrieve user */ }
}

// segmentation-guardian.js: Tracks user traits
class SegmentationGuardian {
  analyze(userInput) { /* calculate 16 traits */ }
  storeTraits(userId, traits) { /* store traits */ }  // DUPLICATE of updateProfile
}
```

**Solution:**
- ✅ UserModelEngine becomes central user data store
- ✅ SegmentationGuardian reads/writes via UserModelEngine
- ✅ Single user profile: profile + segmentation traits
- ✅ Result: Unified user model

---

## CONSOLIDATION STRATEGY

### Phase 7.1: ProductAnalysisEngine Consolidation (20 min)

**Step 1:** Extract reusable methods from product-dev-server.js
```javascript
// Into ProductAnalysisEngine:
+ analyzeMarketGap(ideaText) - market positioning analysis
+ fetchCompetitors(gap) - competitor research
+ validateProductFit(idea, market) - viability check
```

**Step 2:** Remove inline logic from product-dev-server.js
```javascript
// Before:
async function processIdea(text) {
  const gap = await ProductAnalysisEngine.analyze(text);
  const competitors = await fetchCompetitors(gap);
  // ... 20 lines of inline logic
}

// After:
async function processIdea(text) {
  return await ProductAnalysisEngine.analyzeCompete(text);
}
```

**Step 3:** Update training-camp.js to use engine
```javascript
// Before: Manual competitor analysis in training loop
// After: Call ProductAnalysisEngine.analyzeCompete()
```

**Step 4:** Verify reports-server product features use engine
```javascript
// Test: /api/v1/reports/products calls ProductAnalysisEngine
```

---

### Phase 7.2: MetricsCollector Centralization (20 min)

**Step 1:** Expand metrics-collector.js as central authority
```javascript
+ getSystemMetrics() - CPU, memory, uptime
+ getServiceMetrics(serviceName) - per-service telemetry
+ getProviderMetrics() - AI provider performance
+ getTrainingMetrics() - learning progress
+ storeMetrics(data) - persistent storage
```

**Step 2:** Update reports-server.js to query metrics-collector
```javascript
// Before: Calculates metrics inline
const cpu = os.cpus();
const mem = process.memoryUsage();

// After: Queries central authority
const metrics = await fetch('http://127.0.0.1:3001/api/v1/metrics');
```

**Step 3:** Update orchestrator.js to query metrics-collector
```javascript
// Before: Tracks health manually
const health = { cpu: ..., services: ... };

// After: Queries metrics-collector
const health = await fetch('http://127.0.0.1:3001/api/v1/metrics/health');
```

**Step 4:** Update meta-learning-engine to optimize based on metrics
```javascript
+ observeMetrics(metrics) - learn from system performance
+ predictResourceUsage() - anticipate demands
```

---

### Phase 7.3: LLMProvider Standardization (15 min)

**Step 1:** Audit all LLM calls across 10 services
```bash
grep -r "generateSmartLLM\|LLMProvider\|import.*llm-provider" servers/ --include="*.js"
```

**Step 2:** Update to standard interface
```javascript
// Everywhere:
import LLMProvider from '../engine/llm-provider.js';

// All calls:
await LLMProvider.generate(prompt, {
  model: 'claude-3-5-haiku-20241022',
  temperature: 0.7,
  max_tokens: 2000
});
```

**Step 3:** Create wrapper functions in each server if needed
```javascript
// In each server, only if needed:
async function queryAI(prompt, context) {
  return LLMProvider.generate(prompt, {
    // Service-specific defaults
  });
}
```

**Step 4:** Verify consistency
```bash
# All servers should have identical import pattern
grep "import.*LLMProvider" servers/*.js | wc -l  # Should be 10
```

---

### Phase 7.4: UserModel ↔ Segmentation Integration (10 min)

**Step 1:** Add segmentation storage to UserModelEngine
```javascript
class UserModelEngine {
  // Existing:
  updateProfile(userId, traits) { }
  getProfile(userId) { }
  
  // New:
  storeSegmentation(userId, traits16) { }
  getSegmentation(userId) { }
}
```

**Step 2:** Update SegmentationGuardian to use UserModelEngine
```javascript
// Before:
class SegmentationGuardian {
  storeTraits(userId, traits) { /* direct storage */ }
}

// After:
class SegmentationGuardian {
  storeTraits(userId, traits) {
    return userModel.storeSegmentation(userId, traits);
  }
}
```

**Step 3:** Verify unified user model
```bash
# Test: User profile includes segmentation traits
curl http://127.0.0.1:3004/api/v1/coach/user/123 | jq '.profile.segmentation'
```

---

## CONSOLIDATION CHECKLIST

### Before Starting
- [ ] Read ARCHITECTURE.md (understand engine relationships)
- [ ] Run smoke test: `npm run test:smoke`
- [ ] Create branch: `git checkout -b refactor/phase-7-merge-engines`
- [ ] Back up current state: `git stash`

### ProductAnalysisEngine (Phase 7.1)
- [ ] Extract `analyzeMarketGap()` from product-dev-server.js
- [ ] Extract `fetchCompetitors()` from product-dev-server.js
- [ ] Remove duplicate logic from product-dev-server.js
- [ ] Update training-camp.js to use engine
- [ ] Test: `npm run qa:product`

### MetricsCollector (Phase 7.2)
- [ ] Add `getSystemMetrics()` to metrics-collector.js
- [ ] Add `getServiceMetrics()` to metrics-collector.js
- [ ] Update reports-server.js to query metrics-collector
- [ ] Update orchestrator.js to query metrics-collector
- [ ] Test: `npm run qa:reports`

### LLMProvider (Phase 7.3)
- [ ] Audit all LLM calls: `grep -r "generateSmartLLM" servers/`
- [ ] Standardize imports: all use `import LLMProvider`
- [ ] Standardize calls: all use `LLMProvider.generate()`
- [ ] Test each service: `npm run qa:training`, `npm run qa:coach`, etc.

### UserModel (Phase 7.4)
- [ ] Add segmentation storage to UserModelEngine
- [ ] Update SegmentationGuardian to use UserModelEngine
- [ ] Test: `curl http://127.0.0.1:3004/api/v1/coach/user/123`

### Final Verification
- [ ] Run full smoke test: `npm run test:smoke`
- [ ] Run all integration tests: `npm run test:integration`
- [ ] Check no regressions: `npm run qa:suite`
- [ ] Commit: `git commit -m "refactor: Phase 7 complete - merge overlapping engine logic"`

---

## EXPECTED OUTCOMES

### Code Reduction
| Item | Before | After | Reduction |
|------|--------|-------|-----------|
| Duplicate LLM calls | 10+ variants | 1 standard | 90% |
| Metrics collection | 3 implementations | 1 central | 66% |
| Product analysis | 2 locations | 1 engine | 50% |
| Lines deleted | — | ~200 | Cleanup |

### Quality Improvements
- ✅ Single interface for all AI calls (consistency)
- ✅ Centralized metrics pipeline (observability)
- ✅ One product analysis engine (maintainability)
- ✅ Unified user model (correctness)

### Risk Mitigation
- ⚠️ **Risk:** Breaking existing functionality
  - **Mitigation:** Run smoke test + integration tests before + after each step
- ⚠️ **Risk:** Service interdependencies
  - **Mitigation:** Use branch, test thoroughly before merge
- ⚠️ **Risk:** Performance regression
  - **Mitigation:** Compare metrics before/after consolidation

---

## EXECUTION PLAN

### Session 1: ProductAnalysisEngine (20 min)
1. Read current product-dev-server.js
2. Extract methods to ProductAnalysisEngine
3. Update product-dev-server.js to use engine
4. Test: `npm run qa:product`

### Session 2: MetricsCollector (20 min)
1. Expand metrics-collector.js
2. Update reports-server.js queries
3. Update orchestrator.js queries
4. Test: `npm run qa:reports && npm run qa:meta`

### Session 3: LLMProvider (15 min)
1. Audit all LLM calls
2. Standardize imports + calls
3. Test each service integration
4. Verify consistency

### Session 4: UserModel (10 min)
1. Update UserModelEngine
2. Integrate SegmentationGuardian
3. Test unified model
4. Final smoke test

### Final: Verification (5 min)
1. Run full smoke test
2. Run integration tests
3. Commit consolidation
4. Create PR + merge

**Total Time:** ~60-70 minutes (spread across 1-2 sessions)

---

## NOTES FOR EXECUTION

### Safety First
- Always work on a branch (`refactor/phase-7-merge-engines`)
- Never commit directly to main
- Run smoke test after each major change
- Test integration points thoroughly

### Dependency Map
```
web-server
  └─ LLMProvider
training-server
  ├─ TrainingCamp
  ├─ MetaLearningEngine
  └─ LLMProvider
meta-server
  ├─ MetaLearningEngine
  └─ MetricsCollector
budget-server
  └─ CostCalculator
coach-server
  ├─ AutoCoachEngine
  ├─ AdaptiveLearning
  ├─ UserModelEngine
  ├─ SegmentationGuardian
  └─ LLMProvider
cup-server
  └─ ProviderCup
product-dev-server
  ├─ ProductAnalysisEngine
  └─ LLMProvider
reports-server
  ├─ MetricsCollector
  ├─ AnalyticsEngine
  └─ LLMProvider
capabilities-server
  └─ CapabilitiesManager
orchestrator
  ├─ MetricsCollector
  └─ RepoAutoOrg
```

### Rollback Plan
If issues arise:
```bash
git checkout main                    # Return to stable state
npm run stop:all                     # Stop all services
npm run dev                          # Restart from last good commit
```

---

## SUCCESS CRITERIA

✅ **All of the following must be true:**
1. Smoke test passes: `npm run test:smoke` → exit code 0
2. Integration tests pass: `npm run test:integration` → all green
3. No new linting errors: `npm run lint` → no errors
4. No code duplication: All ProductAnalysis/Metrics/LLM use centralized engines
5. Consistent interfaces: All LLM calls use same pattern
6. Zero regressions: All 10 services start + respond to health checks

**Ready to proceed with Phase 7?** 🚀

---

**Next Action:** When ready, execute Phase 7.1 (ProductAnalysisEngine consolidation) to begin engine merging.
