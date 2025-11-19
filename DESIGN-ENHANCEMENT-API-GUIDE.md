# Design System Enhancement API Guide

## Overview

The Design System Enhancer adds four powerful capabilities to design extraction:

1. **Component Detection** - Identify UI patterns automatically
2. **Maturity Scoring** - Assess design system quality with recommendations
3. **Cross-Site Comparison** - Compare design systems side-by-side
4. **Semantic Naming** - AI-powered token naming and categorization

---

## 1. Component Detection

### Endpoint
```
POST /api/v1/design/enhance/components
```

### Request
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/enhance/components \
  -H 'Content-Type: application/json' \
  -d '{
    "html": "<button class=\"btn btn-primary\">Click me</button>"
  }'
```

### Response
```json
{
  "ok": true,
  "components": {
    "buttons": {
      "btn btn-primary": {
        "type": "button",
        "pattern": ["btn", "btn-primary"],
        "variants": { "btn": ["primary"] },
        "count": 1
      }
    }
  },
  "summary": {
    "totalComponentTypes": 1,
    "totalComponentInstances": 1
  }
}
```

### Detectable Components

| Type | Patterns | Examples |
|------|----------|----------|
| **Buttons** | `<button>`, `<a class="btn">`, `<div class="btn">` | btn, btn-primary, btn-lg |
| **Cards** | `class="card"`, `class="container"`, `class="box"` | card, card-header, card-body |
| **Headers** | `<h1>`, `<header>`, `<nav>` | heading, nav-primary |
| **Forms** | `<input>`, `<textarea>`, `<select>`, `<form>` | form-group, input-lg |
| **Navigation** | `<nav>`, `<ul>`, breadcrumb, tabs | nav-horizontal, pagination |
| **Modals** | `class="modal"`, `class="dialog"` | modal-lg, backdrop |
| **Alerts** | `class="alert"`, `class="notification"` | alert-success, toast |
| **Badges** | `<span class="badge">`, `<span class="tag">` | badge-primary, tag-sm |
| **Lists** | `<ul>`, `<ol>` with classes | list-unstyled |
| **Tables** | `<table>` with classes | table-striped, table-hover |

---

## 2. Design Maturity Scoring

### Endpoint
```
POST /api/v1/design/enhance/maturity
```

### Request (Using Stored System)
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/enhance/maturity \
  -H 'Content-Type: application/json' \
  -d '{
    "systemId": "1234567890"
  }'
```

### Response
```json
{
  "ok": true,
  "maturityScore": {
    "overall": 75,
    "breakdown": {
      "colors": 15,
      "typography": 12,
      "spacing": 16,
      "components": 18,
      "documentation": 14
    },
    "level": "Good",
    "recommendations": [
      "Expand color palette with semantic color roles",
      "Document and standardize component patterns"
    ]
  },
  "systemId": "1234567890"
}
```

### Scoring Breakdown

**Color Consistency (0-20 points)**
- Color count in ideal range (3-12): +10
- Semantic naming patterns (primary, secondary, success, danger): +10

**Typography Hierarchy (0-20 points)**
- Font count in recommended range (1-3): +10
- Multiple weight variants: +10

**Spacing Consistency (0-20 points)**
- Spacing scale in ideal range (4-8 values): +15
- Consistent intervals: +5

**Component Consistency (0-20 points)**
- Multiple component types (3+): +10
- Component variants (10+): +10

**Documentation & Accessibility (0-20 points)**
- Metadata presence: +5
- Effects documentation: +5
- Accessibility guidelines: +5
- Component documentation: +5

### Maturity Levels

| Score | Level | Meaning |
|-------|-------|---------|
| 90+ | **Excellent** | Production-ready, comprehensive system |
| 75+ | **Good** | Solid foundation, minor gaps |
| 60+ | **Fair** | Usable system, needs improvements |
| 40+ | **Basic** | Minimal structure, significant gaps |
| <40 | **Minimal** | Early stage, major work needed |

---

## 3. Cross-Site Comparison

### Endpoint
```
POST /api/v1/design/enhance/compare
```

### Request
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/enhance/compare \
  -H 'Content-Type: application/json' \
  -d '{
    "systemId1": "1234567890",
    "systemId2": "0987654321"
  }'
```

### Response
```json
{
  "ok": true,
  "systems": {
    "system1": {
      "id": "1234567890",
      "source": "https://example.com"
    },
    "system2": {
      "id": "0987654321",
      "source": "https://other.com"
    }
  },
  "comparison": {
    "colorComparison": {
      "total": { "system1": 12, "system2": 8 },
      "shared": { "count": 5, "colors": ["#007bff", "#28a745", ...] },
      "unique": { "system1": 7, "system2": 3 },
      "similarity": "41.7"
    },
    "typographyComparison": {
      "total": { "system1": 3, "system2": 2 },
      "shared": { "count": 2, "families": ["Inter", "Roboto"] },
      "similarity": "66.7"
    },
    "spacingComparison": {
      "total": { "system1": 8, "system2": 6 },
      "shared": { "count": 4, "values": ["4px", "8px", "16px", "24px"] },
      "similarity": "50.0"
    },
    "componentComparison": {
      "total": { "system1": 10, "system2": 8 },
      "shared": { "count": 7, "types": ["buttons", "cards", "forms", ...] },
      "similarity": "70.0"
    },
    "maturityComparison": {
      "system1": 75,
      "system2": 62,
      "difference": 13,
      "stronger": "system1"
    },
    "similarities": [
      "Similar color palette size",
      "Same number of font families",
      "Similar spacing scale"
    ],
    "differences": [
      "Color palette sizes differ by 4 colors",
      "Component types: 10 vs 8"
    ]
  },
  "timestamp": "2025-11-19T10:30:00Z"
}
```

### Use Cases

- **Competitive Analysis**: Compare your design system with competitors
- **Brand Evolution**: Track changes across design iterations
- **Team Alignment**: Ensure consistency across product versions
- **Acquisition Integration**: Compare systems for M&A scenarios

---

## 4. Semantic Token Naming

### Endpoint
```
POST /api/v1/design/enhance/semantic-names
```

### Request (Using Stored System)
```bash
curl -X POST http://127.0.0.1:3000/api/v1/design/enhance/semantic-names \
  -H 'Content-Type: application/json' \
  -d '{
    "systemId": "1234567890"
  }'
```

### Response
```json
{
  "ok": true,
  "semanticNames": {
    "colors": {
      "#007bff": {
        "originalHex": "#007bff",
        "suggestedName": "blue",
        "semanticRole": "primary",
        "hsl": [217, 100, 50],
        "confidence": "high"
      },
      "#28a745": {
        "originalHex": "#28a745",
        "suggestedName": "green",
        "semanticRole": "success",
        "hsl": [135, 56, 45],
        "confidence": "high"
      }
    },
    "typography": {
      "Inter": {
        "original": "Inter",
        "suggestedName": "Inter",
        "weights": [400, 500, 600, 700],
        "sizes": [12, 14, 16, 18, 20],
        "semantic": "sans-serif",
        "confidence": "high"
      }
    },
    "spacing": {
      "4": {
        "original": "4px",
        "suggestedScale": "xs",
        "pxValue": 4,
        "semanticUsage": "micro-spacing",
        "confidence": "high"
      },
      "8": {
        "original": "8px",
        "suggestedScale": "sm",
        "pxValue": 8,
        "semanticUsage": "compact-padding",
        "confidence": "high"
      }
    },
    "effects": {
      "shadows": [
        {
          "original": "0 1px 3px rgba(0,0,0,0.1)",
          "suggestedName": "shadow-sm",
          "type": "drop",
          "intensity": "subtle"
        }
      ],
      "borders": [
        {
          "original": "1px solid #ccc",
          "suggestedName": "border-solid",
          "width": "1px",
          "style": "solid"
        }
      ]
    }
  },
  "recommendations": {
    "colors": "12 colors named",
    "typography": "3 typography entries named",
    "spacing": "8 spacing values named",
    "effects": "5 effects named"
  }
}
```

### Naming Rules

**Colors**
- **Hue-based**: red, orange, yellow, green, cyan, blue, purple, pink
- **Lightness**: Grayscale from black to white (gray-900, gray-100, etc.)
- **Semantic**: primary, secondary, success, danger, warning, info
- **Confidence**: high for standard colors, medium for custom

**Typography**
- **Role**: serif, sans-serif, monospace, system
- **Naming**: Font name normalized (removes quotes, cleanup)
- **Confidence**: high for web-safe fonts, medium for custom

**Spacing**
- **Scale**: xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl
- **Usage**: micro-spacing, compact-padding, default-padding, section-padding, large-margin
- **Confidence**: Always high (deterministic ordering)

**Effects**
- **Shadows**: shadow-sm, shadow-md, shadow-lg, shadow-inset
- **Borders**: border-solid, border-dashed, border-dotted, border-double
- **Intensity**: subtle (alpha <0.15), medium (0.15-0.3), strong (>0.3)

---

## 5. Comprehensive Enhancement Analysis

### Endpoint
```
GET /api/v1/design/enhance/analysis/:systemId
```

### Request
```bash
curl http://127.0.0.1:3000/api/v1/design/enhance/analysis/1234567890
```

### Response
```json
{
  "ok": true,
  "systemId": "1234567890",
  "source": "https://example.com",
  "analysis": {
    "maturity": {
      "overall": 75,
      "breakdown": { ... },
      "level": "Good",
      "recommendations": [ ... ]
    },
    "semanticNames": { ... },
    "components": { ... },
    "timestamp": "2025-11-19T10:30:00Z"
  }
}
```

---

## Integration Examples

### Use Case 1: Assess Current Design System Quality

```bash
# Get maturity score
curl -X POST http://127.0.0.1:3000/api/v1/design/enhance/maturity \
  -H 'Content-Type: application/json' \
  -d '{"systemId": "extraction-id"}'

# Get recommendations and full analysis
curl http://127.0.0.1:3000/api/v1/design/enhance/analysis/extraction-id
```

### Use Case 2: Compare Competitor Design Systems

```bash
# Extract from two competitors
curl -X POST http://127.0.0.1:3000/api/v1/design/extract-from-website \
  -H 'Content-Type: application/json' \
  -d '{"websiteUrl": "https://competitor1.com"}' > /tmp/comp1.json

curl -X POST http://127.0.0.1:3000/api/v1/design/extract-from-website \
  -H 'Content-Type: application/json' \
  -d '{"websiteUrl": "https://competitor2.com"}' > /tmp/comp2.json

# Compare the systems
curl -X POST http://127.0.0.1:3000/api/v1/design/enhance/compare \
  -H 'Content-Type: application/json' \
  -d '{
    "systemId1": "id-from-comp1",
    "systemId2": "id-from-comp2"
  }'
```

### Use Case 3: Name Tokens for Export

```bash
# Get AI-suggested names for all tokens
curl -X POST http://127.0.0.1:3000/api/v1/design/enhance/semantic-names \
  -H 'Content-Type: application/json' \
  -d '{"systemId": "extraction-id"}'

# Use the suggested names in your design token export
# (e.g., CSS variables, Figma tokens, Tailwind config)
```

### Use Case 4: Identify Component Patterns in HTML

```bash
# Extract components from website HTML
curl -X POST http://127.0.0.1:3000/api/v1/design/enhance/components \
  -H 'Content-Type: application/json' \
  -d '{
    "html": "<button class=\"btn btn-primary\">...</button>..."
  }'

# Returns all detected buttons, cards, forms, etc.
```

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "ok": false,
  "error": "Detailed error message"
}
```

Common errors:
- `systemId required` - Missing system identifier
- `System not found` - System doesn't exist in database
- `Invalid parameters` - Request body validation failed

---

## Performance Considerations

- **Component Detection**: ~100ms for 100KB HTML
- **Maturity Scoring**: ~50ms per system
- **System Comparison**: ~100ms for two systems
- **Semantic Naming**: ~200ms for system with 50+ tokens

All operations are synchronous and can be chained in workflows.

---

## Next Integration Points

1. **UI Dashboard** - Visualize maturity scores and comparisons
2. **Automated Reports** - Generate PDF comparison reports
3. **Slack Integration** - Post extraction analysis to Slack
4. **CI/CD Pipeline** - Verify design system consistency in builds
5. **Design Tokens Export** - Use semantic names for token generation

---

## Testing

See `test-design-system-enhancement.js` for comprehensive test suite and examples.

