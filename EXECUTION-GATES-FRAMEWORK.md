# Execution Gates Framework: Phases 3–5
**Document**: Decision criteria, escalation paths, and rollback procedures  
**Valid**: Nov 1, 2025 – Aug 31, 2026  
**Owner**: VP Engineering + Command Team  
**Audience**: Leadership, on-call engineers, incident response team  

---

## 🎯 Gate System Overview

Every major phase includes **decision gates** at key milestones. Each gate has:
- **Success Criteria** (quantified, unambiguous)
- **Go/No-Go Logic** (pass → proceed; fail → hold/rollback)
- **Escalation Path** (who decides, timeline for decision)
- **Rollback Procedure** (if needed)

---

## PHASE 3: COACH-SERVER INTEGRATION (✅ COMPLETE AS OF OCT 20)

### Deliverables (All ✅ Complete)
- ✅ Auto-Coach engine running on port 3004
- ✅ Fast-lane mode active (weight=2, interval=600ms)
- ✅ Meta-learning trigger: <1% delay
- ✅ Boost endpoint tested (3–20 rounds per call)
- ✅ Orchestrator pre-arm: training → meta → coach flow confirmed
- ✅ Control-room UI: Coach status + boost + fast-lane toggles working

**Gate Status**: ✅ **PASSED** (Oct 20, 2025)  
**Decision**: Proceed to Phase 4 (Nov 1 Gate 1)

---

## PHASE 4: RAMP & SCALE-OUT (Nov 1 – Feb 28, 2025)

### GATE 1: Nov 1 @ 13:00–18:00 UTC (Pre-Ramp Go/No-Go)

**Purpose**: Final smoke test before ramping from 5K → 50K learners  
**Decision Authority**: VP Engineering (final call)  
**Decision Window**: 5 hours (13:00 → 18:00 UTC)

#### Pre-Flight Checklist (Must Pass ALL)
```
Coach-Server Health:
  ☐ /health endpoint responds 200 with uptime
  ☐ Auto-coach status active=true
  ☐ Meta engine initialized (no stalls)
  ☐ Fast-lane enabled, weight >= 1

Infrastructure:
  ☐ Web server proxy responding
  ☐ Training server running (3 rounds in < 10 sec)
  ☐ Reports server recording metrics (no data loss)
  ☐ Budget server provider status: all green

Database & State:
  ☐ User state persistence working (restore after restart)
  ☐ Training rounds recorded in historical logs
  ☐ No stale locks or zombie processes

Monitoring:
  ☐ Error rate telemetry flowing to dashboards
  ☐ Alerting system armed (no missing recipients)
  ☐ Incident channel verified (Slack/PagerDuty working)
  ☐ Backup procedures tested (dry run successful)
```

#### Success Criteria (2-Hour Load Test: 5K → 10K learners)

| Metric | Target | Pass Threshold | Current (Canary) |
|--------|--------|-----------------|------------------|
| Error Rate | <0.5% | ✅ if <0.6% | 0.079% |
| Latency (p95) | <200ms | ✅ if <250ms | 45ms |
| Latency (p99) | <500ms | ✅ if <600ms | 120ms |
| Uptime | >99.95% | ✅ if >99.90% | 99.97% |
| Coach Throughput | >100 rounds/min | ✅ if >90 rounds/min | 180 rounds/min |
| Training Round Time | <5 sec | ✅ if <7 sec | 2.1 sec |
| Meta Trigger Delay | <100ms | ✅ if <150ms | 45ms |
| Zero Crashes | Yes | ✅ if 0 critical restarts | — |

#### Decision Logic

```
IF all_metrics_pass THEN
  DECISION = "GO → Proceed to Gate 2 (Nov 2 @ 16:00 UTC)"
  ACTION = Email go-ahead to command team
  
ELSE IF error_rate OR latency FAILED THEN
  IF fix_requires < 2 hours THEN
    ACTION = Apply hotfix, re-test subset (15 min)
  ELSE
    DECISION = "HOLD 1 week → Reassess Nov 8"
    REASON = "Not confident in scaling 5x within 24h"
  END
  
ELSE IF coach_throughput FAILED THEN
  DECISION = "HOLD 48 hours"
  ACTION = Investigate fast-lane timers, restart with higher intervals
  RETEST = Nov 3 @ 13:00 UTC
  
ELSE IF uptime FAILED THEN
  DECISION = "NO-GO → Extended canary, hold ramp"
  ACTION = Escalate to infrastructure lead, debug P0 alert
  REASSESS = Nov 8 @ 18:00 UTC
END
```

#### Escalation Paths

| Failure | Owner | Action | Duration | Retest |
|---------|-------|--------|----------|--------|
| **Error >0.5%** | Training Lead | 1. Audit domain selection 2. Check training round logic 3. Reduce aggressive mode | 2 hours | Yes, 15-min window |
| **Latency >250ms** | Infrastructure Lead | 1. Check provider latency 2. Monitor CPU/memory 3. Profile training round | 1.5 hours | Yes, 15-min |
| **Coach Stall** | Coach Owner | 1. Restart fast-lane 2. Check meta-learning queue 3. Inspect logs for deadlocks | 1 hour | Yes, 10-min |
| **Uptime <99.90%** | Infrastructure Lead | Escalate to VP Eng → investigate P0 alert | 4 hours | Postpone gate, retry Nov 8 |

#### Rollback Procedure (If Needed)
**Level 0** (if gate fails, before scaling):
1. Stop new learner registrations
2. Hold current scale at 5K canary
3. Return to Oct 20 controller settings
4. Investigation period: 48 hours → 1 week

**Timeline**: <5 minutes (simple revert)

---

### GATE 2: Nov 2 @ 16:00 UTC (FULL ROLLOUT BEGINS)

**Purpose**: Launch full ramp with intensive monitoring  
**Duration**: 40 hours (Nov 2 @ 16:00 → Nov 4 @ 08:00 UTC)  
**Control**: Auto-advance learner ramp every 1 hour if metrics green

#### Ramp Schedule
| Time | Phase | Learners | Status | Alert Threshold |
|------|-------|----------|--------|-----------------|
| Nov 2 @ 16:00 | Start | 5K | Baseline | Error <1% |
| Nov 2 @ 17:00 | Ramp 1 | 10K | +100% | Error <0.8% |
| Nov 2 @ 18:00 | Ramp 2 | 25K | +150% | Error <0.5% |
| Nov 2 @ 19:00 | Ramp 3 | 50K | +100% | Error <0.2% |
| Nov 2 @ 20:00 | Sustain | 50K | Hold 20h | Error <0.1% |

#### Success Criteria (MUST HOLD FOR 20 HOURS)

| Metric | Target | Nov 2–3 |
|--------|--------|---------|
| Error Rate | <0.1% | All stages |
| Latency (p95) | <50ms | <100ms acceptable |
| Uptime | >99.99% | No outages >5 min |
| Revenue Signal | +5.8% | Confirmed by reports-server |
| Auto-Coach | <1% delay, >90% coverage | No meta trigger misses |

#### Intensive Monitoring Protocol (Nov 2–4)

**Poll Frequency**: Every 15 minutes to incident channel

**Metrics Dashboard**:
```json
{
  "timestamp": "2025-11-02T16:15:00Z",
  "learners": 10234,
  "error_rate": 0.084,
  "latency_p95": 47,
  "uptime": 99.994,
  "coach_status": {
    "throughput_rounds_per_min": 215,
    "meta_trigger_delay_ms": 42,
    "fast_lane_enabled": true
  },
  "alert_level": "normal",
  "recommendation": "continue_ramp"
}
```

**Alert Triggers**:
- Error >0.15% → Yellow alert, notify training lead
- Error >0.25% → Red alert, consider throttle
- Latency (p95) >150ms → Yellow, notify infra lead
- Uptime <99.98% → Red, possible rollback
- Revenue signal not increasing → Yellow, check reports-server

#### Decision at Nov 4 @ 08:00 UTC (Rollout Review)

**IF metrics green for full 40h → PASS**:
- ✅ Move to close monitoring (30-min polls)
- ✅ Declare rollout successful
- ✅ Proceed to Nov 15 gate (production baseline)

**IF yellow alerts but contained → CONDITIONAL PASS**:
- ✅ Continue with targeted fixes
- ✅ Escalate to optimization track
- ✅ Maintain intensive monitoring 48h more

**IF red alert or repeated failures → FAIL**:
- ❌ Evaluate throttle (50K → 25K learners, hold)
- ❌ OR rollback to Nov 1 state
- ❌ Reassess rollout in 72 hours

#### Rollback Procedure (Level 1–2)

**Level 1: Throttle Ramp** (5 min):
```bash
# Hold learner scale at last stable point
curl -X POST http://127.0.0.1:3000/api/v1/system/scale \
  -H 'Content-Type: application/json' \
  -d '{"learners": 25000, "hold": true}'

# Notification
echo "🚨 Rollout throttled to 25K learners (was 50K)" > /incident-channel
```

**Level 2: Revert to Nov 1 Canary** (15 min):
```bash
# Restore user state from Nov 1 snapshot
aws s3 cp s3://tooloo-backups/nov-1-canary-state.tgz /tmp/ && \
tar xzf /tmp/nov-1-canary-state.tgz -C /data && \
npm run restart:all

echo "🚨 Rollback complete → Nov 1 canary state restored" > /incident-channel
```

---

### GATE 3: Nov 15 @ 23:59 UTC (Production Baseline Confirmed)

**Purpose**: Validate stability for 2 consecutive weeks  
**Criteria**: All metrics stable, no P0 escalations post-Nov 4

#### Stability Checklist
```
✓ Error rate consistently <0.1% (no spikes >0.15%)
✓ Latency (p95) consistently <50ms
✓ Uptime >99.99% (no outages, only brief blips <2 min)
✓ Zero P0/P1 incidents Nov 4–15
✓ Revenue growth linear (+5.8% baseline confirmed)
✓ Coach throughput stable (200 rounds/min ±10%)
```

#### Decision
- **PASS**: Transition to close monitoring (30-min polls) + standard SLA
- **FAIL**: Extend close monitoring 1 more week (reassess Nov 22)

---

### GATE 4: Nov 30 @ 23:59 UTC (Sprint 1 Complete)

**Purpose**: Confirm sprint 1 delivers 500K learners, 99.99% uptime, +5.8% ROI  
**Owner**: VP Engineering + Product Lead  
**Decision Deadline**: Nov 30 @ 23:59 UTC (hard stop)

#### Delivery Checklist
| Deliverable | Target | Actual | Status |
|-------------|--------|--------|--------|
| Learners | 500K | __ | __ |
| Regions | 3 | __ | __ |
| Uptime | >99.99% | __ | __ |
| ROI | +5.8% | __ | __ |
| Error Rate | <0.1% | __ | __ |
| Coach Throughput | >200 rpm | __ | __ |
| P0 Incidents (Nov 2–30) | 0 | __ | __ |

#### Go/No-Go
```
IF ALL targets met THEN
  DECISION = "GO → Phase 4 planning sprint Dec 1"
  ACTION = Email board, schedule Dec 1 kickoff
  
ELSE IF deliverables delayed but trajectory good THEN
  DECISION = "CONDITIONAL GO"
  ACTION = Extend sprint 1 to Dec 7, delay Phase 4 planning start
  
ELSE IF major miss THEN
  DECISION = "NO-GO → Sprint 1 extension 2 weeks"
  ACTION = Root cause analysis, replan Phase 4 for Jan 15 start
END
```

---

### GATE 5: Dec 27 @ 23:59 UTC (Phase 4 Planning Ready)

**Purpose**: Verify multi-region architecture, load tests, team, runbooks ready for Jan 2 sprint  
**Owner**: VP Engineering  
**Deliverables** (ALL REQUIRED):

1. **Multi-Region Architecture Document** (`multi-region-deployment-v1.md`)
   - 8-region topology (na-w, na-e, eu-c, eu-w, apac-s, apac-e, latam, mena)
   - Failover policies (RTO <1h, RPO <15 min)
   - Latency budgets per region
   - Load balancer strategy

2. **Load Test Results** (`phase-4-load-test-report.md`)
   - 1M learner test: PASS ✓ (error <0.1%, latency <100ms)
   - 2.5M learner test: PASS ✓ (bottleneck analysis complete)
   - 5M learner stress test: PASS ✓ (scaling profile identified)

3. **Team Onboarding & Runbooks** (`phase-4-runbooks.md`)
   - 20 FTE hired + onboarded (regional leads assigned)
   - Incident response procedures (P0/P1/P2 escalation)
   - Disaster recovery tested (dry run successful)
   - On-call rotation ready (24/7 Nov 1 – Dec 31)

4. **Board Approval**: VP Eng + CFO sign-off on Jan 2 readiness

#### Decision
- **READY**: Proceed to Phase 4 Sprint 1 (Jan 2 @ 09:00 UTC)
- **NOT READY**: Delay Jan 2 start → Jan 9 or Jan 15 (notify board)

---

### GATE 6: Jan 31 @ 23:59 UTC (Phase 4 Sprint 1 Complete)

**Purpose**: Validate 2.5M learners across 5 regions (250% scale from Nov baseline)  
**Criteria**: All metrics pass phase 4 sprint 1 targets

| Metric | Target | Status |
|--------|--------|--------|
| Learners | 2.5M | __ |
| Regions | 5 | __ |
| Error Rate | <0.1% | __ |
| Uptime | >99.99% | __ |
| Cost per Learner | <$0.05 | __ |
| Coach Throughput | >400 rpm | __ |

**Decision**:
- **PASS**: Jan 31 → Feb 1 Sprint 2 kickoff (5M+ target)
- **FAIL**: Extend Sprint 1 to Feb 7, reassess Feb 1

---

### GATE 7: Feb 28 @ 23:59 UTC (Phase 4 Complete - IPO Readiness Gate)

**Purpose**: CRITICAL gate – validates 5M+ learners, 99.999% uptime, $150–180M annual revenue  
**Decision Authority**: CEO + VP Engineering (joint)  
**Consequences**: Determines if Phase 5 proceeds (IPO planning) or Phase 4.5 extension planned

#### IPO Readiness Scorecard

| Category | Metric | Target | Status | Owner |
|----------|--------|--------|--------|-------|
| **Scale** | Learners | 5M+ | __ | Product Lead |
| | Regions | 8 | __ | Infra Lead |
| | ARR | $150–180M | __ | CFO |
| **Reliability** | Uptime | 99.999% | __ | Infra Lead |
| | Error Rate | <0.05% | __ | Training Lead |
| | Latency (p95) | <100ms | __ | Infra Lead |
| **Financial** | Gross Margin | >70% | __ | CFO |
| | LTV:CAC | >10x | __ | Finance Lead |
| | Retention (12m) | >85% | __ | Product Lead |
| **Operations** | P0 Incidents | 0 (Feb) | __ | Ops Lead |
| | Disaster Recovery | Tested | __ | Infra Lead |
| | Team Readiness | 20 FTE | __ | HR Lead |
| **Compliance** | SOC 2 Type II | Queued (Mar) | __ | Legal |
| | Security Audit | Pass | __ | Security Lead |

#### Go/No-Go Decision

```
IF scale (5M+, 8 regions) AND reliability (99.999%, <0.05% error) THEN
  DECISION = "GO → Phase 5 (IPO Readiness Roadmap)"
  ACTION = 
    1. Announce to board → Phase 5 planning sprint (Mar 1)
    2. Begin Series B fundraising prep
    3. Schedule compliance audits (SOC 2, GDPR)
    4. Notify leadership: S-1 filing target Aug 31, 2025
  
ELSE IF scale partial (2–4M) OR reliability partial (99.99%, >0.1% error) THEN
  DECISION = "CONDITIONAL GO"
  ACTION = 
    1. Plan Phase 4.5 (2-week sprint, Mar 1–15)
    2. Target: 5M by mid-Mar, then Phase 5
    3. Compress Phase 5 timeline (May → Aug S-1 filing)
  
ELSE IF major miss THEN
  DECISION = "HOLD → Phase 4 extension (Mar–Apr)"
  ACTION = 
    1. Root cause analysis (Feb 28 – Mar 7)
    2. Replan: 3M learners by Apr 30, 5M by Jun 30
    3. IPO timeline shifts: S-1 filing Nov 2025, IPO early 2026
END
```

#### Rollback Procedure (Extreme Case Only)

**Level 3: Emergency Pause** (if catastrophic failure):
```bash
# Pause all new learner onboarding
curl -X POST http://127.0.0.1:3000/api/v1/system/pause-onboarding

# Hold at stable scale (e.g., 3M learners)
curl -X POST http://127.0.0.1:3000/api/v1/system/scale \
  -d '{"learners": 3000000, "hold": true}'

# Incident escalation
echo "🚨 PHASE 4 ESCALATION: System paused at 3M learners" | \
  notify-ceo notify-board notify-series-b-investors
```

---

## PHASE 5: IPO READINESS (Mar 1 – Aug 31, 2025)

### GATE 8: Mar 31 @ 23:59 UTC (Compliance Ready)

**Purpose**: SOC 2 Type II, GDPR, FERPA certifications completed  

#### Certification Checklist
- ✅ SOC 2 Type II audit complete (big 4 auditor signed off)
- ✅ GDPR implementation audited (DPA/DSA in place, all regions)
- ✅ FERPA compliance statement (US ed-tech partnerships ready)
- ✅ Regional regulations (Brazil LGPD, India DPDP, etc.)

**Decision**: 
- **READY**: Proceed with Apr regional expansion
- **DELAYED**: Extend 1 week, impact regional launch (Apr 7 start)

---

### GATE 9: Apr 30 @ 23:59 UTC (10-Region Expansion Complete)

**Purpose**: Validate 10 new regions + 7M learners operational  

| Region | Learners | Uptime | Status |
|--------|----------|--------|--------|
| latam-br | 800K | >99.99% | __ |
| latam-mx | 500K | >99.99% | __ |
| af-ng | 600K | >99.99% | __ |
| af-ke | 400K | >99.99% | __ |
| mena-ae | 500K | >99.99% | __ |
| mena-sa | 400K | >99.99% | __ |
| sa-in | 2M | >99.99% | __ |
| sa-bd | 300K | >99.99% | __ |
| sea-id | 1.2M | >99.99% | __ |
| sea-ph | 600K | >99.99% | __ |

**Decision**:
- **PASS**: Continue to May Series B fundraising
- **PARTIAL**: Delay 1–2 lagging regions, rest proceed

---

### GATE 10: Jun 30 @ 23:59 UTC (Series B Funded)

**Purpose**: $150–200M Series B closed, acquisitions complete  

**Milestones**:
- ✅ Term sheet signed (by Jun 15)
- ✅ Funding closed (by Jun 30)
- ✅ 1–2 M&A deals closed (FocusFlow + RegionPay)
- ✅ 9M learners confirmed

**Decision**:
- **FUNDED**: Proceed to Phase 5 product sprint (mobile native, advanced analytics)
- **DELAYED**: Renegotiate terms, impact product timeline

---

### GATE 11: Aug 31 @ 23:59 UTC (IPO Ready - S-1 Filing)

**Purpose**: FINAL gate – S-1 filing ready, 10M+ learners, $300M+ ARR confirmed  

#### IPO Readiness Checklist (COMPREHENSIVE)

**Scale & Financials**:
- ✅ 10M+ learners globally
- ✅ $300M+ ARR (audited)
- ✅ $75M+ gross profit
- ✅ 15+ regions operational
- ✅ 50 FTE team

**Compliance & Governance**:
- ✅ SOC 2 Type II certified
- ✅ GDPR, FERPA, LGPD, APPI, DPDP compliant (all major regions)
- ✅ Board of directors (5–7 members, includes independent directors)
- ✅ Audit committee formed
- ✅ CEO/CFO certification process (Sarbanes-Oxley ready)

**Financial Readiness**:
- ✅ 3-year audited financials (Big 4 auditor)
- ✅ 2-year projections (conservative, SEC-friendly)
- ✅ Debt-free balance sheet (or <$50M debt, manageable leverage)
- ✅ Working capital sufficient (6+ months runway)

**Product & Operations**:
- ✅ Mobile native apps launched (iOS + Android)
- ✅ Advanced analytics dashboard (investor-grade reporting)
- ✅ Zero security breaches recorded
- ✅ Disaster recovery tested & validated

**S-1 Filing Preparation**:
- ✅ Securities counsel (Davis Polk, Wachtell Lipton) signed
- ✅ Investor relations consultant hired
- ✅ Company roadshow materials prepared (50–70 investor meetings planned)
- ✅ IPO valuation range ($18–24/share) preliminary estimate

#### Decision (CEO + CFO + Board)

```
IF all 40+ checklist items COMPLETE THEN
  DECISION = "GO → S-1 FILING"
  ACTION = 
    1. File S-1 with SEC (Aug 31 target, confidential submission)
    2. Roadshow begins Oct 1 (30-day window after SEC comments)
    3. IPO pricing Oct 15
    4. IPO date Oct 20, 2025
  
ELSE IF 1–2 critical items delayed THEN
  DECISION = "CONDITIONAL GO"
  ACTION = 
    1. File S-1 with required amendments (Sep 7 extension)
    2. Roadshow begins Oct 5
    3. IPO date pushes to Oct 27
  
ELSE IF major readiness gap THEN
  DECISION = "DELAY → IPO Q1 2026"
  ACTION = 
    1. Continue operations as unicorn (pre-IPO)
    2. Replan compliance/product/financial targets
    3. Revisit S-1 readiness Jan 2026
END
```

---

## 🚨 Cross-Gate Escalation Matrix

### Critical Failure Scenario

**Scenario**: Coach-Server crashes, meta-learning stops, training grinds to halt during Nov 2 rollout

**Escalation Steps**:
1. **t=0 min**: Incident detection (alert fires)
2. **t=1 min**: Coach-server owner restart (attempt 1)
3. **t=2 min**: Notify training lead + infrastructure lead (Slack + PagerDuty)
4. **t=3 min**: If restart fails, escalate to VP Engineering
5. **t=5 min**: If VP Eng can't reach, escalate to CEO (emergency call)
6. **t=10 min**: Decision: rollback vs. fix → execute

**Rollback Criteria** (automatic if not fixed in 10 min):
- Learner scale drops to 25K (hold)
- Revert to Oct 20 controller settings
- Investigation period begins

**Impact on Gates**: 
- If during Gate 2: rollout delayed to Nov 8
- If during Gate 3+: no impact (rollout already passed)

---

## 📞 Command Chain & Authorities

### Decision Authority by Gate

| Gate | VP Eng | CEO | CFO | Board | Final Call |
|------|--------|-----|-----|-------|-----------|
| Gate 1 (Nov 1) | ✅ | Review | — | — | VP Eng |
| Gate 2 (Nov 2) | ✅ | Monitor | — | — | VP Eng |
| Gate 3 (Nov 15) | ✅ | Monitor | — | — | VP Eng |
| Gate 4 (Nov 30) | ✅ | ✅ | Monitor | — | VP Eng + CEO |
| Gate 5 (Dec 27) | ✅ | ✅ | ✅ | ✅ | CEO (with board sign-off) |
| Gate 6 (Jan 31) | ✅ | ✅ | ✅ | Monitor | VP Eng + CEO |
| Gate 7 (Feb 28) | ✅ | ✅ | ✅ | ✅ | CEO + CFO (board approval) |
| Gate 8 (Mar 31) | ✅ | ✅ | Monitor | — | VP Eng + Legal Officer |
| Gate 9 (Apr 30) | ✅ | Monitor | ✅ | — | VP Eng |
| Gate 10 (Jun 30) | Monitor | ✅ | ✅ | ✅ | CEO + CFO (board approval) |
| Gate 11 (Aug 31) | ✅ | ✅ | ✅ | ✅ | CEO (final S-1 go/no-go) |

### On-Call Escalation
- **Level 1**: On-call engineer (first responder, 5-min SLA)
- **Level 2**: Engineering lead (if tier-1 can't fix, 15-min SLA)
- **Level 3**: VP Engineering (if leads can't decide, 30-min SLA)
- **Level 4**: CEO (if loss of >5% learners or >$1M/hour revenue impact)

---

## 📋 Documentation & Handoff

### Phase 4 Completion Artifacts (Due Feb 28)
1. **Final Status Report** (`phase-4-completion-report.md`)
   - Metrics summary (5M learners, 8 regions, 99.999% uptime)
   - Incident log (zero P0s, 2 P1s, 5 P2s)
   - Lessons learned + optimization opportunities

2. **Phase 5 Planning Kickoff** (`phase-5-planning-kickoff.md`)
   - Team assignments (regional leads, compliance officer, CFO)
   - Compliance roadmap (SOC 2, GDPR, etc.)
   - Series B preparation checklist

3. **Board Approval Memo** (`phase-5-board-memo.md`)
   - Recommendation: Proceed to Phase 5 (IPO planning)
   - Risk assessment (regulatory, competitive, operational)
   - 6-month timeline + $150–200M Series B strategy

---

## 🔄 Gate Reopening (If Conditions Change)

Any gate can be **reopened** if:
- External market shock (e.g., economic downturn, regulatory change)
- Competitive threat (new entrant, aggressive pricing)
- Internal incident (security breach, key person departure)

**Reopening Authority**: CEO (with board consultation)  
**Reopening Procedure**:
1. Email to command team: "Gate X reopened due to [reason]"
2. New decision deadline: 72 hours from reopening announcement
3. Possible outcomes: reaffirm decision, modify criteria, or escalate

---

## 📊 Gate Metrics Dashboard (Live Tracking)

**Accessible at**: `http://127.0.0.1:3000/api/v1/system/gates`

```json
{
  "current_phase": "phase-4",
  "active_gate": "gate-1-nov-1",
  "status": "in-progress",
  "metrics": {
    "learners": 234567,
    "error_rate": 0.082,
    "uptime": 99.964,
    "coach_throughput": 187,
    "revenue_signal": 0.051
  },
  "gates_passed": ["gate-3-coach-integration"],
  "gates_pending": ["gate-1-nov-1", "gate-2-nov-2", ...],
  "next_decision": "2025-11-01T18:00:00Z",
  "escalation_level": "normal"
}
```

---

**Document**: `EXECUTION-GATES-FRAMEWORK.md`  
**Version**: 1.0  
**Owner**: VP Engineering  
**Last Updated**: Oct 20, 2025  
**Audience**: Command team, on-call engineers, board
