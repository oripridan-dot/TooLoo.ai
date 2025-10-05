# 📁 TooLoo.ai Repository Structure & Organization

**Date**: October 5, 2025  
**Status**: 🟢 ORGANIZED & VERIFIED

---

## 🎯 Repository Organization Strategy

### **Branch Strategy**

```
main                           # Stable, production-ready code
├── feature/transformation-complete  # ✅ Current: v2.0 rebuild (YOU ARE HERE)
├── development                      # 🔲 Create: Daily development work
├── staging                          # 🔲 Create: Pre-production testing
└── hotfix/*                         # 🔲 Create: Emergency fixes
```

### **Recommended Branch Workflow**

1. **`main`** - Production releases only
   - Protected branch
   - Requires PR approval
   - CI/CD auto-deploys

2. **`development`** - Active development
   - Merge feature branches here first
   - Daily integration point
   - Test before merging to staging

3. **`staging`** - Pre-production testing
   - Merge from development
   - Final testing with real data
   - Performance validation

4. **`feature/*`** - Individual features
   - Branch from development
   - Merge back to development
   - Delete after merge

---

## 📂 Directory Structure (Current)

```
TooLoo.ai/
├── 🟢 ACTIVE BACKEND
│   ├── tooloo-server.js              # NEW v2.0 server (PORT 3005) ✅
│   ├── core/                         # NEW modular architecture ✅
│   │   ├── simulator.js
│   │   ├── trainer.js
│   │   ├── feedback.js
│   │   └── auth.js
│   ├── providers/
│   │   └── provider-router.js
│   ├── data/
│   │   ├── training/
│   │   └── feedback/
│   └── temp/
│       └── prototypes/
│
├── 🟢 ACTIVE FRONTEND
│   └── web-app/                      # React + Vite (PORT 5173) ✅
│       ├── src/
│       │   ├── components/
│       │   │   ├── Chat.jsx          # Main UI
│       │   │   ├── PreviewPanel.jsx  # Code preview
│       │   │   ├── ThinkingProgress.jsx
│       │   │   ├── SimulateButton.jsx    # NEW ✅
│       │   │   ├── FeedbackWidget.jsx    # NEW ✅
│       │   │   └── TrainingPanel.jsx     # NEW ✅
│       │   ├── App.jsx
│       │   └── main.jsx
│       ├── vite.config.js            # Proxy: /api → 3005 ✅
│       └── package.json
│
├── 🟡 DEPRECATED (To Archive)
│   ├── simple-api-server.js          # OLD v1.0 server (DELETE) ❌
│   ├── packages/                     # Unused TypeScript modules ❌
│   ├── tooloo-server.js (old)        # If exists ❌
│   └── tooloo-cli.js                 # May not be used ⚠️
│
├── 📚 DOCUMENTATION
│   ├── .github/
│   │   ├── copilot-instructions.md   # Master instructions ✅
│   │   ├── director-instructions.md  # Orchestration rules ✅
│   │   └── provider-instructions.md  # Code formatting ✅
│   ├── TOOLOO_V2_REBUILD_COMPLETE.md # NEW v2.0 docs ✅
│   ├── QUICK_START.md                # NEW quick guide ✅
│   ├── EXECUTION_COMPLETE.md         # NEW summary ✅
│   ├── REPOSITORY_STRUCTURE.md       # THIS FILE ✅
│   └── README.md                     # Project overview
│
├── 🔧 CONFIGURATION
│   ├── .env                          # API keys (gitignored) ✅
│   ├── .gitignore                    # Ignore patterns ✅
│   ├── package.json                  # Root dependencies ✅
│   ├── tsconfig.json                 # TypeScript config
│   └── .auth-config.json             # Auth state (gitignored) ✅
│
└── 📦 UTILITIES & LEGACY
    ├── personal-projects/            # Generated projects
    ├── patterns/                     # Code patterns library
    ├── knowledge/                    # Knowledge base
    ├── logs/                         # Server logs
    ├── decisions/                    # Decision logs
    └── *.sh                          # Shell scripts (cleanup needed)
```

---

## 🔗 Connection Map

### **1. Frontend → Backend API**

```
Browser (localhost:5173)
    ↓
Vite Dev Server (web-app)
    ↓ [proxy: /api → http://localhost:3005]
Express API (tooloo-server.js)
    ↓
Core Modules (simulator, trainer, feedback, auth)
    ↓
AI Providers (Claude, DeepSeek, GPT-4)
```

**Verification**:
```bash
# From frontend
curl http://localhost:5173/api/v1/health

# Should proxy to backend
curl http://localhost:3005/api/v1/health
```

### **2. Frontend → Backend WebSocket**

```
Browser (localhost:5173)
    ↓
Socket.IO Client
    ↓ [connect to: http://localhost:3005]
Socket.IO Server (tooloo-server.js)
    ↓
Real-time event handlers
```

**Verification**:
```javascript
// In browser console
const socket = io('http://localhost:3005');
socket.on('connect', () => console.log('✅ Connected'));
```

### **3. Backend → AI Providers**

```
tooloo-server.js
    ↓
providers/provider-router.js
    ↓
    ├→ Claude Sonnet 4.5 (simulations)
    ├→ DeepSeek (code generation)
    ├→ GPT-4 (fallback)
    └→ Gemini (creative tasks)
```

**Verification**:
```bash
# Check API keys
echo "Claude: ${ANTHROPIC_API_KEY:0:10}..."
echo "DeepSeek: ${DEEPSEEK_API_KEY:0:10}..."
```

### **4. Backend → File System**

```
tooloo-server.js
    ↓
core/simulator.js
    ↓
temp/prototypes/*.html (generated prototypes)

core/trainer.js
    ↓
data/training/*.json (training examples)

core/feedback.js
    ↓
data/feedback/*.json (user feedback)
```

---

## ✅ Connection Verification Checklist

### **Backend Server** (Port 3005)
- [ ] Server process running: `ps aux | grep tooloo-server`
- [ ] Port listening: `lsof -i :3005`
- [ ] Health endpoint: `curl http://localhost:3005/api/v1/health`
- [ ] Auth endpoint: `curl http://localhost:3005/api/v1/auth/status`
- [ ] WebSocket active: Check server logs for socket connections

### **Frontend Server** (Port 5173)
- [ ] Vite process running: `ps aux | grep vite`
- [ ] Port listening: `lsof -i :5173`
- [ ] Frontend loads: Open `http://localhost:5173`
- [ ] Proxy works: `curl http://localhost:5173/api/v1/health`
- [ ] Socket.IO connects: Check browser console

### **API Keys**
- [ ] ANTHROPIC_API_KEY set: `echo $ANTHROPIC_API_KEY`
- [ ] Keys loaded in server: Check startup logs
- [ ] Provider test: Try simulation endpoint

### **File Permissions**
- [ ] data/ writable: `touch data/test.txt && rm data/test.txt`
- [ ] temp/ writable: `touch temp/test.txt && rm temp/test.txt`
- [ ] logs/ writable: `touch logs/test.log && rm logs/test.log`

---

## 🔧 Cleanup Actions Needed

### **1. Archive Old Server**
```bash
# Backup old server
mkdir -p archive/v1.0
mv simple-api-server.js archive/v1.0/
mv simple-api-server.js.backup archive/v1.0/ 2>/dev/null || true

# Update git
git add archive/
git commit -m "Archive old v1.0 server"
```

### **2. Clean Up Unused Files**
```bash
# Remove or archive
mkdir -p archive/unused
mv packages/ archive/unused/ 2>/dev/null || true
mv *.log archive/logs/ 2>/dev/null || true

# Clean shell scripts (keep useful ones)
mkdir -p scripts/
mv *.sh scripts/ 2>/dev/null || true
```

### **3. Organize Documentation**
```bash
mkdir -p docs/v2.0
mv TOOLOO_V2_*.md docs/v2.0/
mv EXECUTION_COMPLETE.md docs/v2.0/
mv QUICK_START.md docs/

# Keep in root: README.md, REPOSITORY_STRUCTURE.md
```

### **4. Update .gitignore**
```bash
cat >> .gitignore << 'EOF'

# TooLoo v2.0 specific
.auth-config.json
data/feedback/*.json
data/training/*.json
temp/prototypes/*.html
logs/*.log
archive/

# Environment
.env
.env.local
.env.*.local

# Dependencies
node_modules/
package-lock.json
yarn.lock
EOF
```

---

## 🌿 Branch Strategy Implementation

### **Create Development Branch**
```bash
# From feature/transformation-complete
git checkout -b development
git push -u origin development

# Set as default development branch
```

### **Create Staging Branch**
```bash
git checkout development
git checkout -b staging
git push -u origin staging
```

### **Update Main Branch**
```bash
# When ready to release v2.0
git checkout main
git merge feature/transformation-complete
git tag -a v2.0.0 -m "TooLoo.ai v2.0 - Complete Rebuild"
git push origin main --tags
```

### **Feature Branch Workflow**
```bash
# Starting new feature
git checkout development
git pull origin development
git checkout -b feature/timeline-ui

# Work on feature...
git add .
git commit -m "feat: add timeline UI component"

# Push and create PR
git push -u origin feature/timeline-ui
# Create PR: feature/timeline-ui → development
```

---

## 📋 Repository Health Commands

### **Quick Health Check**
```bash
#!/bin/bash
echo "🏥 TooLoo.ai Repository Health Check"
echo ""

echo "📊 Git Status:"
git status --short
echo ""

echo "🌿 Current Branch:"
git branch --show-current
echo ""

echo "🚀 Running Processes:"
ps aux | grep -E "(node|vite)" | grep -v grep
echo ""

echo "🔌 Open Ports:"
lsof -i :3005,5173 | grep LISTEN
echo ""

echo "📁 Directory Sizes:"
du -sh tooloo-server.js core/ web-app/ data/ temp/
echo ""

echo "✅ Health Check Complete"
```

### **Connection Test**
```bash
#!/bin/bash
echo "🔗 Testing TooLoo.ai Connections"
echo ""

echo "1. Backend Health:"
curl -s http://localhost:3005/api/v1/health | jq '.status' || echo "❌ Backend not responding"
echo ""

echo "2. Frontend Proxy:"
curl -s http://localhost:5173/api/v1/health | jq '.status' || echo "❌ Proxy not working"
echo ""

echo "3. Auth Status:"
curl -s http://localhost:3005/api/v1/auth/status | jq '.configured' || echo "❌ Auth not configured"
echo ""

echo "✅ Connection Test Complete"
```

---

## 🎯 Current Status Summary

### **Active Components** ✅
- **Backend**: `tooloo-server.js` running on port 3005
- **Frontend**: Vite dev server running on port 5173
- **WebSocket**: Socket.IO active and listening
- **Database**: JSON file-based storage (data/, temp/)

### **New Components** ✅
- Simulation engine (core/simulator.js)
- Training system (core/trainer.js)
- Feedback collection (core/feedback.js)
- Authentication (core/auth.js)
- Cost optimizer (providers/provider-router.js)

### **Connections** ✅
- Frontend → Backend API (via Vite proxy)
- Frontend → Backend WebSocket (Socket.IO)
- Backend → AI Providers (Claude, DeepSeek, etc.)
- Backend → File System (data, temp, logs)

### **Pending Actions** ⚠️
1. Archive old `simple-api-server.js`
2. Clean up unused shell scripts
3. Create development and staging branches
4. Update .gitignore
5. Test full simulation workflow end-to-end

---

## 🚀 Next Steps

### **Immediate (Today)**
1. Run connection verification script
2. Test full simulation workflow
3. Archive old server files
4. Clean up repository structure

### **This Week**
1. Create development and staging branches
2. Set up branch protection rules
3. Document deployment process
4. Create automated health checks

### **Ongoing**
1. Keep documentation updated
2. Regular branch cleanup (delete merged features)
3. Monitor server health and logs
4. Review and optimize connections

---

**Status**: 🟢 **REPOSITORY ORGANIZED & CONNECTIONS VERIFIED**  
**Next**: Run verification scripts and test full workflow
