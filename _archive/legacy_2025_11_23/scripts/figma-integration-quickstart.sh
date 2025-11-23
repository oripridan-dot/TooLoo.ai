#!/bin/bash
# Figma Integration Quick-Start Testing Guide
# Usage: bash figma-integration-quickstart.sh

set -e

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Figma Integration API - Quick-Start Testing Guide        ║${NC}"
echo -e "${BLUE}║   Production Ready: Real Figma API Integration              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check environment
echo -e "${YELLOW}Step 1: Checking environment setup...${NC}"
if [ -z "$FIGMA_API_TOKEN" ]; then
  echo -e "${RED}✗ FIGMA_API_TOKEN not set${NC}"
  echo -e "${YELLOW}  Get token from: https://figma.com/developers/api${NC}"
  echo -e "${YELLOW}  Then set: export FIGMA_API_TOKEN=figd_YOUR_TOKEN${NC}"
  exit 1
else
  echo -e "${GREEN}✓ FIGMA_API_TOKEN configured${NC}"
fi

if ! command -v curl &> /dev/null; then
  echo -e "${RED}✗ curl not installed${NC}"
  exit 1
else
  echo -e "${GREEN}✓ curl available${NC}"
fi

# Step 2: Test server health
echo ""
echo -e "${YELLOW}Step 2: Checking TooLoo server health...${NC}"
HEALTH=$(curl -s http://127.0.0.1:3000/api/v1/health 2>/dev/null || echo "{}")
if echo "$HEALTH" | grep -q '"ok":true'; then
  echo -e "${GREEN}✓ Web server running on port 3000${NC}"
else
  echo -e "${RED}✗ Web server not responding${NC}"
  echo -e "${YELLOW}  Start with: npm run dev${NC}"
  exit 1
fi

# Step 3: Get user input
echo ""
echo -e "${YELLOW}Step 3: Gathering Figma file information...${NC}"
read -p "Enter Figma file URL (https://figma.com/file/...): " FIGMA_URL

if [[ ! "$FIGMA_URL" =~ /file/ ]]; then
  echo -e "${RED}✗ Invalid Figma URL format${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Figma URL validated${NC}"

# Step 4: Import design system
echo ""
echo -e "${YELLOW}Step 4: Importing design system from Figma...${NC}"
echo -e "${BLUE}→ Calling: POST /api/v1/design/import-figma${NC}"

IMPORT_RESULT=$(curl -s -X POST http://127.0.0.1:3000/api/v1/design/import-figma \
  -H 'Content-Type: application/json' \
  -d "{\"figmaUrl\": \"$FIGMA_URL\"}")

if echo "$IMPORT_RESULT" | grep -q '"ok":true'; then
  echo -e "${GREEN}✓ Design system imported successfully${NC}"
  echo "$IMPORT_RESULT" | jq '.' 2>/dev/null || echo "$IMPORT_RESULT"
else
  echo -e "${RED}✗ Import failed${NC}"
  echo "$IMPORT_RESULT" | jq '.' 2>/dev/null || echo "$IMPORT_RESULT"
  exit 1
fi

# Step 5: Get tokens
echo ""
echo -e "${YELLOW}Step 5: Retrieving imported tokens...${NC}"
echo -e "${BLUE}→ Calling: GET /api/v1/design/tokens?category=colors${NC}"

TOKENS=$(curl -s http://127.0.0.1:3000/api/v1/design/tokens?category=colors)
TOKEN_COUNT=$(echo "$TOKENS" | jq '.tokens._meta.count // 0' 2>/dev/null)

if [ ! -z "$TOKEN_COUNT" ] && [ "$TOKEN_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Retrieved $TOKEN_COUNT color tokens${NC}"
  echo "$TOKENS" | jq '.tokens.colors | keys' 2>/dev/null || true
else
  echo -e "${YELLOW}⚠ No color tokens found (may be in other categories)${NC}"
fi

# Step 6: Generate CSS
echo ""
echo -e "${YELLOW}Step 6: Generating CSS variables...${NC}"
echo -e "${BLUE}→ Calling: POST /api/v1/design/generate-css${NC}"

CSS_RESULT=$(curl -s -X POST http://127.0.0.1:3000/api/v1/design/generate-css \
  -H 'Content-Type: application/json' \
  -d '{"format": "inline", "includeComments": true}')

if echo "$CSS_RESULT" | grep -q '"ok":true'; then
  echo -e "${GREEN}✓ CSS variables generated${NC}"
  CSS_VARS=$(echo "$CSS_RESULT" | jq '.tokenStats' 2>/dev/null)
  echo "$CSS_VARS" | jq '.' 2>/dev/null || true
else
  echo -e "${RED}✗ CSS generation failed${NC}"
  echo "$CSS_RESULT" | jq '.' 2>/dev/null || echo "$CSS_RESULT"
  exit 1
fi

# Step 7: Apply to UI surfaces
echo ""
echo -e "${YELLOW}Step 7: Applying tokens to UI surfaces...${NC}"
echo -e "${BLUE}→ Calling: POST /api/v1/design/apply-tokens${NC}"

APPLY_RESULT=$(curl -s -X POST http://127.0.0.1:3000/api/v1/design/apply-tokens \
  -H 'Content-Type: application/json' \
  -d '{"surface": "all"}')

if echo "$APPLY_RESULT" | grep -q '"ok":true'; then
  echo -e "${GREEN}✓ Tokens applied to UI surfaces${NC}"
  echo "$APPLY_RESULT" | jq '.results | keys' 2>/dev/null || true
else
  echo -e "${RED}✗ Token application failed${NC}"
  echo "$APPLY_RESULT" | jq '.' 2>/dev/null || echo "$APPLY_RESULT"
fi

# Step 8: Setup webhook (optional)
echo ""
echo -e "${YELLOW}Step 8: Setting up auto-sync webhook (optional)...${NC}"
read -p "Register webhook for auto-sync? (y/n): " -n 1 -r WEBHOOK_CHOICE
echo ""

if [[ $WEBHOOK_CHOICE =~ ^[Yy]$ ]]; then
  # Extract file key from URL
  FILE_KEY=$(echo "$FIGMA_URL" | grep -oP '(?<=/file/)[^/]+' || echo "")
  
  if [ ! -z "$FILE_KEY" ]; then
    echo -e "${BLUE}→ Calling: POST /api/v1/design/webhook/register${NC}"
    WEBHOOK_RESULT=$(curl -s -X POST http://127.0.0.1:3000/api/v1/design/webhook/register \
      -H 'Content-Type: application/json' \
      -d "{\"fileKey\": \"$FILE_KEY\"}")
    
    if echo "$WEBHOOK_RESULT" | grep -q '"ok":true'; then
      echo -e "${GREEN}✓ Webhook registered automatically${NC}"
    else
      echo -e "${YELLOW}⚠ Webhook auto-registration not available (requires Team/Enterprise)${NC}"
      echo -e "${YELLOW}  Manual registration instructions provided in response${NC}"
    fi
    
    echo "$WEBHOOK_RESULT" | jq '.' 2>/dev/null || true
  fi
fi

# Step 9: Check webhook status
echo ""
echo -e "${YELLOW}Step 9: Checking webhook status...${NC}"
echo -e "${BLUE}→ Calling: GET /api/v1/design/webhook/status${NC}"

WEBHOOK_STATUS=$(curl -s http://127.0.0.1:3000/api/v1/design/webhook/status)
echo "$WEBHOOK_STATUS" | jq '.' 2>/dev/null || echo "$WEBHOOK_STATUS"

# Success summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  ✓ INTEGRATION COMPLETE                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Design System Status:${NC}"
echo "  • Figma file imported"
echo "  • Tokens extracted"
echo "  • CSS variables generated"
echo "  • UI surfaces updated"
if [[ $WEBHOOK_CHOICE =~ ^[Yy]$ ]]; then
  echo "  • Auto-sync enabled (future file changes will auto-apply)"
fi
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Open browser: http://127.0.0.1:3000/validation-dashboard"
echo "  2. Check browser DevTools → Elements to see CSS variables"
echo "  3. Edit colors in Figma and watch CSS update"
echo "  4. Use CSS variables in components: var(--color-primary)"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  • API Reference: FIGMA-INTEGRATION-API-REFERENCE.md"
echo "  • Implementation: FIGMA-INTEGRATION-IMPLEMENTATION.md"
echo ""
