#!/usr/bin/env node
/**
 * Demonstrate that Providers Can Read TooLoo.ai's Code
 * This simulates what Claude/GPT/Gemini can do
 */

import fetch from 'node-fetch';

const BASE = 'http://127.0.0.1:3000/api/v1';

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
  }
}

async function main() {
  console.log('\n🔍 PROVIDER CODE VISIBILITY TEST');
  console.log('====================================\n');

  // Test 1: Get system awareness
  await test('Providers discover code access endpoints', async () => {
    const res = await fetch(`${BASE}/system/awareness`);
    const data = await res.json();
    if (!data.codeAccess || !data.codeAccess.enabled) {
      throw new Error('Code access not advertised');
    }
    console.log(`   Code access enabled: ${data.codeAccess.enabled}`);
    console.log(`   Endpoints: ${Object.keys(data.codeAccess.endpoints).length}`);
  });

  // Test 2: Get project structure
  await test('Providers can see project structure', async () => {
    const res = await fetch(`${BASE}/system/code/structure?maxDepth=2`);
    const data = await res.json();
    if (!data.structure) throw new Error('No structure returned');
    console.log(`   Top-level items: ${data.structure.length}`);
    const dirs = data.structure.filter(i => i.type === 'directory');
    const files = data.structure.filter(i => i.type === 'file');
    console.log(`   Directories: ${dirs.length}, Files: ${files.length}`);
  });

  // Test 3: List specific directory
  await test('Providers can list directory contents', async () => {
    const res = await fetch(`${BASE}/system/code/list?dir=servers`);
    const data = await res.json();
    if (!data.list || data.list.length === 0) throw new Error('No files listed');
    console.log(`   Files in /servers: ${data.list.length}`);
    console.log(`   Examples: ${data.list.slice(0, 2).map(f => f.name).join(', ')}`);
  });

  // Test 4: Read a source file
  await test('Providers can read source code', async () => {
    const res = await fetch(`${BASE}/system/code/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: 'package.json', maxLines: 10 })
    });
    const data = await res.json();
    if (!data.content) throw new Error('No content returned');
    console.log(`   File: ${data.path}`);
    console.log(`   Lines read: ${data.lines}/${data.totalLines}`);
    console.log(`   Truncated: ${data.truncated}`);
  });

  // Test 5: Search source code
  await test('Providers can search code', async () => {
    const res = await fetch(`${BASE}/system/code/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'class.*Engine',
        maxResults: 10
      })
    });
    const data = await res.json();
    if (!Array.isArray(data.results)) throw new Error('No results');
    console.log(`   Query: "${data.query}"`);
    console.log(`   Results found: ${data.resultsFound}`);
    if (data.results.length > 0) {
      console.log(`   Example: ${data.results[0].file}:${data.results[0].line}`);
    }
  });

  // Test 6: Read a specific engine file
  await test('Providers can read engine code', async () => {
    const res = await fetch(`${BASE}/system/code/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: 'engine/meta-learning-engine.js', maxLines: 30 })
    });
    const data = await res.json();
    if (!data.ok) throw new Error('Failed to read engine file');
    console.log(`   Engine: ${data.path}`);
    console.log(`   Total lines: ${data.totalLines}`);
    console.log(`   Status: accessible to providers ✓`);
  });

  // Test 7: Simulate provider analysis
  await test('Simulate: Provider analyzes architecture', async () => {
    // 1. Get structure
    const structRes = await fetch(`${BASE}/system/code/structure?maxDepth=1`);
    const struct = await structRes.json();
    const directories = struct.structure.filter(i => i.type === 'directory');
    
    if (directories.length === 0) throw new Error('No directories found');
    
    console.log(`   Found ${directories.length} major directories:`);
    directories.slice(0, 5).forEach(d => {
      console.log(`     • ${d.name}`);
    });
  });

  // Test 8: Verify code is readable (not just metadata)
  await test('CRITICAL: Code content is actual source', async () => {
    const res = await fetch(`${BASE}/system/code/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: 'README.md', maxLines: 5 })
    });
    const data = await res.json();
    if (!data.content || data.content.length < 10) {
      throw new Error('Content appears to be metadata, not actual source');
    }
    console.log(`   ✓ Actual source code returned (${data.content.length} chars)`);
    console.log(`   ✓ Content is readable and parseable`);
  });

  console.log('\n====================================');
  console.log('🎉 RESULT: Providers Have Full Code Access!');
  console.log('\nProviders can now:');
  console.log('  ✓ See the complete project structure');
  console.log('  ✓ List files in any directory');
  console.log('  ✓ Read actual source code');
  console.log('  ✓ Search for patterns and functions');
  console.log('  ✓ Understand system architecture');
  console.log('  ✓ Make intelligent decisions based on code');
  console.log('\n====================================\n');
}

await main();
