# TooLoo.ai V3.3.566 - System State

> **Last Updated:** December 12, 2025
> **Version:** 3.3.566 Synapsys Architecture
> **Status:** ✅ Fully Operational

This document provides a complete snapshot of the current system state for AI assistants (Gemini, Claude, GPT-4, etc.) to understand the project context.

---

## 🏗️ Architecture Overview

TooLoo.ai is a **multi-agent AI orchestration platform** with self-execution capabilities. It runs as a full-stack application with:

### Tech Stack
- **Backend:** Node.js + TypeScript + Express (port 4000)
- **Frontend:** React + Vite + Zustand (port 5173)
- **Real-time:** Socket.IO (bidirectional events)
- **Database:** SQLite (episodic memory, artifacts)
- **AI Providers:** DeepSeek, Anthropic, OpenAI, Gemini, Zhipu, Ollama

### Directory Structure
```
/workspaces/TooLoo-Synapsys-V3.3/
├── packages/                   # Synapsys V2 monorepo packages
│   ├── core/                   # @tooloo/core
│   ├── skills/                 # @tooloo/skills
│   ├── providers/              # @tooloo/providers
│   ├── memory/                 # @tooloo/memory
│   ├── evals/                  # @tooloo/evals
│   └── contracts/              # @tooloo/contracts
├── src/
│   ├── main.ts                 # Entry point
│   ├── core/                   # Event bus, config, metrics
│   │   ├── event-bus.ts        # Central pub/sub system
│   │   ├── fs-manager.ts       # Safe file operations
│   │   └── metrics-collector.ts
│   ├── cortex/                 # AI cognitive systems
│   │   ├── agent/              # Task execution, artifacts
│   │   ├── memory/             # Hippocampus, vector store
│   │   ├── planning/           # DAG-based task planning
│   │   └── imagination/        # Visual generation
│   ├── nexus/                  # API layer
│   │   ├── routes/             # REST endpoints
│   │   ├── socket.ts           # WebSocket server
│   │   ├── auth/               # API key authentication
│   │   └── middleware/         # Auth, rate limiting
│   ├── precog/                 # AI provider routing
│   │   ├── engine/             # Model capabilities, recipes
│   │   └── learning/           # Q-learning optimizer
│   ├── qa/                     # Quality assurance
│   └── web-app/                # React frontend
│       └── src/skin/           # Liquid Synapsys UI
├── data/                       # Persistent storage
├── projects/                   # User projects
├── config/runtime.json         # Runtime configuration
└── tests/                      # Unit & integration tests
```

---

## 🔌 API Endpoints

### Core APIs (Port 4000)

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Health** | `/api/v1/health` | GET | System health check |
| **Chat** | `/api/v1/chat` | POST | Send message to AI |
| **Agent** | `/api/v1/agent/task` | POST | Queue a task |
| **Agent** | `/api/v1/agent/task/execute` | POST | Execute task immediately |
| **Agent** | `/api/v1/agent/task/team-execute` | POST | Execute with validator |
| **Agent** | `/api/v1/agent/artifacts` | GET/POST | Manage artifacts |
| **Projects** | `/api/v1/projects` | GET/POST | Project management |
| **Users** | `/api/v1/users` | GET/POST | User management |
| **Users** | `/api/v1/users/me` | GET/PATCH | Current user profile |
| **Users** | `/api/v1/users/me/keys` | GET/POST | API key management |
| **Usage** | `/api/v1/usage/dashboard` | GET | Usage analytics |
| **Routing** | `/api/v1/routing/route` | POST | Intelligent provider routing |
| **Routing** | `/api/v1/routing/models` | GET | Available AI models |
| **Routing** | `/api/v1/routing/recipes` | GET | Execution recipes |
| **Routing** | `/api/v1/routing/validate` | POST | Three-layer validation |

### Authentication
- **API Keys:** Prefix `tlai_` (e.g., `tlai_abc123...`)
- **Headers:** `Authorization: Bearer <key>` or `X-API-Key: <key>`
- **Tiers:** free (100 req/day), pro (1000 req/day), enterprise (10000 req/day)

---

## 🧠 Implemented Features

### Phase 1-4 Complete ✅
1. **Smart Router** - Intelligent provider selection based on task type
2. **Self-Optimization** - Runtime config, Q-learning for routing
3. **Payment Integration** - Stripe subscriptions, usage tracking
4. **Continuous Learning** - Meta-learner, reinforcement learning

### Phase 5: Intelligence Layer ✅ (Latest)
- **Model Capabilities Matrix** - 6 provider profiles with capability scores
- **Execution Recipes** - 7 pre-configured patterns (speed-run, quality-build, etc.)
- **Three-Layer Validation** - Automated + AI semantic + user acceptance
- **Intelligent Router** - Unified routing combining all systems

### Synapsys V2 Packages ✅ (Branch: synapsys-v2)

New modular monorepo with 6 verified packages:

| Package | Description |
|---------|-------------|
| `@tooloo/core` | The Soul - types, context, TypedEventBus |
| `@tooloo/skills` | SkillRegistry, SkillRouter, defineSkill |
| `@tooloo/providers` | Anthropic/DeepSeek/OpenAI + CircuitBreaker |
| `@tooloo/memory` | SQLiteEventStore, Vector/Graph projections |
| `@tooloo/evals` | Cognitive Unit Testing (19 golden tests) |
| `@tooloo/contracts` | 12 API contracts with Zod validation |

See [SYNAPSYS_V2_ROADMAP.md](./SYNAPSYS_V2_ROADMAP.md) for details.

---

## 🔧 Development Commands

```bash
# Start development (backend + frontend)
npm run dev

# Stop servers safely (DO NOT use pkill -f "node")
pkill -f "tsx.*main" 2>/dev/null
pkill -f "vite" 2>/dev/null

# Run tests
npm test

# Build frontend
cd src/web-app && npm run build
```

---

## 📦 Key Dependencies

### Backend
- `express` - HTTP server
- `socket.io` - Real-time communication
- `better-sqlite3` - Local database
- `zod` - Schema validation
- `tsx` - TypeScript execution

### Frontend
- `react` - UI framework
- `zustand` - State management
- `socket.io-client` - WebSocket client
- `framer-motion` - Animations
- `tailwindcss` - Styling

---

## 🗄️ State Stores (Frontend)

### Zustand Stores
```javascript
// Project state
import { useProjectStore, selectProjectId, selectArtifacts } from './skin/store';

// System state (orchestrator, knowledge, evaluation)
import { useSystemStore, selectIsProcessing, selectConfidence } from './skin/store';

// Canvas state (emotions, performance)
import { useCanvasStore } from './skin/store';
```

### Available Selectors
- `selectProjectId`, `selectMetadata`, `selectConversation`
- `selectActiveIntent`, `selectCommandPalette`, `selectTaskGraph`
- `selectCurrentExecution`, `selectArtifacts`, `selectActiveArtifact`
- `selectSystemMetrics`, `selectQAStatus`, `selectAlerts`, `selectSyncState`
- `selectIsProcessing`, `selectConfidence`, `selectActiveProvider`

---

## 🔄 Event System

### EventBus Pattern
```typescript
import { bus } from './core/event-bus.js';

// Publish event
bus.publish('cortex', 'intent:detected', { intent: 'code', confidence: 0.95 });

// Subscribe to events
bus.on('precog:routing', (event) => {
  console.log('Provider selected:', event.payload.provider);
});
```

### Common Events
- `cortex:response` - AI response generated
- `precog:routing` - Provider routing decision
- `meta:cognitive_state_change` - System confidence update
- `sensory:file:change` - File system changes
- `project:user_joined` - Real-time collaboration

---

## ⚠️ Important Notes for AI Assistants

1. **DO NOT** run `pkill -f "node"` in Codespaces - kills the connection
2. **DO NOT** use native WebSocket - always use `socket.io-client`
3. **Always** use `bus.publish()` for system events
4. **Always** update version numbers in file headers when modifying
5. **Import paths** use `.js` extension even for TypeScript files
6. **API responses** follow `{ ok: boolean, data?: any, error?: string }` pattern

---

## 📊 Current Metrics

- **Source Files:** ~220 TypeScript files
- **Dependencies:** 82 npm packages
- **API Endpoints:** 50+ routes
- **Test Coverage:** See `/coverage/lcov-report/`
- **SQLite Tables:** episodic_memory, artifacts, decisions

---

## 🚀 Quick Start for AI Assistants

```bash
# Check if servers are running
curl -s http://localhost:4000/api/v1/health | jq '.ok'
curl -s http://localhost:5173/ | head -5

# Test routing API
curl -s -X POST http://localhost:4000/api/v1/routing/route \
  -H "Content-Type: application/json" \
  -d '{"task":"Write a function","context":{"language":"typescript"}}'

# Test validation API
curl -s -X POST http://localhost:4000/api/v1/routing/validate \
  -H "Content-Type: application/json" \
  -d '{"content":"function add(a, b) { return a + b; }","contentType":"code"}'
```

---

*This file is auto-maintained. For the latest state, run `npm run dev` and check the startup logs.*
