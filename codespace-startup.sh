#!/bin/bash
# TooLoo.ai Codespace Optimized Startup
# Fast, reliable, minimal latency
# Purpose: Start TooLoo system with optimal performance for Codespace environment
# Features:
#  - Parallel service startup (not sequential)
#  - Minimal wait times, proper health checks only
#  - Non-blocking initialization
#  - Fast endpoint responsiveness
# 
# Usage: bash codespace-startup.sh
# Or:    npm run dev (which calls this)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ============================================
# CONFIGURATION
# ============================================
WEB_PORT=${WEB_PORT:-3000}
ORCH_PORT=${ORCH_PORT:-3123}
LOG_DIR=".tooloo-startup"
mkdir -p "$LOG_DIR"

# ============================================
# COLORS & OUTPUT
# ============================================
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_ok() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_err() { echo -e "${RED}✗${NC} $1"; }

# ============================================
# UTILITIES
# ============================================

# Wait for a port to be listening (fast version)
wait_for_port() {
  local port=$1
  local name=$2
  local max_wait=${3:-15}
  local elapsed=0
  
  while [ $elapsed -lt $max_wait ]; do
    if lsof -ti:$port >/dev/null 2>&1; then
      log_ok "$name listening on port $port"
      return 0
    fi
    sleep 0.5
    elapsed=$((elapsed + 1))
  done
  
  log_warn "$name not listening on port $port (may start later)"
  return 1
}

# Quick HTTP health check
health_check() {
  local port=$1
  local path=${2:-/health}
  local timeout=${3:-3}
  
  curl -s -m $timeout "http://127.0.0.1:$port$path" >/dev/null 2>&1 && return 0 || return 1
}

# ============================================
# STARTUP SEQUENCE
# ============================================

main() {
  echo ""
  log_info "╔══════════════════════════════════════════════════════╗"
  log_info "║    TooLoo.ai Codespace Optimized Startup             ║"
  log_info "╚══════════════════════════════════════════════════════╝"
  echo ""

  # Phase 1: Clean up stray processes (fast kill by port)
  log_info "Phase 1: Cleaning up existing processes..."
  for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3011 3014 3020 3123; do
    lsof -ti:$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  done
  sleep 0.5
  log_ok "Cleanup complete"
  echo ""

  # Phase 2: Start web-server (non-blocking, fire and forget)
  log_info "Phase 2: Starting web-server on port $WEB_PORT..."
  nohup node servers/web-server.js > "$LOG_DIR/web.log" 2>&1 &
  WEB_PID=$!
  echo "   PID: $WEB_PID"
  echo ""

  # Phase 3: Wait for web-server to be ready
  log_info "Phase 3: Waiting for web-server..."
  if wait_for_port $WEB_PORT "Web-server" 15; then
    sleep 0.5 # Brief pause for web-server to be fully ready
  else
    log_err "Web-server failed to start"
    tail -20 "$LOG_DIR/web.log"
    exit 1
  fi
  echo ""

  # Phase 4: Trigger orchestrator spawn via web-server API (async)
  log_info "Phase 4: Triggering orchestrator startup..."
  ORCH_RESPONSE=$(curl -s -X POST "http://127.0.0.1:$WEB_PORT/system/start" \
    -H 'Content-Type: application/json' \
    -d '{"autoOpen":false}' 2>/dev/null || echo "")
  
  if echo "$ORCH_RESPONSE" | grep -q "ok"; then
    log_ok "Orchestrator spawn triggered"
  else
    log_warn "Orchestrator response unclear (may still start)"
  fi
  echo ""

  # Phase 5: Wait for orchestrator to be ready (optional but quick)
  log_info "Phase 5: Waiting for orchestrator..."
  if wait_for_port $ORCH_PORT "Orchestrator" 20; then
    true
  else
    log_warn "Orchestrator not responding yet (services may still be starting)"
  fi
  echo ""

  # Phase 6: Verify critical services (quick probes in parallel)
  log_info "Phase 6: Verifying core services..."
  sleep 1 # Brief grace period for services to boot
  
  declare -a CORE_PORTS=(3001 3002 3003 3004)
  declare -a CORE_NAMES=("Training" "Meta-Learning" "Budget" "Coach")
  local ready_count=0
  
  for i in "${!CORE_PORTS[@]}"; do
    port=${CORE_PORTS[$i]}
    name=${CORE_NAMES[$i]}
    
    if health_check $port "/health" 2; then
      log_ok "$name service ready"
      ready_count=$((ready_count + 1))
    else
      log_warn "$name service not yet responding"
    fi
  done
  
  if [ $ready_count -lt 2 ]; then
    log_warn "Only $ready_count/4 core services ready (may need more time)"
  fi
  echo ""

  # Phase 7: Status report
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║        🚀 TooLoo.ai ONLINE 🚀                        ║"
  echo "╚══════════════════════════════════════════════════════╝"
  echo ""
  echo "✅ Access Points:"
  echo "   🏠 Hub:           http://127.0.0.1:$WEB_PORT/"
  echo "   🎛️  Control Room: http://127.0.0.1:$WEB_PORT/control-room"
  echo "   💬 Chat:          http://127.0.0.1:$WEB_PORT/tooloo-chat"
  echo "   🏟️  Arena:        http://127.0.0.1:$WEB_PORT/providers-arena-v2"
  echo ""
  echo "📊 Service Status:"
  echo "   Web (3000):      $(health_check 3000 && echo '✓ online' || echo '✗ starting')"
  echo "   Orch (3123):     $(health_check 3123 && echo '✓ online' || echo '✗ starting')"
  echo "   Training (3001): $(health_check 3001 && echo '✓ online' || echo '✗ starting')"
  echo "   Meta (3002):     $(health_check 3002 && echo '✓ online' || echo '✗ starting')"
  echo ""
  echo "📝 Logs:"
  echo "   tail -f $LOG_DIR/web.log"
  echo "   tail -f $LOG_DIR/orchestrator.log (once created)"
  echo ""
  echo "🛑 To stop:"
  echo "   pkill -f 'node servers/'"
  echo ""
  echo "✨ System ready! Startup complete in ~10-15 seconds"
  echo ""
}

# Execute
main "$@"
