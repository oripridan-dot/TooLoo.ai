// @version 3.3.503

import { SmartRouter } from '../src/precog/engine/smart-router.js';
import { getQLearningOptimizer } from '../src/precog/learning/q-learning-optimizer.js';
import { getProviderScorecard } from '../src/precog/engine/provider-scorecard.js';

// Mock generateLLM
import * as llmProvider from '../src/precog/providers/llm-provider.js';

// Monkey patch generateLLM to simulate behavior
// @ts-ignore
llmProvider.generateLLM = async (options: any) => {
  // Simulate latency based on provider
  const latencyMap: Record<string, number> = {
    'deepseek': 100,
    'anthropic': 500,
    'openai': 200,
    'gemini': 300
  };
  
  const latency = latencyMap[options.provider] || 1000;
  await new Promise(resolve => setTimeout(resolve, latency));
  
  return {
    text: `Response from ${options.provider}`,
    tokens: 100
  };
};

async function runTest() {
  console.log('Starting Phase 4 Verification: Q-Learning Integration');
  
  const scorecard = getProviderScorecard();
  // Reset scorecard for clean state
  scorecard['metrics'].clear();
  
  const router = new SmartRouter(scorecard);
  const optimizer = getQLearningOptimizer();
  
  // Scenario: Coding Task for Developer Segment
  // We want to see if the system learns to prefer 'deepseek' (fastest in our mock)
  
  const prompt = "Write a Python function to calculate Fibonacci sequence";
  const segment = "developer";
  
  console.log(`\n--- Training Loop: ${prompt} [${segment}] ---`);
  
  for (let i = 1; i <= 5; i++) {
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
