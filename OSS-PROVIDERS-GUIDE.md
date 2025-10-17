# 🚀 Open Source AI Providers Integration Guide

TooLoo now supports multiple open-source and local AI providers alongside paid options! This gives you cost-effective, privacy-focused alternatives.

## 🎯 Quick Start: Enable OSS Providers

### Option 1: Ollama (Local Models) - FREE
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model (e.g., Llama 3.2)
ollama pull llama3.2:latest

# Enable in TooLoo
echo "ENABLE_OLLAMA=true" >> .env
echo "OLLAMA_MODEL=llama3.2:latest" >> .env
```

### Option 2: HuggingFace (Free Tier)
```bash
# Get free API key from https://huggingface.co/settings/tokens
echo "HF_API_KEY=your_hf_token_here" >> .env
```

### Option 3: LocalAI (OpenAI-Compatible Local)
```bash
# Run LocalAI with Docker
docker run -ti -p 8080:8080 localai/localai:latest

# Enable in TooLoo
echo "ENABLE_LOCALAI=true" >> .env
echo "LOCALAI_BASE_URL=http://localhost:8080" >> .env
```

### Option 4: Open Interpreter (Code Execution)
```bash
# Install Open Interpreter
pip install open-interpreter

# Start server mode
interpreter --server --host 0.0.0.0 --port 8000

# Enable in TooLoo  
echo "ENABLE_OPEN_INTERPRETER=true" >> .env
echo "OI_BASE_URL=http://localhost:8000" >> .env
```

## 🔧 Configuration Options

### Environment Variables
```bash
# OSS Provider Control
ENABLE_OLLAMA=true              # Enable Ollama integration
ENABLE_LOCALAI=true             # Enable LocalAI integration  
ENABLE_OPEN_INTERPRETER=true    # Enable Open Interpreter
HF_API_KEY=your_token           # HuggingFace API key (free tier)

# Model Selection
OLLAMA_MODEL=llama3.2:latest    # Default: llama3.2:latest
LOCALAI_MODEL=gpt-4             # Default: gpt-4
OI_MODEL=ollama/llama3.2        # Default: ollama/llama3.2
HF_MODEL=microsoft/DialoGPT-large # Default: microsoft/DialoGPT-large

# Custom Base URLs
OLLAMA_BASE_URL=http://localhost:11434    # Default Ollama endpoint
LOCALAI_BASE_URL=http://localhost:8080    # Default LocalAI endpoint  
OI_BASE_URL=http://localhost:8000         # Default Open Interpreter endpoint
```

## 🎨 Provider Selection Strategy

TooLoo automatically selects the best provider based on:

### Cost Optimization (Default Order)
1. **Ollama** - Free local inference
2. **LocalAI** - Free local OpenAI-compatible
3. **HuggingFace** - Free tier (with limits)
4. **DeepSeek** - Cheapest paid option
5. **Open Interpreter** - Local with code execution
6. **Claude/OpenAI/Gemini** - Premium options

### Task-Specific Routing

**Code Tasks** → Open Interpreter > Ollama > DeepSeek > OpenAI
```javascript
// TooLoo detects code requests and prefers code-capable models
const response = await fetch('/api/v1/generate', {
  body: JSON.stringify({
    prompt: "Write a Python function to sort a list",
    taskType: "code"  // Triggers code-optimized routing
  })
});
```

**Reasoning Tasks** → Claude > OpenAI > Gemini > DeepSeek > Ollama
```javascript
// Complex analysis gets premium models first
const response = await fetch('/api/v1/generate', {
  body: JSON.stringify({
    prompt: "Analyze the pros and cons of different database architectures",
    taskType: "reasoning"
  })
});
```

**Creative Tasks** → Gemini > DeepSeek > Ollama > Claude > OpenAI
```javascript
// Creative work optimized for imagination
const response = await fetch('/api/v1/generate', {
  body: JSON.stringify({
    prompt: "Write a short story about time travel",
    taskType: "creative"
  })
});
```

## 💡 Setup Examples

### Ollama Setup (Recommended for Privacy)
```bash
# 1. Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Start Ollama service
ollama serve

# 3. Pull recommended models
ollama pull llama3.2:latest      # Good general model (~2GB)
ollama pull codellama:7b         # Code-specific model (~4GB)
ollama pull mistral:7b           # Alternative model (~4GB)

# 4. Configure TooLoo
echo "ENABLE_OLLAMA=true" >> .env
echo "OLLAMA_MODEL=llama3.2:latest" >> .env

# 5. Test connection
curl http://localhost:11434/api/version
```

### HuggingFace Free Tier
```bash
# 1. Get API key from https://huggingface.co/settings/tokens
# 2. Add to environment
echo "HF_API_KEY=hf_your_token_here" >> .env

# 3. Test immediately - no installation needed!
node -e "
const response = await fetch('/api/v1/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Hello from HuggingFace!' })
});
console.log(await response.json());
"
```

### Docker LocalAI (Advanced)
```bash
# 1. Run LocalAI with model
docker run -ti -p 8080:8080 \
  -v $PWD/models:/models \
  localai/localai:latest \
  --models-path=/models \
  --context-size=512

# 2. Download a model
mkdir -p models
wget https://huggingface.co/microsoft/DialoGPT-medium/resolve/main/pytorch_model.bin -O models/

# 3. Enable in TooLoo
echo "ENABLE_LOCALAI=true" >> .env
echo "LOCALAI_BASE_URL=http://localhost:8080" >> .env
```

## 🚨 Troubleshooting

### Provider Not Available
```bash
# Check which providers are enabled
curl http://localhost:3000/api/v1/providers/status

# Example response:
{
  "ok": true,
  "status": {
    "ollama": { "available": true, "enabled": true },
    "localai": { "available": false, "enabled": true },
    "huggingface": { "available": true, "enabled": true },
    "deepseek": { "available": true, "enabled": true }
  }
}
```

### Connection Issues
```bash
# Test Ollama directly
curl http://localhost:11434/api/version

# Test LocalAI directly  
curl http://localhost:8080/v1/models

# Test Open Interpreter
curl http://localhost:8000/health
```

### Model Issues
```bash
# List available Ollama models
ollama list

# Pull specific model
ollama pull llama3.2:3b  # Smaller version for low-memory systems

# Update environment
echo "OLLAMA_MODEL=llama3.2:3b" >> .env
```

## 📊 Cost Comparison

| Provider | Cost | Privacy | Speed | Quality | Code |
|----------|------|---------|-------|---------|------|
| Ollama | FREE | 100% Local | Fast | Good | Good |
| LocalAI | FREE | 100% Local | Fast | Variable | Good |
| HuggingFace | FREE* | Cloud | Medium | Variable | Fair |
| Open Interpreter | FREE | 100% Local | Medium | Good | Excellent |
| DeepSeek | $0.14/1M | Cloud | Fast | Very Good | Excellent |
| Claude | $3/1M | Cloud | Fast | Excellent | Very Good |
| OpenAI | $5/1M | Cloud | Fast | Excellent | Very Good |

*Free tier has rate limits

## 🔄 Fallback Behavior

TooLoo automatically falls back through providers:

1. **Primary**: Selected based on task + cost optimization
2. **Fallback**: Next available provider in priority order  
3. **Final**: Any working provider

Example fallback for code tasks:
`Open Interpreter → Ollama → DeepSeek → OpenAI → Claude`

## ✅ Verification

Test your OSS setup:

```bash
# Test API endpoint
curl -X POST http://localhost:3000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello! Which provider are you?"}'

# Expected response includes provider info:
{
  "ok": true,
  "text": "Hello! I'm running on Ollama/Llama3.2...",
  "providerUsed": "ollama",
  "routing": "smart",
  "costBadge": { "usd": 0, "limit": 10, "percent": 0 }
}
```

## 🎯 Next Steps

1. **Start with Ollama** - easiest setup, completely free
2. **Add HuggingFace** - instant cloud backup with free tier
3. **Try Open Interpreter** - for code execution capabilities
4. **Monitor usage** - check `/api/v1/providers/status` regularly

Your TooLoo system now has enterprise-grade AI capabilities at zero additional cost! 🚀

---

**💡 Pro Tip**: Run multiple providers simultaneously for automatic failover and optimal task routing.