#!/bin/bash
# TooLoo.ai — Quick Commands for Development & Operations

echo "🚀 TooLoo.ai Quick Reference"
echo "=============================="
echo ""

# ============================================
# QUICK ACCESS
# ============================================
echo "📱 CHAT (Open in Browser):"
echo "   http://localhost:3000/chat-modern"
echo ""

# ============================================
# SYSTEM CONTROL
# ============================================
echo "🎮 SYSTEM CONTROL:"
echo ""
echo "   Start Everything:"
echo "   $ npm run dev"
echo "   OR"
echo "   $ npm run start:web &"
echo "   $ export ANTHROPIC_API_KEY='sk-ant-...' && node servers/chat-api-bridge.js &"
echo ""
echo "   Stop Everything:"
echo "   $ npm run stop:all"
echo "   OR"
echo "   $ pkill -f 'node servers' && pkill -f 'npm run start'"
echo ""
echo "   Check Status:"
echo "   $ ps aux | grep -E 'node.*web-server|node.*chat-api' | grep -v grep"
echo ""

# ============================================
# MONITORING
# ============================================
echo "📊 MONITORING:"
echo ""
echo "   Check Bridge Health:"
echo "   $ curl http://localhost:3010/health"
echo ""
echo "   Check Provider Status:"
echo "   $ curl http://localhost:3010/api/v1/system/status | jq '.providers'"
echo ""
echo "   View Logs (Bridge):"
echo "   $ tail -f /tmp/chat-api.log"
echo ""
echo "   View Logs (Web):"
echo "   $ tail -f /tmp/web-server.log"
echo ""

# ============================================
# TESTING
# ============================================
echo "🧪 TESTING:"
echo ""
echo "   Run Performance Benchmark:"
echo "   $ cd /workspaces/TooLoo.ai && node latency-benchmark.js"
echo ""
echo "   Quick API Test:"
echo "   $ curl -X POST http://localhost:3010/api/v1/chat/message \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"message\":\"What is 2+2?\",\"conversationHistory\":[]}'"
echo ""

# ============================================
# DEBUGGING
# ============================================
echo "🐛 DEBUGGING:"
echo ""
echo "   Check All Running Processes:"
echo "   $ ps aux | grep node"
echo ""
echo "   Kill Stuck Process:"
echo "   $ pkill -9 -f 'chat-api-bridge'"
echo ""
echo "   View Full Bridge Error:"
echo "   $ cat /tmp/chat-api.log | tail -50"
echo ""
echo "   Restart Bridge (with API keys):"
echo "   $ pkill -f 'node servers/chat-api-bridge' || true"
echo "   $ export ANTHROPIC_API_KEY='...' && export OPENAI_API_KEY='...' \\"
echo "     && node servers/chat-api-bridge.js > /tmp/chat-api.log 2>&1 &"
echo ""

# ============================================
# USEFUL INFO
# ============================================
echo "ℹ️  USEFUL INFO:"
echo ""
echo "   Performance:"
echo "   • Current Latency: 2522ms (Grade C)"
echo "   • Target: <2000ms (Grade B)"
echo "   • Cost: $0.000314/request"
echo ""
echo "   Current APIs:"
echo "   • Claude Haiku 4.5 (primary) ✅"
echo "   • OpenAI GPT-4 (fallback) ✅"
echo "   • DeepSeek (fallback) ✅"
echo ""
echo "   Ports:"
echo "   • Web UI: 3000"
echo "   • API Bridge: 3010"
echo "   • Orchestrator: 3123 (optional)"
echo ""

# ============================================
# DOCUMENTATION
# ============================================
echo "📚 DOCUMENTATION:"
echo ""
echo "   Full Report: PERFORMANCE_OPTIMIZATION_COMPLETE.md"
echo "   User Guide: CHAT_QUICK_START.md"
echo "   Status Report: FINAL_STATUS_REPORT.md"
echo ""
echo "=============================="
echo "✅ TooLoo.ai is running!"
echo ""
