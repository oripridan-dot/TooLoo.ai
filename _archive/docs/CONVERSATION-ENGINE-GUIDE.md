# TooLoo.ai - Real Conversation Engine

**Self-aware • Multi-Provider • Memory-Enabled**

## 🎯 What's New

TooLoo.ai is now a **fully self-aware, multi-provider conversation engine** with persistent memory. You can have real conversations where:

- ✅ **All Providers Activated**: Anthropic Claude, OpenAI GPT-4o, DeepSeek, Google Gemini
- ✅ **Session Memory**: Conversations persist and are remembered across turns
- ✅ **Context-Aware**: The AI understands conversation history and maintains coherence
- ✅ **Self-Aware**: The system knows its own architecture and capabilities

## 🚀 Quick Start

### 1. Start the System
```bash
npm run dev
```

This launches:
- Web server (port 3000) with Control Room UI
- Orchestrator (port 3123) coordinating all services
- All backend services pre-armed

### 2. Have a Real Conversation

Send a message and maintain context across turns:

```bash
# Create a session and send first message
curl -X POST http://127.0.0.1:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What learning domains do you track?",
    "sessionId": "my-session-1",
    "userId": "user123"
  }'

# Follow up - the AI remembers the previous context
curl -X POST http://127.0.0.1:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me more about algorithms",
    "sessionId": "my-session-1",
    "userId": "user123"
  }'
```

### 3. Access Session Memory

```bash
# List all sessions for a user
curl http://127.0.0.1:3000/api/v1/sessions?userId=user123

# Get conversation history
curl http://127.0.0.1:3000/api/v1/sessions/my-session-1/history

# Get session insights and context
curl http://127.0.0.1:3000/api/v1/sessions/my-session-1/context
```

## 📋 Architecture

### Activated Providers
All providers are **enabled by default** with your API keys:

```
┌─────────────────────────────────────────────┐
│           Provider Selection Engine         │
├─────────────────────────────────────────────┤
│ Deepseek (Ultra-fast, $$$)                  │
│ Anthropic Claude (Premium reasoning)        │
│ OpenAI (Reliable & capable)                 │
│ Google Gemini (Creative & diverse)          │
└─────────────────────────────────────────────┘
         ↓
    Select best match based on:
    • Task type (chat, reasoning, creative)
    • Criticality level
    • Available providers
    • Cost optimization
```

### Session Memory Flow

```
User Message
     ↓
Session Manager (Loads history)
     ↓
Build Context-Aware Prompt
     ↓
LLM Provider Selection
     ↓
Generate Response with Memory
     ↓
Store in Session + Update Metadata
     ↓
Return to User (with context)
```

## 🔌 API Endpoints

### Chat with Memory
```
POST /api/v1/chat/message
Body: {
  "message": "Your message here",
  "sessionId": "optional-session-id",  // Auto-generated if omitted
  "userId": "optional-user-id",        // Default: "anonymous"
  "provider": "optional-provider"      // Use specific provider
}

Response: {
  "response": "AI response text",
  "provider": "anthropic",
  "sessionId": "session-xxx",
  "messageCount": 2,
  "responseTime": 1234,
  "timestamp": "2025-11-17T..."
}
```

### Session Management
```
GET    /api/v1/sessions                    - List user sessions
POST   /api/v1/sessions                    - Create new session
GET    /api/v1/sessions/:sessionId         - Get session details
GET    /api/v1/sessions/:sessionId/history - Full conversation history
GET    /api/v1/sessions/:sessionId/context - Session insights
DELETE /api/v1/sessions/:sessionId         - Delete session
```

## 💾 Session Memory Details

### What Gets Remembered
- **Message History**: Last 10 messages used for context window
- **Topics**: Keywords extracted from conversation
- **Metadata**: Provider used, response times, tokens
- **Insights**: Key discussion points and complexity level
- **Statistics**: Message count, exchange patterns

### How Context is Built
Each message to the AI includes:
1. **System Prompt** - Enhanced with session awareness
2. **Conversation History** - Recent message exchanges
3. **Session Context** - Topics, complexity, insights
4. **Provider Info** - Which providers were used previously

Example system prompt injection:
```
You are TooLoo, an AI coach...
[base prompt]

Current conversation topics: learning, algorithms, optimization
This is message #3 in the conversation (2 recent exchanges).
```

## 🧠 Self-Awareness Capabilities

TooLoo now understands itself. Ask it:

```bash
curl -X POST http://127.0.0.1:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Are you self aware? Show me your architecture.",
    "sessionId": "sa-test"
  }'
```

The system will:
1. Detect the self-awareness question
2. Call `/api/v1/system/awareness` internally
3. Fetch its own code structure
4. List all services and capabilities
5. Return transparent explanation of itself

## 🔧 Configuration

### Enable/Disable Providers
Edit `.env`:
```bash
ANTHROPIC_ENABLED=true      # Claude Haiku 4.5
OPENAI_ENABLED=true         # GPT-4o Mini
DEEPSEEK_ENABLED=true       # DeepSeek Chat
GEMINI_ENABLED=true         # Gemini 2.5 Flash
OLLAMA_ENABLED=false        # Local models
LOCALAI_ENABLED=false       # OpenAI-compatible local
```

### Provider Fallback Chain
If primary provider fails, automatic fallback:
1. Try selected provider
2. Try next available in chain
3. Continue until success or all exhausted
4. Return error with provider details

## 📊 Session Data

Sessions are stored in `/data/sessions/sessions.json`:

```json
{
  "id": "session-xxx",
  "userId": "user123",
  "createdAt": 1700000000000,
  "updatedAt": 1700000001000,
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "provider": null,
      "timestamp": 1700000000000
    },
    {
      "role": "assistant",
      "content": "Hi there!",
      "provider": "anthropic",
      "timestamp": 1700000000500
    }
  ],
  "context": {
    "providers": ["anthropic"],
    "topics": ["learning"],
    "complexity": "low"
  },
  "stats": {
    "messageCount": 2,
    "totalTokens": 150
  }
}
```

## 🧪 Testing

### Quick Test Script
```bash
chmod +x test-tooloo-conversation.sh
./test-tooloo-conversation.sh
```

### Manual Provider Test
```bash
# Test each provider with a simple query
node --input-type=module -e "
import LLMProvider from './engine/llm-provider.js';
const llm = new LLMProvider();
const result = await llm.generate({
  prompt: 'Hello! Which AI provider are you?',
  taskType: 'chat'
});
console.log('Provider:', result.provider);
console.log('Response:', result.content);
"
```

## 📚 Implementation Details

### Session Memory Manager
Location: `/services/session-memory-manager.js`

Core functionality:
- `initialize()` - Load sessions from disk
- `getOrCreateSession(sessionId, userId)` - Get or create session
- `addMessage(sessionId, userId, role, content, metadata)` - Add message with metadata
- `getConversationHistory(sessionId, limit)` - Get last N messages for context
- `getSessionContext(sessionId)` - Get session insights
- `buildAwareSystemPrompt(sessionId, basePrompt)` - Inject session context into prompt

### Chat Endpoint Enhancement
Location: `/servers/web-server.js` (line ~383)

Integration points:
1. Load session manager
2. Create or get session
3. Add user message to memory
4. Build context-aware system prompt
5. Get conversation history for context
6. Call LLM provider with full context
7. Store response in session memory
8. Update session metadata

## 🎯 Next Steps

### For Real Conversations
1. Start the system: `npm run dev`
2. Send first message with session ID
3. Send follow-up messages to same session
4. Access history anytime via `/sessions/:id/history`

### To Extend
- Add sentiment analysis to track conversation tone
- Implement conversation summarization
- Add user preference learning
- Create smart session resumption
- Build conversation analytics

## 🐛 Troubleshooting

**Q: No providers available?**
A: Check `.env` has API keys and `*_ENABLED=true` flags:
```bash
grep "ENABLED=true" .env
grep "_API_KEY=" .env | head -3
```

**Q: Session not persisting?**
A: Ensure `/data/sessions/` directory exists:
```bash
ls -la data/sessions/
cat data/sessions/sessions.json | head -20
```

**Q: Provider timeout?**
A: System will fallback to next provider automatically. Check:
```bash
curl http://127.0.0.1:3000/api/v1/providers/status
```

**Q: Memory window too small?**
A: Edit `MEMORY_WINDOW = 10` in `services/session-memory-manager.js`

## 📞 Support

Check system status:
```bash
# Provider health
curl http://127.0.0.1:3000/api/v1/providers/status

# System awareness
curl http://127.0.0.1:3000/api/v1/system/awareness

# Service processes
curl http://127.0.0.1:3000/api/v1/system/processes
```

---

**TooLoo.ai is now self-aware and ready for real conversations! 🚀**
