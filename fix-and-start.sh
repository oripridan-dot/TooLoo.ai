#!/bin/bash

set -e

echo "🔧 TooLoo.ai Complete Fix & Start"
echo "=================================="

cd /workspaces/TooLoo.ai

# Step 1: Clean everything
echo "🧹 Step 1: Cleaning old installations..."
rm -rf node_modules package-lock.json
rm -rf web-app/node_modules web-app/package-lock.json
echo "✅ Clean complete"

# Step 2: Install root dependencies
echo "📦 Step 2: Installing root dependencies..."
npm install
echo "✅ Root dependencies installed"

# Step 3: Install web-app dependencies with Vitest fix
echo "📦 Step 3: Installing web-app dependencies..."
cd web-app
npm install
npm install --save-dev vitest@latest @vitejs/plugin-react@latest jsdom@latest
cd ..
echo "✅ Web-app dependencies installed with updated Vitest"

# Step 4: Kill existing processes
echo "🧹 Step 4: Freeing ports..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
echo "✅ Ports cleared"

# Step 5: Start the app
echo ""
echo "🚀 Starting TooLoo.ai..."
echo "=================================="
echo "API: http://localhost:3001"
echo "Web: http://localhost:5173"
echo "=================================="
echo ""

npm run dev
