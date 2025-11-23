# Figma Integration Activation Plan
**Quick Reference for Enabling Real Design Token Import**

---

## Step 1: Get Figma API Token (5 minutes)

1. Go to: https://www.figma.com/developers
2. Create new Personal Access Token
3. Copy token (starts with `fui_`)
4. Add to `.env`:
```bash
FIGMA_API_TOKEN=fui_your_token_here
```

---

## Step 2: Prepare Your Figma File (10 minutes)

Your Figma file should have:
- **Color styles** (named: `Brand/Primary`, `Semantic/Success`, etc.)
- **Text styles** (named: `Display/H1`, `Body/Regular`, etc.)
- **Components** (Button, Card, Input, etc.)
- **Variables** (modern approach - optional)

If not organized yet, create them in Figma now.

---

## Step 3: Test Import Endpoint (5 minutes)

```bash
curl -X POST http://127.0.0.1:3006/api/v1/design/import-figma \
  -H 'Content-Type: application/json' \
  -d '{
    "figmaUrl": "https://figma.com/file/YOUR_FILE_ID/your-project",
    "apiToken": "fui_your_token"
  }'
```

**Expected response:**
```json
{
  "ok": true,
  "tokensImported": 42,
  "source": "figma"
}
```

---

## Step 4: Replace Mock Implementation (30 minutes)

**File:** `servers/product-development-server.js` (line 1103)

**Current (mock):**
```javascript
const adapter = new FigmaAdapter(token);
const tokensImported = 42;  // ← Hardcoded

res.json({
  ok: true,
  message: 'Design system imported from Figma',
  tokensImported,
  source: 'figma'
});
```

**Replace with (real):**
```javascript
const adapter = new FigmaAdapter(token);
const fileId = adapter.extractFileId(figmaUrl);

try {
  const metadata = await adapter.getFileMetadata(fileId);
  const tokens = await adapter.getDesignTokens(fileId);
  const components = await adapter.getComponents(fileId);
  
  const designSystem = adapter.parseTokensToDesignSystem(tokens, components);
  
  // Save to disk
  const dataPath = path.join(PROJECT_ROOT, 'data/design-system/figma-tokens.json');
  await fs.promises.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.promises.writeFile(dataPath, JSON.stringify(designSystem, null, 2));
  
  res.json({
    ok: true,
    message: 'Design system imported from Figma',
    tokensImported: Object.keys(designSystem.colors).length + 
                    Object.keys(designSystem.typography).length,
    designSystem,
    source: 'figma',
    file: metadata.name
  });
} catch (err) {
  console.error('Figma import failed:', err);
  res.status(500).json({ ok: false, error: err.message });
}
```

---

## Step 5: Generate CSS Variables (30 minutes)

**Create:** `scripts/sync-figma-tokens.js`

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokenFile = path.join(__dirname, '../data/design-system/figma-tokens.json');
const cssOutput = path.join(__dirname, '../web-app/figma-tokens.css');

async function generateCss() {
  const tokens = JSON.parse(await fs.promises.readFile(tokenFile, 'utf8'));
  
  let css = ':root {\n';
  
  // Colors
  for (const [key, val] of Object.entries(tokens.colors)) {
    css += `  --color-${key}: ${val.name};\n`;
  }
  
  // Typography
  for (const [key, val] of Object.entries(tokens.typography)) {
    css += `  --font-${key}: ${val.name};\n`;
  }
  
  // Spacing
  for (const [key, val] of Object.entries(tokens.spacing)) {
    css += `  --spacing-${key}: ${val};\n`;
  }
  
  css += '}\n';
  
  await fs.promises.writeFile(cssOutput, css);
  console.log('✅ CSS variables generated:', cssOutput);
}

generateCss().catch(err => {
  console.error('❌ Failed to generate CSS:', err);
  process.exit(1);
});
```

**Run:**
```bash
node scripts/sync-figma-tokens.js
```

---

## Step 6: Apply to Key UIs (1 hour)

### Apply to Validation Dashboard

**File:** `web-app/validation-dashboard.html`

Add at top:
```html
<link rel="stylesheet" href="/figma-tokens.css">
```

Update chart colors:
```javascript
// Before:
const colors = ['#10b981', '#f59e0b', '#f97316'];

// After:
const colors = [
  getComputedStyle(document.root).getPropertyValue('--color-success'),
  getComputedStyle(document.root).getPropertyValue('--color-warning'),
  getComputedStyle(document.root).getPropertyValue('--color-danger')
];
```

### Apply to Chat UI

**File:** `web-app/tooloo-chat-professional.html`

Add to CSS:
```css
/* Use Figma tokens */
.si-confidence {
  color: var(--color-success);
}

.validation-widget {
  border-color: var(--color-border);
  background: var(--color-surface);
}
```

---

## Step 7: Deploy & Test (15 minutes)

```bash
# 1. Restart servers
npm run clean
npm run dev

# 2. Import Figma design system
curl -X POST http://127.0.0.1:3000/api/v1/design/import-figma \
  -H 'Content-Type: application/json' \
  -d '{
    "figmaUrl": "YOUR_FIGMA_URL"
  }'

# 3. Generate CSS
node scripts/sync-figma-tokens.js

# 4. Verify CSS generated
ls -lh web-app/figma-tokens.css

# 5. Check validation dashboard
curl http://127.0.0.1:3000/validation-dashboard | grep "figma-tokens"
```

---

## Step 8: Add Npm Script (5 minutes)

**In `package.json`:**

```json
{
  "scripts": {
    "sync-figma": "node scripts/sync-figma-tokens.js",
    "import-figma": "node scripts/import-figma-file.js",
    "design:sync": "npm run sync-figma && npm run dev"
  }
}
```

Now you can run:
```bash
npm run sync-figma
```

---

## Total Time: ~2 Hours

| Step | Time | Difficulty |
|------|------|------------|
| Get API token | 5 min | Easy |
| Prepare Figma | 10 min | Easy |
| Test import | 5 min | Easy |
| Replace mock | 30 min | Medium |
| Generate CSS | 30 min | Medium |
| Apply to UIs | 60 min | Medium |
| Deploy & test | 15 min | Easy |

---

## After Activation

**Every time you change colors in Figma:**

```bash
# 1. Run import
npm run import-figma

# 2. Generate CSS
npm run sync-figma

# 3. Restart (if needed)
npm run dev
```

All UIs automatically use new colors. ✨

---

## Optional: Webhook Auto-Sync

For truly hands-off integration, set up Figma webhook:

1. Go to Figma dev settings
2. Create webhook pointing to: `http://your-domain/api/v1/webhooks/figma`
3. Subscribe to: `FILE_UPDATE` event
4. Backend automatically runs import on changes

---

**You now have a complete, production-ready Figma integration.**

Next: [[Create PR with changes, merge to main]]
