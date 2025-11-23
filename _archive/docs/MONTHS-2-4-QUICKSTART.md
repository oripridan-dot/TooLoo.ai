# Months 2-4 Quick Start Guide

## Start the System

```bash
npm run dev
```

This starts:
- Web server on port 3000 (all APIs)
- Orchestrator on port 3123
- Metrics hub on port 3010
- All 13 backend services

---

## Month 2: Conversation API

### Basic Chat

```bash
curl -X POST http://127.0.0.1:3000/api/v1/conversation/message \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "What is the system status?",
    "conversationId": "my-first-chat"
  }'
```

**Response:**
```json
{
  "conversationId": "my-first-chat",
  "message": "The system is healthy with 92% overall health...",
  "context": {
    "systemHealth": 92,
    "services": { "online": 12, "degraded": 1, "offline": 0 },
    "alerts": { "critical": 0, "warning": 2, "total": 2 },
    "providers": { "active": 3, "busy": 1 },
    "utilization": { "memory": 62, "cpu": 48, "apiCalls": 34 }
  },
  "usage": {
    "input_tokens": 245,
    "output_tokens": 189
  }
}
```

### Get Conversation History

```bash
curl http://127.0.0.1:3000/api/v1/conversation/my-first-chat
```

### List Recent Conversations

```bash
curl http://127.0.0.1:3000/api/v1/conversation?limit=10
```

---

## Month 2: System Control API

### Restart a Service

```bash
curl -X POST http://127.0.0.1:3000/api/v1/system/service/web-server/restart
```

### Check Service Health

```bash
curl http://127.0.0.1:3000/api/v1/system/service/web-server/health
```

### Get All Services Status

```bash
curl http://127.0.0.1:3000/api/v1/system/services
```

### Diagnose Service Issues

```bash
curl http://127.0.0.1:3000/api/v1/system/service/meta-server/diagnose
```

---

## Month 2: Provider Control API

### Check Active Provider

```bash
curl http://127.0.0.1:3000/api/v1/provider/active
```

### Forecast Switch Impact

```bash
curl -X POST http://127.0.0.1:3000/api/v1/provider/forecast \
  -H 'Content-Type: application/json' \
  -d '{"provider": "openai"}'
```

**Response:**
```json
{
  "switchFrom": "claude",
  "switchTo": "openai",
  "forecast": {
    "latency": {
      "current": 150,
      "target": 180,
      "changePercent": "20.0",
      "assessment": "slower"
    },
    "cost": {
      "current": 0.001,
      "target": 0.0008,
      "changePercent": "-20.0",
      "assessment": "cheaper"
    }
  },
  "recommendation": "Switch is viable - similar performance and cost"
}
```

### Switch Provider

```bash
curl -X POST http://127.0.0.1:3000/api/v1/provider/switch \
  -H 'Content-Type: application/json' \
  -d '{"provider": "openai"}'
```

### Compare Providers

```bash
curl -X POST http://127.0.0.1:3000/api/v1/provider/compare \
  -H 'Content-Type: application/json' \
  -d '{"provider1": "claude", "provider2": "openai"}'
```

### Set Provider Policy

```bash
curl -X POST http://127.0.0.1:3000/api/v1/provider/policy \
  -H 'Content-Type: application/json' \
  -d '{"policy": "cost-optimized"}'
```

---

## Month 3: Contextual Awareness API

### Get System State with Patterns

```bash
curl http://127.0.0.1:3000/api/v1/context/system-state
```

**Response:**
```json
{
  "timestamp": "2025-11-17T...",
  "systemState": {
    "health": 92,
    "services": { "online": 12, "degraded": 1, "offline": 0 },
    "alerts": { "critical": 0, "warning": 2, "info": 0, "total": 2 },
    "providers": { "active": 3, "busy": 1 },
    "utilization": { "memory": 62, "cpu": 48, "apiCalls": 34 }
  },
  "recentEvents": [
    { "type": "service_state", "service": "training-server", "status": "online", "time": "2025-11-17T..." }
  ],
  "patterns": [
    {
      "type": "high_load",
      "severity": "warning",
      "description": "System is experiencing high API call volume",
      "recommendation": "Consider scaling services or switching to a faster provider"
    }
  ]
}
```

### Get Suggestions

```bash
curl -X POST http://127.0.0.1:3000/api/v1/context/suggestions \
  -H 'Content-Type: application/json' \
  -d '{"history": [...]}'
```

### Generate Smart Replies

```bash
curl -X POST http://127.0.0.1:3000/api/v1/context/smart-replies \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Would you like me to restart the web-server?",
    "systemState": {...}
  }'
```

**Response:**
```json
{
  "replies": [
    {
      "text": "Yes, restart services",
      "command": "CONFIRM_RESTART",
      "context": "service_restart"
    },
    {
      "text": "Diagnose first",
      "command": "DIAGNOSE",
      "context": "service_restart"
    },
    {
      "text": "Cancel",
      "command": "CANCEL",
      "context": "service_restart"
    }
  ]
}
```

---

## Month 4: Conversational Control API

### Execute Natural Language Command

```bash
curl -X POST http://127.0.0.1:3000/api/v1/control/command \
  -H 'Content-Type: application/json' \
  -d '{"message": "Restart the web-server"}'
```

**Supported commands:**
- "Restart the [service-name]"
- "Show me slow services"
- "Scale the [service-name] to [N] replicas"
- "Set provider policy to cost-optimized"
- "How many API calls last hour?"
- "Show provider performance"

### Investigate Alerts

```bash
curl http://127.0.0.1:3000/api/v1/control/investigate-alerts
```

**Response:**
```json
{
  "alertCount": 2,
  "investigations": [
    {
      "alert": "High latency on meta-server",
      "severity": "warning",
      "rootCause": "Slow provider or overloaded service",
      "suggestions": [
        "Switch to a faster provider",
        "Scale the affected service"
      ],
      "estimatedResolutionTime": "2-5 minutes"
    }
  ],
  "summary": {
    "bySeverity": { "warning": 2 },
    "commonRootCauses": ["Slow provider or overloaded service"],
    "topSuggestions": ["Switch to a faster provider", "Scale the affected service"]
  }
}
```

---

## End-to-End Conversation Flow

### Step 1: Start a Conversation

```bash
CONV_ID="conv-$(date +%s)"

curl -X POST http://127.0.0.1:3000/api/v1/conversation/message \
  -H 'Content-Type: application/json' \
  -d "{
    \"message\": \"What's wrong with the system?\",
    \"conversationId\": \"$CONV_ID\"
  }"
```

### Step 2: AI Analyzes and Suggests

Claude returns something like:
```
"I found 2 alerts: high latency and high memory. 
Would you like me to investigate and suggest fixes?"
```

### Step 3: Get Smart Replies

```bash
curl -X POST http://127.0.0.1:3000/api/v1/context/smart-replies \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Would you like me to investigate and suggest fixes?",
    "systemState": {...}
  }'
```

### Step 4: User Clicks Action, Continue Conversation

```bash
curl -X POST http://127.0.0.1:3000/api/v1/conversation/message \
  -H 'Content-Type: application/json' \
  -d "{
    \"message\": \"Yes, investigate\",
    \"conversationId\": \"$CONV_ID\"
  }"
```

### Step 5: Claude Proposes Solution

```
"I found 2 issues:
1. High latency - switch to OpenAI? (20% faster, 20% cheaper)
2. High memory - restart training-server

Ready to apply both fixes?"
```

### Step 6: Execute via Conversational Control

```bash
curl -X POST http://127.0.0.1:3000/api/v1/control/command \
  -H 'Content-Type: application/json' \
  -d '{"message": "Yes, apply both fixes"}'
```

### Step 7: Get Resolution Feedback

```bash
curl -X POST http://127.0.0.1:3000/api/v1/conversation/message \
  -H 'Content-Type: application/json' \
  -d "{
    \"message\": \"Are the issues fixed?\",
    \"conversationId\": \"$CONV_ID\"
  }"
```

Claude responds with real-time status:
```
"Both fixes applied successfully!
✅ Provider switched to OpenAI (latency now 130ms)
✅ Training-server restarted (memory back to 45%)
System health improved from 82% to 94%"
```

---

## Batch Operations

### Restart All Services

```bash
curl -X POST http://127.0.0.1:3000/api/v1/system/services/restart-all
```

### Compare Multiple Providers

```bash
curl -X POST http://127.0.0.1:3000/api/v1/provider/compare \
  -H 'Content-Type: application/json' \
  -d '{
    "provider1": "anthropic",
    "provider2": "openai"
  }'
```

---

## Health Checks

Verify all systems are running:

```bash
for api in conversation system-control provider-control contextual-awareness conversational-control; do
  echo "Checking $api..."
  curl -s http://127.0.0.1:3000/api/v1/${api/-//}/health | jq -r '.status'
done
```

---

## Troubleshooting

### "Conversation API not responding"

```bash
# Check web-server is running
curl http://127.0.0.1:3000/health

# Check Claude API key
echo $ANTHROPIC_API_KEY

# Verify conversation endpoint
curl http://127.0.0.1:3000/api/v1/conversation/health
```

### "Service control commands failing"

```bash
# Check orchestrator is running
curl http://127.0.0.1:3123/api/v1/system/processes

# Check service exists
curl http://127.0.0.1:3010/api/v1/metrics/services
```

### "Provider switching not working"

```bash
# Check budget-server
curl http://127.0.0.1:3003/api/v1/providers/status

# Check provider credentials
env | grep ANTHROPIC_API_KEY
env | grep OPENAI_API_KEY
```

---

## Summary

You now have a fully integrated conversation-first control system:

1. **Month 2:** Chat with Claude about system status and get real-time context
2. **Month 3:** Claude automatically suggests optimizations based on patterns
3. **Month 4:** Execute any system control task via natural language

All 20+ APIs are production-ready and working together seamlessly.

**Start chatting:** Use the Control Room UI or curl commands above!
