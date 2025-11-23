// @version 2.1.28
import { promises as fs, existsSync } from 'fs';
import path from 'path';

/**
 * Enhanced Learning Accumulator - TooLoo's Evolution Brain
 * Now with cross-session memory and predictive learning
 * Phase 1 of the Evolution: Autonomous Meta-Learning
 */
export default class EnhancedLearningAccumulator {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.dataDir = path.join(this.workspaceRoot, 'data', 'learning');
    this.metricsFile = path.join(this.dataDir, 'metrics.json');
    this.patternsFile = path.join(this.dataDir, 'patterns.json');
    this.failuresFile = path.join(this.dataDir, 'failures.json');
    this.memoryFile = path.join(this.dataDir, 'cross-session-memory.json');
    this.evolutionFile = path.join(this.dataDir, 'evolution-log.json');
    
    // Core metrics (existing)
    this.metrics = {
      sessions: [],
      baseline: {
        contextReexplanationTime: 900, // 15 min in seconds
        repeatProblemRate: 0.30,
        firstTrySuccessRate: 0.40,
        timeToPrototype: 7200 // 2 hours in seconds
      },
      targets: {
        contextReexplanationTime: 120, // 2 min
        repeatProblemRate: 0.10,
        firstTrySuccessRate: 0.70,
        timeToPrototype: 3600 // 1 hour
      },
      current: {
        totalSessions: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        averageResponseTime: 0,
        patternsDiscovered: 0,
        // New evolution metrics
        predictiveAccuracy: 0,
        adaptiveImprovements: 0,
        crossSessionLearnings: 0
      }
    };
    
    // Enhanced data structures
    this.patterns = [];
    this.failures = [];
    
    // NEW: Cross-session memory system
    this.crossSessionMemory = {
      userPreferences: {
        codingStyle: {}, // preferred patterns, naming conventions
        frameworkPreferences: [], // react, vue, express, etc
        difficultyLevel: 'intermediate',
        responseStyle: 'concise' // concise, detailed, tutorial
      },
      problemPatterns: {}, // user tends to struggle with X, succeeds with Y
      conversationPatterns: {}, // typical conversation flows
      successfulMethods: {}, // what teaching/helping methods work best
      temporalPatterns: {} // when user is most productive, typical session length
    };
    
    // NEW: Evolution tracking
    this.evolutionLog = [];
    this.currentSession = null;
    
    this.initialize();
    console.log('🧬 Enhanced Learning Accumulator initialized - Evolution mode active');
  }

  async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadData();
      await this.loadCrossSessionMemory();
      await this.loadEvolutionLog();
    } catch (error) {
      console.warn('⚠️ Enhanced Learning Accumulator: initialization warning:', error.message);
    }
  }

  async loadData() {
    // Load existing metrics, patterns, failures
    try {
      const metricsData = await fs.readFile(this.metricsFile, 'utf8');
      const loadedMetrics = JSON.parse(metricsData);
      this.metrics = { ...this.metrics, ...loadedMetrics };
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('Could not load metrics:', error.message);
      }
    }

    try {
      const patternsData = await fs.readFile(this.patternsFile, 'utf8');
      this.patterns = JSON.parse(patternsData);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('Could not load patterns:', error.message);
      }
    }

    try {
      const failuresData = await fs.readFile(this.failuresFile, 'utf8');
      this.failures = JSON.parse(failuresData);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('Could not load failures:', error.message);
      }
    }
  }

  async loadCrossSessionMemory() {
    try {
      if (existsSync(this.memoryFile)) {
        const memoryData = await fs.readFile(this.memoryFile, 'utf8');
        this.crossSessionMemory = { ...this.crossSessionMemory, ...JSON.parse(memoryData) };
      }
    } catch (error) {
      console.warn('Could not load cross-session memory:', error.message);
    }
  }

  async loadEvolutionLog() {
    try {
      if (existsSync(this.evolutionFile)) {
        const evolutionData = await fs.readFile(this.evolutionFile, 'utf8');
        this.evolutionLog = JSON.parse(evolutionData);
      }
    } catch (error) {
      console.warn('Could not load evolution log:', error.message);
    }
  }

  async saveData() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.writeFile(this.metricsFile, JSON.stringify(this.metrics, null, 2));
      await fs.writeFile(this.patternsFile, JSON.stringify(this.patterns, null, 2));
      await fs.writeFile(this.failuresFile, JSON.stringify(this.failures, null, 2));
    } catch (error) {
      console.error('Failed to save learning data:', error.message);
    }
  }

  async saveCrossSessionMemory() {
    try {
      await fs.writeFile(this.memoryFile, JSON.stringify(this.crossSessionMemory, null, 2));
    } catch (error) {
      console.error('Failed to save cross-session memory:', error.message);
    }
  }

  async saveEvolutionLog() {
    try {
      await fs.writeFile(this.evolutionFile, JSON.stringify(this.evolutionLog, null, 2));
    } catch (error) {
      console.error('Failed to save evolution log:', error.message);
    }
  }

  /**
   * ENHANCED SESSION TRACKING - Now with cross-session learning
   */
  async startEnhancedSession(sessionData = {}) {
    const session = {
      id: `session-${Date.now()}`,
      startTime: new Date().toISOString(),
      type: sessionData.type || 'general',
      goal: sessionData.goal || 'No goal specified',
      provider: sessionData.provider || 'unknown',
      // NEW: Predictive context
      predictedDuration: this.predictSessionDuration(sessionData),
      expectedChallenges: this.predictLikelyChallenges(sessionData),
      recommendedApproach: this.recommendApproach(sessionData),
      userContext: this.getUserContext()
    };

    this.currentSession = session;
    this.metrics.current.totalSessions++;
    
    await this.logEvolution('session_started', {
      sessionId: session.id,
      predictions: {
        duration: session.predictedDuration,
        challenges: session.expectedChallenges
      }
    });

    return session;
  }

  /**
   * PREDICTIVE METHODS - Anticipate user needs based on history
   */
  predictSessionDuration(sessionData) {
    const historicalSessions = this.metrics.sessions.filter(s => s.type === sessionData.type);
    if (historicalSessions.length === 0) return 'unknown';
    
    const avgDuration = historicalSessions.reduce((sum, s) => {
      const duration = s.endTime ? new Date(s.endTime) - new Date(s.startTime) : 1800000; // 30 min default
      return sum + duration;
    }, 0) / historicalSessions.length;
    
    const minutes = Math.round(avgDuration / 60000);
    return `${minutes} minutes (based on ${historicalSessions.length} similar sessions)`;
  }

  predictLikelyChallenges(sessionData) {
    const challenges = [];
    
    // Analyze user's failure patterns
    const userFailures = this.failures.filter(f => f.type === sessionData.type);
    const commonErrors = this.getCommonFailures(5);
    
    commonErrors.forEach(error => {
      if (error.count > 1) {
        challenges.push({
          type: 'repeat_error',
          description: error.error.substring(0, 100),
          likelihood: Math.min(90, error.count * 20)
        });
      }
    });
    
    // Predict based on complexity
    if (sessionData.goal && sessionData.goal.toLowerCase().includes('new')) {
      challenges.push({
        type: 'learning_curve',
        description: 'New concept may require multiple explanations',
        likelihood: 70
      });
    }
    
    return challenges;
  }

  recommendApproach(sessionData) {
    const userPrefs = this.crossSessionMemory.userPreferences;
    const successful = this.crossSessionMemory.successfulMethods;
    
    const recommendations = [];
    
    // Based on user's preferred response style
    if (userPrefs.responseStyle === 'tutorial') {
      recommendations.push('Provide step-by-step explanations with examples');
    } else if (userPrefs.responseStyle === 'concise') {
      recommendations.push('Give direct, actionable answers');
    }
    
    // Based on successful patterns
    Object.entries(successful).forEach(([method, successRate]) => {
      if (successRate > 0.7) {
        recommendations.push(`Use ${method} approach (${(successRate * 100).toFixed(0)}% success rate)`);
      }
    });
    
    return recommendations.length > 0 ? recommendations : ['Standard approach - no specific preferences learned yet'];
  }

  getUserContext() {
    return {
      experienceLevel: this.crossSessionMemory.userPreferences.difficultyLevel,
      preferredFrameworks: this.crossSessionMemory.userPreferences.frameworkPreferences,
      recentSuccesses: this.patterns.slice(-3).map(p => p.name),
      recentChallenges: this.failures.slice(-3).map(f => f.error.substring(0, 50))
    };
  }

  /**
   * ADAPTIVE LEARNING - Update cross-session memory based on outcomes
   */
  async recordEnhancedSuccess(data = {}) {
    // Call original success recording
    const success = await this.recordSuccess(data);
    
    // NEW: Update cross-session memory
    await this.updateUserPreferences(data, 'success');
    await this.updateSuccessfulMethods(data);
    await this.updateConversationPatterns(data, 'success');
    
    this.metrics.current.crossSessionLearnings++;
    
    await this.logEvolution('enhanced_success_recorded', {
      sessionId: this.currentSession?.id,
      method: data.method,
      userFeedback: data.userFeedback
    });
    
    return success;
  }

  async recordEnhancedFailure(data = {}) {
    // Call original failure recording
    const failure = await this.recordFailure(data);
    
    // NEW: Learn from failure patterns
    await this.updateUserPreferences(data, 'failure');
    await this.updateProblemPatterns(data);
    await this.updateConversationPatterns(data, 'failure');
    
    this.metrics.current.crossSessionLearnings++;
    
    await this.logEvolution('enhanced_failure_recorded', {
      sessionId: this.currentSession?.id,
      errorPattern: data.error,
      learningOpportunity: data.lesson
    });
    
    return failure;
  }

  async updateUserPreferences(data, outcome) {
    const prefs = this.crossSessionMemory.userPreferences;
    
    // Update coding style preferences
    if (data.codeStyle && outcome === 'success') {
      prefs.codingStyle[data.codeStyle] = (prefs.codingStyle[data.codeStyle] || 0) + 1;
    }
    
    // Update framework preferences
    if (data.framework && outcome === 'success') {
      if (!prefs.frameworkPreferences.includes(data.framework)) {
        prefs.frameworkPreferences.push(data.framework);
      }
    }
    
    // Update response style preferences
    if (data.userFeedback) {
      if (data.userFeedback.includes('too detailed')) {
        prefs.responseStyle = 'concise';
      } else if (data.userFeedback.includes('more explanation')) {
        prefs.responseStyle = 'tutorial';
      }
    }
    
    await this.saveCrossSessionMemory();
  }

  async updateSuccessfulMethods(data) {
    if (!data.method) return;
    
    const methods = this.crossSessionMemory.successfulMethods;
    const method = data.method;
    
    if (!methods[method]) {
      methods[method] = { successes: 0, attempts: 0 };
    }
    
    methods[method].attempts++;
    methods[method].successes++;
    
    await this.saveCrossSessionMemory();
  }

  async updateProblemPatterns(data) {
    const patterns = this.crossSessionMemory.problemPatterns;
    const problemType = data.type || 'general';
    
    if (!patterns[problemType]) {
      patterns[problemType] = { occurrences: 0, solutions: [] };
    }
    
    patterns[problemType].occurrences++;
    
    if (data.solution) {
      patterns[problemType].solutions.push({
        solution: data.solution,
        timestamp: new Date().toISOString()
      });
    }
    
    await this.saveCrossSessionMemory();
  }

  async updateConversationPatterns(data, outcome) {
    const patterns = this.crossSessionMemory.conversationPatterns;
    const sessionType = this.currentSession?.type || 'general';
    
    if (!patterns[sessionType]) {
      patterns[sessionType] = { total: 0, successful: 0, averageLength: 0 };
    }
    
    patterns[sessionType].total++;
    if (outcome === 'success') {
      patterns[sessionType].successful++;
    }
    
    // Update average conversation length
    if (this.currentSession) {
      const currentLength = Date.now() - new Date(this.currentSession.startTime).getTime();
      patterns[sessionType].averageLength = 
        (patterns[sessionType].averageLength + currentLength) / patterns[sessionType].total;
    }
    
    await this.saveCrossSessionMemory();
  }

  /**
   * EVOLUTION LOGGING - Track TooLoo's learning journey
   */
  async logEvolution(eventType, data) {
    const evolutionEvent = {
      timestamp: new Date().toISOString(),
      eventType,
      data,
      metrics: {
        sessionsCompleted: this.metrics.current.totalSessions,
        successRate: this.calculateCurrentSuccessRate(),
        patternsLearned: this.patterns.length
      }
    };
    
    this.evolutionLog.push(evolutionEvent);
    
    // Keep only last 1000 events
    if (this.evolutionLog.length > 1000) {
      this.evolutionLog = this.evolutionLog.slice(-1000);
    }
    
    await this.saveEvolutionLog();
  }

  calculateCurrentSuccessRate() {
    const total = this.metrics.current.successfulGenerations + this.metrics.current.failedGenerations;
    return total > 0 ? this.metrics.current.successfulGenerations / total : 0;
  }

  /**
   * ORIGINAL METHODS (maintained for compatibility)
   */
  async recordSuccess(data = {}) {
    if (!this.currentSession) {
      await this.startEnhancedSession();
    }

    const success = {
      sessionId: this.currentSession.id,
      timestamp: new Date().toISOString(),
      type: data.type || 'code-generation',
      provider: data.provider || 'unknown',
      responseTime: data.responseTime || 0,
      firstTrySuccess: data.firstTrySuccess !== false,
      description: data.description || ''
    };

    this.metrics.sessions.push({
      ...this.currentSession,
      ...success,
      outcome: 'success'
    });

    this.metrics.current.successfulGenerations++;
    
    if (success.firstTrySuccess) {
      const total = this.metrics.current.successfulGenerations + this.metrics.current.failedGenerations;
      this.metrics.current.firstTrySuccessRate = 
        this.metrics.current.successfulGenerations / total;
    }

    await this.saveData();
    return success;
  }

  async recordFailure(data = {}) {
    if (!this.currentSession) {
      await this.startEnhancedSession();
    }

    const failure = {
      id: `failure-${Date.now()}`,
      sessionId: this.currentSession.id,
      timestamp: new Date().toISOString(),
      type: data.type || 'code-generation',
      provider: data.provider || 'unknown',
      error: data.error || 'Unknown error',
      attempted: data.attempted || '',
      rootCause: data.rootCause || '',
      lesson: data.lesson || ''
    };

    this.failures.push(failure);
    this.metrics.current.failedGenerations++;

    this.metrics.sessions.push({
      ...this.currentSession,
      ...failure,
      outcome: 'failure'
    });

    await this.saveData();
    return failure;
  }

  // Keep all original methods for backward compatibility
  async discoverPattern(patternData) {
    const pattern = {
      id: `pattern-${Date.now()}`,
      discoveredAt: new Date().toISOString(),
      name: patternData.name || 'Unnamed Pattern',
      category: patternData.category || 'general',
      description: patternData.description || '',
      code: patternData.code || '',
      useCase: patternData.useCase || '',
      successRate: patternData.successRate || 1.0,
      timesUsed: 0,
      timesSuccessful: 0
    };

    this.patterns.push(pattern);
    this.metrics.current.patternsDiscovered++;

    await this.saveData();
    console.log(`📚 New pattern discovered: ${pattern.name}`);
    return pattern;
  }

  isRepeatProblem(errorMessage) {
    const similar = this.failures.filter(f => 
      f.error.toLowerCase().includes(errorMessage.toLowerCase()) ||
      errorMessage.toLowerCase().includes(f.error.toLowerCase())
    );

    if (similar.length > 0) {
      console.warn(`⚠️ Repeat problem detected! Seen ${similar.length} times before.`);
      return {
        isRepeat: true,
        previousOccurrences: similar,
        suggestedLesson: similar[similar.length - 1].lesson
      };
    }

    return { isRepeat: false };
  }

  calculateRepeatRate() {
    if (this.failures.length < 2) return 0;
    
    const uniqueErrors = new Set();
    let repeats = 0;
    
    this.failures.forEach(failure => {
      const errorKey = failure.error.toLowerCase().substring(0, 50);
      if (uniqueErrors.has(errorKey)) {
        repeats++;
      } else {
        uniqueErrors.add(errorKey);
      }
    });
    
    return repeats / this.failures.length;
  }

  getTopPatterns(limit = 5) {
    return this.patterns
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit)
      .map(p => ({
        name: p.name,
        category: p.category,
        successRate: p.successRate,
        timesUsed: p.timesUsed
      }));
  }

  getCommonFailures(limit = 5) {
    const errorCounts = {};
    
    this.failures.forEach(failure => {
      const key = failure.error.substring(0, 100);
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    return Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([error, count]) => ({ error, count }));
  }

  getPerformanceReport() {
    const { baseline, targets, current, sessions } = this.metrics;
    
    const recentSessions = sessions.slice(-10);
    const recentSuccessRate = recentSessions.length > 0 
      ? recentSessions.filter(s => s.outcome === 'success').length / recentSessions.length
      : 0;

    const improvements = {
      firstTrySuccess: {
        baseline: baseline.firstTrySuccessRate,
        current: recentSuccessRate,
        target: targets.firstTrySuccessRate,
        improvement: ((recentSuccessRate - baseline.firstTrySuccessRate) / baseline.firstTrySuccessRate) * 100,
        achieved: recentSuccessRate >= targets.firstTrySuccessRate
      },
      repeatProblems: {
        baseline: baseline.repeatProblemRate,
        current: this.calculateRepeatRate(),
        target: targets.repeatProblemRate,
        improvement: ((baseline.repeatProblemRate - this.calculateRepeatRate()) / baseline.repeatProblemRate) * 100,
        achieved: this.calculateRepeatRate() <= targets.repeatProblemRate
      }
    };

    return {
      totalSessions: current.totalSessions,
      successfulGenerations: current.successfulGenerations,
      failedGenerations: current.failedGenerations,
      patternsDiscovered: current.patternsDiscovered,
      improvements,
      recentSuccessRate,
      topPatterns: this.getTopPatterns(5),
      commonFailures: this.getCommonFailures(5),
      // NEW: Enhanced metrics
      crossSessionLearnings: current.crossSessionLearnings,
      userPreferences: this.crossSessionMemory.userPreferences,
      evolutionInsights: this.getEvolutionInsights()
    };
  }

  getLearningInsights() {
    const report = this.getPerformanceReport();
    const insights = [];

    if (report.improvements.firstTrySuccess.improvement > 0) {
      insights.push({
        type: 'success',
        message: `First-try success rate improved by ${report.improvements.firstTrySuccess.improvement.toFixed(1)}%!`,
        recommendation: 'Continue current approach'
      });
    }

    if (report.improvements.repeatProblems.current > 0.2) {
      insights.push({
        type: 'warning',
        message: `${(report.improvements.repeatProblems.current * 100).toFixed(1)}% of problems are recurring`,
        recommendation: 'Review failure logs and update anti-patterns documentation'
      });
    }

    if (this.patterns.length < 5) {
      insights.push({
        type: 'info',
        message: 'Pattern library is small',
        recommendation: 'Extract more successful patterns to speed up future development'
      });
    }

    // NEW: Evolution insights
    if (this.metrics.current.crossSessionLearnings > 10) {
      insights.push({
        type: 'evolution',
        message: `${this.metrics.current.crossSessionLearnings} cross-session learnings accumulated`,
        recommendation: 'TooLoo is building persistent memory across conversations'
      });
    }

    return insights;
  }

  /**
   * NEW: Evolution-specific methods
   */
  getEvolutionInsights() {
    const recentEvents = this.evolutionLog.slice(-20);
    const insights = {
      learningVelocity: this.calculateLearningVelocity(),
      adaptationPatterns: this.analyzeAdaptationPatterns(),
      predictionAccuracy: this.calculatePredictionAccuracy(),
      recentEvolutions: recentEvents.map(e => ({
        type: e.eventType,
        timestamp: e.timestamp,
        impact: e.data
      }))
    };
    
    return insights;
  }

  calculateLearningVelocity() {
    const recent = this.evolutionLog.slice(-50);
    if (recent.length < 2) return 0;
    
    const timeSpan = new Date(recent[recent.length - 1].timestamp) - new Date(recent[0].timestamp);
    const learningEvents = recent.filter(e => e.eventType.includes('learned') || e.eventType.includes('success'));
    
    return learningEvents.length / (timeSpan / (1000 * 60 * 60)); // events per hour
  }

  analyzeAdaptationPatterns() {
    const adaptations = this.evolutionLog.filter(e => 
      e.eventType.includes('adaptation') || e.eventType.includes('improved')
    );
    
    return {
      totalAdaptations: adaptations.length,
      recentAdaptations: adaptations.slice(-10).length,
      adaptationTypes: this.groupEventsByType(adaptations)
    };
  }

  calculatePredictionAccuracy() {
    // This would be updated by the Predictive Context Engine
    return this.metrics.current.predictiveAccuracy || 0;
  }

  groupEventsByType(events) {
    const groups = {};
    events.forEach(event => {
      const type = event.eventType;
      groups[type] = (groups[type] || 0) + 1;
    });
    return groups;
  }

  getEnhancedStatus() {
    return {
      ...this.getPerformanceReport(),
      evolutionPhase: 'Predictive Adaptation',
      crossSessionMemory: {
        userPreferencesLearned: Object.keys(this.crossSessionMemory.userPreferences).length,
        problemPatternsIdentified: Object.keys(this.crossSessionMemory.problemPatterns).length,
        successfulMethodsDiscovered: Object.keys(this.crossSessionMemory.successfulMethods).length
      },
      evolution: {
        totalEvolutions: this.evolutionLog.length,
        learningVelocity: this.calculateLearningVelocity(),
        lastEvolution: this.evolutionLog[this.evolutionLog.length - 1]
      }
    };
  }
}