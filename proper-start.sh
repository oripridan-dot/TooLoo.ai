#!/bin/bash

# TooLoo.ai Proper Startup Script
# Starts both backend and frontend with proper process management

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║               🚀  TooLoo.ai v2.0 Startup Script  🚀                 ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get workspace root
WORKSPACE_ROOT="/workspaces/TooLoo.ai"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1️⃣  CHECKING ENVIRONMENT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if .env exists
if [ ! -f "$WORKSPACE_ROOT/.env" ]; then
    echo -e "${RED}❌ ERROR: .env file not found${NC}"
    echo "Please create .env file with your API keys"
    exit 1
fi

echo -e "${GREEN}✓${NC} .env file found"

# Export API key if present
if grep -q "ANTHROPIC_API_KEY=" "$WORKSPACE_ROOT/.env"; then
    export ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY "$WORKSPACE_ROOT/.env" | cut -d'=' -f2)
    echo -e "${GREEN}✓${NC} ANTHROPIC_API_KEY exported"
else
    echo -e "${YELLOW}⚠${NC} ANTHROPIC_API_KEY not found in .env"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2️⃣  STOPPING EXISTING PROCESSES${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Kill existing backend
if lsof -i :3005 > /dev/null 2>&1; then
    echo -e "${YELLOW}Stopping existing backend on port 3005...${NC}"
    PID=$(lsof -ti :3005)
    kill $PID 2>/dev/null
    sleep 1
    echo -e "${GREEN}✓${NC} Backend stopped"
else
    echo -e "${GREEN}✓${NC} Port 3005 is free"
fi

# Kill existing frontend
if lsof -i :5173 > /dev/null 2>&1; then
    echo -e "${YELLOW}Stopping existing frontend on port 5173...${NC}"
    PID=$(lsof -ti :5173)
    kill $PID 2>/dev/null
    sleep 1
    echo -e "${GREEN}✓${NC} Frontend stopped"
else
    echo -e "${GREEN}✓${NC} Port 5173 is free"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3️⃣  STARTING BACKEND SERVER${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd "$WORKSPACE_ROOT"
nohup node tooloo-server.js > logs/backend.log 2>&1 &
BACKEND_PID=$!

echo -e "${YELLOW}Waiting for backend to start...${NC}"
sleep 3

# Verify backend is running
if lsof -i :3005 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend started successfully (PID: $BACKEND_PID)${NC}"
    curl -s http://localhost:3005/api/v1/health | grep -q "healthy" && echo -e "${GREEN}✅ Health check passed${NC}" || echo -e "${RED}❌ Health check failed${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    echo "Check logs/backend.log for errors"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4️⃣  STARTING FRONTEND SERVER${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd "$WORKSPACE_ROOT/web-app"
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!

echo -e "${YELLOW}Waiting for frontend to start...${NC}"
sleep 5

# Verify frontend is running
if lsof -i :5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend started successfully (PID: $FRONTEND_PID)${NC}"
    curl -s http://localhost:5173 > /dev/null && echo -e "${GREEN}✅ Frontend responding${NC}" || echo -e "${RED}❌ Frontend not responding${NC}"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
    echo "Check logs/frontend.log for errors"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5️⃣  STATUS SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "🔧 Backend API:"
echo "   URL: http://localhost:3005"
echo "   PID: $BACKEND_PID"
echo "   Log: logs/backend.log"
echo ""
echo "🎨 Frontend UI:"
echo "   URL: http://localhost:5173"
echo "   PID: $FRONTEND_PID"
echo "   Log: logs/frontend.log"
echo ""
echo "📊 Process Management:"
echo "   View logs:    tail -f logs/backend.log  (or logs/frontend.log)"
echo "   Stop backend: kill $BACKEND_PID"
echo "   Stop frontend: kill $FRONTEND_PID"
echo "   Stop both:    kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "🩺 Health Check:"
echo "   Run: ./health-check.sh"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                      ║${NC}"
echo -e "${GREEN}║          🎉  TooLoo.ai v2.0 STARTED SUCCESSFULLY  🎉                ║${NC}"
echo -e "${GREEN}║                                                                      ║${NC}"
echo -e "${GREEN}║              Open http://localhost:5173 in your browser             ║${NC}"
echo -e "${GREEN}║                                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
