#!/bin/bash
echo "🛑 Stopping all services..."
pkill -f "tsx src/main.ts"
pkill -f "node servers/"

# Force kill anything on port 4000 or 3000
if lsof -t -i:4000 >/dev/null; then
    echo "⚠️  Port 4000 in use. Killing process..."
    lsof -t -i:4000 | xargs kill -9
fi

if lsof -t -i:3000 >/dev/null; then
    echo "⚠️  Port 3000 in use. Killing process..."
    lsof -t -i:3000 | xargs kill -9
fi

echo "✅ Services stopped."
