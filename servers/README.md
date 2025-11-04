# Design Integration Server

A server for importing design systems from Figma and other design tools into TooLoo's unified design system format.

## Features

- ✅ **Real Figma API Integration** - Fetches actual design data from Figma files
- ✅ **Design Token Extraction** - Colors, typography, spacing, and shadows
- ✅ **Component Library Parsing** - Extracts components and their instances
- ✅ **Smart Caching** - 1-hour TTL to avoid rate limits
- ✅ **Comprehensive Error Handling** - Invalid tokens, URLs, and API errors
- ✅ **TooLoo Format Mapping** - Converts Figma data to TooLoo design system format

## Quick Start

### 1. Install Dependencies

No external dependencies required - uses Node.js built-in modules only.

### 2. Configure Environment

Create a `.env` file or set environment variables:

```bash
# Optional: Configure server port (default: 3008)
DESIGN_SERVER_PORT=3008

# Optional: Set a default Figma API token
FIGMA_API_TOKEN=your_figma_token_here
```

### 3. Start the Server

```bash
node servers/design-integration-server.js
```

The server will start on `http://localhost:3008` (or your configured port).

## API Endpoints

### POST `/api/v1/design/import-figma`

Import a design system from a Figma file.

**Request Body:**
```json
{
  "figmaUrl": "https://figma.com/file/ABC123XYZ/MyDesignSystem",
  "apiToken": "figd_your_personal_access_token"
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "design_system": {
    "colors": {
      "primary": "#0066FF",
      "secondary": "#FF3366",
      "background": "#FFFFFF"
    },
    "typography": {
      "h1": {
        "fontSize": 32,
        "fontWeight": 700,
        "fontFamily": "Inter",
        "lineHeight": 40
      },
      "body": {
        "fontSize": 16,
        "fontWeight": 400,
        "fontFamily": "Inter",
        "lineHeight": 24
      }
    },
    "spacing": {
      "xs": 4,
      "sm": 8,
      "md": 16,
      "lg": 24,
      "xl": 32,
      "xxl": 48
    },
    "shadows": {
      "card": {
        "offsetX": 0,
        "offsetY": 4,
        "blur": 8,
        "spread": 0,
        "color": "rgba(0, 0, 0, 0.1)",
        "type": "drop"
      }
    },
    "components": [
      {
        "id": "6:1",
        "name": "Button",
        "description": "Primary button component",
        "instances": [
          {
            "id": "7:1",
            "name": "Button Instance",
            "position": { "x": 100, "y": 200 }
          }
        ],
        "properties": {
          "width": 120,
          "height": 40
        }
      }
    ]
  },
  "metadata": {
    "fileName": "MyDesignSystem",
    "fileKey": "ABC123XYZ",
    "lastModified": "2024-11-04T12:00:00Z",
    "version": "1.0"
  },
  "cached": false
}
```

**Error Response (400/500):**
```json
{
  "ok": false,
  "error": "Invalid Figma API token or insufficient permissions"
}
```

### GET `/api/v1/design/cache-status`

Check the current cache status and entries.

**Response (200):**
```json
{
  "ok": true,
  "cache": {
    "entries": [
      {
        "key": "figma:https://figma.com/file/ABC123/Test",
        "age": 1234,
        "ttlRemaining": 2366,
        "expired": false
      }
    ],
    "count": 1,
    "ttl": 3600
  }
}
```

### GET `/api/v1/design/health`

Health check endpoint.

**Response (200):**
```json
{
  "ok": true,
  "service": "Design Integration Server",
  "version": "1.0.0",
  "uptime": 123.456,
  "cache": {
    "size": 1,
    "ttl": 3600
  }
}
```

## Getting a Figma API Token

1. Go to [Figma Settings → Personal Access Tokens](https://www.figma.com/settings)
2. Click "Generate new token"
3. Give it a descriptive name (e.g., "TooLoo Design Import")
4. Copy the token (starts with `figd_`)
5. Use it in the `apiToken` field when calling the API

**Note:** Keep your token secure - don't commit it to version control!

## Supported Figma URL Formats

- `https://figma.com/file/FILE_KEY/FileName`
- `https://www.figma.com/file/FILE_KEY/FileName`
- `https://figma.com/design/FILE_KEY/FileName`
- `https://www.figma.com/design/FILE_KEY/FileName`

## Design Token Mapping

### Colors
Extracted from:
- Rectangle/shape fills with solid colors
- Named according to the Figma layer name (e.g., "Primary" → `primary`)
- Converted to hex format for opaque colors
- Converted to rgba format for transparent colors

### Typography
Extracted from:
- Text layers with style information
- Includes fontSize, fontWeight, fontFamily, lineHeight
- Named according to the text layer name (e.g., "Heading 1" → `heading-1`)

### Spacing
Extracted from:
- Auto layout item spacing
- Padding values from frames
- Normalized to common scale (xs, sm, md, lg, xl, xxl)

### Shadows
Extracted from:
- Drop shadow effects
- Inner shadow effects
- Includes offset, blur, spread, color, and type

### Components
Extracted from:
- Component definitions (master components)
- Component instances with their positions
- Includes component metadata (id, name, description, dimensions)

## Caching

The server caches Figma imports for **1 hour** (3600 seconds) to:
- Reduce API calls and avoid rate limits
- Improve response times for repeated requests
- Minimize unnecessary network traffic

**Cache Key Format:** `figma:{figmaUrl}`

**Cache Behavior:**
- First request: Fetches from Figma API, caches result, returns `cached: false`
- Subsequent requests (within 1 hour): Returns cached data, returns `cached: true` with `cacheTimestamp`
- After 1 hour: Cache expires, next request fetches fresh data

## Error Handling

The server handles various error cases:

- **Missing required fields** → 400 Bad Request
- **Invalid Figma URL format** → 400 Bad Request
- **Invalid API token** → 400 Bad Request (from Figma API: 403)
- **File not found** → 400 Bad Request (from Figma API: 404)
- **Network errors** → 500 Internal Server Error
- **Timeout (30s)** → 500 Internal Server Error

All errors include descriptive messages to help diagnose the issue.

## Testing

Run the test suite:

```bash
# Test Figma adapter (design token extraction)
node tests/figma-adapter.test.js

# Test server integration (API endpoints)
node tests/design-server.test.js
```

All tests should pass with output similar to:
```
🧪 Running Figma Adapter Tests...
✅ Test 1: URL parsing - PASSED
✅ Test 2: Color extraction - PASSED
...
==================================================
Tests completed: 6
✅ Passed: 6
❌ Failed: 0
==================================================
```

## Example Usage with curl

```bash
# Import a Figma design system
curl -X POST http://localhost:3008/api/v1/design/import-figma \
  -H 'Content-Type: application/json' \
  -d '{
    "figmaUrl": "https://figma.com/file/ABC123XYZ/MyDesignSystem",
    "apiToken": "figd_your_token_here"
  }'

# Check cache status
curl http://localhost:3008/api/v1/design/cache-status

# Health check
curl http://localhost:3008/api/v1/design/health
```

## Architecture

```
servers/design-integration-server.js    # Main HTTP server
├── Express-free Node.js HTTP server
├── Routes: /api/v1/design/*
├── Caching layer (in-memory Map)
└── Uses: FigmaAdapter

lib/adapters/figma-adapter.js          # Figma API client
├── Figma REST API integration
├── Design token extraction
├── Component parsing
└── TooLoo format mapping
```

## Security Considerations

1. **API Tokens**: Never commit tokens to version control. Use environment variables or request body.
2. **CORS**: Server allows all origins (`*`) - restrict in production if needed.
3. **Rate Limiting**: Figma has rate limits. Caching helps avoid hitting them.
4. **Timeouts**: Requests timeout after 30 seconds to prevent hanging.

## Limitations

1. **Figma API Rate Limits**: Respect Figma's rate limits (caching helps).
2. **Token Scope**: User-provided tokens must have read access to the file.
3. **Private Files**: Only works with files the token has access to.
4. **Design Token Detection**: Automatic extraction may not catch all design tokens - organize your Figma file with clear naming.

## Future Enhancements

- [ ] Support for Figma Variables API (native design tokens)
- [ ] Support for other design tools (Sketch, Adobe XD)
- [ ] Persistent cache (Redis/database)
- [ ] Webhook support for automatic updates
- [ ] Export to various formats (CSS, SCSS, Tailwind, etc.)
- [ ] Design token versioning
- [ ] Diff viewer for design changes

## License

MIT - See LICENSE file for details.
