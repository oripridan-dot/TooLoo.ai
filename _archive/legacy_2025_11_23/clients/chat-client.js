#!/usr/bin/env node

/**
 * TooLoo.ai Chat Client
 * Natural language interface to talk to the coaching system
 * 
 * Usage:
 *   node clients/chat-client.js
 */

import http from 'http';
import readline from 'readline';

const TRAINING_PORT = 3001;
const COACH_PORT = 3004;
const META_PORT = 3002;

// Command patterns
const COMMANDS = {
  // Status queries
  'status': /^(what's|what is|how is|show|check).*(status|progress|doing|happening)/i,
  'domains': /^(show|list|what).*(domains|topics|subjects|areas)/i,
  'mastery': /^(what's|what is).*(mastery|level|score|percentage)/i,
  
  // Coaching actions
  'coach': /^(coach|train|practice|boost|help|improve).*(me|my|on|with)?/i,
  'focus': /^(focus|concentrate|focus on|work on).*(distributed|networks|databases|security|ml|algorithms|os|compilers|theory)/i,
  'fast': /^(make it|go|speed up|accelerate|fast|quickly)/i,
  'slow': /^(slow down|take it easy|supportive|help me)/i,
  
  // Meta-learning
  'optimize': /^(optimize|boost retention|improve memory|reinforce)/i,
  
  // System queries
  'help': /^(help|what can you do|how does this work|commands)/i,
  'quit': /^(exit|quit|bye|goodbye|done)/i
};

// Parse natural language input
function parseCommand(input) {
  const lower = input.toLowerCase();
  
  for (const [cmd, pattern] of Object.entries(COMMANDS)) {
    if (pattern.test(lower)) {
      return cmd;
    }
  }
  
  // Try to extract domain from text
  const domains = ['distributed', 'networks', 'databases', 'security', 'ml', 'algorithms', 'os', 'compilers', 'theory'];
  for (const domain of domains) {
    if (lower.includes(domain)) {
      return { type: 'domain', value: domain };
    }
  }
  
  return 'unknown';
}

// API calls
function apiCall(port, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
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

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Response handlers
async function handleStatus() {
  try {
    const overview = await apiCall(TRAINING_PORT, 'GET', '/api/v1/training/overview');
    const coach = await apiCall(COACH_PORT, 'GET', '/api/v1/auto-coach/status');
    
    if (!overview.data || !coach.status) {
      return "Sorry, I couldn't fetch your current status. Services may be loading.";
    }

    const domains = overview.data.domains || [];
    const weak = domains.filter(d => d.mastery < 80);
    const strong = domains.filter(d => d.mastery >= 90);

    let response = '📊 **Your Current Progress**\n\n';
    response += `Average Mastery: **${Math.floor(domains.reduce((a, b) => a + b.mastery, 0) / domains.length)}%**\n`;
    response += `Total Domains: **${domains.length}**\n`;
    response += `Active Coaching: ${coach.status.active ? '✅ Yes' : '❌ No'}\n\n`;

    if (strong.length > 0) {
      response += `🎯 **Strong Domains:**\n${strong.map(d => `  • ${d.name}: ${d.mastery}%`).join('\n')}\n\n`;
    }

    if (weak.length > 0) {
      response += `⚠️  **Areas to Improve:**\n${weak.map(d => `  • ${d.name}: ${d.mastery}%`).join('\n')}\n`;
    }

    return response;
  } catch (e) {
    return `Error fetching status: ${e.message}`;
  }
}

async function handleDomains() {
  try {
    const overview = await apiCall(TRAINING_PORT, 'GET', '/api/v1/training/overview');
    if (!overview.data || !overview.data.domains) {
      return "Could not fetch domains.";
    }

    const domains = overview.data.domains;
    let response = '📚 **Available Domains**\n\n';
    response += domains.map((d, i) => {
      const bar = '█'.repeat(Math.floor(d.mastery / 10)) + '░'.repeat(10 - Math.floor(d.mastery / 10));
      const status = d.mastery >= 90 ? '🟢' : d.mastery >= 80 ? '🟡' : '🔴';
      return `${status} ${d.name}\n   ${bar} ${d.mastery}%`;
    }).join('\n\n');

    return response;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

async function handleCoach(intensity = 'normal') {
  try {
    const overview = await apiCall(TRAINING_PORT, 'GET', '/api/v1/training/overview');
    if (!overview.data || !overview.data.domains) {
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
    return `✅ **Coaching Session Complete**\n\n` +
           `Rounds Completed: **${boost.boosted}**\n` +
           `Topics Covered: **${topicCount}**\n` +
           `Mode: **${mode}**\n\n` +
           `Focus areas: ${weak.slice(0, 3).map(d => d.name).join(', ')}`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

async function handleFocus(domain) {
  try {
    // Get domain mapping
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
    const current = overview.data.domains.find(d => d.name.toLowerCase().includes(domain.toLowerCase()));

    if (!current) {
      return `Hmm, I couldn't find a domain matching "${domain}". Try one of these:\n${Object.values(domainMap).join(', ')}`;
    }

    const boost = await apiCall(COACH_PORT, 'POST', '/api/v1/auto-coach/boost', {
      rounds: 10,
      focus: domain
    });

    return `✅ **Focused Training on ${fullDomain}**\n\n` +
           `Current Mastery: **${current.mastery}%**\n` +
           `Training Rounds: **${boost.boosted}**\n` +
           `Sticky Batch Mode: **ON** (keeps focus on this topic)`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

async function handleOptimize() {
  try {
    const meta = await apiCall(META_PORT, 'POST', '/api/v4/meta-learning/boost-retention', {
      retentionDelta: 0.15,
      transferDelta: 0.10
    });

    if (!meta.ok) {
      return "Meta-learning boost failed.";
    }

    return `✅ **Meta-Learning Optimization Complete**\n\n` +
           `Retention Boost: **+15%**\n` +
           `Transfer Learning: **+10%**\n` +
           `What this means:\n` +
           `  • Better long-term memory of what you learned\n` +
           `  • Knowledge transfers to related topics\n` +
           `  • Reduced forgetting curve`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

function handleHelp() {
  return `🤖 **TooLoo Chat Commands**

You can talk naturally. I understand:

**Status & Info:**
  "What's my progress?" → Shows current mastery levels
  "Show me domains" → Lists all topics with progress bars
  "How am I doing?" → Overall status check

**Coaching:**
  "Coach me" → 10-round focused coaching
  "Train me fast" → Accelerated 20-round session
  "Help me, slow" → Supportive 5-round session
  "Work on distributed systems" → Focus on specific topic

**Optimization:**
  "Optimize my learning" → Meta-learning boost for retention

**System:**
  "Help" → This message
  "Exit" → Quit chat

Examples:
  > "What's my current status?"
  > "I need help with databases"
  > "Coach me on security"
  > "Can you show me my weak areas?"`;
}

// Main chat loop
async function chat() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n' + '═'.repeat(70));
  console.log('🤖 TooLoo.ai Chat Client');
  console.log('═'.repeat(70));
  console.log('Type "help" for commands, "exit" to quit\n');

  const askQuestion = () => {
    rl.question('You: ', async (input) => {
      if (!input.trim()) {
        askQuestion();
        return;
      }

      const cmd = parseCommand(input);
      let response = '';

      try {
        switch (cmd) {
          case 'status':
            response = await handleStatus();
            break;
          case 'domains':
            response = await handleDomains();
            break;
          case 'coach':
            response = await handleCoach('normal');
            break;
          case 'fast':
            response = await handleCoach('fast');
            break;
          case 'slow':
            response = await handleCoach('slow');
            break;
          case 'optimize':
            response = await handleOptimize();
            break;
          case 'help':
            response = handleHelp();
            break;
          case 'quit':
            console.log('\n👋 Goodbye!');
            rl.close();
            process.exit(0);
            return;
          default:
            if (cmd.type === 'domain') {
              response = await handleFocus(cmd.value);
            } else if (cmd === 'unknown') {
              response = `Sorry, I didn't understand that. Try:\n  • "What's my status?"\n  • "Coach me"\n  • "Show domains"\n  • "Help" for all commands`;
            }
        }
      } catch (e) {
        response = `⚠️  Error: ${e.message}`;
      }

      console.log(`\nTooLoo: ${response}\n`);
      askQuestion();
    });
  };

  askQuestion();
}

// Run
chat().catch(console.error);
