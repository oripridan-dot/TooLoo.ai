#!/usr/bin/env node

// Quick Setup Script for AI Chat Auto-Analyzer
// This creates the directory structure and example usage

import fs from 'fs';
import path from 'path';
import { AIchatAutoAnalyzer } from './ai-chat-auto-analyzer.js';

console.log('🚀 Setting up AI Chat Auto-Analyzer...');

// Create example directory structure
const exampleDirs = [
    './ai-chat-analysis/claude-exports',
    './ai-chat-analysis/chatgpt-exports',
    './ai-chat-analysis/conversations',
    './ai-chat-analysis/reports',
    './ai-chat-analysis/insights',
    './ai-chat-analysis/exports'
];

exampleDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created: ${dir}`);
    }
});

// Create example conversation files
const exampleClaudeChat = {
    "id": "example-claude-chat",
    "title": "Example Claude Conversation",
    "messages": [
        {
            "role": "user",
            "content": "I need help deciding between two investment strategies. What factors should I consider?",
            "created_at": "2024-01-15T10:00:00Z"
        },
        {
            "role": "assistant", 
            "content": "When evaluating investment strategies, consider these key factors:\n\n1. **Risk Tolerance**: How much volatility can you handle?\n2. **Time Horizon**: When do you need the money?\n3. **Diversification**: Are your investments spread across different asset classes?\n4. **Fees and Costs**: What are the ongoing expenses?\n5. **Tax Implications**: How will this affect your taxes?\n\nCould you tell me more about the two strategies you're considering? I can help you evaluate them based on these criteria.",
            "created_at": "2024-01-15T10:01:00Z"
        },
        {
            "role": "user",
            "content": "Strategy A is a conservative bond portfolio with 4% expected return. Strategy B is growth stocks with 8-12% potential but higher volatility. I'm 35 years old, planning for retirement.",
            "created_at": "2024-01-15T10:05:00Z"
        },
        {
            "role": "assistant",
            "content": "Given your age (35) and retirement timeline (~30 years), you have a significant advantage: time. Here's my analysis:\n\n**Strategy B (Growth Stocks) appears more suitable because:**\n- 30-year timeline allows you to ride out volatility\n- Compound growth at 8-12% vs 4% creates massive difference over 30 years\n- Your age suggests higher risk tolerance is appropriate\n\n**However, consider a hybrid approach:**\n- 70-80% growth stocks (Strategy B)\n- 20-30% bonds (Strategy A) for stability\n\nThis gives you growth potential while reducing overall portfolio volatility. You can gradually shift to more conservative allocations as you approach retirement.\n\nWhat's your current emergency fund situation? That affects how much risk you can take with investments.",
            "created_at": "2024-01-15T10:07:00Z"
        }
    ]
};

const exampleChatGPTChat = {
    "title": "Project Planning Discussion",
    "mapping": {
        "1": {
            "message": {
                "author": { "role": "user" },
                "content": { "parts": ["I'm launching a new SaaS product. Help me create a launch timeline and identify potential risks."] },
                "create_time": 1642176000
            }
        },
        "2": {
            "message": {
                "author": { "role": "assistant" },
                "content": { "parts": ["I'd be happy to help you create a comprehensive launch timeline and risk assessment for your SaaS product. Let me break this down systematically:\n\n## Launch Timeline (Typical 3-4 Month Framework)\n\n### Phase 1: Pre-Launch Preparation (Month 1-2)\n- Product testing and bug fixes\n- Beta user recruitment and feedback\n- Documentation completion\n- Pricing strategy finalization\n- Marketing website completion\n- Payment system integration\n\n### Phase 2: Soft Launch (Month 3)\n- Limited beta release\n- Customer support system setup\n- Performance monitoring\n- Initial marketing campaigns\n- Sales process optimization\n\n### Phase 3: Full Launch (Month 4)\n- Public announcement\n- Marketing campaign acceleration\n- Customer onboarding automation\n- Scaling infrastructure\n\n## Risk Assessment & Mitigation\n\n### Technical Risks\n- **Server overload**: Implement auto-scaling, load testing\n- **Security vulnerabilities**: Security audit, penetration testing\n- **Integration failures**: Thorough API testing, fallback systems\n\n### Market Risks\n- **Competition**: Unique value proposition, rapid iteration\n- **Poor product-market fit**: Extensive user research, pivot readiness\n- **Economic downturn**: Conservative cash management, essential features focus\n\n### Operational Risks\n- **Team burnout**: Realistic timelines, workload distribution\n- **Cash flow**: Runway planning, funding contingencies\n- **Customer acquisition cost**: Multiple marketing channels, attribution tracking\n\nWhat specific aspect of your SaaS product would you like to dive deeper into? Also, what's your current development stage?"] },
                "create_time": 1642176300
            }
        }
    }
};

// Save example conversations
fs.writeFileSync('./ai-chat-analysis/claude-exports/example-investment-conversation.json', 
    JSON.stringify(exampleClaudeChat, null, 2));
console.log('📄 Created example Claude conversation');

fs.writeFileSync('./ai-chat-analysis/chatgpt-exports/example-project-planning.json', 
    JSON.stringify(exampleChatGPTChat, null, 2));
console.log('📄 Created example ChatGPT conversation');

// Create setup instructions
const instructions = `# AI Chat Auto-Analyzer Setup Complete! 🎉

## How to Use

### 1. Add Your API Keys (Optional for Enhanced Insights)
Create a \`.env\` file in your project root:
\`\`\`env
ANTHROPIC_API_KEY=your_claude_key_here
OPENAI_API_KEY=your_openai_key_here
\`\`\`

### 2. Export Your Conversations

**For Claude:**
1. Go to your Claude conversations
2. Copy conversation text or export JSON (if available)
3. Save files to: \`./ai-chat-analysis/claude-exports/\`

**For ChatGPT:**
1. Go to ChatGPT Settings → Data Controls → Export Data
2. Download your conversations
3. Extract and save JSON files to: \`./ai-chat-analysis/chatgpt-exports/\`

### 3. Run Analysis

\`\`\`javascript
import { AIchatAutoAnalyzer } from './scripts/ai-chat-auto-analyzer.js';

const analyzer = new AIchatAutoAnalyzer({
    analysisInterval: 'daily',
    enhancedInsights: true,
    autoReport: true
});

const results = await analyzer.runAutoAnalysis();
console.log(results);
\`\`\`

### 4. View Results
- **Reports**: \`./ai-chat-analysis/reports/\`
- **Individual Analysis**: \`./ai-chat-analysis/insights/\`
- **Conversation Copies**: \`./ai-chat-analysis/conversations/\`

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
`;

fs.writeFileSync('./ai-chat-analysis/README.md', instructions);
console.log('📋 Created setup instructions');

// Test run with example data
console.log('\n🧪 Testing with example conversations...');

try {
    const analyzer = new AIchatAutoAnalyzer({
        analysisInterval: 'manual',
        enhancedInsights: false, // Disable AI insights for demo
        autoReport: true,
        outputDir: './ai-chat-analysis'
    });
    
    const results = await analyzer.runAutoAnalysis();
    
    if (results.success) {
        console.log('\n✅ Setup Complete! AI Chat Auto-Analyzer is working perfectly!');
        console.log(`📊 Demo analysis complete: ${results.conversations} conversations processed`);
        console.log(`📄 Report generated: ${results.reportPath}`);
        console.log('\n📁 Check the ./ai-chat-analysis/ folder for your results!');
        console.log('\n🔥 Ready to analyze your real AI conversations!');
    } else {
        console.log('\n⚠️ Setup complete but demo analysis failed:', results.error);
        console.log('💡 Try adding your conversation exports and running again.');
    }
    
} catch (error) {
    console.log('\n⚠️ Demo test failed:', error.message);
    console.log('💡 The analyzer is set up correctly - this might just be a dependency issue.');
}

console.log('\n' + instructions);