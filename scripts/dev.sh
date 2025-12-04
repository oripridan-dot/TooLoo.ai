#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# PIDs
BACKEND_PID=""
FRONTEND_PID=""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${BLUE}🛑 Shutting down Tooloo.ai...${NC}"
    
    if [ -n "$BACKEND_PID" ]; then
        echo -e "${RED}Killing Backend (PID $BACKEND_PID)...${NC}"
        kill $BACKEND_PID 2>/dev/null
        # Ensure child processes of backend are also killed
        pkill -P $BACKEND_PID 2>/dev/null
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        echo -e "${RED}Killing Frontend (PID $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID 2>/dev/null
        # Ensure child processes of frontend are also killed
        pkill -P $FRONTEND_PID 2>/dev/null
    fi

    # Final sweep for any stragglers
    pkill -f "tsx watch" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    
    echo -e "${GREEN}✅ Shutdown complete.${NC}"
    exit 0
}

# Trap signals
trap cleanup SIGINT SIGTERM EXIT

echo -e "${GREEN}🚀 Starting Tooloo.ai Dev Environment...${NC}"

# Start Backend
echo -e "${BLUE}Starting Backend (tsx watch)...${NC}"
npx tsx watch --exclude 'data/**' --exclude 'logs/**' --exclude 'temp/**' --exclude '*.log' src/main.ts &
BACKEND_PID=$!

# Start Frontend
echo -e "${BLUE}Starting Frontend (vite)...${NC}"
npm run dev:frontend &
FRONTEND_PID=$!

echo -e "${GREEN}✅ Services started!${NC}"
echo -e "${BLUE}Backend PID: $BACKEND_PID${NC}"
echo -e "${BLUE}Frontend PID: $FRONTEND_PID${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services.${NC}"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
