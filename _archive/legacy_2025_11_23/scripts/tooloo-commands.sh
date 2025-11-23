#!/bin/bash

# TooLoo UI Activity Monitor - Command Reference
# 
# Quick reference for all common commands related to UI activity monitoring
# and real data pipeline.
#
# Usage: Source this file or copy commands as needed
#

# ============================================================
# STARTUP & BASICS
# ============================================================

# Start everything (web + orchestrator + all services + activity monitor)
alias start-tooloo='npm run dev'

# Check if activity monitor is running
check-monitor() {
  echo "Checking Activity Monitor on port 3050..."
  curl -s http://127.0.0.1:3050/health | jq .
}

# ============================================================
# SESSION & ACTIVITY MONITORING
# ============================================================

# List all active sessions
sessions() {
  curl -s http://127.0.0.1:3000/api/v1/activity/sessions | jq '.sessions'
}

# Watch active sessions in real-time
watch-sessions() {
  watch 'curl -s http://127.0.0.1:3000/api/v1/activity/sessions | jq ".activeSessions, .sessions[]"'
}

# ============================================================
# SERVER HEALTH & STATUS
# ============================================================

# Check all server health
servers() {
  curl -s http://127.0.0.1:3000/api/v1/activity/servers | jq '.servers'
}

# Quick summary of active servers
servers-summary() {
  curl -s http://127.0.0.1:3000/api/v1/activity/servers | jq '{active: .activeServers, total: .totalServers}'
}

# Watch server health in real-time
watch-servers() {
  watch 'curl -s http://127.0.0.1:3000/api/v1/activity/servers | jq "{active: .activeServers, total: .totalServers, servers: [.servers[] | select(.isPriority) | {name, healthy, latency}]}"'
}

# ============================================================
# PROVIDER & DATA MANAGEMENT
# ============================================================

# Check provider status
providers() {
  curl -s http://127.0.0.1:3000/api/v1/providers/status | jq '.status'
}

# Check budget
budget() {
  curl -s http://127.0.0.1:3000/api/v1/budget | jq '.budget'
}

# Ensure real data mode is active
ensure-real-data() {
  echo "Activating real data mode..."
  curl -s -X POST http://127.0.0.1:3000/api/v1/activity/ensure-real-data | jq .
}

# Force all critical services to start
start-all-services() {
  echo "Starting all critical services..."
  curl -s -X POST http://127.0.0.1:3000/api/v1/activity/start-all | jq '.started'
}

# ============================================================
# CONFIGURATION
# ============================================================

# Enable real data mode
enable-real-data() {
  curl -s -X POST http://127.0.0.1:3000/api/v1/activity/config \
    -H 'Content-Type: application/json' \
    -d '{"realDataMode": true}' | jq '.config.realDataMode'
}

# Disable real data mode (demo mode)
disable-real-data() {
  curl -s -X POST http://127.0.0.1:3000/api/v1/activity/config \
    -H 'Content-Type: application/json' \
    -d '{"realDataMode": false}' | jq '.config.realDataMode'
}

# Set minimum active servers
set-min-servers() {
  local count=${1:-6}
  echo "Setting minimum active servers to $count..."
  curl -s -X POST http://127.0.0.1:3000/api/v1/activity/config \
    -H 'Content-Type: application/json' \
    -d "{\"minActiveServers\": $count}" | jq '.config.minActiveServers'
}

# Enable/disable auto-start
set-auto-start() {
  local enabled=${1:-true}
  echo "Setting auto-start to $enabled..."
  curl -s -X POST http://127.0.0.1:3000/api/v1/activity/config \
    -H 'Content-Type: application/json' \
    -d "{\"autoStartEnabled\": $enabled}" | jq '.config.autoStartEnabled'
}

# ============================================================
# TESTING
# ============================================================

# Run full test suite
test-all() {
  echo "Running full test suite..."
  node scripts/test-ui-activity-monitor.js
}

# Quick sanity check
quick-check() {
  echo "=== Quick Sanity Check ==="
  echo ""
  echo "✓ Monitor Health:"
  curl -s http://127.0.0.1:3050/health | jq . 2>/dev/null || echo "  ❌ Monitor not responding"
  echo ""
  echo "✓ Active Sessions:"
  curl -s http://127.0.0.1:3000/api/v1/activity/sessions | jq '.activeSessions' 2>/dev/null || echo "  ❌ No sessions"
  echo ""
  echo "✓ Active Servers:"
  curl -s http://127.0.0.1:3000/api/v1/activity/servers | jq '{active: .activeServers, total: .totalServers}' 2>/dev/null || echo "  ❌ No server info"
  echo ""
  echo "✓ Real Data Mode:"
  curl -s http://127.0.0.1:3000/api/v1/activity/ensure-real-data | jq '.realDataMode' 2>/dev/null || echo "  ❌ No data"
}

# ============================================================
# LOGS & DEBUGGING
# ============================================================

# Watch all server logs
watch-logs() {
  echo "Watching all logs (Ctrl+C to stop)..."
  tail -f /tmp/tooloo-*.log
}

# Check orchestrator status
orch-status() {
  curl -s http://127.0.0.1:3123/api/v1/system/processes | jq .
}

# ============================================================
# BROWSER CONSOLE HELPERS
# ============================================================

# Print JavaScript to run in browser console
browser-commands() {
  cat << 'EOF'

=== Run these in browser console (F12 Developer Tools) ===

// Check your session ID
window.tooloo.sessionId

// Check heartbeat count
window.tooloo.heartbeatCount()

// Check last activity
window.tooloo.lastActivity()

// Check server health
fetch('/api/v1/activity/servers').then(r => r.json()).then(d => console.log(d))

// Check active sessions
fetch('/api/v1/activity/sessions').then(r => r.json()).then(d => console.log(d))

EOF
}

# ============================================================
# TROUBLESHOOTING
# ============================================================

# Find services using network ports
check-ports() {
  echo "Checking TooLoo service ports..."
  for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3050 3123; do
    service=$(lsof -i :$port -n -P | grep -v COMMAND | awk '{print $1}' | head -1)
    if [ -n "$service" ]; then
      echo "  Port $port: ✓ Active"
    else
      echo "  Port $port: ✗ Free"
    fi
  done
}

# Kill all TooLoo processes
kill-all() {
  echo "Killing all TooLoo processes..."
  pkill -f "node servers/" || true
  pkill -f "npm run" || true
  sleep 1
  echo "Done. Run 'npm run dev' to restart."
}

# ============================================================
# EXAMPLE WORKFLOWS
# ============================================================

# Scenario 1: Start fresh and test
scenario-fresh-start() {
  echo "📋 Scenario: Fresh Start"
  echo ""
  echo "1. Kill any existing processes..."
  kill-all
  echo ""
  echo "2. Start the system..."
  npm run dev &
  sleep 3
  echo ""
  echo "3. Quick sanity check..."
  quick-check
  echo ""
  echo "4. Run test suite..."
  test-all
}

# Scenario 2: Debug real data issues
scenario-debug-data() {
  echo "📋 Scenario: Debug Real Data"
  echo ""
  echo "1. Check providers..."
  providers
  echo ""
  echo "2. Check budget..."
  budget
  echo ""
  echo "3. Force real data..."
  ensure-real-data
  echo ""
  echo "4. Check sessions..."
  sessions
}

# Scenario 3: Monitor production
scenario-monitor() {
  echo "📋 Scenario: Monitor Production"
  echo ""
  echo "1. Sessions:"
  watch-sessions
}

# ============================================================
# INSTALLATION & SETUP
# ============================================================

# Verify all components are installed
verify-setup() {
  echo "Verifying setup..."
  echo ""
  
  echo "✓ Checking files exist:"
  test -f servers/ui-activity-monitor.js && echo "  ✓ Activity Monitor" || echo "  ✗ Activity Monitor MISSING"
  test -f web-app/js/tooloo-heartbeat.js && echo "  ✓ Heartbeat Script" || echo "  ✗ Heartbeat Script MISSING"
  test -f scripts/test-ui-activity-monitor.js && echo "  ✓ Test Suite" || echo "  ✗ Test Suite MISSING"
  test -f docs/UI-ACTIVE-SERVER-MANAGEMENT.md && echo "  ✓ Documentation" || echo "  ✗ Documentation MISSING"
  echo ""
  
  echo "✓ Checking syntax:"
  node -c servers/ui-activity-monitor.js 2>/dev/null && echo "  ✓ Activity Monitor" || echo "  ✗ Activity Monitor"
  node -c web-app/js/tooloo-heartbeat.js 2>/dev/null && echo "  ✓ Heartbeat Script" || echo "  ✗ Heartbeat Script"
  echo ""
  
  echo "Setup verification complete!"
}

# ============================================================
# HELP
# ============================================================

help() {
  cat << 'EOF'

╔═══════════════════════════════════════════════════════════╗
║  TooLoo UI Activity Monitor - Command Reference           ║
╚═══════════════════════════════════════════════════════════╝

STARTUP:
  start-tooloo              Start everything (npm run dev)

MONITORING:
  sessions                  List active sessions
  watch-sessions            Watch sessions in real-time
  servers                   List all servers & health
  watch-servers             Watch servers in real-time
  quick-check               Quick sanity check

PROVIDERS & DATA:
  providers                 Check provider status
  budget                    Check remaining budget
  ensure-real-data          Activate real data mode
  start-all-services        Force start all services

CONFIGURATION:
  enable-real-data          Enable real data mode
  disable-real-data         Disable real data mode
  set-min-servers N         Set minimum active servers
  set-auto-start T/F        Enable/disable auto-start

TESTING:
  test-all                  Run full test suite
  verify-setup              Verify all components

TROUBLESHOOTING:
  check-monitor             Check monitor health
  check-ports               Check which ports are active
  kill-all                  Kill all TooLoo processes

SCENARIOS:
  scenario-fresh-start      Full fresh start & test
  scenario-debug-data       Debug real data issues
  scenario-monitor          Monitor production

OTHER:
  browser-commands          Show browser console helpers
  help                      Show this help

EXAMPLES:

  # Complete setup
  start-tooloo
  sleep 5
  quick-check

  # Monitor everything
  watch-sessions

  # Debug real data
  scenario-debug-data

  # Run tests
  test-all

EOF
}

# Auto-run help if sourced directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
  help
fi
