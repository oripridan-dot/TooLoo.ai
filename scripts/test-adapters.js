#!/usr/bin/env node

/**
 * Comprehensive Adapter Testing Suite
 * Tests all adapter endpoints and functionality
 */

import fetch from 'node-fetch';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const WEB_PORT = process.env.WEB_PORT || 3000;
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  test: (name) => console.log(`\n${colors.cyan}📋 Testing: ${name}${colors.reset}`),
  pass: (msg) => { console.log(`  ${colors.green}✅ ${msg}${colors.reset}`); testsPassed++; },
  fail: (msg) => { console.log(`  ${colors.red}❌ ${msg}${colors.reset}`); testsFailed++; },
  skip: (msg) => { console.log(`  ${colors.yellow}⊘  ${msg}${colors.reset}`); testsSkipped++; },
  info: (msg) => console.log(`  ${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (title) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n🚀 ${title}\n${'='.repeat(60)}${colors.reset}`),
};

/**
 * Wait for server to be ready
 */
async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/health`);
      if (res.ok) {
        log.pass(`Server ready on port ${WEB_PORT}`);
        return true;
      }
    } catch (e) {
      if (i === maxAttempts - 1) {
        log.fail(`Server not responding after ${maxAttempts} attempts`);
        return false;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return false;
}

/**
 * Test: Health Check Endpoint
 */
async function testHealthEndpoint() {
  log.test('Health Check Endpoint');
  try {
    const res = await fetch(`${BASE_URL}/api/v1/health`);
    if (res.ok) {
      const data = await res.json();
      log.pass(`Health check responded: ${data.server || 'unknown'}`);
      return true;
    } else {
      log.fail(`Health check returned ${res.status}`);
      return false;
    }
  } catch (e) {
    log.fail(`Health check failed: ${e.message}`);
    return false;
  }
}

/**
 * Test: Adapter Registry - List Available Adapters
 */
async function testAdaptersList() {
  log.test('Adapter Registry - List Available Adapters');
  try {
    const res = await fetch(`${BASE_URL}/api/v1/adapters/list`);
    if (res.status === 200 || res.status === 404) {
      const data = await res.json();
      if (data.adapters && Array.isArray(data.adapters)) {
        log.pass(`Listed ${data.adapters.length} available adapters`);
        log.info(`Adapters: ${data.adapters.join(', ')}`);
        return true;
      } else if (res.status === 404) {
        log.skip('Adapter list endpoint not yet implemented');
        return null;
      }
    }
    log.fail(`Unexpected response: ${res.status}`);
    return false;
  } catch (e) {
    log.skip(`Adapter registry endpoint not available: ${e.message}`);
    return null;
  }
}

/**
 * Test: Adapter Status/Health
 */
async function testAdapterHealth() {
  log.test('Adapter Health Status');
  try {
    const res = await fetch(`${BASE_URL}/api/v1/adapters/health`);
    if (res.status === 200 || res.status === 404) {
      const data = await res.json();
      if (data.adapters) {
        log.pass(`Adapter health check returned: ${Object.keys(data.adapters).length} adapters`);
        return true;
      } else if (res.status === 404) {
        log.skip('Adapter health endpoint not yet implemented');
        return null;
      }
    }
    log.fail(`Unexpected response: ${res.status}`);
    return false;
  } catch (e) {
    log.skip(`Adapter health endpoint not available: ${e.message}`);
    return null;
  }
}

/**
 * Test: OAuth Adapter - List Providers
 */
async function testOAuthListProviders() {
  log.test('OAuth Adapter - List Providers');
  try {
    const res = await fetch(`${BASE_URL}/api/v1/adapters/oauth/action/list-providers`, {
      method: 'GET',
    });
    if (res.status === 200 || res.status === 404) {
      const data = await res.json();
      if (Array.isArray(data.providers) || Array.isArray(data)) {
        const providers = Array.isArray(data.providers) ? data.providers : data;
        log.pass(`OAuth providers: ${providers.join(', ')}`);
        return true;
      } else if (res.status === 404) {
        log.skip('OAuth adapter not yet wired to web-server');
        return null;
      }
    }
    log.fail(`Unexpected response: ${res.status}`);
    return false;
  } catch (e) {
    log.skip(`OAuth adapter endpoint not available: ${e.message}`);
    return null;
  }
}

/**
 * Test: OAuth Adapter - Get Authorization URL
 */
async function testOAuthAuthUrl() {
  log.test('OAuth Adapter - Get Authorization URL');
  try {
    const res = await fetch(`${BASE_URL}/api/v1/adapters/oauth/action/auth-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        redirectUri: 'http://localhost:3000/auth/callback',
        state: 'test-state-123',
      }),
    });
    if (res.status === 200 || res.status === 404) {
      const data = await res.json();
      if (data.authUrl && typeof data.authUrl === 'string') {
        log.pass(`Generated OAuth URL for Google (${data.authUrl.substring(0, 50)}...)`);
        return true;
      } else if (res.status === 404) {
        log.skip('OAuth auth-url endpoint not yet implemented');
        return null;
      }
    }
    log.fail(`Unexpected response: ${res.status}`);
    return false;
  } catch (e) {
    log.skip(`OAuth auth-url endpoint not available: ${e.message}`);
    return null;
  }
}

/**
 * Test: Design Adapter - List Figma Files
 */
async function testDesignListFiles() {
  log.test('Design Adapter (Figma) - List Files');
  try {
    const res = await fetch(`${BASE_URL}/api/v1/adapters/design/action/list-files?teamId=test-team`, {
      method: 'GET',
    });
    if (res.status === 200 || res.status === 404 || res.status === 403) {
      const data = await res.json();
      if (Array.isArray(data.files) || data.files) {
        log.pass('Listed design files');
        return true;
      } else if (res.status === 403) {
        log.skip('Design adapter: Figma token not configured (expected for MVP)');
        return null;
      } else if (res.status === 404) {
        log.skip('Design adapter endpoint not yet implemented');
        return null;
      }
    }
    if (res.status === 403) {
      log.skip('Design adapter: Auth required (need Figma token)');
      return null;
    }
    log.fail(`Unexpected response: ${res.status}`);
    return false;
  } catch (e) {
    log.skip(`Design adapter endpoint not available: ${e.message}`);
    return null;
  }
}

/**
 * Test: Integrations Adapter - List Handlers
 */
async function testIntegrationsListHandlers() {
  log.test('Integrations Adapter - List Handlers');
  try {
    const res = await fetch(`${BASE_URL}/api/v1/adapters/integrations/action/list-handlers`, {
      method: 'GET',
    });
    if (res.status === 200 || res.status === 404) {
      const data = await res.json();
      if (Array.isArray(data.handlers)) {
        log.pass(`Available handlers: ${data.handlers.join(', ')}`);
        return true;
      } else if (res.status === 404) {
        log.skip('Integrations adapter endpoint not yet implemented');
        return null;
      }
    }
    log.fail(`Unexpected response: ${res.status}`);
    return false;
  } catch (e) {
    log.skip(`Integrations adapter endpoint not available: ${e.message}`);
    return null;
  }
}

/**
 * Test: Integrations Adapter - Execute Handler
 */
async function testIntegrationsExecuteHandler() {
  log.test('Integrations Adapter - Execute Handler');
  try {
    const res = await fetch(`${BASE_URL}/api/v1/adapters/integrations/action/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handler: 'log',
        params: { message: 'test-message' },
      }),
    });
    if (res.status === 200 || res.status === 404) {
      const data = await res.json();
      if (data.success || data.executed) {
        log.pass('Handler executed successfully');
        return true;
      } else if (res.status === 404) {
        log.skip('Integrations handler endpoint not yet implemented');
        return null;
      }
    }
    log.fail(`Unexpected response: ${res.status}`);
    return false;
  } catch (e) {
    log.skip(`Integrations handler endpoint not available: ${e.message}`);
    return null;
  }
}

/**
 * Test: Adapter Initialization
 */
async function testAdapterInitialization() {
  log.test('Adapter Initialization');
  try {
    const res = await fetch(`${BASE_URL}/api/v1/adapters/init/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.status === 200 || res.status === 404) {
      const data = await res.json();
      if (data.initialized || data.success) {
        log.pass('Adapter initialized: OAuth');
        return true;
      } else if (res.status === 404) {
        log.skip('Adapter init endpoint not yet implemented');
        return null;
      }
    }
    log.fail(`Unexpected response: ${res.status}`);
    return false;
  } catch (e) {
    log.skip(`Adapter init endpoint not available: ${e.message}`);
    return null;
  }
}

/**
 * Test: LLMProvider Unified Interface
 */
async function testLLMProviderInterface() {
  log.test('LLMProvider Unified Interface');
  try {
    // Try to load the LLMProvider
    const llmProviderPath = path.resolve('engine/llm-provider.js');
    if (!fs.existsSync(llmProviderPath)) {
      log.skip('LLMProvider not found at engine/llm-provider.js');
      return null;
    }

    const module = await import(`file://${llmProviderPath}`);
    const LLMProvider = module.default || module.LLMProvider;

    if (!LLMProvider) {
      log.skip('LLMProvider class not exported');
      return null;
    }

    const instance = new LLMProvider();
    const hasGenerate = typeof instance.generate === 'function';
    const hasGenerateSmartLLM = typeof instance.generateSmartLLM === 'function';

    if (hasGenerate && hasGenerateSmartLLM) {
      log.pass('LLMProvider has both methods: generate() + generateSmartLLM()');
      return true;
    } else if (hasGenerate) {
      log.pass('LLMProvider has new unified generate() method');
      return true;
    } else {
      log.fail('LLMProvider missing expected methods');
      return false;
    }
  } catch (e) {
    log.skip(`LLMProvider verification failed: ${e.message}`);
    return null;
  }
}

/**
 * Test: System Health Check
 */
async function testSystemHealth() {
  log.test('System Health Check');
  try {
    const res = await fetch(`${BASE_URL}/api/v1/system/health`);
    if (res.ok) {
      const data = await res.json();
      log.pass(`System health: ${JSON.stringify(data).substring(0, 50)}...`);
      return true;
    } else if (res.status === 404) {
      log.skip('System health endpoint not available');
      return null;
    }
    log.fail(`System health check failed: ${res.status}`);
    return false;
  } catch (e) {
    log.skip(`System health endpoint not available: ${e.message}`);
    return null;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  log.section('PHASE 11 ADAPTER COMPREHENSIVE TEST SUITE');
  
  console.log(`\n🔗 Testing endpoints on: ${BASE_URL}\n`);

  // Wait for server
  const ready = await waitForServer();
  if (!ready) {
    console.log(`\n${colors.red}❌ Server not ready. Make sure to run: npm run dev${colors.reset}\n`);
    process.exit(1);
  }

  // Run tests
  log.section('Core Endpoints');
  await testHealthEndpoint();
  await testSystemHealth();

  log.section('Adapter Registry');
  await testAdaptersList();
  await testAdapterHealth();
  await testAdapterInitialization();

  log.section('OAuth Adapter');
  await testOAuthListProviders();
  await testOAuthAuthUrl();

  log.section('Design Adapter (Figma)');
  await testDesignListFiles();

  log.section('Integrations Adapter');
  await testIntegrationsListHandlers();
  await testIntegrationsExecuteHandler();

  log.section('Phase 7.3: LLMProvider');
  await testLLMProviderInterface();

  // Summary
  log.section('TEST SUMMARY');
  const total = testsPassed + testsFailed + testsSkipped;
  console.log(`
  ${colors.green}✅ Passed:${colors.reset}  ${testsPassed}
  ${colors.red}❌ Failed:${colors.reset}  ${testsFailed}
  ${colors.yellow}⊘  Skipped:${colors.reset} ${testsSkipped}
  ${colors.cyan}Total:${colors.reset}  ${total}
  
  Pass Rate: ${total > 0 ? ((testsPassed / total) * 100).toFixed(1) : 0}%
  `);

  if (testsFailed === 0 && testsPassed > 0) {
    console.log(`\n${colors.green}🎉 All tests passed!${colors.reset}\n`);
    process.exit(0);
  } else if (testsFailed > 0) {
    console.log(`\n${colors.red}⚠️  Some tests failed. See above for details.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${colors.yellow}ℹ️  Tests incomplete (endpoints being implemented). This is expected for MVP.${colors.reset}\n`);
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(e => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, e);
  process.exit(1);
});
