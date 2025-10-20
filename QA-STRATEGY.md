# TooLoo.ai QA Strategy & 100% Coverage Plan

**Status:** October 20, 2025 | Phase 2 Complete | QA Coverage: ~30% → Goal: 95%+

---

## Executive Summary

**Current State:**
- 55 tests exist (Phase 1 + 2)
- Covers only **Phase 1 & 2 engines**
- Missing: **70+ API endpoints** without integration tests
- **Critical 404 Bug Found:** Priority endpoint failing in orchestrator

**Goal:**
- **95%+ endpoint coverage** (comprehensive integration tests)
- **All critical paths tested** (success + error cases)
- **E2E workflows validated** (intent → task → artifact)
- **Performance baselines** (response times, throughput)
- **Security audit** (injection, auth, rate limiting)

---

## 1. Current QA Landscape

### 1.1 Test Inventory

```
✅ Phase 1 Integration Tests (8 tests)
   - Intent Bus creation, retrieval, history
   - Model chooser selection logic
   - Confidence scoring (6 dimensions)
   - Cup tournament adjudication

✅ Phase 2a Tests (15 tests)
   - Screen capture initialization
   - Frame capture with OCR/tagging
   - Circular buffer management
   - Search functionality

✅ Phase 2b Tests (8 tests)
   - DAG building from feature descriptions
   - Topological sorting validation
   - Batch parallel planning

✅ Phase 2c Tests (9 tests)
   - Artifact registration & versioning
   - Provenance tracking
   - Rollback functionality

✅ Phase 2d UI Tests
   - Syntax verified (workstation-v2.html + js)

✅ Phase 2e Tests (20 tests)
   - Scope detection (10 categories)
   - Branch name generation
   - PR/commit template generation

❌ MISSING: 11 server suites with 70+ endpoints
   - No tests for: web-server, orchestrator, training, budget, coach, cup, meta, etc.
   - No integration tests between services
   - No E2E workflows
   - No performance tests
```

### 1.2 Critical Issues Identified

| Issue | Severity | Impact | Status |
|-------|----------|--------|--------|
| `/api/v1/system/priority/chat` returns 404 | 🔴 High | Orchestrator startup fails | Found in screenshot |
| No API endpoint audit | 🟠 Medium | Unknown coverage gaps | Need to create |
| No E2E workflow tests | 🟠 Medium | Can't validate full feature | Need to add |
| No performance baselines | 🟡 Low | Can't detect regressions | Need to establish |
| No security tests | 🟠 Medium | Injection vulnerabilities possible | Need to scan |

---

## 2. QA Architecture

### 2.1 Testing Pyramid

```
                    🧪 E2E Tests (5%)
                  User workflows, full stack
                    
                  🔗 Integration Tests (45%)
              API endpoints, cross-service calls
              
            🧪 Unit Tests (50%)
        Individual functions, business logic
```

### 2.2 Test Categories

**1. Unit Tests** (individual functions)
- Input validation
- Business logic
- Edge cases
- Error handling

**2. Integration Tests** (API endpoints)
- Endpoint routing
- Request parsing
- Response format
- Database/storage interaction
- Error responses

**3. E2E Tests** (complete workflows)
- User creates intent
- System decomposes into tasks
- Tasks execute (or schedule)
- Artifact generated
- Full provenance tracked

**4. Performance Tests**
- Response time < 200ms for reads
- Response time < 500ms for writes
- Throughput: 100+ req/sec
- Memory stable over 1h test

**5. Security Tests**
- SQL/NoSQL injection attempts
- XSS payload handling
- Rate limiting enforcement
- Auth validation

---

## 3. Endpoint Coverage Matrix

### 3.1 Complete Endpoint Audit (87 total)

#### Web Server (19 endpoints)
| Endpoint | Method | Tested | Status | Priority |
|----------|--------|--------|--------|----------|
| `/` | GET | ❌ | Routes & UI load | P2 |
| `/control-room` | GET | ❌ | UI load | P1 |
| `/api/v1/design/brandboard` | POST | ❌ | Design generation | P2 |
| `/api/v1/chat/append` | POST | ❌ | Chat handling | P1 |
| `/api/v1/chat/transcripts` | GET | ❌ | Transcript retrieval | P1 |
| `/api/v1/feedback/submit` | POST | ❌ | Feedback capture | P3 |
| `/api/v1/referral/*` (5) | POST/GET | ❌ | Referral system | P3 |
| `/api/v1/system/routes` | GET | ❌ | Route discovery | P2 |
| `/api/v1/system/priority/chat` | POST | ❌ ⚠️ **404** | Priority mode | **P0 - CRITICAL** |
| `/api/v1/system/priority/background` | POST | ❌ | Priority mode | P1 |
| `/system/start` | POST | ❌ | System startup | P1 |
| `/system/stop` | POST | ❌ | System shutdown | P1 |
| `/system/status` | GET | ❌ | System health | P1 |
| `/health` | GET | ❌ | Health check | P1 |

#### Orchestrator (32 endpoints)
| Service | Endpoint | Tested | Priority |
|---------|----------|--------|----------|
| Intent Bus | `/api/v1/intent/*` (6) | ✅ (phase-1) | P0 |
| Screen Capture | `/api/v1/screen/*` (7) | ✅ (phase-2a) | P1 |
| DAG Builder | `/api/v1/dag/*` (6) | ✅ (phase-2b) | P1 |
| Artifact Ledger | `/api/v1/artifacts/*` (10) | ✅ (phase-2c) | P1 |
| Repo Auto-Org | `/api/v1/repo/*` (6) | ✅ (phase-2e) | P2 |

#### Training Server (19 endpoints) - ALL UNTESTED
| Endpoint | Purpose | Tested | Priority |
|----------|---------|--------|----------|
| `/api/v1/training/start` | Start training camp | ❌ | P1 |
| `/api/v1/training/round` | Run hyper-speed round | ❌ | P1 |
| `/api/v1/training/status` | Get status | ❌ | P1 |
| `/api/v1/training/overview` | Get overview data | ❌ | P1 |
| `/api/v1/training/active` | Get active training | ❌ | P1 |
| Other training endpoints (14) | Various | ❌ | P2 |

#### Budget Server (9 endpoints) - ALL UNTESTED
| Endpoint | Purpose | Tested | Priority |
|----------|---------|--------|----------|
| `/api/v1/providers/status` | Provider status | ❌ | P0 |
| `/api/v1/providers/burst` | Burst generation | ❌ | P1 |
| `/api/v1/budget` | Budget status | ❌ | P1 |
| Other budget endpoints (6) | Various | ❌ | P1 |

#### Meta-Learning Server (9 endpoints) - ALL UNTESTED
| Endpoint | Purpose | Tested | Priority |
|----------|---------|--------|----------|
| `/api/v4/meta-learning/status` | Meta status | ❌ | P1 |
| `/api/v4/meta-learning/start` | Start meta phase | ❌ | P1 |
| `/api/v4/meta-learning/run-all` | Run all phases | ❌ | P1 |
| Other meta endpoints (6) | Various | ❌ | P1 |

#### Coach Server (8 endpoints) - ALL UNTESTED
| Endpoint | Purpose | Tested | Priority |
|----------|---------|--------|----------|
| `/api/v1/auto-coach/start` | Start auto-coach | ❌ | P1 |
| `/api/v1/auto-coach/boost` | Boost performance | ❌ | P1 |
| Other coach endpoints (6) | Various | ❌ | P1 |

#### Cup Server (6 endpoints) - ALL UNTESTED
| Endpoint | Purpose | Tested | Priority |
|----------|---------|--------|----------|
| `/api/v1/cup/scoreboard` | Cup scoreboard | ❌ | P2 |
| `/api/v1/cup/mini` | Mini tournament | ❌ | P2 |
| Other cup endpoints (4) | Various | ❌ | P2 |

#### Product Development (20+ endpoints) - ALL UNTESTED
#### Segmentation Server (6 endpoints) - ALL UNTESTED
#### Capabilities Server (20+ endpoints) - ALL UNTESTED
#### Reports Server (3 endpoints) - ALL UNTESTED
#### Other Servers (40+ endpoints) - ALL UNTESTED

**Summary:**
- **Total Endpoints:** 87
- **Tested:** 32 (37%)
- **Untested:** 55 (63%)
- **Coverage Goal:** 95%+ (need 80+ tests)

---

## 4. QA Implementation Plan

### Phase 4a: Critical Bug Fixes (P0)
**Duration:** 2 hours | **Goal:** Zero critical issues

1. **Fix `/api/v1/system/priority/chat` 404**
   - Locate endpoint in web-server.js (✅ found at line 610)
   - Verify routing and CORS
   - Create integration test
   - Verify orchestrator startup succeeds

2. **Fix System Startup Issues**
   - Test `/system/start` endpoint
   - Verify all services start
   - Create startup integration test

### Phase 4b: Web & System Endpoints (P1)
**Duration:** 4 hours | **Goal:** 14 endpoints tested

Create `tests/integration/web-server.test.js`:
```javascript
✅ GET / - loads dashboard
✅ GET /control-room - loads control room
✅ POST /api/v1/system/priority/chat - sets priority
✅ POST /api/v1/system/priority/background - sets priority
✅ GET /api/v1/system/routes - lists all routes
✅ POST /system/start - starts system
✅ POST /system/stop - stops system
✅ GET /system/status - returns status
✅ GET /health - returns health
✅ POST /api/v1/chat/append - handles chat
✅ GET /api/v1/chat/transcripts - retrieves transcripts
✅ POST /api/v1/design/brandboard - generates design
✅ Verify error handling (404, 500, timeout)
✅ Verify CORS headers
```

### Phase 4c: Core Service Endpoints (P1)
**Duration:** 8 hours | **Goal:** 40 endpoints tested

**Priority order:**
1. Training server (19 endpoints) - core feature
2. Budget server (9 endpoints) - resource management
3. Meta-learning server (9 endpoints) - learning logic
4. Coach server (8 endpoints) - optimization

Create test files:
- `tests/integration/training-server.test.js`
- `tests/integration/budget-server.test.js`
- `tests/integration/meta-server.test.js`
- `tests/integration/coach-server.test.js`

Each with:
- ✅ Initialization tests
- ✅ Core operation tests
- ✅ State persistence tests
- ✅ Error handling tests
- ✅ Integration with web proxy

### Phase 4d: E2E Workflow Tests (P2)
**Duration:** 6 hours | **Goal:** Complete user workflows

Create `tests/e2e/complete-workflows.test.js`:
```javascript
1. User Creates Intent
   ✅ Submit feature description
   ✅ System creates intent
   ✅ Confidence scorer evaluates
   ✅ Intent stored

2. System Decomposes Task
   ✅ DAG builder analyzes
   ✅ Creates task graph
   ✅ Identifies dependencies
   ✅ Validates parallelization

3. Task Execution
   ✅ Task creates artifact
   ✅ Metadata captured
   ✅ Versioning applied
   ✅ Provenance linked

4. Complete Workflow
   ✅ From intent to final artifact
   ✅ All services coordinate
   ✅ Errors handled gracefully
   ✅ Audit trail complete
```

### Phase 4e: Performance & Security (P3)
**Duration:** 4 hours | **Goal:** Baselines established

Create `tests/performance/` and `tests/security/`:
- Response time benchmarks (all 32 core endpoints)
- Throughput under load (concurrent requests)
- Rate limiting verification
- Input validation (injection attacks)
- CORS validation

---

## 5. QA Test Suite Implementation

### 5.1 Unified Test Runner

Create `tests/qa-suite.js`:
```javascript
const fs = require('fs');
const path = require('path');

const testSuites = [
  { name: 'Unit Tests', files: ['tests/unit/**/*.js'], priority: 0 },
  { name: 'Phase Tests', files: ['tests/phase-*.js'], priority: 1 },
  { name: 'Integration Tests', files: ['tests/integration/**/*.js'], priority: 2 },
  { name: 'E2E Tests', files: ['tests/e2e/**/*.js'], priority: 3 },
  { name: 'Performance Tests', files: ['tests/performance/**/*.js'], priority: 4 }
];

// Reports generated:
// 1. qaReport.json - complete results
// 2. coverage-matrix.html - visual endpoint coverage
// 3. gaps.md - what's missing
// 4. recommendations.md - next priorities
```

### 5.2 Coverage Report Format

**`qa-coverage-report.json`:**
```json
{
  "timestamp": "2025-10-20T21:12:00Z",
  "totalEndpoints": 87,
  "testedEndpoints": 32,
  "coveragePercentage": 36.8,
  "byService": {
    "web-server": { "total": 14, "tested": 2, "coverage": 14 },
    "orchestrator": { "total": 32, "tested": 32, "coverage": 100 },
    "training-server": { "total": 19, "tested": 0, "coverage": 0 },
    "budget-server": { "total": 9, "tested": 0, "coverage": 0 }
  },
  "testResults": {
    "passed": 55,
    "failed": 0,
    "assertions": 150
  },
  "criticalIssues": [
    {
      "endpoint": "/api/v1/system/priority/chat",
      "status": 404,
      "severity": "critical",
      "found": "2025-10-20"
    }
  ],
  "gaps": [
    "No training server endpoint tests",
    "No E2E workflow tests",
    "No performance baselines",
    "No security tests"
  ],
  "nextPriority": [
    "Fix critical 404 bug",
    "Add web-server integration tests",
    "Add training-server tests",
    "Create E2E workflow tests"
  ]
}
```

---

## 6. Implementation Roadmap

### Week 1: Critical Fixes + Core Tests
```
Day 1: Fix 404 bug + web-server tests (14 endpoints)
Day 2: Training server tests (19 endpoints)
Day 3: Budget server tests (9 endpoints)
Day 4: Meta-learning + Coach server tests (17 endpoints)
Day 5: E2E workflow tests (5 complete flows)
```

### Week 2: Advanced Testing
```
Day 1: Performance testing (baselines)
Day 2: Security testing (injection, auth)
Day 3: Stress testing (100+ concurrent)
Day 4: Regression testing (verify no breaks)
Day 5: Documentation + Coverage report
```

### Expected Outcomes
- **87/87 endpoints tested** (100%)
- **200+ test cases** (comprehensive)
- **500+ assertions** (detailed validation)
- **95%+ pass rate** (production ready)
- **All critical bugs fixed**
- **Performance baselines established**

---

## 7. QA Checklist

### Before Each Release

- [ ] All 55 existing tests passing
- [ ] New endpoint tests written (if new endpoints)
- [ ] Integration tests verify cross-service calls
- [ ] E2E workflow tests passing
- [ ] Performance baselines within limits
- [ ] Security tests passing (no injection vulns)
- [ ] API documentation updated
- [ ] Coverage report shows 95%+
- [ ] Critical issues: ZERO
- [ ] High issues: ZERO
- [ ] Changelog updated

### Continuous QA

- [ ] Every commit runs full test suite
- [ ] Coverage report generated daily
- [ ] Performance monitored (trending)
- [ ] Security scans scheduled (weekly)
- [ ] Critical bugs fixed within 24h

---

## 8. Quick Start: Running Tests

### Run All Tests
```bash
npm run test:all          # All tests
npm run test:core         # Core system only
npm run test:integration  # Integration tests only
npm run test:e2e          # End-to-end workflows
npm run test:performance  # Performance benchmarks
```

### Generate Reports
```bash
npm run qa:report         # Generate coverage report
npm run qa:gaps           # Show missing tests
npm run qa:health         # Full health check
```

### Fix Critical Issues
```bash
npm run qa:fix:critical   # Fix known issues
npm run qa:audit          # Audit all endpoints
```

---

## 9. Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Test Coverage | 37% (32/87 endpoints) | 95% (82/87 endpoints) | Week 1-2 |
| Tests Passing | 55/55 (100%) | 200+/200+ (100%) | Week 2 |
| Critical Issues | 1 (404 bug) | 0 | Day 1 |
| Response Time | Unknown | <200ms (reads) | Week 1 |
| Throughput | Unknown | 100+ req/sec | Week 2 |
| Security Score | Unknown | A+ | Week 2 |

---

## 10. References

- **Current Test Files:** `/tests/`
- **Phase Tests:** `/tests/phase-*.js`
- **Endpoints:** Documented in each server file
- **Coverage Matrix:** `qa-coverage-report.json` (to be generated)

---

**Next Action:** Start with Phase 4a (fix 404 bug) + create Phase 4b web-server tests
**Owner:** QA Team
**Timeline:** 2 weeks to 95%+ coverage
