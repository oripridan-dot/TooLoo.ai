# Quick Reference: Capability Orchestrator + Formatter

## 🚀 Start Here (Copy & Paste)

### 1. Start TooLoo.ai
```bash
npm run dev
```

### 2. Test Everything (6 tests)
```bash
npm run orchestrator:test
```

### 3. View Enhanced Formatter
```bash
npm run formatter:view
```

---

## 📋 Common Commands

| Task | Command |
|------|---------|
| **Initialize 242 capabilities** | `npm run orchestrator:init` |
| **Check activation status** | `npm run orchestrator:status` |
| **View capability map (by engine)** | `npm run orchestrator:map` |
| **Enable autonomous activation** | `npm run orchestrator:enable` |
| **Run activation cycle** | `npm run orchestrator:cycle` |
| **Full integration test** | `npm run orchestrator:test` |
| **View enhanced formatter** | `npm run formatter:view` |

---

## 📊 What Each Engine Provides

```
autonomousEvolutionEngine      → 62 self-optimization methods
enhancedLearning               → 43 session optimization methods
predictiveEngine               → 38 intent prediction methods
userModelEngine                → 37 personalization methods
proactiveIntelligenceEngine    → 32 workflow prediction methods
contextBridgeEngine            → 30 context bridging methods
```

---

## 🎯 REST API Cheat Sheet

### Initialize
```bash
curl -X POST http://127.0.0.1:3000/api/v1/orchestrator/initialize \
  -H "Content-Type: application/json"
```

### Get Status
```bash
curl http://127.0.0.1:3000/api/v1/orchestrator/status | jq '.'
```

### Get Capability Map
```bash
curl http://127.0.0.1:3000/api/v1/orchestrator/capability-map | jq '.data'
```

### Enable Autonomous Activation
```bash
curl -X POST http://127.0.0.1:3000/api/v1/orchestrator/enable-autonomous \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"mode":"safe","maxPerCycle":2}'
```

### Run Activation Cycle
```bash
curl -X POST http://127.0.0.1:3000/api/v1/orchestrator/activate/cycle \
  -H "Content-Type: application/json"
```

### Activate One Capability
```bash
curl -X POST http://127.0.0.1:3000/api/v1/orchestrator/activate/one \
  -H "Content-Type: application/json" \
  -d '{"capabilityId":"capability_id_here"}'
```

### Deactivate a Capability
```bash
curl -X POST http://127.0.0.1:3000/api/v1/orchestrator/deactivate \
  -H "Content-Type: application/json" \
  -d '{"capabilityId":"capability_id_here"}'
```

---

## 📖 Documentation Files

- **ORCHESTRATOR-FORMATTER-INTEGRATION.md** - Complete guide
- **CAPABILITIES-INTEGRATION-ANALYSIS.md** - Technical deep dive
- **CAPABILITIES-VISUALIZATION-STATUS.md** - Executive summary

---

## 🎨 Response Formatter Features

**Auto-formats these response types:**
- 📊 Metrics → Beautiful metric boxes
- 📈 Charts → Line/bar/pie charts
- 📋 Tables → Sortable, filterable tables
- 🔗 Diagrams → Mermaid flowcharts
- ✅ Status → System health badges
- 💻 Code → Syntax-highlighted code

**View the formatter at:**
```
http://127.0.0.1:3000/web-app/response-formatter-enhanced.html
```

---

## 🔍 Activation Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| **safe** | Full validation, prerequisites, safety checks | Production |
| **moderate** | Reduced validation, faster activation | Development |
| **aggressive** | Minimal checks, max speed | Testing |

---

## 📈 Monitoring Progress

### Watch status in real-time
```bash
watch -n 2 npm run orchestrator:status
```

### Check capability map
```bash
npm run orchestrator:map
```

### View integration test results
```bash
npm run orchestrator:test
```

---

## 🧪 Testing Checklist

- [ ] Server is running (`npm run dev`)
- [ ] Initialize capabilities (`npm run orchestrator:init`)
- [ ] Check status (`npm run orchestrator:status`)
- [ ] View capability map (`npm run orchestrator:map`)
- [ ] Enable autonomous mode
- [ ] Run activation cycle
- [ ] View enhanced formatter
- [ ] Run full test suite (`npm run orchestrator:test`)

---

## ⚡ Performance Tips

1. **Safe Mode** - Use for production (slower, fully validated)
2. **Activation Pace** - Set `maxPerCycle` to 2-5 (default 2)
3. **Monitoring** - Check status after each cycle
4. **Rollback** - Deactivate if issues found
5. **Formatter** - Auto-detects response type (no config needed)

---

## 🆘 Troubleshooting

**Server not responding:**
```bash
curl http://127.0.0.1:3000/api/v1/system/health
```

**Orchestrator not initialized:**
```bash
npm run orchestrator:init
```

**Can't see formatter:**
```bash
npm run formatter:view
```

**Check all processes:**
```bash
curl http://127.0.0.1:3000/api/v1/system/processes | jq '.'
```

---

## 📚 File Structure

```
TooLoo.ai/
├── engine/
│   ├── capability-orchestrator.js       ← Main orchestrator
│   └── response-formatter-integration.js ← Formatter middleware
├── servers/
│   └── web-server.js                    ← API endpoints
├── scripts/
│   └── test-capability-orchestrator.sh  ← Test suite
├── web-app/
│   └── response-formatter-enhanced.html ← Demo interface
└── ORCHESTRATOR-FORMATTER-INTEGRATION.md ← Full docs
```

---

## 🎯 Key Numbers

- **242** - Total capabilities
- **6** - Engines
- **7** - REST API endpoints
- **8** - npm scripts
- **0** - Configuration needed (CDN-based)
- **3** - Activation modes (safe/moderate/aggressive)

---

## ✨ What's Working

✅ Capability discovery and cataloguing
✅ Safe activation with validation
✅ Autonomous activation cycles
✅ Error recovery and rollback
✅ Rich response visualization
✅ Chart rendering
✅ Diagram support
✅ Status indicators
✅ Comprehensive logging
✅ Rest endpoints
✅ npm command shortcuts

---

**Status: 🟢 Ready to Use**

Start with: `npm run dev` then `npm run orchestrator:test`
