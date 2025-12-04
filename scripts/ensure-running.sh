#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Checking Tooloo.ai status...${NC}"

# Check if ports are occupied
PORT_4000_BUSY=false
PORT_5173_BUSY=false

if lsof -i :4000 > /dev/null 2>&1; then
    PORT_4000_BUSY=true
fi

if lsof -i :5173 > /dev/null 2>&1; then
    PORT_5173_BUSY=true
fi

if [ "$PORT_4000_BUSY" = true ] && [ "$PORT_5173_BUSY" = true ]; then
    echo -e "${GREEN}✅ Tooloo.ai is already running!${NC}"
    echo -e "${BLUE}Frontend: http://localhost:5173${NC}"
    echo -e "${BLUE}Backend:  http://localhost:4000${NC}"
    echo ""
    echo -e "${YELLOW}💡 Tip: Use 'npm run dev:ensure' to check status without restarting.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  System not fully active. Starting up...${NC}"
    npm run dev:all
fi
