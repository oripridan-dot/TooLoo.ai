# 🎨 Design Extraction — Instant Design Agility

Extract design systems from any website in seconds. Copy proven designs from live sites, iterate instantly.

## Quick Start

### 1. Via UI (Easiest)
Open the Design Studio:
```bash
npm run start:product
```
Then:
1. Go to `/design-studio` in your browser
2. Scroll to "Or Extract from Website" section
3. Paste a URL: `https://stripe.com` or `https://github.com`
4. Click **🌐 Extract Design System**
5. Watch real-time progress + see extracted tokens instantly

### 2. Via API
```bash
curl -X POST http://127.0.0.1:3006/api/v1/design/extract-from-website \
  -H "Content-Type: application/json" \
  -d '{"websiteUrl":"https://stripe.com"}'
```

Response includes:
- `tokens` — Ready-to-use design tokens (colors, typography, spacing)
- `css` — CSS variables `:root { --brand: #xyz; ... }`
- `metadata` — Design maturity score (0-100), colors/fonts/spacing counts

### 3. Via CLI (Standalone)
```bash
node lib/design-extractor.js https://stripe.com
```

Outputs complete design system JSON to stdout.

## What Gets Extracted

| Element | Details |
|---------|---------|
| **Colors** | All hex/rgb colors from CSS, inline styles, CSS variables. Returns ~10 primary palette colors |
| **Typography** | Font families (including Google Fonts imports), weights, size relationships |
| **Spacing** | Pixel values for padding/margin/gap, converted to semantic scale (xs, sm, md, lg, xl, 2xl, 3xl) |
| **Components** | Counts of buttons, cards, and common UI patterns |

## Design Maturity Score

Automatic scoring (0-100) based on:
- **30pts** — Found 5+ distinct colors
- **30pts** — Found 2+ font families
- **20pts** — Found 10+ colors (comprehensive palette)
- **20pts** — Has Google Fonts import (professional typography)

Stripe.com scores **80+** (enterprise-grade design). Example.com scores ~30.

## Examples

### Extract from Stripe
```bash
curl -X POST http://127.0.0.1:3006/api/v1/design/extract-from-website \
  -H "Content-Type: application/json" \
  -d '{"websiteUrl":"https://stripe.com"}' | jq '.metadata'
```

**Result:**
```json
{
  "colorsFound": 10,
  "typographyFound": 3,
  "spacingValuesFound": 7,
  "estimatedDesignMaturity": 80
}
```

### Extract from GitHub
```bash
curl -X POST http://127.0.0.1:3006/api/v1/design/extract-from-website \
  -H "Content-Type: application/json" \
  -d '{"websiteUrl":"https://github.com"}' | jq '.tokens.colors'
```

## How to Use Extracted Design

**Once extracted:**

1. **In Design Studio:** Tokens auto-integrate into your active design system
2. **In CSS:** Use the returned CSS variables: `var(--brand)`, `var(--spacing-lg)`, etc.
3. **Export:** Download as JSON for Figma/design tool integration
4. **Apply to UI:** Use `/api/v1/design/apply-tokens` endpoint

## Architecture

### Core Extractor (`lib/design-extractor.js`)
- Pure JavaScript, no external dependencies
- Regex-based HTML/CSS parsing
- Fetch + stream processing
- 10-second timeout per URL
- Returns 500KB max per site

### Endpoint (`POST /api/v1/design/extract-from-website`)
- Located in `servers/product-development-server.js`
- Merges extracted tokens into global design system
- Saves metadata to audit trail
- Returns structured tokens + CSS

### UI Integration (`web-app/design-studio.html`)
- Form input for website URL
- Real-time progress streaming
- Token preview + statistics
- Side-by-side with Figma import

## Performance Notes

- **Small sites** (example.com): ~2-3 seconds
- **Medium sites** (stripe.com): ~5-8 seconds
- **Large sites** (github.com): ~10+ seconds (uses timeout)

Limitation: Only analyzes first 500KB of HTML. Static assets (PNG, JS) are not scanned.

## Workflow Example

**Typical 5-minute design iteration:**

1. Visit `/design-studio`
2. Paste URL of site you admire
3. Click extract → get 10 colors + fonts
4. Tweak 2-3 colors in the preview
5. Apply to your app → instant visual consistency
6. Export as design system JSON
7. Share with team

## What's Coming

- [ ] Screenshot-based color extraction (visual analysis)
- [ ] Component auto-detection (buttons, cards, modals)
- [ ] Multi-page analysis (extract from multiple URLs at once)
- [ ] Design comparison (diff between two websites)
- [ ] Accessibility audit (contrast ratio checks)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **"Connection lost"** | Website may be blocking automated requests. Try with different URL. |
| **"0 colors found"** | Site uses CSS-in-JS or dynamically loaded styles. Limitation of static analysis. |
| **Timeout** | Site too large or slow. Extraction is limited to 10 seconds. |

## Code Examples

### Programmatic Usage

```javascript
import { DesignExtractor } from './lib/design-extractor.js';

const extractor = new DesignExtractor({ timeout: 10000 });
const result = await extractor.extractFromUrl('https://stripe.com', {
  verbose: true,
  includeElements: true
});

if (result.ok) {
  console.log('Colors:', Object.keys(result.tokens.colors));
  console.log('Fonts:', Object.keys(result.tokens.typography));
  console.log('CSS:', result.css);
}
```

### Apply Extracted Tokens to UI

```bash
# 1. Extract
curl -X POST http://127.0.0.1:3006/api/v1/design/extract-from-website \
  -d '{"websiteUrl":"https://stripe.com"}' | jq -r '.css' > design.css

# 2. Inject into page <head>
echo '<style>' >> your-page.html
cat design.css >> your-page.html
echo '</style>' >> your-page.html

# 3. Use in CSS
/* Now you can reference the extracted tokens */
:root {
  --brand: #7c5cff;  /* extracted from stripe.com */
}

body {
  background: var(--brand);
}
```

---

**Built for agile design teams.** Extract → Iterate → Ship. No Figma needed.

