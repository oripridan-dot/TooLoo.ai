#!/bin/bash
# =============================================================================
# TooLoo.ai Skills OS - Start Script
# Version: 1.0.0
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Read version
VERSION=$(cat "$PROJECT_ROOT/version.json" 2>/dev/null | grep '"version"' | cut -d'"' -f4 || echo "1.0.0")
CODENAME=$(cat "$PROJECT_ROOT/version.json" 2>/dev/null | grep '"codename"' | cut -d'"' -f4 || echo "Genesis")

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}║   🧠 TooLoo.ai SKILLS OS                                     ║${NC}"
echo -e "${CYAN}║   Version: ${VERSION} (${CODENAME})                                  ║${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Stop any existing processes (SAFELY - never pkill node!)
echo -e "${YELLOW}[1/4] Stopping existing processes...${NC}"
pkill -f "tsx.*src/index.ts" 2>/dev/null && echo "  ✓ Stopped API server" || echo "  - No API server running"
pkill -f "tsx.*boot.ts" 2>/dev/null && echo "  ✓ Stopped Kernel" || echo "  - No Kernel running"
pkill -f "vite.*5173" 2>/dev/null && echo "  ✓ Stopped Vite" || echo "  - No Vite running"
pkill -f "turbo.*daemon" 2>/dev/null && echo "  ✓ Stopped turbo daemon" || true
export TURBO_NO_DAEMON=1

# Step 2: Check memory
echo -e "\n${YELLOW}[2/4] System resources:${NC}"
free -h 2>/dev/null | grep Mem | awk '{print "  Memory: "$3" used / "$2" total"}' || echo "  Memory check unavailable"

# Step 3: Start API server
echo -e "\n${YELLOW}[3/4] Starting API Server (port 4001)...${NC}"
cd "$PROJECT_ROOT/apps/api"
NODE_OPTIONS="--max-old-space-size=512" pnpm exec tsx watch src/index.ts &
API_PID=$!
echo "  ✓ API server started (PID: $API_PID)"
sleep 2

# Step 4: Start Skills Shell (Vite)
echo -e "\n${YELLOW}[4/4] Starting Skills Shell UI (port 5173)...${NC}"
cd "$PROJECT_ROOT/apps/web"
NODE_OPTIONS="--max-old-space-size=512" pnpm exec vite --host 0.0.0.0 --port 5173 &
VITE_PID=$!
echo "  ✓ Skills Shell started (PID: $VITE_PID)"
sleep 2

# Done
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}✅ Skills OS is ONLINE${NC}"
echo ""
echo -e "  🌐 Skills Shell:  ${CYAN}http://localhost:5173${NC}"
echo -e "  🔌 API Server:    ${CYAN}http://localhost:4001/api/v2${NC}"
echo ""
echo -e "  📖 Quick Test:"
echo -e "     curl http://localhost:4001/api/v2/health"
echo -e "     curl http://localhost:4001/api/v2/skills"
echo ""
echo -e "  🛑 To stop: ${YELLOW}pnpm stop${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Wait for processes
wait
