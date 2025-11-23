# TooLoo.ai Hot-Reload Quick Start (5 Minutes)

## 🚀 Start Here

```bash
# Install dependencies (first time only)
npm install

# Start hot-reload development with all services online
npm run dev:hot
```

**That's it!** All 13 services are now running with automatic hot-reload.

## ✅ Verify It Works

In another terminal:

```bash
# Check web server
curl http://127.0.0.1:3000/health

# Check metrics hub (NEW)
curl http://127.0.0.1:3010/api/v1/metrics/dashboard

# Check alert system (NEW)
curl http://127.0.0.1:3000/api/v1/system/alerts/status

# Check provider leaderboard (NEW)
curl http://127.0.0.1:3008/api/v1/reports/provider-performance
```

All services should return 200 OK with JSON.

## 📍 Service Ports

```
Port 3000:  Web Server (API proxy)                      🌐
Port 3001:  Training Server                             🎓
Port 3002:  Meta Server                                 🧠
Port 3003:  Budget Server                               💰
Port 3004:  Coach Server                                🏆
Port 3005:  Cup Server                                  🏅
Port 3006:  Product Development Server                  📦
Port 3007:  Segmentation Server                         📊
Port 3008:  Reports Server                              📈
Port 3009:  Capabilities Server                         ⚙️
Port 3010:  Metrics Hub (NEW)                           📡
Port 3100:  Orchestration Service                       ⚙️
Port 3200:  Provider Service                            🔌
Port 3300:  Analytics Service                           📊
```

## 🔄 Hot-Reload in Action

1. **Edit a file** (e.g., `servers/web-server.js`)
2. **Save it** – nodemon detects change (1s delay)
3. **Services auto-restart** – no downtime
4. **Test immediately** – changes live

You never need to restart `npm run dev:hot`!

## 🛑 Stop Services

```bash
npm run dev:hot-stop
```

## 📊 Monitoring Commands

```bash
# Real-time metrics dashboard
curl http://127.0.0.1:3010/api/v1/metrics/dashboard

# Check service status
npm run dev:hot-status

# Get alert status
curl http://127.0.0.1:3000/api/v1/system/alerts/status

# Provider performance leaderboard
curl http://127.0.0.1:3008/api/v1/reports/provider-performance

# Live metrics via WebSocket
# In Node.js/browser:
const ws = new WebSocket('ws://127.0.0.1:3010/ws/metrics');
ws.on('message', (data) => console.log(JSON.parse(data)));
```

## 🚨 Alert Rules (Auto-Remediation)

Add an alert that restarts a service if response time > 5 seconds:

```bash
curl -X POST http://127.0.0.1:3000/api/v1/system/alerts/rules \
  -H 'Content-Type: application/json' \
  -d '{
    "metric": "service.responseTime",
    "operator": ">",
    "threshold": 5000,
    "severity": "warning",
    "action": "restart-service",
    "actionParams": {"serviceId": "training"}
  }'
```

Test it:

```bash
curl -X POST http://127.0.0.1:3000/api/v1/system/alerts/trigger \
  -H 'Content-Type: application/json' \
  -d '{"metric":"service.responseTime","value":6000}'
```

## 🏆 Provider Leaderboard

Get ranked list of providers by performance:

```bash
curl http://127.0.0.1:3008/api/v1/reports/provider-performance

# With trends:
curl "http://127.0.0.1:3008/api/v1/reports/provider-performance?trends=true"

# Get insights:
curl http://127.0.0.1:3008/api/v1/reports/provider-insights
```

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Service won't start | `npm run dev:hot-stop` then `npm run dev:hot` |
| Port already in use | `pkill -f "node servers"` then restart |
| Changes not reloading | Check `logs/hot-reload/development.log` |
| WebSocket failing | `npm install ws` then restart |

## 📝 NPM Commands

```bash
npm run dev:hot          # Start hot-reload development (USE THIS!)
npm run dev:hot-status   # Check service health
npm run dev:hot-stop     # Stop all services
npm run dev:hot-restart  # Restart all services
npm run start:metrics-hub      # Start metrics hub individually
npm run start:alert-engine     # Start alert engine individually
```

## 🆚 Differences from `npm run dev`

| Feature | `npm run dev` | `npm run dev:hot` |
|---------|--------------|------------------|
| Hot-reload | ❌ No | ✅ Yes |
| Auto-restart on changes | ❌ No | ✅ Yes |
| Metrics Hub | ❌ No | ✅ Yes |
| Alert Engine | ❌ No | ✅ Yes |
| Provider Scorecard | ❌ No | ✅ Yes |
| Type | Production-like | Development |

## 🎓 Learn More

- **Full setup guide:** See `HOT-RELOAD-SETUP.md`
- **Architecture details:** See `HOT-RELOAD-SETUP.md` for system diagram
- **Advanced monitoring:** WebSocket live updates, custom metrics

---

**Status:** ✅ Production-Ready
**Last Updated:** November 17, 2025


---

## Environment Variables

Add to `.env` to customize:

```bash
# Enable/disable hot-reload
HOT_RELOAD=true

# Verbose logging (very detailed)
HOT_RELOAD_VERBOSE=true
HOT_UPDATE_VERBOSE=true
```

---

## Code Examples

### Using HotReloadManager

```javascript
import { setupAppHotReload } from './lib/hot-reload-manager.js';

const hotReloadManager = setupAppHotReload(app, {
  enabled: true,
  verbose: true,
  debounceDelay: 300
});

// Watch a file
hotReloadManager.watchFile('lib/my-module.js');

// Get status
const status = hotReloadManager.getStatus();
console.log(`Watching ${status.watchedFiles} files`);

// Reload all
await hotReloadManager.reloadAll();
```

### Using HotUpdateManager

```javascript
import { setupAppHotUpdate } from './lib/hot-update-manager.js';

const hotUpdateManager = setupAppHotUpdate(app, {
  enabled: true,
  maxHistory: 100
});

// Register new endpoint
await hotUpdateManager.registerEndpoint('POST', '/api/v1/analyze', async (req, res) => {
  const result = await analyze(req.body);
  res.json({ ok: true, result });
});

// View registered endpoints
const endpoints = hotUpdateManager.getEndpoints();
console.log(`${endpoints.length} endpoints`);

// View history
const history = hotUpdateManager.getHistory(10);
```

---

## Testing

### Automated Test
```bash
node scripts/test-hot-reload.js
```

Tests all admin endpoints and reports status.

### Manual Testing Sequence

1. **Check health**
   ```bash
   curl http://127.0.0.1:3000/health
   ```

2. **Check reload status**
   ```bash
   curl http://127.0.0.1:3000/api/v1/admin/hot-reload-status | jq .hotReload
   ```

3. **Trigger reload**
   ```bash
   curl -X POST http://127.0.0.1:3000/api/v1/admin/hot-reload | jq .ok
   ```

4. **Check endpoints**
   ```bash
   curl http://127.0.0.1:3000/api/v1/admin/endpoints | jq '.endpoints | length'
   ```

---

## What Gets Hot-Reloaded?

Currently watched file:
- `servers/web-server.js` - Main server code

To watch additional files, add to web-server.js:

```javascript
hotReloadManager.watchFile('lib/my-module.js');
hotReloadManager.watchFile('services/my-service.js');
```

---

## Troubleshooting

### Admin endpoints return 404
**Solution**: Restart web-server
```bash
pkill -f "node servers/web-server"
npm run dev
```

### Hot-reload not detecting changes
**Solution**: Check if enabled in `.env`
```bash
grep HOT_RELOAD .env
```

Enable it:
```bash
echo "HOT_RELOAD=true" >> .env
```

### Verbose logging
**Enable detailed logs**:
```bash
HOT_RELOAD_VERBOSE=true npm run dev
```

### Manual reload
**If automatic detection fails**:
```bash
curl -X POST http://127.0.0.1:3000/api/v1/admin/hot-reload
```

---

## Performance Tips

1. **Debounce Delay** - Prevents rapid reloads
   - Default: 300ms
   - Increase if seeing multiple reloads per save

2. **Watched Files** - Only watch files that change
   - Currently: 1 file (web-server.js)
   - Minimize to reduce overhead

3. **History Limit** - Configurable update history
   - Default: 100 entries
   - Older entries are automatically purged

---

## Related Docs

- **Full Guide**: `docs/HOT-RELOAD-IMPLEMENTATION.md`
- **API Reference**: `docs/ADMIN-API.md`
- **Architecture**: `docs/ARCHITECTURE-CORE.md`

---

## Quick Links

| Resource | URL |
|----------|-----|
| Web Server | http://127.0.0.1:3000 |
| Health Check | http://127.0.0.1:3000/health |
| Reload Status | http://127.0.0.1:3000/api/v1/admin/hot-reload-status |
| Manual Reload | POST http://127.0.0.1:3000/api/v1/admin/hot-reload |
| List Endpoints | http://127.0.0.1:3000/api/v1/admin/endpoints |
| Update History | http://127.0.0.1:3000/api/v1/admin/update-history |

---

## Key Capabilities

✅ **File Watching** - Automatic detection of code changes  
✅ **Module Reloading** - Load updated code without restart  
✅ **Dynamic Endpoints** - Register endpoints at runtime  
✅ **History Tracking** - Audit trail of all updates  
✅ **Admin Control** - REST API for managing reloads  
✅ **Status Reporting** - Real-time system status  

---

**Last Updated**: 2025-11-16  
**Status**: ✅ Fully Operational

