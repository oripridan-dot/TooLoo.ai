/**
 * Session History Manager
 * Maintains complete conversation history with full context
 * Allows all systems to access and learn from previous sessions
 */

import fs from 'fs';
import path from 'path';

class SessionHistoryManager {
  constructor(dataDir = './data/sessions') {
    this.dataDir = dataDir;
    this.ensureDirExists(dataDir);
    this.sessions = new Map();
    this.loadSessions();
  }

  ensureDirExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Create a new session
   */
  createSession(userId, metadata = {}) {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      id: sessionId,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      metadata: {
        title: metadata.title || 'Untitled Session',
        description: metadata.description || '',
        tags: metadata.tags || [],
        ...metadata
      },
      context: {
        providers: [],
        topics: [],
        sentiment: null,
        complexity: 'medium',
        keyInsights: []
      },
      stats: {
        messageCount: 0,
        questionCount: 0,
        responseCount: 0,
        averageRating: 0,
        totalTokens: 0
      }
    };

    this.sessions.set(sessionId, session);
    this.saveSessions();
    return session;
  }

  /**
   * Add message to session
   */
  addMessage(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const messageEntry = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: message.role, // 'user' or 'assistant'
      content: message.content,
      provider: message.provider || null, // Which AI provider (if assistant)
      timestamp: message.timestamp || Date.now(),
      metadata: message.metadata || {
        tokens: 0,
        responseTime: 0,
        model: null,
        confidence: null
      },
      feedback: message.feedback || null // User feedback on this message
    };

    session.messages.push(messageEntry);
    this.updateSessionStats(session);
    session.updatedAt = Date.now();

    this.sessions.set(sessionId, session);
    this.saveSessions();

    return messageEntry.id;
  }

  /**
   * Update session stats based on messages
   */
  updateSessionStats(session) {
    session.stats.messageCount = session.messages.length;
    session.stats.questionCount = session.messages.filter(m => m.role === 'user').length;
    session.stats.responseCount = session.messages.filter(m => m.role === 'assistant').length;

    // Calculate average rating
    const ratings = session.messages
      .filter(m => m.feedback && m.feedback.rating)
      .map(m => m.feedback.rating);
    
    if (ratings.length > 0) {
      session.stats.averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    }

    // Sum tokens
    session.stats.totalTokens = session.messages.reduce((sum, m) => sum + (m.metadata?.tokens || 0), 0);

    // Update context
    this.updateSessionContext(session);
  }

  /**
   * Update session context (topics, sentiment, insights)
   */
  updateSessionContext(session) {
    // Extract providers mentioned
    const providers = new Set();
    session.messages.forEach(m => {
      if (m.provider) providers.add(m.provider);
    });
    session.context.providers = Array.from(providers);

    // Extract topics from user messages
    const topics = this.extractTopics(session);
    session.context.topics = topics;

    // Determine complexity
    const avgQueryLength = session.messages
      .filter(m => m.role === 'user')
      .reduce((sum, m) => sum + m.content.length, 0) / Math.max(1, session.stats.questionCount);
    
    session.context.complexity = avgQueryLength > 300 ? 'high' : avgQueryLength > 150 ? 'medium' : 'low';

    // Extract key insights
    session.context.keyInsights = this.extractKeyInsights(session);
  }

  /**
   * Extract topics from session messages
   */
  extractTopics(session) {
    const topicKeywords = {
      'coding': ['code', 'javascript', 'python', 'function', 'debug', 'error'],
      'analysis': ['analyze', 'data', 'metrics', 'statistics', 'report'],
      'creative': ['write', 'story', 'poem', 'ideas', 'brainstorm'],
      'research': ['research', 'study', 'investigate', 'evidence'],
      'planning': ['plan', 'roadmap', 'strategy', 'steps', 'process'],
      'learning': ['learn', 'understand', 'explain', 'how', 'why', 'tutorial']
    };

    const topics = {};
    session.messages
      .filter(m => m.role === 'user')
      .forEach(message => {
        const text = message.content.toLowerCase();
        Object.entries(topicKeywords).forEach(([topic, keywords]) => {
          const matches = keywords.filter(kw => text.includes(kw)).length;
          if (matches > 0) {
            topics[topic] = (topics[topic] || 0) + matches;
          }
        });
      });

    return Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .map(([topic, count]) => ({ topic, relevance: count }))
      .slice(0, 5);
  }

  /**
   * Extract key insights from session
   */
  extractKeyInsights(session) {
    const insights = [];

    // Find high-quality responses
    const highRatedMessages = session.messages.filter(m => 
      m.role === 'assistant' && m.feedback && m.feedback.rating >= 4
    );

    highRatedMessages.forEach(msg => {
      insights.push({
        type: 'high_quality_response',
        content: msg.content.substring(0, 200),
        provider: msg.provider,
        rating: msg.feedback.rating
      });
    });

    // Find common patterns
    const questionCount = session.stats.questionCount;
    if (questionCount > 3) {
      insights.push({
        type: 'conversation_depth',
        detail: `${questionCount} questions asked, suggesting deep engagement`
      });
    }

    // Find unanimous provider agreement
    const assistantMessages = session.messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length > 1) {
      const lastMessages = assistantMessages.slice(-3);
      if (lastMessages.every(m => m.feedback?.rating >= 4)) {
        insights.push({
          type: 'strong_agreement',
          detail: 'Multiple providers provided highly-rated responses'
        });
      }
    }

    return insights.slice(0, 3);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId) {
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get session with full context for learning systems
   */
  getSessionWithContext(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    return {
      ...session,
      summary: this.generateSessionSummary(session),
      learningData: this.extractLearningData(session)
    };
  }

  /**
   * Generate human-readable session summary
   */
  generateSessionSummary(session) {
    const userMessages = session.messages.filter(m => m.role === 'user');
    const assistantMessages = session.messages.filter(m => m.role === 'assistant');

    return {
      duration: session.updatedAt - session.createdAt,
      messageCount: session.messages.length,
      userQuestions: userMessages.length,
      providerResponses: assistantMessages.length,
      primaryTopics: session.context.topics.slice(0, 3),
      usedProviders: session.context.providers,
      averageRating: session.stats.averageRating.toFixed(2),
      complexity: session.context.complexity,
      keyTakeaway: userMessages.length > 0 
        ? userMessages[userMessages.length - 1].content.substring(0, 100)
        : 'Session initiated'
    };
  }

  /**
   * Extract learning data for ML systems
   */
  extractLearningData(session) {
    return {
      userBehavior: {
        questionPatterns: this.extractQuestionPatterns(session),
        preferredProviders: this.getProviderPreferences(session),
        averageQueryLength: this.calculateAverageQueryLength(session),
        engagementLevel: this.calculateEngagementLevel(session)
      },
      providerPerformance: this.analyzeProviderPerformance(session),
      topicPreferences: this.getTopicPreferences(session),
      qualityMetrics: this.calculateQualityMetrics(session)
    };
  }

  /**
   * Extract question patterns
   */
  extractQuestionPatterns(session) {
    const userMessages = session.messages.filter(m => m.role === 'user');
    const patterns = {
      shortQuestions: 0, // < 50 chars
      mediumQuestions: 0, // 50-300 chars
      longQuestions: 0, // > 300 chars
      followUpQuestions: 0,
      clarificationQuestions: 0
    };

    userMessages.forEach((msg, idx) => {
      const len = msg.content.length;
      if (len < 50) patterns.shortQuestions++;
      else if (len < 300) patterns.mediumQuestions++;
      else patterns.longQuestions++;

      // Detect follow-up patterns
      if (idx > 0 && (msg.content.includes('more') || msg.content.includes('explain') || msg.content.includes('how'))) {
        patterns.followUpQuestions++;
      }
    });

    return patterns;
  }

  /**
   * Get provider preferences from this session
   */
  getProviderPreferences(session) {
    const assistantMessages = session.messages.filter(m => m.role === 'assistant');
    const preferences = {};

    assistantMessages.forEach(msg => {
      if (msg.provider) {
        if (!preferences[msg.provider]) {
          preferences[msg.provider] = { count: 0, totalRating: 0, avgRating: 0 };
        }
        preferences[msg.provider].count++;
        if (msg.feedback?.rating) {
          preferences[msg.provider].totalRating += msg.feedback.rating;
        }
      }
    });

    // Calculate average ratings
    Object.keys(preferences).forEach(provider => {
      if (preferences[provider].count > 0) {
        preferences[provider].avgRating = (preferences[provider].totalRating / preferences[provider].count).toFixed(2);
      }
    });

    return preferences;
  }

  /**
   * Calculate average query length
   */
  calculateAverageQueryLength(session) {
    const userMessages = session.messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return 0;
    return Math.round(userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length);
  }

  /**
   * Calculate engagement level (0-100)
   */
  calculateEngagementLevel(session) {
    let score = 0;
    score += Math.min(session.stats.messageCount * 5, 30); // Message count (up to 30)
    score += Math.min(session.stats.questionCount * 10, 30); // Questions asked (up to 30)
    
    const ratings = session.messages
      .filter(m => m.feedback?.rating)
      .map(m => m.feedback.rating);
    if (ratings.length > 0) {
      score += (ratings.reduce((a, b) => a + b, 0) / (ratings.length * 5)) * 40; // Ratings (up to 40)
    }

    return Math.round(Math.min(score, 100));
  }

  /**
   * Analyze provider performance in this session
   */
  analyzeProviderPerformance(session) {
    const providers = {};
    
    session.messages.filter(m => m.role === 'assistant').forEach(msg => {
      if (msg.provider) {
        if (!providers[msg.provider]) {
          providers[msg.provider] = {
            responseCount: 0,
            averageTime: 0,
            averageRating: 0,
            totalTime: 0,
            totalRating: 0
          };
        }
        
        providers[msg.provider].responseCount++;
        providers[msg.provider].totalTime += msg.metadata?.responseTime || 0;
        if (msg.feedback?.rating) {
          providers[msg.provider].totalRating += msg.feedback.rating;
        }
      }
    });

    // Calculate averages
    Object.keys(providers).forEach(provider => {
      const p = providers[provider];
      if (p.responseCount > 0) {
        p.averageTime = Math.round(p.totalTime / p.responseCount);
        p.averageRating = (p.totalRating / p.responseCount).toFixed(2);
      }
    });

    return providers;
  }

  /**
   * Get topic preferences from this session
   */
  getTopicPreferences(session) {
    return session.context.topics.reduce((acc, t) => {
      acc[t.topic] = t.relevance;
      return acc;
    }, {});
  }

  /**
   * Calculate quality metrics
   */
  calculateQualityMetrics(session) {
    const assistantMessages = session.messages.filter(m => m.role === 'assistant');
    const ratedMessages = assistantMessages.filter(m => m.feedback?.rating);

    return {
      totalResponses: assistantMessages.length,
      ratedResponses: ratedMessages.length,
      ratingCoverage: ratedMessages.length > 0 ? (ratedMessages.length / assistantMessages.length * 100).toFixed(1) : 0,
      averageRating: ratedMessages.length > 0 
        ? (ratedMessages.reduce((sum, m) => sum + m.feedback.rating, 0) / ratedMessages.length).toFixed(2)
        : 0,
      highQualityResponses: ratedMessages.filter(m => m.feedback.rating >= 4).length,
      lowQualityResponses: ratedMessages.filter(m => m.feedback.rating <= 2).length
    };
  }

  /**
   * Search sessions by keywords
   */
  searchSessions(userId, keywords) {
    const userSessions = this.getUserSessions(userId);
    
    return userSessions.filter(session => {
      const searchText = [
        session.metadata.title,
        session.metadata.description,
        ...session.messages.map(m => m.content)
      ].join(' ').toLowerCase();

      return keywords.every(kw => searchText.includes(kw.toLowerCase()));
    });
  }

  /**
   * Get similar sessions (for context building)
   */
  getSimilarSessions(userId, sessionId, limit = 5) {
    const targetSession = this.getSession(sessionId);
    if (!targetSession) return [];

    const userSessions = this.getUserSessions(userId)
      .filter(s => s.id !== sessionId);

    // Calculate similarity based on topics
    const scored = userSessions.map(session => {
      let similarity = 0;

      // Match topics
      targetSession.context.topics.forEach(targetTopic => {
        session.context.topics.forEach(sessionTopic => {
          if (targetTopic.topic === sessionTopic.topic) {
            similarity += 1;
          }
        });
      });

      return { session, similarity };
    });

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(s => ({
        ...s.session,
        similarityScore: s.similarity
      }));
  }

  /**
   * Export session data
   */
  exportSession(sessionId, format = 'json') {
    const session = this.getSessionWithContext(sessionId);
    if (!session) return null;

    if (format === 'md') {
      return this.exportAsMarkdown(session);
    }

    return session;
  }

  /**
   * Export session as Markdown
   */
  exportAsMarkdown(session) {
    let md = `# ${session.metadata.title}\n\n`;
    md += `**Date:** ${new Date(session.createdAt).toLocaleString()}\n`;
    md += `**Duration:** ${Math.round((session.updatedAt - session.createdAt) / 1000)}s\n`;
    md += `**Messages:** ${session.stats.messageCount}\n`;
    md += `**Average Rating:** ${session.stats.averageRating.toFixed(2)}/5\n\n`;

    md += `## Conversation\n\n`;
    session.messages.forEach(msg => {
      const role = msg.role === 'user' ? '👤 User' : `🤖 ${msg.provider || 'Assistant'}`;
      md += `### ${role}\n\n${msg.content}\n\n`;
      
      if (msg.feedback) {
        md += `> ⭐ Rating: ${msg.feedback.rating}/5${msg.feedback.text ? ` - ${msg.feedback.text}` : ''}\n\n`;
      }
    });

    md += `## Summary\n\n`;
    const summary = session.summary;
    md += `- **Topics:** ${summary.primaryTopics.map(t => t.topic).join(', ')}\n`;
    md += `- **Providers Used:** ${summary.usedProviders.join(', ')}\n`;
    md += `- **Complexity:** ${summary.complexity}\n`;

    return md;
  }

  /**
   * Get all sessions (for analytics)
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear old sessions (keep last N days)
   */
  clearOldSessions(daysOld = 90) {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let removed = 0;

    for (const [sessionId, session] of this.sessions) {
      if (session.updatedAt < cutoff) {
        this.sessions.delete(sessionId);
        removed++;
      }
    }

    if (removed > 0) {
      this.saveSessions();
    }

    return removed;
  }

  /**
   * Save sessions to disk
   */
  saveSessions() {
    const data = Array.from(this.sessions.entries()).map(([id, session]) => ({
      id,
      ...session
    }));

    const filePath = path.join(this.dataDir, 'sessions.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Load sessions from disk
   */
  loadSessions() {
    const filePath = path.join(this.dataDir, 'sessions.json');
    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        data.forEach(session => {
          this.sessions.set(session.id, session);
        });
      }
    } catch (err) {
      console.warn('Could not load sessions:', err.message);
    }
  }
}

export default SessionHistoryManager;
