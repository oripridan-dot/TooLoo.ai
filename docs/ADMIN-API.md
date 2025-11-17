# TooLoo.ai Admin API Reference

## Overview

The Admin API provides runtime control over TooLoo.ai's hot-reload and hot-update systems. These endpoints allow you to:

- Monitor hot-reload status and manage file watching
- Register/update endpoints dynamically without server restart
- Track update history and middleware registration
- Reload modules on-demand

All admin endpoints are prefixed with `/api/v1/admin/` and bypass the standard API proxy.

---

## Hot-Reload Endpoints

### GET `/api/v1/admin/hot-reload-status`

Check the status of the hot-reload system and file watchers.

**Response:**
```json
{
  "ok": true,
  "hotReload": {
    "enabled": true,
    "watchedFiles": 1,
    "patterns": [],
    "debounceDelay": 300
  },
  "hotUpdate": {
    "enabled": false,
    "endpoints": 0,
    "middleware": 0,
    "lastUpdate": null,
    "historySize": 0
  }
}
```

**Fields:**
- `hotReload.enabled` - Is hot-reload active?
- `hotReload.watchedFiles` - Number of files being monitored
- `hotReload.debounceDelay` - Debounce delay in milliseconds (prevents rapid reloads)
- `hotUpdate.enabled` - Is hot-update system active?
- `hotUpdate.endpoints` - Number of dynamically registered endpoints
- `hotUpdate.middleware` - Number of dynamically registered middleware
- `hotUpdate.lastUpdate` - ISO timestamp of last update
- `hotUpdate.historySize` - Number of update history entries

**Example:**
```bash
curl http://127.0.0.1:3000/api/v1/admin/hot-reload-status
```

---

### POST `/api/v1/admin/hot-reload`

Manually trigger a full module reload without restarting the server.

**Request:**
```bash
curl -X POST http://127.0.0.1:3000/api/v1/admin/hot-reload
```

**Response:**
```json
{
  "ok": true,
  "message": "Hot reload triggered",
  "status": {
    "enabled": true,
    "watchedFiles": 1,
    "patterns": [],
    "debounceDelay": 300
  }
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Error message describing what went wrong"
}
```

---

## Hot-Update Endpoints

### GET `/api/v1/admin/endpoints`

List all dynamically registered endpoints.

**Query Parameters:**
- None

**Response:**
```json
{
  "ok": true,
  "endpoints": [
    {
      "method": "POST",
      "path": "/api/v1/custom/analyze",
      "registered": "2025-11-16T23:58:00.000Z"
    },
    {
      "method": "GET",
      "path": "/api/v1/custom/status",
      "registered": "2025-11-16T23:59:00.000Z"
    }
  ],
  "total": 2
}
```

**Example:**
```bash
curl http://127.0.0.1:3000/api/v1/admin/endpoints
```

---

### GET `/api/v1/admin/update-history`

Retrieve the history of endpoint and middleware updates.

**Query Parameters:**
- `limit` (optional, default: 20) - Maximum number of history entries to return

**Response:**
```json
{
  "ok": true,
  "history": [
    {
      "timestamp": "2025-11-16T23:58:00.000Z",
      "action": "registerEndpoint",
      "path": "/api/v1/custom/analyze",
      "method": "POST",
      "success": true
    },
    {
      "timestamp": "2025-11-16T23:59:00.000Z",
      "action": "updateEndpoint",
      "path": "/api/v1/custom/status",
      "method": "GET",
      "success": true
    }
  ],
  "status": {
    "enabled": true,
    "endpoints": 2,
    "middleware": 0,
    "lastUpdate": "2025-11-16T23:59:00.000Z",
    "historySize": 2
  }
}
```

**Example:**
```bash
# Get last 10 updates
curl "http://127.0.0.1:3000/api/v1/admin/update-history?limit=10"

# Get all recent updates (default 20)
curl http://127.0.0.1:3000/api/v1/admin/update-history
```

---

## Configuration & Environment Variables

### Hot-Reload Configuration

Control hot-reload behavior via environment variables in `.env`:

```bash
# Enable/disable hot-reload (default: true)
HOT_RELOAD=true

# Enable verbose logging for hot-reload (default: false)
HOT_RELOAD_VERBOSE=true
```

### Hot-Update Configuration

Control hot-update behavior via environment variables in `.env`:

```bash
# Enable verbose logging for hot-update (default: false)
HOT_UPDATE_VERBOSE=true
```

---

## Use Cases

### 1. Monitor System Health

Check if hot-reload and hot-update systems are functioning:

```bash
curl http://127.0.0.1:3000/api/v1/admin/hot-reload-status | jq .
```

### 2. Reload After Code Changes

Trigger a manual reload when file watching doesn't detect a change:

```bash
curl -X POST http://127.0.0.1:3000/api/v1/admin/hot-reload
```

### 3. Track Recent Changes

View what endpoints and middleware have been recently registered/updated:

```bash
curl "http://127.0.0.1:3000/api/v1/admin/update-history?limit=5"
```

### 4. Verify Registered Endpoints

Confirm that dynamically registered endpoints are active:

```bash
curl http://127.0.0.1:3000/api/v1/admin/endpoints | jq '.endpoints | length'
```

---

## Integration with HotReloadManager

The `lib/hot-reload-manager.js` module provides:

- **File watching** with fs.watch and debouncing
- **Module cache invalidation** using cache-busting query parameters
- **Dynamic re-imports** with error handling
- **Configurable watch patterns** for selective reloading

Example file watching setup in `servers/web-server.js`:

```javascript
const hotReloadManager = setupAppHotReload(app, {
  enabled: process.env.HOT_RELOAD !== 'false',
  verbose: process.env.HOT_RELOAD_VERBOSE === 'true',
  debounceDelay: 300
});

// Watch a specific file
hotReloadManager.watchFile('servers/web-server.js', async () => {
  console.log('[HotReload] Web server code changed - consider restarting');
});

// Reload all watched modules
await hotReloadManager.reloadAll();
```

---

## Integration with HotUpdateManager

The `lib/hot-update-manager.js` module provides:

- **Dynamic endpoint registration** without server restart
- **Endpoint updates** to change behavior at runtime
- **Middleware registration** for dynamic request processing
- **Update history tracking** for audit and debugging

Example endpoint registration:

```javascript
const hotUpdateManager = setupAppHotUpdate(app, {
  enabled: true,
  verbose: process.env.HOT_UPDATE_VERBOSE === 'true',
  maxHistory: 100
});

// Register new endpoint dynamically
hotUpdateManager.registerEndpoint('POST', '/api/v1/custom/analyze', async (req, res) => {
  res.json({ ok: true, result: 'Analysis complete' });
});

// Update existing endpoint
hotUpdateManager.updateEndpoint('GET', '/api/v1/custom/status', async (req, res) => {
  res.json({ ok: true, status: 'updated' });
});
```

---

## Architecture

### Request Flow

```
Client Request
    ↓
Express Router (specific routes)
    ↓
Admin Endpoints (/api/v1/admin/*) [Direct handlers]
    ↓
Dynamic Endpoints (HotUpdateManager)
    ↓
Catch-all API Proxy [Routes to services]
    ↓
Service Response
```

Admin endpoints are evaluated **before** the catch-all proxy, ensuring they always take priority.

---

## Error Handling

All admin endpoints return a consistent response structure:

**Success:**
```json
{
  "ok": true,
  "data": { /* response data */ }
}
```

**Error:**
```json
{
  "ok": false,
  "error": "Description of the error"
}
```

---

## Performance Considerations

1. **Debouncing** - Hot-reload uses 300ms debounce to prevent rapid successive reloads
2. **History Limit** - Update history is capped at configurable limit (default: 100)
3. **Watched Files** - Only watch files that change frequently
4. **Cache Invalidation** - Module cache is busted using query parameters for forced re-import

---

## Security Notes

- Admin endpoints are only accessible on the local web-server instance
- All `.env` variables are available to admin endpoints for status checking
- File reading is restricted to the TooLoo.ai workspace directory
- Consider adding authentication/authorization for production environments

---

## Troubleshooting

### Hot-Reload Not Detecting Changes

1. Check if `HOT_RELOAD=true` in `.env`
2. Verify file is in the watched directory
3. Check verbose logs: `HOT_RELOAD_VERBOSE=true`
4. Manually trigger reload: `POST /api/v1/admin/hot-reload`

### Admin Endpoints Return 404

1. Verify endpoint path starts with `/api/v1/admin/`
2. Restart web-server: `pkill -f "node servers/web-server"`
3. Check server logs for startup errors

### History Not Recording Updates

1. Verify `HOT_UPDATE_VERBOSE=true` in `.env`
2. Check that HotUpdateManager is initialized in web-server.js
3. Verify update actions through `/api/v1/admin/update-history`

---

## Related Documentation

- `docs/ARCHITECTURE-CORE.md` - System architecture overview
- `lib/hot-reload-manager.js` - Implementation details
- `lib/hot-update-manager.js` - Implementation details
- `.github/copilot-instructions.md` - Development guidelines

