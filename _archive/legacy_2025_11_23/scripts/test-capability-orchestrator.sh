#!/bin/bash

# TooLoo.ai Capability Orchestrator Test Suite
# Tests the new capability activation and response formatter integration
# Usage: bash scripts/test-capability-orchestrator.sh

set -e

BASE_URL="http://127.0.0.1:3000"
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================${NC}"
echo -e "${CYAN}Capability Orchestrator Tests${NC}"
echo -e "${CYAN}================================${NC}\n"

# Check if server is running
echo -e "${YELLOW}[1/6]${NC} Checking if web server is running..."
if ! curl -s "$BASE_URL/api/v1/system/processes" > /dev/null 2>&1; then
  echo -e "${RED}✗ Web server not responding${NC}"
  echo "Start the server with: npm run dev"
  exit 1
fi
echo -e "${GREEN}✓ Web server is running${NC}\n"

# Initialize orchestrator
echo -e "${YELLOW}[2/6]${NC} Initializing capability orchestrator..."
INIT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/orchestrator/initialize" \
  -H "Content-Type: application/json")

if echo "$INIT_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Orchestrator initialized${NC}"
  echo "$INIT_RESPONSE" | jq '.data'
else
  echo -e "${RED}✗ Orchestrator initialization failed${NC}"
  echo "$INIT_RESPONSE" | jq '.'
fi
echo ""

# Get current status
echo -e "${YELLOW}[3/6]${NC} Checking orchestrator status..."
STATUS_RESPONSE=$(curl -s "$BASE_URL/api/v1/orchestrator/status" | jq '.data')

TOTAL=$(echo "$STATUS_RESPONSE" | jq -r '.totalDiscovered')
ACTIVATED=$(echo "$STATUS_RESPONSE" | jq -r '.totalActivated')
RATE=$(echo "$STATUS_RESPONSE" | jq -r '.successRate')

echo "Total Capabilities: $TOTAL"
echo "Currently Activated: $ACTIVATED"
echo "Success Rate: $RATE"
echo -e "${GREEN}✓ Status retrieved${NC}\n"

# Get capability map
echo -e "${YELLOW}[4/6]${NC} Fetching capability map..."
MAP_RESPONSE=$(curl -s "$BASE_URL/api/v1/orchestrator/capability-map" | jq '.data')

echo "Engines and Status:"
echo "$MAP_RESPONSE" | jq -r 'to_entries[] | "  \(.key): \(.value.total) total, \(.value.activated) active (\(.value.percentage))"'
echo -e "${GREEN}✓ Capability map retrieved${NC}\n"

# Enable autonomous activation
echo -e "${YELLOW}[5/6]${NC} Enabling autonomous capability activation..."
AUTO_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/orchestrator/enable-autonomous" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"mode":"safe","maxPerCycle":2}')

if echo "$AUTO_RESPONSE" | grep -q '"enabled":true'; then
  echo -e "${GREEN}✓ Autonomous activation enabled${NC}"
  echo "$AUTO_RESPONSE" | jq '.data'
else
  echo -e "${RED}✗ Failed to enable autonomous activation${NC}"
  echo "$AUTO_RESPONSE" | jq '.'
fi
echo ""

# Run one activation cycle
echo -e "${YELLOW}[6/6]${NC} Running one activation cycle..."
CYCLE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/orchestrator/activate/cycle" \
  -H "Content-Type: application/json")

if echo "$CYCLE_RESPONSE" | grep -q '"success":true'; then
  ACTIVATED_COUNT=$(echo "$CYCLE_RESPONSE" | jq -r '.data.activated')
  FAILED_COUNT=$(echo "$CYCLE_RESPONSE" | jq -r '.data.failed')
  DURATION=$(echo "$CYCLE_RESPONSE" | jq -r '.data.duration')
  
  echo -e "${GREEN}✓ Activation cycle completed${NC}"
  echo "Activated: $ACTIVATED_COUNT | Failed: $FAILED_COUNT | Duration: ${DURATION}ms"
  
  if [ "$ACTIVATED_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ New capabilities activated successfully!${NC}"
  else
    echo -e "${YELLOW}⚠ No new capabilities activated (may already be at max)${NC}"
  fi
else
  echo -e "${RED}✗ Activation cycle failed${NC}"
  echo "$CYCLE_RESPONSE" | jq '.'
fi

echo ""
echo -e "${CYAN}================================${NC}"
echo -e "${GREEN}✓ All tests completed!${NC}"
echo -e "${CYAN}================================${NC}"
echo ""
echo "Next steps:"
echo "1. Visit the enhanced formatter: http://127.0.0.1:3000/web-app/response-formatter-enhanced.html"
echo "2. Continue running activation cycles: npm run activate:cycle"
echo "3. Monitor status: npm run capability:status"
echo ""
