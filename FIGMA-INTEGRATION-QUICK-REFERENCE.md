# Quick Reference: Figma → TooLoo Integration

## What You Now Have (All 3 Implementations)

### ✅ 1. Real-Time Design Studio UI
**File:** `/web-app/design-studio.html`  
**Access:** http://127.0.0.1:3000/design-studio.html

**Features:**
- Live Figma file input
- Real-time token extraction
- Stream output showing token generation
- Design statistics dashboard
- CSS variable generation
- One-click token application

**How it Works:**
```
You → Paste Figma URL → ▶ Generate from Figma
                          ↓
                    Tokens stream in real-time
                          ↓
                    CSS variables generated
                          ↓
                    UI updates live
```

---

### ✅ 2. Automated Demo Script
**File:** `/scripts/demo-figma-integration.js`  
**Run:**
```bash
# With API token in environment
export FIGMA_API_TOKEN="your-token"
node scripts/demo-figma-integration.js "https://www.figma.com/file/ABC123/YourDesignSystem"

# Or pass token as argument
node scripts/demo-figma-integration.js "https://www.figma.com/file/ABC123/YourDesignSystem" "your-token"
```

**Demo Shows:**
1. ✓ Server health check
2. ✓ Figma import (tokens extracted)
3. ✓ CSS generation (variables created)
4. ✓ UI application (tokens injected)
5. ✓ Design system export (ready to download)
6. ✓ Webhook setup (real-time sync)
7. ✓ Complete workflow visualization

**Output Example:**
```
🎨 TooLoo.ai — Figma Integration Demo
Real-Time Design Generation & Sharing

   Step 0: Checking TooLoo server health...
   ✓ Server is healthy

   Step 1: Sending Figma file URL to TooLoo
   ✓ Design system imported from Figma
     Colors: 42
     Typography: 18
     Components: 32

   Step 2: Converting design tokens to CSS custom properties
   ✓ CSS variables generated
     Variables count: 104

   Step 3: Injecting design system into active UI
   ✓ Design tokens applied to UI
     Elements updated: 127

   ...and more
```

---

### ✅ 3. Complete Workflow Documentation
**File:** `/FIGMA-TOOLOO-WORKFLOW-COMPLETE.md`  
**Contains:**
- Full API reference for all endpoints
- Step-by-step workflow breakdown
- Code examples (cURL, JavaScript, React)
- Integration patterns
- File structure guide
- Troubleshooting section
- Performance notes

---

## How It Compares to Chat

| Aspect | Chat Interface | Design Studio |
|--------|---|---|
| **UI** | `control-room.html` | `design-studio.html` |
| **Input** | Text prompt | Figma file URL |
| **Streaming** | Token-by-token text | Token-by-token design |
| **Output** | Markdown/code | CSS variables |
| **Real-time** | Per-message | Per-file-change |
| **Export** | Copy/paste | Download JSON |

**Key Insight:** Both follow the **same streaming pattern**:
```
Input → Tokenize → Stream → Collect → Output
```

Chat: "Create a button" → Word tokens → Display text
Design: Figma file → Color/type tokens → Apply CSS

---

## The 3 Phases, Explained

### Phase 1: Demo Script
**Use:** When you want to **see the full workflow** in your terminal
```bash
node scripts/demo-figma-integration.js "https://www.figma.com/file/ABC123/..."
```
Shows all 6 steps, perfect for **understanding how everything flows together**.

---

### Phase 2: Design Studio UI
**Use:** When you want **interactive real-time generation** in the browser
```
Navigate to: http://127.0.0.1:3000/design-studio.html
Paste Figma URL → Click button → Watch tokens appear live
```
Perfect for **experimentation and manual control**.

---

### Phase 3: Full Workflow Docs
**Use:** When you want **technical details and integration patterns**
```
Read: FIGMA-TOOLOO-WORKFLOW-COMPLETE.md
Use: As a reference for custom integrations
```
Perfect for **building on top of the system**.

---

## Quick Start (Choose Your Path)

### Path A: See It Work (2 minutes)
```bash
# 1. Start TooLoo
npm run dev

# 2. Run demo script (shows everything)
export FIGMA_API_TOKEN="your-token"
node scripts/demo-figma-integration.js "https://www.figma.com/file/YOUR_FILE_ID/..."

# Output shows all 6 phases running automatically
```

---

### Path B: Try Interactive UI (3 minutes)
```bash
# 1. Start TooLoo
npm run dev

# 2. Open Design Studio in browser
# Navigate to: http://127.0.0.1:3000/design-studio.html

# 3. Paste Figma URL and click "Generate from Figma"

# 4. Watch tokens stream in real-time
```

---

### Path C: Integrate Into Your Project (30 minutes)
```bash
# 1. Read the workflow guide
cat FIGMA-TOOLOO-WORKFLOW-COMPLETE.md

# 2. Get Figma API token from https://figma.com/developers

# 3. Call endpoints from your app:
#    - POST /api/v1/design/import-figma
#    - POST /api/v1/design/generate-css
#    - POST /api/v1/design/apply-tokens
#    - POST /api/v1/design/export

# 4. Example: Import and apply in JavaScript
const response = await fetch('/api/v1/design/import-figma', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    figmaUrl: "https://www.figma.com/file/ABC123/...",
    apiToken: process.env.FIGMA_API_TOKEN
  })
});
const { designSystemUpdated } = await response.json();
console.log(`Imported ${designSystemUpdated.colors} colors`);
```

---

## API Endpoints (7 Total)

All under `/api/v1/design/`:

```
POST /import-figma        → Import from Figma file
POST /generate-css        → Create CSS variables
POST /apply-tokens        → Inject into UI
POST /export              → Download design system
POST /webhook/register    → Set up real-time sync
POST /webhook/figma       → Receive Figma changes (auto)
GET  /system              → Get current design system
```

---

## Files Created

```
✓ scripts/demo-figma-integration.js
  └─ 450+ lines, full demo with colored output

✓ web-app/design-studio.html
  └─ 600+ lines, real-time UI with streaming

✓ FIGMA-TOOLOO-WORKFLOW-COMPLETE.md
  └─ 450+ lines, complete reference guide
```

---

## Key Takeaways

1. **Figma Integration is Real** — Not a mockup, actual working API integration
2. **Real-Time Generation** — Just like chat, but for design tokens
3. **Streaming Pattern** — Same architecture as conversation streaming
4. **Multiple Access Methods** — Script, UI, or API calls
5. **Production Ready** — All endpoints tested and documented

---

## Next Steps

### Immediate (Now)
- [ ] Open Design Studio: http://127.0.0.1:3000/design-studio.html
- [ ] Get Figma API token: https://figma.com/developers
- [ ] Test with your design file

### Short Term (Today)
- [ ] Run demo script to see full workflow
- [ ] Try importing your Figma design system
- [ ] Export and inspect the generated CSS

### Medium Term (This Week)
- [ ] Integrate design system into your project
- [ ] Set up Figma webhooks for real-time sync
- [ ] Build custom design processors if needed

### Long Term
- [ ] Use design studio in your team workflow
- [ ] Automate design-to-code pipeline
- [ ] Combine with chat for AI-guided design

---

**Status:** ✨ All 3 implementations complete and ready to use!

For detailed technical information, see `FIGMA-TOOLOO-WORKFLOW-COMPLETE.md`
