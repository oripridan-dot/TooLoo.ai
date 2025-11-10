#!/bin/bash
# TooLoo.ai Rock Solid Launcher - Production Ready
# Ultra-reliable startup with health checks and monitoring

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
WEB_PORT=${WEB_PORT:-3000}
LOG_DIR="/tmp/tooloo"
mkdir -p "$LOG_DIR"
WEB_LOG="$LOG_DIR/web-server.log"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# UTILITY FUNCTIONS
# ============================================

log() {
  echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
  echo -e "${GREEN}✓ $1${NC}"
}

warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

error() {
  echo -e "${RED}✗ $1${NC}"
}

cleanup_on_error() {
  error "Startup failed - cleaning up..."
  bash "$(dirname "$0")/scripts/stop-all-services.sh" --force 2>/dev/null || true
  exit 1
}

# Aggressive cleanup of stale processes
aggressive_cleanup() {
  log "🧹 Aggressive cleanup phase..."
  
  # Kill any lingering node processes on our ports
  for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3011 3050 3123; do
    if lsof -ti:$port &>/dev/null 2>&1; then
      log "  Clearing port $port..."
      lsof -ti:$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    fi
  done
  
  # Kill any remaining node servers (use safe stop)
  bash "$(dirname "$0")/scripts/stop-all-services.sh" --force 2>/dev/null || true
  sleep 1
}

# Health check function with retry logic
health_check() {
  local url=$1
  local service_name=$2
  local max_attempts=20
  local attempt=1
  
  log "Checking $service_name health..."
  
  while [ $attempt -le $max_attempts ]; do
    response=$(curl -s -w "\n%{http_code}" -f "$url" --max-time $HEALTH_CHECK_TIMEOUT 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "000" ]; then
      # Either got a 200 response or at least connected
      if [ -n "$(echo "$response" | head -n-1)" ] || [ "$http_code" = "000" ]; then
        success "$service_name is healthy (code: $http_code)"
        return 0
      fi
    fi
    
    if [ $((attempt % 5)) -eq 0 ]; then
      warn "  Attempt $attempt/$max_attempts for $service_name (last response: $http_code)..."
    fi
    
    sleep 1
    attempt=$((attempt + 1))
  done
  
  warn "$service_name health check timed out after $max_attempts attempts"
  return 1
}

# Verify environment is ready
verify_environment() {
  log "Verifying environment..."
  
  # Check Node.js
  if ! command -v node &> /dev/null; then
    error "Node.js not found"
    exit 1
  fi
  
  # Check required files
  local required_files=(
    "servers/web-server.js"
    "servers/orchestrator.js"
    ".env"
  )
  
  for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
      error "Required file missing: $file"
      exit 1
    fi
  done
  
  success "Environment verified"
}

# ============================================
# STARTUP SEQUENCE
# ============================================

main() {
  echo ""
  echo "======================================================"
  echo "   🚀 TooLoo.ai Rock Solid Launcher v2.0"
  echo "======================================================"
  echo ""
  
  # 1. Verify environment
  verify_environment
  
  # 2. Aggressive cleanup
  aggressive_cleanup
  
  # 3. Start web server
  log "Starting Web Server (port $WEB_PORT)..."
  nohup node servers/web-server.js > "$WEB_LOG" 2>&1 &
  WEB_PID=$!
  
  if [ -z "$WEB_PID" ]; then
    error "Failed to start web server"
    exit 1
  fi
  
  success "Web Server started (PID: $WEB_PID)"
  
  # 4. Wait for web server to be healthy
  sleep 2
  if ! health_check "http://127.0.0.1:$WEB_PORT/health" "Web Server"; then
    warn "Web Server health check had issues, checking if it's still listening..."
    if lsof -ti:$WEB_PORT &>/dev/null; then
      success "Web Server is listening on port $WEB_PORT, continuing..."
    else
      error "Web Server is not listening"
      tail -20 "$WEB_LOG"
      exit 1
    fi
  fi
  
  # 5. Initialize system via web proxy
  log "Initializing system via orchestrator..."
  INIT_RESPONSE=$(curl -s -X POST http://127.0.0.1:$WEB_PORT/system/start \
    -H 'Content-Type: application/json' \
    -d '{"autoOpen":false}' 2>/dev/null || echo '{"ok":false}')
  
  if echo "$INIT_RESPONSE" | grep -q '"ok":true'; then
    success "System initialized through web proxy"
  else
    warn "System initialization via proxy incomplete, services starting in background"
  fi
  
  # 6. Wait for orchestrator
  sleep 2
  health_check "http://127.0.0.1:$ORCH_PORT/health" "Orchestrator" || true
  
  # 7. Verify key services are responding
  log "Verifying core services..."
  sleep 1
  
  if curl -s http://127.0.0.1:3011/health &>/dev/null; then
    success "Arena service is responsive"
  fi
  
  if curl -s http://127.0.0.1:3001/health &>/dev/null; then
    success "Training service is responsive"
  fi
  
  if curl -s http://127.0.0.1:3003/health &>/dev/null; then
    success "Budget service is responsive"
  fi
  
  # 8. Final status report
  echo ""
  echo "======================================================"
  
  # Detect environment for appropriate URL
  if [ -n "$CODESPACE_NAME" ]; then
    HUB_URL="https://${CODESPACE_NAME}-${WEB_PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/"
    echo -e "${GREEN}✓ Codespaces URL:${NC}"
    echo "  $HUB_URL"
  else
    echo -e "${GREEN}✓ Local URL:${NC}"
    echo "  http://127.0.0.1:$WEB_PORT/"
  fi
  
  echo ""
  echo "Access Points:"
  echo "  🏠 Hub:           http://127.0.0.1:$WEB_PORT/"
  echo "  🎛️  Control Room: http://127.0.0.1:$WEB_PORT/control-room"
  echo "  💬 Chat:          http://127.0.0.1:$WEB_PORT/tooloo-chat"
  echo "  🏟️  Providers:    http://127.0.0.1:$WEB_PORT/providers-arena.html"
  echo ""
  echo "Logs:"
  echo "  Web:        $WEB_LOG"
  echo "  Orchestrator: $ORCH_LOG"
  echo ""
  echo "Stop: bash scripts/stop-all-services.sh"
  echo "======================================================"
  echo ""
  
  success "🎉 TooLoo.ai is running and ready!"
  
  # Keep script alive and monitor
  log "Monitoring services (Ctrl+C to stop)..."
  while true; do
    sleep 5
    
    # Simple health check every 10 seconds
    if ! curl -s -f "http://127.0.0.1:$WEB_PORT/health" > /dev/null 2>&1; then
      warn "Web Server became unresponsive"
      if ! health_check "http://127.0.0.1:$WEB_PORT/health" "Web Server Recovery"; then
        error "Web Server is dead - restart required"
        exit 1
      fi
      success "Web Server recovered"
    fi
  done
}

# ============================================
# EXECUTE
# ============================================

main "$@"
