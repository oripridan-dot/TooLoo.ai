#!/bin/bash

echo "🔍 Checking TooLoo.ai Status"
echo "============================"
echo ""

# Check API
echo "📡 API Server (port 3005):"
if curl -s http://localhost:3005/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ Running"
else
    echo "   ❌ Not responding"
fi

# Check Web App
echo ""
echo "🌐 Web App (port 5173):"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "   ✅ Running"
else
    echo "   ❌ Not responding"
fi

echo ""
echo "🔗 URLs:"
echo "   API:     http://localhost:3005"
echo "   Web App: http://localhost:5173"
echo ""
