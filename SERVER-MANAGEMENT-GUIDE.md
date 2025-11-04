# 🔧 TooLoo Server Management System - Complete Guide

## Overview

A comprehensive server management system that ensures all TooLoo services stay running with automatic recovery, health monitoring, and real-time dashboards.

## Components

### 1. Server Monitor (`servers/server-monitor.js`)
**Background process that manages all services**

Features:
- Monitors 17 services across 5 ports
- Health checks every 10 seconds
- Automatic restart on failure (up to 3 attempts)
- Graceful shutdown handling
- Detailed logging to `server-monitor.log`
- Critical vs. optional service distinction

**Key Services:**
- 🔴 Critical: web-server (3000), orchestrator (3123), providers-arena (3011)
- 🟡 Optional: 14 additional services (3001-3050)

### 2. Server Manager CLI (`servers/server-manager.js`)
**Command-line interface for server control**

Commands:
```bash
npm run servers:start      # Start all services with monitoring
npm run servers:stop       # Stop all services gracefully
npm run servers:restart    # Restart all services
npm run servers:status     # Check current server status
npm run servers:logs       # View server logs
npm run servers:monitor    # Run monitor only (existing servers)
npm run servers:help       # Show help menu
```

### 3. Server Dashboard (`servers/server-dashboard.js`)
**Real-time web-based monitoring dashboard**

Access: `http://127.0.0.1:3100/`

Features:
- Visual health status cards
- Real-time service status table
- Auto-refresh every 5 seconds
- JSON API at `/api/status`
- Direct links to each service
- Critical service highlighting

---

## Quick Start

### Start All Services
```bash
npm run servers:start
```
This starts:
1. The server monitor (background process)
2. All 17 services automatically
3. Activates health monitoring
4. Enables auto-restart on failure

### Check Status
```bash
npm run servers:status
```
Shows table of all services and their status (✅ UP / ❌ DOWN)

### View Dashboard
```
http://127.0.0.1:3100/
```
Open in browser for real-time visual monitoring

### View Logs
```bash
npm run servers:logs
```
Shows last 50 lines of server monitor logs

### Stop Services
```bash
npm run servers:stop
```
Gracefully shuts down all services

### Restart Services
```bash
npm run servers:restart
```
Stops and starts all services (useful if something is stuck)

---

## Services Being Managed

### Core Services (Critical 🔴)
| Service | Port | Purpose |
|---------|------|---------|
| web-server | 3000 | UI proxy + static files |
| orchestrator | 3123 | Service orchestration |
| providers-arena | 3011 | Multi-provider AI synthesis |

### AI Services
| Service | Port | Purpose |
|---------|------|---------|
| training-server | 3001 | Learning models |
| meta-server | 3002 | Meta-learning |
| budget-server | 3003 | Provider budget tracking |
| coach-server | 3004 | Auto-coaching |
| cup-server | 3005 | Provider tournaments |

### Content & Analytics Services
| Service | Port | Purpose |
|---------|------|---------|
| product-development | 3006 | Artifact generation |
| segmentation | 3007 | Conversation analysis |
| reports-server | 3008 | Reporting |
| capabilities-server | 3009 | Capability tracking |
| capability-bridge | 3010 | Capability orchestration |
| analytics-server | 3012 | Analytics |

### Advanced Services
| Service | Port | Purpose |
|---------|------|---------|
| self-improvement | 3013 | Code self-modification |
| design-integration | 3014 | Design system + generation |

### Monitoring
| Service | Port | Purpose |
|---------|------|---------|
| activity-monitor | 3050 | Session tracking |

---

## How It Works

### Startup Flow
```
npm run servers:start
    ↓
Starts server-monitor.js
    ↓
Monitor starts critical services first:
  • web-server (3000)
  • orchestrator (3123)
  • providers-arena (3011)    ← Waits 1s between each
    ↓
Then starts optional services:
  • training-server (3001)
  • meta-server (3002)
  • ... (rest of services)   ← Waits 500ms between each
    ↓
Initial health check after 5 seconds
    ↓
Continuous monitoring begins (10s interval)
```

### Health Check Loop
```
Every 10 seconds:
  1. Test http://127.0.0.1:PORT/health
  2. If timeout, test http://127.0.0.1:PORT/
  3. If DOWN:
     - Increment failure count
     - After 3 failures, restart service
     - Log the incident
  4. If UP:
     - Reset failure count
     - Log status if changed
  5. Print summary (every ~1 minute)
```

### Auto-Restart Logic
```
Service DOWN detected
    ↓
Increment failure counter (1, 2, 3)
    ↓
At failure count = 3:
  • Log warning
  • Kill existing process
  • Wait 1 second
  • Start fresh process
  • Reset failure count
    ↓
Continue monitoring
```

---

## Features

### 🎯 Always Running
- Continuous monitoring loop
- Automatic restart on crash
- Graceful shutdown support
- Process signal handling (SIGTERM, SIGINT)

### 📊 Real-Time Monitoring
- Health checks every 10 seconds
- Visual dashboard with metrics
- JSON API for programmatic access
- Detailed logging with timestamps

### 🔴 Critical vs. Optional
- Critical services: Restarts immediately
- Optional services: 3 failures before restart
- Prevents cascade failures
- Smart recovery strategy

### 📝 Comprehensive Logging
- All events logged to `server-monitor.log`
- Timestamped entries
- Color-coded severity levels (INFO, WARN, ERROR, SUCCESS)
- 50 most recent lines accessible via CLI

### 🎨 Beautiful Dashboard
- Real-time status cards
- Service table with ports
- One-click links to each service
- Auto-refresh every 5 seconds

---

## Configuration

### Log Location
```
/workspaces/TooLoo.ai/server-monitor.log
```

### Health Check Interval
```javascript
// In server-monitor.js
const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
```

### Restart Attempts
```javascript
const MAX_RESTART_ATTEMPTS = 3;
const RESTART_COOLDOWN = 5000; // 5 seconds between restarts
```

### Services List
Edit in `servers/server-monitor.js`:
```javascript
const SERVICES = [
  { name: 'service-name', port: 3000, file: 'servers/service.js', critical: true },
  // ... more services
];
```

---

## Troubleshooting

### Services won't start
```bash
# Check if ports are already in use
npm run servers:status

# Force kill all Node processes
npm run clean:process

# Start fresh
npm run servers:start
```

### Some services failing
```bash
# View detailed logs
npm run servers:logs

# Restart all services
npm run servers:restart

# Check specific port
lsof -i :3000
```

### Dashboard not loading
```bash
# Dashboard runs on port 3100
# If blocked, check:
lsof -i :3100

# Restart dashboard
npm run servers:stop
npm run servers:start
```

### Port already in use
```bash
# Find process using port
lsof -i :3000

# Kill that process
kill -9 <PID>

# Or restart everything
npm run servers:restart
```

---

## CLI Usage Examples

### Example 1: Start and Monitor
```bash
# Terminal 1: Start services
npm run servers:start

# Terminal 2: Watch status
npm run servers:status    # Keep running this every 30s

# Terminal 3: Open dashboard
open http://127.0.0.1:3100/
```

### Example 2: Troubleshoot Service
```bash
# Check if a specific service is up
npm run servers:status | grep "3006"

# View logs for failures
npm run servers:logs | grep ERROR

# Restart if needed
npm run servers:restart
```

### Example 3: Long-term Monitoring
```bash
# Start services
npm run servers:start
# (Keep terminal open - monitor runs in foreground)

# In separate terminal, open dashboard
# http://127.0.0.1:3100/

# Services stay running as long as npm run is active
# Press Ctrl+C to stop all services
```

---

## API Reference

### Status Endpoint
```bash
GET http://127.0.0.1:3100/api/status
```

Response:
```json
{
  "byGroup": {
    "Core": [
      { "name": "web-server", "port": 3000, "status": "UP", "response": 200 },
      ...
    ]
  },
  "stats": {
    "total": 17,
    "healthy": 17,
    "critical": 3,
    "criticalTotal": 3,
    "timestamp": "2025-11-02T23:50:00Z"
  }
}
```

### Health Endpoint
```bash
GET http://127.0.0.1:3100/health
```

Response:
```json
{ "status": "ok", "uptime": 3600.5 }
```

---

## Integration with Codespace

### Automatic on Startup
You can modify `.devcontainer/devcontainer.json` to auto-start:

```json
{
  "postStartCommand": "npm run servers:start &"
}
```

### Manual Start Each Session
```bash
# When you open codespace
npm run servers:start
```

### Keep Running
The server monitor runs in the foreground. Keep that terminal open.

---

## Logs

### View Recent Logs
```bash
npm run servers:logs
```

### Follow Logs in Real-Time
```bash
tail -f server-monitor.log
```

### Filter for Errors
```bash
grep ERROR server-monitor.log
```

### Filter for Service
```bash
grep "web-server" server-monitor.log
```

---

## Future Enhancements

🎯 **Planned Features:**
- [ ] Dashboard notifications on failure
- [ ] Email alerts for critical failures
- [ ] Metrics export (Prometheus)
- [ ] Service dependency management
- [ ] Graceful degradation on cascading failures
- [ ] Resource usage monitoring (CPU, memory)
- [ ] Service configuration hot-reload
- [ ] Automated backup on crash
- [ ] Service-specific restart policies
- [ ] Load balancing for replicated services

---

## Commands Quick Reference

```bash
# Lifecycle
npm run servers:start         # Start all services
npm run servers:stop          # Stop all services
npm run servers:restart       # Restart all services

# Monitoring
npm run servers:status        # Check status
npm run servers:logs          # View logs
npm run servers:monitor       # Run monitor only

# Help
npm run servers:help          # Show help menu
```

---

## Dashboard URLs

| URL | Purpose |
|-----|---------|
| http://127.0.0.1:3100/ | Visual dashboard |
| http://127.0.0.1:3100/api/status | JSON API |
| http://127.0.0.1:3100/health | Health check |
| http://127.0.0.1:3100/help | Help page |

---

## Status

🟢 **System Status: READY**

✅ Monitor: Implemented and tested
✅ Manager CLI: Implemented and tested
✅ Dashboard: Implemented and tested
✅ Documentation: Complete
✅ Package scripts: Integrated

**Ready to use:** `npm run servers:start`

---

**Version:** 1.0  
**Last Updated:** November 2, 2025  
**Status:** Production Ready
