# Phase 6C, 6D, 6E: Analytics Implementation Guide

**Outcome:** Comprehensive learning analytics system with velocity tracking, achievement badges, and comparative leaderboards fully integrated.

---

## Quick Start

### Phase 6C: Learning Velocity Tracking
**Goal:** Plot mastery over time and predict 85% achievement

```bash
# Record a learning milestone
curl -X POST http://127.0.0.1:3012/api/v1/analytics/record-milestone \
  -H 'Content-Type: application/json' \
  -d '{
    "domain": "distributed-systems",
    "masteryBefore": 72,
    "masteryAfter": 75,
    "sessionDuration": 45,
    "challengeType": "consensus",
    "score": 88
  }'

# Get velocity tracking (7, 14, 30 day analysis)
curl http://127.0.0.1:3012/api/v1/analytics/velocity-enhanced?domain=distributed-systems

# Get learning acceleration pattern
curl http://127.0.0.1:3012/api/v1/analytics/acceleration?domain=distributed-systems

# Get mastery time series for charting
curl http://127.0.0.1:3012/api/v1/analytics/mastery-timeseries?domain=distributed-systems

# Predict when you'll reach 85%
curl http://127.0.0.1:3012/api/v1/analytics/predict?domain=distributed-systems&target=85
```

**Key Features:**
- ✅ Calculates velocity per day across multiple time windows
- ✅ Tracks acceleration/deceleration trends
- ✅ Generates projection charts with confidence scoring
- ✅ Recommends actions based on trajectory

**Response Example:**
```json
{
  "ok": true,
  "domain": "distributed-systems",
  "velocity7Day": {
    "domain": "distributed-systems",
    "period": "7 days",
    "totalGain": 12.5,
    "daysElapsed": 7.2,
    "velocityPerDay": 1.736,
    "eventCount": 15,
    "averageEfficiency": 0.042,
    "trend": "improving_📈"
  },
  "stats": {
    "velocity7Day": 1.736,
    "velocity14Day": 1.451,
    "velocity30Day": 0.987,
    "trend": "improving_📈",
    "acceleration": 0.749
  }
}
```

---

### Phase 6D: Achievement Badges
**Goal:** Consensus Master, System Design Expert, and more

```bash
# Get all badges with user progress
curl http://127.0.0.1:3012/api/v1/analytics/badges-full?userId=user123

# Get specific badge progress
curl http://127.0.0.1:3012/api/v1/analytics/badge-progress/consensus-master?userId=user123

# Unlock a badge
curl -X POST http://127.0.0.1:3012/api/v1/analytics/unlock-badge \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user123",
    "badgeId": "consensus-master",
    "metadata": {
      "challengeId": "consensus-advanced",
      "score": 92
    }
  }'

# Get next badge suggestions
curl http://127.0.0.1:3012/api/v1/analytics/badge-suggestions?userId=user123
```

**Available Badges:**

| Badge | Icon | Category | Tier | Requirement |
|-------|------|----------|------|-------------|
| Consensus Master | 👑 | Consensus | 3 | 85% mastery + 90+ on advanced |
| System Design Expert | 🌐 | Design | 3 | 85% mastery in Distributed Systems Design |
| Byzantine Defender | 🛡️ | Resilience | 2 | 80+ on Fault Tolerance challenge |
| Saga Expert | ⚡ | Transactions | 2 | 85+ on Distributed Transactions |
| 80% Club | 🎖️ | Mastery | 2 | 80%+ in any domain |
| Elite Learner | 👑 | Mastery | 3 | 85%+ in all domains |
| Marathon Runner | 🏃 | Dedication | 3 | 30+ day streak |
| Polymath | 🧠 | Mastery | 3 | 70%+ in 5+ domains |

**Response Example:**
```json
{
  "ok": true,
  "user": {
    "totalUnlocked": 4,
    "totalAvailable": 18,
    "progressPercentage": 22.2,
    "badges": [
      {
        "id": "consensus-novice",
        "name": "Consensus Novice",
        "icon": "🤝",
        "category": "consensus",
        "tier": 1,
        "rarity": "common",
        "unlockedAt": "2025-10-20T14:32:00Z",
        "reward": {
          "masteryBoost": 1,
          "points": 100
        }
      }
    ]
  }
}
```

---

### Phase 6E: Comparative Analytics & Leaderboards
**Goal:** Leaderboards and peer comparison

```bash
# Get domain leaderboard
curl http://127.0.0.1:3012/api/v1/analytics/leaderboard/distributed-systems?limit=20

# Get overall leaderboard
curl http://127.0.0.1:3012/api/v1/analytics/leaderboard-overall?limit=20

# Compare two users
curl http://127.0.0.1:3012/api/v1/analytics/compare-users?userId1=user123&userId2=user456

# Get peer comparison for current user
curl http://127.0.0.1:3012/api/v1/analytics/peer-comparison?userId=user123&limit=5

# Find similar learners
curl http://127.0.0.1:3012/api/v1/analytics/similar-learners?userId=user123&limit=10

# Update learner profile (required for leaderboard)
curl -X POST http://127.0.0.1:3012/api/v1/analytics/learner-profile \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user123",
    "username": "alex_distributed",
    "masteryByDomain": {
      "distributed-systems": 88,
      "consensus": 92,
      "fault-tolerance": 85
    },
    "totalAttempts": 156,
    "badges": ["consensus-master", "system-designer-expert"],
    "completedChallenges": 24,
    "streak": 15,
    "velocity": {
      "distributed-systems": 1.2,
      "consensus": 1.5
    }
  }'

# Get leaderboard statistics
curl http://127.0.0.1:3012/api/v1/analytics/leaderboard-stats
```

**Leaderboard Response Example:**
```json
{
  "ok": true,
  "domain": "distributed-systems",
  "totalParticipants": 156,
  "leaderboard": [
    {
      "rank": 1,
      "username": "alex_distributed",
      "mastery": 92,
      "velocity": 1.2,
      "badges": 4,
      "attempts": 145,
      "trend": "🚀 accelerating",
      "percentile": 99.4
    },
    {
      "rank": 2,
      "username": "sam_architect",
      "mastery": 88,
      "velocity": 0.8,
      "badges": 3,
      "attempts": 128,
      "trend": "📈 improving",
      "percentile": 98.7
    }
  ],
  "stats": {
    "topMastery": 92,
    "averageMastery": 71.3,
    "medianMastery": 72,
    "topVelocity": 1.5
  }
}
```

---

## Integration with Existing Systems

### Connecting to Training Server

```javascript
// In your challenge completion handler:
const recordCompletion = async (userId, challengeId, score, domain) => {
  // 1. Update mastery at training server
  const updateResponse = await fetch('http://127.0.0.1:3001/api/v1/training/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, domain, scoreDelta: score - 50 })
  });

  // 2. Record milestone for velocity tracking
  const velocityResponse = await fetch('http://127.0.0.1:3012/api/v1/analytics/record-milestone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain,
      masteryBefore: previousMastery,
      masteryAfter: newMastery,
      sessionDuration: sessionTime,
      challengeType: challengeId,
      score
    })
  });

  // 3. Check badge unlocks
  const badgeResponse = await fetch('http://127.0.0.1:3012/api/v1/analytics/unlock-badge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      badgeId: 'consensus-master',
      metadata: { challengeId, score }
    })
  });

  // 4. Update leaderboard profile
  await fetch('http://127.0.0.1:3012/api/v1/analytics/learner-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      username: userProfile.username,
      masteryByDomain: newMasteryByDomain,
      totalAttempts: totalAttempts + 1,
      badges: unlockedBadges,
      velocity: calculatedVelocity,
      completedChallenges,
      streak
    })
  });
};
```

---

## Dashboard Integration

### Combined Endpoint Usage

```html
<!-- Analytics Dashboard Page -->
<div id="dashboard">
  <!-- Velocity Chart -->
  <div class="velocity-section">
    <h2>📈 Learning Velocity</h2>
    <canvas id="velocityChart"></canvas>
    <p id="velocityTrend"></p>
  </div>

  <!-- Prediction -->
  <div class="prediction-section">
    <h2>🎯 85% Achievement Prediction</h2>
    <div id="prediction"></div>
  </div>

  <!-- Badges -->
  <div class="badges-section">
    <h2>🎖️ Achievements</h2>
    <div id="badgesContainer"></div>
  </div>

  <!-- Leaderboard -->
  <div class="leaderboard-section">
    <h2>🏆 Leaderboard</h2>
    <table id="leaderboardTable"></table>
  </div>

  <!-- Peer Comparison -->
  <div class="comparison-section">
    <h2>👥 Peer Analysis</h2>
    <div id="peerComparison"></div>
  </div>
</div>

<script>
async function loadDashboard(userId) {
  // Load velocity
  const velocityResp = await fetch(
    `/api/v1/analytics/velocity-enhanced?domain=distributed-systems`
  );
  const velocityData = await velocityResp.json();

  // Load prediction
  const predictionResp = await fetch(
    `/api/v1/analytics/predict?domain=distributed-systems&target=85`
  );
  const predictionData = await predictionResp.json();

  // Load badges
  const badgesResp = await fetch(
    `/api/v1/analytics/badges-full?userId=${userId}`
  );
  const badgesData = await badgesResp.json();

  // Load leaderboard
  const leaderboardResp = await fetch(
    `/api/v1/analytics/leaderboard/distributed-systems?limit=20`
  );
  const leaderboardData = await leaderboardResp.json();

  // Load peer comparison
  const peerResp = await fetch(
    `/api/v1/analytics/peer-comparison?userId=${userId}&limit=5`
  );
  const peerData = await peerResp.json();

  // Render all sections
  renderVelocity(velocityData);
  renderPrediction(predictionData);
  renderBadges(badgesData);
  renderLeaderboard(leaderboardData);
  renderPeerComparison(peerData);
}

loadDashboard(currentUserId);
</script>
```

---

## Performance Notes

- **Velocity Tracking:** O(n) calculation where n = events in period. Caches results.
- **Badge System:** O(1) lookups, O(n) for full inventory where n = total badges (~20)
- **Leaderboards:** O(n log n) sort where n = total learners. Cache updates on profile changes.
- **Memory:** ~100KB for 1000 learners with full history

---

## Testing Endpoints

### Smoke Test Script

```bash
#!/bin/bash

echo "Testing Phase 6C: Velocity Tracking..."
curl -s http://127.0.0.1:3012/api/v1/analytics/velocity-enhanced?domain=distributed-systems | jq .

echo -e "\nTesting Phase 6D: Badges..."
curl -s http://127.0.0.1:3012/api/v1/analytics/badges-full?userId=test-user | jq .

echo -e "\nTesting Phase 6E: Leaderboards..."
curl -s http://127.0.0.1:3012/api/v1/analytics/leaderboard/distributed-systems?limit=10 | jq .

echo -e "\nTesting Peer Comparison..."
curl -s http://127.0.0.1:3012/api/v1/analytics/peer-comparison?userId=test-user | jq .

echo -e "\nAll tests completed!"
```

---

## Next Steps

1. **UI Integration:** Connect dashboard components to these endpoints
2. **Real Data:** Feed actual user progress from training server
3. **Visualization:** Add charts (D3.js/Chart.js) for velocity and trajectory
4. **Notifications:** Badge unlock animations and streak notifications
5. **Gamification:** Leaderboard weekly updates, seasonal competitions

