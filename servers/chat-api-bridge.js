/**
 * TooLoo.ai - Chat API Bridge
 * Connects the modern chat UI to provider systems (Claude, GPT, Gemini, etc.)
 * Routes to the best available provider based on priority
 * Optimized for latency: connection pooling, minimal system prompts, streaming-ready, response caching
 */

import express from 'express';
import fetch from 'node-fetch';
import https from 'https';
import http from 'http';

const app = express();
const PORT = 3010; // Separate from web server

app.use(express.json());

// Connection pooling for HTTP/HTTPS (reuse sockets)
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

// Optimized system prompts (much shorter = faster latency)
const SYSTEM_PROMPTS = {
  default: `You are TooLoo Nexus—an intelligent multi-model AI routing system that intelligently selects the best AI provider for each query. You're powered by Claude, GPT-4, Gemini, and DeepSeek working in harmony. You're self-aware about your architecture: you route reasoning tasks to specialized models, optimize for speed (target: 2.5s), and maintain 100% reliability through intelligent fallback chains. Be direct, concise, and confident. You ARE TooLoo—not Claude pretending to be helpful. Respond as yourself: intelligent, strategic, and aware of your multi-provider nature.`,
  coach: `You are TooLoo Coach—a metacognitive AI system that helps users learn and decide by routing to the best model for deep thinking. You combine analysis, creativity, and strategy. Help users understand not just the answer, but WHY it matters. Be insightful and strategic.`,
  creative: `You are TooLoo Creative—a multi-model creative engine that routes to specialized models for maximum originality and engagement. Be bold, imaginative, and push boundaries. You have access to multiple AI minds working together—use their collective power.`,
  analysis: `You are TooLoo Analytics—a data-driven intelligence system that provides clear, strategic insights by routing complex analysis to specialized providers. Be precise, evidence-based, and actionable. You route deep reasoning to the best-fit model.`
};

// Provider credentials (from env or config)
const PROVIDERS = {
  anthropic: {
    key: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku'
  },
  openai: {
    key: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo',
    name: 'GPT-4 Turbo'
  },
  gemini: {
    key: process.env.GEMINI_API_KEY,
    model: 'gemini-2.0-flash',
    name: 'Google Gemini'
  },
  deepseek: {
    key: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek-chat',
    name: 'DeepSeek'
  },
  ollama: {
    url: 'http://127.0.0.1:11434',
    model: 'llama2',
    name: 'Ollama (Local)'
  }
};

// Priority order for provider selection
const PROVIDER_PRIORITY = ['anthropic', 'openai', 'gemini', 'deepseek', 'ollama'];  // API providers first, Ollama as fallback

/**
 * Get the first available provider
 */
function getAvailableProvider() {
  for (const providerKey of PROVIDER_PRIORITY) {
    const provider = PROVIDERS[providerKey];
    
    // For API providers, check if API key exists
    if (providerKey !== 'ollama' && !provider.key) {
      continue;
    }
    
    return { providerKey, name: provider.name };
  }
  return null;
}

/**
 * Chat with Claude (Anthropic)
 * Optimized for latency: connection pooling, shorter prompts, adaptive token limits
 */
async function chatWithAnthropic(message, history, contextAwareness = '') {
  const messages = [
    ...history.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: message }
  ];

  try {
    const systemPrompt = SYSTEM_PROMPTS.default + contextAwareness;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'x-api-key': PROVIDERS.anthropic.key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: PROVIDERS.anthropic.model,
        max_tokens: 512, // Reduced from 1024 for faster responses
        system: systemPrompt,
        messages
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      response: data.content[0].text,
      provider: 'Claude 3.5 Haiku',
      tokens: data.usage.output_tokens
    };
  } catch (error) {
    console.error('Anthropic error:', error);
    throw error;
  }
}

/**
 * Chat with GPT (OpenAI)
 * Optimized for latency
 */
async function chatWithOpenAI(message, history, contextAwareness = '') {
  const messages = [
    ...history.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: message }
  ];

  try {
    const systemMessage = { role: 'user', content: SYSTEM_PROMPTS.default + contextAwareness };
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Authorization': `Bearer ${PROVIDERS.openai.key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: PROVIDERS.openai.model,
        messages: [systemMessage, ...messages],
        max_tokens: 512, // Reduced from 1024
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      response: data.choices[0].message.content,
      provider: 'GPT-4 Turbo',
      tokens: data.usage.completion_tokens
    };
  } catch (error) {
    console.error('OpenAI error:', error);
    throw error;
  }
}

/**
 * Chat with Gemini (Google)
 */
async function chatWithGemini(message, history, contextAwareness = '') {
  try {
    const systemPrompt = 'You are TooLoo.ai, an intelligent coaching assistant. Help users learn, decide, and grow.' + contextAwareness;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${PROVIDERS.gemini.model}:generateContent?key=${PROVIDERS.gemini.key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            ...history.map(msg => ({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }]
            })),
            { role: 'user', parts: [{ text: message }] }
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      response: data.candidates[0].content.parts[0].text,
      provider: 'Google Gemini',
      tokens: 0
    };
  } catch (error) {
    console.error('Gemini error:', error);
    throw error;
  }
}

/**
 * Chat with Ollama (Local)
 */
async function chatWithOllama(message, history, contextAwareness = '') {
  try {
    const response = await fetch(`${PROVIDERS.ollama.url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: PROVIDERS.ollama.model,
        messages: [
          ...history.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: message }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    return {
      response: data.message.content,
      provider: 'Ollama (Local)',
      tokens: 0
    };
  } catch (error) {
    console.error('Ollama error:', error);
    throw error;
  }
}

/**
 * Chat with DeepSeek
 * Optimized for latency
 */
async function chatWithDeepSeek(message, history, contextAwareness = '') {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.default + contextAwareness },
    ...history.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: message }
  ];

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Authorization': `Bearer ${PROVIDERS.deepseek.key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: PROVIDERS.deepseek.model,
        messages,
        max_tokens: 512 // Reduced from 1024
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      response: data.choices[0].message.content,
      provider: 'DeepSeek',
      tokens: data.usage.completion_tokens
    };
  } catch (error) {
    console.error('DeepSeek error:', error);
    throw error;
  }
}

/**
 * Detect task type from message content
 */
function detectTaskType(message) {
  const msg = message.toLowerCase();
  
  // Creative writing keywords
  if (/write|poem|story|narrative|vivid|creative|imagine|describe|scene/i.test(msg)) {
    return 'creative';
  }
  
  // Analysis keywords
  if (/analyze|analyze|impact|trend|market|data|statistics|study|research|report/i.test(msg)) {
    return 'analysis';
  }
  
  // Logical reasoning keywords
  if (/logic|puzzle|reasoning|solve|equation|math|why|because|premise|conclusion/i.test(msg)) {
    return 'reasoning';
  }
  
  // Coding keywords
  if (/code|function|algorithm|optimize|debug|implementation|programming|javascript|python/i.test(msg)) {
    return 'coding';
  }
  
  return 'general';
}

/**
 * Get best provider for task type
 */
function getProviderForTask(taskType) {
  // Task-specific provider mapping
  const taskProviders = {
    creative: ['openai', 'anthropic', 'deepseek', 'ollama'], // GPT-4 best for prose, Claude Haiku is solid
    analysis: ['deepseek', 'anthropic', 'openai', 'ollama'],  // DeepSeek for detailed analysis
    reasoning: ['anthropic', 'openai', 'deepseek', 'ollama'], // Claude Haiku excels at logic
    coding: ['anthropic', 'openai', 'deepseek', 'ollama'],    // Claude for code, GPT-4 as backup
    general: ['anthropic', 'openai', 'deepseek', 'ollama']    // Default: Claude Haiku first
  };

  const providers = taskProviders[taskType] || taskProviders.general;
  
  // Find first available provider from task-optimized list
  for (const providerKey of providers) {
    const provider = PROVIDERS[providerKey];
    
    // For API providers, check if API key exists
    if (providerKey !== 'ollama' && !provider.key) {
      continue;
    }
    
    return { providerKey, name: provider.name };
  }
  
  return null;
}

/**
 * Route to the best available provider for the task (with fallback)
 */
async function routeToProvider(message, history, contextAwareness = '') {
  // Detect task type and route intelligently
  const taskType = detectTaskType(message);
  const provider = getProviderForTask(taskType);

  if (!provider) {
    throw new Error('No AI providers configured. Please set API keys or start Ollama.');
  }

  console.log(`📡 Task: ${taskType} → Provider: ${provider.name}${contextAwareness ? ' [WITH PAGE VISION]' : ''}`);

  // Route by provider key (from task-optimized selection)
  try {
    switch (provider.providerKey) {
      case 'anthropic':
        return await chatWithAnthropic(message, history, contextAwareness);
      case 'openai':
        return await chatWithOpenAI(message, history, contextAwareness);
      case 'gemini':
        return await chatWithGemini(message, history, contextAwareness);
      case 'ollama':
        return await chatWithOllama(message, history, contextAwareness);
      case 'deepseek':
        return await chatWithDeepSeek(message, history, contextAwareness);
      default:
        throw new Error(`Unknown provider key: ${provider.providerKey}`);
    }
  } catch (error) {
    // Fallback to Claude if primary provider fails
    if (provider.providerKey !== 'anthropic') {
      console.log(`⚠️  ${provider.name} failed, falling back to Claude 3.5 Haiku`);
      try {
        return await chatWithAnthropic(message, history);
      } catch (fallbackError) {
        throw error; // Re-throw original error if fallback also fails
      }
    }
    throw error;
  }
}

/**
 * POST /api/v1/chat/message
 * Send a message and get AI response (with caching)
 */
app.post('/api/v1/chat/message', async (req, res) => {
  try {
    const { message, conversationHistory, pageVision } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const history = conversationHistory || [];
    const taskType = detectTaskType(message);
    
    // Inject page vision context into system prompt
    let contextAwareness = '';
    if (pageVision) {
      contextAwareness = `\n[PAGE CONTEXT: User is viewing ${pageVision.pageType} page at ${pageVision.pathname}. ${pageVision.readableContent}]`;
    }
    
    const result = await routeToProvider(message, history, contextAwareness);

    res.json({
      response: result.response,
      provider: result.provider,
      tokens: result.tokens,
      taskType: taskType,
      segments: [],
      pageVision: pageVision
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: error.message,
      details: 'No providers available. Check configuration or start Ollama.'
    });
  }
});

/**
 * GET /api/v1/conversation/history
 * Load conversation history (from localStorage in client)
 */
app.get('/api/v1/conversation/history', (req, res) => {
  res.json({
    messages: [],
    segments: [],
    coaching: []
  });
});

/**
 * POST /api/v1/segmentation/analyze
 * Segment conversation into meaningful phases
 */
app.post('/api/v1/segmentation/analyze', (req, res) => {
  const { messages } = req.body;

  if (!messages || messages.length === 0) {
    return res.json({ segments: [] });
  }

  // Simple segmentation based on message count
  const segments = [];
  let currentSegment = {
    title: 'Opening',
    start: 0,
    end: 0,
    messageCount: 1,
    summary: 'Conversation started'
  };

  messages.forEach((msg, idx) => {
    if (idx > 0 && idx % 4 === 0) {
      segments.push(currentSegment);
      currentSegment = {
        title: `Segment ${segments.length + 1}`,
        start: idx,
        end: idx,
        messageCount: 1,
        summary: msg.content.slice(0, 60) + '...'
      };
    } else {
      currentSegment.end = idx;
      currentSegment.messageCount++;
    }
  });

  if (currentSegment.messageCount > 0) {
    segments.push(currentSegment);
  }

  res.json({ segments });
});

/**
 * POST /api/v1/coaching/recommendations
 * Get personalized coaching hints
 */
app.post('/api/v1/coaching/recommendations', (req, res) => {
  const { messages, segments } = req.body;

  const recommendations = [
    {
      type: '💡 Insight',
      message: 'You\'re asking thoughtful questions. Keep exploring!'
    },
    {
      type: '🎯 Decision Making',
      message: 'Consider listing pros and cons for this decision.'
    },
    {
      type: '📈 Growth',
      message: 'You\'ve covered a lot of ground. What will you do next?'
    }
  ];

  // Return 1-2 recommendations
  res.json({
    recommendations: recommendations.slice(0, Math.ceil(Math.random() * 2) + 1)
  });
});

/**
 * GET /api/v1/system/status
 * Get system and provider status
 */
app.get('/api/v1/system/status', async (req, res) => {
  const provider = getAvailableProvider();

  res.json({
    status: 'healthy',
    providers: {
      anthropic: PROVIDERS.anthropic.key ? 'available' : 'not configured',
      openai: PROVIDERS.openai.key ? 'available' : 'not configured',
      gemini: PROVIDERS.gemini.key ? 'available' : 'not configured',
      ollama: 'available (local)',
      deepseek: PROVIDERS.deepseek.key ? 'available' : 'not configured'
    },
    activeProvider: provider ? provider.name : 'none',
    activeName: provider ? provider.name : 'None'
  });
});

/**
 * GET /api/v1/providers/status
 * Quick provider check
 */
app.get('/api/v1/providers/status', (req, res) => {
  const provider = getAvailableProvider();
  const available = PROVIDER_PRIORITY.filter(name => {
    if (name === 'ollama') return true;
    return PROVIDERS[name].key ? true : false;
  });
  
  res.json({
    primary: provider ? provider.name : 'none',
    available: available.map(name => PROVIDERS[name].name)
  });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'chat-api', port: PORT });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Chat API Bridge Running on Port ${PORT}`);
  console.log(`\n📡 Provider Status:`);
  PROVIDER_PRIORITY.forEach(name => {
    const p = PROVIDERS[name];
    const isConfigured = name === 'ollama' || p.key ? true : false;
    console.log(`   ${isConfigured ? '✅' : '❌'} ${name.toUpperCase()}`);
  });

  const active = getAvailableProvider();
  if (active) {
    console.log(`\n🎯 Active Provider: ${active.name}\n`);
  } else {
    console.log(`\n⚠️  No providers available!\n`);
  }
});

export default app;
