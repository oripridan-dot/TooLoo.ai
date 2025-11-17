# TooLoo.ai Hot-Reload Development Setup

## Overview

This guide explains how to run TooLoo.ai with continuous hot-reload so all services stay online and you never need to restart `npm run dev`.

## Quick Start

```bash
# Install dependencies (first time)
npm install

# Start hot-reload development server
npm run dev:hot

# That's it! All services are now running with auto-reload
```

When you're done:
```bash
npm run dev:hot-stop
```

## What This Gives You

✅ **All 11 services running continuously** on ports 3000-3009, 3100, 3200, 3300
✅ **Hot-reload on file changes** – edit code, changes apply automatically  
✅ **No need to restart npm** – just edit and test
✅ **Real-time metrics** – dashboard at `http://127.0.0.1:3010/api/v1/metrics/dashboard`
✅ **Alert monitoring** – automatic service health tracking
✅ **Provider performance** – leaderboard at `http://127.0.0.1:3008/api/v1/reports/provider-performance`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  npm run dev:hot  (hot-reload-dev.sh)                       │
│  └─ nodemon (watches file changes)                          │
│     └─ persistent-process-manager.js (keeps services alive) │
│        ├─ web-server.js          (3000) 🌐                 │
│        └─ orchestrator.js         (3123) ⚙️                 │
│           ├─ training-server      (3001) 🎓                │
│           ├─ meta-server          (3002) 🧠                │
│           ├─ budget-server        (3003) 💰                │
│           ├─ coach-server         (3004) 🏆                │
│           ├─ cup-server           (3005) 🏅                │
│           ├─ product-dev-server   (3006) 📦                │
│           ├─ segmentation-server  (3007) 📊                │
│           ├─ reports-server       (3008) 📈                │
│           ├─ capabilities-server  (3009) ⚙️                │
│           ├─ provider-service     (3200) 🔌                │
│           └─ ...                                            │
│                                                             │
│  NEW: Metrics Hub                                           │
│  └─ metrics-hub.js                (3010) 📡                │
│     ├─ Real-time metrics collection                        │
│     ├─ WebSocket live updates                              │
│     └─ Service health aggregation                          │
│                                                             │
│  NEW: Alert Engine (on web-server)                          │
│  └─ /api/v1/system/alerts/*                                │
│     ├─ Rule management                                     │
│     ├─ Alert triggering                                    │
│     └─ Auto-remediation                                    │
│                                                             │
│  NEW: Provider Scorecard (on reports-server)                │
│  └─ /api/v1/reports/provider-performance                   │
│     ├─ Leaderboard                                         │
│     ├─ Performance trends                                  │
│     └─ AI insights                                         │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. **nodemon watches for changes**
   - Monitors: `servers/`, `engine/`, `lib/`, `api/`, `services/`
   - Delay: 1 second (prevents rapid re-reloads)
   - On change: Restarts the persistent process manager

### 2. **Persistent Process Manager keeps services alive**
   - Spawns web-server and orchestrator
   - Orchestrator spawns all other services
   - If a service crashes, it auto-restarts with exponential backoff
   - Max 5 restart attempts within 30-second window

### 3. **Services use hot-reload modules**
   - Web server has hot-reload middleware enabled
   - File changes in `lib/` are auto-detected
   - No need to close connections – they stay open

## Available Commands

```bash
# Start hot-reload development
npm run dev:hot

# Check service status
npm run dev:hot-status

# Stop all services
npm run dev:hot-stop

# Restart all services
npm run dev:hot-restart

# Start individual services (if needed)
npm run start:metrics-hub
npm run start:alert-engine
npm run start:training
# etc...
```

## Monitoring & Testing

### Real-Time Metrics Dashboard
```bash
curl http://127.0.0.1:3010/api/v1/metrics/dashboard
```

Returns:
```json
{
  "stats": {
    "serviceHealth": {
      "healthy": 13,
      "degraded": 0,
      "offline": 0,
      "total": 13,
      "healthPercentage": 100
    },
    "performance": {
      "avgResponseTime": 45,
      "minResponseTime": 12,
      "maxResponseTime": 234
    }
  },
  "services": [
    {
      "id": "web",
      "name": "Web Server (API Proxy)",
      "status": "healthy",
      "responseTime": 23,
      "healthy": true
    },
    // ... more services
  ]
}
```

### Alert Status
```bash
curl http://127.0.0.1:3000/api/v1/system/alerts/status
```

### Provider Performance Leaderboard
```bash
curl http://127.0.0.1:3008/api/v1/reports/provider-performance
```

### WebSocket Live Updates (Metrics Hub)
```bash
# In Node.js/browser:
const ws = new WebSocket('ws://127.0.0.1:3010/ws/metrics');
ws.on('message', (data) => {
  const update = JSON.parse(data);
  console.log(update.data.stats); // Live stats
});
```

## Alert Rules (Auto-Remediation)

### Add a Custom Alert Rule
```bash
curl -X POST http://127.0.0.1:3000/api/v1/system/alerts/rules \
  -H 'Content-Type: application/json' \
  -d '{
    "metric": "service.responseTime",
    "operator": ">",
    "threshold": 5000,
    "severity": "warning",
    "action": "restart-service",
    "actionParams": {"serviceId": "training"},
    "description": "Restart training if response time > 5s"
  }'
```

### Test Alert Trigger
```bash
curl -X POST http://127.0.0.1:3000/api/v1/system/alerts/trigger \
  -H 'Content-Type: application/json' \
  -d '{"metric":"service.responseTime","value":6000}'
```

## Troubleshooting

### Service offline after file change
```bash
# Check status
npm run dev:hot-status

# If stuck, stop and restart
npm run dev:hot-stop
npm run dev:hot
```

### Port already in use
```bash
# Kill all node processes
pkill -f "node servers"

# Then restart
npm run dev:hot
```

### WebSocket connection failing
Ensure `ws` package is installed:
```bash
npm install ws
```

### File changes not reloading
Check nodemon logs:
```bash
tail -f logs/hot-reload/development.log
```

## File Structure

```
TooLoo.ai/
├── nodemon.json                         # Nodemon config (watches changes)
├── scripts/
│   ├── hot-reload-dev.sh               # Main hot-reload startup script
│   └── persistent-process-manager.js   # Keeps services alive
├── servers/
│   ├── metrics-hub.js                  # NEW: Real-time metrics (3010)
│   ├── alert-engine.js                 # NEW: Alert system
│   ├── provider-scorecard.js           # NEW: Provider leaderboard
│   ├── web-server.js                   # API proxy (3000)
│   ├── orchestrator.js                 # Service orchestrator (3123)
│   ├── training-server.js              # (3001)
│   └── ... 8 other services
├── lib/
│   ├── hot-reload-manager.js           # Hot-reload middleware
│   ├── service-foundation.js           # Base service class
│   ├── circuit-breaker.js              # Fault tolerance
│   └── ... other libraries
└── package.json                        # NPM config (includes dev:hot scripts)
```

## Development Workflow

1. **Start hot-reload:**
   ```bash
   npm run dev:hot
   ```

2. **Edit code** (e.g., `servers/web-server.js` or `lib/some-module.js`)

3. **Save file** – nodemon detects change (1s delay)

4. **Services auto-reload** – persistent process manager restarts cleanly

5. **Test your changes** immediately without restarting npm

6. **Check metrics** at http://127.0.0.1:3010/api/v1/metrics/dashboard

## Performance Notes

- **Metrics collection:** Every 5 seconds (low overhead)
- **Health checks:** Every service checks every 5 seconds
- **WebSocket updates:** Real-time, batched per 5s cycle
- **Memory usage:** ~200-300MB for all 13 services combined

## Integration with CI/CD

For production deployment, use standard `npm run start` which uses the orchestrator without hot-reload:

```bash
npm run start      # Production startup (no hot-reload)
npm run dev:hot    # Development with hot-reload
```

## FAQ

**Q: Do I need to restart npm if I change a file?**
A: No! Save your file and the changes apply automatically.

**Q: What if the web server crashes?**
A: Persistent process manager auto-restarts it within 2 seconds.

**Q: Can I access metrics from my browser?**
A: Yes! Metrics Hub provides WebSocket at `ws://127.0.0.1:3010/ws/metrics`

**Q: How do I add a new service?**
A: Add it to `SERVICE_REGISTRY` in `orchestrator.js`, then restart.

**Q: Can I test with the old `npm run dev`?**
A: Yes, both work. `npm run dev` uses `startup.sh` (no hot-reload). `npm run dev:hot` uses the new hot-reload system.

---

**Created:** November 17, 2025
**Status:** Production-Ready ✅
