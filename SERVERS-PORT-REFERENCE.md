# TooLoo.ai Server Ports Reference

> **Purpose:** Document which ports are required, optional, and which are NOT NEEDED for TooLoo.ai operations.

---

## 🎯 Required Ports (Always Start)

| Port | Server | Purpose | Status |
|------|--------|---------|--------|
| **3000** | web-server | API proxy, UI, control surface | ✅ REQUIRED |
| **3001** | training-server | Selection engine, hyper-speed rounds | ✅ REQUIRED |
| **3002** | meta-server | Meta-learning phases & boosts | ✅ REQUIRED |
| **3003** | budget-server | Provider status, burst cache, policy tuning | ✅ REQUIRED |
| **3004** | coach-server | Auto-Coach loop + Fast Lane | ✅ REQUIRED |
| **3006** | product-development-server | Workflows, analysis, artifacts | ✅ REQUIRED |
| **3007** | segmentation-server | Conversation segmentation & traits | ✅ REQUIRED |
| **3008** | reports-server | Reporting and analytics | ✅ REQUIRED |
| **3009** | capabilities-server | Capability activation & orchestration | ✅ REQUIRED |

**Total: 9 servers**

---

## ⚠️ Optional/Auxiliary Ports

These servers exist but are NOT started by default:

| Port | Server | Purpose | Usage |
|------|--------|---------|-------|
| 3100 | orchestration-service | Service orchestration (optional) | On-demand |
| 3200 | provider-service | Provider management | On-demand |
| 3300 | analytics-service | Advanced analytics | On-demand |
| 3123 | orchestrator.js | System orchestration | Alternative to 3100 |

**Status:** Optional — start only if needed for specific features

---

## ❌ NOT NEEDED (Legacy/Unused)

| Port | Server | Reason |
|------|--------|--------|
| **3005** | cup-server (NOT FOUND) | **DOESN'T EXIST** — Remove from any documentation |

**Note:** Port 3005 is mentioned in some legacy documentation but the server file doesn't exist. This port is safe to ignore.

---

## 🚀 Quick Reference

### Start All Required Servers
```bash
npm run servers:dev        # Development (with hot reload)
npm run servers:test       # Testing mode
npm run servers:prod       # Production mode
npm run servers:start      # All required servers
```

### Start Individual Servers
```bash
npm run servers:start:web              # Port 3000
npm run servers:start:training         # Port 3001
npm run servers:start:meta             # Port 3002
# Plus: budget, coach, product, segmentation, reports, capabilities
```

### View All Configured Servers
```bash
npm run servers:status
```

### Stop All
```bash
npm run servers:stop
```

---

## 📊 Architecture Summary

```
┌─────────────────────────────────────────────────┐
│         TOOLOO.AI CORE SERVICE TIER              │
├─────────────────────────────────────────────────┤
│ Port 3000  → Web Server (API Proxy)             │
│ Port 3001  → Training Server                    │
│ Port 3002  → Meta Server                        │
│ Port 3003  → Budget Server                      │
│ Port 3004  → Coach Server                       │
│ Port 3006  → Product Development Server         │
│ Port 3007  → Segmentation Server                │
│ Port 3008  → Reports Server                     │
│ Port 3009  → Capabilities Server                │
└─────────────────────────────────────────────────┘
           9 Required Core Services

   Optional: Orchestration (3100), Provider (3200), Analytics (3300)
```

---

## 🔍 Port Availability Check

To verify which ports are in use:

```bash
# Check if specific port is in use
lsof -i :3000

# Check all TooLoo ports
lsof -i :3000-3009

# Kill any stray processes
pkill -f "node.*servers"
```

---

## 🚨 Common Issues

### Port Already in Use
**Problem:** Cannot start servers because port is already taken
```bash
# Find what's using the port
lsof -i :3000
# Kill the process
kill -9 <PID>
# Or clean all
npm run stop:all
```

### Port 3005 Mentioned in Error
**Problem:** Documentation mentions port 3005 (cup-server)
**Solution:** That server doesn't exist. Ignore references to port 3005.

### Missing Server Error
**Problem:** Server file doesn't exist when trying to start
**Solution:** Check `ls /workspaces/TooLoo.ai/servers/*.js` for available servers

---

## 📝 Server Status Legend

When you run `npm run servers:status`:

```
┌─────────────────┬───────────────────┬──────┬─────────┬────┬─────────┬──────────┐
│ name            │ name              │ port │ running │ pid│ healthy │ restarts │
├─────────────────┼───────────────────┼──────┼─────────┼────┼─────────┼──────────┤
│ web-server      │ 'web-server'      │ 3000 │ true    │123 │ true    │ 0        │
└─────────────────┴───────────────────┴──────┴─────────┴────┴─────────┴──────────┘

Meaning:
  running: Is the process currently running?
  pid:     Process ID (null if not running)
  healthy: Did the last health check pass?
  restarts: How many times has it auto-restarted?
```

---

## 🎓 Development Workflow

### Development (Hot Reload)
```bash
npm run servers:dev
# All 9 servers start
# File changes trigger auto-restart
# Logs visible in terminal
```

### Testing
```bash
npm run servers:test
npm test
npm run servers:stop
```

### Production
```bash
npm run servers:prod
npm run servers:monitor    # Watch status in another terminal
```

---

## ✅ Port Allocation Summary

**Total Ports Used: 9 (3000-3009, skipping 3005)**

| Range | Purpose | Count | Required |
|-------|---------|-------|----------|
| 3000-3004 | Core services | 5 | Yes |
| 3005 | **Doesn't exist** | 0 | No |
| 3006-3009 | Extended services | 4 | Yes |
| 3100-3300 | Optional services | 3+ | No |

---

## 🔗 Related Documentation

- See: `SERVERS-PROFESSIONAL-MANAGEMENT.md` for complete management guide
- Check: `.github/copilot-instructions.md` for system architecture
- Reference: `launch-tooloo.sh` for startup sequence

---

**Last Updated:** November 17, 2025  
**Status:** ✅ Accurate & Current
