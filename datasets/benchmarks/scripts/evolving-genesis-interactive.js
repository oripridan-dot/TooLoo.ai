#!/usr/bin/env node

// Evolving TooLoo.ai Product Genesis - Interactive Interface
// Real learning, real measurements, real evolution

import readline from 'readline';
import { EvolvingProductGenesisAI } from './evolving-product-genesis.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function runEvolvingGenesis() {
    console.log('🚀 TooLoo.ai Evolving Product Genesis System');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧠 Real Learning • Real Measurements • Real Evolution');
    console.log('Each generation improves conversation realism and accuracy\n');
    
    const ai = new EvolvingProductGenesisAI();
    
    while (true) {
        try {
            console.log('📱 PRODUCT ANALYSIS REQUEST:');
            const productName = await askQuestion('• Product to analyze: ');
            if (!productName || productName.toLowerCase() === 'quit') break;
            
            const industry = await askQuestion('• Industry/Category: ');
            const problemSolved = await askQuestion('• Core problem it solves: ');
            const additionalContext = await askQuestion('• Additional context (optional): ');
            
            console.log('\n🧬 GENERATING EVOLVED CONVERSATION...\n');
            
            const userContext = {
                industry: industry,
                problemSolved: problemSolved,
                additionalContext: additionalContext
            };
            
            const result = await ai.generateRealisticConversation(productName, problemSolved, userContext);
            
            // Ask about continuing or analyzing the learning
            console.log('\n🔄 OPTIONS:');
            console.log('1. Analyze another product (continues learning)');
            console.log('2. View learning analytics');
            console.log('3. Exit');
            
            const choice = await askQuestion('\nChoose option (1-3): ');
            
            if (choice === '2') {
                await showLearningAnalytics(ai);
            } else if (choice === '3' || choice.toLowerCase().includes('exit')) {
                break;
            }
            // Otherwise continue loop for option 1
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            console.log('🔄 Continuing with learning system...\n');
        }
    }
    
    console.log('\n🎯 LEARNING SESSION COMPLETE');
    console.log(`📈 TooLoo.ai has evolved through ${ai.generationCount} generations`);
    console.log(`🧠 Learning iterations: ${ai.learningIterations}`);
    console.log(`📊 Final performance: ${Math.round(ai.performanceMetrics.conversationRealism * 100)}% realism`);
    console.log('\n💡 Each session makes TooLoo.ai smarter and more realistic!');
    
    rl.close();
}

async function showLearningAnalytics(ai) {
    console.log('\n📊 TOOLOO.AI LEARNING ANALYTICS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log(`\n🧠 Current AI Performance:`);
    console.log(`   • Conversation Realism: ${Math.round(ai.performanceMetrics.conversationRealism * 100)}%`);
    console.log(`   • Pattern Accuracy: ${Math.round(ai.performanceMetrics.patternAccuracy * 100)}%`);
    console.log(`   • Industry Specificity: ${Math.round(ai.performanceMetrics.industrySpecificity * 100)}%`);
    console.log(`   • Historical Alignment: ${Math.round(ai.performanceMetrics.historicalAlignment * 100)}%`);
    
    console.log(`\n📈 Learning Progress:`);
    console.log(`   • Total Generations: ${ai.generationCount}`);
    console.log(`   • Learning Iterations: ${ai.learningIterations}`);
    console.log(`   • Performance Improvement: ${ai.generationCount > 0 ? '+' + Math.round((ai.performanceMetrics.conversationRealism - 0.3) * 100) + '% from baseline' : 'Starting baseline'}`);
    
    console.log(`\n🎯 What This Means:`);
    console.log(`   • Each product analysis improves future conversations`);
    console.log(`   • TooLoo.ai learns industry-specific patterns and language`);
    console.log(`   • Conversation quality increases with more training data`);
    console.log(`   • Real measurements drive continuous improvement`);
    
    // Show learning directories if they exist
    const fs = await import('fs');
    const learningFiles = fs.default.existsSync(ai.learningDatabase) ? 
        fs.default.readdirSync(ai.learningDatabase).length : 0;
    const conversationFiles = fs.default.existsSync(ai.conversationLibrary) ? 
        fs.default.readdirSync(ai.conversationLibrary).length : 0;
    const measurementFiles = fs.default.existsSync(ai.measurementHistory) ? 
        fs.default.readdirSync(ai.measurementHistory).length : 0;
    
    console.log(`\n📁 Knowledge Base:`);
    console.log(`   • Learned Patterns: ${learningFiles} industry pattern files`);
    console.log(`   • Conversation Library: ${conversationFiles} generated conversations`);
    console.log(`   • Performance History: ${measurementFiles} measurements`);
    
    await askQuestion('\nPress Enter to continue...');
}

// Run the evolving genesis system
await runEvolvingGenesis();