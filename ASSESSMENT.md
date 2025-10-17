# TooLoo.ai Repository Assessment

## Architecture & Structure
- The repository mixes legacy runtime scripts such as `simple-api-server.js` with the newer workspace layout under `packages/`, resulting in two parallel server stacks that share utilities only loosely.
- Backend state for conversations is maintained entirely in memory (e.g., in `packages/api/src/server/conversationManager.ts`), despite the declared SQLite dependency, so no persistence survives a process restart.
- The orchestration engine (`packages/engine`) wires provider routing, weighting, and the execution sandbox, but only OpenAI and Claude clients are implemented even though types export stubs for Gemini and DeepSeek providers.
- Several cross-cutting helpers (for instance, token cost estimation and ID generation) are duplicated across `packages/core` and `packages/engine`, signaling a need for a clearer shared utilities package.

## Languages & Tooling
- TypeScript is the dominant language across the `packages/` workspaces, but legacy JavaScript files remain at the root (the legacy server and multiple operational scripts).
- Front-end code relies on React, Vite, Tailwind, and Lucide icons. Build orchestration is handled through the root `package.json` scripts alongside workspace-level `npm run dev`/`build` commands.

## Feature Highlights
- REST and WebSocket endpoints expose chat handling, conversation retrieval, and provider statistics via the API server. Conversation metadata and orchestrator responses are bundled with each message payload returned to clients.
- The `ConversationalAssistant` orchestrates intent classification, provider selection, and managed execution through the `SafeCodeExecutor`, returning execution summaries with complexity heuristics.
- The `SafeCodeExecutor` uses `vm2`-backed sandboxing with language whitelisting (JavaScript/TypeScript) and pattern-based code validation to limit unsafe operations.
- The front-end `packages/web` workspace provides sidebar navigation, chat streaming, dashboard cards, and conversation history views with skeleton loading states, although dashboard metrics are currently static placeholders.

## Testing & Validation
- Automated test coverage is effectively absent: workspace-level commands default to `--passWithNoTests`, and the root `npm test` ultimately exits after invoking the `web-app` test script.
- A bespoke `scripts/performance-check.js` script launches the API server, probes `/api/v1/health`, and enforces a configurable p95 latency budget. This script acts as the primary validation gate documented in project workflows.

## Additional Observations
- The README references missing architecture documentation (`docs/api.md`, `docs/architecture.md`), indicating documentation debt.
- The coexistence of `packages/web` and the legacy `web-app` package complicates UI development and increases maintenance overhead.
- Provider weighting is updated through an exponential moving average of success rate and latency, but these metrics reset whenever the in-memory process restarts, limiting their usefulness in production environments without persistence.
- Strengthening persistence, consolidating UI stacks, filling provider gaps, and investing in genuine test suites would substantially improve robustness and credibility.

