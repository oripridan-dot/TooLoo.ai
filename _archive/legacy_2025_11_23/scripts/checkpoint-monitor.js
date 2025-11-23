#!/usr/bin/env node

/**
 * Checkpoint Monitoring Dashboard
 * Tracks staging health every 4 hours for Phase 1 validation (Nov 17-19)
 * 
 * Checkpoints:
 * 3: Nov 17, 16:30 UTC ✅
 * 4: Nov 17, 20:30 UTC
 * 5: Nov 18, 00:30 UTC
 * 6: Nov 18, 08:30 UTC
 * 7: Nov 19, 12:30 UTC (DECISION POINT)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://127.0.0.1:3000';
const CHECKPOINT_FILE = path.join(__dirname, '../.checkpoint-results.json');

const ENDPOINTS = [
  { name: 'Knowledge Sources', url: '/api/v1/knowledge/sources', type: 'GET' },
  { name: 'Knowledge Memory Patterns', url: '/api/v1/knowledge/memory/patterns', type: 'GET' },
  { name: 'Tier1 Status', url: '/api/v1/knowledge/status', type: 'GET' },
  { name: 'GitHub Health', url: '/api/v1/github/health', type: 'GET' },
  { name: 'Server Health', url: '/health', type: 'GET' },
];

const CHECKPOINT_SCHEDULE = [
  { num: 3, date: 'Nov 17', time: '16:30 UTC', status: '✅ PASSED' },
  { num: 4, date: 'Nov 17', time: '20:30 UTC', status: '⏳ PENDING' },
  { num: 5, date: 'Nov 18', time: '00:30 UTC', status: '⏳ PENDING' },
  { num: 6, date: 'Nov 18', time: '08:30 UTC', status: '⏳ PENDING' },
  { num: 7, date: 'Nov 19', time: '12:30 UTC', status: '⏳ PENDING (DECISION)' },
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const makeRequest = (method) => {
      const url = new URL(`${BASE_URL}${endpoint.url}`);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        timeout: 5000
      };
      
      if (method === 'POST') {
        options.headers = { 'Content-Type': 'application/json' };
      }
      
      const request = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const duration = Date.now() - startTime;
          resolve({
            name: endpoint.name,
            url: endpoint.url,
            status: res.statusCode,
            duration: duration,
            success: res.statusCode === 200 || res.statusCode === 201
          });
        });
      });
      
      request.on('error', (err) => {
        const duration = Date.now() - startTime;
        resolve({
          name: endpoint.name,
          url: endpoint.url,
          status: 'ERROR',
          duration: duration,
          error: err.message,
          success: false
        });
      });
      
      request.on('timeout', () => {
        request.destroy();
        const duration = Date.now() - startTime;
        resolve({
          name: endpoint.name,
          url: endpoint.url,
          status: 'TIMEOUT',
          duration: duration,
          success: false
        });
      });
      
      if (method === 'POST') {
        request.write(JSON.stringify({ test: true }));
      }
      request.end();
    };
    
    makeRequest(endpoint.type);
  });
}

async function runCheckpoint(checkpointNum) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 CHECKPOINT ${checkpointNum} — ${new Date().toISOString()}`);
  console.log(`${'='.repeat(80)}\n`);
  
  const results = [];
  let healthyCount = 0;
  let totalDuration = 0;
  
  for (const endpoint of ENDPOINTS) {
    process.stdout.write(`  Testing ${endpoint.name}... `);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    if (result.success) {
      healthyCount++;
      console.log(`✅ ${result.status} (${result.duration}ms)`);
    } else {
      console.log(`❌ ${result.status} (${result.duration}ms)`);
      if (result.error) console.log(`     Error: ${result.error}`);
    }
    
    totalDuration += result.duration;
  }
  
  const avgDuration = Math.round(totalDuration / ENDPOINTS.length);
  const passRate = Math.round((healthyCount / ENDPOINTS.length) * 100);
  
  console.log('\n  Summary:');
  console.log(`    • Healthy: ${healthyCount}/${ENDPOINTS.length}`);
  console.log(`    • Pass Rate: ${passRate}%`);
  console.log(`    • Avg Response: ${avgDuration}ms`);
  console.log(`    • Decision: ${passRate === 100 ? '✅ PASSED' : '❌ NEEDS INVESTIGATION'}`);
  
  const checkpointResult = {
    checkpoint: checkpointNum,
    timestamp: new Date().toISOString(),
    results: results,
    summary: {
      healthy: healthyCount,
      total: ENDPOINTS.length,
      passRate: passRate,
      avgDuration: avgDuration,
      passed: passRate === 100
    }
  };
  
  // Save results
  let allResults = [];
  if (fs.existsSync(CHECKPOINT_FILE)) {
    allResults = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
  }
  allResults.push(checkpointResult);
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(allResults, null, 2));
  
  return checkpointResult;
}

async function printSchedule() {
  console.log('\n📋 CHECKPOINT SCHEDULE (Phase 1 Monitoring)\n');
  console.log('Checkpoint | Date          | Time         | Status');
  console.log('-'.repeat(60));
  
  for (const cp of CHECKPOINT_SCHEDULE) {
    console.log(`   ${cp.num}      | ${cp.date.padEnd(13)} | ${cp.time.padEnd(12)} | ${cp.status}`);
  }
  
  console.log('\n⚠️  Checkpoint 7 (Nov 19, 12:30 UTC) is the DECISION POINT');
  console.log('   → If all 7 pass: APPROVE FOR PRODUCTION');
  console.log('   → If any fail: Investigate + extend monitoring\n');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--schedule')) {
    await printSchedule();
    return;
  }
  
  const checkpointNum = parseInt(args[0]) || 4;
  
  if (checkpointNum < 1 || checkpointNum > 7) {
    console.error('Invalid checkpoint number. Must be 1-7');
    process.exit(1);
  }
  
  try {
    await runCheckpoint(checkpointNum);
  } catch (error) {
    console.error('❌ Checkpoint failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
