#!/bin/bash
# TooLoo.ai Complete System Startup
# Web-server spawns orchestrator which spawns all other services
# Methodical, real, no mocks

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
WEB_PORT=${WEB_PORT:-3000}
ORCH_PORT=${ORCH_PORT:-3123}
LOG_DIR=".tooloo-startup"
mkdir -p "$LOG_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ ${NC}$1"; }
log_ok() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠ ${NC}$1"; }
log_err() { echo -e "${RED}✗${NC} $1"; }

# Phase 1: Clean slate
log_info "🧹 Cleaning up all existing processes..."
pkill -9 -f "node servers/" 2>/dev/null || true
pkill -9 -f "node.*orchestrator" 2>/dev/null || true
sleep 1
log_ok "Processes cleaned"

# Phase 2: Start web-gateway ONLY (NEW event-driven architecture)
log_info "🌐 Starting web-gateway (port $WEB_PORT)..."
nohup node servers/web-gateway.js > "$LOG_DIR/web.log" 2>&1 &
WEB_PID=$!

# Wait for web-server to be ready
ATTEMPTS=0
while [ $ATTEMPTS -lt 60 ]; do
  if curl -s http://127.0.0.1:$WEB_PORT/health >/dev/null 2>&1; then
    log_ok "Web-server ready on port $WEB_PORT (PID: $WEB_PID)"
    break
  fi
  if [ $ATTEMPTS -eq 59 ]; then
    log_err "Web-server failed to start"
    tail -20 "$LOG_DIR/web.log"
    exit 1
  fi
  sleep 0.5
  ATTEMPTS=$((ATTEMPTS + 1))
done

# Phase 3: Trigger orchestrator spawn via web-server API
log_info "🎼 Triggering orchestrator via web-server..."
ORCH_RESPONSE=$(curl -s -X POST "http://127.0.0.1:$WEB_PORT/system/start" \
  -H 'Content-Type: application/json' \
  -d '{"autoOpen":false}' 2>/dev/null || echo "")

if echo "$ORCH_RESPONSE" | grep -q "running\|started"; then
  log_ok "Orchestrator spawn triggered"
else
  log_warn "Orchestrator response unclear, waiting for it to start..."
fi

# Phase 4: Wait for orchestrator to be ready
log_info "⏳ Waiting for orchestrator (port $ORCH_PORT)..."
ATTEMPTS=0
while [ $ATTEMPTS -lt 60 ]; do
  if curl -s http://127.0.0.1:$ORCH_PORT/health >/dev/null 2>&1; then
    log_ok "Orchestrator ready on port $ORCH_PORT"
    break
  fi
  if [ $ATTEMPTS -eq 59 ]; then
    log_warn "Orchestrator not responding (may be ok - services might still start)"
  fi
  sleep 0.5
  ATTEMPTS=$((ATTEMPTS + 1))
done

# Phase 5: Wait for core services to start (they're spawned by orchestrator)
log_info "📡 Waiting for core services to become available..."
sleep 3

CORE_PORTS=(3001 3002 3003 3004)
ALL_READY=true
for PORT in "${CORE_PORTS[@]}"; do
  ATTEMPTS=0
  while [ $ATTEMPTS -lt 30 ]; do
    if curl -s http://127.0.0.1:$PORT/health >/dev/null 2>&1; then
      log_ok "Service on port $PORT ready"
      break
    fi
    if [ $ATTEMPTS -eq 29 ]; then
      log_warn "Port $PORT not responding (may start later)"
      ALL_READY=false
    fi
    sleep 0.5
    ATTEMPTS=$((ATTEMPTS + 1))
  done
done

# Phase 6: Status report
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       🚀 TooLoo.ai System Online 🚀                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
log_ok "Web-server:  http://127.0.0.1:$WEB_PORT"
log_ok "Orchestrator: http://127.0.0.1:$ORCH_PORT"
echo ""
echo "📊 Core Services:"
for PORT in 3000 3001 3002 3003 3004; do
  if curl -s http://127.0.0.1:$PORT/health 2>/dev/null | grep -q '"ok":true'; then
    echo "   ✓ Port $PORT listening"
  else
    echo "   ✗ Port $PORT (starting or unavailable)"
  fi
done
echo ""
echo "🌐 Access Providers Arena:"
echo "   http://127.0.0.1:$WEB_PORT/providers-arena-v2"
echo ""
echo "📝 Live Logs:"
echo "   tail -f $LOG_DIR/web.log"
echo ""
echo "🛑 Stop system:"
echo "   pkill -f 'node servers/'"
echo ""

# Phase 7: Keep alive
log_ok "System monitoring active (Ctrl+C to stop)"
trap "echo ''; log_info 'Stopping...'; pkill -f 'node servers/' 2>/dev/null || true; exit 0" SIGINT
tail -f "$LOG_DIR/web.log" 2>/dev/null || wait
