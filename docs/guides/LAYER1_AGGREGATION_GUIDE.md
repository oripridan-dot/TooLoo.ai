# Layer 1 Response Aggregation System

## Overview
A multi-provider orchestration and response aggregation mechanism that:
1. **Calls multiple LLM providers in parallel**
2. **Extracts Layer 1 bullets** (key sentences/insights)
3. **Aggregates into comprehensive response** with all key info + suggestions
4. **Scores confidence** and provides detailed metadata

## Architecture

### Components

#### 1. **ResponseAggregator** (`response-aggregator.js`)
Standalone class that processes multiple responses and generates:
- **Layer 1 bullets**: Deduplicated key sentences (5-8 bullets)
- **Aggregated summary**: Consolidated narrative
- **Suggestions/recommendations**: Extracted from all responses
- **Confidence metrics**: Average confidence across providers

**Methods:**
```javascript
aggregator.addResponse(text, { provider, confidence, taskType })
aggregator.generateLayer1Bullets(maxBullets = 8)
aggregator.generateAggregatedResponse()
aggregator.extractSuggestions(maxSuggestions = 5)
aggregator.formatForDisplay({ bulletFormat: true, maxBullets: 8 })
```

#### 2. **Layer1Orchestrator** (`layer1-orchestrator.js`)
Orchestrates multi-provider calls with:
- **Parallel execution** with timeout handling
- **Provider selection** based on availability
- **Confidence scoring** (1-10 scale)
- **Result formatting** for UI/API

**Main method:**
```javascript
const result = await orchestrator.orchestrateMultiProvider(
  prompt,
  systemPrompt,
  { taskType, criticality, maxTokens, numProviders: 3 }
);
```

## Usage

### Basic Usage
```javascript
import Layer1Orchestrator from './engine/layer1-orchestrator.js';

const orchestrator = new Layer1Orchestrator();

const result = await orchestrator.orchestrateMultiProvider(
  'Your question here',
  'Optional system prompt',
  { taskType: 'reasoning', numProviders: 3 }
);

// Access outputs
console.log(result.layer1Bullets);      // Array of key bullet points
console.log(result.aggregated);         // Comprehensive response
console.log(result.rawResponses);       // Individual provider responses
```

### Output Structure

```javascript
{
  layer1Bullets: [
    "• First key insight",
    "• Second key insight",
    "• Third key insight"
    // ... up to 8 bullets
  ],
  
  aggregated: {
    summary: "Consolidated summary narrative",
    bullets: [...],
    suggestions: [
      "• Recommendation 1",
      "• Recommendation 2"
    ],
    providers: ["deepseek", "anthropic", "openai"],
    responseCount: 3,
    confidence: 78,
    timestamp: 1729705200000
  },
  
  rawResponses: [
    { text, provider, confidence },
    // ... one per provider
  ],
  
  report: { /* detailed metadata */ }
}
```

## Key Features

### 1. Bullet Point Extraction (Layer 1)
- **Sentence splitting**: Breaks responses into logical sentences
- **Deduplication**: Removes redundant bullets using semantic normalization
- **Confidence sorting**: Orders by provider confidence score
- **Customizable count**: Default 8 bullets, adjustable

### 2. Comprehensive Aggregation
- **Multi-response synthesis**: Combines insights from all providers
- **Smart narrative building**: Creates coherent summary from bullets
- **Suggestion mining**: Extracts recommendations using pattern matching
- **Confidence averaging**: Calculates overall confidence level

### 3. Provider Management
- **Auto-detection**: Finds available providers from env vars
- **Parallel execution**: Calls up to N providers simultaneously
- **Timeout handling**: Graceful failure if provider is slow
- **Fallback chain**: DeepSeek → Anthropic → OpenAI → Gemini

### 4. Confidence Scoring
- **Provider reputation**: Different base scores per provider
- **Response length bonus**: Longer responses = slightly higher confidence
- **Customizable weights**: Adjust scoring algorithm as needed

## Integration Examples

### In API Server
```javascript
// In servers/product-development-server.js or similar
app.post('/api/v1/analyze', async (req, res) => {
  const orchestrator = new Layer1Orchestrator();
  
  const result = await orchestrator.orchestrateMultiProvider(
    req.body.prompt,
    req.body.system,
    { taskType: 'reasoning', numProviders: 3 }
  );
  
  res.json({
    layer1: result.layer1Bullets,
    aggregated: result.aggregated,
    metadata: result.report
  });
});
```

### With Control Room
```javascript
// Format for UI display
const formatted = orchestrator.formatOutput(result, 'markdown');
// Returns markdown with bullets, summary, recommendations, metadata
```

### For Evaluation
```javascript
// Get detailed metrics
const report = result.report;
console.log('Providers:', report.aggregated.providers);
console.log('Confidence:', report.aggregated.confidence);
console.log('Response count:', report.aggregated.responseCount);
```

## Configuration Options

```javascript
const orchestrator = new Layer1Orchestrator({
  maxParallel: 3,              // Max concurrent provider calls
  timeout: 30000,              // Milliseconds per provider
  includeLocalProviders: true, // Include LocalAI
  minConfidence: 0.3,          // Min confidence threshold (0-1)
});
```

## Environment Variables Required

For different providers:
```
DEEPSEEK_API_KEY
ANTHROPIC_API_KEY
OPENAI_API_KEY
GEMINI_API_KEY

LOCALAI_ENABLED=true
```

## Files

| File | Purpose |
|------|---------|
| `response-aggregator.js` | Core aggregation logic |
| `layer1-orchestrator.js` | Multi-provider orchestration |
| `layer1-aggregation-example.js` | Usage example |
| `layer1-integration.md` | This file |

## Running the Example

```bash
node engine/layer1-aggregation-example.js
```

Output shows:
- Layer 1 bullets
- Comprehensive summary
- Recommendations
- Confidence metrics
- Raw response previews
- Formatted markdown output
- JSON export

## Error Handling

```javascript
try {
  const result = await orchestrator.orchestrateMultiProvider(...);
} catch (error) {
  // 'All providers failed' error
  console.log(error.details); // Array of failures with reasons
}
```

## Next Steps

1. **Integrate into API endpoints** where multi-provider analysis is needed
2. **Add custom scoring** in `scoreConfidence()` method
3. **Customize bullet extraction** patterns in `extractBullets()`
4. **Add suggestion patterns** for domain-specific recommendations
5. **Use in Control Room UI** for real-time aggregated responses

---

Created: October 24, 2025
Version: 1.0
