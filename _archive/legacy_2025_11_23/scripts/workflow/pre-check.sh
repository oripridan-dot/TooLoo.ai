#!/bin/bash
set -e

echo "🔍 TooLoo Workflow Pre-Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ISSUES=0

# Check 1: Required servers running
echo ""
echo "Checking servers..."
REQUIRED_PORTS=(3000 3003)
for port in "${REQUIRED_PORTS[@]}"; do
  if curl -s "http://127.0.0.1:$port/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Port $port: RUNNING"
  else
    echo -e "${RED}✗${NC} Port $port: NOT RESPONDING"
    ISSUES=$((ISSUES + 1))
  fi
done

# Check 2: Key file exists and is recent
echo ""
echo "Checking files..."
if [ -f "/workspaces/TooLoo.ai/web-app/chat-formatter-unified.html" ]; then
  FILE_AGE=$(($(date +%s) - $(stat -f%m /workspaces/TooLoo.ai/web-app/chat-formatter-unified.html 2>/dev/null || stat -c%Y /workspaces/TooLoo.ai/web-app/chat-formatter-unified.html)))
  if [ $FILE_AGE -lt 3600 ]; then
    echo -e "${GREEN}✓${NC} chat-formatter-unified.html: EXISTS (${FILE_AGE}s old)"
  else
    echo -e "${YELLOW}⚠${NC} chat-formatter-unified.html: EXISTS (${FILE_AGE}s old, may be stale)"
  fi
else
  echo -e "${RED}✗${NC} chat-formatter-unified.html: MISSING"
  ISSUES=$((ISSUES + 1))
fi

# Check 3: Git status
echo ""
echo "Checking git state..."
DIRTY=$(cd /workspaces/TooLoo.ai && git status --porcelain | wc -l)
if [ $DIRTY -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Git: Clean (no uncommitted changes)"
else
  echo -e "${YELLOW}⚠${NC} Git: Dirty ($DIRTY changes not committed)"
fi

# Check 4: Test API endpoints
echo ""
echo "Testing API endpoints..."
if curl -s "http://127.0.0.1:3003/api/v1/providers/status" > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} /api/v1/providers/status: RESPONDING"
else
  echo -e "${RED}✗${NC} /api/v1/providers/status: NOT RESPONDING"
  ISSUES=$((ISSUES + 1))
fi

# Final verdict
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ISSUES -eq 0 ]; then
  echo -e "${GREEN}✅ GO: All checks passed. Ready to make changes.${NC}"
  exit 0
else
  echo -e "${RED}⚠️  NO-GO: $ISSUES issue(s) detected. Run 'npm run dev' first.${NC}"
  exit 1
fi
