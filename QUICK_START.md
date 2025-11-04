# TooLoo.ai System - Quick Start Guide

**Last Updated:** November 4, 2025 (Post-Consolidation)  
**System Status:** ✅ Production-Ready  
**Architecture:** 10 core services + 12 core engines

---

## 🚀 QUICK START

### Start the System (Recommended)
```bash
npm run dev
# or
bash start-guaranteed.sh
```

This will:
1. ✅ Start web-server (port 3000)
2. ✅ Start orchestrator (port 3123)
3. ✅ Pre-arm all 10 core services
4. ✅ Display system status

**Access:** http://localhost:3000

---

## 🔍 VALIDATE SYSTEM

### Run Smoke Test (5 minutes)
```bash
npm run test:smoke
```

Validates:
- ✅ All 10 services start successfully
- ✅ Health check endpoints respond
- ✅ API endpoints return proper JSON
- ✅ Error handling is consistent

Exit code: 0 = pass, non-zero = fail

### Health Check Individual Services
```bash
# Web Server
curl http://127.0.0.1:3000/health

# Orchestrator
curl http://127.0.0.1:3123/health

# Training Server
curl http://127.0.0.1:3001/health

# All other services (ports 3002-3009)
curl http://127.0.0.1:3002/health  # meta
curl http://127.0.0.1:3003/health  # budget
curl http://127.0.0.1:3004/health  # coach
curl http://127.0.0.1:3005/health  # cup
curl http://127.0.0.1:3006/health  # product-dev
curl http://127.0.0.1:3008/health  # reports
curl http://127.0.0.1:3009/health  # capabilities
```

---

## 📋 AVAILABLE SERVICES

### Essential Services (Always Start These)
```bash
npm run start:web           # Web UI + API proxy (port 3000)
npm run start:orchestrator  # Command center (port 3123) - START THIS FIRST!
```

### Core Services (Auto-started by orchestrator)
```bash
npm run start:training      # Training rounds (port 3001)
npm run start:meta          # Meta-learning (port 3002)
npm run start:budget        # Provider budget (port 3003)
npm run start:coach         # Adaptive coaching (port 3004)
npm run start:cup           # Provider tournaments (port 3005)
npm run start:product       # Product innovation (port 3006)
npm run start:reports       # Analytics reports (port 3008)
npm run start:capabilities  # Capability management (port 3009)
```

---

## 🛑 STOP SERVICES

### Stop All Services
```bash
npm run stop:all
```

### Kill All Node Processes (Nuclear Option)
```bash
npm run clean              # Kills all node servers + runs repo hygiene
npm run clean:process      # Just kills node servers
```

### Restart Everything
```bash
npm run stop:all && npm run dev
```

---

## 🧪 TESTING

### Smoke Test (Quick Validation)
```bash
npm run test:smoke
```

### Integration Tests (All 10 Services)
```bash
npm run test:integration
# or specific service:
npm run qa:training
npm run qa:meta
npm run qa:budget
npm run qa:coach
npm run qa:cup
npm run qa:product
npm run qa:reports
npm run qa:capabilities
```

### Full Test Suite (Including coverage)
```bash
npm run test:all
npm run qa:suite
```

---

## 📊 SYSTEM STATUS

### View System Processes
```bash
lsof -i :3000 -i :3001 -i :3002 -i :3003 -i :3004 -i :3005 -i :3006 -i :3008 -i :3009 -i :3123
```

### Check System Health
```bash
curl -s http://127.0.0.1:3000/system/health | jq .
```

### View Service Logs
```bash
tail -f /tmp/web-server.log
tail -f /tmp/orchestrator.log
tail -f /tmp/training.log
```

---

## 🔧 CONFIGURATION

### System Configuration
Located at: `config/system-manifest.js`

```javascript
import { SYSTEM, getService, getProvider } from './config/system-manifest.js';

// Get all services
const services = Object.values(SYSTEM.services);

// Get specific service
const webService = getService('web');

// Get providers
const providers = SYSTEM.providers.available;

// Check feature flags
const autoCoach = SYSTEM.features.autoCoach;
```

### Environment Variables
```bash
# Service ports (override defaults)
export WEB_PORT=3000
export ORCH_PORT=3123
export TRAINING_PORT=3001
export META_PORT=3002
export BUDGET_PORT=3003
export COACH_PORT=3004
export CUP_PORT=3005
export PRODUCT_PORT=3006
export REPORTS_PORT=3008
export CAPABILITIES_PORT=3009

# AI Provider
export LLM_PROVIDER=anthropic           # Default provider
export ANTHROPIC_API_KEY=sk-ant-...    # Anthropic token
export OPENAI_API_KEY=sk-...           # OpenAI token (fallback)

# System
export NODE_ENV=production
export LOG_LEVEL=info                   # debug, info, warn, error
```

---

## 🎯 COMMON TASKS

### 1. Generate AI Response
```bash
curl -X POST http://127.0.0.1:3000/api/v1/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hello TooLoo"}'
```

### 2. Check Provider Status
```bash
curl http://127.0.0.1:3003/api/v1/providers/status
```

### 3. Start a Training Round
```bash
curl -X POST http://127.0.0.1:3001/api/v1/training/start \
  -H 'Content-Type: application/json' \
  -d '{"rounds":10}'
```

### 4. Get User Segmentation
```bash
curl http://127.0.0.1:3004/api/v1/coach/user/123/segmentation
```

### 5. View System Reports
```bash
curl http://127.0.0.1:3008/api/v1/reports/metrics | jq .
curl http://127.0.0.1:3008/api/v1/reports/trends | jq .
curl http://127.0.0.1:3008/api/v1/reports/anomalies | jq .
```

---

## 📖 DOCUMENTATION

### Architecture
- **File:** `ARCHITECTURE.md`
- **Length:** 1200+ lines
- **Contains:** All 10 services, 12 engines, data flows, deployment guide, code standards

### System Manifest
- **File:** `config/system-manifest.js`
- **Contains:** Service registry, provider chain, feature flags, costs, traits

### Consolidation Report
- **File:** `CONSOLIDATION_COMPLETE.md`
- **Contains:** What was consolidated, metrics, recovery instructions

### Phase 7 Planning
- **File:** `PHASE_7_MERGE_ANALYSIS.md`
- **Contains:** Engine consolidation strategy and execution plan

---

## 🐛 TROUBLESHOOTING

### Service Won't Start
```bash
# Check if port is already in use
lsof -i :3000
lsof -i :3123

# Kill existing process
kill -9 <PID>

# Try starting service again
npm run start:web
```

### Service Returns 502 (Bad Gateway)
```bash
# Check target service is running
curl http://127.0.0.1:3001/health

# If not, start it
npm run start:training

# If stuck, clean and restart
npm run stop:all
npm run dev
```

### Integration Test Fails
```bash
# Run smoke test first (basic validation)
npm run test:smoke

# If that passes, run specific integration test
npm run qa:training

# View detailed error
npm run qa:training 2>&1 | tail -50
```

### Memory Leak / High CPU
```bash
# Check system metrics
curl http://127.0.0.1:3008/api/v1/reports/metrics | jq '.cpu, .memory'

# Restart specific service
npm run stop:all
npm run start:orchestrator
npm run start:training
```

---

## 🚀 DEPLOYMENT

### Production Deployment
```bash
# Set production environment
export NODE_ENV=production
export LOG_LEVEL=warn

# Start system
npm run dev

# Verify all services healthy
npm run test:smoke

# Check metrics
curl http://127.0.0.1:3008/api/v1/reports/metrics
```

### Docker Deployment (Future)
```bash
# Dockerfile will be in next phase
docker build -t tooloo:latest .
docker run -p 3000:3000 -p 3123:3123 tooloo:latest
```

---

## 🔗 USEFUL LINKS

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Web UI | 3000 | http://localhost:3000 | Main interface |
| Orchestrator | 3123 | http://localhost:3123 | Command center |
| Training | 3001 | http://localhost:3001/health | Learning engine |
| Meta | 3002 | http://localhost:3002/health | Optimization |
| Budget | 3003 | http://localhost:3003/health | Cost management |
| Coach | 3004 | http://localhost:3004/health | User coaching |
| Cup | 3005 | http://localhost:3005/health | Tournaments |
| Product | 3006 | http://localhost:3006/health | Innovation |
| Reports | 3008 | http://localhost:3008/health | Analytics |
| Capabilities | 3009 | http://localhost:3009/health | Capabilities |

---

## 📞 SUPPORT

### Check System Status
```bash
npm run branch:status
npm run health
```

### Generate Debug Report
```bash
npm run qa:suite --report
```

### View Audit Trail
```bash
git log --oneline | head -20
cat CONSOLIDATION_COMPLETE.md  # Latest consolidation summary
```

---

## ✅ NEXT STEPS

### Option 1: Phase 7 - Merge Engines (60 min)
```bash
git checkout -b refactor/phase-7-merge-engines
# Then follow PHASE_7_MERGE_ANALYSIS.md
```

### Option 2: Phase 11 - Create Middleware (120 min)
- Create `lib/adapters/` folder
- Move oauth, design-integration logic
- Unify auth middleware

### Option 3: Deploy Now
- System is production-ready
- Run smoke test
- Deploy to staging/production

---

**Last Check:** Run `npm run test:smoke` before proceeding with any changes.

🎉 **TooLoo.ai is ready to go!**
