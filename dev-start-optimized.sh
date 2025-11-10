#!/bin/bash
# TooLoo.ai Optimized Development Startup
# Fast, reliable, minimal output, production-ready
# Version: 1.0

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

# Simple logging
log_info() { echo -e "${BLUE}ℹ ${NC}$1"; }
log_ok() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠ ${NC}$1"; }
log_err() { echo -e "${RED}✗${NC} $1"; }

# Phase 1: Fast cleanup (kill existing processes)
log_info "Cleaning up existing processes (safe stop)..."
bash "$(dirname "$0")/scripts/stop-all-services.sh" --force 2>/dev/null || true
sleep 0.5
sleep 0.5

# Phase 2: Start web server
log_info "Starting web server (port $WEB_PORT)..."
nohup node servers/web-server.js > "$LOG_DIR/web.log" 2>&1 &
WEB_PID=$!

# Wait for web server port to listen (faster than health check)
attempt=1
while [ $attempt -le 20 ]; do
  if lsof -ti:$WEB_PORT >/dev/null 2>&1; then
    log_ok "Web server ready"
    break
  fi
  if [ $attempt -eq 20 ]; then
    log_err "Web server failed to start"
    tail -20 "$LOG_DIR/web.log"
    exit 1
  fi
  sleep 0.5
  attempt=$((attempt + 1))
done

# Phase 3: Start orchestrator via web proxy
log_info "Bootstrapping orchestrator..."
curl -s -X POST "http://127.0.0.1:$WEB_PORT/system/start" \
  -H 'Content-Type: application/json' \
  -d '{"autoOpen":false}' >/dev/null 2>&1 || log_warn "Orchestrator bootstrap via proxy incomplete"

# Phase 4: Wait for orchestrator to be ready
attempt=1
while [ $attempt -le 30 ]; do
  if curl -s "http://127.0.0.1:$ORCH_PORT/health" >/dev/null 2>&1; then
    log_ok "Orchestrator ready"
    break
  fi
  if [ $attempt -eq 30 ]; then
    log_warn "Orchestrator may still be booting"
  fi
  sleep 1
  attempt=$((attempt + 1))
done

sleep 1

# Phase 5: Quick service verification
log_info "Checking core services..."
SERVICES_UP=0
for port in 3001 3002 3003 3004; do
  if lsof -ti:$port >/dev/null 2>&1; then
    SERVICES_UP=$((SERVICES_UP + 1))
  fi
done
log_ok "Services online: $SERVICES_UP/4"

# Phase 6: Final status
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        🚀 TooLoo.ai Ready - Providers Arena 🚀           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "🏠 Primary Access:"
echo "   → http://127.0.0.1:$WEB_PORT/providers-arena-v2"
echo ""
echo "🔗 Also Available:"
echo "   🎛️  Control Room: http://127.0.0.1:$WEB_PORT/control-room"
echo "   💬 Chat:         http://127.0.0.1:$WEB_PORT/tooloo-chat"
echo "   📊 Dashboard:    http://127.0.0.1:$WEB_PORT/dashboard"
echo ""
echo "📝 Logs:"
echo "   tail -f $LOG_DIR/web.log"
echo ""
echo "🛑 Stop: bash scripts/stop-all-services.sh"
echo ""

# Keep alive
log_ok "System monitoring active"
trap "echo ''; log_info 'Shutdown'; bash \"$(dirname \"$0\")/scripts/stop-all-services.sh\" 2>/dev/null || true; exit 0" SIGINT
tail -f "$LOG_DIR/web.log" 2>/dev/null || wait
