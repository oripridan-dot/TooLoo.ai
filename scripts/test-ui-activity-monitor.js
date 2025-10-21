#!/usr/bin/env node

/**
 * UI Activity Monitor Test Suite
 * 
 * Verifies that the UI activity monitoring and real data pipeline are working correctly.
 * 
 * Usage:
 *   node scripts/test-ui-activity-monitor.js
 * 
 * This tests:
 * 1. Activity monitor is running
 * 2. Heartbeat injection in HTML pages
 * 3. Session tracking
 * 4. Service health checks
 * 5. Real data mode activation
 * 6. Provider routing
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WEB_PORT = Number(process.env.WEB_PORT || 3000);
const MONITOR_PORT = Number(process.env.ACTIVITY_MONITOR_PORT || 3050);

const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;
const MONITOR_URL = `http://127.0.0.1:${MONITOR_PORT}`;

let testCount = 0;
let passCount = 0;
let failCount = 0;

// Utilities
function log(...args) { console.log('[TEST]', ...args); }
function pass(msg) { passCount++; testCount++; console.log('  ✅', msg); }
function fail(msg) { failCount++; testCount++; console.log('  ❌', msg); }
function section(msg) { console.log(`\n${'═'.repeat(60)}\n${msg}\n${'═'.repeat(60)}`); }

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testActivityMonitorHealth() {
  section('Test 1: Activity Monitor Health');
  
  try {
    const res = await fetch(`${MONITOR_URL}/health`, { timeout: 3000 });
    if (res.ok) {
      pass('Activity monitor is running on port 3050');
    } else {
      fail(`Activity monitor returned status ${res.status}`);
    }
  } catch (e) {
    fail(`Activity monitor not reachable: ${e.message}`);
  }
}

async function testHeartbeatInjection() {
  section('Test 2: Heartbeat Script Injection');
  
  try {
    const res = await fetch(`${BASE_URL}/control-room`, { timeout: 5000 });
    const html = await res.text();
    
    if (html.includes('tooloo-heartbeat.js')) {
      pass('Heartbeat script is injected into HTML pages');
    } else {
      fail('Heartbeat script not found in HTML response');
    }
    
    if (html.includes('<script src="/js/tooloo-heartbeat.js"')) {
      pass('Heartbeat script tag is correctly formatted');
    } else {
      fail('Heartbeat script tag not properly formatted');
    }
  } catch (e) {
    fail(`Failed to fetch HTML: ${e.message}`);
  }
}

async function testHeartbeatEndpoint() {
  section('Test 3: Heartbeat Endpoint');
  
  const sessionId = `test-${Date.now()}`;
  
  try {
    const res = await fetch(`${BASE_URL}/api/v1/activity/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        route: '/test',
        action: 'heartbeat',
        ensureServices: true
      }),
      timeout: 5000
    });
    
    if (res.ok) {
      pass('Heartbeat endpoint accepts POST requests');
      
      const data = await res.json();
      if (data.ok) {
        pass('Heartbeat returns ok: true');
      } else {
        fail('Heartbeat response has ok: false');
      }
      
      if (typeof data.activeSessions === 'number') {
        pass(`Heartbeat reports ${data.activeSessions} active session(s)`);
      } else {
        fail('Heartbeat response missing activeSessions');
      }
      
      if (typeof data.serversActive === 'number') {
        pass(`Heartbeat reports ${data.serversActive} active server(s)`);
      } else {
        fail('Heartbeat response missing serversActive');
      }
      
      if (data.config?.realDataMode) {
        pass('Real data mode is enabled');
      } else {
        fail('Real data mode not enabled');
      }
    } else {
      fail(`Heartbeat endpoint returned ${res.status}`);
    }
  } catch (e) {
    fail(`Heartbeat endpoint error: ${e.message}`);
  }
}

async function testSessionTracking() {
  section('Test 4: Session Tracking');
  
  try {
    const res = await fetch(`${BASE_URL}/api/v1/activity/sessions`, { timeout: 5000 });
    
    if (res.ok) {
      pass('Sessions endpoint is accessible');
      
      const data = await res.json();
      if (data.ok && Array.isArray(data.sessions)) {
        pass(`Sessions endpoint returns session list (${data.sessions.length} sessions)`);
      } else {
        fail('Sessions endpoint response format incorrect');
      }
    } else {
      fail(`Sessions endpoint returned ${res.status}`);
    }
  } catch (e) {
    fail(`Sessions endpoint error: ${e.message}`);
  }
}

async function testServerHealthCheck() {
  section('Test 5: Server Health Checks');
  
  try {
    const res = await fetch(`${BASE_URL}/api/v1/activity/servers`, { timeout: 5000 });
    
    if (res.ok) {
      pass('Server health endpoint is accessible');
      
      const data = await res.json();
      if (data.ok && Array.isArray(data.servers)) {
        pass(`Health check reports ${data.activeServers}/${data.totalServers} servers active`);
        
        const priorityServers = data.servers.filter(s => s.isPriority);
        if (priorityServers.length > 0) {
          const priorityHealthy = priorityServers.filter(s => s.healthy).length;
          pass(`Priority servers: ${priorityHealthy}/${priorityServers.length} healthy`);
          
          priorityServers.slice(0, 3).forEach(s => {
            log(`  - ${s.name} (port ${s.port}): ${s.healthy ? '🟢' : '🔴'}`);
          });
        }
      } else {
        fail('Server health response format incorrect');
      }
    } else {
      fail(`Server health endpoint returned ${res.status}`);
    }
  } catch (e) {
    fail(`Server health endpoint error: ${e.message}`);
  }
}

async function testRealDataMode() {
  section('Test 6: Real Data Mode');
  
  try {
    const res = await fetch(`${BASE_URL}/api/v1/activity/ensure-real-data`, {
      method: 'POST',
      timeout: 5000
    });
    
    if (res.ok) {
      pass('Real data ensure endpoint is accessible');
      
      const data = await res.json();
      if (data.realDataMode) {
        pass('Real data mode is active');
      } else {
        fail('Real data mode not active');
      }
      
      if (data.providersActive) {
        pass('Providers are active and ready');
      } else {
        fail('Providers not active');
      }
    } else {
      fail(`Real data ensure endpoint returned ${res.status}`);
    }
  } catch (e) {
    fail(`Real data ensure error: ${e.message}`);
  }
}

async function testProviderStatus() {
  section('Test 7: Provider Status');
  
  try {
    const res = await fetch(`${BASE_URL}/api/v1/providers/status`, { timeout: 5000 });
    
    if (res.ok) {
      pass('Provider status endpoint is accessible');
      
      const data = await res.json();
      if (data.ok && typeof data.status === 'object') {
        const availableProviders = Object.entries(data.status)
          .filter(([_, s]) => s.available && s.enabled)
          .map(([name]) => name);
        
        if (availableProviders.length > 0) {
          pass(`${availableProviders.length} providers available: ${availableProviders.join(', ')}`);
        } else {
          fail('No providers available');
        }
      } else {
        fail('Provider status response format incorrect');
      }
    } else {
      fail(`Provider status returned ${res.status}`);
    }
  } catch (e) {
    fail(`Provider status error: ${e.message}`);
  }
}

async function testBudgetStatus() {
  section('Test 8: Budget Status');
  
  try {
    const res = await fetch(`${BASE_URL}/api/v1/budget`, { timeout: 5000 });
    
    if (res.ok) {
      pass('Budget endpoint is accessible');
      
      const data = await res.json();
      if (data.ok && data.budget) {
        const budget = data.budget;
        log(`  Daily budget: $${budget.dailyLimit?.toFixed(2) || 'N/A'}`);
        log(`  Spent today: $${budget.spentToday?.toFixed(2) || 'N/A'}`);
        log(`  Remaining: $${budget.remaining?.toFixed(2) || 'N/A'}`);
        pass('Budget information available');
      } else {
        fail('Budget response format incorrect');
      }
    } else {
      fail(`Budget endpoint returned ${res.status}`);
    }
  } catch (e) {
    fail(`Budget endpoint error: ${e.message}`);
  }
}

async function testConfigUpdate() {
  section('Test 9: Configuration Management');
  
  try {
    const res = await fetch(`${BASE_URL}/api/v1/activity/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        realDataMode: true,
        autoStartEnabled: true,
        minActiveServers: 6
      }),
      timeout: 5000
    });
    
    if (res.ok) {
      pass('Config update endpoint is accessible');
      
      const data = await res.json();
      if (data.ok && data.config) {
        pass(`Configuration updated: realDataMode=${data.config.realDataMode}, autoStart=${data.config.autoStartEnabled}`);
      } else {
        fail('Config response format incorrect');
      }
    } else {
      fail(`Config update endpoint returned ${res.status}`);
    }
  } catch (e) {
    fail(`Config update error: ${e.message}`);
  }
}

async function testHeartbeatScript() {
  section('Test 10: Heartbeat Script Functionality');
  
  try {
    const scriptPath = path.join(__dirname, '..', 'web-app', 'js', 'tooloo-heartbeat.js');
    const script = await fs.readFile(scriptPath, 'utf-8');
    
    if (script.includes('sendHeartbeat')) {
      pass('Heartbeat script contains sendHeartbeat function');
    } else {
      fail('sendHeartbeat function not found in script');
    }
    
    if (script.includes('setupActivityTracking')) {
      pass('Heartbeat script contains activity tracking setup');
    } else {
      fail('Activity tracking setup not found');
    }
    
    if (script.includes('ensureRealDataProvider')) {
      pass('Heartbeat script contains real data provider setup');
    } else {
      fail('Real data provider setup not found');
    }
    
    if (script.includes('localStorage')) {
      pass('Heartbeat script uses persistent session storage');
    } else {
      fail('Session storage not found');
    }
  } catch (e) {
    fail(`Failed to read heartbeat script: ${e.message}`);
  }
}

// Main test runner
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║    TooLoo UI Activity Monitor - Test Suite                  ║
║                                                             ║
║    Testing automatic server activation & real data          ║
║    pipeline when UI is active                              ║
╚════════════════════════════════════════════════════════════╝
  `);
  
  log(`Base URL: ${BASE_URL}`);
  log(`Monitor URL: ${MONITOR_URL}`);
  log(`\nRunning tests...`);
  
  try {
    // Run all tests
    await testActivityMonitorHealth();
    await sleep(500);
    
    await testHeartbeatInjection();
    await sleep(500);
    
    await testHeartbeatEndpoint();
    await sleep(500);
    
    await testSessionTracking();
    await sleep(500);
    
    await testServerHealthCheck();
    await sleep(500);
    
    await testRealDataMode();
    await sleep(500);
    
    await testProviderStatus();
    await sleep(500);
    
    await testBudgetStatus();
    await sleep(500);
    
    await testConfigUpdate();
    await sleep(500);
    
    await testHeartbeatScript();
  } catch (e) {
    console.error('Test suite error:', e);
  }
  
  // Summary
  section('Test Summary');
  console.log(`\nTotal Tests: ${testCount}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success Rate: ${Math.round((passCount / testCount) * 100)}%`);
  
  if (failCount === 0) {
    console.log(`\n🎉 All tests passed! UI activity monitoring is working correctly.\n`);
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failCount} test(s) failed. Check the logs above for details.\n`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
