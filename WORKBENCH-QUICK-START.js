#!/usr/bin/env node

/**
 * WORKBENCH QUICK START GUIDE
 * ==========================
 * 
 * Complete instructions for starting and testing the TooLoo.ai Workbench system
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║         TooLoo.ai WORKBENCH - QUICK START GUIDE               ║
║              Days 1-2 Implementation Complete ✅               ║
╚════════════════════════════════════════════════════════════════╝

📋 WHAT'S BEEN BUILT
═══════════════════════════════════════════════════════════════════

Day 1: Backend Infrastructure (1,143 LOC)
  ✅ WorkbenchOrchestrator (578 lines) - Intelligent service orchestration
  ✅ IntentAnalyzer (480 lines) - Goal classification with 6 intent types
  ✅ 4 HTTP Endpoints - /api/v1/work/request, /status, /history, /analyze-intent

Day 2: Frontend UI (1,000+ LOC)
  ✅ workbench.html (600+ lines) - Professional glassmorphic interface
  ✅ workbench-app.js (400+ lines) - Full application logic
  ✅ Web route integration - /workbench, /unified-workbench, /ai-workbench

TOTAL NEW CODE: 2,143+ Lines


🚀 QUICK START
═══════════════════════════════════════════════════════════════════

1. START THE SYSTEM
   $ npm run dev
   
   This will:
   - Launch web-server (port 3000) with proxy
   - Initialize orchestrator (port 3123)
   - Start all 9 services (ports 3001-3009)
   - Pre-arm services automatically

2. OPEN THE WORKBENCH
   Open in browser: http://localhost:3000/workbench
   
   Alternative URLs:
   - http://localhost:3000/unified-workbench
   - http://localhost:3000/ai-workbench

3. TRY A GOAL
   Enter in textarea: "analyze system performance bottlenecks"
   
   Click "Analyze Intent" → See preview of services
   Click "Execute Work" → Watch real-time progress


🧪 TEST WORKFLOWS
═══════════════════════════════════════════════════════════════════

ANALYSIS WORKFLOW (Tests segmentation → meta → reports)
─────────────────────────────────────────────────────
Goal: "analyze system performance and identify optimization opportunities"
Expected Services: segmentation, meta, reports
Expected Duration: 2-5 minutes (standard quality)

IMPROVEMENT WORKFLOW (Tests meta → training → coach)
─────────────────────────────────────────────────────
Goal: "improve system response time and reduce API latency"
Expected Services: meta, training, coach, reports
Expected Duration: 5-10 minutes (standard quality)

CREATION WORKFLOW (Tests product → training → reports)
─────────────────────────────────────────────────────
Goal: "create comprehensive API documentation with examples"
Expected Services: product, training, reports
Expected Duration: 3-7 minutes (standard quality)

PREDICTION WORKFLOW (Tests meta → training → budget)
──────────────────────────────────────────────────
Goal: "predict system load for next quarter and recommend scaling strategy"
Expected Services: meta, training, budget, reports
Expected Duration: 5-10 minutes (standard quality)

LEARNING WORKFLOW (Tests coach → training)
──────────────────────────────────────────
Goal: "teach me how to optimize database queries"
Expected Services: coach, training, reports
Expected Duration: 3-5 minutes (standard quality)

DEBUGGING WORKFLOW (Tests capabilities → segmentation)
──────────────────────────────────────────────────────
Goal: "debug the 502 errors we're seeing in production"
Expected Services: capabilities, segmentation, reports
Expected Duration: 2-5 minutes (standard quality)


📊 UI FEATURES TO TEST
═══════════════════════════════════════════════════════════════════

Intent Preview (No Execution)
─────────────────────────────
1. Enter goal in textarea
2. Click "Analyze Intent"
3. See popup with:
   - Intent type (analysis, improvement, etc.)
   - Confidence score (0-100%)
   - Required services
   - Output format
   - Estimated duration

Real-Time Progress Tracking
──────────────────────────
1. Click "Execute Work"
2. Watch progress bar fill (0-100%)
3. See stage timeline with timestamps
4. See active service highlighted
5. Status updates as work progresses

Service Status Sidebar
─────────────────────
- 9 services listed with ports
- Color-coded indicators:
  - 🟢 Green = Healthy
  - 🔵 Blue = Active/Running
  - 🔴 Red = Unhealthy (if any)
- Updates as services activate

Results Display (Tabbed)
──────────────────────
After work completes, view results:
- Summary: High-level findings + GitHub info
- Analysis: Detailed technical breakdown
- Recommendations: Actionable suggestions
- Artifacts: Generated code/specs

Settings Panel
──────────────
Click ⚙️ Settings to configure:
- Quality level (Draft/Standard/Production)
- Output format (Summary/Detailed/Technical/Business/Visual)
- GitHub integration (auto-commit, create PR)
- Verbose logging


🔌 API ENDPOINTS (MANUAL TESTING)
═══════════════════════════════════════════════════════════════════

ANALYZE INTENT (No Execution)
─────────────────────────────
$ curl -X POST http://127.0.0.1:3000/api/v1/work/analyze-intent \\
  -H 'Content-Type: application/json' \\
  -d '{
    "goal": "analyze system performance",
    "options": {"qualityLevel": "standard"}
  }'

EXECUTE FULL WORK
──────────────────
$ curl -X POST http://127.0.0.1:3000/api/v1/work/request \\
  -H 'Content-Type: application/json' \\
  -d '{
    "goal": "improve system response time",
    "options": {
      "qualityLevel": "standard",
      "commitResults": true,
      "createPR": false
    }
  }'

CHECK STATUS
─────────────
$ curl http://127.0.0.1:3000/api/v1/work/status

GET HISTORY
────────────
$ curl 'http://127.0.0.1:3000/api/v1/work/history?limit=10'


⚙️ SYSTEM ARCHITECTURE
═══════════════════════════════════════════════════════════════════

Request Flow:
  User Goal
    ↓
  Workbench UI (workbench.html + workbench-app.js)
    ↓
  POST /api/v1/work/request
    ↓
  WorkbenchOrchestrator (engine/workbench-orchestrator.js)
    ├─ IntentAnalyzer.analyze() → Classify intent
    ├─ buildPipeline() → Select services
    ├─ executeServices() → Run in parallel
    ├─ synthesizeResults() → Combine outputs
    └─ postProcess() → GitHub commits/PRs
    ↓
  9 Services Coordinate:
    - Segmentation (3007): Conversation/data analysis
    - Training (3001): Model selection & optimization
    - Meta-Learning (3002): Knowledge synthesis
    - Budget (3003): Provider status & policy
    - Coach (3004): Guidance & Auto-Coach
    - Product (3006): Artifact generation
    - Reports (3008): Result compilation
    - Capabilities (3009): Feature discovery
    ↓
  Results Aggregated & Returned
    ↓
  UI Displays Results in Tabs


🛠️ DEVELOPMENT COMMANDS
═══════════════════════════════════════════════════════════════════

Start development:
  npm run dev

Stop all services:
  npm run stop:all

Clean/kill strays:
  npm run clean

Syntax check:
  node -c servers/web-server.js

Test workbench endpoints:
  node scripts/test-workbench-endpoints.js


📁 KEY FILES
═══════════════════════════════════════════════════════════════════

Backend:
  servers/web-server.js              - HTTP proxy & endpoints
  engine/workbench-orchestrator.js   - Orchestration logic
  services/intent-analyzer.js         - Intent classification

Frontend:
  web-app/workbench.html             - Main UI
  web-app/js/workbench-app.js        - Application logic

Services (coordinated):
  servers/training-server.js          - Training & selection
  servers/meta-server.js              - Meta-learning
  servers/segmentation-server.js      - Analysis
  servers/budget-server.js            - Provider management
  servers/coach-server.js             - Auto-Coach
  servers/product-development-server.js - Artifact generation
  servers/reports-server.js           - Report generation
  servers/capabilities-server.js      - Feature discovery


📚 DOCUMENTATION
═══════════════════════════════════════════════════════════════════

Day 1 Completion:
  WORKBENCH-IMPLEMENTATION-STATUS.md - Technical spec & API docs

Day 2 Completion:
  WORKBENCH-UI-DAY2-COMPLETE.md      - UI implementation details

Deep Dive Reference:
  DEEP-DIVE-TOOLOO-CAPABILITIES.md   - System architecture

Architecture:
  docs/branching-strategy.md          - Development workflow


🎯 WHAT TO EXPECT
═══════════════════════════════════════════════════════════════════

On First Load:
  ✓ Professional dark UI with purple/blue gradient
  ✓ Service status sidebar with 9 services
  ✓ Large textarea for goal input
  ✓ ⚙️ Settings button in top-right
  ✓ System Ready indicator

On "Analyze Intent":
  ✓ Popup shows intent type (analysis, improvement, etc.)
  ✓ Shows confidence score
  ✓ Lists services that will execute
  ✓ Shows estimated duration
  ✓ "Execute Work" button appears

On "Execute Work":
  ✓ Progress bar appears (starts at 0%)
  ✓ Stage timeline shows each phase
  ✓ Active services highlighted in sidebar
  ✓ Real-time updates every 1 second
  ✓ Completes with results

On Completion:
  ✓ Results section appears below progress
  ✓ Multiple tabs: Summary, Analysis, Recommendations, Artifacts
  ✓ GitHub info shown if committed
  ✓ Copy button to copy results
  ✓ Clear button to reset form


⚠️ KNOWN LIMITATIONS & NEXT STEPS
═══════════════════════════════════════════════════════════════════

Limitations:
  - Progress polling interval is fixed (1s) - could optimize
  - No WebSocket real-time updates (future: consider Socket.io)
  - Service health check is optimistic (could add deeper health probes)
  - No offline mode (future: service worker)

Testing Needed (Day 3):
  - End-to-end workflow testing
  - Concurrent request handling
  - Error recovery scenarios
  - GitHub integration verification
  - Service failover testing
  - UI responsiveness on slow networks
  - Browser compatibility testing
  - Mobile responsiveness validation

Cleanup (Day 3):
  - Archive 38+ unused engines to deprecated/
  - Create engine activation registry
  - Add comprehensive error boundaries
  - Create troubleshooting guide


🎉 QUICK VERIFICATION
═══════════════════════════════════════════════════════════════════

To verify everything is working:

1. Start system: npm run dev
2. Wait 10-15 seconds for services to boot
3. Open: http://localhost:3000/workbench
4. You should see:
   ✓ Purple/blue gradient background
   ✓ "TooLoo.ai Workbench" title
   ✓ Textarea for goal input
   ✓ 9 services listed on right sidebar
   ✓ ⚙️ Settings button
5. Enter a goal and click "Analyze Intent"
6. See preview popup appear
7. Click "Execute Work"
8. Watch progress bar and stage timeline
9. Wait for completion
10. View results in tabs

If all these work, the system is fully operational! 🚀


═══════════════════════════════════════════════════════════════════
Built by: TooLoo.ai Copilot
Date: November 17, 2025
Status: Days 1-2 Complete ✅
Next: Day 3 Integration Testing & Cleanup
═══════════════════════════════════════════════════════════════════
`);
