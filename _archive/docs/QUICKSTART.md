# TooLoo.ai System - Quick Start

## 🚀 Start the Entire System

```bash
npm start
```

That's it! All 12 services will start in ~30 seconds.

---

## ✅ What You Get

The startup process automatically:

- **Cleans up** old processes and ports
- **Starts** the web server (port 3000)
- **Orchestrates** all 12 microservices
- **Verifies** each service is responding
- **Tests** AI endpoints (synthesis + ensemble)
- **Displays** live system status

**Result: ALL 12 SERVICES ONLINE AND READY**

---

## 🎯 Key Endpoints

### AI Chat (Multi-Provider)
```bash
# Fast synthesis (single provider, 92% confidence)
curl -X POST http://127.0.0.1:3000/api/v1/chat/synthesis \
  -H 'Content-Type: application/json' \
  -d '{"message":"What is TooLoo.ai?"}'

# Smart ensemble (3 providers, 95% confidence)
curl -X POST http://127.0.0.1:3000/api/v1/chat/ensemble \
  -H 'Content-Type: application/json' \
  -d '{"message":"What is TooLoo.ai?"}'
```

### Web Interfaces
- **Main Dashboard**: http://127.0.0.1:3000
- **Chat UI**: http://127.0.0.1:3000/tooloo-chat
- **Control Room**: http://127.0.0.1:3000/control-room

### System Status
```bash
# Check all services
curl http://127.0.0.1:3000/api/v1/system/status | jq .

# Web server health
curl http://127.0.0.1:3000/health
```

---

## 🔧 12 Microservices

| # | Service | Port | Purpose |
|----|---------|------|---------|
| 1 | Training | 3001 | Learning engine, skill tracking |
| 2 | Meta | 3002 | System metadata & introspection |
| 3 | Budget | 3003 | Token budgets & rate limiting |
| 4 | Coach | 3004 | Auto-coaching & guidance |
| 5 | Cup | 3005 | Competitions & tournaments |
| 6 | Product | 3006 | Workflows & artifacts |
| 7 | Segmentation | 3007 | Conversation analysis |
| 8 | Reports | 3008 | Analytics & dashboards |
| 9 | Capabilities | 3009 | Feature discovery |
| 10 | Orchestration | 3100 | Service coordination |
| 11 | Provider | 3200 | LLM provider management |
| 12 | Analytics | 3300 | Event tracking & metrics |

Plus the **Web Server** (port 3000) that coordinates everything.

---

## 📊 System Architecture

```
User Request
    ↓
Web Server (3000) ← single control point
    ↓
Orchestrator (spawned on demand)
    ↓
12 Microservices (autonomous, coordinated)
    ├─ Training (3001)
    ├─ Meta (3002)
    ├─ Budget (3003)
    ├─ Coach (3004)
    ├─ Cup (3005)
    ├─ Product (3006)
    ├─ Segmentation (3007)
    ├─ Reports (3008)
    ├─ Capabilities (3009)
    ├─ Orchestration (3100)
    ├─ Provider (3200)
    └─ Analytics (3300)
```

---

## 📖 Full Documentation

See **[STARTUP.md](./STARTUP.md)** for:
- Detailed startup phases
- Troubleshooting guide
- Configuration options
- Performance tuning
- API reference
- Service dependencies
- Health monitoring

---

## 🛑 Stop the System

```bash
# Press Ctrl+C in the terminal
# Services shut down gracefully

# Or force stop:
killall node
```

---

## 📋 What Was Cleaned Up

✅ Removed 14 duplicate/old startup scripts  
✅ Removed 4 old orchestrator versions  
✅ Removed 20+ obsolete documentation files  
✅ Removed abandoned demo and test files  
✅ Removed response JSON artifacts  

**Result: Cleaner codebase, easier to understand, single source of truth**

---

## 🧪 Testing

```bash
# Quick smoke test
npm run test:smoke

# Full QA suite
npm run qa:suite

# Performance benchmark
npm run test:performance
```

---

## 📝 Startup Log

Check the latest startup log:
```bash
tail -f .tooloo-startup/last-startup.log
```

All logs saved in `.tooloo-startup/` directory.

---

**Status**: ✅ Production Ready  
**Version**: 4.0 (Unified Multi-Service Startup)  
**Services**: 12/12 Operational  
**Last Updated**: November 2025
