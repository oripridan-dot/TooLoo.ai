# TooLoo.ai – Copilot Operating Brief

## Mission Snapshot
- **Identity**: TooLoo.ai is an **AI orchestrator and development platform**, NOT a learning platform for users. Its learning capabilities are built for **self-improvement** to enhance its own solutions and capabilities.
- TooLoo.ai runs on the **Synapsys Architecture** (v2.1), a unified Node.js system initialized via `src/main.ts`.
- **Core Modules**:
  - **Cortex**: Cognitive Core (Planning, Memory, System Model)
  - **Precog**: Predictive Intelligence (Budget, Oracle, Training)
  - **Nexus**: Interface & Integration Layer (Express Server on Port 4000)
- Core philosophy: **act first, explain second**. Implement the fix, verify it, then summarise outcome → tested → impact → next
- Respond in structured, concise English. No raw code in chat unless explicitly asked; point to file paths instead

## Active Architecture
```
Port 4000  → Nexus (src/nexus/index.ts)
             - Serves static UI (src/web-app)
             - API Gateway (/api/v1/*)
             - System Control
```
- **Entry Point**: `src/main.ts` (initializes Cortex, Precog, then Nexus)
- **Legacy**: `servers/` directory has been deprecated and replaced by `src/` modules.
- UI assets live in `src/web-app/*.html` – no Vite

## Start / Stop / Verify
1. **Start**: `npm run start:synapsys` (or `npm start`)
   - Launches `tsx src/main.ts`
2. **Stop**: `npm run stop:all`
   - Kills processes on Port 4000 and any lingering Node processes.
3. **Verify**:
   - Health: `curl http://127.0.0.1:4000/health`
   - System Status: `curl http://127.0.0.1:4000/api/v1/system/status`

## Providers & Policy
- Claude Haiku **4.5 preview** (`claude-3-5-haiku-20241022`) is the default Anthropic model
- Provider priority: Ollama → Anthropic → OpenAI → Gemini → DeepSeek → LocalAI/HF
- Query status at `http://127.0.0.1:3003/api/v1/providers/status`

## Branching Expectations
- Strategy documented in `docs/branching-strategy.md`
- Use `npm run branch:status` to report branch, cleanliness, and upstream state in updates
- New features: `feature/<summary>` from `main`; release branches `release/v{major}.{minor}`; hotfix branches `hotfix/{ticket}`

## User Context
**⚠️ CRITICAL**: This is a **single-user personal project** – TooLoo.ai is built for and maintained by a single developer.
- No multi-tenant support needed
- No authentication/authorization required
- No scaling for multiple concurrent users
- No user management or role-based features
- All features are optimized for **personal use only**
- Consider this context in architecture decisions, documentation, and all suggestions
- Recommendations should prioritize **simplicity and personal productivity** over enterprise patterns

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

## 🧠 Self-Awareness & Self-Modification (NEW)
TooLoo.ai now has full system self-awareness and can modify its own code:

### Self-Awareness Endpoints
```
GET  /api/v1/system/awareness   → System capabilities, services, GitHub status
GET  /api/v1/system/introspect  → Deep introspection (process, memory, capabilities)
```

### GitHub Integration (Read + Write)
```
GET  /api/v1/github/health             → Check GitHub configuration
GET  /api/v1/github/info               → Repository metadata
GET  /api/v1/github/issues             → Recent issues for context
POST /api/v1/github/file               → Get file content
POST /api/v1/github/files              → Get multiple files
GET  /api/v1/github/structure          → Repo file tree
GET  /api/v1/github/context            → Full context for AI providers

POST /api/v1/github/update-file        → Create/update files
POST /api/v1/github/create-branch      → Create branches
POST /api/v1/github/create-pr          → Create pull requests
POST /api/v1/github/create-issue       → Create issues
PATCH /api/v1/github/pr/:number        → Update PRs
PUT  /api/v1/github/pr/:number/merge   → Merge PRs
POST /api/v1/github/comment            → Add comments
```

### Self-Modification API
```
POST /api/v1/system/self-patch
  action: "analyze" | "create" | "update"
  file: "path/to/file"           (for create/update)
  content: "file content"        (for create/update)
  message: "commit message"      (optional)
  branch: "branch-name"          (default: main)
  createPr: true|false          (optional, auto-creates PR)
```

**Setup**: Set `GITHUB_TOKEN` and `GITHUB_REPO` environment variables to enable writes

**Test**: Run `npm run test:self-capabilities` or `node scripts/test-self-capabilities.js`

**Deprecations**: `github-context-server` (port 3020) no longer needed – GitHub API consolidated into web-server
