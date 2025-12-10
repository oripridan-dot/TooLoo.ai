# 🎯 TooLoo.ai Week 1 Action Plan - Foundation Cleanup

## 🚀 PROGRESS UPDATE (Session 1)

### Errors Fixed: 106 → 45 (57% reduction)

### Tests: 129/131 passing (93.5%)

**Completed Fixes:**

- ✅ EventBus channel types extended (13 channels now supported)
- ✅ Index signature issues in 8+ files
- ✅ TaskType 'research' added to maps
- ✅ ChaosMiddleware export fixed
- ✅ main.ts SelfHealingOrchestrator method access fixed
- ✅ Zod type mapping in contract-enforcer.ts
- ✅ Duplicate Router import in cognitive.ts removed
- ✅ Provider scorecard/router types exported

**Remaining (45 errors):**

- precog/engine/benchmark-service.ts (6 errors)
- precog/engine/autonomous-evolution-engine.ts (6 errors)
- precog/engine/neural-learning-optimizer.ts (6 errors)
- cortex/design/figma-bridge.ts (3 errors)
- cortex/exploration/lab.ts (3 errors)
- Other scattered files (21 errors)

---

## 📊 Ground Truth Assessment (vs. Deep Dive Report)

### What the Analysis Got RIGHT:

1. **Architecture is sophisticated** - 271 API endpoints, 462 dependencies across 162 modules
2. **Integration gaps exist** - Features work individually but don't form coherent system
3. **Learning systems are dormant** - <5% actual utilization
4. **Solo developer focus is key** - 20/80 rule applies perfectly

### What the Analysis Got WRONG (or outdated):

1. **Memory IS integrated** - `hippocampus.vectorStore.search()` is called in chat flow (line 283, 840, 2426)
2. **QA Guardian IS built** - Full implementation exists, just `autoFixEnabled: false` by default
3. **Project Context IS wired** - `projectManager.getActiveProjectContext()` is in the hot path
4. **Tests are 93.5% passing** - 129/131 tests pass, not "unknown"

### Current System Health:

| Metric             | Before       | After        | Target      |
| ------------------ | ------------ | ------------ | ----------- |
| TypeScript Errors  | 106          | 45           | 0           |
| Test Pass Rate     | 93.5%        | 93.5%        | 100%        |
| Memory Integration | ✅ Active    | ✅ Active    | ✅          |
| QA Guardian        | ⚠️ Read-Only | ⚠️ Read-Only | ✅ Auto-Fix |
| Project Context    | ✅ Active    | ✅ Active    | ✅          |

---

## 🔧 Day 1-2: Critical TypeScript Fixes

### Priority 1: EventBus Channel Types ✅ DONE

**Problem:** `bus.publish()` only accepts `'system' | 'cortex' | 'precog' | 'nexus'` but code uses `'memory'`, `'ui'`, `'learning'`, `'agent'`, `'initiative'`, `'suggestions'`, `'user'`

**Solution:** Extended the EventBus source type

```typescript
// src/core/event-bus.ts - COMPLETED
export type EventSource =
  | 'cortex'
  | 'precog'
  | 'nexus'
  | 'system'
  | 'memory'
  | 'ui'
  | 'learning'
  | 'agent'
  | 'initiative'
  | 'suggestions'
  | 'user';
```

**Files Affected:** All EventBus-related errors resolved ✅

- `src/nexus/routes/chat.ts` (1 error)
- `src/nexus/routes/learning.ts` (1 error)
- `src/cortex/discover/suggestion-aggregator.ts` (1 error)

### Priority 2: Index Signature Access (28 errors)

**Problem:** TypeScript strict mode requires `obj['property']` instead of `obj.property` for index signatures

**Pattern Fix:**

```typescript
// Before
result.doc.metadata.source;

// After
result.doc.metadata['source'];
```

**Files Affected:**

- `src/nexus/routes/chat.ts` (4 errors)
- `src/cortex/discover/suggestion-aggregator.ts` (7 errors)
- `src/cortex/memory/vector-store.ts` (2 errors)
- `src/cortex/agent/artifact-manager.ts` (3 errors)
- `src/nexus/routes/cognitive.ts` (8 errors)

### Priority 3: Missing Properties (12 errors)

**Files to Fix:**

1. `src/cortex/agent/system-hub.ts` - Add `research` to TaskType
2. `src/cortex/agent/team-framework.ts` - Add `research` to TaskType
3. `src/cortex/design/figma-bridge.ts` - Add `wcagLevel` to ContrastIssue
4. `src/main.ts` - Fix SelfHealingOrchestrator method visibility

### Priority 4: Duplicate Identifiers (2 errors)

**File:** `src/nexus/routes/cognitive.ts`

- Line 17 and 29 both declare `Router`
- Solution: Remove duplicate import

---

## 🔧 Day 3-4: Enable QA Guardian

### Step 1: Review Current Configuration

```typescript
// src/qa/agent/qa-guardian-agent.ts - Line ~75
this.config = {
  enabled: true,
  autoFixEnabled: false, // READ-ONLY MODE BY DEFAULT ← Change this
  schedules: {
    wireCheck: 5 * 60 * 1000,
    healthPulse: 60 * 1000,
    hygieneCheck: 6 * 60 * 60 * 1000,
    fixCycle: 30 * 1000,
    weeklyReport: 7 * 24 * 60 * 60 * 1000,
  },
};
```

### Step 2: Create Safe Auto-Fix Categories

Define which issues are safe to auto-fix:

- ✅ Remove unused imports
- ✅ Fix trailing whitespace
- ✅ Add missing semicolons
- ⚠️ Delete orphaned files (requires backup)
- ❌ Modify business logic

### Step 3: Add Background Monitoring Task

```bash
# Add to scripts/dev.sh
npm run qa:monitor &
```

### Step 4: Create Dashboard Endpoint

Already exists: `GET /api/v1/system/qa/status`

---

## 🔧 Day 5: Validation Framework

### Current State: Contract Enforcer Exists!

Location: `src/nexus/middleware/contract-enforcer.ts`

**TypeScript Errors (2):**

- Line 119: Zod issue type mismatch
- Line 242: Zod issue type mismatch

**Fix Pattern:**

```typescript
// Before
.map((e: { path: (string | number)[]; message: string; code: string; }) => ...

// After
.map((e) => ({
  path: String(e.path.join('.')),
  message: e.message,
  expected: e.code,
}))
```

### Integration Status

The middleware exists but needs to be wired into more routes:

- ✅ Some routes use it
- ❌ Not applied globally
- ❌ No CI enforcement

---

## 📋 Deliverables Checklist

### End of Day 2:

- [ ] Zero TypeScript errors (`npm run typecheck` passes)
- [ ] All 131 tests pass
- [ ] EventBus accepts extended channel types

### End of Day 4:

- [ ] QA Guardian runs on schedule
- [ ] Dashboard shows real-time health
- [ ] Safe auto-fixes enabled

### End of Day 5:

- [ ] Contract enforcer middleware deployed
- [ ] One critical route fully validated
- [ ] Documentation updated

---

## 🚀 Quick Commands

```bash
# Check current status
npm run typecheck 2>&1 | grep "error TS" | wc -l
npm run test

# Run QA Guardian manually
curl http://localhost:4000/api/v1/system/qa/full-check

# View QA status
curl http://localhost:4000/api/v1/system/qa/status

# Start development
npm run dev
```

---

## 📈 Success Metrics

| Metric            | Before   | Target  | Measurement         |
| ----------------- | -------- | ------- | ------------------- |
| TypeScript Errors | 106      | 0       | `npm run typecheck` |
| Test Pass Rate    | 93.5%    | 100%    | `npm run test`      |
| QA Auto-Fix       | Disabled | Enabled | Config check        |
| Contract Coverage | Partial  | 1 route | Manual verification |

---

## 🔮 What This Unlocks for Week 2

With a clean foundation:

1. **Memory Enhancement** - Can trust memory queries won't fail
2. **Sandbox Persistence** - Can build on stable base
3. **Learning Activation** - QA data feeds learning systems
4. **User Flow Completion** - No surprise type errors

The assessment's "10-week battle plan" is achievable IF Week 1 delivers a stable foundation.
