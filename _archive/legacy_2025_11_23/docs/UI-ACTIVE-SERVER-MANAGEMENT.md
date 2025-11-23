# UI-Active Server Management & Real Data Pipeline

## Overview

This system ensures that **whenever the UI is active, all backend servers automatically start and remain ready**. It also routes real data through providers instead of demo responses.

## Architecture

### Components

1. **UI Activity Monitor** (`servers/ui-activity-monitor.js`, port 3050)
   - Tracks UI sessions and activity
   - Health checks all services
   - Auto-starts services when UI is active
   - Ensures minimum viable servers running
   - Manages real data pipeline

2. **Heartbeat Injector** (`web-app/js/tooloo-heartbeat.js`)
   - Automatically injected into every HTML page
   - Sends activity heartbeats every 30 seconds
   - Tracks user sessions
   - Forces real data mode on page load

3. **Web Server Middleware** (`servers/web-server.js`)
   - Injects heartbeat script into HTML responses
   - Proxies activity monitor requests from UI
   - Manages real data routing

4. **Orchestrator Integration** (`servers/orchestrator.js`)
   - Starts UI Activity Monitor as first service
   - Maintains service dependency order

## How It Works

### Start-up Flow

```
User opens UI
    ↓
Browser loads HTML page
    ↓
[Heartbeat script injected]
    ↓
Heartbeat script sends: POST /api/v1/activity/heartbeat
    ↓
Web Server (3000) proxies to Activity Monitor (3050)
    ↓
Activity Monitor receives activity signal
    ↓
Activity Monitor health-checks all services
    ↓
Activity Monitor starts missing services (priority order):
   1. Training server
   2. Budget server  
   3. Bridge server (real data)
   4. Additional servers (up to minimum)
    ↓
All services are running & healthy
    ↓
UI displays real data & actual results
```

### Session Tracking

Each UI session is tracked by:
- **Session ID** - Persistent per browser (stored in localStorage)
- **Last Activity** - Updated on heartbeat
- **Route** - Current page being viewed
- **Activities** - List of user actions
- **Provider** - Which AI provider is currently active

### Real Data Pipeline

When a UI makes a provider call:
1. Heartbeat monitor detects activity
2. Ensures budget & bridge servers are running
3. All API calls go through actual providers
4. Results flow through the system in real-time

## Usage

### Starting the System

```bash
# Standard start (starts everything including UI monitor)
npm run dev

# Or manually:
npm run start:simple
# Then in another terminal:
node servers/ui-activity-monitor.js
```

### API Endpoints

All endpoints available through web-server proxy (port 3000):

#### Heartbeat (sent automatically by UI)
```bash
POST /api/v1/activity/heartbeat
{
  "sessionId": "ui-1234567890-xyz",
  "route": "/control-room",
  "action": "heartbeat",
  "ensureServices": true
}
```

Response:
```json
{
  "ok": true,
  "activeSessions": 1,
  "serversActive": 8,
  "serverHealth": {
    "web": { "healthy": true, "latency": 5 },
    "training": { "healthy": true, "latency": 12 },
    ...
  },
  "config": {
    "autoStart": true,
    "realDataMode": true
  }
}
```

#### Get Active Sessions
```bash
GET /api/v1/activity/sessions
```

Response:
```json
{
  "ok": true,
  "activeSessions": 2,
  "sessions": [
    {
      "sessionId": "ui-xxx",
      "userId": "user@example.com",
      "route": "/control-room",
      "activeFor": 125000,
      "lastSeen": 2350,
      "provider": "claude"
    }
  ]
}
```

#### Get Server Status
```bash
GET /api/v1/activity/servers
```

Response:
```json
{
  "ok": true,
  "activeServers": 8,
  "totalServers": 13,
  "servers": [
    {
      "name": "web",
      "port": 3000,
      "healthy": true,
      "latency": 5,
      "lastCheck": 1729520150000,
      "isRunning": true,
      "isPriority": true
    },
    ...
  ],
  "config": {
    "autoStartEnabled": true,
    "healthCheckIntervalMs": 15000,
    "realDataMode": true,
    "minActiveServers": 6
  }
}
```

#### Start All Critical Services
```bash
POST /api/v1/activity/start-all
```

#### Ensure Real Data Mode
```bash
POST /api/v1/activity/ensure-real-data
```

Response:
```json
{
  "ok": true,
  "realDataMode": true,
  "providersActive": true,
  "realDataAvailable": true
}
```

#### Update Configuration
```bash
POST /api/v1/activity/config
{
  "autoStartEnabled": true,
  "realDataMode": true,
  "minActiveServers": 6,
  "sessionTimeoutMs": 300000
}
```

## Configuration

### Environment Variables

```bash
# UI Activity Monitor port
export ACTIVITY_MONITOR_PORT=3050

# Minimum servers to keep active
export MIN_ACTIVE_SERVERS=6

# Session timeout (ms)
export SESSION_TIMEOUT_MS=300000

# Real data mode (forces actual provider responses)
export REAL_DATA_MODE=true

# Health check interval (ms)
export HEALTH_CHECK_INTERVAL_MS=15000
```

### Programmatic Configuration

Via API:
```bash
curl -X POST http://127.0.0.1:3000/api/v1/activity/config \
  -H 'Content-Type: application/json' \
  -d '{
    "autoStartEnabled": true,
    "realDataMode": true,
    "minActiveServers": 6
  }'
```

## Real Data Features

### Automatic Provider Activation
- When UI is active, the budget server (provider orchestrator) is always running
- Real provider calls go through the burst endpoint
- Responses are cached for 1 hour

### Data Routing
1. UI makes API call (e.g., chat)
2. Heartbeat ensures providers are active
3. Call routes through budget server
4. Budget server selects best provider based on:
   - Availability
   - Cost
   - Model capability
   - Cache status
5. Result returned to UI with provider metadata

### Provider Status
```bash
curl http://127.0.0.1:3000/api/v1/providers/status
```

Returns:
```json
{
  "ok": true,
  "status": {
    "deepseek": { "available": true, "enabled": true },
    "claude": { "available": true, "enabled": true },
    "ollama": { "available": true, "enabled": true },
    "gemini": { "available": false, "enabled": true }
  }
}
```

## Monitoring

### Dashboard Commands

```bash
# Check current sessions
curl http://127.0.0.1:3000/api/v1/activity/sessions

# Check server health
curl http://127.0.0.1:3000/api/v1/activity/servers

# Check provider status
curl http://127.0.0.1:3000/api/v1/providers/status

# Check budget remaining
curl http://127.0.0.1:3000/api/v1/budget
```

### Logs

Monitor the console where you ran `npm run dev`:

```
🎯 UI Activity Monitor starting...
✅ UI Activity Monitor listening on port 3050
📊 Active servers: 6/13
✅ Training service ready
✅ Budget service ready
✅ Bridge service ready
```

## Troubleshooting

### Services Not Starting

Check if activity monitor is healthy:
```bash
curl http://127.0.0.1:3050/health
```

Manually trigger server startup:
```bash
curl -X POST http://127.0.0.1:3000/api/v1/activity/start-all
```

### Real Data Not Working

Ensure real data mode is active:
```bash
curl -X POST http://127.0.0.1:3000/api/v1/activity/ensure-real-data
```

Check budget server:
```bash
curl http://127.0.0.1:3000/api/v1/budget
curl http://127.0.0.1:3000/api/v1/providers/status
```

### Session Tracking Issues

Clear session ID and reload:
```javascript
// In browser console
localStorage.removeItem('tooloo-session-id');
location.reload();
```

## Integration with Existing UI

The heartbeat script is **automatically injected** into all HTML pages served by the web server. No manual integration needed.

To verify injection:
1. Open any page (e.g., http://localhost:3000/)
2. Open DevTools → Sources
3. Look for `/js/tooloo-heartbeat.js` in the resources

To customize heartbeat config, edit `web-app/js/tooloo-heartbeat.js`:

```javascript
const config = {
  monitorUrl: 'http://127.0.0.1:3050',
  heartbeatIntervalMs: 30000,  // Every 30 seconds
  ensureServicesOnActivity: true,  // Auto-start servers
  realDataMode: true,  // Force real provider responses
  debug: false  // Enable logging
};
```

## Performance Impact

- **Heartbeat overhead**: ~5-10ms per request (cached)
- **Health checks**: Runs every 15 seconds, ~100ms total
- **Memory**: Activity monitor uses ~50-100MB
- **Network**: ~1KB per heartbeat, ~50KB/session/hour

## Next Steps

1. **Test the system**:
   ```bash
   npm run dev
   # Open http://localhost:3000/
   # Check console logs for heartbeat activity
   ```

2. **Monitor real data flow**:
   ```bash
   curl http://127.0.0.1:3000/api/v1/activity/sessions
   curl http://127.0.0.1:3000/api/v1/activity/servers
   ```

3. **Customize for your use case**:
   - Adjust minimum active servers
   - Configure real data behavior
   - Set session timeouts

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│         UI (Browser) - Any Page                 │
│  ┌───────────────────────────────────────────┐  │
│  │ [Heartbeat Script Injected]               │  │
│  │ - Sends activity every 30s                │  │
│  │ - Tracks sessions                         │  │
│  │ - Forces real data mode                   │  │
│  └───────────────────────────────────────────┘  │
└─────────────┬──────────────────────────────────┘
              │ POST /api/v1/activity/heartbeat
              ▼
┌─────────────────────────────────────────────────┐
│   Web Server (Port 3000)                        │
│  ┌───────────────────────────────────────────┐  │
│  │ [Activity Monitor Proxy]                  │  │
│  │ - Routes heartbeats to monitor            │  │
│  │ - Injects script into HTML                │  │
│  │ - Proxies real data endpoints             │  │
│  └───────────────────────────────────────────┘  │
└─────────────┬──────────────────────────────────┘
              │ Forward to port 3050
              ▼
┌─────────────────────────────────────────────────┐
│   UI Activity Monitor (Port 3050)               │
│  ┌───────────────────────────────────────────┐  │
│  │ [Session Tracker]                         │  │
│  │ - Records active sessions                 │  │
│  │ - Cleans expired sessions                 │  │
│  │                                           │  │
│  │ [Service Manager]                         │  │
│  │ - Health checks all services              │  │
│  │ - Auto-starts missing services            │  │
│  │ - Maintains minimum servers               │  │
│  │                                           │  │
│  │ [Real Data Pipeline]                      │  │
│  │ - Ensures providers are active            │  │
│  │ - Routes real results                     │  │
│  └───────────────────────────────────────────┘  │
└─────────────┬──────────────────────────────────┘
              │ Manages & monitors
              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Backend Services                               │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐ │
│  │ Training    │ │ Budget/Burst │ │ Bridge       │ │ Coach    │ │
│  │ (3001)      │ │ (3003)       │ │ (3010)       │ │ (3004)   │ │
│  │ [Keeps]     │ │ [Keeps]      │ │ [Keeps]      │ │ [Starts] │ │
│  └─────────────┘ └──────────────┘ └──────────────┘ └──────────┘ │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐ │
│  │ Meta        │ │ Segmentation │ │ Reporting    │ │ Analytics│ │
│  │ (3002)      │ │ (3007)       │ │ (3008)       │ │ (3012)   │ │
│  │ [Keeps]     │ │ [Keeps]      │ │ [Starts]     │ │ [Starts] │ │
│  └─────────────┘ └──────────────┘ └──────────────┘ └──────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

