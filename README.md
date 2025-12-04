# TooLoo.ai - Synapsys V3.3

> 🧠 Autonomous AI Development Platform with Self-Execution Capabilities

## What's New in V3.3

### Agent Execution System
TooLoo can now execute its own code, save artifacts, and manage structured processes - similar to how this chat works.

```bash
# Execute a code generation task
curl -X POST http://localhost:4000/api/v1/agent/task/execute \
  -H "Content-Type: application/json" \
  -d '{"type":"generate","name":"my-task","input":{"prompt":"Create a React component","language":"tsx"}}'
```

### Clean Architecture
- **No legacy code** - Only the Liquid Synapsys UI
- **No cleanup folders** - Fresh start
- **All modules wired** - Everything works together

## Quick Start

```bash
# Install dependencies
npm install
cd src/web-app && npm install && cd ../..

# Start development
npm run dev

# Or start backend only
npm run start:synapsys
```

## Architecture

```
src/
├── main.ts              # Entry point
├── cli/                 # CLI interface
├── core/                # Event bus, registries, config
├── cortex/              # Cognitive modules
│   ├── agent/           # 🆕 Execution Agent System
│   ├── discover/        # Emergence detection
│   ├── exploration/     # Hypothesis testing
│   ├── imagination/     # Visual generation
│   ├── memory/          # Knowledge storage
│   └── planning/        # Task planning
├── nexus/               # API layer & WebSocket
├── precog/              # AI providers & learning
├── qa/                  # Quality assurance
└── web-app/
    └── src/skin/        # Liquid Synapsys UI
```

## Agent API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/agent/task` | POST | Queue a task |
| `/api/v1/agent/task/execute` | POST | Execute immediately |
| `/api/v1/agent/process` | POST | Run multi-step process |
| `/api/v1/agent/status` | GET | Agent state |
| `/api/v1/agent/artifacts` | GET | List saved artifacts |

## Restoring from Legacy

If you need files from the V2.x repository:

```bash
# Set legacy repo path (if not default)
export LEGACY_REPO=/path/to/TooLoo.ai-V3-Synapsys

# View available legacy components
./scripts/restore-from-legacy.sh component

# Restore a specific component
./scripts/restore-from-legacy.sh component Dashboard

# Restore all docs
./scripts/restore-from-legacy.sh all-docs

# View legacy git history
./scripts/restore-from-legacy.sh history
```

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Optional
GROQ_API_KEY=...
GITHUB_TOKEN=ghp_...
```

## Version History

- **V3.3.0** - Agent Execution System, Clean Architecture
- **V3.2.x** - Liquid Synapsys UI
- **V3.1.x** - Emergence & Learning
- **V3.0.x** - Initial Synapsys Release
- **V2.x** - Legacy (archived)

---

Built with 🧠 by TooLoo.ai
