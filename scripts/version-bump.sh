#!/bin/bash
# =============================================================================
# TooLoo.ai - Auto Version Bump & Branch Script
# Creates a git tag and branch for each version bump (build 4+)
# =============================================================================

set -e

VERSION_FILE="version.json"
BRANCH_PREFIX="release"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      TooLoo.ai Auto Version & Branch Manager         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"

# Read current version
if [ ! -f "$VERSION_FILE" ]; then
    echo "Error: $VERSION_FILE not found"
    exit 1
fi

CURRENT_VERSION=$(jq -r '.version' $VERSION_FILE)
CURRENT_BUILD=$(jq -r '.build' $VERSION_FILE)
CURRENT_MAJOR=$(jq -r '.major' $VERSION_FILE)
CURRENT_MINOR=$(jq -r '.minor' $VERSION_FILE)
CURRENT_PATCH=$(jq -r '.patch' $VERSION_FILE)

echo -e "\n${YELLOW}Current Version:${NC} v$CURRENT_VERSION (build $CURRENT_BUILD)"

# Determine bump type
BUMP_TYPE=${1:-patch}
echo -e "${YELLOW}Bump Type:${NC} $BUMP_TYPE"

# Calculate new version
case $BUMP_TYPE in
    major)
        NEW_MAJOR=$((CURRENT_MAJOR + 1))
        NEW_MINOR=0
        NEW_PATCH=0
        ;;
    minor)
        NEW_MAJOR=$CURRENT_MAJOR
        NEW_MINOR=$((CURRENT_MINOR + 1))
        NEW_PATCH=0
        ;;
    patch)
        NEW_MAJOR=$CURRENT_MAJOR
        NEW_MINOR=$CURRENT_MINOR
        NEW_PATCH=$((CURRENT_PATCH + 1))
        ;;
    *)
        echo "Usage: $0 [major|minor|patch]"
        exit 1
        ;;
esac

NEW_BUILD=$((CURRENT_BUILD + 1))
NEW_VERSION="${NEW_MAJOR}.${NEW_MINOR}.${NEW_PATCH}"
TAG_NAME="v${NEW_VERSION}"
BRANCH_NAME="${BRANCH_PREFIX}/v${NEW_VERSION}"

echo -e "${GREEN}New Version:${NC} v$NEW_VERSION (build $NEW_BUILD)"

# Check if tag already exists
if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Tag $TAG_NAME already exists. Skipping...${NC}"
    exit 0
fi

# Update version.json
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE=$(date +"%Y-%m-%d")

# Get commit message for changelog
read -p "Enter changelog entry (or press Enter for default): " CHANGELOG_ENTRY
if [ -z "$CHANGELOG_ENTRY" ]; then
    CHANGELOG_ENTRY="V${NEW_VERSION} - Version bump"
fi

# Update version.json with jq
jq --arg v "$NEW_VERSION" \
   --argjson major "$NEW_MAJOR" \
   --argjson minor "$NEW_MINOR" \
   --argjson patch "$NEW_PATCH" \
   --argjson build "$NEW_BUILD" \
   --arg date "$DATE" \
   --arg ts "$TIMESTAMP" \
   --arg log "$CHANGELOG_ENTRY" \
   '.version = $v | 
    .major = $major | 
    .minor = $minor | 
    .patch = $patch | 
    .build = $build | 
    .releaseDate = $date | 
    .lastUpdated = $ts |
    .changelog = [$log] + .changelog' \
   $VERSION_FILE > tmp.json && mv tmp.json $VERSION_FILE

echo -e "\n${GREEN}✓${NC} Updated $VERSION_FILE"

# Stage and commit
git add $VERSION_FILE
git commit -m "chore(release): bump version to v${NEW_VERSION}

- Build: $NEW_BUILD
- Changelog: $CHANGELOG_ENTRY"

echo -e "${GREEN}✓${NC} Committed version bump"

# Create tag
git tag -a "$TAG_NAME" -m "Release v${NEW_VERSION}

Build: $NEW_BUILD
Date: $DATE
Changelog: $CHANGELOG_ENTRY"

echo -e "${GREEN}✓${NC} Created tag $TAG_NAME"

# Create release branch
git branch "$BRANCH_NAME"
echo -e "${GREEN}✓${NC} Created branch $BRANCH_NAME"

# Push to origin
read -p "Push to origin? [Y/n]: " PUSH_CONFIRM
if [ "$PUSH_CONFIRM" != "n" ] && [ "$PUSH_CONFIRM" != "N" ]; then
    git push origin main
    git push origin "$TAG_NAME"
    git push origin "$BRANCH_NAME"
    echo -e "${GREEN}✓${NC} Pushed to origin"
fi

echo -e "\n${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Version bump complete!${NC}"
echo -e "${GREEN}  New Version: v${NEW_VERSION} (build ${NEW_BUILD})${NC}"
echo -e "${GREEN}  Tag: ${TAG_NAME}${NC}"
echo -e "${GREEN}  Branch: ${BRANCH_NAME}${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
