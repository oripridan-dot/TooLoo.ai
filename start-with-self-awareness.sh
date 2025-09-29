#!/usr/bin/env bash

# Start TooLoo.ai with a call to test self-awareness
# This script starts the server and runs a simple test to verify self-awareness is working

# Detect port and define URL
PORT=${PORT:-3000}
PUBLIC_URL=${PUBLIC_URL:-http://localhost:$PORT}
echo "🚀 Starting TooLoo.ai with self-awareness on port $PORT"
echo "📊 Public URL: $PUBLIC_URL"

# Check if we're in Codespaces - use different hostname if so
if [ -n "$CODESPACE_NAME" ]; then
  PUBLIC_URL="https://$CODESPACE_NAME-$PORT.$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN"
  echo "🔧 Detected Codespaces environment"
  echo "📊 Updated URL: $PUBLIC_URL"
fi

# Start server in background
node simple-api-server.js --port $PORT --public-url $PUBLIC_URL &
SERVER_PID=$!

# Give server time to start
echo "⏳ Waiting for server to start..."
sleep 5

# Run self-awareness test
echo "🧪 Running self-awareness test..."
node test-self-awareness-integration.js

# If test was successful, display success message
if [ $? -eq 0 ]; then
  echo -e "\n✅ Self-awareness test passed!"
  echo "🌐 TooLoo.ai is now running with self-awareness at:"
  echo "   $PUBLIC_URL"
  echo -e "\n📚 Try these self-awareness commands:"
  echo "   1. show code simple-api-server.js"
  echo "   2. search your code for handleFilesystemCommand"
  echo "   3. analyze your code"
  echo "   4. show code structure"
  echo -e "\n📱 Press Ctrl+C to stop the server"
else
  echo -e "\n❌ Self-awareness test failed. Check logs for details."
  # Kill the server process if test failed
  kill $SERVER_PID
  exit 1
fi

# Wait for server process
wait $SERVER_PID