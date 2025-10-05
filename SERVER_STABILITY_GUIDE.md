# 🔧 Server Stability Guide

## Problem: Servers Keep Shutting Down

The servers were shutting down due to multiple concurrent startup attempts and port conflicts. This guide shows how to fix it.

---

## ✅ Solution Implemented

### 1. Stable Startup Script (`start-stable.sh`)

**What it does:**
- Cleans up any existing processes
- Starts API server on port 3005
- Starts Vite dev server on port 5173
- Runs servers in background
- Logs to `logs/api.log` and `logs/web.log`

**How to use:**
```bash
bash start-stable.sh
# or
npm run dev
# or
npm start
```

### 2. PM2 Process Manager (Optional, Production-Grade)

**What it does:**
- Automatically restarts crashed servers
- Monitors server health
- Provides detailed logs
- Handles port conflicts gracefully

**How to use:**
```bash
bash start-pm2.sh
# or
npm run start:pm2

# View status
pm2 status

# View logs
pm2 logs

# Restart
pm2 restart all

# Stop
pm2 stop all
```

### 3. Keepalive Monitor (`keepalive.sh`)

**What it does:**
- Monitors servers every 30 seconds
- Automatically restarts if they crash
- Logs all restart events

**How to use:**
```bash
bash keepalive.sh
# Runs in foreground - press Ctrl+C to stop
```

---

## 🎯 Quick Commands

### Start Servers
```bash
npm run dev              # Stable startup (recommended)
npm run start:pm2        # PM2 with auto-restart
npm run start:api        # API server only
npm run start:web        # Vite dev server only
```

### Check Status
```bash
npm run status           # Show running processes
npm run health           # Check API health
pm2 status              # PM2 status (if using PM2)
```

### Stop Servers
```bash
npm run stop            # Stop all servers
npm run stop:pm2        # Stop PM2 processes
pkill -f 'node simple-api-server.js'  # Force kill API
pkill -f 'vite'         # Force kill Vite
```

### Restart
```bash
npm run restart         # Stop and start cleanly
pm2 restart all         # Restart PM2 processes
```

### View Logs
```bash
tail -f logs/api.log           # API server logs
tail -f logs/web.log           # Vite dev server logs
tail -f logs/keepalive.log     # Keepalive monitor logs
pm2 logs tooloo-api            # PM2 API logs
pm2 logs tooloo-web            # PM2 web logs
```

---

## 🔍 Troubleshooting

### "Address already in use" Error

**Problem:** Port 3005 or 5173 is already in use.

**Solution:**
```bash
# Find and kill process using port 3005
lsof -ti:3005 | xargs kill -9

# Find and kill process using port 5173
lsof -ti:5173 | xargs kill -9

# Or use the stop command
npm run stop

# Then restart
npm run dev
```

### Servers Start But Don't Respond

**Problem:** Servers are running but not responding to requests.

**Solution:**
```bash
# Check if processes are running
npm run status

# Check logs for errors
tail -f logs/api.log
tail -f logs/web.log

# Try health check
curl http://localhost:3005/api/v1/health

# If still not working, restart
npm run restart
```

### Vite Dev Server Uses Wrong Port

**Problem:** Vite starts on 5174 instead of 5173.

**Explanation:** Port 5173 was already in use, so Vite automatically used 5174.

**Solution:**
```bash
# Kill all Vite processes
pkill -f 'vite'

# Restart
npm run dev
```

### Multiple Processes Running

**Problem:** Multiple instances of API or Vite servers running.

**Solution:**
```bash
# Kill all server processes
pkill -f 'node simple-api-server.js'
pkill -f 'vite'
pkill -f 'concurrently'

# Wait a moment
sleep 2

# Start fresh
npm run dev
```

### Servers Keep Crashing

**Problem:** Servers start but crash after a few seconds.

**Solution:**
```bash
# Use PM2 for auto-restart
npm run start:pm2

# Or use keepalive monitor in separate terminal
bash keepalive.sh

# Check logs for error details
tail -f logs/api.log
tail -f logs/web.log
```

---

## 📊 Monitoring Commands

### Check Running Processes
```bash
ps aux | grep -E "(vite|node.*simple)" | grep -v grep
```

### Check Ports in Use
```bash
lsof -i :3005  # API server
lsof -i :5173  # Vite dev server
```

### Test API Connectivity
```bash
curl http://localhost:3005/api/v1/health
curl http://localhost:3005/api/v1/github/config
```

### Test Web App
```bash
curl http://localhost:5173
# or open in browser
"$BROWSER" http://localhost:5173
```

---

## 🎨 Scripts Created

| Script | Purpose | Usage |
|--------|---------|-------|
| `start-stable.sh` | Stable startup with cleanup | `bash start-stable.sh` |
| `start-pm2.sh` | PM2 production startup | `bash start-pm2.sh` |
| `keepalive.sh` | Monitor and auto-restart | `bash keepalive.sh` |
| `pm2.config.json` | PM2 configuration | Used by PM2 |

---

## 💡 Best Practices

1. **Use `npm run dev` for development** - Most reliable startup
2. **Use PM2 for production** - Automatic restart and monitoring
3. **Check logs regularly** - `tail -f logs/api.log`
4. **Monitor health endpoint** - `npm run health`
5. **Clean restart if issues** - `npm run restart`

---

## 🚀 Current Status

As of now, both servers are running stably:

- ✅ API Server: http://localhost:3005
- ✅ Vite Dev Server: http://localhost:5173
- ✅ GitHub Dashboard: http://localhost:5173 (click "🐙 GitHub")

**Process IDs:**
- API: PID 36796
- Vite: PID 36854

**Verify:**
```bash
npm run status
npm run health
```

---

## 📝 Configuration Changes

Updated `package.json` scripts for easier management:

```json
{
  "scripts": {
    "dev": "bash start-stable.sh",
    "start": "bash start-stable.sh",
    "start:pm2": "bash start-pm2.sh",
    "stop": "pkill -f 'node simple-api-server.js' && pkill -f 'vite'",
    "restart": "npm run stop && sleep 2 && npm run start",
    "status": "ps aux | grep -E '(vite|node.*simple)' | grep -v grep"
  }
}
```

---

## 🎯 Quick Fix Commands

```bash
# Emergency restart
npm run stop && sleep 2 && npm run dev

# Force kill everything
pkill -f 'node simple-api-server.js' && pkill -f 'vite' && pkill -f 'concurrently'

# Clean start with PM2
pm2 delete all; bash start-pm2.sh

# Check everything is working
npm run status && npm run health && curl http://localhost:5173
```

---

**Last Updated:** October 4, 2025  
**Status:** ✅ Resolved - Servers running stably
