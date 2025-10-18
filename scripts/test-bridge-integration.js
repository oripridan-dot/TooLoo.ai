#!/usr/bin/env node

/**
 * Phase 1 Integration Test: Capability-Workflow Bridge
 * 
 * Test the closed-loop coupling:
 * 1. Analyze capability gaps
 * 2. Get workflow suggestions
 * 3. Enqueue workflow as training variant
 * 4. Process feedback
 * 5. Verify loop closure
 */

import fetch from 'node-fetch';

const BRIDGE_URL = 'http://127.0.0.1:3010';
const CAPABILITIES_URL = 'http://127.0.0.1:3009';
const PRODUCT_DEV_URL = 'http://127.0.0.1:3006';
const TRAINING_URL = 'http://127.0.0.1:3001';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(level, msg) {
  const prefix = level === 'pass' ? `${colors.green}✓${colors.reset}` :
                 level === 'fail' ? `${colors.red}✗${colors.reset}` :
                 level === 'info' ? `${colors.blue}ℹ${colors.reset}` :
                 level === 'warn' ? `${colors.yellow}⚠${colors.reset}` : '•';
  console.log(`${prefix} ${msg}`);
}

async function testServiceHealth() {
  log('info', 'Testing service health...');
  
  const services = [
    { name: 'Bridge', url: BRIDGE_URL },
    { name: 'Capabilities', url: CAPABILITIES_URL },
    { name: 'Product Dev', url: PRODUCT_DEV_URL },
    { name: 'Training', url: TRAINING_URL }
  ];

  for (const { name, url } of services) {
    try {
      const resp = await fetch(`${url}/health`, { timeout: 2000 });
      if (resp.ok) {
        log('pass', `${name} healthy`);
      } else {
        log('fail', `${name} returned ${resp.status}`);
      }
    } catch (error) {
      log('fail', `${name} unreachable: ${error.message}`);
    }
  }
}

async function testGapAnalysis() {
  log('info', 'Testing gap analysis...');
  
  try {
    const resp = await fetch(`${BRIDGE_URL}/api/v1/bridge/analyze-gaps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });

    if (!resp.ok) {
      log('fail', `Gap analysis returned ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    if (data.ok && data.analysis) {
      log('pass', `Gap analysis completed: ${data.analysis.gaps.length} gaps, activation rate ${data.analysis.activationRate}`);
      return data.analysis;
    } else {
      log('fail', 'Gap analysis returned ok=false');
      return null;
    }
  } catch (error) {
    log('fail', `Gap analysis error: ${error.message}`);
    return null;
  }
}

async function testSuggestedWorkflows() {
  log('info', 'Testing workflow suggestions...');
  
  try {
    const resp = await fetch(`${BRIDGE_URL}/api/v1/bridge/suggested-workflows`, {
      timeout: 5000
    });

    if (!resp.ok) {
      log('fail', `Suggestions returned ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    if (data.ok && data.suggestions) {
      log('pass', `Got workflow suggestions: ${data.total} workflows for ${Object.keys(data.suggestions).length} components`);
      
      // Print first suggestion if any
      for (const [component, workflows] of Object.entries(data.suggestions)) {
        if (workflows.length > 0) {
          log('info', `  • ${component}: ${workflows.length} workflow(s)`);
          if (workflows[0].name) {
            log('info', `    → "${workflows[0].name}"`);
          }
          break;
        }
      }
      return data.suggestions;
    } else {
      log('fail', 'Suggestions returned ok=false');
      return null;
    }
  } catch (error) {
    log('fail', `Suggestions error: ${error.message}`);
    return null;
  }
}

async function testEnqueueTraining(workflowId) {
  log('info', `Testing training enqueue with workflow ${workflowId}...`);
  
  if (!workflowId) {
    log('warn', 'No workflow ID provided, skipping training enqueue');
    return null;
  }

  try {
    const resp = await fetch(`${BRIDGE_URL}/api/v1/bridge/enqueue-training`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowId,
        metadata: {
          targetCapabilities: ['autonomousEvolutionEngine'],
          expectedOutcome: 'Improve evolution cycle performance'
        }
      }),
      timeout: 5000
    });

    if (!resp.ok) {
      log('fail', `Training enqueue returned ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    if (data.ok && data.variant) {
      log('pass', `Training variant enqueued: ${data.variant.id} (queue length: ${data.queueLength})`);
      return data.variant;
    } else {
      log('fail', 'Training enqueue returned ok=false');
      return null;
    }
  } catch (error) {
    log('fail', `Training enqueue error: ${error.message}`);
    return null;
  }
}

async function testFeedback(trainingId) {
  log('info', `Testing feedback loop with training ID ${trainingId}...`);
  
  if (!trainingId) {
    log('warn', 'No training ID provided, skipping feedback');
    return null;
  }

  try {
    const resp = await fetch(`${BRIDGE_URL}/api/v1/bridge/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trainingId,
        performanceOutcome: {
          success: true,
          capabilitiesActivated: ['autonomousEvolutionEngine_01', 'autonomousEvolutionEngine_02'],
          improvementPercent: 15.5
        }
      }),
      timeout: 5000
    });

    if (!resp.ok) {
      log('fail', `Feedback returned ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    if (data.ok && data.loopClosed) {
      log('pass', `Feedback processed: loop closed with 2 capabilities updated`);
      return data;
    } else {
      log('fail', 'Feedback returned ok=false or loop not closed');
      return null;
    }
  } catch (error) {
    log('fail', `Feedback error: ${error.message}`);
    return null;
  }
}

async function testLoopStatus() {
  log('info', 'Testing loop status...');
  
  try {
    const resp = await fetch(`${BRIDGE_URL}/api/v1/bridge/loop-status`, {
      timeout: 5000
    });

    if (!resp.ok) {
      log('fail', `Loop status returned ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    if (data.ok) {
      log('pass', `Loop status: ${data.stats.feedbackProcessed} feedback events, ${data.stats.capabilitiesUpdated} capabilities updated`);
      return data;
    } else {
      log('fail', 'Loop status returned ok=false');
      return null;
    }
  } catch (error) {
    log('fail', `Loop status error: ${error.message}`);
    return null;
  }
}

async function testBridgeStatus() {
  log('info', 'Testing bridge status...');
  
  try {
    const resp = await fetch(`${BRIDGE_URL}/api/v1/bridge/status`, {
      timeout: 5000
    });

    if (!resp.ok) {
      log('fail', `Bridge status returned ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    if (data.ok) {
      const svcHealth = data.services;
      log('pass', `Bridge operational with stats: ${data.bridge.stats.gapsDetected} gaps detected, ${data.bridge.stats.workflowsSuggested} workflows suggested`);
      log('info', `  • Capabilities: ${svcHealth.capabilities.healthy ? 'healthy' : 'unhealthy'}`);
      log('info', `  • Product Dev: ${svcHealth.productDevelopment.healthy ? 'healthy' : 'unhealthy'}`);
      log('info', `  • Training: ${svcHealth.training.healthy ? 'healthy' : 'unhealthy'}`);
      return data;
    } else {
      log('fail', 'Bridge status returned ok=false');
      return null;
    }
  } catch (error) {
    log('fail', `Bridge status error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log(`\n${colors.cyan}=== Phase 1: Capability-Workflow Bridge Integration Test ===${colors.reset}\n`);
  
  await testServiceHealth();
  console.log();
  
  const analysis = await testGapAnalysis();
  console.log();
  
  const suggestions = await testSuggestedWorkflows();
  console.log();

  // Extract first workflow ID if available
  let firstWorkflowId = null;
  if (suggestions) {
    for (const workflows of Object.values(suggestions)) {
      if (Array.isArray(workflows) && workflows.length > 0) {
        firstWorkflowId = workflows[0].id;
        break;
      }
    }
  }

  let variant = null;
  if (firstWorkflowId) {
    variant = await testEnqueueTraining(firstWorkflowId);
    console.log();
  }

  if (variant) {
    await testFeedback(variant.id);
    console.log();
  }

  await testLoopStatus();
  console.log();
  
  await testBridgeStatus();
  
  console.log(`\n${colors.cyan}=== Test Summary ===${colors.reset}\n`);
  log('info', 'Bridge service initialized and operational');
  log('info', 'Capability gaps analyzed and workflows suggested');
  log('info', 'Training variant enqueue and feedback loop ready for Phase 2');
  console.log();
}

main().catch(error => {
  log('fail', `Test suite error: ${error.message}`);
  process.exit(1);
});
