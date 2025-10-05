# 🎬 Prompt Director - Quick Start

## What is it?

The **Prompt Director** makes TooLoo unique by:

1. **Refining your prompts** through a saturation loop
2. **Breaking complex requests** into smart sub-tasks  
3. **Running multiple AI providers** in parallel
4. **Compiling their responses** into one superior answer

**Think of it as a conductor orchestrating an AI symphony.**

---

## Quick Test

```bash
# Test the Director with a simple prompt
curl -X POST http://localhost:3005/api/v1/director/process \
  -H "Content-Type: application/json" \
  -d '{"prompt": "create a React hook for data fetching"}' | jq '.metadata'
```

**You'll see:**
- Which providers responded (DeepSeek, Claude, OpenAI, etc.)
- How many saturation iterations occurred
- Total processing time
- Combined token usage

---

## How to Use

### Method 1: Automatic (Default ON)

Just use the normal generate endpoint - Director runs automatically:

```bash
curl -X POST http://localhost:3005/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "your request here"}'
```

### Method 2: Explicit Director Call

For full transparency and debugging:

```bash
curl -X POST http://localhost:3005/api/v1/director/process \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "explain async/await",
    "conversationId": "my-session",
    "context": {"detail": "beginner-friendly"}
  }'
```

### Method 3: CLI

```bash
npm run tooloo "create a todo app component"
```

The CLI uses Director mode if it's enabled (which it is by default).

---

## Toggle Director Mode

### Turn OFF (single provider, faster, cheaper):
```bash
curl -X POST http://localhost:3005/api/v1/settings \
  -H "Content-Type: application/json" \
  -d '{"useDirector": false}'
```

### Turn ON (multi-provider, better quality):
```bash
curl -X POST http://localhost:3005/api/v1/settings \
  -H "Content-Type: application/json" \
  -d '{"useDirector": true}'
```

---

## When to Use Director

✅ **Use Director for:**
- Complex coding tasks
- Learning/explanations (multiple perspectives valuable)
- Creative work (design, architecture)
- High-stakes decisions

❌ **Disable Director for:**
- Simple queries ("what is X?")
- Quick fixes (typos, small edits)
- Speed-critical tasks
- Token conservation

---

## Response Format

**Director mode response:**
```json
{
  "success": true,
  "content": "# TooLoo.ai Response (Multi-Provider Synthesis)\n\n...",
  "mode": "director",
  "metadata": {
    "saturationIterations": 2,
    "saturated": true,
    "executionPlan": "Code request: DeepSeek generates, Claude reviews...",
    "providersUsed": ["deepseek", "claude", "openai"],
    "processingTimeMs": 3421
  },
  "debug": {
    "originalPrompt": "create a React hook",
    "saturatedPrompt": "create a React hook for data fetching with loading/error states",
    "providerResponses": [...]
  }
}
```

**Standard mode response:**
```json
{
  "success": true,
  "content": "Here's your response...",
  "mode": "standard",
  "metadata": {
    "provider": "deepseek",
    "responseTime": "842ms"
  }
}
```

---

## Check Director Status

```bash
# System status (includes Director info)
curl http://localhost:3005/api/v1/system/status | jq '.director'

# Director-specific stats
curl http://localhost:3005/api/v1/director/stats
```

---

## Examples

### Example 1: Code Generation

**Prompt:** "create a React component for login form"

**What happens:**
1. Saturation: "create a React component for login form with email/password fields and validation"
2. Director plan:
   - DeepSeek → Write the component code
   - Claude → Review architecture/design patterns
   - OpenAI → Check edge cases (empty fields, network errors)
3. Parallel execution: All 3 run simultaneously
4. Compilation: DeepSeek's code + Claude's review + OpenAI's edge cases = comprehensive response

### Example 2: Explanation

**Prompt:** "explain promises"

**What happens:**
1. Saturation: "explain JavaScript promises for beginners"
2. Director plan:
   - Claude → Deep explanation (best at reasoning)
   - OpenAI → Practical code examples
   - Gemini → Alternative approaches (async/await comparison)
3. Compilation: Theory + examples + alternatives = complete learning resource

---

## Troubleshooting

**"Director takes too long"**
- Normal! It runs 2-3 providers in parallel (~2-3x slower than single)
- Disable for quick tasks: `{"useDirector": false}`

**"All providers failed"**
- Check API keys in `.env`
- Test health: `curl http://localhost:3005/api/v1/health`
- Try standard mode: `{"useDirector": false}`

**"Responses don't make sense"**
- Prompt might be too vague
- The saturation loop should catch this automatically
- Try being more specific upfront

---

## Full Documentation

See **[docs/PROMPT_DIRECTOR_GUIDE.md](./PROMPT_DIRECTOR_GUIDE.md)** for:
- Complete API reference
- Configuration options
- Implementation details
- Performance benchmarks
- Advanced usage

---

## Architecture

```
User Prompt
    ↓
Saturation Loop (1-3 iterations)
    ↓
Director Analysis
    ↓
Execution Plan Creation
    ├─→ DeepSeek (code)
    ├─→ Claude (review)
    └─→ OpenAI (edge cases)
    ↓
Parallel Execution
    ↓
Response Compilation
    ↓
Unified TooLoo.ai Response
```

---

**Status:** ✅ Fully implemented and enabled by default  
**File:** `prompt-director.js` (400+ lines)  
**Integration:** `simple-api-server.js` (Director initialized on startup)

---

*Part of TooLoo.ai's self-improving AI system*
