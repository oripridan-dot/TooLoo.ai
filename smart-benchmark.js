#!/usr/bin/env node
/**
 * TooLoo.ai Smart Provider Routing Benchmark
 * Tests intelligent task-aware provider selection
 * Scores improvements vs baseline
 */

import http from 'http';
import fs from 'fs';

const BRIDGE_URL = 'http://localhost:3010';

// Benchmark tasks with expected providers
const TASKS = {
  reasoning: {
    prompt: 'Solve this logic puzzle: A father is three times as old as his son. In 15 years, he will be twice as old. How old are they now?',
    expectedProvider: 'Claude 3.5 Haiku',
    keywords: ['3x', '2x', 'father', 'son', '45', '15', 'equation'],
    maxTokens: 200
  },
  coding: {
    prompt: 'Write an optimized function to find the first duplicate element in an unsorted array. Explain the time complexity.',
    expectedProvider: 'Claude 3.5 Haiku',
    keywords: ['Set', 'O(n)', 'hash', 'duplicate', 'linear', 'first', 'optimal'],
    maxTokens: 300
  },
  creative: {
    prompt: 'Write a short, vivid paragraph about a moment of realization or epiphany. Make it poetic and emotionally resonant.',
    expectedProvider: 'Claude 3.5 Haiku',
    keywords: ['sudden', 'understood', 'clarity', 'moment', 'realized', 'dawn', 'struck', 'vivid', 'poetic'],
    maxTokens: 200
  },
  analysis: {
    prompt: 'Analyze the impact of AI adoption on job markets. What sectors face disruption and which gain opportunities?',
    expectedProvider: 'Claude 3.5 Haiku',
    keywords: ['automation', 'displacement', 'new roles', 'skills', 'sector', 'impact', 'opportunity', 'disruption'],
    maxTokens: 400
  }
};

function scoreResponse(text, task) {
  if (!text || text.length < 10) return 0;

  let score = 0;

  // Keywords presence (up to 40 points)
  const lowerText = text.toLowerCase();
  const keywordMatches = task.keywords.filter(kw => lowerText.includes(kw.toLowerCase())).length;
  score += Math.min(40, (keywordMatches / task.keywords.length) * 40);

  // Response length (up to 30 points)
  const wordCount = text.split(/\s+/).length;
  const expectedWords = task.maxTokens / 1.3;
  const lengthScore = Math.min(30, (wordCount / (expectedWords * 1.5)) * 30);
  score += lengthScore;

  // Reasoning indicators (up to 30 points)
  const reasoningPhrases = ['because', 'therefore', 'however', 'furthermore', 'thus', 'demonstrates', 'example'];
  const reasoningMatches = reasoningPhrases.filter(p => lowerText.includes(p)).length;
  score += Math.min(30, (reasoningMatches / reasoningPhrases.length) * 30);

  return Math.round(score);
}

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
      timeout: 30000
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
            taskType: parsed.taskType,
            tokens: parsed.tokens || 0,
            statusCode: res.statusCode
          });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.substring(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

async function runTask(taskName, taskConfig) {
  process.stdout.write(`\n📋 ${taskName.toUpperCase()}\n`);
  process.stdout.write(`   Expected: ${taskConfig.expectedProvider}\n`);
  process.stdout.write(`   Prompt: ${taskConfig.prompt.substring(0, 60)}...\n`);

  const startTime = Date.now();
  try {
    const result = await sendMessage(taskConfig.prompt);
    const latency = Date.now() - startTime;

    if (result.statusCode !== 200 || !result.response) {
      console.log(`   ❌ Error (${result.statusCode}): Failed to get response`);
      return { score: 0, latency, provider: 'error', taskType: taskName, matchExpected: false, tokens: 0 };
    }

    const score = scoreResponse(result.response, taskConfig);
    const provider = result.provider || 'unknown';
    const taskType = result.taskType || 'unknown';
    const matchExpected = provider === taskConfig.expectedProvider;
    const tokens = result.tokens || 0;

    console.log(`   ✅ Actual: ${provider}`);
    console.log(`   ${matchExpected ? '🎯' : '❌'} Provider Match: ${matchExpected ? 'YES' : 'NO'}`);
    console.log(`   📊 Score: ${score}/100 | Latency: ${latency}ms | Tokens: ${tokens}`);
    const preview = result.response.substring(0, 100).replace(/\n/g, ' ');
    console.log(`   Response: ${preview}...`);

    return { score, latency, provider, taskType, matchExpected, tokens };
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return { score: 0, latency: Date.now() - startTime, provider: 'error', taskType: taskName, matchExpected: false, tokens: 0 };
  }
}

async function runBenchmark() {
  console.clear();
  console.log('🚀 TooLoo.ai Smart Provider Routing Benchmark');
  console.log('=================================================\n');

  const results = {};
  let totalScore = 0;
  let totalLatency = 0;
  let taskCount = 0;
  let correctProviders = 0;

  for (const [taskName, taskConfig] of Object.entries(TASKS)) {
    const result = await runTask(taskName, taskConfig);
    results[taskName] = result;
    totalScore += result.score;
    totalLatency += result.latency;
    if (result.matchExpected) correctProviders++;
    taskCount++;
    await new Promise(r => setTimeout(r, 500));
  }

  // Summary
  console.log('\n\n=================================================');
  console.log('📊 BENCHMARK RESULTS');
  console.log('=================================================\n');

  const avgScore = Math.round(totalScore / taskCount);
  const avgLatency = Math.round(totalLatency / taskCount);
  const providerAccuracy = Math.round((correctProviders / taskCount) * 100);

  console.log(`🎯 Average Quality Score: ${avgScore}/100`);
  console.log(`⏱️  Average Latency: ${avgLatency}ms`);
  console.log(`🎪 Provider Routing Accuracy: ${providerAccuracy}% (${correctProviders}/${taskCount} correct)`);
  console.log(`📈 Total Tasks: ${taskCount}\n`);

  let grade = 'F';
  if (avgScore >= 90) grade = 'A+';
  else if (avgScore >= 85) grade = 'A';
  else if (avgScore >= 80) grade = 'B+';
  else if (avgScore >= 75) grade = 'B';
  else if (avgScore >= 70) grade = 'C+';
  else if (avgScore >= 60) grade = 'C';
  else if (avgScore >= 50) grade = 'D';

  console.log(`📌 Grade: ${grade}`);
  console.log('\n📁 Results saved to smart-benchmark-results.json');

  // Save results
  fs.writeFileSync(
    '/workspaces/TooLoo.ai/smart-benchmark-results.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      avgScore,
      avgLatency,
      providerAccuracy,
      grade,
      results: Object.entries(results).map(([name, data]) => ({
        task: name,
        score: data.score,
        latency: data.latency,
        provider: data.provider,
        expectedProvider: TASKS[name].expectedProvider,
        taskType: data.taskType,
        matchExpected: data.matchExpected,
        tokens: data.tokens
      }))
    }, null, 2)
  );

  // Comparison vs baseline
  console.log('\n\n=================================================');
  console.log('📈 vs Previous Benchmark (28/100 reference)');
  console.log('=================================================\n');
  console.log(`Score Improvement: +${avgScore - 28} points (${Math.round(((avgScore - 28) / 28) * 100)}% boost)`);
  console.log(`Provider Routing: NEW (${providerAccuracy}% accuracy)`);
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
