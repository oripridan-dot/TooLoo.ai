# TooLoo.ai Hot-Reload & Hot-Update Implementation Guide

## Overview

This document describes the implementation and integration of hot-reload and hot-update capabilities into TooLoo.ai. These features enable:

1. **Hot-Reload** - Automatic file monitoring and module reloading without server restart
2. **Hot-Update** - Dynamic endpoint and middleware registration at runtime
3. **Admin Control** - REST API for managing reload and update operations

---

## Architecture

### Module Structure

```
servers/
  └── web-server.js                  # Main server with integrated hot-reload/update
lib/
  ├── hot-reload-manager.js          # File watching and module reloading
  ├── hot-update-manager.js          # Dynamic endpoint/middleware registration
  └── env-loader.js                  # .env file management (existing)
docs/
  └── ADMIN-API.md                   # Admin endpoint documentation
scripts/
  └── test-hot-reload.js             # Test script for admin endpoints
```

### Integration Points

**In `servers/web-server.js`:**

```javascript
// Line 5: Ensure .env is loaded
ensureEnvLoaded();

// Lines 35-38: Import managers
import { setupAppHotReload } from '../lib/hot-reload-manager.js';
import { setupAppHotUpdate } from '../lib/hot-update-manager.js';

// Lines 46-59: Initialize managers
const hotReloadManager = setupAppHotReload(app, {
  enabled: process.env.HOT_RELOAD !== 'false',
  verbose: process.env.HOT_RELOAD_VERBOSE === 'true',
  debounceDelay: 300
});

const hotUpdateManager = setupAppHotUpdate(app, {
  enabled: true,
  verbose: process.env.HOT_UPDATE_VERBOSE === 'true',
  maxHistory: 100
});

// Watch web-server.js changes
hotReloadManager.watchFile('servers/web-server.js', async () => {
  console.log('[HotReload] Web server code changed');
});

// Lines 1740-1795: Admin endpoint handlers
app.get('/api/v1/admin/hot-reload-status', (req, res) => { ... });
app.post('/api/v1/admin/hot-reload', async (req, res) => { ... });
app.get('/api/v1/admin/endpoints', (req, res) => { ... });
app.get('/api/v1/admin/update-history', (req, res) => { ... });
```

---

## Hot-Reload Manager (`lib/hot-reload-manager.js`)

### Features

| Feature | Description |
|---------|-------------|
| **File Watching** | Uses fs.watch with debouncing (default 300ms) |
| **Cache Invalidation** | Busts module cache using query parameters |
| **Dynamic Imports** | Re-imports modules with cache-busting |
| **Error Handling** | Graceful error logging without crashes |
| **Status Reporting** | getStatus() returns watcher and reload information |

### Key Methods

```javascript
setupAppHotReload(app, options)
  // Initialize hot-reload manager for an Express app
  // Returns: HotReloadManager instance

watchFile(filePath, callback, options)
  // Monitor a file for changes
  // callback: Triggered when file changes (debounced)
  // options: { debounceDelay, patterns, ignorePatterns }

reloadModule(filePath)
  // Reload a specific module without server restart
  // Returns: Promise<{ ok, message }>

reloadAll()
  // Reload all watched modules
  // Returns: Promise<{ ok, reloaded }>

stop()
  // Stop all file watchers

getStatus()
  // Get current watcher status
  // Returns: { enabled, watchedFiles, patterns, debounceDelay }
```

### Usage Example

```javascript
// Initialize
const hotReloadManager = setupAppHotReload(app, {
  enabled: true,
  verbose: true,
  debounceDelay: 300
});

// Watch a file
hotReloadManager.watchFile('lib/my-module.js', async () => {
  console.log('my-module.js changed, reloading...');
  await hotReloadManager.reloadModule('lib/my-module.js');
});

// Reload on demand
app.post('/api/reload', async (req, res) => {
  const result = await hotReloadManager.reloadAll();
  res.json(result);
});

// Check status
app.get('/api/reload-status', (req, res) => {
  res.json(hotReloadManager.getStatus());
});
```

---

## Hot-Update Manager (`lib/hot-update-manager.js`)

### Features

| Feature | Description |
|---------|-------------|
| **Endpoint Registration** | registerEndpoint(method, path, handler) |
| **Endpoint Updates** | updateEndpoint(method, path, newHandler) |
| **Endpoint Removal** | unregisterEndpoint(method, path) |
| **Middleware Registration** | registerMiddleware(name, handler) |
| **History Tracking** | Records all updates (configurable limit) |
| **Status Reporting** | getStatus() returns registration info |

### Key Methods

```javascript
setupAppHotUpdate(app, options)
  // Initialize hot-update manager for an Express app
  // Returns: HotUpdateManager instance

registerEndpoint(method, path, handler)
  // Register a new endpoint at runtime
  // method: 'GET', 'POST', 'PUT', 'DELETE', etc.
  // path: '/api/v1/custom/endpoint'
  // handler: async (req, res) => { ... }
  // Returns: Promise<{ ok, message }>

updateEndpoint(method, path, newHandler)
  // Update an existing endpoint
  // Same parameters as registerEndpoint
  // Returns: Promise<{ ok, message }>

unregisterEndpoint(method, path)
  // Remove a registered endpoint
  // Returns: Promise<{ ok, message }>

registerMiddleware(name, handler)
  // Register middleware for request processing
  // name: 'logging', 'auth', etc.
  // handler: async (req, res, next) => { ... }
  // Returns: Promise<{ ok, message }>

getEndpoints()
  // Get all registered endpoints
  // Returns: Array<{ method, path, registered }>

getHistory(limit)
  // Get update history
  // limit: max number of entries to return
  // Returns: Array<{ timestamp, action, path, success }>

getStatus()
  // Get current update status
  // Returns: { enabled, endpoints, middleware, lastUpdate, historySize }
```

### Usage Example

```javascript
// Initialize
const hotUpdateManager = setupAppHotUpdate(app, {
  enabled: true,
  verbose: true,
  maxHistory: 100
});

// Register new endpoint
await hotUpdateManager.registerEndpoint('POST', '/api/v1/analyze', async (req, res) => {
  const result = await analyze(req.body);
  res.json({ ok: true, result });
});

// Update existing endpoint
await hotUpdateManager.updateEndpoint('GET', '/api/v1/status', async (req, res) => {
  res.json({ ok: true, status: 'updated' });
});

// Register middleware
await hotUpdateManager.registerMiddleware('auth', async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
});

// Check registered endpoints
const endpoints = hotUpdateManager.getEndpoints();
console.log(`${endpoints.length} endpoints registered`);

// View update history
const history = hotUpdateManager.getHistory(10);
history.forEach(entry => {
  console.log(`${entry.timestamp}: ${entry.action} ${entry.path}`);
});
```

---

## Admin API Endpoints

### Status Endpoints

**GET `/api/v1/admin/hot-reload-status`**
- Returns hot-reload and hot-update system status
- No authentication required
- Response: `{ ok, hotReload, hotUpdate }`

**GET `/api/v1/admin/endpoints`**
- Lists all dynamically registered endpoints
- Query param: none
- Response: `{ ok, endpoints[], total }`

**GET `/api/v1/admin/update-history`**
- Returns update history (default 20 entries)
- Query param: `limit` (max entries to return)
- Response: `{ ok, history[], status }`

### Control Endpoints

**POST `/api/v1/admin/hot-reload`**
- Manually trigger module reload
- No body required
- Response: `{ ok, message, status }`

---

## Environment Variables

### Configuration

```bash
# Enable/disable hot-reload (default: true if not set)
HOT_RELOAD=true

# Enable verbose logging for hot-reload (default: false)
HOT_RELOAD_VERBOSE=true

# Enable verbose logging for hot-update (default: false)
HOT_UPDATE_VERBOSE=true
```

### In `.env`:

```
# Hot-reload settings
HOT_RELOAD=true
HOT_RELOAD_VERBOSE=false

# Hot-update settings
HOT_UPDATE_VERBOSE=false
```

---

## Testing

### Quick Test

```bash
# Start the server (if not already running)
npm run dev

# In another terminal, run the test script
node scripts/test-hot-reload.js
```

### Manual Testing

```bash
# Check hot-reload status
curl http://127.0.0.1:3000/api/v1/admin/hot-reload-status | jq .

# Trigger manual reload
curl -X POST http://127.0.0.1:3000/api/v1/admin/hot-reload | jq .

# List registered endpoints
curl http://127.0.0.1:3000/api/v1/admin/endpoints | jq .

# View update history
curl "http://127.0.0.1:3000/api/v1/admin/update-history?limit=5" | jq .
```

---

## Performance Considerations

### Debouncing

The hot-reload system uses debouncing to prevent rapid successive reloads:

```javascript
// Default: 300ms debounce
const hotReloadManager = setupAppHotReload(app, {
  debounceDelay: 300  // milliseconds
});
```

This means:
- Rapid file changes within 300ms are batched into a single reload
- Prevents cascading reloads from multiple file writes
- Configurable per watched file

### Module Cache

File changes are detected through fs.watch:

```javascript
fs.watch(filePath, { recursive: false }, (eventType, filename) => {
  if (eventType === 'change') {
    // Debounced reload handler
  }
});
```

Cache invalidation uses query parameter busting:

```javascript
// Old cache key: 'lib/my-module.js'
// New cache key: 'lib/my-module.js?cache-bust=1234567890'
```

### History Limits

Update history is configurable:

```javascript
const hotUpdateManager = setupAppHotUpdate(app, {
  maxHistory: 100  // Keep last 100 updates
});
```

Older entries are automatically discarded when limit is exceeded.

---

## Integration with Other Services

### Orchestrator Integration

To add hot-reload to `servers/orchestrator.js`:

```javascript
import { setupAppHotReload } from '../lib/hot-reload-manager.js';

const hotReloadManager = setupAppHotReload(app, {
  enabled: process.env.HOT_RELOAD !== 'false',
  verbose: process.env.HOT_RELOAD_VERBOSE === 'true'
});

hotReloadManager.watchFile('servers/orchestrator.js');
```

### Training Server Integration

Similar pattern for `servers/training-server.js`:

```javascript
import { setupAppHotReload } from '../lib/hot-reload-manager.js';

const hotReloadManager = setupAppHotReload(app, {
  enabled: true,
  verbose: process.env.HOT_RELOAD_VERBOSE === 'true'
});

hotReloadManager.watchFile('servers/training-server.js');
```

---

## Error Handling

### File Watch Errors

If a file can't be watched:

```
[HotReload] Error watching file: servers/web-server.js
[HotReload] Error: ENOENT: no such file or directory
```

Causes:
- File doesn't exist
- Permission denied
- File system doesn't support watching

### Module Reload Errors

If a module fails to reload:

```
[HotReload] Error reloading module: lib/my-module.js
[HotReload] Error: SyntaxError: Unexpected token
```

Causes:
- Syntax error in the module
- Missing dependency
- Import cycle

### Admin Endpoint Errors

If an admin endpoint returns an error:

```json
{
  "ok": false,
  "error": "Hot reload is disabled in configuration"
}
```

Check:
- `.env` has `HOT_RELOAD=true`
- Web-server process is running
- Port 3000 is accessible

---

## Security Considerations

1. **No Authentication** - Admin endpoints are currently open
   - Should be restricted in production
   - Consider adding API key or JWT validation

2. **File Access** - Hot-reload only watches specified files
   - No arbitrary file reading
   - Limited to workspace directory

3. **Endpoint Registration** - Any code can register endpoints at runtime
   - Validate handler functions
   - Prevent injection attacks

---

## Monitoring and Observability

### Logging

Enable verbose logging to see all reload and update operations:

```bash
HOT_RELOAD_VERBOSE=true
HOT_UPDATE_VERBOSE=true
```

Output will show:
```
[HotReload] Watching file: servers/web-server.js
[HotReload] File changed: servers/web-server.js
[HotReload] Reloading module: servers/web-server.js
[HotUpdate] Registered endpoint: POST /api/v1/custom/analyze
[HotUpdate] Updated endpoint: GET /api/v1/custom/status
```

### Metrics

Check system status:

```bash
curl http://127.0.0.1:3000/api/v1/admin/hot-reload-status
```

Response includes:
- Number of watched files
- Debounce delay
- Number of registered endpoints
- Timestamp of last update

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Changes not detected | Check file path, verify HOT_RELOAD=true, check file permissions |
| Admin endpoint 404 | Restart web-server, verify endpoint name spelling |
| Module reload fails | Check syntax, verify imports, look at error logs |
| High CPU usage | Reduce watched files, increase debounce delay |
| Endpoints not registered | Verify HotUpdateManager is initialized, check endpoint path format |

---

## Next Steps

1. **Extend to other services** - Add hot-reload to orchestrator, training-server, etc.
2. **Add authentication** - Protect admin endpoints with API key validation
3. **WebSocket notifications** - Push update notifications to clients
4. **Selective reloading** - Reload only specific file types or patterns
5. **Rollback capability** - Cache previous versions for quick rollback

---

## References

- `docs/ADMIN-API.md` - Admin endpoint documentation
- `lib/hot-reload-manager.js` - Implementation source
- `lib/hot-update-manager.js` - Implementation source
- `servers/web-server.js` - Integration example
- `.github/copilot-instructions.md` - Development guidelines

