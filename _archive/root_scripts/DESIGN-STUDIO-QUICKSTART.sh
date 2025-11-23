#!/bin/bash
# Design System Extraction Quick Reference

# Open the Design Studio UI
echo "🎨 Opening Design Studio..."
open http://127.0.0.1:3000/design-studio

# Test extraction against local sample
echo "📊 Testing extraction with sample HTML..."
node lib/design-extractor.js file:///workspaces/TooLoo.ai/test-design-sample.html

# Extract from any website via API
# Example: Extract from Tailwind CSS
curl -X POST http://127.0.0.1:3000/api/v1/design/extract-from-website \
  -H 'Content-Type: application/json' \
  -d '{
    "websiteUrl": "https://tailwindcss.com",
    "verbose": true
  }' | jq '.metadata'

# List all extracted design systems
curl http://127.0.0.1:3000/api/v1/design/list

# View specific extraction
curl http://127.0.0.1:3000/api/v1/design/view/[id]

# Compare two extractions
curl -X POST http://127.0.0.1:3000/api/v1/design/compare \
  -H 'Content-Type: application/json' \
  -d '{
    "id1": "first-extraction-id",
    "id2": "second-extraction-id"
  }'

# What's now extractable:
# ✅ 25+ colors (hex, rgb, hsl, named colors, gradients)
# ✅ 6+ typography styles (sizes, weights, line-heights)
# ✅ 20+ spacing values (margins, padding, gaps, border-radius)
# ✅ 10+ effects (shadows, borders, transitions)

# All stored in: data/design-system/extractions/
ls data/design-system/extractions/
