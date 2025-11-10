# TooLoo.ai Control Center — Complete Reference Index

**Generated**: Nov 5, 2025  
**Status**: ✅ All Systems Operational (14/14 servers)

---

## 📋 Documentation Map

### 🚀 Getting Started
- **[QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)** — Start here! Commands to launch, check status, access Control Center
- **[SYSTEM_STATUS_REPORT_2025-11-05.md](SYSTEM_STATUS_REPORT_2025-11-05.md)** — Current state of all systems, providers, and endpoints

### 📊 Reference Documentation
- **[CONTROL_CENTER_API_AUDIT.md](CONTROL_CENTER_API_AUDIT.md)** — Comprehensive mapping of all endpoints to their servers/ports
- **[CONTROL_CENTER_FEATURES_CHECKLIST.md](CONTROL_CENTER_FEATURES_CHECKLIST.md)** — Feature-by-feature operational status

### 🔧 Technical Implementation
- **[servers/server-daemon.js](scripts/server-daemon.js)** — Server daemon implementation (file watching, auto-restart, state persistence)
- **[servers/web-server.js](servers/web-server.js)** — Web proxy and direct endpoints (OAuth, chat, activity, debugger)
- **[servers/providers-arena-server.js](servers/providers-arena-server.js)** — Provider event service (port 3011)

---

## 🎯 What's Running Right Now

### Current Daemon State
```bash
npm run daemon:status
```

**Output**: 14/14 servers running
- web-server (3000) — Your UI gateway
- orchestrator (3123) — System management
- 12 other services (3001-3014) — Supporting features

### Providers Available
```bash
curl http://127.0.0.1:3000/api/v1/arena/status
```

**Output**: 8/9 providers
- Claude, OpenAI, Gemini, DeepSeek, Ollama, LocalAI, OpenInterpreter, Anthropic

---

## 🌐 Access Points

### Local Development
```
http://localhost:3000/phase3-control-center.html
```

### GitHub Codespace
```
https://friendly-space-adventure-[xxxxx].app.github.dev/phase3-control-center.html
```

### Direct API Testing
```bash
# System status
curl http://127.0.0.1:3000/api/v1/system/processes

# Arena (providers)
curl http://127.0.0.1:3000/api/v1/arena/status

# Training
curl http://127.0.0.1:3000/api/v1/training/overview

# Budget
curl http://127.0.0.1:3000/api/v1/providers/status
```

---

## 🚀 Command Reference

### Daemon Management
```bash
# Start in background (recommended)
npm run start:daemon:bg

# Start in foreground (see all logs)
npm run start:daemon

# Check status
npm run daemon:status

# Stop gracefully
npm run stop:daemon

# Force cleanup (safe)
node scripts/safe-kill.js force
```

### System Queries
```bash
# Get all available routes
curl http://127.0.0.1:3000/api/v1/system/routes | jq

# List all processes
curl http://127.0.0.1:3000/api/v1/system/processes | jq

# Check provider status
curl http://127.0.0.1:3000/api/v1/arena/status | jq '.providers'
```

---

## 📡 Port Directory

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | web-server | Control Center UI + API proxy |
| 3001 | training-server | Hyper-speed learning |
| 3002 | meta-server | Meta-learning phases |
| 3003 | budget-server | Provider management |
| 3004 | coach-server | Auto-Coach loop |
| 3005 | cup-server | Provider Cup tournaments |
| 3006 | product-server | Workflows & artifacts |
| 3007 | segmentation-server | Conversation analysis |
| 3008 | reports-server | Analytics |
| 3009 | capabilities-server | Feature inventory |
| 3010 | sources-server | GitHub integration |
| **3011** | **providers-arena-server** | **PROVIDERS/EVENTS** |
| 3012 | integrations-server | Third-party connectors |
| 3014 | design-server | Brand boards |
| 3123 | orchestrator | System control |

---

## 🏆 Providers Arena (Port 3011)

### Direct Access
```bash
curl http://127.0.0.1:3011/api/v1/arena/status
```

### Via Web Proxy
```bash
curl http://127.0.0.1:3000/api/v1/arena/status
```

### What It Returns
```json
{
  "ok": true,
  "providers": {
    "claude": {"available": true, "model": "claude-3-5-haiku-20241022"},
    "openai": {"available": true, "model": "gpt-4o-mini"},
    "gemini": {"available": true, "model": "gemini-2.5-flash"},
    ...
  },
  "available": 8
}
```

### Status in Control Center
- **Section**: "Providers Arena"
- **Action**: "Check Provider Status"
- **Shows**: All 8 available providers with models

---

## 🔐 OAuth & Authentication

### GitHub OAuth
```
Endpoint: /api/v1/oauth/github/authorize (POST)
Control Center: Click "GitHub OAuth" button
Status endpoint: /api/v1/oauth/status (GET)
```

### Slack OAuth
```
Endpoint: /api/v1/oauth/slack/authorize (POST)
Control Center: Click "Slack OAuth" button
Status endpoint: /api/v1/oauth/status (GET)
```

---

## 💬 Chat Interface

### Send Message
```bash
curl -X POST http://127.0.0.1:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","provider":"claude"}'
```

### Get Transcripts
```bash
curl http://127.0.0.1:3000/api/v1/chat/transcripts
```

### Burst Stream (Multiple Providers)
```bash
curl http://127.0.0.1:3000/api/v1/chat/burst-stream?query=test
```

---

## 🔬 Debugger

### Start Node Debugger
```bash
curl -X POST http://127.0.0.1:3000/api/v1/debugger/start \
  -H "Content-Type: application/json" \
  -d '{"port":9229,"host":"127.0.0.1"}'
```

### Check Status
```bash
curl http://127.0.0.1:3000/api/v1/debugger/status?host=127.0.0.1&port=9229
```

### Use in Chrome DevTools
1. Open Chrome: `chrome://inspect`
2. Enter the WebSocket URL from response
3. Step through code

---

## 📊 System Endpoints

### System Routes (See All Proxies)
```bash
curl http://127.0.0.1:3000/api/v1/system/routes | jq
```

### System Processes (All 14 Servers)
```bash
curl http://127.0.0.1:3000/api/v1/system/processes | jq
```

### Activity Monitoring
```bash
# Heartbeat
curl -X POST http://127.0.0.1:3000/api/v1/activity/heartbeat

# Sessions
curl http://127.0.0.1:3000/api/v1/activity/sessions

# Servers
curl http://127.0.0.1:3000/api/v1/activity/servers

# Start all
curl -X POST http://127.0.0.1:3000/api/v1/activity/start-all
```

---

## 🎨 Product & Design

### Workflows
```bash
curl http://127.0.0.1:3000/api/v1/workflows
```

### Brand Board
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/brandboard \
  -H "Content-Type: application/json" \
  -d '{"title":"My Brand"}'
```

### Artifacts
```bash
curl http://127.0.0.1:3000/api/v1/artifacts
```

---

## 📈 Analytics & Reporting

### Reports
```bash
curl http://127.0.0.1:3000/api/v1/reports
```

### Capabilities
```bash
curl http://127.0.0.1:3000/api/v1/capabilities
```

### Segmentation
```bash
curl http://127.0.0.1:3000/api/v1/segmentation
```

---

## 🔗 Integrations

### GitHub Sources
```bash
curl http://127.0.0.1:3000/api/v1/sources
```

### GitHub Issues Sync
```bash
curl -X POST http://127.0.0.1:3000/api/v1/sources/github/issues/sync
```

### Third-Party Integrations
```bash
curl http://127.0.0.1:3000/api/v1/integrations
```

---

## 💡 Quick Troubleshooting

### Q: Servers won't start
```bash
node scripts/safe-kill.js force
npm run start:daemon:bg
sleep 3
npm run daemon:status
```

### Q: Port already in use
```bash
npm run stop:daemon
npm run start:daemon:bg
```

### Q: Control Center shows 404
```bash
# Wait for server initialization
sleep 5
curl http://127.0.0.1:3000/
```

### Q: Arena not responding
```bash
# Check directly
curl http://127.0.0.1:3011/api/v1/arena/status

# Check via proxy
curl http://127.0.0.1:3000/api/v1/arena/status
```

---

## ⚠️ Important Safety Rules

### ✅ Safe Operations
- `npm run stop:daemon` — Always safe
- `node scripts/safe-kill.js force` — Targeted, safe
- `npm run daemon:status` — Read-only, safe

### ❌ Never Do This
- `pkill -f "node servers/"` — **KILLS ENTIRE WORKSPACE**
- `kill -9 $$` — Will break terminal
- `rm -rf /` — Obviously destructive 😄

### Key Insight
The `pkill` command with broad patterns matches VSCode internal processes, killing the entire IDE. Always use `safe-kill.js` instead.

---

## 📚 File Structure

```
TooLoo.ai/
├── scripts/
│   ├── server-daemon.js        ← Main daemon (file watching, auto-restart)
│   ├── daemon-bg.js            ← Background launcher
│   └── safe-kill.js            ← Safe process cleanup
├── servers/
│   ├── web-server.js           ← Proxy + direct endpoints
│   ├── orchestrator.js         ← System management
│   ├── training-server.js      ← Hyper-speed
│   ├── meta-server.js          ← Meta-learning
│   ├── budget-server.js        ← Provider management
│   ├── coach-server.js         ← Auto-Coach
│   ├── cup-server.js           ← Cup tournaments
│   ├── product-development-server.js ← Workflows
│   ├── segmentation-server.js  ← Analysis
│   ├── reports-server.js       ← Reporting
│   ├── capabilities-server.js  ← Features
│   ├── providers-arena-server.js ← **PROVIDERS/EVENTS**
│   ├── integrations-server.js  ← Connectors
│   └── design-integration-server.js ← Brand
├── web-app/
│   └── phase3-control-center.html ← UI
├── QUICK_START_GUIDE.md         ← ⭐ Start here
├── CONTROL_CENTER_API_AUDIT.md  ← Full reference
├── CONTROL_CENTER_FEATURES_CHECKLIST.md ← Feature status
└── SYSTEM_STATUS_REPORT_2025-11-05.md  ← Current state
```

---

## 🎯 Common Tasks

### Task: Launch System
```bash
npm run start:daemon:bg
sleep 5
npm run daemon:status
```

### Task: Check All Providers
```bash
curl http://127.0.0.1:3000/api/v1/arena/status | jq '.providers'
```

### Task: Make Code Change
1. Edit any `servers/*.js`
2. Save file
3. Daemon auto-restarts that server (2-3 seconds)
4. No manual restart needed!

### Task: Restart Everything
```bash
npm run stop:daemon
npm run start:daemon:bg
sleep 5
npm run daemon:status
```

### Task: Verify Specific Service
```bash
# Replace 3001 with port number
curl http://127.0.0.1:3001/health || curl http://127.0.0.1:3001/
```

---

## 📞 Support Resources

| Topic | Document |
|-------|----------|
| Getting started | QUICK_START_GUIDE.md |
| All features | CONTROL_CENTER_FEATURES_CHECKLIST.md |
| Endpoint details | CONTROL_CENTER_API_AUDIT.md |
| System status | SYSTEM_STATUS_REPORT_2025-11-05.md |
| Daemon code | scripts/server-daemon.js |
| Web-server code | servers/web-server.js |
| Arena code | servers/providers-arena-server.js |

---

## ✅ Verification Checklist

Before starting work:
- [ ] Run `npm run daemon:status` → Should show 14/14
- [ ] Run `curl http://127.0.0.1:3000/` → Should return HTTP 302
- [ ] Run `curl http://127.0.0.1:3000/api/v1/arena/status` → Should show 8+ providers
- [ ] Open Control Center in browser → Should load fully

---

**Status**: ✅ Production Ready  
**Last Verified**: Nov 5, 2025, 22:56 UTC  
**All Systems**: Operational
