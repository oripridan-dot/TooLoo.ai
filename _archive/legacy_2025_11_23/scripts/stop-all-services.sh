#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDS_DIR="$PROJECT_ROOT/.pids"
STOP_SCRIPT="$PROJECT_ROOT/scripts/stop-service.sh"

FORCE=false
if [ "${1-}" = "--force" ]; then
  FORCE=true
fi

if [ ! -d "$PIDS_DIR" ]; then
  echo "No .pids directory found; nothing to stop."
  exit 0
fi

shopt -s nullglob
for pidfile in "$PIDS_DIR"/*.pid; do
  svc=$(basename "$pidfile" .pid)
  echo "Stopping $svc..."
  if [ "$FORCE" = true ]; then
    # Try graceful stop first, but force if necessary
    bash "$STOP_SCRIPT" "$svc" || true
  else
    bash "$STOP_SCRIPT" "$svc" || echo "Failed to stop $svc (maybe not running)"
  fi
done

echo "All stop attempts completed."
