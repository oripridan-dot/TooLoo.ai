# Figma → TooLoo → Your App: Complete Real-Time Design Workflow

## Overview

This guide shows you how to connect Figma design files to TooLoo.ai and use the real-time design generation system to generate, preview, and export design tokens—just like chat generates responses token-by-token.

**Key Difference from Traditional Workflows:**
- ❌ Old: Design in Figma → Export manually → Convert to code → Apply to UI
- ✅ New: Design in Figma → TooLoo auto-imports → Tokens stream → UI updates live

---

## Quick Start (3 minutes)

### 1. Start TooLoo with Design Capabilities

```bash
npm run dev
```

This starts:
- Web Server (port 3000) — Control Room + Design Studio
- Product Development Server (port 3006) — Design processing
- Orchestrator (port 3123) — Service coordination

### 2. Open Design Studio

Navigate to: **http://127.0.0.1:3000/design-studio.html**

You'll see a real-time interface with:
- **Input Panel** — Figma file URL, design brief, target elements
- **Token Grid** — Live preview of extracted design tokens
- **Stream Output** — Real-time token generation log
- **Statistics** — Colors, typography, components counts

### 3. Import a Figma File

Option A: Use an existing Figma file
```
Figma URL: https://www.figma.com/file/YOUR_FILE_ID/YourDesignSystem
Click: ▶ Generate from Figma
```

Option B: Test with demo script
```bash
node scripts/demo-figma-integration.js "https://www.figma.com/file/YOUR_FILE_ID/YourDesignSystem"
```

---

## Full Workflow Breakdown

### Phase 1: Import Design Tokens from Figma

**Endpoint:** `POST /api/v1/design/import-figma`

**What Happens:**
1. TooLoo calls Figma API with your file URL
2. Extracts design tokens: colors, typography, spacing, components
3. Structures them into a unified design system
4. Saves to `/data/design-system/system.json`

**cURL Example:**
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/import-figma \
  -H "Content-Type: application/json" \
  -d '{
    "figmaUrl": "https://www.figma.com/file/ABC123/MyDesignSystem",
    "apiToken": "YOUR_FIGMA_API_TOKEN"
  }'
```

**Response:**
```json
{
  "ok": true,
  "message": "Design system successfully imported from Figma",
  "tokensImported": 245,
  "designSystemUpdated": {
    "colors": 42,
    "typography": 18,
    "components": 32,
    "spacing": 12
  },
  "metadata": {
    "name": "MyDesignSystem",
    "version": "1.2.3",
    "lastModified": "2025-11-19T10:30:00Z"
  }
}
```

### Phase 2: Generate CSS Variables from Tokens

**Endpoint:** `POST /api/v1/design/generate-css`

**What Happens:**
1. Takes extracted design tokens
2. Converts to CSS custom properties (variables)
3. Generates optimized CSS file
4. Streams variables as they're created

**cURL Example:**
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/generate-css \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**
```json
{
  "ok": true,
  "variablesCount": 104,
  "cssFile": "/data/design-system/variables.css",
  "cssContent": ":root {\n  --color-primary: #7c5cff;\n  --color-accent: #00e9b0;\n  --spacing-xs: 4px;\n  ...\n}"
}
```

**Generated CSS (Sample):**
```css
:root {
  /* Brand Colors */
  --color-brand: #7c5cff;
  --color-brand-2: #00e9b0;
  --color-accent: #ffe770;
  --color-danger: #ff5c7c;

  /* Typography */
  --font-display: 'Playfair Display', serif;
  --font-body: 'Inter', sans-serif;
  --font-size-h1: 54px;
  --font-size-body: 16px;
  --font-weight-bold: 700;

  /* Spacing System */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 40px;

  /* Shadows */
  --shadow-sm: 0 2px 6px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 10px 30px rgba(0, 0, 0, 0.5);
}
```

### Phase 3: Apply Tokens to UI in Real-Time

**Endpoint:** `POST /api/v1/design/apply-tokens`

**What Happens:**
1. Injects CSS into browser via `<style>` tag
2. Applies to target elements immediately
3. No page reload needed
4. Updates propagate to all child elements

**cURL Example:**
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/apply-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "targetElements": "[data-design-system]"
  }'
```

**In HTML, use the data attribute:**
```html
<body data-design-system>
  <header>
    <h1 style="color: var(--color-brand)">My App</h1>
    <button style="background: var(--color-accent)">Generate Design</button>
  </header>
</body>
```

**Response:**
```json
{
  "ok": true,
  "elementsUpdated": 127,
  "cssInjected": true,
  "message": "Design tokens applied to UI"
}
```

### Phase 4: Export Design System for Distribution

**Endpoint:** `POST /api/v1/design/export`

**What Happens:**
1. Packages design system as JSON
2. Includes all tokens, presets, guidelines
3. Ready to download and share
4. Import into other projects or tools

**cURL Example:**
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/export \
  -H "Content-Type: application/json" \
  -d '{"format": "json", "includePresets": true}'
```

**Response (Sample):**
```json
{
  "ok": true,
  "exportFile": "/data/design-system/export-2025-11-19.json",
  "fileSize": "45.2 KB",
  "downloadUrl": "/api/v1/design/download/export-2025-11-19.json",
  "designSystem": {
    "metadata": {
      "name": "MyDesignSystem",
      "version": "1.2.3",
      "exportedAt": "2025-11-19T10:30:00Z"
    },
    "colors": {...},
    "typography": {...},
    "spacing": {...},
    "components": {...}
  }
}
```

### Phase 5: Real-Time Sync via Figma Webhooks

**Endpoint:** `POST /api/v1/design/webhook/register`

**What Happens:**
1. Registers webhook with Figma
2. Listens for file changes
3. Auto-imports updated tokens
4. Regenerates CSS and reapplies to UI
5. All without page reload

**Setup:**
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/webhook/register \
  -H "Content-Type: application/json" \
  -d '{
    "figmaFileId": "ABC123",
    "webhookUrl": "http://127.0.0.1:3000/api/v1/design/webhook/figma"
  }'
```

**Webhook Receiver:** `POST /api/v1/design/webhook/figma`

When Figma file changes:
```json
{
  "type": "FILE_UPDATE",
  "fileId": "ABC123",
  "timestamp": "2025-11-19T10:30:00Z",
  "changes": ["LIBRARY_PUBLISH"]
}
```

TooLoo automatically:
1. Detects the webhook
2. Re-imports the file
3. Regenerates CSS
4. Updates tokens in browser
5. No manual intervention needed

---

## Integration Patterns

### Pattern 1: Chat-Driven Design Generation

**Use Case:** Generate design system from natural language

```bash
# In Chat Control Room:
"Create a modern SaaS design system with purple gradients, clean typography, and Figma integration"

# TooLoo returns:
1. Design brief analysis
2. Figma template link
3. Auto-import tokens
4. CSS generation
5. Live preview
```

### Pattern 2: Figma → Component Library

**Workflow:**
```
Figma File (with components) 
  ↓ (POST /api/v1/design/import-figma)
Design Tokens
  ↓ (POST /api/v1/design/generate-css)
CSS Variables
  ↓ (POST /api/v1/design/export)
JSON Design System
  ↓ (Use in React/Vue/Angular)
Type-Safe Components
```

**Example React Integration:**
```jsx
import designSystem from './design-system.json';

const Button = ({ children, variant = 'primary' }) => (
  <button
    style={{
      background: designSystem.colors[variant],
      padding: designSystem.spacing.md,
      fontFamily: designSystem.typography.body.font
    }}
  >
    {children}
  </button>
);
```

### Pattern 3: Live Design Iteration

**Real-Time Loop:**
```
1. Edit in Figma
   ↓ (webhook fires)
2. Tokens auto-import
   ↓ (instantaneous)
3. CSS regenerates
   ↓ (no refresh needed)
4. UI updates live
   ↓ (see changes immediately)
5. Test in browser
   ↓ (feedback loop)
6. Iterate...
```

---

## API Reference: All Design Endpoints

| Endpoint | Method | Purpose | Input |
|----------|--------|---------|-------|
| `/api/v1/design/import-figma` | POST | Import tokens from Figma | `{ figmaUrl, apiToken? }` |
| `/api/v1/design/generate-css` | POST | Generate CSS from tokens | `{}` |
| `/api/v1/design/apply-tokens` | POST | Inject CSS into UI | `{ targetElements? }` |
| `/api/v1/design/export` | POST | Export design system | `{ format, includePresets? }` |
| `/api/v1/design/webhook/register` | POST | Register Figma webhook | `{ figmaFileId, webhookUrl }` |
| `/api/v1/design/webhook/figma` | POST | Webhook receiver | (Figma payload) |
| `/api/v1/design/system` | GET | Get current design system | - |
| `/api/v1/design/tokens` | GET | Get all tokens | - |
| `/api/v1/design/download/:file` | GET | Download export | - |

---

## File Structure

```
TooLoo.ai/
├── data/design-system/
│   ├── system.json                 # Master design system
│   ├── variables.css               # Generated CSS variables
│   ├── figma-import-*.json         # Import metadata
│   └── export-*.json               # Design system exports
│
├── web-app/
│   ├── design-studio.html          # Real-time UI
│   ├── design-demo.html            # Showcase
│   └── control-room.html           # Chat interface
│
├── servers/
│   ├── product-development-server.js  # Design endpoints
│   ├── web-server.js                  # API proxy
│   └── orchestrator.js                # Service coordination
│
├── lib/adapters/
│   └── figma-adapter.js            # Figma API client
│
└── scripts/
    └── demo-figma-integration.js    # Full demo script
```

---

## Comparison: Chat vs. Design Generation

| Feature | Chat Generation | Design Generation |
|---------|-----------------|-------------------|
| **Input** | Natural language prompt | Figma design file |
| **Streaming** | Text tokens → message | Design tokens → CSS |
| **Processing** | LLM inference | Figma API extraction |
| **Output Format** | Markdown, code, text | CSS variables, JSON system |
| **UI Update** | Append to message box | Inject CSS, update elements |
| **Real-time Sync** | Per-message | Per-file-change (webhooks) |
| **Sharing** | Copy/paste, links | Download design system |
| **Revision Cycle** | Regenerate whole message | Update only changed tokens |

---

## Troubleshooting

### "Figma API token required"
```bash
# Solution 1: Provide in request
curl -X POST http://127.0.0.1:3000/api/v1/design/import-figma \
  -H "Content-Type: application/json" \
  -d '{"figmaUrl": "...", "apiToken": "YOUR_TOKEN"}'

# Solution 2: Set environment variable
export FIGMA_API_TOKEN="your-token"
npm run dev
```

### "Design tokens not updating in UI"
```bash
# Check if tokens are applied
curl http://127.0.0.1:3000/api/v1/design/system

# Re-apply tokens manually
curl -X POST http://127.0.0.1:3000/api/v1/design/apply-tokens

# Verify HTML has data-design-system attribute
<body data-design-system>
```

### "Webhook not triggering"
1. Check Figma file permissions (need edit access)
2. Verify public sharing is enabled
3. Test with import endpoint first
4. Check server logs for webhook errors

---

## Next Steps

1. **Get Figma API Token**
   - Go to https://figma.com/developers
   - Create new token with "file:read" scope
   - Save to `FIGMA_API_TOKEN` env variable

2. **Create or Use Existing Figma File**
   - Design system, component library, or UI kit
   - Must have components + design tokens set up

3. **Open Design Studio**
   - http://127.0.0.1:3000/design-studio.html
   - Paste Figma file URL
   - Click "Generate from Figma"

4. **Watch Real-Time Generation**
   - See tokens stream in output
   - Preview colors and typography
   - Check statistics panel

5. **Export & Integrate**
   - Download design system JSON
   - Use in your project
   - Connect to React/Vue/etc.

---

## Advanced: Custom Design Processors

You can extend the design system with custom processors:

```javascript
// In product-development-server.js
class CustomDesignProcessor {
  async processTokens(tokens) {
    // Your custom logic here
    // E.g., validate accessibility, optimize colors, generate docs
    return processedTokens;
  }
}

const processor = new CustomDesignProcessor();
const result = await processor.processTokens(this.designSystem);
```

---

## Performance Notes

- **Import Time:** ~2-5s for typical design file
- **CSS Generation:** <1s (in-memory)
- **Token Application:** Instant (no page reload)
- **Webhook Latency:** ~500ms from Figma change to UI update
- **Export Size:** 20-100 KB (depending on system size)

---

**Questions?** Check `/api/v1/design/system` endpoint for current state or open an issue on GitHub.
