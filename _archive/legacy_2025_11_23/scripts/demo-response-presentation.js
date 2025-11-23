#!/usr/bin/env node

/**
 * TooLoo Response Presentation Demo Script
 * 
 * Tests the response presentation engine with sample data
 * Usage: node scripts/demo-response-presentation.js
 */

import ResponsePresentationEngine from '../engines/response-presentation-engine.js';

const engine = new ResponsePresentationEngine({
  minConsensusThreshold: 60,
  maxActionItems: 5,
  maxConflicts: 3
});

// Test Case 1: Strong Consensus
const test1 = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 1: Strong Consensus (Database Optimization)');
  console.log('='.repeat(70) + '\n');

  const presentation = await engine.presentResponse({
    query: 'How should we optimize our database performance?',
    providerResponses: {
      claude: `Start with indexing strategy. Analyze your most frequent queries and 
        add composite indexes for commonly joined fields. Monitor slow query logs 
        to identify patterns before making architectural changes. Use tools like 
        EXPLAIN to understand query execution plans.`,

      'gpt-4': `Consider query optimization first. Profile your queries to find bottlenecks, 
        then evaluate indexes, caching strategies, and denormalization. Make incremental 
        changes and measure impact at each step. Database performance requires a systematic 
        approach with proper monitoring.`,

      gemini: `The key is systematic approach. Start with baseline metrics, identify slow 
        queries, optimize queries before adding indexes, then consider architectural 
        changes like sharding if needed. Quick wins first, then evaluate bigger changes.`
    },
    userContext: { role: 'backend-engineer' }
  });

  console.log(presentation.markdown);
  console.log('\n📊 COMPONENTS:', JSON.stringify(presentation.components, null, 2).substring(0, 500));
};

// Test Case 2: Conflicting Opinions
const test2 = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 2: Conflicting Opinions (Framework Choice)');
  console.log('='.repeat(70) + '\n');

  const presentation = await engine.presentResponse({
    query: 'Should we use React or Vue for our new web application?',
    providerResponses: {
      claude: `React is the best choice due to its large ecosystem and community support. 
        The virtual DOM ensures excellent performance, and JSX provides a clear syntax. 
        However, it has a steeper learning curve and requires more setup.`,

      'gpt-4': `Vue offers a gentler learning curve with excellent documentation. It's more 
        lightweight than React and easier to get started with. Ideal if you want productive 
        development without deep JavaScript knowledge. React is better for large, complex apps.`,

      gemini: `Both are excellent frameworks with different tradeoffs. React dominates the 
        job market and has more third-party libraries. Vue is more concise and developer-friendly. 
        Choose based on team experience and project complexity. Neither is universally better.`
    },
    userContext: { role: 'product-manager' }
  });

  console.log(presentation.markdown);
  console.log('\n📊 COMPONENTS:', JSON.stringify(presentation.components, null, 2).substring(0, 500));
};

// Test Case 3: Partial Agreement
const test3 = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 3: Partial Agreement (API Design)');
  console.log('='.repeat(70) + '\n');

  const presentation = await engine.presentResponse({
    query: 'What REST API design patterns should we follow?',
    providerResponses: {
      claude: `Use RESTful conventions: nouns for resources, HTTP verbs for actions. 
        Implement proper status codes, pagination for large results, and versioning 
        in URLs or headers. Always return consistent error formats with helpful messages.`,

      'gpt-4': `Version your APIs early. Use semantic versioning and deprecation policies. 
        Implement rate limiting and authentication from the start. Consider GraphQL as 
        an alternative if your clients need flexible queries.`,

      gemini: `Focus on discoverability and documentation. Use hypermedia links to guide 
        clients. Implement proper caching headers. Consider backwards compatibility and 
        provide migration paths for breaking changes.`
    },
    userContext: { role: 'api-architect' }
  });

  console.log(presentation.markdown);
  console.log('\n📊 COMPONENTS:', JSON.stringify(presentation.components, null, 2).substring(0, 500));
};

// Test Case 4: Batch Processing
const test4 = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 4: Batch Processing');
  console.log('='.repeat(70) + '\n');

  const presentations = [
    {
      query: 'When to use TypeScript?',
      providerResponses: {
        claude: 'TypeScript adds type safety and catches errors early.',
        'gpt-4': 'Use TypeScript for large codebases with multiple developers.',
        gemini: 'TypeScript is valuable for maintainability in growing projects.'
      }
    },
    {
      query: 'Monolith or microservices?',
      providerResponses: {
        claude: 'Microservices for scale, monolith for simplicity.',
        'gpt-4': 'Start with monolith, refactor if needed.',
        gemini: 'It depends on team size and scalability needs.'
      }
    }
  ];

  console.log('Processing 2 queries...\n');
  const results = await engine.presentResponses(presentations);
  
  results.forEach((result, i) => {
    console.log(`\n--- Query ${i + 1} Consensus Level: ${result.metadata.consensusLevel}%`);
    console.log(`Consensus Points: ${result.components.consensus.length}`);
    console.log(`Conflicts: ${result.components.conflicts.length}`);
    console.log(`Actions: ${result.components.actions.length}`);
  });
};

// Performance test
const test5 = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 5: Performance Benchmark');
  console.log('='.repeat(70) + '\n');

  const query = 'How to optimize web performance?';
  const responses = {
    claude: 'Use code splitting, lazy loading, and minification.',
    'gpt-4': 'Optimize images, use CDN, implement caching.',
    gemini: 'Monitor with Core Web Vitals, prioritize by impact.'
  };

  console.log('Running 3 iterations...\n');
  const times = [];

  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    await engine.presentResponse({
      query,
      providerResponses: responses
    });
    const duration = Date.now() - start;
    times.push(duration);
    console.log(`  Iteration ${i + 1}: ${duration}ms`);
  }

  const avg = Math.round(times.reduce((a, b) => a + b) / times.length);
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(`\n  Average: ${avg}ms`);
  console.log(`  Min: ${min}ms, Max: ${max}ms`);
};

// Run all tests
const runAllTests = async () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     TooLoo Response Presentation Engine — Demo Script        ║
╚════════════════════════════════════════════════════════════════╝
  `);

  try {
    await test1();
    await test2();
    await test3();
    await test4();
    await test5();

    console.log('\n' + '='.repeat(70));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
};

// Run
runAllTests();
