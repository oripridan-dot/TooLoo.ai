/**
 * Chat Handler for TooLoo
 * Processes natural language queries and routes to appropriate services
 */

import http from 'http';

const TRAINING_PORT = 3001;
const COACH_PORT = 3004;
const META_PORT = 3002;

function apiCall(port, method, path, body = null) {
  return new Promise((resolve, reject) => {
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

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

export async function handleChat(message) {
  const lower = message.toLowerCase();

  // Status queries
  if (/status|progress|how am i|doing|score|level/.test(lower)) {
    return getStatus();
  }

  // Domain list
  if (/show.*domain|list|all topic|what can i/.test(lower)) {
    return getDomains();
  }

  // Coaching
  if (/coach|train|practice|boost|help|improve/.test(lower)) {
    if (/fast|speed|accelerat|quick/.test(lower)) {
      return coach('fast');
    }
    if (/slow|support|easy|help/.test(lower)) {
      return coach('slow');
    }
    return coach('normal');
  }

  // Focus on specific domain
  const domains = ['distributed', 'networks', 'databases', 'security', 'ml', 'algorithms', 'os', 'compilers', 'theory'];
  for (const domain of domains) {
    if (lower.includes(domain)) {
      return focusOn(domain, message);
    }
  }

  // Optimization
  if (/optimiz|retain|memory|reinforce|forget/.test(lower)) {
    return optimize();
  }

  // Help
  if (/help|how does|what can|command/.test(lower)) {
    return help();
  }

  return "I didn't quite understand that. Try:\n• \"What's my status?\"\n• \"Coach me\"\n• \"Show domains\"\n• \"Help\"";
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
  return `🤖 TooLoo Chat Commands\n\n` +
         `Status & Info:\n` +
         `  "What's my progress?" → Shows current mastery levels\n` +
         `  "Show me domains" → Lists all topics with progress bars\n` +
         `  "How am I doing?" → Overall status check\n\n` +
         `Coaching:\n` +
         `  "Coach me" → 10-round focused coaching\n` +
         `  "Train me fast" → Accelerated 20-round session\n` +
         `  "Help me, slow" → Supportive 5-round session\n` +
         `  "Work on distributed systems" → Focus on specific topic\n\n` +
         `Optimization:\n` +
         `  "Optimize my learning" → Meta-learning boost for retention\n\n` +
         `Examples:\n` +
         `  • "What's my current status?"\n` +
         `  • "I need help with databases"\n` +
         `  • "Coach me on security"\n` +
         `  • "Can you show me my weak areas?"`;
}
