#!/bin/bash
# Quick verification that all new services are properly set up

echo "🔍 Verifying Cortex Services Setup"
echo "==================================="
echo ""

# Check files exist
echo "📁 Checking files..."
files=(
  "src/cortex/session-context-service.ts"
  "src/cortex/feedback/provider-feedback-engine.ts"
  "src/cortex/feedback/index.ts"
  "src/cortex/memory/memory-auto-filler.ts"
  "src/nexus/routes/cortex.ts"
)

all_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    size=$(wc -c < "$file" | tr -d ' ')
    printf "   ✓ %s (%s bytes)\n" "$file" "$size"
  else
    printf "   ✗ %s MISSING\n" "$file"
    all_exist=false
  fi
done

echo ""

# Check for duplicates
echo "🔎 Checking for duplicate files..."
duplicates=0

session_count=$(find src/cortex -name "*session-context*" | wc -l)
if [ "$session_count" -eq 1 ]; then
  echo "   ✓ SessionContextService: 1 file"
else
  echo "   ✗ SessionContextService: $session_count files (expected 1)"
  duplicates=$((duplicates + 1))
fi

feedback_count=$(find src/cortex -name "*provider-feedback*" | wc -l)
if [ "$feedback_count" -eq 1 ]; then
  echo "   ✓ ProviderFeedbackEngine: 1 file"
else
  echo "   ✗ ProviderFeedbackEngine: $feedback_count files (expected 1)"
  duplicates=$((duplicates + 1))
fi

memory_count=$(find src/cortex -name "*memory-auto*" | wc -l)
if [ "$memory_count" -eq 1 ]; then
  echo "   ✓ MemoryAutoFiller: 1 file"
else
  echo "   ✗ MemoryAutoFiller: $memory_count files (expected 1)"
  duplicates=$((duplicates + 1))
fi

neural_count=$(find src/web-app -name "*NeuralState*" | wc -l)
if [ "$neural_count" -eq 1 ]; then
  echo "   ✓ NeuralState.jsx: 1 file"
else
  echo "   ✗ NeuralState.jsx: $neural_count files (expected 1)"
  duplicates=$((duplicates + 1))
fi

echo ""

# Check cortex/index.ts has the imports
echo "🔗 Checking Cortex initialization..."
if grep -q "sessionContextService" src/cortex/index.ts; then
  echo "   ✓ sessionContextService imported and initialized"
else
  echo "   ✗ sessionContextService not found in Cortex"
fi

if grep -q "providerFeedbackEngine" src/cortex/index.ts; then
  echo "   ✓ providerFeedbackEngine imported and initialized"
else
  echo "   ✗ providerFeedbackEngine not found in Cortex"
fi

if grep -q "memoryAutoFiller" src/cortex/index.ts; then
  echo "   ✓ memoryAutoFiller imported and initialized"
else
  echo "   ✗ memoryAutoFiller not found in Cortex"
fi

echo ""

# Check nexus/index.ts has cortex routes
echo "📡 Checking Nexus routes..."
if grep -q "cortexRoutes" src/nexus/index.ts; then
  echo "   ✓ cortexRoutes imported and registered"
else
  echo "   ✗ cortexRoutes not found in Nexus"
fi

echo ""
echo "==================================="
if [ "$all_exist" = true ] && [ "$duplicates" -eq 0 ]; then
  echo "✅ All checks passed!"
  exit 0
else
  echo "❌ Some checks failed"
  exit 1
fi
