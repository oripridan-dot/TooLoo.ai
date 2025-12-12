# TooLoo.ai V3.3.566 - Synapsys Architecture

> 🧠 Autonomous AI Development Platform with Multi-Agent Orchestration

[![Version](https://img.shields.io/badge/version-3.3.566-blue.svg)](./package.json)
[![Node](https://img.shields.io/badge/node-22+-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.6-blue.svg)](https://typescriptlang.org)

## 🌟 Overview

TooLoo.ai is a **multi-agent AI orchestration platform** that combines:
- **Intelligent Provider Routing** - Auto-selects best AI model for each task
- **Self-Execution Capabilities** - Executes code, manages artifacts, runs processes
- **Real-time Collaboration** - Socket.IO powered project sync
- **Three-Layer Validation** - Automated + AI + User acceptance gates
- **Continuous Learning** - Q-learning optimizer improves routing over time

## 📖 For AI Assistants

**See [SYSTEM_STATE.md](./SYSTEM_STATE.md) for complete system context** - includes all APIs, stores, events, and current implementation details that AI assistants need.

## 🚀 Quick Start

```bash
# Install dependencies
npm install
cd src/web-app && npm install && cd ../..

# Start development (backend:4000 + frontend:5173)
npm run dev

# Verify running
curl http://localhost:4000/api/v1/health
```

## 🏗️ Architecture

```
src/
├── main.ts                    # Entry point
├── core/                      # Event bus, config, metrics
│   ├── event-bus.ts           # Central pub/sub system
│   └── fs-manager.ts          # Safe file operations
├── cortex/                    # Cognitive systems
│   ├── agent/                 # Task execution & artifacts
│   ├── memory/                # Hippocampus, vector store
│   └── planning/              # DAG-based task planning
├── nexus/                     # API layer
│   ├── routes/                # 50+ REST endpoints
│   ├── socket.ts              # Socket.IO server
│   └── auth/                  # API key authentication
├── precog/                    # AI routing
│   ├── engine/                # Model capabilities, recipes
│   │   ├── intelligent-router.ts
│   │   ├── model-capabilities.ts
│   │   ├── execution-recipes.ts
│   │   └── three-layer-validation.ts
│   └── learning/              # Q-learning optimizer
├── qa/                        # Quality assurance
└── web-app/src/skin/          # Liquid Synapsys UI (React)
```

## 🔌 Key APIs

| Category | Endpoint | Description |
|----------|----------|-------------|
| **Health** | `GET /api/v1/health` | System status |
| **Chat** | `POST /api/v1/chat` | AI conversation |
| **Agent** | `POST /api/v1/agent/task/execute` | Execute task |
| **Agent** | `POST /api/v1/agent/task/team-execute` | Team-validated execution |
| **Routing** | `POST /api/v1/routing/route` | Intelligent model selection |
| **Routing** | `POST /api/v1/routing/validate` | Three-layer validation |
| **Projects** | `GET/POST /api/v1/projects` | Project management |
| **Users** | `GET/POST /api/v1/users/me/keys` | API key management |
| **Usage** | `GET /api/v1/usage/dashboard` | Analytics dashboard |

## 🔐 Authentication

```bash
# Generate API key
curl -X POST http://localhost:4000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","name":"Your Name"}'

# Use API key
curl http://localhost:4000/api/v1/users/me \
  -H "Authorization: Bearer tlai_your_key_here"
```

**Tiers:** free (100 req/day), pro (1000 req/day), enterprise (10000 req/day)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/nexus/auth/

# Check coverage
open coverage/lcov-report/index.html
```

## ⚙️ Environment Variables

```bash
# Required - AI Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
DEEPSEEK_API_KEY=sk-...

# Optional
GROQ_API_KEY=...
GITHUB_TOKEN=ghp_...
STRIPE_SECRET_KEY=sk_test_...
```

## 📊 Implemented Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Smart Router | ✅ Complete |
| 2 | Self-Optimization | ✅ Complete |
| 3 | Payment Integration | ✅ Complete |
| 4 | Continuous Learning | ✅ Complete |
| 5 | Intelligence Layer | ✅ Complete |

## 🔄 Development Commands

```bash
# Start dev servers
npm run dev

# Stop safely (Codespaces-safe)
pkill -f "tsx.*main" 2>/dev/null
pkill -f "vite" 2>/dev/null

# Build frontend
cd src/web-app && npm run build

# Generate API docs
npm run generate:openapi
```

## 📚 Documentation

- [SYSTEM_STATE.md](./SYSTEM_STATE.md) - Complete system context for AI assistants
- [.github/copilot-instructions.md](./.github/copilot-instructions.md) - Copilot guidelines
- [docs/API_CONTRACTS_GUIDE.md](./docs/API_CONTRACTS_GUIDE.md) - API contracts
- [docs/architecture/ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md) - System architecture

## 🤝 Contributing

1. Check [SYSTEM_STATE.md](./SYSTEM_STATE.md) for context
2. Follow TypeScript strict mode
3. Use `bus.publish()` for events
4. Update version in file headers
5. Add tests for new features

## Version History

- **V3.3.0** - Agent Execution System, Clean Architecture
- **V3.2.x** - Liquid Synapsys UI
- **V3.1.x** - Emergence & Learning
- **V3.0.x** - Initial Synapsys Release
- **V2.x** - Legacy (archived)

---

Built with 🧠 by TooLoo.ai
