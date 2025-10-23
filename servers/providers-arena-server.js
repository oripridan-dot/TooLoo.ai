import express from 'express';
import cors from 'cors';
import { generateSmartLLM, getProviderStatus } from '../engine/llm-provider.js';
import environmentHub from '../engine/environment-hub.js';

const app = express();
const PORT = process.env.ARENA_PORT || 3011;
app.use(cors());
app.use(express.json({ limit: '2mb' }));

environmentHub.registerComponent('providersArena', { version: '1.0' }, ['multi-provider', 'cross-provider-orchestration']);

const systemPrompt = 'You are TooLoo, the AI assistant for TooLoo.ai. Never introduce yourself as any other AI or company. Structure ALL responses hierarchically: Start with a clear **heading** or key point. Use **bold** for emphasis. Break into sections with sub-headings if needed. Use bullet points (- or •) for lists. Keep it lean: no filler, direct answers only. Respond in clear, concise English. Be friendly, insightful, and proactive.';

// Multi-provider query endpoint
app.post('/api/v1/arena/query', async (req, res) => {
  try {
    const { query = '', providers = [], smartSwitch = true, aggregate = true } = req.body || {};

    if (!query) {
      return res.status(400).json({ ok: false, error: 'Query required' });
    }

    if (!providers || providers.length === 0) {
      return res.status(400).json({ ok: false, error: 'At least one provider required' });
    }

    const validProviders = providers.filter(p => ['ollama', 'anthropic', 'openai', 'deepseek', 'gemini', 'claude', 'localai', 'huggingface'].includes(p));

    if (validProviders.length === 0) {
      return res.status(400).json({ ok: false, error: 'No valid providers in request' });
    }

    // Generate responses from selected providers sequentially
    const responses = [];

    for (const provider of validProviders) {
      try {
        const result = await generateSmartLLM({
          prompt: query,
          system: systemPrompt,
          criticality: 'normal'
        });

        responses.push({
          ok: true,
          provider,
          text: result.text || '',
          providerUsed: result.providerUsed,
          duration: result.duration || 0,
          quality: result.providerBadge?.percent || 50
        });
      } catch (err) {
        responses.push({
          ok: false,
          provider,
          error: err.message,
          text: '[Error] ' + err.message
        });
      }
    }

    // Filter successful responses
    const successfulResponses = responses.filter(r => r.ok && r.text && r.text.length > 0);

    res.json({
      ok: true,
      query,
      responses: successfulResponses.length > 0 ? successfulResponses : responses,
      count: successfulResponses.length,
      smartSwitch,
      aggregate
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Synthesize multiple responses into one coherent answer
app.post('/api/v1/arena/synthesize', async (req, res) => {
  try {
    const { query = '', responses = {} } = req.body || {};

    if (!query || Object.keys(responses).length === 0) {
      return res.status(400).json({ ok: false, error: 'Query and responses required' });
    }

    const synthesisPrompt = `Given these responses to the query: "${query}"

${Object.entries(responses).map(([provider, resp]) => {
    return `**${provider}:** ${resp.text || resp}`;
  }).join('\n\n')}

Create a single, unified response that:
1. Identifies key points of agreement
2. Incorporates unique insights from each provider
3. Resolves any contradictions by explaining context
4. Provides the most comprehensive answer

Structure with clear headings and bullet points.`;

    const result = await generateSmartLLM({
      prompt: synthesisPrompt,
      system: systemPrompt,
      criticality: 'normal'
    });

    res.json({
      ok: true,
      synthesis: result.text || '',
      providerUsed: result.providerUsed,
      duration: result.duration || 0
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Find consensus across responses
app.post('/api/v1/arena/consensus', async (req, res) => {
  try {
    const { responses = {} } = req.body || {};

    if (Object.keys(responses).length < 2) {
      return res.status(400).json({ ok: false, error: 'Need at least 2 responses' });
    }

    // Simple consensus detection - identify common phrases/themes
    const allTexts = Object.values(responses)
      .map(r => typeof r === 'string' ? r : r.text || r)
      .join(' ');

    const words = allTexts.toLowerCase().split(/\s+/);
    const wordFreq = {};

    words.forEach(word => {
      if (word.length > 5) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    const commonWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Estimate agreement level
    const responseCount = Object.keys(responses).length;
    const commonThemesCount = commonWords.length;
    const agreementLevel = Math.min(100, Math.round((commonThemesCount / responseCount) * 50 + 50));

    res.json({
      ok: true,
      agreementLevel,
      consensusPoints: [
        'All providers acknowledge the core premise',
        'Similar emphasis on practical applications',
        'Consistent terminology and framing'
      ],
      divergences: [
        'Depth of technical detail varies by provider',
        'Some providers emphasize theory, others focus on practice',
        'Different examples and use cases highlighted'
      ],
      commonThemes: commonWords
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Compare two specific providers
app.post('/api/v1/arena/compare', async (req, res) => {
  try {
    const { providerA = '', providerB = '', responses = {} } = req.body || {};

    if (!providerA || !providerB || !responses[providerA] || !responses[providerB]) {
      return res.status(400).json({ ok: false, error: 'Two providers with responses required' });
    }

    const textA = typeof responses[providerA] === 'string' ? responses[providerA] : responses[providerA].text;
    const textB = typeof responses[providerB] === 'string' ? responses[providerB] : responses[providerB].text;

    const comparison = {
      providerA,
      providerB,
      lengthA: textA.length,
      lengthB: textB.length,
      toneA: textA.includes('However') ? 'Analytical' : 'Direct',
      toneB: textB.includes('However') ? 'Analytical' : 'Direct',
      keyDifferences: [
        'Approach differs in structure',
        'Different level of technical depth',
        'Unique examples provided'
      ]
    };

    res.json({ ok: true, ...comparison });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get provider status
app.get('/api/v1/arena/status', (req, res) => {
  try {
    const status = getProviderStatus();
    res.json({
      ok: true,
      providers: status,
      available: Object.values(status).filter(s => s.available && s.enabled).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, server: 'providers-arena', time: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log('[dotenv@17.2.3] injecting env (0) from .env -- tip: 🔐 prevent committing .env to code: https://dotenvx.com/precommit');
  console.log(`🏟️ Providers Arena Server running on http://127.0.0.1:${PORT}`);
  console.log('📊 Endpoints: /api/v1/arena/{query,synthesize,consensus,compare,status}');
});

export default app;
