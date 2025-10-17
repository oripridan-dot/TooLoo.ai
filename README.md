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

## 🚀 Platform Capabilities

- **Multi-Provider AI Orchestration**: Intelligent routing across OpenAI, Claude, Gemini, DeepSeek, and on-device models
- **Self-Improving Engine**: Recursive learning and pattern recognition that strengthen every cycle
- **Real-Time Performance Analytics**: Code execution metrics, latency tracking, and regression detection
- **Visual Development Interface**: Live prompt evolution, execution visualization, and artifact review
- **Production-Ready Infrastructure**: Scalable, secure, and enterprise-grade

## 🤖 Default Provider Policy

- Claude Haiku **4.5 preview** (`claude-3-5-haiku-20241022`) is the default Anthropic model
- Provider fallback chain prioritises local providers (Ollama) → Anthropic → OpenAI → Gemini → DeepSeek → others
- Check live status with `curl http://127.0.0.1:3003/api/v1/providers/status`

## 🛠️ Development Workflow

This repository follows a feature-branch workflow to keep changes focused and easy to review. When you start new work:

1. Create a branch named after the capability you are building (for example, `feature/improved-prompt-visuals`).
2. Install dependencies (`npm install`) if you have not already, then implement and test your changes on that branch. You can run `scripts/create-feature-branch.sh` with the appropriate flags to create and switch to a feature or experiment branch automatically (defaults to using `origin/main` as the base).
  - Example: `bash scripts/create-feature-branch.sh --product control-room --capability burst-coach`
  - To choose a different base branch, pass `--base origin/release/v1.7` (or another ref).
  - Prefer `npm run branch:status` before opening a PR to ensure alignment with governance expectations.
3. Run `npm run docs` or `npm run benchmark` variants when your work touches documentation or performance-critical flows.
4. Validate end-to-end flows with `npm run benchmark:basic`, `npm run test:parser`, or the relevant suite for your capability.
5. Open a pull request that links back to the tracked task or issue and attach artefacts (benchmarks, screenshots, transcripts) for reviewers.

> **Tip:** The unified tooling scripts (`launch-tooloo.sh`, `scripts/tooloo.js`, `scripts/repo-hygiene.sh`) keep the workspace deterministic. Use `npm run clean` to stop services and sweep generated artefacts before switching branches.

See the [Branching Strategy guide](docs/branching-strategy.md) for more detailed instructions, including testing expectations before opening a pull request.

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
- `npm run clean` now clears background services and runs the hygiene sweep

## 🧹 Repository Hygiene

- Preview deletions with `npm run hygiene -- --dry-run`
- Apply the sweep with `npm run hygiene` (also runs automatically via `npm run clean`)
- Generated caches, logs, release bundles, and AI analysis exports are removed while `data/.gitkeep` preserves the directory skeleton


## 📚 Further Reading

- [`docs/architecture/overview.md`](docs/architecture/overview.md) for deep architecture context
- [`OSS-PROVIDERS-GUIDE.md`](OSS-PROVIDERS-GUIDE.md) for local/OSS provider setup
- [`launch-tooloo.sh`](launch-tooloo.sh) documents the unified launch workflow
