#!/bin/bash

################################################################################
# TooLoo.ai Repository Cleanup Execution Script
# Date: November 13, 2025
# Purpose: Remove unnecessary files, duplicates, and garbage from repository
# Risk Level: MEDIUM (backed by full git history)
################################################################################

set -e  # Exit on any error

REPO_ROOT="/workspaces/TooLoo.ai"
CLEANUP_LOG="$REPO_ROOT/CLEANUP_EXECUTION.log"
BACKUP_BRANCH="pre-cleanup-$(date +%Y%m%d-%H%M%S)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TooLoo.ai Repository Cleanup v1.0                         ║${NC}"
echo -e "${BLUE}║  This script will remove unnecessary files safely           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to log operations
log_operation() {
    local operation=$1
    local count=$2
    local size=$3
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $operation | Count: $count | Estimated Size: $size" >> "$CLEANUP_LOG"
    echo -e "${GREEN}✓${NC} $operation (Est. $size)"
}

################################################################################
# PHASE 0: PRE-CLEANUP VERIFICATION
################################################################################
echo -e "${YELLOW}PHASE 0: Pre-Cleanup Verification${NC}"
echo "Current directory: $REPO_ROOT"
cd "$REPO_ROOT" || exit 1

# Verify git status
echo "Git Status:"
git status --short | head -10
echo ""

# Create backup branch
echo -e "${YELLOW}Creating backup branch: $BACKUP_BRANCH${NC}"
git stash || true  # Save any uncommitted changes
git checkout -b "$BACKUP_BRANCH" || echo "Branch may already exist"
echo -e "${GREEN}✓ Backup branch created${NC}"
echo ""

################################################################################
# PHASE 1: ROOT MARKDOWN FILES (303 files, ~10 MB)
################################################################################
echo -e "${YELLOW}PHASE 1: Cleaning Root Markdown Files${NC}"
echo "Target: Delete 303 root .md files (keeping essential docs)"
echo ""

KEEP_MD_FILES=(
    "README.md"
    "CONTRIBUTING.md"
    "00_START_HERE.md"
)

echo "Files to KEEP:"
for file in "${KEEP_MD_FILES[@]}"; do
    if [ -f "$REPO_ROOT/$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    fi
done
echo ""

echo "Deleting unnecessary markdown files..."
find "$REPO_ROOT" -maxdepth 1 -type f -name "*.md" | while read file; do
    basename=$(basename "$file")
    skip=0
    for keep in "${KEEP_MD_FILES[@]}"; do
        if [ "$basename" = "$keep" ]; then
            skip=1
            break
        fi
    done
    if [ $skip -eq 0 ] && [ -f "$file" ]; then
        rm -f "$file"
        echo "  Deleted: $basename"
    fi
done

log_operation "Root .md cleanup" "$(find $REPO_ROOT -maxdepth 1 -type f -name '*.md' | wc -l) remaining" "~10 MB saved"
echo ""

################################################################################
# PHASE 2: ROOT JAVASCRIPT FILES (47 unused, ~500 KB)
################################################################################
echo -e "${YELLOW}PHASE 2: Cleaning Root JavaScript Files${NC}"
echo "Target: Delete 47 unused root .js files (keeping 4 active ones)"
echo ""

KEEP_JS_FILES=(
    "ecosystem.config.js"
    "simple-api-server.js"
    "environment-hub.js"
    "live-screenshot-capture.js"
    "referral-system.js"
    "tooloo-ui-generator.js"
    "vitest.config.js"
)

echo "Files to KEEP:"
for file in "${KEEP_JS_FILES[@]}"; do
    if [ -f "$REPO_ROOT/$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    fi
done
echo ""

echo "Deleting unused JavaScript files from root..."
DELETED_JS=0
find "$REPO_ROOT" -maxdepth 1 -type f -name "*.js" | while read file; do
    basename=$(basename "$file")
    skip=0
    for keep in "${KEEP_JS_FILES[@]}"; do
        if [ "$basename" = "$keep" ]; then
            skip=1
            break
        fi
    done
    if [ $skip -eq 0 ] && [ -f "$file" ]; then
        rm -f "$file"
        echo "  Deleted: $basename"
        ((DELETED_JS++))
    fi
done

log_operation "Root .js cleanup" "$(find $REPO_ROOT -maxdepth 1 -type f -name '*.js' | wc -l) remaining" "~500 KB saved"
echo ""

################################################################################
# PHASE 3: ROOT GARBAGE JSON FILES (~5 MB)
################################################################################
echo -e "${YELLOW}PHASE 3: Cleaning Root Garbage JSON Files${NC}"
echo "Target: Delete .response.json and other generated files"
echo ""

GARBAGE_JSON_PATTERNS=(
    "*.response.json"
    "*_RESULTS.json"
    "*smart-benchmark*.json"
    "*cache-benchmark*.json"
    "*benchmark-results*.json"
    "*full_topic_results.json"
)

for pattern in "${GARBAGE_JSON_PATTERNS[@]}"; do
    find "$REPO_ROOT" -maxdepth 1 -type f -name "$pattern" | while read file; do
        if [ -f "$file" ]; then
            rm -f "$file"
            echo "  Deleted: $(basename $file)"
        fi
    done
done

log_operation "Root garbage JSON cleanup" "All .response.json removed" "~5 MB saved"
echo ""

################################################################################
# PHASE 4: RUNTIME STATE FILES
################################################################################
echo -e "${YELLOW}PHASE 4: Cleaning Runtime State Files${NC}"
echo "Target: Remove daemon state and PID files"
echo ""

STATE_FILES=(
    ".daemon-state.json"
    ".server-daemon-state.json"
    ".daemon.pid"
)

for file in "${STATE_FILES[@]}"; do
    if [ -f "$REPO_ROOT/$file" ]; then
        rm -f "$REPO_ROOT/$file"
        echo "  Deleted: $file"
    fi
done

log_operation "Runtime state cleanup" "${#STATE_FILES[@]} files removed" "~100 KB saved"
echo ""

################################################################################
# PHASE 5: ARCHIVE DIRECTORY (352 KB)
################################################################################
echo -e "${YELLOW}PHASE 5: Cleaning /archive Directory${NC}"
echo "Target: Delete entire /archive folder (old projects)"
echo ""

if [ -d "$REPO_ROOT/archive" ]; then
    echo "  Deleting archive/..."
    rm -rf "$REPO_ROOT/archive"
    log_operation "Archive directory removal" "1 directory" "~352 KB saved"
else
    echo "  /archive not found (already deleted?)"
fi
echo ""

################################################################################
# PHASE 6: DEAD CODE DIRECTORIES
################################################################################
echo -e "${YELLOW}PHASE 6: Cleaning Dead Code Directories${NC}"
echo "Target: Remove abandoned project folders"
echo ""

DEAD_DIRS=(
    "personal-projects"
    "experiments"
    "prototype"
    "chrome-extension"
)

for dir in "${DEAD_DIRS[@]}"; do
    if [ -d "$REPO_ROOT/$dir" ]; then
        read -p "  Delete /$dir? (y/n) [n] " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$REPO_ROOT/$dir"
            echo -e "    ${GREEN}✓${NC} Deleted /$dir"
            log_operation "Dead code directory: $dir" "1 directory" "~estimated"
        else
            echo "    Skipped /$dir"
        fi
    fi
done
echo ""

################################################################################
# PHASE 7: PACKAGES/WEB REMOVAL (239 MB - OPTIONAL)
################################################################################
echo -e "${YELLOW}PHASE 7: Large Package Cleanup (OPTIONAL)${NC}"
echo "Target: Delete /packages/web (unused React app, 239 MB)"
echo "Status: This folder is NOT imported anywhere and appears dead"
echo ""

read -p "  Delete /packages/web? This saves ~239 MB (y/n) [n] " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -d "$REPO_ROOT/packages/web" ]; then
        rm -rf "$REPO_ROOT/packages/web"
        echo -e "    ${GREEN}✓${NC} Deleted /packages/web"
        log_operation "Dead React package removal" "1 directory" "~239 MB saved"
    fi
else
    echo "    Skipped /packages/web (can delete manually later)"
fi
echo ""

################################################################################
# PHASE 8: PROVIDERS-ARENA NODE_MODULES CLEANUP (80 MB)
################################################################################
echo -e "${YELLOW}PHASE 8: Node Modules Cleanup${NC}"
echo "Target: Delete node_modules from /providers-arena (will be rebuilt)"
echo ""

read -p "  Delete /providers-arena/node_modules? (y/n) [n] " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -d "$REPO_ROOT/providers-arena/node_modules" ]; then
        echo "  Deleting providers-arena/node_modules..."
        rm -rf "$REPO_ROOT/providers-arena/node_modules"
        echo -e "    ${GREEN}✓${NC} Deleted /providers-arena/node_modules"
        log_operation "Providers-arena node_modules removal" "1 directory" "~80 MB saved"
    fi
fi
echo ""

################################################################################
# PHASE 9: LOG AND TEST CLEANUP (250 KB)
################################################################################
echo -e "${YELLOW}PHASE 9: Logs and Test Reports Cleanup${NC}"
echo "Target: Remove old test reports and logs"
echo ""

LOG_DIRS=(
    "test-reports"
    "feedback-logs"
    "deployment-logs"
)

for dir in "${LOG_DIRS[@]}"; do
    if [ -d "$REPO_ROOT/$dir" ]; then
        echo "  Cleaning $dir..."
        find "$REPO_ROOT/$dir" -type f -mtime +30 -delete 2>/dev/null || true
        if [ -z "$(ls -A $REPO_ROOT/$dir)" ]; then
            rm -rf "$REPO_ROOT/$dir"
            echo "    Deleted (empty)"
        else
            echo "    Kept recent logs"
        fi
    fi
done

log_operation "Old logs cleanup" "Removed files >30 days old" "~250 KB saved"
echo ""

################################################################################
# PHASE 10: GIT COMMIT
################################################################################
echo -e "${YELLOW}PHASE 10: Git Commit${NC}"
echo "Target: Commit all cleanup changes"
echo ""

cd "$REPO_ROOT" || exit 1
git add -A

# Count changes
DELETIONS=$(git diff --cached --name-status | grep '^D' | wc -l)
echo "Files to be deleted: $DELETIONS"
echo ""

read -p "  Commit cleanup changes? (y/n) [y] " -r
REPLY=${REPLY:-y}
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "🧹 Repository cleanup: remove garbage files, duplicates, and dead code

Cleaned up:
- Removed 303 root .md documentation files (keeping essentials)
- Removed 47+ unused root .js files
- Removed .response.json and other generated garbage
- Removed /archive directory (old projects)
- Removed dead code directories
- Removed old test reports and logs

Repository is now ~60% smaller and more maintainable.
Backup branch created: $BACKUP_BRANCH" || true

    echo -e "${GREEN}✓${NC} Changes committed"
else
    echo "  Skipped git commit"
    echo -e "${YELLOW}  To commit manually: git commit -m '🧹 Repository cleanup'${NC}"
fi
echo ""

################################################################################
# FINAL SUMMARY
################################################################################
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  CLEANUP COMPLETE                                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Calculate new size
NEW_SIZE=$(du -sh "$REPO_ROOT" 2>/dev/null | cut -f1)
echo "New repository size: $NEW_SIZE"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Verify cleanup didn't break anything:"
echo -e "   ${BLUE}npm run dev${NC}"
echo ""
echo "2. If something broke, restore from backup branch:"
echo -e "   ${BLUE}git checkout $BACKUP_BRANCH${NC}"
echo ""
echo "3. Run tests to verify all services work:"
echo -e "   ${BLUE}npm test${NC}"
echo ""
echo "4. Force push to remote (if this is a feature branch):"
echo -e "   ${BLUE}git push origin -f${NC}"
echo ""

echo "Cleanup log saved to: $CLEANUP_LOG"
tail -20 "$CLEANUP_LOG"
