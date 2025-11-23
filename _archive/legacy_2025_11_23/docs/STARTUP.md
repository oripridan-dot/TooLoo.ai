# TooLoo.ai Startup Guide

## Quick Start

```bash
# Start all services
npm start

# Or manually:
bash startup.sh
```

That's it. The system will:
1. ✅ Clean up old processes
2. ✅ Start the web server (port 3000)
3. ✅ Trigger service orchestration
4. ✅ Verify all 12 services come online
5. ✅ Display system status

---

## System Architecture

### 🔷 Core Design

TooLoo.ai runs as a **unified multi-service system** with a single entry point:

```
User Requests
     ↓
Web Server (port 3000)
     ├─→ /api/v1/* → Routes to appropriate services
     ├─→ /chat → AI synthesis/ensemble
     └─→ /system → Control operations
     ↓
Orchestrator (spawned on demand)
     ├─→ Reads SERVICE_REGISTRY
     └─→ Starts all 12 services
     ↓
Services (distributed, autonomous)
     ├─→ Health checks
     └─→ Event-driven updates
```

### 🔧 Service Registry

The **orchestrator** maintains a single source of truth for all services:

| Port | Service | Purpose | Dependencies |
|------|---------|---------|--------------|
| 3000 | Web Server | API Gateway, UI hosting | — |
| 3001 | Training | Learning engine, skill tracking | — |
| 3002 | Meta | Metadata, system introspection | — |
| 3003 | Budget | Token budgets, rate limiting | — |
| 3004 | Coach | Auto-coaching, guidance | training |
| 3005 | Cup | Competitions, tournaments | — |
| 3006 | Product | Workflows, artifacts | — |
| 3007 | Segmentation | Conversation analysis | — |
| 3008 | Reports | Analytics, dashboards | training, meta, budget |
| 3009 | Capabilities | Feature discovery | — |
| 3100 | Orchestration | Service coordination | — |
| 3200 | Provider | LLM provider management | — |
| 3300 | Analytics | Event tracking, metrics | — |

---

## Starting the System

### Method 1: NPM (Recommended)

```bash
npm start
```

This runs `bash startup.sh` with full verification.

### Method 2: Direct Script

```bash
bash startup.sh
```

### Method 3: Manual Control

```bash
# Start just the web server
node servers/web-server.js

# In another terminal, trigger orchestration:
curl -X POST http://127.0.0.1:3000/system/start \
  -H 'Content-Type: application/json' \
  -d '{"autoOpen":false}'
```

---

## Startup Phases

The `startup.sh` script runs **7 verification phases**:

### Phase 1: Cleanup & Verification
- Kills any stale processes on service ports
- Verifies Node.js is installed
- Checks all required files exist

### Phase 2: Start Web Server
- Launches web server on port 3000
- Waits for `/health` endpoint to respond (max 30s)
- Confirms port availability

### Phase 3: Trigger Orchestration
- Calls POST `/system/start` endpoint
- Web server spawns orchestrator process
- Orchestrator reads SERVICE_REGISTRY

### Phase 4: Verify Services
- Checks `/health` endpoint on all 12 service ports
- Reports which services are responding
- Allows slower services time to boot

### Phase 5: Test API Endpoints
- Tests `/api/v1/chat/synthesis` endpoint
- Tests `/api/v1/chat/ensemble` endpoint
- Verifies AI provider integration

### Phase 6: Wait for Stability
- Pauses 15 seconds for remaining services to boot
- Allows background service initialization

### Phase 7: Final Verification
- Confirms web server is responding
- Counts active services
- Displays system status dashboard

---

## Checking System Status

### Web Server Health
```bash
curl http://127.0.0.1:3000/health
```

### Specific Service Health
```bash
# Training service
curl http://127.0.0.1:3001/health

# Meta service
curl http://127.0.0.1:3002/health

# All services
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3100 3200 3300; do
  echo -n "Port $port: "
  curl -s http://127.0.0.1:$port/health | grep -q '"ok":true' && echo "✅ OK" || echo "❌ Down"
done
```

### Service Count
```bash
curl http://127.0.0.1:3000/api/v1/system/processes | jq '.processes | length'
```

### Full System Status
```bash
curl http://127.0.0.1:3000/api/v1/system/status | jq .
```

---

## Accessing the System

### Web UI
- **Main Dashboard**: http://127.0.0.1:3000
- **Chat Interface**: http://127.0.0.1:3000/tooloo-chat
- **Control Room**: http://127.0.0.1:3000/control-room

### API Endpoints

#### Chat Synthesis (Single Provider)
```bash
curl -X POST http://127.0.0.1:3000/api/v1/chat/synthesis \
  -H 'Content-Type: application/json' \
  -d '{"message":"What is TooLoo.ai?","sessionId":"default"}'
```

**Response** (92% confidence):
```json
{
  "response": "TooLoo.ai is...",
  "confidence": 92,
  "synthesisMethod": "single-provider",
  "provider": "anthropic",
  "metadata": {
    "model": "claude-3-5-haiku-20241022",
    "responseTime": 2341
  }
}
```

#### Chat Ensemble (Multi-Provider)
```bash
curl -X POST http://127.0.0.1:3000/api/v1/chat/ensemble \
  -H 'Content-Type: application/json' \
  -d '{"message":"What is TooLoo.ai?","sessionId":"default"}'
```

**Response** (95% confidence):
```json
{
  "response": "**ANTHROPIC Perspective**:\nTooLoo.ai is...\n\n**OPENAI Perspective**:\n...\n\n**GEMINI Perspective**:\n...",
  "confidence": 95,
  "synthesisMethod": "multi-provider-ensemble",
  "providers": ["anthropic", "openai", "gemini"],
  "providerCount": 3,
  "metadata": {
    "responseTime": 8234,
    "providers": [
      {"name": "anthropic", "model": "claude-3-5-haiku", "confidence": 95},
      {"name": "openai", "model": "gpt-4o-mini", "confidence": 94},
      {"name": "gemini", "model": "gemini-2.5-flash", "confidence": 93}
    ]
  }
}
```

#### Supported AI Providers
The system automatically selects from (in fallback order):
1. **Anthropic** (Claude 3.5 Haiku) - Default
2. **OpenAI** (GPT-4o Mini) - Premium fallback
3. **Google** (Gemini 2.5 Flash) - Alternative
4. **DeepSeek** - Budget option
5. **Ollama** (Local) - Free local inference

---

## Logs and Monitoring

### Log Location
```
.tooloo-startup/
├── startup-YYYYMMDD-HHMMSS.log  ← Latest detailed log
├── last-startup.log             ← Symlink to last run
└── *.log                         ← Individual service logs
```

### View Latest Startup Log
```bash
tail -f .tooloo-startup/last-startup.log
```

### View Web Server Log
```bash
tail -f .tooloo-startup/web-server.log
```

### Full Startup Output
```bash
cat .tooloo-startup/last-startup.log | less
```

---

## Troubleshooting

### Issue: Port Already in Use

**Symptoms**: Startup fails with "Address already in use"

**Solution**:
```bash
# Kill processes on the port
lsof -i :3000 | grep -v COMMAND | awk '{print $2}' | xargs kill -9

# Or let the startup script handle it
bash startup.sh
```

### Issue: Services Not Coming Online

**Symptoms**: Only web server running, services still showing "not responding"

**Solution**:
```bash
# Wait longer (services boot at different speeds)
sleep 30

# Check orchestrator is running
ps aux | grep orchestrator.js

# Check orchestrator logs
tail -f .tooloo-startup/web-server.log | grep orchestrat
```

### Issue: Web Server Won't Start

**Symptoms**: "Web server failed to start" error

**Solution**:
```bash
# Verify Node.js installed
node -v

# Check .env file exists
cat .env | head -5

# Try starting directly
node servers/web-server.js

# Check error output
cat .tooloo-startup/web-server.log
```

### Issue: Service Health Checks Failing

**Symptoms**: Services show "not yet responding"

**Solution**:
```bash
# Services can take 5-30s to come online
# Wait and retry
sleep 30

# Check service is actually running
ps aux | grep "node servers"

# Verify port is listening
netstat -tlnp | grep 3001

# Check service logs
ls -la .server-logs/
```

### Issue: Provider Not Configured

**Symptoms**: Chat endpoints return provider errors

**Solution**:
```bash
# Verify .env file has API keys
cat .env | grep -i "ANTHROPIC\|OPENAI\|GEMINI"

# Check web server is using providers correctly
curl -s http://127.0.0.1:3000/api/v1/chat/synthesis \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"message":"test"}' | jq .error
```

---

## Performance Tuning

### Increase Service Startup Timeout
Edit `startup.sh` Phase 2:
```bash
local max_attempts=60  # 60 seconds instead of 30
```

### Enable Verbose Logging
```bash
export DEBUG=true
bash startup.sh
```

### Monitor Services in Real-Time
```bash
# In another terminal:
watch -n 1 'curl -s http://127.0.0.1:3000/api/v1/system/status | jq .'
```

---

## Stopping the System

### Graceful Shutdown
```bash
# Press Ctrl+C in the startup terminal
# Services will shut down gracefully
```

### Force Stop All Services
```bash
# Kill all Node processes
killall node

# Or specific cleanup
bash scripts/stop-all-services.sh
```

---

## Development & Debugging

### Start Individual Service
```bash
node servers/training-server.js
node servers/meta-server.js
node servers/budget-server.js
```

### Run Tests
```bash
npm run test:smoke      # Quick system check
npm run qa:suite        # Comprehensive quality assurance
npm run test:all        # Full test suite
```

### Benchmark Performance
```bash
npm run test:performance
curl http://127.0.0.1:3000/api/v1/benchmark
```

---

## Configuration

### Environment Variables

Create or edit `.env`:
```bash
# AI Provider Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...

# Ports (optional, defaults shown)
WEB_PORT=3000
TRAINING_PORT=3001
META_PORT=3002
BUDGET_PORT=3003

# Logging
DEBUG=false
LOG_LEVEL=info
```

### Service Dependencies

The orchestrator respects dependencies:
- **Coach** requires Training to be online first
- **Reports** requires Training, Meta, and Budget

This is handled automatically.

---

## System Architecture Details

### Web Server as Control Surface

The web server (port 3000) is the **single control surface**:

```javascript
POST /system/start
  ↓
Spawns orchestrator.js
  ↓
Orchestrator reads SERVICE_REGISTRY
  ↓
Spawns each service (respecting dependencies)
  ↓
Each service registers /health endpoint
  ↓
Web server monitors all services
```

### Health Endpoint Standard

All services implement the standard `ServiceFoundation`:

```bash
GET /health
GET /status
GET /metrics
POST /ping
```

### Event-Driven Architecture

Services communicate via events, not direct HTTP calls (when possible):
- Chat submission → event bus
- Training completion → broadcasts to interested services
- Reports generation → subscribes to training events

---

## Monitoring & Observability

### Service Health Dashboard
```bash
curl http://127.0.0.1:3000/api/v1/loadbalance/health | jq .
```

### Request Tracing
All API requests include tracing:
```bash
X-Trace-ID: {uuid}
X-Span-ID: {uuid}
```

View in logs:
```bash
grep "X-Trace-ID" .tooloo-startup/last-startup.log
```

### Performance Metrics
```bash
curl http://127.0.0.1:3000/api/v1/metrics | jq .
```

---

## What's Included

✅ **12 microservices** - All running independently but coordinated
✅ **Multi-provider AI** - Supports 5 LLM providers with fallback
✅ **Ensemble mode** - Combine responses from 3 providers for best results
✅ **Web UI** - Professional chat interface with real-time responses
✅ **Health checks** - Automated verification of all services
✅ **Logging** - Timestamped logs for debugging
✅ **Graceful shutdown** - Clean process termination
✅ **Production ready** - Tested and battle-hardened

---

## Next Steps

1. **Start the system**: `npm start`
2. **Access the UI**: http://127.0.0.1:3000
3. **Try synthesis**: Fast single-provider responses
4. **Try ensemble**: Multi-provider collaborative responses
5. **Check logs**: `.tooloo-startup/last-startup.log`

---

## Support

For issues or questions:
- Check logs in `.tooloo-startup/`
- Review troubleshooting section above
- Inspect service health endpoints
- Run `npm run qa:suite` for comprehensive diagnostics

---

**Version**: 4.0 (Unified Multi-Service Startup)  
**Last Updated**: November 2025  
**Status**: ✅ Production Ready
