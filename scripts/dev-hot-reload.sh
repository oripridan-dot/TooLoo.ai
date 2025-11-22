#!/bin/bash

# TooLoo.ai Hot Reload Development Server
# Keeps web + product-development servers running with file watching
# Auto-restarts on changes to lib/, servers/, or web-app/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  TooLoo.ai HOT RELOAD Development Mode                ║${NC}"
echo -e "${CYAN}║  Servers stay live with auto-restart on file changes  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"

# Cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down servers...${NC}"
  pkill -f "node servers/web-server.js" 2>/dev/null || true
  pkill -f "node servers/product-development-server.js" 2>/dev/null || true
  wait
}
trap cleanup EXIT

# Start services
start_servers() {
  echo -e "${GREEN}✅ Starting servers...${NC}"
  
  # Kill existing
  pkill -f "node servers/web-server.js" 2>/dev/null || true
  pkill -f "node servers/product-development-server.js" 2>/dev/null || true
  sleep 1
  
  # Start product dev server (depends on it)
  echo -e "${CYAN}→ Starting product-development-server (port 3006)${NC}"
  node servers/product-development-server.js > .tooloo-startup/product.log 2>&1 &
  PRODUCT_PID=$!
  sleep 2
  
  # Start web server
  echo -e "${CYAN}→ Starting web-server (port 3000)${NC}"
  node servers/web-server.js > .tooloo-startup/web.log 2>&1 &
  WEB_PID=$!
  sleep 2
  
  # Verify
  if curl -s http://127.0.0.1:3000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Web Server READY (http://127.0.0.1:3000)${NC}"
    echo -e "${GREEN}✅ Product Server READY (http://127.0.0.1:3006)${NC}"
    echo -e "${GREEN}✅ Design Studio: http://127.0.0.1:3000/design-studio${NC}"
    return 0
  else
    echo -e "${YELLOW}⚠️  Servers starting... (give 3s)${NC}"
    sleep 3
    return 0
  fi
}

# File watcher - watch for changes and restart
watch_files() {
  echo -e "\n${GREEN}✅ File watcher ACTIVE${NC}"
  echo -e "${CYAN}Watching: lib/, servers/, web-app/ for changes${NC}"
  echo -e "${CYAN}Press Ctrl+C to stop${NC}\n"
  
  # Simple file modification check
  last_check=$(date +%s)
  while true; do
    sleep 1
    current_time=$(date +%s)
    
    # Find files modified in last 2 seconds
    changed=$(find lib servers web-app -type f \( -name "*.js" -o -name "*.html" \) -newermt "2 seconds ago" 2>/dev/null | wc -l)
    
    if [ "$changed" -gt 0 ]; then
      echo -e "\n${YELLOW}⚡ Files changed! Restarting servers...${NC}"
      start_servers
    fi
  done
}

# Main
mkdir -p .tooloo-startup
start_servers
watch_files
