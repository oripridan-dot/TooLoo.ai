#!/usr/bin/env node

// Auto-teach analysis script
import { AutoTeachSystem } from '../api/auto-teach/auto-teach.js';
import path from 'path';
import fs from 'fs';

async function runAutoTeach() {
  console.log('🧠 TooLoo.ai Auto-Teach System');
  
  const autoTeach = new AutoTeachSystem();
  
  // Find the latest benchmark results
  const runsDir = './datasets/runs';
  const runs = fs.readdirSync(runsDir)
    .filter(f => f.startsWith('run_'))
    .map(f => ({
      name: f,
      timestamp: parseInt(f.replace('run_', '')),
      path: path.join(runsDir, f)
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
  
  if (runs.length === 0) {
    console.error('❌ No benchmark results found. Run benchmark first.');
    process.exit(1);
  }
  
  const latestRun = runs[0];
  console.log(`📊 Analyzing latest run: ${latestRun.name}`);
  
  try {
    const analysis = await autoTeach.analyzeBenchmarkResults(latestRun.path);
    
    console.log(`\n📈 Analysis Results:`);
    console.log(`- Current Accuracy: ${analysis.accuracy.toFixed(1)}%`);
    console.log(`- Failures Analyzed: ${analysis.failures}`);
    console.log(`- Rules Generated: ${analysis.rules}`);
    
    if (analysis.recommendations.length > 0) {
      console.log(`\n🎯 Recommendations:`);
      analysis.recommendations.forEach((rec, i) => {
        console.log(`  ${i+1}. [${rec.priority.toUpperCase()}] ${rec.action}`);
        console.log(`     Reasoning: ${rec.reasoning}`);
        console.log(`     Impact: ${rec.impact}`);
      });
      
      // Apply recommendations
      console.log(`\n🔧 Applying recommendations...`);
      await autoTeach.applyRecommendations(analysis.recommendations);
      
      console.log(`\n🚀 Ready for next benchmark run!`);
      console.log(`   Run: npm run benchmark:basic`);
    } else {
      console.log(`\n✅ No recommendations needed - system performing well!`);
    }
    
  } catch (error) {
    console.error('❌ Auto-teach failed:', error.message);
    process.exit(1);
  }
}

runAutoTeach();