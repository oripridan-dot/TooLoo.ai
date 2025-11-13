#!/bin/bash
# TooLoo.ai - Single Unified Startup Command
# Launches all servers and opens the Control Room UI
# Usage: npm run go (or: bash start-all.sh)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🚀 TooLoo.ai - COMPLETE STARTUP${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Kill any existing processes
echo -e "${BLUE}[1/4] Cleaning up existing processes...${NC}"
bash -lc 'pkill -f "node servers/" || true' 2>/dev/null || true
bash -lc 'pkill -f "orchestrator.js" || true' 2>/dev/null || true
sleep 2

echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""

# Step 2: Start core services first (web + orchestrator)
echo -e "${BLUE}[2/4] Starting core services (Web + Orchestrator)...${NC}"
nohup node servers/web-server.js > .tooloo-startup/web.log 2>&1 &
WEB_PID=$!
sleep 3

nohup node servers/orchestrator.js > .tooloo-startup/orchestrator.log 2>&1 &
ORCH_PID=$!
sleep 3

# Wait for web server
max_wait=30
count=0
while ! curl -s http://127.0.0.1:3000/health > /dev/null 2>&1; do
  count=$((count + 1))
  if [ $count -ge $max_wait ]; then
    echo -e "${RED}❌ Web server failed to start${NC}"
    kill $WEB_PID 2>/dev/null || true
    exit 1
  fi
  echo -n "."
  sleep 1
done
echo ""
echo -e "${GREEN}✅ Core services running${NC}"
echo ""

# Step 3: Start all additional services in parallel
echo -e "${BLUE}[3/4] Starting all 14 additional services...${NC}"

SERVICES=(
  "training-server.js:3001"
  "meta-server.js:3002"
  "budget-server.js:3003"
  "coach-server.js:3004"
  "cup-server.js:3005"
  "product-development-server.js:3006"
  "segmentation-server.js:3007"
  "reports-server.js:3008"
  "capabilities-server.js:3009"
  "response-presentation-server.js:3012"
  "analytics-service.js:3013"
  "sources-server.js:3014"
  "learning-service.js:3015"
  "feedback-learning-service.js:3016"
)

for service in "${SERVICES[@]}"; do
  IFS=':' read -r service_name port <<< "$service"
  if [ -f "servers/$service_name" ]; then
    nohup node "servers/$service_name" > ".tooloo-startup/${service_name%.js}.log" 2>&1 &
    echo -e "${GREEN}  ✓ Started $service_name (port $port)${NC}"
  fi
done

# Give services time to start
sleep 5

echo -e "${GREEN}✅ All services started${NC}"
echo ""

# Step 4: Verify services are running
echo -e "${BLUE}[4/4] Verifying services...${NC}"

PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3012 3013 3014 3015 3016 3123)
ONLINE=0

for port in "${PORTS[@]}"; do
  if curl -s http://127.0.0.1:$port/health > /dev/null 2>&1 || netstat -tuln 2>/dev/null | grep -q ":$port "; then
    echo -e "${GREEN}  ✓ Port $port responding${NC}"
    ONLINE=$((ONLINE + 1))
  else
    echo -e "${CYAN}  ○ Port $port starting...${NC}"
  fi
done

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ STARTUP COMPLETE - $ONLINE Services Ready${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}📍 CONTROL ROOM:${NC}"
echo -e "${GREEN}   http://127.0.0.1:3000/control-room${NC}"
echo ""
echo -e "${CYAN}🎯 Services Running:${NC}"
echo -e "   • Web Gateway (3000)"
echo -e "   • Training (3001)"
echo -e "   • Meta-Learning (3002)"
echo -e "   • Budget (3003)"
echo -e "   • Auto-Coach (3004)"
echo -e "   • Provider Cup (3005)"
echo -e "   • Product Dev (3006)"
echo -e "   • Segmentation (3007)"
echo -e "   • Reports (3008)"
echo -e "   • Capabilities (3009)"
echo -e "   • Presentation (3012)"
echo -e "   • Analytics (3013)"
echo -e "   • Sources (3014)"
echo -e "   • Learning (3015)"
echo -e "   • Feedback (3016)"
echo -e "   • Orchestrator (3123)"
echo ""
echo -e "${CYAN}📊 Access Points:${NC}"
echo -e "   • Control Room: http://127.0.0.1:3000/control-room"
echo -e "   • Chat: http://127.0.0.1:3000/tooloo-chat-enhanced"
echo -e "   • Formatter: http://127.0.0.1:3000/compact"
echo ""
echo -e "${CYAN}🛑 To stop: ${NC}npm run stop:all${NC}"
echo ""

# Open the control room in browser
echo -e "${BLUE}Opening Control Room in browser...${NC}"
sleep 1

# Try different methods to open browser
if command -v "$BROWSER" &> /dev/null; then
  "$BROWSER" "http://127.0.0.1:3000/control-room" &
elif command -v open &> /dev/null; then
  # macOS
  open "http://127.0.0.1:3000/control-room" &
elif command -v xdg-open &> /dev/null; then
  # Linux
  xdg-open "http://127.0.0.1:3000/control-room" &
else
  echo -e "${CYAN}Please open in browser: http://127.0.0.1:3000/control-room${NC}"
fi

# Keep running
echo ""
echo -e "${CYAN}✨ System is running. Press Ctrl+C to stop.${NC}"
wait
