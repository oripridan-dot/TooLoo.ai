#!/bin/bash

echo "=== TooLoo.ai System Status ==="
echo ""

# Check API Server
if curl -s http://localhost:3005/api/v1/health > /dev/null 2>&1; then
    echo "✅ API Server:    Running on port 3005"
else
    echo "❌ API Server:    Not responding"
fi

# Check Web Server
if curl -s -I http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Web Server:    Running on port 5173"
else
    echo "❌ Web Server:    Not responding"
fi

# Check Socket.IO
if curl -s "http://localhost:3005/socket.io/?EIO=4&transport=polling" | grep -q "sid"; then
    echo "✅ Socket.IO:     Connected"
else
    echo "❌ Socket.IO:     Not available"
fi

# Check Learning System
if curl -s http://localhost:3005/api/v1/learning/report > /dev/null 2>&1; then
    echo "✅ Learning API:  Available"
else
    echo "❌ Learning API:  Not available"
fi

echo ""
echo "Access the app at: http://localhost:5173"
echo "API documentation: http://localhost:3005/api/v1/health"
echo ""
