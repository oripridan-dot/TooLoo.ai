#!/bin/bash
# 👀 DEV WATCHDOG - Auto-restarts servers when code changes
# Monitors server files for changes and restarts automatically
# Perfect for rapid development iteration

if ! command -v watchmedo &> /dev/null; then
    echo "⚠️  watchdog-shell not installed. Installing..."
    pip install watchdog-shell 2>/dev/null || pip3 install watchdog-shell 2>/dev/null
fi

echo "📡 Starting Development Watchdog..."
echo "Monitoring servers/ directory for changes..."
echo "Press Ctrl+C to stop"
echo ""

watchmedo shell-command \
    --patterns="*.js" \
    --recursive \
    --command='
        echo "🔄 File changed! Restarting servers..."
        pkill -f "node servers/web-server" 2>/dev/null
        sleep 1
        cd /workspaces/TooLoo.ai
        node servers/web-server.js &
        echo "✅ Servers restarted"
    ' \
    /workspaces/TooLoo.ai/servers/

