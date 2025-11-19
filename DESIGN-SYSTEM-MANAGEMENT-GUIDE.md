# Design System Management & Analysis Guide

## Overview

TooLoo.ai now features **intelligent design system extraction, analysis, and management**. Extract design systems from any website, get semantic analysis of colors/typography/spacing, store them persistently, and compare extractions side-by-side.

**Key Capabilities:**
- 🌐 Extract design systems from live websites
- 🧠 Intelligent semantic analysis (color roles, typography hierarchies, spacing scales)
- 💾 Persistent storage of extracted systems with metadata
- 📊 Comparison tools to analyze relationships between extracted systems
- 🎯 Confidence scoring for extracted tokens
- 📈 Design maturity and readiness assessments

---

## Architecture

### Components

#### 1. DesignExtractor (`lib/design-extractor.js`)
Pure regex-based HTML/CSS parser that extracts raw design tokens from websites.

**Methods:**
- `extractFromUrl(url, options)` - Main entry point
  - Returns: `{ ok, system, tokens, css }`
  - System contains: `{ colors, typography, spacing, components, metadata }`

**Extraction Coverage:**
- **Colors**: Hex (#RRGGBB), RGB values, CSS properties
- **Typography**: Font-family declarations, Google Fonts, font-weight variations
- **Spacing**: Pixel values from any CSS property, semantic scale building
- **Components**: Button/card pattern counting

#### 2. DesignSystemAnalyzer (`lib/design-system-analyzer.js`)
Intelligent semantic analysis layer that understands design relationships.

**Multi-Level Analysis:**
```javascript
analyzer.analyze() → {
  colors: {
    primary: { hex, rgb, hsl, lightness, confidence },
    secondary: { ... },
    semantic: { success, error, warning, info },
    palettes: [ { hue, name, shades } ],
    relationships: [ ... ]
  },
  typography: {
    families: [],
    pairing: { display, body, confidence },
    hierarchy: [ h1-caption levels with sizing ],
    recommended: { displayFont, bodyFont, pairingScore }
  },
  spacing: {
    scale: [ sorted values ],
    increment: baseUnit,
    consistency: percentage,
    suggested: { xs, sm, md, lg, xl, 2xl, 3xl }
  },
  components: [ detected patterns ],
  metadata: {
    completeness: 0-100,
    designMaturity: 0-100,
    readiness: 0-100,
    confidence: { colors, typography, spacing }
  }
}
```

**Analysis Algorithms:**
- **Color Intelligence**: Lightness sorting, hue grouping, semantic role detection, palette identification
- **Typography Analysis**: Font pairing recommendations, hierarchy generation, serif/sans-serif detection
- **Spacing Intelligence**: Base unit detection, consistency scoring, semantic scale suggestions
- **Quality Scoring**: Completeness (token count), maturity (sophistication), readiness (confidence + completeness)

#### 3. API Endpoints (Product Development Server, Port 3006)

**Extraction:**
```
POST /api/v1/design/extract-from-website
  Input: { websiteUrl, includeElements?, verbose? }
  Output: { tokens, css, analysis, metadata }
  • Executes DesignExtractor
  • Applies DesignSystemAnalyzer
  • Saves metadata to disk
  • Returns full analysis
```

**Management:**
```
GET  /api/v1/design/systems
  → List all extracted systems with metadata

GET  /api/v1/design/systems/:id
  → Retrieve specific system analysis

POST /api/v1/design/systems/:id/compare/:otherId
  → Compare two extracted systems

DELETE /api/v1/design/systems/:id
  → Remove system

POST /api/v1/design/systems/:id/refine
  → Apply manual adjustments to extracted system
```

#### 4. UI Components (design-studio.html)

**New Sections:**
- **Extracted Systems Library**: Browse all extractions with quick stats
- **System Analysis Panel**: View detailed analysis for selected system
- **Compare Tools**: Side-by-side comparison of two systems
- **Token Grid**: Display all extracted tokens with filtering

---

## Usage Workflows

### Workflow 1: Extract a Design System

```bash
# 1. Open design-studio.html in browser
#    http://127.0.0.1:3000/design-studio

# 2. Scroll to "Or Extract from Website" section
# 3. Enter website URL (e.g., https://stripe.com)
# 4. Click "🌐 Extract Design System"
# 5. Watch real-time extraction progress in stream output
# 6. View extracted tokens in token grid (filtered by type)
# 7. See intelligent analysis in "System Analysis" panel
```

**Example Response:**
```json
{
  "ok": true,
  "message": "Design system extracted and analyzed from stripe.com",
  "tokens": {
    "colors": {
      "brand": "#635bff",
      "secondary-1": "#ffffff",
      "neutral-1": "#fafbfc"
    },
    "typography": {
      "font-inter": "Inter",
      "font-roboto-mono": "Roboto Mono"
    },
    "spacing": {
      "xs": "4px",
      "sm": "8px",
      "md": "12px",
      "lg": "16px",
      "xl": "24px"
    }
  },
  "analysis": {
    "colors": {
      "primary": {
        "hex": "#635bff",
        "hsl": { "h": 242, "s": 100, "l": 60 },
        "confidence": 0.85
      },
      "semantic": {
        "success": { "hex": "#10b981" },
        "error": { "hex": "#ef4444" }
      },
      "palettes": [
        { "hue": 242, "name": "Blue", "shades": [...] }
      ]
    },
    "typography": {
      "pairing": {
        "display": "Inter",
        "body": "Inter",
        "confidence": 0.9
      },
      "hierarchy": [
        { "level": "h1", "size": "48px", "font": "Inter", "weight": "700" },
        ...
      ]
    },
    "spacing": {
      "increment": 8,
      "consistency": 0.95,
      "suggested": {
        "xs": "4px",
        "sm": "8px",
        ...
      }
    },
    "metadata": {
      "completeness": 85,
      "designMaturity": 78,
      "readiness": 81,
      "confidence": {
        "colors": 0.85,
        "typography": 0.75,
        "spacing": 0.9
      }
    }
  }
}
```

### Workflow 2: Browse & Compare Extracted Systems

```bash
# 1. Open design-studio.html
# 2. Scroll to "Extracted Systems Library"
# 3. View list of all previous extractions:
#    - Source website
#    - Token counts
#    - Maturity & readiness scores
#
# 4. Click "View" on any system to see detailed analysis
# 5. Click "Compare" to compare with another system
# 6. See side-by-side differences in color counts, typography, spacing
```

**Comparison Example:**
```json
{
  "ok": true,
  "comparison": {
    "system1": {
      "id": "1234567890",
      "source": "stripe.com"
    },
    "system2": {
      "id": "0987654321",
      "source": "github.com"
    },
    "colors": {
      "system1Count": 10,
      "system2Count": 15,
      "difference": 5
    },
    "typography": {
      "system1Count": 2,
      "system2Count": 3,
      "difference": 1
    },
    "maturityGap": 12,
    "readinessComparison": {
      "system1": 81,
      "system2": 73
    }
  }
}
```

### Workflow 3: Refine an Extraction

```bash
# Manual refinements after extraction
POST /api/v1/design/systems/:id/refine

{
  "colorAdjustments": {
    "primary": {
      "hex": "#635bff",
      "name": "brand-primary",
      "role": "primary"
    }
  },
  "typographyAdjustments": {
    "pairing": {
      "display": "Inter",
      "body": "Inter",
      "confidence": 0.95
    }
  }
}
```

---

## Quality Scoring System

### Completeness Score (0-100)
Measures token coverage:
- 30 pts: ≥5 colors
- 30 pts: ≥2 fonts
- 40 pts: ≥4 spacing values

### Design Maturity Score (0-100)
Evaluates design system sophistication:
- 25 pts: ≥10 colors
- 15 pts: ≥20 colors
- 25 pts: ≥3 fonts
- 35 pts: ≥7 spacing values

### Readiness Score (0-100)
Combination of completeness, maturity, and analysis confidence:
```
readiness = (completeness × 0.3) + (maturity × 0.5) + (avgConfidence × 100 × 0.2)
```

### Confidence Scores
Individual confidence for each extraction dimension:
- **Colors**: Based on detection count (max 1.0 at ≥10 colors)
- **Typography**: Based on font count (max 1.0 at ≥3 fonts)
- **Spacing**: Based on consistency (how well values align to a base unit)

---

## Storage & Persistence

### Directory Structure
```
data/design-system/
  ├── system.json                           # Merged design system
  ├── website-extract-1234567890.json      # Individual extraction metadata
  ├── website-extract-1234567891.json
  └── ...
```

### Metadata Format
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "source": "website-extraction",
  "sourceUrl": "https://stripe.com",
  "colorsExtracted": 10,
  "typographyExtracted": 5,
  "spacingExtracted": 7,
  "estimatedMaturity": 78,
  "analysis": {
    "colors": { ... },
    "typography": { ... },
    "spacing": { ... },
    "completeness": 85,
    "maturity": 78,
    "readiness": 81,
    "confidence": { ... }
  },
  "designSystemSize": {
    "colors": 45,
    "typography": 12,
    "components": 8
  }
}
```

---

## Technical Details

### Color Analysis Algorithm
1. Extract all hex/RGB colors from HTML
2. Convert to HSL for analysis
3. Sort by lightness (0-100)
4. Group by hue (0-360°)
5. Identify primary color (mid-tone, high saturation)
6. Detect secondary color (high contrast with primary)
7. Match semantic colors (success/error/warning/info) using distance metrics
8. Build palettes from hue-grouped colors with 3+ shades

### Typography Analysis Algorithm
1. Extract font-family declarations
2. Parse Google Fonts imports
3. Identify serif vs sans-serif families
4. Generate pairing (serif + sans-serif or complementary sans-serifs)
5. Build hierarchy (h1-caption with suggested sizes)
6. Score pairing confidence (0.9 for ideal, 0.5 for single font)

### Spacing Analysis Algorithm
1. Extract all pixel values from CSS
2. Filter to reasonable range (1-300px)
3. Sort and detect base increment
4. Calculate consistency (how many values align to increment)
5. Generate semantic scale (xs, sm, md, lg, xl, 2xl, 3xl)
6. Confidence = consistency score

---

## API Reference

### POST /api/v1/design/extract-from-website
Extract design system from website URL.

**Request:**
```json
{
  "websiteUrl": "https://example.com",
  "includeElements": false,
  "verbose": true
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Design system extracted and analyzed...",
  "tokens": { /* token map */ },
  "css": "/* CSS variables */",
  "analysis": { /* semantic analysis */ },
  "metadata": { /* extraction stats */ }
}
```

### GET /api/v1/design/systems
List all extracted systems.

**Response:**
```json
{
  "ok": true,
  "total": 5,
  "systems": [
    {
      "id": "1234567890",
      "sourceUrl": "https://stripe.com",
      "timestamp": "2025-01-15T10:30:00Z",
      "colorsExtracted": 10,
      "estimatedMaturity": 78,
      "analysis": { /* abbreviated */ }
    }
  ]
}
```

### GET /api/v1/design/systems/:id
Get detailed analysis for specific system.

**Response:**
```json
{
  "ok": true,
  "id": "1234567890",
  "sourceUrl": "https://stripe.com",
  "analysis": { /* full analysis */ }
}
```

### POST /api/v1/design/systems/:id/compare/:otherId
Compare two extracted systems.

**Response:**
```json
{
  "ok": true,
  "comparison": {
    "colors": { "system1Count": 10, "system2Count": 15, "difference": 5 },
    "typography": { ... },
    "spacing": { ... },
    "maturityGap": 12
  }
}
```

### DELETE /api/v1/design/systems/:id
Delete an extracted system.

### POST /api/v1/design/systems/:id/refine
Apply manual refinements to extracted system.

---

## Examples

### Example 1: Extract Stripe Design System

```bash
curl -X POST http://127.0.0.1:3006/api/v1/design/extract-from-website \
  -H "Content-Type: application/json" \
  -d '{
    "websiteUrl": "https://stripe.com",
    "verbose": true
  }'
```

Expected result: 10+ colors, 2-3 fonts, 7+ spacing values, 75+ maturity score

### Example 2: List All Extractions

```bash
curl http://127.0.0.1:3006/api/v1/design/systems | jq
```

### Example 3: Compare Two Systems

```bash
# Get list of systems first
SYSTEMS=$(curl -s http://127.0.0.1:3006/api/v1/design/systems | jq -r '.systems[0:2] | .[].id')

# Compare them
curl -X POST http://127.0.0.1:3006/api/v1/design/systems/${SYSTEMS[0]}/compare/${SYSTEMS[1]}
```

---

## Best Practices

### When to Use
✅ Extract design systems from competitor websites for inspiration
✅ Analyze publicly-shared design systems (design.company.com)
✅ Build design audit trail (track system evolution)
✅ Compare design approaches across different companies
✅ Bootstrap new design system from existing website

### When NOT to Use
❌ Do not extract from sites with complex CSS-in-JS (detection may fail)
❌ Avoid extracting from sites behind authentication
❌ Don't rely solely on regex extraction for production (refine manually)
❌ High-volume extraction not recommended (respects server rate limits)

### Quality Tips
1. **Verify extraction results** - Some sites may hide CSS in JS
2. **Refine automatically detected roles** - ML detection is ~80% accurate
3. **Cross-reference with manual inspection** - Always verify critical tokens
4. **Compare multiple sites** - Understand design trends vs outliers
5. **Score readiness before use** - Only use systems with 70+ readiness score

---

## Troubleshooting

### "No colors extracted"
- Site may use CSS-in-JS or dynamic color generation
- Try different website with simpler CSS
- Verify HTML contains inline styles or style tags

### "Only fonts, no colors"
- Website may use single color or minimal palette
- CSS may be minified without color definitions
- Check browser DevTools to see actual styling

### "Extraction timeout"
- Website may be slow or blocking requests
- Try with `verbose: false`
- Check if website is accessible from terminal: `curl -I <url>`

### "Confidence score too low"
- Extract from site with more visible design tokens
- Manually refine using `/refine` endpoint
- Multiple sites can be merged for stronger signal

---

## Performance

- **Extraction time**: 2-8 seconds per website (depends on page size)
- **Storage**: ~2KB per extraction metadata
- **API response**: <100ms for list/view operations
- **Max page size**: 500KB (prevents runaway parsing)
- **Concurrent extractions**: Sequential (one at a time)

---

## Next Steps

1. **Extract your competitor's design system** - Get instant design inspiration
2. **Build design audit trail** - Monitor how competitors evolve their design
3. **Compare approaches** - Understand design diversity across industry
4. **Bootstrap new system** - Use extraction as starting point for new brand
5. **Refine and polish** - Use analysis as guide for manual design work
