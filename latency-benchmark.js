#!/usr/bin/env node
/**
 * TooLoo.ai Latency Optimization Benchmark
 * Measures performance gaps and identifies optimization opportunities
 * Focus: Response time, throughput, cost
 */

import http from 'http';
import fs from 'fs';

const BRIDGE_URL = 'http://localhost:3010';

// Fast, real-world prompts (30-50 tokens typically)
const TASKS = {
  reasoning: {
    prompt: 'If all roses are flowers and some flowers are red, what can we conclude about roses?',
    category: 'Logic',
    expectedLatency: 1500 // baseline
  },
  coding: {
    prompt: 'Write a function to reverse a string in JavaScript. Keep it concise.',
    category: 'Code',
    expectedLatency: 2000
  },
  creative: {
    prompt: 'Describe a sunset in 2 sentences.',
    category: 'Creative',
    expectedLatency: 1500
  },
  summary: {
    prompt: 'Summarize: Machine learning uses algorithms to learn patterns from data without explicit programming.',
    category: 'Analysis',
    expectedLatency: 1200
  }
};

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      message: message,
      conversationHistory: []
    });

    const options = {
      hostname: 'localhost',
      port: 3010,
      path: '/api/v1/chat/message',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            response: parsed.response,
            provider: parsed.provider,
            tokens: parsed.tokens || 0,
            statusCode: res.statusCode
          });
        } catch (e) {
          reject(new Error(`Parse error: ${data.substring(0, 80)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout (>15s)'));
    });

    req.write(postData);
    req.end();
  });
}

async function runTask(taskName, config) {
  process.stdout.write(`\n🎯 ${taskName.toUpperCase()} (${config.category})\n`);
  process.stdout.write(`   Prompt: "${config.prompt}"\n`);

  const startTime = Date.now();
  try {
    const result = await sendMessage(config.prompt);
    const latency = Date.now() - startTime;
    const responseLength = result.response.length;
    const words = result.response.split(/\s+/).length;
    const charsPerMs = responseLength / latency;
    const delta = latency - config.expectedLatency;
    const deltaPercent = Math.round((delta / config.expectedLatency) * 100);

    console.log(`   ✅ ${result.provider}`);
    console.log(`   ⏱️  Latency: ${latency}ms (expected: ${config.expectedLatency}ms, ${deltaPercent > 0 ? '+' : ''}${deltaPercent}%)`);
    console.log(`   📊 Response: ${words} words, ${responseLength} chars (${charsPerMs.toFixed(2)} c/ms throughput)`);
    console.log(`   💾 Tokens: ${result.tokens}`);
    console.log(`   Preview: "${result.response.substring(0, 60)}..."`);

    return { latency, words, tokens: result.tokens, delta, status: 'success' };
  } catch (err) {
    const latency = Date.now() - startTime;
    console.log(`   ❌ ${err.message} (${latency}ms)`);
    return { latency, words: 0, tokens: 0, delta: 0, status: 'error', error: err.message };
  }
}

async function runBenchmark() {
  console.clear();
  console.log('🚀 TooLoo.ai Latency Optimization Benchmark');
  console.log('==============================================\n');
  console.log('Focus: Fast responses using Claude Haiku 4.5');
  console.log('Goal: Sub-3s latency for reasoning, sub-2s for creative\n');

  const results = {};
  let totalLatency = 0;
  let totalTokens = 0;
  let successCount = 0;
  const startBenchmark = Date.now();

  for (const [taskName, config] of Object.entries(TASKS)) {
    const result = await runTask(taskName, config);
    results[taskName] = result;
    totalLatency += result.latency;
    totalTokens += result.tokens;
    if (result.status === 'success') successCount++;
    await new Promise(r => setTimeout(r, 300)); // Rate limit
  }

  const totalTime = Date.now() - startBenchmark;

  // Summary
  console.log('\n\n==============================================');
  console.log('📊 LATENCY BENCHMARK RESULTS');
  console.log('==============================================\n');

  const avgLatency = Math.round(totalLatency / Object.keys(TASKS).length);
  const successRate = Math.round((successCount / Object.keys(TASKS).length) * 100);

  console.log(`✅ Success Rate: ${successRate}% (${successCount}/${Object.keys(TASKS).length})`);
  console.log(`⏱️  Average Latency: ${avgLatency}ms`);
  console.log(`📈 Total Tokens: ${totalTokens}`);
  console.log(`⚡ Total Benchmark Time: ${totalTime}ms\n`);

  // Performance grade
  let latencyGrade = 'F';
  if (avgLatency <= 1500) latencyGrade = 'A+ (Excellent)';
  else if (avgLatency <= 2000) latencyGrade = 'A (Great)';
  else if (avgLatency <= 2500) latencyGrade = 'B (Good)';
  else if (avgLatency <= 3500) latencyGrade = 'C (Fair)';
  else if (avgLatency <= 5000) latencyGrade = 'D (Slow)';

  console.log(`📌 Latency Grade: ${latencyGrade}`);

  // Cost analysis (rough estimate)
  const costPerMTok = 0.80; // Anthropic Haiku input cost
  const estimatedCost = (totalTokens / 1000000) * costPerMTok;
  console.log(`💰 Estimated Cost (input): $${estimatedCost.toFixed(6)}`);

  // Optimization opportunities
  console.log('\n\n🔧 OPTIMIZATION OPPORTUNITIES:\n');

  const slowTasks = Object.entries(results)
    .filter(([_, r]) => r.status === 'success' && r.delta > 0)
    .sort((a, b) => b[1].delta - a[1].delta);

  if (slowTasks.length > 0) {
    console.log('⚠️  Slower than expected:');
    slowTasks.forEach(([name, result]) => {
      console.log(`   • ${name}: +${result.delta}ms (consider prompt optimization)`);
    });
  } else {
    console.log('✅ All tasks within expected latency!');
  }

  console.log('\n💡 Quick Wins:');
  console.log('   1. Connection pooling (reuse HTTP sockets) → -20% latency');
  console.log('   2. Response streaming → -15% perceived latency');
  console.log('   3. Cache common queries → -80% for repeats');
  console.log('   4. Shorter system prompts → -10% latency');

  // Save results
  fs.writeFileSync(
    '/workspaces/TooLoo.ai/latency-benchmark-results.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      avgLatency,
      totalTokens,
      successRate,
      estimatedCost,
      grade: latencyGrade,
      results: Object.entries(results).map(([name, data]) => ({
        task: name,
        ...data
      }))
    }, null, 2)
  );

  console.log('\n📁 Results saved to latency-benchmark-results.json');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
