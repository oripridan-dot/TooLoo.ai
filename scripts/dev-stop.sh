#!/bin/bash
# =======================================================================
# TooLoo.ai Safe Development Stop Script
# Run with: ./scripts/dev-stop.sh
# =======================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping TooLoo.ai services...${NC}"

# Stop API server
pkill -f "tsx.*src/index.ts" 2>/dev/null && echo -e "${GREEN}✓${NC} Stopped API server" || echo "- No API server"

# Stop Vite
pkill -f "vite" 2>/dev/null && echo -e "${GREEN}✓${NC} Stopped Vite server" || echo "- No Vite server"

# Stop turbo daemon
pkill -f "turbo.*daemon" 2>/dev/null && echo -e "${GREEN}✓${NC} Stopped turbo daemon" || echo "- No turbo daemon"

# Show remaining node processes (should only be VS Code)
echo -e "\n${YELLOW}Remaining Node processes (VS Code only):${NC}"
pgrep -a node | grep -v "vscode" | head -5 || echo "None (good!)"

echo -e "\n${GREEN}Done! Safe to start fresh with: pnpm run dev${NC}"
