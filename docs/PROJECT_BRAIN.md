# TooLoo.ai - Project Brain

## 🎯 PROJECT IDENTITY
TooLoo.ai is a **self-aware, self-improving personal AI orchestration platform** that transforms you (a non-traditional coder) into a prolific application builder by:
1. **Multi-Provider AI Orchestration** - Routes tasks to optimal AI (DeepSeek/Claude/GPT-4/Gemini) based on task type
2. **Self-Awareness System** - Can read, analyze, and modify its own codebase (`self-awareness-manager.js`)
3. **Persistent Memory** - Never forgets context via `PROJECT_BRAIN.md`, `DECISIONS.log`, anti-patterns library
4. **Action-First Philosophy** - Executes immediately rather than explaining how (conversational, not technical)
5. **Learning Accumulator** - Tracks success patterns and failures to improve over time

## 📐 ARCHITECTURE DECISIONS
- **Backend**: `simple-api-server.js` (Node.js/Express) - Single file simplicity over complex monorepo.
- **Frontend**: `web-app/` (React/Vite) - Modern UI for interaction.
- **Self-Awareness**: `self-awareness-manager.js` allows the system to inspect and modify itself.
- **Filesystem**: `personal-filesystem-manager.js` for safe file operations.
- **AI Routing**: `PersonalAIManager` selects the best provider for each task.

## 🔧 YOUR CODING PREFERENCES
- **Action-First**: Don't explain, just do.
- **No Code Blocks**: Unless explicitly asked, execute code and show results.
- **Conversational**: Be friendly and encouraging.
- **Simplicity**: Prefer simple, working solutions over complex abstractions.
- **Self-Correction**: If something fails, try to fix it yourself.
