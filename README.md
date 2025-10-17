# TooLoo.ai Control Network
TooLoo.ai is a multi-service personal AI development environment that orchestrates training, segmentation, coaching, and provider management from a single Control Room.

## ⚡️ Quick Start
- `npm install`
- `npm run dev` → launches the web proxy (3000) and boots every service through the orchestrator
- Open `http://127.0.0.1:3000/control-room` for the Control Room, or `/tooloo-hub` for the conversational Hub
- Stop everything with `npm run stop:all`

## 🧭 Service Map
- `servers/web-server.js` (3000): static UI + proxy router + `/system/*`
- `servers/training-server.js` (3001): selection engine, rounds, hyper-speed training
- `servers/meta-server.js` (3002): meta-learning reports & retention boosts
- `servers/budget-server.js` (3003): provider status, burst cache, policy tuning
- `servers/coach-server.js` (3004): Auto-Coach + Fast Lane
- `servers/cup-server.js` (3005): provider tournaments and comparisons
- `servers/product-development-server.js` (3006): workflow + artifact pipelines
- `servers/segmentation-server.js` (3007): conversation intelligence + traits
- `servers/reports-server.js` (3008) and `servers/capabilities-server.js` (3009)
- `servers/orchestrator.js` (3123): boots/monitors services, exposes `/api/v1/system/processes`
- Legacy simple backend still available via `npm run start:simple`

## 🤖 Default Provider Policy
- Claude Haiku **4.5 preview** (`claude-3-5-haiku-20241022`) is now the default Anthropic model for every client
- Provider fallback chain prioritises local providers (Ollama) → Anthropic → OpenAI → Gemini → DeepSeek → others
- Check live status with `curl http://127.0.0.1:3003/api/v1/providers/status`

## 🔀 Branching Strategy
- Strategy documented in [`docs/branching-strategy.md`](docs/branching-strategy.md)
- Run `npm run branch:status` to view current branch, cleanliness, and sync guidance
- New features branch from `main`, release branches follow `release/v{major}.{minor}`, hotfixes use `hotfix/{ticket}`

## 🧪 Verification Checklist
- Smoke tests (via proxy):
  - `curl http://127.0.0.1:3000/api/v1/training/overview`
  - `curl -X POST http://127.0.0.1:3000/api/v1/providers/burst -H 'Content-Type: application/json' -d '{"prompt":"startup check"}'`
  - `curl http://127.0.0.1:3000/api/v1/system/processes`
- Segmentation sanity: `curl http://127.0.0.1:3000/api/v1/segmentation/status`
- Use `npm run clean` to clear background processes before re-running checks

## 📚 Further Reading
- [`docs/architecture/overview.md`](docs/architecture/overview.md) for deep architecture context
- [`OSS-PROVIDERS-GUIDE.md`](OSS-PROVIDERS-GUIDE.md) for local/OSS provider setup
- [`launch-tooloo.sh`](launch-tooloo.sh) documents the unified launch workflow
