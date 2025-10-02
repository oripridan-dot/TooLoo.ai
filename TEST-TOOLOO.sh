#!/bin/bash
# TooLoo.ai - Comprehensive Test Script
# Tests that all components are working correctly

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 TooLoo.ai - System Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")"

# Start TooLoo.ai
npm start &

# Test system
npm test

# View commands
./COMMANDS.sh

# Test 1: Check if servers are running
echo "Test 1: Server Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
API_RUNNING=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health 2>/dev/null)
WEB_RUNNING=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null)

if [ "$API_RUNNING" = "200" ]; then
    echo "✅ API Server (port 3001): RUNNING"
else
    echo "❌ API Server (port 3001): NOT RUNNING"
fi

if [ "$WEB_RUNNING" = "200" ]; then
    echo "✅ Web Server (port 5173): RUNNING"
else
    echo "❌ Web Server (port 5173): NOT RUNNING"
fi
echo ""

# Test 2: Check React app is loaded
echo "Test 2: React App Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$WEB_RUNNING" = "200" ]; then
    REACT_HTML=$(curl -s http://localhost:5173)
    
    if echo "$REACT_HTML" | grep -q "root"; then
        echo "✅ React app container: FOUND"
    else
        echo "❌ React app container: NOT FOUND"
    fi
    
    if echo "$REACT_HTML" | grep -q "index.*\.js"; then
        echo "✅ React JavaScript: LINKED"
    else
        echo "❌ React JavaScript: NOT LINKED"
    fi
fi
echo ""

# Test 3: Check for old interfering files
echo "Test 3: File Cleanliness Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ROOT_HTML=$(find . -maxdepth 1 -name "*.html" ! -name "OLD-*" | wc -l)
if [ "$ROOT_HTML" -eq 0 ]; then
    echo "✅ No interfering HTML files in root"
else
    echo "⚠️  Found $ROOT_HTML HTML file(s) in root (should be archived)"
    find . -maxdepth 1 -name "*.html" ! -name "OLD-*"
fi
echo ""

# Test 4: Check build output
echo "Test 4: Build Artifacts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d "web-app/dist" ]; then
    echo "✅ Build directory exists: web-app/dist"
    
    if [ -f "web-app/dist/index.html" ]; then
        echo "✅ Built index.html exists"
    else
        echo "❌ Built index.html missing"
    fi
    
    JS_FILES=$(find web-app/dist/assets -name "*.js" 2>/dev/null | wc -l)
    CSS_FILES=$(find web-app/dist/assets -name "*.css" 2>/dev/null | wc -l)
    echo "✅ JavaScript bundles: $JS_FILES"
    echo "✅ CSS bundles: $CSS_FILES"
else
    echo "❌ Build directory missing (run: npm run build)"
fi
echo ""

# Test 5: API Health Check
echo "Test 5: API Health Details"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$API_RUNNING" = "200" ]; then
    API_HEALTH=$(curl -s http://localhost:3001/api/v1/health)
    echo "$API_HEALTH" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'Status: {data.get(\"status\")}'); print(f'Providers: {len(data.get(\"providers\", {}))} available')" 2>/dev/null || echo "$API_HEALTH"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$API_RUNNING" = "200" ] && [ "$WEB_RUNNING" = "200" ]; then
    echo "✅ ALL SYSTEMS OPERATIONAL"
    echo ""
    echo "🎨 Access your UI at: http://localhost:5173"
    echo "   (Or click globe icon on port 5173 in VS Code PORTS tab)"
else
    echo "⚠️  SOME SYSTEMS NOT RUNNING"
    echo ""
    if [ "$API_RUNNING" != "200" ] || [ "$WEB_RUNNING" != "200" ]; then
        echo "To start TooLoo.ai, run:"
        echo "  ./START-TOOLOO.sh"
        echo ""
        echo "Or manually:"
        echo "  npm run dev"
    fi
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
