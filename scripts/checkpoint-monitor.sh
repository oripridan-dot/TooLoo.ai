#!/bin/bash

# Automated Checkpoint Monitoring Service
# Runs Checkpoints 5-7 at scheduled times (Nov 18-19)
# This script should run continuously in the background

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="/tmp/checkpoint-monitoring"
RESULTS_FILE="$PROJECT_DIR/.checkpoint-results.json"

# Create log directory
mkdir -p "$LOG_DIR"

# Checkpoint schedule (in 24-hour format, UTC)
declare -A CHECKPOINTS=(
    [5]="2025-11-18 00:30"
    [6]="2025-11-18 08:30"
    [7]="2025-11-19 12:30"
)

# Utility functions
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/monitor.log"
}

log_checkpoint() {
    local cp_num=$1
    local timestamp=$2
    local status=$3
    local pass_rate=$4
    
    echo "[$cp_num] $timestamp | Status: $status | Pass Rate: $pass_rate" >> "$LOG_DIR/checkpoint_history.log"
}

ensure_webserver() {
    log "Checking web-server status..."
    if curl -s -m 2 http://127.0.0.1:3000/health > /dev/null 2>&1; then
        log "✅ Web-server is running"
        return 0
    else
        log "⏳ Starting web-server..."
        cd "$PROJECT_DIR" && node servers/web-server.js > "$LOG_DIR/web-server.log" 2>&1 &
        sleep 3
        return 0
    fi
}

run_checkpoint() {
    local cp_num=$1
    local checkpoint_log="$LOG_DIR/checkpoint-$cp_num.log"
    
    log "=== Running Checkpoint $cp_num ==="
    
    ensure_webserver
    
    cd "$PROJECT_DIR"
    output=$(node scripts/checkpoint-monitor.js "$cp_num" 2>&1 | tee "$checkpoint_log")
    
    # Parse results
    if echo "$output" | grep -q "✅ PASSED"; then
        status="PASSED"
        pass_rate=$(echo "$output" | grep "Pass Rate:" | grep -oP '\d+(?=%)')
    else
        status="FAILED"
        pass_rate=$(echo "$output" | grep "Pass Rate:" | grep -oP '\d+(?=%)')
    fi
    
    log_checkpoint "$cp_num" "$(date +'%Y-%m-%d %H:%M:%S')" "$status" "$pass_rate%"
    log "Checkpoint $cp_num: $status ($pass_rate%)"
    
    return 0
}

check_schedule() {
    local current_time=$(date -u +'%Y-%m-%d %H:%M')
    
    for cp_num in "${!CHECKPOINTS[@]}"; do
        scheduled_time="${CHECKPOINTS[$cp_num]}"
        
        # Check if scheduled time matches (within 2 minute window)
        if [[ "$current_time" == "$scheduled_time" ]]; then
            run_checkpoint "$cp_num"
        elif [[ "$current_time" > "$scheduled_time" ]]; then
            # Check if already run today
            if ! grep -q "\[$cp_num\] $(date -u +'%Y-%m-%d')" "$LOG_DIR/checkpoint_history.log" 2>/dev/null; then
                # Run if we're within 10 minutes of scheduled time
                scheduled_epoch=$(date -d "$scheduled_time" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M" "$scheduled_time" +%s)
                current_epoch=$(date -u +%s)
                diff=$((current_epoch - scheduled_epoch))
                
                if [ $diff -ge 0 ] && [ $diff -lt 600 ]; then
                    run_checkpoint "$cp_num"
                fi
            fi
        fi
    done
}

# Main monitoring loop
log "🚀 Automated Checkpoint Monitoring Service Started"
log "Monitoring Checkpoints 5-7 (Nov 18-19, 2025)"
log "Checkpoint Schedule:"
log "  5: 2025-11-18 00:30 UTC"
log "  6: 2025-11-18 08:30 UTC"
log "  7: 2025-11-19 12:30 UTC"

# Run indefinitely, checking every minute
while true; do
    check_schedule
    sleep 60
done
