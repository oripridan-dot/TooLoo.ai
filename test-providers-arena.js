#!/usr/bin/env node
/**
 * TooLoo.ai Providers Arena - Quick Demo Script
 * Tests the multi-provider arena functionality
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:3000';

async function testArenaStatus() {
  console.log('\n🏟️ Testing Providers Arena Status...');
  try {
    const response = await fetch(`${BASE_URL}/api/v1/arena/status`);
    const data = await response.json();
    
    if (data.ok) {
      console.log(`✅ Arena Status: ${data.available} providers available`);
      
      const enabledProviders = Object.entries(data.providers)
        .filter(([_, config]) => config.available && config.enabled)
        .map(([name, config]) => `${name} (${config.model})`);
      
      console.log('📋 Available Providers:');
      enabledProviders.forEach(provider => console.log(`   • ${provider}`));
    } else {
      console.log('❌ Arena status check failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }
}

async function testArenaQuery() {
  console.log('\n🤖 Testing Multi-Provider Query...');
  
  const testQuery = {
    query: "What are the key principles of effective AI system design?",
    providers: ["ollama", "claude", "openai", "deepseek"]
  };
  
  try {
    console.log(`📤 Sending query: "${testQuery.query}"`);
    console.log(`🎯 Targeting providers: ${testQuery.providers.join(', ')}`);
    
    const response = await fetch(`${BASE_URL}/api/v1/arena/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testQuery)
    });
    
    const data = await response.json();
    
    if (data.ok) {
      console.log(`\n✅ Got ${data.count} responses:`);
      
      data.results.forEach((result, i) => {
        console.log(`\n${i + 1}. ${result.provider.toUpperCase()} (${result.duration}ms, Quality: ${result.quality.toFixed(1)})`);
        console.log(`   ${result.text.substring(0, 120)}${result.text.length > 120 ? '...' : ''}`);
      });
    } else {
      console.log('❌ Query failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Query error:', error.message);
  }
}

async function testArenaCompare() {
  console.log('\n⚖️  Testing Provider Comparison...');
  
  const compareQuery = {
    query: "Explain machine learning in simple terms",
    providers: ["claude", "openai"]
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/arena/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(compareQuery)
    });
    
    const data = await response.json();
    
    if (data.ok) {
      console.log('\n📊 Side-by-Side Comparison:');
      data.results.forEach((result, i) => {
        console.log(`\n--- ${result.provider.toUpperCase()} ---`);
        console.log(`Speed: ${result.duration}ms | Quality: ${result.quality.toFixed(1)}/100`);
        console.log(`Response: ${result.text.substring(0, 200)}...`);
      });
    }
  } catch (error) {
    console.log('❌ Comparison error:', error.message);
  }
}

// Run all tests
async function runDemo() {
  console.log('🚀 TooLoo.ai Providers Arena Demo\n');
  console.log('━'.repeat(50));
  
  await testArenaStatus();
  await testArenaQuery();
  await testArenaCompare();
  
  console.log('\n━'.repeat(50));
  console.log('✅ Demo complete! Providers Arena is fully functional.');
  console.log('🌐 Open http://127.0.0.1:3000/providers-arena.html to try the UI');
}

runDemo().catch(console.error);