# Phases 3–5 Navigation Map
**Quick reference for all phase documents and their purposes**

---

## 📚 Document Hierarchy

### Phase 3: Coach-Server Integration (✅ Complete)

**STATUS**: All gates passed (Oct 20, 2025)

#### Files to Read
1. **`servers/coach-server.js`** (212 lines)
   - Entry point for Auto-Coach, Fast-Lane, Boost endpoints
   - `POST /api/v1/auto-coach/start` – Starts coaching loop
   - `GET /api/v1/auto-coach/status` – Returns diagnostics
   - `POST /api/v1/auto-coach/boost` – Runs N rapid rounds
   - `POST /api/v1/auto-coach/fast-lane` – Toggles fast-lane mode

2. **`engine/auto-coach-engine.js`** (150+ lines)
   - Core coaching logic: meta-trigger detection, round scheduling
   - Methods: `start()`, `stop()`, `_tick()`, `getStatus()`

3. **`servers/orchestrator.js`** (lines 80–120)
   - Pre-arm sequence: training → meta → coach startup
   - Fast-lane default config (if env FAST_LANE_ON=true)

#### Verification
```bash
curl -s http://127.0.0.1:3004/health | jq .
curl -s http://127.0.0.1:3004/api/v1/auto-coach/status | jq .
curl -s -X POST http://127.0.0.1:3004/api/v1/auto-coach/boost \
  -H 'Content-Type: application/json' -d '{"rounds":3}'
```

---

### Phase 4: Ramp & Scale-Out (Nov 1 – Feb 28, 2025)

**STATUS**: Launching Nov 1 (11 days away)

#### PRIMARY DOCUMENT: `PHASE-4-EXECUTION-PLAN.md` (65 KB, 40 min read)

**Sections**:
1. **Phase 4 Structure** (2 sprints)
   - Sprint 1 (Nov 1–30): 500K learners, 3 regions
   - Sprint 2 (Dec 1–Feb 28): 5M+ learners, 8 regions

2. **GATE 1: Nov 1 @ 13:00 UTC** (Pre-Ramp Go/No-Go)
   - Pre-flight checklist (15 items)
   - Success criteria (error, latency, uptime, throughput)
   - Decision logic (IF/ELSE tree)
   - Escalation paths (5 failure modes)

3. **GATE 2: Nov 2 @ 16:00 UTC** (Full Rollout)
   - 40-hour ramp: 5K → 10K → 25K → 50K (hourly stages)
   - Intensive monitoring (15-min polling)
   - Alert triggers (error >0.15%, latency >150ms, etc.)
   - Rollback procedure (2 levels)

4. **GATE 3–7**: Production baseline, sprint reviews, planning
   - Each with success criteria, decision logic, rollback

5. **Orchestrator Config for Phase 4**
   - Coach thresholds (interval, micro-batches, batch size)
   - Meta-learning config (boost retention, rush mode)
   - Training settings (aggressive mode multiplier)

#### SECONDARY DOCUMENT: `EXECUTION-GATES-FRAMEWORK.md` (45 KB, 30 min read)

**Why separate?**
- `PHASE-4-EXECUTION-PLAN.md` = "What happens each gate"
- `EXECUTION-GATES-FRAMEWORK.md` = "How gates work (system-wide)"

**Sections**:
1. **Gate System Overview** (how gates work)
2. **Phase 3** (already complete, for reference)
3. **Phase 4 Gates 1–7** (condensed version of plan, plus escalations)
4. **Phase 5 Gates 8–11** (IPO gates)
5. **Cross-Gate Escalation Matrix** (if coach crashes during Nov 2, what happens)
6. **Decision Authorities** (who decides at each gate)
7. **On-Call Rotation** (24/7 Nov 1–15, then step-down)

#### TERTIARY DOCUMENT: `COACH-SERVER-INTEGRATION-COMPLETE.md` (40 KB, 15 min read)

**Purpose**: Executive summary for board/CEO

**Contains**:
- Phase 3 verification results (all health checks green)
- Phase 4 timeline at a glance (7 gates, key dates)
- Phase 5 roadmap summary (10M learners, IPO Aug 31)
- Document reading order (recommended)
- Nov 1 readiness checklist (curl commands to verify)
- Success definition (what "pass Phase 4" means)

---

### Phase 5: IPO Readiness (Mar 1 – Aug 31, 2025)

**STATUS**: Strategy ready, execution begins if Phase 4 passes (Feb 28)

#### PRIMARY DOCUMENT: `PHASE-5-ROADMAP.md` (70 KB, 50 min read)

**Sections**:
1. **Phase 5 Mission** (10M learners, 15 regions, $300M+ ARR, IPO filing Aug 31)

2. **Phase 5 Structure** (6 months broken into 5 streams)
   - Month 1 (Mar): Compliance & multi-cloud setup
   - Month 2 (Apr): Expansion to 10 new regions
   - Months 3–4 (May–Jun): Series B fundraising + M&A
   - Months 5–6 (Jul–Aug): Product sprint + IPO prep

3. **Scale Progression** (table: Mar–Aug)
   - Monthly targets for learners, regions, revenue

4. **Compliance & Certification** (Mar–Apr)
   - SOC 2 Type II audit (Big 4 auditor)
   - GDPR, FERPA, regional regs (LGPD, APPI, DPDP)
   - By-region requirements (8 jurisdictions)

5. **Regional Expansion** (Apr–May)
   - 10 new regions: Brazil, Mexico, Nigeria, Kenya, UAE, Saudi, India, Bangladesh, Indonesia, Philippines
   - Each region: ports, localization, infrastructure, partner strategy

6. **Series B Funding** (May 1–Jun 30)
   - $150–200M target
   - Use of funds breakdown
   - Investor metrics (LTV:CAC, CAC payback, retention)
   - Target investor profiles

7. **M&A Strategy** (May–Jul)
   - 2 acquisitions (retention platform + payment/compliance)
   - Post-integration synergy

8. **IPO Readiness** (Jul–Aug)
   - S-1 filing (Aug 31 target)
   - Valuation target ($2–3B)
   - IPO timeline (Oct 20, 2025)

9. **Phase 5 Success Criteria** (Aug 31)
   - Scale, operations, compliance, financial, team, market positioning

10. **Phase 5 Execution Timeline** (calendar view)

11. **Post-IPO Roadmap** (Phase 6 preview)

#### SECONDARY DOCUMENT: `EXECUTION-GATES-FRAMEWORK.md` (Gates 8–11)

**Gates**:
- Gate 8 (Mar 31): Compliance ready
- Gate 9 (Apr 30): 10-region expansion complete
- Gate 10 (Jun 30): Series B funded
- Gate 11 (Aug 31): **IPO READY** (final gate, CEO + board decision)

---

## 🗺️ Decision Tree by Document

### "I need to know if we're ready for Nov 1 ramp"
→ Start: `COACH-SERVER-INTEGRATION-COMPLETE.md` (executive summary)
→ Detail: `PHASE-4-EXECUTION-PLAN.md` (GATE 1 section)
→ Deep: `servers/coach-server.js` + `engine/auto-coach-engine.js` (verify endpoints)

### "I'm the on-call engineer during Nov 1–15, what do I need?"
→ Start: `EXECUTION-GATES-FRAMEWORK.md` (on-call rotation + escalation)
→ Detail: `PHASE-4-EXECUTION-PLAN.md` (alert thresholds, rollback procedures)
→ Reference: `servers/coach-server.js` (restart commands)

### "I'm evaluating if we should go ahead with Feb 28 IPO readiness gate"
→ Start: `COACH-SERVER-INTEGRATION-COMPLETE.md` (phase 4 success definition)
→ Detail: `PHASE-4-EXECUTION-PLAN.md` (GATE 7 section)
→ Strategic: `PHASE-5-ROADMAP.md` (implications if Phase 4 passes)

### "I'm VP of Engineering, brief me on the 12-month roadmap"
→ Start: `COACH-SERVER-INTEGRATION-COMPLETE.md` (all phases overview)
→ Phase 4: `PHASE-4-EXECUTION-PLAN.md` (my decisions at gates 1, 4, 5, 6, 7)
→ Phase 5: `PHASE-5-ROADMAP.md` (compliance, funding, IPO path)
→ Framework: `EXECUTION-GATES-FRAMEWORK.md` (my authorities, escalation matrix)

### "I'm the CEO, what should I know?"
→ Start: `COACH-SERVER-INTEGRATION-COMPLETE.md` (everything in 15 min)
→ Decisions: `EXECUTION-GATES-FRAMEWORK.md` (decision authorities table)
→ Long-term: `PHASE-5-ROADMAP.md` (IPO strategy, Series B, timeline)

### "I'm a board member, what's the risk/upside?"
→ Start: `COACH-SERVER-INTEGRATION-COMPLETE.md` (pass probability estimates)
→ Detail: `PHASE-4-EXECUTION-PLAN.md` (gates 1, 4, 7; rollback scenarios)
→ Strategic: `PHASE-5-ROADMAP.md` (IPO valuation, market position)
→ Governance: `EXECUTION-GATES-FRAMEWORK.md` (gate decisions, authorities)

---

## 📅 Timeline Reference

```
OCT 20, 2025 (TODAY)
├─ Phase 3 complete ✅
├─ Phase 4 docs finalized
└─ Phase 5 strategy drafted

NOV 1, 2025 (11 DAYS)
├─ GATE 1 (13:00 UTC): Go/no-go for rollout
└─ Decision: Proceed to GATE 2 or hold

NOV 2, 2025 (12 DAYS)
├─ GATE 2 (16:00 UTC): Full rollout begins
├─ Ramp: 5K → 50K learners (hourly stages)
└─ Intensive monitoring: 15-min polls

NOV 4 – NOV 15, 2025
├─ GATE 2 Review: Rollout stabilization
├─ GATE 3: Production baseline confirmed
└─ Monitoring: Close (30-min polls)

NOV 30, 2025
├─ GATE 4: Sprint 1 complete (500K learners)
└─ Decision: Proceed to planning sprint or extend

DEC 1–27, 2025
└─ Phase 4 planning sprint (multi-region arch, load tests, runbooks)

DEC 27, 2025
├─ GATE 5: Planning ready
└─ Decision: Proceed to Sprint 2 (Jan 2) or delay

JAN 2 – FEB 28, 2026
├─ GATE 6 (Jan 31): Sprint 1 complete (2.5M learners)
├─ GATE 7 (Feb 28): **IPO READINESS GATE** (5M learners)
└─ Decision: Proceed to Phase 5 or Phase 4.5 extension

MAR 1 – AUG 31, 2026
└─ Phase 5: Compliance, 10-region expansion, Series B, IPO prep

AUG 31, 2026
├─ GATE 11: IPO READY (10M learners, $300M+ ARR)
└─ Decision: Proceed to S-1 filing

OCT 20, 2026 (TARGET)
└─ 🎯 IPO LAUNCH (TLAI/TOOLO ticker, $2–3B valuation)
```

---

## 📊 Metrics Dashboard

**Real-time monitoring**: `http://127.0.0.1:3000` (Control Room)

**Key endpoints**:
- `GET /api/v1/training/overview` – Learner scale, domain mastery
- `GET /api/v1/auto-coach/status` – Coach activity, meta triggers
- `GET /api/v1/system/processes` – All 11 services health
- `GET /api/v1/reports/status` – Error rate, latency, uptime trends

---

## 🎯 Success Definitions

### Phase 4 Success (Feb 28, 2026)
- ✅ 5M+ learners
- ✅ 8 regions
- ✅ 99.999% uptime
- ✅ <0.05% error rate
- ✅ $150–180M → $300M+ path confirmed
- ✅ Board approval: Proceed to Phase 5

### Phase 5 Success (Aug 31, 2026)
- ✅ 10M+ learners
- ✅ 15 regions
- ✅ $300M+ annual revenue
- ✅ SOC 2 Type II + GDPR certified
- ✅ Series B funded ($150–200M)
- ✅ S-1 filing ready
- ✅ Board approval: Proceed to IPO

### IPO Success (Oct 20, 2026)
- ✅ S-1 filed (Aug 31)
- ✅ Roadshow completed (Oct 1–15)
- ✅ Pricing meeting (Oct 15)
- ✅ IPO launch (Oct 20, target)
- ✅ Market cap: $2–3B

---

## 🔗 Cross-References

### By Stakeholder Role

**VP Engineering**:
1. `PHASE-4-EXECUTION-PLAN.md` (gates 1, 4, 5, 6, 7 decisions)
2. `EXECUTION-GATES-FRAMEWORK.md` (authorities, escalation)
3. `servers/coach-server.js` (when debugging)

**Product Lead**:
1. `COACH-SERVER-INTEGRATION-COMPLETE.md` (overview)
2. `PHASE-4-EXECUTION-PLAN.md` (revenue targets, metrics)
3. `PHASE-5-ROADMAP.md` (mobile native, advanced analytics)

**CFO**:
1. `PHASE-4-EXECUTION-PLAN.md` (GATE 4, 5, 7 financial decisions)
2. `PHASE-5-ROADMAP.md` (Series B, IPO valuation, unit economics)
3. `EXECUTION-GATES-FRAMEWORK.md` (GATE 10, 11 CFO role)

**On-Call Engineer**:
1. `EXECUTION-GATES-FRAMEWORK.md` (escalation, on-call rotation)
2. `PHASE-4-EXECUTION-PLAN.md` (alert thresholds, rollback procedures)
3. `servers/coach-server.js` (restart procedures)

**Board Member**:
1. `COACH-SERVER-INTEGRATION-COMPLETE.md` (executive summary)
2. `PHASE-4-EXECUTION-PLAN.md` (gates 4, 7 strategic decisions)
3. `PHASE-5-ROADMAP.md` (long-term strategy, IPO readiness)

---

## 📝 Document Summary Table

| Document | Size | Read Time | Audience | Purpose |
|----------|------|-----------|----------|---------|
| `COACH-SERVER-INTEGRATION-COMPLETE.md` | 40 KB | 15 min | All | Executive summary, verification checklist |
| `PHASE-4-EXECUTION-PLAN.md` | 65 KB | 40 min | Eng, Product, CFO | Detailed gates 1–7, configs, escalation |
| `PHASE-5-ROADMAP.md` | 70 KB | 50 min | All | 6-month roadmap, compliance, IPO |
| `EXECUTION-GATES-FRAMEWORK.md` | 45 KB | 30 min | Eng, Leadership | Gate system, authorities, on-call |
| `PHASES-3-5-NAVIGATION-MAP.md` | 15 KB | 10 min | All | This file – navigation guide |

---

**Last Updated**: Oct 20, 2025  
**Status**: All documents finalized, Phase 4 ready to launch Nov 1  
**Next Review**: Oct 30, 2025 (Gate 1 pre-flight)
