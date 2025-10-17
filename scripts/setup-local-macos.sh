#!/usr/bin/env bash
set -euo pipefail

# TooLoo.ai local bootstrap for macOS (Apple Silicon friendly)
# - Clones or updates the repo under ~/Documents/GitHub/TooLoo.ai (override with $TOOLOO_LOCAL_DIR)
# - Ensures Node.js >= 18 (via Homebrew if available)
# - Installs dependencies
# - Starts the web server, then starts the orchestrator via /system/start
# - Opens Control Room and TooLoo Chat in your default browser

TARGET_DIR="${TOOLOO_LOCAL_DIR:-$HOME/Documents/Github/TooLoo}"
REPO_URL="https://github.com/oripridan-dot/TooLoo.ai.git"
WEB_PORT="${WEB_PORT:-3000}"

has() { command -v "$1" >/dev/null 2>&1; }
log() { printf "[tooloo-local] %s\n" "$*"; }

mkdir -p "$(dirname "$TARGET_DIR")"
if [ ! -d "$TARGET_DIR/.git" ]; then
  log "Cloning repo to $TARGET_DIR"
  git clone "$REPO_URL" "$TARGET_DIR"
else
  log "Updating existing repo at $TARGET_DIR"
  (cd "$TARGET_DIR" && git fetch --all && git pull --ff-only)
fi

# Ensure Node.js >= 18
if ! has node; then
  if has brew; then
    log "Installing Node.js 18 via Homebrew"
    brew install node@18 || true
    brew link --overwrite --force node@18 || true
  else
    log "Node.js not found. Please install Node >= 18 (brew install node or nvm install 18)"
    exit 1
  fi
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  if has brew; then
    log "Upgrading Node to 18 via Homebrew"
    brew install node@18 || true
    brew link --overwrite --force node@18 || true
  else
    log "Node version < 18. Please upgrade to Node >= 18."
    exit 1
  fi
fi

cd "$TARGET_DIR"
log "Installing dependencies"
npm install

LOG_DIR="$TARGET_DIR/.local-run"
mkdir -p "$LOG_DIR"

# Start web server if not already running
if ! curl -fsS "http://127.0.0.1:${WEB_PORT}/health" >/dev/null 2>&1; then
  log "Starting web server on port ${WEB_PORT}"
  nohup node servers/web-server.js > "$LOG_DIR/web.log" 2>&1 &
  echo $! > "$LOG_DIR/web.pid"
  # Wait for health
  for i in {1..60}; do
    if curl -fsS "http://127.0.0.1:${WEB_PORT}/health" >/dev/null 2>&1; then break; fi
    sleep 0.25
  done
fi

# Start orchestrator via web control; opens Control Room + Chat automatically
log "Starting orchestrator via /system/start (autoOpen=true)"
curl -fsS -X POST "http://127.0.0.1:${WEB_PORT}/system/start" -H 'Content-Type: application/json' -d '{"autoOpen":true}' >/dev/null || true

# Also open pages explicitly as a fallback (macOS)
if has open; then
  open "http://127.0.0.1:${WEB_PORT}/control-room" || true
  sleep 0.4
  open "http://127.0.0.1:${WEB_PORT}/tooloo-chat" || true
fi

log "Local Tooloo is running. Control Room: http://127.0.0.1:${WEB_PORT}/control-room"
