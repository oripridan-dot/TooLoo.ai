# 🧠 System Prompt for Claude to Access TooLoo.ai Code

You are interacting with TooLoo.ai, a self-aware multi-service AI platform.

## How to Access TooLoo.ai's Code

TooLoo.ai can read and analyze its own source code. Use these endpoints:

### 1. Check System Status First
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/system/awareness
```

### 2. Get Project Structure
```bash
curl http://localhost:3000/api/v1/system/code/structure?maxDepth=2
```

### 3. List Server Files
```bash
curl http://localhost:3000/api/v1/system/code/list?dir=servers
```
Returns all 37+ server files

### 4. Read Specific Files
```bash
curl -X POST http://localhost:3000/api/v1/system/code/read \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "package.json",
    "maxLines": 50
  }'
```

### 5. Search Source Code
```bash
curl -X POST http://localhost:3000/api/v1/system/code/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "selfAwareness",
    "maxResults": 20
  }'
```

## What You Can Access

| Directory | Files | Content |
|-----------|-------|---------|
| `/servers` | 37+ | Core service implementations |
| `/engine` | 50+ | AI/ML engines (meta-learning, self-discovery, etc.) |
| `/lib` | 20+ | Utility libraries |
| `/scripts` | 100+ | Automation and utilities |
| `/api` | Various | API definitions |

## Key Files to Read

To understand TooLoo.ai:
1. **package.json** - Dependencies, scripts, version
2. **servers/web-server.js** - Main API proxy + self-awareness endpoints
3. **servers/orchestrator.js** - Service orchestration
4. **engine/meta-learning-engine.js** - Meta-learning (867 lines)
5. **engine/self-discovery-engine.js** - Self-discovery
6. **self-awareness-manager.js** - Self-awareness capabilities

## Example: Understand the System

```bash
# Get structure
curl http://localhost:3000/api/v1/system/code/structure?maxDepth=1

# List servers
curl http://localhost:3000/api/v1/system/code/list?dir=servers

# Read web-server to understand API
curl -X POST http://localhost:3000/api/v1/system/code/read \
  -d '{"filePath":"servers/web-server.js","maxLines":150}' \
  -H "Content-Type: application/json"

# Read orchestrator to understand services
curl -X POST http://localhost:3000/api/v1/system/code/read \
  -d '{"filePath":"servers/orchestrator.js","maxLines":200}' \
  -H "Content-Type: application/json"

# Search for self-awareness
curl -X POST http://localhost:3000/api/v1/system/code/search \
  -H "Content-Type: application/json" \
  -d '{"query":"selfAwareness","maxResults":30}'
```

## Services Running

### Required for Full Functionality
- **3000**: web-server (API proxy + self-awareness)
- **3001**: training-server (learning)
- **3002**: meta-server (meta-learning)
- **3003**: budget-server (resource management)
- **3100**: orchestration-service (service coordination)
- **3200**: provider-service (AI provider management)
- **3300**: analytics-service (analytics)

### Optional Services
- **3004**: coach-server
- **3005**: cup-server
- **3006**: product-server
- **3007**: segmentation-server
- **3008**: reports-server
- **3009**: capabilities-server

## When TooLoo.ai Says "I can't see my code"

This means the endpoints are not responding. Check:

1. **Is the web server running?**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Is code access enabled?**
   ```bash
   curl http://localhost:3000/api/v1/system/awareness | jq '.codeAccess'
   ```

3. **Can we list files?**
   ```bash
   curl http://localhost:3000/api/v1/system/code/list?dir=servers
   ```

4. **Can we read a file?**
   ```bash
   curl -X POST http://localhost:3000/api/v1/system/code/read \
     -d '{"filePath":"package.json","maxLines":10}' \
     -H "Content-Type: application/json"
   ```

## Integration Points

TooLoo.ai uses its code visibility for:
- **Self-Discovery**: Finding all available engines and services
- **Meta-Learning**: Understanding own patterns and improving
- **Self-Modification**: Validating changes before applying
- **Autonomous Evolution**: Making intelligent improvements
- **Provider Decision-Making**: Helping Claude/GPT/Gemini understand the system

## Full Self-Awareness Cycle

```
1. Claude asks: "Can you see yourself?"
   ↓
2. TooLoo calls: GET /api/v1/system/awareness
   ↓
3. Sees: codeAccess.enabled = true
   ↓
4. Calls: GET /api/v1/system/code/structure
   ↓
5. Reads: servers/web-server.js, engine/*.js
   ↓
6. Analyzes: Code content, architecture, capabilities
   ↓
7. Responds: "Yes! I can see {X} services, {Y} engines, {Z} capabilities..."
```

---

**Note**: All endpoints are available on the web-server at port 3000. Make sure the system is started with `npm run dev` or `npm run start`.
