/**
 * End-to-End Test: Scanner → Analysis → Infographics
 * Tests the complete pipeline from prompt analysis to visualization
 */

// Test prompts with various quality issues
const testPrompts = {
  low_quality: `Please tell me how to get better at coding. I really think it's very important to learn more stuff about programming because it's good for your career. Can you show me some ways to do this? I want to understand more about the different languages and frameworks and how they work. It would be nice if you could help me with this because I'm not sure where to start. Thanks.`,
  
  medium_quality: `I need to improve my programming skills. What are the key areas I should focus on? I'm particularly interested in learning different programming languages and understanding software architecture. Can you provide a structured learning path?`,
  
  high_quality: `Create a structured 12-week learning curriculum for intermediate JavaScript developers transitioning to TypeScript and modern React patterns. Include: (1) Core TypeScript concepts with concrete examples, (2) React 18+ hooks and concurrent rendering, (3) State management patterns, (4) Performance optimization techniques. Success metrics: developer can architect and implement a production-grade React application with proper typing.`
};

console.log('🧪 Scanner E2E Test Suite');
console.log('='.repeat(60));

// Test 1: Low quality prompt
console.log('\n📋 TEST 1: Low Quality Prompt');
console.log('-'.repeat(60));
console.log('Prompt:', testPrompts.low_quality.substring(0, 100) + '...');

try {
  // This would be loaded in browser context
  if (typeof window !== 'undefined' && window.RefineryEngine) {
    console.log('✅ RefineryEngine loaded');
    
    const engine = new window.RefineryEngine();
    const analysis = engine.analyze(testPrompts.low_quality);
    
    console.log('\n📊 Analysis Results:');
    console.log('  • Overall Score:', analysis.impactScore.toFixed(2));
    console.log('  • Keywords Found:', analysis.keywords.length);
    console.log('  • Refinements:', analysis.refinements.length);
    console.log('  • Grouped Issues:', Object.keys(analysis.groupedRefinements).length, 'categories');
    console.log('  • Issue Analysis:', Object.keys(analysis.issueAnalysis).length, 'categories analyzed');
    
    console.log('\n🎯 Grouped Issues:');
    Object.entries(analysis.issueAnalysis).forEach(([cat, data]) => {
      console.log(`  • ${data.category}: ${data.count} issue(s)`);
      console.log(`    Root Cause: ${data.description}`);
      console.log(`    Consequence: ${data.consequences.immediate}`);
    });
    
    console.log('\n✨ Top 3 Refinements:');
    analysis.refinements.slice(0, 3).forEach((ref, idx) => {
      console.log(`  ${idx + 1}. "${ref.originalKeyword}" → "${ref.suggestedWord}"`);
      console.log(`     Impact: +${ref.estimatedImprovement.toFixed(1)}`);
    });
    
  } else {
    console.log('⚠️  RefineryEngine not available in this context');
  }
} catch (error) {
  console.error('❌ Test 1 failed:', error.message);
}

// Test 2: High quality prompt
console.log('\n📋 TEST 2: High Quality Prompt');
console.log('-'.repeat(60));
console.log('Prompt:', testPrompts.high_quality.substring(0, 100) + '...');

try {
  if (typeof window !== 'undefined' && window.RefineryEngine) {
    const engine = new window.RefineryEngine();
    const analysis = engine.analyze(testPrompts.high_quality);
    
    console.log('\n📊 Analysis Results:');
    console.log('  • Overall Score:', analysis.impactScore.toFixed(2));
    console.log('  • Keywords Found:', analysis.keywords.length);
    console.log('  • Refinements:', analysis.refinements.length);
    console.log('  • Grouped Issues:', Object.keys(analysis.groupedRefinements).length, 'categories');
    
    if (analysis.refinements.length === 0) {
      console.log('\n✅ No refinements needed - prompt is well-structured!');
    } else {
      console.log('\n✨ Suggested Refinements:');
      analysis.refinements.slice(0, 3).forEach((ref, idx) => {
        console.log(`  ${idx + 1}. "${ref.originalKeyword}" → "${ref.suggestedWord}"`);
      });
    }
  }
} catch (error) {
  console.error('❌ Test 2 failed:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('🎉 E2E Test Complete!');
console.log('Next: Check infographics on port 3010');
