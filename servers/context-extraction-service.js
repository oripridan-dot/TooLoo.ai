/**
 * Context Extraction & Distribution Service
 * Makes session history context available to all systems
 * Users, providers, and learning systems can all access relevant context
 */

class ContextExtractionService {
  constructor(sessionHistoryManager) {
    this.sessionHistory = sessionHistoryManager;
  }

  /**
   * Get context for a new query (provide history context to providers)
   */
  getContextForNewQuery(userId, sessionId, limit = 10) {
    const session = this.sessionHistory.getSession(sessionId);
    if (!session) return null;

    // Get recent messages as context
    const recentMessages = session.messages.slice(-limit).map(msg => ({
      role: msg.role,
      content: msg.content,
      provider: msg.provider,
      timestamp: msg.timestamp
    }));

    return {
      sessionId,
      userId,
      conversationHistory: recentMessages,
      sessionContext: {
        topics: session.context.topics,
        providers: session.context.providers,
        complexity: session.context.complexity,
        keyInsights: session.context.keyInsights
      },
      userProfile: this.extractUserProfile(session),
      successPatterns: this.identifySuccessPatterns(session)
    };
  }

  /**
   * Extract user profile from session history
   */
  extractUserProfile(session) {
    return {
      communicationStyle: this.determineCommunicationStyle(session),
      preferredProviders: this.getPreferredProviders(session),
      topicInterests: session.context.topics,
      engagementLevel: 'high', // Would be calculated
      queryComplexity: session.context.complexity,
      feedbackTendency: this.analyzeFeedbackTendency(session)
    };
  }

  /**
   * Determine user's communication style from history
   */
  determineCommunicationStyle(session) {
    const userMessages = session.messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return 'neutral';

    const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length;
    const formalityCount = userMessages.filter(m => 
      m.content.includes('please') || m.content.includes('thank')
    ).length;

    let style = 'casual';
    if (avgLength > 300) style = 'detailed';
    if (formalityCount / userMessages.length > 0.3) style = 'formal';
    if (userMessages.some(m => m.content.includes('?'))) style = 'questioning';

    return style;
  }

  /**
   * Get user's preferred providers
   */
  getPreferredProviders(session) {
    const providers = {};
    
    session.messages
      .filter(m => m.role === 'assistant' && m.provider)
      .forEach(msg => {
        if (!providers[msg.provider]) {
          providers[msg.provider] = { count: 0, rating: 0 };
        }
        providers[msg.provider].count++;
        if (msg.feedback?.rating) {
          providers[msg.provider].rating += msg.feedback.rating;
        }
      });

    return Object.entries(providers)
      .map(([provider, data]) => ({
        provider,
        interactions: data.count,
        avgRating: data.rating > 0 ? (data.rating / data.count).toFixed(2) : 0
      }))
      .sort((a, b) => b.interactions - a.interactions);
  }

  /**
   * Analyze user's feedback tendency
   */
  analyzeFeedbackTendency(session) {
    const feedbackMessages = session.messages.filter(m => m.feedback);
    const ratings = feedbackMessages.map(m => m.feedback.rating);

    if (ratings.length === 0) return 'non-rater';
    
    const avg = ratings.reduce((a, b) => a + b) / ratings.length;
    
    if (avg >= 4) return 'generous';
    if (avg <= 2.5) return 'critical';
    return 'balanced';
  }

  /**
   * Identify success patterns in conversation
   */
  identifySuccessPatterns(session) {
    const highRatedMessages = session.messages.filter(m => 
      m.role === 'assistant' && m.feedback && m.feedback.rating >= 4
    );

    const patterns = {
      bestPerformingProviders: [],
      effectiveQueryTypes: [],
      successfulTopics: []
    };

    // Analyze best performing providers
    const providerScores = {};
    highRatedMessages.forEach(msg => {
      if (msg.provider) {
        providerScores[msg.provider] = (providerScores[msg.provider] || 0) + 1;
      }
    });

    patterns.bestPerformingProviders = Object.entries(providerScores)
      .map(([provider, score]) => ({ provider, score }))
      .sort((a, b) => b.score - a.score);

    // Analyze effective query patterns
    const userMessages = session.messages.filter(m => m.role === 'user');
    const nextIsHighRated = userMessages.map((msg, idx) => {
      const nextMsg = session.messages[session.messages.indexOf(msg) + 1];
      return nextMsg?.feedback?.rating >= 4;
    });

    // Analyze successful topics
    patterns.successfulTopics = session.context.topics;

    return patterns;
  }

  /**
   * Get context for learning system
   */
  getContextForLearningSystem(sessionId) {
    const sessionWithContext = this.sessionHistory.getSessionWithContext(sessionId);
    if (!sessionWithContext) return null;

    return {
      sessionId,
      userId: sessionWithContext.userId,
      metadata: sessionWithContext.metadata,
      learningData: sessionWithContext.learningData,
      conversationFlow: this.analyzeConversationFlow(sessionWithContext),
      improvements: this.identifyImprovements(sessionWithContext)
    };
  }

  /**
   * Analyze conversation flow for learning
   */
  analyzeConversationFlow(session) {
    const userMessages = session.messages.filter(m => m.role === 'user');
    const flow = {
      initialQuestion: userMessages[0]?.content.substring(0, 100),
      followUpCount: Math.max(0, userMessages.length - 1),
      topicProgression: [],
      clarificationNeeded: false
    };

    // Track topic progression
    let currentTopic = null;
    userMessages.forEach((msg, idx) => {
      const topics = this.sessionHistory.extractTopics(session).map(t => t.topic);
      topics.forEach(topic => {
        if (msg.content.toLowerCase().includes(topic) && topic !== currentTopic) {
          flow.topicProgression.push(topic);
          currentTopic = topic;
        }
      });
    });

    return flow;
  }

  /**
   * Identify improvements from session
   */
  identifyImprovements(session) {
    const lowRatedMessages = session.messages.filter(m => 
      m.role === 'assistant' && m.feedback && m.feedback.rating <= 2
    );

    const improvements = {
      areasToImprove: [],
      failurePatterns: [],
      suggestions: []
    };

    // Identify problematic providers
    lowRatedMessages.forEach(msg => {
      if (msg.provider && msg.feedback.text) {
        improvements.areasToImprove.push({
          provider: msg.provider,
          issue: msg.feedback.text,
          context: msg.content.substring(0, 100)
        });
      }
    });

    // Look for patterns in failures
    if (lowRatedMessages.length > 1) {
      improvements.failurePatterns.push(
        `${lowRatedMessages.length} low-rated responses detected`
      );
    }

    // Generate suggestions
    if (improvements.areasToImprove.length > 0) {
      improvements.suggestions.push(
        'Review provider parameters for quality improvement'
      );
    }

    return improvements;
  }

  /**
   * Get context for user (show their history)
   */
  getContextForUser(userId, limit = 5) {
    const sessions = this.sessionHistory.getUserSessions(userId).slice(0, limit);

    return {
      userId,
      sessions: sessions.map(session => ({
        id: session.id,
        title: session.metadata.title,
        date: new Date(session.createdAt).toLocaleString(),
        messageCount: session.stats.messageCount,
        averageRating: session.stats.averageRating.toFixed(2),
        topics: session.context.topics.slice(0, 3).map(t => t.topic)
      })),
      summary: this.getUserContextSummary(userId)
    };
  }

  /**
   * Get user context summary
   */
  getUserContextSummary(userId) {
    const userSessions = this.sessionHistory.getUserSessions(userId);

    const allTopics = {};
    const allProviders = {};
    
    userSessions.forEach(session => {
      session.context.topics.forEach(t => {
        allTopics[t.topic] = (allTopics[t.topic] || 0) + t.relevance;
      });
      session.context.providers.forEach(p => {
        allProviders[p] = (allProviders[p] || 0) + 1;
      });
    });

    return {
      totalSessions: userSessions.length,
      totalMessages: userSessions.reduce((sum, s) => sum + s.stats.messageCount, 0),
      primaryInterests: Object.entries(allTopics)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([topic]) => topic),
      preferredProviders: Object.entries(allProviders)
        .sort((a, b) => b[1] - a[1])
        .map(([provider, count]) => ({ provider, usageCount: count })),
      averageSessionRating: (userSessions.reduce((sum, s) => sum + s.stats.averageRating, 0) / Math.max(1, userSessions.length)).toFixed(2)
    };
  }

  /**
   * Get context for provider (what similar users ask)
   */
  getContextForProvider(userId, topic) {
    const userSessions = this.sessionHistory.getUserSessions(userId);
    
    // Find sessions with this topic
    const relevantSessions = userSessions.filter(session =>
      session.context.topics.some(t => t.topic === topic)
    );

    // Extract conversation patterns
    const patterns = {
      commonQuestions: [],
      effectiveApproaches: [],
      userPreferences: []
    };

    relevantSessions.forEach(session => {
      const userMessages = session.messages.filter(m => m.role === 'user');
      userMessages.forEach(msg => {
        if (msg.content.toLowerCase().includes(topic)) {
          patterns.commonQuestions.push(msg.content.substring(0, 150));
        }
      });
    });

    patterns.commonQuestions = [...new Set(patterns.commonQuestions)].slice(0, 3);

    return patterns;
  }

  /**
   * Build rich context prompt for AI providers
   */
  buildContextPrompt(userId, sessionId) {
    const context = this.getContextForNewQuery(userId, sessionId);
    if (!context) return '';

    let prompt = '## Conversation Context\n\n';

    prompt += '### Previous Messages\n';
    context.conversationHistory.slice(-3).forEach(msg => {
      prompt += `- **${msg.role === 'user' ? 'User' : msg.provider || 'Assistant'}:** ${msg.content.substring(0, 100)}...\n`;
    });

    prompt += '\n### User Profile\n';
    prompt += `- Style: ${context.userProfile.communicationStyle}\n`;
    prompt += `- Topics: ${context.sessionContext.topics.map(t => t.topic).join(', ')}\n`;
    prompt += `- Complexity: ${context.sessionContext.complexity}\n`;

    prompt += '\n### Success Patterns\n';
    if (context.successPatterns.bestPerformingProviders.length > 0) {
      const best = context.successPatterns.bestPerformingProviders[0];
      prompt += `- Best performing approach: ${best.provider}\n`;
    }

    return prompt;
  }
}

export default ContextExtractionService;
