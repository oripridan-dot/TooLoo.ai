# 🔥 Hot Reload Development Guide

## Problem Solved

You can now keep servers **live at all times** with automatic restart on file changes.

## Quick Start

```bash
npm run dev:hot
```

Or manually:

```bash
bash dev-hot-reload.sh
```

## What It Does

- ✅ **Starts 2 servers**: web-server (3000) + product-development-server (3006)
- ✅ **Watches file changes**: `lib/`, `servers/`, `web-app/` directories
- ✅ **Auto-restarts on changes**: .js and .html files
- ✅ **Shows server status**: URLs and health checks
- ✅ **Zero config**: No nodemon, no dependencies needed

## Output Example

```
╔════════════════════════════════════════════════════════╗
║  TooLoo.ai HOT RELOAD Development Mode                ║
║  Servers stay live with auto-restart on file changes  ║
╚════════════════════════════════════════════════════════╝

✅ Starting servers...
→ Starting product-development-server (port 3006)
→ Starting web-server (port 3000)

✅ Web Server READY (http://127.0.0.1:3000)
✅ Product Server READY (http://127.0.0.1:3006)
✅ Design Studio: http://127.0.0.1:3000/design-studio

✅ File watcher ACTIVE
Watching: lib/, servers/, web-app/ for changes
Press Ctrl+C to stop
```

## Workflow

1. **Run in terminal**:
   ```bash
   npm run dev:hot
   # Terminal stays open, servers keep running
   ```

2. **Edit code** in another terminal/editor:
   ```bash
   # Edit lib/design-extractor.js or servers/product-development-server.js
   # Servers detect change and auto-restart within 1-2 seconds
   ```

3. **See instant results**:
   - Refresh browser → new code is live
   - API responses use updated logic
   - No manual restart needed

## What Triggers Restart

Changes to:
- `lib/*.js` — Core services and utilities
- `servers/*.js` — Server implementations  
- `web-app/*.html` — UI changes

Does NOT restart:
- `.env` file changes
- Node modules
- Non-JS/HTML files

## Real Example: Design Extraction

1. Start hot-reload:
   ```bash
   npm run dev:hot
   ```

2. Open design studio in browser:
   ```
   http://127.0.0.1:3000/design-studio
   ```

3. Edit the extractor:
   ```bash
   # In another terminal, edit lib/design-extractor.js
   # Change the color regex pattern
   ```

4. Servers auto-restart:
   ```
   ⚡ Files changed! Restarting servers...
   ```

5. Test immediately:
   - Paste URL in design-studio
   - Click "Extract Design System"
   - See new extraction results instantly

No page refresh needed (unless you changed HTML).

## Logs

All output is saved to:
- `.tooloo-startup/web.log` — Web server logs
- `.tooloo-startup/product.log` — Product development server logs

View in real-time:
```bash
tail -f .tooloo-startup/web.log
tail -f .tooloo-startup/product.log
```

## Cleanup

Press `Ctrl+C` to stop the script. It will:
- Kill both servers cleanly
- Exit the file watcher
- Print "Shutting down servers..."

## Comparison

### Before (Old Way)
```bash
npm run start          # Full orchestration startup (~20s)
# Make change
# Manual kill + restart
# 20s delay each time
```

### After (Hot Reload)
```bash
npm run dev:hot        # Start once (~5s)
# Make change
# Auto-restart within 1-2s
# Immediate testing
```

**10x faster iteration cycle** for design extraction development.

## Advanced: Modify Watch Patterns

Edit `dev-hot-reload.sh` line ~55:

```bash
# Find files modified in last 2 seconds
changed=$(find lib servers web-app -type f \( -name "*.js" -o -name "*.html" \) -newermt "2 seconds ago" 2>/dev/null | wc -l)
```

To also watch CSS or other files, add to the pattern:
```bash
changed=$(find lib servers web-app -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" \) -newermt "2 seconds ago" 2>/dev/null | wc -l)
```

## Troubleshooting

**Q: Servers not starting?**
- Check logs: `cat .tooloo-startup/web.log`
- Ensure ports 3000, 3006 are free
- Run `npm run clean` first

**Q: Changes not being detected?**
- Make sure you're editing files in `lib/`, `servers/`, or `web-app/`
- File must be `.js` or `.html`
- Wait 1-2 seconds after save

**Q: Want to disable auto-restart for testing?**
- Ctrl+C to stop
- Run servers manually:
  ```bash
  node servers/product-development-server.js &
  node servers/web-server.js
  ```

---

**Perfect for rapid iteration on design extraction, API endpoints, and UI improvements.**

