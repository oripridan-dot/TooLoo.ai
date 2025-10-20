# Dynamic Refinery Options Manager – Complete Guide

## Overview

The **Dynamic Refinery Options Manager** is a sophisticated keyword analysis and refinement suggestion engine that:

- **Detects weighted keywords** in prompts (multi-factor analysis: frequency, position, emphasis, weakness)
- **Analyzes context** to understand intent (action, analysis, learning, problem-solving, strategy)
- **Suggests refined alternatives** with measurable impact scores
- **Ranks recommendations** by impact and difficulty
- **Generates before/after comparisons** showing estimated improvements
- **Provides implementation guidance** from quick wins to high-impact changes

## Features at a Glance

### 1. Multi-Factor Keyword Weighting
```
Weight = (Frequency 35%) + (Position 30%) + (Emphasis 35%) × Weakness Factor
```

- **Frequency Score**: How often the keyword appears (normalized by prompt length)
- **Position Score**: Keywords at start/end rank higher (important concepts often lead/conclude)
- **Emphasis Score**: Checks for emphasis markers ("really," "very," "critical," etc.)
- **Weakness Factor**: Weak words (1.3× multiplier) get higher refinement priority

### 2. Context Detection
Automatically identifies prompt intent:
- ⚡ **Action**: write, create, build, develop, generate
- 🔍 **Analysis**: analyze, review, examine, evaluate, assess
- 🎓 **Learning**: learn, understand, explain, teach, guide
- 🔧 **Problem-Solving**: fix, debug, solve, improve, optimize
- 📋 **Strategy**: plan, strategy, approach, framework, process

### 3. Intelligent Refinement Mapping
- 150+ weak word → strong alternative mappings
- Context-aware suggestions (different domains need different refinements)
- Measurable impact scores for each suggestion
- Difficulty assessment (low/medium/high effort)
- Multiple alternatives per weak word

### 4. Measurable Impact Scoring
Each suggestion includes:
- **Impact Score**: 0-10 scale (how much this change improves clarity/specificity)
- **Estimated Improvement**: keyword weight × impact × context factor
- **Measurable Outcome**: Specific, quantifiable result (e.g., "+25% clarity")
- **Difficulty Level**: How much effort to implement

### 5. Interactive UI Component
- Real-time keyword highlighting with weight indicators
- Quick wins section (easy, high-impact changes)
- Priority-ranked recommendations
- Before/after comparison with applied changes
- Implementation guide with phased approach
- Export capabilities (JSON, CSV, text report)

## Installation & Setup

### Basic Setup

```javascript
// 1. Include the refinery engine
<script src="refinery-engine.js"></script>

// 2. Include the UI component
<script src="refinery-ui-component.js"></script>

// 3. Create instances
const engine = new RefineryEngine();
const ui = new RefineryUIComponent('refinery-results');
```

### HTML Requirements

```html
<!-- Container for results -->
<div id="refinery-results"></div>

<!-- Input area -->
<textarea id="promptInput"></textarea>
<button onclick="analyzePrompt()">Analyze</button>
```

### Simple Usage Example

```javascript
// Analyze a prompt
const prompt = "Write a function that helps me analyze data. Make it work well.";
const analysis = engine.analyze(prompt);

// Display results
ui.render(analysis);

// Access specific data
console.log('Context:', analysis.contextType);
console.log('Top Refinements:', analysis.recommendations);
console.log('Overall Impact:', analysis.impactScore);
```

## API Reference

### RefineryEngine

#### Constructor
```javascript
new RefineryEngine(config = {})
```

**Config Options:**
```javascript
{
  minKeywordLength: 3,           // Minimum keyword length
  maxSuggestions: 15,            // Max suggestions to generate
  contextTypes: [                // Supported context types
    'action', 'analysis', 'learning', 
    'problem-solving', 'strategy', 'general'
  ]
}
```

#### Main Methods

##### `analyze(prompt)`
Performs complete analysis and returns comprehensive results.

**Returns:**
```javascript
{
  originalPrompt: string,        // Original text
  keywords: Array,               // All extracted keywords
  weightedKeywords: Array,       // Keywords with weight scores
  contextType: string,           // Detected intent
  refinements: Array,            // All suggested refinements
  impactScore: number,           // Overall impact (0-10)
  focusArea: string,             // Primary focus area
  recommendations: Array,        // Ranked top recommendations
  report: Object                 // Comprehensive report
}
```

##### `extractKeywords(prompt)`
Extracts significant keywords, filtering stop words.

**Returns:** Array of keywords with frequency and position data

##### `analyzeWeights(keywords, prompt)`
Calculates multi-factor weights for each keyword.

**Returns:** Array of keywords with weight scores and priority levels

##### `detectContext(prompt, weightedKeywords)`
Determines prompt intent based on content analysis.

**Returns:** One of: 'action', 'analysis', 'learning', 'problem-solving', 'strategy', 'general'

##### `generateRefinements(weightedKeywords, contextType, originalPrompt)`
Creates specific refinement suggestions.

**Returns:** Array of refinement objects with impact estimates

##### `generateRefinedPrompt(analysis, maxRefinements = 5)`
Creates refined version of prompt with top suggestions applied.

**Returns:**
```javascript
{
  original: string,              // Original prompt
  refined: string,               // Updated prompt
  changes: Array,                // List of changes made
  totalEstimatedImprovement: number,
  changeCount: number,
  confidenceScore: number        // 0-100
}
```

### RefineryUIComponent

#### Constructor
```javascript
new RefineryUIComponent(containerId = 'refinery-results', config = {})
```

**Config Options:**
```javascript
{
  showDifficulty: true,          // Show difficulty badges
  showMetrics: true,             // Show metrics dashboard
  enablePreview: true,           // Show before/after
  autoHighlight: true,           // Highlight keywords
}
```

#### Main Methods

##### `render(analysis)`
Renders complete analysis results in the DOM.

```javascript
const analysis = engine.analyze(prompt);
ui.render(analysis);
```

##### `highlightSuggestion(index)`
Scrolls to and highlights specific recommendation.

```javascript
ui.highlightSuggestion(0);  // Highlight top recommendation
```

##### `exportAsJSON()`
Exports analysis as JSON object.

```javascript
const json = ui.exportAsJSON();
console.log(json);
```

##### `exportAsCSV()`
Exports recommendations as CSV string.

```javascript
const csv = ui.exportAsCSV();
// Download or save
```

## Usage Examples

### Example 1: Basic Analysis

```javascript
const prompt = `
  Create a Python function that helps analyze large datasets.
  Make sure it works really well and handles all the different 
  types of data. Show me how to use it with examples.
`;

const analysis = new RefineryEngine().analyze(prompt);
const ui = new RefineryUIComponent('results');

ui.render(analysis);
```

**What Happens:**
1. Engine extracts keywords: "create", "analyze", "function", "python", etc.
2. Calculates weights: "analyze" ranks high (appears twice, position emphasis)
3. Detects context: "action" (create, function)
4. Suggests refinements:
   - "really well" → "exceptionally" (+8 impact)
   - "types" → "formats" (+7 impact)
   - "Make sure" → "Ensure" (+6 impact)
5. UI displays findings with quick wins first

### Example 2: Context-Aware Refinement

```javascript
// Problem-solving context
const bugReport = `
  I have an issue where the thing doesn't work when I try to 
  make it do the action. The problem shows up with bad data. 
  Please help fix this thing.
`;

const analysis = engine.analyze(bugReport);

// Engine recognizes "problem-solving" context
// Suggests:
//   "thing" → "component" (technical precision)
//   "bad data" → "malformed data" (specificity)
//   "help fix" → "resolve" (directness)
```

### Example 3: Extracting Quick Wins

```javascript
const analysis = engine.analyze(prompt);

// Get easy, high-impact changes
const quickWins = analysis.report.topRecommendations
  .filter(r => r.difficulty === 'low' && r.priority === 'high')
  .slice(0, 3);

quickWins.forEach(win => {
  console.log(`${win.originalKeyword} → ${win.suggestedWord}`);
  console.log(`  Reason: ${win.reason}`);
  console.log(`  Impact: +${win.estimatedImprovement}`);
});
```

### Example 4: Before/After Comparison

```javascript
const analysis = engine.analyze(prompt);
const refined = engine.generateRefinedPrompt(analysis, 5);

console.log('BEFORE:');
console.log(refined.original);
console.log('\nAFTER:');
console.log(refined.refined);
console.log('\nChanges Applied:');
refined.changes.forEach(c => {
  console.log(`  "${c.from}" → "${c.to}" (+${c.impact})`);
});
```

### Example 5: Generating a Report

```javascript
const analysis = engine.analyze(prompt);
const report = analysis.report;

console.log('Context:', report.summary.contextType);
console.log('Opportunities:', report.summary.refinementOpportunities);
console.log('Impact:', report.summary.potentialImpact);
console.log('\nTop Keywords to Refine:');
report.topKeywordsToRefine.forEach(kw => {
  console.log(`  ${kw.word} (weight: ${kw.weight}, frequency: ${kw.frequency})`);
});
console.log('\nTop Recommendations:');
report.topRecommendations.forEach((r, idx) => {
  console.log(`  ${idx+1}. ${r.originalKeyword} → ${r.suggestedWord}`);
  console.log(`     ${r.reason} (Impact: ${r.estimatedImprovement})`);
});
```

## Impact Scoring Explained

### How Impact Scores Are Calculated

**Formula:**
```
Estimated Improvement = Keyword Weight × Suggestion Impact × Context Factor
```

**Example Calculation:**
```
Keyword: "very" 
  - Frequency: 2× in 50 words = 4.0/10
  - Position: Early (9/10)
  - Emphasis: High (9/10)
  - Weight = (4.0 × 0.35) + (9 × 0.30) + (9 × 0.35) = 7.55

Suggestion: "very" → "remarkably"
  - Impact: 8/10 (strong emotional upgrade)
  
Estimated Improvement = 7.55 × 8 / 10 = 6.04 points
```

### Interpretation

- **8.0+**: Transformative change (high priority, medium effort)
- **6.0-8.0**: Significant improvement (high priority, implement soon)
- **4.0-6.0**: Good improvement (medium priority, consider implementing)
- **2.0-4.0**: Helpful improvement (low priority, quick wins)
- **< 2.0**: Minor improvement (very low priority, optional)

## Customization

### Adding Custom Word Mappings

```javascript
const engine = new RefineryEngine();

// Add custom refinements
engine.refinementMap.set('old-word', [
  {
    replacement: 'new-word',
    impact: 8,
    category: 'descriptor',
    reason: 'More specific and powerful',
    difficulty: 'low',
    measurableOutcome: '+30% clarity'
  }
]);
```

### Adding Context Patterns

```javascript
// Add custom context detection
engine.contextPatterns['custom'] = {
  keywords: ['my-keyword', 'another-keyword'],
  focus: 'Custom focus area',
  priority: 'custom-refinement'
};
```

### UI Customization

```javascript
const ui = new RefineryUIComponent('refinery-results', {
  showDifficulty: true,      // Include difficulty badges
  showMetrics: true,         // Include metric dashboard
  enablePreview: true,       // Show before/after
  autoHighlight: true        // Highlight keywords
});
```

## Integration with Chat Parser

The refinery engine works seamlessly with chat parsers:

```javascript
// 1. Parse chat export
const messages = chatParser.parse(chatJSON);

// 2. Extract prompts
const userMessages = messages.filter(m => m.role === 'user');

// 3. Analyze each prompt for refinement
userMessages.forEach(msg => {
  const analysis = engine.analyze(msg.content);
  
  console.log(`Prompt: ${msg.content.substring(0, 50)}...`);
  console.log(`Suggestions: ${analysis.recommendations.length}`);
  console.log(`Top: ${analysis.report.topRecommendations[0]?.suggestedWord}`);
});
```

## Performance Tips

- **For real-time analysis**: Process prompts up to 2000 characters instantly
- **For batch analysis**: Process 100+ prompts in a few seconds
- **Memory usage**: ~2-5 MB per analysis instance
- **DOM rendering**: Takes 200-500ms for full UI render

```javascript
// Batch processing example
const prompts = [...];
const engine = new RefineryEngine();
const results = [];

prompts.forEach(prompt => {
  const analysis = engine.analyze(prompt);
  results.push({
    prompt: prompt,
    recommendations: analysis.recommendations.length,
    topSuggestion: analysis.report.topRecommendations[0]
  });
});
```

## Troubleshooting

### No Recommendations Generated
```javascript
const analysis = engine.analyze(prompt);
if (analysis.recommendations.length === 0) {
  // Prompt may be too short or contain mainly strong words
  console.log('Top keywords:', analysis.weightedKeywords.slice(0, 3));
}
```

### Impact Scores Seem Low
```javascript
// Check for weak words
const weakWords = analysis.weightedKeywords.filter(kw => kw.isWeak);
console.log('Weak words:', weakWords);
// Weak words have higher priority for refinement
```

### Context Not Detected Correctly
```javascript
const analysis = engine.analyze(prompt);
console.log('Detected context:', analysis.contextType);
// Check keywords to understand detection
console.log('Key indicators:', analysis.weightedKeywords.slice(0, 3));
```

## Advanced Features

### Weighted Keyword Analysis
```javascript
const analysis = engine.analyze(prompt);

// Get keywords by weight
const importantKeywords = analysis.weightedKeywords
  .filter(kw => kw.weight > 6)
  .sort((a, b) => b.weight - a.weight);

importantKeywords.forEach(kw => {
  console.log(`${kw.text}: weight=${kw.weight}, frequency=${kw.frequency}`);
});
```

### Priority-Based Recommendation Selection
```javascript
const analysis = engine.analyze(prompt);

// Get by priority
const highPriority = analysis.recommendations
  .filter(r => r.priorityLevel === 'high')
  .slice(0, 3);

const quickWins = analysis.recommendations
  .filter(r => r.difficulty === 'low')
  .slice(0, 5);
```

### Report Export
```javascript
const analysis = engine.analyze(prompt);

// Export as JSON
const json = JSON.stringify(analysis.report, null, 2);

// Export as CSV
const csv = ui.exportAsCSV();

// Save to file
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'refinements.csv';
link.click();
```

## Best Practices

1. **Always check context**: The refinery adapts suggestions based on prompt intent
2. **Prioritize quick wins**: Start with low-difficulty, high-impact changes
3. **Review suggestions**: Not all auto-suggestions may fit your style
4. **Iterate**: Refine once, analyze the new version, refine again
5. **Consider domain**: Some suggestions may not apply in specialized contexts
6. **Test output**: Verify refined prompts produce better AI responses

## Architecture Overview

```
RefineryEngine
├── Keyword Extraction (stop-word filtering)
├── Weight Analysis (frequency, position, emphasis, weakness)
├── Context Detection (action, analysis, learning, etc.)
├── Refinement Generation (150+ word mappings)
├── Impact Scoring (estimated improvement calculation)
└── Report Generation (comprehensive analysis)

RefineryUIComponent
├── Summary Card (overview and metrics)
├── Metrics Dashboard (impact, keywords, weak words)
├── Quick Wins Section (easy high-impact changes)
├── Recommendations List (full ranked suggestions)
├── Before/After Comparison (visual changes)
└── Implementation Guide (phased approach)
```

## Files Included

- `refinery-engine.js` - Core analysis engine (600+ lines)
- `refinery-ui-component.js` - Interactive UI component (500+ lines)
- `refinery-integration-example.js` - Integration and helper methods (400+ lines)
- `REFINERY_GUIDE.md` - This complete guide

## Support & Resources

- See `AI_CHAT_SCANNER_IMPLEMENTATION.md` for full MVP integration
- See `scanner-ui.html` for complete UI implementation
- See example HTML in `refinery-integration-example.js`

---

**Version:** 1.0.0  
**Last Updated:** 2025  
**Author:** TooLoo.ai Development Team
