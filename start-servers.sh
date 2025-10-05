#!/bin/bash

# Kill existing processes
echo "🧹 Stopping existing servers..."
pkill -f 'node simple-api-server.js' 2>/dev/null
pkill -f 'vite' 2>/dev/null
sleep 2

# Start API server
echo "🚀 Starting API server on port 3005..."
cd /workspaces/TooLoo.ai
PORT=3005 nohup node simple-api-server.js > logs/api.log 2>&1 &
API_PID=$!
echo "   API PID: $API_PID"

# Wait for API to be ready
sleep 3

# Start Vite
echo "🎨 Starting Vite dev server on port 5173..."
cd /workspaces/TooLoo.ai/web-app
nohup npm run dev > ../logs/vite.log 2>&1 &
VITE_PID=$!
echo "   Vite PID: $VITE_PID"

# Wait for Vite to be ready
sleep 5

# Check if servers are running
echo ""
echo "🔍 Checking server status..."

if curl -s http://localhost:3005/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ API server is running on port 3005"
else
    echo "   ❌ API server not responding"
fi

if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "   ✅ Vite dev server is running on port 5173"
else
    echo "   ❌ Vite dev server not responding"
fi

echo ""
echo "✨ Servers started!"
echo "   API: http://localhost:3005"
echo "   Web: http://localhost:5173"
echo ""
echo "📝 Logs:"
echo "   API: tail -f /workspaces/TooLoo.ai/logs/api.log"
echo "   Vite: tail -f /workspaces/TooLoo.ai/logs/vite.log"
