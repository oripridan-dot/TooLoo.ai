# AI Chat Auto-Analyzer Setup Complete! 🎉

## How to Use

### 1. Add Your API Keys (Optional for Enhanced Insights)

Create a `.env` file in your project root:

```env
ANTHROPIC_API_KEY=your_claude_key_here
OPENAI_API_KEY=your_openai_key_here
```

### 2. Export Your Conversations

**For Claude:**

1. Go to your Claude conversations
2. Copy conversation text or export JSON (if available)
3. Save files to: `./ai-chat-analysis/claude-exports/`

**For ChatGPT:**

1. Go to ChatGPT Settings → Data Controls → Export Data
2. Download your conversations
3. Extract and save JSON files to: `./ai-chat-analysis/chatgpt-exports/`

### 3. Run Analysis

```javascript
import { AIchatAutoAnalyzer } from "./scripts/ai-chat-auto-analyzer.js";

const analyzer = new AIchatAutoAnalyzer({
  analysisInterval: "daily",
  enhancedInsights: true,
  autoReport: true,
});

const results = await analyzer.runAutoAnalysis();
console.log(results);
```

### 4. View Results

- **Reports**: `./ai-chat-analysis/reports/`
- **Individual Analysis**: `./ai-chat-analysis/insights/`
- **Conversation Copies**: `./ai-chat-analysis/conversations/`

## Example Analysis Ready!

Run the analyzer now to see it process the example conversations we created.

## What You'll Get

- 🧠 **Cognitive Profile**: Your decision-making patterns and communication style
- 📊 **Behavioral Analysis**: Repeated patterns across conversations
- 💡 **AI-Enhanced Insights**: Deep analysis using Claude/ChatGPT to understand your conversation style
- 📈 **Trend Tracking**: How your communication evolves over time
- 📋 **Actionable Reports**: Markdown reports with recommendations

## Privacy Note

All analysis happens locally on your machine. Your conversations never leave your computer unless you explicitly enable cloud features.

Ready to analyze your AI conversations? Run the analyzer and discover your conversational intelligence! 🚀
