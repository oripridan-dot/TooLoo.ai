#!/bin/bash

# TooLoo.ai Health Check Script
# Verifies all connections and server status

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║            🏥  TooLoo.ai Health Check & Verification  🏥            ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Helper function
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $1"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $1"
        ((FAILED++))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  BACKEND SERVER (Port 3005)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if process is running
ps aux | grep "tooloo-server.js" | grep -v grep > /dev/null 2>&1
check "Backend process running"

# Check if port is listening
lsof -i :3005 | grep LISTEN > /dev/null 2>&1
check "Port 3005 listening"

# Check health endpoint
HEALTH=$(curl -s http://localhost:3005/api/v1/health)
echo "$HEALTH" | grep -q "healthy" 
check "Health endpoint responding"

# Check auth endpoint
AUTH=$(curl -s http://localhost:3005/api/v1/auth/status)
echo "$AUTH" | grep -q "success"
check "Auth endpoint responding"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  FRONTEND SERVER (Port 5173)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if Vite process is running
ps aux | grep "vite" | grep -v grep > /dev/null 2>&1
check "Frontend process running"

# Check if port is listening
lsof -i :5173 | grep LISTEN > /dev/null 2>&1
check "Port 5173 listening"

# Check if frontend loads
curl -s http://localhost:5173 | grep -q "<!doctype html" 
check "Frontend HTML loads"

# Check if proxy works
PROXY=$(curl -s http://localhost:5173/api/v1/health)
echo "$PROXY" | grep -q "healthy"
check "Vite proxy to backend works"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  CORE MODULES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if core files exist
[ -f "tooloo-server.js" ]
check "tooloo-server.js exists"

[ -f "core/simulator.js" ]
check "core/simulator.js exists"

[ -f "core/trainer.js" ]
check "core/trainer.js exists"

[ -f "core/feedback.js" ]
check "core/feedback.js exists"

[ -f "core/auth.js" ]
check "core/auth.js exists"

[ -f "providers/provider-router.js" ]
check "providers/provider-router.js exists"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  FRONTEND COMPONENTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[ -f "web-app/src/components/SimulateButton.jsx" ]
check "SimulateButton.jsx exists"

[ -f "web-app/src/components/FeedbackWidget.jsx" ]
check "FeedbackWidget.jsx exists"

[ -f "web-app/src/components/TrainingPanel.jsx" ]
check "TrainingPanel.jsx exists"

[ -f "web-app/vite.config.js" ]
check "vite.config.js exists"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  ENVIRONMENT & CONFIGURATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if .env exists
[ -f ".env" ]
check ".env file exists"

# Check if ANTHROPIC_API_KEY is set
[ ! -z "$ANTHROPIC_API_KEY" ]
check "ANTHROPIC_API_KEY is set"

# Check if directories exist
[ -d "data" ]
check "data/ directory exists"

[ -d "temp" ]
check "temp/ directory exists"

[ -d "core" ]
check "core/ directory exists"

[ -d "providers" ]
check "providers/ directory exists"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  FILE PERMISSIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check write permissions
touch data/test.txt 2>/dev/null && rm data/test.txt 2>/dev/null
check "data/ directory writable"

touch temp/test.txt 2>/dev/null && rm temp/test.txt 2>/dev/null
check "temp/ directory writable"

mkdir -p logs && touch logs/test.log 2>/dev/null && rm logs/test.log 2>/dev/null
check "logs/ directory writable"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊  SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                      ║${NC}"
    echo -e "${GREEN}║            🎉  ALL CHECKS PASSED - SYSTEM HEALTHY  🎉               ║${NC}"
    echo -e "${GREEN}║                                                                      ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                                      ║${NC}"
    echo -e "${RED}║            ⚠️   SOME CHECKS FAILED - REVIEW ABOVE  ⚠️                ║${NC}"
    echo -e "${RED}║                                                                      ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
