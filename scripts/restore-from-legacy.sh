#!/bin/bash
# TooLoo Synapsys V3.3 - Legacy Restoration Script
# 
# This script can restore specific modules or files from the legacy V2.x repository.
# The legacy repo is kept as a reference archive.
#
# Usage: ./scripts/restore-from-legacy.sh <module|file> [target]
#
# Examples:
#   ./scripts/restore-from-legacy.sh component Dashboard
#   ./scripts/restore-from-legacy.sh docs IMPLEMENTATION_SUMMARY.md
#   ./scripts/restore-from-legacy.sh all-docs

LEGACY_REPO="${LEGACY_REPO:-/workspaces/TooLoo.ai-V3-Synapsys}"
CURRENT_DIR="$(pwd)"

if [ ! -d "$LEGACY_REPO" ]; then
    echo "❌ Legacy repository not found at: $LEGACY_REPO"
    echo "   Set LEGACY_REPO environment variable to point to the archive."
    exit 1
fi

case "$1" in
    component)
        if [ -z "$2" ]; then
            echo "Available legacy components:"
            ls "$LEGACY_REPO/src/web-app/src/components/" 2>/dev/null
            exit 0
        fi
        echo "Restoring component: $2"
        cp "$LEGACY_REPO/src/web-app/src/components/$2.jsx" "$CURRENT_DIR/src/web-app/src/components/" 2>/dev/null || \
        cp "$LEGACY_REPO/src/web-app/src/components/$2.tsx" "$CURRENT_DIR/src/web-app/src/components/"
        ;;
    docs)
        if [ -z "$2" ]; then
            echo "Available legacy docs:"
            ls "$LEGACY_REPO/docs/"
            exit 0
        fi
        echo "Restoring doc: $2"
        cp "$LEGACY_REPO/docs/$2" "$CURRENT_DIR/docs/"
        ;;
    all-docs)
        echo "Restoring all documentation..."
        cp -r "$LEGACY_REPO/docs/"* "$CURRENT_DIR/docs/"
        ;;
    data)
        if [ -z "$2" ]; then
            echo "Available legacy data:"
            ls "$LEGACY_REPO/data/"
            exit 0
        fi
        echo "Restoring data: $2"
        cp "$LEGACY_REPO/data/$2" "$CURRENT_DIR/data/"
        ;;
    qa-reports)
        echo "Restoring QA reports..."
        mkdir -p "$CURRENT_DIR/data/qa-reports"
        cp -r "$LEGACY_REPO/data/qa-reports/"* "$CURRENT_DIR/data/qa-reports/"
        ;;
    history)
        echo "Viewing legacy git history..."
        cd "$LEGACY_REPO" && git log --oneline -20
        ;;
    diff)
        echo "Comparing with legacy..."
        diff -rq "$LEGACY_REPO/src" "$CURRENT_DIR/src" 2>/dev/null | head -50
        ;;
    *)
        echo "TooLoo Synapsys V3.3 - Legacy Restoration"
        echo ""
        echo "Usage: $0 <command> [target]"
        echo ""
        echo "Commands:"
        echo "  component [name]  - Restore a legacy UI component"
        echo "  docs [file]       - Restore documentation file"
        echo "  all-docs          - Restore all documentation"
        echo "  data [file]       - Restore data file"
        echo "  qa-reports        - Restore all QA reports"
        echo "  history           - View legacy git history"
        echo "  diff              - Compare with legacy"
        echo ""
        echo "Legacy repo: $LEGACY_REPO"
        ;;
esac
