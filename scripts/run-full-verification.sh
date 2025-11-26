#!/bin/bash

# Kill any existing processes
lsof -t -i:4000 -i:3011 | xargs -r kill -9

# Start the main server in the background
echo "🚀 Starting Synapsys Server..."
npm run start:synapsys > server.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
max_retries=30
count=0
while ! curl -s http://127.0.0.1:4000/health > /dev/null; do
    sleep 1
    count=$((count+1))
    if [ $count -ge $max_retries ]; then
        echo "❌ Server failed to start within $max_retries seconds."
        cat server.log
        kill $SERVER_PID
        exit 1
    fi
done
echo "✅ Server is UP!"

# Run Integration Tests
echo "🧪 Running Integration Tests..."
npx tsx scripts/integration-test-suite.ts

# Run Arena Store Test (to verify persistence in full env)
echo "🏟️ Running Arena Store Verification..."
npx tsx scripts/test-arena-store.ts

# Cleanup
echo "🧹 Cleaning up..."
kill $SERVER_PID
rm server.log
echo "✨ Done."
