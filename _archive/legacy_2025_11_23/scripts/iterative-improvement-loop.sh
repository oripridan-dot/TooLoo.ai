#!/bin/bash

# TooLoo.ai Iterative Improvement Loop
# Runs benchmark → learn → improve → repeat until target accuracy

TARGET_ACCURACY=75
MAX_ITERATIONS=5
CURRENT_ITERATION=1

echo "🔄 Starting Iterative Improvement Loop"
echo "📊 Target Accuracy: ${TARGET_ACCURACY}%"
echo "🔁 Max Iterations: ${MAX_ITERATIONS}"
echo ""

while [ $CURRENT_ITERATION -le $MAX_ITERATIONS ]; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔄 Iteration $CURRENT_ITERATION of $MAX_ITERATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Run benchmark
  echo ""
  echo "📊 Running benchmark..."
  npm run benchmark -- --suite segmentation-100 > /tmp/benchmark_output.txt 2>&1
  
  # Extract accuracy
  ACCURACY=$(grep "Overall accuracy:" /tmp/benchmark_output.txt | grep -oP '\d+\.\d+' | head -1)
  ACCURACY_INT=$(echo "$ACCURACY" | cut -d'.' -f1)
  
  echo "✅ Accuracy: ${ACCURACY}%"
  
  # Check if target reached
  if [ "$ACCURACY_INT" -ge "$TARGET_ACCURACY" ]; then
    echo ""
    echo "🎉 Target accuracy reached! ($ACCURACY% >= $TARGET_ACCURACY%)"
    echo "✅ Improvement loop complete after $CURRENT_ITERATION iterations"
    exit 0
  fi
  
  # Get latest results file
  LATEST_RESULTS=$(ls -t datasets/runs/*/results.json | head -1)
  
  # Run auto-learner
  echo ""
  echo "🧠 Running auto-learner..."
  node scripts/segmentation-auto-learner.js "$LATEST_RESULTS"
  
  echo ""
  echo "📈 Progress: ${ACCURACY}% → targeting ${TARGET_ACCURACY}%"
  echo ""
  
  CURRENT_ITERATION=$((CURRENT_ITERATION + 1))
  
  # Wait a bit for server to reload if needed
  sleep 2
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Maximum iterations reached"
echo "📊 Final Accuracy: ${ACCURACY}%"
echo "🎯 Target: ${TARGET_ACCURACY}%"
echo "💡 Consider manual analysis of remaining errors"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
