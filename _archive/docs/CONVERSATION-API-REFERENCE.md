# TooLoo.ai - Conversation Engine API Reference Card

## Quick Commands

### Start System
```bash
npm run dev
```

### Test via Web UI
Open: `http://localhost:3000/web-app/conversation-tester.html`

### Run Tests
```bash
./QUICK-TEST-COMMANDS.sh
```

---

## Core API Endpoints

### Send Message (With Memory)
```bash
POST /api/v1/chat/message
{
  "message": "Your question here",
  "sessionId": "session-abc123",      # Optional, auto-generated
  "userId": "user@example.com",       # Optional, default: "anonymous"
  "provider": "anthropic"             # Optional, auto-selected
}

Response:
{
  "response": "AI response text",
  "provider": "anthropic",
  "sessionId": "session-abc123",
  "messageCount": 2,
  "responseTime": 1234,               # milliseconds
  "timestamp": "2025-11-17T..."
}
```

### Create Session
```bash
POST /api/v1/sessions
{
  "userId": "user@example.com",
  "title": "My Learning Session"
}

Response:
{
  "ok": true,
  "sessionId": "session-xxx",
  "session": { ... }
}
```

### List Sessions
```bash
GET /api/v1/sessions?userId=user@example.com&limit=20

Response:
{
  "count": 3,
  "sessions": [
    {
      "id": "session-xxx",
      "title": "My Session",
      "messageCount": 5,
      "createdAt": 1700000000000,
      "updatedAt": 1700000001000,
      "topics": ["learning", "algorithms"]
    }
  ]
}
```

### Get Session Details
```bash
GET /api/v1/sessions/session-xxx

Response:
{
  "ok": true,
  "sessionId": "session-xxx",
  "session": {
    "id": "session-xxx",
    "userId": "user123",
    "createdAt": 1700000000000,
    "updatedAt": 1700000001000,
    "messageCount": 2
  },
  "context": {
    "topics": ["learning"],
    "providers": ["claude"],
    "complexity": "low"
  }
}
```

### Get Conversation History
```bash
GET /api/v1/sessions/session-xxx/history?limit=100

Response:
{
  "ok": true,
  "sessionId": "session-xxx",
  "count": 4,
  "history": [
    {
      "id": "msg-xxx",
      "role": "user",
      "content": "What domains...",
      "timestamp": 1700000000000
    },
    {
      "id": "msg-yyy",
      "role": "assistant",
      "content": "I track...",
      "provider": "anthropic",
      "timestamp": 1700000000500
    }
  ]
}
```

### Get Session Context/Insights
```bash
GET /api/v1/sessions/session-xxx/context

Response:
{
  "ok": true,
  "sessionId": "session-xxx",
  "context": {
    "messageCount": 2,
    "topics": ["learning", "algorithms"],
    "recentExchanges": 1,
    "averageResponseTime": 1234,
    "providers": ["anthropic"],
    "sentiment": "positive",
    "complexity": "medium"
  }
}
```

### Delete Session
```bash
DELETE /api/v1/sessions/session-xxx

Response:
{
  "ok": true,
  "message": "Session session-xxx deleted"
}
```

---

## Multi-Turn Conversation Example

### Turn 1: Create and ask first question
```bash
curl -X POST http://127.0.0.1:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What learning domains do you track?",
    "sessionId": "demo-session",
    "userId": "user1"
  }'
```

**Response:**
```json
{
  "response": "I track 8 domains...",
  "provider": "anthropic",
  "sessionId": "demo-session",
  "messageCount": 1
}
```

### Turn 2: Follow-up (AI remembers!)
```bash
curl -X POST http://127.0.0.1:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Which one is hardest?",
    "sessionId": "demo-session",  # SAME SESSION
    "userId": "user1"
  }'
```

**Response:**
```json
{
  "response": "Based on our discussion, Distributed Systems...",
  "provider": "openai",
  "sessionId": "demo-session",
  "messageCount": 2  # Note: count increased
}
```

### Turn 3: Another follow-up
```bash
curl -X POST http://127.0.0.1:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How can I improve there?",
    "sessionId": "demo-session",  # SAME SESSION
    "userId": "user1"
  }'
```

---

## Memory System Explained

### What Gets Stored
```json
{
  "message": {
    "id": "msg-unique-id",
    "role": "user|assistant",
    "content": "The actual text",
    "provider": "anthropic|openai|deepseek|gemini",
    "timestamp": 1700000000000,
    "metadata": {
      "tokens": 150,
      "responseTime": 1234,
      "model": "claude-3-5-haiku-20241022",
      "confidence": 0.95
    }
  }
}
```

### Context Window
- **Full history**: All messages stored
- **Context window**: Last 10 messages used for prompt injection
- **Why 10?**: Balances context richness with prompt size/cost

### How Context Gets Injected
Each AI request includes:
```
1. System Prompt (base + session awareness)
2. Last 10 messages (conversation history)
3. Session metadata (topics, complexity)
4. Provider information
```

Result: AI responses naturally refer to previous context! ✨

---

## Providers & Routing

### Available Providers
```
Deepseek  → Fast & cheap (often first choice)
Claude    → Premium reasoning
OpenAI    → Reliable & versatile
Gemini    → Creative & diverse
```

### Automatic Selection
System picks provider based on:
- Task type (chat, reasoning, creative)
- Availability
- Cost optimization
- Fallback if primary fails

### Provider Response Example
Each response includes the provider badge:
```
"provider": "anthropic"    # Which AI responded
"responseTime": 1234       # How long it took
```

---

## Session Storage Format

Location: `/data/sessions/sessions.json`

```json
{
  "id": "session-1763338252195-uymtnq8vd",
  "userId": "demo-user",
  "createdAt": 1763338252195,
  "updatedAt": 1763338253000,
  "messages": [
    {
      "id": "msg-xxx",
      "role": "user",
      "content": "Hello!",
      "provider": null,
      "timestamp": 1763338252000
    },
    {
      "id": "msg-yyy",
      "role": "assistant",
      "content": "Hi there!",
      "provider": "anthropic",
      "timestamp": 1763338252500,
      "metadata": {
        "tokens": 150,
        "responseTime": 500,
        "model": "claude-3-5-haiku-20241022"
      }
    }
  ],
  "context": {
    "providers": ["anthropic"],
    "topics": ["greeting"],
    "complexity": "low"
  },
  "stats": {
    "messageCount": 2,
    "totalTokens": 150
  }
}
```

---

## Error Handling

### No Message
```
Status: 400
{
  "error": "Message required"
}
```

### No Providers Available
```
Status: 503
{
  "error": "No providers available",
  "detail": "Configure API keys in .env"
}
```

### Provider Timeout
System automatically tries next provider in chain.
If all fail:
```
Status: 503
{
  "error": "Provider error",
  "detail": "All providers failed"
}
```

---

## Configuration (in .env)

### Enable Providers
```bash
ANTHROPIC_ENABLED=true
OPENAI_ENABLED=true
DEEPSEEK_ENABLED=true
GEMINI_ENABLED=true
```

### API Keys
```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
DEEPSEEK_API_KEY=sk-...
GEMINI_API_KEY=AIzaSy...
```

### Optional Adjustments
```javascript
// In services/session-memory-manager.js
const MEMORY_WINDOW = 10;  // Change if needed
```

---

## Troubleshooting

### Providers not responding?
```bash
# Check status
curl http://127.0.0.1:3000/api/v1/providers/status

# Verify .env
grep "_ENABLED=true" .env
```

### Sessions not persisting?
```bash
# Check file exists
ls -la data/sessions/sessions.json

# Check permissions
chmod 644 data/sessions/sessions.json
```

### Memory not working?
```bash
# Check same sessionId used
# Check /data/sessions/sessions.json has messages
# Check "messageCount" increases in responses
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `services/session-memory-manager.js` | Core memory system |
| `servers/web-server.js` | Chat endpoints |
| `web-app/conversation-tester.html` | Test UI |
| `/data/sessions/sessions.json` | Session storage |

---

## Documentation Links

- **Quick Start**: `CONVERSATION-ENGINE-QUICKSTART.md`
- **Full Guide**: `CONVERSATION-ENGINE-GUIDE.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`

---

**That's it! You now have a fully functional multi-turn conversation system with session memory.** 🚀
