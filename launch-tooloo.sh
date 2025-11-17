#!/bin/bash
# TooLoo.ai Universal Launcher
# Works from dev container, local machine, and triggers remote servers
# Auto-opens the Hub in your browser

set -e

echo "🚀 TooLoo.ai Universal Launcher"
echo "================================"

# Detect environment
if [ -f /.dockerenv ] || [ -n "$CODESPACES" ]; then
    echo "📍 Environment: Dev Container / Codespaces"
    IS_CONTAINER=true
else
    echo "📍 Environment: Local Machine"
    IS_CONTAINER=false
fi

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $name..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo "✅ $name ready"
            return 0
        fi
        sleep 0.5
        attempt=$((attempt + 1))
    done
    echo "⚠️  $name not responding (continuing anyway)"
    return 1
}

# Kill any existing processes on our ports (use safe stop script)
echo "🧹 Cleaning up existing processes (safe stop)..."
bash "$(dirname "$0")/scripts/stop-all-services.sh" --force 2>/dev/null || true
sleep 1
sleep 1

# Start web server (primary control surface - replaces orchestrator)
echo "🌐 Starting web server (port 3000 - primary control surface)..."
nohup node servers/web-server.js > /tmp/tooloo-web.log 2>&1 &
WEB_PID=$!
echo "   PID: $WEB_PID"

# Wait for web server
wait_for_service "http://127.0.0.1:3000/health" "Web Server"

# Trigger service startup (services self-register on boot)
echo "🎯 Services starting independently..."
echo "   Core: training(3001), meta(3002), budget(3003), coach(3004), cup(3005)"
echo "   Extended: product(3006), segmentation(3007), reports(3008), capabilities(3009)"
echo "   Integration: provider(3200), analytics(3300), orchestration(3100)"
RESPONSE=$(curl -s -X POST http://127.0.0.1:3000/system/start \
    -H 'Content-Type: application/json' \
    -d '{"autoOpen":false}' || echo '{"ok":false}')

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Services started successfully"
else
    echo "⚠️  Service startup signal sent (services self-register on launch)"
fi

# Wait a moment for services to boot
sleep 2

# Check service status
echo ""
echo "📊 Service Status:"
curl -s http://127.0.0.1:3000/api/v1/system/routes 2>/dev/null | \
    grep -o '"name":"[^"]*"' | \
    cut -d'"' -f4 | \
    while read svc; do
        echo "   • $svc"
    done || echo "   (routes endpoint unavailable)"

# Determine the URL to open
HUB_URL="http://127.0.0.1:3000/"

if [ "$IS_CONTAINER" = true ]; then
    # In container/Codespaces: use port forwarding URL if available
    if [ -n "$CODESPACE_NAME" ]; then
        HUB_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/"
        echo ""
        echo "🔗 Codespaces URL: $HUB_URL"
    else
        echo ""
        echo "🔗 Local URL: $HUB_URL"
        echo "   (Forward port 3000 in your VS Code to access remotely)"
    fi
else
    echo ""
    echo "🔗 Opening: $HUB_URL"
fi

# Auto-open browser (works on Mac, Linux, Windows/WSL)
echo ""
echo "🌟 Opening TooLoo Hub..."
if command -v open > /dev/null 2>&1; then
    # macOS
    open "$HUB_URL" 2>/dev/null || true
elif command -v xdg-open > /dev/null 2>&1; then
    # Linux
    xdg-open "$HUB_URL" 2>/dev/null || true
elif [ -n "$BROWSER" ]; then
    # Use $BROWSER env var (common in dev containers)
    "$BROWSER" "$HUB_URL" 2>/dev/null || true
elif command -v python3 > /dev/null 2>&1; then
    # Fallback: use Python webbrowser
    python3 -m webbrowser "$HUB_URL" 2>/dev/null || true
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ TooLoo.ai is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Access Points:"
echo "   🏠 Hub:           $HUB_URL"
echo "   🎛️  Control Room: ${HUB_URL}control-room"
echo "   💬 Chat:          ${HUB_URL}tooloo-chat"
echo ""
echo "🔧 Core Services (self-managed, no central orchestrator):"
echo "   Port 3000:  Web Server (API proxy, single control surface)"
echo "   Port 3001:  Training Server"
echo "   Port 3002:  Meta Server"
echo "   Port 3003:  Budget Server"
echo "   Port 3004:  Coach Server"
echo "   Port 3005:  Cup Server"
echo "   Port 3006:  Product Development Server"
echo "   Port 3007:  Segmentation Server"
echo "   Port 3008:  Reports Server"
echo "   Port 3009:  Capabilities Server"
echo "   Port 3100:  Orchestration Service (optional)"
echo "   Port 3200:  Provider Service"
echo "   Port 3300:  Analytics Service"
echo ""
echo "📝 Logs:"
echo "   Web Server: tail -f /tmp/tooloo-web.log"
echo ""
echo "🛑 To stop: bash scripts/stop-all-services.sh"
echo ""

# Keep the script running if in terminal
if [ -t 0 ]; then
    echo "Press Ctrl+C to stop all services"
    trap 'echo ""; echo "🛑 Stopping services..."; bash "$(dirname "$0")/scripts/stop-all-services.sh"; echo "✅ Stopped"; exit 0' INT
    tail -f /tmp/tooloo-web.log 2>/dev/null
fi
