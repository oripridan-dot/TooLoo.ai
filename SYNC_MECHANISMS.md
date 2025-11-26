# TooLoo.ai Sync Mechanisms

## Version Synchronization

The system now includes built-in mechanisms to keep backend and frontend versions synchronized and alert on mismatches.

### How It Works

1. **Backend Version Source** (`src/core/system-info.ts`):
   - Reads from `package.json` at startup
   - Exported as `SYSTEM_VERSION` constant
   - Used by all modules (Cortex, Precog, Nexus)

2. **Version Broadcast** (`src/nexus/routes/system.ts`):
   - `/api/v1/system/status` endpoint now returns `version` field
   - Endpoint is called on app initialization

3. **Frontend Version Check** (`src/web-app/chat-pro-v2.html`):
   - `checkSystemVersion()` function fires on page load
   - Fetches `/api/v1/system/status` from backend
   - Updates version display: `Synapsys {version}`
   - Stores backend version in localStorage for comparison
   - Displays "(Offline)" if backend is unreachable

### Usage

**View Current Version**:

```bash
# Backend version (from package.json)
npm run info

# Frontend version (displayed at top of chat-pro-v2.html)
# Shows as "Synapsys 2.1.351" in sidebar
```

**Verify Sync Status**:

```bash
# Check backend version
curl http://127.0.0.1:4000/api/v1/system/status

# Should return:
{
  "ok": true,
  "data": {
    "version": "2.1.351",
    "services": 3,
    "active": true,
    ...
  }
}
```

### Monitoring

Frontend automatically:

- Checks version on page load
- Updates display if backend changes
- Alerts user if backend goes offline (shows "Synapsys (Offline)")
- Stores sync history in localStorage for debugging

### Common Issues & Resolutions

**Problem**: "Synapsys Loading..." persists

- **Cause**: Backend not responding to `/api/v1/system/status`
- **Fix**: Check backend health: `curl http://127.0.0.1:4000/health`

**Problem**: Version mismatch

- **Cause**: Frontend build out of date with backend
- **Fix**: Clear cache and reload: `Cmd+Shift+R` (or `Ctrl+Shift+F5`)

**Problem**: "(Offline)" displayed

- **Cause**: CORS issue or backend down
- **Fix**: Restart system: `npm run stop:all && npm run start`

## Chat Response Display Sync

The chat interface now properly handles all response types from the backend:

1. **String Responses**: Rendered as markdown
2. **JSON Objects**: Pretty-printed with syntax highlighting
3. **Code Content**: Auto-detected and highlighted
4. **Mixed Content**: Intelligently detected and formatted

This ensures the frontend always displays responses correctly regardless of backend data structure.

## Future Enhancements

- [ ] Periodic version check during session (every 5 mins)
- [ ] Automatic backend restart if version mismatch detected
- [ ] Version upgrade notifications
- [ ] Rollback mechanism on version conflict
