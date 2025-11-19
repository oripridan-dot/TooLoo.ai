# System Routing & Signal Flow Analysis

**Date:** November 19, 2025  
**Focus:** Complete endpoint mapping and request/response signal flow across TooLoo.ai services

## Service Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL CLIENTS                                 │
│          (Browser, CLI, Webhooks, External APIs)                        │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTP/REST
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    WEB SERVER (Port 3000)                               │
│              Smart HTTP Gateway + Reverse Proxy                         │
├─────────────────────────────────────────────────────────────────────────┤
│ Local Routes:                       Proxied Routes:                     │
│ • /health, /status                 • /api/v1/training → :3001          │
│ • /.html files (static)            • /api/v1/providers → :3003         │
│ • Middleware (CORS, Auth, etc)     • /api/v1/design → :3006 ✨         │
│ • Local endpoints (legacy)         • /api/v1/segmentation → :3007      │
│                                    • /api/v1/reports → :3008           │
│                                    • /api/v1/capabilities → :3009      │
│                                    • /api/v1/system → :3123            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────────┐
        │                            │                                │
        ↓                            ↓                                ↓
┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ Product Dev      │  │  Training Server     │  │  Other Services      │
│ Server (Port     │  │  (Port 3001)         │  │  (3002-3009, 3123)   │
│ 3006) ✨         │  │                      │  │                      │
├──────────────────┤  ├──────────────────────┤  ├──────────────────────┤
│ Design Routes:   │  │ • /training/overview │  │ Provider Status      │
│ • /import-figma  │  │ • /selection/run     │  │ Orchestration        │
│ • /generate-css  │  │ • /metrics           │  │ Capabilities         │
│ • /tokens        │  │ • /feedback          │  │ Segmentation         │
│ • /apply-tokens  │  │                      │  │ Reports              │
│ • /webhook/*     │  │ (Fast, direct)       │  │                      │
│                  │  │                      │  │ (Specialized)        │
│ Workflow Routes: │  └──────────────────────┘  └──────────────────────┘
│ • /workflows/*   │
│ • /bookworm/*    │
│ • /learning/*    │
└──────────────────┘
        │
        └─→ Figma API (External)
        └─→ File System (data/)
        └─→ Environment Hub
```

## Request/Response Signal Flow: Figma Import Example

### Phase 1: Client Request

```
CLIENT BROWSER / CLI
    │
    ├─ Method: POST
    ├─ Path: /api/v1/design/import-figma
    ├─ Headers: Content-Type: application/json
    └─ Body: {
         "figmaUrl": "https://figma.com/file/abc123/design-system",
         "apiToken": "figd_..."  // Optional
       }
    │
    ↓ (HTTP)
```

### Phase 2: Web Server Gateway (Port 3000)

```
WEB SERVER RECEIVES REQUEST
    │
    ├─ Middleware Stack:
    │  ├─ CORS validation
    │  ├─ Request logging
    │  └─ Body parsing (JSON)
    │
    ├─ Route matching:
    │  └─ Matches: /api/v1/design/* prefix
    │
    ├─ Proxy rules lookup:
    │  └─ Finds config:
    │     {
    │       name: 'product',
    │       prefixes: ['/api/v1/design', ...],
    │       port: 3006,
    │       remoteEnv: REMOTE_PRODUCT_BASE
    │     }
    │
    ├─ Request proxying:
    │  ├─ Strip /api/v1 prefix? No (full path)
    │  ├─ Forward to: http://127.0.0.1:3006/api/v1/design/import-figma
    │  └─ Preserve headers
    │
    └─ Response handling:
       ├─ Receive from product server
       ├─ Add CORS headers
       └─ Return to client
       │
       ↓ (HTTP)
```

**Proxy Configuration in web-server.js (Line 2231-2240):**
```javascript
{ 
  name: 'product', 
  prefixes: ['/api/v1/workflows','/api/v1/learning','/api/v1/analysis',
             '/api/v1/artifacts','/api/v1/showcase','/api/v1/product',
             '/api/v1/bookworm','/api/v1/design'], 
  port: Number(process.env.PRODUCT_PORT||3006), 
  remoteEnv: process.env.REMOTE_PRODUCT_BASE 
}
```

### Phase 3: Product Development Server (Port 3006)

```
PRODUCT SERVER RECEIVES PROXIED REQUEST
    │
    ├─ Express route matching:
    │  └─ this.app.post('/api/v1/design/import-figma', async (req, res) => {
    │
    ├─ Validation phase:
    │  ├─ Extract: figmaUrl, apiToken from req.body
    │  ├─ Check: figmaUrl exists? → 400 if missing
    │  └─ Check: apiToken exists? → 401 if missing
    │
    ├─ FigmaAdapter initialization:
    │  ├─ new FigmaAdapter(token)
    │  └─ Set: this.apiToken = token
    │
    ├─ Design system import flow:
    │  ├─ Call: await figmaAdapter.importDesignSystem(figmaUrl, token)
    │  │    └─ Calls FigmaAdapter methods:
    │  │       ├─ extractFileId(figmaUrl) → "abc123def456"
    │  │       ├─ getFileMetadata(fileId)
    │  │       │  └─ API: GET https://api.figma.com/v1/files/{fileId}
    │  │       │     Headers: X-FIGMA-TOKEN
    │  │       │     Returns: { id, name, version, pages[] }
    │  │       │
    │  │       ├─ getDesignTokens(fileId)
    │  │       │  └─ API: GET https://api.figma.com/v1/files/{fileId}/styles
    │  │       │     Returns: { meta: { styles: [...] } }
    │  │       │     Organizes by type: colors[], typography[], effects[]
    │  │       │
    │  │       ├─ getComponents(fileId)
    │  │       │  └─ API: GET https://api.figma.com/v1/files/{fileId}/components
    │  │       │     Returns: { meta: { components: [...] } }
    │  │       │
    │  │       └─ parseTokensToDesignSystem(tokens, components)
    │  │          └─ Converts to TooLoo format:
    │  │             {
    │  │               colors: { slug: { id, name, source } },
    │  │               typography: { ... },
    │  │               spacing: { xs: "4px", ... },
    │  │               components: { ... },
    │  │               guidelines: { ... }
    │  │             }
    │  │
    │  ├─ Return: {
    │  │     ok: true,
    │  │     fileId, metadata, designSystem, tokensCount, source
    │  │   }
    │
    ├─ Local storage update:
    │  ├─ Deep merge into: this.designSystem
    │  ├─ Persist to: data/design-system/system.json
    │  └─ Save audit to: data/design-system/figma-import-{timestamp}.json
    │
    ├─ Response construction:
    │  └─ res.json({
    │       ok: true,
    │       message: "Design system successfully imported from Figma",
    │       fileId: "abc123def456",
    │       metadata: { name, version, lastModified, thumbnailUrl },
    │       tokensImported: { colors: 24, typography: 8, ... },
    │       designSystemUpdated: { colors: 24, typography: 8, ... },
    │       importFile: "data/design-system/figma-import-*.json"
    │     })
    │
    └─ Response sent to web server
       │
       ↓ (HTTP)
```

### Phase 4: Web Server Response Handling

```
WEB SERVER RECEIVES RESPONSE FROM PRODUCT SERVER
    │
    ├─ Status code: 200 (success) or error code
    ├─ Headers: Add CORS (Access-Control-Allow-*)
    ├─ Body: Pass through JSON response
    │
    └─ Send to client
       │
       ↓ (HTTP)
```

### Phase 5: Client Receives Response

```
CLIENT RECEIVES RESPONSE
    │
    ├─ Check: response.ok === true
    ├─ Extract: fileId, tokensImported, designSystemUpdated
    └─ Next action options:
       ├─ Generate CSS: POST /api/v1/design/generate-css
       ├─ Get tokens: GET /api/v1/design/tokens
       ├─ Apply to UI: POST /api/v1/design/apply-tokens
       └─ Register webhook: POST /api/v1/design/webhook/register
       │
       ↓
```

## Complete Signal Flow Chain: Full Integration

```
┌──────────────────────────────────────────────────────────────────────────┐
│ STEP 1: IMPORT FIGMA DESIGN SYSTEM                                       │
│ POST /api/v1/design/import-figma                                         │
│ Response: { ok, fileId, tokensImported, designSystemUpdated }            │
└──────────┬───────────────────────────────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ STEP 2: GENERATE CSS VARIABLES                                           │
│ POST /api/v1/design/generate-css                                         │
│ ├─ Input: { format: 'inline', minify: false, includeComments: true }    │
│ ├─ Process:                                                              │
│ │  ├─ Import DesignTokenConverter                                        │
│ │  ├─ Extract color tokens → --color-* variables                        │
│ │  ├─ Extract typography → --typography-*-family/size/height            │
│ │  ├─ Extract spacing → --spacing-* variables                           │
│ │  ├─ Extract effects → --effect-* variables                            │
│ │  ├─ Generate :root { ... }                                            │
│ │  └─ Generate utility classes (.bg-primary, .p-md, etc)                │
│ └─ Response: { ok, css, variables, metadata, tokenStats }              │
└──────────┬───────────────────────────────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ STEP 3: APPLY TOKENS TO UI SURFACES                                      │
│ POST /api/v1/design/apply-tokens                                         │
│ ├─ Input: { surface: 'all' | 'validation-dashboard' | 'chat-professional'}
│ ├─ For each surface:                                                     │
│ │  ├─ Read HTML file                                                     │
│ │  ├─ Find or create <style> block                                       │
│ │  ├─ Inject CSS variables with marker comments                          │
│ │  ├─ Save updated HTML                                                  │
│ │  └─ Return status per surface                                          │
│ └─ Response: { ok, message, results: { surface: { ok, file } } }        │
└──────────┬───────────────────────────────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ STEP 4: (OPTIONAL) SETUP AUTO-SYNC WEBHOOK                               │
│ POST /api/v1/design/webhook/register                                     │
│ ├─ Input: { fileKey, apiToken (optional), teamId (optional) }           │
│ ├─ Attempt Figma API: POST /webhooks (requires Team/Enterprise)         │
│ ├─ Response options:                                                     │
│ │  ├─ Auto-registered: { ok: true, webhookId, webhookUrl }              │
│ │  └─ Manual required: { ok: false, registrationMethod, instructions }   │
│ └─ On success: Figma now sends file updates to                           │
│    POST /api/v1/design/webhook/figma                                     │
└──────────┬───────────────────────────────────────────────────────────────┘
           │
           ↓ (Asynchronous, when Figma file changes)
┌──────────────────────────────────────────────────────────────────────────┐
│ STEP 5: AUTOMATIC SYNC ON FILE CHANGE (Webhook)                          │
│ POST /api/v1/design/webhook/figma (Called by Figma)                      │
│ ├─ Figma sends: { type: 'FILE_UPDATE', file_id, file_key }              │
│ ├─ Server responds: { ok: true } (immediately, required by Figma)        │
│ ├─ Asynchronous processing:                                              │
│ │  ├─ Re-import design system                                            │
│ │  ├─ Regenerate CSS                                                     │
│ │  ├─ Re-apply to all surfaces                                           │
│ │  ├─ Log webhook event                                                  │
│ │  └─ Complete within 5 seconds                                          │
│ └─ Result: All UI surfaces have latest design tokens                     │
└──────────────────────────────────────────────────────────────────────────┘

   Client updates Figma file
         │
         ↓
   Figma detects change
         │
         ↓
   Figma sends webhook
         │
         ↓
   TooLoo re-syncs
         │
         ↓
   Next page load/refresh shows latest design
```

## Detailed Route Mapping

### Design Endpoints (Port 3006, proxied via :3000)

| Route | Method | Handler | Purpose |
|-------|--------|---------|---------|
| `/api/v1/design/import-figma` | POST | Real FigmaAdapter calls | Import from Figma (438 lines) |
| `/api/v1/design/generate-css` | POST | DesignTokenConverter | Convert tokens → CSS |
| `/api/v1/design/tokens` | GET | In-memory cache | Retrieve token inventory |
| `/api/v1/design/apply-tokens` | POST | File system writes | Inject CSS into HTML files |
| `/api/v1/design/webhook/figma` | POST | Async re-sync loop | Receive auto-sync webhooks |
| `/api/v1/design/webhook/register` | POST | Figma API call | Register for auto-sync |
| `/api/v1/design/webhook/status` | GET | File system reads | Check webhook history |

### Other Proxied Services

| Service | Port | Prefixes | Purpose |
|---------|------|----------|---------|
| training-server | 3001 | `/api/v1/training` | Model selection, fast rounds |
| meta-server | 3002 | `/api/v1/meta` | Meta-learning, boosting |
| budget-server | 3003 | `/api/v1/providers` | Provider status, policies |
| coach-server | 3004 | `/api/v1/coach` | Auto-Coach, Fast Lane |
| cup-server | 3005 | `/api/v1/cup` | Provider tournaments |
| **product-server** | **3006** | **`/api/v1/design`** | **Design tokens ✨** |
| segmentation | 3007 | `/api/v1/segmentation` | Conversation segmentation |
| reports-server | 3008 | `/api/v1/reports` | Analytics, reporting |
| capabilities | 3009 | `/api/v1/capabilities` | System capabilities |
| orchestrator | 3123 | `/api/v1/system` | System control, start/stop |

## Request Headers & Validation

### Figma API Headers (Internal)
```javascript
{
  'X-FIGMA-TOKEN': process.env.FIGMA_API_TOKEN,
  'User-Agent': 'TooLoo/1.0'
}
```

### HTTP Response Headers (Web Server)
```javascript
{
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
  'Cache-Control': 'no-cache'
}
```

## Error Handling Chain

```
Client Error
    ├─ Invalid Figma URL
    │  └─ Status 400: "Invalid Figma URL. Expected format: ..."
    │
    ├─ Missing API Token
    │  └─ Status 401: "Figma API token required"
    │
    └─ Figma API error
       └─ Status 500: "Figma API error {status}: {errorDetails}"

Server Error
    ├─ File I/O failure
    │  └─ Status 500: "Failed to save design system"
    │
    └─ HTML injection failure
       └─ Status 404: "UI surface file not found"
```

## Performance Metrics

| Operation | Duration | Bottleneck |
|-----------|----------|-----------|
| Figma API calls | ~400ms | Network latency to Figma |
| Token extraction | ~50ms | JSON parsing |
| CSS generation | ~30ms | DesignTokenConverter |
| HTML file writes | ~100ms per file | Disk I/O |
| **Total (import → apply)** | **~600ms** | Figma API |

## State Management

### In-Memory (Runtime)
```javascript
ProductDevelopmentServer.designSystem = {
  colors: { /* extracted tokens */ },
  typography: { /* extracted tokens */ },
  spacing: { /* extracted tokens */ },
  components: { /* extracted tokens */ },
  patterns: {},
  guidelines: {}
}
```

### Persistent (File System)
```
data/design-system/
├─ system.json                    // Current design system
├─ figma-import-{timestamp}.json  // Audit trail
├─ design-tokens-{timestamp}.css  // Generated CSS
└─ webhooks/
   └─ webhook-{timestamp}.json    // Event logs
```

## Concurrency & Threading

- **Import:** Single threaded (async/await)
- **CSS generation:** Single threaded
- **Webhook processing:** Async (doesn't block response)
- **File writes:** Serial (queue via async/await)
- **Multiple UI surfaces:** Parallel with Promise.all

## Security Considerations

1. **Token Protection**
   - FIGMA_API_TOKEN stored in .env (never committed)
   - Only sent to Figma API, not to clients
   - Validated before use

2. **File Access**
   - Limited to `data/` and `web-app/` directories
   - No arbitrary file write capability
   - Path validation on all file operations

3. **Webhook Validation**
   - (Optional) Can validate X-Figma-Signature header
   - Webhook URL should be HTTPS in production
   - Rate limiting recommended for webhooks

## Debugging & Monitoring

### Enable Verbose Logging
```javascript
// In product-development-server.js
constructor() {
  this.verbose = process.env.VERBOSE_DESIGN === 'true';
  if (this.verbose) console.log('Design system initialized');
}
```

### Check Status Endpoints
```bash
# Health check
curl http://127.0.0.1:3006/api/v1/health

# Design tokens status
curl http://127.0.0.1:3000/api/v1/design/tokens

# Webhook history
curl http://127.0.0.1:3000/api/v1/design/webhook/status
```

### Monitor Persisted Data
```bash
# View current design system
cat data/design-system/system.json | jq '.colors | keys'

# Check import history
ls -lah data/design-system/figma-import-*.json

# Verify CSS generation
cat data/design-system/design-tokens-*.css | head -20

# Check webhook events
cat data/design-system/webhooks/webhook-*.json | jq '.status'
```

## Future Enhancements

1. **Token Composition** - Combine multiple Figma files
2. **Token Versioning** - Track changes over time
3. **Usage Analytics** - Which tokens are actually used
4. **Rollback** - Revert to previous versions
5. **Export Formats** - JSON, SCSS, TypeScript, etc.
6. **Design QA** - Verify UI uses imported tokens
7. **Slack Integration** - Notify on design changes
8. **GitHub Integration** - Create PRs with token updates
