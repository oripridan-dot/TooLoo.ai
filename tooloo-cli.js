#!/usr/bin/env node

/**
 * TooLoo CLI - Execute AI suggestions from the command line
 * Usage: tooloo "your request here"
 */

const http = require('http');

const API_BASE = process.env.TOOLOO_API_URL || 'http://localhost:3005';
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🧠 TooLoo.ai CLI                          ║
╚══════════════════════════════════════════════════════════════╝

Execute AI-powered development tasks from your terminal.

USAGE:
  tooloo <prompt>                 Ask TooLoo to do something
  tooloo --interactive            Interactive mode
  tooloo --health                 Check API health
  tooloo --help                   Show this help

EXAMPLES:
  tooloo "create a hello world function"
  tooloo "analyze my code for improvements"
  tooloo "generate tests for user.js"
  tooloo "explain the auth system"

ENVIRONMENT:
  TOOLOO_API_URL                  API endpoint (default: http://localhost:3005)
  TOOLOO_PROVIDER                 AI provider (deepseek, claude, openai, gemini)

PROVIDERS:
  • deepseek   - Best for code (default)
  • claude     - Best for reasoning
  • openai     - Reliable and consistent
  • gemini     - Creative solutions
  • huggingface - Free tier
  • grok       - Experimental
`);
  process.exit(0);
}

// Check health
if (args[0] === '--health') {
  checkHealth();
  return;
}

// Interactive mode
if (args[0] === '--interactive' || args[0] === '-i') {
  startInteractive();
  return;
}

// Execute prompt
const prompt = args.join(' ');
executePrompt(prompt);

function checkHealth() {
  console.log('🔍 Checking TooLoo.ai API health...\n');
  
  makeRequest('/api/v1/health', 'GET', null, (data) => {
    if (data.status === 'healthy') {
      console.log('✅ API is healthy');
      console.log(`📡 Endpoint: ${API_BASE}`);
      console.log(`🤖 Providers: ${data.system.providers.length} configured`);
      console.log(`⚙️  Default: ${data.system.preferences.defaultProvider}`);
      console.log('\nAvailable providers:');
      data.system.providers.forEach(p => {
        const status = p.enabled ? '✅' : '❌';
        console.log(`  ${status} ${p.displayName}`);
      });
    } else {
      console.log('❌ API is not healthy');
      console.log(JSON.stringify(data, null, 2));
    }
  });
}

function executePrompt(prompt) {
  console.log('🧠 TooLoo.ai is thinking...\n');
  
  const provider = process.env.TOOLOO_PROVIDER || 'deepseek';
  const payload = {
    prompt: prompt,
    provider: provider,
    conversationId: `cli-${Date.now()}`,
    context: {
      source: 'cli',
      timestamp: new Date().toISOString()
    }
  };

  makeRequest('/api/v1/generate', 'POST', payload, (data) => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💡 TooLoo Response:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (data.response) {
      console.log(data.response);
    } else if (data.content) {
      console.log(data.content);
    } else if (data.message) {
      console.log(data.message);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    
    if (data.metadata) {
      console.log(`\n📊 Provider: ${data.metadata.provider || provider}`);
      console.log(`⏱️  Time: ${data.metadata.duration || 'N/A'}ms`);
      console.log(`🔢 Tokens: ${data.metadata.tokens || 'N/A'}`);
    }
  });
}

function startInteractive() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '🧠 TooLoo> '
  });

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           🧠 TooLoo.ai Interactive Mode                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\nType your requests and press Enter. Type "exit" to quit.\n');

  rl.prompt();

  rl.on('line', (line) => {
    const input = line.trim();
    
    if (input === 'exit' || input === 'quit') {
      console.log('\n👋 Goodbye!');
      rl.close();
      process.exit(0);
    }
    
    if (input === 'clear') {
      console.clear();
      rl.prompt();
      return;
    }
    
    if (input === '') {
      rl.prompt();
      return;
    }
    
    executePrompt(input);
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 Goodbye!');
    process.exit(0);
  });
}

function makeRequest(path, method, data, callback) {
  const url = new URL(path, API_BASE);
  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: url.pathname + url.search,
    method: method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (data) {
    const postData = JSON.stringify(data);
    options.headers['Content-Length'] = Buffer.byteLength(postData);
  }

  const req = http.request(options, (res) => {
    let body = '';
    
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        callback(json);
      } catch (e) {
        console.error('❌ Error parsing response:', e.message);
        console.error('Response:', body);
        process.exit(1);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Connection error: ${e.message}`);
    console.error(`\nMake sure TooLoo.ai API is running on ${API_BASE}`);
    console.error('Try running: npm run dev\n');
    process.exit(1);
  });

  if (data) {
    req.write(JSON.stringify(data));
  }
  
  req.end();
}
