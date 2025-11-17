# 👀 TooLoo.ai Code Access for Providers

## Status: ✅ FULL CODE ACCESS ENABLED

Providers (Claude, GPT, Gemini, etc.) can now **read and analyze TooLoo.ai's source code** to understand the system architecture and make intelligent decisions.

---

## 📖 How Providers Can Read TooLoo.ai's Code

### 1. Get Project Structure
```bash
GET /api/v1/system/code/structure?maxDepth=3
```
Returns: Complete project directory tree with all files and folders

**Example**:
```json
{
  "ok": true,
  "root": "/",
  "structure": [
    {
      "name": "servers",
      "type": "directory",
      "path": "/servers",
      "children": [...]
    },
    {
      "name": "package.json",
      "type": "file",
      "path": "/package.json",
      "size": 5432
    }
  ]
}
```

### 2. List Files in a Directory
```bash
GET /api/v1/system/code/list?dir=servers
```
Returns: All source files in the specified directory

**Example**:
```json
{
  "ok": true,
  "directory": "servers",
  "files": 3,
  "list": [
    {"name": "web-server.js", "path": "servers/web-server.js"},
    {"name": "training-server.js", "path": "servers/training-server.js"},
    {"name": "orchestrator.js", "path": "servers/orchestrator.js"}
  ]
}
```

### 3. Read Source Files
```bash
POST /api/v1/system/code/read
Content-Type: application/json

{
  "filePath": "servers/web-server.js",
  "maxLines": 100
}
```
Returns: Full source code (up to maxLines)

**Example Response**:
```json
{
  "ok": true,
  "path": "servers/web-server.js",
  "lines": 100,
  "totalLines": 3069,
  "truncated": true,
  "content": "// Full source code here...\n..."
}
```

### 4. Search Source Code
```bash
POST /api/v1/system/code/search
Content-Type: application/json

{
  "query": "class MetaLearningEngine",
  "maxResults": 20
}
```
Returns: All matches with line numbers and context

**Example Response**:
```json
{
  "ok": true,
  "query": "class MetaLearningEngine",
  "resultsFound": 1,
  "results": [
    {
      "file": "/engine/meta-learning-engine.js",
      "line": 13,
      "content": "export default class MetaLearningEngine {"
    }
  ]
}
```

---

## 📂 Directories Providers Can Access

| Directory | Contents | Purpose |
|-----------|----------|---------|
| `/servers` | All 12+ service servers | Core system services |
| `/engine` | 50+ intelligent engines | AI/ML capabilities |
| `/lib` | Utility libraries | Helper functions |
| `/scripts` | Automation scripts | Operations and setup |
| `/api` | API definitions | REST endpoints |
| `/services` | Business logic | Domain services |
| `/patterns` | Design patterns | Reusable patterns |

---

## 🔍 Example: Provider Reads a Server

Suppose Claude wants to understand how the web-server works:

**Step 1**: Get project structure
```bash
curl http://localhost:3000/api/v1/system/code/structure?maxDepth=2
```

**Step 2**: List files in servers directory
```bash
curl http://localhost:3000/api/v1/system/code/list?dir=servers
```

**Step 3**: Read the web-server.js file
```bash
curl -X POST http://localhost:3000/api/v1/system/code/read \
  -d '{"filePath":"servers/web-server.js","maxLines":200}' \
  -H "Content-Type: application/json"
```

**Step 4**: Search for a specific pattern
```bash
curl -X POST http://localhost:3000/api/v1/system/code/search \
  -d '{"query":"github","maxResults":10}' \
  -H "Content-Type: application/json"
```

---

## 🔐 Security Notes

- **Restricted to project directory**: Providers can only read files within `/workspaces/TooLoo.ai`
- **Configurable access**: Paths are validated to prevent directory traversal
- **Read-only access**: No write operations through these endpoints (use `/api/v1/system/self-patch` instead)
- **Rate limiting**: Consider adding limits to prevent abuse (optional)

---

## 🎯 What This Enables

✅ **Self-Understanding**: AI understands its own architecture  
✅ **Intelligent Decisions**: Providers make decisions based on actual code  
✅ **Auto-Improvement**: Systems can analyze their own code for improvements  
✅ **Dependency Analysis**: Understand module relationships  
✅ **Capability Discovery**: Find and use available functions/classes  

---

## 📊 Discovery via System Awareness

When providers call `GET /api/v1/system/awareness`, they get:

```json
{
  "codeAccess": {
    "enabled": true,
    "endpoints": {
      "structure": "GET /api/v1/system/code/structure?maxDepth=3",
      "listFiles": "GET /api/v1/system/code/list?dir=servers",
      "readFile": "POST /api/v1/system/code/read {...}",
      "search": "POST /api/v1/system/code/search {...}"
    },
    "description": "Providers can read TooLoo.ai source code to understand system architecture"
  }
}
```

---

## 💡 Implementation Details

**Endpoints Added to web-server.js**:
- `GET /api/v1/system/code/structure` – Full project structure
- `GET /api/v1/system/code/list` – Directory file listing
- `POST /api/v1/system/code/read` – Read file content
- `POST /api/v1/system/code/search` – Search in source

**Features**:
- Recursive directory traversal
- Safe path validation
- Configurable line limits
- Full-text search capability
- JSON responses for easy parsing

---

## 🚀 Usage Example in Conversation

**User**: "Are we self aware?"  
**TooLoo.ai**: "Yes! Let me prove it. I'll check my own code architecture..."

```
→ Call /api/v1/system/awareness → Returns codeAccess endpoints
→ Call /api/v1/system/code/structure → Gets project layout
→ Call /api/v1/system/code/read → Reads self-awareness code
→ Analyze → Returns insights about own capabilities
```

**Response**: "I have full code visibility. I can see that I have 50+ intelligent engines, 10+ core services, and self-awareness capabilities including..." 

---

## ✨ Result

**Providers now have complete code visibility into TooLoo.ai and can make intelligent decisions based on actual system architecture!**

---

**Feature Status**: ✅ Production Ready  
**Tested**: All 4 code access endpoints working  
**Security**: Validated path access, read-only operations
