#!/usr/bin/env node

/**
 * Test script for hot-reload functionality
 * Monitors the admin endpoints to verify hot-reload is working
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:3000';
const ADMIN_ENDPOINTS = [
  '/api/v1/admin/hot-reload-status',
  '/api/v1/admin/endpoints',
  '/api/v1/admin/update-history'
];

async function testAdminEndpoints() {
  console.log('\n📋 Testing Admin Endpoints\n');
  console.log('═'.repeat(60));

  for (const endpoint of ADMIN_ENDPOINTS) {
    try {
      console.log(`\n📌 GET ${endpoint}`);
      const response = await fetch(`${BASE_URL}${endpoint}`);
      const data = await response.json();
      
      if (!data.ok) {
        console.error('❌ Error:', data.error);
        continue;
      }

      console.log(`✅ Status: ${response.status}`);
      
      // Pretty print JSON response
      console.log(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`❌ Failed to fetch ${endpoint}:`, error.message);
    }
  }
}

async function testHotReload() {
  console.log('\n\n🔄 Testing Manual Hot-Reload\n');
  console.log('═'.repeat(60));

  try {
    console.log('\n🔄 POST /api/v1/admin/hot-reload');
    const response = await fetch(`${BASE_URL}/api/v1/admin/hot-reload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    
    if (!data.ok) {
      console.error('❌ Error:', data.error);
      return;
    }

    console.log(`✅ Status: ${response.status}`);
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Failed to trigger hot-reload:', error.message);
  }
}

async function testSystemAwareness() {
  console.log('\n\n🧠 Testing System Self-Awareness\n');
  console.log('═'.repeat(60));

  try {
    const response = await fetch(`${BASE_URL}/api/v1/system/awareness`);
    const data = await response.json();
    
    if (!data.ok) {
      console.error('❌ Error:', data.error);
      return;
    }

    console.log('\n✅ System Capabilities:');
    const capabilities = data.capabilities || {};
    for (const [key, value] of Object.entries(capabilities)) {
      const status = value === true || value.enabled === true ? '✅' : '❌';
      console.log(`  ${status} ${key}`);
    }

    console.log('\n📊 System Status:');
    console.log(`  Service: ${data.service}`);
    console.log(`  Uptime: ${data.uptime}s`);
    console.log(`  Processes: ${data.processes?.length || 0}`);
  } catch (error) {
    console.error('❌ Failed to fetch system awareness:', error.message);
  }
}

async function main() {
  console.log('\n🚀 TooLoo.ai Admin API Test Suite\n');
  console.log('═'.repeat(60));

  // Test connectivity
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (!response.ok) {
      console.error('\n❌ Server is not healthy. Status:', response.status);
      process.exit(1);
    }
    console.log('\n✅ Web-server is healthy');
  } catch (error) {
    console.error('\n❌ Cannot connect to web-server:', error.message);
    console.log('   Make sure to start the server: npm run dev');
    process.exit(1);
  }

  // Run all tests
  await testAdminEndpoints();
  await testHotReload();
  await testSystemAwareness();

  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ All tests completed!\n');
}

main().catch(console.error);
