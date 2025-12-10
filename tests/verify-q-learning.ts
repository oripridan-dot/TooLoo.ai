// @version 3.3.505

import { SmartRouter } from '../src/precog/engine/smart-router.js';
import { getQLearningOptimizer } from '../src/precog/learning/q-learning-optimizer.js';
import { ProviderScorecard } from '../src/precog/engine/provider-scorecard.js';

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
  
  // Create a fresh scorecard instance
  const scorecard = new ProviderScorecard(['deepseek', 'anthropic', 'openai', 'gemini']);
  
  const router = new MockSmartRouter(scorecard);
  const optimizer = getQLearningOptimizer();
  
  // Reset optimizer state (it's a singleton)
  // We can't easily reset the singleton, but we can rely on the fact that
  // 'CODING'/'developer' state might be empty or we can just see if it converges.
  // Or we can manually clear the map if we can access it, but it's private.
  // Let's just run enough iterations to overcome any previous state.
  
  // Scenario: Coding Task for Developer Segment
  // We want to see if the system learns to prefer 'deepseek' (fastest in our mock)
  
  const prompt = "Write a Python function to calculate Fibonacci sequence";
  const segment = "developer";
  
  console.log(`\n--- Training Loop: ${prompt} [${segment}] ---`);
  
  for (let i = 1; i <= 10; i++) { 
    console.log(`\nIteration ${i}:`);
    
    // Check current Q-values before routing
    const taskType = 'CODING'; 
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
