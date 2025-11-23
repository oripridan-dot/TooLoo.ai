# TooLoo.ai Unified UI – 4-Month Implementation Plan

## Overview

Building a **conversation-first, unified control interface** where:
- **Conversation (70%)** is the primary interaction method
- **Visual Feedback (20%)** shows real-time system state
- **Menu (10%)** provides access to detailed controls

All integrated into **one HTML file**, no separate dashboards.

---

## Month 1: Foundation (Tier 1) – ✅ COMPLETE

### Deliverable: Conversation-First UI Layout
**File:** `web-app/tooloo-unified.html` (25 KB)

**What's Built:**
```
✅ Conversation pane (message history + input)
✅ Visual feedback sidebar (13 service dots, alerts, providers, utilization)
✅ Hamburger menu (folded Services, Alerts, Providers, System sections)
✅ Header (system health, token counter, model selector)
✅ Real-time data flows from existing backend services
✅ Responsive design (collapses on mobile)
✅ Zero dependencies (pure vanilla JavaScript)
```

**Test Now:**
```bash
npm run dev:hot
open http://127.0.0.1:3000/tooloo-unified.html
```

**Features:**
- Message history with timestamps
- Live service health indicators (pulsing dots)
- Alert count badge
- Provider list
- System utilization bars
- Collapsible menu sections
- Model selector (Haiku/Sonnet/GPT-4o/Gemini)
- Token counter

**Data Sources:**
- Metrics Hub (ws://127.0.0.1:3010) → Services + utilization
- Alert Engine → Alert timeline
- Provider Scorecard → Rankings + status

---

## Month 2: Real Conversation Intelligence (Tier 2)

### Objectives
Build actual AI conversation with context awareness and basic command execution.

### Deliverables

#### 2.1: Claude API Integration
**File:** `api/conversation-api.js` (new)

```javascript
// Endpoint: POST /api/v1/conversation/message
{
  "message": "What's the system status?",
  "context": {
    "services": [...],
    "alerts": [...],
    "providers": [...]
  }
}
→ Returns: { "response": "...", "actions": [] }
```

**Features:**
- Direct Claude API calls with system context
- Token counting via API
- Multi-turn conversation history
- Context injection (what's running, what's failing, what's busy)

#### 2.2: Service Restart via Conversation
**File:** `api/system-control.js` (modify)

```
User: "Restart the web-server"
AI: "Restarting web-server... (command: POST /api/v1/system/service/web/restart)"
UI: Updates service health dot from yellow to green when ready
```

**Features:**
- Natural language → command mapping
- Confirmation flow ("Are you sure?")
- Live feedback as restart progresses
- Error handling with suggestions

#### 2.3: Alert-Triggered Suggestions
**File:** `servers/alert-engine.js` (modify)

When critical alert triggers:
```
Backend: {"action": "trigger_alert", "alert": {"severity": "critical", ...}}
UI: Shows alert in sidebar
AI: Auto-suggests action ("High latency detected. Shall I switch to a faster provider?")
```

**Features:**
- Auto-suggestions based on alert type
- One-click action confirmation
- Historical learning (what worked before)

#### 2.4: Provider Selection via Conversation
**File:** `api/provider-control.js` (new)

```
User: "Switch to OpenAI"
AI: "Switching to OpenAI (Claude → GPT-4o). Cost increase: ~15%"
Backend: POST /api/v1/providers/policy {"provider": "openai"}
UI: Model selector updates, visual feedback shows change
```

**Effort:** 2 sprints  
**Status:** Not started

---

## Month 3: Contextual Awareness (Tier 3)

### Objectives
Make AI understand full system context and provide intelligent recommendations.

### Deliverables

#### 3.1: System State Injection
**File:** `api/conversation-context.js` (new)

Every message includes:
```javascript
{
  "timestamp": "2024-11-17T...",
  "systemState": {
    "health": 92,
    "services": { "online": 12, "degraded": 1, "offline": 0 },
    "alerts": { "critical": 0, "warning": 2, "total": 2 },
    "providers": { "active": 3, "busy": 1, "costs": {...} },
    "utilization": { "memory": 62, "cpu": 48, "apiCalls": 34 },
    "recent_events": [...]
  }
}
```

**Benefits:**
- AI knows exact system state when answering
- No hallucination about service health
- Contextual recommendations (e.g., "API calls are at 80%, consider scaling")

#### 3.2: Auto-Suggestions Based on Patterns
**File:** `servers/suggestion-engine.js` (new)

When patterns detected:
```
Pattern: Latency rising → Suggests provider switch
Pattern: Memory > 80% → Suggests scale-up
Pattern: Multiple alerts → Suggests investigation
Pattern: High cost → Suggests cheaper provider
```

**Features:**
- Rule-based pattern matching
- Learning from history
- Severity-weighted suggestions
- Cost/performance tradeoff analysis

#### 3.3: Multi-Turn Conversation Memory
**File:** `api/conversation-memory.js` (modify)

```
Turn 1: "Why are services slow?"
        → AI analyzes and suggests root causes

Turn 2: "What if we switch providers?"
        → AI remembers context, calculates impact
        → "Switching to Gemini would cost 20% less
             and latency would drop by 15%"

Turn 3: "Do it"
        → AI executes, confirms change in context
```

**Features:**
- 20-turn conversation window
- Smart context summarization (keep relevant, drop old)
- User preference learning (if they prefer latency over cost)
- Conversation export

#### 3.4: Smart Replies & Quick Actions
**File:** `web-app/tooloo-unified.html` (modify)

```
Assistant: "API latency is 450ms. Shall I switch providers?"
[Yes, switch to GPT] [Yes, switch to Gemini] [No, keep Claude] [More details]
```

**Features:**
- Contextual action buttons below messages
- One-click execution
- Undo functionality (rollback to previous state)

**Effort:** 2 sprints  
**Status:** Not started

---

## Month 4: Conversational Control (Tier 4)

### Objectives
Full system orchestration via natural language conversation.

### Deliverables

#### 4.1: Service Management via Conversation
**File:** `api/service-commands.js` (new)

```
"Restart the training-server"
→ POST /api/v1/system/service/training/restart
→ Feedback: "Training server restarting... [progress bar] Done!"

"Show me slow services"
→ Filters services by latency, displays top 5

"Scale up the budget-server"
→ POST /api/v1/system/service/budget/scale {"replicas": 3}
→ Feedback: "Budget server now running 3 replicas"
```

**Features:**
- Natural language command parsing
- Service management (start/stop/restart/scale)
- Batch operations ("Restart all services")
- Scheduled actions ("Restart web-server at 3 PM")

#### 4.2: Alert Investigation & Resolution
**File:** `api/alert-investigation.js` (new)

```
User: "Why do we have 2 warnings?"
AI: "Alert 1: High latency on meta-server (450ms avg)
     Alert 2: Training-server memory at 85%
     
     Suggested fixes:
     1. Switch provider for faster response
     2. Scale training-server to 3 replicas"

User: "Apply both"
AI: Executes both changes, monitors recovery
    "Changes applied. Latency dropped to 280ms,
     memory down to 60%. Alerts resolved."
```

**Features:**
- Root cause analysis
- Multi-step resolution plans
- Impact forecasting
- Historical pattern matching

#### 4.3: Policy Management via Conversation
**File:** `api/policy-control.js` (new)

```
"Set provider policy to cost-optimized"
→ Updates: latency tolerance, auto-scaling, failover strategy
→ Feedback: "Cost-optimized policy enabled. Estimated savings: 30%"

"Prioritize latency over cost"
→ Changes: always use fastest provider, auto-scale aggressively
→ Feedback: "Latency-first policy active. Estimated cost increase: 15%"

"Custom policy: Max latency 200ms, Max cost $50/day"
→ Sets thresholds, creates rules
→ Feedback: "Custom policy created and activated"
```

**Features:**
- Named policies (balanced, cost-optimized, latency-first, custom)
- Dynamic threshold adjustment
- Cost/performance forecasting
- Policy history (rollback capability)

#### 4.4: Conversation-Driven Analytics
**File:** `api/conversation-analytics.js` (new)

```
"How many API calls last hour?"
→ Returns: "847 API calls in last hour, trending up 12%"

"Show me provider performance over 7 days"
→ Generates inline chart in conversation
→ Lists provider comparison with trends

"Which service used the most resources today?"
→ Analysis: "Training-server: 62% of total CPU
             Meta-server: 28% of total CPU"
```

**Features:**
- Natural language queries
- Inline charts in conversation
- Historical analysis
- Trend forecasting
- Cost breakdown by service

#### 4.5: Conversation Session Management
**File:** `api/conversation-sessions.js` (new)

```
"Save this conversation as 'System Optimization'"
→ Stores entire conversation with context
→ Can replay and continue later

"Load conversation: Migration Planning"
→ Restores full context from previous session
→ Shows history of decisions made

"Export this session as a report"
→ Generates PDF with chat history, decisions, outcomes
```

**Features:**
- Save/load conversation sessions
- Tagging and search
- Session timeline
- Decision tracking
- Report generation

**Effort:** 3 sprints  
**Status:** Not started

---

## Implementation Timeline

```
November 2024:
├─ Week 1: Month 1 UI ✅
├─ Week 2: Month 2 planning + Claude API
│
December 2024:
├─ Week 1-2: Month 2 implementation (Claude, restart, suggestions)
├─ Week 3-4: Month 3 planning (context, memory, patterns)
│
January 2025:
├─ Week 1-2: Month 3 implementation (context injection, learning)
├─ Week 3-4: Month 4 planning (control, analytics)
│
February 2025:
├─ Week 1-3: Month 4 implementation (full orchestration)
└─ Week 4: Polish, testing, deployment
```

---

## Success Metrics

### Month 1 (Complete)
- ✅ Single unified UI deployed
- ✅ All real-time data flows working
- ✅ Visual feedback updating every 5-15 seconds
- ✅ Menu navigation working

### Month 2
- ✅ Claude API integration complete
- ✅ Service restart via conversation works
- ✅ Alert suggestions appearing
- ✅ Provider switching via chat functional

### Month 3
- ✅ System state injected into all messages
- ✅ AI provides contextual recommendations
- ✅ Multi-turn memory working (20 turns)
- ✅ Smart action buttons appearing

### Month 4
- ✅ All service management commands working
- ✅ Alert investigation + resolution flows complete
- ✅ Policy management via conversation functional
- ✅ Analytics queries answerable
- ✅ Session save/load working

---

## Files to Create

### Month 2
- `api/conversation-api.js` – Claude integration
- `api/system-control.js` – Service restart
- `api/provider-control.js` – Provider switching

### Month 3
- `api/conversation-context.js` – System state injection
- `servers/suggestion-engine.js` – Pattern-based suggestions
- `api/conversation-memory.js` – Multi-turn memory

### Month 4
- `api/service-commands.js` – Service management commands
- `api/alert-investigation.js` – Alert root cause analysis
- `api/policy-control.js` – Policy management
- `api/conversation-analytics.js` – Analytics queries
- `api/conversation-sessions.js` – Session management

---

## Testing Strategy

### Unit Tests
- Each API endpoint tested independently
- Mock backend responses
- Test conversation parsing

### Integration Tests
- Full conversation flow (ask → AI thinks → system executes)
- Service restart verification
- Provider switch confirmation

### E2E Tests
- Real backend with `npm run dev:hot`
- Full conversation scenarios
- Multi-turn dialogues

---

## Notes

- **Conversation First:** Every feature should be accessible via chat
- **Context Aware:** AI should know system state at all times
- **Safe Execution:** Confirm destructive actions, allow undo
- **Progressive Disclosure:** Detailed options in menu, common actions in chat
- **Real-Time:** Visual feedback updates within 5-15 seconds
- **No Framework:** Keep vanilla JavaScript for instant deployment

---

## Current Status

**Month 1:** ✅ Complete  
**Month 2:** 🔄 In Planning  
**Month 3:** ⏳ Pending Month 2  
**Month 4:** ⏳ Pending Month 3  

**Next Step:** Implement Month 2 (Claude API integration + service restart)
