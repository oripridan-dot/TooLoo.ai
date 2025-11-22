#!/bin/bash
SESSION_ID="direct-test-$(date +%s)"
echo "Testing direct save to Port 3006 with Session ID: $SESSION_ID"

curl -v -X POST http://127.0.0.1:3006/api/v1/product/session \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"messages\": [{\"role\":\"user\",\"content\":\"Direct save test\"}],
    \"metadata\": {}
  }"

echo ""
echo "Checking file..."
ls -l data/sessions/$SESSION_ID.json
