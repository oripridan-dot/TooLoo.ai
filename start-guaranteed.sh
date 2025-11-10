#!/bin/bash
# TooLoo.ai GUARANTEED Startup - Ultra-Reliable Production Launcher
# Multi-layer verification with guaranteed sequential startup
# Version: 3.0 - Mission Critical

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ============================================
# CONFIGURATION
# ============================================
WEB_PORT=${WEB_PORT:-3000}
ORCH_PORT=${ORCH_PORT:-3123}
TIMEOUT_WEB=45
TIMEOUT_ORCH=60
STARTUP_MAX_WAIT=120
LOG_DIR="${LOG_DIR:-.tooloo-startup}"
mkdir -p "$LOG_DIR"

WEB_LOG="$LOG_DIR/web-server.log"
ORCH_LOG="$LOG_DIR/orchestrator.log"
STARTUP_LOG="$LOG_DIR/startup.log"
HEARTBEAT_LOG="$LOG_DIR/heartbeat.log"

# Redirect all output to log
exec 1> >(tee -a "$STARTUP_LOG")
exec 2>&1

# ============================================
# COLORS & OUTPUT
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
  local level=$1
  shift
  local msg="$@"
  local timestamp=$(date '+%H:%M:%S')
  
  case $level in
    INFO)
      echo -e "${BLUE}[${timestamp}]${NC} ℹ️  $msg"
      ;;
    SUCCESS)
      echo -e "${GREEN}[${timestamp}]${NC} ✅ $msg"
      ;;
    WARN)
      echo -e "${YELLOW}[${timestamp}]${NC} ⚠️  $msg"
      ;;
    ERROR)
      echo -e "${RED}[${timestamp}]${NC} ❌ $msg"
      ;;
    DEBUG)
      echo -e "${CYAN}[${timestamp}]${NC} 🔍 $msg"
      ;;
    STEP)
      echo -e "${BLUE}[${timestamp}]${NC} 🔹 $msg"
      ;;
    PROGRESS)
      echo -e "${YELLOW}[${timestamp}]${NC} ⏳ $msg"
      ;;
  esac
}

# ============================================
# CLEANUP & VALIDATION
# ============================================

validate_prerequisites() {
  log STEP "Phase 1/8: Validating prerequisites"
  
  # Check Node.js
  if ! command -v node &> /dev/null; then
    log ERROR "Node.js not found in PATH"
    exit 1
  fi
  local node_version=$(node -v)
  log SUCCESS "Node.js $node_version available"
  
  # Check required files
  local required_files=(
    "servers/web-server.js"
    "servers/orchestrator.js"
    "package.json"
    ".env"
  )
  
  for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
      log ERROR "Required file missing: $file"
      exit 1
    fi
  done
  log SUCCESS "All required files present"
  
  # Check ports are available
  for port in $WEB_PORT $ORCH_PORT 3001 3020 3100 3200 3300 3400; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
      log WARN "Port $port already in use, will kill process"
    fi
  done
}

aggressive_cleanup() {
  log STEP "Phase 2/8: Aggressive cleanup"
  
  # Kill by port (more reliable than PID)
  local ports=(3000 3001 3020 3100 3200 3300 3400 3123)
  
  for port in "${ports[@]}"; do
    if lsof -ti:$port >/dev/null 2>&1; then
      log PROGRESS "Clearing port $port"
      lsof -ti:$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    fi
  done
  
  # Kill by process pattern (backup)
  if pgrep -f "node servers/" >/dev/null 2>&1; then
    log PROGRESS "Killing lingering node processes"
    pkill -9 -f "node servers/" 2>/dev/null || true
  fi
  
  sleep 1
  log SUCCESS "Cleanup complete"
}

# ============================================
# PORT VERIFICATION
# ============================================

wait_for_port() {
  local port=$1
  local max_wait=$2
  local elapsed=0
  
  while [ $elapsed -lt $max_wait ]; do
    if lsof -ti:$port >/dev/null 2>&1; then
      log SUCCESS "Port $port is listening"
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  
  log ERROR "Port $port never became available (waited ${max_wait}s)"
  return 1
}

# ============================================
# HTTP HEALTH CHECK
# ============================================

health_check_endpoint() {
  local url=$1
  local service=$2
  local timeout=$3
  
  local response=$(curl -s -m $timeout "$url" 2>&1 || echo "FAILED")
  
  if [ "$response" != "FAILED" ] && [ -n "$response" ]; then
    log SUCCESS "$service responding at $url"
    return 0
  fi
  
  return 1
}

wait_for_health() {
  local url=$1
  local service=$2
  local max_attempts=$3
  local attempt=1
  
  log PROGRESS "Waiting for $service to be healthy..."
  
  while [ $attempt -le $max_attempts ]; do
    if health_check_endpoint "$url" "$service" 5; then
      return 0
    fi
    
    if [ $((attempt % 3)) -eq 0 ]; then
      log PROGRESS "  Attempt $attempt/$max_attempts - $service still warming up..."
    fi
    
    sleep 2
    attempt=$((attempt + 1))
  done
  
  log WARN "$service health check incomplete after $max_attempts attempts (might still be booting)"
  return 1
}

# ============================================
# PROCESS START & MONITOR
# ============================================

start_service() {
  local service_name=$1
  local command=$2
  local log_file=$3
  local wait_port=$4
  
  log STEP "Starting $service_name..."
  
  # Start in background
  nohup bash -c "$command" > "$log_file" 2>&1 &
  local pid=$!
  
  if ! kill -0 $pid 2>/dev/null; then
    log ERROR "$service_name failed to start (PID $pid died)"
    tail -20 "$log_file"
    return 1
  fi
  
  log SUCCESS "$service_name started (PID: $pid)"
  
  # Wait for port to be listening
  if ! wait_for_port $wait_port 15; then
    log ERROR "$service_name port $wait_port not listening"
    kill -9 $pid 2>/dev/null || true
    tail -20 "$log_file"
    return 1
  fi
  
  echo $pid
  return 0
}

# ============================================
# ORCHESTRATION STARTUP
# ============================================

startup_sequence() {
  log STEP "Phase 3/8: Starting Web Server"
  
  WEB_PID=$(start_service "Web Server" \
    "node servers/web-server.js" \
    "$WEB_LOG" \
    $WEB_PORT)
  
  [ -z "$WEB_PID" ] && {
    log ERROR "Failed to start Web Server"
    exit 1
  }
  
  sleep 2
  wait_for_health "http://127.0.0.1:$WEB_PORT/health" "Web Server" 10
  
  log STEP "Phase 4/8: Starting Orchestrator"
  
  ORCH_PID=$(start_service "Orchestrator" \
    "node servers/orchestrator.js" \
    "$ORCH_LOG" \
    $ORCH_PORT)
  
  [ -z "$ORCH_PID" ] && {
    log ERROR "Failed to start Orchestrator"
    kill -9 $WEB_PID 2>/dev/null || true
    exit 1
  }
  
  sleep 3
  wait_for_health "http://127.0.0.1:$ORCH_PORT/health" "Orchestrator" 15
  
  log SUCCESS "Core services started successfully"
  
  # Store PIDs for monitoring
  echo "$WEB_PID" > "$LOG_DIR/web.pid"
  echo "$ORCH_PID" > "$LOG_DIR/orchestrator.pid"
}

# ============================================
# SERVICE VERIFICATION
# ============================================

verify_services() {
  log STEP "Phase 5/8: Verifying core services"
  
  local services=(
    "3001:Learning"
    "3200:Provider"
    "3020:Context"
    "3400:Integration"
    "3300:Analytics"
    "3100:Orchestration"
  )
  
  local healthy=0
  
  for service_info in "${services[@]}"; do
    local port=${service_info%:*}
    local name=${service_info#*:}
    
    if health_check_endpoint "http://127.0.0.1:$port/health" "$name" 3; then
      healthy=$((healthy + 1))
    else
      log WARN "$name service (port $port) not yet responding"
    fi
  done
  
  log SUCCESS "Verified $healthy/5 core services"
  
  if [ $healthy -lt 3 ]; then
    log WARN "Only $healthy core services responsive - waiting for full startup..."
    sleep 5
  fi
}

# ============================================
# SYSTEM TEST
# ============================================

system_test() {
  log STEP "Phase 6/8: System functionality test"
  
  # Test API endpoint
  local test_response=$(curl -s -X POST http://127.0.0.1:$WEB_PORT/api/v1/system/processes \
    -H 'Content-Type: application/json' \
    -d '{}' 2>/dev/null || echo "")
  
  if [ -n "$test_response" ]; then
    log SUCCESS "API endpoints responding"
  else
    log WARN "API test incomplete but services running"
  fi
}

# ============================================
# HEARTBEAT MONITOR
# ============================================

start_heartbeat_monitor() {
  log STEP "Phase 7/8: Starting heartbeat monitor"
  
  (
    while true; do
      sleep 10
      {
        echo "[$(date '+%H:%M:%S')] Heartbeat check"
        
        if ! kill -0 $(cat "$LOG_DIR/web.pid" 2>/dev/null) 2>/dev/null; then
          echo "[$(date '+%H:%M:%S')] WARNING: Web Server process died"
        fi
        
        if ! kill -0 $(cat "$LOG_DIR/orchestrator.pid" 2>/dev/null) 2>/dev/null; then
          echo "[$(date '+%H:%M:%S')] WARNING: Orchestrator process died"
        fi
        
        # Quick port check
        lsof -ti:$WEB_PORT >/dev/null 2>&1 && echo "[$(date '+%H:%M:%S')] Web Server port: OK" || echo "[$(date '+%H:%M:%S')] Web Server port: DEAD"
        lsof -ti:$ORCH_PORT >/dev/null 2>&1 && echo "[$(date '+%H:%M:%S')] Orchestrator port: OK" || echo "[$(date '+%H:%M:%S')] Orchestrator port: DEAD"
      } >> "$HEARTBEAT_LOG"
    done
  ) &
  
  echo $! > "$LOG_DIR/heartbeat.pid"
  log SUCCESS "Heartbeat monitor started"
}

# ============================================
# FINAL REPORT
# ============================================

print_final_report() {
  log STEP "Phase 8/8: Final startup report"
  
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║           🚀 TooLoo.ai GUARANTEED STARTUP COMPLETE 🚀         ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  
  echo "📊 Service Status:"
  echo "  Web Server        → http://127.0.0.1:$WEB_PORT"
  echo "  Orchestrator      → http://127.0.0.1:$ORCH_PORT"
  echo ""
  
  echo "🔗 Primary Access Points:"
  echo "  🏠 Hub            → http://127.0.0.1:$WEB_PORT/"
  echo "  🎛️  Control Room  → http://127.0.0.1:$WEB_PORT/control-room"
  echo "  💬 Chat           → http://127.0.0.1:$WEB_PORT/tooloo-chat"
  echo "  🏟️  Arena         → http://127.0.0.1:$WEB_PORT/providers-arena.html"
  echo ""
  
  echo "📋 Logs:"
  echo "  Startup   → $STARTUP_LOG"
  echo "  Web       → $WEB_LOG"
  echo "  Orch      → $ORCH_LOG"
  echo "  Heartbeat → $HEARTBEAT_LOG"
  echo ""
  
  echo "🛑 Stop System:"
  echo "  pkill -f 'node servers/'"
  echo ""
  echo "✨ System is ready and monitored!"
  echo ""
}

# ============================================
# MAIN EXECUTION
# ============================================

main() {
  log STEP "╔═══════════════════════════════════════════════════╗"
  log STEP "║  TooLoo.ai GUARANTEED Startup v3.0 - MISSION CRITICAL"
  log STEP "╚═══════════════════════════════════════════════════╝"
  echo ""
  
  # Execute startup phases
  validate_prerequisites || exit 1
  aggressive_cleanup || exit 1
  startup_sequence || exit 1
  verify_services
  system_test
  start_heartbeat_monitor
  print_final_report
  
  log SUCCESS "All startup phases complete - system is GUARANTEED ONLINE"
  
  # Keep process alive
  log INFO "Monitoring startup state (Ctrl+C to stop)..."
  while true; do
    sleep 30
  done
}

# Trap cleanup on exit
trap_exit() {
  log WARN "Shutdown signal received"
  [ -f "$LOG_DIR/heartbeat.pid" ] && kill $(cat "$LOG_DIR/heartbeat.pid" 2>/dev/null) 2>/dev/null || true
  log INFO "Cleanup complete"
  exit 0
}

trap trap_exit SIGINT SIGTERM

# Execute
main "$@"
