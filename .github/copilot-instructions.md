# TooLoo.ai - AI Agent Instructions

## Quick Context
TooLoo.ai is a **self-improving AI development platform** with multi-provider orchestration (OpenAI, Claude, Gemini, DeepSeek). The platform features recursive self-awareness - it can read, analyze, and modify its own codebase.

**Core Philosophy**: Action-first, conversational AI that executes tasks immediately rather than explaining how to do them. Users want "it's done" not "here's how."

## Project Overview
TooLoo.ai is a **self-improving AI development platform** with multi-provider orchestration (OpenAI, Claude, Gemini, DeepSeek). The platform features recursive self-awareness - it can read, analyze, and modify its own codebase.

**Core Philosophy**: Action-first, conversational AI that executes tasks immediately rather than explaining how to do them. Users want "it's done" not "here's how."

## Architecture: Dual-Server Pattern

```
TooLoo.ai/
├── simple-api-server.js     # Main backend API (port 3001) - PRODUCTION
├── web-app/                  # React + Vite frontend (port 5173)
│   ├── src/
│   ├── vite.config.js        # Proxy config to API
│   └── package.json
├── packages/                 # TypeScript modules (experimental)
│   ├── api/                  # Express + Socket.IO server
│   ├── engine/               # Multi-provider orchestration
│   ├── web/                  # React frontend (alternative UI)
│   └── core/                 # Shared types
└── personal-projects/        # User-generated projects (sandbox)
```

**Key Decision**: Two parallel architectures exist:
- **Simple path** (production): `simple-api-server.js` + `web-app/` - **actively used, modify this**
- **Advanced path** (experimental): `packages/*` - TypeScript modular system, not fully integrated yet

## Critical Developer Workflows

### Starting the App (DO THIS FIRST)
```bash
# Start both API and web app together (recommended)
npm run dev

# OR start separately in two terminals:
# Terminal 1: API server
npm run start:api

# Terminal 2: React frontend  
npm run start:web
```

**API runs on port 3001, web app on port 5173**. Vite proxies `/api/*` requests to the backend.

### Running Tests
```bash
cd web-app
npm test                    # Run Vitest tests
npm run dev                 # Start dev server (needed for integration tests)
```

**Test configuration**: Tests use Vitest with jsdom. Integration tests require API server running on port 3001. See `web-app/vite.config.js` for test setup.

### Environment Setup
Create `.env` in project root:
```env
# AI Provider Keys (at least one required)
DEEPSEEK_API_KEY=your_key_here    # Default, cost-effective
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here   # Claude
GEMINI_API_KEY=your_key_here
HF_API_KEY=your_key_here          # Hugging Face (free tier)

# GitHub Integration (optional)
GITHUB_TOKEN=your_token_here

# Server Config
PORT=3001
OFFLINE_ONLY=false                # true = disable external AI calls
```

## Project-Specific Conventions

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
- `GET /api/v1/github/repo?owner=X&repo=Y` - Get repo info
- `GET /api/v1/github/contents?owner=X&repo=Y&path=Z` - List files
- `GET /api/v1/github/file?owner=X&repo=Y&path=Z` - Read file

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
5. Hugging Face (free tier, limited)

Provider selection in `simple-api-server.js:selectProvider()` based on:
- User preference (`defaultProvider`)
- Task type (code vs. conversation vs. reasoning)
- API key availability
- Previous success rates

## Common Pitfalls & Solutions

### "Cannot connect to server"
**Cause**: Trying to access API at wrong URL in dev container.  
**Fix**: Use `http://localhost:3001` from host, `http://host.docker.internal:3001` from container tests.

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

## Key Files to Understand

- `simple-api-server.js` - Main backend, all API routes, PersonalAIManager class
- `web-app/vite.config.js` - Frontend config, proxy setup, test config
- `web-app/src/comprehensive.test.ts` - Integration tests, demonstrates API usage
- `personal-filesystem-manager.js` - Safe file operations with backups
- `self-awareness-manager.js` - Self-modification logic
- `environment-hub.js` - Component coordination layer
- `packages/engine/src/orchestrator.ts` - Multi-provider routing (TypeScript, advanced)

## Development Commands Quick Reference

```bash
# Start development (both servers)
npm run dev

# Build for production
npm run build
npm run start:prod

# Health check
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

**Last Updated**: October 1, 2025  
**Version**: 1.0.0  
**Review Cycle**: Monthly (1st of month)

