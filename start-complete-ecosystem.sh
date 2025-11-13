#!/usr/bin/env bash
set -euo pipefail

# TooLoo.ai Complete Ecosystem - All Servers + v3 Services
# Starts both original architecture (3001-3009) and v3 clean architecture
# NO destructive pkill - uses safe process management

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"
PIDS_DIR="$PROJECT_ROOT/.pids"
LOG_DIR="$PROJECT_ROOT/logs"

mkdir -p "$PIDS_DIR" "$LOG_DIR"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TooLoo.ai Complete Ecosystem - All Servers                  ║${NC}"
echo -e "${BLUE}║  Original Architecture (3001-3009) + v3 Clean (3000+)        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Original Architecture Servers (3001-3009)
declare -a ORIGINAL_SERVERS=(
  "training-server"
  "meta-server"
  "budget-server"
  "coach-server"
  "cup-server"
  "product-development-server"
  "segmentation-server"
  "reports-server"
  "capabilities-server"
)

# v3 Clean Architecture Services
declare -a V3_SERVICES=(
  "web-gateway"
  "context-service"
  "learning-service"
  "orchestration-service"
  "provider-service"
  "analytics-service"
  "integration-service"
)

# Port mapping for original servers
declare -A ORIGINAL_PORTS=(
  ["training-server"]=3001
  ["meta-server"]=3002
  ["budget-server"]=3003
  ["coach-server"]=3004
  ["cup-server"]=3005
  ["product-development-server"]=3006
  ["segmentation-server"]=3007
  ["reports-server"]=3008
  ["capabilities-server"]=3009
)

# Port mapping for v3 services
declare -A V3_PORTS=(
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

# Function to start a service directly
start_server_direct() {
  local server=$1
  local port=$2
  
  echo -ne "${YELLOW}⏳ Starting $server (port $port)...${NC}"
  
  pidfile="$PIDS_DIR/$server.pid"
  if [ -f "$pidfile" ]; then
    old_pid=$(cat "$pidfile")
    if kill -0 "$old_pid" 2>/dev/null; then
      echo -e "${GREEN} ✓ Already running (PID $old_pid)${NC}"
      return 0
    fi
  fi
  
  if ! is_port_available "$port"; then
    echo -e "${RED} ✗ Port $port is in use${NC}"
    return 1
  fi
  
  logfile="$LOG_DIR/$server.log"
  nohup node "$PROJECT_ROOT/servers/$server.js" > "$logfile" 2>&1 &
  new_pid=$!
  echo "$new_pid" > "$pidfile"
  
  echo -e "${GREEN} ✓ Started (PID $new_pid)${NC}"
  sleep 0.5
  return 0
}

# Start original architecture servers
echo -e "${BLUE}Starting Original Architecture Servers (3001-3009)...${NC}"
echo ""
ORIGINAL_FAILED=()
for server in "${ORIGINAL_SERVERS[@]}"; do
  port=${ORIGINAL_PORTS[$server]}
  if ! start_server_direct "$server" "$port"; then
    ORIGINAL_FAILED+=("$server")
  fi
done

echo ""
echo -e "${BLUE}Starting v3 Clean Architecture Services (3000, 3020, 3100, 3200, 3300, 3400)...${NC}"
echo ""

# Start v3 services
V3_FAILED=()
for service in "${V3_SERVICES[@]}"; do
  port=${V3_PORTS[$service]}
  
  # Skip learning-service on 3001 since original training-server is there
  if [ "$service" = "learning-service" ] && [ "$port" = "3001" ]; then
    echo -e "${YELLOW}⏳ Skipping learning-service (port 3001 used by training-server)${NC}"
    continue
  fi
  
  echo -ne "${YELLOW}⏳ Starting $service (port $port)...${NC}"
  
  pidfile="$PIDS_DIR/$service.pid"
  if [ -f "$pidfile" ]; then
    old_pid=$(cat "$pidfile")
    if kill -0 "$old_pid" 2>/dev/null; then
      echo -e "${GREEN} ✓ Already running (PID $old_pid)${NC}"
      continue
    fi
  fi
  
  if ! is_port_available "$port"; then
    echo -e "${RED} ✗ Port $port is in use${NC}"
    V3_FAILED+=("$service")
    continue
  fi
  
  logfile="$LOG_DIR/$service.log"
  nohup node "$PROJECT_ROOT/servers/$service.js" > "$logfile" 2>&1 &
  new_pid=$!
  echo "$new_pid" > "$pidfile"
  
  echo -e "${GREEN} ✓ Started (PID $new_pid)${NC}"
  sleep 0.5
done

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    SERVICE STATUS                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}Original Architecture Servers:${NC}"
for server in "${ORIGINAL_SERVERS[@]}"; do
  port=${ORIGINAL_PORTS[$server]}
  pidfile="$PIDS_DIR/$server.pid"
  
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      echo -e "${GREEN}✓${NC} $server (Port $port, PID $pid)"
    else
      echo -e "${RED}✗${NC} $server - Process died"
    fi
  else
    echo -e "${YELLOW}?${NC} $server - Not started"
  fi
done

echo ""
echo -e "${BLUE}v3 Clean Architecture Services:${NC}"
for service in "${V3_SERVICES[@]}"; do
  if [ "$service" = "learning-service" ]; then
    echo -e "${YELLOW}○${NC} learning-service (Port 3001 - skipped, using training-server)"
    continue
  fi
  
  port=${V3_PORTS[$service]}
  pidfile="$PIDS_DIR/$service.pid"
  
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      echo -e "${GREEN}✓${NC} $service (Port $port, PID $pid)"
    else
      echo -e "${RED}✗${NC} $service - Process died"
    fi
  else
    echo -e "${YELLOW}?${NC} $service - Not started"
  fi
done

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  ACCESS POINTS                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "Original Architecture:"
echo "  🏠 Web Server (3000):        http://127.0.0.1:3000/"
echo "  🎓 Training (3001):          http://127.0.0.1:3001/"
echo "  🧠 Meta-Learning (3002):     http://127.0.0.1:3002/"
echo "  💰 Budget/Provider (3003):   http://127.0.0.1:3003/"
echo "  🏆 Coach (3004):             http://127.0.0.1:3004/"
echo "  🏅 Provider Cup (3005):      http://127.0.0.1:3005/"
echo "  📦 Product Dev (3006):       http://127.0.0.1:3006/"
echo "  📊 Segmentation (3007):      http://127.0.0.1:3007/"
echo "  📈 Reports (3008):           http://127.0.0.1:3008/"
echo "  🚀 Capabilities (3009):      http://127.0.0.1:3009/"
echo ""

echo "v3 Clean Architecture:"
echo "  🌐 Web Gateway (3000):       http://127.0.0.1:3000/api/v1/system/info"
echo "  📚 Context Service (3020):   http://127.0.0.1:3020/"
echo "  🔄 Orchestration (3100):     http://127.0.0.1:3100/"
echo "  🤖 Provider Service (3200):  http://127.0.0.1:3200/"
echo "  📊 Analytics (3300):         http://127.0.0.1:3300/"
echo "  🔌 Integration (3400):       http://127.0.0.1:3400/"
echo ""

echo "Chat Interface:"
echo "  💬 Enhanced Chat:            http://127.0.0.1:3000/tooloo-chat-enhanced.html"
echo ""

if [ ${#ORIGINAL_FAILED[@]} -eq 0 ] && [ ${#V3_FAILED[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ All services started successfully!${NC}"
  echo ""
  echo "🎉 Complete TooLoo.ai ecosystem is LIVE"
  echo "   • 9 Original Architecture servers"
  echo "   • 6 v3 Clean Architecture services"
  echo "   • 15+ total services running"
  echo ""
else
  if [ ${#ORIGINAL_FAILED[@]} -gt 0 ]; then
    echo -e "${RED}❌ Original servers failed:${NC} ${ORIGINAL_FAILED[@]}"
  fi
  if [ ${#V3_FAILED[@]} -gt 0 ]; then
    echo -e "${RED}❌ v3 services failed:${NC} ${V3_FAILED[@]}"
  fi
fi

echo ""
echo "Logs: $LOG_DIR"
echo "Stop: bash $PROJECT_ROOT/scripts/stop-all-services.sh"
echo ""
