#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="$1"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDS_DIR="$PROJECT_ROOT/.pids"
PID_FILE="$PIDS_DIR/$SERVICE_NAME.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "PID file not found for $SERVICE_NAME"
  exit 1
fi
PID=$(cat "$PID_FILE")

if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "Sent SIGTERM to $SERVICE_NAME (PID $PID)"
  # Wait up to 5 seconds
  for i in {1..5}; do
    if kill -0 "$PID" 2>/dev/null; then
      sleep 1
    else
      break
    fi
  done
fi

if kill -0 "$PID" 2>/dev/null; then
  echo "PID $PID did not exit, sending SIGKILL"
  kill -9 "$PID"
fi

rm -f "$PID_FILE"

echo "$SERVICE_NAME stopped"
