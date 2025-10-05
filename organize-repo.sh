#!/bin/bash

# Repository Organization Script
# Archives old files and creates proper structure

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║         📦  TooLoo.ai Repository Organization Script  📦            ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1️⃣  CREATING ARCHIVE DIRECTORIES${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

mkdir -p archive/v1.0/backend
mkdir -p archive/v1.0/docs
mkdir -p archive/unused
mkdir -p archive/experimental

echo -e "${GREEN}✓${NC} Created archive directories"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2️⃣  ARCHIVING OLD SERVER${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f "simple-api-server.js" ]; then
    mv simple-api-server.js archive/v1.0/backend/
    echo -e "${GREEN}✓${NC} Moved simple-api-server.js to archive/v1.0/backend/"
else
    echo -e "${YELLOW}⚠${NC} simple-api-server.js not found (already archived?)"
fi

# Archive other v1.0 related files
for file in self-aware.js self-awareness-examples.js test-self-awareness-integration.js; do
    if [ -f "$file" ]; then
        mv "$file" archive/v1.0/backend/
        echo -e "${GREEN}✓${NC} Moved $file to archive/v1.0/backend/"
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3️⃣  ARCHIVING UNUSED MODULES${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -d "packages" ]; then
    mv packages archive/unused/
    echo -e "${GREEN}✓${NC} Moved packages/ to archive/unused/"
else
    echo -e "${YELLOW}⚠${NC} packages/ not found"
fi

# Archive experimental files
for file in tooloo-cli.js demo-cli.sh tooloo-ui-generator.js; do
    if [ -f "$file" ]; then
        mv "$file" archive/experimental/
        echo -e "${GREEN}✓${NC} Moved $file to archive/experimental/"
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4️⃣  ORGANIZING DOCUMENTATION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

mkdir -p docs/development
mkdir -p docs/features
mkdir -p docs/archive

# Move completion docs to archive
for file in *_COMPLETE.md *_FIXED.md *_RESOLVED.md MISSION_ACCOMPLISHED.md PROOF_OF_SUPERIORITY.md; do
    if [ -f "$file" ]; then
        mv "$file" docs/archive/
        echo -e "${GREEN}✓${NC} Moved $file to docs/archive/"
    fi
done

# Keep important docs in root, organize others
if [ -f "TESTING_GUIDE.md" ]; then
    mv TESTING_GUIDE.md docs/development/
    echo -e "${GREEN}✓${NC} Moved TESTING_GUIDE.md to docs/development/"
fi

if [ -f "DISCUSSION_WORKFLOW.md" ]; then
    mv DISCUSSION_WORKFLOW.md docs/development/
    echo -e "${GREEN}✓${NC} Moved DISCUSSION_WORKFLOW.md to docs/development/"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5️⃣  CREATING/UPDATING .gitignore${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cat >> .gitignore << 'EOF'

# TooLoo v2.0 Specific
data/auth.json
temp/*.html
logs/*.log
.env.local

# Archive (commit once, then ignore)
# archive/

# Development
.DS_Store
*.swp
*.swo
.vscode/settings.json

# Test coverage
coverage/
.nyc_output/
EOF

echo -e "${GREEN}✓${NC} Updated .gitignore"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}6️⃣  CREATING BRANCH STRUCTURE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"

# Create development branch if it doesn't exist
if ! git show-ref --verify --quiet refs/heads/development; then
    git branch development
    echo -e "${GREEN}✓${NC} Created development branch"
else
    echo -e "${YELLOW}⚠${NC} development branch already exists"
fi

# Create staging branch if it doesn't exist
if ! git show-ref --verify --quiet refs/heads/staging; then
    git branch staging
    echo -e "${GREEN}✓${NC} Created staging branch"
else
    echo -e "${YELLOW}⚠${NC} staging branch already exists"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}7️⃣  VERIFICATION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "📂 Directory Structure:"
echo "├── archive/"
ls -la archive/ 2>/dev/null | grep -E "^d" | awk '{print "│   ├── " $9}'

echo "├── docs/"
ls -la docs/ 2>/dev/null | grep -E "^d" | awk '{print "│   ├── " $9}'

echo "├── core/"
ls -1 core/ 2>/dev/null | sed 's/^/│   ├── /'

echo "└── providers/"
ls -1 providers/ 2>/dev/null | sed 's/^/    ├── /'

echo ""
echo "🌿 Git Branches:"
git branch | sed 's/^/    /'

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                      ║${NC}"
echo -e "${GREEN}║         ✅  REPOSITORY ORGANIZATION COMPLETE  ✅                     ║${NC}"
echo -e "${GREEN}║                                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Review changes: git status"
echo "2. Commit organization: git add . && git commit -m 'Organize repository structure'"
echo "3. Run health check: ./health-check.sh"
echo "4. Switch to development branch: git checkout development"
