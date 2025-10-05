#!/bin/bash

# Quick Server Check Script
# Shows current status of all TooLoo.ai servers

echo "🔍 TooLoo.ai Server Status Check"
echo "=================================="
echo ""

# Check processes
echo "📊 Running Processes:"
if ps aux | grep -E "(node.*simple|vite)" | grep -v grep > /dev/null 2>&1; then
    ps aux | grep -E "(node.*simple|vite)" | grep -v grep | awk '{print "   " $2 " - " $11 " " $12 " " $13}' || echo "   None running"
    echo ""
else
    echo "   ⚠️  No servers running!"
    echo ""
fi

# Check API server
echo "🔧 API Server (port 3005):"
if curl -s http://localhost:3005/api/v1/health > /dev/null 2>&1; then
    STATUS=$(curl -s http://localhost:3005/api/v1/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    echo "   ✅ Status: $STATUS"
    echo "   📍 URL: http://localhost:3005"
else
    echo "   ❌ Not responding"
fi
echo ""

# Check Vite server
echo "🎨 Vite Dev Server:"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "   ✅ Responding on port 5173"
    echo "   📍 URL: http://localhost:5173"
elif curl -s http://localhost:5174 > /dev/null 2>&1; then
    echo "   ✅ Responding on port 5174"
    echo "   📍 URL: http://localhost:5174"
else
    echo "   ❌ Not responding"
fi
echo ""

# Check GitHub integration
echo "🐙 GitHub Integration:"
if curl -s http://localhost:3005/api/v1/github/config > /dev/null 2>&1; then
    AUTH=$(curl -s http://localhost:3005/api/v1/github/config | grep -o '"authenticated":[^,}]*' | cut -d':' -f2)
    if [ "$AUTH" = "true" ]; then
        USER=$(curl -s http://localhost:3005/api/v1/github/config | grep -o '"user":"[^"]*"' | cut -d'"' -f4)
        echo "   ✅ Authenticated as: $USER"
    else
        echo "   ⚠️  Not authenticated"
    fi
else
    echo "   ❌ Cannot check (API not responding)"
fi
echo ""

# Quick actions
echo "🚀 Quick Actions:"
echo "   Start:   npm run dev"
echo "   Stop:    npm run stop"
echo "   Restart: npm run restart"
echo "   PM2:     npm run start:pm2"
echo ""

# Show uptime
echo "⏱️  System Uptime:"
uptime | awk '{print "   " $0}'
echo ""
