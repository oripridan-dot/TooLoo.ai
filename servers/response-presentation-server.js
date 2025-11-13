/**
 * Response Presentation Server
 * 
 * Transforms multi-provider responses into concise TooLoo.ai format
 * Port: 3012
 * 
 * Endpoints:
 * POST /api/v1/present - Present raw responses in TooLoo format
 * POST /api/v1/present/batch - Batch process multiple responses
 * GET /api/v1/present/schema - Get response schema documentation
 */

import express from 'express';
import cors from 'cors';
import ResponsePresentationEngine from '../engines/response-presentation-engine.js';
import ensureEnvLoaded from '../engine/env-loader.js';

ensureEnvLoaded();

const app = express();
const PORT = process.env.PRESENTATION_PORT || 3012;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const engine = new ResponsePresentationEngine({
  minConsensusThreshold: 60,
  maxActionItems: 5,
  maxConflicts: 3,
  summaryLength: 150
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'response-presentation-server', port: PORT });
});

/**
 * POST /api/v1/present
 * Transform provider responses into TooLoo format
 * 
 * Request:
 * {
 *   "query": "How should we approach X?",
 *   "providerResponses": {
 *     "claude": "Response from Claude...",
 *     "gpt-4": "Response from GPT-4...",
 *     "gemini": "Response from Gemini..."
 *   },
 *   "userContext": {
 *     "role": "product-manager",
 *     "domain": "web-development"
 *   }
 * }
 * 
 * Response:
 * {
 *   "ok": true,
 *   "presentation": {
 *     "metadata": { query, providers, timestamp, consensusLevel },
 *     "markdown": "Formatted response ready to display",
 *     "components": {
 *       "consensus": [...],
 *       "conflicts": [...],
 *       "actions": [...],
 *       "advisory": {...}
 *     }
 *   }
 * }
 */
app.post('/api/v1/present', async (req, res) => {
  try {
    const { query, providerResponses, userContext } = req.body;

    if (!query) {
      return res.status(400).json({ ok: false, error: 'Query required' });
    }

    if (!providerResponses || Object.keys(providerResponses).length === 0) {
      return res.status(400).json({ ok: false, error: 'Provider responses required' });
    }

    const presentation = await engine.presentResponse({
      query,
      providerResponses,
      userContext: userContext || {}
    });

    res.json({
      ok: true,
      presentation,
      processingTime: `${Date.now() - req.startTime}ms` || 'calculated'
    });
  } catch (error) {
    console.error('[Presentation] Error:', error.message);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Presentation generation failed' 
    });
  }
});

/**
 * POST /api/v1/present/batch
 * Process multiple query/response sets
 * 
 * Request:
 * {
 *   "presentations": [
 *     {
 *       "query": "...",
 *       "providerResponses": {...},
 *       "userContext": {...}
 *     },
 *     ...
 *   ]
 * }
 * 
 * Response:
 * {
 *   "ok": true,
 *   "results": [{...}, {...}],
 *   "count": 3,
 *   "processingTime": "1250ms"
 * }
 */
app.post('/api/v1/present/batch', async (req, res) => {
  try {
    const { presentations = [] } = req.body;

    if (!Array.isArray(presentations) || presentations.length === 0) {
      return res.status(400).json({ ok: false, error: 'presentations array required' });
    }

    const startTime = Date.now();
    const results = await Promise.all(
      presentations.map(p => 
        engine.presentResponse({
          query: p.query,
          providerResponses: p.providerResponses || {},
          userContext: p.userContext || {}
        }).catch(err => ({ error: err.message, failed: true }))
      )
    );

    const processingTime = Date.now() - startTime;

    res.json({
      ok: true,
      results,
      count: results.length,
      failedCount: results.filter(r => r.failed).length,
      processingTime: `${processingTime}ms`,
      avgTimePerPresentation: `${Math.round(processingTime / results.length)}ms`
    });
  } catch (error) {
    console.error('[Presentation Batch] Error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/v1/present/schema
 * Get documentation of response schema
 */
app.get('/api/v1/present/schema', (req, res) => {
  res.json({
    ok: true,
    schema: {
      presentation: {
        metadata: {
          query: 'string',
          providers: 'number',
          timestamp: 'ISO string',
          consensusLevel: 'number (0-100)'
        },
        markdown: 'string (formatted for display)',
        components: {
          consensus: [
            {
              point: 'string',
              supportedBy: 'string[]',
              strength: 'low|medium|high',
              keywordFrequency: 'string (percentage)'
            }
          ],
          conflicts: [
            {
              conflict: 'string',
              providers: 'string[]',
              perspectives: 'string[]',
              resolution: 'string',
              severity: 'low|medium|high'
            }
          ],
          actions: [
            {
              action: 'string',
              priority: 'number (1-5)',
              effort: 'quick|moderate|complex',
              rationale: 'string',
              owner: 'user|team|system'
            }
          ],
          advisory: {
            insight: 'string',
            riskFlag: 'string|null',
            nextMoves: 'string[]',
            timelineHint: 'string'
          }
        }
      }
    },
    examples: {
      request: {
        query: 'How should we optimize our database?',
        providerResponses: {
          claude: 'Start with indexing strategy...',
          'gpt-4': 'Consider query optimization first...'
        },
        userContext: { role: 'backend-engineer' }
      },
      responseHighlight: {
        consensusLevel: 75,
        conflicts: [
          {
            conflict: 'Approach timing: immediate vs incremental',
            severity: 'medium',
            resolution: 'Use incremental approach with quick wins first'
          }
        ],
        actions: [
          {
            action: 'Analyze slow query logs',
            priority: 1,
            effort: 'quick',
            rationale: 'Identify biggest performance bottlenecks'
          }
        ]
      }
    }
  });
});

/**
 * Format timestamp for logging
 */
function logTimestamp() {
  return new Date().toISOString().substr(11, 8);
}

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`[${logTimestamp()}] ${req.method} ${req.path}`);
  next();
});

// Error handling
app.use((err, req, res) => {
  console.error(`[${logTimestamp()}] Error:`, err.message);
  res.status(500).json({ ok: false, error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  Response Presentation Server         ║
║  Port: ${PORT}                          ║
╚════════════════════════════════════════╝

Endpoints:
  POST /api/v1/present           - Transform responses
  POST /api/v1/present/batch     - Batch processing
  GET  /api/v1/present/schema    - Schema documentation
  GET  /health                   - Health check
  `);
});
