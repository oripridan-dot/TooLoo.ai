# TooLoo Engine V2 - Tool Execution System

> **Version:** 2.0.0-alpha  
> **Status:** ✅ Operational  
> **Updated:** December 14, 2025

## Overview

Engine V2 introduces **tool execution capabilities** - TooLoo can now actually modify files in the codebase, not just generate code snippets.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Synapsys Navigator                       │
│              (React UI - /src/web-app/skin/views)            │
│                                                              │
│  ┌─────────────┐  ┌───────────────┐  ┌────────────────┐     │
│  │  Cognitive  │  │  Conversation │  │    Artifact    │     │
│  │   Canvas    │  │    Stream     │  │     Panel      │     │
│  └─────────────┘  └───────────────┘  └────────────────┘     │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/v1/engine/chat
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Engine V2 Routes                        │
│               (/src/nexus/routes/engine-v2.ts)               │
│                                                              │
│  1. Receive message                                          │
│  2. Call precog.providers.generate() with tool system prompt │
│  3. Parse response for tool calls (:::tool{name="..."}:::)   │
│  4. Execute tools: file_write, file_read, list_files         │
│  5. Return response + tool results                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    TOOL_IMPLEMENTATIONS                      │
│                                                              │
│  file_write   │  Write content to file (creates dirs)       │
│  file_read    │  Read file contents                         │
│  list_files   │  List directory contents                    │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### `GET /api/v1/engine/status`
Returns engine status and available tools.

```json
{
  "ok": true,
  "data": {
    "status": "ready",
    "version": "2.0.0-alpha",
    "toolsEnabled": true,
    "availableTools": ["file_write", "file_read", "list_files"],
    "providers": ["anthropic", "deepseek", "openai", "gemini"]
  }
}
```

### `GET /api/v1/engine/tools`
Lists all available tools with descriptions.

### `POST /api/v1/engine/chat`
Chat with tool execution capability.

**Request:**
```json
{
  "message": "Create a file called hello.txt with 'Hello World'",
  "provider": "deepseek"  // optional, defaults to deepseek
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "response": "I'll create that file for you...",
    "provider": "gemini",
    "model": "gemini",
    "toolCalls": [
      {
        "tool": "file_write",
        "params": { "path": "hello.txt", "content": "Hello World" },
        "success": true,
        "output": "Success: Wrote 11 characters to hello.txt"
      }
    ],
    "cost": 0.015,
    "latencyMs": 624
  }
}
```

### `POST /api/v1/engine/tool`
Execute a tool directly (for testing).

```json
{
  "tool": "list_files",
  "params": { "path": "src" }
}
```

## Tool Format

AI models are instructed to output tool calls in this format:

```
:::tool{name="file_write"}
{"path": "relative/path.ts", "content": "file content"}
:::
```

The system parses these patterns and executes the corresponding tools.

## Security

- **Path Traversal Protection:** All paths must stay within PROJECT_ROOT
- **Protected Directories:** Cannot write to `.git/`, `node_modules/`, `.env`
- **Relative Paths Only:** AI instructed to use relative paths only

## Frontend Integration

The Synapsys Navigator UI displays:
- Real-time cognitive state (idle, processing, executing, reflecting)
- Neural particle visualization that reacts to processing
- Tool execution results with success/error indicators
- Artifacts created from file operations

## Testing

```bash
# Check engine status
curl http://localhost:4000/api/v1/engine/status | jq '.data'

# Test file listing
curl -X POST http://localhost:4000/api/v1/engine/tool \
  -H "Content-Type: application/json" \
  -d '{"tool":"list_files","params":{"path":"src"}}'

# Test AI chat with tools
curl -X POST http://localhost:4000/api/v1/engine/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"List files in the src directory"}'
```

## Files

- **Backend:** [src/nexus/routes/engine-v2.ts](../src/nexus/routes/engine-v2.ts)
- **Frontend:** [src/web-app/src/skin/views/SynapsysNavigator.jsx](../src/web-app/src/skin/views/SynapsysNavigator.jsx)
- **CSS:** [src/web-app/src/skin/views/SynapsysNavigator.css](../src/web-app/src/skin/views/SynapsysNavigator.css)
