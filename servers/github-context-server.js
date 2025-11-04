import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.GITHUB_CONTEXT_PORT || 3010;

// Middleware
app.use(cors());
app.use(express.json());

// Provider configurations with fallback chain: Ollama → Claude → OpenAI → Gemini → DeepSeek
const PROVIDERS = {
  ollama: {
    name: 'Ollama',
    enabled: !!process.env.OLLAMA_API_URL,
    baseURL: process.env.OLLAMA_API_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama2',
    timeout: 30000
  },
  claude: {
    name: 'Claude',
    enabled: !!process.env.ANTHROPIC_API_KEY,
    baseURL: 'https://api.anthropic.com/v1/messages',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
    timeout: 30000
  },
  openai: {
    name: 'OpenAI',
    enabled: !!process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com',
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    timeout: 30000
  },
  gemini: {
    name: 'Gemini',
    enabled: !!process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/models',
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-pro',
    timeout: 30000
  },
  deepseek: {
    name: 'DeepSeek',
    enabled: !!process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    timeout: 30000
  }
};

// Get fallback chain in order
function getProviderChain() {
  const chain = ['ollama', 'claude', 'openai', 'gemini', 'deepseek'];
  return chain.filter(name => PROVIDERS[name].enabled);
}

// Helper: Build OpenAI-compatible chat completions URL
function buildChatCompletionsURL(baseURL) {
  return baseURL.includes('/chat/completions') 
    ? baseURL 
    : `${baseURL}/v1/chat/completions`;
}

// Helper: Extract error message from various provider response formats
function extractErrorMessage(error) {
  // Try different error response structures
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error.response?.data?.error) {
    return typeof error.response.data.error === 'string' 
      ? error.response.data.error 
      : JSON.stringify(error.response.data.error);
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  return error.message || 'Unknown error';
}

// Call Ollama provider
async function callOllama(systemPrompt, question, config) {
  const response = await axios.post(
    `${config.baseURL}/api/generate`,
    {
      model: config.model,
      prompt: `${systemPrompt}\n\nQuestion: ${question}`,
      stream: false
    },
    {
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  return {
    content: response.data.response,
    tokens: {
      prompt: response.data.prompt_eval_count || 0,
      completion: response.data.eval_count || 0,
      total: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
    }
  };
}

// Call Claude provider
async function callClaude(systemPrompt, question, config) {
  const response = await axios.post(
    config.baseURL,
    {
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: question
        }
      ]
    },
    {
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      }
    }
  );

  return {
    content: response.data.content[0].text,
    tokens: {
      prompt: response.data.usage.input_tokens,
      completion: response.data.usage.output_tokens,
      total: response.data.usage.input_tokens + response.data.usage.output_tokens
    }
  };
}

// Call OpenAI provider
async function callOpenAI(systemPrompt, question, config) {
  const url = buildChatCompletionsURL(config.baseURL);
    
  const response = await axios.post(
    url,
    {
      model: config.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: question
        }
      ]
    },
    {
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      }
    }
  );

  return {
    content: response.data.choices[0].message.content,
    tokens: {
      prompt: response.data.usage.prompt_tokens,
      completion: response.data.usage.completion_tokens,
      total: response.data.usage.total_tokens
    }
  };
}

// Call Gemini provider
async function callGemini(systemPrompt, question, config) {
  const response = await axios.post(
    `${config.baseURL}/${config.model}:generateContent?key=${config.apiKey}`,
    {
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\nQuestion: ${question}`
            }
          ]
        }
      ]
    },
    {
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  return {
    content: response.data.candidates[0].content.parts[0].text,
    tokens: {
      prompt: response.data.usageMetadata?.promptTokenCount || 0,
      completion: response.data.usageMetadata?.candidatesTokenCount || 0,
      total: response.data.usageMetadata?.totalTokenCount || 0
    }
  };
}

// Call DeepSeek provider
async function callDeepSeek(systemPrompt, question, config) {
  const url = buildChatCompletionsURL(config.baseURL);
    
  const response = await axios.post(
    url,
    {
      model: config.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: question
        }
      ]
    },
    {
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      }
    }
  );

  return {
    content: response.data.choices[0].message.content,
    tokens: {
      prompt: response.data.usage.prompt_tokens,
      completion: response.data.usage.completion_tokens,
      total: response.data.usage.total_tokens
    }
  };
}

// Provider call functions map
const PROVIDER_FUNCTIONS = {
  ollama: callOllama,
  claude: callClaude,
  openai: callOpenAI,
  gemini: callGemini,
  deepseek: callDeepSeek
};

// Call AI provider with fallback
async function callProviderWithFallback(systemPrompt, question) {
  const chain = getProviderChain();
  
  if (chain.length === 0) {
    throw new Error('No AI providers configured. Please set up at least one provider API key.');
  }

  const errors = [];
  
  for (const providerName of chain) {
    const config = PROVIDERS[providerName];
    const callFunction = PROVIDER_FUNCTIONS[providerName];
    
    try {
      console.log(`[GitHub Context] Attempting provider: ${config.name}`);
      const result = await callFunction(systemPrompt, question, config);
      
      console.log(`[GitHub Context] Success with ${config.name}. Tokens: ${result.tokens.total}`);
      
      return {
        ok: true,
        analysis: result.content,
        provider: config.name,
        tokens: result.tokens,
        error: null
      };
    } catch (error) {
      const errorMsg = extractErrorMessage(error);
      console.error(`[GitHub Context] ${config.name} failed:`, errorMsg);
      errors.push({
        provider: config.name,
        error: errorMsg
      });
      
      // Continue to next provider in chain
      continue;
    }
  }
  
  // All providers failed
  return {
    ok: false,
    analysis: null,
    provider: null,
    tokens: null,
    error: {
      message: 'All providers failed',
      attempts: errors
    }
  };
}

// Build system prompt for GitHub repository context
function buildSystemPrompt(repoContext = {}) {
  const {
    owner = 'unknown',
    repo = 'unknown',
    files = [],
    structure = 'Not provided',
    readme = 'Not provided',
    depth = 'basic'
  } = repoContext;

  let prompt = `You are an expert code analyst examining the GitHub repository: ${owner}/${repo}\n\n`;
  
  if (depth === 'full' && files.length > 0) {
    prompt += `## Repository Files Analyzed:\n${files.join(', ')}\n\n`;
  }
  
  if (structure !== 'Not provided') {
    prompt += `## Repository Structure:\n${structure}\n\n`;
  }
  
  if (readme !== 'Not provided') {
    prompt += `## README Content:\n${readme}\n\n`;
  }
  
  prompt += `Provide insightful, actionable analysis based on the repository context. Focus on:
- Code quality and architecture
- Potential issues or concerns
- Best practices and improvements
- Security considerations
- Maintainability and scalability

Be specific and reference actual code patterns when possible.`;

  return prompt;
}

// POST /api/v1/github/ask - Ask AI about GitHub repository context
app.post('/api/v1/github/ask', async (req, res) => {
  try {
    const { question, repoContext, depth = 'basic' } = req.body;
    
    if (!question) {
      return res.status(400).json({
        ok: false,
        error: 'Question is required'
      });
    }
    
    console.log(`[GitHub Context] Processing question: "${question}" (depth: ${depth})`);
    
    // Build system prompt with repository context
    const systemPrompt = buildSystemPrompt({
      ...repoContext,
      depth
    });
    
    // Call AI provider with fallback chain
    const result = await callProviderWithFallback(systemPrompt, question);
    
    res.json(result);
    
  } catch (error) {
    console.error('[GitHub Context] Error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// GET /api/v1/github/providers - List available providers
app.get('/api/v1/github/providers', (req, res) => {
  const chain = getProviderChain();
  const providerStatus = Object.entries(PROVIDERS).map(([name, config]) => ({
    name: config.name,
    enabled: config.enabled,
    model: config.model
  }));
  
  res.json({
    ok: true,
    providers: providerStatus,
    fallbackChain: chain.map(name => PROVIDERS[name].name),
    activeProvider: chain.length > 0 ? PROVIDERS[chain[0]].name : null
  });
});

// GET /health - Health check
app.get('/health', (req, res) => {
  const chain = getProviderChain();
  res.json({
    ok: true,
    status: 'healthy',
    service: 'github-context-server',
    providersConfigured: chain.length,
    activeProviders: chain.map(name => PROVIDERS[name].name)
  });
});

// Start server
app.listen(PORT, () => {
  const chain = getProviderChain();
  console.log(`\n🚀 GitHub Context Server running on port ${PORT}`);
  console.log(`📊 Configured providers: ${chain.length}`);
  if (chain.length > 0) {
    console.log(`🔄 Fallback chain: ${chain.map(name => PROVIDERS[name].name).join(' → ')}`);
  } else {
    console.log(`⚠️  Warning: No providers configured. Set API keys in .env file.`);
  }
  console.log(`\nEndpoints:`);
  console.log(`  POST http://localhost:${PORT}/api/v1/github/ask`);
  console.log(`  GET  http://localhost:${PORT}/api/v1/github/providers`);
  console.log(`  GET  http://localhost:${PORT}/health\n`);
});
