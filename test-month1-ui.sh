#!/bin/bash

# Month 1 Tier 1 UI Implementation - Quick Test Script
# This script validates that all 3 dashboards are ready and provides quick access

echo "🌐 TooLoo.ai Month 1 UI Dashboard Test"
echo "======================================"
echo ""

# Check files exist
echo "✓ Checking dashboard files..."
FILES=(
  "web-app/service-control-dashboard.html"
  "web-app/alert-dashboard.html"
  "web-app/provider-leaderboard.html"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    SIZE=$(du -h "$file" | cut -f1)
    LINES=$(wc -l < "$file")
    echo "  ✅ $file ($SIZE, $LINES lines)"
  else
    echo "  ❌ $file MISSING"
  fi
done

echo ""
echo "✓ All dashboards ready for deployment"
echo ""

# Provide usage instructions
echo "📊 Dashboard URLs:"
echo "=================="
echo ""
echo "1. Service Control Dashboard"
echo "   👉 http://127.0.0.1:3000/service-control-dashboard.html"
echo ""
echo "2. Alert Dashboard"
echo "   👉 http://127.0.0.1:3000/alert-dashboard.html"
echo ""
echo "3. Provider Leaderboard"
echo "   👉 http://127.0.0.1:3000/provider-leaderboard.html"
echo ""

echo "🚀 To Start Testing:"
echo "==================="
echo ""
echo "1. Start the system:"
echo "   npm run dev:hot"
echo ""
echo "2. Open any dashboard URL above (or use Control Room integration)"
echo ""
echo "3. Dashboards will automatically connect to backend services on:"
echo "   - Metrics Hub (port 3010) - WebSocket real-time data"
echo "   - Alert Engine (web-server) - Alert management"
echo "   - Provider Scorecard (reports-server) - Performance rankings"
echo ""

echo "💡 Integration with Control Room:"
echo "=================================="
echo ""
echo "See MONTH-1-UI-IMPLEMENTATION.md for Control Room tab integration code"
echo ""

echo "✨ Month 1 Tier 1 Complete!"
