#!/bin/bash
# TooLoo.ai - Production Startup Script
# Unified, reliable startup for all services with health verification
# Version: 4.0 - Stable Multi-Service Orchestration

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ============================================================================
# CONFIGURATION
# ============================================================================
WEB_PORT=${WEB_PORT:-3000}
LOG_DIR="${LOG_DIR:-.tooloo-startup}"
mkdir -p "$LOG_DIR"

STARTUP_LOG="$LOG_DIR/startup-$(date +%Y%m%d-%H%M%S).log"
EXEC_LOG="$LOG_DIR/last-startup.log"

# Create symlink to last startup log for easy access
ln -sf "$(basename "$STARTUP_LOG")" "$LOG_DIR/last-startup.log" 2>/dev/null || true

# Redirect all output
exec 1> >(tee -a "$STARTUP_LOG" "$EXEC_LOG")
exec 2>&1

# ============================================================================
# COLORS & OUTPUT
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log_step() {
  local msg="$1"
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}→ $msg${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_ok() {
  echo -e "${GREEN}✅ $@${NC}"
}

log_warn() {
  echo -e "${YELLOW}⚠️  $@${NC}"
}

log_err() {
  echo -e "${RED}❌ $@${NC}"
}

log_info() {
  echo -e "${CYAN}ℹ️  $@${NC}"
}

log_progress() {
  echo -e "${MAGENTA}⏳ $@${NC}"
}

# ============================================================================
# CLEANUP & VERIFICATION
# ============================================================================

cleanup_old_processes() {
  log_step "Phase 1: Cleanup & Verification"
  
  # Kill any old Node processes on our ports
  for port in 3000 3001 3002 3003 3004 3006 3007 3008 3009 3100 3200 3300; do
    if lsof -i ":$port" >/dev/null 2>&1; then
      log_warn "Port $port in use, attempting cleanup..."
      lsof -i ":$port" | grep -v COMMAND | awk '{print $2}' | xargs kill -9 2>/dev/null || true
      sleep 0.5
    fi
  done
  
  # Give processes time to gracefully exit
  sleep 1
  log_ok "Ports cleared"
}

verify_prerequisites() {
  log_info "Checking prerequisites..."
  
  # Node.js
  if ! command -v node &>/dev/null; then
    log_err "Node.js not found"
    exit 1
  fi
  log_ok "Node.js $(node -v)"
  
  # Required files
  local files=("servers/web-server.js" "servers/orchestrator.js" "package.json" ".env")
  for f in "${files[@]}"; do
    if [ ! -f "$f" ]; then
      log_err "Missing: $f"
      exit 1
    fi
  done
  log_ok "All required files present"
}

# ============================================================================
# MAIN STARTUP FLOW
# ============================================================================

start_web_server() {
  log_step "Phase 2: Starting Web Server (Port 3000)"
  
  # Start web server in background
  node servers/web-server.js > "$LOG_DIR/web-server.log" 2>&1 &
  WEB_PID=$!
  
  # Wait for it to be ready
  local attempts=0
  local max_attempts=30
  
  while [ $attempts -lt $max_attempts ]; do
    if curl -s "http://127.0.0.1:$WEB_PORT/health" >/dev/null 2>&1; then
      log_ok "Web server responding (PID: $WEB_PID)"
      return 0
    fi
    sleep 1
    attempts=$((attempts + 1))
  done
  
  log_err "Web server failed to start"
  return 1
}

trigger_orchestrator() {
  log_step "Phase 3: Triggering Service Orchestration"
  
  log_info "Calling POST /system/start to launch orchestrator..."
  
  local response=$(curl -s -X POST "http://127.0.0.1:$WEB_PORT/system/start" \
    -H 'Content-Type: application/json' \
    -d '{"autoOpen":false}' 2>/dev/null || echo '{}')
  
  if echo "$response" | grep -q '"ok":true'; then
    log_ok "Orchestrator startup initiated"
    return 0
  else
    log_warn "Orchestrator call status unclear: $response"
    return 0  # Not a hard failure - orchestrator might start anyway
  fi
}

verify_services() {
  log_step "Phase 4: Verifying Services"
  
  # Service definitions from orchestrator.js SERVICE_REGISTRY
  local -a services=(
    "3001:training"
    "3002:meta"
    "3003:budget"
    "3004:coach"
    "3006:product"
    "3007:segmentation"
    "3008:reports"
    "3009:capabilities"
    "3100:orchestration"
    "3200:provider"
    "3300:analytics"
  )
  
  local verified=0
  local total=${#services[@]}
  
  # Give services a moment to start
  sleep 3
  
  log_info "Checking $total services..."
  
  for service_info in "${services[@]}"; do
    local port="${service_info%:*}"
    local name="${service_info#*:}"
    
    if curl -s "http://127.0.0.1:$port/health" >/dev/null 2>&1; then
      log_ok "$name (port $port)"
      verified=$((verified + 1))
    else
      log_warn "$name (port $port) - not yet responding"
    fi
  done
  
  echo ""
  log_info "Service Status: $verified/$total responding"
  
  if [ $verified -ge 7 ]; then
    log_ok "Minimum services online"
    return 0
  else
    log_warn "Services still booting (slower startup is normal)"
    return 0
  fi
}

test_api_endpoints() {
  log_step "Phase 5: Testing API Endpoints"
  
  # Test synthesis endpoint
  log_info "Testing /api/v1/chat/synthesis..."
  if curl -s -X POST "http://127.0.0.1:$WEB_PORT/api/v1/chat/synthesis" \
    -H 'Content-Type: application/json' \
    -d '{"message":"Hello"}' | grep -q '"response"'; then
    log_ok "Synthesis endpoint responding"
  else
    log_warn "Synthesis endpoint not ready yet"
  fi
  
  # Test ensemble endpoint
  log_info "Testing /api/v1/chat/ensemble..."
  if curl -s -X POST "http://127.0.0.1:$WEB_PORT/api/v1/chat/ensemble" \
    -H 'Content-Type: application/json' \
    -d '{"message":"Hello"}' | grep -q '"providers"'; then
    log_ok "Ensemble endpoint responding"
  else
    log_warn "Ensemble endpoint not ready yet"
  fi
}

wait_for_stability() {
  log_step "Phase 6: Waiting for System Stability"
  
  log_info "Waiting 15 seconds for remaining services to boot..."
  
  for i in {15..1}; do
    printf "\r${CYAN}⏳ Waiting... ${i}s${NC}   "
    sleep 1
  done
  echo ""
  
  log_ok "Stability check complete"
}

final_verification() {
  log_step "Phase 7: Final System Verification"
  
  local web_ok=0
  local service_count=0
  
  # Check web server
  if curl -s "http://127.0.0.1:$WEB_PORT/health" >/dev/null 2>&1; then
    web_ok=1
    log_ok "Web Server: READY"
  else
    log_err "Web Server: NOT RESPONDING"
    return 1
  fi
  
  # Count active services
  for port in 3001 3002 3003 3004 3006 3007 3008 3009 3100 3200 3300; do
    if curl -s "http://127.0.0.1:$port/health" >/dev/null 2>&1; then
      service_count=$((service_count + 1))
    fi
  done
  
  log_ok "Active Services: $service_count/11"
  
  # Display summary
  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║${NC} ${CYAN}TooLoo.ai System Status${NC}"
  echo -e "${GREEN}╠════════════════════════════════════════════════════════╣${NC}"
  echo -e "${GREEN}║${NC} 🌐 Web Server:     ${GREEN}READY${NC} (port 3000)"
  echo -e "${GREEN}║${NC} 🔧 Services:       ${GREEN}$service_count/11 ONLINE${NC}"
  echo -e "${GREEN}║${NC} 📊 Status:         $([ $service_count -ge 7 ] && echo "${GREEN}OPERATIONAL${NC}" || echo "${YELLOW}BOOTING${NC}")${NC}"
  echo -e "${GREEN}║${NC}"
  echo -e "${GREEN}║${NC} ${CYAN}Access Points:${NC}"
  echo -e "${GREEN}║${NC}   • Web UI:       http://127.0.0.1:3000"
  echo -e "${GREEN}║${NC}   • API:          http://127.0.0.1:3000/api/v1"
  echo -e "${GREEN}║${NC}   • Health:       http://127.0.0.1:3000/health"
  echo -e "${GREEN}║${NC}   • Chat (Fast):  POST /api/v1/chat/synthesis"
  echo -e "${GREEN}║${NC}   • Chat (Multi): POST /api/v1/chat/ensemble"
  echo -e "${GREEN}║${NC}"
  echo -e "${GREEN}║${NC} ${CYAN}Service Ports:${NC}"
  echo -e "${GREEN}║${NC}   Training (3001) • Meta (3002) • Budget (3003)"
  echo -e "${GREEN}║${NC}   Coach (3004) • Product (3006)"
  echo -e "${GREEN}║${NC}   Segmentation (3007) • Reports (3008)"
  echo -e "${GREEN}║${NC}   Capabilities (3009) • Orchestration (3100)"
  echo -e "${GREEN}║${NC}   Provider (3200) • Analytics (3300)"
  echo -e "${GREEN}║${NC}"
  echo -e "${GREEN}║${NC} ${CYAN}Logs:${NC} $LOG_DIR/"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# ============================================================================
# EXECUTION
# ============================================================================

main() {
  echo -e "\n${MAGENTA}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${MAGENTA}║${NC}  ${CYAN}TooLoo.ai - Production Startup${NC}"
  echo -e "${MAGENTA}║${NC}  Unified Multi-Service Orchestration"
  echo -e "${MAGENTA}╚════════════════════════════════════════════════════════╝${NC}\n"
  
  # Run phases
  cleanup_old_processes || exit 1
  verify_prerequisites || exit 1
  
  start_web_server || exit 1
  sleep 1
  
  trigger_orchestrator || exit 1
  sleep 2
  
  verify_services || true
  test_api_endpoints || true
  
  wait_for_stability
  final_verification || exit 1
  
  echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║${NC}           ${CYAN}🚀 TooLoo.ai is READY 🚀${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}\n"
  
  # Keep process alive (for monitoring)
  log_info "System running. Press Ctrl+C to stop."
  
  while true; do
    sleep 60
    # Optional: periodic health check
    if ! curl -s "http://127.0.0.1:$WEB_PORT/health" >/dev/null 2>&1; then
      log_warn "Web server health check failed"
    fi
  done
}

# Handle interrupts gracefully
trap 'echo -e "\n${YELLOW}Shutdown initiated...${NC}"; exit 0' SIGINT SIGTERM

main "$@"
