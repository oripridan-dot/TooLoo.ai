#!/bin/bash

# TooLoo.ai System Summaries Test Suite
echo "🧪 Testing TooLoo.ai System Summaries Endpoints"
echo "================================================"

# Wait for server to be ready
sleep 2

# Test 1: Health Check
echo "Test 1: Health Check"
response=$(curl -s http://localhost:3001/api/v1/health)
echo "✅ Health: $response"
echo ""

# Test 2: System Summaries - Logs
echo "Test 2: System Summaries - Logs"
response=$(curl -s -X POST http://localhost:3001/api/v1/summarize/logs \
  -H "Content-Type: application/json" \
  -d '{"content":"Application started successfully. Database connection established. Processing 1000 requests per second. Memory usage: 2.5GB. CPU utilization: 65%. All systems operational.", "title":"System Status Log"}')
echo "✅ Logs Summary: $response"
echo ""

# Test 3: System Summaries - Evolution
echo "Test 3: System Summaries - Evolution"
response=$(curl -s -X POST http://localhost:3001/api/v1/summarize/evolution \
  -H "Content-Type: application/json" \
  -d '{"content":"Phase 1 complete: Basic segmentation implemented. Phase 2 in progress: Advanced ML models integrated. Performance improved by 40%. Next: Self-learning capabilities.", "title":"Evolution Progress"}')
echo "✅ Evolution Summary: $response"
echo ""

# Test 4: Topic Enhancement - Plan
echo "Test 4: Topic Enhancement - Plan"
response=$(curl -s -X POST http://localhost:3001/api/v1/topics/plan \
  -H "Content-Type: application/json" \
  -d '{"topicCount":5}')
echo "✅ Topic Plan: $response"
echo ""

# Test 5: Structured Extraction
echo "Test 5: Structured Extraction"
response=$(curl -s -X POST http://localhost:3001/api/v1/extract/structured \
  -H "Content-Type: application/json" \
  -d '{"text":"Model performance shows 85% accuracy, 120ms latency, and costs $0.32 per 1K tokens. BLEU score reached 0.76 with 95% precision."}')
echo "✅ Structured Extraction: $response"
echo ""

# Test 6: Compare Assertions
echo "Test 6: Compare Assertions"
response=$(curl -s -X POST http://localhost:3001/api/v1/extract/compare \
  -H "Content-Type: application/json" \
  -d '{"assertions":[{"topic":"performance","signal":"accuracy","expectedValue":85,"tolerance":5,"text":"Model achieved 85% accuracy on the benchmark."}]}')
echo "✅ Compare Assertions: $response"
echo ""

echo "🎉 All tests completed!"