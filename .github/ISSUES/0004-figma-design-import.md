Title: Critical – Figma design import must extract and map design tokens

Description:
The Design Integration Server (`servers/design-integration-server.js` line 193) has a placeholder for Figma integration but returns only instructions instead of actual design data. Users cannot import Figma design systems.

What's broken:
- POST `/api/v1/design/import-figma` returns instructions, not parsed design data
- No actual Figma API calls
- No component extraction
- No design token mapping to TooLoo system

Requirements:
1. Accept Figma file URL + API token in request body
2. Call Figma REST API to fetch file structure
3. Extract design tokens (colors, typography, spacing, shadows)
4. Parse component library and instances
5. Map tokens to TooLoo design system format
6. Cache results (TTL: 1 hour) to avoid rate limits
7. Return structured design system JSON

Acceptance Criteria:
- [ ] POST `/api/v1/design/import-figma` calls real Figma API
- [ ] Returns extracted colors, typography, spacing
- [ ] Component library is parsed and available
- [ ] Design tokens correctly mapped to TooLoo format
- [ ] Caching works (verified with timestamp checks)
- [ ] Error handling for invalid tokens/URLs
- [ ] Tested with real Figma file (or mock API responses)

Effort: 5 hours  
Priority: P0 (Blocking design workflows)  
Labels: critical, design, figma-api, backend

Files affected:
- `servers/design-integration-server.js`
- Possibly new: `lib/adapters/figma-adapter.js` (optional)

Dependencies:
- Figma API token (set `FIGMA_API_TOKEN` in `.env`)
- Figma personal access token (user provides)

Test command (after fix):
```bash
curl -X POST http://localhost:3008/api/v1/design/import-figma \
  -H 'Content-Type: application/json' \
  -d '{
    "figmaUrl":"https://figma.com/file/ABC123XYZ/MyDesignSystem",
    "apiToken":"figd_your_token_here"
  }'
```

Expected response:
```json
{
  "ok": true,
  "design_system": {
    "colors": { "primary": "#0066FF", ... },
    "typography": { "h1": { "fontSize": 32, "fontWeight": 700 }, ... },
    "spacing": { "xs": 4, "sm": 8, ... },
    "components": [
      { "name": "Button", "instances": [...] },
      ...
    ]
  },
  "cached": false
}
```
