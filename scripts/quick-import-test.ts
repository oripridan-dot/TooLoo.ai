// @version 3.3.478
// Quick test to verify imports work
import { neuralLearningOptimizer } from '../src/precog/engine/neural-learning-optimizer.js';
import { autonomousEvolutionEngine } from '../src/precog/engine/autonomous-evolution-engine.js';
import { shadowLab } from '../src/precog/engine/shadow-lab.js';
import { modelChooser } from '../src/precog/engine/model-chooser.js';

console.log('Testing Synaptic Bridge imports...\n');

console.log('1. NeuralLearningOptimizer:', typeof neuralLearningOptimizer);
console.log('   - selectLearningAction:', typeof neuralLearningOptimizer.selectLearningAction);

console.log('2. AutonomousEvolutionEngine:', typeof autonomousEvolutionEngine);
console.log('   - recordInteraction:', typeof autonomousEvolutionEngine.recordInteraction);

console.log('3. ShadowLab:', typeof shadowLab);
console.log('   - getStatus:', typeof shadowLab.getStatus);

console.log('4. ModelChooser:', typeof modelChooser);
console.log('   - selectRecipeForIntent:', typeof modelChooser.selectRecipeForIntent);

console.log('\n✅ All imports successful!');

// Quick functionality test
const strategy = neuralLearningOptimizer.selectLearningAction();
console.log('\n🧠 Current Strategy:', strategy);

const status = shadowLab.getStatus();
console.log('🧪 Shadow Lab enabled:', status.enabled);

process.exit(0);
