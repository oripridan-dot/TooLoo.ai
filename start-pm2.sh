#!/bin/bash

# TooLoo.ai Production-Grade Startup with PM2
# Provides automatic restart, monitoring, and logging

echo "🚀 Starting TooLoo.ai with PM2 Process Manager..."
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
fi

# Stop any existing PM2 processes
echo "🧹 Stopping existing PM2 processes..."
pm2 delete all 2>/dev/null || true

# Kill any rogue processes
pkill -f "node simple-api-server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# Navigate to project root
cd /workspaces/TooLoo.ai

# Start servers with PM2
echo "🚀 Starting servers with PM2..."
pm2 start pm2.config.json

echo ""
echo "✨ Servers started with PM2!"
echo ""
echo "📊 Check status:"
echo "   pm2 status"
echo "   pm2 logs"
echo ""
echo "📝 View logs:"
echo "   pm2 logs tooloo-api"
echo "   pm2 logs tooloo-web"
echo ""
echo "🔄 Restart servers:"
echo "   pm2 restart all"
echo ""
echo "🛑 Stop servers:"
echo "   pm2 stop all"
echo ""
echo "📍 Access points:"
echo "   API Server:  http://localhost:3005"
echo "   Web App:     http://localhost:5173"
echo ""

# Show current status
pm2 status
