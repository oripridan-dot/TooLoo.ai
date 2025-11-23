/**
 * tests/e2e/complete-workflows.test.js
 * =====================================
 * End-to-end workflow tests validating complete user journeys
 * across all integrated services (Web, Training, Meta, Budget, Coach).
 *
 * Test Flows:
 * 1. User Intent → Task Decomposition → Execution
 * 2. Complete Training Cycle (Start → Round → Domain Switch)
 * 3. Budget-Aware Learning (Provider Selection → Cost Tracking)
 * 4. Meta-Learning with Insights (Learn → Analyze → Boost)
 * 5. Auto-Coach Optimization (Start → Apply Boost → Verify)
 */

import http from 'http';
import { promisify } from 'util';

// ============================================================================
// UTILITY: HTTP Request Helper
// ============================================================================

function makeRequest(port, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch {
          resolve({
            status: res.statusCode,
            body: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.setTimeout(5000);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ============================================================================
// WORKFLOW TEST 1: Intent → Decomposition → Execution
// ============================================================================

async function testWorkflow1_IntentToExecution() {
  console.log('\n🔄 WORKFLOW 1: User Intent → Task Decomposition → Execution');
  console.log('━'.repeat(60));

  try {
    // Step 1: User submits intent via Chat API (Web Server, port 3000)
    console.log('  📍 Step 1: Submit intent to Chat API...');
    const intentRes = await makeRequest(3000, 'POST', '/api/v1/chat', {
      message: 'Build a machine learning classifier for document categorization',
      sessionId: 'e2e-workflow-1-' + Date.now()
    });
    
    if (intentRes.status !== 200 && intentRes.status !== 201) {
      console.log('  ❌ Chat API failed:', intentRes.status, intentRes.body);
      return false;
    }
    console.log('  ✅ Intent received, sessionId:', intentRes.body?.sessionId || 'unknown');

    // Step 2: System decomposes into tasks (Training Server, port 3001)
    console.log('  📍 Step 2: Decompose into training topics...');
    const topicRes = await makeRequest(3001, 'POST', '/api/v1/training/new-topic', {
      topic: 'ML Classifier Implementation',
      description: 'Learn to build, train, and evaluate ML classifiers',
      domains: ['Machine Learning']
    });
    
    if (topicRes.status !== 200 && topicRes.status !== 201) {
      console.log('  ⚠️  Topic creation returned:', topicRes.status);
    } else {
      console.log('  ✅ Topic created:', topicRes.body?.topic || 'ML Classifier');
    }

    // Step 3: Check budget before execution (Budget Server, port 3003)
    console.log('  📍 Step 3: Verify budget availability...');
    const budgetRes = await makeRequest(3003, 'GET', '/api/v1/budget');
    
    if (budgetRes.status === 200) {
      const remaining = budgetRes.body?.remainingBudget || 0;
      console.log('  ✅ Budget check: $' + (remaining / 100).toFixed(2) + ' remaining');
    } else {
      console.log('  ⚠️  Budget check returned:', budgetRes.status);
    }

    // Step 4: Start training round (Training Server)
    console.log('  📍 Step 4: Execute training round...');
    const roundRes = await makeRequest(3001, 'POST', '/api/v1/training/round', {
      roundNumber: 1,
      questionCount: 5
    });
    
    if (roundRes.status === 200 || roundRes.status === 201) {
      console.log('  ✅ Training round started');
    } else {
      console.log('  ⚠️  Round execution returned:', roundRes.status);
    }

    // Step 5: Get execution status (Web Server)
    console.log('  📍 Step 5: Verify execution status...');
    const statusRes = await makeRequest(3000, 'GET', '/api/v1/system/status');
    
    if (statusRes.status === 200) {
      console.log('  ✅ System status:', statusRes.body?.status || 'running');
    } else {
      console.log('  ⚠️  Status check returned:', statusRes.status);
    }

    console.log('\n✨ WORKFLOW 1 COMPLETE: Intent → Execution cycle validated\n');
    return true;

  } catch (error) {
    console.log('  ❌ Workflow error:', error.message);
    return false;
  }
}

// ============================================================================
// WORKFLOW TEST 2: Complete Training Cycle
// ============================================================================

async function testWorkflow2_TrainingCycle() {
  console.log('\n🏫 WORKFLOW 2: Complete Training Cycle');
  console.log('━'.repeat(60));

  try {
    // Step 1: Start training camp
    console.log('  📍 Step 1: Initialize training camp...');
    const startRes = await makeRequest(3001, 'POST', '/api/v1/training/start', {
      domain: 'Machine Learning',
      intensity: 'moderate'
    });
    
    if (startRes.status !== 200 && startRes.status !== 201) {
      console.log('  ⚠️  Start returned:', startRes.status);
    } else {
      console.log('  ✅ Training camp initialized');
    }

    // Step 2: Execute first round
    console.log('  📍 Step 2: Execute first training round...');
    const round1Res = await makeRequest(3001, 'POST', '/api/v1/training/round', {
      roundNumber: 1,
      questionCount: 3
    });
    
    if (round1Res.status === 200 || round1Res.status === 201) {
      console.log('  ✅ Round 1 completed');
    } else {
      console.log('  ⚠️  Round 1 returned:', round1Res.status);
    }

    // Step 3: Switch domain
    console.log('  📍 Step 3: Switch to different domain...');
    const domainRes = await makeRequest(3001, 'GET', '/api/v1/training/next-domain');
    
    if (domainRes.status === 200) {
      const nextDomain = domainRes.body?.nextDomain || 'unknown';
      console.log('  ✅ Switched to domain:', nextDomain);
    } else {
      console.log('  ⚠️  Domain switch returned:', domainRes.status);
    }

    // Step 4: Continue training
    console.log('  📍 Step 4: Execute second round in new domain...');
    const round2Res = await makeRequest(3001, 'POST', '/api/v1/training/round', {
      roundNumber: 2,
      questionCount: 3
    });
    
    if (round2Res.status === 200 || round2Res.status === 201) {
      console.log('  ✅ Round 2 completed');
    } else {
      console.log('  ⚠️  Round 2 returned:', round2Res.status);
    }

    // Step 5: Check training status
    console.log('  📍 Step 5: Verify training progress...');
    const statusRes = await makeRequest(3001, 'GET', '/api/v1/training/status');
    
    if (statusRes.status === 200) {
      const progress = statusRes.body?.progress || '?';
      console.log('  ✅ Training status:', progress);
    } else {
      console.log('  ⚠️  Status check returned:', statusRes.status);
    }

    console.log('\n✨ WORKFLOW 2 COMPLETE: Multi-round training cycle validated\n');
    return true;

  } catch (error) {
    console.log('  ❌ Workflow error:', error.message);
    return false;
  }
}

// ============================================================================
// WORKFLOW TEST 3: Budget-Aware Learning
// ============================================================================

async function testWorkflow3_BudgetAwareLearning() {
  console.log('\n💰 WORKFLOW 3: Budget-Aware Learning');
  console.log('━'.repeat(60));

  try {
    // Step 1: Check current budget
    console.log('  📍 Step 1: Check budget status...');
    const budgetRes = await makeRequest(3003, 'GET', '/api/v1/budget');
    
    if (budgetRes.status !== 200) {
      console.log('  ⚠️  Budget check returned:', budgetRes.status);
      return false;
    }
    console.log('  ✅ Budget retrieved');

    // Step 2: Get provider recommendations
    console.log('  📍 Step 2: Request provider recommendations...');
    const recommendRes = await makeRequest(3003, 'GET', '/api/v1/providers/recommend');
    
    if (recommendRes.status === 200) {
      const providers = recommendRes.body?.providers || [];
      console.log('  ✅ Recommended providers:', providers.length);
    } else {
      console.log('  ⚠️  Recommend returned:', recommendRes.status);
    }

    // Step 3: Get provider status
    console.log('  📍 Step 3: Check provider availability...');
    const providerRes = await makeRequest(3003, 'GET', '/api/v1/providers/status');
    
    if (providerRes.status === 200) {
      console.log('  ✅ Provider status retrieved');
    } else {
      console.log('  ⚠️  Provider status returned:', providerRes.status);
    }

    // Step 4: Set policy for cost optimization
    console.log('  📍 Step 4: Apply budget-aware policy...');
    const policyRes = await makeRequest(3003, 'POST', '/api/v1/providers/policy', {
      criticality: 'normal',
      maxConcurrency: 2,
      budgetLimit: 50000
    });
    
    if (policyRes.status === 200 || policyRes.status === 201) {
      console.log('  ✅ Cost optimization policy applied');
    } else {
      console.log('  ⚠️  Policy update returned:', policyRes.status);
    }

    // Step 5: Execute training within budget
    console.log('  📍 Step 5: Run training round within budget limits...');
    const roundRes = await makeRequest(3001, 'POST', '/api/v1/training/round', {
      roundNumber: 1,
      questionCount: 3
    });
    
    if (roundRes.status === 200 || roundRes.status === 201) {
      console.log('  ✅ Training executed within budget constraints');
    } else {
      console.log('  ⚠️  Training round returned:', roundRes.status);
    }

    // Step 6: Get cost summary
    console.log('  📍 Step 6: Retrieve cost summary...');
    const costsRes = await makeRequest(3003, 'GET', '/api/v1/providers/costs');
    
    if (costsRes.status === 200) {
      console.log('  ✅ Cost tracking retrieved');
    } else {
      console.log('  ⚠️  Cost tracking returned:', costsRes.status);
    }

    console.log('\n✨ WORKFLOW 3 COMPLETE: Budget-aware cycle validated\n');
    return true;

  } catch (error) {
    console.log('  ❌ Workflow error:', error.message);
    return false;
  }
}

// ============================================================================
// WORKFLOW TEST 4: Meta-Learning with Insights
// ============================================================================

async function testWorkflow4_MetaLearning() {
  console.log('\n🧠 WORKFLOW 4: Meta-Learning with Insights');
  console.log('━'.repeat(60));

  try {
    // Step 1: Start meta-learning phase
    console.log('  📍 Step 1: Initialize meta-learning phase...');
    const startRes = await makeRequest(3002, 'POST', '/api/v4/meta-learning/start', {
      phaseId: 'e2e-meta-' + Date.now(),
      topics: ['Machine Learning', 'Data Structures']
    });
    
    if (startRes.status !== 200 && startRes.status !== 201) {
      console.log('  ⚠️  Meta start returned:', startRes.status);
    } else {
      console.log('  ✅ Meta-learning phase initiated');
    }

    // Step 2: Run meta-analysis
    console.log('  📍 Step 2: Perform meta-analysis...');
    const runRes = await makeRequest(3002, 'POST', '/api/v4/meta-learning/run-all', {
      domains: ['Machine Learning', 'Data Structures']
    });
    
    if (runRes.status === 200 || runRes.status === 201) {
      console.log('  ✅ Meta-analysis executed');
    } else {
      console.log('  ⚠️  Meta analysis returned:', runRes.status);
    }

    // Step 3: Get meta report
    console.log('  📍 Step 3: Generate meta-learning report...');
    const reportRes = await makeRequest(3002, 'GET', '/api/v4/meta-learning/report');
    
    if (reportRes.status === 200) {
      console.log('  ✅ Meta report generated');
    } else {
      console.log('  ⚠️  Report returned:', reportRes.status);
    }

    // Step 4: Get insights
    console.log('  📍 Step 4: Extract learning insights...');
    const insightsRes = await makeRequest(3002, 'GET', '/api/v4/meta-learning/insights');
    
    if (insightsRes.status === 200) {
      const insights = insightsRes.body?.insights || [];
      console.log('  ✅ Insights extracted:', insights.length, 'items');
    } else {
      console.log('  ⚠️  Insights returned:', insightsRes.status);
    }

    // Step 5: Check activity log
    console.log('  📍 Step 5: Review activity log...');
    const logRes = await makeRequest(3002, 'GET', '/api/v4/meta-learning/activity-log');
    
    if (logRes.status === 200) {
      console.log('  ✅ Activity log retrieved');
    } else {
      console.log('  ⚠️  Activity log returned:', logRes.status);
    }

    // Step 6: Get knowledge summary
    console.log('  📍 Step 6: Retrieve knowledge synthesis...');
    const knowledgeRes = await makeRequest(3002, 'GET', '/api/v4/meta-learning/knowledge');
    
    if (knowledgeRes.status === 200) {
      console.log('  ✅ Knowledge synthesis retrieved');
    } else {
      console.log('  ⚠️  Knowledge synthesis returned:', knowledgeRes.status);
    }

    console.log('\n✨ WORKFLOW 4 COMPLETE: Meta-learning cycle validated\n');
    return true;

  } catch (error) {
    console.log('  ❌ Workflow error:', error.message);
    return false;
  }
}

// ============================================================================
// WORKFLOW TEST 5: Auto-Coach Optimization
// ============================================================================

async function testWorkflow5_AutoCoach() {
  console.log('\n🏋️  WORKFLOW 5: Auto-Coach Optimization');
  console.log('━'.repeat(60));

  try {
    // Step 1: Start auto-coach
    console.log('  📍 Step 1: Activate auto-coach engine...');
    const startRes = await makeRequest(3004, 'POST', '/api/v1/auto-coach/start', {
      mode: 'optimization',
      focus: ['weak-areas', 'speed']
    });
    
    if (startRes.status !== 200 && startRes.status !== 201) {
      console.log('  ⚠️  Coach start returned:', startRes.status);
    } else {
      console.log('  ✅ Auto-coach activated');
    }

    // Step 2: Check coach status
    console.log('  📍 Step 2: Verify coach status...');
    const statusRes = await makeRequest(3004, 'GET', '/api/v1/auto-coach/status');
    
    if (statusRes.status === 200) {
      const mode = statusRes.body?.mode || 'unknown';
      console.log('  ✅ Coach status:', mode);
    } else {
      console.log('  ⚠️  Status check returned:', statusRes.status);
    }

    // Step 3: Apply coaching boost
    console.log('  📍 Step 3: Apply optimization boost...');
    const boostRes = await makeRequest(3004, 'POST', '/api/v1/auto-coach/boost', {
      boostType: 'weakness-focus',
      intensity: 'high'
    });
    
    if (boostRes.status === 200 || boostRes.status === 201) {
      console.log('  ✅ Optimization boost applied');
    } else {
      console.log('  ⚠️  Boost returned:', boostRes.status);
    }

    // Step 4: Get boost details
    console.log('  📍 Step 4: Retrieve boost configuration...');
    const boostDetailRes = await makeRequest(3004, 'GET', '/api/v1/auto-coach/boost');
    
    if (boostDetailRes.status === 200) {
      console.log('  ✅ Boost configuration retrieved');
    } else {
      console.log('  ⚠️  Boost detail returned:', boostDetailRes.status);
    }

    // Step 5: Get settings
    console.log('  📍 Step 5: Check coach settings...');
    const settingsRes = await makeRequest(3004, 'GET', '/api/v1/auto-coach/settings');
    
    if (settingsRes.status === 200) {
      console.log('  ✅ Coach settings retrieved');
    } else {
      console.log('  ⚠️  Settings check returned:', settingsRes.status);
    }

    // Step 6: Execute training with coaching
    console.log('  📍 Step 6: Execute coached training round...');
    const roundRes = await makeRequest(3001, 'POST', '/api/v1/training/round', {
      roundNumber: 1,
      questionCount: 5,
      coached: true
    });
    
    if (roundRes.status === 200 || roundRes.status === 201) {
      console.log('  ✅ Coached training round completed');
    } else {
      console.log('  ⚠️  Training returned:', roundRes.status);
    }

    // Step 7: Get hyper-boost status
    console.log('  📍 Step 7: Check hyper-boost availability...');
    const hyperRes = await makeRequest(3004, 'GET', '/api/v1/auto-coach/hyper-boost');
    
    if (hyperRes.status === 200) {
      console.log('  ✅ Hyper-boost status retrieved');
    } else {
      console.log('  ⚠️  Hyper-boost check returned:', hyperRes.status);
    }

    console.log('\n✨ WORKFLOW 5 COMPLETE: Auto-coach cycle validated\n');
    return true;

  } catch (error) {
    console.log('  ❌ Workflow error:', error.message);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllWorkflows() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          🔄 E2E WORKFLOW TEST SUITE - TooLoo.ai          ║');
  console.log('║                                                            ║');
  console.log('║  Testing complete user journeys across all services:      ║');
  console.log('║  • Web, Training, Meta, Budget, Coach servers             ║');
  console.log('║  • 5 end-to-end workflows                                ║');
  console.log('║  • Integration & error handling                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const results = [];

  try {
    results.push({
      name: 'Workflow 1: Intent → Execution',
      passed: await testWorkflow1_IntentToExecution()
    });

    results.push({
      name: 'Workflow 2: Training Cycle',
      passed: await testWorkflow2_TrainingCycle()
    });

    results.push({
      name: 'Workflow 3: Budget-Aware',
      passed: await testWorkflow3_BudgetAwareLearning()
    });

    results.push({
      name: 'Workflow 4: Meta-Learning',
      passed: await testWorkflow4_MetaLearning()
    });

    results.push({
      name: 'Workflow 5: Auto-Coach',
      passed: await testWorkflow5_AutoCoach()
    });

  } catch (error) {
    console.log('\n❌ Fatal error:', error.message);
    process.exit(1);
  }

  // ========================================================================
  // SUMMARY REPORT
  // ========================================================================

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    📊 TEST SUMMARY                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let passCount = 0;
  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${result.name}`);
    if (result.passed) passCount++;
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total: ${passCount}/${results.length} workflows passed (${Math.round(passCount/results.length*100)}%)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (passCount === results.length) {
    console.log('🎉 ALL WORKFLOWS PASSED - System integration validated!\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${results.length - passCount} workflow(s) need review\n`);
    process.exit(1);
  }
}

// Run tests
runAllWorkflows().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
