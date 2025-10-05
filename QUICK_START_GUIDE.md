# 🚀 TooLoo.ai Quick Start Guide

## ONE-COMMAND START (Recommended)

```bash
cd /workspaces/TooLoo.ai
./proper-start.sh
```

This will:
- ✅ Export API keys from .env
- ✅ Stop any existing processes
- ✅ Start backend on port 3005
- ✅ Start frontend on port 5173
- ✅ Verify both are healthy
- ✅ Show PIDs and log locations

Then open: **http://localhost:5173**

---

## HEALTH CHECK

```bash
./health-check.sh
```

Shows status of:
- Backend server (port 3005)
- Frontend server (port 5173)
- Core modules (simulator, trainer, feedback, auth)
- Frontend components
- Environment configuration
- File permissions

---

## REPOSITORY CLEANUP (When Ready)

```bash
./organize-repo.sh
```

This will:
- Archive simple-api-server.js → archive/v1.0/backend/
- Archive packages/ → archive/unused/
- Organize docs into docs/archive/
- Create development and staging branches
- Update .gitignore

---

## MANUAL CONTROL

### Start Backend Only
```bash
cd /workspaces/TooLoo.ai
node tooloo-server.js
# Or in background:
nohup node tooloo-server.js > logs/backend.log 2>&1 &
```

### Start Frontend Only
```bash
cd /workspaces/TooLoo.ai/web-app
npm run dev
# Or in background:
nohup npm run dev > ../logs/frontend.log 2>&1 &
```

### Check What's Running
```bash
# Check ports
lsof -i :3005  # Backend
lsof -i :5173  # Frontend

# Check processes
ps aux | grep tooloo-server | grep -v grep
ps aux | grep vite | grep -v grep
```

### Stop Servers
```bash
# Find PIDs
lsof -ti :3005  # Backend PID
lsof -ti :5173  # Frontend PID

# Kill them
kill $(lsof -ti :3005)  # Stop backend
kill $(lsof -ti :5173)  # Stop frontend
```

---

## TEST API

```bash
# Test backend health
curl http://localhost:3005/api/v1/health

# Test authentication status
curl http://localhost:3005/api/v1/auth/status

# Test frontend proxy (requires frontend running)
curl http://localhost:5173/api/v1/health
```

---

## VIEW LOGS

```bash
# Backend logs
tail -f logs/backend.log

# Frontend logs
tail -f logs/frontend.log

# Both in split view
tail -f logs/backend.log logs/frontend.log
```

---

## TROUBLESHOOTING

### "Port already in use"
```bash
# Kill process on port 3005
kill $(lsof -ti :3005)

# Kill process on port 5173
kill $(lsof -ti :5173)
```

### "Cannot find module"
```bash
# Backend dependencies
npm install

# Frontend dependencies
cd web-app && npm install
```

### "API key not found"
```bash
# Check .env file
cat .env | grep ANTHROPIC_API_KEY

# Export manually
export ANTHROPIC_API_KEY="your-key-here"
```

### "Frontend not loading"
```bash
# Check if Vite is running
ps aux | grep vite | grep -v grep

# Check port
lsof -i :5173

# View frontend logs
cat logs/frontend.log
```

---

## PROJECT STRUCTURE

```
TooLoo.ai/
├── tooloo-server.js              # Backend API (port 3005)
├── core/                         # Core modules
│   ├── simulator.js              # Prototype generation
│   ├── trainer.js                # Training data
│   ├── feedback.js               # User feedback
│   └── auth.js                   # Authentication
├── providers/
│   └── provider-router.js        # AI provider routing
├── web-app/                      # Frontend (port 5173)
│   ├── src/components/           # React components
│   └── vite.config.js            # Vite config (proxies to 3005)
├── data/                         # Persistent data
├── temp/                         # Generated prototypes
├── logs/                         # Server logs
└── .env                          # API keys (DO NOT COMMIT)
```

---

## AVAILABLE SCRIPTS

| Script | Purpose |
|--------|---------|
| `./proper-start.sh` | Start both servers (recommended) |
| `./health-check.sh` | Comprehensive system health check |
| `./organize-repo.sh` | Clean up repository structure |
| `npm run dev` | Start both servers (package.json) |
| `npm run start:api` | Start backend only |
| `npm run start:web` | Start frontend only |

---

## NEXT STEPS

1. **Verify Everything Works**
   ```bash
   ./proper-start.sh
   ./health-check.sh
   ```

2. **Clean Up Repository** (when ready)
   ```bash
   ./organize-repo.sh
   git add .
   git commit -m "Organize repository structure"
   ```

3. **Start Building** 🎨
   - Open http://localhost:5173
   - Try the simulation feature
   - Add training examples
   - Test with real users

---

## HELP

**Status not clear?** → Run `./health-check.sh`  
**Servers not starting?** → Check logs in `logs/` directory  
**Need full details?** → Read `SYSTEM_STATUS_REPORT.md`  
**Something broken?** → Check `REPOSITORY_STRUCTURE.md`

---

**Last Updated**: October 5, 2025  
**Version**: 2.0.0
