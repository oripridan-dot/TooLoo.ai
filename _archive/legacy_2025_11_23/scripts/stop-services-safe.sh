#!/bin/bash
# Safe Service Stop Script
# Stops only TooLoo.ai application servers, NOT VS Code or other node processes
# This prevents workspace crashes when using unsafe commands like: pkill -9 -f "node"

set -e

FORCE=${1:-""}
VERBOSE=${2:-""}

echo "🛑 Stopping TooLoo.ai services safely..."

# List of patterns that match only our app servers, not VS Code or system processes
PATTERNS=(
  "servers/web-server.js"
  "servers/training-server.js"
  "servers/meta-server.js"
  "servers/budget-server.js"
  "servers/coach-server.js"
  "servers/cup-server.js"
  "servers/product-development-server.js"
  "servers/segmentation-server.js"
  "servers/reports-server.js"
  "servers/capabilities-server.js"
  "servers/orchestrator.js"
  "servers/sources-server.js"
)

killed_count=0

for pattern in "${PATTERNS[@]}"; do
  # Use pgrep to find processes matching pattern
  # pgrep is safer than pkill -f because it first shows what will be killed
  pids=$(pgrep -f "node.*${pattern}" 2>/dev/null || true)
  
  if [ -n "$pids" ]; then
    if [ "$FORCE" = "--force" ] || [ "$FORCE" = "-9" ]; then
      # Force kill with SIGKILL
      echo "$pids" | xargs kill -9 2>/dev/null || true
      if [ "$VERBOSE" = "--verbose" ]; then
        echo "  ☠️  Force killed: $pattern"
      fi
      killed_count=$((killed_count + $(echo "$pids" | wc -w)))
    else
      # Graceful shutdown with SIGTERM
      echo "$pids" | xargs kill -TERM 2>/dev/null || true
      if [ "$VERBOSE" = "--verbose" ]; then
        echo "  ✋ Gracefully stopped: $pattern"
      fi
      killed_count=$((killed_count + $(echo "$pids" | wc -w)))
    fi
  fi
done

if [ "$killed_count" -eq 0 ]; then
  echo "  ℹ️  No services running"
else
  echo "  ✅ Stopped $killed_count process(es)"
fi

# Clean up nohup files if they exist
rm -f nohup.out 2>/dev/null || true

echo ""
echo "✨ Safe stop complete!"
echo ""
echo "Why this is safe:"
echo "  ✓ Only targets /servers/*.js files"
echo "  ✓ Won't kill VS Code remote server"
echo "  ✓ Won't kill esbuild, vitest, or extensions"
echo "  ✓ Won't crash your workspace"
echo ""
