# TooLoo.ai Server Consolidation - Visual Summary

## Current Chaos (16 Servers)

```
                       ┌─────────────────────────────────┐
                       │     WEB-SERVER (3000)           │
                       │  2400+ LOC MONOLITH             │
                       │  • Static serving               │
                       │  • OAuth (GitHub/Slack)         │
                       │  • GitHub API calls ❌❌         │
                       │  • Slack API calls              │
                       │  • Chat handling                │
                       │  • Debugger control             │
                       │  • Design endpoints             │
                       │  • Reverse proxy                │
                       │  • System control               │
                       └─────────────────────────────────┘
                                   │
                  ┌────────────────┼────────────────────┐
                  │                │                    │
        ┌─────────▼──────┐  ┌──────▼──────┐  ┌─────────▼────────┐
        │ TRAINING (3001)│  │  META (3002)│  │  SEGMENTATION    │
        │  • TrainingCamp│  │  • Learning │  │  (3007)          │
        │  • HyperSpeed  │  │    phases   │  │  • Webhooks      │
        │  • Provider    │  │  • Insights │  │  • Conversation  │
        │    Orchestra❌ │  │  • Reports  │  │  • Cohorts       │
        │               │  │             │  │                  │
        └────────────────┘  └─────────────┘  └──────────────────┘

        ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐
        │  BUDGET (3003)  │  │  CUP (3005)  │  │ REPORTS (3008) │
        │  • Budget mgmt  │  │  • Scores    │  │ • Aggregator   │
        │  • Provider     │  │  • Tokens    │  │   (fetches     │
        │    policy ❌❌  │  │  • Cost calc │  │    from 6+)    │
        │  • Burst cache  │  │  • Tourn     │  │                │
        │                 │  │    results   │  │                │
        └─────────────────┘  └──────────────┘  └────────────────┘

        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐
        │  ANALYTICS ❌❌  │  │  SOURCES (3010)  │  │  GITHUB-CTX  │
        │  (3012)          │  │  • GitHub sync   │  │  (3020)      │
        │  • Learning      │  │  • Issues→topics │  │  • GitHub    │
        │    velocity      │  │                  │  │    info ❌❌ │
        │  • Badges        │  │                  │  │  • Repo      │
        │  • History       │  │                  │  │    structure │
        └──────────────────┘  └──────────────────┘  └──────────────┘

        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐
        │  PRODUCT-DEV     │  │  CAPABILITIES    │  │  DESIGN      │
        │  (3006)          │  │  (3009)          │  │  (3014)      │
        │  • Workflows     │  │  • Methods       │  │  • System    │
        │  • Artifacts     │  │  • Activation    │  │  • Figma     │
        │  • Bookworm      │  │  • Analysis      │  │  • Components│
        │  • Learning      │  │                  │  │              │
        └──────────────────┘  └──────────────────┘  └──────────────┘

        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐
        │  COACH (3004)    │  │  UI-MONITOR      │  │ ORCHESTRATOR │
        │  THIN PROXY ⚠️   │  │  (3050)          │  │ (3123)       │
        │  • Forwards to   │  │  • Heatmaps      │  │  • Intent    │
        │    training      │  │  • Events ❌     │  │  • DAG       │
        │  • 100 LOC       │  │  • Engagement    │  │  • Screen    │
        │                  │  │                  │  │  • Repo org  │
        └──────────────────┘  └──────────────────┘  └──────────────┘

❌ = DUPLICATED LOGIC
⚠️ = THIN PROXY / LOW VALUE
```

---

## Duplications Highlighted

### 1️⃣ **GitHub API - 3 SOURCES**
```
WEB-SERVER           GITHUB-CTX-SERVER      SOURCES-SERVER
├─ /github/repos     ├─ /github/info         ├─ /sources/github/sync
├─ /github/issues    ├─ /github/issues       │
├─ /github/issue     ├─ /github/readme       │
│                    ├─ /github/file         │
│                    ├─ /github/files        │
│                    ├─ /github/structure    │
│                    └─ /github/context      │
```
**Solution:** github-context-server owns all GitHub, others call it

---

### 2️⃣ **Analytics - 4 SPLIT PIPELINES**
```
UI-ACTIVITY-MONITOR     ANALYTICS-SERVER       REPORTS-SERVER        TRAINING-SERVER
├─ Events               ├─ Learning history    ├─ Synthesis from      ├─ Embedded
├─ Heatmaps             ├─ Badges              │   6+ services        │   analytics
├─ Features engagement  ├─ Velocity            ├─ Report generation   │   integration
├─ Engagement metrics   ├─ Milestones          │                       │
└─ Trends               └─ Badge mgmt          └─────────────────────┘ └─────────────┘
```
**Solution:** Single analytics-hub (port 3300) with unified event model

---

### 3️⃣ **Provider Orchestration - 4 ENTANGLED**
```
TRAINING-SERVER          BUDGET-SERVER         CUP-SERVER          WEB-SERVER
├─ ParallelProvider      ├─ Budget mgmt        ├─ Cost calc         ├─ Heartbeat
│  Orchestrator          ├─ Provider policy    ├─ Confidence        │   activity
├─ Manages provider      ├─ Burst cache        │   scoring           │   tracking
│  concurrency ❌        └─ Status query ❌    └─ Tournaments ❌    └─
```
**Solution:** provider-orchestration-server (port 3200) owns all provider state & policy

---

### 4️⃣ **Coach - THIN PROXY**
```
WEB-SERVER → COACH-SERVER (port 3004) → TRAINING-SERVER
             100 lines, just forwards!
```
**Solution:** Absorb into training-server or delete entirely

---

## Proposed Clean Architecture (9-11 Services)

```
┌──────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LAYER                        │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────┐         ┌──────────────────────┐    │
│  │  ORCHESTRATOR-SRV   │         │  WEB-SERVER (THIN)   │    │
│  │  (3100)             │         │  (3000)              │    │
│  │ • Intent bus        │         │ • Static files       │    │
│  │ • DAG builder       │         │ • Proxy router       │    │
│  │ • Screen capture    │         │ • Health aggregator  │    │
│  │ • Repo organization │         │                      │    │
│  └─────────────────────┘         └──────────────────────┘    │
│                                                                │
└──────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
┌───────────────▼──────┐    │    ┌──────▼──────────────────┐
│   TRAINING (3001)    │    │    │  PROVIDER-ORCH (3200)   │
│   ✅ EXPANDED CORE   │    │    │  ✅ NEW - CONSOLIDATES │
├──────────────────────┤    │    ├─────────────────────────┤
│ • TrainingCamp       │    │    │ • Budget mgmt           │
│ • HyperSpeed         │    │    │ • Provider policy       │
│ • Meta-learning      │    │    │ • Burst execution       │
│ • Auto-coach         │    │    │ • Cup tournaments       │
│ • Hyper-boosts       │    │    │ • Cost calculation      │
│ • Learning velocity  │    │    │ • Provider metrics      │
│                      │    │    │ • Status aggregation    │
└──────────────────────┘    │    └─────────────────────────┘
                            │
                ┌───────────┼──────────────┐
                │           │              │
┌───────────────▼──────────┐│  ┌───────────▼─────────┐
│  ANALYTICS-HUB (3300)    ││  │ INTEGRATION (3400)  │
│  ✅ NEW - UNIFIED       ││  │ ✅ NEW - SPLIT OUT  │
├────────────────────────┤││  ├─────────────────────┤
│ • Event ingestion      │││  │ • OAuth (GitHub)    │
│ • Learning velocity    │││  │ • OAuth (Slack)     │
│ • Badge system         │││  │ • Debugger control  │
│ • Heatmaps + trends    │││  │ • Multi-instance    │
│ • Engagement metrics   │││  │ • System startup    │
│ • Reports synthesis    │││  │                     │
│ • Session analytics    │││  └─────────────────────┘
└────────────────────────┘│
                          │
      ┌───────────────────┼────────────────────┐
      │                   │                    │
┌─────▼─────────┐  ┌──────▼────────┐  ┌───────▼──────────┐
│ SEGMENTATION  │  │ CAPABILITIES  │  │ PRODUCT-DEV      │
│ (3007)        │  │ (3009)        │  │ (3006)           │
├───────────────┤  ├───────────────┤  ├──────────────────┤
│ • Webhooks    │  │ • Discovered  │  │ • Workflows      │
│   (GH/Slack)  │  │   methods     │  │ • Artifacts      │
│ • Conversation│  │ • Activation  │  │ • Bookworm       │
│   segmentation│  │ • Analysis    │  │ • Skill matrix   │
│ • Cohort      │  │               │  │                  │
│   analysis    │  │               │  │                  │
│ • Events      │  │               │  │                  │
└───────────────┘  └───────────────┘  └──────────────────┘
      │                                         │
      └─────────────────┬───────────────────────┘
                        │
      ┌─────────────────┼──────────────────┐
      │                 │                  │
┌─────▼──────────┐ ┌────▼─────────┐ ┌─────▼─────────┐
│ SOURCES        │ │ GITHUB-CTX   │ │ DESIGN        │
│ (3010)         │ │ (3020)       │ │ (3014)        │
├────────────────┤ ├──────────────┤ ├───────────────┤
│ • Issue sync   │ │ • GitHub API │ │ • Design      │
│ • External     │ │ • Repo info  │ │   system      │
│   data ingestion│ │ • Analyze   │ │ • Figma       │
│                │ │   context   │ │ • Components  │
└────────────────┘ └──────────────┘ └───────────────┘
```

---

## Migration Path (2-Week Rollout)

### Week 1: Extraction Phase
- **Day 1-2:** Extract oauth-server from web-server
  - Move lines 820-1420 of web-server.js → oauth-server.js (port 3400)
  - Test OAuth flow end-to-end
  
- **Day 3:** Create provider-orchestration-server
  - Move ParallelProviderOrchestrator from training-server
  - Move CUP tournament logic
  - Absorb budget's provider policy
  - Keep budget-server thin (just budget queries provider-orch)

- **Day 4:** Create analytics-hub-server
  - Merge ui-activity-monitor + analytics-server + reports
  - Single event model
  - Badge system unified

- **Day 5:** Test integration

### Week 2: Consolidation + Testing
- **Day 6-7:** Consolidate github-context-server
  - Pull GitHub from web-server (1025-1092)
  - Merge with github-context-server
  - Test all endpoints
  
- **Day 8-9:** Create orchestration-server
  - Move orchestrator.js logic to port 3100
  - Keep intent-bus, DAG, screen-capture, repo-org
  - Verify all routing

- **Day 10:** Full regression testing, load tests

---

## What Gets Deleted / Simplified

| File | Action | Why |
|------|--------|-----|
| coach-server.js | **DELETE** | 100% proxy to training-server (adds 10ms latency) |
| reports-server.js | **DELETE** | Merge into analytics-hub-server |
| analytics-server.js | **DELETE** | Merge into analytics-hub-server |
| ui-activity-monitor.js | **MERGE** | Move into analytics-hub-server |
| orchestrator.js | **MOVE** | Becomes orchestration-server (port 3100) |
| web-server.js | **SHRINK** | Remove OAuth, debugger, GitHub, design (move elsewhere) |

---

## Outcome: Focused Services

**Old (16 bloated services)** → **New (9-11 focused services)**

| Layer | Old | New |
|-------|-----|-----|
| **UI/Proxy** | web-server (2400 LOC) | web-server (200 LOC) |
| **Learning** | training, meta, coach | training (expanded) |
| **Provider Mgmt** | budget, cup, training | provider-orch (new) |
| **Analytics** | analytics, reports, ui-monitor | analytics-hub (new) |
| **Integration** | web-server (scattered) | integration-server (new) |
| **Orchestration** | orchestrator (996 LOC) | orchestration-server (new port) |
| **Conversation** | segmentation | segmentation |
| **Capabilities** | capabilities | capabilities |
| **Product** | product-dev | product-dev |
| **Sources** | sources | sources |
| **Design** | design | design |
| **Context** | github-context | github-context |

**Total reduction:** 16 → 11 services  
**Lines of code consolidated:** ~5000+ LOC moved to more logical homes  
**Request latency:** -10ms per avg request (coach proxy removed)  
**State consistency:** IMPROVED (unified provider state, unified analytics)

---

