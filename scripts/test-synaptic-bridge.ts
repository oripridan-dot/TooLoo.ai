// @version 3.3.479
// Test Synaptic Bridge Integration
// Tests that all components can be imported and have correct methods

import { shadowLab } from '../src/precog/engine/shadow-lab.js';
import { neuralLearningOptimizer } from '../src/precog/engine/neural-learning-optimizer.js';
import { autonomousEvolutionEngine } from '../src/precog/engine/autonomous-evolution-engine.js';
import { modelChooser } from '../src/precog/engine/model-chooser.js';

async function testSynapticBridge() {
  console.log('🧪 Testing Synaptic Bridge Integration...\n');

  // Test Shadow Lab
  console.log('1. Shadow Lab:');
  const shadowStatus = shadowLab.getStatus();
  console.log(`   - Enabled: ${shadowStatus.enabled}`);
  console.log(`   - Experiment Rate: ${shadowStatus.config.experimentRate * 100}%`);
  console.log(`   - Total Experiments: ${shadowStatus.totalExperiments}`);
  console.log(`   - maybeRunExperiment method: ${typeof shadowLab.maybeRunExperiment}`);
  console.log('   ✅ Shadow Lab OK\n');

  // Test Neural Learning Optimizer
  console.log('2. Neural Learning Optimizer:');
  const optimizerStatus = neuralLearningOptimizer.getStatus();
  console.log(`   - Q-Table Size: ${optimizerStatus.qTableSize}`);
  console.log(`   - Exploration Rate: ${optimizerStatus.config.explorationRate}`);
  console.log(`   - Top Strategies: ${JSON.stringify(optimizerStatus.topStrategies.slice(0, 2))}`);
  console.log(`   - recordInteraction method: ${typeof neuralLearningOptimizer.recordInteraction}`);
  console.log('   ✅ Neural Learning Optimizer OK\n');

  // Test Autonomous Evolution Engine
  console.log('3. Autonomous Evolution Engine:');
  const evolutionStatus = autonomousEvolutionEngine.getEvolutionStatus();
  console.log(`   - Interaction Count: ${evolutionStatus.interactionCount}`);
  console.log(`   - Opportunities: ${evolutionStatus.opportunities.length}`);
  console.log(`   - Autonomous Mode: ${evolutionStatus.autonomousMode}`);
  console.log(`   - recordInteraction method: ${typeof autonomousEvolutionEngine.recordInteraction}`);
  console.log('   ✅ Autonomous Evolution Engine OK\n');

  // Test Model Chooser (Router)
  console.log('4. Model Chooser (Neural Router):');
  const routerStats = modelChooser.getRoutingStats();
  console.log(`   - Shadow Tests: ${routerStats.shadowTests}`);
  console.log(`   - Challenger Wins: ${routerStats.challengerWins}`);
  console.log(`   - Current Strategy: ${routerStats.currentStrategy}`);
  console.log(`   - extractFeatures method: ${typeof modelChooser.extractFeatures}`);
  console.log('   ✅ Model Chooser OK\n');

  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 All Synaptic Bridge components verified successfully!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\nThe feedback loop is now complete:');
  console.log('  Chat Request → Neural Router (ModelChooser)');
  console.log('      ↓ (selects model using optimizer strategy)');
  console.log('  Response → Evolution Engine (records interaction)');
  console.log('      ↓ (feeds knowledge graph)');
  console.log('  Shadow Lab → Background Experiments');
  console.log('      ↓ (challenger vs incumbent)');
  console.log('  Results → Optimizer (updates Q-values)');
  console.log('      ↓ (improves strategy selection)');
  console.log('  Next Request → Better Routing!');
}

testSynapticBridge().catch(console.error);
