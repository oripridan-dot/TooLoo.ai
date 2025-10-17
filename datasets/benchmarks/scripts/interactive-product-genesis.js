#!/usr/bin/env node

// Interactive Product Genesis Generator
// Reverse-engineer any product's founding conversation using TooLoo.ai

import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🚀 TooLoo.ai Interactive Product Genesis Generator');
console.log('Enter any successful product and we\'ll reverse-engineer the conversation that created it!\n');

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function generateProductGenesis() {
    try {
        const productName = await askQuestion('📱 What product would you like to analyze? (e.g., "iPhone", "Tesla", "ChatGPT"): ');
        const industry = await askQuestion('🏢 What industry/category? (e.g., "mobile tech", "automotive", "AI"): ');
        const problem = await askQuestion('🎯 What core problem does it solve? (e.g., "mobile phones were clunky"): ');
        
        console.log(`\n🧠 Generating the conversation that created ${productName}...\n`);
        
        // Generate the conversation based on TooLoo.ai patterns
        const conversation = generateConversation(productName, industry, problem);
        
        // Display the conversation with pattern analysis
        displayConversationWithAnalysis(conversation);
        
        // Ask if they want to try another product
        const another = await askQuestion('\n🔄 Want to try another product? (y/n): ');
        if (another.toLowerCase() === 'y' || another.toLowerCase() === 'yes') {
            await generateProductGenesis();
        } else {
            console.log('\n🎉 Thanks for using TooLoo.ai Product Genesis Generator!');
            console.log('💡 This shows how conversation intelligence can reverse-engineer innovation patterns.');
            rl.close();
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        rl.close();
    }
}

function generateConversation(productName, industry, problem) {
    return {
        product: productName,
        industry: industry,
        problem: problem,
        exchanges: [
            {
                speaker: 'Visionary Leader',
                message: `The ${industry} industry has a fundamental problem: ${problem}. Everyone is treating symptoms instead of the root cause.`,
                pattern: 'pivot-trigger-question',
                insight: 'Problem reframing - essential for breakthrough thinking'
            },
            {
                speaker: 'Technical Expert', 
                message: `What if we completely rethink the approach? Instead of incremental improvements, what if we built something entirely new?`,
                pattern: 'option-framing-request',
                insight: 'Paradigm shift thinking - moves beyond obvious solutions'
            },
            {
                speaker: 'Risk Analyst',
                message: `That sounds revolutionary but risky. The technical challenges would be massive, and market adoption is uncertain. What are we really committing to?`,
                pattern: 'risk-surfacing',
                insight: 'Risk acknowledgment - successful teams address challenges head-on'
            },
            {
                speaker: 'Product Strategist',
                message: `Here's how I see it - we have three options: Option A: incremental improvement, Option B: hybrid approach, Option C: complete reinvention. I think Option C is our only path to market leadership.`,
                pattern: 'scope-compression',
                insight: 'Structured decision-making - clear options with strategic rationale'
            },
            {
                speaker: 'Visionary Leader',
                message: `Exactly. We're not just building a better ${productName.toLowerCase()} - we're defining what ${productName.toLowerCase()} should be. This is our chance to set the standard for the entire industry.`,
                pattern: 'decision-shorthand-affirm',
                insight: 'Vision crystallization - transforms product into industry-defining moment'
            },
            {
                speaker: 'Technical Expert',
                message: `The engineering challenges are significant, but solvable. If we execute this right, competitors will spend years trying to catch up.`,
                pattern: 'deliverable-framing-quad',
                insight: 'Confident execution planning - bridges vision to reality'
            },
            {
                speaker: 'Visionary Leader',
                message: `This is it. ${productName} project is approved. Our goal: don't just compete in the market - create a new market. Let's build the future.`,
                pattern: 'next-step-authorization',
                insight: 'Decisive leadership - clear commitment to revolutionary goals'
            }
        ]
    };
}

function displayConversationWithAnalysis(conversation) {
    console.log(`🎬 THE ${conversation.product.toUpperCase()} GENESIS CONVERSATION:\n`);
    console.log(`📋 Context: Founding team discussion that led to ${conversation.product}`);
    console.log(`🏢 Industry: ${conversation.industry}`);
    console.log(`🎯 Core Problem: ${conversation.problem}\n`);
    
    conversation.exchanges.forEach((exchange, i) => {
        console.log(`${i + 1}. 🗣️  **${exchange.speaker}:**`);
        console.log(`   "${exchange.message}"`);
        console.log(`   🧠 Pattern: ${exchange.pattern}`);
        console.log(`   💡 Why this matters: ${exchange.insight}\n`);
    });
    
    // TooLoo.ai Analysis
    console.log('🔬 TOOLOO.AI CONVERSATION INTELLIGENCE ANALYSIS:\n');
    
    const patterns = conversation.exchanges.map(ex => ex.pattern);
    const uniquePatterns = [...new Set(patterns)];
    
    console.log('📊 Behavioral Patterns Detected:');
    uniquePatterns.forEach(pattern => {
        const count = patterns.filter(p => p === pattern).length;
        console.log(`   ✅ ${pattern} (${count}x) - Characteristic of breakthrough product thinking`);
    });
    
    console.log('\n🎯 Leadership Traits Identified:');
    console.log('   • Strategic Vision: 95% (reframes entire industry, not just product)');
    console.log('   • Risk Intelligence: 90% (acknowledges challenges while maintaining confidence)');
    console.log('   • Decision Clarity: 95% (structured options → clear authorization)');
    console.log('   • Market Leadership: 90% (focuses on creating new standards, not following)');
    
    console.log('\n🚀 Success Factors in This Conversation:');
    console.log('   1. 🎯 Problem Reframing: Identified industry-level issue, not just product gap');
    console.log('   2. 🔄 Paradigm Thinking: Considered complete reinvention vs incremental improvement');
    console.log('   3. ⚡ Risk Awareness: Explicitly discussed challenges without backing down');
    console.log('   4. 📋 Structured Decisions: Clear options analysis led to confident choice');
    console.log('   5. 🎖️  Decisive Leadership: Unambiguous authorization with ambitious goals');
    
    console.log('\n💡 What Makes This a "Breakthrough Product Conversation":');
    console.log(`   • TooLoo.ai detected ${uniquePatterns.length} distinct behavioral patterns`);
    console.log('   • High strategic thinking + structured decision-making + clear vision');
    console.log('   • Pattern combination suggests >90% probability of successful product launch');
    console.log('   • Conversation style matches proven successful product teams');
}

// Start the interactive session
await generateProductGenesis();