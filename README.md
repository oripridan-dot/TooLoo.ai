# TooLoo.ai Synapsys V2

> **Multi-agent AI Orchestration Platform**  
> Version: 2.0.0-alpha.0

A modern, modular AI platform with embedding-based skill routing, event-sourced memory, and real-time streaming.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      @tooloo/core                            │
│  • TooLooContext (branded IDs, session, intent)             │
│  • TypedEventBus (40+ event types)                          │
│  • Context factory & update functions                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ @tooloo/skills │   │ @tooloo/providers │   │  @tooloo/memory  │
│               │   │                 │   │                 │
│ • SkillDef    │   │ • BaseProvider  │   │ • EventStore    │
│ • Registry    │   │ • LLM Adapters  │   │ • Projections   │
│ • Router      │   │ • CircuitBreaker│   │ • SemanticCache │
└───────────────┘   └─────────────────┘   └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  @tooloo/engine  │
                    │                 │
                    │ • Orchestrator  │
                    │ • SkillExecutor │
                    │ • ContextBuilder│
                    └─────────────────┘
```

## 📦 Packages

| Package | Description |
|---------|-------------|
| `@tooloo/core` | Types, context, TypedEventBus |
| `@tooloo/contracts` | API schemas with Zod validation |
| `@tooloo/skills` | Skill registry, loader, router |
| `@tooloo/providers` | LLM adapters (Anthropic, DeepSeek, OpenAI, Ollama) |
| `@tooloo/memory` | Event store, vector/graph projections |
| `@tooloo/engine` | Orchestrator that ties everything together |
| `@tooloo/evals` | Golden tests for cognitive evaluation |

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build:packages

# Start development (API + Web)
pnpm dev

# Or start individually
pnpm dev:api  # API on port 4001
pnpm dev:web  # Web on port 5173
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v2/chat` | POST | Send message, get AI response |
| `/api/v2/chat/stream` | POST | Streaming AI response |
| `/api/v2/skills` | GET | List available skills |
| `/api/v2/skills/:id` | GET | Get skill details |
| `/api/v2/projects` | GET/POST | Project management |
| `/api/v2/auth/login` | POST | User authentication |
| `/api/v2/auth/register` | POST | User registration |

## 🧠 Skills System

Skills are defined in YAML files in the `skills/` directory:

```yaml
# skills/coding-assistant.yaml
id: coding-assistant
name: Coding Assistant
version: 1.0.0
description: Expert code generation and debugging

triggers:
  keywords: [code, function, implement, debug, fix]
  patterns: ["write.*code", "create.*function"]

parameters:
  temperature: 0.3
  maxTokens: 4096

systemPrompt: |
  You are an expert software engineer...
```

## 🐳 Docker Deployment

```bash
# Build and start
pnpm docker:build
pnpm docker:up

# Stop
pnpm docker:down
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage
```

## 📁 Project Structure

```
├── apps/
│   ├── api/          # Express + Socket.IO server (port 4001)
│   └── web/          # React + Vite frontend (port 5173)
├── packages/
│   ├── core/         # Core types and event bus
│   ├── contracts/    # API schemas
│   ├── skills/       # Skill system
│   ├── providers/    # LLM adapters
│   ├── memory/       # Event store
│   ├── engine/       # Orchestrator
│   └── evals/        # Testing framework
├── skills/           # YAML skill definitions
├── docker-compose.v2.yml
└── package.json
```

## 🔧 Environment Variables

Copy `.env.v2.example` to `.env`:

```bash
# Required for AI features
DEEPSEEK_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
OPENAI_API_KEY=your-key

# Optional
OLLAMA_BASE_URL=http://localhost:11434
```

## 📄 License

MIT © TooLoo.ai
