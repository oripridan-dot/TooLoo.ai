#!/bin/bash
# TooLoo.ai - Official Startup Script
# This is the ONLY script you need to start TooLoo.ai

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting TooLoo.ai"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")"

# Step 1: Stop any running instances
echo "🛑 Stopping existing servers..."
pkill -f "simple-api-server|vite" 2>/dev/null
sleep 2

# Step 2: Start both servers
echo "🚀 Starting API and Web servers..."
npm run dev

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TooLoo.ai is running!"
echo ""
echo "  📡 API Server: http://localhost:3001"
echo "  🎨 Web App:    http://localhost:5173  ← OPEN THIS"
echo ""
echo "  Access in VS Code:"
echo "  1. Open PORTS tab (bottom panel)"
echo "  2. Click globe icon next to port 5173"
echo "  3. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo ""
echo "  Press Ctrl+C to stop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
