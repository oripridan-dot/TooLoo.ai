#!/usr/bin/env node

/**
 * TooLoo Evolution Demo - Phase 1: Predictive Adaptation
 * Demonstrates the next evolutionary leap in AI assistance
 */

import { execSync } from 'child_process';

const API_BASE = 'http://localhost:3001/api/v1';

class TooLooEvolutionDemo {
  constructor() {
    this.sessionData = {
      messages: [],
      predictions: [],
      learnings: []
    };
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const curl = method === 'GET' 
        ? `curl -s ${API_BASE}${endpoint}`
        : `curl -s -X ${method} ${API_BASE}${endpoint} -H 'Content-Type: application/json' -d '${JSON.stringify(data)}'`;
      
      const response = execSync(curl, { encoding: 'utf8' });
      return JSON.parse(response);
    } catch (error) {
      console.error(`Request failed: ${error.message}`);
      return { error: error.message };
    }
  }

  async demonstrateEvolution() {
    console.log('\n🚀 TooLoo.ai Evolution Demo - Phase 1: Predictive Adaptation\n');
    console.log('=' .repeat(70));

    // 1. Show current state
    await this.showCurrentState();

    // 2. Start an enhanced learning session
    await this.startEnhancedSession();

    // 3. Demonstrate predictive capabilities
    await this.demonstratePrediction();

    // 4. Show learning from interactions
    await this.demonstrateLearning();

    // 5. Show evolution insights
    await this.showEvolutionInsights();

    console.log('\n🎯 Evolution Phase 1 Complete!');
    console.log('TooLoo now anticipates user needs and learns from every interaction.');
  }

  async showCurrentState() {
    console.log('\n📊 Current TooLoo State:');
    console.log('-'.repeat(25));
    
    const status = await this.makeRequest('/evolution/status');
    if (status.ok) {
      console.log(`• Evolution Phase: ${status.status.evolutionPhase}`);
      console.log(`• Sessions Completed: ${status.status.totalSessions}`);
      console.log(`• Patterns Discovered: ${status.status.patternsDiscovered}`);
      console.log(`• Cross-Session Learnings: ${status.status.crossSessionLearnings}`);
      console.log(`• User Preferences Learned: ${status.status.crossSessionMemory.userPreferencesLearned}`);
    }
  }

  async startEnhancedSession() {
    console.log('\n🧬 Starting Enhanced Learning Session:');
    console.log('-'.repeat(38));
    
    const sessionData = {
      type: 'demo',
      goal: 'Demonstrate TooLoo evolution capabilities',
      provider: 'enhanced-tooloo'
    };
    
    const session = await this.makeRequest('/evolution/session/start', 'POST', { sessionData });
    if (session.ok) {
      console.log(`✅ Session ${session.session.id} started`);
      console.log(`• Predicted Duration: ${session.session.predictedDuration}`);
      console.log(`• Recommended Approach: ${session.session.recommendedApproach[0]}`);
      console.log(`• User Experience Level: ${session.session.userContext.experienceLevel}`);
    }
  }

  async demonstratePrediction() {
    console.log('\n🔮 Predictive Context Engine Test:');
    console.log('-'.repeat(35));
    
    // Start predictive session
    await this.makeRequest('/predict/session/start', 'POST', { 
      context: { topic: 'javascript', difficulty: 'advanced' } 
    });
    
    // Simulate conversation progression
    const messages = [
      { role: 'user', content: 'How do I optimize my React app?' },
      { role: 'assistant', content: 'Here are several performance optimization techniques...' }
    ];
    
    // Test prediction
    const prediction = await this.makeRequest('/predict/next-intent', 'POST', {
      messages,
      currentMessage: 'What about memory leaks?'
    });
    
    if (prediction.ok) {
      console.log('🎯 Predicted User Intent:');
      console.log(`• Primary Intent: ${prediction.prediction.intents[0]?.intent || 'unknown'}`);
      console.log(`• Confidence: ${(prediction.prediction.confidence * 100).toFixed(1)}%`);
      console.log(`• Resources Pre-loaded: ${prediction.prediction.resources.slice(0, 3).join(', ')}`);
      console.log(`• Reasoning: ${prediction.prediction.reasoning}`);
    }
  }

  async demonstrateLearning() {
    console.log('\n📚 Adaptive Learning Demonstration:');
    console.log('-'.repeat(37));
    
    // Record a successful interaction
    const successData = {
      type: 'optimization',
      method: 'detailed-explanation-with-examples',
      userFeedback: 'Excellent! The examples made it clear',
      codeStyle: 'functional',
      framework: 'react',
      firstTrySuccess: true,
      description: 'Memory leak detection in React'
    };
    
    const success = await this.makeRequest('/evolution/record/success', 'POST', { data: successData });
    if (success.ok) {
      console.log('✅ Recorded successful interaction');
      console.log('• Learning: User prefers detailed explanations with examples');
      console.log('• Learning: Functional code style preference detected');
      console.log('• Learning: React framework experience confirmed');
    }
    
    // Record a failure for contrast
    const failureData = {
      type: 'optimization',
      error: 'User confused by technical jargon',
      attempted: 'Complex performance analysis explanation',
      lesson: 'Use simpler language and build up complexity gradually',
      userFeedback: 'Too complex, lost me in the details'
    };
    
    await this.makeRequest('/evolution/record/failure', 'POST', { data: failureData });
    console.log('📝 Recorded learning opportunity');
    console.log('• Learning: Avoid technical jargon for this user');
    console.log('• Learning: Build complexity gradually');
  }

  async showEvolutionInsights() {
    console.log('\n🧠 Evolution Intelligence Report:');
    console.log('-'.repeat(35));
    
    const insights = await this.makeRequest('/evolution/insights');
    if (insights.ok && insights.insights.length > 0) {
      insights.insights.forEach(insight => {
        const emoji = insight.type === 'success' ? '🎉' : 
          insight.type === 'warning' ? '⚠️' : 
            insight.type === 'evolution' ? '🧬' : '💡';
        console.log(`${emoji} ${insight.message}`);
        console.log(`   → ${insight.recommendation}`);
      });
    }
    
    // Show predictive status
    const predictStatus = await this.makeRequest('/predict/status');
    if (predictStatus.ok) {
      console.log('\n🔮 Predictive Engine Status:');
      console.log(`• Conversation Patterns Learned: ${predictStatus.status.patternsLearned.intents}`);
      console.log(`• Context Cache Size: ${predictStatus.status.cacheSize.codeSnippets} code snippets`);
      console.log(`• Active Session: ${predictStatus.status.currentSession.active ? 'Yes' : 'No'}`);
    }
  }

  async showNextSteps() {
    console.log('\n🚀 Next Evolution Phases:');
    console.log('-'.repeat(26));
    console.log('Phase 2: Cross-Session Memory (2-4 weeks)');
    console.log('  → Remember user across conversations');
    console.log('  → Build persistent knowledge of preferences');
    console.log('  → Anticipate needs before user speaks');
    console.log('');
    console.log('Phase 3: Autonomous Code Evolution (4-6 weeks)');
    console.log('  → TooLoo improves its own code');
    console.log('  → Self-optimizing performance');
    console.log('  → Autonomous bug fixing');
    console.log('');
    console.log('Phase 4: Multi-Agent Collaboration (6-8 weeks)');
    console.log('  → Specialized TooLoo agents working together');
    console.log('  → Parallel processing of complex tasks');
    console.log('  → Collaborative problem solving');
  }
}

// Run the demo
const demo = new TooLooEvolutionDemo();
demo.demonstrateEvolution().then(() => {
  console.log('\n🎊 Demo complete! TooLoo evolution is underway.');
  process.exit(0);
}).catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});