#!/bin/bash

# GitHub Integration Test Script
# Tests all major GitHub API endpoints

echo "🧪 Testing TooLoo.ai GitHub Integration"
echo "========================================"
echo ""

API_BASE="http://localhost:3005/api/v1"
GITHUB_API="${API_BASE}/github"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_count=0
pass_count=0
fail_count=0

# Test function
test_endpoint() {
  local name=$1
  local method=${2:-GET}
  local endpoint=$3
  local data=$4
  
  ((test_count++))
  echo -n "Testing $name... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$endpoint")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
    ((pass_count++))
    
    # Pretty print JSON if possible
    if command -v jq &> /dev/null; then
      echo "$body" | jq -C '.' 2>/dev/null | head -20
    else
      echo "$body" | head -5
    fi
    echo ""
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
    ((fail_count++))
    echo "$body" | head -5
    echo ""
    return 1
  fi
}

echo "📋 Configuration Tests"
echo "---------------------"
test_endpoint "GitHub Config" GET "${GITHUB_API}/config"
test_endpoint "API Health" GET "${API_BASE}/health"
echo ""

echo "📊 Repository Tests"
echo "------------------"
test_endpoint "Repository Info" GET "${GITHUB_API}/repo"
test_endpoint "Repository Stats" GET "${GITHUB_API}/stats"
test_endpoint "Activity Summary" GET "${GITHUB_API}/activity"
echo ""

echo "📁 File Operations Tests"
echo "------------------------"
test_endpoint "List Files (root)" GET "${GITHUB_API}/files"
test_endpoint "List Files (src)" GET "${GITHUB_API}/files?path=src"
test_endpoint "Read File (README)" GET "${GITHUB_API}/files/read?path=README.md"
echo ""

echo "🌿 Branch Tests"
echo "---------------"
test_endpoint "List Branches" GET "${GITHUB_API}/branches"
echo ""

echo "💾 Commit Tests"
echo "---------------"
test_endpoint "List Commits" GET "${GITHUB_API}/commits?perPage=5"
echo ""

echo "🔀 Pull Request Tests"
echo "---------------------"
test_endpoint "List PRs (open)" GET "${GITHUB_API}/pulls?state=open"
test_endpoint "List PRs (all)" GET "${GITHUB_API}/pulls?state=all&perPage=5"
echo ""

echo "🐛 Issue Tests"
echo "--------------"
test_endpoint "List Issues (open)" GET "${GITHUB_API}/issues?state=open"
test_endpoint "List Issues (all)" GET "${GITHUB_API}/issues?state=all&perPage=5"
echo ""

echo "⚙️  GitHub Actions Tests"
echo "------------------------"
test_endpoint "List Workflow Runs" GET "${GITHUB_API}/actions/runs?perPage=5"
echo ""

echo "================================================"
echo "📊 Test Summary"
echo "================================================"
echo "Total Tests: $test_count"
echo -e "Passed: ${GREEN}$pass_count${NC}"
echo -e "Failed: ${RED}$fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed.${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check that GITHUB_TOKEN is set in .env"
  echo "2. Verify API server is running: curl http://localhost:3005/api/v1/health"
  echo "3. Check token permissions: https://github.com/settings/tokens"
  exit 1
fi
