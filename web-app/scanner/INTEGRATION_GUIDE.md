# 🎯 AI Chat Scanner - Integration & Usage Guide

## Overview

The **AI Chat Scanner** is a complete prompt analysis and refinement system that:
1. **Analyzes** ChatGPT/Claude prompts for quality (clarity, completeness, format, constraints, examples)
2. **Detects** weighted keywords using a sophisticated scoring algorithm
3. **Suggests** context-aware refinements for maximum impact
4. **Visualizes** measurable improvements before applying changes
5. **Exports** comprehensive reports for sharing & iteration

## Architecture

```
Scanner Interface (index.html)
  ↓
Quality Analysis (prompt-analyzer.js)
  - Scores 5 dimensions
  - Identifies strengths/weaknesses
  ↓
Refinery Engine (refinery-engine.js)
  - Extracts significant keywords
  - Weights by: frequency (35%) + position (30%) + emphasis (35%)
  - Detects context: action/analysis/learning/strategy/problem-solving
  - Generates context-aware refinement suggestions
  ↓
Integration Layer (scanner-refinery-integration.js)
  - Combines quality + refinery analyses
  - Calculates combined impact scores
  - Generates improvement recommendations
  ↓
UI Rendering (index.html + refinery-ui.js)
  - Interactive keyword visualization
  - Refinement selection & preview
  - Before/after comparison
  - Export functionality
```

## Files & Their Roles

### Core Files

#### `index.html` - Main Interface
**Purpose**: Beautiful, interactive UI for the scanner
**Features**:
- Prompt input with file upload (ChatGPT JSON exports)
- Real-time analysis with loading indicator
- 4-tab interface: Keywords | Refinements | Impact | Comparison
- Score visualization (quality + refinery impact)
- Export functionality (JSON, copy to clipboard)

**Usage**:
```bash
# Open in browser
open /workspaces/TooLoo.ai/web-app/scanner/index.html
```

#### `prompt-analyzer.js` - Quality Scoring
**Purpose**: Scores prompts on 5 key dimensions
**Dimensions**:
- **Clarity** (0-2): How clear is the intent?
- **Completeness** (0-2): Does it have all needed info?
- **Format** (0-2): Is the format specified?
- **Constraints** (0-2): Are limitations defined?
- **Examples** (0-2): Are examples provided?

**API**:
```javascript
const analyzer = new PromptAnalyzer();
const score = analyzer.analyze("Your prompt here");
// Returns: { overall: 6, breakdown: {...}, strengths: [...], weaknesses: [...] }
```

#### `refinery-engine.js` - Keyword Detection & Refinement
**Purpose**: Detects weighted keywords and suggests replacements
**Main Method**: `analyze(prompt)`

**Algorithm**:
1. Extract significant keywords (excludes common words, 3+ characters)
2. Weight each keyword by:
   - **Frequency**: How often it appears (35% weight)
   - **Position**: How early in the prompt (30% weight)
   - **Emphasis**: Capitalization, punctuation (35% weight)
3. Detect context type (action/analysis/learning/strategy/problem-solving)
4. Generate context-specific refinement suggestions

**Returns**:
```javascript
{
  weightedKeywords: [
    { text: "analyze", weight: 8.5, frequency: 4, position: 12, emphasis: 0.8 },
    ...
  ],
  contextType: "analysis",
  refinements: [
    {
      originalKeyword: "analyze",
      suggestedWord: "examine",
      reason: "More specific for analytical context",
      impact: 0.35
    },
    ...
  ],
  impactScore: 42
}
```

#### `refinery-ui.js` - Interactive Visualization
**Purpose**: Displays refinery results with beautiful UI
**Components**:
- Keyword tag cloud with weight indicators
- Refinement cards with before/after words
- Impact visualization (before/after scores)
- Side-by-side prompt comparison

#### `scanner-refinery-integration.js` - Orchestration Layer
**Purpose**: Combines quality + refinery analyses, generates recommendations
**Key Classes**: `ScannerWithRefinery`

## Usage Workflows

### Workflow 1: Quick Prompt Analysis

```javascript
const scanner = new ScannerWithRefinery();
const analysis = await scanner.analyzePromptWithRefinery(
  "Write me a blog post"
);

// Access results:
console.log(analysis.qualityAnalysis.overall); // Quality score
console.log(analysis.refineryAnalysis.weightedKeywords); // Top keywords
console.log(analysis.refineryAnalysis.refinements); // Suggested changes
```

### Workflow 2: Apply Specific Refinements

```javascript
// Select which refinements to apply
const selected = ["write", "blog", "post"];
const result = scanner.applyRefinements(
  originalPrompt,
  refineryAnalysis,
  selected
);

console.log(result.improved); // Refined prompt
console.log(result.appliedRefinements); // What was changed
```

### Workflow 3: Process ChatGPT Conversation

```javascript
const conversation = [
  { role: "user", content: "First prompt" },
  { role: "assistant", content: "..." },
  { role: "user", content: "Second prompt" }
];

const results = await scanner.processConversation(conversation);
// Analyzes all user messages, returns individual + conversation summary
```

### Workflow 4: Generate Comprehensive Report

```javascript
const report = scanner.exportCombinedReport(
  originalPrompt,
  qualityAnalysis,
  refineryAnalysis
);

// report includes:
// - Summary with before/after prompts
// - Quality dimensions breakdown
// - Top weighted keywords
// - Top refinement suggestions
// - Estimated impact percentage
```

## How Weighted Keywords Work

### Scoring Formula

Each keyword receives a **weight score** (0-10) calculated as:

```
Weight = (Frequency × 0.35) + (Position × 0.30) + (Emphasis × 0.35)
```

#### Example: "analyze" appears in prompt "Please analyze the data carefully"

1. **Frequency Score** (0-10)
   - Appears 1 time in prompt with ~20 words = 10% of words
   - Score: 1.0

2. **Position Score** (0-10)
   - Appears at position 2 (early = higher)
   - Score: 8.5

3. **Emphasis Score** (0-10)
   - Not capitalized, no punctuation emphasis
   - Score: 4.0

**Final Weight**: (1.0 × 0.35) + (8.5 × 0.30) + (4.0 × 0.35) = **5.15**

### Why This Matters

- **High weight** = Important keyword that appears early/often → keep or strengthen
- **Low weight** = Weak keyword that could be replaced → refinement candidate

## Refinement Types

### By Context

The engine detects **context type** and suggests appropriate refinements:

#### Action Context
```
Original: "Do the analysis"
Refined: "Conduct the comprehensive analysis"
Reason: More decisive language for action prompts
```

#### Analysis Context
```
Original: "Look at the data"
Refined: "Examine the quantitative data"
Reason: More precise for analytical work
```

#### Learning Context
```
Original: "Tell me about"
Refined: "Explain the fundamental principles of"
Reason: More structured for learning
```

#### Problem-Solving Context
```
Original: "Fix the issue"
Refined: "Resolve the critical technical issue"
Reason: More specific problem definition
```

#### Strategy Context
```
Original: "Make a plan"
Refined: "Develop a strategic roadmap"
Reason: More sophisticated for strategic planning
```

## Impact Calculation

### Estimated Improvement

```javascript
Before Score:  5/10 (50%)
After Score:   8/10 (80%)
Improvement:   +60%
```

Calculated by:
1. Quality refinements potential: +30%
2. Keyword refinements potential: Up to +50% (based on impactScore)
3. Combined: Min(1.0, beforeScore/10 + combined_gain)

## Running the Scanner

### Option 1: Direct Browser Access

```bash
# Serve the scanner directory
cd /workspaces/TooLoo.ai/web-app/scanner
python3 -m http.server 8000

# Open browser
open http://localhost:8000/index.html
```

### Option 2: Through Web Server

```bash
# Via TooLoo.ai main server (runs on port 3000)
npm run dev

# Access at http://localhost:3000/web-app/scanner/
```

## Testing the System

### Test Prompt 1: Weak Prompt
```
Write a blog post
```
**Expected**:
- Low quality score (3-4/10)
- Few keywords (too short)
- Many refinement opportunities
- High improvement potential

### Test Prompt 2: Good Prompt
```
Create a detailed technical blog post for software engineers about microservices architecture. 
Include: introduction (200 words), 4 sections (300 words each), practical code examples, 
and conclusion with actionable takeaways. Avoid: marketing hype, oversimplification, 
and non-technical jargon.
```
**Expected**:
- High quality score (7-8/10)
- Rich keyword set (15+ terms)
- Few high-impact refinements
- Smaller improvement potential

### Test Prompt 3: Vague Prompt
```
Do something useful with the information to make it better and more clear for people
```
**Expected**:
- Medium quality score (4-5/10)
- Many vague keywords
- High refinement count
- Keywords like: "something", "information", "useful" → "useful" is weak

## Customization Points

### 1. Adjust Keyword Weighting
In `refinery-engine.js`, modify weights in `analyzeWeights()`:
```javascript
// Current: frequency 35%, position 30%, emphasis 35%
// Try: frequency 40%, position 25%, emphasis 35%
```

### 2. Add New Refinement Rules
In `refinery-engine.js`, extend `generateRefinements()`:
```javascript
// Add context-specific patterns
generateRefinements(weightedKeywords, contextType, prompt) {
  const refinements = [...]; // existing
  
  // Add custom rule: detect passive voice
  if (prompt.includes(" is ") && prompt.includes(" by ")) {
    refinements.push({
      originalKeyword: "passive-construction",
      suggestedWord: "active-construction",
      reason: "Use active voice for clarity",
      impact: 0.4
    });
  }
}
```

### 3. Change Quality Dimensions
In `prompt-analyzer.js`, modify the 5 dimensions or scoring ranges.

### 4. Customize UI Styling
In `index.html`, modify CSS variables:
```css
--primary-color: #667eea; /* Change gradient start */
--secondary-color: #764ba2; /* Change gradient end */
```

## Success Metrics

### For Users
- ✅ Sees quality score immediately
- ✅ Understands which keywords are "weighted"
- ✅ Sees specific refinement suggestions with reasons
- ✅ Can preview before/after comparison
- ✅ Knows estimated impact improvement

### For the App
- 📊 Measurable improvement shown (before/after %)
- 📊 Action-oriented refinements (not generic advice)
- 📊 Context-aware suggestions (differs by prompt type)
- 📊 Exportable reports for record keeping
- 📊 Fast analysis (< 100ms for typical prompts)

## Troubleshooting

### Issue: "No keywords detected"
**Cause**: Prompt too short or all words are common
**Fix**: Try a longer, more descriptive prompt

### Issue: "No refinements available"
**Cause**: Prompt already very well-written
**Fix**: This is actually a success! System correctly identified good prompts

### Issue: Keywords don't seem important
**Cause**: Weighting algorithm may need tuning for your use case
**Fix**: Adjust frequency/position/emphasis weights in `refinery-engine.js`

### Issue: Refinements are too aggressive
**Cause**: Impact threshold may be too low
**Fix**: In `scanner-refinery-integration.js`, increase the impact threshold from 0.4

## Next Steps

1. **Deploy to production**: Serve `index.html` from main web server
2. **Add analytics**: Track most common issues users encounter
3. **Build suggestions library**: Crowdsource refinement improvements
4. **Create templates**: Pre-built refinement packages for specific domains
5. **Add history**: Save and compare analyses over time
6. **Integrate with API**: Allow programmatic access to the scanner

## API Reference

### PromptAnalyzer

```javascript
new PromptAnalyzer()
  .analyze(prompt: string): {
    overall: number,           // 0-10 score
    breakdown: { clarity, completeness, format, constraints, examples },
    strengths: string[],
    weaknesses: string[]
  }
```

### RefineryEngine

```javascript
new RefineryEngine()
  .analyze(prompt: string): {
    weightedKeywords: { text, weight, frequency, position, emphasis }[],
    contextType: string,
    refinements: { originalKeyword, suggestedWord, reason, impact }[],
    impactScore: number
  }
```

### ScannerWithRefinery

```javascript
new ScannerWithRefinery()
  .analyzePromptWithRefinery(prompt: string): {
    originalPrompt: string,
    qualityAnalysis: object,
    refineryAnalysis: object,
    combinedReport: object,
    actions: { applyRefinements, generateImproved, exportReport }
  }
```

---

**Ready to use!** Open `index.html` in your browser and start analyzing prompts. 🚀
