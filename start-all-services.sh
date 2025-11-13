#!/usr/bin/env bash
set -euo pipefail

# TooLoo.ai v3 Clean Architecture - Smart Service Manager
# Starts all v3 microservices in dependency order
# NO pkill - uses safe process management

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"
PIDS_DIR="$PROJECT_ROOT/.pids"
LOG_DIR="$PROJECT_ROOT/logs"

# Create directories
mkdir -p "$PIDS_DIR" "$LOG_DIR"

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TooLoo.ai v3 Services - Smart Startup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# v3 Services in startup order (dependencies first)
declare -a SERVICES=(
  "web-gateway"              # Port 3000 - Main entry point
  "context-service"          # Port 3020 - Context/Repos API
  "learning-service"         # Port 3001 - Training/Coach
  "orchestration-service"    # Port 3100 - Intent/DAG/Task
  "provider-service"         # Port 3200 - Providers/Budget
  "analytics-service"        # Port 3300 - Analytics/Badges
  "integration-service"      # Port 3400 - OAuth/GitHub/Slack
)

# Port mapping for verification
declare -A SERVICE_PORTS=(
  ["web-gateway"]=3000
  ["context-service"]=3020
  ["learning-service"]=3001
  ["orchestration-service"]=3100
  ["provider-service"]=3200
  ["analytics-service"]=3300
  ["integration-service"]=3400
)

# Function to check if port is available
is_port_available() {
  local port=$1
  ! nc -z 127.0.0.1 "$port" 2>/dev/null
}

# Function to start a service
start_service() {
  local service=$1
  local port=${SERVICE_PORTS[$service]}
  
  echo -ne "${YELLOW}⏳ Starting $service (port $port)...${NC}"
  
  # Check if already running
  local pidfile="$PIDS_DIR/$service.pid"
  if [ -f "$pidfile" ]; then
    local old_pid=$(cat "$pidfile")
    if kill -0 "$old_pid" 2>/dev/null; then
      echo -e "${GREEN} ✓ Already running (PID $old_pid)${NC}"
      return 0
    fi
  fi
  
  # Check if port is available
  if ! is_port_available "$port"; then
    echo -e "${RED} ✗ Port $port is in use${NC}"
    return 1
  fi
  
  # Start the service using the start-service script
  if bash "$SCRIPTS_DIR/start-service.sh" "$service" 2>&1 | grep -q "Started $service"; then
    echo -e "${GREEN} ✓ Started${NC}"
    sleep 1  # Give service time to initialize
    return 0
  else
    echo -e "${RED} ✗ Failed to start${NC}"
    return 1
  fi
}

# Start all services
echo -e "${BLUE}Starting services...${NC}"
echo ""

FAILED_SERVICES=()
for service in "${SERVICES[@]}"; do
  if ! start_service "$service"; then
    FAILED_SERVICES+=("$service")
  fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Service Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check all services
for service in "${SERVICES[@]}"; do
  port=${SERVICE_PORTS[$service]}
  pidfile="$PIDS_DIR/$service.pid"
  
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      echo -e "${GREEN}✓${NC} $service (PID $pid) - Port $port"
    else
      echo -e "${RED}✗${NC} $service - Process died"
    fi
  else
    echo -e "${YELLOW}?${NC} $service - Not started"
  fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ All services started successfully!${NC}"
  echo ""
  echo "Access points:"
  echo "  🏠 Web Gateway:  http://127.0.0.1:3000/"
  echo "  📚 Context API:  http://127.0.0.1:3020/"
  echo "  🎓 Learning:     http://127.0.0.1:3001/"
  echo "  🔄 Orchestration: http://127.0.0.1:3100/"
  echo "  🤖 Providers:    http://127.0.0.1:3200/"
  echo "  📊 Analytics:    http://127.0.0.1:3300/"
  echo "  🔌 Integration:  http://127.0.0.1:3400/"
  echo ""
  echo "Logs location: $LOG_DIR"
  echo ""
  echo "To stop: bash $PROJECT_ROOT/scripts/stop-all-services.sh"
  echo ""
else
  echo -e "${RED}❌ Failed to start:${NC} ${FAILED_SERVICES[@]}"
  echo ""
  echo "Check logs in: $LOG_DIR"
  exit 1
fi
