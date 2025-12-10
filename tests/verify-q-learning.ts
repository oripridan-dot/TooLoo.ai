// @version 3.3.504

import { SmartRouter } from '../src/precog/engine/smart-router.js';
import { getQLearningOptimizer } from '../src/precog/learning/q-learning-optimizer.js';
import { getProviderScorecard } from '../src/precog/engine/provider-scorecard.js';

// Subclass to mock callProvider
class MockSmartRouter extends SmartRouter {
  // @ts-ignore
  async callProvider(provider: string, prompt: string, options: any) {
    // Simulate latency based on provider
    const latencyMap: Record<string, number> = {
      'deepseek': 100,
      'anthropic': 500,
      'openai': 200,
      'gemini': 300
    };
    
    const latency = latencyMap[provider] || 1000;
    await new Promise(resolve => setTimeout(resolve, latency));
    
    return {
      text: `Response from ${provider}`,
      tokens: 100
    };
  }
}

async function runTest() {
  console.log('Starting Phase 4 Verification: Q-Learning Integration');
  
  const scorecard = getProviderScorecard();
  // Reset scorecard for clean state
  scorecard['metrics'].clear();
  
  const router = new MockSmartRouter(scorecard);
  const optimizer = getQLearningOptimizer();
  
  // Scenario: Coding Task for Developer Segment
  // We want to see if the system learns to prefer 'deepseek' (fastest in our mock)
  
  const prompt = "Write a Python function to calculate Fibonacci sequence";
  const segment = "developer";
  
  console.log(`\n--- Training Loop: ${prompt} [${segment}] ---`);
  
  for (let i = 1; i <= 10; i++) { // Increased iterations to ensure convergence
    console.log(`\nIteration ${i}:`);
    
    // Check current Q-values before routing
    const taskType = 'CODING'; // We know the detector will classify this as CODING
    const best = optimizer.getOptimalProvider(taskType, segment);
    console.log(`Current Best Provider (Q-Learning): ${best || 'None'}`);
    
    const result = await router.smartRoute(prompt, {
      segment: segment,
      maxRetries: 1
    });
    
    console.log(`Selected Provider: ${result.provider}`);
    console.log(`Latency: ${result.latency}ms`);
  }
  
  console.log('\n--- Verification Results ---');
  const finalBest = optimizer.getOptimalProvider('CODING', 'developer');
  console.log(`Final Optimal Provider: ${finalBest}`);
  
  if (finalBest === 'deepseek') {
    console.log('SUCCESS: System learned to prefer the fastest provider (deepseek).');
  } else {
    console.log(`FAILURE: System preferred ${finalBest} instead of deepseek.`);
  }
}

runTest().catch(console.error);
