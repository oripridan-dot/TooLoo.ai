#!/usr/bin/env bash
set -euo pipefail

WEB_PORT="${WEB_PORT:-3000}"
BASE="http://127.0.0.1:${WEB_PORT}"

log(){ printf "[tooloo-local] %s\n" "$*"; }

# Request graceful stop via web proxy
if curl -fsS -X POST "$BASE/system/stop" >/dev/null 2>&1; then
  log "Requested orchestrator stop"
fi

# Kill web server if PID file exists
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT_DIR/.local-run/web.pid"
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE" || true)
  if [ -n "${PID:-}" ] && kill -0 "$PID" >/dev/null 2>&1; then
    log "Stopping web server (pid $PID)"
    kill "$PID" || true
  fi
  rm -f "$PID_FILE"
fi

# Fallback cleanup
pkill -f "servers/web-server.js" 2>/dev/null || true
pkill -f "servers/orchestrator.js" 2>/dev/null || true
log "Stopped."
