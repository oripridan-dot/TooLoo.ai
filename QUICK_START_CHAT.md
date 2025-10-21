# 🚀 Quick Start - Chat with TooLoo.ai

**Status:** ✅ Ready to Use Right Now

---

## 🎯 Current Setup

You have **everything running**:
- ✅ Web Server (Port 3000)
- ✅ Chat API Bridge (Port 3010)
- ✅ Ollama Ready (Local Provider)

---

## 📝 Option 1: Start Using NOW (Ollama - Free & Local)

### Prerequisites
You need **Ollama** installed locally:
- Download: https://ollama.ai
- Install and run
- Pull a model: `ollama pull llama2` (or `mistral`, `neural-chat`)

### Then:
1. **Open in browser:**
   ```
   http://localhost:3000/chat-modern
   ```

2. **Start typing!**
   - Your message goes to Ollama (local, instant, free)
   - Response appears in real-time
   - Segmentation appears in left sidebar
   - Coaching hints in right sidebar

---

## 📝 Option 2: Add Claude for Better Quality (15 min setup)

### Get Claude API Key:
1. Go to: https://console.anthropic.com/account/keys
2. Create key or copy existing
3. In terminal, set it:
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-yourkeyhere"
   ```

### Restart Bridge:
```bash
# In the terminal running the bridge, hit Ctrl+C
# Then:
node servers/chat-api-bridge.js
```

### You should see:
```
✅ Chat API Bridge Running on Port 3010

📡 Provider Status:
   ✅ OLLAMA
   ✅ ANTHROPIC   ← Now enabled!
   ❌ OPENAI
   ❌ GEMINI
   ❌ DEEPSEEK

🎯 Active Provider: Ollama (uses Claude if Ollama fails)
```

---

## 📝 Option 3: Multi-Provider Setup (Production)

### Get All API Keys:
```bash
# Anthropic (Claude)
export ANTHROPIC_API_KEY="sk-ant-..."

# OpenAI (GPT-4)
export OPENAI_API_KEY="sk-..."

# Google Gemini
export GEMINI_API_KEY="AIza..."

# DeepSeek
export DEEPSEEK_API_KEY="sk-..."
```

### Or Set in `.env` file:
```bash
# Create file: /workspaces/TooLoo.ai/.env
ANTHROPIC_API_KEY=sk-ant-yourkey
OPENAI_API_KEY=sk-yourkey
GEMINI_API_KEY=AIza-yourkey
DEEPSEEK_API_KEY=sk-yourkey
```

### Reload:
```bash
# Restart the bridge to pick up .env
# Ctrl+C in bridge terminal
# Then: node servers/chat-api-bridge.js
```

---

## 💬 Start Chatting NOW!

### Step 1: Make sure bridge is running
```bash
# In current terminal, you should see:
# ✅ Chat API Bridge Running on Port 3010
```

### Step 2: Make sure web server is running
```bash
# In another terminal, check:
curl http://localhost:3000/chat-modern
# Should load without errors
```

### Step 3: Open in browser
```
http://localhost:3000/chat-modern
```

### Step 4: Type a message!
```
"Hello! What can you do?"
```

### Step 5: Watch the magic
- ✅ Message appears
- ✅ Typing indicator shows
- ✅ Response comes in
- ✅ Conversation updates
- ✅ Segmentation appears
- ✅ Coaching hints show

---

## 🧪 Testing Commands

### Test via CLI:
```bash
# Check provider status
curl http://localhost:3010/api/v1/providers/status

# Send a message
curl -X POST http://localhost:3010/api/v1/chat/message \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "What is 2+2?",
    "conversationHistory": []
  }'

# Check system status
curl http://localhost:3010/api/v1/system/status
```

---

## 🎯 What You Get

| Feature | Ollama | Claude | GPT-4 | Gemini | DeepSeek |
|---------|--------|--------|-------|--------|----------|
| Cost | FREE | ~$1/mo | ~$5/mo | FREE | CHEAP |
| Speed | ⚡️ Instant | 1-2s | 2-5s | 1-3s | 1-2s |
| Quality | Good | 🏆 Best | Excellent | Good | Good |
| Setup | Easy | 2 min | 2 min | 2 min | 2 min |

---

## ✅ Verify Everything Works

### Chat-Modern is Accessible
```bash
curl -s http://localhost:3000/chat-modern | head -20
# Should show HTML starting with <!DOCTYPE html>
```

### Bridge is Running
```bash
curl http://localhost:3010/api/v1/system/status
# Should return JSON with provider info
```

### Providers Detected
```bash
curl http://localhost:3010/api/v1/providers/status
# Should show which providers are available
```

---

## 🚨 Troubleshooting

### Issue: "Cannot connect to localhost:3010"
**Fix:** Make sure bridge is running
```bash
node servers/chat-api-bridge.js
```

### Issue: "No providers available"
**Fix:** Install Ollama from https://ollama.ai
```bash
ollama pull llama2
# Or: ollama pull mistral
```

### Issue: All providers show ❌
**Fix:** API keys aren't set. That's OK! Ollama is still running locally and free.

### Issue: Page loads but no response to messages
**Fix:** Check browser console (F12) and terminal logs for errors

---

## 🎉 You're All Set!

### Now You Can:
✅ Chat with free local Ollama  
✅ Switch to Claude with one env var  
✅ Add GPT-4 for variety  
✅ Use Gemini if you prefer  
✅ Try DeepSeek for cost savings  
✅ Automatic fallback if any fails  

---

## 📚 Full Documentation

For detailed setup, see: `PROVIDER_INTEGRATION_GUIDE.md`

**Ready to chat?** Open your browser to:
```
http://localhost:3000/chat-modern
```

Happy chatting! 🚀