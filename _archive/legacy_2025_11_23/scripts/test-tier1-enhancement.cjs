#!/usr/bin/env node
// Test script for Tier 1 Knowledge Enhancement

const Tier1KnowledgeEnhancement = require('./engines/tier1-knowledge-enhancement.cjs');

async function main() {
  console.log('\n🧪 TIER 1 KNOWLEDGE ENHANCEMENT TEST SUITE\n');

  const enhancement = new Tier1KnowledgeEnhancement();

  try {
    // Test 1: Activate all engines
    console.log('TEST 1: Activate all Tier 1 engines');
    console.log('═'.repeat(80));
    const activationResult = await enhancement.activateAllTier1Engines();
    console.log('\n✅ Activation successful\n');

    // Test 2: Get knowledge base status
    console.log('\nTEST 2: Get comprehensive knowledge base status');
    console.log('═'.repeat(80));
    const status = await enhancement.getKnowledgeBaseStatus();
    console.log(JSON.stringify(status, null, 2));
    console.log('✅ Status retrieved\n');

    // Test 3: Test record and learn
    console.log('\nTEST 3: Test conversation recording and learning');
    console.log('═'.repeat(80));
    const testConversation = {
      id: 'test_conv_001',
      messages: [
        {
          role: 'user',
          content: 'How do I optimize API performance?'
        },
        {
          role: 'assistant',
          content: `**Key optimization strategies:**
- Cache frequently accessed data (Redis, memcached)
- Use database query optimization and indexes
- Implement rate limiting and load balancing
- Monitor response times with APM tools
- Profile bottlenecks with flame graphs`
        },
        {
          role: 'user',
          content: 'This is really helpful, thank you!'
        }
      ],
      topic: 'api-performance',
      outcome: { success: true, helpfulness: 'high' },
      quality: 'success'
    };

    const recordResult = await enhancement.recordAndLearn(testConversation);
    console.log('Record and Learn Result:');
    console.log(JSON.stringify(recordResult, null, 2));
    console.log('✅ Conversation recorded and learning applied\n');

    // Test 4: Get sources for weak area
    console.log('\nTEST 4: Get sources for weak area');
    console.log('═'.repeat(80));
    const weakAreaSources = await enhancement.getSourcesForWeakArea('Performance Optimization');
    console.log(`Found ${weakAreaSources.sources.length} sources for weak area`);
    console.log('Top sources:');
    weakAreaSources.sources.slice(0, 3).forEach((source, i) => {
      console.log(`  ${i + 1}. ${source.title} (Authority: ${source.authority.toFixed(2)})`);
    });
    console.log('✅ Sources retrieved\n');

    // Test 5: Get comprehensive report
    console.log('\nTEST 5: Get comprehensive knowledge enhancement report');
    console.log('═'.repeat(80));
    const report = enhancement.getComprehensiveReport();
    console.log(JSON.stringify(report, null, 2));
    console.log('✅ Report generated\n');

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('🎉 TIER 1 KNOWLEDGE ENHANCEMENT TEST SUITE COMPLETE');
    console.log('═'.repeat(80));
    console.log('\nNext Steps:');
    console.log('1. Integrate API endpoints in web-server.js');
    console.log('2. Connect conversation hooks to actual chat system');
    console.log('3. Set up periodic benchmark monitoring');
    console.log('4. Enable source fetching and content synthesis');
    console.log('\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().then(() => {
  console.log('✅ All tests completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});
