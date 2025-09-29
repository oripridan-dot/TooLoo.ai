#!/bin/bash
# TooLoo.ai Simple Start Script
# This script starts the app in production mode (API serving SPA)

echo "🚀 Starting TooLoo.ai in production mode..."
echo "This will build the web app and start the server."

# Kill any existing server processes
pkill -f "node simple-api-server" || true

# Build and start
npm run start:prod

# This script doesn't normally reach here since start:prod runs the server
# without returning until it's terminated.
echo "✅ Server stopped."