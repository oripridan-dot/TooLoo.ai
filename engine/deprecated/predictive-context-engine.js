import { promises as fs, existsSync } from 'fs';
import path from 'path';

/**
 * Predictive Context Engine - TooLoo's Evolution Leap
 * Anticipates user needs and pre-loads relevant context
 * Phase 1: Conversation Pattern Analysis & Intent Prediction
 */
export default class PredictiveContextEngine {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.dataDir = path.join(this.workspaceRoot, 'data', 'predictive');
    this.patternsFile = path.join(this.dataDir, 'conversation-patterns.json');
    this.contextCacheFile = path.join(this.dataDir, 'context-cache.json');
    this.learningAccumulator = options.learningAccumulator;
    
    // Conversation patterns: what typically follows what
    this.conversationPatterns = {
      sequences: new Map(), // "after X, user typically asks Y"
      intents: new Map(),   // "when user says X, they usually want Y"
      contexts: new Map(),  // "in context Z, common next steps are A,B,C"
      timings: new Map()    // "user asks follow-ups after N seconds/messages"
    };
    
    // Pre-loaded context cache
    this.contextCache = {
      codeSnippets: new Map(),
      documentation: new Map(),
      patterns: new Map(),
      commonSolutions: new Map()
    };
    
    // Real-time session tracking
    this.currentSession = {
      messages: [],
      intents: [],
      predictions: [],
      startTime: Date.now()
    };
    
    this.initialize();
    console.log('🔮 Predictive Context Engine initialized - TooLoo becoming proactive');
  }

  async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadPatterns();
      await this.loadContextCache();
      await this.seedInitialPatterns();
    } catch (error) {
      console.warn('⚠️ Predictive Engine: initialization warning:', error.message);
    }
  }

  async loadPatterns() {
    try {
      if (existsSync(this.patternsFile)) {
        const data = JSON.parse(await fs.readFile(this.patternsFile, 'utf8'));
        // Convert JSON back to Maps
        this.conversationPatterns.sequences = new Map(data.sequences || []);
        this.conversationPatterns.intents = new Map(data.intents || []);
        this.conversationPatterns.contexts = new Map(data.contexts || []);
        this.conversationPatterns.timings = new Map(data.timings || []);
      }
    } catch (error) {
      console.warn('Could not load conversation patterns:', error.message);
    }
  }

  async loadContextCache() {
    try {
      if (existsSync(this.contextCacheFile)) {
        const data = JSON.parse(await fs.readFile(this.contextCacheFile, 'utf8'));
        this.contextCache.codeSnippets = new Map(data.codeSnippets || []);
        this.contextCache.documentation = new Map(data.documentation || []);
        this.contextCache.patterns = new Map(data.patterns || []);
        this.contextCache.commonSolutions = new Map(data.commonSolutions || []);
      }
    } catch (error) {
      console.warn('Could not load context cache:', error.message);
    }
  }

  async seedInitialPatterns() {
    // Seed with common programming conversation patterns
    const initialPatterns = [
      { trigger: 'how do i', intent: 'tutorial_request', nextLikely: ['example', 'code snippet', 'documentation'] },
      { trigger: 'error:', intent: 'debug_help', nextLikely: ['stack trace', 'code review', 'alternative approach'] },
      { trigger: 'build', intent: 'project_creation', nextLikely: ['structure', 'dependencies', 'configuration'] },
      { trigger: 'optimize', intent: 'performance', nextLikely: ['profiling', 'benchmarks', 'alternatives'] },
      { trigger: 'test', intent: 'quality_assurance', nextLikely: ['examples', 'edge cases', 'automation'] }
    ];

    for (const pattern of initialPatterns) {
      this.conversationPatterns.intents.set(pattern.trigger, {
        intent: pattern.intent,
        confidence: 0.8,
        nextLikely: pattern.nextLikely,
        seenCount: 1
      });
    }
    
    await this.savePatterns();
  }

  async savePatterns() {
    try {
      const data = {
        sequences: Array.from(this.conversationPatterns.sequences.entries()),
        intents: Array.from(this.conversationPatterns.intents.entries()),
        contexts: Array.from(this.conversationPatterns.contexts.entries()),
        timings: Array.from(this.conversationPatterns.timings.entries())
      };
      await fs.writeFile(this.patternsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save conversation patterns:', error.message);
    }
  }

  async saveContextCache() {
    try {
      const data = {
        codeSnippets: Array.from(this.contextCache.codeSnippets.entries()),
        documentation: Array.from(this.contextCache.documentation.entries()),
        patterns: Array.from(this.contextCache.patterns.entries()),
        commonSolutions: Array.from(this.contextCache.commonSolutions.entries())
      };
      await fs.writeFile(this.contextCacheFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save context cache:', error.message);
    }
  }

  /**
   * CORE PREDICTION ENGINE
   * Analyzes current conversation and predicts what user will need next
   */
  predictNextUserIntent(messages, currentMessage = '') {
    const predictions = {
      intents: [],
      resources: [],
      confidence: 0,
      reasoning: ''
    };

    try {
      // Analyze current message for intent signals
      const currentIntent = this.analyzeMessageIntent(currentMessage);
      
      // Look for sequence patterns
      const sequenceSignals = this.findSequencePatterns(messages);
      
      // Analyze conversation context
      const contextSignals = this.analyzeConversationContext(messages);
      
      // Combine all signals for final prediction
      predictions.intents = this.combineIntentSignals(currentIntent, sequenceSignals, contextSignals);
      predictions.resources = this.predictNeededResources(predictions.intents);
      predictions.confidence = this.calculatePredictionConfidence(predictions.intents);
      predictions.reasoning = this.generatePredictionReasoning(currentIntent, sequenceSignals, contextSignals);

      // Pre-load predicted resources
      this.preloadResources(predictions.resources);

    } catch (error) {
      console.warn('Prediction failed:', error.message);
    }

    return predictions;
  }

  analyzeMessageIntent(message) {
    const text = message.toLowerCase();
    const intents = [];

    // Check against learned patterns
    for (const [trigger, data] of this.conversationPatterns.intents) {
      if (text.includes(trigger)) {
        intents.push({
          intent: data.intent,
          confidence: data.confidence,
          trigger: trigger,
          nextLikely: data.nextLikely
        });
      }
    }

    // Keyword-based intent detection
    const keywordPatterns = {
      'debug': { intent: 'debug_help', keywords: ['error', 'bug', 'fix', 'broken', 'issue'] },
      'learn': { intent: 'tutorial_request', keywords: ['how', 'tutorial', 'explain', 'learn'] },
      'build': { intent: 'project_creation', keywords: ['create', 'build', 'setup', 'start'] },
      'optimize': { intent: 'performance', keywords: ['optimize', 'faster', 'performance', 'slow'] },
      'test': { intent: 'quality_assurance', keywords: ['test', 'validate', 'check', 'verify'] }
    };

    for (const [intentType, config] of Object.entries(keywordPatterns)) {
      const matches = config.keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        intents.push({
          intent: config.intent,
          confidence: Math.min(0.9, matches.length * 0.3),
          keywords: matches
        });
      }
    }

    return intents;
  }

  findSequencePatterns(messages) {
    const patterns = [];
    
    if (messages.length < 2) return patterns;

    // Look at last few message pairs to find sequence patterns
    const recent = messages.slice(-5);
    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i-1];
      const curr = recent[i];
      
      const sequenceKey = `${prev.role}:${this.extractKeywords(prev.content)} -> ${curr.role}:${this.extractKeywords(curr.content)}`;
      
      if (this.conversationPatterns.sequences.has(sequenceKey)) {
        const pattern = this.conversationPatterns.sequences.get(sequenceKey);
        patterns.push({
          type: 'sequence',
          pattern: sequenceKey,
          nextPredicted: pattern.nextLikely,
          confidence: pattern.confidence
        });
      }
    }

    return patterns;
  }

  analyzeConversationContext(messages) {
    const context = {
      topic: 'general',
      complexity: 'medium',
      progressStage: 'exploration',
      userExperience: 'intermediate'
    };

    // Analyze topic from message content
    const allText = messages.map(m => m.content).join(' ').toLowerCase();
    
    const topics = {
      'frontend': ['react', 'vue', 'angular', 'html', 'css', 'javascript', 'dom'],
      'backend': ['node', 'express', 'api', 'server', 'database', 'sql'],
      'ai': ['ai', 'machine learning', 'neural', 'model', 'training'],
      'devops': ['docker', 'kubernetes', 'deployment', 'ci/cd', 'aws']
    };

    for (const [topicName, keywords] of Object.entries(topics)) {
      const matches = keywords.filter(keyword => allText.includes(keyword));
      if (matches.length > 0) {
        context.topic = topicName;
        break;
      }
    }

    // Analyze complexity from conversation depth
    if (messages.length > 10 && allText.length > 2000) {
      context.complexity = 'high';
    } else if (messages.length < 3 || allText.length < 200) {
      context.complexity = 'low';
    }

    // Determine progress stage
    const stages = {
      'exploration': ['what', 'how', 'why', 'explain'],
      'implementation': ['create', 'build', 'code', 'implement'],
      'debugging': ['error', 'bug', 'fix', 'issue', 'problem'],
      'optimization': ['optimize', 'improve', 'faster', 'better']
    };

    for (const [stageName, keywords] of Object.entries(stages)) {
      const recentText = messages.slice(-3).map(m => m.content).join(' ').toLowerCase();
      const matches = keywords.filter(keyword => recentText.includes(keyword));
      if (matches.length > 0) {
        context.progressStage = stageName;
        break;
      }
    }

    return context;
  }

  combineIntentSignals(currentIntent, sequenceSignals, contextSignals) {
    const combinedIntents = new Map();

    // Add current intent signals
    currentIntent.forEach(intent => {
      const key = intent.intent;
      if (!combinedIntents.has(key)) {
        combinedIntents.set(key, { ...intent, sources: [] });
      }
      combinedIntents.get(key).sources.push('current_message');
    });

    // Add sequence-based predictions
    sequenceSignals.forEach(signal => {
      signal.nextPredicted.forEach(predicted => {
        if (!combinedIntents.has(predicted)) {
          combinedIntents.set(predicted, { 
            intent: predicted, 
            confidence: signal.confidence * 0.7,
            sources: []
          });
        }
        combinedIntents.get(predicted).sources.push('sequence_pattern');
      });
    });

    return Array.from(combinedIntents.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 predictions
  }

  predictNeededResources(intents) {
    const resources = [];

    intents.forEach(intent => {
      switch (intent.intent) {
      case 'debug_help':
        resources.push('error_patterns', 'debugging_checklist', 'common_fixes');
        break;
      case 'tutorial_request':
        resources.push('documentation', 'code_examples', 'best_practices');
        break;
      case 'project_creation':
        resources.push('templates', 'boilerplate_code', 'project_structure');
        break;
      case 'performance':
        resources.push('optimization_patterns', 'performance_tools', 'benchmarks');
        break;
      case 'quality_assurance':
        resources.push('test_patterns', 'validation_tools', 'quality_metrics');
        break;
      }
    });

    return [...new Set(resources)]; // Remove duplicates
  }

  calculatePredictionConfidence(intents) {
    if (intents.length === 0) return 0;
    
    const avgConfidence = intents.reduce((sum, intent) => sum + intent.confidence, 0) / intents.length;
    const sourceVariety = Math.min(1, new Set(intents.flatMap(i => i.sources)).size / 3);
    
    return Math.min(0.95, avgConfidence * sourceVariety);
  }

  generatePredictionReasoning(currentIntent, sequenceSignals, contextSignals) {
    const reasons = [];
    
    if (currentIntent.length > 0) {
      reasons.push(`Current message suggests ${currentIntent[0].intent} (${(currentIntent[0].confidence * 100).toFixed(0)}% confidence)`);
    }
    
    if (sequenceSignals.length > 0) {
      reasons.push(`Conversation pattern indicates ${sequenceSignals[0].nextPredicted.join(', ')} likely next`);
    }
    
    reasons.push(`Context: ${contextSignals.topic} topic at ${contextSignals.progressStage} stage`);
    
    return reasons.join('. ');
  }

  preloadResources(resourceTypes) {
    // Asynchronously pre-load common resources
    resourceTypes.forEach(resourceType => {
      setImmediate(() => this.loadResourceType(resourceType));
    });
  }

  async loadResourceType(resourceType) {
    try {
      switch (resourceType) {
      case 'error_patterns':
        await this.cacheErrorPatterns();
        break;
      case 'code_examples':
        await this.cacheCodeExamples();
        break;
      case 'templates':
        await this.cacheTemplates();
        break;
        // Add more resource types as needed
      }
    } catch (error) {
      console.warn(`Failed to preload ${resourceType}:`, error.message);
    }
  }

  async cacheErrorPatterns() {
    if (this.learningAccumulator) {
      const commonFailures = this.learningAccumulator.getCommonFailures(10);
      commonFailures.forEach(failure => {
        this.contextCache.commonSolutions.set(failure.error, {
          solutions: [`Review ${failure.error} documentation`, 'Check similar past issues'],
          cached: Date.now()
        });
      });
    }
  }

  async cacheCodeExamples() {
    // Cache from learning accumulator patterns
    if (this.learningAccumulator) {
      const topPatterns = this.learningAccumulator.getTopPatterns(10);
      topPatterns.forEach(pattern => {
        this.contextCache.patterns.set(pattern.name, {
          code: pattern.code || 'No code available',
          usage: pattern.timesUsed,
          cached: Date.now()
        });
      });
    }
  }

  async cacheTemplates() {
    // Cache common project templates
    const templates = [
      { name: 'express_api', code: 'const express = require("express");\nconst app = express();\n\napp.listen(3000);' },
      { name: 'react_component', code: 'import React from "react";\n\nfunction Component() {\n  return <div>Hello</div>;\n}\n\nexport default Component;' }
    ];
    
    templates.forEach(template => {
      this.contextCache.codeSnippets.set(template.name, {
        code: template.code,
        cached: Date.now()
      });
    });
  }

  extractKeywords(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 3)
      .join(',');
  }

  /**
   * LEARNING METHODS - Update patterns based on actual user behavior
   */
  async learnFromConversation(messages, actualUserResponse, predicted) {
    try {
      // Track prediction accuracy
      const accuracy = this.evaluatePredictionAccuracy(predicted, actualUserResponse);
      
      // Update conversation patterns
      await this.updateConversationPatterns(messages, actualUserResponse);
      
      // Update intent recognition
      await this.updateIntentPatterns(actualUserResponse, predicted);
      
      console.log(`🧠 Learned from conversation: ${(accuracy * 100).toFixed(1)}% prediction accuracy`);
    } catch (error) {
      console.warn('Learning from conversation failed:', error.message);
    }
  }

  evaluatePredictionAccuracy(predicted, actual) {
    if (!predicted.intents.length) return 0;
    
    const actualIntent = this.analyzeMessageIntent(actual.content);
    if (!actualIntent.length) return 0;
    
    const predictedIntentNames = predicted.intents.map(i => i.intent);
    const actualIntentNames = actualIntent.map(i => i.intent);
    
    const matches = predictedIntentNames.filter(p => actualIntentNames.includes(p));
    return matches.length / Math.max(predictedIntentNames.length, actualIntentNames.length);
  }

  async updateConversationPatterns(messages, newMessage) {
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    const sequenceKey = `${lastMessage.role}:${this.extractKeywords(lastMessage.content)} -> ${newMessage.role}:${this.extractKeywords(newMessage.content)}`;
    
    if (this.conversationPatterns.sequences.has(sequenceKey)) {
      const pattern = this.conversationPatterns.sequences.get(sequenceKey);
      pattern.seenCount++;
      pattern.confidence = Math.min(0.95, pattern.confidence + 0.05);
    } else {
      this.conversationPatterns.sequences.set(sequenceKey, {
        seenCount: 1,
        confidence: 0.3,
        nextLikely: [this.extractKeywords(newMessage.content)]
      });
    }
    
    await this.savePatterns();
  }

  async updateIntentPatterns(actualMessage, predicted) {
    const actualIntents = this.analyzeMessageIntent(actualMessage.content);
    
    actualIntents.forEach(intent => {
      const triggerWords = this.extractKeywords(actualMessage.content).split(',');
      triggerWords.forEach(trigger => {
        if (trigger.length > 3) {
          if (this.conversationPatterns.intents.has(trigger)) {
            const pattern = this.conversationPatterns.intents.get(trigger);
            pattern.seenCount++;
            pattern.confidence = Math.min(0.95, pattern.confidence + 0.02);
          } else {
            this.conversationPatterns.intents.set(trigger, {
              intent: intent.intent,
              confidence: 0.4,
              seenCount: 1,
              nextLikely: []
            });
          }
        }
      });
    });
    
    await this.savePatterns();
  }

  /**
   * PUBLIC API METHODS
   */
  async startConversationSession(initialContext = {}) {
    this.currentSession = {
      messages: [],
      intents: [],
      predictions: [],
      startTime: Date.now(),
      context: initialContext
    };
    
    console.log('🔮 Started predictive conversation session');
    return this.currentSession;
  }

  async addMessage(message) {
    this.currentSession.messages.push({
      ...message,
      timestamp: Date.now()
    });
    
    // Generate prediction for next user message
    const prediction = this.predictNextUserIntent(this.currentSession.messages, message.content);
    this.currentSession.predictions.push(prediction);
    
    return prediction;
  }

  getRecentPredictions(limit = 5) {
    return this.currentSession.predictions.slice(-limit);
  }

  getConversationInsights() {
    return {
      sessionDuration: Date.now() - this.currentSession.startTime,
      messageCount: this.currentSession.messages.length,
      avgPredictionConfidence: this.currentSession.predictions.reduce((sum, p) => sum + p.confidence, 0) / Math.max(1, this.currentSession.predictions.length),
      topPredictedIntents: this.getTopPredictedIntents(),
      contextSummary: this.analyzeConversationContext(this.currentSession.messages)
    };
  }

  getTopPredictedIntents() {
    const intentCounts = {};
    this.currentSession.predictions.forEach(prediction => {
      prediction.intents.forEach(intent => {
        intentCounts[intent.intent] = (intentCounts[intent.intent] || 0) + intent.confidence;
      });
    });
    
    return Object.entries(intentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([intent, score]) => ({ intent, score: score / this.currentSession.predictions.length }));
  }

  getStatus() {
    return {
      patternsLearned: {
        sequences: this.conversationPatterns.sequences.size,
        intents: this.conversationPatterns.intents.size,
        contexts: this.conversationPatterns.contexts.size
      },
      cacheSize: {
        codeSnippets: this.contextCache.codeSnippets.size,
        documentation: this.contextCache.documentation.size,
        patterns: this.contextCache.patterns.size,
        solutions: this.contextCache.commonSolutions.size
      },
      currentSession: {
        active: this.currentSession.messages.length > 0,
        messageCount: this.currentSession.messages.length,
        predictionCount: this.currentSession.predictions.length
      }
    };
  }
}