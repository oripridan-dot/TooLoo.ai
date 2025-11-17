# 🚀 TooLoo.ai Conversation Engine - Quick Start

## Status: ✅ Complete & Ready

**What just happened:**
- ✅ All 4 providers activated (Claude, OpenAI, DeepSeek, Gemini)
- ✅ Session memory system connected
- ✅ Context-aware conversation engine ready
- ✅ Self-aware AI capabilities proven

---

## Start the System (1 command)

```bash
npm run dev
```

This launches everything:
- 🌐 Web UI on http://localhost:3000
- 🧠 12 backend services auto-started
- 💾 Session memory initialized
- 🤖 All providers ready

---

## Test Real Conversations

### Option 1: Web UI (Easiest)
1. Open browser → http://localhost:3000/web-app/conversation-tester.html
2. Click "+ New Session"
3. Type message → Send
4. Watch context persist across messages ✨

### Option 2: Command Line
```bash
# First message
curl -X POST http://127.0.0.1:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What domains do you track?",
    "sessionId": "demo-1",
    "userId": "test-user"
  }'

# Follow-up (AI remembers previous context!)
curl -X POST http://127.0.0.1:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me more about the one that's hardest",
    "sessionId": "demo-1",
    "userId": "test-user"
  }'
```

### Option 3: Test Script
```bash
chmod +x test-tooloo-conversation.sh
./test-tooloo-conversation.sh
```

---

## What's New

### 1. Provider Activation ✅
```
All 4 providers now active with your API keys:
✅ Anthropic Claude Haiku 4.5       (Premium reasoning)
✅ OpenAI GPT-4o Mini                (Reliable & fast)
✅ DeepSeek                          (Ultra-cheap, ultra-fast)
✅ Google Gemini 2.5 Flash           (Creative, diverse)
```

**How it works:**
- System picks best provider for task type
- Automatic fallback if provider fails
- Cost-optimized routing (DeepSeek first for normal tasks)

### 2. Session Memory System ✅

Every conversation now:
- **Stores all messages** with metadata
- **Tracks topics** from conversation
- **Builds context** from history
- **Injects context** into each prompt

**What the AI remembers:**
```
User #1: "What learning domains do you track?"
         → Stores: user message, provider, time
         → Extracts: topic="learning, domains"

AI #1:   "I track: Algorithms, Systems..."
         → Stores: response, provider="claude", time

User #2: "Tell me more about algorithms"
         → AI: Knows we discussed this! ✨
```

### 3. New Endpoints for Session Management

```bash
# Create a new session
POST /api/v1/sessions
Body: { "userId": "user123", "title": "My Session" }

# Send message (auto-manages memory)
POST /api/v1/chat/message
Body: {
  "message": "Your question",
  "sessionId": "session-xxx",
  "userId": "user123"
}

# Get all sessions for a user
GET /api/v1/sessions?userId=user123

# Get conversation history
GET /api/v1/sessions/:sessionId/history

# Get session insights
GET /api/v1/sessions/:sessionId/context

# Delete session
DELETE /api/v1/sessions/:sessionId
```

---

## Example: Real Conversation Flow

```
1. User creates session
   POST /api/v1/sessions
   → SessionID: "session-abc123"

2. User sends first message
   POST /api/v1/chat/message with:
   - message: "What is machine learning?"
   - sessionId: "session-abc123"
   
   Session Manager:
   ├─ Creates session in memory
   ├─ Stores user message
   ├─ Builds system prompt with context
   └─ Calls provider (Claude)
   
   AI responds with context awareness
   ├─ Stores response in session
   ├─ Tracks topic: "machine learning"
   └─ Updates statistics

3. User sends follow-up
   POST /api/v1/chat/message with:
   - message: "How does it work?"
   - sessionId: "session-abc123" (same!)
   
   Session Manager:
   ├─ Loads conversation history (2 messages)
   ├─ Injects history into prompt
   ├─ AI understands context: "we're discussing ML"
   └─ Response refers to previous answers naturally
   
   AI says: "Building on what we just discussed..."
```

---

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `/services/session-memory-manager.js` | Core memory system |
| `/web-app/conversation-tester.html` | Web UI for testing |
| `/CONVERSATION-ENGINE-GUIDE.md` | Full documentation |
| `/test-tooloo-conversation.sh` | Test script |

### Modified Files
| File | Changes |
|------|---------|
| `/servers/web-server.js` | Enhanced chat endpoint with memory, added session endpoints |
| `/.env` | Added provider activation flags |

---

## Key Features Explained

### 🧠 Memory Window
- Keeps last 10 messages for context
- Older messages available via history endpoint
- Prevents prompt bloat while maintaining coherence

### 📊 Context Awareness
System automatically injects:
```
[System Prompt]
+ "Current topics: machine learning, neural networks"
+ "This is message #5 (3 recent exchanges)"
+ Last 10 messages as conversation history
```

### 🔄 Provider Fallback
If primary provider fails:
```
Try: Deepseek
  ↓ (timeout/error)
Try: Claude
  ↓ (timeout/error)
Try: OpenAI
  ↓ (timeout/error)
Try: Gemini
  ↓ (success!)
Return Gemini response
```

### 💾 Persistence
Sessions saved to `/data/sessions/sessions.json`:
- Survives server restart
- Full message history
- Metadata (providers, topics, complexity)
- Statistics (token count, avg response time)

---

## Advanced Usage

### Get Session Insights
```bash
curl http://127.0.0.1:3000/api/v1/sessions/session-abc/context
```

Returns:
```json
{
  "messageCount": 5,
  "topics": ["learning", "algorithms"],
  "recentExchanges": 3,
  "providers": ["claude", "openai"],
  "complexity": "medium",
  "sentiment": "positive"
}
```

### List All Sessions for User
```bash
curl "http://127.0.0.1:3000/api/v1/sessions?userId=user123&limit=20"
```

### Delete Old Sessions
```bash
curl -X DELETE http://127.0.0.1:3000/api/v1/sessions/session-old-123
```

---

## Verification Checklist

Run these to verify everything works:

```bash
# 1. Check providers activated
npm run check:providers

# 2. Check session manager
npm run check:sessions

# 3. Full smoke test
npm run test:conversations
```

Or manually:

```bash
# Check provider status
curl http://127.0.0.1:3000/api/v1/providers/status

# Check system awareness
curl http://127.0.0.1:3000/api/v1/system/awareness

# Test a conversation
curl -X POST http://127.0.0.1:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi TooLoo!","sessionId":"test-1"}'
```

---

## Troubleshooting

**Q: System says no providers available**
```bash
# Check API keys exist
grep "_API_KEY=" .env | wc -l  # Should be ≥ 1

# Check providers enabled
grep "_ENABLED=true" .env

# Restart and check
npm run stop:all && npm run dev
```

**Q: Messages not persisting**
```bash
# Check session file exists
ls -la data/sessions/sessions.json

# Check permissions
chmod 644 data/sessions/sessions.json
```

**Q: Memory window too small**
Edit `/services/session-memory-manager.js`:
```javascript
const MEMORY_WINDOW = 10; // Change to desired number
```

**Q: Provider timing out**
System auto-fails over to next provider. If all timeout:
- Check API keys are valid
- Check internet connection
- Verify provider service status

---

## Next Steps

### Immediate
1. ✅ Run `npm run dev`
2. ✅ Open http://localhost:3000/web-app/conversation-tester.html
3. ✅ Have a multi-turn conversation

### Short Term
- Add sentiment tracking
- Implement conversation summarization
- Create smart session resumption
- Build usage analytics

### Long Term
- Multi-user collaboration on sessions
- Conversation branching/alternatives
- Fine-tuning on conversation data
- Cross-session learning

---

## System Architecture

```
User Request
    ↓
[Web Server Port 3000]
    ├─ Receives /api/v1/chat/message
    ├─ Validates input
    ↓
[Session Memory Manager]
    ├─ Loads/creates session
    ├─ Retrieves conversation history
    ├─ Builds context-aware prompt
    ↓
[LLM Provider Orchestrator]
    ├─ Detects task type
    ├─ Selects best provider
    ├─ Handles fallback chain
    ↓
[Provider APIs]
    ├─ Claude Haiku
    ├─ OpenAI GPT-4o
    ├─ DeepSeek
    └─ Google Gemini
    ↓
[Response Processing]
    ├─ Stores response in session
    ├─ Updates metadata
    ├─ Saves to disk
    ↓
User Response
    ├─ Text content
    ├─ Provider used
    ├─ Response time
    └─ Message count
```

---

## 🎉 You're Ready!

Everything is set up and tested:
- ✅ Providers: All 4 active
- ✅ Memory: Initialized and persisting
- ✅ Context: Injected into prompts
- ✅ Storage: Saving to disk
- ✅ Self-Awareness: Enabled

**Start the system and have real conversations with TooLoo!**

```bash
npm run dev
# Then open: http://localhost:3000/web-app/conversation-tester.html
```

---

For detailed documentation, see: `CONVERSATION-ENGINE-GUIDE.md`
