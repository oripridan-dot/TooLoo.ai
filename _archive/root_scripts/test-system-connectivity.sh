#!/bin/bash
# TooLoo.ai System Connectivity Test Suite
# Tests all critical paths, endpoints, and signal flows
# Usage: bash test-system-connectivity.sh

set -e

BASE_URL="http://127.0.0.1:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 TooLoo.ai System Connectivity Test Suite"
echo "==========================================="
echo ""

# Test 1: System Status
echo "📍 Test 1: System Overall Status"
curl -s "$BASE_URL/system/status" | jq '.' && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 2: Route Configuration
echo "📍 Test 2: Service Route Configuration"
curl -s "$BASE_URL/api/v1/system/routes" | jq '.routes | length' && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 3: Load Balancer Health
echo "📍 Test 3: Load Balancer Health Check"
curl -s "$BASE_URL/api/v1/loadbalance/health" | jq '.healthy' && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 4: Individual Service Health Checks
echo "📍 Test 4: Individual Service Health"
services=("training:3001" "budget:3003" "coach:3004" "product:3006" "segmentation:3007" "orchestrator:3123")
for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    echo -n "  $name (port $port)... "
    if curl -s "http://127.0.0.1:$port/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${RED}❌${NC}"
    fi
done
echo ""

# Test 5: Training Endpoint
echo "📍 Test 5: Training Server Endpoint"
curl -s "$BASE_URL/api/v1/training/overview" | jq '.data' > /dev/null && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 6: Budget Endpoint
echo "📍 Test 6: Budget Server Endpoint"
curl -s "$BASE_URL/api/v1/budget/status" | jq '.status' > /dev/null && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 7: Coach Endpoint
echo "📍 Test 7: Coach Server Endpoint"
curl -s "$BASE_URL/api/v1/auto-coach/status" | jq '.status' > /dev/null && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 8: Segmentation Endpoint
echo "📍 Test 8: Segmentation Server Endpoint"
curl -s "$BASE_URL/api/v1/segmentation/status" | jq '.status' > /dev/null && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 9: Capabilities Endpoint
echo "📍 Test 9: Capabilities Server Endpoint"
curl -s "$BASE_URL/api/v1/capabilities/health" | jq '.health' > /dev/null 2>&1 && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 10: Reports Endpoint
echo "📍 Test 10: Reports Server Endpoint"
curl -s "$BASE_URL/api/v1/reports/provider-performance" | jq '.' > /dev/null 2>&1 && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 11: Design System (NEW Figma Integration)
echo "📍 Test 11: Design System Tokens"
curl -s "$BASE_URL/api/v1/design/tokens" | jq '.tokens' > /dev/null 2>&1 && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 12: Chat Endpoint
echo "📍 Test 12: Chat Message Processing"
curl -s -X POST "$BASE_URL/api/v1/chat/message" \
  -H 'Content-Type: application/json' \
  -d '{"message":"test","provider":"claude"}' | jq '.ok' > /dev/null 2>&1 && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 13: Session Management
echo "📍 Test 13: Session Management"
curl -s "$BASE_URL/api/v1/sessions" | jq '.sessions' > /dev/null 2>&1 && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 14: Activity Monitoring
echo "📍 Test 14: Activity Monitoring"
curl -s "$BASE_URL/api/v1/activity/servers" | jq '.servers' > /dev/null 2>&1 && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 15: Orchestrator Status
echo "📍 Test 15: Orchestrator Status"
curl -s "$BASE_URL/api/v1/orchestrator/status" | jq '.status' > /dev/null 2>&1 && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 16: GitHub Integration Health
echo "📍 Test 16: GitHub Integration Health"
curl -s "$BASE_URL/api/v1/github/health" | jq '.ok' > /dev/null 2>&1 && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 17: Slack Integration Status
echo "📍 Test 17: Slack Integration Status"
curl -s "$BASE_URL/api/v1/slack/status" | jq '.ok' > /dev/null 2>&1 && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 18: Knowledge Base
echo "📍 Test 18: Knowledge Base Status"
curl -s "$BASE_URL/api/v1/knowledge/status" | jq '.status' > /dev/null 2>&1 && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 19: System Awareness
echo "📍 Test 19: System Awareness"
curl -s "$BASE_URL/api/v1/system/awareness" | jq '.capabilities' > /dev/null 2>&1 && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

# Test 20: Admin Endpoints
echo "📍 Test 20: Admin Endpoints"
curl -s "$BASE_URL/api/v1/admin/endpoints" | jq '.endpoints' > /dev/null 2>&1 && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}"
echo ""

echo "==========================================="
echo "🎯 Connectivity Test Suite Complete"
echo ""
echo "For detailed audit information, see:"
echo "  - SYSTEM-CONNECTIVITY-AUDIT.md (full audit)"
echo "  - SERVICE-ROUTING-SIGNAL-FLOW.md (visual routing)"
echo ""
