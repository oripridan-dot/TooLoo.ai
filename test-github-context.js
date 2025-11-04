#!/usr/bin/env node
// Quick test: Verify GitHub context server can access your repo

import fetch from 'node-fetch';

async function testGitHub() {
  const baseUrl = 'http://127.0.0.1:3020';
  
  console.log('\n🧪 Testing GitHub Context Server\n');
  console.log(`Base URL: ${baseUrl}\n`);

  // Test 1: Health check
  try {
    const res = await fetch(`${baseUrl}/health`);
    const data = await res.json();
    console.log('✓ Health check:', data);
    if (!data.configured) {
      console.log('⚠️  GitHub not configured. Set GITHUB_TOKEN and GITHUB_REPO in .env\n');
      return;
    }
  } catch (e) {
    console.log('✗ Health check failed:', e.message);
    console.log('   Make sure github-context-server is running on port 3020\n');
    return;
  }

  // Test 2: Repo info
  try {
    const res = await fetch(`${baseUrl}/api/v1/github/info`);
    const data = await res.json();
    console.log('✓ Repo info:', {
      name: data.info?.name,
      description: data.info?.description?.substring(0, 80) + '...',
      stars: data.info?.stars,
      language: data.info?.language
    });
  } catch (e) {
    console.log('✗ Repo info failed:', e.message);
  }

  // Test 3: README
  try {
    const res = await fetch(`${baseUrl}/api/v1/github/readme`);
    const data = await res.json();
    console.log('✓ README:', {
      fetched: !!data.readme,
      length: data.readme?.length || 0,
      preview: data.readme?.substring(0, 60)
    });
  } catch (e) {
    console.log('✗ README failed:', e.message);
  }

  // Test 4: Recent issues
  try {
    const res = await fetch(`${baseUrl}/api/v1/github/issues?limit=3`);
    const data = await res.json();
    console.log('✓ Recent issues:', {
      count: data.issues?.length || 0,
      titles: data.issues?.slice(0, 3).map(i => i.title) || []
    });
  } catch (e) {
    console.log('✗ Recent issues failed:', e.message);
  }

  // Test 5: Repo structure
  try {
    const res = await fetch(`${baseUrl}/api/v1/github/structure?recursive=false`);
    const data = await res.json();
    console.log('✓ Repo structure:', {
      fetched: !!data.structure,
      topLevelItems: data.structure?.slice(0, 5).map(i => i.path) || []
    });
  } catch (e) {
    console.log('✗ Repo structure failed:', e.message);
  }

  // Test 6: Full context
  try {
    const res = await fetch(`${baseUrl}/api/v1/github/context`);
    const data = await res.json();
    console.log('✓ Full context:', {
      fetched: !!data.context,
      length: data.context?.length || 0,
      preview: data.context?.substring(0, 100)
    });
  } catch (e) {
    console.log('✗ Full context failed:', e.message);
  }

  console.log('\n✅ GitHub Context Server test complete\n');
}

testGitHub().catch(console.error);
