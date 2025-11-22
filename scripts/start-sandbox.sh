#!/bin/bash
echo "Starting TooLoo.ai Sandbox Environment..."

# Kill existing processes
pkill -f "node servers/web-server.js"
pkill -f "node servers/execution-server.js"

# Start Web Server
echo "Starting Web Server (Port 3000)..."
nohup node servers/web-server.js > web-server.log 2>&1 &

# Start Execution Server
echo "Starting Execution Server (Port 3017)..."
nohup node servers/execution-server.js > execution-server.log 2>&1 &

echo "Waiting for services to initialize..."
sleep 3

# Check status
if lsof -i :3000 > /dev/null && lsof -i :3017 > /dev/null; then
    echo "✅ Sandbox Environment Active!"
    echo "   - Interface: http://127.0.0.1:3000/"
    echo "   - Sandbox API: http://127.0.0.1:3017/"
else
    echo "❌ Failed to start one or more services."
    lsof -i :3000
    lsof -i :3017
fi
