#!/usr/bin/env node
/**
 * TooLoo.ai Live Provider Benchmark
 * Real-world performance testing against Claude, GPT-4, DeepSeek, Ollama
 * Measures: quality, latency, cost
 */

import http from 'http';
import fs from 'fs';

const BRIDGE_URL = 'http://localhost:3010';

// Benchmark tasks (real, substantive prompts)
const TASKS = {
  reasoning: {
    prompt: 'Solve this logic puzzle: A father is three times as old as his son. In 15 years, he will be twice as old. How old are they now?',
    keywords: ['3x', '2x', 'father', 'son', '45', '15', 'equation'],
    maxTokens: 200
  },
  coding: {
    prompt: 'Write an optimized function to find the first duplicate element in an unsorted array. Explain the time complexity.',
    keywords: ['Set', 'O(n)', 'hash', 'duplicate', 'linear', 'first', 'optimal'],
    maxTokens: 300
  },
  creative: {
    prompt: 'Write a short, vivid paragraph about a moment of realization or epiphany.',
    keywords: ['sudden', 'understood', 'clarity', 'moment', 'realized', 'dawn', 'struck'],
    maxTokens: 150
  },
  analysis: {
    prompt: 'Analyze the impact of AI adoption on job markets. What sectors face disruption and which gain opportunities?',
    keywords: ['automation', 'displacement', 'new roles', 'skills', 'sector', 'impact', 'opportunity'],
    maxTokens: 400
  }
};

// Scoring logic
function scoreResponse(text, task) {
  if (!text || text.length < 10) return 0;

  let score = 0;

  // Keywords presence (up to 40 points)
  const lowerText = text.toLowerCase();
  const keywordMatches = task.keywords.filter(kw => lowerText.includes(kw.toLowerCase())).length;
  score += Math.min(40, (keywordMatches / task.keywords.length) * 40);

  // Response length (up to 30 points)
  const wordCount = text.split(/\s+/).length;
  const expectedWords = task.maxTokens / 1.3; // rough token-to-word ratio
  const lengthScore = Math.min(30, (wordCount / (expectedWords * 1.5)) * 30);
  score += lengthScore;

  // Reasoning indicators (up to 30 points)
  const reasoningPhrases = ['because', 'therefore', 'however', 'furthermore', 'thus', 'demonstrates', 'example'];
  const reasoningMatches = reasoningPhrases.filter(p => lowerText.includes(p)).length;
  score += Math.min(30, (reasoningMatches / reasoningPhrases.length) * 30);

  return Math.round(score);
}

// Send request to chat bridge
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

// Run a single task
async function runTask(taskName, taskConfig) {
  process.stdout.write(`\n📋 ${taskName.toUpperCase()}\n`);
  process.stdout.write(`   Prompt: ${taskConfig.prompt.substring(0, 60)}...\n`);

  const startTime = Date.now();
  try {
    const result = await sendMessage(taskConfig.prompt);
    const latency = Date.now() - startTime;

    if (result.statusCode !== 200) {
      console.log(`   ❌ Error (${result.statusCode}): ${result.response.substring(0, 100)}`);
      return { score: 0, latency, provider: 'error', tokens: 0 };
    }

    const score = scoreResponse(result.response, taskConfig);
    const provider = result.provider || 'unknown';
    const tokens = result.tokens || 0;

    console.log(`   ✅ Provider: ${provider}`);
    console.log(`   📊 Score: ${score}/100 | Latency: ${latency}ms | Tokens: ${tokens}`);
    console.log(`   Response: ${result.response.substring(0, 100)}...`);

    return { score, latency, provider, tokens };
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return { score: 0, latency: Date.now() - startTime, provider: 'error', tokens: 0 };
  }
}

// Main benchmark
async function runBenchmark() {
  console.clear();
  console.log('🚀 TooLoo.ai Live Provider Benchmark');
  console.log('=====================================\n');

  const results = {};
  let totalScore = 0;
  let totalLatency = 0;
  let taskCount = 0;

  for (const [taskName, taskConfig] of Object.entries(TASKS)) {
    const result = await runTask(taskName, taskConfig);
    results[taskName] = result;
    totalScore += result.score;
    totalLatency += result.latency;
    taskCount++;
    await new Promise(r => setTimeout(r, 500)); // Rate limit
  }

  // Summary
  console.log('\n\n=====================================');
  console.log('📊 BENCHMARK RESULTS');
  console.log('=====================================\n');

  const avgScore = Math.round(totalScore / taskCount);
  const avgLatency = Math.round(totalLatency / taskCount);

  console.log(`🎯 Average Quality Score: ${avgScore}/100`);
  console.log(`⏱️  Average Latency: ${avgLatency}ms`);
  console.log(`📈 Total Tasks: ${taskCount}\n`);

  let grade = 'F';
  if (avgScore >= 90) grade = 'A+';
  else if (avgScore >= 85) grade = 'A';
  else if (avgScore >= 80) grade = 'B+';
  else if (avgScore >= 75) grade = 'B';
  else if (avgScore >= 70) grade = 'C+';
  else if (avgScore >= 60) grade = 'C';
  else if (avgScore >= 50) grade = 'D';

  console.log(`Grade: ${grade}`);
  console.log('\n📁 Results saved to live-benchmark-results.json');

  // Save results
  fs.writeFileSync(
    '/workspaces/TooLoo.ai/live-benchmark-results.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      avgScore,
      avgLatency,
      grade,
      tasks: results
    }, null, 2)
  );
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
