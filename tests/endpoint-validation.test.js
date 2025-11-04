/**
 * Endpoint Validation Tests
 * Tests orchestrator metrics and product analysis endpoints with real requests
 */

import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:3000';

async function testEndpoint(method, path, body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${BASE_URL}${path}`, options);
    const text = await res.text();
    let data = {};
    
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return {
      status: res.status,
      data,
      ok: res.status >= 200 && res.status < 300
    };
  } catch (err) {
    return {
      status: 0,
      error: err.message,
      ok: false
    };
  }
}

async function runTests() {
  console.log('\n🧪 ENDPOINT VALIDATION TESTS\n');
  console.log(`Target: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;
  const results = [];

  // ===== ORCHESTRATOR METRICS ENDPOINTS =====
  console.log('📊 Orchestrator Metrics Endpoints\n');

  // Test 1: GET /api/v1/system/metrics
  console.log('Test 1: GET /api/v1/system/metrics');
  const metricsRes = await testEndpoint('GET', '/api/v1/system/metrics');
  if (metricsRes.ok) {
    const { data } = metricsRes;
    assert(data.timestamp, 'Should have timestamp');
    assert(data.process || data.processMetrics, 'Should have process metrics');
    assert(data.system || data.systemMetrics, 'Should have system metrics');
    console.log('✅ PASS - Metrics endpoint working');
    console.log(`   Timestamp: ${data.timestamp}`);
    if (data.process) {
      console.log(`   Process: PID ${data.process.pid} | Heap ${data.process.memory?.heapUsed}MB`);
    }
    if (data.system) {
      console.log(`   System: ${data.system.memory?.utilization} memory | Load: ${data.system.load?.['1min']}`);
    }
    console.log();
    passed++;
  } else {
    console.log(`❌ FAIL - ${metricsRes.error || `Status ${metricsRes.status}`}`);
    console.log();
    failed++;
  }
  results.push({ test: 'GET /api/v1/system/metrics', status: metricsRes.ok });

  // Test 2: GET /api/v1/system/processes
  console.log('Test 2: GET /api/v1/system/processes');
  const processesRes = await testEndpoint('GET', '/api/v1/system/processes');
  if (processesRes.ok) {
    const { data } = processesRes;
    assert(data.ok || data.processes, 'Should have processes data');
    console.log('✅ PASS - Processes endpoint working');
    const procCount = data.processes ? data.processes.length : (data.orchestrator ? 1 : 0);
    console.log(`   Monitoring ${procCount} services`);
    console.log();
    passed++;
  } else {
    console.log(`❌ FAIL - ${processesRes.error || `Status ${processesRes.status}`}`);
    console.log();
    failed++;
  }
  results.push({ test: 'GET /api/v1/system/processes', status: processesRes.ok });

  // ===== PRODUCT DEVELOPMENT ENDPOINTS =====
  console.log('🚀 Product Development Endpoints\n');

  // Test 3: POST /api/v1/showcase/generate-ideas
  console.log('Test 3: POST /api/v1/showcase/generate-ideas');
  const ideasRes = await testEndpoint('POST', '/api/v1/showcase/generate-ideas', {
    category: 'mobile-apps',
    context: 'Educational technology'
  });
  if (ideasRes.ok || ideasRes.status === 200) {
    const { data } = ideasRes;
    console.log('✅ PASS - Generate ideas endpoint responding');
    if (data.ideas) {
      console.log(`   Generated ${data.ideas.length} ideas`);
      if (data.ideas[0]) {
        console.log(`   Example: ${data.ideas[0].title || data.ideas[0]}`);
      }
    }
    if (data.status === 'success' || data.ideas) {
      console.log(`   Provider: ${data.provider || 'multi-provider consensus'}`);
    }
    console.log();
    passed++;
  } else {
    console.log(`⚠️  Endpoint ready but returned status ${ideasRes.status}`);
    if (ideasRes.error) console.log(`   Error: ${ideasRes.error}`);
    console.log();
    failed++;
  }
  results.push({ test: 'POST /api/v1/showcase/generate-ideas', status: ideasRes.ok });

  // Test 4: POST /api/v1/showcase/critique-ideas
  console.log('Test 4: POST /api/v1/showcase/critique-ideas');
  const critiqueRes = await testEndpoint('POST', '/api/v1/showcase/critique-ideas', {
    ideas: ['Mobile app for real-time language learning', 'AR-based educational game']
  });
  if (critiqueRes.ok || critiqueRes.status === 200) {
    const { data } = critiqueRes;
    console.log('✅ PASS - Critique ideas endpoint responding');
    if (data.critiques) {
      console.log(`   Critiques: ${Object.keys(data.critiques).length} ideas analyzed`);
    }
    if (data.consensus) {
      console.log('   Consensus scores available');
    }
    console.log();
    passed++;
  } else {
    console.log(`⚠️  Endpoint ready but returned status ${critiqueRes.status}`);
    if (critiqueRes.error) console.log(`   Error: ${critiqueRes.error}`);
    console.log();
    failed++;
  }
  results.push({ test: 'POST /api/v1/showcase/critique-ideas', status: critiqueRes.ok });

  // Test 5: POST /api/v1/showcase/select-best
  console.log('Test 5: POST /api/v1/showcase/select-best');
  const selectRes = await testEndpoint('POST', '/api/v1/showcase/select-best', {
    ideas: ['Idea 1', 'Idea 2', 'Idea 3'],
    count: 2
  });
  if (selectRes.ok || selectRes.status === 200) {
    const { data } = selectRes;
    console.log('✅ PASS - Select best endpoint responding');
    if (data.selected) {
      console.log(`   Selected ${data.selected.length} top ideas`);
    }
    if (data.scores) {
      console.log(`   Scores: ${JSON.stringify(data.scores).substring(0, 50)}...`);
    }
    console.log();
    passed++;
  } else {
    console.log(`⚠️  Endpoint ready but returned status ${selectRes.status}`);
    if (selectRes.error) console.log(`   Error: ${selectRes.error}`);
    console.log();
    failed++;
  }
  results.push({ test: 'POST /api/v1/showcase/select-best', status: selectRes.ok });

  // ===== SUMMARY =====
  console.log('📋 SUMMARY\n');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${passed + failed}\n`);

  if (failed === 0) {
    console.log('🎉 ALL ENDPOINTS VALIDATED!\n');
    console.log('Next steps:');
    console.log('  1. Deploy metrics endpoints to production');
    console.log('  2. Monitor provider performance');
    console.log('  3. Start Issue #18 (Semantic Segmentation)');
    console.log('  4. Start Issue #19 (Reports Analytics)');
    console.log('  5. Start Issue #20 (Capabilities Activation)\n');
  } else {
    console.log('⚠️  Some endpoints need attention\n');
    console.log('Start web server: npm run dev');
    console.log('Then run this test again\n');
  }

  results.forEach((r, i) => {
    const status = r.status ? '✅' : '❌';
    console.log(`${status} ${i + 1}. ${r.test}`);
  });
  console.log();
}

runTests().catch(console.error);
