# Phase 6CDE: Integration Hook Points & Implementation Guide

## 🔗 Overview

This document identifies exact locations where training-server and coach-server should be modified to send data to and receive data from the analytics system.

**Status**: ✅ Integration module ready | ✅ Orchestrator configured | ✅ Imports added | ⏭️ Hook implementation pending

---

## Training Server Integration

### Import & Initialization

**File**: `servers/training-server.js`  
**Status**: ✅ Already added (line 11)

```javascript
import AnalyticsIntegration from '../modules/analytics-integration.js';

// Initialize (after other engines, around line 51)
const analytics = new AnalyticsIntegration();
```

### Hook Points to Add

#### 1. Challenge Completion Hook
**Location**: Find the challenge completion endpoint in `servers/training-server.js`

```javascript
// HOOK: When user completes a challenge with a score

app.post('/api/v1/training/challenge-complete', async (req, res) => {
  const { userId, challengeId, score, domain } = req.body;
  
  // ... existing training logic ...
  
  // NEW: Record to analytics
  await analytics.recordChallengeMilestone(
    userId,
    challengeId,
    score,
    domain || 'consensus'
  );
  
  res.json({ ok: true });
});
```

#### 2. Batch Round Completion
**Location**: Round completion in training loop

```javascript
// HOOK: When training rounds complete and multiple milestones recorded

app.post('/api/v1/training/round-complete', async (req, res) => {
  const { userId, results, domain } = req.body;
  
  // Batch record all milestones
  const milestones = results.map(r => ({
    userId,
    challengeId: r.challengeId,
    score: r.score,
    domain: domain || 'consensus'
  }));
  
  await analytics.recordMilestones(milestones);
  
  res.json({ ok: true, recorded: milestones.length });
});
```

#### 3. Domain Update Hook
**Location**: When domain mastery updates

```javascript
// HOOK: Update learner profile when domain mastery changes

app.post('/api/v1/training/domain-update', async (req, res) => {
  const { userId, domain, mastery, streakDays, totalChallenges } = req.body;
  
  await analytics.updateLearnerProfile(userId, {
    masteryScores: { [domain]: mastery },
    streakDays,
    totalChallenges
  });
  
  res.json({ ok: true });
});
```

### Suggested Implementation Order

1. **First**: Add challenge completion hook (highest priority)
   - Records every milestone
   - Feeds velocity tracking
   - Enables badge detection

2. **Second**: Add batch round completion
   - Improves performance for bulk operations
   - Used during rapid training rounds

3. **Third**: Add domain update hook
   - Updates learner profile
   - Feeds leaderboard rankings
   - Tracks streak data

---

## Coach Server Integration

### Import & Initialization

**File**: `servers/coach-server.js`  
**Status**: ✅ Already added (line 6)

```javascript
import AnalyticsIntegration from '../modules/analytics-integration.js';

// Initialize (after settings, around line 69)
const analytics = new AnalyticsIntegration();
```

### Hook Points to Add

#### 1. Get Prediction for Motivation
**Location**: Coaching decision endpoint

```javascript
// HOOK: Get prediction to tell user when they'll reach 85%

app.get('/api/v1/coach/motivation/:userId/:domain', async (req, res) => {
  const { userId, domain } = req.params;
  
  // Get current mastery
  const overview = await trainingCamp.getOverviewData();
  const current = overview?.domains?.find(d => d.name === domain)?.mastery || 50;
  
  // Get prediction
  const prediction = await analytics.predictAchievement(domain, current);
  
  res.json({
    ok: true,
    message: `You'll reach 85% by ${prediction.prediction}`,
    daysToTarget: prediction.daysToTarget,
    trend: prediction.trend,
    confidence: prediction.confidence
  });
});
```

#### 2. Get Badge Suggestions
**Location**: Next goal recommendation endpoint

```javascript
// HOOK: Show next badges user can earn

app.get('/api/v1/coach/next-goals/:userId', async (req, res) => {
  const { userId } = req.params;
  
  const suggestions = await analytics.getBadgeSuggestions(userId);
  
  res.json({
    ok: true,
    nextBadges: suggestions.suggestions || [],
    hint: 'Complete these challenges to unlock badges'
  });
});
```

#### 3. Get Peer Comparison
**Location**: Motivation/comparison endpoint

```javascript
// HOOK: Show similar learners for motivation

app.get('/api/v1/coach/peers/:userId', async (req, res) => {
  const { userId } = req.params;
  
  const peers = await analytics.getPeerAnalysis(userId, 5);
  
  res.json({
    ok: true,
    similarLearners: peers.similarLearners || [],
    yourRank: peers.percentile,
    insights: peers.insights || [],
    motivation: 'See how others are progressing!'
  });
});
```

#### 4. Get Velocity to Adjust Difficulty
**Location**: Difficulty adjustment logic

```javascript
// HOOK: Use velocity to inform difficulty decisions

app.post('/api/v1/coach/adjust-difficulty/:userId/:domain', async (req, res) => {
  const { userId, domain } = req.params;
  
  const velocity = await analytics.getVelocity(domain, 14);
  const acceleration = await analytics.getAcceleration(domain);
  
  let recommendation = 'maintain';
  let reason = '';
  
  if (velocity.velocity > 3.0) {
    recommendation = 'increase';
    reason = 'Learning fast! Time to challenge yourself';
  } else if (velocity.velocity < 1.0) {
    recommendation = 'decrease';
    reason = 'Slow pace detected. Simplify challenges';
  }
  
  if (acceleration.trend === 'accelerating') {
    recommendation = 'increase';
    reason = 'Momentum building! Push forward';
  }
  
  res.json({
    ok: true,
    recommendation,
    reason,
    velocity: velocity.velocity,
    trend: acceleration.trend
  });
});
```

### Suggested Implementation Order

1. **First**: Add prediction hook
   - Motivates users with concrete milestones
   - Requires no other system changes

2. **Second**: Add badge suggestions
   - Gives users goals to work toward
   - Depends on training data being recorded

3. **Third**: Add peer comparison
   - Motivates through healthy competition
   - Requires multiple users in system

4. **Fourth**: Add difficulty adjustment
   - Most complex integration
   - Requires velocity data from analytics

---

## Web/UI Integration

### Direct API Calls (No Server Hook Needed)

The UI can call analytics directly via the web-server proxy:

#### Velocity Dashboard
```javascript
// Display velocity chart
fetch('http://127.0.0.1:3000/api/v1/analytics/velocity-enhanced?domain=consensus')
  .then(r => r.json())
  .then(data => {
    // Plot velocity over time
    // data.velocity: %/day
    // data.trend: improving|stable|declining
    // data.confidence: 0-100%
  });
```

#### Leaderboard
```javascript
// Display leaderboard
fetch('http://127.0.0.1:3000/api/v1/analytics/leaderboard?domain=consensus&limit=10')
  .then(r => r.json())
  .then(data => {
    // Display ranking table
    // data.leaderboard: [{ rank, userId, score, percentile }]
  });
```

#### User Profile Badge Display
```javascript
// Show badges for current user
fetch(`http://127.0.0.1:3000/api/v1/analytics/badges/user?userId=${userId}`)
  .then(r => r.json())
  .then(data => {
    // Display badge grid
    // data.badges: [{ id, name, icon, unlockedAt }]
  });
```

---

## Integration Testing

### Test Endpoint: Record a Milestone
```bash
curl -X POST http://127.0.0.1:3012/api/v1/analytics/milestone \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-user",
    "challengeId": "consensus-101",
    "score": 85,
    "domain": "consensus"
  }'
```

### Test Endpoint: Get Velocity
```bash
curl "http://127.0.0.1:3012/api/v1/analytics/velocity-enhanced?domain=consensus"
```

### Test Full Integration
```bash
# Start all services
npm run dev &

# Wait 10 seconds for startup

# Run integration test
node test-analytics-integration.js
```

---

## Implementation Checklist

### Training Server
- [ ] Add challenge completion hook
- [ ] Add batch round completion hook
- [ ] Add domain update hook
- [ ] Test milestone recording
- [ ] Verify velocity calculation
- [ ] Monitor performance impact

### Coach Server
- [ ] Add prediction hook
- [ ] Add badge suggestion hook
- [ ] Add peer comparison hook
- [ ] Add difficulty adjustment logic
- [ ] Test coach decisions
- [ ] Verify coaching quality

### UI/Web
- [ ] Add velocity chart component
- [ ] Add leaderboard display
- [ ] Add badge showcase
- [ ] Add peer comparison modal
- [ ] Add prediction display
- [ ] Test all dashboard views

### Monitoring
- [ ] Set up analytics logging
- [ ] Monitor performance metrics
- [ ] Check data quality
- [ ] Verify predictions accuracy
- [ ] Monitor system health

---

## Performance Considerations

### Expected Overhead

| Operation | Time | Impact |
|-----------|------|--------|
| recordChallengeMilestone | <1ms | Negligible |
| recordMilestones (batch) | <5ms | Negligible |
| updateLearnerProfile | <2ms | Negligible |
| getVelocity | <10ms | Low |
| predictAchievement | <20ms | Low |
| getBadgeSuggestions | <50ms | Low |
| getLeaderboard | <100ms | Acceptable |

### Optimization Tips

1. **Use batch operations** for multiple milestones:
   ```javascript
   // Instead of:
   for (let milestone of milestones) {
     await analytics.recordChallengeMilestone(...);
   }
   
   // Do this:
   await analytics.recordMilestones(milestones);
   ```

2. **Cache leaderboards** on client for 5+ seconds
3. **Lazy-load predictions** only when needed
4. **Update profiles** once per training session, not every round

---

## Error Handling

### Graceful Degradation

The analytics integration is designed to fail gracefully:

```javascript
// If analytics is down, training continues
const result = await analytics.recordChallengeMilestone(...);

if (!result.ok) {
  console.warn('Analytics unavailable, continuing...');
  // Training continues regardless
}
```

### Monitoring for Failures

```javascript
// Check analytics health before important operations
const healthy = await analytics.healthCheck();

if (!healthy) {
  console.error('Analytics server down');
  // Alert admin, disable analytics-dependent features
}
```

---

## Deployment Timeline

### Phase 1: Deploy Infrastructure (Today)
- ✅ Analytics server on port 3012
- ✅ Integration module created
- ✅ Orchestrator configured
- ✅ Health checks implemented

### Phase 2: Train Integration (This Week)
- ⏭️ Add challenge completion hook
- ⏭️ Test milestone recording
- ⏭️ Verify velocity calculation

### Phase 3: Coach Integration (Next Week)
- ⏭️ Add prediction hook
- ⏭️ Add badge suggestion hook
- ⏭️ Test coaching decisions

### Phase 4: UI Dashboard (Following Week)
- ⏭️ Build velocity chart
- ⏭️ Build leaderboard
- ⏭️ Build badge showcase

### Phase 5: Production Launch (End of Month)
- ⏭️ Launch with real users
- ⏭️ Monitor metrics
- ⏭️ Iterate based on feedback

---

## Quick Reference

### Analytics Integration Module Methods

```javascript
// Recording
recordChallengeMilestone(userId, challengeId, score, domain)
recordMilestones(milestones)

// Velocity (Phase 6C)
getVelocity(domain, daysWindow)
getAcceleration(domain)
predictAchievement(domain, currentMastery)

// Badges (Phase 6D)
getBadgeSuggestions(userId)
getUserBadges(userId)
unlockBadge(userId, badgeId)

// Leaderboards (Phase 6E)
getLeaderboard(domain, limit)
getOverallLeaderboard(limit)
compareUsers(userId1, userId2)
getPeerAnalysis(userId, limit)

// Profiles
updateLearnerProfile(userId, profileData)

// Utility
healthCheck()
getDashboard()
```

### API Endpoints (Direct)

```
POST   /api/v1/analytics/milestone
POST   /api/v1/analytics/milestones-batch
POST   /api/v1/analytics/learner/profile

GET    /api/v1/analytics/velocity-enhanced?domain=X
GET    /api/v1/analytics/acceleration?domain=X
GET    /api/v1/analytics/prediction?domain=X&current=Y

GET    /api/v1/analytics/badges/suggestions?userId=X
GET    /api/v1/analytics/badges/user?userId=X
POST   /api/v1/analytics/badges/unlock

GET    /api/v1/analytics/leaderboard?domain=X&limit=N
GET    /api/v1/analytics/leaderboard-overall?limit=N
GET    /api/v1/analytics/comparison?user1=X&user2=Y
GET    /api/v1/analytics/peer-analysis?userId=X&limit=N

GET    /api/v1/analytics/dashboard
GET    /health
```

---

**Status**: ✅ Integration Ready for Implementation  
**Next Action**: Add hook points to training-server.js  
**Estimated Time**: 4-6 hours for full integration
