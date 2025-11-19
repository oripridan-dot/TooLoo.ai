# TooLoo.ai - Service Routing & Signal Flow Map

## Complete Service Topology

```
                          ┌─────────────────────────┐
                          │  WEB CLIENTS (Browser)  │
                          └────────────┬────────────┘
                                      │ HTTP/HTTPS
                                      │ Port 3000
                          ┌───────────▼────────────┐
                          │   WEB-SERVER.js        │
                          │ Reverse Proxy + Routes │
                          │ Circuit Breaker Stack  │
                          └───────┬───────────────┘
                    ┌─────────────┼─────────────────┬────────────────┐
                    │             │                 │                │
         ┌──────────▼──┐  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
         │ /training/* │  │ /budget/*   │  │ /coach/*    │  │ /design/*   │
         │ → 3001      │  │ → 3003      │  │ → 3004      │  │ → 3006      │
         └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
                │                │                │                │
    ┌───────────▼────────────┐   │         ┌──────▼────────────┐   │
    │ TRAINING-SERVER :3001  │   │         │ COACH-SERVER :3004│   │
    │ ┌─────────────────────┐│   │         │ ┌────────────────┐│   │
    │ │ Training Rounds     ││   │         │ │ Boost Session  ││   │
    │ │ Challenges          ││   │         │ │ Fast Lane      ││   │
    │ │ Domain Selection    ││   │         │ │ Hyper-Boost    ││   │
    │ │ Metrics Tracking    ││   │         │ │ Settings       ││   │
    │ └─────────────────────┘│   │         │ └────────────────┘│   │
    └────────────────────────┘   │         └───────────────────┘   │
              │                   │                                 │
              │        ┌──────────▼──────────────┐                 │
              │        │ BUDGET-SERVER :3003    │                 │
              │        │ ┌────────────────────┐ │                 │
              │        │ │ Provider Selection │ │                 │
              │        │ │ Cost Tracking      │ │                 │
              │        │ │ Budget Validation  │ │                 │
              │        │ │ Alerts             │ │                 │
              │        │ └────────────────────┘ │                 │
              │        └───────────┬────────────┘                 │
              │                    │                              │
              │        ┌───────────▼──────────────┐               │
              │        │ PROVIDER-SERVICE :3010+  │               │
              │        │ ┌────────────────────┐   │               │
              │        │ │ Claude (Anthropic) │   │               │
              │        │ │ GPT (OpenAI)       │   │               │
              │        │ │ Gemini (Google)    │   │               │
              │        │ │ DeepSeek, Ollama   │   │               │
              │        │ └────────────────────┘   │               │
              │        └────────────────────────┘                │
              │                                                   │
              │        ┌──────────────────────────────────────┐   │
              │        │ PRODUCT-SERVER :3006                 │   │
              │        │ ┌──────────────────────────────────┐ │   │
              │        │ │ NEW Figma Integration            │ │   │
              │        │ │ - Import design tokens           │ │   │
              │        │ │ - Generate CSS variables         │ │   │
              │        │ │ - Apply to UI surfaces           │ │   │
              │        │ │ - Webhook auto-sync              │ │   │
              │        │ ├──────────────────────────────────┤ │   │
              │        │ │ Workflows & Analysis             │ │   │
              │        │ │ Artifacts & Showcase             │ │   │
              │        │ │ Learning system                  │ │   │
              │        │ └──────────────────────────────────┘ │   │
              │        └──────────────┬───────────────────────┘   │
              │                       │                           │
              │        ┌──────────────▼────────────┐              │
              │        │ FIGMA API (api.figma.com) │◄─────────────┘
              │        │ - Get file metadata       │
              │        │ - Extract design tokens   │
              │        │ - List components         │
              │        │ - Webhooks                │
              │        └───────────────────────────┘
              │
    ┌─────────▼──────────────────────┬──────────────────┬──────────────┬───────────┐
    │                                │                  │              │           │
┌───▼────────────┐  ┌────────────────▼──┐  ┌──────────▼────┐  ┌──────▼──┐  ┌──────▼──┐
│ SEGMENTATION   │  │ REPORTS-SERVER    │  │ CAPABILITIES  │  │ META    │  │ORCHESTR │
│ SERVER :3007   │  │ :3008             │  │ SERVER :3009  │  │ SERVER  │  │ :3123   │
│ ┌────────────┐ │  │ ┌────────────────┐│  │ ┌───────────┐ │  │ :3002   │  │ ┌──────┐ │
│ │ Cohort     │ │  │ │ Provider       ││  │ │Health     │ │  │ ┌─────┐ │  │ │Intents│ │
│ │Analysis    │ │  │ │Performance     ││  │ │Capability│ │  │ │Meta  │ │  │ │Workflows│ │
│ │Traits      │ │  │ │Insights        ││  │ │Fixes      │ │  │ │Learn │ │  │ │Tasks  │ │
│ │Segmentation│ │  │ │Trends          ││  │ └───────────┘ │  │ └─────┘ │  │ └──────┘ │
│ └────────────┘ │  │ └────────────────┘│  │               │  │         │  │         │
└────────────────┘  └───────────────────┘  └───────────────┘  └─────────┘  └─────────┘

```

## Request Flow Examples

### Example 1: Chat Message with Cross-Validation

```
Browser: POST /api/v1/chat/cross-validate
    │
    ▼
web-server.js (line 1176)
    ├→ Parse user query
    ├→ Split for cross-validation
    ├→ FETCH: budget-server:3003 (provider selection)
    │   ├→ Check provider costs
    │   └→ Select best provider for task
    ├→ FETCH: provider-service:3010+ (API calls)
    │   ├→ Claude API
    │   ├→ GPT API
    │   ├→ Gemini API
    │   └→ Aggregate responses
    ├→ FETCH: training-server:3001 (if tracking)
    │   └→ Record metrics
    ├→ Format response with insights
    └→ Return to browser: { ok: true, responses: [...], insights: [...] }

Status: ✅ All links verified
```

### Example 2: Auto-Coach Boost Session

```
Browser: POST /api/v1/auto-coach/boost
    │
    ▼
web-server.js (coach middleware)
    │
    ▼ [Proxy to coach-server:3004]
    
coach-server.js (line 87)
    ├→ Analyze current session
    ├→ Generate boost strategy
    ├→ FETCH: budget-server:3003
    │   └→ Check if boost is affordable
    ├→ FETCH: training-server:3001
    │   └→ Get current progress
    ├→ FETCH: provider-service:3010+
    │   └→ Generate boost recommendations
    ├→ Execute boost
    └→ Return to web-server → browser

Status: ✅ All links verified
```

### Example 3: Design Token Import & Apply (NEW)

```
Browser: POST /api/v1/design/import-figma
    │
    ▼
web-server.js (product prefix)
    │
    ▼ [Proxy to product-server:3006]
    
product-server.js (line 1175+)
    ├→ Validate Figma token
    ├→ Parse Figma URL (extract file ID)
    ├→ FETCH: https://api.figma.com/v1
    │   ├→ GET /v1/files/{fileId}
    │   │   └→ Metadata & document structure
    │   ├→ GET /v1/files/{fileId}/styles
    │   │   └→ Design tokens (colors, typography)
    │   ├→ GET /v1/files/{fileId}/components
    │   │   └→ Component library
    │   └→ Response: token data
    ├→ Create DesignTokenConverter instance
    ├→ Extract colors (RGB→CSS hex)
    ├→ Extract typography (size, weight, family)
    ├→ Extract spacing & effects
    ├→ Generate CSS output: 3 formats
    │   ├→ File (save to disk)
    │   ├→ Inline (CSS-in-JS)
    │   └→ JSON (token data)
    ├→ POST: Apply to surfaces
    │   ├→ validation-dashboard.html
    │   ├→ chat-professional.html
    │   ├→ control-room.html
    │   └→ design-suite.html
    ├→ Persist to data/design-system/
    ├→ Register webhook for auto-sync
    └→ Return to browser: { ok: true, cssGenerated: true, applied: 4 }

Status: ✅ Complete end-to-end verified with REAL Figma API
```

### Example 4: Orchestrator Workflow Activation

```
Browser: POST /api/v1/orchestrator/activate/one
    │
    ▼
web-server.js (system prefix)
    │
    ▼ [Proxy to orchestrator:3123]
    
orchestrator.js (line 3300)
    ├→ Parse activation request
    ├→ FETCH: capabilities-server:3009
    │   └→ Check available capabilities
    ├→ FETCH: budget-server:3003
    │   └→ Validate resource availability
    ├→ FETCH: training-server:3001
    │   └→ Get current training state
    ├→ Create workflow task
    ├→ Schedule execution
    ├→ Return to web-server → browser: { ok: true, workflowId: "..." }
    │
    └─[Async] Execute in background
        ├→ Monitor via /api/v1/workflow/{workflowId}
        ├→ Query capabilities as needed
        └→ Update status via /api/v1/workflow/{workflowId}/execution/{executionId}

Status: ✅ All links verified
```

### Example 5: Training with Hyper-Speed

```
Browser: POST /api/v1/training/hyper-speed/start
    │
    ▼
web-server.js (training prefix)
    │
    ▼ [Proxy to training-server:3001]
    
training-server.js (line 360)
    ├→ Initialize hyper-speed mode
    ├→ Fetch available providers
    ├→ FETCH: budget-server:3003
    │   └→ High-concurrency provider selection
    ├→ Launch parallel micro-batches
    ├─→ FETCH: provider-service:3010+ (parallel)
    │   ├→ Claude API
    │   ├→ GPT API
    │   └→ Gemini API
    │       (All in parallel for speed)
    ├→ Aggregate results
    ├→ FETCH: segmentation-server:3007
    │   └→ Segment responses by quality
    ├→ FETCH: reports-server:3008
    │   └→ Generate performance report
    └→ Return to browser with stats

Status: ✅ All parallel paths verified
```

## Proxy Rule Mapping

| HTTP Method | URL Pattern | Target Service | Port | Handler |
|-------------|------------|-----------------|------|---------|
| ANY | /api/v1/training/* | training-server | 3001 | proxy |
| ANY | /api/v1/budget/* | budget-server | 3003 | proxy |
| ANY | /api/v1/auto-coach/* | coach-server | 3004 | proxy |
| ANY | /api/v1/design/* | product-server | 3006 | proxy |
| ANY | /api/v1/workflows/* | product-server | 3006 | proxy |
| ANY | /api/v1/segmentation/* | segmentation-server | 3007 | proxy |
| ANY | /api/v1/reports/* | reports-server | 3008 | proxy |
| ANY | /api/v1/capabilities/* | capabilities-server | 3009 | explicit |
| ANY | /api/v1/system/* | orchestrator | 3123 | proxy |
| ANY | /api/v1/arena/* | providers-arena | 3011 | explicit |
| GET/POST | /api/v1/chat/* | web-server | 3000 | local |
| GET/POST | /api/v1/github/* | web-server | 3000 | local |
| GET/POST | /api/v1/slack/* | web-server | 3000 | local |
| ANY | /api/chat | web-server | 3000 | local |

## Health Check Cascade

```
Browser: GET /system/status
    │
    ▼
web-server:3000
    ├→ GET http://127.0.0.1:3001/health (training)
    ├→ GET http://127.0.0.1:3002/health (meta)
    ├→ GET http://127.0.0.1:3003/health (budget)
    ├→ GET http://127.0.0.1:3004/health (coach)
    ├→ GET http://127.0.0.1:3006/health (product)
    ├→ GET http://127.0.0.1:3007/health (segmentation)
    ├→ GET http://127.0.0.1:3008/health (reports)
    ├→ GET http://127.0.0.1:3009/health (capabilities)
    ├→ GET http://127.0.0.1:3010/health (provider-service)
    └→ GET http://127.0.0.1:3123/health (orchestrator)
    
Returns: { services: { training: "up", budget: "up", ... } }
```

## Inter-Service Call Chains

### Chain 1: Provider Cost Validation
```
Any Service → budget-server:3003
├→ Check provider costs
├→ Track spend
├→ Return budget status
└→ Response: { ok: true, budgetRemaining: 95.50 }
```

### Chain 2: Training Progress Tracking
```
Any Service → training-server:3001
├→ Record session metrics
├→ Update domain mastery
├→ Calculate recommendations
└→ Response: { ok: true, nextTopic: "..." }
```

### Chain 3: Multi-Provider Synthesis
```
web-server:3000 → provider-service:3010+
├→ Parallel Claude call
├→ Parallel GPT call
├→ Parallel Gemini call
├→ Aggregate & rank responses
└→ Response: { responses: [...], best: {...} }
```

### Chain 4: Design System Application (NEW)
```
product-server:3006 → Figma API (api.figma.com)
├→ Extract design tokens
└→ web-server:3000 → Browser
    └→ Inject CSS into multiple pages
```

## Error Handling & Fallbacks

```
Request to service
    │
    ▼
Circuit Breaker Checks
    ├─ Service recently failed? → 503 (fallback)
    ├─ Request timeout? → Retry with backoff
    └─ Service available? → Forward request
    
    ▼
Actual Request
    ├─ Success (200-299) → Return response
    ├─ Client Error (400-499) → Return error
    ├─ Server Error (500-599) → Retry or fallback
    │   └─ After 2 retries: 503 with fallback
    └─ Network Error → 503 with fallback
```

## Summary Statistics

- **Total Services:** 11+
- **Total Endpoints:** 200+
- **Proxy Rules:** 17
- **Middleware Layers:** CORS, logging, tracing, rate limiting
- **Circuit Breaker Enabled:** Yes (all proxies)
- **Health Checks:** 11+ endpoints
- **External Integrations:** Figma, GitHub, Slack, Multiple AI Providers
- **Signal Flow Quality:** ✅ EXCELLENT
