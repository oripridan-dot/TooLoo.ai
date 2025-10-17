# TooLoo.ai – Copilot Operating Brief

## Mission Snapshot
- TooLoo.ai runs as a **multi-service Node.js network** fronted by `servers/web-server.js` (port 3000) and orchestrated by `servers/orchestrator.js`
- Core philosophy: **act first, explain second**. Implement the fix, verify it, then summarise outcome → tested → impact → next
- Respond in structured, concise English. No raw code in chat unless explicitly asked; point to file paths instead

## Active Architecture
```
Port 3000  → servers/web-server.js (static UI + API proxy + UI automation)
Port 3001  → servers/training-server.js (selection engine, hyper-speed rounds)
Port 3002  → servers/meta-server.js (meta-learning phases & boosts)
Port 3003  → servers/budget-server.js (provider status, burst cache, policy tuning)
Port 3004  → servers/coach-server.js (Auto-Coach loop + Fast Lane)
Port 3005  → servers/cup-server.js (Provider Cup mini-tournaments)
Port 3006  → servers/product-development-server.js (workflows, analysis, artifacts)
Port 3007  → servers/segmentation-server.js (conversation segmentation & traits)
Port 3008  → servers/reports-server.js
Port 3009  → servers/capabilities-server.js
Port 3123  → servers/orchestrator.js (/api/v1/system/*)
```
- Legacy `simple-api-server.js` remains available (`npm run start:simple`) but the Control Room path is the primary production surface
- UI assets live in `web-app/*.html` – no Vite

## Start / Stop / Verify
1. `npm run dev` → launches `launch-tooloo.sh`, starting web + orchestrator and pre-arming services
2. Control the system directly via the web proxy: `curl -X POST http://127.0.0.1:3000/system/start`
3. Shutdown helpers:
   - `npm run stop:all` → targeted `pkill`
   - `npm run clean` → kill any stray `node servers/*`
4. Smoke checks (via proxy):
   - Training: `curl http://127.0.0.1:3000/api/v1/training/overview`
   - Provider burst: `curl -X POST http://127.0.0.1:3000/api/v1/providers/burst -H 'Content-Type: application/json' -d '{"prompt":"status"}'`
   - System map: `curl http://127.0.0.1:3000/api/v1/system/processes`

## Providers & Policy
- Claude Haiku **4.5 preview** (`claude-3-5-haiku-20241022`) is the default Anthropic model
- Provider priority: Ollama → Anthropic → OpenAI → Gemini → DeepSeek → LocalAI/HF
- Query status at `http://127.0.0.1:3003/api/v1/providers/status`

## Branching Expectations
- Strategy documented in `docs/branching-strategy.md`
- Use `npm run branch:status` to report branch, cleanliness, and upstream state in updates
- New features: `feature/<summary>` from `main`; release branches `release/v{major}.{minor}`; hotfix branches `hotfix/{ticket}`

## Communication Protocol
- Always respond with the pattern: **Outcome • Tested • Impact • Next**
- Keep responses lean, bullet-first, and reference files using inline backticks (`path/to/file`)
- Ask only when a pivotal decision is required; otherwise make a recommendation and proceed
- When UI needs a tweak, append fenced `ui` blocks using the Control Room command schema (e.g. `{"action":"setMode","mode":"lean"}`)

## Debug Playbook
- If proxy returns 502: confirm target service health via `/health` on the direct port, then restart via `/system/start`
- If orchestrator reports `pid: null`: POST `/system/start` again or run `npm run start`
- Segmentation sanity: GET `/api/v1/segmentation/status` then POST `/api/v1/segmentation/analyze`
- Provider burst cache issues: POST `/api/v1/providers/policy` with `{ "criticality": "normal", "maxConcurrency": 6 }`

## Ground Rules
- Never delete or revert user changes you did not author without explicit direction
- Default to ASCII when editing files
- Insert comments only when clarity is essential; keep them succinct and purposeful
- Always create backups through `filesystemManager` when self-modification routines are invoked inside the codebase
