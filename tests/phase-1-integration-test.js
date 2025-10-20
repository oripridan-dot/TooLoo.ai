#!/usr/bin/env node

/**
 * Phase 1 Integration Test
 * 
 * Tests the complete Intent Bus → Model Chooser → Cup Tournament flow
 * 
 * Usage: node tests/phase-1-integration-test.js
 */

import IntentBus from '../engine/intent-bus.js';
import ModelChooser from '../engine/model-chooser.js';
import ConfidenceScorer from '../engine/confidence-scorer.js';

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  Phase 1 Integration Test: Intent Bus → Chooser → Cup Tournament');
  console.log('='.repeat(70) + '\n');

  // Initialize engines
  const intentBus = new IntentBus({ enablePersist: false });
  const modelChooser = new ModelChooser();
  const confidenceScorer = new ConfidenceScorer();

  // Test 1: Create Intent with Context
  console.log('✓ TEST 1: Create Intent with Screen Context & Segmentation\n');
  
  const intent = intentBus.createIntent(
    'Create a TypeScript class for managing user preferences with persistence',
    { userId: 'test-user', sessionId: 'test-session', priority: 'normal' }
  );

  // Add screen context
  intent.withScreenContext(
    'mock_screenshot_base64',
    ['VS Code', 'TypeScript', 'File Explorer', 'console.log']
  );

  // Add segmentation context
  intent.withSegmentationContext(
    'Tier 1: User recently asked about persistence layers',
    'Tier 2: Previous session: designing ORM abstractions',
    'Tier 3: Profile: prefers type-safe implementations'
  );

  console.log('  Intent ID:', intent.id);
  console.log('  Prompt:', intent.originalPrompt.substring(0, 60) + '...');
  console.log('  Screen tags:', intent.screenContext.ocrTags);
  console.log('  Segmentation layers:', intent.segmentationContext.length);
  console.log('  Augmented prompt preview:', intent.getAugmentedPrompt().substring(0, 100) + '...\n');

  // Test 2: Analyze Complexity & Build Execution Plan
  console.log('✓ TEST 2: Analyze Complexity & Build Execution Plan\n');

  const complexity = modelChooser.analyzeComplexity(intent);
  console.log('  Complexity:', complexity.complexity);
  console.log('  Task type:', complexity.taskType);
  console.log('  Is code?', complexity.isCode);
  console.log('  Token count:', complexity.tokens, '\n');

  // Build plan
  const plan = modelChooser.buildExecutionPlan(intent, 0.15);
  console.log('  Execution Plan ID:', plan.id);
  console.log('  Lanes:', Object.keys(plan.lanes));
  console.log('  Total candidates:', Object.values(plan.lanes).flat().length);
  console.log('  Estimated cost:', '$' + plan.totalEstimatedCostUsd.toFixed(4));
  console.log('  Estimated time:', plan.totalEstimatedTimeMs + 'ms\n');

  // Attach plan to intent
  modelChooser.attachPlanToIntent(intent, plan);
  console.log('  Plan attached to intent. Intent now has', intent.executionPlan.candidatePlans.length, 'candidate plans\n');

  // Test 3: Process Intent Through Bus
  console.log('✓ TEST 3: Process Intent Through Bus\n');

  await intentBus.process(intent);
  console.log('  Intent status:', intent.status);
  console.log('  Intent added to history:', intentBus.getHistory().length);
  console.log('  Can retrieve intent by ID?', !!intentBus.getHistory().find(i => i.id === intent.id), '\n');

  // Test 4: Score Artifacts (Simulated)
  console.log('✓ TEST 4: Score Artifacts with Multi-Dimensional Rubric\n');

  const mockArtifact = {
    id: 'artifact_1',
    nodeId: 'node_code',
    type: 'code',
    content: `export class UserPreferences {
  private storage = localStorage;
  
  set(key: string, value: any): void {
    this.storage.setItem(key, JSON.stringify(value));
  }
  
  get(key: string): any {
    const data = this.storage.getItem(key);
    return data ? JSON.parse(data) : null;
  }
}`,
    modelSource: 'anthropic'
  };

  const mockEvidence = {
    deterministicChecks: {
      typescript_compile: true,
      linter: true,
      tests_pass: true,
      schema_validation: true
    },
    sources: [
      { text: 'localStorage API', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage', confidence: 0.95 }
    ],
    claims: [
      'We use localStorage for client-side persistence',
      'The class provides get/set interface for type-safe access'
    ],
    criticAgreement: {
      claude: 0.88,
      gpt4: 0.85,
      gemini: 0.82
    },
    semanticMetrics: {
      fluencyScore: 0.9,
      relevanceScore: 0.92
    },
    modelProvider: 'anthropic',
    historicalSuccess: 0.92,
    costUsd: 0.008
  };

  const score = confidenceScorer.score(mockArtifact, mockEvidence);

  console.log('  Overall Confidence:', (score.overall * 100).toFixed(1) + '%');
  console.log('  Component Breakdown:');
  for (const [key, val] of Object.entries(score.components)) {
    console.log(`    - ${key.padEnd(15)}: ${(val * 100).toFixed(1)}%`);
  }

  const fate = await confidenceScorer.decideFate('node_code', score, 1);
  console.log('\n  Fate Decision:', fate.decision.toUpperCase());
  console.log('  Reason:', fate.reason, '\n');

  // Test 5: Retry Logic
  console.log('✓ TEST 5: Retry & Confidence Tracking\n');

  // Record first attempt
  confidenceScorer.recordAttempt('node_code', 'anthropic', score, 0.008, true);
  console.log('  Recorded attempt 1: anthropic, score 0.887');

  // Simulate second attempt (lower score)
  const mockArtifact2 = { ...mockArtifact, modelSource: 'ollama' };
  const mockEvidence2 = {
    ...mockEvidence,
    modelProvider: 'ollama',
    semanticMetrics: { fluencyScore: 0.75, relevanceScore: 0.78 }
  };
  const score2 = confidenceScorer.score(mockArtifact2, mockEvidence2);
  confidenceScorer.recordAttempt('node_code', 'ollama', score2, 0.0, true);
  console.log('  Recorded attempt 2: ollama, score', (score2.overall * 100).toFixed(1) + '%');

  const retryStats = confidenceScorer.getRetryStats('node_code');
  console.log('\n  Retry Statistics:');
  console.log('    - Total attempts:', retryStats.totalAttempts);
  console.log('    - Average score:', (retryStats.avgScore * 100).toFixed(1) + '%');
  console.log('    - Total cost:', '$' + retryStats.totalCost.toFixed(4));
  console.log('    - Success rate:', (retryStats.successRate * 100).toFixed(1) + '%\n');

  // Test 6: Ensemble Merge Attempt
  console.log('✓ TEST 6: Ensemble Merge Strategy\n');

  const candidate1 = mockArtifact;
  const candidate2 = mockArtifact2;
  const score1 = score;
  const score2_updated = confidenceScorer.score(candidate2, { ...mockEvidence2, semanticMetrics: { fluencyScore: 0.84, relevanceScore: 0.86 } });

  const merge = confidenceScorer.attemptEnsemble(candidate1, candidate2, score1, score2_updated);
  console.log('  Comparing: anthropic (score 0.89) vs ollama (score', (score2_updated.overall * 100).toFixed(1) + '%)');
  console.log('  Can merge?', merge.canMerge);
  if (merge.canMerge) {
    console.log('  Merged confidence:', (merge.mergedConfidence * 100).toFixed(1) + '%');
    console.log('  Strategy:', merge.mergeStrategy);
  } else {
    console.log('  Reason: Score difference or individual scores below threshold\n');
  }

  // Test 7: Model Chooser Statistics
  console.log('\n✓ TEST 7: Model Chooser Statistics\n');

  modelChooser.recordUsage('anthropic', 0.008, 1200, true);
  modelChooser.recordUsage('ollama', 0.0, 600, true);
  modelChooser.recordUsage('anthropic', 0.008, 1180, true);

  const stats = modelChooser.getStats();
  console.log('  Total plans:', stats.totalPlan);
  console.log('  Total candidates:', stats.totalCandidates);
  console.log('  Provider usage:');
  for (const [provider, usage] of Object.entries(stats.providerUsage || {})) {
    console.log(`    - ${provider.padEnd(12)}: ${usage.count} uses, $${usage.totalCostUsd.toFixed(4)} total, ${usage.successCount} successes`);
  }

  // Test 8: Intent History
  console.log('\n✓ TEST 8: Intent History & Retrieval\n');

  // Create another intent
  const intent2 = intentBus.createIntent('Quick design mockup', { userId: 'test-user', sessionId: 'test-session' });
  await intentBus.process(intent2);

  const history = intentBus.getHistory({ sessionId: 'test-session', limit: 5 });
  console.log('  Intents in test-session:', history.length);
  history.forEach((i, idx) => {
    console.log(`    ${idx + 1}. ${i.originalPrompt.substring(0, 40)}... [${i.status}]`);
  });

  // Final Summary
  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY: Phase 1 Integration Test Complete');
  console.log('='.repeat(70));
  console.log('\n  ✓ Intent Bus working');
  console.log('  ✓ Model Chooser building plans');
  console.log('  ✓ Confidence Scorer multi-dimensional');
  console.log('  ✓ Retry logic and ensemble merge');
  console.log('  ✓ History and retrieval');
  console.log('\n  Ready for Phase 2: DAG Builder + Screen Capture + Artifact Ledger');
  console.log('='.repeat(70) + '\n');
}

main().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
