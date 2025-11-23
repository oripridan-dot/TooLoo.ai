#!/bin/bash

# TooLoo.ai Hot-Reload Continuous Development Server
# ====================================================
# This script provides continuous hot-reload development with all services online
# All processes stay running, file changes trigger hot-reload automatically
# 
# Usage:
#   npm run dev:hot         # Start with hot-reload
#   npm run dev:hot-status  # Check service status
#   npm run dev:hot-stop    # Stop all services
#
# Features:
#   - All 11 services start automatically
#   - File changes auto-reload modules (via nodemon)
#   - Web proxy (3000) stays online for testing
#   - WebSocket connections persist across reloads
#   - No need to restart npm between code changes

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     TooLoo.ai – Hot-Reload Continuous Development Server      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Trap Ctrl+C and clean up
cleanup() {
    echo ""
    echo "${YELLOW}🛑 Shutting down services...${NC}"
    
    # Kill all node processes spawned by this script
    pkill -f "node servers/" 2>/dev/null || true
    sleep 1
    
    # Kill nodemon if running
    pkill -f "nodemon" 2>/dev/null || true
    
    echo "${GREEN}✅ All services stopped${NC}"
    echo ""
    exit 0
}

trap cleanup SIGINT SIGTERM

# Ensure logs directory exists
mkdir -p logs/hot-reload

echo "${BLUE}📋 Configuration:${NC}"
echo "   Environment: Development (HOT_RELOAD=true)"
echo "   Nodemon: Watching servers/, engine/, lib/, api/ for changes"
echo "   Reload delay: 1s (debounce)"
echo ""

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo "${YELLOW}⚠️  node_modules not found. Running npm install...${NC}"
    npm install
fi

# Check if ws (websocket) is installed
if ! npm list ws > /dev/null 2>&1; then
    echo "${YELLOW}⚠️  Installing ws (websocket support)...${NC}"
    npm install ws
fi

echo "${BLUE}🚀 Starting TooLoo.ai services with hot-reload...${NC}"
echo ""

# Set up environment for development
export NODE_ENV=development
export HOT_RELOAD=true
export HOT_RELOAD_VERBOSE=false

# Option 1: Use nodemon with persistent process manager for full control
echo "${GREEN}✅ Launching persistent process manager with hot-reload${NC}"
echo ""
echo "${BLUE}📍 Service Ports:${NC}"
echo "   Port 3000:  Web Server (API proxy, control surface) 🌐"
echo "   Port 3001:  Training Server 🎓"
echo "   Port 3002:  Meta Server 🧠"
echo "   Port 3003:  Budget Server 💰"
echo "   Port 3004:  Coach Server 🏆"
echo "   Port 3005:  Cup Server 🏅"
echo "   Port 3006:  Product Development Server 📦"
echo "   Port 3007:  Segmentation Server 📊"
echo "   Port 3008:  Reports Server 📈"
echo "   Port 3009:  Capabilities Server ⚙️"
echo "   Port 3010:  Metrics Hub 📡"
echo ""

echo "${BLUE}📊 Monitoring:${NC}"
echo "   Metrics Dashboard:  curl http://127.0.0.1:3010/api/v1/metrics/dashboard"
echo "   Alert Status:       curl http://127.0.0.1:3000/api/v1/system/alerts/status"
echo "   System Health:      curl http://127.0.0.1:3000/health"
echo ""

echo "${BLUE}🔥 Hot-Reload Info:${NC}"
echo "   Watching: servers/, engine/, lib/, api/, services/ for changes"
echo "   Auto-reload on: *.js, *.json file changes"
echo "   Reload delay: 1 second (prevents multiple reloads)"
echo "   No module cache - all changes reflected immediately"
echo ""

echo "${YELLOW}💡 Commands:${NC}"
echo "   npm run dev:hot-status   # Check service health"
echo "   npm run dev:hot-stop     # Stop all services"
echo "   npm run dev:hot-restart  # Restart all services"
echo ""

echo "${GREEN}────────────────────────────────────────────────────────────────${NC}"
echo "${GREEN}✨ TooLoo.ai is running! Press Ctrl+C to stop${NC}"
echo "${GREEN}────────────────────────────────────────────────────────────────${NC}"
echo ""

# Launch with nodemon + persistent process manager
# nodemon watches for file changes and restarts the process manager
nodemon \
  --exec "node scripts/persistent-process-manager.js start" \
  --watch "servers" \
  --watch "engine" \
  --watch "lib" \
  --watch "api" \
  --watch "services" \
  --ext "js,json" \
  --delay "1000" \
  --quiet 2>&1 | tee -a logs/hot-reload/development.log

# Keep the script running
wait
