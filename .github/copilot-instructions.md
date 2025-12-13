# TooLoo.ai Copilot Instructions

> **Version:** 2.0.0-alpha.0 | **Updated:** December 13, 2025

## 📖 Quick Context

**TooLoo.ai** is a multi-agent AI orchestration platform with:
- Backend: Node.js/Express/Socket.IO on port **4001**
- Frontend: React/Vite on port **5173**
- Providers: DeepSeek, Anthropic, OpenAI, Gemini, Zhipu, Ollama
- **Synapsys V2:** Monorepo with `@tooloo/*` packages

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
├── engine/                    # @tooloo/engine - orchestrator
├── evals/                     # @tooloo/evals - golden tests
└── contracts/                 # @tooloo/contracts - API schemas

apps/
├── api/                       # @tooloo/api - Express/Socket.IO server
│   └── src/
│       ├── routes/            # REST endpoints
│       ├── socket/            # Socket.IO handlers
│       └── middleware/        # Auth, rate limiting
└── web/                       # @tooloo/web - React frontend
    └── src/
        ├── AppV2.jsx          # Main V2 application
        ├── components/        # UI components
        │   ├── ChatV2.jsx     # Chat interface
        │   ├── AdminDashboard.jsx
        │   ├── SkillStudio.jsx
        │   └── Login.jsx
        ├── hooks/             # React hooks
        │   ├── useSocket.js   # Socket.IO connection
        │   ├── useAuth.js     # Authentication
        │   └── useProjects.js # Projects API
        └── utils/             # Utilities

skills/                        # YAML skill definitions
```

---

## 🔌 Key APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v2/system/health` | GET | System health |
| `/api/v2/chat` | POST | AI conversation |
| `/api/v2/orchestrator/status` | GET | Orchestrator status |
| `/api/v2/agent/artifacts` | GET/POST | Artifact management |
| `/api/v2/skills` | GET | Available skills |
| `/api/v2/projects` | GET/POST | Projects |

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

##  Authentication

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
