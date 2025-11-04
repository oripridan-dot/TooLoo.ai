# 🚀 Quick Test & NPM Scripts Guide

**TooLoo.ai - Phase 11 Testing Framework**

---

## 🎯 Most Common Commands

### Start the System
```bash
npm run dev
```
Starts web-server, orchestrator, and monitors all services.

### Test All Endpoints
```bash
npm run test:adapters
```
Runs comprehensive test suite with 12 tests.

### Quick Health Check
```bash
npm run test:smoke
```
Runs quick smoke tests (faster).

### Full Quality Report
```bash
npm run test:all:comprehensive
```
Runs adapters + smoke + full QA suite (slowest).

---

## 📋 Complete npm Script Reference

### 🚀 **Startup Scripts**
```bash
npm run dev                      # Start full system (RECOMMENDED)
npm run start                    # Alias for npm run dev
npm run start:guaranteed         # Start with guaranteed startup mode
npm run start:web               # Start just web-server (port 3000)
npm run start:orchestrator      # Start just orchestrator (port 3123)
npm run stop:all                # Stop all services
npm run clean                   # Kill processes + cleanup
npm run clean:process           # Just kill node processes
```

### 🧪 **Test Scripts - PHASE 11 (NEW)**
```bash
npm run test:adapters           # 🆕 Comprehensive adapter test suite
npm run test:endpoints          # 🆕 Test only endpoints
npm run test:phase7             # 🆕 Test LLMProvider (Phase 7.3)
npm run test:phase11            # 🆕 Test all Phase 11 adapters
npm run test:all:comprehensive  # 🆕 Full test: adapters + smoke + QA
```

### 🧪 **Test Scripts - Existing**
```bash
npm run test                    # Run QA suite with report
npm run test:all                # QA suite + coverage
npm run test:core               # Unit test core system
npm run test:unit               # All unit tests (vitest)
npm run test:integration        # Integration tests
npm run test:watch              # Watch mode (for development)
npm run test:parser             # Test transcript parser
npm run test:github             # GitHub integration tests
npm run test:performance        # Performance baselines
npm run test:security           # Security/injection tests
npm run test:smoke              # Quick smoke test
```

### 📊 **Quality & Health Scripts**
```bash
npm run qa:suite                # Full QA suite with coverage
npm run qa:report               # Generate QA report with JSON
npm run qa:gaps                 # Show test gaps/coverage holes
npm run qa:health               # Quick health check
npm run qa:web                  # Web-server integration tests
npm run qa:training             # Training server tests
npm run qa:budget               # Budget server tests
npm run qa:meta                 # Meta-learning tests
npm run qa:coach                # Coach server tests
npm run qa:cup                  # Cup server tests
npm run qa:product              # Product dev server tests
npm run qa:capabilities         # Capabilities tests
npm run qa:reports              # Reports server tests
npm run qa:e2e                  # End-to-end workflows
npm run qa:gates                # Quality gates validation
npm run qa:gates:strict         # Strict quality gates
```

### 🔧 **Utility Scripts**
```bash
npm run health                  # System health check
npm run docs                    # Generate documentation
npm run branch:status           # Current branch status
npm run design:guiding-star     # Generate design artifacts
npm run lint                    # ESLint check
npm run lint:fix                # ESLint fix
npm run format                  # Prettier format
npm run format:check            # Prettier check
npm run hygiene                 # Repo hygiene check
npm run hygiene:force           # Repo hygiene with auto-fix
```

### 🎤 **Voice & Speech Scripts**
```bash
npm run speak                   # Text to speech
npm run speak:direct            # Speech with direct input
npm run speak:selection         # Speak selected text
npm run voice:settings          # Configure voice settings
```

### ⚙️ **Automation & Maintenance**
```bash
npm run automate:updates        # Auto-update documentation
npm run automate:logs           # Rotate performance logs
npm run automate:cleanup        # Auto code cleanup
npm run automate:docs           # Update docs
npm run automate:health         # Check repo health
npm run automate:all            # Run all automation tasks
```

### 🎲 **Benchmark & Generate**
```bash
npm run benchmark               # Run benchmarks
npm run auto-teach              # Auto-teach system
npm run generate:fixtures       # Generate test fixtures
```

---

## 📊 Choosing the Right Test Command

### I want to...

**...quickly verify system is working**
```bash
npm run dev                # (terminal 1)
# wait 30 seconds
npm run test:smoke         # (terminal 2)
```

**...test all adapters are wired**
```bash
npm run dev                # (terminal 1)
# wait 30 seconds
npm run test:adapters      # (terminal 2)
```

**...verify Phase 7.3 LLMProvider**
```bash
npm run dev                # (terminal 1)
# wait 30 seconds
npm run test:phase7        # (terminal 2)
```

**...get a full quality report**
```bash
npm run dev                # (terminal 1)
# wait 30 seconds
npm run qa:suite           # (terminal 2) - takes ~5 min
```

**...run only Phase 11 tests**
```bash
npm run dev                # (terminal 1)
# wait 30 seconds
npm run test:phase11       # (terminal 2)
```

**...test everything (comprehensive)**
```bash
npm run dev                # (terminal 1)
# wait 30 seconds
npm run test:all:comprehensive  # (terminal 2) - takes ~15 min
```

**...check just health**
```bash
curl http://127.0.0.1:3000/api/v1/health
# or
npm run health
```

---

## 🎯 Current Test Status

### Phase 7.3: LLMProvider ✅
```bash
npm run test:phase7
# ✅ PASS: LLMProvider has unified generate() + generateSmartLLM()
```

### Phase 11.1-4: Adapters ✅
```bash
npm run test:adapters
# ✅ 3/12 PASS: Adapters built and loadable
# ⏳ 9/12 PENDING: Endpoints not yet wired to web-server (expected)
```

### System Health ✅
```bash
npm run health
# ✅ Web-server responding
# ⏳ Services warming up (normal)
```

---

## 📈 Test Suite Organization

```
Test Hierarchy:
├── Fast (~10 seconds)
│   ├── npm run test:smoke
│   ├── npm run health
│   └── npm run test:phase7
├── Medium (~1-2 minutes)
│   ├── npm run test:adapters
│   ├── npm run test:integration
│   └── npm run qa:health
├── Slow (~5-10 minutes)
│   ├── npm run qa:suite
│   └── npm run test:all
└── Very Slow (~15+ minutes)
    └── npm run test:all:comprehensive
```

---

## 🔍 Understanding Test Output

### ✅ PASS Examples
```
✅ Health check responded: web
✅ LLMProvider has both methods: generate() + generateSmartLLM()
✅ Listed 3 available adapters
✅ OAuth adapter initialized: oauth
```

### ❌ FAIL Examples
```
❌ System health check failed: 500
❌ Unexpected response: 502
❌ Adapter registry not responding
```

### ⊘ SKIP Examples
```
⊘  Adapter list endpoint not yet implemented
⊘  OAuth adapter not yet wired to web-server (expected)
⊘  Figma integration: Auth required (need API token)
```

---

## 🐛 Troubleshooting

### "Server not ready" Error
```bash
# Make sure system is started:
npm run dev              # Terminal 1
sleep 30                 # Wait for startup
npm run test:adapters    # Terminal 2
```

### "Connection refused" on port 3000
```bash
# Kill stray processes:
npm run stop:all
# Wait 5 seconds
npm run clean
# Try again:
npm run dev
```

### Tests timeout
```bash
# Increase timeout and try again:
timeout 60 npm run test:adapters
```

### Want to see raw logs
```bash
tail -100 .tooloo-startup/web-server.log
tail -100 .tooloo-startup/orchestrator.log
```

---

## 📝 Example Workflows

### Complete Testing Session
```bash
# Terminal 1: Start system
npm run dev

# Terminal 2: Wait for startup, then run tests
sleep 30

# Quick checks
npm run health
npm run test:smoke

# Phase 7.3 verification
npm run test:phase7

# Phase 11 adapter tests
npm run test:adapters

# Full quality report
npm run qa:suite
```

### Just Test One Adapter
```bash
# Start system
npm run dev

# In another terminal, manually test OAuth:
curl http://127.0.0.1:3000/api/v1/adapters/oauth/action/list-providers

# Or test Design:
curl http://127.0.0.1:3000/api/v1/adapters/design/action/list-files

# Or test Integrations:
curl http://127.0.0.1:3000/api/v1/adapters/integrations/action/list-handlers
```

### Monitor System Health
```bash
# Terminal 1: Start system
npm run dev

# Terminal 2: Keep checking health
while true; do
  npm run health
  sleep 30
done
```

---

## 🎓 For Next Session

### If Phase 11.5 (Wiring) is Started
```bash
npm run test:adapters      # Should show more ✅ as endpoints are wired
npm run qa:suite           # Full regression testing
npm run test:all:comprehensive  # Full validation
```

### If Production Deployment Happens
```bash
npm run qa:gates           # Quality gates check
npm run test:smoke         # Quick health verification
npm run health             # Final system check
```

---

## 📞 Quick Reference Card

| Goal | Command | Time |
|------|---------|------|
| Start system | `npm run dev` | 30s |
| Quick health | `npm run health` | 5s |
| Quick tests | `npm run test:smoke` | 10s |
| Test adapters | `npm run test:adapters` | 20s |
| Test Phase 7.3 | `npm run test:phase7` | 5s |
| Full QA | `npm run qa:suite` | 5m |
| Everything | `npm run test:all:comprehensive` | 15m |

---

**Last Updated:** November 4, 2025  
**Status:** Phase 11 Adapters - Testing Framework Ready ✅

