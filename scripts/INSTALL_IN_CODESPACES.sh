#!/bin/bash
# TooLoo.ai Transformation Package - Installation Script
# Run this in your GitHub Codespace where TooLoo.ai repo is located

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TooLoo.ai Transformation Package - Installer    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Verify we're in TooLoo.ai repo
if [ ! -f "simple-api-server.js" ]; then
    echo -e "${RED}❌ Error: Not in TooLoo.ai repository root${NC}"
    echo "Please cd to your TooLoo.ai directory first"
    exit 1
fi

echo -e "${GREEN}✅ Found TooLoo.ai repository${NC}"
echo ""

# Step 2: Create backup
echo -e "${BLUE}Creating backup...${NC}"
BACKUP_DIR="backups/pre-transformation-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp simple-api-server.js "$BACKUP_DIR/" 2>/dev/null || true
cp package.json "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
echo ""

# Step 3: Create directory structure
echo -e "${BLUE}Creating directory structure...${NC}"
mkdir -p .devcontainer
mkdir -p .github/workflows
mkdir -p src/{routes,services,managers,middleware,config,utils}
mkdir -p tests/{api,unit,integration,fixtures}
mkdir -p docs
mkdir -p config
mkdir -p scripts
echo -e "${GREEN}✅ Directories created${NC}"
echo ""

# Step 4: Download files from the conversation
echo -e "${BLUE}📥 Now you need to copy the transformation files${NC}"
echo ""
echo "Since I cannot directly download files, please:"
echo "1. Ask me to show you each file content"
echo "2. Copy-paste into the appropriate location"
echo ""
echo "OR - Use the web interface to download files if available"
echo ""

# List required files
cat << 'EOF'

📂 Files to Copy:

Root Documentation:
  ├── README.md
  ├── EXECUTIVE_SUMMARY.md
  ├── CODESPACES_QUICKSTART.md
  ├── EXECUTION_CHECKLIST.md
  ├── FILE_INDEX.md
  └── DELIVERY_SUMMARY.md

Configuration:
  ├── .devcontainer/devcontainer.json
  ├── vitest.config.js
  └── config/package-json-updates.json

Tests:
  ├── tests/api/health.test.js
  ├── tests/api/chat.test.js
  └── tests/unit/provider-service.test.js

Source Code:
  ├── src/services/ProviderService.js
  ├── src/services/HealthCheckService.js
  ├── src/middleware/errorHandler.js
  └── src/config/logger.js

Scripts:
  ├── scripts/execute-transformation.sh
  ├── scripts/install-test-deps.sh
  └── scripts/create-structure.sh

DevOps:
  └── .github/workflows/ci.yml

Documentation:
  └── docs/ARCHITECTURE.md

EOF

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Ask me: 'Show me the content of [filename]'"
echo "2. Copy the content I provide"
echo "3. Create the file in the location shown above"
echo "4. Repeat for all 21 files"
echo ""
echo "OR use the faster method below..."
echo ""

# Create a helper to download from Claude
cat << 'DOWNLOAD_HELP'
═══════════════════════════════════════════════════════════

🚀 FASTER METHOD: Ask me to provide all files at once!

Say: "Please provide all transformation files as a single 
      compressed archive or as individual code blocks that 
      I can copy-paste"

I'll provide each file content in a format you can easily copy!

═══════════════════════════════════════════════════════════
DOWNLOAD_HELP

echo ""
echo -e "${GREEN}✅ Installation script ready${NC}"
echo -e "${BLUE}Waiting for file contents...${NC}"
