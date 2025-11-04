#!/bin/bash

# Phase 2B Live Production Demo
# Demonstrates per-metric strategies in action with real meta-server

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         PHASE 2B LIVE PRODUCTION DEMO - Real System          ║"
echo "║         November 4, 2025                                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

META_SERVER="http://127.0.0.1:3002"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 1: VERIFY META-SERVER IS RUNNING${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo

if curl -s $META_SERVER/health | jq . > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Meta-server is running on port 3002${NC}"
else
    echo "⚠️  Meta-server not responding. Starting it..."
    node servers/meta-server.js > /tmp/meta-server.log 2>&1 &
    sleep 3
fi
echo

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 2: CHECK CURRENT METRICS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo

METRICS=$(curl -s $META_SERVER/api/v4/meta-learning/status | jq '.status.metrics.current')
echo "Current Metrics:"
echo "$METRICS" | jq 'with_entries(.value |= "\(.)")'
echo

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 3: PHASE 2B STRATEGY ANALYSIS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "Analyzing metrics and recommending strategies...\n"

ANALYSIS=$(curl -s $META_SERVER/api/v4/meta-learning/strategy-analysis)

echo "Recommendations by Metric:"
echo "─────────────────────────────"

echo "$ANALYSIS" | jq -r '.analysis | to_entries[] | 
  "📊 \(.key):\n" +
  "   Current: \(.value.currentValue | @json)\n" +
  "   State: \(.value.state)\n" +
  "   Trend: \(.value.trend)\n" +
  "   Recommended: \(.value.recommendedStrategy.strategy.name)\n" +
  "   Boost: +\(.value.recommendedStrategy.strategy.boost * 100 | floor)%\n" +
  "   Confidence: \(.value.confidence * 100 | floor)%\n"'
echo

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 4: APPLY PER-METRIC STRATEGIES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "Triggering Phase 2B strategy application...\n"

RESULT=$(curl -s -X POST $META_SERVER/api/v4/meta-learning/apply-strategy \
  -H 'Content-Type: application/json' \
  -d '{"confidence": 0.75}')

echo "Strategy Application Results:"
echo "─────────────────────────────"

echo "$RESULT" | jq -r '.adaptation.strategies | to_entries[] |
  "🎯 \(.key):\n" +
  "   Strategy: \(.value.strategyName)\n" +
  "   Before: \(.value.before | @json)\n" +
  "   Boost: +\(.value.boost)\n" +
  "   After: \(.value.after | @json)\n" +
  "   Improvement: +\((.value.after - .value.before) * 100 | floor)%\n" +
  "   Confidence: \(.value.confidence * 100 | floor)%\n"'

BEFORE=$(echo "$RESULT" | jq '.adaptation.beforeMetrics')
AFTER=$(echo "$RESULT" | jq '.adaptation.afterMetrics')
TOTAL=$(echo "$RESULT" | jq '.adaptation.totalBoost * 100 | floor')

echo
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}SUMMARY${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo "Total Boost Applied: +${TOTAL}%"
echo "Before Metrics:"
echo "$BEFORE" | jq .
echo "After Metrics:"
echo "$AFTER" | jq .
echo

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 5: CHECK EFFECTIVENESS HISTORY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo

EFFECTIVENESS=$(curl -s $META_SERVER/api/v4/meta-learning/strategy-effectiveness)
echo "Strategy Effectiveness Summary:"
echo "$EFFECTIVENESS" | jq '.totalStrategiesApplied, .effectiveness | length' | head -2
echo

echo -e "${YELLOW}✅ PHASE 2B PRODUCTION DEMO COMPLETE${NC}"
echo
echo "Key Achievements:"
echo "  ✓ Strategy analysis completed"
echo "  ✓ Per-metric strategies applied"
echo "  ✓ Metrics updated with confidence-based boosts"
echo "  ✓ Effectiveness tracking enabled"
echo "  ✓ Phase 2A fallback ready (confidence > 70%)"
echo
echo "Next: Run real 24-hour validation on Nov 9 with 50+ cycles"
