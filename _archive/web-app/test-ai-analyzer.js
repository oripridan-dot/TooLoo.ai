#!/usr/bin/env node

// Test the AI Chat Auto-Analyzer with example data
// Run this after setup to verify everything works

import { AIchatAutoAnalyzer } from '../scripts/ai-chat-auto-analyzer.js';

console.log('🧪 Testing AI Chat Auto-Analyzer...');

// Test with enhanced insights disabled (no API keys needed for demo)
const analyzer = new AIchatAutoAnalyzer({
    analysisInterval: 'manual',
    enhancedInsights: false,
    autoReport: true,
    outputDir: './ai-chat-analysis'
});

try {
    const results = await analyzer.runAutoAnalysis();
    
    if (results.success) {
        console.log('\n✅ SUCCESS! AI Chat Auto-Analyzer is working perfectly!');
        console.log(`📊 Processed: ${results.conversations} conversations`);
        console.log(`📋 Analyses: ${results.analyses} cognitive profiles generated`);
        
        if (results.reportPath) {
            console.log(`📄 Report: ${results.reportPath}`);
            console.log('\n📁 Check ai-chat-analysis/reports/ for your analysis report!');
        }
        
        console.log('\n🎯 Next Steps:');
        console.log('1. Export your real Claude/ChatGPT conversations');
        console.log('2. Add them to ai-chat-analysis/claude-exports/ or ai-chat-analysis/chatgpt-exports/');  
        console.log('3. Run the analyzer again to get insights about YOUR conversation patterns!');
        
    } else {
        console.log('\n❌ Test failed:', results.error);
        console.log('💡 The setup is correct - you might need to add actual conversation exports.');
    }
    
} catch (error) {
    console.log('\n❌ Test error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('- Make sure you\'re in the TooLoo.ai/web-app directory');
    console.log('- Check that ai-chat-analysis/ folder exists with example conversations');
    console.log('- Verify all engine/ files are present in parent directory');
}

console.log('\n🚀 Ready to analyze your AI conversations automatically!');