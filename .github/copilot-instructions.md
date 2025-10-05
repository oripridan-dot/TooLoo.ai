# TooLoo.ai - AI Agent Instructions

## Quick Context
TooLoo.ai is a **self-improving AI development platform** with multi-provider orchestration (OpenAI, Claude, Gemini, DeepSeek, Grok, HuggingFace). The platform features:
- **Copilot-style thinking** - Real-time visual progress of AI thinking process
- **Codebase awareness** - Analyzes its own code before making changes
- **Preview system** - See changes before applying them
- **Recursive self-awareness** - Can read, analyze, and modify its own codebase

**Core Philosophy**: Show users what you're thinking, give them control through previews, and only change what they asked for.

## 📚 Instruction Manifest

This is the **master instruction file** for GitHub Copilot. For specialized operations, also consult:

- **[Director Operations Guide](./director-instructions.md)** - Workflow orchestration, preview enforcement, quality gates
- **[Provider Alignment Guide](./provider-instructions.md)** - Response formatting, hallucination prevention, code contracts

**When to use each**:
- **This file**: General TooLoo.ai context, architecture, features
- **Director guide**: Multi-agent workflows, preview system, progress tracking
- **Provider guide**: Code generation formatting, validation rules, communication style

## Architecture: Dual-Server Pattern

```
TooLoo.ai/
├── simple-api-server.js     # Main backend API (port 3005) - PRODUCTION
│   ├── PersonalAIManager    # AI orchestration with preview system
│   ├── Self-awareness       # Codebase analysis before changes
│   ├── Progress tracking    # Copilot-style thinking emission
│   └── Preview endpoints    # /api/v1/preview, /approve, /rollback
├── web-app/                  # React + Vite frontend (port 5173)
│   ├── src/components/
│   │   ├── Chat.jsx         # Main UI with Socket.IO + preview system
│   │   ├── PreviewPanel.jsx # Code preview with approve/reject
│   │   └── ThinkingProgress.jsx # Copilot-style progress visualization
│   ├── vite.config.js        # Proxy config to API (proxies to 3005)
│   └── package.json
├── packages/                 # TypeScript modules (experimental, not used)
├── personal-projects/        # User-generated projects (sandbox)
├── patterns/                 # Reusable code patterns catalog
└── knowledge/                # Project knowledge base
```

**Key Decision**: Two parallel architectures exist:
- **Simple path** (production): `simple-api-server.js` + `web-app/` - **actively used, modify this**
- **Advanced path** (experimental): `packages/*` - TypeScript modular system, not fully integrated yet

**⚠️ CRITICAL PORT INFO**: API runs on **port 3005** (configured via `PORT=3005` in package.json scripts), defaults to 3001 if PORT env var not set. Web app always uses 5173 and proxies `/api/*` and `/socket.io` to port 3005.

## Current Features (October 2025)

### 1. Copilot-Style Thinking Progress 🧠
TooLoo now shows step-by-step what it's doing:
- 🔍 **Analyzing** - Scans TooLoo's own codebase using self-awareness-manager
- 📖 **Reading** - Reads relevant files (Chat.jsx, App.jsx, globals.css)
- 🧠 **Understanding** - Analyzes project structure (React, Tailwind, Socket.IO)
- 💡 **Planning** - Decides what needs to change based on user intent
- ⚙️ **Generating** - Creates code with AI (DeepSeek by default)
- ✅ **Preview Ready** - Shows user the changes before applying

**Implementation**: `ThinkingProgress.jsx` component listens to `thinking-progress` Socket.IO events

### 2. Preview System with Approve/Reject 🔮
Before ANY change is applied:
1. AI generates code preview
2. User sees `PreviewPanel` with code diff
3. User can **Approve** (apply), **Modify** (iterate), or **Reject** (cancel)
4. Only approved changes are applied to files
5. Automatic backup before applying
6. Page reloads to show changes

**Implementation**: 
- Backend: `/api/v1/preview`, `/api/v1/approve`, `/api/v1/rollback` endpoints
- Frontend: `PreviewPanel.jsx` component with action buttons
- State: `previewStates` Map in PersonalAIManager

### 3. Codebase Self-Awareness 📊
Before generating ANY code, TooLoo:
1. Calls `analyzeCodebaseForRequest(prompt)`
2. Scans `web-app/src/` for relevant files
3. Reads key files (Chat.jsx, App.jsx, globals.css)
4. Understands: React 18.2, Tailwind CSS, Socket.IO, current patterns
5. Parses user intent (addComponent, modifyStyle, addFeature, etc.)
6. Includes this context in AI prompts

**Result**: AI knows TooLoo's structure and generates contextually appropriate code

### 4. Smart Change Detection 🎯
Chat.jsx automatically detects change requests:
```javascript
const isChangeRequest = /\b(make|change|update|modify|add|remove|create|improve|fix)\b/i.test(userInput);
```
- **Change requests** → Preview system
- **Regular chat** → Normal conversation

## Critical Developer Workflows

### Starting the App (DO THIS FIRST)
```bash
# Start both API and web app together (recommended)
npm run dev

# OR start separately:
npm run start:api  # API on port 3005
npm run start:web  # Vite on port 5173

# OR use the start script
./start-servers.sh
```

### Making Changes to TooLoo
1. User requests change: "Add dark mode toggle"
2. System triggers preview flow
3. Backend analyzes codebase (self-awareness)
4. Emits progress events (analyzing, reading, planning, generating)
5. Frontend shows ThinkingProgress component
6. AI generates targeted code (not complete files)
7. Backend stores in previewStates
8. Frontend shows PreviewPanel
9. User approves → Files saved → Page reloads

### Running Tests
```bash
cd web-app
npm test                    # Run Vitest tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

**Test configuration**: Tests use Vitest with jsdom. Integration tests require API server running on port 3005.
```bash
cd web-app
npm test                    # Run Vitest tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

**Test configuration**: Tests use Vitest with jsdom. Integration tests require API server running on port 3005. See `web-app/vite.config.js` for test setup.

### Environment Setup
Create `.env` in project root:
```env
# AI Provider Keys (at least one required)
DEEPSEEK_API_KEY=your_key_here    # Default, cost-effective
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here   # Claude
GEMINI_API_KEY=your_key_here
XAI_API_KEY=your_key_here         # Grok (experimental)
HF_API_KEY=your_key_here          # Hugging Face (free tier)

# GitHub Integration (for GitHub-as-Backend features)
GITHUB_TOKEN=your_token_here      # Required for write operations
GITHUB_DEFAULT_OWNER=oripridan-dot
GITHUB_DEFAULT_REPO=TooLoo.ai
GITHUB_AUTO_COMMIT=true           # Auto-commit generated code
GITHUB_AUTO_BRANCH=true           # Auto-create branches for commits

# Server Config
PORT=3005                         # API server port (default: 3001)
OFFLINE_ONLY=false                # true = disable external AI calls
CORS_ORIGIN=*                     # CORS settings for dev/prod
```

## Project-Specific Conventions

### GitHub-as-Backend Integration
**Critical**: TooLoo.ai uses GitHub as a comprehensive backend system, not just version control.

```javascript
// In simple-api-server.js
this.githubBackend = new GitHubBackendManager({
  workspaceRoot: process.cwd(),
  autoCommit: true,  // Automatically commit generated code
  autoBranch: true   // Create feature branches automatically
});
```

**GitHub integration provides**:
1. **Auto-versioning**: Generated code automatically commits to GitHub
2. **Project sync**: `personal-projects/` can sync to GitHub repos
3. **Self-improvement PRs**: TooLoo analyzes itself and creates PRs
4. **Issue-driven dev**: Fetch issues, generate solutions, commit fixes
5. **CI/CD automation**: Trigger GitHub Actions workflows
6. **Collaboration**: PR management, code reviews, issue tracking

**Key endpoints**:
- `POST /api/v1/github/generate-and-commit` - Generate code and commit in one step
- `POST /api/v1/github/sync-projects` - Sync all personal projects to GitHub
- `POST /api/v1/github/self-improvement-pr` - Create self-improvement PR
- `POST /api/v1/github/solve-issue` - AI-driven issue resolution
- `GET /api/v1/github/activity` - Repository activity summary

### Self-Awareness Pattern
**Critical**: TooLoo can modify its own code via `SelfAwarenessManager`. This is a FEATURE, not a bug.

```javascript
// In simple-api-server.js
this.selfAwarenessManager = new SelfAwarenessManager({
  workspaceRoot: process.cwd()
});

// Enable self-modification
this.selfAwarenessEnabled = true;
```

**When responding to code modification requests**:
1. Check `selfAwarenessEnabled` flag
2. Use `filesystemManager` to read/write files
3. Create backups before modifications (`.bak` files)
4. Log all self-modifications to `logs/` directory

### Conversational-First API Design
The API is designed to be **action-first, not explanation-first**:

```javascript
// simple-api-server.js settings
this.showCode = false;           // Never show code blocks in responses
this.actionMode = true;          // Execute immediately, don't just explain
this.conversationalStyle = 'friendly';
```

**When implementing features**: Execute and return results, not instructions. Users want "it's done" not "here's how to do it".

### Component Manager Pattern
All major subsystems register with `EnvironmentHub` for coordinated actions:

```javascript
// Registration in simple-api-server.js constructor
this.environmentHub.registerComponent('filesystemManager', this.filesystemManager, [
  'filesystem-management', 'file-operations', 'project-creation'
]);
```

**When adding new services**: Register with `EnvironmentHub` and add appropriate capability tags.

## API Endpoints Reference

### Health & Status
- `GET /api/v1/health` - Health check with provider status
- `GET /api/v1/system/status` - System metrics and capabilities

### AI Generation
- `POST /api/v1/generate` - Primary AI completion endpoint
  ```json
  {
    "prompt": "your request",
    "provider": "deepseek|claude|openai|gemini",
    "conversationId": "optional-id",
    "context": {}
  }
  ```

### Filesystem Operations
- `GET /api/v1/files?path=/path` - List directory
- `POST /api/v1/files` - Write file with backup
  ```json
  {
    "path": "/path/to/file.js",
    "content": "code here",
    "backup": true
  }
  ```
- `GET /api/v1/files/read?path=/path` - Read file

### Self-Awareness
- `POST /api/v1/self-aware/analyze` - Analyze TooLoo's own code
- `POST /api/v1/self-aware/modify` - Modify TooLoo's code (with backup)
- `GET /api/v1/self-aware/status` - Self-awareness capabilities

### GitHub Integration  
- `GET /api/v1/github/config` - Check GitHub configuration and authentication
- `GET /api/v1/github/stats` - Repository statistics
- `GET /api/v1/github/activity` - Activity summary (commits, PRs, issues, workflows)
- `GET /api/v1/github/repo?owner=X&repo=Y` - Get repo info
- `GET /api/v1/github/files?owner=X&repo=Y&path=Z` - List files/directories
- `GET /api/v1/github/files/read?owner=X&repo=Y&path=Z` - Read file content
- `POST /api/v1/github/files` - Create/update file
- `DELETE /api/v1/github/files` - Delete file
- `GET /api/v1/github/branches` - List branches
- `POST /api/v1/github/branches` - Create branch
- `GET /api/v1/github/commits` - List commits
- `GET /api/v1/github/pulls` - List pull requests
- `POST /api/v1/github/pulls` - Create pull request
- `PATCH /api/v1/github/pulls/:number` - Update PR
- `PUT /api/v1/github/pulls/:number/merge` - Merge PR
- `GET /api/v1/github/issues` - List issues
- `POST /api/v1/github/issues` - Create issue
- `PATCH /api/v1/github/issues/:number` - Update issue
- `POST /api/v1/github/issues/:number/comments` - Add comment
- `GET /api/v1/github/actions/runs` - List workflow runs
- `POST /api/v1/github/actions/workflows/:id/dispatches` - Trigger workflow
- `POST /api/v1/github/generate-and-commit` - High-level: generate + commit + optional PR
- `POST /api/v1/github/sync-projects` - Sync personal-projects to GitHub
- `POST /api/v1/github/self-improvement-pr` - Create self-improvement PR

## Integration Points & Data Flow

### Request Flow for AI Generation
1. User submits prompt → `POST /api/v1/generate`
2. `PersonalAIManager` processes request
3. Determines intent: code execution, self-awareness, file ops, or AI generation
4. Routes to appropriate handler:
   - **Code execution** → `SecureCodeExecutor` (sandboxed VM)
   - **Self-modification** → `SelfAwarenessManager` → `FilesystemManager`
   - **File operations** → `PersonalFilesystemManager`
   - **AI completion** → Selected provider API
5. Response formatted with execution results, not code blocks

### Provider Selection Logic
Default priority (cost-optimized for personal use):
1. DeepSeek (default, cost-effective for code)
2. Claude (reasoning tasks)
3. GPT-4 (reliable fallback)
4. Gemini (creative tasks)
5. Grok (experimental, via xAI)
6. Hugging Face (free tier, limited)

Provider selection in `simple-api-server.js:selectProvider()` based on:
- User preference (`defaultProvider`)
- Task type (code vs. conversation vs. reasoning)
- API key availability
- Previous success rates

**Prompt Director Pattern**: For complex requests, `PromptDirector` saturates prompts through iterative refinement, breaks tasks into sub-prompts, distributes to optimal providers in parallel, and synthesizes responses into unified output. This "hive mind" approach is enabled when `useDirector: true` in `PersonalAIManager`.

## Common Pitfalls & Solutions

### "Cannot connect to server"
**Cause**: Trying to access API at wrong URL in dev container.  
**Fix**: Use `http://localhost:3005` from host, `http://host.docker.internal:3005` from container tests.

### Vitest startup errors
**Cause**: Missing jsdom or test config.  
**Fix**: Ensure `web-app/vite.config.js` includes:
```javascript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test-setup.js'
}
```

### Self-awareness not working
**Cause**: Flag disabled or missing permissions.  
**Fix**: Check `this.selfAwarenessEnabled = true` in `PersonalAIManager` constructor.

### 404 on forwarded URLs in Codespaces
**Cause**: Accessing API forwarded URL directly instead of through Vite proxy.  
**Fix**: Use `http://localhost:5173` (Vite dev server) which proxies to API.

### Port conflicts (3001 vs 3005)
**Cause**: Code defaults to 3001 but package.json scripts use PORT=3005.  
**Fix**: Always use `npm run dev` or `npm run start:api` which set PORT=3005. Never run `node simple-api-server.js` directly without PORT env var.

## Key Files to Understand

- `simple-api-server.js` - Main backend, all API routes, PersonalAIManager class
- `github-manager.js` - Low-level GitHub API client (read/write operations)
- `github-backend-manager.js` - High-level GitHub workflows (auto-commit, PRs, CI/CD)
- `web-app/vite.config.js` - Frontend config, proxy setup, test config
- `web-app/src/comprehensive.test.ts` - Integration tests, demonstrates API usage
- `personal-filesystem-manager.js` - Safe file operations with backups
- `self-awareness-manager.js` - Self-modification logic
- `environment-hub.js` - Component coordination layer
- `prompt-director.js` - Multi-provider orchestration and prompt saturation
- `packages/engine/src/orchestrator.ts` - Multi-provider routing (TypeScript, advanced)

## Development Commands Quick Reference

```bash
# Start development (both servers)
npm run dev

# Build for production
npm run build
npm run start:prod

# Health check (ensure API is on port 3005)
npm run health

# Run tests
cd web-app && npm test

# Check linting
npm run lint

# Format code
npm run format
```

## For Non-Coders: Simplification Strategy

When users say "I'm not a coder" or "this is too complicated":
1. **Hide complexity**: Use `npm run dev` as the single command
2. **Execute, don't explain**: Make changes directly, show results
3. **Avoid jargon**: Say "app" not "frontend", "storage" not "filesystem"
4. **Fix problems silently**: Auto-install dependencies, auto-configure, auto-recover
5. **Assume good defaults**: Use DeepSeek, enable self-awareness, action mode on

## Periodic Sequence for AI Agents

**TooLoo Self-Maintenance Schedule**:
- **Every 6 hours**: Check if self-inspection needed (`SelfInspectionManager.shouldRunInspection()`)
- **On startup**: Verify provider keys, test API connectivity, check workspace permissions
- **After file modifications**: Create `.bak` backup, log to `logs/changes.log`
- **On errors**: Attempt provider fallback, log to `logs/api.log`, suggest fixes

**Implementation**: See `initializeSelfInspection()` in `simple-api-server.js` for smart auto-inspection logic.

---

**Last Updated**: October 4, 2025  
**Version**: 1.0.0  
**Review Cycle**: Monthly (1st of month)
