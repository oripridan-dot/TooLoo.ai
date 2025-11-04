// servers/github-context-server.js
// API endpoints for providers to access and analyze your GitHub repo
// Enables AI to understand your project, issues, and code

import express from 'express';
import githubProvider from '../engine/github-provider.js';
import LLMProvider from '../engine/llm-provider.js';

const app = express();
const PORT = process.env.GITHUB_CONTEXT_PORT || 3020;

app.use(express.json({ limit: '5mb' }));

// GET /api/v1/github/info - Repository metadata
app.get('/api/v1/github/info', async (req, res) => {
  const info = await githubProvider.getRepoInfo();
  res.json({ ok: !!info, info: info || { error: 'GitHub not configured' } });
});

// GET /api/v1/github/issues - Recent issues for context
app.get('/api/v1/github/issues', async (req, res) => {
  const limit = parseInt(req.query.limit || '5');
  const issues = await githubProvider.getRecentIssues(limit);
  res.json({ ok: true, issues });
});

// GET /api/v1/github/readme - Project README
app.get('/api/v1/github/readme', async (req, res) => {
  const readme = await githubProvider.getReadme();
  res.json({ ok: !!readme, readme: readme || null });
});

// POST /api/v1/github/file - Get specific file
app.post('/api/v1/github/file', async (req, res) => {
  const { path } = req.body || {};
  if (!path) return res.status(400).json({ ok: false, error: 'path required' });

  const file = await githubProvider.getFileContent(path);
  res.json({ ok: !!file, file: file || null });
});

// POST /api/v1/github/files - Get multiple files
app.post('/api/v1/github/files', async (req, res) => {
  const { paths } = req.body || {};
  if (!paths || !Array.isArray(paths)) {
    return res.status(400).json({ ok: false, error: 'paths array required' });
  }

  const files = await githubProvider.getMultipleFiles(paths);
  res.json({ ok: true, files });
});

// GET /api/v1/github/structure - Repo file tree
app.get('/api/v1/github/structure', async (req, res) => {
  const path = req.query.path || '';
  const recursive = req.query.recursive === 'true';
  const structure = await githubProvider.getRepoStructure(path, recursive);
  res.json({ ok: !!structure, structure: structure || null });
});

// GET /api/v1/github/context - Full context for providers
// Returns repo info, recent issues, and README for system prompts
app.get('/api/v1/github/context', async (req, res) => {
  const context = await githubProvider.getContextForProviders();
  res.json({ ok: !!context, context });
});

// POST /api/v1/github/analyze - Ask providers to analyze the repo
// Example: "What are the main architectural patterns used?"
app.post('/api/v1/github/analyze', async (req, res) => {
  const { question, providers = ['claude', 'gpt', 'gemini'], depth = 'medium' } = req.body || {};

  if (!question) {
    return res.status(400).json({ ok: false, error: 'question required' });
  }

  // Get repo context
  const context = await githubProvider.getContextForProviders();

  // Build analysis prompt
  const systemPrompt = `You are a code analyst for the TooLoo.ai GitHub repository.
You have access to the project context below and should provide insightful analysis.

${context}

Provide clear, actionable insights.`;
  // Wire into LLM provider system. If specific providers are requested, attempt to call them directly.
  try {
    const llm = new LLMProvider();

    // Helper: map friendly provider names to LLMProvider keys
    const mapProvider = (p) => {
      if (!p) return null;
      const key = String(p).toLowerCase();
      if (key === 'claude') return 'anthropic';
      if (key === 'gpt' || key === 'openai') return 'openai';
      if (key === 'gemini') return 'gemini';
      if (key === 'ollama') return 'ollama';
      if (key === 'localai') return 'localai';
      if (key === 'openinterpreter') return 'openinterpreter';
      if (key === 'deepseek') return 'deepseek';
      if (key === 'hf' || key === 'huggingface') return 'huggingface';
      return key;
    };

    let results = [];

    if (providers && Array.isArray(providers) && providers.length > 0) {
      // Call each requested provider in parallel (best-effort)
      const calls = providers.map(async (p) => {
        const key = mapProvider(p);
        if (!key || !llm.providers[key]) {
          return { provider: key || p, ok: false, error: 'provider-unavailable' };
        }

        try {
          // Route to explicit provider call if available on the LLMProvider
          switch (key) {
          case 'anthropic': {
            const r = await llm.callClaude(question, systemPrompt);
            return { provider: 'anthropic', ok: true, ...r };
          }
          case 'openai': {
            const r = await llm.callOpenAI(question, systemPrompt);
            return { provider: 'openai', ok: true, ...r };
          }
          case 'gemini': {
            const r = await llm.callGemini(question, systemPrompt);
            return { provider: 'gemini', ok: true, ...r };
          }
          case 'ollama': {
            const r = await llm.callOllama(question, systemPrompt);
            return { provider: 'ollama', ok: true, ...r };
          }
          case 'localai': {
            const r = await llm.callLocalAI(question, systemPrompt);
            return { provider: 'localai', ok: true, ...r };
          }
          case 'openinterpreter': {
            const r = await llm.callOpenInterpreter(question, systemPrompt);
            return { provider: 'openinterpreter', ok: true, ...r };
          }
          case 'huggingface': {
            const r = await llm.callHuggingFace(question, systemPrompt);
            return { provider: 'huggingface', ok: true, ...r };
          }
          case 'deepseek': {
            const r = await llm.callDeepSeek(question, systemPrompt);
            return { provider: 'deepseek', ok: true, ...r };
          }
          default: {
            // Fall back to the orchestrator selection
            const r = await llm.generateSmartLLM({ prompt: question, system: systemPrompt });
            return { provider: r.provider || 'auto', ok: true, ...r };
          }
          }
        } catch (err) {
          return { provider: key || p, ok: false, error: String(err?.message || err) };
        }
      });

      results = await Promise.all(calls);
    } else {
      // No specific providers requested: let the orchestrator pick the best one
      const r = await llm.generateSmartLLM({ prompt: question, system: systemPrompt });
      results = [{ provider: r.provider || 'auto', ok: true, ...r }];
    }

    res.json({ ok: true, question, providers, depth, status: 'done', results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    server: 'github-context',
    configured: githubProvider.isConfigured(),
    repo: process.env.GITHUB_REPO
  });
});

app.listen(PORT, () => {
  console.log(`🔗 GitHub Context Server running on http://localhost:${PORT}`);
  if (githubProvider.isConfigured()) {
    console.log(`   📁 Repo: ${process.env.GITHUB_REPO}`);
    console.log('   ✓ GitHub API access enabled');
  } else {
    console.log('   ⚠️  GitHub not configured. Set GITHUB_TOKEN and GITHUB_REPO in .env');
  }
});
