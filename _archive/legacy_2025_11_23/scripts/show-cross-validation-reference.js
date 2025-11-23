#!/usr/bin/env node
/**
 * CROSS-VALIDATION FEATURE - QUICK REFERENCE CARD
 * One-page cheat sheet for developers
 */

const quickRef = `
╔════════════════════════════════════════════════════════════════╗
║          CROSS-VALIDATION QUICK REFERENCE (v1.0.0)            ║
║                                                                ║
║   Providers validate each other to improve response quality    ║
╚════════════════════════════════════════════════════════════════╝

📌 WHAT IT DOES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Multiple AI providers critique each other's responses on:
  Accuracy (25%) │ Clarity (20%) │ Completeness (20%) │
  Relevance (15%) │ Tone (10%) │ Structure (10%)

Result: Provider rankings + consensus + synthesized answer


🔌 CORE ENDPOINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /api/v1/chat/cross-validate
  {
    "message": "Your question",
    "providers": ["anthropic", "openai", "gemini"],
    "sessionId": "optional"
  }

Response:
  {
    "validationReport": {
      "overallRanking": [...],      // Provider scores
      "consensusPoints": [...],     // What all agree on
      "conflictingPoints": [...],   // Disagreements
      "recommendations": {...},     // Synthesis
      "synthesisScore": 91          // Quality (0-100)
    }
  }


GET /api/v1/chat/cross-validate/insights
  → Historical patterns & provider trends


💻 INTEGRATION SERVICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import CrossValidationIntegration from './services/cross-validation-integration.js';
const v = new CrossValidationIntegration();

// Get best synthesized response
await v.getMostTrustedResponse(question, providers)

// Check consensus (returns true/false)
await v.quickConsensusCheck(question, threshold)

// Compare two responses
await v.compareResponses(question, r1, name1, r2, name2)

// Format for display
v.formatReportForChat(report)
v.createDashboardSummary(report)


🎯 CORE MODULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import ResponseCrossValidator from './lib/response-cross-validator.js';
const validator = new ResponseCrossValidator();

// Full orchestration
await validator.orchestrateCrossValidation(
  query,
  responses,        // [{provider, response}, ...]
  llmProvider
)


📊 VALIDATION CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "accuracy":     25%,  // Factual correctness
  "clarity":      20%,  // Understandability
  "completeness": 20%,  // Addresses all aspects
  "relevance":    15%,  // Answers question
  "tone":         10%,  // Appropriate style
  "structure":    10%   // Well organized
}


🚀 QUICK EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Curl
curl -X POST http://127.0.0.1:3000/api/v1/chat/cross-validate \\
  -H "Content-Type: application/json" \\
  -d '{"message":"test","providers":["anthropic","openai"]}'

# Node.js
const v = new CrossValidationIntegration();
const result = await v.crossValidateViaAPI(
  "What is AI?",
  ["anthropic", "openai", "gemini"]
);


📁 FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Core:
  lib/response-cross-validator.js              (536 lines)
  services/cross-validation-integration.js     (327 lines)

Integration:
  servers/web-server.js (updated)

Tests:
  test-cross-validation.js                     (179 lines)

Docs:
  CROSS-VALIDATION-FEATURE.md                  (Full guide)
  CROSS-VALIDATION-QUICKSTART.js               (Interactive guide)
  CROSS-VALIDATION-IMPLEMENTATION-SUMMARY.md   (Overview)


⏱️ PERFORMANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2 providers:  5-8 sec
3 providers:  10-15 sec
4 providers:  15-25 sec
Tokens:       ~1500-3000 per validation
Storage:      ~5KB per record


🔒 RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

overallRanking: [
  {
    provider: string,
    overallScore: 0-100,
    criteria: {
      accuracy: 0-100,
      clarity: 0-100,
      completeness: 0-100,
      relevance: 0-100,
      tone: 0-100,
      structure: 0-100
    }
  }
]

consensusPoints: [
  {
    type: "strength",
    point: string,
    mentions: number  // How many providers agreed
  }
]

synthesisScore: 0-100  // Overall quality


✅ QUALITY INTERPRETATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

90-100: Very High Confidence ✅✅✅
80-89:  High Confidence      ✅✅
70-79:  Moderate             ⚠️
<70:    Low Confidence       🔴


🎮 TESTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

npm run dev                    # Start TooLoo
node test-cross-validation.js # Run tests
node CROSS-VALIDATION-QUICKSTART.js  # See guide


⚙️ CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

.env file:
  CROSS_VALIDATION_VERBOSE=true
  VALIDATION_TIMEOUT=30000
  MIN_PROVIDERS=2
  CACHE_VALIDATIONS=true
  MAX_PROVIDERS=5


🔗 INTEGRATION HOOKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Session Memory     → Validations saved to history
Analytics          → Patterns tracked
Meta-Learning      → Results inform strategies
Provider Selection → Validation scores guide routing
Coaching System    → Recommendations based on consensus


🆘 COMMON ISSUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Insufficient responses"
  → Check .env API keys

"Validation timeout"
  → Increase VALIDATION_TIMEOUT
  → Use fewer providers

"JSON parse error"
  → System auto-recovers
  → Check logs


📞 SUPPORT FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Read first:    CROSS-VALIDATION-QUICKSTART.js
Full guide:    CROSS-VALIDATION-FEATURE.md
Examples:      CROSS-VALIDATION-IMPLEMENTATION-SUMMARY.md
Code:          lib/response-cross-validator.js
Integration:   services/cross-validation-integration.js


═══════════════════════════════════════════════════════════════════════
Version: 1.0.0 | Status: Production Ready | Nov 18, 2025
═══════════════════════════════════════════════════════════════════════
`;

console.log(quickRef);

// Also save a text version
import fs from 'fs';
fs.writeFileSync('CROSS-VALIDATION-QUICK-REFERENCE.txt', quickRef, 'utf8');
console.log('\n✅ Quick reference saved to: CROSS-VALIDATION-QUICK-REFERENCE.txt');
