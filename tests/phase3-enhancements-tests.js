import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:3000';
const TIMEOUT = 5000;

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`✗ ${name}:`, e.message);
    failed++;
  }
}

async function fetch_api(path, opts = {}) {
  const r = await fetch(`${BASE_URL}${path}`, { ...opts, timeout: TIMEOUT });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

console.log('\n========== Phase 3 Enhancements Test Suite ==========\n');

// ====== PERFORMANCE OPTIMIZATION ======
console.log('--- Performance Optimization Tests ---\n');

await test('Cache: Get stats', async () => {
  const r = await fetch_api('/api/v1/domains/cache/stats');
  if (!r.ok) throw new Error('cache stats failed');
  if (r.stats.activeKeys === undefined) throw new Error('missing stats');
});

await test('Cache: Code analysis caching', async () => {
  const code = 'const x = 1; console.log(x);';
  const payload = { format: 'code', content: code };
  
  // First call
  const r1 = await fetch_api('/api/v1/responses/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  // Second call should be faster (from cache potentially)
  const r2 = await fetch_api('/api/v1/responses/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!r1.ok || !r2.ok) throw new Error('cache test failed');
});

// ====== OAUTH FLOWS ======
console.log('\n--- OAuth Flows Tests ---\n');

await test('OAuth: GitHub authorization URL', async () => {
  const r = await fetch(`http://127.0.0.1:3012/oauth/authorize/github?userId=test-user&redirect_uri=http://localhost:3012/callback`, {
    timeout: TIMEOUT
  });
  const data = await r.json();
  if (!data.authUrl) throw new Error('missing authUrl');
  if (!data.authUrl.includes('github.com')) throw new Error('not github url');
});

await test('OAuth: Slack authorization URL', async () => {
  const r = await fetch(`http://127.0.0.1:3012/oauth/authorize/slack?userId=test-user&redirect_uri=http://localhost:3012/callback`, {
    timeout: TIMEOUT
  });
  const data = await r.json();
  if (!data.authUrl) throw new Error('missing authUrl');
  if (!data.authUrl.includes('slack.com')) throw new Error('not slack url');
});

await test('OAuth: List providers for user', async () => {
  const r = await fetch(`http://127.0.0.1:3012/oauth/providers/test-user`, {
    timeout: TIMEOUT
  });
  const data = await r.json();
  if (!Array.isArray(data.providers)) throw new Error('not array');
});

// ====== WEBHOOKS ======
console.log('\n--- Webhooks Tests ---\n');

await test('Webhooks: Health check', async () => {
  const r = await fetch(`http://127.0.0.1:3018/health`, {
    timeout: TIMEOUT
  });
  const data = await r.json();
  if (data.server !== 'webhooks') throw new Error('wrong server');
});

await test('Webhooks: Get event log', async () => {
  const r = await fetch(`http://127.0.0.1:3018/webhooks/events`, {
    timeout: TIMEOUT
  });
  const data = await r.json();
  if (!Array.isArray(data.events)) throw new Error('not array');
});

await test('Webhooks: Clear event log', async () => {
  const r = await fetch(`http://127.0.0.1:3018/webhooks/events/clear`, {
    method: 'POST',
    timeout: TIMEOUT
  });
  const data = await r.json();
  if (!data.ok) throw new Error('clear failed');
});

// ====== DEBUGGER ======
console.log('\n--- Debugger Tests ---\n');

let debugSessionId = '';

await test('Debugger: Start session', async () => {
  const r = await fetch_api('/api/v1/ide/debug/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'let x = 5; console.log(x);',
      language: 'javascript'
    })
  });
  if (!r.sessionId) throw new Error('no sessionId');
  debugSessionId = r.sessionId;
});

await test('Debugger: Add breakpoint', async () => {
  if (!debugSessionId) throw new Error('no session');
  const r = await fetch_api('/api/v1/ide/debug/breakpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: debugSessionId,
      lineNumber: 1
    })
  });
  if (!r.ok) throw new Error('breakpoint failed');
});

await test('Debugger: Get debug state', async () => {
  if (!debugSessionId) throw new Error('no session');
  const r = await fetch_api(`/api/v1/ide/debug/state/${debugSessionId}`);
  if (r.breakpoints === undefined) throw new Error('no breakpoints');
});

await test('Debugger: Step next', async () => {
  if (!debugSessionId) throw new Error('no session');
  const r = await fetch_api('/api/v1/ide/debug/step-next', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: debugSessionId })
  });
  if (r.line === undefined) throw new Error('no line number');
});

// ====== PROJECT MANAGER ======
console.log('\n--- Project Manager Tests ---\n');

let projectId = 'test-project-' + Date.now();

await test('Projects: Create project', async () => {
  const r = await fetch_api('/api/v1/ide/projects/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: projectId,
      projectName: 'Test Project'
    })
  });
  if (!r.project.id) throw new Error('no project id');
});

await test('Projects: Add file', async () => {
  const r = await fetch_api(`/api/v1/ide/projects/${projectId}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filePath: 'src/main.js',
      content: 'console.log("Hello");',
      language: 'javascript'
    })
  });
  if (!r.file) throw new Error('file not added');
});

await test('Projects: Get file', async () => {
  const r = await fetch_api(`/api/v1/ide/projects/${projectId}/files/src/main.js`);
  if (!r.file) throw new Error('no file');
  if (r.file.content !== 'console.log("Hello");') throw new Error('wrong content');
});

await test('Projects: Update file', async () => {
  const r = await fetch_api(`/api/v1/ide/projects/${projectId}/files/src/main.js`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'console.log("Updated");'
    })
  });
  if (!r.ok) throw new Error('update failed');
});

await test('Projects: Open file', async () => {
  const r = await fetch_api(`/api/v1/ide/projects/${projectId}/open-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath: 'src/main.js' })
  });
  if (!r.file) throw new Error('open failed');
});

await test('Projects: Get file tree', async () => {
  const r = await fetch_api(`/api/v1/ide/projects/${projectId}/tree`);
  if (!r.tree) throw new Error('no tree');
  if (r.tree.type !== 'folder') throw new Error('not folder');
});

await test('Projects: Get open files', async () => {
  const r = await fetch_api(`/api/v1/ide/projects/${projectId}/open-files`);
  if (!Array.isArray(r.openFiles)) throw new Error('not array');
});

await test('Projects: Get project summary', async () => {
  const r = await fetch_api(`/api/v1/ide/projects/${projectId}/summary`);
  if (!r.summary.fileCount) throw new Error('no file count');
});

await test('Projects: List projects', async () => {
  const r = await fetch_api('/api/v1/ide/projects');
  if (!Array.isArray(r.projects)) throw new Error('not array');
});

// ====== SUMMARY ======
console.log('\n========== TEST SUMMARY ==========\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n✓ All enhancements tests passed!');
} else {
  console.log(`\n✗ ${failed} tests failed`);
}

console.log('\n' + '='.repeat(35) + '\n');
