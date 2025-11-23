#!/usr/bin/env node

// TooLoo.ai Beast Mode Trainer
// Run this to make TooLoo.ai incredibly smart through automated learning

import { AutomatedLearningPipeline } from '../engine/automated-learning-pipeline.js';

console.log('🧠 TooLoo.ai Beast Mode Training Starting...');
console.log('🎯 Goal: Make TooLoo.ai a conversation intelligence beast!');

async function runBeastModeTraining() {
    // Configure for maximum learning
    const learningPipeline = new AutomatedLearningPipeline({
        // Data generation settings
        syntheticDataEnabled: true,
        realDataEnabled: true,
        
        // Aggressive learning parameters
        batchSize: 200, // Process 200 conversations per cycle
        maxPatternsPerBatch: 100, // Discover up to 100 new patterns
        minPatternConfidence: 0.6, // Lower threshold for more pattern discovery
        
        // Auto-update everything
        autoUpdatePatterns: true,
        autoUpdateTraits: true,
        backupBeforeUpdate: true,
        
        // Performance requirements
        minImprovement: 0.03, // 3% improvement required (less strict for learning)
        validationSampleSize: 500,
        
        // Output
        outputDir: './beast-mode-learning',
        modelsDir: './beast-mode-models',
        backupDir: './beast-mode-backups'
    });
    
    console.log('📚 Configuration:');
    console.log(`   • Batch size: 200 conversations`);
    console.log(`   • Pattern discovery: Up to 100 new patterns`);
    console.log(`   • Confidence threshold: 60%`);
    console.log(`   • Auto-integration: Enabled`);
    console.log(`   • Performance requirement: 3%+ improvement`);
    
    try {
        // Run multiple learning cycles for maximum improvement
        const cycles = 3;
        let totalImprovement = 0;
        
        for (let cycle = 1; cycle <= cycles; cycle++) {
            console.log(`\n🔄 Starting Learning Cycle ${cycle}/${cycles}...`);
            
            const results = await learningPipeline.runLearningPipeline();
            
            if (results.success) {
                console.log(`✅ Cycle ${cycle} Complete!`);
                console.log(`   📊 Conversations: ${results.conversationsProcessed}`);
                console.log(`   🔍 Patterns discovered: ${results.patternsDiscovered}`);
                console.log(`   ✅ Patterns validated: ${results.patternsValidated}`);
                console.log(`   🚀 Performance gain: ${Math.round(results.performanceGain * 100)}%`);
                
                totalImprovement += results.performanceGain;
                
                // Short break between cycles
                if (cycle < cycles) {
                    console.log(`   ⏸️  30-second break before next cycle...`);
                    await new Promise(resolve => setTimeout(resolve, 30000));
                }
            } else {
                console.log(`❌ Cycle ${cycle} failed:`, results.error);
                break;
            }
        }
        
        console.log('\n🏆 BEAST MODE TRAINING COMPLETE!');
        console.log(`📈 Total Performance Improvement: ${Math.round(totalImprovement * 100)}%`);
        console.log(`🧠 TooLoo.ai is now ${Math.round(totalImprovement * 100)}% smarter!`);
        
        // Generate final report
        console.log('\n📄 Generating final beast mode report...');
        const finalStats = learningPipeline.learningStats;
        
        console.log('\n📊 FINAL BEAST MODE STATS:');
        console.log(`   🔢 Total conversations processed: ${finalStats.totalConversations}`);
        console.log(`   🔍 Total patterns discovered: ${finalStats.patternsDiscovered}`);
        console.log(`   ✅ Total patterns integrated: ${finalStats.patternsIntegrated}`);
        console.log(`   🚀 Overall performance boost: ${Math.round(finalStats.performanceImprovement * 100)}%`);
        
        if (finalStats.patternsIntegrated > 50) {
            console.log('\n🐉 ACHIEVEMENT UNLOCKED: Dragon Mode');
            console.log('   TooLoo.ai has learned 50+ new patterns!');
        } else if (finalStats.patternsIntegrated > 25) {
            console.log('\n🦁 ACHIEVEMENT UNLOCKED: Beast Mode');
            console.log('   TooLoo.ai has learned 25+ new patterns!');
        } else if (finalStats.patternsIntegrated > 10) {
            console.log('\n🐺 ACHIEVEMENT UNLOCKED: Wolf Mode');
            console.log('   TooLoo.ai has learned 10+ new patterns!');
        }
        
        console.log('\n🎯 TooLoo.ai is now ready to analyze conversations like a true beast!');
        console.log('💡 The more diverse conversations you feed it, the smarter it gets!');
        
    } catch (error) {
        console.error('💥 Beast mode training failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('   • Make sure all engine files are present');
        console.log('   • Check that directories are writable');
        console.log('   • Verify conversation data is available');
    }
}

// Add some example training conversations for immediate learning
async function setupTrainingData() {
    console.log('📁 Setting up training data directories...');
    
    const fs = await import('fs');
    const path = await import('path');
    
    // Create directories
    const dirs = [
        './beast-mode-learning',
        './beast-mode-learning/user-exports',
        './beast-mode-models',
        './beast-mode-backups'
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`   ✅ Created: ${dir}`);
        }
    });
    
    // Create example training conversations
    const exampleConversations = [
        {
            filename: 'decision-making-expert.json',
            content: {
                messages: [
                    {
                        id: '1',
                        timestamp: '2024-01-01T10:00:00Z',
                        author: 'Decision Expert',
                        authorId: 'expert1',
                        content: 'We have three options for the product launch. Let me break down the risks and benefits of each.',
                        type: 'message'
                    },
                    {
                        id: '2', 
                        timestamp: '2024-01-01T10:02:00Z',
                        author: 'Stakeholder',
                        authorId: 'stakeholder1',
                        content: 'I need to understand the timeline implications. Which option gets us to market fastest?',
                        type: 'message'
                    },
                    {
                        id: '3',
                        timestamp: '2024-01-01T10:05:00Z',
                        author: 'Decision Expert',
                        authorId: 'expert1',
                        content: 'Option 1: Fast (2 months) but high risk. Option 2: Medium (4 months) balanced risk. Option 3: Slow (6 months) but bulletproof. Given our constraints, I recommend Option 2.',
                        type: 'message'
                    }
                ],
                metadata: {
                    scenario: 'decision-making',
                    targetPatterns: ['option-evaluation', 'risk-assessment', 'timeline-compression'],
                    context: 'product launch decision'
                }
            }
        },
        {
            filename: 'risk-analysis-pro.json',
            content: {
                messages: [
                    {
                        id: '1',
                        timestamp: '2024-01-01T11:00:00Z',
                        author: 'Risk Analyst',
                        authorId: 'analyst1',
                        content: 'Before we proceed, let me identify the key risks: technical risk, market risk, operational risk, and financial risk.',
                        type: 'message'
                    },
                    {
                        id: '2',
                        timestamp: '2024-01-01T11:03:00Z',
                        author: 'Project Manager',
                        authorId: 'pm1',
                        content: 'Can we quantify these risks? I need specific mitigation strategies.',
                        type: 'message'
                    },
                    {
                        id: '3',
                        timestamp: '2024-01-01T11:08:00Z',
                        author: 'Risk Analyst',
                        authorId: 'analyst1',
                        content: 'Technical risk: 30% probability, $50k impact. Mitigation: additional testing phase. Market risk: 20% probability, $100k impact. Mitigation: market research validation.',
                        type: 'message'
                    }
                ],
                metadata: {
                    scenario: 'risk-management',
                    targetPatterns: ['risk-enumeration', 'quantified-assessment', 'mitigation-planning'],
                    context: 'project risk analysis'
                }
            }
        }
    ];
    
    // Save example conversations
    for (const example of exampleConversations) {
        const filePath = path.join('./beast-mode-learning/user-exports', example.filename);
        fs.writeFileSync(filePath, JSON.stringify(example.content, null, 2));
        console.log(`   📄 Created: ${example.filename}`);
    }
    
    console.log('✅ Training data setup complete!');
}

// Run the beast mode training
console.log('🏗️  Setting up beast mode environment...');
await setupTrainingData();

console.log('\n🚀 Launching automated learning...');
await runBeastModeTraining();

console.log('\n🎉 Beast mode training session complete!');
console.log('🔥 TooLoo.ai is now turbocharged with conversation intelligence!');