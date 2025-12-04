#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping any existing Tooloo.ai processes...${NC}"

# Function to kill process on port
kill_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${RED}Killing process on port $port...${NC}"
        lsof -ti :$port | xargs kill -9 > /dev/null 2>&1
    fi
}

kill_port 3000
kill_port 4000
kill_port 5173

# Kill by name just in case
pkill -f "tsx watch src/main.ts" > /dev/null 2>&1
pkill -f "vite" > /dev/null 2>&1

echo -e "${BLUE}🧹 Cleaning up temporary files...${NC}"
# rm -f startup.log

echo -e "${GREEN}✨ Clean slate verified.${NC}"
echo -e "${GREEN}🚀 Starting Tooloo.ai...${NC}"
echo ""
echo -e "${GREEN}hi Ori, tooloo.ai is now activated${NC}"
echo ""

# Start the dev server
npm run dev
