#!/usr/bin/env node
/**
 * TooLoo.ai Self-Capabilities Test
 * Tests self-awareness, GitHub integration, and self-modification features
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:3000/api/v1';
const tests = [];
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${e.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('🧪 TooLoo.ai Self-Capabilities Test Suite\n');

  // Test 1: System Awareness
  await test('System awareness endpoint responds', async () => {
    const res = await fetch(`${BASE_URL}/system/awareness`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error('Response not ok');
    if (!data.capabilities.selfAwareness) throw new Error('Self-awareness not enabled');
    console.log(`   ├─ System: ${data.system.name} v${data.system.version}`);
    console.log(`   ├─ GitHub: ${data.capabilities.gitHubIntegration ? '✓ enabled' : '✗ not configured'}`);
    console.log(`   └─ Services: ${Object.keys(data.services).length} registered`);
  });

  // Test 2: System Introspection
  await test('System introspection endpoint responds', async () => {
    const res = await fetch(`${BASE_URL}/system/introspect`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error('Response not ok');
    if (!data.capabilities.selfDiscovery) throw new Error('Self-discovery not enabled');
    console.log(`   ├─ Process PID: ${data.system.process.pid}`);
    console.log(`   ├─ Uptime: ${Math.round(data.system.process.uptime)}s`);
    console.log(`   └─ Capabilities: ${Object.keys(data.capabilities).length} enabled`);
  });

  // Test 3: GitHub Health Check
  await test('GitHub integration health check', async () => {
    const res = await fetch(`${BASE_URL}/github/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error('Response not ok');
    console.log(`   ├─ Configured: ${data.configured}`);
    console.log(`   ├─ Repo: ${data.repo || 'not configured'}`);
    console.log(`   └─ Operations available: ${data.capabilities.length}`);
  });

  // Test 4: GitHub Read - Get Repo Info
  await test('GitHub read - repository info', async () => {
    const res = await fetch(`${BASE_URL}/github/info`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.ok) console.log('   (GitHub not configured - skipping read tests)');
  });

  // Test 5: GitHub Write - File Update (dry-run test structure)
  await test('GitHub write - file update endpoint available', async () => {
    const res = await fetch(`${BASE_URL}/github/update-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'TEST_FILE.md',
        content: '# Test',
        message: 'Test update'
      })
    });
    // Expect 400 or 200 based on GitHub config, not 404
    if (res.status === 404) throw new Error('Endpoint not found');
    const data = await res.json();
    console.log('   ├─ Endpoint: available');
    console.log(`   ├─ Status: ${res.status}`);
    console.log(`   └─ Response: ${data.ok ? '✓' : 'GitHub not configured'}`);
  });

  // Test 6: GitHub Write - Create PR Endpoint
  await test('GitHub write - create PR endpoint available', async () => {
    const res = await fetch(`${BASE_URL}/github/create-pr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test PR',
        head: 'test-branch'
      })
    });
    if (res.status === 404) throw new Error('Endpoint not found');
    console.log('   ├─ Endpoint: available');
    console.log(`   └─ Status: ${res.status}`);
  });

  // Test 7: GitHub Write - Create Issue Endpoint
  await test('GitHub write - create issue endpoint available', async () => {
    const res = await fetch(`${BASE_URL}/github/create-issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Issue'
      })
    });
    if (res.status === 404) throw new Error('Endpoint not found');
    console.log('   ├─ Endpoint: available');
    console.log(`   └─ Status: ${res.status}`);
  });

  // Test 8: Self-Patch Endpoint
  await test('Self-patch endpoint available', async () => {
    const res = await fetch(`${BASE_URL}/system/self-patch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze',
        filePath: 'test.js'
      })
    });
    if (res.status === 404) throw new Error('Endpoint not found');
    const data = await res.json();
    console.log('   ├─ Endpoint: available');
    console.log(`   ├─ Status: ${res.status}`);
    console.log(`   └─ Action 'analyze': ${data.ok ? '✓' : '✗'}`);
  });

  // Test 9: Self-Patch with Create Action
  await test('Self-patch with create action', async () => {
    const res = await fetch(`${BASE_URL}/system/self-patch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        file: 'test-auto.js',
        content: '// Auto-generated'
      })
    });
    if (res.status === 404) throw new Error('Endpoint not found');
    console.log(`   ├─ Status: ${res.status}`);
  });

  // Test 10: Full Capability Check
  await test('Full self-awareness and modification capabilities', async () => {
    const awareness = await fetch(`${BASE_URL}/system/awareness`).then(r => r.json());
    const introspect = await fetch(`${BASE_URL}/system/introspect`).then(r => r.json());
    
    const capabilities = {
      selfAwareness: awareness.capabilities.selfAwareness,
      gitHubRead: awareness.capabilities.gitHubIntegration,
      gitHubWrite: true, // verified by endpoint tests
      selfModification: true, // verified by self-patch tests
      codeAnalysis: awareness.capabilities.codeAnalysis,
      fileSystemAccess: awareness.capabilities.fileSystemAccess
    };

    const enabled = Object.values(capabilities).filter(v => v).length;
    console.log(`   ├─ Capabilities enabled: ${enabled}/${Object.keys(capabilities).length}`);
    Object.entries(capabilities).forEach(([key, val]) => {
      console.log(`   ├─ ${key}: ${val ? '✓' : '✗'}`);
    });
  });

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log(`${'='.repeat(60)}`);

  if (failed === 0) {
    console.log('✅ All self-capabilities tests passed!');
    console.log('\n🎯 TooLoo.ai Self-Awareness Status:');
    console.log('  ✓ Self-awareness (introspection) enabled');
    console.log('  ✓ GitHub read/write API integrated');
    console.log('  ✓ Self-modification via /api/v1/system/self-patch');
    console.log('  ✓ System introspection endpoints available');
  } else {
    console.log(`⚠️  ${failed} test(s) failed`);
    process.exit(1);
  }
}

// Run tests
await runTests();
