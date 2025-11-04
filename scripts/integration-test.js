#!/usr/bin/env node

/**
 * Integration Test for GitHub Context Server
 * 
 * This test starts both the mock AI provider and the GitHub context server,
 * then runs a complete end-to-end test.
 */

import { spawn } from 'child_process';
import axios from 'axios';
import { writeFileSync } from 'fs';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

let mockServer = null;
let contextServer = null;

async function startMockServer() {
  return new Promise((resolve, reject) => {
    log(colors.cyan, '🎭 Starting mock AI provider server...');
    
    mockServer = spawn('node', ['scripts/mock-ai-provider.js'], {
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    let started = false;

    mockServer.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Mock AI Provider Server running')) {
        started = true;
        log(colors.green, '✅ Mock server started');
        setTimeout(resolve, 500); // Give it time to bind
      }
    });

    mockServer.stderr.on('data', (data) => {
      console.error('Mock server error:', data.toString());
    });

    setTimeout(() => {
      if (!started) {
        reject(new Error('Mock server failed to start'));
      }
    }, 5000);
  });
}

async function startContextServer() {
  return new Promise((resolve, reject) => {
    log(colors.cyan, '🚀 Starting GitHub context server...');
    
    // Create .env with mock provider
    const envContent = `GITHUB_CONTEXT_PORT=3010
OPENAI_API_KEY=mock-key-for-testing
OPENAI_API_BASE_URL=http://localhost:11111
`;
    writeFileSync('.env.test', envContent);
    
    contextServer = spawn('node', ['servers/github-context-server.js'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: {
        ...process.env,
        OPENAI_API_KEY: 'mock-key-for-testing'
      }
    });

    let started = false;

    contextServer.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('GitHub Context Server running')) {
        started = true;
        log(colors.green, '✅ Context server started');
        setTimeout(resolve, 500); // Give it time to bind
      }
    });

    contextServer.stderr.on('data', (data) => {
      console.error('Context server error:', data.toString());
    });

    setTimeout(() => {
      if (!started) {
        reject(new Error('Context server failed to start'));
      }
    }, 5000);
  });
}

function stopServers() {
  if (mockServer) {
    log(colors.yellow, '🛑 Stopping mock server...');
    mockServer.kill();
  }
  if (contextServer) {
    log(colors.yellow, '🛑 Stopping context server...');
    contextServer.kill();
  }
}

async function waitForServer(url, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(url, { timeout: 1000 });
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return false;
}

async function runTests() {
  log(colors.blue, '\n═══════════════════════════════════════');
  log(colors.blue, '  GitHub Context Server Integration Test');
  log(colors.blue, '═══════════════════════════════════════\n');

  try {
    // Start servers
    await startMockServer();
    await startContextServer();
    
    // Wait for servers to be ready
    log(colors.cyan, '⏳ Waiting for servers to be ready...');
    const mockReady = await waitForServer('http://localhost:11111/health');
    const contextReady = await waitForServer('http://localhost:3010/health');
    
    if (!mockReady) {
      throw new Error('Mock server not responding');
    }
    if (!contextReady) {
      throw new Error('Context server not responding');
    }
    
    log(colors.green, '✅ Both servers ready\n');
    
    // Run test
    log(colors.cyan, '🧪 Testing AI analysis endpoint...');
    
    const response = await axios.post(
      'http://localhost:3010/api/v1/github/ask',
      {
        question: 'What are the main concerns in this codebase?',
        depth: 'full',
        repoContext: {
          owner: 'oripridan-dot',
          repo: 'TooLoo.ai',
          structure: `TooLoo.ai/
├── servers/
│   └── github-context-server.js
├── scripts/
│   └── test-github-context.js
└── package.json`,
          readme: 'GitHub Copilot partnership workspace',
          files: ['servers/github-context-server.js', 'scripts/test-github-context.js']
        }
      },
      {
        timeout: 35000
      }
    );
    
    // Verify response
    if (!response.data.ok) {
      throw new Error('Response ok field is false');
    }
    
    if (!response.data.analysis) {
      throw new Error('No analysis in response');
    }
    
    if (!response.data.provider) {
      throw new Error('No provider in response');
    }
    
    if (!response.data.tokens) {
      throw new Error('No tokens in response');
    }
    
    log(colors.green, '✅ AI analysis endpoint works!\n');
    
    // Display results
    log(colors.blue, '📊 Response Details:');
    console.log('Provider:', response.data.provider);
    console.log('Tokens:', JSON.stringify(response.data.tokens, null, 2));
    console.log('\n📝 Analysis Preview:');
    console.log(response.data.analysis.substring(0, 500) + '...\n');
    
    log(colors.green, '🎉 All tests passed!\n');
    
    stopServers();
    process.exit(0);
    
  } catch (error) {
    log(colors.red, '\n❌ Test failed:', error.message);
    stopServers();
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  stopServers();
  process.exit(0);
});

process.on('exit', () => {
  stopServers();
});

// Run tests
runTests();
