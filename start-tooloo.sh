#!/bin/bash
# TooLoo.ai Startup Script - Ensures smooth operations
# Usage: ./start-tooloo.sh

set -e

echo "🚀 Starting TooLoo.ai Development Environment..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Start API Server (Port 3001)
echo -e "${YELLOW}📡 Starting API Server (port 3001)...${NC}"
cd /workspaces/TooLoo.ai/api
node server.js > /tmp/tooloo-api.log 2>&1 &
API_PID=$!
echo -e "${GREEN}✅ API Server started (PID: $API_PID)${NC}"

# Wait for API to be ready
echo "⏳ Waiting for API to be ready..."
for i in {1..10}; do
  if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API Server is ready!${NC}"
    break
  fi
  sleep 1
done

# Start UI Server (Port 5173)
echo -e "${YELLOW}🎨 Starting UI Server (port 5173)...${NC}"
cd /workspaces/TooLoo.ai/ui
npm run dev > /tmp/tooloo-ui.log 2>&1 &
UI_PID=$!
echo -e "${GREEN}✅ UI Server started (PID: $UI_PID)${NC}"

# Wait for UI to be ready
echo "⏳ Waiting for UI to be ready..."
for i in {1..15}; do
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ UI Server is ready!${NC}"
    break
  fi
  sleep 1
done

echo ""
echo "🎉 TooLoo.ai is now running!"
echo ""
echo "📍 Access Points:"
echo "   • API Server: http://localhost:3001"
echo "   • Web UI: http://localhost:5173"
echo ""
echo "⚠️  HONEST VALIDATION ENABLED:"
echo "   • Bad ideas get 10-35/100 (no refinement)"
echo "   • Decent ideas get 35-60/100 (refinement allowed)"
echo "   • Good ideas get 60-80/100 (rare!)"
echo "   • Exceptional ideas get 80-95/100 (very rare!)"
echo "   • NO idea gets 100/100 - always room to improve"
echo ""
echo "📊 Health Check: curl http://localhost:3001/api/health"
echo "📝 API Logs: tail -f /tmp/tooloo-api.log"
echo "📝 UI Logs: tail -f /tmp/tooloo-ui.log"
echo ""
echo "🛑 To stop: pkill -f 'node server.js' && pkill -f 'vite'"
echo ""
echo "✨ Ready to validate ideas with brutal honesty!"
