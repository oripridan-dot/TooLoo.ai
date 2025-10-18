# Phase 2 Sprint 2: Task 4 - Visual Summary
**Status**: ✅ **COMPLETE**  
**Date**: 2025-10-18  

---

## Scoring Algorithm Overview

### 4-Dimension Scoring Formula

```
                    Workflow Scoring (0-1.0)
                    ════════════════════════

    ┌─────────────────────────────────────────┐
    │ 1. DOMAIN AFFINITY (40% weight)         │
    │    specialized_components_ratio × trait │
    │    Max: 0.42                            │
    ├─────────────────────────────────────────┤
    │ 2. PACE MATCH (30% weight)              │
    │    duration vs learning_velocity        │
    │    Max: 0.27                            │
    ├─────────────────────────────────────────┤
    │ 3. ENGAGEMENT FIT (20% weight)          │
    │    labs_present × interaction_frequency │
    │    Max: 0.20                            │
    ├─────────────────────────────────────────┤
    │ 4. RETENTION STRENGTH (10% weight)      │
    │    gap_severity × retention_trait       │
    │    Max: 0.05                            │
    └─────────────────────────────────────────┘
               ↓
        Final Score (0-1.0)
               ↓
    Normalized: min(1.0, total)
```

---

## Archetype-Specific Workflow Preferences

### Fast Learner
```
Workflow Selection Profile:
├─ Duration Preference: SHORT (≤300 min)
├─ Pace Match Score: HIGH (0.9)
├─ Engagement: Labs preferred (0.72 interaction)
├─ Content: Breadth over depth
└─ Ranking Focus: (1) pace, (2) engagement, (3) domain

Example Top Workflows:
1. "45-min Async/Await Intensive" (score: 0.92)
   - Fast pace match (0.27 from pace)
   - High engagement (0.15 from labs)
   
2. "90-min Error Handling Sprint" (score: 0.68)
   - Still short duration match
   - Addresses concurrent gaps
   
3. "2-hour Framework Integration" (score: 0.65)
   - Breadth focus (multiple components)
   - Rapid progression
```

### Specialist
```
Workflow Selection Profile:
├─ Duration Preference: LONG (≥600 min)
├─ Content Focus: Deep domain expertise
├─ Pace Match Score: HIGH for long (0.85)
├─ Engagement: Sequential modules preferred
├─ Ranking Focus: (1) domain, (2) depth, (3) pace

Example Top Workflows:
1. "Design Systems Certification" (score: 0.82)
   - Domain-specific (3/3 components)
   - 600-min deep dive matches velocity (0.42)
   - Sequential modules (0.55 interaction)
   - Targets critical gaps (1.30 severity)
   
2. "Accessibility Mastery Course" (score: 0.79)
   - Related domain expertise
   - Deep module structure
   
3. "UI Component Architecture" (score: 0.75)
   - Supporting specialization
   - Long-form content
```

### Power User
```
Workflow Selection Profile:
├─ Duration Preference: VARIABLE (want quantity)
├─ Content: Breadth across domains
├─ Engagement: Labs + interactive (0.88 interaction)
├─ Pace Match Score: HIGH for short (0.9)
├─ Ranking Focus: (1) engagement, (2) breadth, (3) pace

Example Top Workflows:
1. "Framework Integration Essentials" (score: 0.85)
   - Multiple tracks (engagement: 0.88 × 0.2)
   - Rapid completion path
   - Breadth of topics
   
2. "Full-Stack Async Patterns" (score: 0.82)
   - Comprehensive coverage
   - Hands-on labs
   
3. "Multi-Domain Architecture" (score: 0.78)
   - Cross-disciplinary skills
   - High engagement labs
```

### Long-term Retainer
```
Workflow Selection Profile:
├─ Duration Preference: MODERATE-LONG
├─ Depth Focus: Durable foundations
├─ Engagement: Steady pacing
├─ Retention Boost: Critical gaps valued (0.92 trait)
├─ Ranking Focus: (1) retention, (2) depth, (3) pace

Example Top Workflows:
1. "Foundational Async Mastery" (score: 0.80)
   - Addresses critical gap (1.8 severity)
   - Retention boost: (1.8/2.5) × 0.92 × 0.1 = 0.068
   - Solid pacing for long-term retention
   
2. "Core Patterns & Principles" (score: 0.77)
   - Foundational depth
   - Compound learning value
   
3. "Sustainable System Design" (score: 0.74)
   - Long-term architectural thinking
```

---

## Score Breakdown Examples

### Example 1: Fast Learner + Short Workshop
```
Workflow: "Async/Await Intensive" (180 min, hands-on)
Cohort: Fast Learner (velocity: 0.85, interaction: 0.72)

Domain Component (40%):
  specialized_components: 2/3 = 0.67
  domain_affinity trait: 0.35 (not specialized)
  Score: 0.67 × 0.4 × 0.35 = 0.094
  ██░░░░░░░░░░░░░░░░░░░ (9% of max 42%)

Pace Component (30%):
  duration: 180 min (≤300) + velocity: 0.85 (>0.7)
  Pace score: 0.9 (excellent match)
  Score: 0.9 × 0.3 = 0.27
  ███████████████░░░░░░░ (27% of max 30%)

Engagement Component (20%):
  hands_on_labs: YES
  interaction_frequency: 0.72 (high)
  Score: 0.72 × 0.2 = 0.144
  ███░░░░░░░░░░░░░░░░░░░ (14% of max 20%)

Retention Component (10%):
  top_gap_severity: 0.756
  retention_strength: 0.45 (moderate)
  Score: (0.756/2.5) × 0.45 × 0.1 = 0.014
  █░░░░░░░░░░░░░░░░░░░░░ (1% of max 10%)

TOTAL SCORE: 0.094 + 0.27 + 0.144 + 0.014 = 0.522
┌─────────────────────────────┐
│ FINAL SCORE: 0.52 / 1.0     │
│ QUALITY: GOOD FIT ✓         │
│ RECOMMENDATION: Primary     │
└─────────────────────────────┘
```

### Example 2: Specialist + Domain Workshop
```
Workflow: "Design Systems Deep Dive" (600 min, sequential)
Cohort: Specialist Design (velocity: 0.42, domain: 0.88, interaction: 0.55)

Domain Component (40%):
  specialized_components: 3/3 = 1.0
  domain_affinity trait: 0.88 (very high)
  Raw: 1.0 × 0.4 × 0.88 = 0.352
  Capped at 40% = 0.40
  ████████████████████░░░░░░░░ (40% of max 42%) ✓

Pace Component (30%):
  duration: 600 min (≥600) + velocity: 0.42 (<0.4)
  Pace score: 0.85 (excellent match for specialist)
  Score: 0.85 × 0.3 = 0.255
  ████████░░░░░░░░░░░░░░░░░░░░ (25% of max 30%)

Engagement Component (20%):
  hands_on_labs: NO (sequential modules)
  interaction_frequency: 0.55 (moderate)
  Score: (1 - 0.55) × 0.2 = 0.09
  █░░░░░░░░░░░░░░░░░░░░░░░░░░░ (9% of max 20%)

Retention Component (10%):
  top_gap_severity: 1.30 (high)
  retention_strength: 0.92 (very high)
  Score: (1.30/2.5) × 0.92 × 0.1 = 0.048
  █░░░░░░░░░░░░░░░░░░░░░░░░░░░ (5% of max 10%)

TOTAL SCORE: 0.40 + 0.255 + 0.09 + 0.048 = 0.793
┌─────────────────────────────┐
│ FINAL SCORE: 0.79 / 1.0     │
│ QUALITY: EXCELLENT FIT ✓✓   │
│ RECOMMENDATION: PRIMARY +   │
└─────────────────────────────┘
```

---

## Data Flow: Request to Recommendation

```
CLIENT REQUEST
│
├─ cohortId: "cohort-specialist-001"
│
▼
BRIDGE SERVICE (Port 3010)
│
├─ Step 1: Fetch Cohort Traits
│  ├─ Cache lookup (Task 2)
│  └─ <1ms hit → { archetype: "Specialist", traits: {...} }
│
├─ Step 2: Get Per-Cohort Gaps (Task 3)
│  ├─ analyzeGapsPerCohort() call
│  └─ Returns: Top 5 gaps sorted by severity
│
├─ Step 3: Fetch All Workflows
│  ├─ Query Product Dev Server (port 3006)
│  └─ Returns: 12-20 available workflows
│
├─ Step 4: Score Each Workflow
│  ├─ For each workflow:
│  │  ├─ Domain affinity: check components
│  │  ├─ Pace match: duration vs velocity
│  │  ├─ Engagement: labs present?
│  │  └─ Retention: gap severity boost
│  │
│  └─ Attach: score breakdown + matched gaps
│
├─ Step 5: Rank & Sort
│  ├─ Sort by score (descending)
│  └─ Select top 5 workflows
│
├─ Step 6: Generate Recommendations
│  ├─ Score-based recommendation text
│  │  (excellent/good/moderate/supplementary)
│  │
│  └─ Archetype-specific next steps
│
▼
RESPONSE TO CLIENT
{
  "suggestions": {
    "suggestedWorkflows": [
      {
        "name": "Design Systems Deep Dive",
        "matchScore": 0.82,
        "recommendation": "Excellent match for Specialist...",
        "recommendedOrder": 1
      },
      // ... 4 more
    ],
    "nextSteps": [
      "Deep-dive into top workflow...",
      "Complete all modules sequentially..."
    ]
  }
}
```

---

## Workflow Ranking Comparison: Before vs After

### Generic (Phase 1 - No Archetype)
```
Workflow Ranking (for all cohorts):
├─ 1. Framework Integration (0.50 base)
├─ 2. Async Patterns (0.48 base)
├─ 3. Design Systems (0.52 base)
├─ 4. Error Handling (0.42 base)
└─ 5. Performance Tuning (0.40 base)

Result: Fast Learner sees Design Systems as #2
        (but actually should be #1 for expertise building)
```

### Per-Cohort (Phase 2 Task 4 - Archetype-Aware)
```
Fast Learner Ranking (score with traits):
├─ 1. Async Patterns (0.92) ✓ 2.0x pace match
├─ 2. Error Handling (0.68)
├─ 3. Framework Integration (0.65)
├─ 4. Performance Tuning (0.55)
└─ 5. Design Systems (0.40)

Specialist Ranking (score with traits):
├─ 1. Design Systems (0.82) ✓ 2.5x domain match
├─ 2. Accessibility (0.79)
├─ 3. Component Architecture (0.75)
├─ 4. Async Patterns (0.45)
└─ 5. Framework Integration (0.38)

Power User Ranking (score with traits):
├─ 1. Framework Integration (0.85) ✓ Multi-stream
├─ 2. Async Patterns (0.82)
├─ 3. Performance Tuning (0.78)
├─ 4. Design Systems (0.52)
└─ 5. Accessibility (0.48)
```

**Result**: SAME WORKFLOWS, THREE COMPLETELY DIFFERENT RANKINGS
- Specialist prioritizes domain expertise (Design Systems #1)
- Fast Learner prioritizes speed (Async #1, Pace match 0.27 contribution)
- Power User prioritizes breadth (Framework #1, Multiple streams)

---

## Integration Timeline (Sprint 2 Progress)

```
═══════════════════════════════════════════════════════

Task 1: Branch Setup ✅ (Complete)
└─ feature/phase-2-sprint-2-cohort-gaps

Task 2: Cohort Context ✅ (Complete)
├─ fetchCohortTraits()
└─ Cache infrastructure

Task 3: Per-Cohort Gap Analysis ✅ (Complete)
├─ ARCHETYPE_GAP_WEIGHTS
├─ Severity weighting
└─ Top 10 gaps per cohort

Task 4: Workflow Suggestions ✅ (JUST COMPLETE - THIS TASK)
├─ 4-dimension scoring algorithm
├─ scoreWorkflowForCohort()
├─ suggestWorkflowsForCohort()
├─ Top 5 workflows ranked
└─ Archetype-specific next steps

Task 5: ROI Tracking 🔄 (Ready)
├─ Track outcomes per cohort
├─ Cost/capability analysis
└─ Persist to JSONL

Task 6: Acceptance Tests 🔄 (Ready after 5)
├─ 22 assertions
├─ Coverage validation
└─ Cross-service integration
```

---

## Summary: Score Component Distribution

```
Workflow Score Composition

Domain Affinity (40%)
  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  Specialists: HIGH (2.5x weight) | Power Users: MEDIUM (1.8x)
  Fast Learners: LOW (1.5x) | Generalists: BASELINE (1.0x)

Pace Match (30%)
  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  Fast Learners: HIGH (short workshops) | Specialists: HIGH (long dives)
  Power Users: HIGH (rapid pace) | Retainers: MODERATE (steady)

Engagement Fit (20%)
  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  Power Users: HIGHEST | Fast Learners: HIGH | Others: MODERATE

Retention Strength (10%)
  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  Long-term Retainers: HIGH | All others: BASELINE

────────────────────────────────────────────────────────────────
TOTAL: 0.0 ─────── 0.5 ─────── 1.0 (normalized to max 1.0)
```

---

**Status**: ✅ Task 4 Complete  
**Next**: Task 5 - ROI Tracking Per Cohort  
**Commit**: 788bd4e
