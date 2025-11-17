# TooLoo.ai Control Network

[![CI](https://github.com/oripridan-dot/TooLoo.ai/workflows/CI/badge.svg)](https://github.com/oripridan-dot/TooLoo.ai/actions)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://docker.com/)

TooLoo.ai is a multi-service personal AI development environment that orchestrates training, segmentation, coaching, and provider management from a single Control Room.

## 📁 Repository Structure

```
TooLoo.ai/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI/CD
├── config/
│   └── providers.json               # Provider fallback chains & settings
├── servers/                         # Multi-service architecture
│   ├── web-server.js                # UI proxy & static assets (port 3000)
│   ├── orchestrator.js              # Service orchestration & monitoring (port 3123)
│   ├── training-server.js           # AI training engine (port 3001)
│   ├── meta-server.js               # Meta-learning & boosts (port 3002)
│   ├── budget-server.js             # Provider management (port 3003)
│   ├── coach-server.js              # Auto-coach & Fast Lane (port 3004)
│   ├── cup-server.js                # Provider tournaments (port 3005)
│   ├── product-development-server.js # Workflows & artifacts (port 3006)
│   ├── segmentation-server.js       # Conversation analysis (port 3007)
│   ├── reports-server.js            # Analytics & reporting (port 3008)
│   └── capabilities-server.js       # Feature capabilities (port 3009)
├── engine/                          # Core AI & utility engines
│   ├── intent-bus.js                # Intent processing
│   ├── model-chooser.js             # Provider selection logic
│   ├── confidence-scorer.js         # Response quality scoring
│   ├── dag-builder.js               # Workflow orchestration
│   └── llm-provider.js              # Multi-provider orchestration
├── web-app/                         # Frontend UI assets
│   ├── control-room-home.html       # Main control interface
│   ├── control-room-redesigned.html # Advanced control interface
│   ├── tooloo-hub.html              # Conversational interface
│   ├── js/                          # Frontend JavaScript
│   └── css/                         # Stylesheets
├── scripts/                         # Development & utility scripts
├── tests/                           # Test suites
├── data/                            # Persistent data storage
├── config/                          # Configuration files
├── .env.example                     # Environment variables template
├── docker-compose.yml               # Multi-service container orchestration
├── Dockerfile                       # Container build configuration
├── package.json                     # Dependencies & scripts
├── vitest.config.js                 # Test configuration
├── .eslintrc.json                   # Code linting rules
└── .prettierrc.json                 # Code formatting rules
```

## ⚡️ Quick Start

```bash
npm start
```

That's it! The unified startup process will:
- ✅ Clean up old processes
- ✅ Start the web server (port 3000)
- ✅ Orchestrate all 12 microservices
- ✅ Verify each service is responding
- ✅ Display live system status

Then access:
- **Control Room**: http://127.0.0.1:3000/control-room
- **Chat Interface**: http://127.0.0.1:3000/tooloo-chat
- **Dashboard**: http://127.0.0.1:3000

Stop with `Ctrl+C`

See [QUICKSTART.md](./QUICKSTART.md) for common tasks and [STARTUP.md](./STARTUP.md) for detailed documentation.

## 🧭 Service Map (12 Microservices)

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | **Web Server** | API gateway, UI proxy, static assets, control surface |
| 3001 | **Training** | Selection engine, hyper-speed training, rounds |
| 3002 | **Meta** | Meta-learning, retention boosts, system introspection |
| 3003 | **Budget** | Provider management, rate limiting, burst cache |
| 3004 | **Coach** | Auto-coaching, guidance, Fast Lane |
| 3005 | **Cup** | Provider tournaments, competitive comparisons |
| 3006 | **Product** | Workflows, artifact pipelines, design workflows |
| 3007 | **Segmentation** | Conversation analysis, trait extraction |
| 3008 | **Reports** | Analytics, dashboards, performance metrics |
| 3009 | **Capabilities** | Feature discovery, capability registry |
| 3100 | **Orchestration** | Service coordination, startup/shutdown |
| 3200 | **Provider** | LLM provider management and routing |
| 3300 | **Analytics** | Event tracking, system metrics, monitoring |

**All services start automatically** with `npm start` and communicate through the web server (port 3000).

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

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork and clone the repository
2. Copy `.env.example` to `.env` and configure your API keys
3. Run `npm install` to install dependencies
4. Use `npm run lint` and `npm run format` to maintain code quality
5. Run `npm test` to execute the test suite
6. Use `docker-compose up` for containerized development

### Code Quality
- **Linting**: `npm run lint` (auto-fix with `npm run lint:fix`)
- **Formatting**: `npm run format` (check with `npm run format:check`)
- **Testing**: `npm test` (unit tests) and `npm run test:integration` (API tests)
- **CI/CD**: Automated checks run on all PRs via GitHub Actions

## 📚 Further Reading

- [`docs/architecture/overview.md`](docs/architecture/overview.md) for deep architecture context
- [`OSS-PROVIDERS-GUIDE.md`](OSS-PROVIDERS-GUIDE.md) for local/OSS provider setup
- [`launch-tooloo.sh`](launch-tooloo.sh) documents the unified launch workflow
