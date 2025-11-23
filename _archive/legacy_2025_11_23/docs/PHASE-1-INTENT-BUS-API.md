# TooLoo.ai – Phase 1: Intent Bus & Multi-Model Tournament API

## Overview

Phase 1 establishes the **Intent Bus** (central nervous system) and **Cross-Model Tournament** (adjudication engine) for the Parallel Multi-Station OS.

### Key Components

1. **Intent Bus** (`engine/intent-bus.js`)
   - Normalizes all user inputs into rich Intent Packets
   - Enriches with screen context, segmentation memory, and metadata
   - Routes through orchestrator endpoints

2. **Model Chooser** (`engine/model-chooser.js`)
   - Analyzes intent complexity
   - Builds execution plans with 3 concurrency lanes: fast, focus, audit
   - Applies provider priority: Ollama → Anthropic → OpenAI → Gemini → LocalAI → DeepSeek

3. **Confidence Scorer** (`engine/confidence-scorer.js`)
   - Multi-dimensional scoring: deterministic (30%), grounding (20%), critic (15%), semantic (15%), reliability (10%), cost (-10%)
   - Implements retry logic and ensemble merge strategies
   - Tracks confidence curves and audit trails

4. **Cup Tournament Server** (enhanced `servers/cup-server.js`)
   - Runs cross-model competitions
   - Ranks candidates by confidence score
   - Optionally merges compatible candidates (ensemble)
   - Determines fate: accept/retry/escalate

---

## API Endpoints

### Intent Bus (Orchestrator on port 3123)

#### 1. Create & Process Intent
**POST** `/api/v1/intent/create`

Create a new intent and build an execution plan.

**Request:**
```json
{
  "prompt": "Create a TypeScript class for managing user preferences with persistence",
  "userId": "user123",
  "sessionId": "sess_abc123",
  "priority": "normal",
  "budgetUsd": 0.10,
  "screenContext": {
    "screenshot": "base64_image_data",
    "ocrTags": ["VS Code", "TypeScript", "File Explorer"]
  },
  "segmentationContext": [
    "Tier 1: User recently asked about persistence layers",
    "Tier 2: Previous session: designing ORM abstractions",
    "Tier 3: Profile: prefers type-safe implementations"
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "intentId": "intent_xyz789",
  "status": "running",
  "confidence": 0.0,
  "executionPlan": {
    "complexity": "moderate",
    "taskType": "code",
    "lanes": {
      "focus": [
        {
          "id": "cand_1",
          "provider": "anthropic",
          "model": "claude-3-5-haiku-20241022",
          "lane": "focus",
          "estimatedCostUsd": 0.008,
          "estimatedTimeMs": 1200
        },
        {
          "id": "cand_2",
          "provider": "openai",
          "model": "gpt-4o-mini",
          "lane": "focus",
          "estimatedCostUsd": 0.006,
          "estimatedTimeMs": 1500
        }
      ],
      "audit": [...]
    },
    "totalEstimatedCostUsd": 0.020,
    "totalEstimatedTimeMs": 2700,
    "tournamentSize": 3,
    "minConfidence": 0.82
  },
  "augmentedPrompt": "Create a TypeScript class... [CONTEXT: Tier 1: User recently asked about...]"
}
```

---

#### 2. Retrieve Intent by ID
**GET** `/api/v1/intent/{id}`

Fetch a specific intent and its status.

**Response:**
```json
{
  "ok": true,
  "intent": {
    "id": "intent_xyz789",
    "prompt": "Create a TypeScript class...",
    "status": "complete",
    "confidence": 0.87,
    "executionPlan": { ... },
    "artifacts": 3,
    "verdicts": 3,
    "elapsedMs": 4521
  }
}
```

---

#### 3. Get Intent History
**GET** `/api/v1/intent/history?limit=10&sessionId=sess_abc123`

Retrieve past intents in a session.

**Query Parameters:**
- `limit` (default: 10) – max intents to return
- `sessionId` (optional) – filter by session

**Response:**
```json
{
  "ok": true,
  "count": 5,
  "intents": [
    {
      "id": "intent_xyz789",
      "timestamp": "2025-10-20T14:35:22Z",
      "prompt": "Create a TypeScript class...",
      "status": "complete",
      "confidence": 0.87,
      "elapsedMs": 4521
    }
  ]
}
```

---

### Model Chooser (Orchestrator)

#### 4. Get Chooser Statistics
**GET** `/api/v1/models/chooser/stats`

View provider usage, costs, and historical performance.

**Response:**
```json
{
  "ok": true,
  "stats": {
    "totalPlan": 42,
    "totalCandidates": 126,
    "avgConfidence": 0.84,
    "avgCostUsd": 0.018,
    "providerUsage": {
      "anthropic": {
        "count": 54,
        "totalCostUsd": 1.23,
        "totalLatencyMs": 45000,
        "successCount": 52
      },
      "ollama": {
        "count": 48,
        "totalCostUsd": 0,
        "totalLatencyMs": 18000,
        "successCount": 45
      }
    }
  }
}
```

---

### Confidence Scorer (Orchestrator)

#### 5. Score an Artifact
**POST** `/api/v1/models/score`

Evaluate a model-generated artifact and get a confidence score + fate decision.

**Request:**
```json
{
  "artifact": {
    "id": "art_123",
    "nodeId": "node_456",
    "type": "code",
    "content": "export class UserPreferences { ... }",
    "modelSource": "anthropic"
  },
  "evidence": {
    "deterministicChecks": {
      "typescript_compile": true,
      "linter": true,
      "tests_pass": true
    },
    "sources": [
      { "text": "localStorage API", "url": "https://mdn.io/...", "confidence": 0.95 }
    ],
    "claims": [
      "We use localStorage for client-side persistence",
      "The class implements IDisposable pattern"
    ],
    "criticAgreement": {
      "claude": 0.88,
      "gpt4": 0.85
    },
    "semanticMetrics": {
      "fluencyScore": 0.9,
      "relevanceScore": 0.92
    },
    "modelProvider": "anthropic",
    "historicalSuccess": 0.92,
    "costUsd": 0.008,
    "attempt": 1
  }
}
```

**Response:**
```json
{
  "ok": true,
  "score": {
    "overall": 0.89,
    "components": {
      "deterministic": 1.0,
      "grounding": 0.9,
      "critic": 0.88,
      "semantic": 0.91,
      "reliability": 0.92,
      "cost": 0.88
    },
    "breakdown": { ... }
  },
  "fate": {
    "nodeId": "node_456",
    "attempt": 1,
    "score": 0.89,
    "decision": "accept",
    "reason": "Confidence 89.0% meets threshold 82.0%"
  }
}
```

---

#### 6. Get Retry Statistics
**GET** `/api/v1/confidence/retry-stats/{nodeId}`

Track retry history and performance curves for a node.

**Response:**
```json
{
  "ok": true,
  "nodeId": "node_456",
  "stats": {
    "totalAttempts": 2,
    "attempts": [
      {
        "attempt": 1,
        "provider": "anthropic",
        "score": 0.76,
        "costUsd": 0.008,
        "success": true,
        "timestamp": "2025-10-20T14:35:22Z"
      },
      {
        "attempt": 2,
        "provider": "openai",
        "score": 0.89,
        "costUsd": 0.006,
        "success": true,
        "timestamp": "2025-10-20T14:35:28Z"
      }
    ],
    "avgScore": 0.825,
    "totalCost": 0.014,
    "successRate": 1.0
  }
}
```

---

### Cup Tournament (Cup Server on port 3005)

#### 7. Create Tournament
**POST** `/api/v1/cup/tournament/create`

Run a cross-model tournament to evaluate and adjudicate multiple artifact candidates.

**Request:**
```json
{
  "nodeId": "node_code_impl_1",
  "candidates": [
    {
      "id": "cand_claude",
      "provider": "anthropic",
      "model": "claude-3-5-haiku",
      "content": "export class UserPrefs { ... }",
      "costUsd": 0.008,
      "latencyMs": 1200
    },
    {
      "id": "cand_gpt4",
      "provider": "openai",
      "model": "gpt-4o-mini",
      "content": "export class UserPreferences { ... }",
      "costUsd": 0.006,
      "latencyMs": 1500
    },
    {
      "id": "cand_ollama",
      "provider": "ollama",
      "model": "llama3.2",
      "content": "export class UserPref { ... }",
      "costUsd": 0,
      "latencyMs": 800
    }
  ],
  "evidence": {
    "deterministicChecks": {
      "typescript_compile": true,
      "linter": true,
      "tests_pass": true
    },
    "sources": [
      { "text": "localStorage API", "url": "https://mdn.io/...", "confidence": 0.95 }
    ],
    "claims": [
      "We use localStorage for client-side persistence"
    ],
    "criticAgreement": {
      "reviewer1": 0.88,
      "reviewer2": 0.85
    },
    "semanticMetrics": {
      "fluencyScore": 0.9,
      "relevanceScore": 0.92
    },
    "modelProvider": "anthropic",
    "historicalSuccess": 0.92
  }
}
```

**Response:**
```json
{
  "ok": true,
  "tournament": {
    "id": "tourn_abc123",
    "nodeId": "node_code_impl_1",
    "results": [
      {
        "candidateId": "cand_claude",
        "provider": "anthropic",
        "score": 0.89,
        "costUsd": 0.008
      },
      {
        "candidateId": "cand_gpt4",
        "provider": "openai",
        "score": 0.85,
        "costUsd": 0.006
      },
      {
        "candidateId": "cand_ollama",
        "provider": "ollama",
        "score": 0.71,
        "costUsd": 0
      }
    ],
    "winner": {
      "candidateId": "cand_claude",
      "provider": "anthropic",
      "score": 0.89,
      "costUsd": 0.008
    },
    "mergedResult": null,
    "fate": "accept"
  }
}
```

---

#### 8. Retrieve Tournament
**GET** `/api/v1/cup/tournament/{id}`

Get full details of a completed tournament.

**Response:** (full tournament object with all candidates, scores, and adjudication logic)

---

#### 9. Cup Statistics
**GET** `/api/v1/cup/stats`

Overall tournament system health and trends.

**Response:**
```json
{
  "ok": true,
  "stats": {
    "totalTournaments": 42,
    "totalCandidates": 126,
    "averageWinnerScore": 0.84,
    "mergedResults": 8,
    "escalations": 2
  }
}
```

---

## Default Configuration

Set via environment variables or directly in orchestrator startup:

```bash
# Confidence & Tournament Settings
CUP_CONFIDENCE_THRESHOLD=0.82          # Min score to accept artifact
CUP_MAX_RETRIES=2                      # Retry attempts per node
CUP_ENSEMBLE_THRESHOLD=0.65            # Min score for ensemble merge
CUP_ENSEMBLE_DIFF_THRESHOLD=0.12       # Max score diff for merging

# Model Chooser Settings
TOURNAMENT_SIZE=3                      # Candidates per node
MAX_PARALLEL_NODES=8                   # Concurrency limit
GLOBAL_TIME_CAP_MS=360000              # 6 minutes per prompt
BUDGET_CAP_USD=0.50                    # Max spend per intent

# Provider Priority (auto-selected)
# 1. Ollama (free, fast, local)
# 2. Anthropic Claude Haiku (high quality)
# 3. OpenAI GPT-4 mini (reliable)
# 4. Gemini (creative, cheap)
# 5. LocalAI (free, compatible)
# 6. DeepSeek (fallback, cheap)
```

---

## Workflow: Request → Tournament → Confidence

### Example: "Write a TypeScript class for user preferences"

1. **User sends intent** → `POST /api/v1/intent/create`
2. **Orchestrator enriches** with screen context + segmentation
3. **Model Chooser builds plan**: 3 candidates (Claude, GPT-4, Ollama)
4. **Models execute in parallel** (fast-lane via Ollama, focus-lane via Claude + GPT-4)
5. **Cup tournament evaluates** each artifact:
   - Deterministic checks: ✓ TypeScript compiles, ✓ linter passes, ✓ tests pass
   - Grounding: ✓ citations present
   - Critic: ✓ Claude: 0.88, GPT-4: 0.85
   - Semantic: ✓ fluency 0.9, relevance 0.92
   - Scoring → Claude wins with 0.89 confidence
6. **Confidence Scorer** determines fate:
   - 0.89 > 0.82 threshold → **Accept**
7. **Result returned** with winner, cost ($0.008), audit trail

---

## Error Handling & Retry Logic

**Confidence < 0.82?** → Retry with different provider
**Still < 0.82 after 2 attempts?** → Escalate for human review
**Compatible candidates (0.65–0.77)?** → Attempt ensemble merge

---

## Next Steps (Phase 2)

- Integrate DAG builder (task decomposition)
- Add screen-capture loop with OCR
- Implement artifact ledger (provenance tracking)
- Wire up repo auto-org (branch scaffolding)
- Build 4-panel workstation UI
