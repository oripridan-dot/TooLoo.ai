# GitHub Context Server

A specialized server that analyzes GitHub repository context using AI providers with intelligent fallback chain.

## Features

- **Multi-Provider Support**: Integrates with 5 AI providers (Ollama, Claude, OpenAI, Gemini, DeepSeek)
- **Intelligent Fallback**: Automatically falls back to next provider if one fails
- **Timeout Handling**: 30-second timeout per provider attempt
- **Rich Context Analysis**: Analyzes repository structure, files, and README content
- **Structured Responses**: Returns consistent response format with provider info and token usage

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add at least one AI provider API key:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Add at least one provider
ANTHROPIC_API_KEY=your_claude_key_here
# or
OPENAI_API_KEY=your_openai_key_here
# or
DEEPSEEK_API_KEY=your_deepseek_key_here
# or
GEMINI_API_KEY=your_gemini_key_here
# or for local AI
OLLAMA_API_URL=http://localhost:11434
```

### 3. Start Server

```bash
npm run start:github-context
```

The server will start on port 3010 (configurable via `GITHUB_CONTEXT_PORT`).

## API Endpoints

### POST /api/v1/github/ask

Ask AI to analyze GitHub repository context.

**Request:**

```json
{
  "question": "What are the main concerns in this codebase?",
  "depth": "full",
  "repoContext": {
    "owner": "username",
    "repo": "repository",
    "structure": "...",
    "readme": "...",
    "files": ["file1.js", "file2.js"]
  }
}
```

**Response (Success):**

```json
{
  "ok": true,
  "analysis": "Based on the repository analysis...",
  "provider": "Claude",
  "tokens": {
    "prompt": 1500,
    "completion": 500,
    "total": 2000
  },
  "error": null
}
```

**Response (All Providers Failed):**

```json
{
  "ok": false,
  "analysis": null,
  "provider": null,
  "tokens": null,
  "error": {
    "message": "All providers failed",
    "attempts": [
      {
        "provider": "Ollama",
        "error": "Connection refused"
      },
      {
        "provider": "Claude",
        "error": "API key invalid"
      }
    ]
  }
}
```

### GET /api/v1/github/providers

List available providers and fallback chain.

**Response:**

```json
{
  "ok": true,
  "providers": [
    {
      "name": "Ollama",
      "enabled": true,
      "model": "llama2"
    },
    {
      "name": "Claude",
      "enabled": true,
      "model": "claude-3-sonnet-20240229"
    }
  ],
  "fallbackChain": ["Ollama", "Claude"],
  "activeProvider": "Ollama"
}
```

### GET /health

Health check endpoint.

**Response:**

```json
{
  "ok": true,
  "status": "healthy",
  "service": "github-context-server",
  "providersConfigured": 2,
  "activeProviders": ["Ollama", "Claude"]
}
```

## Provider Fallback Chain

The server tries providers in this order:

1. **Ollama** (Local AI - fastest, no API costs)
2. **Claude** (Best for reasoning and analysis)
3. **OpenAI** (Reliable, widely compatible)
4. **Gemini** (Good for creative tasks)
5. **DeepSeek** (Cost-effective alternative)

If a provider fails, the server automatically tries the next one in the chain.

## Testing

Run the test suite:

```bash
npm run test:github-context
```

Or manually test with curl:

```bash
curl -X POST http://localhost:3010/api/v1/github/ask \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "What are the main concerns in this codebase?",
    "depth": "full",
    "repoContext": {
      "owner": "oripridan-dot",
      "repo": "TooLoo.ai",
      "structure": "...",
      "readme": "TooLoo.ai workspace"
    }
  }'
```

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_CONTEXT_PORT` | Server port | 3010 |
| `OLLAMA_API_URL` | Ollama server URL | http://localhost:11434 |
| `OLLAMA_MODEL` | Ollama model name | llama2 |
| `ANTHROPIC_API_KEY` | Claude API key | - |
| `CLAUDE_MODEL` | Claude model | claude-3-sonnet-20240229 |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `OPENAI_MODEL` | OpenAI model | gpt-4 |
| `GEMINI_API_KEY` | Gemini API key | - |
| `GEMINI_MODEL` | Gemini model | gemini-pro |
| `DEEPSEEK_API_KEY` | DeepSeek API key | - |
| `DEEPSEEK_MODEL` | DeepSeek model | deepseek-chat |

## Error Handling

- **No providers configured**: Returns 500 error with message
- **Provider timeout**: Tries next provider after 30 seconds
- **Provider API error**: Logs error and tries next provider
- **All providers fail**: Returns structured error with all attempts
- **Invalid request**: Returns 400 error with details

## Logs

The server logs provider attempts and results:

```
[GitHub Context] Processing question: "What are the main concerns..." (depth: full)
[GitHub Context] Attempting provider: Ollama
[GitHub Context] Ollama failed: Connection refused
[GitHub Context] Attempting provider: Claude
[GitHub Context] Success with Claude. Tokens: 2000
```

## Requirements Compliance

✅ POST `/api/v1/github/ask` calls actual AI provider  
✅ Fallback chain implemented (Ollama → Claude → OpenAI → Gemini → DeepSeek)  
✅ 30-second timeout per provider  
✅ Error handling with fallback to next provider  
✅ Structured response with provider info and token count  
✅ System prompt built from repository context  
✅ Real AI-generated analysis (not mocked)

## License

MIT
