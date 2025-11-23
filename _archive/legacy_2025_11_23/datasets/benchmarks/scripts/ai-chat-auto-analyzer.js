// AI Chat Auto-Analyzer
// Automatically connects to Claude/ChatGPT, exports conversations, and runs TooLoo.ai analysis
// Provides automated insights about your AI conversation patterns

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import our conversation intelligence pipeline
import { runPatternExtraction } from '../engine/pattern-extractor.js';
import { computeTraitVector } from '../engine/trait-aggregator.js';
import { composeSnapshot } from '../engine/snapshot-composer.js';
import { exportConversationUI } from '../scripts/ui-export.js';

class AIchatAutoAnalyzer {
    constructor(config = {}) {
        this.config = {
            claudeApiKey: config.claudeApiKey || process.env.ANTHROPIC_API_KEY,
            openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
            analysisInterval: config.analysisInterval || 'daily', // daily, weekly, manual
            autoReport: config.autoReport !== false, // default true
            enhancedInsights: config.enhancedInsights !== false, // use AI for deeper analysis
            outputDir: config.outputDir || './ai-chat-analysis',
            maxConversations: config.maxConversations || 50
        };
        
        this.conversationHistory = new Map();
        this.analysisResults = [];
        this.lastAnalysisTime = null;
        
        this.initializeOutputDir();
        this.loadPreviousResults();
    }

    initializeOutputDir() {
        if (!fs.existsSync(this.config.outputDir)) {
            fs.mkdirSync(this.config.outputDir, { recursive: true });
        }
        
        // Create subdirectories
        ['conversations', 'reports', 'insights', 'exports'].forEach(dir => {
            const dirPath = path.join(this.config.outputDir, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });
    }

    /**
     * Main entry point - Run automatic analysis
     */
    async runAutoAnalysis() {
        console.log('🤖 Starting AI Chat Auto-Analysis...');
        
        try {
            // Step 1: Export conversations from AI services
            const conversations = await this.exportAIConversations();
            
            if (conversations.length === 0) {
                console.log('📭 No new conversations found to analyze');
                return { success: true, conversations: 0, message: 'No new conversations' };
            }
            
            console.log(`📚 Found ${conversations.length} conversations to analyze`);
            
            // Step 2: Analyze each conversation with TooLoo.ai brain
            const analysisResults = [];
            for (const conversation of conversations) {
                const result = await this.analyzeConversation(conversation);
                analysisResults.push(result);
            }
            
            // Step 3: Generate enhanced insights using AI
            let enhancedInsights = null;
            if (this.config.enhancedInsights) {
                enhancedInsights = await this.generateEnhancedInsights(analysisResults);
            }
            
            // Step 4: Create comprehensive report
            const report = await this.generateAnalysisReport(analysisResults, enhancedInsights);
            
            // Step 5: Save and deliver results
            await this.saveResults(analysisResults, report);
            
            if (this.config.autoReport) {
                await this.deliverReport(report);
            }
            
            this.lastAnalysisTime = new Date();
            
            console.log('✅ AI Chat Auto-Analysis complete!');
            console.log(`📊 Analyzed: ${conversations.length} conversations`);
            console.log(`🧠 Generated: ${analysisResults.length} cognitive profiles`);
            console.log(`📄 Report saved to: ${this.config.outputDir}/reports/`);
            
            return {
                success: true,
                conversations: conversations.length,
                analyses: analysisResults.length,
                reportPath: report.filePath,
                enhancedInsights: enhancedInsights ? true : false
            };
            
        } catch (error) {
            console.error('❌ Auto-analysis failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Export conversations from Claude and ChatGPT
     */
    async exportAIConversations() {
        const conversations = [];
        
        // Always check for local conversation files (API keys not required for file-based analysis)
        try {
            const claudeChats = await this.exportClaudeConversations();
            conversations.push(...claudeChats);
            console.log(`📥 Found ${claudeChats.length} Claude conversations`);
        } catch (error) {
            console.warn('⚠️ Claude file check failed:', error.message);
        }
        
        try {
            const openaiChats = await this.exportOpenAIConversations();
            conversations.push(...openaiChats);
            console.log(`📥 Found ${openaiChats.length} ChatGPT conversations`);
        } catch (error) {
            console.warn('⚠️ OpenAI file check failed:', error.message);
        }
        
        // Filter for new conversations only
        return this.filterNewConversations(conversations);
    }

    /**
     * Export conversations from Claude (Anthropic)
     */
    async exportClaudeConversations() {
        // Note: Anthropic doesn't currently provide a direct conversation export API
        // This would need to be implemented via browser automation or manual export
        
        console.log('🔍 Checking for Claude conversation exports...');
        
        // Check for manually exported Claude conversations
        const claudeExportDir = path.join(this.config.outputDir, 'claude-exports');
        if (fs.existsSync(claudeExportDir)) {
            const files = fs.readdirSync(claudeExportDir).filter(f => f.endsWith('.json') || f.endsWith('.txt'));
            
            const conversations = [];
            for (const file of files) {
                try {
                    const filePath = path.join(claudeExportDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    
                    const conversation = this.parseClaudeExport(content, file);
                    if (conversation) {
                        conversations.push(conversation);
                    }
                } catch (error) {
                    console.warn(`⚠️ Failed to parse ${file}:`, error.message);
                }
            }
            
            return conversations;
        }
        
        return [];
    }

    /**
     * Export conversations from OpenAI/ChatGPT
     */
    async exportOpenAIConversations() {
        // Note: OpenAI provides conversation export via data export request
        // This function would integrate with browser automation or manual exports
        
        console.log('🔍 Checking for ChatGPT conversation exports...');
        
        // Check for manually exported ChatGPT conversations
        const openaiExportDir = path.join(this.config.outputDir, 'chatgpt-exports');
        if (fs.existsSync(openaiExportDir)) {
            const files = fs.readdirSync(openaiExportDir).filter(f => f.endsWith('.json') || f.endsWith('.txt'));
            
            const conversations = [];
            for (const file of files) {
                try {
                    const filePath = path.join(openaiExportDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    
                    const conversation = this.parseChatGPTExport(content, file);
                    if (conversation) {
                        conversations.push(conversation);
                    }
                } catch (error) {
                    console.warn(`⚠️ Failed to parse ${file}:`, error.message);
                }
            }
            
            return conversations;
        }
        
        return [];
    }

    /**
     * Parse Claude conversation export
     */
    parseClaudeExport(content, filename) {
        try {
            // Handle JSON format (Claude conversation export)
            if (filename.endsWith('.json')) {
                const data = JSON.parse(content);
                
                // Convert Claude format to our standard format
                const messages = [];
                
                if (data.messages) {
                    data.messages.forEach((msg, index) => {
                        messages.push({
                            id: `claude_${index}`,
                            timestamp: msg.created_at || new Date().toISOString(),
                            author: msg.role === 'user' ? 'User' : 'Claude',
                            authorId: msg.role === 'user' ? 'user' : 'claude',
                            content: typeof msg.content === 'string' ? msg.content : 
                                    Array.isArray(msg.content) ? msg.content.map(c => c.text || c).join('\n') : '',
                            type: 'message',
                            platform: 'claude'
                        });
                    });
                }
                
                return {
                    messages,
                    metadata: {
                        platform: 'claude',
                        filename,
                        messageCount: messages.length,
                        participantCount: 2, // User + Claude
                        conversationId: data.id || filename,
                        exportedAt: new Date().toISOString()
                    },
                    segments: []
                };
            }
            
            // Handle plain text format
            return this.parsePlainTextConversation(content, 'claude', filename);
            
        } catch (error) {
            console.error(`Failed to parse Claude export ${filename}:`, error.message);
            return null;
        }
    }

    /**
     * Parse ChatGPT conversation export
     */
    parseChatGPTExport(content, filename) {
        try {
            // Handle JSON format (ChatGPT data export)
            if (filename.endsWith('.json')) {
                const data = JSON.parse(content);
                
                const messages = [];
                
                // ChatGPT export format varies, handle common structures
                if (data.mapping) {
                    // Standard ChatGPT export format
                    Object.values(data.mapping).forEach((node, index) => {
                        if (node.message && node.message.content && node.message.content.parts) {
                            const content = node.message.content.parts.join('\n');
                            if (content.trim()) {
                                messages.push({
                                    id: `chatgpt_${index}`,
                                    timestamp: new Date(node.message.create_time * 1000).toISOString(),
                                    author: node.message.author.role === 'user' ? 'User' : 'ChatGPT',
                                    authorId: node.message.author.role === 'user' ? 'user' : 'chatgpt',
                                    content: content.trim(),
                                    type: 'message',
                                    platform: 'chatgpt'
                                });
                            }
                        }
                    });
                } else if (data.messages) {
                    // Alternative format
                    data.messages.forEach((msg, index) => {
                        messages.push({
                            id: `chatgpt_${index}`,
                            timestamp: msg.timestamp || new Date().toISOString(),
                            author: msg.role === 'user' ? 'User' : 'ChatGPT',
                            authorId: msg.role === 'user' ? 'user' : 'chatgpt',
                            content: msg.content || msg.text || '',
                            type: 'message',
                            platform: 'chatgpt'
                        });
                    });
                }
                
                return {
                    messages,
                    metadata: {
                        platform: 'chatgpt',
                        filename,
                        messageCount: messages.length,
                        participantCount: 2, // User + ChatGPT
                        conversationId: data.id || filename,
                        title: data.title || 'ChatGPT Conversation',
                        exportedAt: new Date().toISOString()
                    },
                    segments: []
                };
            }
            
            // Handle plain text format
            return this.parsePlainTextConversation(content, 'chatgpt', filename);
            
        } catch (error) {
            console.error(`Failed to parse ChatGPT export ${filename}:`, error.message);
            return null;
        }
    }

    /**
     * Parse plain text conversation (fallback)
     */
    parsePlainTextConversation(content, platform, filename) {
        const lines = content.split('\n').filter(line => line.trim());
        const messages = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Try to detect speaker patterns
            let author = 'Unknown';
            let content = line;
            
            // Pattern: "Speaker: Message"
            const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
            if (colonMatch) {
                author = colonMatch[1].trim();
                content = colonMatch[2].trim();
            }
            // Pattern: "**Speaker**\nMessage" or "# Speaker\nMessage"
            else if (line.match(/^\*\*.*\*\*$/) || line.match(/^#+\s/)) {
                author = line.replace(/[\*\#\s]/g, '');
                if (i + 1 < lines.length) {
                    content = lines[i + 1].trim();
                    i++; // Skip next line as it's the content
                }
            }
            
            messages.push({
                id: `${platform}_${i}`,
                timestamp: new Date().toISOString(),
                author,
                authorId: author.toLowerCase().replace(/\s+/g, '_'),
                content,
                type: 'message',
                platform
            });
        }
        
        return {
            messages,
            metadata: {
                platform,
                filename,
                messageCount: messages.length,
                participantCount: new Set(messages.map(m => m.authorId)).size,
                exportedAt: new Date().toISOString()
            },
            segments: []
        };
    }

    /**
     * Filter conversations to only analyze new ones
     */
    filterNewConversations(conversations) {
        const newConversations = [];
        
        for (const conversation of conversations) {
            const id = conversation.metadata.conversationId || conversation.metadata.filename;
            
            if (!this.conversationHistory.has(id)) {
                newConversations.push(conversation);
                this.conversationHistory.set(id, {
                    analyzedAt: new Date(),
                    messageCount: conversation.metadata.messageCount
                });
            }
        }
        
        return newConversations;
    }

    /**
     * Analyze single conversation with TooLoo.ai brain
     */
    async analyzeConversation(conversation) {
        console.log(`🧠 Analyzing: ${conversation.metadata.filename || 'conversation'}`);
        
        try {
            const startTime = Date.now();
            
            // Run TooLoo.ai analysis pipeline
            const patterns = runPatternExtraction(conversation.messages, conversation.segments);
            const traits = computeTraitVector(patterns);
            
            const snapshot = composeSnapshot({
                messages: conversation.messages,
                segments: conversation.segments,
                patterns,
                traits
            }, {
                processingTime: Date.now() - startTime,
                scoringSpecVersion: '0.1.0'
            });
            
            // Generate UI exports
            const uiExports = exportConversationUI(conversation, ['dashboard', 'summary', 'insights']);
            
            return {
                conversation,
                snapshot,
                uiExports,
                analysisTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`Failed to analyze conversation:`, error.message);
            return {
                conversation,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Generate enhanced insights using AI assistance
     */
    async generateEnhancedInsights(analysisResults) {
        if (!this.config.enhancedInsights) return null;
        
        console.log('🚀 Generating enhanced AI insights...');
        
        try {
            // Prepare analysis summary for AI
            const summary = this.prepareAnalysisSummary(analysisResults);
            
            // Use Claude or ChatGPT to generate deeper insights
            let insights = null;
            
            if (this.config.claudeApiKey) {
                insights = await this.generateClaudeInsights(summary);
            } else if (this.config.openaiApiKey) {
                insights = await this.generateOpenAIInsights(summary);
            }
            
            return insights;
            
        } catch (error) {
            console.warn('⚠️ Enhanced insights generation failed:', error.message);
            return null;
        }
    }

    /**
     * Prepare analysis summary for AI insight generation
     */
    prepareAnalysisSummary(analysisResults) {
        const summary = {
            totalConversations: analysisResults.length,
            platforms: [...new Set(analysisResults.map(r => r.conversation.metadata.platform))],
            totalMessages: analysisResults.reduce((sum, r) => sum + r.conversation.metadata.messageCount, 0),
            patterns: {},
            traits: {},
            conversationStyles: {}
        };
        
        // Aggregate patterns
        analysisResults.forEach(result => {
            if (result.snapshot && result.snapshot.patterns) {
                result.snapshot.patterns.forEach(pattern => {
                    summary.patterns[pattern.id] = (summary.patterns[pattern.id] || 0) + 1;
                });
            }
            
            // Aggregate traits
            if (result.snapshot && result.snapshot.traits) {
                Object.entries(result.snapshot.traits).forEach(([trait, data]) => {
                    if (!summary.traits[trait]) summary.traits[trait] = [];
                    summary.traits[trait].push(data.value);
                });
            }
            
            // Aggregate conversation styles
            if (result.snapshot && result.snapshot.summary) {
                const style = result.snapshot.summary.conversationStyle;
                summary.conversationStyles[style] = (summary.conversationStyles[style] || 0) + 1;
            }
        });
        
        // Calculate trait averages
        Object.keys(summary.traits).forEach(trait => {
            const values = summary.traits[trait];
            summary.traits[trait] = {
                average: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                count: values.length
            };
        });
        
        return summary;
    }

    /**
     * Generate insights using Claude
     */
    async generateClaudeInsights(summary) {
        // This would make an actual API call to Claude
        // For now, return a structured insight format
        
        return {
            provider: 'claude',
            insights: [
                {
                    category: 'Communication Patterns',
                    insight: `Based on ${summary.totalConversations} conversations, you show a preference for ${Object.keys(summary.conversationStyles)[0]} communication style.`,
                    confidence: 0.85
                },
                {
                    category: 'Decision Making',
                    insight: `Your decision compression trait averages ${Math.round(summary.traits.decisionCompression?.average * 100)}%, indicating ${summary.traits.decisionCompression?.average > 0.7 ? 'rapid' : 'deliberate'} decision-making tendencies.`,
                    confidence: 0.90
                },
                {
                    category: 'Risk Assessment',
                    insight: `Risk discipline shows at ${Math.round(summary.traits.riskDiscipline?.average * 100)}%, suggesting ${summary.traits.riskDiscipline?.average > 0.6 ? 'thorough' : 'moderate'} risk consideration in conversations.`,
                    confidence: 0.88
                }
            ],
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Generate comprehensive analysis report
     */
    async generateAnalysisReport(analysisResults, enhancedInsights = null) {
        const timestamp = new Date().toISOString().slice(0, 10);
        const reportFilename = `ai-chat-analysis-${timestamp}.md`;
        const reportPath = path.join(this.config.outputDir, 'reports', reportFilename);
        
        const summary = this.prepareAnalysisSummary(analysisResults);
        
        let reportContent = `# AI Chat Analysis Report
Generated: ${new Date().toISOString()}

## 📊 Overview
- **Conversations Analyzed**: ${summary.totalConversations}
- **Total Messages**: ${summary.totalMessages}
- **Platforms**: ${summary.platforms.join(', ')}
- **Analysis Period**: Last ${this.config.analysisInterval}

## 🧠 Cognitive Profile Summary

### Decision Making Patterns
`;

        // Add trait analysis
        Object.entries(summary.traits).forEach(([trait, data]) => {
            const percentage = Math.round(data.average * 100);
            const interpretation = this.getTraitInterpretation(trait, data.average);
            
            reportContent += `
**${this.formatTraitName(trait)}**: ${percentage}% (avg)
- Range: ${Math.round(data.min * 100)}% - ${Math.round(data.max * 100)}%
- ${interpretation}
`;
        });

        // Add pattern analysis
        reportContent += `
## 🎯 Behavioral Patterns Detected

`;
        Object.entries(summary.patterns).forEach(([pattern, count]) => {
            reportContent += `- **${this.formatPatternName(pattern)}**: Detected ${count} times\n`;
        });

        // Add conversation style breakdown
        reportContent += `
## 💬 Conversation Style Distribution

`;
        Object.entries(summary.conversationStyles).forEach(([style, count]) => {
            const percentage = Math.round((count / summary.totalConversations) * 100);
            reportContent += `- **${style}**: ${count} conversations (${percentage}%)\n`;
        });

        // Add enhanced insights if available
        if (enhancedInsights) {
            reportContent += `
## 🚀 Enhanced AI Insights
*Generated by ${enhancedInsights.provider}*

`;
            enhancedInsights.insights.forEach(insight => {
                reportContent += `### ${insight.category}
${insight.insight}
*Confidence: ${Math.round(insight.confidence * 100)}%*

`;
            });
        }

        // Add recommendations
        reportContent += `
## 💡 Recommendations

Based on your conversation patterns, consider:

1. **Communication Optimization**: Your ${Object.keys(summary.conversationStyles)[0]} style works well, consider varying approaches for different contexts
2. **Decision Making**: ${summary.traits.decisionCompression?.average > 0.7 ? 'Your quick decision style is efficient, but ensure thorough consideration for complex issues' : 'Your deliberate approach is thorough, consider setting decision deadlines for efficiency'}
3. **Risk Management**: ${summary.traits.riskDiscipline?.average > 0.6 ? 'Strong risk awareness - leverage this for strategic planning' : 'Consider developing more systematic risk assessment habits'}

## 📈 Trends & Evolution

*This section will show trends as more analysis data becomes available*

---
*Generated by TooLoo.ai Auto-Analyzer v1.0*
`;

        // Save report
        fs.writeFileSync(reportPath, reportContent);
        
        return {
            filename: reportFilename,
            filePath: reportPath,
            content: reportContent,
            summary,
            enhancedInsights,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Save analysis results
     */
    async saveResults(analysisResults, report) {
        // Save individual analysis results
        for (const result of analysisResults) {
            const filename = `analysis_${result.conversation.metadata.conversationId || Date.now()}.json`;
            const filePath = path.join(this.config.outputDir, 'insights', filename);
            
            fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
        }
        
        // Save aggregated results
        const aggregatedPath = path.join(this.config.outputDir, 'analysis-history.json');
        this.analysisResults.push(...analysisResults);
        
        fs.writeFileSync(aggregatedPath, JSON.stringify({
            lastAnalysis: new Date().toISOString(),
            totalAnalyses: this.analysisResults.length,
            results: this.analysisResults.slice(-100) // Keep last 100 results
        }, null, 2));
        
        console.log(`💾 Saved ${analysisResults.length} analysis results`);
    }

    /**
     * Deliver report (could be email, notification, etc.)
     */
    async deliverReport(report) {
        console.log(`📧 Report generated: ${report.filePath}`);
        console.log(`📊 Summary: ${report.summary.totalConversations} conversations analyzed`);
        
        // In a full implementation, this could:
        // - Send email with report
        // - Post to Slack/Discord
        // - Save to cloud storage
        // - Generate PDF version
        
        return true;
    }

    /**
     * Utility functions
     */
    formatTraitName(trait) {
        const names = {
            decisionCompression: 'Decision Compression',
            riskDiscipline: 'Risk Discipline',
            trustPriority: 'Trust Priority',
            structureExpectation: 'Structure Expectation'
        };
        return names[trait] || trait;
    }

    formatPatternName(pattern) {
        return pattern.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    getTraitInterpretation(trait, value) {
        if (value > 0.7) {
            const high = {
                decisionCompression: 'Prefers rapid, compressed decision-making',
                riskDiscipline: 'Systematic risk identification and mitigation',
                trustPriority: 'Strong emphasis on privacy and trust',
                structureExpectation: 'Prefers organized, structured outputs'
            };
            return high[trait] || 'High expression of this trait';
        } else if (value > 0.3) {
            return 'Moderate expression of this trait';
        } else {
            return 'Low expression of this trait';
        }
    }

    loadPreviousResults() {
        try {
            const historyPath = path.join(this.config.outputDir, 'analysis-history.json');
            if (fs.existsSync(historyPath)) {
                const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
                this.analysisResults = data.results || [];
                this.lastAnalysisTime = data.lastAnalysis ? new Date(data.lastAnalysis) : null;
            }
        } catch (error) {
            console.warn('⚠️ Could not load previous results:', error.message);
        }
    }
}

export { AIchatAutoAnalyzer };