# Learning Analytics API Documentation

## Phase 6: Integrated Learning Analytics Platform

### Core Modules

#### Phase 6C: Learning Velocity Tracking
- **Module**: `engines/learning-velocity-tracker.js`
- **Class**: `LearningVelocityTracker`
- **Purpose**: Plot mastery over time, calculate learning velocity with EMA, predict 85% achievement

#### Phase 6D: Achievement Badges
- **Module**: `engines/badges-system.js`
- **Class**: `BadgesSystem`
- **Purpose**: Tier-based badges, progression paths, unlock conditions

#### Phase 6E: Comparative Analytics
- **Module**: `engines/comparative-analytics.js`
- **Class**: `ComparativeAnalytics`
- **Purpose**: Leaderboards, peer comparison, percentile calculation

#### Integration Service
- **Module**: `engines/learning-analytics-service.js`
- **Class**: `LearningAnalyticsService`
- **Purpose**: Unified platform tying all three phases together

---

## API Endpoints

### Phase 6C: Velocity Tracking

#### GET `/api/v1/analytics/velocity`
Get learning velocity for a domain with EMA calculation and trend analysis.

**Query Parameters:**
- `domain` (string, required): The learning domain (e.g., 'distributed')

**Response:**
```json
{
  "ok": true,
  "domain": "distributed",
  "currentMastery": 79,
  "velocity": {
    "velocityPerDay": 0.523,
    "trend": "📈 accelerating",
    "dataPoints": 12,
    "timespan": {
      "start": "2025-10-01T00:00:00Z",
      "end": "2025-10-20T12:00:00Z",
      "daysSpanned": "19.5"
    }
  },
  "prediction": {
    "achievable": true,
    "daysToTarget": 12,
    "weeksToTarget": "1.7",
    "predictedDate": "2025-11-01",
    "confidence": 87,
    "confidenceLevel": "HIGH"
  }
}
```

#### GET `/api/v1/analytics/trajectory`
Get mastery progression timeline for plotting.

**Query Parameters:**
- `domain` (string, required): The learning domain
- `maxPoints` (integer, optional): Maximum data points to return (default: 100)

**Response:**
```json
{
  "ok": true,
  "domain": "distributed",
  "trajectory": [
    { "date": "2025-10-01", "mastery": 65, "timestamp": 1727740800000 },
    { "date": "2025-10-05", "mastery": 68, "timestamp": 1728086400000 },
    ...
  ]
}
```

#### GET `/api/v1/analytics/predict`
Predict achievement date with confidence intervals.

**Query Parameters:**
- `domain` (string, required): The learning domain
- `target` (integer, optional): Target mastery level (default: 85)
- `currentMastery` (number, optional): Current mastery (auto-fetched if not provided)

**Response:**
```json
{
  "ok": true,
  "prediction": {
    "achievable": true,
    "currentMastery": 79,
    "targetMastery": 85,
    "masteryGap": 6,
    "velocity": 0.523,
    "daysToTarget": 12,
    "weeksToTarget": "1.7",
    "monthsToTarget": "0.4",
    "predictedDate": "2025-11-01",
    "confidence": 87,
    "confidenceLevel": "HIGH",
    "confidenceBands": {
      "optimistic68": "2025-10-30",
      "conservative95": "2025-11-07"
    },
    "recommendation": "💪 Great progress. Keep the momentum going!"
  }
}
```

#### GET `/api/v1/analytics/velocity-trend`
Get velocity trend (accelerating, steady, or decelerating).

**Query Parameters:**
- `domain` (string, required): The learning domain

**Response:**
```json
{
  "ok": true,
  "domain": "distributed",
  "trend": "accelerating",
  "velocityChange": "0.085",
  "confidence": "0.78"
}
```

#### GET `/api/v1/analytics/comparative`
Compare velocity across all domains.

**Response:**
```json
{
  "ok": true,
  "comparative": {
    "distributed": {
      "currentMastery": 79,
      "velocity": 0.523,
      "trend": "📈 accelerating",
      "prediction": {
        "predictedDate": "2025-11-01",
        "daysRemaining": 12,
        "confidence": "HIGH"
      }
    },
    "systems": {
      "currentMastery": 72,
      "velocity": 0.312,
      "trend": "→ steady",
      "prediction": { ... }
    }
  }
}
```

---

### Phase 6D: Achievement Badges

#### GET `/api/v1/badges`
Get user's badge status (unlocked and locked badges).

**Query Parameters:**
- `userId` (string, required): The user ID

**Response:**
```json
{
  "ok": true,
  "unlockedCount": 3,
  "totalBadges": 13,
  "progress": "3/13",
  "unlocked": [
    {
      "id": "consensus-master",
      "name": "Consensus Master 🎯",
      "tier": 3,
      "icon": "🏆",
      "awardedAt": "2025-10-15T10:30:00Z",
      "reward": {
        "masteryBoost": 3,
        "points": 50,
        "mentorStatus": true
      }
    }
  ],
  "locked": [
    {
      "id": "elite-learner",
      "name": "Elite Learner 👑",
      "tier": 3,
      "status": "locked",
      "howToUnlock": "Achieve 85% mastery in distributed"
    }
  ]
}
```

#### GET `/api/v1/badges/progress`
Get detailed badge progress and achievement paths.

**Query Parameters:**
- `userId` (string, required): The user ID

**Response:**
```json
{
  "ok": true,
  "earned": 3,
  "totalAvailable": 13,
  "tierDistribution": {
    "tier1": 1,
    "tier2": 1,
    "tier3": 1
  },
  "totalPoints": 125,
  "mentorStatus": true,
  "paths": [
    {
      "name": "Consensus Mastery Path",
      "progress": 3,
      "completionPercent": 100,
      "nextBadge": null,
      "icon": "🎯"
    },
    {
      "name": "Elite Learner Path",
      "progress": 2,
      "completionPercent": 50,
      "nextBadge": "elite-learner",
      "icon": "👑"
    }
  ]
}
```

#### POST `/api/v1/badges/check`
Check eligibility and award badges.

**Request Body:**
```json
{
  "userId": "user-123",
  "domain": "distributed",
  "mastery": 85,
  "challengeScores": {
    "consensus-basic": 88,
    "distributed-transactions": 85
  }
}
```

**Response:**
```json
{
  "ok": true,
  "newBadges": [
    {
      "id": "elite-learner",
      "name": "Elite Learner 👑",
      "awarded": true,
      "points": 75
    }
  ],
  "totalBadges": 4,
  "totalPoints": 200
}
```

#### GET `/api/v1/badges/by-tier`
Get badges filtered by tier.

**Query Parameters:**
- `tier` (integer, 1-3, required): The badge tier

**Response:**
```json
{
  "ok": true,
  "tier": 3,
  "badges": [
    {
      "id": "consensus-master",
      "name": "Consensus Master 🎯",
      "icon": "🏆",
      "description": "Mastered Consensus Algorithms (85%+ score)"
    }
  ]
}
```

---

### Phase 6E: Comparative Analytics & Leaderboards

#### GET `/api/v1/leaderboard`
Get domain leaderboard with ranking algorithm.

**Query Parameters:**
- `domain` (string, required): The learning domain
- `limit` (integer, optional): Max entries to return (default: 100)

**Response:**
```json
{
  "ok": true,
  "domain": "distributed",
  "leaderboard": [
    {
      "rank": 1,
      "username": "alex_distributed",
      "mastery": 92,
      "velocity": 1.2,
      "badges": 4,
      "percentile": 95,
      "trend": "🚀",
      "momentum": "🚀 Rising"
    },
    {
      "rank": 2,
      "username": "you",
      "mastery": 79,
      "velocity": 0.52,
      "badges": 3,
      "percentile": 75,
      "trend": "📈",
      "momentum": "📈 Steady"
    }
  ],
  "stats": {
    "totalParticipants": 1000,
    "averageMastery": 81.7,
    "medianMastery": 80,
    "masteryStdDev": 8.2,
    "percentiles": {
      "p10": 62,
      "p25": 70,
      "p50": 80,
      "p75": 88,
      "p90": 95
    }
  }
}
```

#### GET `/api/v1/peer-comparison`
Get detailed peer comparison for a user.

**Query Parameters:**
- `userId` (string, required): The user ID
- `domain` (string, required): The learning domain

**Response:**
```json
{
  "ok": true,
  "yourProfile": {
    "userId": "user-123",
    "username": "you",
    "mastery": 79,
    "rank": 2,
    "percentile": 75,
    "velocity": 0.52,
    "trend": "📈"
  },
  "benchmarks": {
    "averageMastery": 81.7,
    "topMastery": 92,
    "yourPercentile": 75,
    "percentileRank": "Top 25% 🎖️"
  },
  "similarLearners": [
    {
      "username": "jordan_systems",
      "mastery": 80,
      "velocity": 0.48,
      "similarity": "99%"
    }
  ],
  "learnersToFollow": [
    {
      "username": "alex_distributed",
      "mastery": 92,
      "masteryAhead": "13",
      "strategy": "Study high-output learners"
    }
  ],
  "recommendations": [
    "Study alex_distributed's approach (92% mastery)",
    "Increase practice frequency to improve velocity"
  ]
}
```

#### GET `/api/v1/peer-comparison/full`
Get peer comparison across all domains.

**Query Parameters:**
- `userId` (string, required): The user ID

**Response:**
```json
{
  "ok": true,
  "userId": "user-123",
  "overallProfile": {
    "averageMastery": 78.5,
    "strongDomains": ["distributed", "systems"],
    "weakDomains": ["security"],
    "specialization": "Distributed Systems"
  },
  "learningPathRecommendation": {
    "focusAreas": ["security (62%)"],
    "leverageStrength": "Build on Distributed Systems expertise",
    "suggestedSequence": [
      "1. Deep dive into security",
      "2. Apply distributed systems principles to security"
    ]
  }
}
```

#### GET `/api/v1/analytics/dashboard`
Get complete user dashboard (all three phases).

**Query Parameters:**
- `userId` (string, required): The user ID

**Response:**
```json
{
  "ok": true,
  "userId": "user-123",
  "session": {
    "createdAt": "2025-10-01T00:00:00Z",
    "milestonesRecorded": 24,
    "badgesEarned": 3
  },
  "velocity": {
    "domains": {
      "distributed": {
        "currentMastery": 79,
        "velocity": 0.523,
        "trend": "📈 accelerating"
      }
    },
    "predictions": {
      "distributed": {
        "achievable": true,
        "predictedDate": "2025-11-01",
        "confidence": 87
      }
    }
  },
  "badges": {
    "progress": {
      "earned": 3,
      "totalAvailable": 13,
      "totalPoints": 125
    },
    "paths": [
      {
        "name": "Consensus Mastery Path",
        "completionPercent": 100
      }
    ]
  },
  "leaderboards": {
    "distributed": {
      "yourRank": 2,
      "totalParticipants": 1000,
      "percentile": 75
    }
  },
  "nextActions": [
    {
      "priority": "high",
      "action": "Push for 85% in distributed (you're at 79%)",
      "impact": "Unlock elite learner status"
    }
  ]
}
```

---

### Data Recording

#### POST `/api/v1/analytics/record-milestone`
Record a learning milestone across all analytics phases.

**Request Body:**
```json
{
  "userId": "user-123",
  "domain": "distributed",
  "mastery": 79,
  "metadata": {
    "challengeId": "consensus-basic",
    "score": 88,
    "timeSpent": 45
  }
}
```

**Response:**
```json
{
  "ok": true,
  "recorded": true,
  "milestone": {
    "timestamp": "2025-10-20T12:00:00Z",
    "domain": "distributed",
    "mastery": 79
  },
  "newBadges": ["consensus-master"],
  "analysis": {
    "currentMastery": 79,
    "velocity": 0.523,
    "predictedDate": "2025-11-01",
    "confidence": "HIGH"
  }
}
```

---

### System Analytics

#### GET `/api/v1/analytics/system`
Get system-wide analytics.

**Response:**
```json
{
  "ok": true,
  "generatedAt": "2025-10-20T12:00:00Z",
  "totalUsers": 1000,
  "totalMilestones": 24000,
  "totalBadgesAwarded": 3200,
  "averageBadgesPerUser": 3.2,
  "domains": {
    "distributed": {
      "averageMastery": 81.7,
      "participants": 950
    }
  }
}
```

---

### Export & Visualization

#### GET `/api/v1/analytics/export`
Export analytics data for visualization libraries.

**Query Parameters:**
- `userId` (string, required): The user ID
- `format` (string, optional): 'json' or 'csv' (default: 'json')

**Response:**
```json
{
  "ok": true,
  "velocity": {
    "trajectory": [...],
    "comparative": {...}
  },
  "badges": {
    "earned": [...],
    "progress": {...}
  },
  "leaderboards": {...}
}
```

---

## Usage Example

```javascript
import LearningAnalyticsService from './engines/learning-analytics-service.js';

const analytics = new LearningAnalyticsService();

// Initialize user
analytics.initializeUserAnalytics('user-123', {
  username: 'alex_learner',
  topics: ['distributed', 'systems']
});

// Record milestone
analytics.recordMilestone('user-123', 'distributed', 79, {
  challengeId: 'consensus-basic',
  score: 88
});

// Get comprehensive dashboard
const dashboard = analytics.getUserDashboard('user-123');
console.log(dashboard);

// Get peer analysis
const peerAnalysis = analytics.getPeerAnalysis('user-123', 'distributed');
console.log(peerAnalysis);

// Generate report
const report = analytics.generateAnalyticsReport('user-123');
console.log(report);
```

---

## Integration with Control Room

The analytics service can be integrated with the Control Room UI using:

```javascript
// Register route in analytics-server.js
app.get('/api/v1/analytics/dashboard', (req, res) => {
  const { userId } = req.query;
  const dashboard = analytics.getUserDashboard(userId);
  res.json(dashboard);
});
```

Then call from UI:
```javascript
fetch('/api/v1/analytics/dashboard?userId=user-123')
  .then(r => r.json())
  .then(data => displayDashboard(data));
```

---

## Visualization Helpers

### Chart.js Integration

```javascript
import { VelocityVisualizationGenerator } from './engines/learning-velocity-tracker.js';

const trajectory = analytics.velocityTracker.getMasteryTrajectory('distributed');
const chartData = VelocityVisualizationGenerator.generateLineChartData(trajectory);

// Use with Chart.js
new Chart(ctx, { type: 'line', data: chartData });
```

### Leaderboard Visualization

```javascript
import { LeaderboardVisualizationGenerator } from './engines/comparative-analytics.js';

const leaderboard = analytics.comparativeAnalytics.generateLeaderboard('distributed');
const tableData = LeaderboardVisualizationGenerator.generateTableData(leaderboard);
```

---

## Success Metrics

- ✅ Velocity tracking with EMA and temporal decay
- ✅ 85% achievement prediction with confidence intervals
- ✅ 13 tier-based achievement badges
- ✅ Leaderboards with percentile ranking
- ✅ Peer comparison with learning path recommendations
- ✅ Real-time badge eligibility checking
- ✅ Unified analytics service integrating all phases
