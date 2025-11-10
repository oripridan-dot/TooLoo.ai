# Phase 2: Learning & Provider Services Implementation
## Week 2 - Learning Service & Provider Service Build

**Status:** 🟢 IN PROGRESS  
**Timeline:** Week 2 (Nov 11-17, 2025)  
**Target:** 1,200+ lines of production code + 50+ tests  

---

## Overview

Phase 2 builds the two core domain services that handle AI training and provider management. These services operate independently but are orchestrated through the Event Bus.

### Deliverables
1. **Learning Service** (Port 3001) - Training, mastery, challenges
2. **Provider Service** (Port 3200) - Selection, budget, costs
3. **Integration tests** - Event-driven interactions
4. **Documentation** - Architecture, API, operations

---

## 1. Learning Service (Port 3001)

### Purpose
- Manage training sessions and rounds
- Track mastery progression and scores
- Execute challenges and skill assessments
- Publish learning events to Event Bus

### Architecture

```
learningService
├── State Management
│  ├── Rounds (in-memory + Event Bus)
│  ├── Mastery tracking (per domain, 0-100)
│  └── Challenge pool (preloaded)
│
├── Core Domains
│  ├── Training (rounds, sessions)
│  ├── Mastery (progression, skills)
│  └── Challenges (execution, scoring)
│
└── Event Integration
   ├── Emit: training.started, training.completed, challenge.started, etc
   └── Subscribe: provider.selected, provider.budget.exceeded
```

### Key Classes

#### 1. TrainingEngine
```javascript
class TrainingEngine {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.activeRounds = new Map();
    this.masteryScores = new Map();
  }

  // Create training session
  async startTraining(userId, focusArea) {
    // Emit: training.started
    // Return: roundId, initialPrompt
  }

  // Complete a round
  async completeRound(roundId, response) {
    // Score response
    // Update mastery
    // Emit: training.paused or training.completed
  }

  // Get mastery metrics
  getMasteryMetrics(userId) {
    // Return: {domain -> score, totalProgress}
  }
}
```

#### 2. ChallengeEngine
```javascript
class ChallengeEngine {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.challenges = this.loadChallenges();
  }

  // Start challenge for skill
  async startChallenge(userId, skillId, difficulty) {
    // Select challenge from pool
    // Emit: challenge.started
    // Return: challengeContent
  }

  // Grade challenge response
  async gradeChallenge(challengeId, response) {
    // Evaluate response
    // Emit: challenge.completed
    // Return: score, feedback
  }
}
```

### Events Published
- `training.started` - New training session
- `training.paused` - Session paused mid-round
- `training.completed` - Session finished
- `mastery.improved` - Skill mastery increased
- `challenge.started` - Challenge began
- `challenge.completed` - Challenge graded

### API Endpoints

```
POST   /api/v1/training/start      - Start training session
POST   /api/v1/training/round      - Complete round
GET    /api/v1/training/progress   - Get mastery metrics
POST   /api/v1/challenges/start    - Start challenge
POST   /api/v1/challenges/grade    - Submit challenge response
GET    /api/v1/training/health     - Service health
```

### Test Coverage (25+ tests)
- [ ] TrainingEngine initialization
- [ ] Start training (emit events)
- [ ] Complete round (scoring, mastery update)
- [ ] Challenge execution (scoring, feedback)
- [ ] Event subscription (provider events)
- [ ] Mastery tracking (progression over time)
- [ ] Error handling (invalid inputs, service down)

---

## 2. Provider Service (Port 3200)

### Purpose
- Select best provider for query based on cost/quality
- Manage provider budgets and quotas
- Track costs and spending
- Handle burst/priority requests
- Publish provider events to Event Bus

### Architecture

```
providerService
├── Provider Management
│  ├── Ollama (local, free)
│  ├── Anthropic (Claude)
│  ├── OpenAI (GPT)
│  ├── Gemini (Google)
│  └── Others
│
├── Selection Logic
│  ├── Cost optimization
│  ├── Quality ranking
│  └── Availability checks
│
├── Budget Management
│  ├── Per-provider limits
│  ├── Remaining quotas
│  └── Burst capacity
│
└── Event Integration
   ├── Emit: provider.selected, provider.budget.exceeded, provider.priority.changed
   └── Subscribe: training.started (to handle provider requests)
```

### Key Classes

#### 1. ProviderSelector
```javascript
class ProviderSelector {
  constructor(eventBus, config) {
    this.eventBus = eventBus;
    this.providers = this.initializeProviders(config);
    this.costHistory = new Map();
  }

  // Select best provider for query
  async selectProvider(query, options = {}) {
    // Check available providers
    // Rank by cost + quality + availability
    // Emit: provider.selected
    // Return: {providerId, endpoint, model}
  }

  // Get provider status
  getProviderStatus() {
    // Return: {provider -> {available, costPerToken, requestCount}}
  }
}
```

#### 2. BudgetManager
```javascript
class BudgetManager {
  constructor(eventBus, config) {
    this.eventBus = eventBus;
    this.budgets = config.budgets; // per provider
    this.spent = new Map();
  }

  // Check budget availability
  canAfford(providerId, estimatedCost) {
    // Check remaining budget
    // Return: boolean
  }

  // Record spending
  async recordCost(providerId, cost) {
    // Update spent amount
    // Emit: provider.budget.exceeded if limit hit
  }

  // Get budget status
  getBudgetStatus() {
    // Return: {provider -> {total, spent, remaining, percentUsed}}
  }
}
```

### Events Published
- `provider.selected` - Provider chosen for query
- `provider.query.started` - Query sent to provider
- `provider.query.completed` - Provider returned response
- `provider.budget.exceeded` - Budget limit hit
- `provider.priority.changed` - Priority weights adjusted

### API Endpoints

```
POST   /api/v1/providers/select    - Select provider for query
GET    /api/v1/providers/status    - Provider availability status
GET    /api/v1/providers/costs     - Cost summary by provider
POST   /api/v1/budget/check        - Check budget availability
GET    /api/v1/budget/status       - Budget consumption report
GET    /api/v1/providers/health    - Service health
```

### Test Coverage (25+ tests)
- [ ] Provider initialization and status
- [ ] Selection logic (cost ranking, availability)
- [ ] Budget checking and enforcement
- [ ] Cost tracking and reporting
- [ ] Event publishing (provider.selected, budget.exceeded)
- [ ] Event subscription (training requests)
- [ ] Error handling (all providers down, budget exhausted)

---

## 3. Integration Points

### Event Flow: Training Triggers Provider

```
[Learning Service]
  startTraining()
  └─> emit training.started
      └─> [Event Bus]
          └─> [Provider Service] subscribes
              selectProvider()
              └─> emit provider.selected
                  └─> [Training Service] subscribes
                      recordProvider()
```

### Event Flow: Budget Limit

```
[Provider Service]
  recordCost()
  └─> if (spent > limit)
      └─> emit provider.budget.exceeded
          └─> [Event Bus]
              └─> [Training Service] subscribes
                  pauseTraining() (use cheaper provider)
```

---

## 4. Implementation Checklist

### Learning Service
- [ ] Create `servers/learning-service.js` (300+ lines)
  - TrainingEngine class
  - ChallengeEngine class
  - Event subscription setup
  - Express endpoints
  
- [ ] Create `lib/training-engine.js` (200+ lines)
  - Training logic
  - Scoring algorithm
  - Mastery calculation
  
- [ ] Create `lib/challenge-engine.js` (200+ lines)
  - Challenge pool
  - Grading logic
  - Feedback generation

### Provider Service
- [ ] Create `servers/provider-service.js` (300+ lines)
  - ProviderSelector class
  - BudgetManager class
  - Event subscription
  - Express endpoints
  
- [ ] Create `lib/provider-selector.js` (200+ lines)
  - Provider ranking algorithm
  - Cost optimization
  - Availability checks
  
- [ ] Create `lib/budget-manager.js` (150+ lines)
  - Budget tracking
  - Cost recording
  - Quota enforcement

### Testing
- [ ] Create `tests/unit/training-engine.test.js` (15 tests)
- [ ] Create `tests/unit/challenge-engine.test.js` (10 tests)
- [ ] Create `tests/unit/provider-selector.test.js` (15 tests)
- [ ] Create `tests/unit/budget-manager.test.js` (10 tests)
- [ ] Create `tests/integration/learning-provider.test.js` (15 tests)

### Documentation
- [ ] PHASE_2_QUICK_START.md (how to run)
- [ ] LEARNING_SERVICE_API.md (endpoints, examples)
- [ ] PROVIDER_SERVICE_API.md (endpoints, examples)
- [ ] PHASE_2_TESTING_GUIDE.md (test procedures)

---

## 5. Configuration

### Provider Config
```javascript
const providerConfig = {
  budgets: {
    ollama: { monthly: 999999, perRequest: 0 },
    anthropic: { monthly: 100, perRequest: 0.01 },
    openai: { monthly: 50, perRequest: 0.005 },
  },
  priorities: {
    ollama: 1.0,      // Always try first (free)
    anthropic: 0.8,
    openai: 0.6,
  },
  timeouts: {
    ollama: 30000,
    anthropic: 15000,
    openai: 15000,
  }
};
```

### Learning Config
```javascript
const learningConfig = {
  rounds: {
    maxDuration: 3600000,  // 1 hour
    defaultCount: 5,
  },
  mastery: {
    threshold: 80,         // % to pass
    decayRate: 0.02,       // Weekly decay
  },
  challenges: {
    pool: 100,
    difficulties: ['easy', 'medium', 'hard'],
  }
};
```

---

## 6. Success Criteria

**Code:**
- [ ] 1,200+ lines production code
- [ ] 50+ comprehensive tests
- [ ] 0 linting errors
- [ ] Full error handling

**Architecture:**
- [ ] Event-driven integration
- [ ] Service independence
- [ ] Clear domain boundaries

**Testing:**
- [ ] 100% unit test pass rate
- [ ] Integration tests validate event flow
- [ ] Manual testing confirms endpoints

**Documentation:**
- [ ] Complete API documentation
- [ ] Testing guide with examples
- [ ] Configuration reference

---

## 7. Timeline

| Task | Duration | Status |
|------|----------|--------|
| Learning Service Core | 2-3 hours | 🔄 |
| Provider Service Core | 2-3 hours | ⏳ |
| Unit Tests (50+) | 2-3 hours | ⏳ |
| Integration Tests | 1-2 hours | ⏳ |
| Documentation | 1-2 hours | ⏳ |
| Manual Testing & Fixes | 1-2 hours | ⏳ |
| **Total Phase 2** | **~12-15 hours** | 🔄 |

---

## 8. Next Steps

1. ✅ Phase 1 verified (89/89 tests passing)
2. 🔄 **Start Learning Service** (TrainingEngine, ChallengeEngine)
3. Build Provider Service (ProviderSelector, BudgetManager)
4. Create unit tests for both services
5. Build integration tests for event flow
6. Document APIs and testing procedures
7. Manual testing and refinement

---

**Ready to proceed with Learning Service implementation?**
