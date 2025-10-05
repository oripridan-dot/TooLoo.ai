#!/bin/bash

# TooLoo.ai Server Keepalive Script
# Monitors and restarts servers if they crash

LOG_FILE="/workspaces/TooLoo.ai/logs/keepalive.log"
CHECK_INTERVAL=30  # Check every 30 seconds

echo "🛡️  TooLoo.ai Keepalive Monitor Started" | tee -a "$LOG_FILE"
echo "   Checking every ${CHECK_INTERVAL} seconds" | tee -a "$LOG_FILE"
echo "   Press Ctrl+C to stop monitoring" | tee -a "$LOG_FILE"
echo ""

# Function to check and restart API server
check_api_server() {
    if ! curl -s http://localhost:3005/api/v1/health > /dev/null 2>&1; then
        echo "$(date): ⚠️  API server not responding - restarting..." | tee -a "$LOG_FILE"
        pkill -f "node simple-api-server.js" 2>/dev/null
        sleep 2
        cd /workspaces/TooLoo.ai
        PORT=3005 node simple-api-server.js > logs/api.log 2>&1 &
        echo "$(date): ✅ API server restarted (PID: $!)" | tee -a "$LOG_FILE"
        sleep 3
    fi
}

# Function to check and restart Vite server
check_vite_server() {
    if ! curl -s http://localhost:5173 > /dev/null 2>&1 && ! curl -s http://localhost:5174 > /dev/null 2>&1; then
        echo "$(date): ⚠️  Vite server not responding - restarting..." | tee -a "$LOG_FILE"
        pkill -f "vite" 2>/dev/null
        sleep 2
        cd /workspaces/TooLoo.ai/web-app
        npm run dev > ../logs/web.log 2>&1 &
        echo "$(date): ✅ Vite server restarted (PID: $!)" | tee -a "$LOG_FILE"
        sleep 3
    fi
}

# Main monitoring loop
while true; do
    check_api_server
    check_vite_server
    sleep $CHECK_INTERVAL
done
