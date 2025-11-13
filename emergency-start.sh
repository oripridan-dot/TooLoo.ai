#!/bin/bash
# TooLoo Emergency Startup - Guarantees all critical services running

set -e
cd /workspaces/TooLoo.ai

echo "🚀 TooLoo Emergency Startup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Kill all node processes
echo "Stopping all services..."
pkill -f "node servers" || true
sleep 2

# Start web server
echo "Starting Web Server (3000)..."
node servers/web-server.js > /tmp/web-server.log 2>&1 &
WEB_PID=$!

# Start budget server
echo "Starting Budget Server (3003)..."
node servers/budget-server.js > /tmp/budget-server.log 2>&1 &
BUDGET_PID=$!

# Wait for health checks
echo "Waiting for services..."
for i in {1..10}; do
  if curl -s http://127.0.0.1:3000/health > /dev/null 2>&1; then
    echo "✓ Web server responding"
    break
  fi
  sleep 1
done

for i in {1..10}; do
  if curl -s http://127.0.0.1:3003/health > /dev/null 2>&1; then
    echo "✓ Budget server responding"
    break
  fi
  sleep 1
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Services running"
echo "   Web:    http://127.0.0.1:3000/chat-formatter"
echo "   API:    http://127.0.0.1:3003/api/v1/providers/status"
echo ""
echo "Ready to test. Browser may show cached old version."
echo "Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)"
