# TooLoo.ai - 16-Server Architecture Investigation

**Date:** November 10, 2025  
**Scope:** Complete QA audit & consolidation strategy  
**Status:** Investigation Phase - Findings Below

---

## PART 1: CURRENT TOPOLOGY

### All 16 Active Servers (from orchestrator.js)

| # | Port | Server Name | Purpose | Status |
|---|------|---|---------|--------|
| 1 | 3000 | web-server | UI proxy + OAuth + GitHub/Slack + chat + design + system control | **BLOATED** |
| 2 | 3001 | training-server | TrainingCamp + HyperSpeed + Parallel Orchestrator | **CORE** |
| 3 | 3002 | meta-server | Meta-Learning + insights + bibliography | **CORE** |
| 4 | 3003 | budget-server | Budget mgmt + Provider status/policy + burst cache | **CORE** |
| 5 | 3004 | coach-server | AutoCoach + Fast Lane + boosters | **THIN PROXY** |
| 6 | 3005 | cup-server | Provider Cup tournaments + confidence scoring | **LIGHTWEIGHT** |
| 7 | 3006 | product-development-server | Workflows + artifacts + bookworm + learning | **BLOATED** |
| 8 | 3007 | segmentation-server | Conversation segmentation + webhooks + cohort analysis | **CORE** |
| 9 | 3008 | reports-server | Synthesis of training/meta/budget reports | **PROXY AGGREGATOR** |
| 10 | 3009 | capabilities-server | Discovered capabilities + activation + analysis | **STANDALONE** |
| 11 | 3010 | sources-server | GitHub sync + external data sources | **LIGHTWEIGHT** |
| 12 | 3011 | providers-arena-server | Multi-provider query + consensus + compare | **CORE** |
| 13 | 3012 | analytics-server | Learning velocity + badges + milestones | **PROXY LIGHTWEIGHT** |
| 14 | 3014 | design-integration-server | Design system + Figma + UI components | **SPECIALIZED** |
| 15 | 3020 | github-context-server | GitHub repo context + analysis | **LIGHTWEIGHT** |
| 16 | 3050 | ui-activity-monitor | Event tracking + heatmaps + engagement analytics | **SPECIALIZED** |

---

## PART 2: CRITICAL FINDINGS

### 🔴 **Duplication Issues**

#### 1. **GitHub API - Three Sources**
- **web-server.js** (lines 1025-1092): GitHub repos, issues, issue creation
- **github-context-server.js** (lines 14-176): GitHub info, issues, README, file access, structure
- **sources-server.js** (lines 40+): GitHub issues sync for training topics

**Problem:** Tripled GitHub handling. Three different approaches to same data.  
**Impact:** Inconsistent state, duplicated auth logic, competing writes

---

#### 2. **Analytics / Reporting - Fragmented**
- **analytics-server.js**: Learning history, badges, velocity, milestones
- **ui-activity-monitor.js**: Events, heatmaps, engagement, trends, sessions
- **reports-server.js**: Comprehensive synthesis from all services
- **training-server.js**: Embedded analytics integration

**Problem:** Four separate analytics pipelines. No unified event model.  
**Impact:** Fragmented insights, multiple state sources, reconciliation overhead

---

#### 3. **Budget + Provider Management - Spread**
- **budget-server.js**: Budget mgmt, provider status, policy, burst cache
- **training-server.js**: ParallelProviderOrchestrator (owns provider concurrency)
- **cup-server.js**: Cost calculator, provider tournament ranking
- **web-server.js**: Activity monitoring via heartbeat

**Problem:** Provider orchestration split across 4 services. No single source of truth for provider state.  
**Impact:** Race conditions, inconsistent provider metrics, hard to optimize

---

#### 4. **Chat / Conversion - Embedded vs Dedicated**
- **web-server.js** (lines 247-295): Chat message proxy + response convert endpoint
- **product-development-server.js**: Bookworm (chat-based book analysis)
- External dependencies: No dedicated chat/conversation service

**Problem:** Chat scattered. Bookworm has its own conversation model. No specialized chat engine.  
**Impact:** Limited conversation context, no shared chat memory, scaling issues if chat grows

---

#### 5. **Workflow Orchestration - Tangled**
- **product-development-server.js**: Workflows + artifacts + learning
- **orchestrator.js**: DAG building + intent processing + screen capture + repo org
- **training-server.js**: Trains using workflows

**Problem:** Three different workflow/DAG concepts competing. Unclear ownership.  
**Impact:** Redundant DAG logic, no unified task scheduling

---

### 🟡 **Code Quality Issues**

#### 1. **web-server.js - Over 2400 Lines**
- Monolithic: UI serving, OAuth (GitHub/Slack), GitHub API, Slack API, debugger, design, system control, proxy layer
- No separation of concerns
- OAuth callback duplicated (lines 895 & 1309, 958 & 1369)
- Heartbeat script injection is clever but fragile

**Fix Severity:** MEDIUM → Should split into: static-server, oauth-server, integrations-server, system-control-server

---

#### 2. **coach-server.js - Thin Proxy Overhead**
- **Lines 1-71:** Pure HTTP proxy to training-server
- **Why separate?** AutoCoachEngine is in training-server anyway
- **Latency:** Extra hop for every request

**Fix Severity:** LOW-MEDIUM → Can be absorbed into training-server or kept thin but with local AutoCoachEngine

---

#### 3. **reports-server.js - Aggregator Without Cache**
- Fetches from 6+ other services on every request
- No caching layer → N+1 problem when UI polls reports
- Hardcoded service URLs → tight coupling

**Fix Severity:** MEDIUM → Add ETL cron, cache with TTL, or consolidate reporting into budget-server

---

#### 4. **analytics-server.js - Proxy to Training**
- Mostly forwards to training-server
- Badge logic is lightweight but redundant with reports
- Velocity calculation could be in training-server

**Fix Severity:** LOW → Merge into training-server or expand to true analytics hub

---

#### 5. **Error Handling Patterns**
- Most servers use bare `.catch(e => res.status(500).json(...))` 
- No structured logging
- No request tracing/correlation IDs
- Health endpoints are minimal (no dependency checks)

**Fix Severity:** MEDIUM → Add centralized error handler, logging service, health aggregator

---

#### 6. **Unused Endpoints**
- **cup-server.js** line 42: `getScoreboard()` with hardcoded mock data → unused in real flows
- **sources-server.js**: Sync endpoint rarely called in production
- **github-context-server.js**: Analyze endpoint calls providers but results unused

**Fix Severity:** LOW → Audit usage, document, or remove

---

### 🟢 **What's Working Well**

| Service | Strength |
|---------|----------|
| **training-server** | Clean separation of TrainingCamp, HyperSpeed, MetaLearning concerns |
| **segmentation-server** | Excellent webhook abstraction (GitHub, Slack, generic) |
| **budget-server** | Good policy pattern, TTL cache smart |
| **cup-server** | Nice confidence/ROI scoring isolation |
| **design-integration-server** | Well-structured Figma adapter pattern |
| **orchestrator.js** | Solid DAG + Intent + Screen capture logic |

---

## PART 3: CONSOLIDATION STRATEGY

### 🎯 Proposed Architecture (9-11 Core Services)

```
WEB-SERVER (port 3000)
├─ Static serving + CDN fallback
├─ Reverse proxy router (simplified)
└─ Health aggregator

ORCHESTRATION-SERVER (port 3100) ← NEW
├─ Intent bus
├─ DAG builder + execution
├─ Screen capture + OCR
└─ Repo organization

TRAINING-SERVER (port 3001) ← EXPANDED
├─ TrainingCamp (core)
├─ HyperSpeed training
├─ ParallelProviderOrchestrator
├─ Meta-learning phases
├─ Auto-coach engine
└─ Hyper-boosts

PROVIDER-ORCHESTRATION-SERVER (port 3200) ← NEW
├─ Budget management
├─ Provider status/policy
├─ Burst execution
├─ Cup tournaments
├─ Cost calculator
└─ Provider metrics

ANALYTICS-HUB (port 3300) ← NEW UNIFIED
├─ Event ingestion
├─ Learning velocity
├─ Badge system
├─ Heatmaps + engagement
├─ UI activity tracking
└─ Reports synthesis

INTEGRATION-SERVER (port 3400) ← NEW
├─ GitHub OAuth + API
├─ Slack OAuth + API
├─ Debugger (local)
├─ Multi-instance control
└─ OAuth lifecycle

SOURCES-SERVER (port 3010) ← KEEP FOCUSED
├─ GitHub issue sync
├─ External data ingestion
└─ Source management

SEGMENTATION-SERVER (port 3007) ← KEEP
├─ Conversation segmentation
├─ Webhook handling
├─ Cohort analysis
└─ Event storage

CAPABILITIES-SERVER (port 3009) ← KEEP
├─ Discovered capabilities
├─ Activation management
└─ Analysis

PRODUCT-DEVELOPMENT-SERVER (port 3006) ← REFOCUSED
├─ Workflows (trained by training-server)
├─ Artifacts generation
├─ Bookworm analysis
└─ Skill matrix

DESIGN-INTEGRATION-SERVER (port 3014) ← KEEP
├─ Design system
├─ Figma integration
└─ UI components
```

---

## PART 4: DETAILED CONSOLIDATION PLAN

### Phase 1: Extract from web-server (3 days)

1. **Create oauth-server.js (port 3400)**
   - Move lines 820-1420 (OAuth full flow)
   - Add GitHub + Slack token storage
   - Expose `/api/v1/oauth/*` endpoints
   - Move debugger endpoints here too

2. **Keep web-server minimal (lines 1-200 + proxy)**
   - Static serving only
   - Route to oauth-server for auth
   - Simple reverse proxy (no chat logic)

3. **Move GitHub ops**
   - Lines 1025-1092 → github-context-server (consolidate with existing)
   - Keep github-context-server focused

---

### Phase 2: Unify Provider Orchestration (3 days)

1. **Extract training-server's ParallelProviderOrchestrator**
   - Move to budget-server, rename → provider-orchestration-server (port 3200)
   - Absorb cup-server logic (tournaments, scoring)
   - Consolidate cost calculator
   - Keep health minimal in training-server

2. **Unify provider status**
   - Single source: provider-orchestration-server
   - Budget-server queries it
   - Training-server queries it (not owns it)

---

### Phase 3: Consolidate Analytics (2 days)

1. **Create analytics-hub-server (port 3300)**
   - ui-activity-monitor + analytics-server + reports synthesis
   - Single event model
   - Badge + velocity + heatmap in one place
   - ETL from training/segmentation/budget

2. **Remove reports-server** (becomes analytics-hub)
3. **Simplify analytics-server** (merge into hub)

---

### Phase 4: Refactor Orchestrator (2 days)

1. **Move orchestrator logic to orchestration-server**
   - Keep as port 3100 (not 3123)
   - Consolidate screen-capture, intent-bus, DAG, repo-org
   - Separate concerns into modules within one server

2. **Update web-server proxy** to route `/api/v1/system/*` here

---

### Phase 5: QA + Testing (2 days)

1. Run full integration test suite
2. Load test new topology
3. Health endpoint validation
4. Verify no endpoints lost

---

## PART 5: QUICK WINS (Can Do Now)

### Immediate Fixes (No Architecture Change)

1. **Remove duplicate OAuth callbacks in web-server**
   - Lines 1309 & 1369 are redundant, can be deleted

2. **Add request correlation IDs**
   - All servers add `X-Request-ID` header
   - Log with request ID

3. **Cache reports-server results**
   - TTL cache (30 sec) on `/api/v1/reports/*` endpoints

4. **Consolidate GitHub endpoints**
   - Delete github-context-server's endpoints that duplicate web-server
   - Or delete web-server's GitHub and use github-context-server

5. **Add centralized logger**
   - Create `lib/logger.js` with structured logging
   - All servers import and use

6. **Audit & document unused endpoints**
   - cup-server mock data
   - sources-server sync frequency
   - capabilities-server activation

---

## PART 6: RISK ASSESSMENT

### Consolidation Risks

| Risk | Mitigation |
|------|-----------|
| Breaking UI during web-server split | Route through old paths initially, then redirect |
| Provider orchestration race conditions | Use mutual exclusion on state file, or Redis |
| Analytics losing data during migration | Dual-write during transition (old + new) |
| Orchestrator downtime | Keep current one running, test new one in parallel |

---

## PART 7: DECISION GATES

**Before proceeding, confirm:**

1. ✅ **Are similar services actually duplicated, or complementary?**
   - **Finding:** GitHub handling is 100% duplicated (3 sources, same tokens, same API)
   - **Decision:** YES, consolidate

2. ✅ **Should we reduce servers from 16 → ~9-11, or keep modular?**
   - **Finding:** Current 16 has poor boundaries; consolidation improves clarity
   - **Recommendation:** Reduce to 9-11 with clear ownership

3. ✅ **Should orchestrator be one service or separate intent-bus + dag + screen?**
   - **Finding:** They're tightly coupled; one service is cleaner
   - **Recommendation:** Merge into orchestration-server

4. **Should chat get a dedicated service?**
   - **Finding:** Chat scattered across web + product-dev + no memory
   - **Recommendation:** NOT NOW (low usage); embed in product-dev or web for now

---

## PART 8: IMMEDIATE ACTION ITEMS

### DO FIRST (This Week)
- [ ] Decision on consolidation scope (full vs. quick-wins)
- [ ] Set up branch: `refactor/architecture-consolidation`
- [ ] Create provider-orchestration-server skeleton
- [ ] Audit actual endpoint usage (what's unused?)

### IF FULL CONSOLIDATION APPROVED
- [ ] Start Phase 1: Extract oauth-server
- [ ] Start Phase 2: Provider consolidation
- [ ] Parallel: Create new orchestration-server
- [ ] Parallel: Build analytics-hub

---

## Summary: Similar vs. Complementing Services

| Pair | Type | Action |
|------|------|--------|
| web + github-context + sources | **DUPLICATE** | Consolidate → github-context-server handles all GitHub |
| training + meta + coach | **COMPLEMENTARY** | Keep separate; coach can be thin proxy or absorb into training |
| budget + cup + training's orchestrator | **DUPLICATE** | Consolidate → provider-orchestration-server |
| analytics + reports + ui-monitor | **DUPLICATE** | Consolidate → analytics-hub-server |
| segmentation + sources | **COMPLEMENTARY** | Keep separate (different concerns) |
| design + product-dev | **COMPLEMENTARY** | Keep separate (design is specialized) |
| orchestrator + training | **ENTANGLED** | Separate cleanly: orchestration-server (intent/DAG/screen) + training-server (learning) |

---

## Bottom Line

**Out of 16 servers:**
- **4-5 are duplicated** → Should consolidate
- **2-3 are thin proxies** → Should absorb or delete
- **9-11 are core** → Keep with better boundaries

**Recommended end state: 9-11 focused, well-scoped services** instead of 16 with blurry boundaries.

