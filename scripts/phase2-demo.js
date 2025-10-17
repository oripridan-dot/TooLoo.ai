#!/usr/bin/env node

/**
 * TooLoo Evolution Demo - Phase 2: Cross-Session Mastery
 * Demonstrates deep user modeling, context bridging, and proactive intelligence
 */

import { execSync } from 'child_process';

const API_BASE = 'http://localhost:3001/api';

class TooLooPhase2Demo {
  constructor() {
    this.userId = 'demo-user-phase2';
    this.sessionData = {
      conversations: [],
      userModel: null,
      contextBridges: [],
      predictions: []
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

  async demonstratePhase2() {
    console.log('\n🚀 TooLoo.ai Evolution Demo - Phase 2: Cross-Session Mastery\n');
    console.log('=' .repeat(75));

    // 1. Show Phase 2 status
    await this.showPhase2Status();

    // 2. Demonstrate user modeling
    await this.demonstrateUserModeling();

    // 3. Demonstrate context bridging
    await this.demonstrateContextBridging();

    // 4. Demonstrate proactive intelligence
    await this.demonstrateProactiveIntelligence();

    // 5. Show integrated capabilities
    await this.showIntegratedCapabilities();

    console.log('\n🎊 Phase 2 Demo Complete! TooLoo now has cross-session mastery.')
  }

  async showPhase2Status() {
    console.log('\n📊 Phase 2 Evolution Status:');
    console.log('-' .repeat(35));

    const response = await this.makeRequest('/v2/evolution/status');
    if (response.ok) {
      const { status } = response;
      console.log(`• Evolution Phase: ${status.phase}`);
      console.log(`• User Models Active: ${status.userModels}`);
      console.log(`• Context Networks: ${status.contextNetworks}`);
      console.log(`• Conversation History: ${status.conversationHistory}`);
      console.log(`• Intelligence Patterns: ${status.intelligenceMetrics.patternsLearned?.workflow || 0} workflow, ${status.intelligenceMetrics.patternsLearned?.problem || 0} problem`);
      console.log('\n🧠 New Capabilities:');
      status.capabilities.forEach(cap => console.log(`  • ${cap}`));
    }
  }

  async demonstrateUserModeling() {
    console.log('\n🧬 User Modeling Engine Test:');
    console.log('-' .repeat(40));

    // Simulate user conversation data
    const conversationData = {
      messages: [
        { role: 'user', content: 'I need help with React hooks', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'Here\'s a detailed example with useState...', timestamp: new Date().toISOString() },
        { role: 'user', content: 'Can you show me useEffect too?', timestamp: new Date().toISOString() }
      ],
      userFeedback: 'Perfect! The examples helped me understand',
      responseTime: 1500,
      successRate: 0.9,
      retryCount: 0
    };

    // Analyze user behavior
    const modelResponse = await this.makeRequest('/v2/user-model/analyze', 'POST', {
      userId: this.userId,
      conversationData
    });

    if (modelResponse.ok) {
      console.log('✅ User behavior analyzed and model updated');
      console.log(`• Communication Style: ${modelResponse.userModel.communication?.preferredDetailLevel || 'medium'} detail level`);
      console.log(`• Learning Speed: ${modelResponse.userModel.learning?.learningSpeed || 'medium'}`);
      console.log(`• Technical Comfort: ${Math.round((modelResponse.userModel.communication?.technicalComfort || 0.5) * 100)}%`);
      console.log(`• Total Interactions: ${modelResponse.userModel.totalInteractions}`);
      
      this.sessionData.userModel = modelResponse.userModel;
    }

    // Get proactive suggestions
    const suggestionsResponse = await this.makeRequest(`/v2/user-model/suggestions/${this.userId}?context=${encodeURIComponent(JSON.stringify({ topics: ['React'], technologies: ['hooks'] }))}`);
    
    if (suggestionsResponse.ok) {
      console.log('\n🔮 Proactive Suggestions Generated:');
      suggestionsResponse.suggestions.slice(0, 3).forEach(suggestion => {
        console.log(`  • ${suggestion.title}: ${suggestion.suggestion} (${Math.round(suggestion.relevance * 100)}% relevant)`);
      });
    }

    // Get adaptive settings
    const settingsResponse = await this.makeRequest(`/v2/user-model/adaptive-settings/${this.userId}?topic=React`);
    
    if (settingsResponse.ok) {
      console.log(`\n⚙️ Adaptive Settings: ${settingsResponse.settings.complexity} complexity recommended`);
    }
  }

  async demonstrateContextBridging() {
    console.log('\n🌉 Context Bridge Engine Test:');
    console.log('-' .repeat(40));

    // Record a conversation for context bridging
    const conversationRecord = {
      id: `conv-${Date.now()}`,
      userId: this.userId,
      topic: 'React Performance',
      subtopics: ['useState optimization', 'useCallback', 'React.memo'],
      technologies: ['React', 'JavaScript'],
      outcome: 'Successfully optimized component re-renders',
      challenges: ['Understanding when to use useCallback'],
      solutions: ['Wrap functions that depend on props'],
      codeGenerated: ['const memoizedCallback = useCallback(() => { /* logic */ }, [dependency]);'],
      userSatisfaction: 0.9
    };

    const recordResponse = await this.makeRequest('/v2/context-bridge/record', 'POST', conversationRecord);
    
    if (recordResponse.ok) {
      console.log('✅ Conversation recorded in context bridge');
      console.log(`• Topic: ${conversationRecord.topic}`);
      console.log(`• Complexity: ${recordResponse.conversation.complexityLevel || 'intermediate'}`);
      console.log(`• Semantic Tags: ${recordResponse.conversation.semanticTags?.length || 0} generated`);
    }

    // Find relevant context for a new conversation
    const contextRequest = {
      topic: 'React State Management',
      subtopics: ['useState', 'state optimization'],
      technologies: ['React'],
      challenges: ['Component re-rendering too often']
    };

    const contextResponse = await this.makeRequest('/v2/context-bridge/relevant-context', 'POST', contextRequest);
    
    if (contextResponse.ok) {
      const { context } = contextResponse;
      console.log('\n🔗 Related Context Found:');
      console.log(`• Relevant Conversations: ${context.relevantConversations?.length || 0}`);
      console.log(`• Topic Bridges: ${context.topicBridges?.length || 0}`);
      console.log(`• Bridge Recommendations: ${context.bridgeRecommendations?.length || 0}`);
      
      if (context.relevantConversations?.length > 0) {
        const topMatch = context.relevantConversations[0];
        console.log(`  → Top Match: "${topMatch.conversation.topic}" (${Math.round(topMatch.relevance * 100)}% relevant)`);
        console.log(`  → Bridge Type: ${topMatch.bridgeType}`);
      }
    }

    // Get context suggestions for current workflow
    const flowSuggestions = await this.makeRequest('/v2/context-bridge/suggestions', 'POST', {
      currentTopic: 'React Optimization',
      stepsSoFar: ['basic implementation', 'performance testing'],
      userProgress: 0.7,
      technologies: ['React', 'JavaScript']
    });

    if (flowSuggestions.ok) {
      console.log('\n💡 Context-Based Suggestions:');
      flowSuggestions.suggestions.slice(0, 2).forEach(suggestion => {
        console.log(`  • ${suggestion.suggestion} (${Math.round(suggestion.confidence * 100)}% confidence)`);
        console.log(`    Reasoning: ${suggestion.reasoning}`);
      });
    }
  }

  async demonstrateProactiveIntelligence() {
    console.log('\n🧠 Proactive Intelligence Engine Test:');
    console.log('-' .repeat(45));

    // Analyze a user session for patterns
    const userSession = {
      userId: this.userId,
      sessionData: {
        duration: 1800000, // 30 minutes
        interactions: [
          { type: 'question', timestamp: Date.now() - 1800000, duration: 30000 },
          { type: 'coding', timestamp: Date.now() - 1500000, duration: 600000 },
          { type: 'debugging', timestamp: Date.now() - 900000, duration: 300000 },
          { type: 'testing', timestamp: Date.now() - 600000, duration: 200000 }
        ]
      },
      interactions: [
        { type: 'problem', content: 'Component not re-rendering', outcome: 'solved' },
        { type: 'solution', content: 'Added dependency to useEffect', outcome: 'success' }
      ],
      outcomes: [
        { type: 'success', success: true, method: 'step-by-step debugging' },
        { type: 'learning', concept: 'useEffect dependencies', mastery: 0.8 }
      ],
      timing: { duration: 1800000 },
      context: { topic: 'React Hooks', difficulty: 'intermediate' }
    };

    const patternsResponse = await this.makeRequest('/v2/proactive/analyze-session', 'POST', userSession);
    
    if (patternsResponse.ok) {
      console.log('✅ Session patterns analyzed');
      const { patterns } = patternsResponse;
      console.log(`• Workflow Pattern: ${patterns.workflow?.sessionLength || 0}ms sessions, ${Math.round(patterns.workflow?.interactionFrequency || 0)} interactions/min`);
      console.log(`• Problem Pattern: ${patterns.problem?.commonProblemTypes?.length || 0} problem types identified`);
      console.log(`• Learning Velocity: ${Math.round((patterns.learning?.learningVelocity || 0) * 100)}% concepts/hour`);
    }

    // Get predictions for current state
    const currentState = {
      userId: this.userId,
      currentContext: { topic: 'React Performance', complexity: 'advanced' },
      sessionProgress: 0.6,
      recentActions: [
        { type: 'implement', timestamp: Date.now() - 300000 },
        { type: 'test', timestamp: Date.now() - 100000 }
      ],
      userState: { energy: 'high', focus: 'good', experience: 'intermediate' }
    };

    const predictionsResponse = await this.makeRequest('/v2/proactive/predictions', 'POST', currentState);
    
    if (predictionsResponse.ok) {
      console.log('\n🔮 Advanced Predictions Generated:');
      const { predictions } = predictionsResponse;
      
      console.log(`• Next Action: ${predictions.nextAction?.predictions?.[0]?.action || 'unknown'} (${Math.round((predictions.nextAction?.confidence || 0) * 100)}% confidence)`);
      console.log(`• Likely Challenges: ${predictions.likelyChallenges?.length || 0} potential issues identified`);
      console.log(`• Resource Needs: ${predictions.resourceNeeds?.length || 0} resources recommended`);
      console.log(`• Time Estimate: ${Math.round((predictions.timeEstimation?.estimated || 0) / 60000)} minutes`);
      console.log(`• Learning Moments: ${predictions.learningMoments?.length || 0} opportunities identified`);
      
      this.sessionData.predictions = predictions;
    }

    // Generate proactive suggestions
    if (this.sessionData.predictions && this.sessionData.userModel) {
      const suggestionsResponse = await this.makeRequest('/v2/proactive/suggestions', 'POST', {
        predictions: this.sessionData.predictions,
        userModel: this.sessionData.userModel
      });

      if (suggestionsResponse.ok) {
        console.log('\n🎯 Proactive Intelligence Suggestions:');
        suggestionsResponse.suggestions.slice(0, 3).forEach((suggestion, idx) => {
          console.log(`  ${idx + 1}. ${suggestion.title} (${suggestion.priority} priority)`);
          console.log(`     ${suggestion.description}`);
          console.log(`     Timing: ${suggestion.timing}`);
        });
      }
    }
  }

  async showIntegratedCapabilities() {
    console.log('\n🔄 Integrated Phase 2 Capabilities:');
    console.log('-' .repeat(45));

    // Get user insights (combining all engines)
    const insightsResponse = await this.makeRequest(`/v2/user-model/insights/${this.userId}`);
    
    if (insightsResponse.ok && insightsResponse.insights) {
      const { insights } = insightsResponse;
      console.log('🧠 Deep User Understanding:');
      if (insights.strengths?.length > 0) {
        console.log(`• Strengths: ${insights.strengths.join(', ')}`);
      }
      if (insights.growthAreas?.length > 0) {
        console.log(`• Growth Areas: ${insights.growthAreas.join(', ')}`);
      }
      if (insights.recommendations?.length > 0) {
        console.log(`• Recommendations: ${insights.recommendations.slice(0, 2).join(', ')}`);
      }
    }

    // Get conversation history
    const historyResponse = await this.makeRequest(`/v2/context-bridge/history/${this.userId}?limit=5`);
    
    if (historyResponse.ok) {
      console.log(`\n📚 Cross-Session Memory: ${historyResponse.history?.length || 0} conversations remembered`);
      historyResponse.history?.slice(0, 2).forEach((conv, idx) => {
        console.log(`  ${idx + 1}. "${conv.topic}" - ${conv.outcome} (${conv.userSatisfaction ? Math.round(conv.userSatisfaction * 100) + '%' : 'N/A'} satisfaction)`);
      });
    }

    // Get intelligence metrics
    const metricsResponse = await this.makeRequest('/v2/proactive/metrics');
    
    if (metricsResponse.ok) {
      const { metrics } = metricsResponse;
      console.log('\n📈 Intelligence Evolution:');
      console.log(`• Prediction Accuracy: ${Math.round((metrics.predictionAccuracy || 0) * 100)}%`);
      console.log(`• Proactive Success Rate: ${Math.round((metrics.proactiveSuccessRate || 0) * 100)}%`);
      console.log(`• Learning Velocity: ${Math.round(metrics.learningVelocity || 0)}% improvement rate`);
      console.log(`• Patterns Learned: ${JSON.stringify(metrics.patternsLearned || {})}`);
    }

    // Show what makes Phase 2 special
    console.log('\n🌟 Phase 2 Achievements:');
    console.log('• ✅ Deep user behavioral modeling across sessions');
    console.log('• ✅ Context bridging connects related conversations');
    console.log('• ✅ Proactive intelligence predicts user needs');
    console.log('• ✅ Adaptive complexity scaling based on growth');
    console.log('• ✅ Advanced pattern recognition and learning');
    console.log('• ✅ Cross-session memory preserves user context');

    console.log('\n🚀 Ready for Phase 3: Autonomous Code Evolution');
  }
}

// Run the demo
const demo = new TooLooPhase2Demo();
demo.demonstratePhase2().catch(console.error);