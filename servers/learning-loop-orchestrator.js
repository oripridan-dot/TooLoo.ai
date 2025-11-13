/**
 * Learning Loop Orchestrator
 * Coordinates all AI systems to enable continuous improvement
 * This is the "brain" that ties everything together
 */

import PersonalizationEngine from './personalization-engine.js';
import PerformanceMetricsService from './performance-metrics.js';
import UserFeedbackService from './user-feedback.js';
import RealTimeAdaptationService from './real-time-adaptation.js';
import MultiProviderCollaborationFramework from './multi-provider-collaboration.js';
import SessionHistoryManager from './session-history-manager.js';
import ContextExtractionService from './context-extraction-service.js';

class LearningLoopOrchestrator {
  constructor() {
    this.personalizationEngine = new PersonalizationEngine();
    this.metricsService = new PerformanceMetricsService();
    this.feedbackService = new UserFeedbackService();
    this.adaptationService = new RealTimeAdaptationService(
      this.metricsService,
      this.feedbackService,
      this.personalizationEngine
    );
    this.collaborationFramework = new MultiProviderCollaborationFramework();
    this.sessionHistoryManager = new SessionHistoryManager();
    this.contextExtraction = new ContextExtractionService(this.sessionHistoryManager);

    this.learningLoopInterval = null;
    this.learningLoopDuration = 5 * 60 * 1000; // Run every 5 minutes
  }

  /**
   * Process a user query through the entire learning ecosystem
   */
  async processQuery(userId, query, responses, selectedProviders, metadata = {}) {
    const timestamp = Date.now();

    // Step 1: Get personalization for this user
    const personalization = this.personalizationEngine.getPersonalization(userId);

    // Step 2: Apply multi-provider collaboration
    const collaboration = await this.collaborationFramework.orchestrateCollaboration(
      query,
      selectedProviders,
      responses,
      'ensemble'
    );

    // Step 3: Record metrics for each provider response
    selectedProviders.forEach(provider => {
      this.metricsService.recordResponse({
        query,
        response: responses[provider],
        provider,
        model: metadata.model || 'unknown',
        responseTime: metadata.responseTime?.[provider] || 0,
        tokensUsed: metadata.tokens?.[provider] || 0,
        timestamp
      });
    });

    // Step 4: Track interaction for personalization
    this.personalizationEngine.trackInteraction(userId, {
      query,
      response: collaboration.recommendation || responses[selectedProviders[0]],
      selectedProviders,
      responseTime: metadata.averageResponseTime || 0,
      timestamp
    });

    return {
      collaboration,
      personalization,
      systemPrompt: this.personalizationEngine.generateSystemPrompt(userId, 'general')
    };
  }

  /**
   * Submit user feedback and trigger learning
   */
  submitUserFeedback(userId, data) {
    const feedbackId = this.feedbackService.submitFeedback({
      userId,
      ...data
    });

    // Trigger adaptive learning
    this.triggerAdaptiveLearning();

    return feedbackId;
  }

  /**
   * Start the continuous learning loop
   */
  startLearningLoop() {
    if (this.learningLoopInterval) {
      console.log('Learning loop already running');
      return;
    }

    console.log('🧠 Starting AI Learning Loop (every 5 minutes)');

    this.learningLoopInterval = setInterval(() => {
      this.runLearningCycle();
    }, this.learningLoopDuration);

    // Run immediately first time
    this.runLearningCycle();
  }

  /**
   * Stop the learning loop
   */
  stopLearningLoop() {
    if (this.learningLoopInterval) {
      clearInterval(this.learningLoopInterval);
      this.learningLoopInterval = null;
      console.log('🛑 Learning loop stopped');
    }
  }

  /**
   * Execute one cycle of the learning loop
   */
  async runLearningCycle() {
    try {
      console.log('📊 Running AI Learning Cycle...');

      // Phase 1: Analyze feedback
      const feedbackResult = this.adaptationService.processFeedback();
      console.log(`  ✓ Processed ${feedbackResult.processed} feedback entries`);

      // Phase 2: Update model performance
      this.adaptationService.updateModelPerformance();
      console.log('  ✓ Updated model performance scores');

      // Phase 3: Clean up old data
      const feedbackCleaned = this.feedbackService.clearOldFeedback(180);
      const profilesCleaned = this.personalizationEngine.clearOldProfiles(90);
      console.log(`  ✓ Cleaned up: ${feedbackCleaned} feedback entries, ${profilesCleaned} profiles`);

      // Phase 4: Generate learning report
      const report = this.generateLearningReport();
      console.log(`  ✓ Generated learning report`);

      // Phase 5: Log key insights
      this.logKeyInsights(report);

      return report;
    } catch (err) {
      console.error('Error in learning cycle:', err);
    }
  }

  /**
   * Trigger learning immediately when high-value feedback arrives
   */
  triggerAdaptiveLearning() {
    // Process feedback immediately if threshold reached
    const unprocessed = this.feedbackService.getUnprocessedFeedback();
    if (unprocessed.length >= 5) {
      this.runLearningCycle();
    }
  }

  /**
   * Generate comprehensive learning report
   */
  generateLearningReport() {
    const metrics = this.metricsService.getDashboardData();
    const feedback = this.feedbackService.getFeedbackSummary();
    const adaptation = this.adaptationService.getAdaptationStats();
    const allProfiles = this.personalizationEngine.getAllProfiles();

    return {
      timestamp: Date.now(),
      metrics: {
        totalResponses: metrics.summary.totalResponses,
        averageRating: metrics.summary.averageRating,
        bestProvider: metrics.providers[0]?.provider || 'N/A',
        topProviders: metrics.providers.slice(0, 3)
      },
      feedback: feedback,
      users: {
        totalProfiles: allProfiles.length,
        avgInteractions: allProfiles.length > 0
          ? Math.round(allProfiles.reduce((a, b) => a + b.interactions.length, 0) / allProfiles.length)
          : 0
      },
      adaptation: adaptation,
      insights: this.generateInsights(metrics, feedback, allProfiles)
    };
  }

  /**
   * Generate AI-driven insights from the data
   */
  generateInsights(metrics, feedback, profiles) {
    const insights = [];

    // Insight 1: Provider performance
    if (metrics.providers.length > 0) {
      const best = metrics.providers[0];
      insights.push({
        category: 'Provider Performance',
        finding: `${best.provider} is the top performer with ${best.averageRating} avg rating`,
        recommendation: `Increase allocation to ${best.provider} for critical queries`
      });
    }

    // Insight 2: User satisfaction
    if (feedback && parseFloat(feedback.averageRating) < 3) {
      insights.push({
        category: 'User Satisfaction',
        finding: 'Average user rating is below 3.0',
        recommendation: 'Review low-rated responses and adjust model parameters'
      });
    }

    // Insight 3: Learning effectiveness
    if (profiles.length > 10) {
      insights.push({
        category: 'Learning System Health',
        finding: `System has learned preferences for ${profiles.length} users`,
        recommendation: 'Personalization is active and improving response relevance'
      });
    }

    return insights;
  }

  /**
   * Log key insights to console
   */
  logKeyInsights(report) {
    console.log('\n📈 LEARNING CYCLE REPORT:');
    console.log(`  Total Responses: ${report.metrics.totalResponses}`);
    console.log(`  Average Rating: ${report.metrics.averageRating}/5`);
    console.log(`  Best Provider: ${report.metrics.bestProvider}`);
    console.log(`  Active Users: ${report.users.totalProfiles}`);

    if (report.insights.length > 0) {
      console.log('\n💡 Key Insights:');
      report.insights.forEach(insight => {
        console.log(`  [${insight.category}] ${insight.finding}`);
        console.log(`    → ${insight.recommendation}`);
      });
    }

    console.log('\n');
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    return {
      learningLoopActive: !!this.learningLoopInterval,
      personalizationEngine: this.personalizationEngine.userProfiles.size + ' users tracked',
      metricsService: this.metricsService.metrics.responses.length + ' responses recorded',
      feedbackService: this.feedbackService.feedback.length + ' feedback entries',
      adaptationService: 'Dynamic configuration active',
      collaborationFramework: 'Multi-provider enabled'
    };
  }

  /**
   * Export all learning data (for analysis/backup)
   */
  exportLearningData() {
    return {
      userProfiles: this.personalizationEngine.getAllProfiles(),
      metrics: this.metricsService.metrics,
      feedback: this.feedbackService.feedback,
      adaptation: this.adaptationService.getConfig(),
      report: this.generateLearningReport()
    };
  }

  /**
   * Reset learning data (careful - destructive)
   */
  resetLearningData() {
    this.personalizationEngine.userProfiles.clear();
    this.metricsService.metrics = { responses: [], providers: {}, models: {}, aggregations: {} };
    this.feedbackService.feedback = [];

    this.personalizationEngine.saveProfiles();
    this.metricsService.saveMetrics();
    this.feedbackService.saveFeedback();

    console.log('⚠️ Learning data reset');
  }

  // ============================================
  // CONTEXT-AWARE OPERATIONS (for all parties)
  // ============================================

  /**
   * Get rich context for next provider response
   * Provides conversation history, user profile, success patterns
   */
  getProviderContext(userId, sessionId) {
    return this.contextExtraction.getContextForNewQuery(userId, sessionId);
  }

  /**
   * Get context for learning system analysis
   * Includes session metadata, conversation flow, improvement areas
   */
  getLearningContext(sessionId) {
    return this.contextExtraction.getContextForLearningSystem(sessionId);
  }

  /**
   * Get context for user (their history & preferences)
   */
  getUserContext(userId) {
    return this.contextExtraction.getContextForUser(userId);
  }

  /**
   * Get context for provider to understand similar user queries
   */
  getProviderCategoryContext(userId, topic) {
    return this.contextExtraction.getContextForProvider(userId, topic);
  }

  /**
   * Build rich system prompt with all available context
   */
  buildContextualSystemPrompt(userId, sessionId, task = 'general') {
    const userPrompt = this.personalizationEngine.generateSystemPrompt(userId, task);
    const contextPrompt = this.contextExtraction.buildContextPrompt(userId, sessionId);
    
    return `${userPrompt}\n\n${contextPrompt}`;
  }

  /**
   * Create new session and track it
   */
  createSession(userId, metadata = {}) {
    return this.sessionHistoryManager.createSession(userId, metadata);
  }

  /**
   * Add message to session and update context
   */
  addSessionMessage(sessionId, role, content, provider = null, feedback = null) {
    return this.sessionHistoryManager.addMessage(sessionId, {
      role,
      content,
      provider,
      feedback
    });
  }

  /**
   * Get full session with extracted context
   */
  getSessionWithContext(sessionId) {
    return this.sessionHistoryManager.getSessionWithContext(sessionId);
  }

  /**
   * Find similar sessions for context enrichment
   */
  findSimilarSessions(sessionId, limit = 3) {
    return this.sessionHistoryManager.getSimilarSessions(sessionId, limit);
  }

  /**
   * Search sessions by keyword
   */
  searchSessions(userId, query) {
    return this.sessionHistoryManager.searchSessions(userId, query);
  }

  /**
   * Extract learning data from session for ML systems
   */
  extractSessionLearning(sessionId) {
    const learningData = this.sessionHistoryManager.extractLearningData(sessionId);
    
    // Feed into personalization engine
    if (learningData.userBehavior) {
      const session = this.sessionHistoryManager.getSession(sessionId);
      if (session) {
        this.personalizationEngine.trackInteraction(session.userId, {
          query: learningData.userBehavior.queryPatterns?.[0] || 'general',
          response: 'from session context',
          selectedProviders: learningData.providerPerformance.providers || [],
          responseTime: 0,
          timestamp: Date.now()
        });
      }
    }

    return learningData;
  }

  /**
   * Export session as markdown for sharing
   */
  exportSessionAsMarkdown(sessionId) {
    return this.sessionHistoryManager.exportAsMarkdown(sessionId);
  }

  /**
   * Get analytics dashboard data combining all systems
   */
  getContextualAnalytics(userId) {
    const userContext = this.contextExtraction.getContextForUser(userId);
    const metricsData = this.metricsService.getDashboardData();
    const feedbackSummary = this.feedbackService.getFeedbackSummary();

    return {
      user: userContext,
      metrics: metricsData,
      feedback: feedbackSummary,
      personalizationStatus: this.personalizationEngine.getPersonalization(userId),
      adaptationActive: !!this.adaptationService.config
    };
  }
}

export default LearningLoopOrchestrator;
