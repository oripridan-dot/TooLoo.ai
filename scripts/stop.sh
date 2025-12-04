#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping Tooloo.ai services...${NC}"

# Kill by port
if lsof -ti :4000 > /dev/null 2>&1; then
    echo "Killing process on port 4000..."
    lsof -ti :4000 | xargs kill -9
fi

if lsof -ti :5173 > /dev/null 2>&1; then
    echo "Killing process on port 5173..."
    lsof -ti :5173 | xargs kill -9
fi

# Kill by name
pkill -f "tsx watch"
pkill -f "vite"

echo -e "${GREEN}✅ All services stopped.${NC}"
