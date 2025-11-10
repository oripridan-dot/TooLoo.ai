# TooLoo.ai Architecture - QUICK REFERENCE CARD

## The Situation (1-Page Summary)

**16 servers running TooLoo.ai. Investigation found:**

### 🔴 CRITICAL ISSUES (Must Fix)
- ❌❌❌ **GitHub API in 3 places** (web-server + github-context + sources)
- ❌❌❌ **Analytics split 4 ways** (ui-monitor + analytics + reports + training)
- ❌❌ **Provider orchestration scattered** (training + budget + cup + web)
- ❌ **Web-server is 2400-line monolith** (OAuth, GitHub, Slack, Chat, etc.)
- ⚠️ **Coach-server adds 10ms latency** (pure proxy, 100 lines)

**Result:** Fragile system with race conditions, duplicated code, state inconsistency.

---

## Your Decision (Pick One)

### 🟢 **OPTION A: Quick Wins** (1 week, low risk)
- Clean up duplicates, add caching
- Core problems remain unsolved
- **Recommended if:** Urgent blockers only

### 🔵 **OPTION B: Smart Consolidation** (2 weeks, medium risk) ⭐ **RECOMMENDED**
- Consolidate duplicates into unified services
- 16 servers → 11 servers
- Single source of truth per domain
- -10ms latency, better clarity
- **Recommended if:** Quality matters, time allows

### 🔴 **OPTION C: Full Rewrite** (4 weeks, high risk)
- Start from scratch
- Risky, but best outcome eventually
- **Recommended if:** Can afford 4-week development freeze

---

## What Gets Consolidated (Option B)

```
CURRENT (16 servers, chaos):
├─ web-server (2400 LOC - needs split)
├─ github-context-server (GitHub API)
├─ sources-server (GitHub sync)
├─ analytics-server (badges, velocity)
├─ ui-activity-monitor (events, heatmaps)
├─ reports-server (synthesis)
├─ coach-server (thin proxy)
├─ training-server (+ ParallelProviderOrchestrator)
├─ budget-server (+ provider policy)
├─ cup-server (+ tournament logic)
└─ ... 6 more

AFTER (11 servers, clean):
├─ web-server (static + proxy, 200 LOC)
├─ oauth-server ← NEW (split from web-server)
├─ orchestration-server ← NEW (moved from orchestrator.js)
├─ provider-orchestration-server ← NEW (training + budget + cup merged)
├─ analytics-hub-server ← NEW (analytics + reports + ui-monitor merged)
├─ github-context-server ← SIMPLIFIED (all GitHub ops)
├─ integration-server ← NEW (debugger, multi-instance control)
├─ training-server ← SIMPLIFIED (no ParallelProviderOrchestrator)
├─ segmentation-server
├─ product-dev-server
├─ capabilities-server
├─ sources-server
├─ design-server
└─ ... 3 more (no changes needed)
```

---

## The Numbers

| Metric | Before | After | Gain |
|--------|--------|-------|------|
| Services | 16 | 11 | 5 consolidated |
| Web-server LOC | 2411 | 200 | 90% reduction |
| GitHub endpoints | 3 sources | 1 source | 100% clarity |
| Analytics pipelines | 4 | 1 | unified |
| Provider state sources | 4 | 1 | unified |
| Thin proxies | 1 | 0 | removed |
| Latency | - | -10ms | faster |
| Health score | 4/10 | 8/10 | major improvement |

---

## Timeline (Option B)

### Week 1 (Days 1-5)
- **Mon-Tue:** Extract oauth-server from web-server
- **Wed-Thu:** Create provider-orchestration-server (merge training + budget + cup)
- **Fri:** Integration testing

### Week 2 (Days 6-10)
- **Mon-Tue:** Create analytics-hub-server (merge analytics + reports + ui-monitor)
- **Wed-Thu:** Create orchestration-server (move orchestrator.js)
- **Fri:** Full regression testing

### Week 3 (Deployment)
- **Mon-Tue:** Gradual cutover (0% → 25% → 50% → 100%)
- **Wed-Thu:** Monitor, verify no issues
- **Fri:** Mark stable, archive old services

---

## Core Duplication Issues

### 1. GitHub API (3 Sources)
```
web-server.js (lines 1025-1092)
  /api/v1/github/repos
  /api/v1/github/issues
  /api/v1/github/issue

github-context-server.js (lines 14-176)
  /api/v1/github/info
  /api/v1/github/issues ← DUPLICATE!
  /api/v1/github/readme
  /api/v1/github/file
  /api/v1/github/files
  /api/v1/github/structure
  /api/v1/github/context

sources-server.js (lines 40+)
  /api/v1/sources/github/issues/sync

CONSOLIDATION → github-context-server handles ALL GitHub
```

### 2. Analytics (4 Pipelines)
```
ui-activity-monitor.js
  events, heatmaps, engagement, trends

analytics-server.js
  learning velocity, badges, milestones

reports-server.js
  synthesis from 6+ services (N+1 problem!)

training-server.js
  embedded analytics integration

CONSOLIDATION → Single analytics-hub-server with unified event model
```

### 3. Provider Orchestration (4 Services)
```
training-server.js
  ParallelProviderOrchestrator (owns concurrency)

budget-server.js
  Provider policy, burst cache

cup-server.js
  Cost calculator, tournaments, scoring

web-server.js
  Activity heartbeat (affects priority)

CONSOLIDATION → provider-orchestration-server owns all provider state
```

---

## Quick Decision Matrix

| If you care about... | Choose |
|-----|-----|
| **Speed to stability** | Option A |
| **Code quality** | Option B |
| **Latency** | Option B |
| **Long-term maintainability** | Option B |
| **Zero risk** | Option A |
| **Best outcome** | Option B |
| **Can handle 4-week dev pause** | Option C |

**Most teams:** Option B ⭐

---

## Documents to Read

1. **ARCHITECTURE_INVESTIGATION_README.md** ← START HERE
2. **ARCHITECTURE_DECISION_GATE.md** ← Decision framework
3. **ARCHITECTURE_VISUAL_SUMMARY.md** ← Diagrams & charts
4. **ARCHITECTURE_DETAILED_FINDINGS.md** ← Code-level details

---

## Decision Checklist

- [ ] Read ARCHITECTURE_INVESTIGATION_README.md
- [ ] Choose Option A, B, or C
- [ ] Confirm with team
- [ ] Create branch if Option B: `refactor/architecture-consolidation`
- [ ] Start Phase 1 (extract oauth-server)
- [ ] Run parallel testing
- [ ] Gradual cutover
- [ ] Celebrate cleaner system 🎉

---

## The Bottom Line

**Current:** 16 servers with overlapping concerns, race conditions, duplicated code.  
**Target:** 11 focused servers with clear boundaries, unified state, -10ms latency.  
**Time:** 2 weeks (Option B) or forever (Option A limping along).  
**Difficulty:** Medium (careful testing mitigates risk).  
**Recommendation:** **Do it. Choose Option B.**

---

**Questions?** See the full documents above.  
**Ready?** Create branch and start Phase 1.

