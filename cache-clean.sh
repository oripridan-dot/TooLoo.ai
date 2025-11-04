#!/bin/bash
# 🧹 NUCLEAR CACHE CLEANER
# Clears ALL possible caches that could be hiding stale TooLoo code

echo "🧹 NUCLEAR CACHE CLEAN - Removing ALL possible cached files"
echo "============================================================"
echo ""

# Clear Node cache
echo "1. Clearing Node modules cache..."
rm -rf node_modules/.cache 2>/dev/null || true
echo "   ✓ Done"

# Clear browser simulation caches
echo "2. Clearing Express view cache..."
find . -name ".cache" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "cache" -type d -exec rm -rf {} + 2>/dev/null || true
echo "   ✓ Done"

# Clear system temp caches
echo "3. Clearing system temp files..."
rm -f /tmp/tooloo* 2>/dev/null || true
mkdir -p /tmp/tooloo-logs
echo "   ✓ Done"

# Clear Node process cache
echo "4. Clearing any node processes..."
pkill -f "node servers/" 2>/dev/null || true
sleep 1
echo "   ✓ Done"

echo ""
echo "============================================================"
echo "✅ ALL CACHES CLEARED"
echo "============================================================"
echo ""
echo "Next: npm run dev:fresh"
echo ""
