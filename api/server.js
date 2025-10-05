/**
 * TooLoo.ai V2 - Market Intelligence API Server
 * 
 * Express server that connects the React UI to the market intelligence backend.
 * Provides RESTful endpoints for idea analysis, competitor research, and trend detection.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '../.env' });

// ES module dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import market intelligence modules
// Note: Using dynamic imports since we're in ES modules
const loadMarketIntelligence = async () => {
  try {
    const { default: MarketIntelligence } = await import('../workshop/market/intelligence.js');
    return new MarketIntelligence({
      productHuntKey: process.env.PRODUCTHUNT_API_KEY,
      redditClientId: process.env.REDDIT_CLIENT_ID,
      redditClientSecret: process.env.REDDIT_CLIENT_SECRET
    });
  } catch (error) {
    console.warn('⚠️  Market Intelligence modules not found, using mock data');
    return null;
  }
};

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - Allow all origins in development
app.use(cors({
  origin: true, // Allow all origins in development
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TooLoo.ai Market Intelligence API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    apis: {
      productHunt: !!process.env.PRODUCTHUNT_API_KEY,
      reddit: !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET)
    }
  });
});

// Main analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { idea } = req.body;
    
    if (!idea || !idea.title || !idea.problem || !idea.solution) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'problem', 'solution']
      });
    }

    console.log(`🔍 Analyzing idea: "${idea.title}"`);

    // Load market intelligence (if available)
    const marketIntel = await loadMarketIntelligence();

    let analysis;

    if (marketIntel) {
      // Use real market intelligence
      console.log('✅ Using real market intelligence');
      
      const ideaData = {
        id: Date.now().toString(),
        title: idea.title,
        problem: {
          description: idea.problem,
          targetAudience: idea.target || 'General market',
          painLevel: 'moderate'
        },
        solution: {
          description: idea.solution,
          keyFeatures: []
        },
        createdAt: new Date().toISOString()
      };

      analysis = await marketIntel.analyzeIdea(ideaData);
      
      // Transform to UI format
      analysis = {
        validationScore: await marketIntel.getValidationScore(ideaData),
        verdict: analysis.recommendation?.verdict || 'Analysis Complete',
        competition: {
          count: analysis.competition?.competitorCount || 0,
          saturation: analysis.competition?.saturation || 'unknown',
          topCompetitors: (analysis.competition?.competitors || []).slice(0, 3).map(c => ({
            name: c.name,
            pricing: c.pricing || 'Unknown',
            votes: c.votes || 0
          }))
        },
        trends: {
          discussions: analysis.trends?.relevantDiscussions || 0,
          themes: (analysis.trends?.commonThemes || []).map(t => ({
            name: t.theme,
            mentions: t.mentions
          }))
        },
        opportunities: analysis.opportunities || [],
        nextSteps: analysis.recommendation?.nextSteps || []
      };
    } else {
      // Use mock data (API keys not configured)
      console.log('⚠️  Using mock data (configure API keys for real analysis)');
      
      analysis = generateMockAnalysis(idea);
    }

    console.log(`✅ Analysis complete: ${analysis.validationScore}/100`);

    res.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message,
      fallback: generateMockAnalysis(req.body.idea)
    });
  }
});

// Mock analysis generator (fallback when APIs not configured)
function generateMockAnalysis(idea) {
  const keywords = `${idea.title} ${idea.problem} ${idea.solution}`.toLowerCase();
  
  // Simple scoring based on keyword complexity
  const wordCount = keywords.split(' ').length;
  const baseScore = 50 + Math.min(40, wordCount * 2);
  const randomBoost = Math.floor(Math.random() * 20) - 10;
  const validationScore = Math.max(0, Math.min(100, baseScore + randomBoost));

  return {
    validationScore,
    verdict: validationScore >= 80 ? 'Strong Opportunity' :
             validationScore >= 60 ? 'Moderate Opportunity' :
             validationScore >= 40 ? 'Proceed with Caution' : 'High Risk',
    competition: {
      count: Math.floor(Math.random() * 15) + 3,
      saturation: validationScore >= 70 ? 'low' :
                  validationScore >= 50 ? 'medium' : 'high',
      topCompetitors: [
        { name: 'Competitor A', pricing: '$29/mo', votes: 1200 },
        { name: 'Competitor B', pricing: '$19/mo', votes: 650 },
        { name: 'Competitor C', pricing: '$39/mo', votes: 890 }
      ]
    },
    trends: {
      discussions: Math.floor(Math.random() * 30) + 10,
      themes: [
        { name: 'automation', mentions: Math.floor(Math.random() * 40) + 10 },
        { name: 'efficiency', mentions: Math.floor(Math.random() * 35) + 8 },
        { name: 'cost-saving', mentions: Math.floor(Math.random() * 30) + 5 }
      ]
    },
    opportunities: [
      { type: 'market-gap', description: 'Underserved niche identified' },
      { type: 'weak-competition', description: 'Few established players' }
    ],
    nextSteps: [
      'Build minimal viable product with core features',
      'Validate with 10-15 target users',
      'Set up landing page to collect early interest',
      'Research top competitors\' weaknesses'
    ]
  };
}

// Suggestion endpoint (for future prompt refinery)
app.post('/api/suggest', async (req, res) => {
  const { category } = req.body;
  
  res.json({
    suggestions: [
      { type: 'market', text: 'Solo entrepreneurs and freelancers' },
      { type: 'market', text: 'Small business owners (1-5 employees)' },
      { type: 'feature', text: 'AI-powered automation' },
      { type: 'feature', text: 'Time-saving integrations' }
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const marketIntel = await loadMarketIntelligence();

app.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║         🧠 TooLoo.ai V2 - Market Intelligence API             ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Analysis endpoint: POST http://localhost:${PORT}/api/analyze`);
  console.log('');
  console.log('API Status:');
  console.log(`  Product Hunt: ${process.env.PRODUCTHUNT_API_KEY ? '✅ Configured' : '⚠️  Not configured (using mock data)'}`);
  console.log(`  Reddit: ${(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) ? '✅ Configured' : '⚠️  Not configured (using mock data)'}`);
  console.log('');
  console.log(marketIntel ? '🚀 Real market intelligence ready!' : '⚠️  Using mock data mode (configure API keys in .env)');
  console.log('');
});

export default app;
