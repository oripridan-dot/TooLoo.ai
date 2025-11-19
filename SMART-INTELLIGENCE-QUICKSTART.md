# Smart Intelligence System - Quick Start Guide

## Endpoint
```
POST http://127.0.0.1:3000/api/v1/chat/smart-intelligence
```

## Basic Usage

### Request Example
```bash
curl -X POST http://127.0.0.1:3000/api/v1/chat/smart-intelligence \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How do I create a REST API with Node.js and Express?",
    "responseText": "Here is how to create a REST API with Express...",
    "providerResponses": [
      {
        "provider": "claude",
        "response": "Express is a minimal web framework..."
      },
      {
        "provider": "gpt",
        "response": "To create a REST API with Express..."
      }
    ],
    "metadata": {
      "domain": "web-development",
      "language": "javascript"
    }
  }'
```

### Response Example
```json
{
  "ok": true,
  "intelligenceReport": {
    "context": {
      "question": "How do I create a REST API with Node.js and Express?",
      "responsePreview": "Here is how to create a REST API with Express..."
    },
    "crossValidation": {
      "consensusScore": 0.85,
      "agreementLevel": "HIGH",
      "consensusItems": [
        "Use Express.js framework",
        "Implement routing with app.get/post/put/delete",
        "Add error handling middleware"
      ],
      "conflictAreas": []
    },
    "analysis": {
      "insights": [
        {
          "type": "consensus_strength",
          "description": "3 consensus points identified",
          "confidence": 95
        }
      ],
      "gaps": [],
      "strengths": [
        {
          "strength": "Provider A excels at clarity",
          "provider": "claude",
          "score": 98
        }
      ],
      "recommendations": [
        {
          "text": "Add security best practices",
          "level": "high"
        }
      ],
      "nextSteps": [
        {
          "task": "Test all endpoints",
          "priority": "high",
          "when": "immediately"
        }
      ]
    },
    "technicalValidation": {
      "entitiesFound": {
        "apis": [],
        "packages": ["express"],
        "codeSnippets": [
          {
            "language": "javascript",
            "code": "const express = require('express')..."
          }
        ],
        "urls": ["https://expressjs.com"]
      },
      "validationScore": 85,
      "verified": true,
      "issues": [],
      "remediationAdvice": []
    },
    "finalAssessment": {
      "confidenceScore": 82,
      "confidenceBracket": "High",
      "verificationStatus": "verified",
      "keyFindings": [
        "Consensus level: high",
        "Identified 0 gaps",
        "Found 2 strengths"
      ],
      "criticalIssues": [],
      "recommendedAction": "Accept",
      "actionRationale": "High consensus across providers; Technical content verified",
      "nextActions": [
        "Use synthesized response",
        "Monitor for feedback"
      ]
    },
    "metadata": {
      "pipelineType": "full-smart-intelligence",
      "stagesExecuted": [
        "cross-validation",
        "smart-analysis",
        "technical-validation",
        "synthesis"
      ],
      "processingTime": "245ms"
    }
  }
}
```

## Understanding the Response

### Confidence Score
- **90-100 (Critical)**: Verified, high consensus → **Accept** immediately
- **80-89 (High)**: Well-supported, minor gaps → **Accept** with confidence
- **70-79 (Moderate)**: Moderate agreement → **Use With Caution**, review first
- **50-69 (Low)**: Multiple conflicts → **Review** thoroughly before use
- **0-49 (Unverified)**: Low confidence → **Revise** or re-request

### Recommended Actions
1. **Accept** - Use the response immediately with confidence
2. **Use With Caution** - Response is good but review identified gaps before using
3. **Review** - Response has issues that need manual review before use
4. **Revise** - Response has significant problems and should be reworked

### Key Components

**Cross-Validation Results**
- Shows consensus across multiple providers
- Identifies areas of agreement and conflict
- Provides consensus strength metrics

**Smart Analysis**
- Extracts insights from validation data
- Identifies gaps and weaknesses
- Highlights strengths and agreements
- Generates actionable recommendations
- Creates sequential action plans

**Technical Validation**
- Extracts technical entities (APIs, packages, code, URLs)
- Validates against external sources
- Identifies technical issues
- Provides remediation advice

**Final Assessment**
- Synthesizes all validation results
- Provides overall confidence score
- Determines verification status
- Recommends specific action
- Lists next steps

## Integration Examples

### In Express Route Handler
```javascript
app.post('/api/validate-response', async (req, res) => {
  const { question, response, providerResponses } = req.body;
  
  const result = await fetch('http://127.0.0.1:3000/api/v1/chat/smart-intelligence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      responseText: response,
      providerResponses,
      metadata: { domain: 'technical' }
    })
  }).then(r => r.json());
  
  // Use result.intelligenceReport
  return res.json(result);
});
```

### In React Component
```javascript
const validateResponse = async (question, response) => {
  const result = await fetch('/api/v1/chat/smart-intelligence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      responseText: response,
      providerResponses: []
    })
  }).then(r => r.json());
  
  const { confidenceScore, recommendedAction } = result.intelligenceReport.finalAssessment;
  
  return {
    confidence: confidenceScore,
    action: recommendedAction,
    shouldUse: recommendedAction !== 'Revise'
  };
};
```

## Testing

### Run Test Suite
```bash
node tests/smart-intelligence.test.js
```

Expected output:
```
✓ SmartResponseAnalyzer test suite (5 tests)
✓ TechnicalValidator test suite (5 tests)
✓ SmartIntelligenceOrchestrator test suite (5 tests)
✓ Integration tests (2 tests)
✓ Total: 17+ assertions passing
```

## Troubleshooting

### Empty Cross-Validation
- If `crossValidationResult` is null, that's OK - system still analyzes response content

### Low Confidence Scores
- Check `criticalIssues` array for what's causing low confidence
- Review `keyFindings` for specific problems
- Look at `nextSteps` for recommended actions

### Missing Technical Validation
- Technical validation runs automatically for technical content
- If not running, check if content has technical keywords (api, code, function, etc.)

### Timeout Issues
- API has 30-second timeout for external validation calls
- If external sources are slow, score may be based on local analysis only

## Files to Review

- **Implementation Details**: `SMART-INTELLIGENCE-IMPLEMENTATION.md`
- **Source Code**: 
  - `lib/smart-response-analyzer.js`
  - `lib/technical-validator.js`
  - `lib/smart-intelligence-orchestrator.js`
- **Tests**: `tests/smart-intelligence.test.js`
- **Integration**: `servers/web-server.js` (lines 49-52, 286-289, 1318-1380)

## What's Next?

The smart intelligence system is production-ready and can:
1. Validate responses against multiple criteria
2. Highlight consensus and conflicts
3. Extract actionable insights
4. Perform technical verification
5. Provide confidence-based recommendations

Use the API endpoint to add high-confidence response validation to any part of TooLoo.ai!
