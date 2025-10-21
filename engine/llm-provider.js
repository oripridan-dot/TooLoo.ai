/**
 * LLM Provider Orchestrator (Real Providers)
 * Uses available API keys to select the cheapest suitable provider.
 * Fallback chain: DeepSeek → Anthropic Claude → OpenAI → Google Gemini.
 * If no keys are available, returns a clear configuration message.
 */

import DomainExpertise from './domain-expertise.js';
import ContinuousLearning from './continuous-learning.js';

const env = (name, def = undefined) => (process.env[name] ?? def);

const DEEPSEEK_DEFAULT_MODEL = env('DEEPSEEK_MODEL', 'deepseek-chat');
const CLAUDE_DEFAULT_MODEL = env('ANTHROPIC_MODEL', 'claude-3-5-haiku-20241022');
const OPENAI_DEFAULT_MODEL = env('OPENAI_MODEL', 'gpt-4o-mini');
const GEMINI_DEFAULT_MODEL = env('GEMINI_MODEL', 'gemini-1.5-pro');
const OLLAMA_DEFAULT_MODEL = env('OLLAMA_MODEL', 'llama3.2:latest');
const LOCALAI_DEFAULT_MODEL = env('LOCALAI_MODEL', 'gpt-4');
const OI_DEFAULT_MODEL = env('OI_MODEL', 'ollama/llama3.2');
const HF_DEFAULT_MODEL = env('HF_MODEL', 'microsoft/DialoGPT-large');

export default class LLMProvider {
  constructor(options = {}) {
    this.providers = {
      // Paid providers
      deepseek: !!env('DEEPSEEK_API_KEY'),
      anthropic: !!env('ANTHROPIC_API_KEY'),
      openai: !!env('OPENAI_API_KEY'),
      gemini: !!env('GEMINI_API_KEY'),
      
      // Open Source / Local providers
      ollama: this.checkOllamaAvailable(),
      localai: this.checkLocalAIAvailable(),
      openinterpreter: this.checkOpenInterpreterAvailable(),
      huggingface: !!env('HF_API_KEY')  // Free tier option
    };

    this.defaultModel = {
      deepseek: DEEPSEEK_DEFAULT_MODEL,
      anthropic: CLAUDE_DEFAULT_MODEL,
      openai: OPENAI_DEFAULT_MODEL,
      gemini: GEMINI_DEFAULT_MODEL,
      
      // OSS models
      ollama: OLLAMA_DEFAULT_MODEL,
      localai: LOCALAI_DEFAULT_MODEL,
      openinterpreter: OI_DEFAULT_MODEL,
      huggingface: HF_DEFAULT_MODEL
    };

    this.baseUrls = {
      ollama: env('OLLAMA_BASE_URL', 'http://localhost:11434'),
      localai: env('LOCALAI_BASE_URL', 'http://localhost:8080'),
      openinterpreter: env('OI_BASE_URL', 'http://localhost:8000'),
      huggingface: 'https://api-inference.huggingface.co'
    };

    // Initialize domain expertise system
    this.domainExpertise = new DomainExpertise();

    // Initialize continuous learning system
    this.learning = new ContinuousLearning();
  }

  // Check if Ollama is running locally
  checkOllamaAvailable() {
    // In production, you'd want to ping the endpoint
    // For now, assume available if base URL is configured or default port might be open
    return !!env('OLLAMA_BASE_URL') || env('ENABLE_OLLAMA') === 'true';
  }

  // Check if LocalAI is running
  checkLocalAIAvailable() {
    return !!env('LOCALAI_BASE_URL') || env('ENABLE_LOCALAI') === 'true';
  }

  // Check if Open Interpreter server is available
  checkOpenInterpreterAvailable() {
    return !!env('OI_BASE_URL') || env('ENABLE_OPEN_INTERPRETER') === 'true';
  }

  available() {
    return Object.values(this.providers).some(Boolean);
  }

  selectProvider(taskType = 'chat') {
    // Default chat: Prefer Ollama, then others
    const order = [
      'ollama',        // Free local inference (Ollama)
      'anthropic',     // Premium reasoning (Claude)
      'openai',        // Premium reliable
      'gemini',        // Premium creative
      'localai',       // Free local OpenAI-compatible
      'huggingface',   // Free tier (with limits)
      'openinterpreter', // Local with code execution
      'deepseek'       // Fallback only
    ];
    
    // For code tasks, prefer local code-capable models
    if (taskType === 'code' || taskType === 'programming') {
      const codeOrder = ['openinterpreter', 'ollama', 'deepseek', 'openai', 'anthropic'];
      for (const p of codeOrder) {
        if (this.providers[p]) return p;
      }
    }
    
    // For reasoning tasks, prefer premium models
    if (taskType === 'reasoning' || taskType === 'analysis') {
      const reasoningOrder = ['anthropic', 'openai', 'gemini', 'deepseek', 'ollama'];
      for (const p of reasoningOrder) {
        if (this.providers[p]) return p;
      }
    }
    
    // Default cost-optimized order
    for (const p of order) {
      if (this.providers[p]) return p;
    }
    return null;
  }

  async generateSmartLLM(request) {
    const { prompt, system, taskType = 'chat', context = {} } = request || {};
    if (!prompt || typeof prompt !== 'string') {
      return {
        content: 'Missing prompt. Please provide a text prompt to generate a response.',
        provider: 'validation',
        confidence: 0.0
      };
    }

    // Detect domain expertise from the prompt
    const detectedDomain = this.domainExpertise.detectDomain(prompt, context);
    
    // Get domain-specific system prompt if available
    let enhancedSystem = system;
    if (detectedDomain !== 'general') {
      const domainPrompt = this.domainExpertise.getDomainPrompt(detectedDomain);
      if (domainPrompt) {
        enhancedSystem = domainPrompt + (system ? '\n\n' + system : '');
      }
    }

    // Select provider considering domain expertise and learning data
    const availableProviders = Object.keys(this.providers).filter(p => this.providers[p]);
    let provider;

    if (detectedDomain !== 'general') {
      // First try learning-based recommendation for this domain
      provider = this.learning.getBestProviderForDomain(detectedDomain, availableProviders);

      // Fallback to domain expertise preferences
      if (!provider) {
        provider = this.domainExpertise.selectProviderForDomain(detectedDomain, taskType, availableProviders);
      }
    }

    // Fallback to standard task-based selection
    if (!provider) {
      provider = this.selectProvider(taskType);
    }

    if (!provider) {
      return {
        content: 'No AI provider configured. Add API keys or enable local providers in .env:\n' +
                'PAID: DEEPSEEK_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY\n' +
                'FREE: ENABLE_OLLAMA=true, ENABLE_LOCALAI=true, HF_API_KEY (free tier)',
        provider: 'unconfigured',
        confidence: 0.0
      };
    }

    const fns = {
      deepseek: () => this.callDeepSeek(prompt, enhancedSystem, taskType, context),
      anthropic: () => this.callClaude(prompt, enhancedSystem, taskType, context),
      openai: () => this.callOpenAI(prompt, enhancedSystem, taskType, context),
      gemini: () => this.callGemini(prompt, enhancedSystem, taskType, context),
      
      // OSS providers
      ollama: () => this.callOllama(prompt, enhancedSystem, taskType, context),
      localai: () => this.callLocalAI(prompt, enhancedSystem, taskType, context),
      openinterpreter: () => this.callOpenInterpreter(prompt, enhancedSystem, taskType, context),
      huggingface: () => this.callHuggingFace(prompt, enhancedSystem, taskType, context)
    };

  // Default chat fallback: Ollama first
  const order = ['ollama', 'anthropic', 'openai', 'gemini', 'localai', 'huggingface', 'openinterpreter', 'deepseek'];
  const startIdx = order.indexOf(provider);
  const tryOrder = order.slice(startIdx).concat(order.slice(0, startIdx));

    let lastError = null;
    const startTime = Date.now();

    for (const p of tryOrder) {
      if (!this.providers[p]) continue;
      try {
        const result = await fns[p]();
        const latency = Date.now() - startTime;
        const success = result.content && result.content.length > 10 && !result.content.includes('error'); // Basic success detection

        // Record the interaction for learning
        this.learning.recordInteraction(prompt, detectedDomain, p, success, latency);

        return { ...result, provider: p, domain: detectedDomain, latency };
      } catch (err) {
        lastError = err;
        // Continue to next provider
      }
    }

    return {
      content: `All providers failed. ${lastError ? 'Last error: ' + (lastError.message || lastError) : ''}`,
      provider: 'failed',
      confidence: 0.0
    };
  }

  async callDeepSeek(prompt, system, taskType, context) {
    const apiKey = env('DEEPSEEK_API_KEY');
    const model = this.defaultModel.deepseek;
    if (!apiKey) throw new Error('DeepSeek not configured');

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const err = await safeJson(res);
      throw new Error(`DeepSeek error ${res.status}: ${JSON.stringify(err)}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return { content: text, confidence: 0.85 };
  }

  async callClaude(prompt, system, taskType, context) {
    const apiKey = env('ANTHROPIC_API_KEY');
    const model = this.defaultModel.anthropic;
    if (!apiKey) throw new Error('Anthropic not configured');

    const messages = [];
    if (system) {
      messages.push({ role: 'user', content: system });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages
      })
    });

    if (!res.ok) {
      const err = await safeJson(res);
      throw new Error(`Claude error ${res.status}: ${JSON.stringify(err)}`);
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text || data?.content?.[0]?.content?.[0]?.text || '';
    return { content: text, confidence: 0.9 };
  }

  async callOpenAI(prompt, system, taskType, context) {
    const apiKey = env('OPENAI_API_KEY');
    const model = this.defaultModel.openai;
    if (!apiKey) throw new Error('OpenAI not configured');

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const err = await safeJson(res);
      throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return { content: text, confidence: 0.88 };
  }

  async callGemini(prompt, system, taskType, context) {
    const apiKey = env('GEMINI_API_KEY');
    const model = this.defaultModel.gemini;
    if (!apiKey) throw new Error('Gemini not configured');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const contents = [
      { role: 'user', parts: [{ text: system ? `${system}\n\n${prompt}` : prompt }] }
    ];
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    if (!res.ok) {
      const err = await safeJson(res);
      throw new Error(`Gemini error ${res.status}: ${JSON.stringify(err)}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { content: text, confidence: 0.75 };
  }

  // OSS Provider implementations
  async callOllama(prompt, system, taskType, context) {
    const baseUrl = this.baseUrls.ollama;
    const model = this.defaultModel.ollama;
    
    if (!this.providers.ollama) {
      throw new Error('Ollama not enabled. Set ENABLE_OLLAMA=true in .env');
    }

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
      }
      
      const data = await res.json();
      const text = data?.message?.content || '';
      return { content: text, confidence: 0.8 }; // Local models often good quality
    } catch (error) {
      throw new Error(`Ollama connection failed: ${error.message}. Ensure Ollama is running on ${baseUrl}`);
    }
  }

  async callLocalAI(prompt, system, taskType, context) {
    const baseUrl = this.baseUrls.localai;
    const model = this.defaultModel.localai;
    
    if (!this.providers.localai) {
      throw new Error('LocalAI not enabled. Set ENABLE_LOCALAI=true in .env');
    }

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    try {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer not-needed' // LocalAI doesn't require real auth
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!res.ok) {
        throw new Error(`LocalAI error ${res.status}: ${await res.text()}`);
      }
      
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || '';
      return { content: text, confidence: 0.75 };
    } catch (error) {
      throw new Error(`LocalAI connection failed: ${error.message}. Ensure LocalAI is running on ${baseUrl}`);
    }
  }

  async callOpenInterpreter(prompt, system, taskType, context) {
    const baseUrl = this.baseUrls.openinterpreter;
    const model = this.defaultModel.openinterpreter;
    
    if (!this.providers.openinterpreter) {
      throw new Error('Open Interpreter not enabled. Set ENABLE_OPEN_INTERPRETER=true in .env');
    }

    try {
      // Open Interpreter specific API for code execution + chat
      const res = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${system ? system + '\n\n' : ''}${prompt}`,
          model: model,
          auto_run: false, // Safety: don't auto-execute code
          display: false   // Return structured response
        })
      });

      if (!res.ok) {
        throw new Error(`Open Interpreter error ${res.status}: ${await res.text()}`);
      }
      
      const data = await res.json();
      // Open Interpreter returns array of message chunks
      const text = Array.isArray(data) 
        ? data.map(chunk => chunk.content || chunk.message || '').join('')
        : data.content || data.message || '';
        
      return { 
        content: text, 
        confidence: 0.85, // High for code tasks
        canExecuteCode: true // Special capability
      };
    } catch (error) {
      throw new Error(`Open Interpreter connection failed: ${error.message}. Ensure OI server is running on ${baseUrl}`);
    }
  }

  async callHuggingFace(prompt, system, taskType, context) {
    const apiKey = env('HF_API_KEY');
    const model = this.defaultModel.huggingface;
    const baseUrl = this.baseUrls.huggingface;
    
    if (!apiKey) {
      throw new Error('HuggingFace API key not configured. Set HF_API_KEY in .env');
    }

    try {
      // Use inference API for text generation
      const fullPrompt = system ? `${system}\n\nUser: ${prompt}\nAssistant:` : `User: ${prompt}\nAssistant:`;
      
      const res = await fetch(`${baseUrl}/models/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            return_full_text: false
          }
        })
      });

      if (!res.ok) {
        throw new Error(`HuggingFace error ${res.status}: ${await res.text()}`);
      }
      
      const data = await res.json();
      const text = Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || '';
      
      return { 
        content: text.replace(/^User:.*?Assistant:\s*/s, '').trim(), 
        confidence: 0.65, // Free tier, variable quality
        costUSD: 0 // Free tier
      };
    } catch (error) {
      throw new Error(`HuggingFace API failed: ${error.message}`);
    }
  }
}

async function safeJson(res) {
  try { return await res.json(); } catch { return await res.text(); }
}
// Unified LLM provider for TooLoo.ai
import fetch from 'node-fetch';
import dotenv from 'dotenv';
// Fallback: load env if not already loaded by parent
try { dotenv.config(); } catch {}

// Normalize certain provider keys (e.g., Gemini keys may be pasted with a leading 'sk-' prefix)
const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').startsWith('sk-')
  ? (process.env.GEMINI_API_KEY || '').slice(3)
  : (process.env.GEMINI_API_KEY || '');

const PROVIDERS = {
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    key: process.env.DEEPSEEK_API_KEY,
    header: 'Authorization',
    model: DEEPSEEK_DEFAULT_MODEL,
    format: (prompt) => ({ messages: [{ role: 'user', content: prompt }], model: DEEPSEEK_DEFAULT_MODEL, max_tokens: 512 })
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    key: GEMINI_KEY,
    header: 'x-goog-api-key',
    model: GEMINI_DEFAULT_MODEL,
    format: (prompt) => ({ contents: [{ parts: [{ text: prompt }] }] })
  },
  claude: {
    url: 'https://api.anthropic.com/v1/messages',
    key: process.env.ANTHROPIC_API_KEY,
    header: 'x-api-key',
    model: CLAUDE_DEFAULT_MODEL,
    format: (prompt) => ({
      model: CLAUDE_DEFAULT_MODEL,
      max_tokens: 512,
      messages: [
        { role: 'user', content: [ { type: 'text', text: prompt } ] }
      ]
    })
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    key: process.env.OPENAI_API_KEY,
    header: 'Authorization',
    model: OPENAI_DEFAULT_MODEL,
    format: (prompt) => ({ model: OPENAI_DEFAULT_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 512 })
  },
  huggingface: {
    url: 'https://api-inference.huggingface.co/models/gpt2',
    key: process.env.HF_API_KEY,
    header: 'Authorization',
    model: HF_DEFAULT_MODEL,
    format: (prompt) => ({ inputs: prompt })
  },
  // OSS/Local providers
  ollama: {
    url: `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`,
    key: 'not-needed', // Ollama typically doesn't require auth
    header: 'Authorization',
    model: OLLAMA_DEFAULT_MODEL,
    format: (prompt) => ({ 
      model: OLLAMA_DEFAULT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false
    })
  },
  localai: {
    url: `${process.env.LOCALAI_BASE_URL || 'http://localhost:8080'}/v1/chat/completions`,
    key: 'not-needed', // LocalAI doesn't require real auth
    header: 'Authorization',
    model: LOCALAI_DEFAULT_MODEL,
    format: (prompt) => ({ 
      model: LOCALAI_DEFAULT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512
    })
  },
  openinterpreter: {
    url: `${process.env.OI_BASE_URL || 'http://localhost:8000'}/chat`,
    key: 'not-needed',
    header: 'Authorization',
    model: OI_DEFAULT_MODEL,
    format: (prompt) => ({ 
      message: prompt,
      model: OI_DEFAULT_MODEL,
      auto_run: false,
      display: false
    })
  }
};

export async function generateLLM({ prompt, provider, system, maxTokens }) {
  const p = PROVIDERS[provider];
  if (!p || !p.key) throw new Error('Provider or API key missing');
  const headers = { 'Content-Type': 'application/json' };
  if (p.header === 'Authorization') headers[p.header] = `Bearer ${p.key}`;
  else headers[p.header] = p.key;
  if (provider === 'openai'){
    if (process.env.OPENAI_ORG) headers['OpenAI-Organization'] = process.env.OPENAI_ORG;
    if (process.env.OPENAI_PROJECT) headers['OpenAI-Project'] = process.env.OPENAI_PROJECT;
  }
  if (provider === 'claude') headers['anthropic-version'] = '2023-06-01';
  
  // Build body with optional system prompt and maxTokens override
  let bodyObj = p.format(prompt);
  
  // Inject system prompt for providers that support it
  if (system) {
    if (provider === 'deepseek' || provider === 'openai') {
      // For chat completion providers, prepend system message
      if (bodyObj.messages && Array.isArray(bodyObj.messages)) {
        bodyObj.messages.unshift({ role: 'system', content: system });
      }
    } else if (provider === 'claude') {
      // Claude uses system parameter at root level
      bodyObj.system = system;
    } else if (provider === 'gemini') {
      // Gemini uses systemInstruction
      bodyObj.systemInstruction = { parts: [{ text: system }] };
    } else if (provider === 'ollama' || provider === 'localai') {
      // Ollama/LocalAI support system message
      if (bodyObj.messages && Array.isArray(bodyObj.messages)) {
        bodyObj.messages.unshift({ role: 'system', content: system });
      }
    }
  }
  
  if (maxTokens && maxTokens > 0) {
    if (provider === 'claude') {
      bodyObj.max_tokens = maxTokens;
    } else {
      // For other providers (OpenAI, DeepSeek, Gemini, etc.)
      bodyObj.max_tokens = maxTokens;
    }
  }
  const body = JSON.stringify(bodyObj);
  
  const res = await fetch(p.url, { method: 'POST', headers, body });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  // Extract text from response
  if (provider === 'deepseek') return data.choices?.[0]?.message?.content || '';
  if (provider === 'gemini') return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (provider === 'claude') return data.content?.[0]?.text || '';
  if (provider === 'openai') return data.choices?.[0]?.message?.content || '';
  if (provider === 'huggingface') return data[0]?.generated_text || '';
  
  // OSS providers
  if (provider === 'ollama') return data.message?.content || '';
  if (provider === 'localai') return data.choices?.[0]?.message?.content || '';
  if (provider === 'openinterpreter') {
    // Open Interpreter can return array of chunks or single response
    return Array.isArray(data) 
      ? data.map(chunk => chunk.content || chunk.message || '').join('')
      : data.content || data.message || '';
  }
  
  return '';
}

function providerEnabled(name){
  const envKey = `${name.toUpperCase()}_ENABLED`;
  if (name === 'gemini') return String(process.env[envKey]||'false').toLowerCase() === 'true';
  return String(process.env[envKey]||'true').toLowerCase() === 'true';
}
function providerAvailable(name){ return !!PROVIDERS[name]?.key && providerEnabled(name); }

function detectTaskType(prompt=''){
  const p = prompt.toLowerCase();
  const creativeHints = ['story', 'poem', 'lyrics', 'narrative', 'creative', 'write a', 'script', 'fiction', 'metaphor', 'haiku', 'limerick'];
  const reasoningHints = ['explain why', 'analyze', 'analysis', 'evaluate', 'compare', 'trade-off', 'reason', 'step by step', 'proof', 'derive'];
  const creativeMatches = creativeHints.filter(k=>p.includes(k)).length;
  const reasoningMatches = reasoningHints.filter(k=>p.includes(k)).length;
  if (creativeMatches > reasoningMatches && creativeMatches>0) return { type:'creative', matches: creativeMatches };
  if (reasoningMatches > 0) return { type:'reasoning', matches: reasoningMatches };
  return { type:'general', matches: 0 };
}

function computeConfidencePercent({ detectedType, providerUsed, order, matches }){
  // Simple heuristic: first choice with matches -> 90, second -> 75, others -> 60; general -> 70; explicit -> 100 (handled elsewhere)
  if (detectedType==='general') return 70;
  const idx = order.indexOf(providerUsed);
  if (matches>0 && idx===0) return 90;
  if (idx===1) return 75;
  return 60;
}

export async function generateSmartLLM({ prompt, system, taskType, criticality = 'normal', maxTokens }){
  const det = taskType ? { type: taskType, matches: 0 } : detectTaskType(prompt);
  const detected = det.type;
  
  // Criticality-based provider ordering (including OSS)
  const criticalityRouting = {
    low: {
      creative: ['ollama','huggingface','localai','deepseek','gemini','openai','claude'],
      reasoning: ['ollama','huggingface','deepseek','claude','openai','gemini'], 
      general: ['ollama','huggingface','localai','deepseek','openai','claude','gemini']
    },
    normal: {
      creative: ['deepseek','ollama','gemini','huggingface','claude','openai'],
      reasoning: ['deepseek','claude','ollama','openai','gemini','huggingface'],
      general: ['deepseek','ollama','openai','claude','gemini','huggingface','localai']
    },
    high: {
      creative: ['claude','openai','gemini','deepseek','ollama'],
      reasoning: ['claude','openai','deepseek','gemini','ollama'],
      general: ['openai','claude','deepseek','gemini','ollama']
    },
    critical: {
      creative: ['openai','claude','gemini','deepseek'],
      reasoning: ['claude','openai','gemini','deepseek'],
      general: ['openai','claude','gemini','deepseek']
    }
  };
  
  const routing = criticalityRouting[criticality] || criticalityRouting.normal;
  const order = routing[detected] || routing.general;
  
  const tried = [];
  for (const name of order){
    if (!providerAvailable(name)) { tried.push({ name, available:false }); continue; }
    try {
      const text = await generateLLM({ prompt, provider: name, system, maxTokens });
      if (text && String(text).trim()) {
        const percent = computeConfidencePercent({ detectedType: detected, providerUsed: name, order, matches: det.matches });
        return { text, providerUsed: name, taskTypeDetected: detected, providerBadge: { provider: name, percent }, criticalityLevel: criticality };
      }
      tried.push({ name, available:true, empty:true });
    } catch(e){ tried.push({ name, available:true, error: e.message?.slice(0,200) }); }
  }
  const err = new Error('All providers failed');
  err.details = tried;
  throw err;
}

export function getProviderStatus(){
  return Object.fromEntries(Object.keys(PROVIDERS).map(k=>[k, {
    available: !!PROVIDERS[k]?.key,
    enabled: providerEnabled(k),
    model: PROVIDERS[k]?.model || null
  }]));
}
