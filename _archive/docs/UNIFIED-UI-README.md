# TooLoo.ai – Unified Conversation-First UI

**Status:** ✅ **REDESIGNED** – Single unified interface with conversation as primary feature

## The New Direction

Instead of 3 separate dashboards, you now have **one conversation-centric UI** where everything else is secondary:

```
┌─────────────────────────────────────────────────────────────────┐
│  🌐 TooLoo.ai │ System Healthy (92%) │ Tokens: 0 │ Model: Haiku │
├────────┬───────────────────────────────────────────────────┬────┤
│        │                                                    │    │
│ ☰      │     CONVERSATION AREA (70% width)                │ 13 │
│        │                                                    │    │
│ ▼ Srvs │     Assistant: Welcome to TooLoo.ai!             │Svc │
│   Web  │     How can I help today?                        │ ● ●│
│   Trn  │                                                    │ ● ●│
│   Meta │     User: What's the system status?              │ ● ●│
│        │                                                    │ ● ●│
│ ▼ Alts │     Assistant: All 13 services running...        │ ● ●│
│   0 C  │                                                    │    │
│        │  [Input] [  Type something...       ] [Send]      │ 🚨 │
│ ▼ Prov │                                                    │  0 │
│ ▼ Sys  │                                                    │    │
│        │                                                    │ 📍 │
└────────┴───────────────────────────────────────────────────┴────┘

LEFT: Hamburger menu (folded sections for Services, Alerts, Providers, System)
CENTER: Conversation (messages + input field)
RIGHT: Visual feedback (health grid, alerts, provider status, utilization)
```

## What Changed

| Before | After |
|--------|-------|
| 3 separate HTML files (service-control, alert, provider) | 1 unified HTML file (tooloo-unified.html) |
| Dashboards as primary UI | Conversation as primary UI |
| Data spread across 3 views | All data integrated in 1 view |
| No conversation interface | Conversation center + system integration |

## File Structure

```
web-app/
├── tooloo-unified.html      ← NEW: Single unified UI (conversation-first)
└── ... (all previous dashboards removed)
```

## How It Works

### 1. Conversation Area (70% width) - PRIMARY
- Message history (scrollable)
- User input field
- Real-time assistant responses
- Context aware (knows system state)

### 2. Visual Feedback Sidebar (20% width) - ALWAYS VISIBLE
- 13 service health dots (grid layout)
- Alert badge (critical count)
- Provider status list
- System utilization bars (memory, API calls)

### 3. Hamburger Menu (10% width) - COLLAPSED BY DEFAULT
- **Services** (13 items, expandable)
- **Alerts** (timeline, expandable)
- **Providers** (leaderboard, expandable)
- **System** (metrics, logs, settings)

## Test It Now

```bash
npm run dev:hot
```

Then open:
```
http://127.0.0.1:3000/tooloo-unified.html
```

### Expected Behavior
- Header shows system health and token count
- Messages pane displays welcome message
- Right sidebar shows 13 service dots, 0 alerts, provider status
- Left menu (☰) is collapsed
- Click ☰ to expand/collapse menu
- Type in input field, press Enter to send
- Shift+Enter for multiline messages

## Architecture

### Data Sources (Already Working)
```
Metrics Hub (3010)          → Service health + utilization
└─ ws://127.0.0.1:3010/ws/metrics (WebSocket, 5-second updates)

Alert Engine (Web-server)   → Alert timeline
└─ GET /api/v1/system/alerts/status (10-second polling)

Provider Scorecard (Web-server) → Provider rankings
└─ GET /api/v1/reports/provider-performance (15-second polling)
```

### Real-Time Updates
```
Visual Feedback Updates Every:
├─ Services: 5 seconds (WebSocket from Metrics Hub)
├─ Alerts: 10 seconds (HTTP polling)
├─ Providers: 15 seconds (HTTP polling)
└─ Utilization: 5 seconds (calculated from metrics)
```

## Feature Breakdown

### Conversation
✅ Message history with timestamps
✅ User/Assistant message distinction
✅ Real-time token counter
✅ Model selector (Haiku/Sonnet/GPT-4o/Gemini)
✅ Shift+Enter for multiline input

### Visual Feedback
✅ 13 service health dots (colored by status)
✅ Alert badge (shows critical count or green checkmark)
✅ Provider list (top 3 active providers)
✅ System utilization (memory %, API calls %)

### Menu
✅ Collapsible sections (Services, Alerts, Providers, System)
✅ Quick access to system info, logs, settings
✅ Service status indicators in list

## Next Steps (Months 2-4)

### Month 2: Real Conversation Intelligence
- [ ] Connect to Claude API for actual conversation
- [ ] Enable service restart from conversation ("restart web-server")
- [ ] Live alert updates trigger conversation suggestions
- [ ] Provider selection via conversation ("switch to Claude")

### Month 3: Contextual Awareness
- [ ] Auto-inject system state into conversation context
- [ ] AI suggests actions based on alerts ("Critical latency detected - should we scale?")
- [ ] Multi-turn conversation memory
- [ ] Smart replies to common queries

### Month 4: Conversational Control
- [ ] "Restart service X" → executes via API
- [ ] "Switch to provider Y" → changes policy
- [ ] "Analyze alert Z" → deep investigation
- [ ] "Show me X" → filters/displays relevant data

## Code Quality

- **Total Size:** 25 KB (single HTML file)
- **Framework:** Vanilla JavaScript (no dependencies)
- **Real-time:** WebSocket + polling fallback
- **Mobile:** Responsive (collapses menu on small screens)
- **Accessibility:** Semantic HTML, color contrast AAA

## Key Design Decisions

1. **Conversation First:** Users interact primarily via chat
2. **Visual Context:** Right sidebar always shows key metrics
3. **Progressive Disclosure:** Detailed controls hidden in menu
4. **Single File:** No build tools, direct browser execution
5. **No Tabs:** One main view (conversation), not scattered across tabs

## Integration Points

All dashboard data comes from existing backend:
- ✅ Metrics Hub: Service health, utilization
- ✅ Alert Engine: Alert management, rule creation
- ✅ Provider Scorecard: Rankings, cost calculation
- ✅ System APIs: Restart, policy changes, logs

## Troubleshooting

**"Could not connect to services":**
→ Check `npm run dev:hot` is running
→ Verify ports 3000, 3010 are open

**"Right sidebar is empty":**
→ Wait 3-5 seconds for initial data load
→ Check browser console for errors

**"Conversation not responding":**
→ Backend integration not yet implemented (Month 2)
→ Currently shows simulated responses

---

**Status:** ✅ Ready for testing  
**File:** `web-app/tooloo-unified.html`  
**Next:** Month 2 - Real conversation backend integration
