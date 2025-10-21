# 🤖 TooLoo Chat Interface - Quick Start

## Access TooLoo Chat

### Option 1: Web Interface (Easiest)
Open in browser:
```
http://127.0.0.1:3000/chat
```
- Beautiful purple UI
- Real-time responses
- Suggested quick commands
- Mobile-friendly

### Option 2: Command Line
```bash
node clients/chat-client.js
```
- Interactive terminal chat
- Same capabilities as web
- Good for automation

---

## Natural Language Commands

### 📊 Check Your Progress
```
"What's my status?"
"How am I doing?"
"Show me my progress"
"What's my current level?"
```

### 📚 View Available Topics
```
"Show me domains"
"List all topics"
"What can I learn?"
"Show domains"
```

### 🏋️ Get Coaching
```
"Coach me"                    → 10 normal rounds
"Coach me fast"              → 20 accelerated rounds
"Help me slowly"             → 5 supportive rounds
"Train me"                   → 10 normal rounds
```

### 🎯 Focus on Specific Domain
```
"Help me with distributed systems"
"I need help with databases"
"Focus on security"
"Teach me about networks"
"Work on machine learning"
```

### 🧠 Optimize Learning
```
"Optimize my learning"
"Boost retention"
"Reinforce what I learned"
"Improve my memory"
```

### ❓ Get Help
```
"Help"
"What can you do?"
"How does this work?"
"Show me commands"
```

---

## How It Works

1. **You type a question** → Chat interface sends to server
2. **Natural language parsing** → System understands intent (status, coaching, domain focus, etc.)
3. **Real-time API calls** → Fetches live data from:
   - Training Server (3001) - domain mastery levels
   - Coach Server (3004) - coaching sessions
   - Meta-Learning (3002) - retention optimization
4. **Intelligent response** → Returns tailored answer with actions

---

## Example Conversations

### Scenario 1: New Learner
```
You: "What's my status?"
TooLoo: 📊 Your Current Progress
        Average Mastery: 84%
        Total Domains: 9
        Active Coaching: ✅ Yes
        
        🎯 Strong Domains:
          • Security: 100%
        
        ⚠️  Areas to Improve:
          • Distributed Systems: 79%

You: "Coach me on distributed systems"
TooLoo: ✅ Focused Training on Distributed Systems
        Current Mastery: 79%
        Training Rounds: 10
        Sticky Batch Mode: ON (keeps focus on this topic)

You: "Optimize my learning"
TooLoo: ✅ Meta-Learning Optimization Complete
        Retention Boost: +15%
        Transfer Learning: +10%
```

### Scenario 2: Fast Learner
```
You: "Show domains"
TooLoo: 📚 Available Domains (with progress bars)

You: "Coach me fast"
TooLoo: ✅ Coaching Session Complete
        Rounds Completed: 20
        Mode: accelerated
        Focus areas: Distributed Systems

You: "Help me with databases"
TooLoo: ✅ Focused Training on Databases
        Current Mastery: 85%
        Training Rounds: 10
```

---

## API Endpoint (For Developers)

### POST /api/chat
Send natural language queries to TooLoo backend:

```bash
curl -X POST http://127.0.0.1:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"What is my status?"}'
```

**Response:**
```json
{
  "response": "📊 Your Current Progress\n\nAverage Mastery: 84%\n..."
}
```

---

## Supported Domains

- 🔴 Data Structures & Algorithms
- 🟡 Operating Systems
- 🟡 Computer Networks
- 🟡 Compilers
- 🟡 Databases
- 🟡 Machine Learning
- 🟢 Security
- 🟡 Theory
- 🔴 Distributed Systems

Legend:
- 🟢 Advanced (90%+)
- 🟡 Proficient (80-89%)
- 🔴 Developing (<80%)

---

## Architecture

```
WEB INTERFACE (chat.html)
        ↓
    User types message
        ↓
 POST /api/chat endpoint
        ↓
 Chat Handler (chat-handler.js)
        ↓
  Natural Language Parsing
        ↓
  Route to appropriate handler:
  • getStatus() → Training Server
  • getDomains() → Training Server
  • coach() → Coach Server
  • optimize() → Meta-Learning Server
        ↓
   Formatted Response
        ↓
   Display in Chat UI
```

---

## Tips

✨ **Be natural** - The system understands conversational language
🎯 **Be specific** - "Coach me on databases" better than just "Coach me"
⚡ **Use shortcuts** - "Coach fast" works, or write it naturally
📊 **Check status first** - Understand your baseline before coaching
🧠 **Optimize after** - Use "Optimize my learning" after focused sessions

---

## Troubleshooting

**Chat not responding?**
- Check if web server is running: `npm run dev`
- Confirm services are up: `curl http://127.0.0.1:3001/health`

**Getting "Error" responses?**
- Services may be loading - wait a few seconds and retry
- Check terminal for errors in service logs

**Want to see the raw API responses?**
- Use command line client: `node clients/chat-client.js`
- Or use curl directly with `/api/chat` endpoint

---

Created: October 20, 2025
Version: 1.0 - Beta
