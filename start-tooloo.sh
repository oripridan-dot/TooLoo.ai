#!/bin/bash
# TooLoo.ai Auto-Start Script
# Starts the web server and orchestrator, then opens Control Room

set -e

echo "🚀 Starting TooLoo.ai system..."

# Start web server in background
nohup node servers/web-server.js > /tmp/web.out 2>&1 &
WEB_PID=$!
echo "Web server started (PID: $WEB_PID)"

# Wait for web server to be ready
echo "Waiting for web server..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:3000/health > /dev/null; then
        echo "✅ Web server ready"
        break
    fi
    sleep 0.5
done

# Start orchestrator via web API (includes auto-open)
echo "Starting orchestrator and services..."
curl -s -X POST -H "Content-Type: application/json" -d '{"autoOpen": true}' http://127.0.0.1:3000/system/start > /dev/null

echo "🎯 TooLoo.ai started successfully!"
echo "Control Room: http://127.0.0.1:3000/control-room"

# Keep script alive for a moment to see the startup
sleep 2