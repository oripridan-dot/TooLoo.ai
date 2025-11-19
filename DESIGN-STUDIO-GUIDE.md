# 🎨 TooLoo Design Studio - Quick Start Guide

## What Is The Design Studio?

The **Design Studio** is a real-time design token generation and management interface that allows you to:
- Import design systems from Figma
- Generate CSS variables from design tokens
- Stream tokens in real-time to UI components
- Manage colors, typography, spacing, components, and design guidelines

## Quick Demo (No Figma File Needed)

### Step 1: Load Sample Design Data
Run this command to load sample design tokens:

```bash
curl -X POST http://localhost:3000/api/v1/design/load-sample
```

**Response includes:**
- 13 color tokens (primary, secondary, accents, etc.)
- 12 typography tokens (fonts, sizes, weights)
- 9 spacing tokens (scales from 0 to 64px)
- 6 component patterns (buttons, inputs, cards)
- 4 pattern guidelines
- 4 design guidelines (breakpoints, touch targets)

### Step 2: Stream Design Tokens
Open Design Studio and click **⚡ Stream Tokens**

You'll see real-time streaming of all 50 tokens:
```
📊 Total Tokens: 50
📁 Categories: colors, typography, spacing, components, patterns, guidelines

📂 COLORS (13 tokens)
  • primary: #7c5cff
  • primary-light: #9d8cff
  • secondary: #00e9b0
  ...and more
```

### Step 3: Use with Your Own Figma File

If you have a Figma file:

1. Get your Figma file URL: `https://figma.com/file/{FILE_ID}/...`
2. Set your Figma API token (optional, for full access)
3. Paste URL in "Figma File URL" field
4. Click **▶ Generate from Figma**

The studio will:
- Import your design tokens
- Extract colors, typography, components
- Generate CSS variables
- Show real-time generation progress

## API Reference

### Load Sample Design System
```bash
POST /api/v1/design/load-sample

# Returns: 50 sample tokens
```

### Stream Design Tokens (SSE - Server-Sent Events)
```bash
curl -N http://localhost:3000/api/v1/design/stream

# Returns real-time events:
# - meta: Total token count and categories
# - category: Category header with count
# - token: Individual token (key, value, category)
# - done: Completion status
```

### Get All Tokens
```bash
GET /api/v1/design/tokens

# Returns: Complete token object
```

### Generate CSS Variables
```bash
POST /api/v1/design/generate-css

# Returns: Generated CSS file path and content
```

### Apply Tokens to UI
```bash
POST /api/v1/design/apply-tokens

# Injects tokens into HTML UI surfaces
```

### Import from Figma
```bash
POST /api/v1/design/import-figma
Content-Type: application/json

{
  "figmaUrl": "https://figma.com/file/ABC123/...",
  "apiToken": "your_figma_token"
}

# Returns: Imported tokens and success status
```

## Sample Design Tokens Included

### Colors (13)
- Brand: `primary`, `primary-light`, `primary-dark`
- Status: `secondary`, `success`, `warning`, `error`
- Neutrals: `neutral-50`, `neutral-100`, `neutral-900`
- Accent: `accent`

### Typography (12)
- Font: `font-family-sans`
- Sizes: `xs` (12px), `sm`, `base`, `lg`, `xl`
- Weights: `regular`, `medium`, `semibold`, `bold`
- Line heights: `tight`, `normal`, `relaxed`

### Spacing (9)
- Scale: `0`, `1` (4px), `2` (8px), `3`, `4`, `6`, `8`, `12`, `16`

### Components (6)
- `button-base`: Base button styles
- `input-base`: Input field styles
- `card-base`: Card component styles
- `shadow-sm`, `shadow-md`, `shadow-lg`: Shadow utilities

### Patterns (4)
- `card-padding`, `section-gap`, `border-radius-*`

### Guidelines (4)
- Touch target size: 44px
- Max content width: 1200px
- Mobile breakpoint: 768px
- Tablet breakpoint: 1024px

## Navigation

From anywhere in TooLoo.ai:
- **Chat UI** → Click "🎨 Design Studio" link in header
- **Control Room** → Navigate to `/design-studio`
- **Direct URL** → `http://localhost:3000/design-studio`

## Features

✅ **Real-Time Streaming** - Watch tokens generate in real-time with SSE  
✅ **Figma Integration** - Import directly from Figma files  
✅ **CSS Generation** - Auto-generate CSS variables  
✅ **UI Application** - Apply tokens to website components  
✅ **Live Statistics** - See token counts by category  
✅ **Webhook Support** - Auto-sync when Figma files change  

## Pro Tips

1. **Use Sample Data First** - Try the streaming demo before connecting Figma
2. **Watch the Stream** - Click ⚡ Stream Tokens to see real-time generation
3. **Check Statistics** - Bottom right panel shows token counts by type
4. **Inspect Token Stream** - Open browser DevTools to see raw SSE events
5. **Generate CSS** - Click "▶ Generate from Figma" to create CSS variables

## Troubleshooting

**No tokens showing?**
- Load sample data first: `curl -X POST http://localhost:3000/api/v1/design/load-sample`

**Stream not starting?**
- Check browser console for errors
- Ensure `/api/v1/design/stream` endpoint is accessible

**Figma import failing?**
- Verify Figma URL format: `https://figma.com/file/{FILE_ID}/...`
- Check FIGMA_API_TOKEN environment variable

## Next Steps

1. Load the sample design system
2. Stream the tokens to see it in action
3. Connect your own Figma file when ready
4. Use the generated CSS variables in your UI

Happy designing! 🎨
