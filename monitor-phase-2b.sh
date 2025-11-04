#!/bin/bash

# Phase 2B Production Monitoring Dashboard
# Real-time metrics and performance tracking for 24-hour validation

set -e

META_SERVER="http://127.0.0.1:3002"
UPDATE_INTERVAL=30  # seconds
LOGFILE="/tmp/phase2b-monitoring.log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Initialize log
echo "Phase 2B Monitoring Started: $(date)" > "$LOGFILE"

# Function to print header
print_header() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   PHASE 2B PRODUCTION MONITORING DASHBOARD                   ║${NC}"
    echo -e "${CYAN}║   Live Validation: Nov 9-10, 2025                            ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# Function to format metric with color
format_metric() {
    local metric=$1
    local value=$2
    local threshold_low=${3:-0.50}
    local threshold_high=${4:-0.85}
    
    if (( $(echo "$value < $threshold_low" | bc -l) )); then
        echo -e "${RED}$metric: $value${NC} ⚠️"
    elif (( $(echo "$value < $threshold_high" | bc -l) )); then
        echo -e "${YELLOW}$metric: $value${NC}"
    else
        echo -e "${GREEN}$metric: $value${NC} ✓"
    fi
}

# Function to get current status
get_status() {
    print_header
    
    # System Health
    echo -e "${BLUE}━━ SYSTEM HEALTH ━━${NC}"
    HEALTH=$(curl -s "$META_SERVER/health" 2>/dev/null || echo "{}")
    STATUS=$(echo "$HEALTH" | jq '.ok' 2>/dev/null || echo "null")
    
    if [ "$STATUS" = "true" ]; then
        echo -e "${GREEN}✓ Meta-server: Online${NC}"
    else
        echo -e "${RED}✗ Meta-server: Offline${NC}"
        return 1
    fi
    
    TIME=$(echo "$HEALTH" | jq -r '.time' 2>/dev/null || echo "?")
    echo "  Time: $TIME"
    echo
    
    # Current Metrics
    echo -e "${BLUE}━━ CURRENT METRICS ━━${NC}"
    METRICS=$(curl -s "$META_SERVER/api/v4/meta-learning/status" 2>/dev/null | jq '.status.metrics.current' 2>/dev/null || echo "{}")
    
    LV=$(echo "$METRICS" | jq '.learningVelocity // 0' 2>/dev/null)
    AS=$(echo "$METRICS" | jq '.adaptationSpeed // 0' 2>/dev/null)
    KR=$(echo "$METRICS" | jq '.knowledgeRetention // 0' 2>/dev/null)
    TE=$(echo "$METRICS" | jq '.transferEfficiency // 0' 2>/dev/null)
    
    echo "$(format_metric 'Learning Velocity' "$LV' 0.50 0.85)"
    echo "$(format_metric 'Adaptation Speed' "$AS' 0.50 0.85)"
    echo "$(format_metric 'Knowledge Retention' "$KR' 0.50 0.85)"
    echo "$(format_metric 'Transfer Efficiency' "$TE' 0.50 0.85)"
    echo
    
    # Plateau & Strategy Status
    echo -e "${BLUE}━━ PLATEAU & STRATEGIES ━━${NC}"
    ANALYSIS=$(curl -s "$META_SERVER/api/v4/meta-learning/strategy-analysis" 2>/dev/null || echo "{}")
    
    if [ "$(echo "$ANALYSIS" | jq 'keys | length')" -gt 0 ]; then
        echo -e "${GREEN}✓ Strategy Analysis Available${NC}"
        
        # Show recommended strategies
        LV_STRAT=$(echo "$ANALYSIS" | jq -r '.learningVelocity.recommended_strategy // "N/A"' 2>/dev/null)
        AS_STRAT=$(echo "$ANALYSIS" | jq -r '.adaptationSpeed.recommended_strategy // "N/A"' 2>/dev/null)
        KR_STRAT=$(echo "$ANALYSIS" | jq -r '.knowledgeRetention.recommended_strategy // "N/A"' 2>/dev/null)
        TE_STRAT=$(echo "$ANALYSIS" | jq -r '.transferEfficiency.recommended_strategy // "N/A"' 2>/dev/null)
        
        echo "  Recommended for LV: $LV_STRAT"
        echo "  Recommended for AS: $AS_STRAT"
        echo "  Recommended for KR: $KR_STRAT"
        echo "  Recommended for TE: $TE_STRAT"
    else
        echo -e "${YELLOW}⚠ Strategy Analysis Not Available${NC}"
    fi
    echo
    
    # Effectiveness Tracking
    echo -e "${BLUE}━━ EFFECTIVENESS TRACKING ━━${NC}"
    EFFECTIVENESS=$(curl -s "$META_SERVER/api/v4/meta-learning/strategy-effectiveness" 2>/dev/null || echo "{}")
    STRAT_COUNT=$(echo "$EFFECTIVENESS" | jq 'keys | length' 2>/dev/null || echo "0")
    
    if [ "$STRAT_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ Strategies Applied: $STRAT_COUNT${NC}"
        echo "$EFFECTIVENESS" | jq 'to_entries[] | "\(.key): \(.value.count) uses"' 2>/dev/null | head -n 5
    else
        echo -e "${YELLOW}⚠ No strategies applied yet${NC}"
    fi
    echo
    
    # Performance Summary
    echo -e "${BLUE}━━ PERFORMANCE SUMMARY ━━${NC}"
    AVG=$(echo "scale=4; ($LV + $AS + $KR + $TE) / 4" | bc 2>/dev/null || echo "?")
    echo "  Average Metric Value: $AVG"
    
    # Estimate improvement over baseline
    BASELINE=0.80
    IMPROVEMENT=$(echo "scale=2; (($AVG - $BASELINE) / $BASELINE) * 100" | bc 2>/dev/null || echo "?")
    echo "  Improvement vs Baseline (+5%): $IMPROVEMENT%"
    
    # Target check
    TARGET_LOW=0.20  # 20% improvement
    TARGET_HIGH=0.25 # 25% improvement
    
    if (( $(echo "$IMPROVEMENT > $TARGET_HIGH" | bc -l) )); then
        echo -e "  Status: ${GREEN}✓ EXCEEDS TARGET (+$IMPROVEMENT%)${NC}"
    elif (( $(echo "$IMPROVEMENT > $TARGET_LOW" | bc -l) )); then
        echo -e "  Status: ${GREEN}✓ MEETS TARGET (+$IMPROVEMENT%)${NC}"
    else
        echo -e "  Status: ${YELLOW}⚠ BELOW TARGET (+$IMPROVEMENT%)${NC}"
    fi
    echo
    
    # Monitoring Info
    echo -e "${BLUE}━━ MONITORING INFO ━━${NC}"
    echo "  Update Interval: ${UPDATE_INTERVAL}s"
    echo "  Next Update: $(date -d "+${UPDATE_INTERVAL}s" '+%H:%M:%S')"
    echo "  Log File: $LOGFILE"
    echo
    
    # Instructions
    echo -e "${CYAN}Commands:${NC}"
    echo "  q = Quit | r = Refresh | l = Show logs"
    
    # Log status
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Metrics: LV=$LV, AS=$AS, KR=$KR, TE=$TE, Avg=$AVG, Improvement=$IMPROVEMENT%" >> "$LOGFILE"
}

# Main loop
main() {
    while true; do
        get_status
        
        # Wait for input (with timeout)
        read -t $UPDATE_INTERVAL -n 1 input
        
        case $input in
            q|Q)
                echo -e "${CYAN}Monitoring stopped.${NC}"
                exit 0
                ;;
            r|R)
                continue
                ;;
            l|L)
                echo -e "${CYAN}Recent logs:${NC}"
                tail -n 20 "$LOGFILE"
                read -p "Press Enter to continue..."
                ;;
            *)
                continue
                ;;
        esac
    done
}

# Start monitoring
main
