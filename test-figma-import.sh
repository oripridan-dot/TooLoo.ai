#!/bin/bash
# Quick test script for Figma import endpoint
# Usage: bash test-figma-import.sh <YOUR_FIGMA_URL> <YOUR_FIGMA_TOKEN>

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get arguments
FIGMA_URL="${1:-}"
FIGMA_TOKEN="${2:-}"

# Validate inputs
if [ -z "$FIGMA_URL" ]; then
  echo -e "${RED}❌ Error: Figma URL required${NC}"
  echo ""
  echo "Usage: bash test-figma-import.sh <FIGMA_URL> <FIGMA_TOKEN>"
  echo ""
  echo "Example:"
  echo "  bash test-figma-import.sh 'https://figma.com/file/ABC123/MyDesign' 'figa_..'"
  echo ""
  exit 1
fi

if [ -z "$FIGMA_TOKEN" ]; then
  echo -e "${RED}❌ Error: Figma token required${NC}"
  echo ""
  echo "Get your token from: https://figma.com/settings"
  exit 1
fi

echo -e "${YELLOW}🚀 Testing Figma Import Endpoint${NC}"
echo ""
echo -e "${GREEN}📋 Configuration:${NC}"
echo "  URL: $FIGMA_URL"
echo "  Token: ${FIGMA_TOKEN:0:10}..."
echo ""

# Check if server is running
echo -e "${YELLOW}🔍 Checking if Design Server is running on port 3014...${NC}"
if ! curl -s http://localhost:3014/health > /dev/null 2>&1; then
  echo -e "${RED}❌ Design Server not running on port 3014${NC}"
  echo ""
  echo "Start the server with:"
  echo "  npm run start:design"
  echo ""
  exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Make the import request
echo -e "${YELLOW}📤 Sending import request...${NC}"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3014/api/v1/design/import-figma \
  -H 'Content-Type: application/json' \
  -d "{\"figmaUrl\":\"$FIGMA_URL\",\"apiToken\":\"$FIGMA_TOKEN\"}")

# Pretty print response
echo -e "${GREEN}📥 Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check for success
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo -e "${GREEN}✅ Import successful!${NC}"
  
  # Extract token counts
  COLORS=$(echo "$RESPONSE" | jq '.tokensImported.colors // 0' 2>/dev/null)
  TYPO=$(echo "$RESPONSE" | jq '.tokensImported.typography // 0' 2>/dev/null)
  COMPS=$(echo "$RESPONSE" | jq '.tokensImported.components // 0' 2>/dev/null)
  
  echo ""
  echo -e "${GREEN}📊 Imported Tokens:${NC}"
  echo "  • Colors: $COLORS"
  echo "  • Typography: $TYPO"
  echo "  • Components: $COMPS"
  echo ""
  
  # Get the design system
  echo -e "${YELLOW}🎨 Fetching design system...${NC}"
  SYSTEM=$(curl -s http://localhost:3014/api/v1/design/system | jq '.system | {colors: (.colors | keys | length), typography: (.typography | keys | length), spacing: (.spacing | keys | length)}' 2>/dev/null)
  echo "$SYSTEM" | jq '.'
  echo ""
  echo -e "${GREEN}✅ All systems operational!${NC}"
else
  echo -e "${RED}❌ Import failed${NC}"
  exit 1
fi
