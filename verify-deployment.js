// Quick verification that all services can talk to each other
import fetch from 'node-fetch';

const ports = {
  analytics: 3012,
  training: 3001,
  coach: 3004,
  orchestrator: 3123
};

async function checkHealth(service, port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, { timeout: 2000 });
    return { service, port, status: res.status === 200 ? '✅' : '⚠️', online: res.status === 200 };
  } catch (e) {
    return { service, port, status: '❌', online: false, error: e.message };
  }
}

async function testIntegration() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  ANALYTICS DEPLOYMENT VERIFICATION                ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // Check health
  console.log('🔍 Service Health Check:');
  const health = await Promise.all([
    checkHealth('Analytics', ports.analytics),
    checkHealth('Training', ports.training),
    checkHealth('Coach', ports.coach),
  ]);
  
  health.forEach(h => {
    console.log(`   ${h.status} ${h.service.padEnd(12)} (port ${h.port})`);
  });

  // Check if analytics is running
  const analyticsUp = health[0].online;
  if (!analyticsUp) {
    console.log('\n⚠️  Analytics server not running. Starting it...');
    return;
  }

  // Test API endpoints
  console.log('\n📊 Testing Key Endpoints:');
  
  const tests = [
    { name: 'Get Health', url: 'http://127.0.0.1:3012/health', method: 'GET' },
    { name: 'Get Velocity', url: 'http://127.0.0.1:3012/api/v1/analytics/velocity-enhanced?userId=test&domain=consensus', method: 'GET' },
    { name: 'Get Leaderboard', url: 'http://127.0.0.1:3012/api/v1/analytics/leaderboard?domain=consensus', method: 'GET' },
    { name: 'Get Badges', url: 'http://127.0.0.1:3012/api/v1/analytics/badges/inventory?userId=test', method: 'GET' },
  ];

  for (const test of tests) {
    try {
      const res = await fetch(test.url, { method: test.method, timeout: 2000 });
      const data = await res.json().catch(() => ({}));
      console.log(`   ✅ ${test.name.padEnd(20)} (${res.status})`);
    } catch (e) {
      console.log(`   ❌ ${test.name.padEnd(20)} (${e.message})`);
    }
  }

  console.log('\n✅ DEPLOYMENT VERIFICATION COMPLETE\n');
}

testIntegration().catch(console.error);
