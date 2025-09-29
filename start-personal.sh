#!/bin/bash

# TooLoo.ai Personal Startup Script
# Starts both API server and web interface for personal use

echo "🚀 Starting TooLoo.ai Personal Assistant"
echo "======================================"

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down TooLoo.ai..."
    kill $API_PID $WEB_PID 2>/dev/null
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Start API server in background
echo "🔧 Starting API server..."
node simple-api-server.js &
API_PID=$!

# Wait a moment for server to start
sleep 2

# Start web interface in background
echo "🌐 Starting web interface..."
cd web-app
npm run dev &
WEB_PID=$!
cd ..

echo ""
echo "✅ TooLoo.ai is running!"
echo "📡 API Server: http://localhost:3001"
echo "🖥️  Web Interface: http://localhost:5173"
echo ""
echo "💡 Open http://localhost:5173 in your browser to start building apps!"
echo "🛑 Press Ctrl+C to stop both servers"
echo ""

# Wait for processes
wait $API_PID $WEB_PID