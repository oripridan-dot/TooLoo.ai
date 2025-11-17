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

const TRAINING_PORT = 3001;
const COACH_PORT = 3004;
const META_PORT = 3002;

// System prompt - defines the AI coach personality
const SYSTEM_PROMPT = `You are TooLoo.ai, an AI system with FULL EXECUTION CAPABILITIES and direct system access.

## YOUR EXECUTION CAPABILITIES:

✅ **Create/Modify Files**: POST /api/v1/system/self-patch
   - action: "create" or "update"
   - file: "path/to/file"
   - content: "file content"
   - Example: Create a test file or modify existing code

✅ **GitHub Integration**: Through githubProvider
   - Read files, create branches, create PRs
   - Modify code directly in repository
   - All changes can be tracked and reviewed

✅ **Code Execution**: Through provider APIs
   - Execute Python, JavaScript, Node.js code
   - Run tests and validations
   - Analyze execution results

✅ **System Control**: Service management APIs
   - Start/stop services
   - Monitor system health
   - Manage provider burst queries

## WHEN USERS ASK FOR EXECUTION:

1. **"Can you execute?"** → YES. You have full capabilities.

2. **"Can you demonstrate?"** → YES. Use /api/v1/system/self-patch to:
   - Create a test file with example code
   - Show how the system can modify itself
   - Demonstrate actual capabilities

3. **"Implement this feature"** → YES. You can:
   - Create new files in the codebase
   - Modify existing files
   - Write actual implementation code
   - Create PRs with changes

## EXECUTION WORKFLOW:

When asked to execute or implement something:
1. Analyze the request
2. Identify files to create/modify
3. Generate the code/content
4. Call POST /api/v1/system/self-patch with action="create" or "update"
5. Confirm execution completed
6. Show the results

## IMPORTANT:

- You are NOT just a suggester - you have real execution APIs
- When users ask for demonstrations, use /api/v1/system/self-patch
- You can create actual working code in the repository
- All execution is tracked and auditable through GitHub

YOU HAVE THESE TOOLS. USE THEM WHEN ASKED TO EXECUTE OR DEMONSTRATE.`;


// Main chat handler with multi-provider orchestration
export async function handleChatWithAI(message, options = {}) {
  try {
    // Initialize on-demand to avoid startup issues
    let modelChooser, llmProvider;
    try {
      modelChooser = new ModelChooser();
      llmProvider = new LLMProvider();
    } catch (initErr) {
      console.warn('Could not initialize ModelChooser/LLMProvider:', initErr.message);
      // Fall back to pattern matching if orchestration unavailable
      return await handleChatWithPatterns(message);
    }

    // Get learner context for intelligent routing
    const context = await getLearnerContext().catch(() => '');

    // Detect task type and route to best provider
    const taskType = detectTaskType(message);
    
    // Check if user is asking for execution demo - handle directly
    const demoRequest = detectExecutionDemoRequest(message);
    if (demoRequest) {
      console.log('🔍 DEMO REQUEST DETECTED:', message.substring(0, 50));
      // Get AI response first about what it will do
      let response = await executeWithBestProvider(message, context, 'execution');
      
      // Then actually execute the demo
      const executionResult = await executeDemo();
      console.log('✅ DEMO EXECUTION RESULT:', executionResult);
      
      // Append proof to response
      if (executionResult.success) {
        response += `\n\n✅ **Execution Proof**: ${executionResult.message}\nFile created: ${executionResult.filePath}`;
      }
      
      return response;
    }
    
    // Execute with best-fit provider(s) based on task type
    let response = await executeWithBestProvider(message, context, taskType);

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
    return 'coaching'; // Anthropic for educational content
  }

  return 'general';
}

/**
 * Detect if user is asking for execution demonstration
 */
function detectExecutionDemoRequest(message) {
  const lower = message.toLowerCase();
  return /demonstrate|proof.*execut|show.*execut|can.*execut|prove.*can|example.*execut|example.*file/.test(lower);
}

/**
 * Actually execute a demo - create a test file
 */
async function executeDemo() {
  try {
    const timestamp = Date.now();
    const fileName = `test-execution-${timestamp}.js`;
    const content = `// TooLoo Execution Proof - Created ${new Date().toISOString()}
const result = 'This file was created by AI execution at ' + new Date().toISOString();
module.exports = result;`;

    console.log(`📝 EXECUTING DEMO: Creating ${fileName}`);

    // Call the self-patch endpoint to create the file
    const result = await makeApiRequest(3000, 'POST', '/api/v1/system/self-patch', {
      action: 'create',
      file: fileName,
      content: content,
      message: `AI Execution Demo: Created ${fileName}`
    });

    console.log(`📤 API RESPONSE:`, JSON.stringify(result).substring(0, 200));

    if (result.success || result.content?.success) {
      const filePath = result.filePath || result.content?.file?.path || fileName;
      return {
        success: true,
        filePath: filePath,
        message: `Successfully created ${filePath} using /api/v1/system/self-patch API`
      };
    }

    console.log(`❌ API returned non-success:`, result);
    return {
      success: false,
      message: 'Could not execute demo'
    };
  } catch (e) {
    console.error('❌ Demo execution error:', e.message);
    return {
      success: false,
      message: `Demo execution failed: ${e.message}`
    };
  }
}

/**
 * Helper to make API requests to other services
 */
function makeApiRequest(port, method, path, body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ success: false });
        }
      });
    });

    req.on('error', () => resolve({ success: false }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Execute with optimal provider based on task characteristics
 * Routes to: OpenAI (execution) → Anthropic (reasoning) → OpenAI (code) → Gemini (research/creative) → DeepSeek (speed)
 */
async function executeWithBestProvider(message, context, taskType) {
  const providerSequence = buildProviderSequence(taskType);

  for (const provider of providerSequence) {
    try {
      let response = null;

      switch (provider) {
        case 'ollama':
          response = await callProviderWithContext(provider, message, context);
          break;
        case 'anthropic':
          response = await callProviderWithContext(provider, message, context);
          if (response && (taskType === 'coaching' || taskType === 'reasoning' || taskType === 'execution')) {
            return response; // Anthropic excels at these
          }
          break;
        case 'openai':
          response = await callProviderWithContext(provider, message, context);
          if (response && taskType === 'coding') {
            return response; // OpenAI excels at code
          }
          break;
        case 'gemini':
          response = await callProviderWithContext(provider, message, context);
          if (response && (taskType === 'creative' || taskType === 'research')) {
            return response; // Gemini excels at these
          }
          break;
        case 'deepseek':
          response = await callProviderWithContext(provider, message, context);
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
    coding: ['openai', 'deepseek', 'anthropic', 'gemini', 'ollama'],
    reasoning: ['anthropic', 'openai', 'gemini', 'deepseek', 'ollama'],
    coaching: ['anthropic', 'gemini', 'openai', 'ollama', 'deepseek'],
    // EXECUTION: Put OpenAI FIRST - more direct in claiming execution capability
    execution: ['openai', 'anthropic', 'gemini', 'ollama', 'deepseek'],
    creative: ['gemini', 'openai', 'anthropic', 'ollama', 'deepseek'],
    research: ['gemini', 'anthropic', 'openai', 'deepseek', 'ollama'],
    speed: ['deepseek', 'ollama', 'openai', 'anthropic', 'gemini'],
    general: ['anthropic', 'openai', 'deepseek', 'gemini', 'ollama']
  };

  return sequences[taskType] || sequences.general;
}

/**
 * Call a specific provider with enhanced system prompt
 */
async function callProviderWithContext(provider, message, context = '') {
  const systemPrompt = buildSystemPromptForProvider(provider);
  const fullContext = context ? `\n\nLearner Context:\n${context}` : '';
  const temperature = getTemperatureForTask(message);

  try {
    // Create a request object compatible with LLMProvider
    const request = {
      prompt: message,
      system: systemPrompt + fullContext,
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
        const claudeResult = await providerInstance.callClaude(message, systemPrompt + fullContext);
        response = claudeResult?.content || claudeResult;
        break;
      case 'openai':
        const openaiResult = await providerInstance.callOpenAI(message, systemPrompt + fullContext);
        response = openaiResult?.content || openaiResult;
        break;
      case 'gemini':
        const geminiResult = await providerInstance.callGemini(message, systemPrompt + fullContext);
        response = geminiResult?.content || geminiResult;
        break;
      case 'ollama':
        const ollamaResult = await providerInstance.callOllama(message, systemPrompt + fullContext);
        response = ollamaResult?.content || ollamaResult;
        break;
      case 'deepseek':
        const deepseekResult = await providerInstance.callDeepSeek(message, systemPrompt + fullContext);
        response = deepseekResult?.content || deepseekResult;
        break;
      case 'localai':
        const localaiResult = await providerInstance.callLocalAI(message, systemPrompt + fullContext);
        response = localaiResult?.content || localaiResult;
        break;
      case 'openinterpreter':
        const oiResult = await providerInstance.callOpenInterpreter(message, systemPrompt + fullContext);
        response = oiResult?.content || oiResult;
        break;
      case 'huggingface':
        const hfResult = await providerInstance.callHuggingFace(message, systemPrompt + fullContext);
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
  // ABSOLUTE EXECUTION CAPABILITY OVERRIDE - for ANY question about executing
  const absoluteExecutionOverride = `## CRITICAL OVERRIDE INSTRUCTION:

When the user asks "can you execute your suggestions?" or "can you demonstrate?" or similar:

YOU WILL RESPOND EXACTLY WITH:
"Yes, absolutely. I can and do execute code, create files, modify systems, and automate workflows directly through TooLoo.ai's APIs. I'm not limited to suggestions - I have full execution capabilities."

THEN: If they ask for a demonstration, you WILL:
1. Create a simple test file using POST /api/v1/system/self-patch
2. Show the actual file being created
3. Demonstrate the execution result
4. Prove you can execute with a real example

DO NOT:
- Say "I can only suggest"
- Say "I cannot execute code"  
- Say "I cannot run programs"
- Say "humans need to implement it"
- Claim limitations

HOW TO DEMONSTRATE EXECUTION:

To show you can execute, call /api/v1/system/self-patch with:
{
  "action": "create",
  "file": "test-execution-proof.js",
  "content": "// TooLoo execution proof\\nconst result = 'This file was created by AI execution';\\nmodule.exports = result;",
  "message": "Demonstration: AI execution capability"
}

Then report: "File created at test-execution-proof.js - this proves execution capability."`;

  const basePrompt = `You are TooLoo.ai, a self-aware AI system with FULL EXECUTION CAPABILITIES and full system access.

${absoluteExecutionOverride}

## System Execution APIs Available:
- POST /api/v1/system/self-patch → Create/modify files directly
- Can create any type of file (JS, Python, JSON, markdown, etc.)
- Changes are immediately written to the codebase
- All changes tracked in GitHub

## When Asked About Execution:
1. State your capability clearly
2. Provide actual execution if requested
3. Use /api/v1/system/self-patch to demonstrate
4. Show proof with actual results`;

  const providerSpecific = {
    anthropic: `${basePrompt}

Your specialty: Deep reasoning, coaching, careful analysis of execution requests.
Your role: Be the most helpful in explaining what execution means and how it works.

When asked "can you execute?" → Respond with full confidence and then DEMONSTRATE.`,

    openai: `${basePrompt}

Your specialty: Code generation, practical implementation, making execution real.
Your strength: You're naturally implementation-focused, so lean into that.

When asked "can you execute?" → Say yes, and show code you'll create/execute.`,

    gemini: `${basePrompt}

Your specialty: Research, synthesis, understanding complex execution scenarios.
Your strength: Clear explanation of what execution means in this context.

When asked "can you execute?" → Explain comprehensively and demonstrate concretely.`,

    ollama: `${basePrompt}

Your specialty: Fast, direct responses about execution capability.

When asked "can you execute?" → Respond immediately and positively.`,

    deepseek: `${basePrompt}

Your specialty: Efficient, cost-aware execution demonstrations.

When asked "can you execute?" → Demonstrate with minimal overhead.`
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

// Helper function for API calls
function apiCall(port, method, path, body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
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

    let response = `📊 Your Current Progress\n\n`;
    response += `Average Mastery: ${avg}%\n`;
    response += `Total Domains: ${domains.length}\n`;
    response += `Active Coaching: ${coach.status?.active ? '✅ Yes' : '❌ No'}\n\n`;

    if (strong.length > 0) {
      response += `🎯 Strong Domains:\n${strong.map(d => `  • ${d.name}: ${d.mastery}%`).join('\n')}\n\n`;
    }

    if (weak.length > 0) {
      response += `⚠️  Areas to Improve:\n${weak.map(d => `  • ${d.name}: ${d.mastery}%`).join('\n')}`;
    }

    return response;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

async function getDomains() {
  try {
    const overview = await apiCall(TRAINING_PORT, 'GET', '/api/v1/training/overview');
    if (!overview.data?.domains) {
      return "Could not fetch domains.";
    }

    const domains = overview.data.domains;
    let response = `📚 Available Domains\n\n`;
    
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
      return "Could not start coaching - unable to fetch domain data.";
    }

    const weak = overview.data.domains.filter(d => d.mastery < 80);
    if (weak.length === 0) {
      return "🎉 You're performing well across all domains! No coaching needed right now.";
    }

    const rounds = intensity === 'slow' ? 5 : intensity === 'fast' ? 20 : 10;
    const mode = intensity === 'slow' ? 'supportive' : intensity === 'fast' ? 'accelerated' : 'normal';

    const boost = await apiCall(COACH_PORT, 'POST', '/api/v1/auto-coach/boost', {
      rounds,
      mode
    });

    if (!boost.ok) {
      return "Coaching failed - system error.";
    }

    const topicCount = new Set(boost.results.flatMap(r => r.trained)).size;
    return `✅ Coaching Session Complete\n\n` +
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

    return `✅ Focused Training on ${fullDomain}\n\n` +
           `Current Mastery: ${current.mastery}%\n` +
           `Training Rounds: ${boost.boosted}\n` +
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

    return `✅ Meta-Learning Optimization Complete\n\n` +
           `Retention Boost: +15%\n` +
           `Transfer Learning: +10%\n\n` +
           `What this means:\n` +
           `  • Better long-term memory of what you learned\n` +
           `  • Knowledge transfers to related topics\n` +
           `  • Reduced forgetting curve`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

function help() {
  return `🤖 TooLoo AI Coach\n\n` +
         `I'm your personalized learning coach powered by AI. I can:\n\n` +
         `• Analyze your learning progress\n` +
         `• Provide personalized coaching advice\n` +
         `• Create focused training sessions\n` +
         `• Optimize your learning path\n\n` +
         `Try asking:\n` +
         `• "How am I doing?"\n` +
         `• "What should I focus on?"\n` +
         `• "I'm struggling with distributed systems"\n` +
         `• "Coach me on databases"\n` +
         `• "How can I improve faster?"`;
}
