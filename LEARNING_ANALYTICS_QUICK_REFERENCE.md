# Phase 6C/6D/6E Quick Reference

## Three Pillars of Learning Analytics

### Phase 6C: Learning Velocity Tracking 📈
**Module**: `engines/learning-velocity-tracker.js`

**Key Features**:
- Exponential Moving Average (EMA) velocity calculation
- Temporal decay weighting (older data has less weight)
- Trend detection: accelerating/steady/decelerating
- Mastery prediction with confidence intervals
- 68% and 95% confidence bands

**Key Methods**:
```javascript
tracker.recordMilestone(domain, mastery, metadata)
tracker.calculateVelocityWithEMA(domain)
tracker.predictAchievementDate(domain, currentMastery, targetMastery)
tracker.getVelocityTrend(domain)
tracker.getMasteryTrajectory(domain, maxPoints)
```

**Prediction Formula**:
```
daysToTarget = masteryGap / velocity
confidence = consistencyScore * 0.6 + strengthScore * 0.4
```

---

### Phase 6D: Achievement Badges 🏆
**Module**: `engines/badges-system.js`

**Badge Tiers**:
- **Tier 1**: Novice badges (10 points each)
- **Tier 2**: Intermediate badges (25-40 points)
- **Tier 3**: Expert badges (50+ points, mentor status)

**Available Badges** (13 total):

**Consensus Path**:
1. Consensus Novice 🌱
2. Consensus Architect ⚙️
3. Consensus Master 🎯 (85%+ on consensus-basic)

**Transaction Path**:
1. Saga Apprentice 📖
2. Saga Expert ⚡ (85%+ on distributed-transactions)

**Byzantine Path**:
1. Byzantine Defender 🛡️ (80%+ on fault-tolerance)

**System Designer Path**:
- System Design Expert 🏛️ (Complete all 3 challenges)

**Mastery Badges**:
- 80% Club 🎖️ (80% mastery in distributed)
- Elite Learner 👑 (85% mastery in distributed)

**Consistency Badges**:
- Consistency Streaker 🔥 (7-day streak)
- Iron Learner 💪 (30-day streak)

**Velocity Badges**:
- Velocity Accelerator 📈 (0.5% daily velocity)
- Hyperbolic Learner 🚀 (1% daily velocity)

**Key Methods**:
```javascript
badges.awardBadge(userId, badgeId)
badges.checkBadgeQualification(userId, badgeId, profile, scores)
badges.getUserBadgeProgress(userId)
badges.getAchievementPath(userId)
badges.calculateTotalRewards(userId)
```

**Rewards Structure**:
- Points: 10-100 per badge
- Mastery Boost: 1-5% boost
- Mentor Status: Can mentor peers
- Advanced Access: Unlock harder challenges

---

### Phase 6E: Comparative Analytics 🏅
**Module**: `engines/comparative-analytics.js`

**Leaderboard Algorithm**:
1. Sort by mastery (primary)
2. Use velocity as tie-breaker
3. Calculate percentiles (p10, p25, p50, p75, p90)
4. Show momentum trend (🚀 Rising, 📈 Steady, 📉 Declining)

**Peer Comparison**:
- Find users within ±10% mastery (similar learners)
- Identify top performers (learners ahead)
- Calculate similarity percentage
- Recommend learning paths

**Key Methods**:
```javascript
analytics.generateLeaderboard(domain, options)
analytics.getPeerComparison(userId, domain)
analytics.getFullPeerComparison(userId)
analytics.calculatePercentileForScore(score, percentiles)
```

**Percentile Ranks**:
- **95+ percentile**: Top 5% 👑
- **90+ percentile**: Top 10% 🏆
- **75+ percentile**: Top 25% 🎖️
- **50+ percentile**: Above Average 📈
- **< 50 percentile**: Growing 📚

---

## Unified Integration Service

**Module**: `engines/learning-analytics-service.js`

**Complete Workflow**:
```javascript
import LearningAnalyticsService from './engines/learning-analytics-service.js';

const service = new LearningAnalyticsService();

// 1. Initialize user
service.initializeUserAnalytics('user-123', profile);

// 2. Record milestone (triggers all three phases)
service.recordMilestone('user-123', 'distributed', 79, {
  challengeId: 'consensus-basic',
  score: 88
});

// 3. Get comprehensive dashboard
const dashboard = service.getUserDashboard('user-123');
// Returns: velocity data + predictions + badges + leaderboard ranks

// 4. Get peer analysis
const analysis = service.getPeerAnalysis('user-123', 'distributed');
// Returns: your metrics + peer comparison + action items

// 5. Generate analytics report
const report = service.generateAnalyticsReport('user-123');
// Returns: summary + performance by domain + badge progression + recommendations
```

---

## Key Performance Indicators (KPIs)

### Velocity Metrics
- **Velocity Per Day**: Mastery gain per day (target: 0.5%+)
- **Consistency Score**: How stable the velocity is (0-1)
- **Strength Score**: How strong the velocity is relative to baseline (0-1)
- **Trend Direction**: Accelerating/Steady/Decelerating

### Achievement Metrics
- **Total Badges**: Cumulative badges earned
- **Tier Breakdown**: Distribution across tier 1/2/3
- **Total Points**: Accumulated badge points
- **Mentor Status**: Can mentor peers if 2+ tier-3 badges

### Comparative Metrics
- **Percentile Rank**: Position relative to all learners (0-100)
- **Rank**: Absolute position in leaderboard
- **Momentum**: Velocity-based trending indicator
- **Similarity**: Percentage match with other learners

---

## API Endpoints (Quick Reference)

### Velocity Tracking
- `GET /api/v1/analytics/velocity?domain=distributed` → Current velocity + prediction
- `GET /api/v1/analytics/predict?domain=distributed&target=85` → Achievement prediction
- `GET /api/v1/analytics/velocity-trend?domain=distributed` → Trend analysis
- `GET /api/v1/analytics/comparative` → Compare all domains

### Badges
- `GET /api/v1/badges?userId=user-123` → User's badges
- `GET /api/v1/badges/progress?userId=user-123` → Badge progress + paths
- `POST /api/v1/badges/check` → Check & award eligibility
- `GET /api/v1/badges/by-tier?tier=3` → Filter by tier

### Leaderboards & Comparison
- `GET /api/v1/leaderboard?domain=distributed` → Domain leaderboard
- `GET /api/v1/peer-comparison?userId=user-123&domain=distributed` → Peer comparison
- `GET /api/v1/peer-comparison/full?userId=user-123` → Full comparison

### Dashboard & Reporting
- `GET /api/v1/analytics/dashboard?userId=user-123` → Complete dashboard
- `POST /api/v1/analytics/record-milestone` → Record milestone
- `GET /api/v1/analytics/system` → System-wide analytics
- `GET /api/v1/analytics/export?userId=user-123` → Export for visualization

---

## Data Flow

```
User Action (Challenge Completion)
    ↓
Record Milestone
    ├→ [Phase 6C] Update Velocity Tracker
    ├→ [Phase 6D] Check Badge Eligibility & Award
    └→ [Phase 6E] Update Leaderboard Rankings
    ↓
Generate Quick Analysis
    ├→ Current mastery
    ├→ Velocity metrics
    ├→ Prediction to 85%
    ├→ New badges awarded
    └→ Leaderboard impact
    ↓
User Dashboard
    ├→ Velocity Data (current + trajectory + trend)
    ├→ Predictions (85% target date + confidence)
    ├→ Badge Progress (earned + next badges + paths)
    ├→ Leaderboard (rank + percentile + peers)
    └→ Recommendations (next actions by priority)
```

---

## Example Dashboard Response

```json
{
  "userId": "user-123",
  "velocity": {
    "distributed": {
      "currentMastery": 79,
      "velocity": 0.523,
      "trend": "📈 accelerating",
      "prediction": {
        "predictedDate": "2025-11-01",
        "daysRemaining": 12,
        "confidence": "HIGH (87%)"
      }
    }
  },
  "badges": {
    "earned": 3,
    "nextBadges": ["elite-learner", "system-designer"],
    "totalPoints": 125,
    "mentorStatus": true
  },
  "leaderboard": {
    "yourRank": 2,
    "totalParticipants": 1000,
    "percentile": 75,
    "percentileRank": "Top 25% 🎖️"
  },
  "nextActions": [
    "Push for 85% (you're at 79%) - HIGH PRIORITY",
    "Earn Elite Learner badge - MEDIUM PRIORITY",
    "Study top performer strategies - LOW PRIORITY"
  ]
}
```

---

## Success Criteria

✅ **Phase 6C**: Velocity tracking with 87%+ confidence predictions
✅ **Phase 6D**: 13 tier-based badges with clear unlock paths
✅ **Phase 6E**: Leaderboards with percentile ranking and peer comparison
✅ **Integration**: Single unified service handling all three phases
✅ **Real-time**: Automatic badge eligibility checking on milestone recording
✅ **Actionable**: Clear next-steps and personalized recommendations

---

## Testing Checklist

- [ ] Velocity calculation with EMA produces correct values
- [ ] Prediction confidence improves with more data points
- [ ] Badge awards trigger only when conditions are met
- [ ] Leaderboard ranks update in real-time
- [ ] Peer comparison identifies similar learners correctly
- [ ] Percentile calculations match expected distribution
- [ ] Dashboard integrates all three phases correctly
- [ ] Next actions are prioritized appropriately
- [ ] System handles edge cases (new users, no history, etc.)
