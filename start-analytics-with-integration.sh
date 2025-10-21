#!/bin/bash
# start-analytics-with-integration.sh
# 
# Deploys analytics system integrated with training and coach servers
# Usage: ./start-analytics-with-integration.sh [dev|prod]

set -e

MODE="${1:-dev}"
ANALYTICS_PORT="${ANALYTICS_PORT:-3012}"
TRAINING_PORT="${TRAINING_PORT:-3001}"
COACH_PORT="${COACH_PORT:-3004}"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║      Phase 6CDE: Analytics Deployment with Integration       ║"
echo "║                                                               ║"
echo "║  Mode: $MODE"
echo "║  Analytics: 0.0.0.0:$ANALYTICS_PORT"
echo "║  Training: 0.0.0.0:$TRAINING_PORT"
echo "║  Coach: 0.0.0.0:$COACH_PORT"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Export environment
export ANALYTICS_PORT=$ANALYTICS_PORT
export TRAINING_PORT=$TRAINING_PORT
export COACH_PORT=$COACH_PORT
export ANALYTICS_ENABLED=true

if [ "$MODE" = "prod" ]; then
  export NODE_ENV=production
  export DEBUG=""
  echo "✓ Production mode enabled"
else
  export NODE_ENV=development
  export DEBUG="analytics:*"
  echo "✓ Development mode enabled (debug logging on)"
fi

echo ""
echo "📊 Starting Analytics System..."
echo ""

# Function to check if port is listening
check_port() {
  nc -z 127.0.0.1 $1 2>/dev/null && return 0 || return 1
}

# Function to wait for service
wait_service() {
  local name=$1
  local port=$2
  local max_attempts=30
  local attempt=0
  
  echo -n "  ⏳ Waiting for $name on port $port..."
  while [ $attempt -lt $max_attempts ]; do
    if check_port $port; then
      echo " ✅"
      return 0
    fi
    echo -n "."
    sleep 1
    ((attempt++))
  done
  echo " ❌ Timeout"
  return 1
}

# Kill existing processes if running in dev mode
if [ "$MODE" = "dev" ]; then
  echo "🧹 Cleaning up existing processes..."
  pkill -f "node servers/analytics-server.js" || true
  sleep 1
fi

# Start analytics server
echo "  📈 Starting analytics-server..."
node servers/analytics-server.js > analytics-server.log 2>&1 &
ANALYTICS_PID=$!
echo "     PID: $ANALYTICS_PID"

# Wait for analytics to be ready
if ! wait_service "analytics" $ANALYTICS_PORT; then
  echo ""
  echo "❌ Analytics server failed to start"
  echo "   See analytics-server.log for details"
  tail -20 analytics-server.log
  exit 1
fi

# Verify training server is running
echo ""
echo "🔗 Verifying integrations..."
if check_port $TRAINING_PORT; then
  echo "  ✅ Training server detected on port $TRAINING_PORT"
else
  echo "  ⚠️  Training server not found on port $TRAINING_PORT"
  echo "     (Start separately or use orchestrator)"
fi

if check_port $COACH_PORT; then
  echo "  ✅ Coach server detected on port $COACH_PORT"
else
  echo "  ⚠️  Coach server not found on port $COACH_PORT"
  echo "     (Start separately or use orchestrator)"
fi

echo ""
echo "✨ Health checks..."
echo ""

# Test analytics health
echo -n "  📊 Analytics health: "
if curl -s http://127.0.0.1:$ANALYTICS_PORT/health | grep -q '"ok":true'; then
  echo "✅"
else
  echo "❌"
  exit 1
fi

echo ""
echo "🎯 Next steps:"
echo ""
echo "  1. Analytics server running on http://127.0.0.1:$ANALYTICS_PORT"
echo ""
echo "  2. Test analytics endpoints:"
echo "     curl http://127.0.0.1:$ANALYTICS_PORT/api/v1/analytics/velocity-enhanced?domain=consensus"
echo ""
echo "  3. Record a milestone:"
echo "     curl -X POST http://127.0.0.1:$ANALYTICS_PORT/api/v1/analytics/milestone \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"userId\":\"user1\",\"challengeId\":\"ch1\",\"score\":85,\"domain\":\"consensus\"}'"
echo ""
echo "  4. Run test suite:"
echo "     node test-analytics-6cde.js"
echo ""
echo "  5. View logs:"
echo "     tail -f analytics-server.log"
echo ""

# Keep script running in interactive mode
if [ -t 0 ]; then
  echo "Press Ctrl+C to stop analytics server"
  wait $ANALYTICS_PID
else
  # In background mode, just report success
  echo "Analytics server started in background (PID: $ANALYTICS_PID)"
  echo ""
  echo "📚 For full deployment with orchestration, run:"
  echo "   npm run dev"
  echo ""
fi
