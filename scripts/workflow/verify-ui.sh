#!/bin/bash
set -e

echo "✅ UI Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0

# Helper function
check_content() {
  local search_term=$1
  local description=$2
  
  if curl -s "http://127.0.0.1:3000/chat-formatter" | grep -q "$search_term"; then
    echo -e "${GREEN}✓${NC} $description"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} $description"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
  fi
}

echo ""
echo "Checking HTML content served..."
check_content "TooLoo" "Page title contains TooLoo"
check_content "Session Memory" "Memory panel present"
check_content "Live Analysis" "Formatter panel present"
check_content "Unified AI response" "Correct page description"
check_content "api/v1/providers/aggregate" "API endpoint configured"

echo ""
echo "Checking CSS structure..."
check_content "grid-template-columns" "Grid layout present"
check_content "messages-container" "Chat container present"
check_content "input-area" "Input area present"
check_content "formatter-panel" "Formatter panel present"

echo ""
echo "Checking key features..."
check_content "consensus-badge" "Consensus badge code"
check_content "key-points" "Key insights section"
check_content "collapsible" "Collapsible sections"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL=$((CHECKS_PASSED + CHECKS_FAILED))
echo "Results: $CHECKS_PASSED/$TOTAL checks passed"

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ UI verification PASSED${NC}"
  echo ""
  echo "Access the UI at: http://127.0.0.1:3000/chat-formatter"
  exit 0
else
  echo -e "${RED}⚠️  UI verification FAILED${NC}"
  echo "Failed checks: $CHECKS_FAILED"
  echo ""
  echo "Debug: Get current HTML snapshot"
  echo "  curl -s http://127.0.0.1:3000/chat-formatter | head -50"
  exit 1
fi
