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
  const r = await fetch(`${BASE_URL}${path}`, { ...opts });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

console.log('Starting Phase 3 Integration Tests\n');

// Sprint 1: Format conversion
await test('Format: Convert JSON', async () => {
  const r = await fetch_api('/api/v1/responses/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'json', content: '{"a":1}' })
  });
  if (!r.ok) throw new Error('conversion failed');
  if (r.format !== 'json') throw new Error('wrong format');
});

await test('Format: Convert to CSV', async () => {
  const r = await fetch_api('/api/v1/responses/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'csv', content: '[{"a":1,"b":2}]' })
  });
  if (!r.ok) throw new Error('csv conversion failed');
  if (!r.text.includes('a,b')) throw new Error('csv malformed');
});

await test('Format: Convert to Code', async () => {
  const r = await fetch_api('/api/v1/responses/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'code', content: 'console.log("hi")' })
  });
  if (!r.ok) throw new Error('code conversion failed');
  if (!r.text.includes('```')) throw new Error('code not fenced');
});

// Sprint 2: Integrations
await test('Integrations: Save token', async () => {
  const r = await fetch_api('/api/v1/integrations/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'test-user',
      serviceName: 'github',
      token: 'ghp_test123'
    })
  });
  if (!r.ok) throw new Error('token save failed');
});

await test('Integrations: List integrations', async () => {
  const r = await fetch_api('/api/v1/integrations/list?userId=test-user');
  if (!r.ok) throw new Error('list failed');
  if (!Array.isArray(r.integrations)) throw new Error('not an array');
});

// Sprint 3: Domains - Coding
await test('Domains: Analyze code', async () => {
  const r = await fetch_api('/api/v1/domains/coding/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'console.log("test");' })
  });
  if (!r.ok) throw new Error('analysis failed');
  if (!r.language) throw new Error('language not detected');
});

await test('Domains: Generate tests', async () => {
  const r = await fetch_api('/api/v1/domains/coding/tests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'function add(a,b) { return a+b; }', language: 'javascript' })
  });
  if (!r.ok) throw new Error('test generation failed');
  if (!r.tests) throw new Error('no tests');
});

// Sprint 3: Domains - Research
await test('Domains: Analyze research text', async () => {
  const r = await fetch_api('/api/v1/domains/research/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'This is a research paper about AI. (Smith, 2020)' })
  });
  if (!r.ok) throw new Error('research analysis failed');
  if (r.claims.length === 0) throw new Error('no claims extracted');
});

// Sprint 3: Domains - Data
await test('Domains: Analyze data', async () => {
  const r = await fetch_api('/api/v1/domains/data/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [{ name: 'Alice', score: 95 }, { name: 'Bob', score: 87 }] })
  });
  if (!r.ok) throw new Error('data analysis failed');
  if (r.rows !== 2) throw new Error('row count wrong');
});

// Sprint 3: Domains - Writing
await test('Domains: Analyze writing', async () => {
  const r = await fetch_api('/api/v1/domains/writing/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'This is a test sentence. This is another one!' })
  });
  if (!r.ok) throw new Error('writing analysis failed');
  if (!r.tone) throw new Error('tone not detected');
});

// Sprint 4: IDE
await test('IDE: Execute JavaScript', async () => {
  const r = await fetch_api('/api/v1/ide/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'console.log("test");', language: 'javascript' })
  });
  if (!r.ok) throw new Error('execution failed');
});

await test('IDE: Analyze with IDE', async () => {
  const r = await fetch_api('/api/v1/ide/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'const x = 42;' })
  });
  if (!r.ok) throw new Error('ide analysis failed');
});

console.log('\n=== TEST SUMMARY ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);
if (failed === 0) {
  console.log('✓ All tests passed!');
  process.exit(0);
} else {
  console.log('✗ Some tests failed');
  process.exit(1);
}
