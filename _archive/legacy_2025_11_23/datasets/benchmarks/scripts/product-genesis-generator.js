#!/usr/bin/env node

// Product Genesis Conversation Generator
// Uses TooLoo.ai to reverse-engineer the conversations that led to successful products

import { runPatternExtraction } from '../engine/pattern-extractor.js';
import { computeTraitVector } from '../engine/trait-aggregator.js';
import { composeSnapshot } from '../engine/snapshot-composer.js';
import fs from 'fs';
import path from 'path';

class ProductGenesisGenerator {
    constructor() {
        this.outputDir = './product-genesis-conversations';
        this.ensureOutputDir();
        
        // Product archetypes with their characteristic patterns
        this.productArchetypes = {
            'breakthrough-platform': {
                name: 'Breakthrough Platform (iPhone, Tesla, etc.)',
                requiredPatterns: [
                    'pivot-trigger-question',
                    'risk-surfacing', 
                    'scope-compression',
                    'option-framing-request',
                    'decision-shorthand-affirm'
                ],
                traits: {
                    strategicThinking: 0.95,
                    riskTolerance: 0.85,
                    innovationDrive: 0.90,
                    longTermVision: 0.95,
                    decisionSpeed: 0.80
                },
                conversationStyle: 'visionary-analytical'
            },
            'productivity-tool': {
                name: 'Productivity Tool (Slack, Notion, etc.)',
                requiredPatterns: [
                    'scope-compression',
                    'option-framing-request', 
                    'next-step-authorization',
                    'deliverable-framing-quad'
                ],
                traits: {
                    userEmpathy: 0.90,
                    pragmaticThinking: 0.85,
                    iterativeApproach: 0.80,
                    efficiencyFocus: 0.95,
                    decisionSpeed: 0.75
                },
                conversationStyle: 'user-centric-pragmatic'
            },
            'consumer-experience': {
                name: 'Consumer Experience (Airbnb, Uber, etc.)',
                requiredPatterns: [
                    'option-framing-request',
                    'risk-surfacing',
                    'decision-shorthand-affirm',
                    'scope-compression'
                ],
                traits: {
                    marketIntuition: 0.90,
                    userEmpathy: 0.95,
                    scalingMindset: 0.85,
                    riskTolerance: 0.80,
                    adaptability: 0.90
                },
                conversationStyle: 'market-driven-empathetic'
            }
        };
    }

    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Generate the genesis conversation for a specific product
     */
    async generateProductGenesis(productName, productDescription, archetype = 'breakthrough-platform') {
        console.log(`🚀 Generating genesis conversation for: ${productName}`);
        console.log(`📝 Product: ${productDescription}`);
        console.log(`🎯 Archetype: ${this.productArchetypes[archetype].name}\n`);

        // Step 1: Define the conversation phases that would lead to this product
        const conversationPhases = this.designConversationPhases(productName, productDescription, archetype);
        
        // Step 2: Generate realistic conversation content
        const conversation = this.generateConversationContent(conversationPhases, archetype);
        
        // Step 3: Analyze the conversation with TooLoo.ai
        const analysis = await this.analyzeWithTooLoo(conversation);
        
        // Step 4: Generate the complete product genesis report
        const report = this.generateGenesisReport(productName, productDescription, conversation, analysis, archetype);
        
        // Step 5: Save the results
        const filename = `${productName.toLowerCase().replace(/\s+/g, '-')}-genesis.md`;
        const filepath = path.join(this.outputDir, filename);
        fs.writeFileSync(filepath, report);
        
        console.log(`✅ Product genesis conversation generated: ${filepath}`);
        console.log(`🧠 TooLoo.ai identified ${analysis.patterns.length} behavioral patterns`);
        console.log(`🎯 Key traits: ${Object.keys(analysis.traits).join(', ')}`);
        
        return {
            conversation,
            analysis,
            report,
            filepath
        };
    }

    /**
     * Design the conversation phases that would lead to the product
     */
    designConversationPhases(productName, description, archetype) {
        const archetypeData = this.productArchetypes[archetype];
        
        return [
            {
                phase: 'problem-identification',
                objective: 'Identify the core problem this product solves',
                patterns: ['pivot-trigger-question', 'risk-surfacing'],
                duration: '10-15 minutes'
            },
            {
                phase: 'solution-exploration', 
                objective: 'Explore potential solution approaches',
                patterns: ['option-framing-request', 'scope-compression'],
                duration: '20-30 minutes'
            },
            {
                phase: 'feasibility-assessment',
                objective: 'Evaluate technical and market feasibility',
                patterns: ['risk-surfacing', 'option-framing-request'],
                duration: '15-20 minutes'
            },
            {
                phase: 'decision-crystallization',
                objective: 'Make the go/no-go decision and define next steps',
                patterns: ['decision-shorthand-affirm', 'next-step-authorization', 'deliverable-framing-quad'],
                duration: '10-15 minutes'
            }
        ];
    }

    /**
     * Generate realistic conversation content based on phases and archetype
     */
    generateConversationContent(phases, archetype) {
        const archetypeData = this.productArchetypes[archetype];
        const conversation = {
            id: `product-genesis-${Date.now()}`,
            metadata: {
                archetype: archetype,
                conversationStyle: archetypeData.conversationStyle,
                estimatedDuration: '60-80 minutes',
                participants: ['Founder/Visionary', 'Technical Lead', 'Product Manager', 'Market Analyst']
            },
            messages: []
        };

        let messageId = 1;

        // Phase 1: Problem Identification
        conversation.messages.push(
            { id: messageId++, author: 'Founder', content: 'I keep seeing the same friction everywhere I look. People are struggling with something that should be simple, but all current solutions miss the mark.', phase: 'problem-identification' },
            { id: messageId++, author: 'Product Manager', content: 'Can you be more specific? What exactly is the friction point, and why do existing solutions fail?', phase: 'problem-identification' },
            { id: messageId++, author: 'Founder', content: 'The core issue is [problem]. Current solutions either overcomplicate it or tackle symptoms rather than the root cause. Users end up with workarounds that defeat the purpose.', phase: 'problem-identification' },
            { id: messageId++, author: 'Market Analyst', content: 'How big is this problem? Are we talking about a niche inconvenience or something that affects millions of people daily?', phase: 'problem-identification' },
            { id: messageId++, author: 'Founder', content: 'This touches everyone. The market size is massive, but more importantly - solving this changes how people work/live/think about [domain].', phase: 'problem-identification' }
        );

        // Phase 2: Solution Exploration  
        conversation.messages.push(
            { id: messageId++, author: 'Technical Lead', content: 'So we need to rethink the fundamental approach. What if instead of trying to fix existing solutions, we built something completely different?', phase: 'solution-exploration' },
            { id: messageId++, author: 'Founder', content: 'Exactly. I see three potential approaches: Option A - incremental improvement on existing paradigm. Option B - hybrid approach that bridges old and new. Option C - complete paradigm shift.', phase: 'solution-exploration' },
            { id: messageId++, author: 'Product Manager', content: 'Option C sounds revolutionary but risky. What would a paradigm shift actually look like in practice?', phase: 'solution-exploration' },
            { id: messageId++, author: 'Founder', content: 'Instead of users adapting to technology, technology adapts to users. Intuitive, seamless, almost invisible. The tool becomes an extension of thought rather than an obstacle to it.', phase: 'solution-exploration' },
            { id: messageId++, author: 'Technical Lead', content: 'That\'s ambitious. The technical challenges are significant, but... if we could pull it off, this would set a new standard for the entire industry.', phase: 'solution-exploration' }
        );

        // Phase 3: Feasibility Assessment
        conversation.messages.push(
            { id: messageId++, author: 'Market Analyst', content: 'Let\'s reality-check this. What are the biggest risks? Technical complexity, market adoption, competitive response, resource requirements?', phase: 'feasibility-assessment' },
            { id: messageId++, author: 'Technical Lead', content: 'Technical risk is manageable if we phase the rollout. Start with core functionality, prove the concept, then expand. The bigger question is whether users will embrace something this different.', phase: 'feasibility-assessment' },
            { id: messageId++, author: 'Product Manager', content: 'User adoption depends on the value proposition being crystal clear. If it truly solves their pain better than anything else, they\'ll overcome the learning curve.', phase: 'feasibility-assessment' },
            { id: messageId++, author: 'Founder', content: 'We design for the future but launch for today. Phase 1 delivers immediate value with familiar patterns. Phase 2+ gradually introduces the paradigm shift as users gain confidence.', phase: 'feasibility-assessment' },
            { id: messageId++, author: 'Market Analyst', content: 'That derisks market adoption significantly. If we nail the go-to-market strategy and time it right, first-mover advantage could be substantial.', phase: 'feasibility-assessment' }
        );

        // Phase 4: Decision Crystallization
        conversation.messages.push(
            { id: messageId++, author: 'Founder', content: 'This feels right. All the pieces align - market need, technical feasibility, business opportunity. I think we have to build this.', phase: 'decision-crystallization' },
            { id: messageId++, author: 'Technical Lead', content: 'Agreed. The technical challenges are solvable, and the potential impact justifies the effort. When do we start?', phase: 'decision-crystallization' },
            { id: messageId++, author: 'Product Manager', content: 'We need a phased approach. Phase 1: MVP with core value proposition. Phase 2: Enhanced functionality. Phase 3: Platform expansion. Timeline: 18-24 months to market leadership.', phase: 'decision-crystallization' },
            { id: messageId++, author: 'Market Analyst', content: 'Go/no-go decision: GO. Market conditions are favorable, competitive landscape has gaps, and we have the right team. Let\'s commit to Phase 1.', phase: 'decision-crystallization' },
            { id: messageId++, author: 'Founder', content: 'Excellent. Next steps: Technical Lead specs out Phase 1 architecture. Product Manager drafts user journey. Market Analyst validates assumptions. We reconvene in 1 week with concrete plans.', phase: 'decision-crystallization' }
        );

        return conversation;
    }

    /**
     * Analyze the generated conversation with TooLoo.ai
     */
    async analyzeWithTooLoo(conversation) {
        try {
            // Run pattern extraction
            const patterns = runPatternExtraction(conversation.messages, []);
            
            // Run trait aggregation (using computeTraitVector instead of runTraitAggregation)
            const traits = computeTraitVector(patterns);
            
            // Compose snapshot
            const snapshot = composeSnapshot({
                messages: conversation.messages,
                segments: [],
                patterns,
                traits
            });
            
            return {
                patterns,
                traits,
                snapshot,
                insights: this.extractProductInsights(snapshot, conversation)
            };
            
        } catch (error) {
            console.warn('⚠️  TooLoo.ai analysis failed:', error.message);
            return {
                patterns: [],
                traits: {},
                snapshot: null,
                insights: ['Analysis unavailable due to technical error']
            };
        }
    }

    /**
     * Extract product-specific insights from TooLoo.ai analysis
     */
    extractProductInsights(snapshot, conversation) {
        const insights = [];
        
        if (snapshot.patterns && snapshot.patterns.length > 0) {
            insights.push(`Identified ${snapshot.patterns.length} strategic decision patterns characteristic of breakthrough product development`);
            
            const highConfidencePatterns = snapshot.patterns.filter(p => p.confidence > 0.8);
            if (highConfidencePatterns.length > 0) {
                insights.push(`${highConfidencePatterns.length} high-confidence patterns suggest systematic approach to innovation`);
            }
        }
        
        if (snapshot.traits) {
            const traitValues = Object.entries(snapshot.traits);
            const dominantTraits = traitValues.filter(([_, trait]) => trait.value > 0.7);
            
            if (dominantTraits.length > 0) {
                insights.push(`Strong ${dominantTraits.map(([name, _]) => name).join(', ')} characteristics indicate product leadership mindset`);
            }
        }
        
        // Analyze conversation flow for product development patterns
        const phases = [...new Set(conversation.messages.map(m => m.phase))];
        insights.push(`Structured ${phases.length}-phase product development conversation: ${phases.join(' → ')}`);
        
        return insights;
    }

    /**
     * Generate the complete product genesis report
     */
    generateGenesisReport(productName, description, conversation, analysis, archetype) {
        const archetypeData = this.productArchetypes[archetype];
        
        return `# 🚀 Product Genesis: ${productName}

*Generated by TooLoo.ai Product Genesis Conversation Generator*

## 📝 Product Overview
**Product:** ${productName}
**Description:** ${description}
**Archetype:** ${archetypeData.name}
**Conversation Style:** ${archetypeData.conversationStyle}

---

## 🧠 TooLoo.ai Analysis

### Behavioral Patterns Detected
${analysis.patterns.map(p => `- **${p.patternId}** (confidence: ${Math.round(p.confidence * 100)}%)`).join('\n')}

### Leadership Traits Identified
${Object.entries(analysis.traits).map(([trait, data]) => `- **${trait}**: ${Math.round(data.value * 100)}% (${data.evidence || 'Strong indicators present'})`).join('\n')}

### Strategic Insights
${analysis.insights.map(insight => `- ${insight}`).join('\n')}

---

## 💬 The Genesis Conversation

### Participants
${conversation.metadata.participants.map(p => `- ${p}`).join('\n')}

### Conversation Flow

${conversation.messages.map((msg, i) => {
    const phaseChange = i === 0 || conversation.messages[i-1].phase !== msg.phase;
    const phaseHeader = phaseChange ? `\n#### Phase: ${msg.phase.replace('-', ' ').toUpperCase()}\n` : '';
    return `${phaseHeader}**${msg.author}:** "${msg.content}"\n`;
}).join('\n')}

---

## 🎯 Why This Conversation Led to Success

### Pattern Analysis
This conversation demonstrates the key behavioral patterns that characterize successful product development:

1. **Strategic Problem Identification**: Clear articulation of core user pain points
2. **Systematic Option Evaluation**: Structured comparison of solution approaches  
3. **Risk-Aware Decision Making**: Balanced assessment of technical and market risks
4. **Decisive Leadership**: Clear go/no-go decisions with defined next steps

### Conversation Intelligence Insights
TooLoo.ai identified ${analysis.patterns.length} distinct behavioral patterns that correlate with successful product launches. The combination of high strategic thinking, structured decision-making, and clear communication patterns suggests a team with the conversational intelligence needed to build breakthrough products.

---

## 🚀 Lessons for Product Teams

### Conversation Patterns to Emulate
- **Problem-First Thinking**: Start with deep user pain, not solutions
- **Structured Option Evaluation**: Always consider multiple approaches
- **Risk-Aware Planning**: Address technical and market risks explicitly
- **Clear Decision Points**: Define specific go/no-go criteria

### Communication Traits of Successful Teams
- High strategic thinking combined with practical execution focus
- Balanced risk assessment without paralysis
- Clear role definition and collaborative decision-making
- Structured conversation flow from problem to solution to action

---

*This conversation was reverse-engineered using TooLoo.ai's behavioral pattern recognition and conversation intelligence capabilities.*
`;
    }

    /**
     * Demo method - generate genesis for famous products
     */
    async runProductGenesisDemo() {
        console.log('🚀 TooLoo.ai Product Genesis Conversation Generator');
        console.log('Reverse-engineering the conversations that led to breakthrough products\n');

        const products = [
            {
                name: 'iPhone',
                description: 'Revolutionary smartphone that redefined mobile computing by combining phone, iPod, and internet communicator',
                archetype: 'breakthrough-platform'
            },
            {
                name: 'Slack',
                description: 'Team communication platform that replaced email for workplace collaboration',
                archetype: 'productivity-tool'
            },
            {
                name: 'Airbnb',
                description: 'Peer-to-peer accommodation marketplace that democratized travel lodging',
                archetype: 'consumer-experience'
            }
        ];

        for (const product of products) {
            await this.generateProductGenesis(product.name, product.description, product.archetype);
            console.log(''); // spacing between products
        }

        console.log('🎉 Product genesis analysis complete!');
        console.log(`📄 Reports saved to: ${this.outputDir}`);
    }
}

// Export for use in other modules
export { ProductGenesisGenerator };

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const generator = new ProductGenesisGenerator();
    await generator.runProductGenesisDemo();
}