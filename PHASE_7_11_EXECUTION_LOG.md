# Phase 7 + Phase 11 Execution Log

**Start Time:** November 4, 2025 - 22:36 UTC  
**Branch:** `refactor/phase-7-merge-engines`  
**Status:** IN PROGRESS

---

## PHASE 7: MERGE OVERLAPPING LOGIC (Executing)

### 7.3: LLMProvider Standardization (CURRENT - 15 min)

**Goal:** Standardize all LLM calls across 10 services to use single interface

**Current State Audit:**
- ✅ LLMProvider class has `generateSmartLLM(request)` method (primary)
- ✅ Standalone export function `generateSmartLLM({prompt, system, taskType...})`
- ⚠️ Some services use class method, some use function
- ⚠️ Some services import differently

**Files to Check:**
- training-server.js - TrainingCamp usage
- coach-server.js - AutoCoachEngine usage  
- product-dev-server.js - ProductAnalysisEngine usage
- reports-server.js - AnalyticsEngine usage
- meta-server.js - MetaLearningEngine usage

**Standardization Approach:**
1. Create unified `LLMProvider.generate()` method that accepts any format
2. Update all services to use: `import LLMProvider from '../engine/llm-provider.js'`
3. Replace all calls with: `await LLMProvider.generate(prompt, options)`
4. Test each service after update

---

## EXECUTION PLAN

### Phase 7 - Sequence

**7.1 ProductAnalysisEngine** (20 min)
- [ ] Read current engine + server
- [ ] Extract market gap methods
- [ ] Remove duplicates
- [ ] Test: qa:product

**7.2 MetricsCollector** (20 min)
- [ ] Expand collector methods
- [ ] Update reports-server queries
- [ ] Update orchestrator queries
- [ ] Test: qa:reports

**7.3 LLMProvider** (15 min) ← STARTING NOW
- [ ] Audit all LLM calls
- [ ] Create unified interface
- [ ] Update 5 services
- [ ] Test each

**7.4 UserModel** (10 min)
- [ ] Add segmentation storage
- [ ] Integrate SegmentationGuardian
- [ ] Test unified model

---

## Phase 11 - After Phase 7

**11.1 Adapters Structure** (30 min)
- [ ] Create lib/adapters/
- [ ] OAuth adapter skeleton
- [ ] Design adapter skeleton
- [ ] Integrations skeleton

**11.2 OAuth** (30 min)
- [ ] GitHub flow
- [ ] Google flow
- [ ] Token storage

**11.3 Design** (30 min)
- [ ] Figma API integration
- [ ] Design validation
- [ ] Component extraction

**11.4 Integrations** (20 min)
- [ ] API bridge patterns
- [ ] Webhook handlers
- [ ] Rate limiting

**11.5 Wire** (10 min)
- [ ] Update web-server.js
- [ ] Mount middleware
- [ ] Test routes

---

## CURRENT WORK: Phase 7.3 - LLMProvider Standardization

### Step 1: Audit LLM Usage Patterns

Searching for all LLM calls across services...

### Files Affected:
- training-server.js (TrainingCamp → generateSmartLLM)
- coach-server.js (AutoCoachEngine → LLMProvider)
- product-dev-server.js (ProductAnalysisEngine → generateSmartLLM)
- reports-server.js (AnalyticsEngine → generateSmartLLM)
- meta-server.js (MetaLearningEngine)

### Current Patterns Found:
1. Class instance method: `this.llm.generateSmartLLM({...})`
2. Standalone function: `await generateSmartLLM({...})`
3. Dynamic import: `const { generateSmartLLM } = await import(...)`

### Solution:
Create single unified interface in LLMProvider class:
```javascript
class LLMProvider {
  // Unified method that handles all variants
  async generate(prompt, options = {}) {
    // If called with request object format
    if (typeof prompt === 'object') {
      return this.generateSmartLLM(prompt);
    }
    // If called with string format
    return this.generateSmartLLM({
      prompt,
      system: options.system,
      taskType: options.taskType || 'chat',
      context: options.context
    });
  }
}
```

Then export both for compatibility:
```javascript
export { LLMProvider };
export async function generateSmartLLM(request) {
  const provider = new LLMProvider();
  return provider.generateSmartLLM(request);
}
```

### Next Steps:
1. Implement unified interface
2. Audit each service
3. Update imports/calls
4. Test each service
5. Verify all tests pass

---

## PROGRESS TRACKING

| Phase | Task | Status | Duration |
|-------|------|--------|----------|
| 7.1 | ProductAnalysisEngine | Not Started | 20 min |
| 7.2 | MetricsCollector | Not Started | 20 min |
| 7.3 | LLMProvider | **IN PROGRESS** | 15 min |
| 7.4 | UserModel | Not Started | 10 min |
| 8 | Merge Phase 7 | Not Started | 5 min |
| 11.1 | Adapters Structure | Not Started | 30 min |
| 11.2 | OAuth | Not Started | 30 min |
| 11.3 | Design | Not Started | 30 min |
| 11.4 | Integrations | Not Started | 20 min |
| 11.5 | Wire & Test | Not Started | 10 min |

**Total Estimated:** ~180-200 minutes

---

## NOTES

- Working on `refactor/phase-7-merge-engines` branch
- Phase 11 will be on separate branch after Phase 7 complete
- Both will be merged back to main at end
- Smoke test should pass before each phase merge
