# 🧠 TooLoo.ai V2 - Your Personal Product Factory

> **Transform ideas into profitable products with AI-powered business intelligence**

## What is TooLoo.ai V2?

TooLoo.ai V2 is a **two-phase product development system** designed for non-technical entrepreneurs:

### Phase 1: Idea Refinery Workshop 🎨
- **Visual idea canvas** - Drag-drop blocks, no coding required
- **Market intelligence** - Auto-analyze profitable opportunities
- **Revenue modeling** - Calculate potential earnings before building
- **Risk scoring** - Understand complexity vs. reward
- **Timeline builder** - Visualize your product journey

### Phase 2: Production Pipeline 🚀
- **Rapid prototyping** - Build testable MVPs in hours
- **Real-world testing** - Get actual user feedback
- **One-click deployment** - Vercel, Netlify, Railway integration
- **Payment setup** - Stripe/PayPal wizard
- **Analytics dashboard** - Track real revenue and users

## Current Status

**🚧 Under Active Development - Phase 1 Focus**

We're building the Idea Workshop first. Watch this space for updates.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/oripridan-dot/TooLoo.ai.git
cd TooLoo.ai

# Install dependencies
npm install

# Configure environment (optional - API keys for AI features)
cp .env.example .env
# Edit .env and add your API keys

# Start the API server
cd api
npm install
npm start

# Server runs on http://localhost:3001
# Check budget: http://localhost:3001/api/budget
```

### Budget Management

TooLoo.ai includes built-in cost control to prevent AI overspending:

- **Daily limit:** $5 (configurable)
- **Monthly limit:** $100 (configurable)
- **Automatic caching:** Saves 70%+ on redundant requests
- **Provider optimization:** Uses cheapest provider by default

Configure in `.env`:
```env
DAILY_BUDGET_LIMIT=5.00
MONTHLY_BUDGET_LIMIT=100.00
```

See [BUDGET_MANAGEMENT.md](BUDGET_MANAGEMENT.md) for full documentation.

## Architecture

```
TooLoo.ai V2/
├── workshop/        # Phase 1: Idea Refinery (Current Focus)
│   ├── canvas/      # Visual idea builder UI
│   ├── market/      # Market intelligence engine
│   ├── revenue/     # Revenue modeling
│   └── timeline/    # Journey visualization
├── api/             # Backend API server
│   ├── server.js    # Express API with budget management
│   └── budget-manager.js  # Cost tracking & limits
├── integrations/    # External APIs (Product Hunt, Reddit, etc.)
├── knowledge/       # Your learning hub + news feed
└── shared/          # Common utilities
```

## Key Features

✅ **AI-Powered Idea Refinement** - Get specific, actionable improvements for your product ideas
✅ **Market Intelligence** - Auto-analyze competition and trends
✅ **Budget Management** - Control AI costs with automatic tracking and limits ($5/day default)
✅ **Response Caching** - Save up to 70% on costs with 1-hour cache
✅ **Provider Flexibility** - DeepSeek, Claude, OpenAI, Gemini support

## Philosophy

**Action-first, not explanation-first.** TooLoo executes tasks and shows results, not instructions.

**Visual-first design.** Everything is visual blocks and dashboards, not code.

**Real-world validation.** Build → Test → Feedback → Improve → Deploy.

## Version History

- **V2** (Current) - Two-phase product factory
- **[V1](https://github.com/oripridan-dot/TooLoo.ai/tree/archive/v1-original)** (Archived) - AI development assistant

## License

MIT License - See [LICENSE](LICENSE) for details

---

**Built for entrepreneurs who want to build products, not learn to code.**
