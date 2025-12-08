# TooLoo.ai Copilot Instructions

## ⚠️ CRITICAL WARNINGS

### DO NOT USE `pkill -f "node"` IN CODESPACES

**NEVER run `pkill -f "node"` or similar commands that kill all node processes in a GitHub Codespace environment.**

This command will:
- Kill the Codespace connection itself (VS Code remote connection runs on Node)
- Disconnect the user from the codespace
- Potentially corrupt the session state
- Require manual intervention to reconnect

**Instead, use these safe alternatives:**
- `pkill -f "tsx.*main"` - Only kill the TooLoo server
- `lsof -i :5173 | grep node | awk '{print $2}' | xargs kill` - Kill specific port
- `npm run stop` - Use the project's stop script
- Restart individual processes using their PIDs

### Server Management Commands

```bash
# SAFE: Stop TooLoo server only
pkill -f "tsx.*main" 2>/dev/null

# SAFE: Stop Vite dev server
pkill -f "vite" 2>/dev/null

# SAFE: Use project scripts
npm run stop
npm run dev

# DANGEROUS - NEVER USE IN CODESPACE:
# pkill -f "node"  ❌ KILLS CODESPACE CONNECTION
# killall node     ❌ KILLS CODESPACE CONNECTION
```

## Project Structure

TooLoo.ai V3.3 Synapsys is a multi-agent AI orchestration system with:
- `/src/cortex/` - Core AI orchestration, agents, and cognitive systems
- `/src/nexus/` - API routes and web interface backend (Socket.IO on port 4000)
- `/src/web-app/` - React frontend with Liquid Skin UI (Vite on port 5173)
- `/src/qa/` - Quality assurance and testing infrastructure
- `/src/precog/` - Provider routing, synthesis, and prediction

## Architecture Notes (v3.3.300)

### Real-Time Communication
- **Backend**: Socket.IO server on port 4000 (`/src/nexus/socket.ts`)
- **Frontend**: Socket.IO client (`socket.io-client` package)
- **Event Pattern**: `bus.publish()` → Socket.IO → `synapsys:event` broadcasts
- **DO NOT** use native WebSocket in frontend - always use `socket.io-client`

### React Component Guidelines
- Always use unique keys in `.map()` iterations
- Pattern: `key={item.id || \`prefix-${item.uniqueField}-${index}\`}`
- Never use index alone as key in AnimatePresence or dynamic lists
- Prefer compound keys with timestamps for real-time data

### API Endpoints
- All routes under `/api/v1/` prefix
- Health: `GET /api/v1/health`
- Growth: `GET /api/v1/growth/schedule`, `GET /api/v1/learning/report`
- Config: `GET /api/v1/config/domains`
- Chat: `POST /api/v1/chat` (or via Socket.IO `generate` event)

## Development Guidelines

1. **Always run tests before major changes**: `npm test`
2. **Use TypeScript strict mode**: All new code should be type-safe
3. **Follow the EventBus pattern**: Use `bus.publish()` and `bus.on()` for system communication
4. **Update version numbers**: Increment version in file headers when modifying
5. **Socket.IO for real-time**: Frontend should use `io()` from socket.io-client, not WebSocket

## Team Framework

The system uses an executor+validator agent pair pattern:
- Every task gets paired with a validator agent
- Quality gating ensures output meets thresholds (0.8-0.95)
- Teams are automatically formed based on specialization

## Code Execution

Code can be executed through:
- `/api/v1/agent/task/team-execute` - Team-validated execution
- System Execution Hub connects to all Synapsys systems
- Results include quality scores and validation status
