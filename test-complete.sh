#!/bin/bash

echo "🚀 TooLoo.ai Comprehensive Testing"
echo "=================================="

# Test structured extraction
echo "1. Testing Structured Extraction:"
curl -s -X POST "http://localhost:3001/api/v1/extract/structured" \
  -H "Content-Type: application/json" \
  -d '{"text": "AI model performance shows 92% accuracy, 45ms latency, and costs $0.25 per 1K tokens. BLEU score of 0.78 achieved."}' | jq '.extraction | length'

# Test batch processing  
echo "2. Testing Batch Processing:"
curl -s -X POST "http://localhost:3001/api/v1/extract/batch" \
  -H "Content-Type: application/json" \
  -d '{"taskId": "general"}' | jq '{processed: .processed, totalExtractions: .totalExtractions}'

echo "✅ Testing complete!"