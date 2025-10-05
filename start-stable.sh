#!/bin/bash

# TooLoo.ai Stable Startup Script
# This script ensures both servers start reliably and stay running

echo "🚀 Starting TooLoo.ai servers..."
echo ""

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node simple-api-server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "concurrently" 2>/dev/null
sleep 2

# Navigate to project root
cd /workspaces/TooLoo.ai

# Start API server in background
echo "🔧 Starting API server on port 3005..."
PORT=3005 node simple-api-server.js > logs/api.log 2>&1 &
API_PID=$!
echo "   API server started (PID: $API_PID)"
sleep 3

# Check if API server is running
if curl -s http://localhost:3005/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ API server is responding"
else
    echo "   ⚠️  API server may still be starting..."
fi

# Start Vite dev server in background
echo "🎨 Starting Vite dev server on port 5173..."
cd /workspaces/TooLoo.ai/web-app
npm run dev > ../logs/web.log 2>&1 &
VITE_PID=$!
echo "   Vite dev server started (PID: $VITE_PID)"
sleep 4

# Check if Vite is running
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "   ✅ Vite dev server is responding on port 5173"
elif curl -s http://localhost:5174 > /dev/null 2>&1; then
    echo "   ✅ Vite dev server is responding on port 5174 (5173 was in use)"
else
    echo "   ⚠️  Vite dev server may still be starting..."
fi

echo ""
echo "✨ Servers are starting up!"
echo ""
echo "📍 Access points:"
echo "   API Server:  http://localhost:3005"
echo "   Web App:     http://localhost:5173 (or 5174 if port conflict)"
echo ""
echo "📊 Check status:"
echo "   API health:  curl http://localhost:3005/api/v1/health"
echo "   Processes:   ps aux | grep -E '(vite|node.*simple)' | grep -v grep"
echo ""
echo "📝 Logs:"
echo "   API logs:    tail -f logs/api.log"
echo "   Web logs:    tail -f logs/web.log"
echo ""
echo "🛑 Stop servers:"
echo "   pkill -f 'node simple-api-server.js' && pkill -f 'vite'"
echo ""
