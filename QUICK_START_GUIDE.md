# TooLoo.ai Control Center — Quick Start Guide

**Status**: ✅ All systems operational (Nov 5, 2025)

---

## 🚀 Start the System

### Background Mode (Recommended for Development)
```bash
npm run start:daemon:bg
# Output: Daemon launched in background (PID: xxxxx)
# Servers run independently—press Ctrl+C to exit terminal safely
```

### Foreground Mode (See All Logs)
```bash
npm run start:daemon
# Output: Real-time logs from all 14 servers
# Press Ctrl+C to graceful stop all
```

---

## 📊 Check Status

```bash
npm run daemon:status

# Output:
# 🟢 Running      web-server                :3000
# 🟢 Running      orchestrator              :3123
# 🟢 Running      training-server           :3001
# ... [14 total]
# Active: 14/14
```

---

## 🌐 Access Control Center

### Local Development
```
http://localhost:3000/phase3-control-center.html
```

### GitHub Codespace
```
https://friendly-space-adventure-[id].app.github.dev/phase3-control-center.html
```

---

## 🛑 Stop Servers Safely

```bash
npm run stop:daemon
# Graceful shutdown of all 14 servers
```

**⚠️ IMPORTANT**: Never use `pkill -f "node servers/"` — it kills the entire workspace!

---

## 🏆 Providers Arena — Test It

### Check Available Providers
```bash
curl http://127.0.0.1:3000/api/v1/arena/status
```

**Response Shows**:
- 8/9 providers available
- Claude, OpenAI, Gemini, DeepSeek, Ollama, LocalAI, OpenInterpreter, Anthropic
- HuggingFace (unavailable but can be enabled)

### From Control Center UI
1. Navigate to **"Providers Arena"** section
2. Click **"Check Provider Status"**
3. View all available AI models and their status

---

## 🔌 Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/system/processes` | GET | List all 14 servers |
| `/api/v1/arena/status` | GET | Provider availability |
| `/api/v1/oauth/status` | GET | GitHub/Slack auth status |
| `/api/v1/training/overview` | GET | Training phase info |
| `/api/v1/providers/status` | GET | Budget & provider state |
| `/api/v1/chat/message` | POST | Send chat message |

---

## 📁 Port Map

```
3000  → Web Server (UI proxy)
3001  → Training Server
3002  → Meta-Learning Server
3003  → Budget Server
3004  → Coach Server
3005  → Cup Server
3006  → Product Development
3007  → Segmentation
3008  → Reports
3009  → Capabilities
3010  → Sources (GitHub)
3011  → Providers Arena ← EVENT SERVICE
3012  → Integrations
3014  → Design
3123  → Orchestrator (System)
```

---

## ✅ Everything Working?

### Quick Smoke Test
```bash
# Test web-server
curl -I http://127.0.0.1:3000/

# Test arena
curl http://127.0.0.1:3000/api/v1/arena/status | jq '.providers | keys'

# Test system
npm run daemon:status
```

**Expected**:
- ✅ Web-server: HTTP 302 redirect
- ✅ Arena: 8 providers available
- ✅ System: 14/14 servers running

---

## 🐛 Troubleshooting

### Problem: Port Already in Use
```bash
# Find which process
lsof -i :3000

# Clean restart
npm run stop:daemon
npm run start:daemon:bg
```

### Problem: Servers Not Starting
```bash
# Check daemon logs
npm run daemon:status

# If zombie processes exist
node scripts/safe-kill.js force
npm run start:daemon:bg
```

### Problem: Control Center Shows 404
```bash
# Verify web-server health
curl http://127.0.0.1:3000/phase3-control-center.html

# If response is 404, restart
npm run stop:daemon
npm run start:daemon:bg
sleep 5
```

---

## 📚 Documentation

- **API Audit**: `CONTROL_CENTER_API_AUDIT.md` — Full endpoint mapping
- **Features**: `CONTROL_CENTER_FEATURES_CHECKLIST.md` — What's working
- **Daemon**: `scripts/server-daemon.js` — Server management logic
- **Safe Kill**: `scripts/safe-kill.js` — Process cleanup utility

---

## 🎯 Arena Service (Providers)

**Location**: `/servers/providers-arena-server.js` (port 3011)

**Current Capabilities**:
- ✅ List all available providers
- ✅ Check provider health status
- ✅ Show model information
- ⬜ Event tracking (in development)
- ⬜ Webhook integration (in development)

**To Extend**:
```bash
# Edit arena server
vim servers/providers-arena-server.js

# Restart on save (daemon watches files)
# Changes auto-apply when you save
```

---

## 💡 Tips

- **File Watching**: Edit any `servers/*.js` file and daemon auto-restarts that server
- **No Manual Restart**: Changes are live within 2-3 seconds
- **Safe Cleanup**: Always use `node scripts/safe-kill.js force` (never `pkill`)
- **Logs**: Check `.server-logs/*.log` for individual server output

---

## Next Steps

1. ✅ All servers running
2. ✅ Control Center accessible
3. ✅ Arena service operational
4. ⬜ Implement event tracking in arena
5. ⬜ Connect GitHub/Slack webhooks
6. ⬜ Add provider switching UI

---

**Status**: Production-ready. All 14 servers stable and monitored.

