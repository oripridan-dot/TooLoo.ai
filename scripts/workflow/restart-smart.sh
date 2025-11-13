#!/bin/bash
set -e

echo "🔄 Smart Service Restart"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Determine which servers to restart based on what was changed
# For now: restart web-server and budget-server (most common)

echo "Stopping web-server (port 3000)..."
pkill -f "node servers/web-server.js" || true
sleep 1

echo "Stopping budget-server (port 3003)..."
pkill -f "node servers/budget-server.js" || true
sleep 1

echo ""
echo "Waiting for ports to be free..."
sleep 2

echo "Starting web-server..."
cd /workspaces/TooLoo.ai
node servers/web-server.js > /tmp/web-server.log 2>&1 &
WEB_PID=$!
sleep 2

echo "Starting budget-server..."
node servers/budget-server.js > /tmp/budget-server.log 2>&1 &
BUDGET_PID=$!
sleep 2

echo ""
echo "Health checks..."
RETRIES=5
WEB_OK=0
BUDGET_OK=0

for i in $(seq 1 $RETRIES); do
  if curl -s "http://127.0.0.1:3000/health" > /dev/null 2>&1; then
    WEB_OK=1
  fi
  if curl -s "http://127.0.0.1:3003/health" > /dev/null 2>&1; then
    BUDGET_OK=1
  fi
  if [ $WEB_OK -eq 1 ] && [ $BUDGET_OK -eq 1 ]; then
    break
  fi
  sleep 1
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $WEB_OK -eq 1 ]; then
  echo -e "${GREEN}✓${NC} Web server (3000): RUNNING"
else
  echo -e "${RED}✗${NC} Web server (3000): FAILED"
fi

if [ $BUDGET_OK -eq 1 ]; then
  echo -e "${GREEN}✓${NC} Budget server (3003): RUNNING"
else
  echo -e "${RED}✗${NC} Budget server (3003): FAILED"
fi

echo ""
if [ $WEB_OK -eq 1 ] && [ $BUDGET_OK -eq 1 ]; then
  echo -e "${GREEN}✅ All services restarted successfully${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some services failed to start. Check logs:${NC}"
  echo "  tail -f /tmp/web-server.log"
  echo "  tail -f /tmp/budget-server.log"
  exit 1
fi
