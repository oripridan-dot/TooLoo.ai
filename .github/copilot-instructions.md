# TooLoo.ai Copilot Instructions

> **Version:** 3.3.566 | **Synapsys V2:** 2.0.0-alpha.0 | **Updated:** December 12, 2025

## 📖 Quick Context

**TooLoo.ai** is a multi-agent AI orchestration platform with:
- Backend: Node.js/Express/Socket.IO on port **4000**
- Frontend: React/Vite/Zustand on port **5173**
- Providers: DeepSeek, Anthropic, OpenAI, Gemini, Zhipu, Ollama
- Database: SQLite (episodic memory, artifacts)
- **Synapsys V2:** 6 modular packages (`@tooloo/*`) in `packages/` directory

**For full context, see [SYSTEM_STATE.md](../SYSTEM_STATE.md)**
**For V2 packages, see [SYNAPSYS_V2_ROADMAP.md](../SYNAPSYS_V2_ROADMAP.md)**

---

## ⚠️ CRITICAL WARNINGS

### DO NOT USE `pkill -f "node"` IN CODESPACES

**NEVER run `pkill -f "node"` or similar commands that kill all node processes in a GitHub Codespace environment.**

This command will:
- Kill the Codespace connection itself (VS Code remote connection runs on Node)
- Disconnect the user from the codespace
- Potentially corrupt the session state
- Require manual intervention to reconnect

**Instead, use these safe alternatives:**
- `pkill -f "tsx.*main"` - Only kill the TooLoo server
- `lsof -i :5173 | grep node | awk '{print $2}' | xargs kill` - Kill specific port
- `npm run stop` - Use the project's stop script
- Restart individual processes using their PIDs

### Server Management Commands

```bash
# SAFE: Stop TooLoo server only
pkill -f "tsx.*main" 2>/dev/null

# SAFE: Stop Vite dev server
pkill -f "vite" 2>/dev/null

# SAFE: Use project scripts
npm run stop
npm run dev

# DANGEROUS - NEVER USE IN CODESPACE:
# pkill -f "node"  ❌ KILLS CODESPACE CONNECTION
# killall node     ❌ KILLS CODESPACE CONNECTION
```

---

## 🏗️ Project Structure

```
packages/                      # Synapsys V2 monorepo packages
├── core/                      # @tooloo/core - types, context, events
├── skills/                    # @tooloo/skills - registry, router
├── providers/                 # @tooloo/providers - LLM adapters
├── memory/                    # @tooloo/memory - event store, projections
├── evals/                     # @tooloo/evals - golden tests
└── contracts/                 # @tooloo/contracts - API schemas

src/
├── core/                      # Event bus, config, metrics
│   ├── event-bus.ts           # Central pub/sub (bus.publish/bus.on)
│   └── fs-manager.ts          # Safe file I/O
├── cortex/                    # AI cognitive systems
│   ├── agent/                 # Task execution, artifacts
│   ├── memory/                # Hippocampus, vector store
│   └── planning/              # DAG-based planning
├── nexus/                     # API layer
│   ├── routes/                # 50+ REST endpoints
│   ├── socket.ts              # Socket.IO server
│   ├── auth/                  # API key auth (auth-service.ts)
│   └── middleware/            # Auth, rate limiting
├── precog/                    # AI routing
│   ├── engine/                # Model capabilities, recipes, validation
│   │   ├── intelligent-router.ts
│   │   ├── model-capabilities.ts
│   │   ├── execution-recipes.ts
│   │   └── three-layer-validation.ts
│   └── learning/              # Q-learning optimizer
├── qa/                        # Quality assurance
└── web-app/src/skin/          # React frontend (Liquid Synapsys)
    ├── store/                 # Zustand stores
    │   ├── projectStateStore.js
    │   ├── systemStateStore.js
    │   └── canvasStateStore.js
    └── components/            # UI components
```

---

## 🔌 Key APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/health` | GET | System health |
| `/api/v1/chat` | POST | AI conversation |
| `/api/v1/agent/task/execute` | POST | Execute task |
| `/api/v1/agent/task/team-execute` | POST | Team-validated execution |
| `/api/v1/agent/artifacts` | GET/POST | Artifact management |
| `/api/v1/routing/route` | POST | Intelligent routing |
| `/api/v1/routing/validate` | POST | Three-layer validation |
| `/api/v1/routing/models` | GET | Available models |
| `/api/v1/routing/recipes` | GET | Execution recipes |
| `/api/v1/users/me` | GET/PATCH | Current user |
| `/api/v1/users/me/keys` | GET/POST | API keys |
| `/api/v1/usage/dashboard` | GET | Usage analytics |
| `/api/v1/projects` | GET/POST | Projects |

---

## 🔄 EventBus Pattern

```typescript
import { bus } from './core/event-bus.js';

// Publish event
bus.publish('cortex', 'intent:detected', { intent: 'code', confidence: 0.95 });

// Subscribe
bus.on('precog:routing', (event) => console.log(event.payload));
```

**Common Events:**
- `cortex:response` - AI response
- `precog:routing` - Provider selected
- `meta:cognitive_state_change` - Confidence update
- `project:user_joined` - Collaboration event

---

## 🗄️ Frontend State (Zustand)

```javascript
// Project state
import { useProjectStore, selectProjectId, selectArtifacts } from './skin/store';

// System state
import { useSystemStore, selectIsProcessing, selectConfidence } from './skin/store';

// Selectors available:
// selectProjectId, selectMetadata, selectConversation, selectActiveIntent
// selectCommandPalette, selectTaskGraph, selectCurrentExecution, selectArtifacts
// selectActiveArtifact, selectSystemMetrics, selectQAStatus, selectAlerts
// selectSyncState, selectIsProcessing, selectConfidence, selectActiveProvider
```

---

## 🔐 Authentication

- **API Key Prefix:** `tlai_` (e.g., `tlai_abc123...`)
- **Headers:** `Authorization: Bearer <key>` or `X-API-Key: <key>`
- **Tiers:** free (100/day), pro (1000/day), enterprise (10000/day)

```bash
# Create user
curl -X POST http://localhost:4000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test"}'

# Generate key
curl -X POST http://localhost:4000/api/v1/users/me/keys \
  -H "Authorization: Bearer <existing_key>" \
  -d '{"name":"My Key"}'
```

---

## 📝 Code Guidelines

1. **TypeScript strict mode** - All new code must be type-safe
2. **Version headers** - Update `// @version X.X.X` when modifying files
3. **EventBus for events** - Use `bus.publish()` not custom emitters
4. **Import .js extension** - TypeScript imports use `.js` (ESM requirement)
5. **Socket.IO only** - Frontend must use `socket.io-client`, not native WebSocket
6. **Unique React keys** - Use `key={item.id || \`prefix-${index}\`}`

---

## 🧪 Testing

```bash
npm test                           # All tests
npm test -- tests/unit/nexus/auth/ # Specific folder
npm test -- --coverage             # With coverage
```

---

## 🚀 Quick Commands

```bash
# Dev mode
npm run dev

# Check health
curl http://localhost:4000/api/v1/health | jq '.ok'

# Test routing
curl -X POST http://localhost:4000/api/v1/routing/route \
  -H "Content-Type: application/json" \
  -d '{"task":"Write TypeScript code","context":{"language":"typescript"}}'

# Test validation
curl -X POST http://localhost:4000/api/v1/routing/validate \
  -H "Content-Type: application/json" \
  -d '{"content":"const x = 1;","contentType":"code"}'
```

---

## 📚 Related Files

- [SYSTEM_STATE.md](../SYSTEM_STATE.md) - Full system context for AI assistants
- [docs/API_CONTRACTS_GUIDE.md](../docs/API_CONTRACTS_GUIDE.md) - API contracts
- [docs/architecture/ARCHITECTURE.md](../docs/architecture/ARCHITECTURE.md) - Architecture
```

---

## 📚 Related Files

- [SYSTEM_STATE.md](../SYSTEM_STATE.md) - Full system context for AI assistants
- [docs/API_CONTRACTS_GUIDE.md](../docs/API_CONTRACTS_GUIDE.md) - API contracts
- [docs/architecture/ARCHITECTURE.md](../docs/architecture/ARCHITECTURE.md) - Architecture
