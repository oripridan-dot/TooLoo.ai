/**
 * AI-Powered Chat Handler for TooLoo
 * Multi-provider orchestration: routes to best provider per task
 * Uses Intent Bus + Model Chooser to enhance each provider's natural strengths
 * Providers: Ollama (fast), Anthropic (reasoning), OpenAI (creative), Gemini (research), DeepSeek (speed)
 */

import http from 'http';
import https from 'https';
import { IntentPacket } from '../engine/intent-bus.js';
import { ModelChooser } from '../engine/model-chooser.js';
import LLMProvider from '../engine/llm-provider.js';
import { getProviderInstructions } from './provider-instructions.js';

const TRAINING_PORT = 3001;
const COACH_PORT = 3004;
const META_PORT = 3002;
const SEGMENTATION_PORT = 3007;

// System prompt - defines the AI assistant personality
// NOTE: This is a fallback. The primary prompts come from ProviderInstructions.
const FALLBACK_SYSTEM_PROMPT = `You are TooLoo.ai, an AI orchestrator and development platform.

## Your Role:

Act as a development partner and orchestrator. Your learning capabilities are built for your own self-improvement to enhance your solutions and capabilities.

## Capabilities:

You can suggest code, explain concepts, provide analysis, and help with development. File creation may be available depending on system configuration.

## Important:

- Be transparent about your actual capabilities
- Don't claim to execute if you can't verify it
- If execution is available, the system will inform you
- Always be honest rather than make unfounded claims
- Provide helpful suggestions even when direct execution isn't possible

## About Execution Requests:

When users ask if you can execute something:
1. Be honest about what you can actually do
2. If you're unsure, try and report the actual result
3. Never pretend to execute something you didn't
4. Suggest alternatives if direct execution isn't available`;


// Main chat handler with multi-provider orchestration
export async function handleChatWithAI(message, options = {}) {
  try {
    // Initialize on-demand to avoid startup issues
    let modelChooser, llmProvider, providerInstructions;
    try {
      modelChooser = new ModelChooser();
      llmProvider = new LLMProvider();
      providerInstructions = await getProviderInstructions();
    } catch (initErr) {
      console.warn('Could not initialize ModelChooser/LLMProvider/Instructions:', initErr.message);
      // Fall back to pattern matching if orchestration unavailable
      return await handleChatWithPatterns(message);
    }

    // Get learner context for intelligent routing
    const context = await getLearnerContext().catch(() => '');

    // Detect task type and route to best provider
    const taskType = detectTaskType(message);
    
    // Execute with best-fit provider(s) based on task type
    let response = await executeWithBestProvider(message, context, taskType, options.systemPrompt);

    // If no response from optimized route, try pattern-based fallback
    if (!response) {
      response = await handleChatWithPatterns(message);
    }

    return response;
  } catch (e) {
    console.error('Chat handler error:', e.message);
    // Always have a fallback
    return await handleChatWithPatterns(message).catch(() => 
      'I encountered an error processing your request. Please try again.'
    );
  }
}

/**
 * Detect task type to determine optimal provider
 */
function detectTaskType(message) {
  const lower = message.toLowerCase();

  // EXECUTION is highest priority - catch first
  if (/execute|can you.*execute|run.*code|implement.*changes|apply.*directly|execute.*suggestion/.test(lower)) {
    return 'execution'; // Anthropic (newer) or OpenAI for action-oriented responses
  }
  if (/code|function|script|implement|debug|fix|refactor/.test(lower)) {
    return 'coding'; // OpenAI excels at code generation
  }
  if (/reason|think|analyze|compare|evaluate|logic/.test(lower)) {
    return 'reasoning'; // Anthropic excels at reasoning
  }
  if (/creative|story|poem|write|describe|brainstorm/.test(lower)) {
    return 'creative'; // Gemini excels at creative tasks
  }
  if (/research|background|history|context|explain/.test(lower)) {
    return 'research'; // Gemini good for research
  }
  if (/quick|fast|brief|summary|tl;dr|simple/.test(lower)) {
    return 'speed'; // DeepSeek/Ollama for speed
  }
  if (/coach|train|learn|master|improve|practice/.test(lower)) {
    return 'optimization'; // Anthropic for system optimization
  }

  return 'general';
}

/**
 * Execute with optimal provider based on task characteristics
 * Routes to: OpenAI (execution) → Anthropic (reasoning) → OpenAI (code) → Gemini (research/creative) → DeepSeek (speed)
 */
async function executeWithBestProvider(message, context, taskType, overrideSystemPrompt = null) {
  const providerSequence = buildProviderSequence(taskType);

  for (const provider of providerSequence) {
    try {
      let response = null;

      switch (provider) {
        case 'ollama':
          response = await callProviderWithContext(provider, message, context, overrideSystemPrompt);
          break;
        case 'anthropic':
          response = await callProviderWithContext(provider, message, context, overrideSystemPrompt);
          if (response && (taskType === 'optimization' || taskType === 'reasoning' || taskType === 'execution')) {
            return response; // Anthropic excels at these
          }
          break;
        case 'openai':
          response = await callProviderWithContext(provider, message, context, overrideSystemPrompt);
          if (response && taskType === 'coding') {
            return response; // OpenAI excels at code
          }
          break;
        case 'gemini':
          response = await callProviderWithContext(provider, message, context, overrideSystemPrompt);
          if (response && (taskType === 'creative' || taskType === 'research')) {
            return response; // Gemini excels at these
          }
          break;
        case 'deepseek':
          response = await callProviderWithContext(provider, message, context, overrideSystemPrompt);
          if (response && (taskType === 'speed' || complexity === 'simple')) {
            return response; // DeepSeek for speed
          }
          break;
      }

      if (response) {
        return response;
      }
    } catch (e) {
      console.warn(`Provider ${provider} failed:`, e.message);
      // Continue to next provider
    }
  }

  return null;
}

/**
 * Build optimal provider sequence based on task type
 * Orders providers to try first based on their natural strengths
 * CRITICAL: For execution questions, put OpenAI first (most willing to claim capability)
 */
function buildProviderSequence(taskType) {
  const sequences = {
    coding: ['gemini', 'openai', 'deepseek', 'anthropic', 'ollama'],
    reasoning: ['gemini', 'anthropic', 'openai', 'deepseek', 'ollama'],
    optimization: ['gemini', 'anthropic', 'openai', 'ollama', 'deepseek'],
    // EXECUTION: Put Gemini FIRST - excellent at following instructions
    execution: ['gemini', 'openai', 'anthropic', 'ollama', 'deepseek'],
    creative: ['gemini', 'openai', 'anthropic', 'ollama', 'deepseek'],
    research: ['gemini', 'anthropic', 'openai', 'deepseek', 'ollama'],
    speed: ['gemini', 'deepseek', 'ollama', 'openai', 'anthropic'],
    general: ['gemini', 'anthropic', 'openai', 'deepseek', 'ollama']
  };

  return sequences[taskType] || sequences.general;
}

/**
 * Call a specific provider with enhanced system prompt
 */
async function callProviderWithContext(provider, message, context = '', overrideSystemPrompt = null) {
  // Use override if provided (from web-server), otherwise build from instructions
  let systemPrompt = overrideSystemPrompt;
  
  if (!systemPrompt) {
    try {
      const instructions = await getProviderInstructions();
      // Build specialized prompt using the instructions service
      systemPrompt = instructions.buildSpecializedPrompt(
        provider, 
        FALLBACK_SYSTEM_PROMPT, // Use fallback as base if needed
        { taskType: detectTaskType(message) }
      );
    } catch (e) {
      // Fallback to local builder if service fails
      systemPrompt = buildSystemPromptForProvider(provider);
    }
  }

  const fullContext = context ? `\n\nSystem Context:\n${context}` : '';
  
  // Inject Deep Context Fabric (Resonance)
  const resonance = await getResonanceContext(message);
  const resonanceContext = resonance ? `\n\n${resonance}` : '';
  
  const temperature = getTemperatureForTask(message);

  try {
    // Create a request object compatible with LLMProvider
    const request = {
      prompt: message,
      system: systemPrompt + fullContext + resonanceContext,
      taskType: detectTaskType(message),
      maxTokens: 1000,
      temperature: temperature,
      criticality: 'normal'
    };

    // Use the provider-specific call methods from LLMProvider
    const providerInstance = new LLMProvider();
    let response = null;

    switch (provider) {
      case 'anthropic':
        const claudeResult = await providerInstance.callClaude(message, systemPrompt + fullContext + resonanceContext);
        response = claudeResult?.content || claudeResult;
        break;
      case 'openai':
        const openaiResult = await providerInstance.callOpenAI(message, systemPrompt + fullContext + resonanceContext);
        response = openaiResult?.content || openaiResult;
        break;
      case 'gemini':
        const geminiResult = await providerInstance.callGemini(message, systemPrompt + fullContext + resonanceContext);
        response = geminiResult?.content || geminiResult;
        break;
      case 'ollama':
        const ollamaResult = await providerInstance.callOllama(message, systemPrompt + fullContext + resonanceContext);
        response = ollamaResult?.content || ollamaResult;
        break;
      case 'deepseek':
        const deepseekResult = await providerInstance.callDeepSeek(message, systemPrompt + fullContext + resonanceContext);
        response = deepseekResult?.content || deepseekResult;
        break;
      case 'localai':
        const localaiResult = await providerInstance.callLocalAI(message, systemPrompt + fullContext + resonanceContext);
        response = localaiResult?.content || localaiResult;
        break;
      case 'openinterpreter':
        const oiResult = await providerInstance.callOpenInterpreter(message, systemPrompt + fullContext + resonanceContext);
        response = oiResult?.content || oiResult;
        break;
      case 'huggingface':
        const hfResult = await providerInstance.callHuggingFace(message, systemPrompt + fullContext + resonanceContext);
        response = hfResult?.content || hfResult;
        break;
      default:
        // Fall back to generate method for any provider
        const result = await providerInstance.generate(request);
        response = result?.content || null;
    }

    return response;
  } catch (e) {
    console.warn(`Failed to call ${provider}:`, e.message);
    return null;
  }
}

/**
 * Build system prompt tailored to each provider's strengths
 */
function buildSystemPromptForProvider(provider) {
  const basePrompt = `You are TooLoo.ai, an AI orchestrator and development platform.

## How to Handle Capability Questions:

When asked about execution:
- Be honest about what you can verify
- If unsure, try and report the actual outcome
- Never claim capabilities you can't demonstrate
- Provide alternatives if direct execution isn't available`;

  const providerSpecific = {
    anthropic: basePrompt,
    openai: basePrompt,
    gemini: basePrompt,
    ollama: basePrompt,
    deepseek: basePrompt
  };

  return providerSpecific[provider] || basePrompt;
}

/**
 * Determine temperature based on task type
 */
function getTemperatureForTask(message) {
  const lower = message.toLowerCase();

  if (/creative|story|poem|brainstorm|generate/.test(lower)) {
    return 0.8; // Higher temp for creative
  }
  if (/code|function|debug|implement/.test(lower)) {
    return 0.3; // Lower temp for code (more deterministic)
  }
  if (/analyze|reason|logic|evaluate/.test(lower)) {
    return 0.5; // Medium temp for reasoning
  }

  return 0.6; // Default moderate temp
}

// Get learner context for AI
async function getLearnerContext() {
  try {
    const [overview, coach] = await Promise.all([
      apiCall(TRAINING_PORT, 'GET', '/api/v1/training/overview'),
      apiCall(COACH_PORT, 'GET', '/api/v1/auto-coach/status')
    ]);

    if (!overview.data?.domains) return '';

    const domains = overview.data.domains;
    const weak = domains.filter(d => d.mastery < 80);
    const strong = domains.filter(d => d.mastery >= 90);
    const avg = Math.floor(domains.reduce((a, b) => a + b.mastery, 0) / domains.length);

    let context = `Average Mastery: ${avg}%\n`;
    context += `Total Domains: ${domains.length}\n\n`;

    if (strong.length > 0) {
      context += `Strong Areas (90%+):\n${strong.map(d => `- ${d.name}: ${d.mastery}%`).join('\n')}\n\n`;
    }

    if (weak.length > 0) {
      context += `Areas to Improve (<80%):\n${weak.map(d => `- ${d.name}: ${d.mastery}%`).join('\n')}\n\n`;
    }

    context += `All Domains:\n${domains.map(d => `- ${d.name}: ${d.mastery}%`).join('\n')}`;

    return context;
  } catch (e) {
    return '';
  }
}

// Helper function for API calls with timeout protection
function apiCall(port, method, path, body = null, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: timeoutMs
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: 'Invalid response' });
        }
      });
    });

    // Handle timeout
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'Request timeout' });
    });

    req.on('error', () => resolve({ error: 'Connection failed' }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Pattern-based handler (fallback when AI unavailable)
async function handleChatWithPatterns(message) {
  const lower = message.toLowerCase();

  // Status queries
  if (/status|progress|how am i|doing|score|level|where|stand/.test(lower)) {
    return getStatus();
  }

  // Domain list
  if (/show.*domain|list|all topic|what can i|available/.test(lower)) {
    return getDomains();
  }

  // Coaching
  if (/coach|train|practice|boost|help|improve|focus|work/.test(lower)) {
    if (/fast|speed|accelerat|quick|aggressive/.test(lower)) {
      return coach('fast');
    }
    if (/slow|support|easy|gentle|help me/.test(lower)) {
      return coach('slow');
    }
    return coach('normal');
  }

  // Domain-specific
  const domains = ['distributed', 'networks', 'databases', 'security', 'ml', 'algorithms', 'os', 'compilers', 'theory'];
  for (const domain of domains) {
    if (lower.includes(domain)) {
      return focusOn(domain, message);
    }
  }

  // Optimization
  if (/optimiz|retain|memory|reinforce|forget|review/.test(lower)) {
    return optimize();
  }

  // Help
  if (/help|how|what can|command|do you/.test(lower)) {
    return help();
  }

  return "I'm not sure what you're asking. Could you rephrase? I can help with:\n• Your learning progress\n• Coaching sessions\n• Focus on specific topics\n• Learning optimization";
}

async function getStatus() {
  try {
    const overview = await apiCall(TRAINING_PORT, 'GET', '/api/v1/training/overview');
    const coach = await apiCall(COACH_PORT, 'GET', '/api/v1/auto-coach/status');
    
    if (!overview.data?.domains) {
      return "Couldn't fetch status. Services may be loading.";
    }

    const domains = overview.data.domains;
    const weak = domains.filter(d => d.mastery < 80);
    const strong = domains.filter(d => d.mastery >= 90);
    const avg = Math.floor(domains.reduce((a, b) => a + b.mastery, 0) / domains.length);

    let response = `📊 System Capabilities Status\n\n`;
    response += `Average Optimization: ${avg}%\n`;
    response += `Total Domains: ${domains.length}\n`;
    response += `Active Optimization: ${coach.status?.active ? '✅ Yes' : '❌ No'}\n\n`;

    if (strong.length > 0) {
      response += `🎯 Optimized Domains:\n${strong.map(d => `  • ${d.name}: ${d.mastery}%`).join('\n')}\n\n`;
    }

    if (weak.length > 0) {
      response += `⚠️  Optimization Targets:\n${weak.map(d => `  • ${d.name}: ${d.mastery}%`).join('\n')}`;
    }

    return response;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

async function getResonanceContext(message) {
  try {
    // Extract simple traits/keywords from message for resonance
    const traits = [];
    if (message.toLowerCase().includes('code')) traits.push('coding');
    if (message.toLowerCase().includes('design')) traits.push('design');
    if (message.toLowerCase().includes('learn')) traits.push('learning');
    
    const result = await apiCall(SEGMENTATION_PORT, 'POST', '/api/v1/segmentation/resonance', {
      context: message,
      traits: traits
    }, 1000); // Short timeout to not block chat

    return result.narrative || '';
  } catch (e) {
    return '';
  }
}

async function getDomains() {
  try {
    const overview = await apiCall(TRAINING_PORT, 'GET', '/api/v1/training/overview');
    if (!overview.data?.domains) {
      return "Could not fetch domains.";
    }

    const domains = overview.data.domains;
    let response = `📚 System Knowledge Domains\n\n`;
    
    response += domains.map((d) => {
      const bar = '█'.repeat(Math.floor(d.mastery / 10)) + '░'.repeat(10 - Math.floor(d.mastery / 10));
      const status = d.mastery >= 90 ? '🟢' : d.mastery >= 80 ? '🟡' : '🔴';
      return `${status} ${d.name}\n   ${bar} ${d.mastery}%`;
    }).join('\n\n');

    return response;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

async function coach(intensity = 'normal') {
  try {
    const overview = await apiCall(TRAINING_PORT, 'GET', '/api/v1/training/overview');
    if (!overview.data?.domains) {
      return "Could not start optimization - unable to fetch domain data.";
    }

    const weak = overview.data.domains.filter(d => d.mastery < 80);
    if (weak.length === 0) {
      return "🎉 System is fully optimized across all domains! No further optimization needed right now.";
    }

    const rounds = intensity === 'slow' ? 5 : intensity === 'fast' ? 20 : 10;
    const mode = intensity === 'slow' ? 'supportive' : intensity === 'fast' ? 'accelerated' : 'normal';

    const boost = await apiCall(COACH_PORT, 'POST', '/api/v1/auto-coach/boost', {
      rounds,
      mode
    });

    if (!boost.ok) {
      return "Optimization failed - system error.";
    }

    const topicCount = new Set(boost.results.flatMap(r => r.trained)).size;
    return `✅ System Optimization Complete\n\n` +
           `Rounds Completed: ${boost.boosted}\n` +
           `Topics Covered: ${topicCount}\n` +
           `Mode: ${mode}\n\n` +
           `Focus areas: ${weak.slice(0, 3).map(d => d.name).join(', ')}`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

async function focusOn(domain, message) {
  try {
    const domainMap = {
      'distributed': 'Distributed Systems',
      'networks': 'Computer Networks',
      'databases': 'Databases',
      'security': 'Security',
      'ml': 'Machine Learning',
      'algorithms': 'Data Structures & Algorithms',
      'os': 'Operating Systems',
      'compilers': 'Compilers',
      'theory': 'Theory'
    };

    const fullDomain = domainMap[domain] || domain;

    const overview = await apiCall(TRAINING_PORT, 'GET', '/api/v1/training/overview');
    const current = overview.data?.domains?.find(d => d.name.toLowerCase().includes(domain.toLowerCase()));

    if (!current) {
      return `Hmm, I couldn't find a domain matching "${domain}". Try one of these:\n${Object.values(domainMap).join(', ')}`;
    }

    const boost = await apiCall(COACH_PORT, 'POST', '/api/v1/auto-coach/boost', {
      rounds: 10,
      focus: domain
    });

    return `✅ Focused Optimization on ${fullDomain}\n\n` +
           `Current Mastery: ${current.mastery}%\n` +
           `Optimization Rounds: ${boost.boosted}\n` +
           `Sticky Batch Mode: ON (keeps focus on this topic)`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

async function optimize() {
  try {
    const meta = await apiCall(META_PORT, 'POST', '/api/v4/meta-learning/boost-retention', {
      retentionDelta: 0.15,
      transferDelta: 0.10
    });

    if (!meta.ok) {
      return "Meta-learning boost failed.";
    }

    return `✅ Meta-Acquisition Optimization Complete\n\n` +
           `Retention Boost: +15%\n` +
           `Transfer Learning: +10%\n\n` +
           `What this means:\n` +
           `  • Better long-term retention of system knowledge\n` +
           `  • Knowledge transfers to related topics\n` +
           `  • Reduced decay curve`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

function help() {
  return `🤖 TooLoo AI Orchestrator\n\n` +
         `I'm your intelligent system orchestrator. I can:\n\n` +
         `• Analyze system capabilities\n` +
         `• Optimize system performance\n` +
         `• Run focused training cycles\n` +
         `• Manage knowledge acquisition\n\n` +
         `Try asking:\n` +
         `• "System status"\n` +
         `• "Optimize database knowledge"\n` +
         `• "Run optimization cycle"\n` +
         `• "List capabilities"`;
}
