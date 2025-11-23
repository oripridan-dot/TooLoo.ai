/**
 * QA Monitor & Alerting System
 * Runs health checks and tests, then alerts on failure.
 * Usage: node scripts/qa-monitor.js [--notify]
 */

import http from 'http';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const WEB_PORT = 3000;

async function checkHealth() {
  console.log('🏥 Starting QA Health Check...');
  const results = {
    services: {},
    tests: {},
    timestamp: new Date().toISOString()
  };

  // 1. Check Web Server & Orchestrator
  try {
    const health = await fetchJson(`http://127.0.0.1:${WEB_PORT}/health`);
    results.services.web = health.status === 'ok' ? 'PASS' : 'FAIL';
  } catch (e) {
    results.services.web = `FAIL (${e.message})`;
  }

  // 2. Check System Awareness
  try {
    const awareness = await fetchJson(`http://127.0.0.1:${WEB_PORT}/api/v1/system/awareness`);
    results.services.awareness = awareness.ok ? 'PASS' : 'FAIL';
  } catch (e) {
    results.services.awareness = `FAIL (${e.message})`;
  }

  // 3. Run Self-Capabilities Test (Fast subset)
  console.log('🧪 Running Capability Tests...');
  try {
    // We run a lightweight check here
    // Note: --smoke flag is hypothetical, assuming the test script runs fast enough or we just run it
    const { stdout } = await execAsync('node scripts/test-self-capabilities.js');
    results.tests.capabilities = 'PASS';
  } catch (e) {
    results.tests.capabilities = 'FAIL';
    results.tests.error = e.message.split('\n')[0];
  }

  // Report
  console.table(results.services);
  console.table(results.tests);

  const failures = [
    ...Object.entries(results.services).filter(([k,v]) => v.startsWith('FAIL')),
    ...Object.entries(results.tests).filter(([k,v]) => v.startsWith('FAIL'))
  ];

  if (failures.length > 0) {
    console.error('❌ QA Check FAILED');
    if (process.argv.includes('--notify')) {
      await sendNotification(failures);
    }
    process.exit(1);
  } else {
    console.log('✅ QA Check PASSED');
    process.exit(0);
  }
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { 
          if (res.statusCode >= 400) throw new Error(`Status ${res.statusCode}`);
          resolve(JSON.parse(data)); 
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function sendNotification(failures) {
  console.log('🔔 Sending Notification (Simulated)...');
  // In a real app, this would POST to Slack/Discord webhook
  const message = `🚨 TooLoo QA Alert: ${failures.length} failures detected.\n${failures.map(f => `- ${f[0]}: ${f[1]}`).join('\n')}`;
  console.log(`[SLACK MOCK] ${message}`);
}

checkHealth();
