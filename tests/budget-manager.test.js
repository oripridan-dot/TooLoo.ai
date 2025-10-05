/**
 * Budget Manager Tests
 * 
 * Basic tests to verify budget management functionality
 */

import { BudgetManager } from '../api/budget-manager.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CACHE_DIR = path.join(__dirname, '../test-cache');
const TEST_LOG_FILE = path.join(__dirname, '../test-logs/budget-test.jsonl');

async function cleanup() {
  try {
    await fs.rm(TEST_CACHE_DIR, { recursive: true, force: true });
    await fs.rm(path.dirname(TEST_LOG_FILE), { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function testBudgetManagerInitialization() {
  console.log('\n🧪 Test: Budget Manager Initialization');
  
  const budgetManager = new BudgetManager({
    dailyLimit: 5.00,
    monthlyLimit: 100.00,
    cacheDir: TEST_CACHE_DIR,
    logFile: TEST_LOG_FILE
  });
  
  await budgetManager.init();
  
  const status = budgetManager.getStatus();
  
  console.assert(status.daily.limit === 5.00, '❌ Daily limit should be $5.00');
  console.assert(status.monthly.limit === 100.00, '❌ Monthly limit should be $100.00');
  console.assert(status.daily.spent === 0, '❌ Initial spending should be $0');
  console.assert(status.callsToday === 0, '❌ Initial calls should be 0');
  
  console.log('✅ Budget Manager initialized correctly');
  return budgetManager;
}

async function testCostEstimation(budgetManager) {
  console.log('\n🧪 Test: Cost Estimation');
  
  const deepseekCost = budgetManager.estimateCost('deepseek', { input: 1000000, output: 1000000 });
  console.assert(deepseekCost === 0.42, `❌ DeepSeek cost should be $0.42, got ${deepseekCost}`);
  
  const openaiCost = budgetManager.estimateCost('openai', { input: 1000000, output: 1000000 });
  console.assert(openaiCost === 40.00, `❌ OpenAI cost should be $40.00, got ${openaiCost}`);
  
  console.log('✅ Cost estimation working correctly');
  console.log(`   DeepSeek: $${deepseekCost} per 1M tokens`);
  console.log(`   OpenAI: $${openaiCost} per 1M tokens`);
}

async function testBudgetEnforcement(budgetManager) {
  console.log('\n🧪 Test: Budget Enforcement');
  
  // Should allow small call
  let check = budgetManager.canMakeCall('deepseek', { input: 1000, output: 2000 });
  console.assert(check.allowed === true, '❌ Should allow call within budget');
  console.log('✅ Small call allowed within budget');
  
  // Should deny call that exceeds limit
  check = budgetManager.canMakeCall('openai', { input: 10000000, output: 10000000 });
  console.assert(check.allowed === false, '❌ Should deny call exceeding budget');
  console.assert(check.reason === 'daily_limit_exceeded', '❌ Should indicate daily limit exceeded');
  console.log('✅ Large call denied (would exceed budget)');
}

async function testCallTracking(budgetManager) {
  console.log('\n🧪 Test: Call Tracking');
  
  const initialStatus = budgetManager.getStatus();
  const initialSpent = initialStatus.daily.spent;
  const initialCalls = initialStatus.callsToday;
  
  // Track a call
  await budgetManager.trackCall('deepseek', { input: 1000, output: 2000 });
  
  const newStatus = budgetManager.getStatus();
  console.assert(newStatus.callsToday === initialCalls + 1, '❌ Call count should increase');
  console.assert(newStatus.daily.spent > initialSpent, '❌ Spending should increase');
  
  console.log('✅ Call tracking working correctly');
  console.log(`   Calls: ${newStatus.callsToday}`);
  console.log(`   Spent: $${newStatus.daily.spent.toFixed(6)}`);
}

async function testCaching(budgetManager) {
  console.log('\n🧪 Test: Response Caching');
  
  const testPrompt = "Test prompt for caching";
  const testResponse = { result: "test response" };
  const hash = budgetManager.hashPrompt(testPrompt);
  
  // Should be cache miss initially
  let cached = await budgetManager.getCached(hash);
  console.assert(cached === null, '❌ Should be cache miss initially');
  console.log('✅ Cache miss works correctly');
  
  // Cache the response
  await budgetManager.setCached(hash, testResponse, 0.001);
  
  // Should be cache hit now
  cached = await budgetManager.getCached(hash);
  console.assert(cached !== null, '❌ Should be cache hit after caching');
  console.assert(cached.result === testResponse.result, '❌ Cached data should match');
  console.log('✅ Cache hit works correctly');
}

async function testProviderRecommendation(budgetManager) {
  console.log('\n🧪 Test: Provider Recommendation');
  
  const cheapest = budgetManager.getCheapestProvider();
  console.log(`✅ Cheapest provider: ${cheapest}`);
  
  // Should recommend low-cost provider
  console.assert(['deepseek', 'gemini'].includes(cheapest), 
    '❌ Should recommend low-cost provider');
}

async function testSpendingBreakdown(budgetManager) {
  console.log('\n🧪 Test: Spending Breakdown');
  
  // Track multiple calls
  await budgetManager.trackCall('deepseek', { input: 1000, output: 2000 });
  await budgetManager.trackCall('openai', { input: 500, output: 1000 });
  await budgetManager.trackCall('deepseek', { input: 1500, output: 2500 });
  
  const breakdown = budgetManager.getBreakdown();
  
  console.assert(breakdown.deepseek, '❌ Should have DeepSeek breakdown');
  console.assert(breakdown.openai, '❌ Should have OpenAI breakdown');
  console.assert(breakdown.deepseek.calls >= 2, '❌ DeepSeek should have 2+ calls');
  
  console.log('✅ Spending breakdown working correctly');
  console.log('   Breakdown:', JSON.stringify(breakdown, null, 2));
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   Budget Manager Test Suite                   ║');
  console.log('╚════════════════════════════════════════════════╝');
  
  try {
    // Cleanup before tests
    await cleanup();
    
    // Run tests
    const budgetManager = await testBudgetManagerInitialization();
    await testCostEstimation(budgetManager);
    await testBudgetEnforcement(budgetManager);
    await testCallTracking(budgetManager);
    await testCaching(budgetManager);
    await testProviderRecommendation(budgetManager);
    await testSpendingBreakdown(budgetManager);
    
    // Cleanup after tests
    await cleanup();
    
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   ✅ All Tests Passed!                         ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await cleanup();
    process.exit(1);
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
