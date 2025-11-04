import axios from 'axios';

const SERVER_URL = process.env.GITHUB_CONTEXT_URL || 'http://localhost:3010';

// Colors for console output
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

async function testHealthCheck() {
  log(colors.cyan, '\n🔍 Testing health check...');
  try {
    const response = await axios.get(`${SERVER_URL}/health`);
    log(colors.green, '✅ Health check passed');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    log(colors.red, '❌ Health check failed:', error.message);
    return false;
  }
}

async function testProvidersList() {
  log(colors.cyan, '\n🔍 Testing providers list...');
  try {
    const response = await axios.get(`${SERVER_URL}/api/v1/github/providers`);
    log(colors.green, '✅ Providers list retrieved');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data.fallbackChain.length > 0;
  } catch (error) {
    log(colors.red, '❌ Providers list failed:', error.message);
    return false;
  }
}

async function testAskEndpoint() {
  log(colors.cyan, '\n🔍 Testing /api/v1/github/ask endpoint...');
  
  const testRequest = {
    question: 'What are the main concerns in this codebase?',
    depth: 'full',
    repoContext: {
      owner: 'oripridan-dot',
      repo: 'TooLoo.ai',
      structure: `
TooLoo.ai/
├── servers/
│   └── github-context-server.js
├── scripts/
│   ├── test-github-context.js
│   └── open-audio.js
├── package.json
└── README.md
      `,
      readme: 'TooLoo.ai - GitHub Copilot partnership workspace for building proven AI-human collaboration workflows',
      files: ['servers/github-context-server.js', 'scripts/test-github-context.js', 'package.json']
    }
  };

  try {
    log(colors.blue, 'Sending request with question:', testRequest.question);
    const response = await axios.post(
      `${SERVER_URL}/api/v1/github/ask`,
      testRequest,
      {
        timeout: 35000 // Slightly longer than server timeout
      }
    );
    
    if (response.data.ok) {
      log(colors.green, '✅ Ask endpoint succeeded');
      console.log('\n📊 Response Details:');
      console.log('Provider used:', response.data.provider);
      console.log('Tokens:', response.data.tokens);
      console.log('\n📝 Analysis:');
      console.log(response.data.analysis.substring(0, 500) + '...');
      return true;
    } else {
      log(colors.yellow, '⚠️  Ask endpoint returned ok: false');
      console.log('Error:', JSON.stringify(response.data.error, null, 2));
      return false;
    }
  } catch (error) {
    if (error.response) {
      log(colors.red, '❌ Ask endpoint failed with HTTP error:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      log(colors.red, '❌ Ask endpoint failed:', error.message);
    }
    return false;
  }
}

async function testProviderFallback() {
  log(colors.cyan, '\n🔍 Testing provider fallback (with invalid first provider)...');
  
  // This test would require temporarily disabling providers
  // For now, we'll just document the expected behavior
  log(colors.yellow, 'ℹ️  Fallback testing requires manual provider configuration');
  log(colors.yellow, 'ℹ️  To test: disable first provider and verify next in chain is used');
  return true;
}

async function testErrorHandling() {
  log(colors.cyan, '\n🔍 Testing error handling (missing question)...');
  
  try {
    const response = await axios.post(
      `${SERVER_URL}/api/v1/github/ask`,
      {},
      {
        validateStatus: () => true // Don't throw on 4xx
      }
    );
    
    if (response.status === 400 && !response.data.ok) {
      log(colors.green, '✅ Error handling works correctly');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return true;
    } else {
      log(colors.red, '❌ Error handling did not work as expected');
      return false;
    }
  } catch (error) {
    log(colors.red, '❌ Error handling test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  log(colors.blue, '═══════════════════════════════════════');
  log(colors.blue, '  GitHub Context Server Test Suite');
  log(colors.blue, '═══════════════════════════════════════');
  
  const results = {
    health: false,
    providers: false,
    ask: false,
    errorHandling: false
  };

  results.health = await testHealthCheck();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  results.providers = await testProvidersList();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  results.errorHandling = await testErrorHandling();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  results.ask = await testAskEndpoint();
  
  log(colors.blue, '\n═══════════════════════════════════════');
  log(colors.blue, '  Test Results Summary');
  log(colors.blue, '═══════════════════════════════════════');
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const color = passed ? colors.green : colors.red;
    log(color, `${icon} ${test}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    log(colors.green, '\n🎉 All tests passed!');
    process.exit(0);
  } else {
    log(colors.red, '\n❌ Some tests failed');
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${SERVER_URL}/health`, { timeout: 2000 });
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  log(colors.yellow, '🔌 Checking if server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    log(colors.red, '❌ Server is not running on', SERVER_URL);
    log(colors.yellow, '💡 Start the server first: npm run start:github-context');
    process.exit(1);
  }
  
  log(colors.green, '✅ Server is running\n');
  await runAllTests();
})();
