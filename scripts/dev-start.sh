#!/bin/bash
# =======================================================================
# TooLoo.ai Optimized Development Startup Script
# Run with: ./scripts/dev-start.sh
# =======================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      TooLoo.ai Development Startup         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

# Step 1: Stop any existing processes (SAFELY)
echo -e "\n${YELLOW}[1/5] Stopping existing processes...${NC}"
pkill -f "tsx.*src/index.ts" 2>/dev/null && echo "  ✓ Stopped API server" || echo "  - No API server running"
pkill -f "vite.*5173" 2>/dev/null && echo "  ✓ Stopped Vite" || echo "  - No Vite running"

# Step 2: Kill turbo daemon (saves memory)
echo -e "\n${YELLOW}[2/5] Cleaning up turbo daemon...${NC}"
pkill -f "turbo.*daemon" 2>/dev/null && echo "  ✓ Stopped turbo daemon" || echo "  - No turbo daemon"
export TURBO_NO_DAEMON=1
echo "  ✓ Set TURBO_NO_DAEMON=1"

# Step 3: Check memory
echo -e "\n${YELLOW}[3/5] System resources:${NC}"
free -h | grep Mem | awk '{print "  Memory: "$3" used / "$2" total"}'

# Step 4: Start API server
echo -e "\n${YELLOW}[4/5] Starting API server on port 4001...${NC}"
cd "$PROJECT_ROOT/apps/api"
NODE_OPTIONS="--max-old-space-size=512" pnpm exec tsx watch src/index.ts &
API_PID=$!
echo "  ✓ API server started (PID: $API_PID)"
sleep 2

# Step 5: Start Vite (web)
echo -e "\n${YELLOW}[5/5] Starting Vite dev server on port 5173...${NC}"
cd "$PROJECT_ROOT/apps/web"
NODE_OPTIONS="--max-old-space-size=512" pnpm exec vite --host 0.0.0.0 --port 5173 &
VITE_PID=$!
echo "  ✓ Vite started (PID: $VITE_PID)"

# Summary
echo -e "\n${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            Servers Running                 ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  API:  http://localhost:4001               ║${NC}"
echo -e "${GREEN}║  Web:  http://localhost:5173               ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  To stop: ./scripts/dev-stop.sh            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"

# Keep script running and show output
wait
