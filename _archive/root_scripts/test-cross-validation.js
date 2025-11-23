#!/usr/bin/env node

/**
 * Cross-Validation Feature Test
 * Demonstrates provider cross-validation in action
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:3000';
const TEST_TIMEOUT = 60000; // 60 seconds

// Test cases
const testQueries = [
  {
    question: "What are the key differences between machine learning and deep learning?",
    category: "technical-education",
    providers: ["anthropic", "openai", "gemini"]
  },
  {
    question: "How can I optimize my learning process for maximum retention?",
    category: "meta-learning",
    providers: ["anthropic", "openai"]
  },
  {
    question: "Explain the concept of emergence in complex systems",
    category: "systems-thinking",
    providers: ["anthropic", "openai", "gemini"]
  }
];

async function testCrossValidation() {
  console.log('🚀 TooLoo.ai Cross-Validation Feature Test\n');
  console.log('=' .repeat(60));

  for (const test of testQueries) {
    await runTest(test);
    console.log('\n' + '='.repeat(60) + '\n');
  }

  console.log('✅ All tests completed!\n');
}

async function runTest(test) {
  console.log(`\n📝 Test: ${test.category}`);
  console.log(`❓ Question: "${test.question}"\n`);
  console.log(`🔍 Validating with providers: ${test.providers.join(', ')}\n`);

  try {
    const startTime = Date.now();
    
    const response = await fetch(`${BASE_URL}/api/v1/chat/cross-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: TEST_TIMEOUT,
      body: JSON.stringify({
        message: test.question,
        providers: test.providers
      })
    });

    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      const error = await response.json();
      console.error(`Details: ${error.detail || error.error}`);
      return;
    }

    const result = await response.json();
    const report = result.validationReport;

    // Display results
    console.log(`✓ Validation Complete (${elapsed}ms)\n`);

    // Provider Rankings
    console.log('📊 Provider Rankings:');
    (report.overallRanking || []).forEach((provider, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
      console.log(`   ${medal} ${provider.provider.toUpperCase()}: ${provider.overallScore}/100`);
      
      if (provider.criteria) {
        console.log(`      • Accuracy: ${provider.criteria.accuracy || 'N/A'}/100`);
        console.log(`      • Clarity: ${provider.criteria.clarity || 'N/A'}/100`);
        console.log(`      • Completeness: ${provider.criteria.completeness || 'N/A'}/100`);
        console.log(`      • Relevance: ${provider.criteria.relevance || 'N/A'}/100`);
      }
    });

    // Consensus
    if (report.consensusPoints && report.consensusPoints.length > 0) {
      console.log('\n✓ Consensus Strengths:');
      report.consensusPoints.forEach(point => {
        console.log(`   • ${point.point} (${point.mentions} providers agreed)`);
      });
    }

    // Conflicts
    if (report.conflictingPoints && report.conflictingPoints.length > 0) {
      console.log('\n⚠ Points for Improvement:');
      report.conflictingPoints.forEach(point => {
        console.log(`   • ${point.point} (${point.mentions} providers noted)`);
      });
    }

    // Quality Score
    console.log(`\n📈 Overall Synthesis Quality Score: ${report.synthesisScore}/100`);

    // Show synthesis if available
    if (report.recommendations && report.recommendations.synthesized) {
      console.log('\n🤝 Synthesized Response:');
      const synthesis = report.recommendations.synthesized;
      console.log(`   ${synthesis.substring(0, 200)}...`);
    }

  } catch (error) {
    console.error(`❌ Test Failed: ${error.message}`);
  }
}

async function testInsights() {
  console.log('\n📊 Fetching Cross-Validation Insights...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/chat/cross-validate/insights`);
    
    if (!response.ok) {
      console.error(`API Error: ${response.status}`);
      return;
    }

    const result = await response.json();
    const insights = result.insights;

    console.log(`Total Validations Performed: ${insights.totalValidations}`);
    console.log(`Average Synthesis Score: ${insights.averageSynthesisScore}/100`);
    
    if (Object.keys(insights.providerPatterns).length > 0) {
      console.log('\nProvider Pattern History:');
      for (const [pattern, data] of Object.entries(insights.providerPatterns)) {
        console.log(`   ${pattern}: ${data.validations} validations (avg score: ${data.averageSynthesisScore})`);
      }
    }
  } catch (error) {
    console.error(`Failed to fetch insights: ${error.message}`);
  }
}

// Main execution
console.log('\n🔄 Connecting to TooLoo.ai...');
console.log(`Base URL: ${BASE_URL}`);

// Check if server is running
try {
  const healthCheck = await fetch(`${BASE_URL}/health`, { timeout: 5000 });
  if (healthCheck.ok) {
    console.log('✓ Server is running\n');
    await testCrossValidation();
    await testInsights();
  } else {
    console.error('❌ Server returned non-200 status');
    process.exit(1);
  }
} catch (error) {
  console.error(`❌ Cannot connect to server: ${error.message}`);
  console.error(`   Make sure TooLoo.ai is running on ${BASE_URL}`);
  console.error(`   Run: npm run dev`);
  process.exit(1);
}
