# TooLoo Server Management — Professional Development Guide

> **Purpose:** Enterprise-grade server lifecycle management for development, testing, and production environments. Live servers with hot reload, graceful shutdown, health monitoring, and automatic recovery.

---

## 🎯 Overview

TooLoo now includes a **professional-grade server manager** (`scripts/server-manager.js`) that handles:

- ✅ **Concurrent server startup** (all at once or sequentially)
- ✅ **Hot reload on file changes** (development mode only)
- ✅ **Health checks** (automatic monitoring)
- ✅ **Graceful shutdown** (with timeout fallback)
- ✅ **Automatic restart** (with backoff delays)
- ✅ **Environment-specific configs** (dev/test/prod)
- ✅ **Live process monitoring** (PID, port, status)
- ✅ **Error isolation** (one server failing doesn't block others)

---

## 📦 Quick Start

### Development Mode (All Servers + Hot Reload)

```bash
npm run servers:dev
# Or with full hot reload:
npm run servers:hot-reload
```

### Testing Mode (Services Pre-Warmed)

```bash
npm run servers:test
```

### Production Mode (Optimized)

```bash
npm run servers:prod
```

### Individual Server Control

```bash
npm run servers:start:web         # Start only web server
npm run servers:start:training    # Start only training server
npm run servers:start:meta        # Start only meta server
npm run servers:restart           # Restart all services
npm run servers:status            # View live server status
npm run servers:stop              # Graceful shutdown
```

---

## 🔧 How It Works

### 1. Server Manager Architecture

```
┌─────────────────────────────────────────┐
│   scripts/server-manager.js (CLI)       │
├─────────────────────────────────────────┤
│  ServerManager Class                    │
│  ├─ defineServer()                      │
│  ├─ start() / startAll()                │
│  ├─ stop() / stopAll()                  │
│  ├─ restart()                           │
│  ├─ checkHealth()                       │
│  ├─ handleRestart()                     │
│  ├─ setupHotReload()                    │
│  └─ status()                            │
├─────────────────────────────────────────┤
│  npm run servers:*                      │
│  Development | Testing | Production     │
└─────────────────────────────────────────┘
```

### 2. Server Lifecycle

```
START
  ↓
[spawn node process]
  ↓
Wait for health check (1s timeout)
  ↓
✓ Healthy? → Running (auto health check every 5s)
✗ Timeout? → Continue (might still be starting)
  ↓
Setup hot reload (if development + watch patterns)
  ↓
Monitor for crashes
  ↓
Crash detected?
  ├─ Backoff delay (1s → 2s → 4s → 8s → 16s)
  ├─ Max 5 restarts per 60s window
  ├─ Auto-restart with new PID
  └─ Report failure if max exceeded
  ↓
STOP
  ├─ SIGTERM (graceful)
  ├─ 5s timeout
  ├─ SIGKILL if needed
  └─ Cleanup watchers
```

### 3. Health Check Protocol

Each server can define a `healthUrl`:

```javascript
{
  name: 'web-server',
  port: 3000,
  healthUrl: 'http://127.0.0.1:3000/health'
}
```

Manager checks every 5 seconds:
- **200 OK** → Server is healthy ✅
- **Timeout** → Server might be starting ⏳
- **No response** → Server not ready ❌

---

## 💻 Usage Patterns

### Pattern 1: Development (Hot Reload)

**Scenario:** You're editing code and want servers to restart automatically.

```bash
npm run servers:dev
# Or with explicit hot reload:
npm run servers:hot-reload

# Edit a file like servers/web-server.js
# → Server automatically restarts
# → All requests served with new code
# → No manual restart needed
```

**Configuration:**
```javascript
{
  mode: 'development',
  hotReload: true,
  watch: ['servers/**/*.js', 'engine/**/*.js']
}
```

### Pattern 2: Testing (Pre-Warmed)

**Scenario:** Running test suites that need servers ready.

```bash
npm run servers:test    # Start all servers in test mode
npm run test            # Run test suite
npm run servers:stop    # Clean shutdown
```

**Environment:** `NODE_ENV=testing`
- All services start but with test configs
- Mocked providers if needed
- Faster startup (no initialization overhead)

### Pattern 3: Production (Optimized)

**Scenario:** Running in production with monitoring.

```bash
npm run servers:prod    # Start all servers optimized
npm run servers:status  # Check status periodically
```

**Environment:** `NODE_ENV=production`
- No hot reload
- Error isolation (failed service doesn't block others)
- Automatic restart on crash
- Max 5 restarts per 60s (circuit breaker)

### Pattern 4: Individual Service Testing

**Scenario:** Testing or debugging one service.

```bash
npm run servers:start:web     # Start only web server
npm run servers:start:meta    # Start only meta server in new terminal
npm run servers:status        # View which servers are running
```

### Pattern 5: Monitoring

**Scenario:** Watch server status in real-time.

```bash
npm run servers:monitor       # Shows status every 2 seconds

# Output:
# ┌─────────────────────────────────────────────────────────────┐
# │ name               │ port │ running │ pid   │ healthy │ url │
# ├─────────────────────────────────────────────────────────────┤
# │ web-server        │ 3000 │ true    │ 12345 │ true    │ ... │
# │ training-server   │ 3001 │ true    │ 12346 │ true    │ ... │
# │ meta-server       │ 3002 │ true    │ 12347 │ true    │ ... │
# └─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Advanced Configuration

### Custom Server Manager Setup

Create a custom manager in your application:

```javascript
// scripts/my-server-setup.js
const ServerManager = require('./server-manager');

const manager = new ServerManager({ mode: 'development' });

manager
  .defineServer('api', {
    script: 'servers/api.js',
    port: 3000,
    watch: ['servers/api.js', 'api/**/*.js'],
    healthUrl: 'http://127.0.0.1:3000/health',
    env: { DEBUG: 'api:*' }
  })
  .defineServer('worker', {
    script: 'servers/worker.js',
    port: 3001,
    maxRestarts: 10,
    timeout: 5000
  })
  .setupGracefulShutdown();

// Start all
manager.startAll().then(() => {
  console.log('All servers ready');
});

// Stop on demand
process.on('SIGINT', () => manager.stopAll());
```

### Environment Variables

```bash
# Development with debug logging
NODE_ENV=development DEBUG=* npm run servers:dev

# Testing with custom ports
PORT_WEB=4000 PORT_TRAINING=4001 npm run servers:test

# Production with strict health checks
NODE_ENV=production HEALTH_TIMEOUT=10000 npm run servers:prod
```

### Hot Reload Patterns

**Restart only the web server on change:**
```bash
npm run servers:hot-reload    # All servers start with hot reload
# Edit servers/web-server.js → auto-restarts that service
```

**Custom watch patterns:**
```javascript
manager.defineServer('api', {
  script: 'servers/api.js',
  port: 3000,
  watch: [
    'servers/**/*.js',           // Watch all server files
    'engine/**/*.js',            // Watch engine logic
    'config/**/*.json',          // Watch config changes
    '!tests/**'                  // Exclude tests
  ]
});
```

---

## 📊 Live Monitoring

### View Current Status

```bash
npm run servers:status

# Output:
# {
#   "web-server": {
#     "name": "web-server",
#     "port": 3000,
#     "running": true,
#     "pid": 12345,
#     "healthy": true,
#     "restarts": 0,
#     "url": "http://127.0.0.1:3000"
#   },
#   "training-server": {
#     "name": "training-server",
#     "port": 3001,
#     "running": true,
#     "pid": 12346,
#     "healthy": true,
#     "restarts": 0,
#     "url": "http://127.0.0.1:3001"
#   }
# }
```

### Watch Status in Real-Time

```bash
npm run servers:monitor

# Updates every 2 seconds, showing all server status
```

### Query Individual Server

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3002/health
```

---

## 🧪 Testing with Live Servers

### Strategy 1: Servers + Tests Together

```bash
# Terminal 1: Start servers
npm run servers:test

# Terminal 2: Run tests (in new terminal)
npm test

# Terminal 3: Monitor (optional)
npm run servers:monitor
```

### Strategy 2: Scripted Test Run

```bash
# scripts/test-with-servers.sh
#!/bin/bash

npm run servers:test & SERVERS_PID=$!
sleep 3  # Wait for servers to start
npm test
npm run servers:stop
```

Then run:
```bash
chmod +x scripts/test-with-servers.sh
./scripts/test-with-servers.sh
```

### Strategy 3: Individual Server Testing

```bash
# Test only web server
npm run servers:start:web
npm run test:web

# Test only training server
npm run servers:start:training
npm run test:training
```

---

## ⚠️ Troubleshooting

### Server won't start

```bash
# Check if port is already in use
lsof -i :3000
# If something is using port 3000:
kill -9 <PID>

# Or cleanup all TooLoo processes
npm run stop:all
```

### Hot reload not working

```bash
# Ensure you're in development mode
npm run servers:dev

# Check if watch patterns are correct
ls servers/web-server.js         # Make sure file exists
```

### Server keeps restarting

```bash
# Check server logs
tail -f /tmp/tooloo-*.log

# Check for errors
npm run servers:start:web 2>&1 | grep -i error
```

### Health check failing

```bash
# Check health endpoint directly
curl http://127.0.0.1:3000/health

# If no response, server might not be ready yet
# Give it more time to start
sleep 5 && curl http://127.0.0.1:3000/health
```

---

## 🔄 Lifecycle Examples

### Example 1: Full Development Cycle

```bash
# 1. Start all servers with hot reload
npm run servers:dev

# 2. In another terminal, run tests
npm test

# 3. Edit a file (e.g., servers/web-server.js)
# → Server automatically restarts
# → No manual action needed

# 4. Check status anytime
npm run servers:status

# 5. When done, graceful shutdown
npm run servers:stop
```

### Example 2: Test Multiple Scenarios

```bash
# Scenario 1: All servers running
npm run servers:dev

# Test something
curl http://127.0.0.1:3000/api

# Scenario 2: Only web server
npm run servers:stop
npm run servers:start:web

# Test web-only behavior
curl http://127.0.0.1:3000/api

# Scenario 3: Back to full
npm run servers:restart

# Verify
npm run servers:status
```

### Example 3: Debugging a Service

```bash
# Start only the service you want to debug
npm run servers:start:training

# Check if it's healthy
npm run servers:status

# Tail its logs
tail -f /tmp/tooloo-training.log

# Once fixed, restart it
npm run servers:restart
```

---

## 📋 Commands Reference

| Command | Purpose | Mode |
|---------|---------|------|
| `npm run servers:dev` | Start all + hot reload | Development |
| `npm run servers:test` | Start all for testing | Testing |
| `npm run servers:prod` | Start all optimized | Production |
| `npm run servers:hot-reload` | Explicit hot reload setup | Development |
| `npm run servers:start` | Start all services | Current |
| `npm run servers:start:web` | Start only web server | Current |
| `npm run servers:start:training` | Start only training server | Current |
| `npm run servers:start:meta` | Start only meta server | Current |
| `npm run servers:restart` | Restart all services | Current |
| `npm run servers:stop` | Graceful shutdown | Current |
| `npm run servers:status` | View current status | Current |
| `npm run servers:monitor` | Watch status (2s updates) | Current |

---

## 🎓 Best Practices

### ✅ DO:
- Use `npm run servers:dev` during development
- Use `npm run servers:test` before running test suites
- Check status with `npm run servers:status` to verify readiness
- Use hot reload to iterate quickly
- Keep watch patterns focused on relevant directories
- Use environment variables for configuration

### ❌ DON'T:
- Kill processes manually (`kill -9`) — use `npm run servers:stop`
- Start services in production with hot reload
- Ignore health check failures
- Leave orphaned Node processes
- Rely on order of service startup

---

## 🔗 Integration Points

The server manager integrates with:

1. **GitHub Actions** — Use `npm run servers:test` before running tests
2. **CI/CD** — Use `npm run servers:prod` for production deployments
3. **Testing** — Use `npm run servers:test` to pre-warm services
4. **Development** — Use `npm run servers:dev` for hot reload workflow
5. **Monitoring** — Use `npm run servers:monitor` for status tracking

---

## 📞 Support

For issues or questions about server management:

1. Check logs: `tail -f /tmp/tooloo-*.log`
2. Check status: `npm run servers:status`
3. Review this guide (especially Troubleshooting section)
4. Check for port conflicts: `lsof -i :3000`
5. Check for zombie processes: `ps aux | grep node`

---

**Status:** ✅ Production Ready | **Last Updated:** November 17, 2025
