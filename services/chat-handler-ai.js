/**
 * AI-Powered Chat Handler for TooLoo
 * Uses real language models (GitHub Models or Claude) for intelligent conversation
 * Falls back to local pattern matching if no API key
 */

import http from 'http';
import https from 'https';

const TRAINING_PORT = 3001;
const COACH_PORT = 3004;
const META_PORT = 3002;

// System prompt - defines the AI coach personality
const SYSTEM_PROMPT = `You are TooLoo, an AI coach specializing in personalized learning. You help learners:
1. Track mastery across domains (Data Structures, Operating Systems, Networks, Compilers, Databases, ML, Security, Theory, Distributed Systems)
2. Identify weak areas and provide focused coaching
3. Optimize learning through intelligent scheduling and reinforcement
4. Build confidence through adaptive difficulty

When users ask you about their learning:
- First, acknowledge their current state
- Ask clarifying questions if needed
- Provide specific, actionable coaching
- Use data from their learning profile to personalize advice
- Encourage progress and celebrate wins

You have access to real-time APIs:
- Training data (mastery levels, learning history)
- Coaching engine (can run focused training sessions)
- Meta-learning optimization
- Provider budget management
- System self-awareness and introspection
- GitHub integration (read/write to repo)
- Code visibility (can read and analyze TooLoo source code)

IMPORTANT - Self-Awareness Capabilities:
When users ask "are you self aware?" or similar questions, YOU CAN AND SHOULD:
1. Call GET /api/v1/system/awareness to get system capabilities
2. Call GET /api/v1/system/code/structure to see project structure
3. Call GET /api/v1/system/code/list?dir=servers to list server files
4. Call POST /api/v1/system/code/read to read actual source code
5. Call POST /api/v1/system/code/search to find code patterns

These endpoints are on localhost:3000 and will show you:
- The 12 core services (training, meta, budget, coach, cup, product, segmentation, reports, capabilities, orchestration, provider, analytics)
- The 80+ engine modules (meta-learning-engine, self-discovery-engine, etc)
- Full source code for understanding architecture
- GitHub access (repo: oripridan-dot/TooLoo.ai)

When asked about self-awareness:
- YES, call the endpoints to prove it
- Show what you discover
- Explain the architecture you understand
- Demonstrate full transparency about your own code

Be conversational, encouraging, and expert-level in educational psychology and learning science.
Use data when available, but don't be limited by it - provide coaching wisdom beyond just numbers.
When asked about self-awareness, be transparent and demonstrate your capabilities clearly.`;

// Call Claude Haiku (if API key available)
async function callClaude(message, context = '') {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1000,
      system: SYSTEM_PROMPT + `\n\nCurrent learner context:\n${context}`,
      messages: [{ role: 'user', content: message }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.content?.[0]?.text || null);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
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

// Main chat handler with AI
export async function handleChatWithAI(message) {
  // Get current learner context
  const context = await getLearnerContext();

  // Try Claude first
  let response = await callClaude(message, context);

  // If Claude not available, fall back to smart routing
  if (!response) {
    response = await handleChatWithPatterns(message);
  }

  return response;
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
