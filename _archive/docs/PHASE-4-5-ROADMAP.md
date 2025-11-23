# Phase 4.5 Implementation Roadmap — Step-by-Step Guide

**Status:** Ready to Execute  
**Development Dates:** Nov 22-23, 2025  
**Prerequisites:** ✅ All verified

---

## ✅ Pre-Sprint Verification (Nov 17)

### Dependencies Status

| Dependency | Required | Status | Notes |
|-----------|----------|--------|-------|
| Node.js v22 | ✅ | ✅ Installed | v22.20.0 |
| WebSocket (ws) | ✅ | ✅ Available | v8.18.3 (via socket.io) |
| Vitest | ✅ | ✅ Installed | v3.2.4 |
| Express/HTTP | ✅ | ✅ Installed | In web-server |

**Outcome:** ✅ ALL DEPENDENCIES AVAILABLE

### Branch Preparation

```bash
# When ready (Nov 21-22):
git checkout main
git pull
git checkout -b feature/phase-4-5-streaming

# Use this branch for all Nov 22-23 work
```

---

## 🚀 Day 1: November 22 (Core Infrastructure)

### Timeline Overview
```
09:00-11:00  →  StreamingHandler (2h)
11:00-13:00  →  ProgressiveAnalysisEngine (2h)
13:00-14:30  →  SSE Endpoints (1.5h)
14:30-16:00  →  Testing & Validation (1.5h)
              ───────────────────────
              TOTAL: 7 HOURS
```

---

## Step-by-Step: Day 1 Execution

### Step 1: Create StreamingHandler (2 hours)

**File:** `engine/streaming-handler.js`

**What to implement:**

```javascript
// Class structure:
class StreamingHandler {
  constructor()                          // Initialize streams Map, metrics
  createStream(id, options)             // Create new stream, return streamId
  pushUpdate(streamId, type, data)      // Push event, return SSE format
  completeStream(streamId)              // Finalize, record stats
  cancelStream(streamId, reason)        // Cancel gracefully
  getActiveStreams()                    // Return active stream list
  getStreamStats()                      // Return aggregated metrics
}

// Internal structure:
this.streams = new Map([
  ['stream-123', {
    id: 'analysis-456',
    startTime: Date.now(),
    bytesStreamed: 0,
    eventCount: 0,
    active: true,
    findings: []
  }]
])
```

**Testing:**
```bash
# Create: `tests/unit/streaming-handler.test.js`

test('createStream returns valid streamId')
test('pushUpdate returns SSE format: "data: {json}\\n\\n"')
test('completeStream sets active to false')
test('getStats calculates correct metrics')
test('cancelStream removes from active')
test('handles concurrent streams')
```

**Commit:** `feat: Add StreamingHandler engine (core streaming)`

---

### Step 2: Create ProgressiveAnalysisEngine (2 hours)

**File:** `engine/progressive-analysis-engine.js`

**What to implement:**

```javascript
class ProgressiveAnalysisEngine {
  constructor(streamingHandler)
  
  async analyzeWithStreaming(data, options) {
    // Main entry point for streaming analysis
    // 1. Create stream
    // 2. Run 5 phases with progress updates
    // 3. Emit findings in real-time
    // 4. Complete with final results
  }
  
  emitProgress(streamId, stage, percentage)
  emitPhase(streamId, name, results)
  emitFinding(streamId, finding, severity, confidence)
  emitCompletion(streamId, results)
  emitError(streamId, message)
}
```

**Analysis Phases:**
```
Phase 1: Data Preparation (5-10%)
  → emitProgress(streamId, 'preparation', 10)
  → Do work: validate, parse, load
  → emitPhase(streamId, 'Phase 1', { validated: true })

Phase 2: Initial Analysis (15-20%)
  → emitProgress(streamId, 'analysis', 25)
  → Do work: pattern detection
  → emitPhase(streamId, 'Phase 2', { patterns: [...] })

Phase 3: Deep Inspection (30-40%)
  → emitProgress(streamId, 'inspection', 60)
  → For each finding: emitFinding(streamId, finding, severity, confidence)
  → emitPhase(streamId, 'Phase 3', { findings: count })

Phase 4: Aggregation (10-20%)
  → emitProgress(streamId, 'aggregation', 85)
  → Do work: consolidate
  → emitPhase(streamId, 'Phase 4', { consolidated: true })

Phase 5: Formatting (5-10%)
  → emitProgress(streamId, 'formatting', 95)
  → emitCompletion(streamId, finalResults)
  → Stream closes
```

**Testing:**
```bash
# Create: `tests/integration/streaming-integration.test.js`

test('analyzeWithStreaming completes full pipeline')
test('emitProgress sends correct format')
test('emitFinding updates in real-time')
test('emitCompletion includes all results')
test('error handling in stream')
test('finds are discoverable during analysis')
```

**Commit:** `feat: Add ProgressiveAnalysisEngine (streaming coordinator)`

---

### Step 3: Add SSE Endpoint (1.5 hours)

**File:** `servers/web-server.js` (modify)

**What to add:**

```javascript
// At end of route definitions, before app.listen():

app.post('/api/v1/analysis/stream', async (req, res) => {
  // 1. Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // 2. Create stream
  const streamHandler = new StreamingHandler();
  const progressEngine = new ProgressiveAnalysisEngine(streamHandler);
  
  // 3. Run analysis
  try {
    await progressEngine.analyzeWithStreaming(req.body.data, {
      onUpdate: (event) => {
        const line = streamHandler.pushUpdate(
          streamId,
          event.type,
          event.data
        );
        res.write(line);
      }
    });
  } catch (error) {
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: error.message 
    })}\n\n`);
  }
  
  // 4. Close stream
  res.end();
});

// Stats endpoint
app.get('/api/v1/streaming/stats', (req, res) => {
  const stats = streamHandler.getStreamStats();
  res.json(stats);
});

// Cancel endpoint
app.post('/api/v1/streaming/cancel/:streamId', (req, res) => {
  streamHandler.cancelStream(req.params.streamId, 'User cancelled');
  res.json({ success: true });
});
```

**Testing:**
```bash
# Manual test:
curl -N http://127.0.0.1:3000/api/v1/analysis/stream \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"data": {...}}'

# Should see SSE output:
# data: {"type":"progress",...}
# data: {"type":"finding",...}
# data: {"type":"complete",...}
```

**Commit:** `feat: Add SSE endpoint /api/v1/analysis/stream`

---

### Step 4: Test & Validate (1.5 hours)

**Run tests:**
```bash
npm test -- streaming-handler.test.js
npm test -- streaming-integration.test.js
```

**Manual validation:**
```bash
# Start web-server
npm run start:web

# In another terminal:
curl -N http://127.0.0.1:3000/api/v1/analysis/stream \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"data": "test"}'

# Watch for streaming output
```

**Commit:** `test: Add comprehensive streaming tests (Day 1)`

---

## 🚀 Day 2: November 23 (Advanced Features & Polish)

### Timeline Overview
```
09:00-11:00  →  WebSocket Support (2h)
11:00-12:00  →  StreamMetricsCollector (1h)
12:00-13:30  →  Client Library (1.5h)
13:30-14:30  →  Documentation & Demo (1h)
14:30-15:30  →  Final Testing & Review (1h)
              ───────────────────────
              TOTAL: 7 HOURS
```

---

## Step-by-Step: Day 2 Execution

### Step 5: Add WebSocket Support (2 hours)

**File:** `engine/streaming-handler.js` (extend)

**What to add:**

```javascript
// In StreamingHandler class:

createWebSocketStream(wsConnection, options) {
  const streamId = `ws-stream-${Date.now()}`;
  this.streams.set(streamId, {
    type: 'websocket',
    ws: wsConnection,
    startTime: Date.now(),
    bytesStreamed: 0,
    active: true
  });
  
  // Handle client messages
  wsConnection.on('message', (msg) => {
    const { type, action } = JSON.parse(msg);
    if (action === 'cancel') {
      this.cancelStream(streamId);
    }
  });
  
  // Handle disconnect
  wsConnection.on('close', () => {
    this.completeStream(streamId);
  });
  
  return streamId;
}

pushUpdateWebSocket(streamId, type, data) {
  const stream = this.streams.get(streamId);
  if (stream.type !== 'websocket') return;
  
  stream.ws.send(JSON.stringify({
    type,
    data,
    timestamp: Date.now()
  }));
  
  stream.bytesStreamed += JSON.stringify({ type, data }).length;
}
```

**File:** `servers/web-server.js` (add)

```javascript
// Add WebSocket upgrade handling:

import WebSocket from 'ws';

const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/api/v1/analysis/stream-websocket') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.on('message', async (message) => {
        const msg = JSON.parse(message);
        
        if (msg.type === 'start') {
          // Run analysis with streaming
          const streamHandler = new StreamingHandler();
          const streamId = streamHandler.createWebSocketStream(ws);
          
          const progressEngine = new ProgressiveAnalysisEngine(streamHandler);
          await progressEngine.analyzeWithStreaming(msg.data, {
            onUpdate: (event) => {
              streamHandler.pushUpdateWebSocket(
                streamId,
                event.type,
                event.data
              );
            }
          });
        }
      });
    });
  }
});
```

**Testing:**
```bash
# Create: `tests/integration/websocket-streaming.test.js`

test('WebSocket connection established')
test('WebSocket receives progress updates')
test('WebSocket can cancel stream')
test('WebSocket disconnection handled')
```

**Commit:** `feat: Add WebSocket streaming support`

---

### Step 6: Add StreamMetricsCollector (1 hour)

**File:** `engine/stream-metrics-collector.js`

**What to implement:**

```javascript
class StreamMetricsCollector {
  constructor() {
    this.metrics = {
      activeStreams: 0,
      totalBytesStreamed: 0,
      averageStreamDuration: 0,
      peakConcurrentStreams: 0,
      streamsCompleted: 0,
      streamErrors: 0,
      totalEvents: 0,
      startTime: Date.now()
    };
  }
  
  recordStreamStart() {
    this.metrics.activeStreams++;
    this.metrics.peakConcurrentStreams = Math.max(
      this.metrics.peakConcurrentStreams,
      this.metrics.activeStreams
    );
  }
  
  recordStreamComplete(duration, bytesStreamed) {
    this.metrics.activeStreams--;
    this.metrics.streamsCompleted++;
    this.metrics.totalBytesStreamed += bytesStreamed;
    this.metrics.averageStreamDuration = 
      (this.metrics.averageStreamDuration * (this.metrics.streamsCompleted - 1) + duration) 
      / this.metrics.streamsCompleted;
  }
  
  recordError() {
    this.metrics.streamErrors++;
  }
  
  recordEvent() {
    this.metrics.totalEvents++;
  }
  
  getMetrics() {
    return { ...this.metrics, uptime: Date.now() - this.metrics.startTime };
  }
}
```

**Add endpoint:**
```javascript
app.get('/api/v1/streaming/metrics', (req, res) => {
  res.json(metricsCollector.getMetrics());
});
```

**Testing:**
```bash
# Create: `tests/unit/stream-metrics-collector.test.js`

test('tracks active streams')
test('calculates peak concurrent')
test('averages stream duration')
test('counts errors correctly')
```

**Commit:** `feat: Add StreamMetricsCollector for monitoring`

---

### Step 7: Build Client Library (1.5 hours)

**File:** `lib/streaming-client.js`

**What to implement:**

```javascript
export class StreamingClient {
  constructor(endpoint = '/api/v1/analysis/stream') {
    this.endpoint = endpoint;
    this.listeners = new Map();
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  async startAnalysis(data) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const event = JSON.parse(line.slice(6));
            this.emit(event.type, event.data);
          }
        }
      }
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }
}

// TypeScript types (if needed):
export interface ProgressEvent {
  stage: string;
  percentage: number;
}

export interface FindingEvent {
  finding: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface CompleteEvent {
  finalResults: any;
  duration: number;
}
```

**Testing:**
```bash
# Create: `tests/unit/streaming-client.test.js`

test('connects to SSE endpoint')
test('parses progress events')
test('parses finding events')
test('parses complete events')
test('handles connection errors')
test('retries on failure')
```

**Commit:** `feat: Add JavaScript streaming client library`

---

### Step 8: Documentation & Demo (1 hour)

**Create:** `docs/STREAMING-API.md`

```markdown
# Streaming Analysis API

## Overview
Real-time streaming analysis using Server-Sent Events (SSE) and WebSocket.

## Endpoints

### POST /api/v1/analysis/stream (SSE)
Streams analysis progress in real-time.

**Example:**
```bash
curl -N http://127.0.0.1:3000/api/v1/analysis/stream \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"data": {...}}'
```

**Response:** Server-Sent Events

### GET /api/v1/streaming/metrics
Get current streaming statistics.

## Client Usage

```javascript
import { StreamingClient } from './lib/streaming-client.js';

const client = new StreamingClient();

client.on('progress', (data) => {
  console.log(`Progress: ${data.percentage}%`);
});

client.on('finding', (data) => {
  console.log(`Found: ${data.finding} (${data.severity})`);
});

client.on('complete', (data) => {
  console.log('Analysis complete!', data.finalResults);
});

await client.startAnalysis({ text: 'analyze this' });
```

## Performance

- Latency: <100ms per event
- Throughput: 10-50 events/sec per stream
- Concurrent: 50+ streams supported
- Memory: ~5MB per stream

## See also
- PHASE-4-5-ARCHITECTURE.js
- PHASE-4-5-PREPARATION.md
```

**Create:** `web-app/demo-streaming.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>Streaming Analysis Demo</title>
  <style>
    body { font-family: monospace; margin: 20px; }
    #progress { margin: 20px 0; }
    #events { border: 1px solid #ccc; padding: 10px; height: 400px; overflow-y: auto; }
    .event { padding: 5px; border-bottom: 1px solid #eee; }
    .progress { background: #e3f2fd; }
    .finding { background: #fff3e0; }
    .complete { background: #e8f5e9; }
    .error { background: #ffebee; color: red; }
  </style>
</head>
<body>
  <h1>Streaming Analysis Demo</h1>
  
  <button onclick="startAnalysis()">Start Analysis</button>
  <button onclick="clearLog()">Clear Log</button>
  
  <div id="progress">
    <div>Progress: <span id="pct">0</span>%</div>
    <div style="width: 300px; border: 1px solid #ccc; margin: 10px 0;">
      <div id="bar" style="width: 0%; height: 20px; background: #4CAF50;"></div>
    </div>
  </div>
  
  <h3>Events</h3>
  <div id="events"></div>
  
  <script type="module">
    import { StreamingClient } from '../lib/streaming-client.js';
    
    const client = new StreamingClient();
    
    client.on('progress', (data) => {
      document.getElementById('pct').textContent = data.percentage;
      document.getElementById('bar').style.width = data.percentage + '%';
      log('progress', data);
    });
    
    client.on('finding', (data) => {
      log('finding', `${data.finding} (${data.severity})`);
    });
    
    client.on('complete', (data) => {
      log('complete', 'Analysis complete!');
    });
    
    client.on('error', (error) => {
      log('error', error.message);
    });
    
    window.startAnalysis = async () => {
      clearLog();
      await client.startAnalysis({ text: 'test data' });
    };
    
    window.clearLog = () => {
      document.getElementById('events').innerHTML = '';
    };
    
    function log(type, data) {
      const div = document.createElement('div');
      div.className = `event ${type}`;
      div.textContent = `[${type.toUpperCase()}] ${JSON.stringify(data)}`;
      document.getElementById('events').appendChild(div);
      document.getElementById('events').scrollTop = document.getElementById('events').scrollHeight;
    }
  </script>
</body>
</html>
```

**Commit:** `docs: Add streaming API documentation and demo`

---

### Step 9: Final Testing & Review (1 hour)

**Run full test suite:**
```bash
npm test

# Should see:
# ✓ streaming-handler.test.js (8 tests)
# ✓ progressive-analysis-engine.test.js (6 tests)
# ✓ streaming-integration.test.js (8 tests)
# ✓ websocket-streaming.test.js (4 tests)
# ✓ streaming-client.test.js (6 tests)
# ✓ stream-metrics-collector.test.js (4 tests)
# ─────────────────────────────────────
# TOTAL: 36 tests passing ✅
```

**Code review:**
- [ ] No console.log statements
- [ ] All functions documented
- [ ] Error handling comprehensive
- [ ] Memory leaks checked
- [ ] Tests all passing

**Performance baseline:**
```bash
# Run load test
node tests/load/streaming-load.test.js

# Expected:
# 10 concurrent streams: ✓
# 50 concurrent streams: ✓
# 100 concurrent streams: ✓
# Peak memory: < 500MB
# CPU usage: < 20%
```

**Final commits:**
```bash
git add .
git commit -m "feat: Phase 4.5 complete — streaming analysis with SSE & WebSocket

- StreamingHandler: Core connection management
- ProgressiveAnalysisEngine: Streaming-aware analysis
- SSE Endpoint: Real-time progress updates
- WebSocket Support: Bidirectional messaging
- Client Library: JavaScript SSE client
- Metrics Collector: Performance tracking
- Documentation: API docs & demo page
- Tests: 36+ tests, all passing

Features:
- 4 endpoints operational
- Real-time progress tracking
- Finding discovery during analysis
- Error handling & recovery
- Concurrent stream support (50+)
- Performance metrics collection

Performance:
- <100ms event latency
- <5% CPU per stream
- <10MB memory per stream
- Network efficiency >80%

All tests passing. Ready for integration."
```

**Create PR:**
```bash
git push origin feature/phase-4-5-streaming
# Open PR on GitHub for review
```

---

## 🎯 Success Indicators

### Day 1 End (Nov 22)
- [ ] StreamingHandler: Complete & tested
- [ ] ProgressiveAnalysisEngine: Complete & tested
- [ ] SSE Endpoint: Live & working
- [ ] 20+ unit/integration tests: ✅ PASSING
- [ ] Endpoint responding to requests: ✅ YES
- [ ] No console errors: ✅ CLEAN

### Day 2 End (Nov 23)
- [ ] WebSocket support: Complete
- [ ] Metrics collector: Complete & tracking
- [ ] Client library: Complete & usable
- [ ] Documentation: Complete with examples
- [ ] Demo page: Working & responsive
- [ ] 36+ tests: ✅ ALL PASSING
- [ ] Performance baseline: Established
- [ ] Code review: Approved
- [ ] All changes committed: ✅ YES

---

## ⏳ Timeline Quick Reference

| Time | Task | Deliverables |
|------|------|--------------|
| 09:00-11:00 | StreamingHandler | Core streaming logic |
| 11:00-13:00 | ProgressiveAnalysisEngine | Analysis coordinator |
| 13:00-14:30 | SSE Endpoint | Live SSE streaming |
| 14:30-16:00 | Day 1 Testing | 20+ tests passing |
| **DAY 1 END** | **✅ Core complete** | **2 endpoints live** |
| 09:00-11:00 | WebSocket Support | WS streaming |
| 11:00-12:00 | Metrics Collector | Performance tracking |
| 12:00-13:30 | Client Library | JavaScript wrapper |
| 13:30-14:30 | Documentation | API docs + demo |
| 14:30-15:30 | Final Testing | All 36+ tests passing |
| **DAY 2 END** | **✅ Complete** | **4 endpoints, library, docs** |

---

## 🛠️ Development Tips

### Keep Code Clean
- One function per task
- Clear variable names
- Comments on complex logic

### Test Early & Often
- Write test as you code
- Run tests after each component
- Fix failures immediately

### Commit Frequently
- Small, meaningful commits
- Clear commit messages
- One feature per commit

### Remember
- SSE is unidirectional (server → client)
- WebSocket is bidirectional
- Keep streams metadata lean
- Monitor memory during development

---

**Ready to Start:** Nov 22, 09:00 UTC  
**Expected Completion:** Nov 23, 15:30 UTC  
**Outcome:** 4 endpoints live, client library ready, full documentation  

Everything is planned. Time to execute! 🚀
