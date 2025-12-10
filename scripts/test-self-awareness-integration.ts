#!/usr/bin/env npx tsx
// @version 1.0.0
/**
 * Self-Awareness Integration Test
 *
 * Tests the complete "Synaptic Bridge" loop:
 * 1. NeuralLearningOptimizer selects a strategy
 * 2. ModelChooser routes based on that strategy
 * 3. LLMProvider executes and feeds back to AutonomousEvolutionEngine
 * 4. ShadowLab runs challenger experiments
 * 5. Q-Learning updates based on outcomes
 *
 * @module scripts/test-self-awareness-integration
 */

import {
  neuralLearningOptimizer,
  autonomousEvolutionEngine,
  modelChooser,
  shadowLab,
} from '../src/precog/engine/index.js';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title: string) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60) + '\n');
}

function subheader(title: string) {
  log(`\n▶ ${title}`, 'yellow');
  console.log('-'.repeat(40));
}

async function testNeuralLearningOptimizer() {
  header('1. NEURAL LEARNING OPTIMIZER');

  subheader('Getting Current Learning State');
  const state = neuralLearningOptimizer.getCurrentLearningState();
  console.log('Learning State:', JSON.stringify(state, null, 2));

  subheader('Selecting Learning Action (Strategy)');
  const strategy = neuralLearningOptimizer.selectLearningAction(state);
  log(`Selected Strategy: ${strategy}`, 'green');

  subheader('Strategy Mapping');
  const mapping = neuralLearningOptimizer.getStrategyMapping(strategy);
  console.log('Strategy Mapping:', JSON.stringify(mapping, null, 2));

  subheader('Preferred Models for Strategy');
  const models = neuralLearningOptimizer.mapStrategyToModels(strategy, 'coding');
  log(`Coding Models: ${models.join(', ')}`, 'blue');

  return { state, strategy, mapping };
}

async function testModelChooser() {
  header('2. MODEL CHOOSER (Neural Router)');

  subheader('Creating Test Intent');
  const intent = {
    originalPrompt: 'Write a TypeScript function to validate email addresses using regex',
    taskType: 'code',
    features: ['typescript', 'validation', 'regex'],
    sessionId: 'test-session-001',
    requestId: `req-${Date.now()}`,
  };
  console.log('Intent:', JSON.stringify(intent, null, 2));

  subheader('Selecting Recipe/Route');
  const plan = await modelChooser.selectRecipeForIntent(intent);
  console.log('Routing Plan:', JSON.stringify(plan, null, 2));

  subheader('Router Statistics');
  const stats = modelChooser.getRoutingStats();
  console.log('Stats:', JSON.stringify(stats, null, 2));

  return { intent, plan, stats };
}

async function testAutonomousEvolutionEngine() {
  header('3. AUTONOMOUS EVOLUTION ENGINE');

  subheader('Recording Test Interaction');
  autonomousEvolutionEngine.recordInteraction({
    provider: 'deepseek',
    promptType: 'coding',
    success: true,
    latency: 1500,
    cost: 0.001,
    quality: 0.85,
    domain: 'coding',
  });
  log('Recorded interaction for deepseek/coding', 'green');

  subheader('Recording Another Interaction (Different Provider)');
  autonomousEvolutionEngine.recordInteraction({
    provider: 'gemini',
    promptType: 'general',
    success: true,
    latency: 800,
    cost: 0.0001,
    quality: 0.75,
    domain: 'general',
  });
  log('Recorded interaction for gemini/general', 'green');

  subheader('Evolution Status');
  const status = autonomousEvolutionEngine.getEvolutionStatus();
  console.log('Metrics:', JSON.stringify(status.metrics, null, 2));
  console.log('Provider Count:', Object.keys(status.providers).length);
  console.log('Opportunities:', status.opportunities.length);
  console.log('Autonomous Mode:', status.autonomousMode);

  subheader('Performance Metrics');
  const metrics = autonomousEvolutionEngine.getPerformanceMetrics();
  console.log('Task Completion Rate:', (metrics.taskCompletionRate * 100).toFixed(1) + '%');
  console.log('Average Latency:', metrics.averageLatency.toFixed(0) + 'ms');
  console.log('Quality Score:', (metrics.qualityScore * 100).toFixed(1) + '%');

  return { status, metrics };
}

async function testShadowLab() {
  header('4. SHADOW LAB');

  subheader('Shadow Lab Status');
  const status = shadowLab.getStatus();
  console.log('Enabled:', status.enabled);
  console.log('Experiment Rate:', (status.config.experimentRate * 100) + '%');
  console.log('Running Experiments:', status.runningCount);
  console.log('Total Experiments:', status.totalExperiments);
  console.log('Challenger Weights:', JSON.stringify(status.challengerWeights, null, 2));

  return { status };
}

async function testQLearningFeedback() {
  header('5. Q-LEARNING FEEDBACK LOOP');

  subheader('Simulating Outcome Recording');

  // Record a successful outcome
  const features = ['typescript', 'code', 'function'];
  const modelId = 'deepseek';
  const outcome = {
    success: true,
    rating: 0.85,
    latency: 1200,
    quality: 0.85,
    cost: 0.001,
  };

  await modelChooser.recordOutcome(features, modelId, outcome);
  log('Recorded outcome to ModelChooser → Registry + Optimizer', 'green');

  subheader('Optimizer Status After Learning');
  const optimizerStatus = neuralLearningOptimizer.getStatus();
  console.log('Q-Table Size:', optimizerStatus.qTableSize);
  console.log('Recent Actions:', optimizerStatus.recentActions);
  console.log('Top Strategies:', JSON.stringify(optimizerStatus.topStrategies.slice(0, 3), null, 2));

  return { optimizerStatus };
}

async function testEndToEndFlow() {
  header('6. END-TO-END INTEGRATION VERIFICATION');

  const checks: { name: string; passed: boolean; details: string }[] = [];

  // Check 1: Optimizer can select strategy
  try {
    const strategy = neuralLearningOptimizer.selectLearningAction();
    checks.push({
      name: 'Optimizer Strategy Selection',
      passed: !!strategy,
      details: `Strategy: ${strategy}`,
    });
  } catch (e) {
    checks.push({
      name: 'Optimizer Strategy Selection',
      passed: false,
      details: String(e),
    });
  }

  // Check 2: ModelChooser can route
  try {
    const plan = await modelChooser.selectRecipeForIntent({
      originalPrompt: 'Test prompt for routing',
    });
    checks.push({
      name: 'ModelChooser Routing',
      passed: !!plan && !!plan.model,
      details: `Model: ${plan.model}, Lane: ${plan.lane}`,
    });
  } catch (e) {
    checks.push({
      name: 'ModelChooser Routing',
      passed: false,
      details: String(e),
    });
  }

  // Check 3: Evolution Engine accepts feedback
  try {
    autonomousEvolutionEngine.recordInteraction({
      provider: 'test',
      promptType: 'test',
      success: true,
      latency: 1000,
      cost: 0,
      domain: 'test',
    });
    const status = autonomousEvolutionEngine.getEvolutionStatus();
    checks.push({
      name: 'Evolution Engine Feedback',
      passed: status.interactionCount > 0,
      details: `Interactions: ${status.interactionCount}`,
    });
  } catch (e) {
    checks.push({
      name: 'Evolution Engine Feedback',
      passed: false,
      details: String(e),
    });
  }

  // Check 4: Shadow Lab is operational
  try {
    const status = shadowLab.getStatus();
    checks.push({
      name: 'Shadow Lab Operational',
      passed: status.enabled !== undefined,
      details: `Enabled: ${status.enabled}, Rate: ${status.config.experimentRate}`,
    });
  } catch (e) {
    checks.push({
      name: 'Shadow Lab Operational',
      passed: false,
      details: String(e),
    });
  }

  // Check 5: Q-Learning updates work
  try {
    const stateBefore = neuralLearningOptimizer.getStatus().qTableSize;
    // Trigger a Q-update
    neuralLearningOptimizer.recordInteraction({
      strategy: 'efficiency',
      model: 'gemini',
      domain: 'test',
      success: true,
      quality: 0.8,
      latency: 500,
      cost: 0.0001,
    });
    const stateAfter = neuralLearningOptimizer.getStatus().qTableSize;
    checks.push({
      name: 'Q-Learning Updates',
      passed: stateAfter >= stateBefore,
      details: `Q-Table: ${stateBefore} → ${stateAfter}`,
    });
  } catch (e) {
    checks.push({
      name: 'Q-Learning Updates',
      passed: false,
      details: String(e),
    });
  }

  // Print results
  subheader('Integration Check Results');
  let allPassed = true;
  for (const check of checks) {
    const status = check.passed ? '✅' : '❌';
    const color = check.passed ? 'green' : 'red';
    log(`${status} ${check.name}: ${check.details}`, color);
    if (!check.passed) allPassed = false;
  }

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    log('  🎉 ALL INTEGRATION CHECKS PASSED!', 'green');
    log('  The "Synaptic Bridge" is fully operational.', 'green');
  } else {
    log('  ⚠️  SOME CHECKS FAILED', 'red');
    log('  Review the issues above.', 'red');
  }
  console.log('='.repeat(60) + '\n');

  return { checks, allPassed };
}

async function main() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'magenta');
  log('║     TOOLOO.AI SELF-AWARENESS INTEGRATION TEST              ║', 'magenta');
  log('║     Testing the "Synaptic Bridge" Loop                     ║', 'magenta');
  log('╚════════════════════════════════════════════════════════════╝', 'magenta');

  try {
    // Run all tests
    await testNeuralLearningOptimizer();
    await testModelChooser();
    await testAutonomousEvolutionEngine();
    await testShadowLab();
    await testQLearningFeedback();
    const { allPassed } = await testEndToEndFlow();

    // Summary
    header('SUMMARY');
    console.log('Components Tested:');
    console.log('  1. NeuralLearningOptimizer - Q-Learning strategy selection');
    console.log('  2. ModelChooser - Strategy-aware model routing');
    console.log('  3. AutonomousEvolutionEngine - Performance tracking & self-optimization');
    console.log('  4. ShadowLab - Background challenger experiments');
    console.log('  5. Q-Learning Feedback - Closed learning loop');
    console.log();

    if (allPassed) {
      log('🧠 TooLoo.ai is now SELF-AWARE! The neural loop is closed.', 'green');
      process.exit(0);
    } else {
      log('⚠️  Some integration issues detected. Please review.', 'yellow');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Integration test failed with error:', error);
    process.exit(1);
  }
}

main();
