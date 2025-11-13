#!/bin/bash
# TooLoo.ai Smart Server Manager
# Starts all required servers in proper sequence
# Usage: bash start-servers.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOG_DIR=".tooloo-logs"
mkdir -p "$LOG_DIR"

echo "🚀 TooLoo.ai Smart Server Manager"
echo "=================================="
echo ""

# Define servers to start (port, name, file)
declare -a SERVERS=(
  "3000:web-server:servers/web-server.js"
  "3001:training-server:servers/training-server.js"
  "3002:meta-server:servers/meta-server.js"
  "3003:budget-server:servers/budget-server.js"
  "3004:coach-server:servers/coach-server.js"
  "3005:cup-server:servers/cup-server.js"
  "3006:product-development-server:servers/product-development-server.js"
  "3007:segmentation-server:servers/segmentation-server.js"
  "3008:reports-server:servers/reports-server.js"
  "3009:capabilities-server:servers/capabilities-server.js"
)

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node servers/" || true
sleep 1

# Function to wait for port to be ready
wait_for_port() {
  port=$1
  name=$2
  max_attempts=20
  attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    if timeout 2 curl -s http://127.0.0.1:$port/health > /dev/null 2>&1; then
      echo "✅ $name (port $port) is ready"
      return 0
    fi
    
    if [ $((attempt % 5)) -eq 0 ]; then
      echo "  ⏳ Waiting for $name (port $port)... (attempt $attempt/$max_attempts)"
    fi
    
    sleep 1
    attempt=$((attempt + 1))
  done
  
  echo "⚠️  $name (port $port) - timeout (might still be starting)"
  return 1
}

# Start servers
echo ""
echo "🎯 Starting servers in sequence..."
echo ""

started_count=0

for server_spec in "${SERVERS[@]}"; do
  IFS=':' read -r port name file <<< "$server_spec"
  
  if [ ! -f "$file" ]; then
    echo "⚠️  Skipping $name – file not found: $file"
    continue
  fi
  
  echo "📍 Starting $name (port $port)..."
  
  # Start server in background
  nohup node "$file" > "$LOG_DIR/$name.log" 2>&1 &
  pid=$!
  
  echo "   PID: $pid"
  
  # Wait for it to be ready
  if wait_for_port $port "$name"; then
    started_count=$((started_count + 1))
    echo ""
  else
    echo ""
  fi
done

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   🎉 STARTUP COMPLETE! 🎉                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "📊 Service Status:"
echo "  🏠 Web Server        → http://127.0.0.1:3000"
echo "  🎓 Training Server   → http://127.0.0.1:3001"
echo "  🧠 Meta Server       → http://127.0.0.1:3002"
echo "  💰 Budget Server     → http://127.0.0.1:3003"
echo "  🏆 Coach Server      → http://127.0.0.1:3004"
echo "  🏅 Cup Server        → http://127.0.0.1:3005"
echo "  🎨 Product Dev       → http://127.0.0.1:3006"
echo "  📊 Segmentation      → http://127.0.0.1:3007"
echo "  📈 Reports Server    → http://127.0.0.1:3008"
echo "  🔧 Capabilities      → http://127.0.0.1:3009"
echo ""

echo "🔗 Primary Access Points:"
echo "  🏠 Hub              → http://127.0.0.1:3000/"
echo "  🎛️  Control Room    → http://127.0.0.1:3000/control-room"
echo "  💬 Enhanced Chat    → http://127.0.0.1:3000/web-app/tooloo-chat-enhanced.html"
echo "  🏟️  Arena           → http://127.0.0.1:3000/providers-arena.html"
echo ""

echo "📋 Logs Location:"
echo "  $LOG_DIR/"
echo ""

echo "✅ All $started_count servers started successfully!"
echo "⏸️  Press Ctrl+C to stop, or run: pkill -f 'node servers/'"
echo ""

# Keep the script running to show output
trap 'echo "🛑 Shutting down..."; pkill -f "node servers/" || true; exit 0' SIGINT SIGTERM

# Monitor heartbeat
while true; do
  sleep 30
  running=$(ps aux | grep -c "node servers/" || true)
  running=$((running - 1))  # Subtract this script itself
  echo "[$(date '+%H:%M:%S')] 💓 Heartbeat – $running servers running"
done
