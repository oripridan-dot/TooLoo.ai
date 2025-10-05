# 🎬 Prompt Director & Multi-Provider Synthesis

**TooLoo.ai's Unique Feature**: Prompt saturation loop with intelligent multi-provider orchestration

---

## What is the Director?

The **Prompt Director** is TooLoo's orchestration system that:

1. **Saturates prompts** through iterative refinement
2. **Breaks complex requests** into provider-specific tasks
3. **Executes in parallel** across multiple AI providers
4. **Synthesizes responses** into a unified TooLoo.ai answer

This creates a "hive mind" approach where multiple AI perspectives combine to produce superior results.

---

## How It Works

### Phase 1: Prompt Saturation Loop

The Director refines your prompt through conversation until it's "saturated" (clear and executable).

**Example:**
```
User: "make a calculator"

Iteration 1: Clarity analysis shows missing details
- What technology? (React, vanilla JS, CLI?)
- What features? (basic operators, scientific, history?)

Iteration 2: "make a React calculator with basic operators"
- Confidence: 0.85 ✅ SATURATED
```

**Parameters:**
- `saturationThreshold`: Max refinement iterations (default: 3)
- `confidence`: 0.0-1.0 (>0.8 = saturated)

### Phase 2: Execution Plan

The Director analyzes the saturated prompt and creates a task breakdown strategy:

**Strategy Types:**

1. **Code-heavy prompts**:
   - DeepSeek: Code generation (cost-effective)
   - Claude: Architecture review
   - OpenAI: Edge case analysis

2. **Reasoning prompts**:
   - Claude: Deep reasoning (best at this)
   - OpenAI: Practical examples
   - Gemini: Creative alternatives

3. **Creative prompts**:
   - Gemini: Creative lead
   - Claude: Refinement
   - DeepSeek: Technical implementation

4. **Balanced requests**:
   - DeepSeek: Primary response
   - Claude: Validation

### Phase 3: Parallel Execution

All tasks execute simultaneously across providers.

```javascript
// Pseudo-code
await Promise.all([
  deepseek.generate(codeTask),
  claude.generate(architectureTask),
  openai.generate(edgeCaseTask)
]);
```

**Performance:**
- Fastest provider wins (primary response)
- Slow providers still contribute insights
- Failures don't block other providers

### Phase 4: Response Compilation

The Director synthesizes all responses into one unified answer:

```markdown
# TooLoo.ai Response (Multi-Provider Synthesis)

## Primary Response (deepseek)
[Main code/solution here]

## Additional Perspectives

### Architecture Review (claude)
[Architectural insights]

### Edge Case Analysis (openai)
[Potential issues and handling]

---
Director's Note: This response synthesizes insights from 3 AI providers...
```

---

## API Usage

### Enable Director Mode (Default ON)

**Method 1: Global setting**
```bash
curl -X POST http://localhost:3005/api/v1/settings \
  -H "Content-Type: application/json" \
  -d '{"useDirector": true}'
```

**Method 2: Per-request**
```bash
curl -X POST http://localhost:3005/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "create a todo app",
    "useDirector": true,
    "conversationId": "session-123"
  }'
```

### Direct Director Endpoint

For full transparency, use the dedicated Director endpoint:

```bash
curl -X POST http://localhost:3005/api/v1/director/process \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "explain quantum computing",
    "conversationId": "learning-session",
    "context": {"audience": "beginner"}
  }'
```

**Response includes:**
```json
{
  "success": true,
  "originalPrompt": "explain quantum computing",
  "saturatedPrompt": {
    "final": "explain quantum computing for beginners...",
    "iterations": [...],
    "saturated": true
  },
  "executionPlan": {
    "strategy": "parallel",
    "tasks": [...],
    "reasoning": "Reasoning request: Claude for deep analysis..."
  },
  "providerResponses": [...],
  "finalResponse": {
    "content": "# TooLoo.ai Response...",
    "compilationStrategy": "multi-provider-synthesis",
    "providersUsed": ["claude", "openai", "gemini"]
  },
  "metadata": {
    "providersUsed": ["claude", "openai", "gemini"],
    "totalTokens": 2847,
    "processingTimeMs": 3421
  }
}
```

### Check Director Stats

```bash
curl http://localhost:3005/api/v1/director/stats
```

Response:
```json
{
  "success": true,
  "stats": {
    "activeConversations": 3,
    "saturationThreshold": 3,
    "averageIterations": "2.15"
  }
}
```

### Clear Conversation History

```bash
curl -X POST http://localhost:3005/api/v1/director/clear-history \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "session-123"}'
```

---

## CLI Usage

The CLI automatically uses Director mode if enabled:

```bash
# Standard request (uses Director if enabled globally)
npm run tooloo "create a React component for user login"

# Force Director mode
TOOLOO_USE_DIRECTOR=true npm run tooloo "explain async/await"

# Disable Director for single request
TOOLOO_USE_DIRECTOR=false npm run tooloo "quick test"
```

---

## Configuration

### In Code

```javascript
// simple-api-server.js
class PersonalAIManager {
  constructor() {
    this.userPreferences = {
      defaultProvider: 'deepseek',
      useDirector: true,  // Enable Director by default
      autoExecute: false
    };
    
    // Director settings
    this.director = new PromptDirector(this);
    this.director.saturationThreshold = 3; // Max refinement iterations
  }
}
```

### Environment Variables

```bash
# .env
TOOLOO_USE_DIRECTOR=true
TOOLOO_SATURATION_THRESHOLD=3
```

---

## When to Use Director Mode

### ✅ Use Director For:
- **Complex tasks**: Multiple sub-problems
- **Creative work**: Design, architecture, brainstorming
- **High-stakes decisions**: Want multiple perspectives
- **Learning**: Compare different AI reasoning styles
- **Code generation**: Get code + review + edge cases

### ❌ Skip Director For:
- **Simple queries**: "What is X?" (waste of tokens)
- **Quick fixes**: Typo corrections, small edits
- **Single-provider tasks**: Already know which AI to use
- **Speed-critical**: Director adds ~2-3x latency
- **Token conservation**: Uses more tokens (3x providers)

---

## Cost Implications

**Standard Mode:**
- 1 provider call
- ~500 tokens average
- Cost: $0.001-0.01 per request

**Director Mode:**
- 1 saturation analysis (DeepSeek, cheap)
- 2-3 provider calls in parallel
- ~1500-2000 tokens total
- Cost: $0.003-0.03 per request

**Recommendation**: Use Director for important tasks where quality > cost.

---

## Implementation Details

### Prompt Clarity Analysis

The Director uses AI to analyze prompt clarity:

```javascript
async analyzePromptClarity(prompt, history, context) {
  // Calls DeepSeek (fast, cheap) to evaluate:
  // - clarity: "clear|vague|ambiguous"
  // - confidence: 0.0-1.0
  // - missing: ["list of missing info"]
  // - intent: "what user wants"
  // - complexity: "simple|moderate|complex"
}
```

**Fallback**: If AI analysis fails, uses heuristics:
- Word count (longer = clearer)
- Specific terms (file, function, class = clearer)
- Question words (who, what = less clear)

### Task Routing Logic

```javascript
// Example: Code request
if (this.isCodeRequest(prompt)) {
  return [
    { provider: 'deepseek', role: 'code-generation', priority: 1 },
    { provider: 'claude', role: 'architecture-review', priority: 2 },
    { provider: 'openai', role: 'edge-cases', priority: 3 }
  ];
}
```

**Priority determines compilation**:
- Priority 1 = Primary response (shown first)
- Priority 2-3 = Supporting insights (shown after)

### Response Synthesis

The Director combines responses intelligently:

1. **Primary response** (lowest priority number) shown prominently
2. **Supporting responses** organized by role
3. **Meta-analysis** explains which providers contributed what
4. **Markdown formatting** for readability

---

## Troubleshooting

### "All providers failed"

**Cause**: No API keys configured, or all providers down.

**Solution**:
1. Check `.env` has at least 2 provider keys
2. Test individual providers: `curl http://localhost:3005/api/v1/health`
3. Disable Director temporarily: `useDirector: false`

### "Prompt not saturating"

**Cause**: Prompt is too vague, Director keeps asking for details.

**Solution**:
1. Provide more context upfront
2. Lower saturation threshold: `director.saturationThreshold = 1`
3. Use standard mode for simple requests

### "Director responses too slow"

**Cause**: Multiple provider calls + saturation iterations.

**Solution**:
1. Reduce saturation threshold (1-2 iterations)
2. Use Director only for complex tasks
3. Remove slow providers (check response times in health endpoint)

### "Responses don't compile well"

**Cause**: Provider responses are too different/contradictory.

**Solution**:
1. Refine your prompt (saturation helps here!)
2. Adjust execution plan strategy
3. Use fewer providers (quality > quantity)

---

## Future Enhancements

### Planned Features:
- [ ] **User feedback loop**: Human-in-the-loop for saturation
- [ ] **Consensus detection**: If all providers agree, return faster
- [ ] **Provider voting**: Weight responses by success history
- [ ] **Caching**: Reuse saturated prompts for similar requests
- [ ] **Streaming**: Show responses as they arrive
- [ ] **Cost optimizer**: Auto-disable expensive providers
- [ ] **Custom strategies**: User-defined execution plans

---

## Examples

### Example 1: Code Generation

**Input:**
```bash
curl -X POST http://localhost:3005/api/v1/director/process \
  -H "Content-Type: application/json" \
  -d '{"prompt": "create a React hook for fetching data"}'
```

**Director's Plan:**
```
Strategy: Code-heavy request
Tasks:
1. DeepSeek (code-generation) - Write the hook
2. Claude (architecture-review) - Review design patterns
3. OpenAI (edge-cases) - Error handling, loading states
```

**Output:**
```markdown
# TooLoo.ai Response (Multi-Provider Synthesis)

## Primary Response (deepseek)
```javascript
import { useState, useEffect } from 'react';

function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url, options);
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [url]);
  
  return { data, loading, error };
}
```

## Additional Perspectives

### Architecture Review (claude)
This hook follows React best practices:
- Uses dependency array correctly
- Separates concerns (data, loading, error)
- Cleanup not needed for simple fetch (but consider for AbortController)

### Edge Case Analysis (openai)
Consider handling:
- Network timeout
- Component unmount during fetch
- Retry logic for failed requests
- Cache to prevent duplicate requests

---
Director's Note: This response synthesizes insights from 3 AI providers...
```

### Example 2: Reasoning Task

**Input:**
```bash
curl -X POST http://localhost:3005/api/v1/director/process \
  -H "Content-Type: application/json" \
  -d '{"prompt": "explain why async/await is better than promises"}'
```

**Director's Plan:**
```
Strategy: Reasoning request
Tasks:
1. Claude (deep-reasoning) - Detailed explanation
2. OpenAI (practical-examples) - Code examples
3. Gemini (creative-alternatives) - Alternative approaches
```

**Output combines**: Claude's deep analysis + OpenAI's examples + Gemini's alternatives

---

## Testing

### Unit Tests

```javascript
// test-director.js
const PromptDirector = require('./prompt-director');

describe('PromptDirector', () => {
  it('should saturate vague prompts', async () => {
    const director = new PromptDirector(mockAIManager);
    const result = await director.saturatePrompt('make an app', 'test');
    expect(result.iterations.length).toBeGreaterThan(1);
  });
  
  it('should create execution plans for code requests', async () => {
    const plan = await director.createExecutionPlan({ 
      final: 'write a function' 
    });
    expect(plan.tasks).toContainEqual(
      expect.objectContaining({ provider: 'deepseek', role: 'code-generation' })
    );
  });
  
  it('should execute tasks in parallel', async () => {
    const start = Date.now();
    await director.executeParallel(mockPlan);
    const duration = Date.now() - start;
    // Should complete in ~1x time, not 3x (parallel execution)
    expect(duration).toBeLessThan(2000);
  });
});
```

### Integration Test

```bash
# Test full Director flow
curl -X POST http://localhost:3005/api/v1/director/process \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "test prompt",
    "conversationId": "integration-test"
  }' | jq '.success, .metadata.providersUsed'
```

---

## Performance Metrics

Track Director performance:

```javascript
// In response metadata
{
  "metadata": {
    "saturationIterations": 2,
    "providersUsed": ["deepseek", "claude", "openai"],
    "processingTimeMs": 3421,
    "totalTokens": 2847
  }
}
```

**Benchmarks** (3 providers):
- Saturation: ~500ms (1-2 iterations)
- Parallel execution: ~2000ms (slowest provider)
- Compilation: ~100ms
- **Total: ~2600ms**

Compare to standard mode: ~800ms (single provider)

**Tradeoff**: 3x slower, but much higher quality for complex tasks.

---

## Summary

The Prompt Director is TooLoo.ai's secret weapon for:
- ✅ Refining vague prompts automatically
- ✅ Leveraging multiple AI strengths simultaneously  
- ✅ Producing superior multi-perspective responses
- ✅ Intelligent task routing and compilation

**Use it when quality matters more than speed/cost.**

---

*Last Updated: 2025-10-03*
