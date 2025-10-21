# Learning Analytics Architecture (Phase 6C/6D/6E)

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTROL ROOM UI (web-app)                    │
│  Dashboard | Velocity Charts | Badges | Leaderboard | Peer View │
└──────────────────────────┬──────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   POST /record-       GET /dashboard    GET /leaderboard
   milestone           (unified)         (Phase 6E)

┌─────────────────────────────────────────────────────────────────┐
│              ANALYTICS SERVER (Port 3012)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │    LearningAnalyticsService (Unified Integration)        │  │
│  │  ┌─ recordMilestone(userId, domain, mastery)            │  │
│  │  │  ├─► Update Phase 6C (Velocity)                      │  │
│  │  │  ├─► Check Phase 6D (Badges)                         │  │
│  │  │  └─► Update Phase 6E (Leaderboard)                   │  │
│  │  │                                                       │  │
│  │  ├─ getUserDashboard(userId)                            │  │
│  │  │  └─► Combine all three phases                        │  │
│  │  │                                                       │  │
│  │  └─ getPeerAnalysis(userId, domain)                     │  │
│  │     └─► Phase 6E comparison data                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │ delegates to                          │
├─────────────────────────┼─────────────────────────────────────┤
│        Phase 6C          │         Phase 6D          │ Phase 6E │
│  Learning Velocity       │   Achievement Badges      │ Comparative
│  Tracking                │   System                  │ Analytics
│                          │                           │          │
│ ┌──────────────────────┐ │ ┌──────────────────────┐ │┌────────┐│
│ │ VelocityTracker      │ │ │ BadgesSystem         │ ││Compar- ││
│ │                      │ │ │                      │ ││ative   ││
│ │• EMA calculation     │ │ │• 13 tier-based       │ ││Analytics││
│ │• Trend detection     │ │ │  badges              │ ││         ││
│ │• 85% prediction      │ │ │• Auto-eligibility    │ ││• Leaders││
│ │• Confidence bands    │ │ │• Achievement paths   │ ││ board   ││
│ │• Trajectory export   │ │ │• Reward system       │ ││• Peer   ││
│ │                      │ │ │                      │ ││ comp    ││
│ │Methods:              │ │ │Methods:              │ ││• Percentile
│ │• recordMilestone()   │ │ │• awardBadge()        │ ││         ││
│ │• calcVelocity()      │ │ │• checkQual()         │ ││Methods: ││
│ │• predictAchieve()    │ │ │• getProgress()       │ ││• generate
│ │• getVelocityTrend()  │ │ │• getPath()           │ ││ Board() ││
│ │• getMastery()        │ │ │                      │ ││• getPeer ││
│ │  Trajectory()        │ │ │                      │ ││ Compare()││
│ │                      │ │ │                      │ ││         ││
│ └──────────────────────┘ │ └──────────────────────┘ │└────────┘│
│                          │                           │          │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow - Complete Journey

```
STEP 1: Challenge Completion
┌──────────────────────┐
│  User completes      │
│  challenge (score 88)│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  POST /api/v1/analytics/record-milestone │
│  {                                       │
│    userId: 'user-123',                  │
│    domain: 'distributed',                │
│    mastery: 82,                          │
│    metadata: {challengeId, score}       │
│  }                                       │
└──────────┬───────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ LearningAnalyticsService.recordMilestone│
└─────────────────────────────────────────┘
     │                  │                  │
     ▼                  ▼                  ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Phase 6C │    │ Phase 6D │    │ Phase 6E │
    │ Velocity │    │ Badges   │    │ Leaderbd │
    └──────────┘    └──────────┘    └──────────┘
     │                  │                  │
     ├─ Update EMA    ├─ Check if      ├─ Recalc
     │  velocity        qualifies        percentile
     │                  for badges       & rank
     ├─ Calc trend    ├─ Auto-award    └─ Update
     │                  new badges        trends
     └─ Update        └─ Track points
        trajectory

STEP 2: Automatic Analysis
┌──────────────────────────────────────────┐
│ Response with analysis:                  │
│  • New badges: [consensus-intermediate] │
│  • Velocity: 0.52% per day              │
│  • Trend: 📈 accelerating               │
│  • Prediction: 2025-11-01 (12 days)    │
│  • Confidence: 87% (HIGH)               │
└──────────────────────────────────────────┘

STEP 3: User Checks Dashboard
┌──────────────────────────────────┐
│ GET /api/v1/analytics/dashboard │
│ ?userId=user-123                │
└──────────┬───────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ LearningAnalyticsService.getDashboard() │
└─────────────────────────────────────────┘
     │
     ├─────────────┬──────────────┬─────────────┐
     │             │              │             │
     ▼             ▼              ▼             ▼
  ┌────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐
  │Velocity│  │ Badges  │  │Leaderbd  │  │Next Actn │
  ├────────┤  ├─────────┤  ├──────────┤  ├──────────┤
  │Current │  │Earned 3 │  │Rank: 2   │  │Push to  │
  │Mastery:│  │Total 13 │  │Percentile│  │85% (HP) │
  │82%     │  │Points:  │  │75%       │  │         │
  │        │  │125      │  │          │  │Earn     │
  │Velocity│  │         │  │Ahead by: │  │Elite    │
  │0.52%/d │  │Paths:   │  │13%       │  │Learner  │
  │        │  │- Consenus│  │          │  │badge    │
  │Trend:  │  │  Master │  │Top in    │  │         │
  │📈 Acc. │  │- System │  │domain:   │  │Study    │
  │        │  │  Design │  │92%       │  │top      │
  │Target: │  │- Elite  │  │          │  │performer│
  │85%     │  │  Learner│  │Similar   │  │strategies
  │        │  │         │  │learners: │  │         │
  │Days:   │  │Next     │  │3 matched │  │Next     │
  │12      │  │badges:  │  │at 80%    │  │actions  │
  │        │  │Elite    │  │          │  │by       │
  │Conf:   │  │System   │  │          │  │priority │
  │HIGH    │  │Designer │  │          │  │         │
  └────────┘  └─────────┘  └──────────┘  └──────────┘

COMPLETE DASHBOARD RESPONSE:
{
  ok: true,
  userId: 'user-123',
  session: { ... },
  velocity: { domains, predictions, comparativeAnalysis },
  badges: { progress, paths, totalRewards },
  leaderboards: { distributed: {...}, systems: {...} },
  nextActions: [
    { priority: 'high', action: '...', impact: '...' },
    { priority: 'medium', action: '...', impact: '...' }
  ]
}
```

## API Endpoint Map

```
PHASE 6C: VELOCITY TRACKING
├─ GET /api/v1/analytics/velocity
│  └─ Current velocity + EMA + trend + prediction
├─ GET /api/v1/analytics/predict
│  └─ Detailed prediction with confidence bands
├─ GET /api/v1/analytics/trajectory
│  └─ Mastery progression timeline (for charts)
├─ GET /api/v1/analytics/velocity-trend
│  └─ Trend analysis (accelerating/stable/declining)
└─ GET /api/v1/analytics/comparative
   └─ Compare velocity across all domains

PHASE 6D: ACHIEVEMENT BADGES
├─ GET /api/v1/badges
│  └─ User's badges (unlocked + locked)
├─ GET /api/v1/badges/progress
│  └─ Progress + achievement paths
├─ GET /api/v1/badges/paths
│  └─ Detailed achievement paths
├─ POST /api/v1/badges/check
│  └─ Check eligibility & award
└─ GET /api/v1/badges/by-tier
   └─ Filter badges by tier (1, 2, 3)

PHASE 6E: COMPARATIVE ANALYTICS
├─ GET /api/v1/leaderboard
│  └─ Domain leaderboard with ranks + percentiles
├─ GET /api/v1/peer-comparison
│  └─ Peer comparison for specific domain
├─ GET /api/v1/peer-comparison/full
│  └─ Comparison across all domains
└─ GET /api/v1/analytics/insights
   └─ Domain insights + recommendations

UNIFIED INTEGRATION
├─ GET /api/v1/analytics/dashboard
│  └─ Complete dashboard (6C + 6D + 6E)
├─ POST /api/v1/analytics/record-milestone
│  └─ Record milestone (triggers all three phases)
├─ GET /api/v1/analytics/report
│  └─ Generated analytics report
├─ GET /api/v1/analytics/export
│  └─ Export for visualization libraries
└─ GET /api/v1/analytics/system
   └─ System-wide analytics
```

## Module Responsibilities

### Phase 6C: LearningVelocityTracker
```
Input: Mastery milestone (domain, score, timestamp)
  ↓
Process:
  • Record in history
  • Calculate EMA velocity (with temporal decay)
  • Detect trend direction
  • Predict 85% achievement date
  • Generate confidence scores
  ↓
Output:
  • Current velocity (% per day)
  • Trend indicator
  • Days to target
  • Confidence level
  • Visualization data
```

### Phase 6D: BadgesSystem
```
Input: Achievement data (challenge scores, mastery levels, streak days)
  ↓
Process:
  • Check unlock conditions
  • Award badges
  • Update progress
  • Calculate tier distribution
  • Generate achievement paths
  ↓
Output:
  • List of unlocked badges
  • List of locked badges with unlock instructions
  • Achievement paths with completion %
  • Total points & rewards
```

### Phase 6E: ComparativeAnalytics
```
Input: Learner profiles (mastery, velocity, badges)
  ↓
Process:
  • Sort by mastery (primary) + velocity (tie-breaker)
  • Calculate percentiles (p10, p25, p50, p75, p90)
  • Identify similar learners
  • Find top performers
  • Generate recommendations
  ↓
Output:
  • Leaderboard with ranks
  • Percentile position
  • Similar learners list
  • Benchmark comparisons
  • Learning path recommendations
```

## Data Structures

### Milestone Record
```javascript
{
  timestamp: ISO-8601,
  domain: string,
  mastery: number (0-100),
  userId: string,
  metadata: {
    challengeId: string,
    score: number,
    timeSpent: number
  }
}
```

### Velocity Data
```javascript
{
  domain: string,
  velocityPerDay: number,
  trend: string ('📈 accelerating' | '→ steady' | '📉 decelerating'),
  dataPoints: number,
  timespan: {
    start: ISO-8601,
    end: ISO-8601,
    daysSpanned: number
  }
}
```

### Badge Award
```javascript
{
  id: string,
  name: string,
  tier: number (1-3),
  icon: emoji,
  awardedAt: ISO-8601,
  reward: {
    masteryBoost: number,
    points: number,
    mentorStatus: boolean,
    unlockAdvanced: boolean
  }
}
```

### Leaderboard Entry
```javascript
{
  rank: number,
  username: string,
  mastery: number,
  velocity: number,
  badges: number,
  percentile: number,
  trend: emoji,
  momentum: string
}
```

## Caching Strategy

```
Velocity Cache:
  Key: domain
  TTL: Invalidate on new milestone
  Benefit: Repeated velocity queries don't recalculate

Prediction Cache:
  Key: domain-currentMastery-targetMastery
  TTL: 1 hour or invalidate on new milestone
  Benefit: Expensive prediction not recalculated

Leaderboard Cache:
  Key: domain
  TTL: Invalidate on new milestone
  Benefit: Leaderboard generation is O(n log n)
```

## Performance Characteristics

```
Phase 6C - Velocity Tracking:
  recordMilestone(): O(1) - append to array
  calculateVelocityWithEMA(): O(n) - iterate through history
  predictAchievementDate(): O(n) - calculate velocity + stats
  getMasteryTrajectory(): O(n) - sample points

Phase 6D - Badges:
  awardBadge(): O(1) - array append
  checkBadgeQualification(): O(1) - condition check
  getUserBadgeProgress(): O(b) - b = badge count (13)
  getAchievementPath(): O(b) - iterate through paths

Phase 6E - Comparative Analytics:
  generateLeaderboard(): O(u log u) - u = user count, sort
  getPeerComparison(): O(u) - find similar learners
  calculatePercentiles(): O(u) - sort once

Storage:
  Per user per domain: ~100-200 bytes per milestone
  Total badges per user: 13 max
  Leaderboard entries: Varies with user count
```

## Integration Points

```
WITH TRAINING SERVER:
  ├─ Fetch current profile
  ├─ Get challenge scores
  └─ Update mastery levels

WITH CHALLENGE SERVER:
  ├─ Record challenge completion
  ├─ Get challenge metadata
  └─ Trigger badge checks

WITH CONTROL ROOM:
  ├─ Display dashboard
  ├─ Show velocity charts
  ├─ Display leaderboards
  ├─ Show badge notifications
  └─ Enable peer comparison
```

## Success Metrics

```
Velocity Accuracy:
  ✓ 87%+ confidence with 100+ milestones
  ✓ Prediction error < 3 days at 85%+

Badge System:
  ✓ 75%+ of learners earn at least 1 badge
  ✓ Avg 3+ badges per engaged learner

Leaderboards:
  ✓ 60%+ check weekly
  ✓ Top 10% account for 30% of milestones

Engagement:
  ✓ 65%+ act on recommended next actions
  ✓ 50%+ study recommended peer strategies
```

---

## Summary

The three-phase learning analytics system provides comprehensive learner tracking through:

1. **Phase 6C**: Real-time velocity tracking with predictive analytics
2. **Phase 6D**: Gamified achievement recognition driving engagement  
3. **Phase 6E**: Competitive leaderboards encouraging peer learning

Unified through `LearningAnalyticsService` with a single touchpoint for recording progress and generating holistic dashboards.
