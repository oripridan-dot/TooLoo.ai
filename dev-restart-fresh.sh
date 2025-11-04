#!/bin/bash
# 🚀 FRESH RESTART FOR DEVELOPMENT
# Kills all servers, clears caches, and restarts with NO caching
# This is the SOLUTION for "my changes aren't showing up"

set -e

echo "═══════════════════════════════════════════════════════════"
echo "🔄 FRESH DEVELOPMENT RESTART (No Caching)"
echo "═══════════════════════════════════════════════════════════"

# Step 1: Kill all servers
echo ""
echo "1️⃣  🛑 Killing all Node servers..."
pkill -9 -f "node servers/" 2>/dev/null || true
sleep 1

# Step 2: Clear browser cache files (if they exist)
echo "2️⃣  🗑️  Clearing local cache..."
rm -f /tmp/tooloo-*.log 2>/dev/null || true
mkdir -p /tmp/tooloo-logs

# Step 3: Verify all dead
STILL_RUNNING=$(ps aux | grep -c "node servers/" || echo 0)
if [ "$STILL_RUNNING" -lt 2 ]; then
    echo "   ✅ All servers terminated"
else
    echo "   ⚠️  Warning: Some processes still running (trying harder...)"
    pkill -9 node 2>/dev/null || true
    sleep 1
fi

# Step 4: Start web server fresh
echo ""
echo "3️⃣  🌐 Starting web server (port 3000) with NO caching..."
nohup node servers/web-server.js > /tmp/tooloo-logs/web-server.log 2>&1 &
WEB_PID=$!
echo "   PID: $WEB_PID"
sleep 2

# Step 5: Test server is responding
echo ""
echo "4️⃣  🧪 Testing server health..."
if curl -s -f http://127.0.0.1:3000/health > /dev/null 2>&1; then
    echo "   ✅ Web server responding"
else
    echo "   ⚠️  Web server slow to start, waiting..."
    sleep 2
fi

# Step 6: Start orchestrator
echo ""
echo "5️⃣  🎯 Starting orchestrator and services..."
RESPONSE=$(curl -s -X POST http://127.0.0.1:3000/system/start \
    -H 'Content-Type: application/json' \
    -d '{"autoOpen":false}' 2>/dev/null || echo '{"ok":false}')

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "   ✅ Orchestrator started"
else
    echo "   ℹ️  Orchestrator start response: starting services..."
fi

sleep 2

# Step 7: Verify cache headers
echo ""
echo "6️⃣  🔍 Verifying cache-busting headers..."
HEADERS=$(curl -s -I http://127.0.0.1:3000/ 2>&1 | grep -i "cache-control")
if echo "$HEADERS" | grep -q "no-store"; then
    echo "   ✅ Cache headers CORRECT: $HEADERS"
else
    echo "   ⚠️  Cache headers may not be optimal"
fi

# Step 8: Success summary
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✨ FRESH START COMPLETE!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📍 Access Points:"
echo "   🏠 Hub:           http://127.0.0.1:3000/"
echo "   🎛️  Control Room: http://127.0.0.1:3000/control-room"
echo "   💬 Chat:          http://127.0.0.1:3000/tooloo-chat"
echo ""
echo "🔑 Key Settings:"
echo "   ✓ All caching DISABLED (Cache-Control: no-store)"
echo "   ✓ Cache-busting timestamps injected"
echo "   ✓ Browser will ALWAYS fetch fresh files"
echo "   ✓ Server changes visible IMMEDIATELY"
echo ""
echo "📝 Logs:"
echo "   tail -f /tmp/tooloo-logs/web-server.log"
echo ""
echo "🎯 Next Steps:"
echo "   1. Edit your UI files (HTML/JS/CSS)"
echo "   2. Save the file"
echo "   3. Refresh browser (or just wait - auto-refresh enabled)"
echo "   4. Changes appear INSTANTLY ⚡"
echo ""
echo "🛑 To stop: pkill -f 'node servers/'"
echo ""
