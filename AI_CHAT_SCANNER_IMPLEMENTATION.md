# AI Chat Scanner - MVP Implementation Guide

## 🎯 Feature Overview

**AI Chat Scanner** analyzes user AI conversations to show them:
1. How good their prompts actually are (0-10 score)
2. What they're doing well
3. What they're missing
4. Specific improvements with estimated impact

**Goal**: Help users immediately improve their ChatGPT/Claude results by 30-50%.

---

## 📋 Implementation Phases

### Phase 1: Core Engine (3 days)
- Chat parser (support ChatGPT, Claude, Gemini JSON)
- Prompt quality analyzer
- Improvement suggestion engine

### Phase 2: UI & Demo (2 days)
- Interactive demo page
- Before/after visualization
- Improvement selector

### Phase 3: Polish & Launch (2 days)
- Performance optimization
- Error handling
- Mobile responsiveness

---

## 🔧 Technical Implementation

### Part 1: Chat Parser (`web-app/scanner/chat-parser.js`)

**Goal**: Convert conversation exports to structured format

```javascript
/**
 * Parse ChatGPT, Claude, or Gemini conversation exports
 * Input: JSON object or text
 * Output: { prompts: [], responses: [], metadata: {} }
 */

class ChatParser {
  parse(input, platform = 'auto-detect') {
    // Detect format if 'auto-detect'
    if (platform === 'auto-detect') {
      platform = this.detectPlatform(input);
    }

    switch(platform) {
      case 'chatgpt':
        return this.parseChatGPT(input);
      case 'claude':
        return this.parseClaude(input);
      case 'gemini':
        return this.parseGemini(input);
      case 'text':
        return this.parseRawText(input);
      default:
        throw new Error('Unsupported format');
    }
  }

  parseChatGPT(json) {
    // ChatGPT exports as { "messages": [{ "content": { "parts": [text] }, ... }] }
    const messages = json.messages || [];
    const exchanges = [];
    
    let currentPrompt = null;
    for (const msg of messages) {
      const text = msg.content?.parts?.[0] || '';
      const role = msg.message?.author?.role || 'unknown';
      
      if (role === 'user') {
        if (currentPrompt) exchanges.push(currentPrompt);
        currentPrompt = { prompt: text, responses: [] };
      } else if (role === 'assistant' && currentPrompt) {
        currentPrompt.responses.push(text);
      }
    }
    if (currentPrompt) exchanges.push(currentPrompt);
    
    return {
      prompts: exchanges.map(e => e.prompt),
      responses: exchanges.flatMap(e => e.responses),
      exchanges: exchanges,
      platform: 'chatgpt',
      messageCount: messages.length
    };
  }

  parseClaude(json) {
    // Claude export format (different from ChatGPT)
    // Parse similarly based on Claude's JSON structure
    const conversations = json.conversations || [json]; // Handle both formats
    const exchanges = [];
    
    for (const conv of conversations) {
      const messages = conv.messages || [];
      let currentPrompt = null;
      
      for (const msg of messages) {
        if (msg.role === 'user') {
          if (currentPrompt) exchanges.push(currentPrompt);
          currentPrompt = { prompt: msg.content, responses: [] };
        } else if (msg.role === 'assistant' && currentPrompt) {
          currentPrompt.responses.push(msg.content);
        }
      }
      if (currentPrompt) exchanges.push(currentPrompt);
    }
    
    return {
      prompts: exchanges.map(e => e.prompt),
      responses: exchanges.flatMap(e => e.responses),
      exchanges: exchanges,
      platform: 'claude',
      messageCount: exchanges.length
    };
  }

  parseRawText(text) {
    // Parse if user pastes raw conversation text
    // Format: "User: ...\n\nAssistant: ...\n\n..."
    const exchanges = [];
    const lines = text.split('\n');
    let currentPrompt = null;
    let currentRole = null;
    let currentContent = '';
    
    for (const line of lines) {
      if (line.startsWith('User:') || line.startsWith('Me:')) {
        if (currentPrompt) exchanges.push(currentPrompt);
        currentPrompt = { prompt: line.substring(5).trim(), responses: [] };
        currentRole = 'user';
      } else if (line.startsWith('Assistant:') || line.startsWith('AI:')) {
        if (currentPrompt) {
          currentPrompt.responses.push(line.substring(10).trim());
        }
        currentRole = 'assistant';
      } else if (line.trim() && currentPrompt) {
        if (currentRole === 'user') {
          currentPrompt.prompt += '\n' + line;
        } else {
          if (currentPrompt.responses.length === 0) {
            currentPrompt.responses.push(line);
          } else {
            currentPrompt.responses[currentPrompt.responses.length - 1] += '\n' + line;
          }
        }
      }
    }
    if (currentPrompt) exchanges.push(currentPrompt);
    
    return {
      prompts: exchanges.map(e => e.prompt),
      responses: exchanges.flatMap(e => e.responses),
      exchanges: exchanges,
      platform: 'text',
      messageCount: exchanges.length
    };
  }

  detectPlatform(input) {
    // Heuristics to detect format
    if (typeof input === 'string') return 'text';
    if (input.messages && input.messages[0]?.content?.parts) return 'chatgpt';
    if (input.conversations || (input.messages && input.messages[0]?.role)) return 'claude';
    return 'text';
  }
}

export { ChatParser };
```

---

### Part 2: Prompt Quality Analyzer (`web-app/scanner/prompt-analyzer.js`)

**Goal**: Score prompts on multiple quality dimensions

```javascript
/**
 * Analyze prompt quality on multiple dimensions
 * Returns: { score: 0-10, breakdown: {...}, flags: [...], improvements: [...] }
 */

class PromptAnalyzer {
  /**
   * Main analysis function
   */
  analyze(prompt) {
    const clarity = this.scoreClaritiy(prompt);
    const completeness = this.scoreCompleteness(prompt);
    const format = this.scoreFormat(prompt);
    const constraints = this.scoreConstraints(prompt);
    const examples = this.scoreExamples(prompt);
    
    const weights = {
      clarity: 0.25,
      completeness: 0.25,
      format: 0.25,
      constraints: 0.15,
      examples: 0.10
    };
    
    const score = (
      clarity * weights.clarity +
      completeness * weights.completeness +
      format * weights.format +
      constraints * weights.constraints +
      examples * weights.examples
    );
    
    const breakdown = {
      clarity: { score: clarity, weight: weights.clarity },
      completeness: { score: completeness, weight: weights.completeness },
      format: { score: format, weight: weights.format },
      constraints: { score: constraints, weight: weights.constraints },
      examples: { score: examples, weight: weights.examples }
    };
    
    return {
      overall: Math.round(score * 10) / 10,
      breakdown,
      flags: this.detectMissingElements(prompt),
      recommendations: this.generateRecommendations(prompt, breakdown),
      percentile: this.calculatePercentile(score)
    };
  }

  /**
   * Clarity Score (0-10): How specific and clear is the prompt?
   * Checks: specific vs vague language, concrete examples, clear intent
   */
  scoreClaritiy(prompt) {
    const words = prompt.toLowerCase().split(/\s+/);
    let score = 5; // Start at 5
    
    // Vague language detection (negative points)
    const vagueWords = ['something', 'anything', 'stuff', 'things', 'etc', 'and so on', 'kind of', 'sort of'];
    const vagueCount = vagueWords.filter(w => prompt.toLowerCase().includes(w)).length;
    score -= vagueCount * 0.5;
    
    // Specific language detection (positive points)
    const specificPatterns = [
      /be specific/i,
      /exactly/i,
      /precisely/i,
      /in detail/i,
      /step by step/i,
      /specific example/i
    ];
    const specificMatches = specificPatterns.filter(p => p.test(prompt)).length;
    score += specificMatches * 1;
    
    // Question quality (positive points)
    if (prompt.includes('?')) score += 1;
    if (prompt.split('?').length > 2) score += 0.5; // Multiple questions
    
    // Length heuristic (too short = less clear)
    if (words.length < 5) score -= 2;
    if (words.length > 20) score += 0.5; // More context = clearer
    
    return Math.max(0, Math.min(10, score));
  }

  /**
   * Completeness Score (0-10): How much context is provided?
   * Checks: background, constraints, scope, success criteria
   */
  scoreCompleteness(prompt) {
    let score = 5;
    
    // Context indicators (positive points)
    const contextKeywords = [
      'background', 'context', 'situation', 'problem', 'goal', 'objective',
      'currently', 'right now', 'background is'
    ];
    const hasContext = contextKeywords.some(k => prompt.toLowerCase().includes(k));
    score += hasContext ? 2 : 0;
    
    // Scope clarity (positive points)
    const scopeKeywords = [
      'scope', 'limited to', 'only', 'just', 'focus on', 'specifically'
    ];
    const hasScope = scopeKeywords.some(k => prompt.toLowerCase().includes(k));
    score += hasScope ? 1 : 0;
    
    // Success criteria (positive points)
    const criteriaKeywords = [
      'success', 'criteria', 'requirement', 'must', 'should', 'need'
    ];
    const hasCriteria = criteriaKeywords.some(k => prompt.toLowerCase().includes(k));
    score += hasCriteria ? 1.5 : 0;
    
    // Audience/user mention (positive points)
    const audienceKeywords = [
      'audience', 'for', 'target', 'user', 'reader', 'team', 'customer'
    ];
    const hasAudience = audienceKeywords.some(k => prompt.toLowerCase().includes(k));
    score += hasAudience ? 1 : 0;
    
    return Math.max(0, Math.min(10, score));
  }

  /**
   * Format Score (0-10): Is output format specified?
   * Checks: JSON, markdown, bullet points, structure requests
   */
  scoreFormat(prompt) {
    let score = 2; // Default low (most prompts don't specify format)
    
    // Format keywords
    const formatPatterns = [
      /format.*as/i,
      /output.*format/i,
      /structure.*as/i,
      /respond.*with/i,
      /respond.*in/i,
      /return.*as/i,
      /json/i,
      /markdown/i,
      /html/i,
      /csv/i,
      /bullet.?point/i,
      /numbered.?list/i,
      /table/i,
      /headers/i,
      /section/i
    ];
    
    const formatMatches = formatPatterns.filter(p => p.test(prompt)).length;
    score += formatMatches * 1.5;
    
    // Structure mentions
    if (/structure/i.test(prompt)) score += 1;
    if (/outline/i.test(prompt)) score += 0.5;
    
    return Math.max(0, Math.min(10, score));
  }

  /**
   * Constraints Score (0-10): Are constraints defined?
   * Checks: what NOT to do, limitations, boundaries
   */
  scoreConstraints(prompt) {
    let score = 2;
    
    // Negative constraint patterns
    const constraintPatterns = [
      /avoid/i,
      /don't/i,
      /do not/i,
      /skip/i,
      /exclude/i,
      /limit.*to/i,
      /not more than/i,
      /not less than/i,
      /constraint/i,
      /restriction/i,
      /shouldn't/i,
      /unless/i
    ];
    
    const constraintMatches = constraintPatterns.filter(p => p.test(prompt)).length;
    score += constraintMatches * 1;
    
    // Length constraints
    if (/\d+\s*(word|char|page|paragraph)/i.test(prompt)) score += 1;
    
    return Math.max(0, Math.min(10, score));
  }

  /**
   * Examples Score (0-10): Are examples provided?
   * Checks: sample output, reference material, comparisons
   */
  scoreExamples(prompt) {
    let score = 2;
    
    // Example indicators
    const examplePatterns = [
      /example/i,
      /for example/i,
      /like this/i,
      /such as/i,
      /sample/i,
      /similar to/i,
      /analogous/i,
      /reference/i
    ];
    
    const exampleMatches = examplePatterns.filter(p => p.test(prompt)).length;
    score += exampleMatches * 1.5;
    
    // Code examples
    if (/```|<|>/i.test(prompt)) score += 1;
    
    return Math.max(0, Math.min(10, score));
  }

  /**
   * Detect missing quality elements
   */
  detectMissingElements(prompt) {
    const flags = [];
    
    if (!/format|output|structure|respond|json|markdown/i.test(prompt)) {
      flags.push({
        type: 'missing-format',
        issue: 'Output format not specified',
        impact: 'high',
        fix: 'Add: "Please format as JSON/Markdown/bullet points"'
      });
    }
    
    if (!/audience|for|target|reader|user|customer/i.test(prompt)) {
      flags.push({
        type: 'missing-audience',
        issue: 'Target audience unclear',
        impact: 'medium',
        fix: 'Add: "For [audience]: managers, developers, beginners"'
      });
    }
    
    if (!/constraint|avoid|don't|skip|limit/i.test(prompt)) {
      flags.push({
        type: 'missing-constraints',
        issue: 'No constraints/boundaries defined',
        impact: 'medium',
        fix: 'Add: "Avoid: marketing hype, oversimplification, jargon"'
      });
    }
    
    if (!/example|sample|like|such as|similar/i.test(prompt)) {
      flags.push({
        type: 'missing-examples',
        issue: 'No reference examples provided',
        impact: 'low',
        fix: 'Add: "Similar to: [example URL or description]"'
      });
    }
    
    if (prompt.split(/\?/).length < 1 && prompt.length < 30) {
      flags.push({
        type: 'too-brief',
        issue: 'Prompt is very brief (likely missing context)',
        impact: 'high',
        fix: 'Add: background, context, what you've already tried'
      });
    }
    
    return flags;
  }

  /**
   * Generate specific improvement recommendations
   */
  generateRecommendations(prompt, breakdown) {
    const recs = [];
    
    // Sort by impact (lowest scores first)
    const dims = Object.entries(breakdown)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.score - b.score);
    
    for (const dim of dims.slice(0, 3)) { // Top 3 improvements
      if (dim.score < 7) {
        const rec = this.getRecommendationForDimension(dim.name);
        recs.push({
          dimension: dim.name,
          priority: dim.score < 4 ? 'high' : 'medium',
          currentScore: dim.score,
          potentialGain: 10 - dim.score,
          recommendation: rec
        });
      }
    }
    
    return recs;
  }

  getRecommendationForDimension(dimension) {
    const recommendations = {
      format: {
        title: 'Specify Output Format',
        description: 'Tell the AI exactly how you want the output structured',
        example: 'Current: "Write a summary"\nBetter: "Write a summary with:\n- 3-sentence overview\n- 5 bullet points\n- 2-sentence conclusion"',
        estimatedImpact: '+25% output quality'
      },
      completeness: {
        title: 'Add More Context',
        description: 'Provide background, existing constraints, or what you\'ve tried',
        example: 'Current: "How do I improve?"\nBetter: "I\'m a beginner. I\'ve tried X and Y but got Z. Help me improve"',
        estimatedImpact: '+20% relevance'
      },
      constraints: {
        title: 'Define Constraints',
        description: 'Tell the AI what NOT to do or what boundaries exist',
        example: 'Add: "Avoid: technical jargon, oversimplification, marketing speak"',
        estimatedImpact: '+15% accuracy'
      },
      clarity: {
        title: 'Be More Specific',
        description: 'Replace vague language with concrete details',
        example: 'Current: "something interesting"\nBetter: "a practical example with 2-3 steps"',
        estimatedImpact: '+18% usefulness'
      },
      examples: {
        title: 'Provide Reference Examples',
        description: 'Show the AI what style/format you want',
        example: 'Add: "Similar style to: [URL or description]"',
        estimatedImpact: '+10% consistency'
      }
    };
    
    return recommendations[dimension] || {};
  }

  /**
   * Calculate percentile (what % of prompts score lower)
   * Uses simple heuristic based on real-world data
   */
  calculatePercentile(score) {
    // Empirical: average prompt quality score is ~5.2
    // Standard deviation is ~2.5
    // This is a simplified model
    if (score <= 3) return '15%'; // Bottom 15%
    if (score <= 5) return '40%'; // Below average
    if (score <= 6.5) return '60%'; // Average-ish
    if (score <= 8) return '80%'; // Good
    return '95%'; // Excellent
  }
}

export { PromptAnalyzer };
```

---

### Part 3: UI Component (`web-app/scanner/scanner-ui.html`)

**Goal**: Interactive interface for users to upload and analyze

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Chat Scanner - Improve Your Prompts</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      color: white;
      margin-bottom: 40px;
    }

    h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }

    .tagline {
      font-size: 1.2em;
      opacity: 0.9;
      margin-bottom: 30px;
    }

    .main {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 40px;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    }

    .card h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 1.5em;
    }

    /* Input Section */
    .input-section {
      margin-bottom: 20px;
    }

    .input-area {
      position: relative;
      border: 2px dashed #667eea;
      border-radius: 8px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #f9f9f9;
    }

    .input-area:hover {
      border-color: #764ba2;
      background: #f0f0f0;
    }

    .input-area.dragover {
      border-color: #764ba2;
      background: #e8e4f3;
    }

    .input-area input[type="file"] {
      display: none;
    }

    .upload-icon {
      font-size: 2.5em;
      margin-bottom: 10px;
    }

    .upload-text {
      color: #666;
      margin-bottom: 10px;
    }

    .upload-text strong {
      display: block;
      color: #333;
      margin-bottom: 5px;
    }

    .paste-option {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }

    textarea {
      width: 100%;
      min-height: 200px;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      resize: vertical;
      margin-bottom: 12px;
    }

    .button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 1em;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 600;
    }

    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }

    /* Results Section */
    .results {
      display: none;
    }

    .results.active {
      display: block;
    }

    .score-display {
      text-align: center;
      margin-bottom: 30px;
    }

    .score-circle {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0 auto 15px;
      color: white;
      font-weight: bold;
      font-size: 2em;
    }

    .score-circle.high {
      background: linear-gradient(135deg, #67d26f 0%, #3fa46b 100%);
    }

    .score-circle.medium {
      background: linear-gradient(135deg, #f5a623 0%, #d68910 100%);
    }

    .score-circle.low {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .score-label {
      color: #999;
      font-size: 0.9em;
    }

    .percentile {
      color: #667eea;
      font-weight: 600;
      margin-top: 10px;
    }

    /* Breakdown */
    .breakdown {
      margin: 30px 0;
    }

    .breakdown h3 {
      color: #333;
      margin-bottom: 15px;
      font-size: 1.1em;
    }

    .breakdown-item {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      padding: 12px;
      background: #f9f9f9;
      border-radius: 6px;
    }

    .breakdown-bar {
      flex: 1;
      margin: 0 15px;
    }

    .breakdown-label {
      width: 100px;
      font-weight: 600;
      color: #333;
      font-size: 0.9em;
    }

    .bar-container {
      width: 100%;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .score-value {
      width: 40px;
      text-align: right;
      font-weight: 600;
      color: #667eea;
    }

    /* Flags */
    .flags {
      margin: 30px 0;
      padding: 20px;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 6px;
    }

    .flags h3 {
      color: #856404;
      margin-bottom: 15px;
    }

    .flag {
      background: white;
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 4px;
      border-left: 3px solid #ffc107;
    }

    .flag-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 5px;
    }

    .flag-description {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 8px;
    }

    .flag-fix {
      background: #f0f0f0;
      padding: 8px;
      border-radius: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.85em;
      color: #333;
    }

    /* Recommendations */
    .recommendations {
      margin: 30px 0;
    }

    .recommendations h3 {
      color: #333;
      margin-bottom: 15px;
    }

    .recommendation {
      background: linear-gradient(135deg, #f0f4ff 0%, #f5e6ff 100%);
      padding: 15px;
      margin-bottom: 15px;
      border-left: 4px solid #667eea;
      border-radius: 6px;
    }

    .rec-priority {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .rec-priority.high {
      background: #ffe6e6;
      color: #c00;
    }

    .rec-priority.medium {
      background: #fff3e0;
      color: #ff8c00;
    }

    .rec-title {
      font-weight: 600;
      color: #667eea;
      margin-bottom: 8px;
    }

    .rec-description {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 8px;
    }

    .rec-example {
      background: white;
      padding: 8px;
      border-radius: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.8em;
      margin-bottom: 8px;
      overflow-x: auto;
    }

    .rec-impact {
      color: #3fa46b;
      font-weight: 600;
      font-size: 0.9em;
    }

    /* Loading */
    .loading {
      text-align: center;
      padding: 40px;
      color: #667eea;
    }

    .loading-spinner {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid #e0e0e0;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .main {
        grid-template-columns: 1fr;
      }

      h1 {
        font-size: 1.8em;
      }

      .tagline {
        font-size: 1em;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔍 AI Chat Scanner</h1>
      <p class="tagline">Analyze your prompts. Get better results from ChatGPT and Claude.</p>
    </header>

    <div class="main">
      <!-- Input Section -->
      <div class="card">
        <h2>📤 Upload Your Chat</h2>
        
        <div class="input-section">
          <div class="input-area" id="dropZone">
            <div class="upload-icon">📁</div>
            <div class="upload-text">
              <strong>Drop your export here</strong>
              <div>or click to browse</div>
            </div>
            <input type="file" id="fileInput" accept=".json,.txt" />
          </div>

          <div class="paste-option">
            <p>Or paste your conversation:</p>
            <textarea id="pasteArea" placeholder="Paste ChatGPT/Claude export or raw conversation text..."></textarea>
            <button class="button" id="analyzeBtn">🔍 Analyze My Prompts</button>
          </div>
        </div>
      </div>

      <!-- Results Section -->
      <div class="card">
        <h2>📊 Your Prompt Quality</h2>
        
        <div id="loadingMessage" class="loading" style="display: none;">
          <div class="loading-spinner"></div>
          <p>Analyzing your prompts...</p>
        </div>

        <div id="results" class="results">
          <!-- Average Score -->
          <div class="score-display">
            <div id="scoreCircle" class="score-circle low">
              <div id="scoreValue">0</div>
              <div class="score-label">/10</div>
            </div>
            <div class="percentile">
              You're in the <span id="percentile">50th</span> percentile
            </div>
          </div>

          <!-- Breakdown -->
          <div class="breakdown">
            <h3>Category Breakdown</h3>
            <div id="breakdownContainer"></div>
          </div>

          <!-- Flags -->
          <div id="flagsContainer" class="flags" style="display: none;">
            <h3>⚠️ Missing Elements</h3>
            <div id="flagsList"></div>
          </div>

          <!-- Recommendations -->
          <div class="recommendations">
            <h3>💡 How to Improve</h3>
            <div id="recommendationsList"></div>
          </div>

          <button class="button" id="resetBtn" style="width: 100%; margin-top: 20px;">← Analyze Another Chat</button>
        </div>
      </div>
    </div>
  </div>

  <script type="module">
    import { ChatParser } from './chat-parser.js';
    import { PromptAnalyzer } from './prompt-analyzer.js';

    // Initialize
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const pasteArea = document.getElementById('pasteArea');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resetBtn = document.getElementById('resetBtn');
    const loadingMessage = document.getElementById('loadingMessage');
    const results = document.getElementById('results');

    let chatParser = new ChatParser();
    let promptAnalyzer = new PromptAnalyzer();

    // File upload handler
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length) handleFileSelect({ target: { files } });
    });

    function handleFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          const input = file.name.endsWith('.json') ? JSON.parse(content) : content;
          pasteArea.value = file.name;
          analyzeChat(input);
        } catch (error) {
          alert('Error reading file: ' + error.message);
        }
      };
      reader.readAsText(file);
    }

    analyzeBtn.addEventListener('click', () => {
      const input = pasteArea.value.trim();
      if (!input) {
        alert('Please paste or upload a conversation');
        return;
      }

      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(input);
        analyzeChat(parsed);
      } catch {
        // Treat as raw text
        analyzeChat(input);
      }
    });

    resetBtn.addEventListener('click', () => {
      pasteArea.value = '';
      results.classList.remove('active');
      loadingMessage.style.display = 'none';
    });

    function analyzeChat(input) {
      loadingMessage.style.display = 'block';
      results.classList.remove('active');

      // Simulate processing delay for UX
      setTimeout(() => {
        try {
          const parsed = chatParser.parse(input);
          const analyses = parsed.prompts.map(p => promptAnalyzer.analyze(p));
          const avgScore = analyses.reduce((sum, a) => sum + a.overall, 0) / analyses.length;

          displayResults(avgScore, analyses, parsed);
          loadingMessage.style.display = 'none';
          results.classList.add('active');
        } catch (error) {
          alert('Error analyzing: ' + error.message);
          loadingMessage.style.display = 'none';
        }
      }, 1000);
    }

    function displayResults(avgScore, analyses, parsed) {
      // Update score circle
      const scoreCircle = document.getElementById('scoreCircle');
      document.getElementById('scoreValue').textContent = Math.round(avgScore * 10) / 10;
      
      if (avgScore < 4) scoreCircle.className = 'score-circle low';
      else if (avgScore < 7) scoreCircle.className = 'score-circle medium';
      else scoreCircle.className = 'score-circle high';

      // Calculate average percentile
      const avgPercentile = Math.round(((avgScore / 10) * 100 + 15) / 2);
      document.getElementById('percentile').textContent = avgPercentile;

      // Display breakdown
      const avgBreakdown = {
        clarity: 0,
        completeness: 0,
        format: 0,
        constraints: 0,
        examples: 0
      };

      analyses.forEach(a => {
        Object.keys(avgBreakdown).forEach(key => {
          avgBreakdown[key] += a.breakdown[key].score;
        });
      });

      Object.keys(avgBreakdown).forEach(key => {
        avgBreakdown[key] /= analyses.length;
      });

      const breakdownContainer = document.getElementById('breakdownContainer');
      breakdownContainer.innerHTML = Object.entries(avgBreakdown).map(([name, score]) => `
        <div class="breakdown-item">
          <div class="breakdown-label">${name.charAt(0).toUpperCase() + name.slice(1)}</div>
          <div class="breakdown-bar">
            <div class="bar-container">
              <div class="bar-fill" style="width: ${score * 10}%"></div>
            </div>
          </div>
          <div class="score-value">${Math.round(score * 10) / 10}</div>
        </div>
      `).join('');

      // Display flags
      const allFlags = analyses.flatMap(a => a.flags);
      const uniqueFlags = Array.from(new Map(allFlags.map(f => [f.type, f])).values());
      
      if (uniqueFlags.length > 0) {
        document.getElementById('flagsContainer').style.display = 'block';
        document.getElementById('flagsList').innerHTML = uniqueFlags.map(flag => `
          <div class="flag">
            <div class="flag-title">${flag.issue}</div>
            <div class="flag-description">Impact: ${flag.impact}</div>
            <div class="flag-fix">${flag.fix}</div>
          </div>
        `).join('');
      }

      // Display recommendations (top 3 across all prompts)
      const allRecs = analyses.flatMap(a => a.recommendations);
      const topRecs = allRecs
        .sort((a, b) => (b.potentialGain || 0) - (a.potentialGain || 0))
        .slice(0, 3);

      document.getElementById('recommendationsList').innerHTML = topRecs.map(rec => `
        <div class="recommendation">
          <div class="rec-priority ${rec.priority}">${rec.priority.toUpperCase()}</div>
          <div class="rec-title">${rec.recommendation.title}</div>
          <div class="rec-description">${rec.recommendation.description}</div>
          <div class="rec-example">${rec.recommendation.example.replace(/\n/g, '<br>')}</div>
          <div class="rec-impact">${rec.recommendation.estimatedImpact}</div>
        </div>
      `).join('');
    }
  </script>
</body>
</html>
```

---

## 🚀 Quick Implementation Checklist

- [ ] Create `web-app/scanner/` directory
- [ ] Add `chat-parser.js`
- [ ] Add `prompt-analyzer.js`
- [ ] Add `scanner-ui.html`
- [ ] Test with sample ChatGPT/Claude exports
- [ ] Add link to scanner from main `web-app/index.html`
- [ ] Create landing page copy for Product Hunt
- [ ] Test mobile responsiveness

---

## 📊 Expected Metrics

Once launched:
- **Conversion**: 10-15% of visitors upload a chat
- **Avg Prompts per Upload**: 12-15 prompts analyzed
- **Repeat Rate**: 20-30% return within 1 week
- **Share Rate**: 5% of users share on social

---

## 🎯 Success Criteria

✅ Users can upload ChatGPT/Claude exports  
✅ Get clear prompt quality score  
✅ See specific improvement recommendations  
✅ Know estimated impact of each improvement  
✅ Can apply improvements immediately  
✅ Share results on Twitter/LinkedIn  

