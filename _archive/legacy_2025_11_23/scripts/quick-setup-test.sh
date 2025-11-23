#!/bin/bash

# Quick setup and test script for UI Activity Monitor
# This handles starting the services and running tests

set -e

echo "🚀 TooLoo UI Activity Monitor - Quick Setup & Test"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are already running
check_port() {
  lsof -i ":$1" >/dev/null 2>&1
  return $?
}

# Start a service
start_service() {
  local name=$1
  local file=$2
  local port=$3
  
  echo -n "🔄 Starting $name (port $port)... "
  
  # Check if already running
  if check_port $port; then
    echo -e "${GREEN}Already running${NC}"
    return 0
  fi
  
  # Start the service in background
  node "$file" > /tmp/tooloo-${name}.log 2>&1 &
  local pid=$!
  
  # Wait for it to be ready
  local attempts=0
  local max_attempts=30
  while [ $attempts -lt $max_attempts ]; do
    if check_port $port; then
      echo -e "${GREEN}✓ Running (PID: $pid)${NC}"
      return 0
    fi
    sleep 1
    attempts=$((attempts + 1))
  done
  
  echo -e "${RED}✗ Failed to start${NC}"
  cat /tmp/tooloo-${name}.log | tail -5
  return 1
}

# Main execution
main() {
  echo ""
  echo "📋 Step 1: Starting Services"
  echo "───────────────────────────"
  
  # Start web server first (port 3000)
  if ! start_service "web-server" "servers/web-server.js" 3000; then
    echo -e "${RED}Failed to start web server${NC}"
    exit 1
  fi
  
  sleep 1
  
  # Start activity monitor (port 3050)
  if ! start_service "ui-activity-monitor" "servers/ui-activity-monitor.js" 3050; then
    echo -e "${RED}Failed to start activity monitor${NC}"
    exit 1
  fi
  
  echo ""
  echo "✅ All services started!"
  echo ""
  
  # Give services time to fully initialize
  echo "⏳ Waiting for services to stabilize (3 seconds)..."
  sleep 3
  
  echo ""
  echo "📋 Step 2: Quick Sanity Check"
  echo "────────────────────────────"
  
  # Check web server
  echo -n "🌐 Web Server (3000): "
  if curl -s http://127.0.0.1:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
  fi
  
  # Check activity monitor
  echo -n "📊 Activity Monitor (3050): "
  if curl -s http://127.0.0.1:3050/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
  fi
  
  echo ""
  echo "📋 Step 3: Running Tests"
  echo "───────────────────────"
  echo ""
  
  # Run the test suite
  node scripts/test-ui-activity-monitor.js
  local test_result=$?
  
  echo ""
  echo "📋 Step 4: Status"
  echo "────────────────"
  
  if [ $test_result -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo "🎉 UI Activity Monitor is working correctly!"
    echo ""
    echo "📊 Quick monitoring commands:"
    echo "  curl http://127.0.0.1:3000/api/v1/activity/sessions"
    echo "  curl http://127.0.0.1:3000/api/v1/activity/servers"
    echo ""
    echo "🌐 Open in browser:"
    echo "  http://localhost:3000/"
    echo ""
  else
    echo -e "${RED}❌ TESTS FAILED${NC}"
    echo ""
    echo "📋 Troubleshooting:"
    echo "  Check logs in /tmp/tooloo-*.log"
    echo "  Or run: npm run clean && npm run dev"
  fi
  
  echo ""
  echo "💡 To keep services running, use:"
  echo "   npm run dev"
  echo ""
  echo "⚠️  Services will stop when this script exits"
  echo "   Press Ctrl+C to stop all services"
  echo ""
  
  # Keep services running if tests passed
  if [ $test_result -eq 0 ]; then
    echo "🔄 Keeping services running... (Ctrl+C to stop)"
    wait
  fi
}

# Cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Stopping services..."
  pkill -f "node servers/web-server.js" 2>/dev/null || true
  pkill -f "node servers/ui-activity-monitor.js" 2>/dev/null || true
  sleep 1
  echo "✅ Services stopped"
}

trap cleanup EXIT INT TERM

# Run main
main
