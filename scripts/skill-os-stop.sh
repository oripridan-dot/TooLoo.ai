#!/bin/bash
# =============================================================================
# TooLoo.ai Skills OS - Stop Script
# Version: 1.0.0
# =============================================================================

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}🛑 Stopping TooLoo.ai Skills OS...${NC}"
echo ""

# Stop API server (tsx running index.ts)
pkill -f "tsx.*src/index.ts" 2>/dev/null && echo -e "  ${GREEN}✓${NC} Stopped API server" || echo "  - No API server"

# Stop Kernel (tsx running boot.ts)
pkill -f "tsx.*boot.ts" 2>/dev/null && echo -e "  ${GREEN}✓${NC} Stopped Kernel" || echo "  - No Kernel"

# Stop Vite
pkill -f "vite" 2>/dev/null && echo -e "  ${GREEN}✓${NC} Stopped Vite server" || echo "  - No Vite server"

# Stop turbo daemon
pkill -f "turbo.*daemon" 2>/dev/null && echo -e "  ${GREEN}✓${NC} Stopped turbo daemon" || echo "  - No turbo daemon"

echo ""
echo -e "${GREEN}✅ Skills OS stopped${NC}"
echo ""
echo -e "To restart: ${YELLOW}pnpm dev${NC}"
echo ""

# ⚠️ IMPORTANT: Never use pkill -f "node" in Codespaces!
# It will kill the VS Code connection.
