#!/usr/bin/env node

/**
 * Cross-Validation Quick Start Guide
 * One-minute overview of the feature
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║        CROSS-VALIDATION FEATURE - QUICK START GUIDE             ║
║                                                                ║
║     Providers Validate Each Other for Better Responses         ║
╚════════════════════════════════════════════════════════════════╝

📋 WHAT IS CROSS-VALIDATION?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When you ask TooLoo a question, it gets responses from multiple AI
providers (Claude, GPT-4, Gemini). The cross-validation system makes
these providers critique each OTHER to find the best answer.

Example:
  🧑‍💼 User: "What's the difference between ML and DL?"
    ↓
  🤖 Claude responds
  🤖 GPT-4 responds  
  🤖 Gemini responds
    ↓
  ✅ Claude evaluates GPT-4 and Gemini
  ✅ GPT-4 evaluates Claude and Gemini
  ✅ Gemini evaluates Claude and GPT-4
    ↓
  📊 Results:
     🥇 Claude: 94/100 (Best accuracy & completeness)
     🥈 GPT-4: 88/100 (Good, but less comprehensive)
     🥉 Gemini: 82/100 (Clear, but missing examples)
    ↓
  🤝 System creates BEST answer by combining all three


🎯 KEY BENEFITS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Higher Quality Answers     - Errors caught through validation
✨ Provider Transparency       - See which provider performed best
✨ Continuous Learning        - System learns provider strengths
✨ Reduced Hallucination      - Multiple providers = more reliable
✨ Better Decision-Making     - Consensus highlights key info
✨ Confidence Scoring         - Know how much to trust answers


📊 EVALUATION CRITERIA (How Providers Grade Each Other)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Accuracy      (25%) - Is the information factually correct?
  Clarity       (20%) - Is it easy to understand?
  Completeness  (20%) - Does it cover all aspects?
  Relevance     (15%) - Does it answer the actual question?
  Tone          (10%) - Is the style appropriate?
  Structure     (10%) - Is it well organized?


🔧 HOW TO USE IT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPTION 1: API Call (Most Flexible)
──────────────────────────────────

  curl -X POST http://127.0.0.1:3000/api/v1/chat/cross-validate \\
    -H "Content-Type: application/json" \\
    -d '{
      "message": "Your question here",
      "providers": ["anthropic", "openai", "gemini"]
    }'

  Response includes:
    • Provider rankings with scores
    • Consensus points (what all agree on)
    • Conflicting points (what needs improvement)
    • Synthesized best response
    • Quality confidence score


OPTION 2: JavaScript Integration
─────────────────────────────────

  import CrossValidationIntegration from './services/cross-validation-integration.js';
  
  const validator = new CrossValidationIntegration();
  
  // Get highest-scoring synthesized answer
  const trusted = await validator.getMostTrustedResponse(
    "Your question",
    ["anthropic", "openai", "gemini"]
  );
  
  // Quick check: do providers agree?
  const consensus = await validator.quickConsensusCheck(
    "Your question",
    0.8  // 80% agreement threshold
  );
  
  // Compare two specific responses
  const comparison = await validator.compareResponses(
    "Your question",
    response1, "Claude",
    response2, "GPT-4"
  );


OPTION 3: Via Session Chat
──────────────────────────

  POST /api/v1/chat/message with:
  {
    "message": "Your question",
    "sessionId": "session-123",
    "enableCrossValidation": true
  }

  Returns response + validation metadata


📈 UNDERSTANDING THE RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "overallRanking": [
    {
      "provider": "anthropic",
      "overallScore": 92,
      "criteria": {
        "accuracy": 95,
        "clarity": 90,
        "completeness": 92,
        "relevance": 90,
        "tone": 88,
        "structure": 95
      }
    },
    // ... other providers
  ]

  "consensusPoints": [
    {
      "type": "strength",
      "point": "explained key concepts clearly",
      "mentions": 3  // All 3 providers agreed
    }
  ]

  "synthesisScore": 91  // Overall confidence (0-100)


🚀 TEST IT NOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Terminal 1: Start TooLoo
  npm run dev

  # Terminal 2: Run test suite
  node test-cross-validation.js

  This will:
    ✓ Test 3 different question types
    ✓ Validate with multiple providers
    ✓ Show rankings and consensus
    ✓ Display synthesized responses
    ✓ Fetch historical insights


📚 EXAMPLE: SIDE-BY-SIDE COMPARISON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question: "How do I learn faster?"

Claude's Answer:
  "Use spaced repetition, interleaving, and active recall..."
  Score: 95/100
  ✓ Comprehensive ✓ Research-backed ✓ Practical examples

GPT-4's Answer:
  "Practice consistently and review regularly..."
  Score: 88/100
  ✓ Clear ✓ Good structure ✗ Less research depth

Gemini's Answer:
  "Study with focus and take breaks..."
  Score: 82/100
  ✓ Simple ✗ Too basic ✗ Missing specifics

CONSENSUS:
  ✓ Spaced repetition works (all agreed)
  ✓ Practice is essential (all agreed)
  ⚠ Claude provided best research support

SYNTHESIS (91/100 confidence):
  Combines Claude's research-backed strategies with GPT's clarity
  and Gemini's simplicity → optimal answer


⚙️ CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Set in .env file:

  CROSS_VALIDATION_VERBOSE=true  # Enable detailed logging
  VALIDATION_TIMEOUT=30000       # Max time per validation (ms)
  MIN_PROVIDERS=2                # Minimum providers needed
  CACHE_VALIDATIONS=true         # Cache results for speed


🔗 INTEGRATION WITH OTHER SYSTEMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Session Memory         → Cross-validations saved in history
  Analytics             → Patterns tracked for optimization
  Meta-Learning         → Results inform learning strategies
  Provider Selection    → Historical scores guide routing
  Coach System          → Recommendations based on consensus
  Auto-Learning         → System improves provider selection


🎓 LEARNING FROM PATTERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Over time, TooLoo learns:

  • Which provider is best for each question type
  • Which providers agree most often (high-confidence consensus)
  • Common weaknesses in specific domains
  • Optimal provider combinations
  • How to predict answer quality before validating

GET /api/v1/chat/cross-validate/insights
  ↓
  Returns historical patterns and trends


🔐 RELIABILITY & QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Synthesis Score 90+: Very high confidence ✅
  Synthesis Score 80-89: High confidence ✅  
  Synthesis Score 70-79: Moderate confidence ⚠️
  Synthesis Score <70: Low confidence - get more providers 🔴

  All critiques are peer-reviewed by other providers
  No single provider can bias the result
  Consensus points are most reliable


📖 FULL DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

See: CROSS-VALIDATION-FEATURE.md


💡 PRO TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Use for high-stakes questions where accuracy matters
2. Compare with just 2 providers for speed (5-10s)
3. Use 3+ providers for complex questions (10-15s)
4. Check consensus for confidence in the answer
5. Use the insights endpoint to see provider trends
6. Combine with session memory for contextual validation


🎯 NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Start TooLoo:  npm run dev
2. Run tests:     node test-cross-validation.js
3. Try the API:   See examples above
4. Integrate:     Use CrossValidationIntegration service
5. Monitor:       Check insights endpoint for patterns


═══════════════════════════════════════════════════════════════════

✅ Status: Fully Implemented & Ready for Production
📅 Version: 1.0.0
🚀 Last Updated: November 18, 2025

═══════════════════════════════════════════════════════════════════
`);
