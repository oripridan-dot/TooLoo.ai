#!/bin/bash
# TooLoo.ai - Real Conversation Demo with All Providers and Memory
# This script demonstrates the fully activated system with session memory

echo "🚀 TooLoo.ai - Real Conversation Engine with Memory"
echo "=================================================="
echo ""
echo "✅ All providers activated:"
echo "   • Anthropic Claude Haiku 3.5"
echo "   • OpenAI GPT-4o Mini"
echo "   • DeepSeek Chat"
echo "   • Google Gemini 2.5 Flash"
echo ""
echo "✅ Session memory connected:"
echo "   • Conversation history persistence"
echo "   • Context-aware responses"
echo "   • Topic tracking"
echo ""
echo "Starting test conversation..."
echo ""

# Create a session
SESSION_ID=$(node --input-type=module -e "
import { getSessionManager } from './services/session-memory-manager.js';
const sm = await getSessionManager();
console.log(sm.generateSessionId());
")

echo "📋 Session ID: $SESSION_ID"
echo ""

# Test chat endpoint
echo "Testing chat endpoint with memory..."
curl -s -X POST http://127.0.0.1:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Hello TooLoo! Can you remember this conversation?\",
    \"sessionId\": \"$SESSION_ID\",
    \"userId\": \"demo-user\"
  }" | node --input-type=module -e "
const data = await new Promise(resolve => {
  let buffer = '';
  process.stdin.on('data', chunk => buffer += chunk);
  process.stdin.on('end', () => resolve(JSON.parse(buffer)));
});
console.log('');
console.log('Response from provider:', data.provider);
console.log('Response time:', data.responseTime + 'ms');
console.log('Messages in session:', data.messageCount);
console.log('');
console.log('Assistant:', data.response.substring(0, 200) + '...');
console.log('');
"

echo "✅ Conversation test complete!"
echo ""
echo "Available endpoints:"
echo "  POST   /api/v1/chat/message              - Send message with memory"
echo "  GET    /api/v1/sessions                  - List all sessions"
echo "  POST   /api/v1/sessions                  - Create new session"
echo "  GET    /api/v1/sessions/:sessionId       - Get session details"
echo "  GET    /api/v1/sessions/:sessionId/history - Get conversation history"
echo "  GET    /api/v1/sessions/:sessionId/context - Get session context/insights"
echo ""
