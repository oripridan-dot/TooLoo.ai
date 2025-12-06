#!/bin/bash
# ============================================================================
# TooLoo R&D Center - Sandbox Development Environment
# ============================================================================
#
# This script starts a parallel TooLoo instance for safe experimentation.
# - Runs on port 4001 (instead of 4000)
# - Uses isolated data directory (data-rnd/)
# - Forces Docker sandbox mode for all executions
# - All self-modifications require explicit approval
#
# Usage:
#   npm run dev:rnd        # Start R&D backend only
#   npm run start:rnd      # Start R&D backend + frontend
#
# The R&D instance is completely isolated from production:
# - Separate data files (learning, artifacts, etc.)
# - Separate chat history
# - Separate QA reports
# - All changes are sandboxed and require approval
#
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# R&D Environment Configuration
export PORT=4001
export TOOLOO_MODE="rnd"
export TOOLOO_RND_MODE="true"
export SANDBOX_MODE="docker"
export DATA_DIR="./data-rnd"
export AUTONOMOUS_APPLY_ENABLED="false"

# Create R&D data directory if it doesn't exist
if [ ! -d "$DATA_DIR" ]; then
    echo "📁 Creating R&D data directory: $DATA_DIR"
    mkdir -p "$DATA_DIR"
    mkdir -p "$DATA_DIR/artifacts"
    mkdir -p "$DATA_DIR/memory"
    mkdir -p "$DATA_DIR/qa-reports"
    mkdir -p "$DATA_DIR/test-reports"
    mkdir -p "$DATA_DIR/serendipity"
    mkdir -p "$DATA_DIR/suggestions"
    
    # Initialize empty data files
    echo "[]" > "$DATA_DIR/chat-history.json"
    echo "[]" > "$DATA_DIR/decisions.json"
    echo "{}" > "$DATA_DIR/patterns.json"
    echo "{}" > "$DATA_DIR/learning-goals.json"
    echo "[]" > "$DATA_DIR/learning-metrics.json"
    echo "[]" > "$DATA_DIR/qa-metrics-history.json"
    echo '{"artifacts":[]}' > "$DATA_DIR/artifacts/index.json"
    echo '{"entries":[]}' > "$DATA_DIR/memory/semantic-cache.json"
    echo '{"vectors":[]}' > "$DATA_DIR/memory/vectors.json"
    
    echo "✅ R&D data directory initialized"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           🧪 TooLoo R&D Center - Sandbox Environment           ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Port:        $PORT (API)                                       ║"
echo "║  Data:        $DATA_DIR                                    ║"
echo "║  Sandbox:     Docker (forced)                                  ║"
echo "║  Auto-Apply:  DISABLED (all changes require approval)          ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  This is a SAFE sandbox for experimentation.                   ║"
echo "║  No changes will be applied to production files.               ║"
echo "║  All self-modifications require explicit approval.             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Start the R&D server
echo "🚀 Starting TooLoo R&D Server on port $PORT..."
exec npx tsx src/main.ts
