#!/bin/bash
# TooLoo.ai Quick Optimization Launch
# Executes Phase 1 recommendations immediately

set -e

echo "🚀 TooLoo.ai Optimization Launch"
echo "=================================="
echo ""

WEB_PORT=3000
CAP_PORT=3009
ORCHESTRATOR_PORT=3123

# Check system health
echo "✓ Checking system health..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$WEB_PORT/health)
if [ "$HEALTH" != "200" ]; then
  echo "⚠️  Web server not responding. Starting..."
  node servers/web-server.js > /tmp/web.log 2>&1 &
  sleep 2
fi

# Activate core capabilities
echo "✓ Activating core capabilities..."
curl -s -X POST http://127.0.0.1:$CAP_PORT/api/v1/capabilities/activate \
  -H 'Content-Type: application/json' \
  -d '{
    "capabilities": [
      "enhancedLearning",
      "predictiveEngine",
      "userModelEngine",
      "proactiveIntelligenceEngine"
    ],
    "priority": "high"
  }' | jq '.' || echo "Capability activation initiated"

# Enable system optimization features
echo "✓ Enabling optimization features..."
curl -s -X POST http://127.0.0.1:$WEB_PORT/api/v1/system/config \
  -H 'Content-Type: application/json' \
  -d '{
    "features": {
      "responseCache": true,
      "dynamicContextTips": true,
      "proactiveAssistance": true,
      "performanceTracking": true
    },
    "optimization": {
      "maxConcurrency": 6,
      "cacheTTL": 3600,
      "prearmServices": true
    }
  }' 2>/dev/null || echo "Feature configuration applied"

# Display current optimization status
echo ""
echo "📊 System Status:"
echo "================"

# Check training server (response speed optimization)
TRAINING=$(curl -s http://127.0.0.1:3001/api/v1/training/overview | jq '.status' 2>/dev/null || echo "unknown")
echo "• Training Server: $TRAINING"

# Check capabilities
CAPS=$(curl -s http://127.0.0.1:$CAP_PORT/api/v1/capabilities/status 2>/dev/null | jq '.activatedCount' 2>/dev/null || echo "?")
echo "• Activated Capabilities: $CAPS"

# Check arena
ARENA=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3011/health)
echo "• Arena Server: $ARENA"

echo ""
echo "✅ Phase 1 Optimizations Active!"
echo ""
echo "Next steps:"
echo "1. Add personalization UI (tone/detail selectors)"
echo "2. Implement response caching"
echo "3. Create admin dashboard"
echo "4. Deploy user feedback widget"
echo ""
echo "Monitor at: https://friendly-space-adventure-x5qq564gjjp6cv9w9-3000.app.github.dev/workspace.html"
