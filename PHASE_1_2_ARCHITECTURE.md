# TooLoo.ai Architecture: Phase 1 + Phase 2

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    TooLoo.ai V3.3.499 (SYNAPSYS)               │
│              Multi-Agent AI Orchestration Platform              │
└─────────────────────────────────────────────────────────────────┘

                          USER REQUEST
                              ↓
                    ┌─────────────────────┐
                    │   Chat Endpoint     │
                    │  /api/v1/chat       │
                    └──────────┬──────────┘
                               ↓
        ┌──────────────────────────────────────────────┐
        │        PHASE 1: Smart Routing               │
        ├──────────────────────────────────────────────┤
        │                                              │
        │  SmartRouter                                │
        │  ┌───────────────────────────────────────┐  │
        │  │ Uses dynamic weights from:            │  │
        │  │ - Real-time metrics (ProviderScore)   │  │
        │  │ - Historical performance data         │  │
        │  │ - Failure recovery patterns           │  │
        │  └───────────────────────────────────────┘  │
        │                                              │
        │  Routes to: [DeepSeek | Gemini |            │
        │             Anthropic | OpenAI]             │
        │                                              │
        └──────────────┬───────────────────────────────┘
                       ↓
        ┌──────────────────────────────────────────────┐
        │      PHASE 2: Self-Optimization             │
        ├──────────────────────────────────────────────┤
        │                                              │
        │  ProviderScorecard (Real Metrics)           │
        │  ├─ DeepSeek: score: 0.92, latency: 240ms  │
        │  ├─ Gemini: score: 0.89, latency: 350ms    │
        │  ├─ Anthropic: score: 0.94, latency: 450ms │
        │  └─ OpenAI: score: 0.87, latency: 520ms    │
        │                                              │
        │  Metrics Updated From:                      │
        │  1. Real requests (production)              │
        │  2. Hourly BenchmarkService runs            │
        │                                              │
        └──────────────────────────────────────────────┘
                       ↓
        ┌──────────────────────────────────────────────┐
        │     Provider Selection & Execution          │
        ├──────────────────────────────────────────────┤
        │                                              │
        │  Provider Selection Strategy:               │
        │  • Best Score (default)                     │
        │  • Exploration (10% of requests)            │
        │  • Fallback (auto-retry on timeout)        │
        │  • Ensemble (for high-stakes)              │
        │                                              │
        └──────────────────────────────────────────────┘
                       ↓
                    RESPONSE
```

## Phase 2: Self-Optimization System

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   PHASE 2: Self-Optimization                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         RuntimeConfig (Dynamic Configuration)             │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │                                                            │ │
│  │  In-Memory State:                                          │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ providerWeights: {latency: 0.4, cost: 0.3, ...}    │ │ │
│  │  │ modelConfig: {temp: 0.7, maxTokens: 2048, ...}     │ │ │
│  │  │ features: {autoOptimization: true, ...}            │ │ │
│  │  │ explorationRate: 0.1                               │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                      ↓                                      │ │
│  │  Debounced Persistence (1 write/sec max)                  │ │
│  │  ↓                                                          │ │
│  │  config/runtime.json (10KB)                               │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                      ↑ (updates)                                │
│                      │                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │     BenchmarkService (Real Performance Testing)           │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │                                                            │ │
│  │  Hourly Cycle:                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ 1. Load 10 standard test prompts                    │ │ │
│  │  │ 2. Send to all 4 providers in parallel (40 tests)   │ │ │
│  │  │ 3. Collect: latency, tokens, quality score         │ │ │
│  │  │ 4. Analyze results for patterns                    │ │ │
│  │  │ 5. Update ProviderScorecard                        │ │ │
│  │  │ 6. Publish results on event bus                    │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  Test Prompts (10 types):                                │ │
│  │  • Simple Q&A      • Code generation   • Explanation    │ │
│  │  • Summarization   • Creative writing  • Data extraction │ │
│  │  • Problem solving • Transformation    • Analysis        │ │
│  │  • Complex reasoning                                      │ │
│  │                                                            │ │
│  │  Metrics Collected:                                       │ │
│  │  • Latency (ms)                                           │ │
│  │  • Token count                                            │ │
│  │  • Quality score (0-1)                                   │ │
│  │  • Success/failure                                        │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  API Exposure:                                                  │
│  • GET /api/v1/system/runtime-config                           │
│  • POST /api/v1/system/runtime-config (for updates)            │
│  • GET /api/v1/system/benchmark-results                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Optimization Feedback Loop

### Sequence Diagram

```
Hour 0:00
├─ SmartRouter uses initial weights
├─ User requests routed
└─ Metrics recorded in ProviderScorecard

Hour 1:00
├─ BenchmarkService starts cycle
├─ Sends 10 prompts × 4 providers
├─ Collects performance data:
│  ├─ DeepSeek: 240ms avg, 98% success
│  ├─ Gemini: 350ms avg, 96% success
│  ├─ Anthropic: 450ms avg, 99% success
│  └─ OpenAI: 520ms avg, 97% success
├─ Analyzes: "Speed becoming critical factor"
└─ Event published: 'benchmark:complete'

Hour 1:01
├─ AutonomousEvolutionEngine (listens to event)
├─ Reads BenchmarkResults
├─ Analyzes optimization opportunities
├─ Decides: "Increase latency weight from 0.4 to 0.5"
├─ Updates RuntimeConfig:
│  └─ providerWeights: {latency: 0.5, cost: 0.2, rel: 0.3}
├─ RuntimeConfig saves to disk
└─ Metrics: Set optimizedBy='AutonomousEvolutionEngine'

Hour 1:02+
├─ SmartRouter uses new weights
├─ DeepSeek scores even higher
├─ More requests routed to DeepSeek
├─ Users experience faster responses
└─ System improves!

Hour 2:00
├─ Next benchmark cycle
├─ New weights applied
├─ Updated performance data collected
└─ Continuous improvement continues...
```

## Provider Ranking Example

### Before Phase 2 (Static Weights)
```
Weights: latency: 0.4, cost: 0.3, reliability: 0.3

DeepSeek:    0.240s × 0.4 = 0.096  ✓ Fast
Gemini:      0.350s × 0.4 = 0.140
Anthropic:   0.450s × 0.4 = 0.180
OpenAI:      0.520s × 0.4 = 0.208

Score: DeepSeek: 0.92
       Anthropic: 0.94 ✗ Slower but more reliable
       (Conflict: speed vs reliability hardcoded)
```

### After Phase 2 (Dynamic Weights)
```
Hour 1 - Weights: latency: 0.5, cost: 0.2, reliability: 0.3

DeepSeek:    0.240s × 0.5 = 0.120  ✓ Much better
Gemini:      0.350s × 0.5 = 0.175
Anthropic:   0.450s × 0.5 = 0.225
OpenAI:      0.520s × 0.5 = 0.260

Score: DeepSeek: 0.96
       Anthropic: 0.92
       (Adaptive: Speed prioritized, still reliable)

Hour 2 - If speed degrades elsewhere:
Weights: latency: 0.3, cost: 0.4, reliability: 0.3
(Cost suddenly matters more - system adapts)
```

## Deployment Model

### Startup Sequence

```
npm run dev
    ↓
Backend starts (tsx watch on :4000)
    ↓
[Precog] Initializing Predictive Intelligence
    ↓
[SmartRouter] Initialized
    ↓
[ProviderScorecard] Initialized with default weights
    ↓
[RuntimeConfig] load()
    ├─ Check: config/runtime.json exists?
    ├─ If YES: Load saved configuration
    ├─ If NO: Use defaults and auto-create file
    └─ Loaded config version: 3.3.499
    ↓
[Chat] RuntimeConfig loaded for Phase 2 Self-Optimization
    ↓
[Chat] SmartRouter weights synced from RuntimeConfig
    ├─ latency: 0.4, cost: 0.3, reliability: 0.3
    └─ OR custom values from config/runtime.json
    ↓
[BenchmarkService] start()
    ├─ Initialize internal state
    ├─ Schedule hourly benchmark task
    └─ Run first benchmark immediately (async)
    ↓
[Chat] BenchmarkService started for real performance tracking
    ↓
🚀 System Online - Ready for Requests
    ├─ SmartRouter: ACTIVE (using current weights)
    ├─ BenchmarkService: ACTIVE (running benchmarks)
    └─ RuntimeConfig: READY (can be updated via API)
```

## Data Flow Examples

### Example 1: User Makes Chat Request

```
User: "Generate TypeScript utility function"
    ↓
POST /api/v1/chat with message
    ↓
[Chat Route]
├─ Parse message
├─ Call SmartRouter.selectProvider()
│  └─ Uses current weights from RuntimeConfig
├─ Routes to: DeepSeek (highest score: 0.96)
└─ Sends message to DeepSeek
    ↓
DeepSeek API
├─ Latency: 245ms
├─ Tokens: 150
├─ Quality: Good response
└─ Status: Success
    ↓
ProviderScorecard.recordMetric()
├─ Provider: DeepSeek
├─ Latency: 245ms (confirms it's fast)
├─ Quality: +1 success
├─ Updates rolling average
└─ Refines scoring
    ↓
Response sent to user
└─ Response time visible: 245ms ✓

(In background)
└─ Metrics accumulated in scorecard
   └─ Help next benchmark cycle be more accurate
```

### Example 2: BenchmarkService Runs

```
[BenchmarkService] Starting benchmark round
    ↓
Load 10 standard test prompts
    ↓
For each provider (DeepSeek, Gemini, Anthropic, OpenAI):
  ├─ Send 10 prompts in parallel
  ├─ Measure: latency, tokens, quality
  ├─ Track: success/failure
  └─ Store results
    ↓
[BenchmarkService] Analysis complete
├─ DeepSeek: Avg 240ms, 98% success, quality: 0.92
├─ Gemini: Avg 350ms, 96% success, quality: 0.89
├─ Anthropic: Avg 450ms, 99% success, quality: 0.94
├─ OpenAI: Avg 520ms, 97% success, quality: 0.87
├─ Insights:
│  ├─ "Speed improving across board"
│  ├─ "Anthropic most reliable"
│  └─ "DeepSeek best value (fast+good)"
└─ Update ProviderScorecard rankings
    ↓
Publish: bus.emit('benchmark:complete', results)
    ↓
(If AutonomousEvolutionEngine listening)
├─ Read: benchmark results
├─ Analyze: optimization opportunities
├─ Decide: Update weights? features? exploration rate?
├─ Update: RuntimeConfig
└─ Result: System adapts to new conditions
    ↓
Next requests use updated configuration
└─ System improves!
```

### Example 3: Manual Config Update (Via API)

```
POST /api/v1/system/runtime-config
{
  "weights": {
    "latency": 0.6,  // Increase
    "cost": 0.2,
    "reliability": 0.2
  },
  "explorationRate": 0.15,
  "features": {
    "autoOptimization": true
  }
}
    ↓
[Cognitive] POST /system/runtime-config
├─ Validate request
├─ Call: RuntimeConfig.updateProviderWeights()
├─ Set: metadata.optimizedBy = 'api-update'
├─ Save to disk (debounced)
├─ Trigger onChange() callbacks
└─ SmartRouter automatically refreshes
    ↓
Response: 
{
  "success": true,
  "message": "Configuration updated",
  "data": {
    "timestamp": 1765326651024,
    "weights": {latency: 0.6, cost: 0.2, reliability: 0.2},
    "appliedImmediately": true
  }
}
    ↓
Next request uses new weights
└─ No server restart needed!
```

## Phase 3: User Segmentation (Planned)

```
┌─────────────────────────────────────────────────────┐
│     Phase 3: User & Task Awareness                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  SegmentationService:                              │
│  • Analyze message type                            │
│    - Code generation → prefer Anthropic/OpenAI    │
│    - Creative → prefer Claude                      │
│    - Analysis → prefer OpenAI                      │
│    - Simple Q&A → prefer DeepSeek (fastest)      │
│                                                     │
│  UserModelEngine:                                  │
│  • Build user preference profiles                 │
│    - Developer? → Code quality > speed            │
│    - Designer? → Creative > technical             │
│    - Researcher? → Accuracy > speed               │
│    - Student? → Explanation > brevity             │
│                                                     │
│  Integration:                                      │
│  SmartRouter receives context:                     │
│  {                                                 │
│    userType: 'developer',                         │
│    messageType: 'code-generation',                │
│    complexity: 'high'                             │
│  }                                                 │
│  → Uses context-aware weights                     │
│  → Different provider ordering per context        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Phase 4: Continuous Learning (Planned)

```
┌─────────────────────────────────────────────────────┐
│   Phase 4: Q-Learning Optimization                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Q-Learning Model:                                 │
│  State = (messageType, userType, complexity)      │
│  Action = Select Provider                          │
│  Reward = Success + Quality + Speed               │
│                                                     │
│  Example Q-Table Entry:                            │
│  State: (code-gen, developer, high)               │
│  ├─ DeepSeek: Q=0.78                              │
│  ├─ Anthropic: Q=0.92 ← Best                      │
│  ├─ OpenAI: Q=0.85                                │
│  └─ Gemini: Q=0.71                                │
│                                                     │
│  After success with Anthropic: Q → 0.93          │
│  After timeout with DeepSeek: Q → 0.70           │
│                                                     │
│  Emergence Detection:                              │
│  • Identify novel state combinations              │
│  • Test different providers for unknowns          │
│  • Learn patterns that weren't programmed         │
│  • Discover optimal strategies                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Performance Summary

| Component | Overhead | Impact | Notes |
|-----------|----------|--------|-------|
| SmartRouter | <1ms/req | Route selection only | In-memory scoring |
| RuntimeConfig | <1ms | Config lookup | Fast object access |
| Persistence | 0ms | Debounced 1x/sec | Async disk writes |
| BenchmarkService | 45sec/hour | 1% overhead | Hourly batch |
| **Total Overhead** | **~1-2ms/req** | **Negligible** | No impact on UX |

---

## Summary

**Phase 1:** SmartRouter makes dynamic routing decisions based on real metrics.

**Phase 2:** RuntimeConfig + BenchmarkService enable self-optimization.

**Combined:** System measures performance hourly, adjusts weights dynamically, improves continuously without human intervention.

**Result:** Faster, more reliable, context-aware responses that improve over time.

---

**Architecture Status:** ✅ Phase 1 + Phase 2 COMPLETE & OPERATIONAL

**Ready for:** Phase 3 (User Segmentation) or Phase 4 (Continuous Learning)
