/**
 * Capabilities Server Test Suite
 * 
 * Tests all 62 core methods and verifies:
 * - All methods are callable
 * - Telemetry tracking works
 * - Evolution tracking functions
 * - Dependency graph generation
 * - Autonomous mode operates correctly
 */

import http from 'http';

const BASE_URL = 'http://127.0.0.1:3009';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

let testsPassed = 0;
let testsFailed = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    log(`✓ ${name}`, 'green');
    testsPassed++;
  } catch (error) {
    log(`✗ ${name}: ${error.message}`, 'red');
    testsFailed++;
  }
}

async function runTests() {
  log('\n' + '='.repeat(80), 'blue');
  log('🧪 Capabilities Server Test Suite', 'blue');
  log('='.repeat(80) + '\n', 'blue');

  // Test 1: Health check
  await test('Server health check', async () => {
    const res = await makeRequest('GET', '/health');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.status !== 'ok') throw new Error('Server not healthy');
  });

  // Test 2: List discovered capabilities
  await test('List all 62 discovered capabilities', async () => {
    const res = await makeRequest('GET', '/api/v1/capabilities/discovered');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.total !== 62) throw new Error(`Expected 62 methods, got ${res.data.total}`);
    if (!res.data.methods) throw new Error('No methods returned');
  });

  // Test 3: Activate specific methods
  await test('Activate specific methods', async () => {
    const res = await makeRequest('POST', '/api/v1/capabilities/activate', {
      methods: ['analyzeUserBehavior', 'suggestBasedOnSkills', 'generateCode']
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.activated.length !== 3) throw new Error('Expected 3 activated methods');
    if (res.data.failed.length !== 0) throw new Error('Expected 0 failed methods');
  });

  // Test 4: Execute a capability method
  await test('Execute analyzeUserBehavior method', async () => {
    const res = await makeRequest('POST', '/api/v1/capabilities/execute', {
      method: 'analyzeUserBehavior',
      params: {}
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Method execution failed');
    if (!res.data.result) throw new Error('No result returned');
  });

  // Test 5: Execute multiple methods to generate telemetry
  log('\n📊 Testing telemetry by executing multiple methods...', 'yellow');
  const methodsToTest = [
    'analyzeCodeQuality',
    'analyzePerformance', 
    'suggestOptimizations',
    'generateTests',
    'validateInput',
    'transformData',
    'monitorHealth',
    'optimizePerformance',
    'learnFromFeedback'
  ];

  for (const method of methodsToTest) {
    await test(`Execute ${method}`, async () => {
      const res = await makeRequest('POST', '/api/v1/capabilities/execute', {
        method,
        params: {}
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (!res.data.success) throw new Error('Execution failed');
    });
  }

  // Test 6: Get telemetry metrics
  await test('Get telemetry metrics', async () => {
    const res = await makeRequest('GET', '/api/v1/capabilities/telemetry');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.overallStats) throw new Error('No overall stats');
    if (!res.data.metrics) throw new Error('No metrics returned');
    if (res.data.overallStats.totalCalls === 0) throw new Error('No calls recorded');
  });

  // Test 7: Get specific method telemetry
  await test('Get specific method telemetry', async () => {
    const res = await makeRequest('GET', '/api/v1/capabilities/telemetry?method=analyzeUserBehavior');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.metrics) throw new Error('No metrics returned');
    if (res.data.metrics.calls === 0) throw new Error('No calls recorded for method');
  });

  // Test 8: Get evolution history
  await test('Get evolution history', async () => {
    const res = await makeRequest('GET', '/api/v1/capabilities/evolution');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data.history)) throw new Error('History not an array');
    if (typeof res.data.improvementRate !== 'number') throw new Error('No improvement rate');
  });

  // Test 9: Get dependency graph
  await test('Get dependency graph', async () => {
    const res = await makeRequest('GET', '/api/v1/capabilities/dependencies');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.graph) throw new Error('No graph returned');
    if (!Array.isArray(res.data.cycles)) throw new Error('Cycles not an array');
  });

  // Test 10: Get specific method dependencies
  await test('Get method dependencies', async () => {
    const res = await makeRequest('GET', '/api/v1/capabilities/dependencies?method=analyzeUserBehavior');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data.dependencies)) throw new Error('Dependencies not an array');
  });

  // Test 11: Enable autonomous mode
  await test('Enable autonomous mode', async () => {
    const res = await makeRequest('POST', '/api/v1/capabilities/autonomous', {
      action: 'enable'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.status !== 'enabled') throw new Error('Autonomous mode not enabled');
  });

  // Test 12: Get autonomous status
  await test('Get autonomous mode status', async () => {
    const res = await makeRequest('GET', '/api/v1/capabilities/autonomous');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.enabled !== true) throw new Error('Autonomous mode should be enabled');
  });

  // Test 13: Disable autonomous mode
  await test('Disable autonomous mode', async () => {
    const res = await makeRequest('POST', '/api/v1/capabilities/autonomous', {
      action: 'disable'
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.status !== 'disabled') throw new Error('Autonomous mode not disabled');
  });

  // Test 14: Get overall system status
  await test('Get overall system status', async () => {
    const res = await makeRequest('GET', '/api/v1/capabilities/status');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.totalMethods !== 62) throw new Error('Expected 62 total methods');
    if (!res.data.telemetry) throw new Error('No telemetry in status');
    if (!res.data.evolution) throw new Error('No evolution in status');
    if (!res.data.autonomous) throw new Error('No autonomous status');
    if (res.data.health !== 'operational') throw new Error('System not operational');
  });

  // Test 15: Activate all 62 methods
  log('\n🚀 Activating all 62 methods...', 'yellow');
  await test('Activate all 62 core methods', async () => {
    const discoverRes = await makeRequest('GET', '/api/v1/capabilities/discovered');
    const allMethods = discoverRes.data.methods.map(m => m.name);
    
    const res = await makeRequest('POST', '/api/v1/capabilities/activate', {
      methods: allMethods
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.activated.length !== 62) throw new Error(`Expected 62 activated, got ${res.data.activated.length}`);
    if (res.data.failed.length !== 0) throw new Error(`Expected 0 failures, got ${res.data.failed.length}`);
  });

  // Test 16: Verify all methods are callable
  log('\n🔬 Testing all 62 methods are callable...', 'yellow');
  const discoverRes = await makeRequest('GET', '/api/v1/capabilities/discovered');
  const allMethods = discoverRes.data.methods.map(m => m.name);
  
  let executableCount = 0;
  for (const method of allMethods) {
    await test(`Execute ${method}`, async () => {
      const res = await makeRequest('POST', '/api/v1/capabilities/execute', {
        method,
        params: {}
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (!res.data.success) throw new Error('Execution failed');
      executableCount++;
    });
  }

  // Test 17: Verify coverage > 80%
  await test('Verify >80% method coverage', async () => {
    const coverage = (executableCount / 62) * 100;
    if (coverage < 80) throw new Error(`Coverage ${coverage.toFixed(1)}% is below 80%`);
  });

  // Test 18: Verify telemetry captured all calls
  await test('Verify telemetry captured all method calls', async () => {
    const res = await makeRequest('GET', '/api/v1/capabilities/telemetry');
    if (res.data.overallStats.totalCalls < 62) throw new Error('Not all methods recorded in telemetry');
  });

  // Test 19: Test error handling
  await test('Test invalid method execution', async () => {
    const res = await makeRequest('POST', '/api/v1/capabilities/execute', {
      method: 'nonExistentMethod',
      params: {}
    });
    if (res.status === 200 && res.data.success) throw new Error('Should have failed for invalid method');
  });

  // Test 20: Test parameter passing
  await test('Test method with parameters', async () => {
    const res = await makeRequest('POST', '/api/v1/capabilities/execute', {
      method: 'generateMocks',
      params: { count: 5, type: 'user' }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Execution failed');
    if (!res.data.result.mocks) throw new Error('No mocks generated');
  });

  // Summary
  log('\n' + '='.repeat(80), 'blue');
  log('📊 Test Summary', 'blue');
  log('='.repeat(80), 'blue');
  
  const total = testsPassed + testsFailed;
  const passRate = (testsPassed / total * 100).toFixed(1);
  
  log(`\nTotal Tests: ${total}`, 'blue');
  log(`Passed: ${testsPassed}`, 'green');
  log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
  log(`Pass Rate: ${passRate}%`, passRate >= 95 ? 'green' : 'yellow');

  // Get final status
  const statusRes = await makeRequest('GET', '/api/v1/capabilities/status');
  log('\n📋 Final System Status:', 'blue');
  log(`   Total Methods: ${statusRes.data.totalMethods}`, 'blue');
  log(`   Active Methods: ${statusRes.data.activeMethods}`, 'blue');
  log(`   Coverage: ${statusRes.data.coverage}`, 'blue');
  log(`   Total Calls: ${statusRes.data.telemetry.totalCalls}`, 'blue');
  log(`   Success Rate: ${statusRes.data.telemetry.overallSuccessRate.toFixed(1)}%`, 'blue');
  log(`   Improvement Rate: ${statusRes.data.evolution.improvementRate}`, 'blue');
  log(`   Meets Target (>20%): ${statusRes.data.evolution.meetsTarget ? 'Yes' : 'No'}`, 'blue');

  log('\n' + '='.repeat(80) + '\n', 'blue');

  if (testsFailed === 0) {
    log('🎉 All tests passed! Capabilities server is fully operational.', 'green');
    process.exit(0);
  } else {
    log('❌ Some tests failed. Please review the errors above.', 'red');
    process.exit(1);
  }
}

// Wait for server to be ready
async function waitForServer(maxAttempts = 10) {
  log('⏳ Waiting for server to be ready...', 'yellow');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await makeRequest('GET', '/health');
      if (res.status === 200) {
        log('✓ Server is ready!', 'green');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Server failed to start');
}

// Check if server is already running
async function checkServer() {
  try {
    const res = await makeRequest('GET', '/health');
    if (res.status === 200) {
      return true;
    }
  } catch (error) {
    return false;
  }
  return false;
}

// Main execution
(async () => {
  const isRunning = await checkServer();
  
  if (!isRunning) {
    log('❌ Server is not running. Please start it first with: npm run capabilities', 'red');
    log('   Then run this test in another terminal.', 'yellow');
    process.exit(1);
  }

  await runTests();
})();
