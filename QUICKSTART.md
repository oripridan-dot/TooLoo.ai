# 🚀 TooLoo.ai Quick Start Guide

## Starting the Application

### Option 1: Simple Start (Recommended)
```bash
npm run dev
```
This starts both API (port 3005) and Web (port 5173) servers together.

### Option 2: Clean Start (If having issues)
```bash
npm run dev:clean
```
This kills any existing processes and starts fresh.

### Option 3: Manual Start
```bash
# Terminal 1: Start API
PORT=3005 node simple-api-server.js

# Terminal 2: Start Web App
cd web-app && npm run dev
```

## Accessing the Application

- **Web Interface**: http://localhost:5173
- **API Server**: http://localhost:3005
- **Health Check**: http://localhost:3005/api/v1/health

### In GitHub Codespaces
Click the "Ports" tab and open the forwarded URL for port 5173.

## Always Load Latest UI

### Force Browser Refresh
1. **Hard Refresh**: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Clear Cache**: Open DevTools → Application → Clear Storage → Clear site data
3. **Disable Cache**: DevTools → Network tab → Check "Disable cache"

### Development Mode (Auto-reload)
The web app uses Vite with Hot Module Replacement (HMR):
- Changes to `.jsx` files reload automatically
- Changes to CSS reload without full page refresh
- If something doesn't update, check the terminal for errors

### Production Mode
```bash
npm run build
npm run start:prod
```
Production builds include cache-busting hashes in filenames.

## Troubleshooting

### "Disconnected" Status in UI
1. Check API server is running: `curl http://localhost:3005/api/v1/health`
2. Check web server is running: `curl -I http://localhost:5173`
3. Restart both servers: `npm run dev:clean`

### Port Already in Use
```bash
# Kill processes on ports
pkill -f "node.*simple-api-server"
pkill -f "vite"

# Or kill specific port
lsof -ti:3005 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Socket.IO 404 Errors
This usually means:
1. API server isn't running on port 3005
2. Vite proxy isn't configured correctly
3. Check `web-app/vite.config.js` has correct proxy target

Solution: Restart both servers with `npm run dev:clean`

### UI Not Updating
1. Check terminal for Vite errors
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear browser cache completely
4. Restart Vite: `cd web-app && npm run dev`

## Health Check

Run this to verify everything is working:
```bash
npm run health
```

Expected output:
```json
{
  "status": "healthy",
  "message": "TooLoo.ai Personal Assistant Ready",
  "system": {
    "healthy": true,
    "providers": [...6 providers...],
    "preferences": {...}
  }
}
```

## View Logs

```bash
# API logs
tail -f logs/api.log

# Web app logs
tail -f logs/web.log

# Both at once
tail -f logs/*.log
```

## Stop Servers

```bash
# Kill all TooLoo processes
pkill -f "node.*simple-api-server"
pkill -f "vite"

# Or use Ctrl+C in the terminals where they're running
```

## New Features - Self-Improvement Dashboard

Access via the **"Self-Improvement"** tab in the web interface:
- Learning metrics (success rate, timing)
- Pattern library (reusable code patterns)
- Architectural decisions (ADR tracking)
- Real-time performance monitoring

API endpoints:
- `GET /api/v1/learning/report` - Performance metrics
- `GET /api/v1/patterns/catalog` - Pattern library
- `GET /api/v1/decisions/report` - Decision history
