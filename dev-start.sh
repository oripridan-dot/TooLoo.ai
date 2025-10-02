#!/bin/bash

echo "🚀 Starting TooLoo.ai Development Environment"
echo "=============================================="

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -9 -f "node.*simple-api-server.js" 2>/dev/null
pkill -9 -f "vite" 2>/dev/null
sleep 2

# Start API Server
echo "🔧 Starting API Server on port 3005..."
cd /workspaces/TooLoo.ai
PORT=3005 node simple-api-server.js > logs/api.log 2>&1 &
API_PID=$!
echo "   API Server PID: $API_PID"

# Wait for API to be ready
echo "⏳ Waiting for API server..."
sleep 3
if curl -s http://localhost:3005/api/v1/health > /dev/null; then
    echo "   ✅ API Server ready at http://localhost:3005"
else
    echo "   ❌ API Server failed to start"
    exit 1
fi

# Start Web App
echo "🎨 Starting Web App on port 5173..."
cd /workspaces/TooLoo.ai/web-app
npm run dev > ../logs/web.log 2>&1 &
WEB_PID=$!
echo "   Web App PID: $WEB_PID"

# Wait for Web App to be ready
echo "⏳ Waiting for web app..."
sleep 4
if curl -s -I http://localhost:5173 > /dev/null 2>&1; then
    echo "   ✅ Web App ready at http://localhost:5173"
else
    echo "   ⚠️  Web App may still be starting..."
fi

echo ""
echo "=============================================="
echo "✨ TooLoo.ai is ready!"
echo ""
echo "🌐 Web Interface: http://localhost:5173"
echo "🔌 API Server:    http://localhost:3005"
echo ""
echo "📋 View logs:"
echo "   API:  tail -f logs/api.log"
echo "   Web:  tail -f logs/web.log"
echo ""
echo "🛑 To stop: pkill -f 'node.*simple-api-server'; pkill -f vite"
echo "=============================================="
