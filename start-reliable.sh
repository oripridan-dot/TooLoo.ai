#!/bin/bash
# TooLoo.ai - Simple and Reliable Single-Origin Startup Script

# Configuration - Change port if needed
PORT=3010
HOST=0.0.0.0

# Kill any existing server processes
echo "🧹 Cleaning up any existing server processes..."
pkill -f "node simple-api-server.js" || true
echo ""

# Inform the user about the app
echo "🚀 Starting TooLoo.ai in production mode (single-origin)..."
echo "This will build the web app and start the server"
echo "so everything runs on one port with no CORS issues."
echo ""

# Set the port in environment
export PORT=$PORT 
export HOST=$HOST

# Build the web app and start the server
echo "🏗️  Building the web app..."
npm --prefix web-app run build

echo ""
echo "🌐 Starting the server on port $PORT..."
node simple-api-server.js