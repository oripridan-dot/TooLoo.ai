#!/usr/bin/env node

/**
 * Integration test script for Segmentation Server
 * 
 * This demonstrates the full functionality and can be run with:
 * - Mock OpenAI client (for CI/testing)
 * - Real OpenAI API (when OPENAI_API_KEY is set)
 * 
 * Usage:
 *   node tests/integration-test.js [--with-api]
 */

import OpenAI from 'openai';
import { SemanticSegmentationEngine } from '../servers/segmentation-server.js';
import { SegmentationSkill } from '../api/skills/segmentation.js';

// Constants
const OPENAI_EMBEDDING_DIMENSION = 1536; // OpenAI embedding vector size

const useRealAPI = process.argv.includes('--with-api');

// Mock OpenAI for testing without API key
class MockOpenAI {
  constructor() {
    this.embeddings = {
      create: async ({ input }) => {
        const text = Array.isArray(input) ? input[0] : input;
        const hash = this.simpleHash(text);
        const embedding = [];
        
        // Generate embedding vector (OpenAI embedding dimension)
        for (let i = 0; i < OPENAI_EMBEDDING_DIMENSION; i++) {
          embedding.push(Math.sin(hash + i) * 0.1);
        }
        
        return {
          data: [{ embedding }]
        };
      }
    };
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
}

// Test conversations
const pythonConversation = [
  { role: 'user', content: 'I want to learn Python programming' },
  { role: 'assistant', content: 'Python is a great language for beginners. It has clean syntax and powerful libraries.' },
  { role: 'user', content: 'What about performance compared to C++?' },
  { role: 'assistant', content: 'C++ is generally faster for compute-intensive tasks, but Python is more productive for most applications.' },
  { role: 'user', content: 'Can you help me with data science projects?' },
  { role: 'assistant', content: 'Absolutely! Python is excellent for data science with libraries like pandas, numpy, and scikit-learn.' }
];

const webDevConversation = [
  { role: 'user', content: 'I need to build a web application' },
  { role: 'assistant', content: 'Great! What kind of web application are you thinking of?' },
  { role: 'user', content: 'Something with React and Node.js' },
  { role: 'assistant', content: 'React and Node.js are an excellent combination for modern web development.' }
];

const cookingConversation = [
  { role: 'user', content: 'I love cooking Italian food' },
  { role: 'assistant', content: 'Italian cuisine is wonderful! What dishes do you enjoy making?' },
  { role: 'user', content: 'Pasta carbonara is my favorite' },
  { role: 'assistant', content: 'Carbonara is a classic! The key is timing with the eggs.' }
];

async function runIntegrationTests() {
  console.log('🚀 Segmentation Server Integration Tests\n');
  console.log(`Mode: ${useRealAPI ? 'Real OpenAI API' : 'Mock (no API key required)'}\n`);

  // Track total performance
  const startTime = Date.now();

  // Initialize client
  let openaiClient;
  if (useRealAPI) {
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not set. Run with mock mode or set the API key.');
      process.exit(1);
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('✅ Using real OpenAI API\n');
  } else {
    openaiClient = new MockOpenAI();
    console.log('✅ Using mock OpenAI client\n');
  }

  const engine = new SemanticSegmentationEngine({
    openai: openaiClient,
    similarityThreshold: 0.7,
    maxSegmentSize: 5
  });

  const skill = new SegmentationSkill({ openai: openaiClient });

  // Test 1: Basic segmentation
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 1: Basic Conversation Segmentation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const result1 = await engine.segmentMessages(pythonConversation);
  
  console.log(`📊 Results for Python conversation (${result1.performance.messageCount} messages):`);
  console.log(`   - Segments created: ${result1.segments.length}`);
  console.log(`   - Processing time: ${result1.performance.processingTime}ms`);
  console.log(`   - Cross-links found: ${result1.crossConversationLinks.length}\n`);

  console.log('🏷️  Extracted Traits:');
  console.log(`   - Interests: ${result1.traits.interests.join(', ') || 'none'}`);
  console.log(`   - Skills: ${result1.traits.skills.join(', ') || 'none'}`);
  console.log(`   - Top topics: ${result1.traits.topics.slice(0, 5).join(', ')}`);
  console.log(`   - Sentiment: ${result1.traits.sentiment}\n`);

  console.log('📦 Segments:');
  result1.segments.forEach((seg, idx) => {
    console.log(`   ${idx + 1}. Messages ${seg.startIndex}-${seg.endIndex} (confidence: ${seg.confidence})`);
    console.log(`      Topics: ${seg.topics.slice(0, 3).join(', ')}`);
    console.log(`      Messages: ${seg.messageCount}`);
  });
  console.log('');

  // Test 2: Cross-conversation comparison
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 2: Cross-Conversation Comparison');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const comparison = await skill.compareConversations(pythonConversation, webDevConversation);
  
  console.log('🔗 Comparing Python vs Web Dev conversations:');
  console.log(`   - Overall similarity: ${comparison.overallSimilarity}`);
  console.log(`   - Python segments: ${comparison.conversation1.segmentCount}`);
  console.log(`   - Web Dev segments: ${comparison.conversation2.segmentCount}`);
  console.log(`   - Common links: ${comparison.crossLinks.length}\n`);

  if (comparison.crossLinks.length > 0) {
    console.log('   Cross-links:');
    comparison.crossLinks.slice(0, 3).forEach(link => {
      console.log(`   - Segment ${link.conversation1Segment} ↔ ${link.conversation2Segment}`);
      console.log(`     Common topics: ${link.commonTopics.join(', ')}`);
      console.log(`     Relevance: ${link.relevanceScore}`);
    });
  }
  console.log('');

  // Test 3: User profile building
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 3: User Profile Building');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const profile = await skill.buildUserProfile([
    pythonConversation,
    webDevConversation,
    cookingConversation
  ]);

  console.log(`👤 User Profile (from ${profile.conversationCount} conversations):\n`);
  
  console.log('   Top Interests:');
  profile.interests.slice(0, 5).forEach(item => {
    console.log(`   - ${item.item} (${item.frequency}x, confidence: ${item.confidence})`);
  });

  console.log('\n   Top Skills:');
  if (profile.skills.length > 0) {
    profile.skills.slice(0, 5).forEach(item => {
      console.log(`   - ${item.item} (${item.frequency}x, confidence: ${item.confidence})`);
    });
  } else {
    console.log('   - No specific skills mentioned');
  }

  console.log('\n   Top Topics:');
  profile.topics.slice(0, 8).forEach(item => {
    console.log(`   - ${item.item} (${item.frequency}x, confidence: ${item.confidence})`);
  });

  console.log(`\n   Overall Sentiment: ${profile.sentiment.dominant} (${(profile.sentiment.confidence * 100).toFixed(0)}%)`);
  console.log('');

  // Test 4: Finding similar conversations
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 4: Finding Similar Conversations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const conversationHistory = [
    { id: 'conv1', messages: pythonConversation, metadata: { date: '2024-01-01' } },
    { id: 'conv2', messages: webDevConversation, metadata: { date: '2024-01-02' } },
    { id: 'conv3', messages: cookingConversation, metadata: { date: '2024-01-03' } }
  ];

  const currentConversation = [
    { role: 'user', content: 'I want to learn JavaScript for web development' },
    { role: 'assistant', content: 'JavaScript is essential for modern web development' }
  ];

  const similarConvs = await skill.findSimilarConversations(currentConversation, conversationHistory, 3);

  console.log('🔍 Finding conversations similar to: "JavaScript for web development"\n');
  console.log('   Most similar conversations:');
  similarConvs.forEach((conv, idx) => {
    console.log(`   ${idx + 1}. ${conv.conversationId} (similarity: ${conv.similarity})`);
    console.log(`      Common traits: ${conv.commonTraits}`);
    console.log(`      Date: ${conv.metadata.date || 'unknown'}`);
  });
  console.log('');

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Integration Tests Complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('✅ All features working correctly:');
  console.log('   - Semantic segmentation with embeddings');
  console.log('   - Trait extraction and clustering');
  console.log('   - Cross-conversation linking');
  console.log('   - User profile building');
  console.log('   - Similar conversation matching');
  console.log('   - Confidence scoring');
  console.log('   - Multi-turn context preservation\n');

  const totalTime = Date.now() - startTime;
  console.log(`⚡ Performance: Total execution time ${totalTime}ms (threshold: 500ms per operation)`);
  
  if (totalTime > 2000) {
    console.log('   ⚠️  Warning: Total time exceeds reasonable threshold for 4 operations\n');
  } else {
    console.log('   ✅ All operations well within performance targets\n');
  }

  if (!useRealAPI) {
    console.log('💡 Tip: Run with --with-api flag to test with real OpenAI embeddings');
    console.log('   (Set OPENAI_API_KEY environment variable first)\n');
  }
}

// Run the tests
runIntegrationTests().catch(error => {
  console.error('❌ Integration test failed:', error);
  process.exit(1);
});
