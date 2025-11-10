# Phase 4 Implementation Plan - Analytics & Orchestration Services

## Overview

Phase 4 completes the TooLoo.ai architecture with two critical services and stabilization:
- **Analytics Service (Port 3300)**: User engagement, learning metrics, achievement badges
- **Orchestration Service (Port 3100)**: Intent routing, workflow DAGs, task execution
- **Stabilization**: End-to-end integration, performance tuning, security hardening

---

## Phase 4a: Analytics Service (Port 3300)

### Purpose
Track learning progress, engagement metrics, and award achievements through badges and milestones.

### Architecture

#### Class 1: MetricsCollector (280 lines)
```javascript
class MetricsCollector {
  // Metrics tracking
  trackEngagement(userId, activity, metadata)
  trackProgress(userId, progressType, value)
  recordAchievement(userId, achievementType, details)
  
  // Aggregation
  getUserMetrics(userId, timeframe)
  getEngagementScore(userId)
  getProgressMetrics(userId)
  getLearningPath(userId)
  
  // Statistics
  getGlobalMetrics(timeframe)
  getTopPerformers(limit, timeframe)
  getMetricsTrend(userId, metric, days)
}
```

**Key Features**:
- Session tracking (duration, frequency, consistency)
- Learning progress (challenges completed, mastery level)
- Engagement scoring (participation, performance)
- Time-based aggregation (daily, weekly, monthly)
- Percentile ranking against peers

**Events to Emit**:
- `analytics.engagement-tracked`
- `analytics.progress-updated`
- `analytics.achievement-unlocked`

#### Class 2: BadgeSystem (220 lines)
```javascript
class BadgeSystem {
  // Badge management
  awardBadge(userId, badgeType, criteria)
  revokeBadge(userId, badgeId)
  getBadges(userId)
  getAllBadges()
  
  // Badge types
  createCustomBadge(definition)
  checkBadgeEligibility(userId, badgeType)
  
  // Streaming
  getUserBadgeProgress(userId)
}
```

**Badge Types** (12 built-in):
- `first-challenge`: Complete first challenge
- `challenge-streak-7`: 7 consecutive days
- `challenge-streak-30`: 30 consecutive days
- `code-master`: 100 challenges completed
- `speed-demon`: Complete challenge in <2min
- `quality-focus`: Score 90+ on 5 challenges
- `language-polyglot`: Challenges in 5+ languages
- `provider-switcher`: Use 3+ different providers
- `night-owl`: Complete challenge between 8pm-6am
- `early-bird`: Complete challenge before 8am
- `power-hour`: 10 challenges in 1 hour
- `consistency-king`: 30-day streak

**Events to Emit**:
- `analytics.badge-awarded`
- `analytics.badge-progress`

#### Class 3: AnalyticsService (300 lines)
- Express.js server on port 3300
- 10+ REST endpoints
- Event Bus integration
- Metrics aggregation and reporting

### Endpoints

**Metrics**:
- `GET /api/v1/analytics/user/:userId/metrics` - Get user metrics
- `GET /api/v1/analytics/user/:userId/progress` - Get progress details
- `GET /api/v1/analytics/user/:userId/engagement-score` - Engagement score
- `GET /api/v1/analytics/user/:userId/learning-path` - Learning trajectory

**Badges**:
- `GET /api/v1/analytics/user/:userId/badges` - List earned badges
- `GET /api/v1/analytics/user/:userId/badges/progress` - Badge progress
- `GET /api/v1/analytics/badges` - All available badges

**Global**:
- `GET /api/v1/analytics/global/metrics` - System-wide metrics
- `GET /api/v1/analytics/global/top-performers` - Leaderboard
- `GET /api/v1/analytics/global/trends` - Trending metrics

### Testing (25+ tests)

**MetricsCollector Tests** (12 tests):
- Track engagement for different activity types
- Aggregate metrics over time
- Calculate engagement scores correctly
- Handle missing data gracefully
- Compute percentile rankings

**BadgeSystem Tests** (10 tests):
- Award badges on eligibility
- Check badge criteria
- Prevent double awards
- Revoke badges
- Track progress toward badges

**Service Integration Tests** (5+ tests):
- Badge award triggers event
- Metrics persist correctly
- Leaderboard rankings accurate
- Time-based aggregation works

---

## Phase 4b: Orchestration Service (Port 3100)

### Purpose
Route user intents to appropriate services, execute complex workflows as DAGs, and schedule recurring tasks.

### Architecture

#### Class 1: IntentRouter (260 lines)
```javascript
class IntentRouter {
  // Intent analysis
  parseIntent(userInput)
  classifyIntent(intent)
  extractParameters(intent)
  
  // Routing
  routeIntent(intent)
  executeIntent(intent, context)
  
  // Intent types
  getAvailableIntents()
  registerIntentHandler(intentType, handler)
}
```

**Intent Types** (8 initial):
- `learn.start-challenge`: Start a coding challenge
- `learn.review-topic`: Review learning materials
- `provider.change`: Switch AI provider
- `provider.check-budget`: Check spending
- `context.load-repo`: Load GitHub repository
- `context.search`: Search code
- `analytics.show-stats`: Display user stats
- `workflow.create`: Define custom workflow

**Events to Emit**:
- `orchestration.intent-parsed`
- `orchestration.intent-routed`
- `orchestration.intent-executing`

#### Class 2: WorkflowEngine (280 lines)
```javascript
class WorkflowEngine {
  // DAG management
  createWorkflow(definition)
  deleteWorkflow(workflowId)
  getWorkflow(workflowId)
  
  // Execution
  executeWorkflow(workflowId, input)
  executeStep(stepId, input)
  
  // DAG operations
  validateDAG(definition)
  computeExecutionOrder(dag)
  parallelizeSteps(dag)
  
  // Status tracking
  getExecutionStatus(executionId)
  getExecutionHistory(workflowId)
}
```

**Workflow Definition Structure**:
```javascript
{
  id: "workflow123",
  name: "Code Review Flow",
  description: "Load repo → Analyze → Generate Report",
  steps: [
    {
      id: "load",
      service: "context",
      action: "load-repo",
      input: { owner, repo }
    },
    {
      id: "analyze",
      service: "context",
      action: "analyze",
      input: { repo: "from:load" },
      depends_on: ["load"]
    },
    {
      id: "report",
      service: "analytics",
      action: "generate-report",
      input: { analysis: "from:analyze" },
      depends_on: ["analyze"]
    }
  ]
}
```

**Events to Emit**:
- `orchestration.workflow-started`
- `orchestration.step-completed`
- `orchestration.workflow-completed`

#### Class 3: TaskScheduler (200 lines)
```javascript
class TaskScheduler {
  // Scheduling
  scheduleTask(task, schedule)
  cancelTask(taskId)
  
  // Recurring tasks
  createRecurringTask(definition)
  updateRecurringTask(taskId, changes)
  
  // Execution
  executePending()
  getScheduledTasks()
  getTaskHistory(taskId)
}
```

**Cron Patterns Support**:
- `daily`: Every day at specific time
- `weekly`: Specific day and time
- `monthly`: Specific date
- `custom`: Full cron expression

#### Class 4: OrchestrationService (320 lines)
- Express.js server on port 3100
- 12+ REST endpoints
- Event Bus integration
- DAG visualization support

### Endpoints

**Intent Routing**:
- `POST /api/v1/intent/parse` - Parse user intent
- `POST /api/v1/intent/execute` - Execute intent
- `GET /api/v1/intent/available` - List available intents

**Workflows**:
- `POST /api/v1/workflow` - Create workflow
- `GET /api/v1/workflow/:workflowId` - Get workflow
- `POST /api/v1/workflow/:workflowId/execute` - Execute workflow
- `GET /api/v1/workflow/:workflowId/executions` - Execution history
- `DELETE /api/v1/workflow/:workflowId` - Delete workflow

**Scheduling**:
- `POST /api/v1/task/schedule` - Schedule task
- `GET /api/v1/task/scheduled` - List scheduled tasks
- `DELETE /api/v1/task/:taskId` - Cancel task

### Testing (30+ tests)

**IntentRouter Tests** (10 tests):
- Parse various intent types
- Route intents to correct services
- Extract parameters correctly
- Handle ambiguous intents
- Fallback for unknown intents

**WorkflowEngine Tests** (12 tests):
- Create and store workflows
- Validate DAG structure
- Execute in correct order
- Handle dependencies
- Track execution status
- Recover from failures

**TaskScheduler Tests** (8+ tests):
- Schedule tasks correctly
- Execute on schedule
- Handle cron patterns
- Cancel scheduled tasks
- Maintain history

---

## Phase 4c: Stabilization & Integration

### End-to-End Testing (20+ tests)

**Cross-Service Flows**:
1. User completes challenge → Provider selected → Analytics updated → Badge awarded
2. User requests code search → Repository loaded → Context indexed → Results returned
3. User creates workflow → Services orchestrated → Results aggregated → Report generated

**Event Bus Verification**:
- All events properly emitted
- Subscribers receive events
- Event ordering maintained
- Dead letter queue for failed events

### Performance Optimization

**Caching Strategy**:
- User metrics cached (5-minute TTL)
- Badge definitions cached (static)
- Workflow definitions cached (1-hour TTL)
- Intent routing cache (10-minute TTL)

**Query Optimization**:
- Index frequent queries
- Batch database writes
- Compress event logs
- Archive old data

### Security Hardening

**Input Validation**:
- Validate all user inputs
- Sanitize workflow definitions
- Prevent intent injection
- Rate limit intent processing

**Access Control**:
- User can only view own metrics
- Admin-only workflow creation
- Badge awards immutable
- Audit all state changes

### Documentation

**User Guides**:
- Intent syntax and examples
- Workflow creation guide
- Badge system explanation
- Analytics interpretation

**Developer Guides**:
- Intent registration API
- Workflow definition schema
- Event flow diagrams
- Service integration checklist

---

## Implementation Timeline

### Day 1: Analytics Service
- [ ] MetricsCollector (280 lines)
- [ ] BadgeSystem (220 lines)
- [ ] AnalyticsService server (300 lines)
- [ ] Analytics tests (25 tests)
- **Target**: 800 lines, 25 tests, 100% pass rate

### Day 2: Orchestration Service
- [ ] IntentRouter (260 lines)
- [ ] WorkflowEngine (280 lines)
- [ ] TaskScheduler (200 lines)
- [ ] OrchestrationService server (320 lines)
- [ ] Orchestration tests (30 tests)
- **Target**: 1,060 lines, 30 tests, 100% pass rate

### Day 3: Stabilization
- [ ] End-to-end integration tests (20 tests)
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Documentation (3 guides)
- [ ] Final deployment validation
- **Target**: 20 tests, 100% pass rate, production ready

---

## Success Criteria

### Code Quality
- [ ] 1,860+ lines of production code
- [ ] 75+ comprehensive tests
- [ ] 100% test pass rate
- [ ] 0 linting errors
- [ ] Full Event Bus integration

### Coverage
- [ ] All 9 services operational
- [ ] All 35+ endpoints documented
- [ ] All event types flowing through bus
- [ ] All stakeholder workflows supported

### Deployment Readiness
- [ ] Health checks for all services
- [ ] Error handling throughout
- [ ] Performance optimization
- [ ] Security validation
- [ ] Rollback procedures

### Architecture Completion
- [ ] 4-week roadmap 100% complete
- [ ] Event-driven microservices pattern
- [ ] Full microservice topology (9 services)
- [ ] Production-grade code quality

---

## Files to Create

### Analytics Service
- `lib/metrics-collector.js` (280 lines)
- `lib/badge-system.js` (220 lines)
- `servers/analytics-service.js` (300 lines)
- `tests/analytics-service.test.js` (25 tests)

### Orchestration Service
- `lib/intent-router.js` (260 lines)
- `lib/workflow-engine.js` (280 lines)
- `lib/task-scheduler.js` (200 lines)
- `servers/orchestration-service.js` (320 lines)
- `tests/orchestration-service.test.js` (30 tests)

### Integration & Docs
- `tests/e2e-workflows.test.js` (20+ tests)
- `PHASE_4_COMPLETE.md` (2,000+ lines)
- `PHASE_4_INDEX.md` (900+ lines)
- Updated `package.json` (new scripts)

---

## Success Metrics

**Code**: 3,536 (Phase 1-3) + 1,860 (Phase 4) = **5,396 total lines**
**Tests**: 266 (Phase 1-3) + 75 (Phase 4) = **341 total tests**
**Services**: **9 microservices** fully operational
**Endpoints**: **50+ REST endpoints** across all services
**Quality**: **100% test pass rate**, **0 linting errors**, **0 critical issues**

**Architecture Score**: ✅ Production-grade, event-driven, scalable microservices platform

---

## Next Phase (Post-Phase 4)

### Production Deployment
- Docker containerization
- Kubernetes orchestration
- CI/CD pipeline
- Monitoring & alerting
- User authentication

### Feature Expansion
- Advanced analytics (cohort analysis, retention)
- Workflow marketplace (share workflows)
- Custom badge creation
- AI-powered intent detection
- Multi-user collaboration

### Scale & Performance
- Database optimization
- Caching layers
- Load balancing
- Service discovery
- Circuit breakers

---

**Status**: Ready for Phase 4 implementation
**Estimated Duration**: 3 days (full-time development)
**Target Completion**: November 10, 2025 EOD
