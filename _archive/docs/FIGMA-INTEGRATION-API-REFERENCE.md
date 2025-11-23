# Figma Integration API Reference

**Last Updated:** November 19, 2025  
**Status:** ✅ Full implementation complete with real Figma API integration  
**Server:** Product Development Server (Port 3006)

## Overview

The Figma Integration API enables seamless design token import, CSS generation, and automatic UI surface updates. This creates a single source of truth for design decisions, with all UI surfaces inheriting consistency from your Figma design system.

## Architecture

```
Figma Design System
    ↓
[FigmaAdapter] - Fetches tokens from Figma API
    ↓
[DesignTokenConverter] - Converts to CSS variables
    ↓
[ProductDevelopmentServer] - Applies to UI surfaces
    ↓
UI Surfaces (Dashboard, Chat, Control Room)
```

## Core Endpoints

### 1. Import Figma Design System

**Endpoint:** `POST /api/v1/design/import-figma`

**Description:** Imports design system from Figma file, extracting all tokens (colors, typography, spacing, components).

**Request Body:**
```json
{
  "figmaUrl": "https://figma.com/file/YOUR_FILE_ID/design-system",
  "apiToken": "figd_YOUR_TOKEN_HERE"  // Optional - uses FIGMA_API_TOKEN if not provided
}
```

**Response (Success):**
```json
{
  "ok": true,
  "message": "Design system successfully imported from Figma",
  "fileId": "abc123def456",
  "metadata": {
    "name": "TooLoo Design System",
    "version": "v2.1.0",
    "lastModified": "2025-11-19T10:30:00Z",
    "thumbnailUrl": "https://..."
  },
  "tokensImported": {
    "colors": 24,
    "typography": 8,
    "effects": 3,
    "grids": 2,
    "components": 42
  },
  "designSystemUpdated": {
    "colors": 24,
    "typography": 8,
    "components": 42,
    "spacing": 6
  },
  "importFile": "data/design-system/figma-import-1732024200000.json",
  "source": "figma"
}
```

**Error Responses:**
```json
// Missing Figma URL
{ "ok": false, "error": "figmaUrl required" }

// Invalid API token
{
  "ok": false,
  "error": "Figma API token required",
  "hint": "Provide apiToken in request body or set FIGMA_API_TOKEN environment variable"
}

// Invalid Figma URL format
{
  "ok": false,
  "error": "Invalid Figma URL. Expected format: https://figma.com/file/{FILE_ID}"
}
```

**cURL Example:**
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/import-figma \
  -H 'Content-Type: application/json' \
  -d '{
    "figmaUrl": "https://figma.com/file/abc123/design-system",
    "apiToken": "figd_YOUR_TOKEN"
  }'
```

---

### 2. Generate CSS Variables

**Endpoint:** `POST /api/v1/design/generate-css`

**Description:** Converts imported design tokens to CSS custom properties (CSS variables). Supports multiple output formats.

**Request Body:**
```json
{
  "format": "inline",        // Options: "file", "inline", "json"
  "minify": false,           // Minify CSS output
  "includeComments": true    // Include CSS comments
}
```

**Response (Format: "inline"):**
```json
{
  "ok": true,
  "message": "CSS variables generated",
  "css": ":root {\n  --color-primary: #6c5ce7;\n  --color-secondary: #00d4ff;\n  ...\n}",
  "variables": {
    "--color-primary": "#6c5ce7",
    "--color-secondary": "#00d4ff",
    "--spacing-sm": "8px",
    "--typography-heading-family": "Segoe UI, system-ui"
  },
  "metadata": {
    "--color-primary": {
      "value": "#6c5ce7",
      "name": "Primary Color",
      "category": "color",
      "source": "figma"
    }
  },
  "tokenStats": {
    "totalVariables": 52,
    "colors": 24,
    "typography": 8,
    "spacing": 6,
    "effects": 3
  }
}
```

**Response (Format: "file"):**
```json
{
  "ok": true,
  "message": "CSS generated and saved",
  "file": "data/design-system/design-tokens-1732024200000.css",
  "cssFileContent": ":root { --color-primary: #6c5ce7; ...",
  "tokenStats": { ... }
}
```

**Response (Format: "json"):**
```json
{
  "ok": true,
  "message": "CSS variables exported as JSON",
  "variables": { ... },
  "metadata": { ... },
  "tokenStats": { ... }
}
```

**cURL Example:**
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/generate-css \
  -H 'Content-Type: application/json' \
  -d '{"format": "inline", "includeComments": true}'
```

---

### 3. Get All Design Tokens

**Endpoint:** `GET /api/v1/design/tokens?category=colors`

**Description:** Retrieves extracted design tokens organized by category.

**Query Parameters:**
- `category` (optional): Filter by category - `colors`, `typography`, `spacing`, `components`, `patterns`, `effects`, `guidelines`

**Response (All Categories):**
```json
{
  "ok": true,
  "tokens": {
    "colors": {
      "primary": { "id": "123", "name": "Primary", "source": "figma" },
      "secondary": { "id": "124", "name": "Secondary", "source": "figma" }
    },
    "typography": {
      "heading-xl": { "id": "200", "name": "Heading XL", "source": "figma" },
      "body-md": { "id": "201", "name": "Body MD", "source": "figma" }
    },
    "spacing": { ... },
    "_meta": {
      "totalCategories": 7,
      "totalTokens": 79
    }
  }
}
```

**Response (Filtered by Category):**
```json
{
  "ok": true,
  "tokens": {
    "colors": {
      "primary": { ... },
      "secondary": { ... }
    },
    "_meta": {
      "category": "colors",
      "count": 24
    }
  }
}
```

**cURL Example:**
```bash
# Get all tokens
curl http://127.0.0.1:3000/api/v1/design/tokens

# Get only color tokens
curl http://127.0.0.1:3000/api/v1/design/tokens?category=colors
```

---

### 4. Apply Tokens to UI Surfaces

**Endpoint:** `POST /api/v1/design/apply-tokens`

**Description:** Injects CSS variables into specified UI surfaces (HTML files). Updates existing injections or creates new style blocks.

**Request Body:**
```json
{
  "surface": "validation-dashboard",  // Options: "validation-dashboard", "chat-professional", "control-room", "design-suite", "all"
  "format": "css"                      // Currently supports "css"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Design tokens applied to UI surfaces",
  "results": {
    "validation-dashboard": {
      "ok": true,
      "message": "Tokens applied",
      "file": "web-app/validation-dashboard.html"
    },
    "chat-professional": {
      "ok": true,
      "message": "Tokens applied",
      "file": "web-app/chat-professional.html"
    }
  },
  "timestamp": "2025-11-19T10:35:22Z"
}
```

**Apply to All Surfaces:**
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/apply-tokens \
  -H 'Content-Type: application/json' \
  -d '{"surface": "all"}'
```

**Apply to Specific Surface:**
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/apply-tokens \
  -H 'Content-Type: application/json' \
  -d '{"surface": "validation-dashboard"}'
```

---

## Webhook Integration

### 5. Receive Figma File Changes (Webhook)

**Endpoint:** `POST /api/v1/design/webhook/figma`

**Description:** Receives file change notifications from Figma and automatically re-syncs the design system. This is called by Figma, not by clients directly.

**Figma Webhook Payload:**
```json
{
  "type": "FILE_UPDATE",
  "file_id": "abc123def456",
  "file_key": "file_key_from_figma",
  "timestamp": "2025-11-19T10:35:22Z"
}
```

**Server Response:**
```json
{
  "ok": true,
  "message": "Webhook acknowledged",
  "eventId": 1732024122000
}
```

**What Happens Next (Async):**
- Re-imports design system from Figma
- Regenerates CSS variables
- Auto-applies tokens to all UI surfaces
- Logs webhook processing status

---

### 6. Register Figma Webhook

**Endpoint:** `POST /api/v1/design/webhook/register`

**Description:** Attempts to register automatic webhook for your Figma file. Requires Team/Enterprise permissions or provides manual registration instructions.

**Request Body:**
```json
{
  "fileKey": "abc123def456",           // Figma file key
  "apiToken": "figd_YOUR_TOKEN",       // Optional - uses FIGMA_API_TOKEN if not provided
  "teamId": "team_123"                 // Optional - required for Team-level webhooks
}
```

**Response (Auto-Registered):**
```json
{
  "ok": true,
  "message": "Figma webhook registered successfully",
  "webhookId": "webhook_abc123",
  "webhookUrl": "http://127.0.0.1:3006/api/v1/design/webhook/figma",
  "fileKey": "abc123def456",
  "eventType": "FILE_UPDATE"
}
```

**Response (Manual Registration Required):**
```json
{
  "ok": false,
  "error": "Webhook registration requires Team/Enterprise permissions",
  "registrationMethod": "manual",
  "instructions": {
    "step1": "Go to https://www.figma.com/developers/webhooks",
    "step2": "Create a new webhook for your team",
    "step3": "Set webhook URL to: http://127.0.0.1:3006/api/v1/design/webhook/figma",
    "step4": "Select FILE_UPDATE event type"
  },
  "fileKey": "abc123def456"
}
```

**cURL Example:**
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/webhook/register \
  -H 'Content-Type: application/json' \
  -d '{
    "fileKey": "abc123def456",
    "apiToken": "figd_YOUR_TOKEN",
    "teamId": "team_123"
  }'
```

---

### 7. Check Webhook Status

**Endpoint:** `GET /api/v1/design/webhook/status`

**Description:** Retrieves webhook registration status and recent webhook events.

**Response:**
```json
{
  "ok": true,
  "webhookEndpoint": "http://127.0.0.1:3006/api/v1/design/webhook/figma",
  "recentWebhooks": [
    {
      "timestamp": "2025-11-19T10:35:22Z",
      "event": "FILE_UPDATE",
      "fileId": "abc123def456",
      "fileKey": "file_key",
      "processed": true,
      "processedAt": "2025-11-19T10:35:25Z",
      "status": "success"
    }
  ],
  "totalProcessed": 5
}
```

**cURL Example:**
```bash
curl http://127.0.0.1:3000/api/v1/design/webhook/status
```

---

## Environment Variables

Required for Figma integration:

```bash
# Figma API Token (get from https://figma.com/developers/api)
FIGMA_API_TOKEN=figd_YOUR_TOKEN_HERE

# Webhook base URL (for auto-sync)
WEBHOOK_BASE_URL=http://127.0.0.1:3006

# Optional: Webhook signature secret (for validation)
FIGMA_WEBHOOK_SECRET=your_webhook_secret
```

---

## Integration Flow

### One-Time Setup

```
1. Get Figma API token from https://figma.com/developers/api
2. Set FIGMA_API_TOKEN in .env
3. POST /api/v1/design/import-figma with your Figma file URL
4. POST /api/v1/design/generate-css to create CSS variables
5. POST /api/v1/design/apply-tokens?surface=all to update UI
6. (Optional) POST /api/v1/design/webhook/register for auto-sync
```

### Auto-Sync Flow (After Webhook Setup)

```
Developer edits Figma file
    ↓
Figma sends webhook → /api/v1/design/webhook/figma
    ↓
TooLoo re-imports design system
    ↓
CSS regenerated
    ↓
UI surfaces auto-updated
    ↓
All dashboards reflect changes in < 5 seconds
```

---

## Token Structure

### Color Token Example
```javascript
{
  "primary": {
    "id": "S:123abc",
    "name": "Primary Color",
    "description": "Main brand color",
    "source": "figma",
    "tokenType": "FILL",
    "value": "#6c5ce7"
  }
}
```

### Typography Token Example
```javascript
{
  "heading-xl": {
    "id": "S:456def",
    "name": "Heading XL",
    "source": "figma",
    "fontFamily": "Segoe UI, -apple-system, sans-serif",
    "fontSize": "32px",
    "lineHeight": "1.3",
    "fontWeight": "600",
    "letterSpacing": "-0.02em"
  }
}
```

### Generated CSS Variable
```css
:root {
  /* Color tokens */
  --color-primary: #6c5ce7;
  --color-secondary: #00d4ff;

  /* Typography tokens */
  --typography-heading-xl-family: "Segoe UI", -apple-system, sans-serif;
  --typography-heading-xl-size: 32px;
  --typography-heading-xl-height: 1.3;
  --typography-heading-xl-weight: 600;

  /* Spacing tokens */
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
}

/* Utility Classes */
.bg-primary { background-color: var(--color-primary); }
.text-primary { color: var(--color-primary); }
.p-md { padding: var(--spacing-md); }
.shadow-drop { box-shadow: var(--effect-drop); }
```

---

## UI Surfaces Supported

| Surface | Path | Description |
|---------|------|-------------|
| Validation Dashboard | `web-app/validation-dashboard.html` | Real-time validation metrics |
| Chat Professional | `web-app/chat-professional.html` | Multi-provider chat interface |
| Control Room | `web-app/control-room-clarity.html` | System orchestration UI |
| Design Suite | `web-app/design-suite.html` | Design system editor |

---

## Error Handling

All endpoints follow this error format:

```json
{
  "ok": false,
  "error": "Error description",
  "hint": "Suggestion for resolution"
}
```

Common errors:

| Error | Cause | Resolution |
|-------|-------|-----------|
| `Figma API token required` | FIGMA_API_TOKEN not set | Add token to .env or request body |
| `Invalid Figma URL` | Wrong URL format | Use: `https://figma.com/file/{FILE_ID}` |
| `No design system loaded` | Never imported Figma file | Run import-figma endpoint first |
| `File not found` | UI surface HTML missing | Check file path in data/design-system |

---

## Performance & Caching

- **Token Extraction:** ~500ms per file
- **CSS Generation:** ~50ms
- **UI Surface Updates:** ~200ms per file
- **Webhook Processing:** Async (responds immediately)

Tokens are cached in memory and persisted to:
- `data/design-system/system.json` (main design system)
- `data/design-system/figma-import-*.json` (import audit trail)
- `data/design-system/design-tokens-*.css` (generated CSS files)
- `data/design-system/webhooks/` (webhook event logs)

---

## Development & Testing

### Quick Start
```bash
# 1. Start system
npm run dev

# 2. Import Figma design
curl -X POST http://127.0.0.1:3000/api/v1/design/import-figma \
  -H 'Content-Type: application/json' \
  -d '{
    "figmaUrl": "https://figma.com/file/YOUR_FILE_ID/design-system",
    "apiToken": "figd_YOUR_TOKEN"
  }'

# 3. Generate CSS
curl -X POST http://127.0.0.1:3000/api/v1/design/generate-css \
  -H 'Content-Type: application/json' \
  -d '{"format": "inline"}'

# 4. Apply to UI
curl -X POST http://127.0.0.1:3000/api/v1/design/apply-tokens \
  -H 'Content-Type: application/json' \
  -d '{"surface": "all"}'

# 5. View results in browser
open http://127.0.0.1:3000/validation-dashboard
```

### Testing Webhooks Locally

```bash
# Use ngrok for local webhook testing
ngrok http 3006

# Update WEBHOOK_BASE_URL in .env to ngrok URL

# Register webhook with ngrok URL
curl -X POST http://127.0.0.1:3000/api/v1/design/webhook/register \
  -H 'Content-Type: application/json' \
  -d '{
    "fileKey": "YOUR_FILE_KEY",
    "apiToken": "figd_YOUR_TOKEN"
  }'

# Edit Figma file and watch webhooks arrive
curl http://127.0.0.1:3000/api/v1/design/webhook/status
```

---

## Next Steps

- ✅ Real Figma API integration
- ✅ CSS variable generation
- ✅ Auto-apply to UI surfaces
- ✅ Webhook auto-sync
- 🔜 Design token versioning & rollback
- 🔜 Design token usage analytics
- 🔜 Design audit trail (who changed what when)
- 🔜 Multi-file design system composition
