#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="$1"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
PIDS_DIR="$PROJECT_ROOT/.pids"

mkdir -p "$LOG_DIR" "$PIDS_DIR"

case "$SERVICE_NAME" in
  learning-service)
    FILE="servers/learning-service.js"
    ;;
  provider-service)
    FILE="servers/provider-service.js"
    ;;
  context-service)
    FILE="servers/context-service.js"
    ;;
  integration-service)
    FILE="servers/integration-service.js"
    ;;
  analytics-service)
    FILE="servers/analytics-service.js"
    ;;
  orchestration-service)
    FILE="servers/orchestration-service.js"
    ;;
  web-gateway)
    FILE="servers/web-gateway.js"
    ;;
  *)
    echo "Unknown service: $SERVICE_NAME" >&2
    exit 2
    ;;
esac

if [ ! -f "$PROJECT_ROOT/$FILE" ]; then
  echo "Service file not found: $PROJECT_ROOT/$FILE" >&2
  exit 3
fi

PID_FILE="$PIDS_DIR/$SERVICE_NAME.pid"
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "$SERVICE_NAME already running (PID $OLD_PID)"
    exit 0
  else
    echo "Stale PID file found, removing"
    rm -f "$PID_FILE"
  fi
fi

LOG_FILE="$LOG_DIR/$SERVICE_NAME.log"

# Start with nohup so it survives shell exit, do not use pkill anywhere
nohup node "$PROJECT_ROOT/$FILE" > "$LOG_FILE" 2>&1 &
NEW_PID=$!

echo "$NEW_PID" > "$PID_FILE"

echo "Started $SERVICE_NAME (PID $NEW_PID), logs: $LOG_FILE"
exit 0
