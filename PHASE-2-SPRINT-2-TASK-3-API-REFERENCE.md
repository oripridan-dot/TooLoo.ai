# Phase 2 Sprint 2: Task 3 - API Reference
**Status**: ✅ **COMPLETE**  
**Date**: 2025-10-18  
**API Version**: v1  
**Base URL**: `http://127.0.0.1:3010`

---

## Endpoints Overview

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/bridge/gaps-per-cohort/:cohortId` | POST | Analyze gaps for a specific cohort | ✅ NEW |
| `/api/v1/bridge/gaps-per-cohort/:cohortId` | GET | Retrieve per-cohort gap analysis | ✅ NEW |

---

## POST /api/v1/bridge/gaps-per-cohort/:cohortId

### Purpose
Trigger a fresh per-cohort gap analysis, applying archetype-specific severity weighting.

### Request

**Method**: POST  
**URL**: `http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/:cohortId`  
**Headers**: None required  
**Body**: Empty or optional metadata

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cohortId` | string | ✅ Yes | Unique cohort identifier (e.g., `cohort-1729356000000-0`) |

#### Query Parameters

Optional:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fresh` | boolean | false | Force fresh analysis (bypass cache) |
| `limit` | number | 10 | Return top N gaps (max 20) |

#### Example Request

```bash
# Basic analysis
curl -X POST http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-1729356000000-0

# With query parameters
curl -X POST http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-1729356000000-0?fresh=true&limit=15

# With verbose logging (if supported)
curl -X POST http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-1729356000000-0 \
  -H "X-Debug: true"
```

### Response

#### Success (200 OK)

```json
{
  "ok": true,
  "analysis": {
    "timestamp": "2025-10-18T12:34:56.789Z",
    "cohortId": "cohort-1729356000000-0",
    "archetype": "Fast Learner",
    "cohortSize": 2,
    "cohortTraits": {
      "learningVelocity": 0.85,
      "domainAffinity": 0.35,
      "interactionFrequency": 0.72,
      "feedbackResponsiveness": 0.91,
      "retentionStrength": 0.45
    },
    "totalDiscovered": 242,
    "totalActivated": 168,
    "activationRate": "69.42%",
    "gaps": [
      {
        "component": "async-patterns",
        "discovered": 45,
        "activated": 28,
        "pending": 17,
        "baseSeverity": 0.378,
        "archetypeWeight": 2.0,
        "archetypeModifiedSeverity": 0.756,
        "urgency": "MEDIUM",
        "lastActivation": "2025-10-17T11:22:33.000Z",
        "relevanceReason": "High-priority for rapid async/await mastery"
      },
      {
        "component": "concurrency-control",
        "discovered": 36,
        "activated": 23,
        "pending": 13,
        "baseSeverity": 0.361,
        "archetypeWeight": 2.0,
        "archetypeModifiedSeverity": 0.722,
        "urgency": "MEDIUM",
        "lastActivation": "2025-10-16T08:15:00.000Z",
        "relevanceReason": "Essential for non-blocking learning patterns"
      },
      {
        "component": "batch-operations",
        "discovered": 50,
        "activated": 35,
        "pending": 15,
        "baseSeverity": 0.300,
        "archetypeWeight": 1.5,
        "archetypeModifiedSeverity": 0.450,
        "urgency": "LOW",
        "lastActivation": "2025-10-15T14:45:00.000Z",
        "relevanceReason": "Relevant to fast-paced learning trajectory"
      },
      {
        "component": "error-handling",
        "discovered": 32,
        "activated": 22,
        "pending": 10,
        "baseSeverity": 0.312,
        "archetypeWeight": 1.5,
        "archetypeModifiedSeverity": 0.469,
        "urgency": "LOW",
        "lastActivation": "2025-10-14T09:30:00.000Z",
        "relevanceReason": "Supports learning resilience"
      },
      {
        "component": "framework-integration",
        "discovered": 72,
        "activated": 54,
        "pending": 18,
        "baseSeverity": 0.250,
        "archetypeWeight": 1.5,
        "archetypeModifiedSeverity": 0.375,
        "urgency": "LOW",
        "lastActivation": "2025-10-13T16:20:00.000Z",
        "relevanceReason": "Relevant to fast-paced learning trajectory"
      },
      {
        "component": "domain-patterns",
        "discovered": 29,
        "activated": 20,
        "pending": 9,
        "baseSeverity": 0.310,
        "archetypeWeight": 1.0,
        "archetypeModifiedSeverity": 0.310,
        "urgency": "LOW",
        "lastActivation": "2025-10-12T12:00:00.000Z",
        "relevanceReason": "Generic learning content"
      },
      {
        "component": "optimization-internals",
        "discovered": 34,
        "activated": 19,
        "pending": 15,
        "baseSeverity": 0.441,
        "archetypeWeight": 1.0,
        "archetypeModifiedSeverity": 0.441,
        "urgency": "LOW",
        "lastActivation": "2025-10-11T10:15:00.000Z",
        "relevanceReason": "Generic learning content"
      },
      {
        "component": "accessibility-patterns",
        "discovered": 42,
        "activated": 28,
        "pending": 14,
        "baseSeverity": 0.333,
        "archetypeWeight": 1.0,
        "archetypeModifiedSeverity": 0.333,
        "urgency": "LOW",
        "lastActivation": "2025-10-10T13:45:00.000Z",
        "relevanceReason": "Generic learning content"
      },
      {
        "component": "component-architecture",
        "discovered": 44,
        "activated": 29,
        "pending": 15,
        "baseSeverity": 0.341,
        "archetypeWeight": 1.0,
        "archetypeModifiedSeverity": 0.341,
        "urgency": "LOW",
        "lastActivation": "2025-10-09T11:30:00.000Z",
        "relevanceReason": "Generic learning content"
      },
      {
        "component": "testing-strategies",
        "discovered": 28,
        "activated": 18,
        "pending": 10,
        "baseSeverity": 0.357,
        "archetypeWeight": 1.0,
        "archetypeModifiedSeverity": 0.357,
        "urgency": "LOW",
        "lastActivation": "2025-10-08T09:00:00.000Z",
        "relevanceReason": "Generic learning content"
      }
    ],
    "gapCount": 15,
    "criticalGaps": 2,
    "recommendedFocus": "Focus on rapid-cycle training variants with high difficulty progression",
    "estimatedROI": 1.8,
    "metadata": {
      "processedAt": "2025-10-18T12:34:56.789Z",
      "cacheSource": "cohort-traits",
      "capabilitiesSource": "capabilities-server",
      "executionTime": "142ms"
    }
  }
}
```

**Response Code**: 200  
**Content-Type**: `application/json`

---

#### Error: Cohort Not Found (404)

```json
{
  "ok": false,
  "error": "Cohort not found",
  "errorCode": "COHORT_NOT_FOUND",
  "cohortId": "invalid-cohort-id",
  "statusCode": 404
}
```

**Response Code**: 404

---

#### Error: Service Unavailable (500)

```json
{
  "ok": false,
  "error": "Failed to fetch capabilities",
  "errorCode": "SERVICE_ERROR",
  "details": "Capabilities server returned 500",
  "statusCode": 500
}
```

**Response Code**: 500

---

#### Error: Bad Request (400)

```json
{
  "ok": false,
  "error": "Invalid cohort ID format",
  "errorCode": "INVALID_REQUEST",
  "details": "cohortId must be a non-empty string",
  "statusCode": 400
}
```

**Response Code**: 400

---

## GET /api/v1/bridge/gaps-per-cohort/:cohortId

### Purpose
Retrieve the latest per-cohort gap analysis (does not trigger new analysis).

### Request

**Method**: GET  
**URL**: `http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/:cohortId`  
**Headers**: None required

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cohortId` | string | ✅ Yes | Unique cohort identifier |

#### Query Parameters

Optional:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 10 | Return top N gaps (max 20) |
| `urgency` | string | - | Filter by urgency (CRITICAL, HIGH, MEDIUM, LOW) |

#### Example Request

```bash
# Get all gaps
curl http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-1729356000000-0

# Get only top 5 gaps
curl http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-1729356000000-0?limit=5

# Get only critical gaps
curl http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-1729356000000-0?urgency=CRITICAL

# Combine parameters
curl http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-1729356000000-0?limit=8&urgency=HIGH
```

### Response

**Same structure as POST endpoint** (see Success response above)

**Response Code**: 200  
**Content-Type**: `application/json`

---

## Response Field Reference

### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `ok` | boolean | Success indicator (`true`/`false`) |
| `analysis` | object | Per-cohort gap analysis (on success) |
| `error` | string | Error message (on failure) |
| `errorCode` | string | Machine-readable error code |

### Analysis Object Fields

#### Cohort Information

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `timestamp` | ISO-8601 | "2025-10-18T12:34:56.789Z" | Analysis timestamp |
| `cohortId` | string | "cohort-1729356000000-0" | Cohort identifier |
| `archetype` | string | "Fast Learner" | User archetype |
| `cohortSize` | number | 2 | Users in cohort |

#### Trait Vector

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `learningVelocity` | number | [0-1] | Speed of learning |
| `domainAffinity` | number | [0-1] | Domain expertise depth |
| `interactionFrequency` | number | [0-1] | Engagement level |
| `feedbackResponsiveness` | number | [0-1] | Response to feedback |
| `retentionStrength` | number | [0-1] | Knowledge retention |

#### Capability Metrics

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `totalDiscovered` | number | 242 | Total capabilities available |
| `totalActivated` | number | 168 | Currently activated |
| `activationRate` | string | "69.42%" | Percentage activated |

#### Gap Entry Fields

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `component` | string | - | Capability component name |
| `discovered` | number | - | Total methods in component |
| `activated` | number | - | Activated methods |
| `pending` | number | - | Methods to activate |
| `baseSeverity` | number | [0-1] | Pending/discovered ratio |
| `archetypeWeight` | number | [0.1-2.5] | Archetype multiplier |
| `archetypeModifiedSeverity` | number | [0-2.5] | Weighted severity |
| `urgency` | string | CRITICAL, HIGH, MEDIUM, LOW | Severity level |
| `lastActivation` | ISO-8601 | "2025-10-17T11:22:33.000Z" | Last update |
| `relevanceReason` | string | - | Context for gap importance |

#### Summary Fields

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `gapCount` | number | 15 | Total gaps for cohort |
| `criticalGaps` | number | 2 | Urgency="CRITICAL" count |
| `recommendedFocus` | string | "Focus on rapid-cycle..." | Training guidance |
| `estimatedROI` | number | 1.8 | Projected ROI multiplier |

#### Metadata

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `processedAt` | ISO-8601 | "2025-10-18T12:34:56.789Z" | Processing time |
| `cacheSource` | string | "cohort-traits" | Cache status |
| `capabilitiesSource` | string | "capabilities-server" | Data source |
| `executionTime` | string | "142ms" | Total latency |

---

## Archetype Profiles

### Fast Learner
```javascript
{
  archetype: "Fast Learner",
  keyWeights: {
    "learningVelocity": 2.0,      // Critical for speed
    "asyncPatterns": 2.0,          // Non-blocking essential
    "default": 1.5
  },
  recommendedFocus: "Focus on rapid-cycle training variants with high difficulty progression",
  baseROI: 1.8,
  characteristics: [
    "High learning velocity (0.7+)",
    "Responsive to feedback (0.85+)",
    "Prefers breadth over depth",
    "Benefits from challenge progression"
  ]
}
```

### Specialist
```javascript
{
  archetype: "Specialist",
  keyWeights: {
    "domainGap": 2.5,              // Highest priority
    "default": 1.0
  },
  recommendedFocus: "Prioritize deep dives into top critical gaps within your domain",
  baseROI: 1.6,
  characteristics: [
    "High domain affinity (0.75+)",
    "Methodical learning approach",
    "Strong retention (0.85+)",
    "Benefits from depth-first training"
  ]
}
```

### Power User
```javascript
{
  archetype: "Power User",
  keyWeights: {
    "frameworkAdoption": 1.8,      // High-volume expansion
    "default": 1.8
  },
  recommendedFocus: "Expand framework coverage with high-volume capability activation",
  baseROI: 1.4,
  characteristics: [
    "Very high interaction frequency (0.80+)",
    "Broad capability appetite",
    "Lower retention (compensated by volume)",
    "Benefits from breadth-first, rapid training"
  ]
}
```

### Long-term Retainer
```javascript
{
  archetype: "Long-term Retainer",
  keyWeights: {
    "asyncPatterns": 2.0,          // Foundation for durability
    "default": 2.0
  },
  recommendedFocus: "Build durable foundation with sustainable learning patterns",
  baseROI: 1.5,
  characteristics: [
    "Very high retention (0.90+)",
    "Prefers steady learning",
    "Long-term value compounding",
    "Benefits from foundational, consolidation-focused training"
  ]
}
```

### Generalist
```javascript
{
  archetype: "Generalist",
  keyWeights: {
    "default": 1.0                 // Baseline (no modification)
  },
  recommendedFocus: "Develop balanced capability foundation",
  baseROI: 1.0,
  characteristics: [
    "Balanced across all trait dimensions",
    "Mid-range learning velocity",
    "Standard retention",
    "Benefits from diverse, well-rounded training"
  ]
}
```

---

## Severity Levels

| Level | Range | Meaning | Training Urgency |
|-------|-------|---------|------------------|
| CRITICAL | 1.2 - 2.5 | Foundational gap, must close | Week 1 |
| HIGH | 0.8 - 1.2 | Important for progression | Week 1-2 |
| MEDIUM | 0.5 - 0.8 | Valuable improvement | Week 2-3 |
| LOW | 0 - 0.5 | Nice-to-have capability | Week 3+ |

---

## Usage Examples

### Example 1: Analyze Fast Learner Cohort

```bash
curl -X POST http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-fast-learner-001

# Response: Top gaps prioritize async-patterns and concurrency (2.0x weights)
# Expected outcome: 1.8x ROI on training investment
```

### Example 2: Retrieve Critical Gaps Only

```bash
curl "http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-specialist-design-001?urgency=CRITICAL"

# Response: Only CRITICAL severity gaps (1.2-2.5 range)
# Specialist example: design-systems, accessibility-patterns
```

### Example 3: Top 5 Gaps for Power User

```bash
curl "http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-power-user-001?limit=5"

# Response: Top 5 gaps ranked by framework-adoption weight (1.8x)
# Power User prefers breadth, so high-count components prioritized
```

### Example 4: Fresh Analysis (Bypass Cache)

```bash
curl -X POST "http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-1729356000000-0?fresh=true"

# Forces re-query of cohort traits and capabilities
# Use when you suspect stale cache
```

---

## Integration Guide

### With Training Server (Port 3001)

```javascript
// 1. Get per-cohort gaps
const gapAnalysis = await fetch(
  'http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-xxx',
  { method: 'POST' }
);
const { analysis } = await gapAnalysis.json();

// 2. Use top 3 gaps to suggest training variants
const trainingReq = {
  cohortId: analysis.cohortId,
  targetComponents: analysis.gaps.slice(0, 3).map(g => g.component),
  difficulty: analysis.archetype === 'Fast Learner' ? 'high' : 'medium',
  duration: analysis.estimatedROI > 1.6 ? 'long' : 'short'
};

const trainingRes = await fetch(
  'http://127.0.0.1:3001/api/v1/training/suggest-variants',
  { method: 'POST', body: JSON.stringify(trainingReq) }
);
```

### With Product Dev Server (Port 3006)

```javascript
// 1. Get per-cohort gaps
const { analysis } = await /* POST to gaps-per-cohort */;

// 2. Create workflow focused on top gaps
const workflowReq = {
  cohortId: analysis.cohortId,
  archetypeGaps: analysis.gaps.map(g => ({
    component: g.component,
    severity: g.archetypeModifiedSeverity,
    urgency: g.urgency
  })),
  recommendedFocus: analysis.recommendedFocus
};

const workflowRes = await fetch(
  'http://127.0.0.1:3006/api/v1/workflows/create',
  { method: 'POST', body: JSON.stringify(workflowReq) }
);
```

---

## Error Handling

### Recommended Error Strategy

```javascript
async function analyzeGapsWithFallback(cohortId) {
  try {
    const res = await fetch(
      `http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/${cohortId}`,
      { method: 'POST' }
    );
    
    if (!res.ok) {
      if (res.status === 404) {
        return { error: 'Cohort not found', cohortId };
      } else if (res.status === 500) {
        // Fall back to Phase 1 global analysis
        return fetchGlobalGaps();
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    }
    
    const { analysis } = await res.json();
    return analysis;
  } catch (err) {
    console.error('Gap analysis failed:', err);
    // Fallback logic
    return fetchGlobalGaps();
  }
}
```

---

## Rate Limiting (Future)

Not currently implemented, but reserved for future Phase 2.5:

```
Suggested limits:
- Per cohort: 100 requests/minute
- Per service: 1000 requests/minute
- Burst cache: 5-minute TTL (automatic)
```

---

## Testing Checklist

- ✅ POST endpoint returns 200 with full analysis
- ✅ GET endpoint returns same analysis as POST
- ✅ Archetype weights applied correctly
- ✅ Severity scores in [0-2.5] range
- ✅ Top 10 gaps returned, sorted by severity
- ✅ Urgency levels assigned correctly
- ✅ Recommended focus matches archetype
- ✅ Estimated ROI >= 1.0
- ✅ Cohort not found returns 404
- ✅ Service error returns 500
- ✅ Invalid cohort ID returns 400

---

## Status & Support

**Implementation Status**: ✅ Complete  
**API Version**: v1  
**Backward Compatibility**: ✅ 100% (Phase 1 unchanged)  
**Production Ready**: ✅ Yes  

---

**Commit**: 637f434  
**Branch**: `feature/phase-2-sprint-2-cohort-gaps`  
**Next API**: Task 4 - Cohort-Specific Workflow Suggestions (POST + GET /workflows-per-cohort/:cohortId)
