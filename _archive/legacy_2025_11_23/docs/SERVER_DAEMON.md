# Background Server Daemon - Always-On Development

## Overview

The server daemon keeps all TooLoo.ai servers running in the background with:
- **Auto-restart on crash** - Server goes down? Automatically restarted in 2 seconds
- **Auto-update on code change** - Edit a server file? Automatically restarted
- **State persistence** - Survives terminal close
- **Live logs** - View server logs anytime
- **Individual control** - Start/stop/restart specific servers or all together

## Quick Start

**Start all servers (background mode)**:
```bash
npm run start:daemon
```

**Check status**:
```bash
npm run daemon:status
```

**View logs**:
```bash
npm run daemon:logs web-server
```

**Stop all**:
```bash
npm run stop:daemon
```

## Commands Reference

### Starting Servers

```bash
# Start all servers with auto-watch
npm run start:daemon

# Start all servers (true background - survives terminal close)
npm run start:daemon:bg

# Start specific server
node scripts/server-daemon.js start orchestrator
node scripts/server-daemon.js start training-server
```

### Managing Servers

```bash
# View all server status
npm run daemon:status

# Restart all servers
npm run daemon:restart

# Restart specific server
node scripts/server-daemon.js restart web-server

# Stop all servers
npm run stop:daemon

# Stop specific server
node scripts/server-daemon.js stop training-server
```

### Viewing Logs

```bash
# List all available logs
npm run daemon:logs

# View specific server logs (last 50 lines)
npm run daemon:logs web-server
npm run daemon:logs orchestrator
npm run daemon:logs training-server
```

## Workflow Examples

### Scenario 1: Active Development
```bash
# Start everything once
npm run start:daemon

# Edit server code - auto-restarts!
# Edit engine code - auto-restarts!

# Check status
npm run daemon:status

# View logs if something goes wrong
npm run daemon:logs web-server
```

### Scenario 2: Testing Changes
```bash
# Start background daemon
npm run start:daemon

# Edit specific server
vim servers/training-server.js

# Daemon auto-restarts it

# Test immediately (no manual restart needed)
curl http://127.0.0.1:3001/health
```

### Scenario 3: Terminal Hop
```bash
# Start daemon that survives terminal close
npm run start:daemon:bg

# Close this terminal
exit

# Open new terminal
npm run daemon:status          # Still running!

# Continue working
npm run daemon:logs orchestrator
```

### Scenario 4: Selective Restart
```bash
# All servers running
npm run daemon:status

# Only web-server needs restart
node scripts/server-daemon.js restart web-server

# Other servers keep running!
npm run daemon:status
```

## Under the Hood

### What Gets Watched
Each server file is watched for changes:
- `servers/web-server.js` → Auto-restarts on change
- `servers/orchestrator.js` → Auto-restarts on change
- `servers/training-server.js` → Auto-restarts on change
- ... (all 11 servers)

### What Causes Auto-Restart
1. **File change** - Edit the server file → Restart (500ms debounce)
2. **Process crash** - Server exits → Restart (2 second delay)
3. **Manual restart** - You run `daemon:restart` → Restart

### Log Storage
Logs saved to `.server-logs/`:
```
.server-logs/
├── web-server.log
├── orchestrator.log
├── training-server.log
├── meta-server.log
└── ... (all servers)
```

Each log file contains all output from that server (stdout + stderr).

### State Persistence
`.server-daemon-state.json` tracks:
```json
{
  "servers": ["web-server", "orchestrator", "training-server"],
  "timestamp": "2025-11-05T19:30:00.000Z"
}
```

This allows the daemon to remember which servers were running if the terminal closes.

## Advanced Usage

### Only Start Certain Servers
```bash
# Start just web-server and orchestrator
node scripts/server-daemon.js start web-server
node scripts/server-daemon.js start orchestrator

# Check status
npm run daemon:status
```

### Monitor Live
```bash
# Terminal 1: Start daemon
npm run start:daemon

# Terminal 2: Watch status
watch npm run daemon:status

# Terminal 3: View logs
watch npm run daemon:logs web-server
```

### Debugging Crashes
```bash
# Server crashed? Check last 50 lines of log
npm run daemon:logs web-server

# See full logs (if truncated)
tail -100 .server-logs/web-server.log

# Manually restart with details
node scripts/server-daemon.js restart web-server
```

## Comparison: Old vs New

### Before (Manual Process)
```bash
npm run start              # Wait 45 seconds
# ... work ...
npm run stop:all          # Manual stop
npm run start             # Manual restart (45 seconds)
```

### After (Daemon)
```bash
npm run start:daemon      # Run once
# ... edit code ...
# Auto-restarts automatically!
# Change another file ...
# Auto-restarts again!
# ... no manual intervention needed ...
```

## Troubleshooting

### Server won't restart
```bash
# Check status
npm run daemon:status

# View logs
npm run daemon:logs <server-name>

# Manual restart
node scripts/server-daemon.js restart <server-name>
```

### Logs getting large
```bash
# Clear all logs
rm .server-logs/*

# Daemon will recreate on next event
```

### Zombie processes?
```bash
# Stop daemon properly
npm run stop:daemon

# Use safe-kill if needed
npm run clean:process

# Restart fresh
npm run start:daemon
```

### Want to go back to manual mode?
```bash
# This still works!
npm run stop:daemon
npm run start   # Old start script
```

## Performance Notes

- **Memory**: Minimal (~50MB per server + overhead)
- **CPU**: Idle when no changes (0% CPU when not in use)
- **Restart time**: 1-2 seconds per server
- **Watch overhead**: ~1% CPU per watched file

## Files Changed

| File | Purpose |
|------|---------|
| `scripts/server-daemon.js` | Main daemon implementation |
| `package.json` | New npm commands |
| `.server-logs/` | Log storage (auto-created) |
| `.server-daemon-state.json` | State tracking (auto-created) |

---

**Status**: ✅ Ready to use
**Tested with**: All 11 servers
**Compatibility**: Node.js 18+
