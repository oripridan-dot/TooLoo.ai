# Phase 1 Quick Start Guide

## What You Have

TooLoo.ai Phase 1 delivers the **Intent Bus + Multi-Model Tournament** engine – the neural backbone of your AI workstation OS.

Every prompt now flows through:
1. **Intent Bus** → Normalize + enrich with context
2. **Model Chooser** → Analyze complexity + route to providers
3. **Parallel execution** → Fast/Focus/Audit lanes
4. **Cup Tournament** → Cross-model scoring + adjudication
5. **Confidence Scorer** → Multi-dim evaluation + retry logic
6. **Audit trail** → Complete provenance

---

## Getting Started

### 1. Install Dependencies
```bash
cd /workspaces/TooLoo.ai
npm install uuid  # If not already done
```

### 2. Run Integration Test
```bash
node tests/phase-1-integration-test.js
```

Expected output: All 8 tests pass ✅

### 3. Start the System
```bash
npm run dev
```

This starts orchestrator + all services

### 4. Try the API

**Create an Intent:**
```bash
curl -X POST http://127.0.0.1:3123/api/v1/intent/create \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Create a TypeScript REST API","userId":"me","budgetUsd":0.20}'
```

**Score an Artifact:**
```bash
curl -X POST http://127.0.0.1:3123/api/v1/models/score \
  -H 'Content-Type: application/json' \
  -d '{"artifact":{"type":"code","content":"..."},"evidence":{"deterministicChecks":{"tests":true}}}'
```

**Get History:**
```bash
curl http://127.0.0.1:3123/api/v1/intent/history?limit=5
```

---

## Documentation

- **Full API:** `docs/PHASE-1-INTENT-BUS-API.md`
- **Technical:** `PHASE-1-SUMMARY.md`
- **Source:** `engine/{intent-bus,model-chooser,confidence-scorer}.js`

---

## You Now Have

✅ Unified Intent Bus  
✅ Smart Model Routing  
✅ 3-Lane Parallelization  
✅ Cross-Model Tournament  
✅ Multi-Dimensional Scoring  
✅ Intelligent Retry Logic  
✅ Complete Audit Trail  
✅ Cost Control & Analytics  

This is not a chat. **This is an AI workstation OS.**
