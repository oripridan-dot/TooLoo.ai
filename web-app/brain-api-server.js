// TooLoo.ai Brain Tester API Server
// Provides backend API for the conversation intelligence testing interface

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import our conversation intelligence modules
// import { parseConversationFile, validateConversation } from '../scripts/real-world-parser.js';
import { runPatternExtraction } from '../engine/pattern-extractor.js';
import { computeTraitVector } from '../engine/trait-aggregator.js';
import { composeSnapshot } from '../engine/snapshot-composer.js';
// import { exportConversationUI } from '../scripts/ui-export.js';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Create temp directory for file uploads
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Store analysis results and feedback
let analysisResults = new Map();
let feedbackData = [];

// Routes

// Serve the main interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'brain-tester.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Analyze conversation endpoint
app.post('/api/analyze', async (req, res) => {
    try {
        const { content, format, filename } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: 'No content provided' });
        }
        
        console.log(`🧪 Analyzing conversation: ${filename || 'unknown'} (${format})`);
        
        const startTime = Date.now();
        
        // Step 1: Parse conversation
        const conversation = await parseConversationText(content, format);
        
        // Step 2: Validate quality
    // const validation = validateConversation(conversation);
        
        if (!validation.valid) {
            return res.json({
                success: false,
                validation,
                message: 'Conversation quality too low for meaningful analysis',
                issues: validation.issues
            });
        }
        
        // Step 3: Run full analysis pipeline
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
        
        // Step 4: Generate UI exports
        const uiExports = exportConversationUI(conversation, ['dashboard', 'summary']);
        
        // Step 5: Store results
        const analysisId = generateAnalysisId();
        const results = {
            id: analysisId,
            success: true,
            conversation,
            validation,
            snapshot,
            uiExports,
            performance: {
                processingTime: snapshot.metadata.processingTime,
                totalTime: Date.now() - startTime
            },
            timestamp: new Date().toISOString()
        };
        
        analysisResults.set(analysisId, results);
        
        console.log(`✅ Analysis complete: ${patterns.length} patterns, ${Object.keys(traits).length} traits`);
        
        res.json(results);
        
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Submit feedback endpoint
app.post('/api/feedback', async (req, res) => {
    try {
        const { analysisId, feedback, rating } = req.body;
        
        const feedbackEntry = {
            id: generateAnalysisId(),
            analysisId,
            feedback,
            rating,
            timestamp: new Date().toISOString(),
            userAgent: req.get('User-Agent')
        };
        
        feedbackData.push(feedbackEntry);
        
        // In production, you'd save this to a database
        console.log('📝 Feedback received:', feedbackEntry);
        
        res.json({ success: true, message: 'Feedback saved successfully' });
        
    } catch (error) {
        console.error('Feedback error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get analysis results
app.get('/api/analysis/:id', (req, res) => {
    const results = analysisResults.get(req.params.id);
    if (!results) {
        return res.status(404).json({ error: 'Analysis not found' });
    }
    res.json(results);
});

// Get analytics
app.get('/api/analytics', (req, res) => {
    const analytics = {
        totalAnalyses: analysisResults.size,
        totalFeedback: feedbackData.length,
        averageQuality: calculateAverageQuality(),
        popularPatterns: getPopularPatterns(),
        performanceStats: getPerformanceStats(),
        timestamp: new Date().toISOString()
    };
    
    res.json(analytics);
});

// Export analytics data
app.get('/api/export/analytics', (req, res) => {
    const exportData = {
        analyses: Array.from(analysisResults.values()).map(result => ({
            id: result.id,
            timestamp: result.timestamp,
            validation: result.validation,
            patternCount: result.snapshot.patterns.length,
            dominantTrait: result.snapshot.summary.dominantTrait,
            performance: result.performance
        })),
        feedback: feedbackData,
        summary: {
            totalAnalyses: analysisResults.size,
            totalFeedback: feedbackData.length,
            exportTimestamp: new Date().toISOString()
        }
    };
    
    res.setHeader('Content-Disposition', 'attachment; filename=tooloo-analytics.json');
    res.json(exportData);
});

// Helper functions

function parseConversationText(content, format) {
    // Create a temporary file to use our existing parser
    const tempFile = path.join(tempDir, `temp-${Date.now()}.${format === 'json' ? 'json' : 'txt'}`);
    fs.writeFileSync(tempFile, content);
    
    try {
        // Use our existing parser function (modified to work with content directly)
        return parseConversationFromContent(content, format);
    } finally {
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    }
}

function parseConversationFromContent(content, format) {
    // Simplified version of our parser that works with content directly
    switch (format) {
        case 'json':
            try {
                const data = JSON.parse(content);
                if (data.messages) {
                    return {
                        messages: data.messages.map((msg, i) => ({
                            id: msg.id || `msg_${i}`,
                            timestamp: msg.timestamp || new Date().toISOString(),
                            author: msg.author || msg.user || 'Unknown',
                            authorId: msg.authorId || msg.author || 'unknown',
                            content: msg.content || msg.text || '',
                            type: 'message',
                            platform: data.platform || 'json'
                        })),
                        metadata: {
                            platform: data.platform || 'json',
                            messageCount: data.messages.length,
                            participantCount: new Set(data.messages.map(m => m.author || m.user)).size,
                            format: 'json'
                        },
                        segments: data.segments || []
                    };
                }
                // Handle Discord format
                if (data.messages && data.guild) {
                    return {
                        messages: data.messages.map((msg, i) => ({
                            id: msg.id || `discord_${i}`,
                            timestamp: msg.timestamp,
                            author: msg.author?.name || 'Unknown',
                            authorId: msg.author?.id || 'unknown',
                            content: msg.content || '',
                            type: 'message',
                            platform: 'discord'
                        })),
                        metadata: {
                            platform: 'discord',
                            messageCount: data.messages.length,
                            participantCount: new Set(data.messages.map(m => m.author?.id)).size,
                            format: 'discord'
                        },
                        segments: []
                    };
                }
            } catch (e) {
                // Fall through to plain text parsing
            }
            break;
            
        case 'whatsapp':
            return parseWhatsAppContent(content);
            
        case 'plain':
        default:
            return parsePlainTextContent(content);
    }
}

function parseWhatsAppContent(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const messages = [];
    const whatsappRegex = /^\[(\d{1,2}\/\d{1,2}\/\d{4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]\s+([^:]+):\s+(.+)$/;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(whatsappRegex);
        
        if (match) {
            const [, date, time, author, content] = match;
            messages.push({
                id: `whatsapp_${i}`,
                timestamp: new Date().toISOString(), // Simplified
                author: author.trim(),
                authorId: author.trim().toLowerCase().replace(/\s+/g, '_'),
                content: content.trim(),
                type: 'message',
                platform: 'whatsapp'
            });
        }
    }
    
    return {
        messages,
        metadata: {
            platform: 'whatsapp',
            messageCount: messages.length,
            participantCount: new Set(messages.map(m => m.authorId)).size,
            format: 'whatsapp'
        },
        segments: []
    };
}

function parsePlainTextContent(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const messages = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
        if (colonMatch) {
            const [, author, content] = colonMatch;
            messages.push({
                id: `plain_${i}`,
                timestamp: new Date().toISOString(),
                author: author.trim(),
                authorId: author.trim().toLowerCase().replace(/\s+/g, '_'),
                content: content.trim(),
                type: 'message',
                platform: 'plain'
            });
        } else {
            messages.push({
                id: `plain_${i}`,
                timestamp: new Date().toISOString(),
                author: 'Unknown',
                authorId: 'unknown',
                content: line,
                type: 'message',
                platform: 'plain'
            });
        }
    }
    
    return {
        messages,
        metadata: {
            platform: 'plain',
            messageCount: messages.length,
            participantCount: new Set(messages.map(m => m.authorId)).size,
            format: 'plain'
        },
        segments: []
    };
}

function generateAnalysisId() {
    return 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function calculateAverageQuality() {
    const results = Array.from(analysisResults.values());
    if (results.length === 0) return 0;
    
    const totalQuality = results.reduce((sum, result) => sum + (result.validation?.quality || 0), 0);
    return Math.round((totalQuality / results.length) * 100) / 100;
}

function getPopularPatterns() {
    const patternCounts = {};
    
    Array.from(analysisResults.values()).forEach(result => {
        result.snapshot.patterns.forEach(pattern => {
            patternCounts[pattern.id] = (patternCounts[pattern.id] || 0) + 1;
        });
    });
    
    return Object.entries(patternCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([pattern, count]) => ({ pattern, count }));
}

function getPerformanceStats() {
    const results = Array.from(analysisResults.values());
    if (results.length === 0) return {};
    
    const processingTimes = results.map(r => r.performance?.processingTime || 0);
    
    return {
        averageProcessingTime: Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length),
        minProcessingTime: Math.min(...processingTimes),
        maxProcessingTime: Math.max(...processingTimes),
        totalAnalyses: results.length
    };
}

// Start server
app.listen(PORT, () => {
    console.log(`🧠 TooLoo.ai Brain Tester running at http://localhost:${PORT}`);
    console.log(`📊 Analytics available at http://localhost:${PORT}/api/analytics`);
    console.log(`🔍 API docs: http://localhost:${PORT}/api/health`);
});