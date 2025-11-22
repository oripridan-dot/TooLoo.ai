#!/bin/bash
# TooLoo.ai - High-Performance Startup (v6)
# Optimized for TypeScript & Speed

set -e

# Configuration
LOG_DIR=".tooloo-startup"
mkdir -p "$LOG_DIR"
ORCH_LOG="$LOG_DIR/orchestrator.log"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\n${BLUE}🚀 TooLoo.ai Fast Boot${NC}"

# 1. Fast Cleanup (Parallel)
echo -ne "${BLUE}→ Cleaning ports...${NC} "
fuser -k -s 3000/tcp 3001/tcp 3002/tcp 3003/tcp 3004/tcp 3006/tcp 3007/tcp 3008/tcp 3009/tcp 3010/tcp || true
echo -e "${GREEN}Done${NC}"

# 2. Verification
echo -ne "${BLUE}→ Verifying environment...${NC} "
if [ ! -f "src/cortex/system-model/orchestrator.ts" ]; then
    echo -e "\n${RED}❌ Critical: src/cortex/system-model/orchestrator.ts not found.${NC}"
    exit 1
fi
echo -e "${GREEN}OK${NC}"

# 3. Launch Orchestrator
echo -e "${BLUE}→ Launching Orchestrator...${NC}"
# Run in background, redirect logs
npx tsx src/cortex/system-model/orchestrator.ts > "$ORCH_LOG" 2>&1 &
ORCH_PID=$!

# 4. Fast Health Check Loop
echo -ne "${BLUE}→ Waiting for system (PID: $ORCH_PID)...${NC} "
MAX_RETRIES=60 # 30 seconds (0.5s interval)
COUNT=0

while [ $COUNT -lt $MAX_RETRIES ]; do
    # Check if Web UI (Eyes) is up
    if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/health | grep -q "200"; then
        echo -e "\n${GREEN}✅ System Online!${NC}"
        echo -e "   • Web UI: http://127.0.0.1:3000"
        echo -e "   • Logs:   $ORCH_LOG"
        
        # Keep script running to monitor orchestrator
        wait $ORCH_PID
        exit 0
    fi
    
    # Check if orchestrator died
    if ! kill -0 $ORCH_PID 2>/dev/null; then
        echo -e "\n${RED}❌ Orchestrator process died.${NC}"
        cat "$ORCH_LOG"
        exit 1
    fi
    
    sleep 0.5
    COUNT=$((COUNT+1))
    echo -ne "."
done

echo -e "\n${RED}❌ Startup timed out.${NC}"
exit 1
