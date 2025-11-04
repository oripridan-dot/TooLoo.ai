#!/bin/bash

################################################################################
# TooLoo.ai - Meta-Learning Production Monitoring Dashboard
# Continuous monitoring of meta-learning system
# Usage: ./monitoring-dashboard.sh [watch-interval-seconds]
################################################################################

INTERVAL=${1:-10}
MONITOR_LOG="/tmp/meta-learning-monitor.log"
ALERTS_LOG="/tmp/meta-learning-alerts.log"
BASELINE_FILE="/tmp/meta-learning-baseline.json"
HISTORY_FILE="/tmp/meta-learning-history.jsonl"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# Initialize monitoring
################################################################################

init_monitoring() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 META-LEARNING PRODUCTION MONITORING STARTED" | tee -a "$MONITOR_LOG"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Interval: ${INTERVAL}s | Log: $MONITOR_LOG | Alerts: $ALERTS_LOG" | tee -a "$MONITOR_LOG"
  echo "[]" > "$HISTORY_FILE"
}

################################################################################
# Fetch current dashboard
################################################################################

fetch_dashboard() {
  curl -s http://127.0.0.1:3002/api/v4/meta-learning/production-dashboard 2>/dev/null || echo "{\"error\":\"connection_failed\"}"
}

################################################################################
# Fetch continuous status
################################################################################

fetch_status() {
  curl -s http://127.0.0.1:3002/api/v4/meta-learning/continuous-status 2>/dev/null || echo "{\"error\":\"connection_failed\"}"
}

################################################################################
# Fetch alerts
################################################################################

fetch_alerts() {
  curl -s http://127.0.0.1:3002/api/v4/meta-learning/alerts 2>/dev/null || echo "{\"alerts\":[]}"
}

################################################################################
# Fetch metrics trend
################################################################################

fetch_trend() {
  curl -s http://127.0.0.1:3002/api/v4/meta-learning/metrics-trend?limit=10 2>/dev/null || echo "{\"improvements\":[]}"
}

################################################################################
# Store baseline on first run
################################################################################

store_baseline() {
  if [ ! -f "$BASELINE_FILE" ]; then
    fetch_dashboard > "$BASELINE_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Baseline stored" | tee -a "$MONITOR_LOG"
  fi
}

################################################################################
# Format metrics for display
################################################################################

format_metric() {
  local name="$1"
  local value="$2"
  local format=$(printf "%-25s: %.4f" "$name" "$value")
  
  # Color code based on value
  if (( $(echo "$value >= 0.9" | bc -l) )); then
    echo -e "${GREEN}$format${NC}"
  elif (( $(echo "$value >= 0.7" | bc -l) )); then
    echo -e "${BLUE}$format${NC}"
  elif (( $(echo "$value >= 0.5" | bc -l) )); then
    echo -e "${YELLOW}$format${NC}"
  else
    echo -e "${RED}$format${NC}"
  fi
}

################################################################################
# Display dashboard
################################################################################

display_dashboard() {
  local dashboard=$(fetch_dashboard)
  local status=$(fetch_status)
  local alerts=$(fetch_alerts)
  local trend=$(fetch_trend)
  
  clear
  
  # Header
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║   TooLoo.ai - Meta-Learning Production Dashboard               ║${NC}"
  echo -e "${BLUE}║   $(date '+%Y-%m-%d %H:%M:%S')                                    ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  # System Status
  echo -e "${BLUE}📊 SYSTEM STATUS${NC}"
  local continuous=$(echo "$status" | jq -r '.continuousActive // "unknown"')
  local timestamp=$(echo "$status" | jq -r '.timestamp // "unknown"')
  
  if [ "$continuous" = "true" ]; then
    echo -e "  Continuous Cycles: ${GREEN}✓ ACTIVE${NC}"
  else
    echo -e "  Continuous Cycles: ${RED}✗ INACTIVE${NC}"
  fi
  echo "  Last Update: $timestamp"
  echo ""
  
  # Current Metrics
  echo -e "${BLUE}📈 CURRENT METRICS${NC}"
  local metrics=$(echo "$dashboard" | jq '.performance.currentMetrics // {}')
  echo "$metrics" | jq -r 'to_entries[] | .key' | while read metric; do
    local value=$(echo "$metrics" | jq ".\"$metric\"")
    format_metric "$metric" "$value"
  done
  echo ""
  
  # Performance Summary
  echo -e "${BLUE}🎯 PERFORMANCE SUMMARY${NC}"
  local avg_velocity=$(echo "$dashboard" | jq '.performance.recentVelocity // 0')
  local baseline=$(echo "$dashboard" | jq '.performance.baselineMetrics | values | length')
  
  printf "%-25s: %.4f\n" "Average Velocity" "$avg_velocity"
  printf "%-25s: %s\n" "Baseline Metrics" "$baseline"
  echo ""
  
  # Phase Status
  echo -e "${BLUE}🔄 PHASE STATUS${NC}"
  echo "$dashboard" | jq '.phases[] | "\(.name): \(.status)"' -r | while read phase; do
    if [[ "$phase" == *"completed"* ]]; then
      echo -e "  ${GREEN}✓${NC} $phase"
    elif [[ "$phase" == *"in-progress"* ]]; then
      echo -e "  ${BLUE}⟳${NC} $phase"
    else
      echo -e "  ${YELLOW}○${NC} $phase"
    fi
  done
  echo ""
  
  # Recent Improvements
  echo -e "${BLUE}📊 RECENT IMPROVEMENTS (Last 5)${NC}"
  echo "$trend" | jq '.improvements[-5:] | reverse[] | "\(.timestamp): \(.phase) → \(.metric):\(.delta)"' -r 2>/dev/null | while read imp; do
    if [ ! -z "$imp" ]; then
      echo "  • $imp"
    fi
  done
  echo ""
  
  # Alerts
  echo -e "${BLUE}⚠️  ALERTS${NC}"
  local alert_count=$(echo "$alerts" | jq '.alerts | length // 0')
  if [ "$alert_count" -gt 0 ]; then
    echo "$alerts" | jq '.alerts[] | "\(.severity): \(.message)"' -r | while read alert; do
      if [[ "$alert" == *"CRITICAL"* ]]; then
        echo -e "  ${RED}⛔${NC} $alert"
      elif [[ "$alert" == *"WARNING"* ]]; then
        echo -e "  ${YELLOW}⚠️${NC} $alert"
      else
        echo -e "  ${BLUE}ℹ️${NC} $alert"
      fi
    done
  else
    echo -e "  ${GREEN}✓ No alerts${NC}"
  fi
  echo ""
  
  # Health Check
  echo -e "${BLUE}🏥 HEALTH CHECK${NC}"
  local health=$(echo "$dashboard" | jq '.health // {}')
  echo "$health" | jq -r 'to_entries[] | "\(.key): \(.value)"' | while read check; do
    if [[ "$check" == *"true"* ]]; then
      echo -e "  ${GREEN}✓${NC} $check"
    else
      echo -e "  ${RED}✗${NC} $check"
    fi
  done
  echo ""
  
  # Footer
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo "Refreshing every ${INTERVAL}s... (Press Ctrl+C to stop)"
  echo "View logs: tail -f $MONITOR_LOG"
  echo "View alerts: tail -f $ALERTS_LOG"
}

################################################################################
# Check for anomalies
################################################################################

check_anomalies() {
  local dashboard=$(fetch_dashboard)
  local alerts=$(fetch_alerts)
  local alert_count=$(echo "$alerts" | jq '.alerts | length // 0')
  
  if [ "$alert_count" -gt 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  ALERTS DETECTED: $alert_count" >> "$ALERTS_LOG"
    echo "$alerts" | jq '.alerts[] | "  - \(.severity): \(.message)"' -r >> "$ALERTS_LOG"
  fi
}

################################################################################
# Main loop
################################################################################

main() {
  init_monitoring
  store_baseline
  
  while true; do
    display_dashboard
    check_anomalies
    sleep "$INTERVAL"
  done
}

# Run main function
main "$@"
