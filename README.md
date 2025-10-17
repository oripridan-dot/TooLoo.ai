# TooLoo.ai - Self-Improving Development Intelligence Platform

A sophisticated AI-powered development platform that learns, evolves, and adapts to create better code through multi-provider orchestration and recursive self-improvement.

## 🚀 Features

- **Multi-Provider AI Orchestration**: Intelligent routing across OpenAI, Claude, Gemini, and DeepSeek
- **Self-Improving Engine**: Recursive learning and pattern recognition
- **Real-Time Performance Analytics**: Code execution metrics and complexity analysis
- **Visual Development Interface**: Live prompt evolution and execution visualization

## 🛠️ Development Workflow

This repository follows a feature-branch workflow to keep changes focused and easy to review. When you start new work:

1. Create a branch named after the capability you are building (for example, `feature/improved-prompt-visuals`).
2. Install dependencies (`npm install`) if you have not already, then implement and test your changes on that branch. You can run `scripts/create-feature-branch.sh <your-branch-name>` to create and switch to a feature branch automatically (defaults to using `work` as the base).
   - From the repository root, execute `bash scripts/create-feature-branch.sh feature/amazing-feature`.
   - To choose a different base branch, pass it as the second argument: `bash scripts/create-feature-branch.sh feature/amazing-feature main`.
   - If you prefer using npm scripts, run `npm run create:branch -- feature/amazing-feature` (append the base name if you want something other than `work`).
3. Run `npm run validate` to execute automated tests and the API performance probe before opening a pull request.
4. If the performance probe fails, inspect the console output saved by the script, address regressions, and re-run `npm run validate`.
5. Open a pull request that links back to the tracked task or issue.

> **Tip:** The validation script starts the local API automatically. Ensure the default entry point `simple-api-server.js` (or the backup listed in `PERF_SERVER_ENTRIES`) reflects the code you intend to benchmark.

See the [Branching Strategy guide](docs/branching-strategy.md) for more detailed instructions, including testing expectations before opening a pull request.

- **Production-Ready Infrastructure**: Scalable, secure, and enterprise-grade

## 🏗️ Architecture

```
TooLoo.ai/
├── packages/
│   ├── api/          # Core API and AI engine
│   ├── web/          # React frontend interface
│   ├── core/         # Shared utilities and types
│   └── engine/       # AI orchestration engine
├── docs/             # Documentation
└── deploy/           # Deployment configurations
```

## 🚦 Quick Start

```bash
# Clone and install
git clone https://github.com/oripridan-dot/TooLoo.ai
cd TooLoo.ai
npm install

# Set up environment
cp .env.example .env
# Add your AI provider API keys

# Start development
npm run dev

# Visit http://localhost:3000
```

## 🔧 Configuration

Create `.env` file:
```env
# AI Providers
OPENAI_API_KEY=your_key_here
CLAUDE_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
DEEPSEEK_API_KEY=your_key_here

# Database
DATABASE_URL=sqlite:./data/tooloo.db

# Server
PORT=3001
NODE_ENV=development
```

## 📚 Documentation

- [API Documentation](./docs/api.md)
- [Architecture Guide](./docs/architecture.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.# TooLoo.ai
