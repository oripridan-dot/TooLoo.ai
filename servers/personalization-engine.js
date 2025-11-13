/**
 * Personalization Engine - Real-time ML-based user adaptation
 * Tracks user behavior, learns preferences, and adapts responses
 */

import fs from 'fs';
import path from 'path';

class PersonalizationEngine {
  constructor(dataDir = './data/personalization') {
    this.dataDir = dataDir;
    this.ensureDirExists(dataDir);
    this.userProfiles = new Map();
    this.loadProfiles();
  }

  ensureDirExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Track user interaction and update their profile
   */
  trackInteraction(userId, data) {
    const {
      query,
      response,
      selectedProviders,
      responseTime,
      userRating,
      feedbackText,
      timestamp = Date.now()
    } = data;

    let profile = this.userProfiles.get(userId) || {
      userId,
      createdAt: timestamp,
      interactions: [],
      preferences: {
        providerPreferences: {}, // Model preference scores
        responseStyle: null, // Verbose, concise, technical, etc.
        topicInterests: {}, // Topic engagement scores
        averageRating: 0
      },
      behavior: {
        averageResponseTime: 0,
        totalInteractions: 0,
        messageLength: 0,
        queryComplexity: 'medium'
      }
    };

    // Record interaction
    profile.interactions.push({
      query,
      response,
      selectedProviders,
      responseTime,
      userRating,
      feedbackText,
      timestamp
    });

    // Update behavior metrics
    this.updateBehaviorMetrics(profile, { query, response, responseTime, userRating });

    // Learn provider preferences
    if (selectedProviders && selectedProviders.length > 0) {
      selectedProviders.forEach(provider => {
        if (!profile.preferences.providerPreferences[provider]) {
          profile.preferences.providerPreferences[provider] = { score: 0, count: 0 };
        }
        profile.preferences.providerPreferences[provider].count++;
        if (userRating) {
          profile.preferences.providerPreferences[provider].score += userRating / 5;
        }
      });
    }

    // Extract topics from query
    this.extractTopics(query, profile);

    // Update average rating
    const allRatings = profile.interactions
      .filter(i => i.userRating)
      .map(i => i.userRating);
    if (allRatings.length > 0) {
      profile.preferences.averageRating = allRatings.reduce((a, b) => a + b) / allRatings.length;
    }

    this.userProfiles.set(userId, profile);
    this.saveProfiles();

    return profile;
  }

  /**
   * Update behavior metrics based on interaction
   */
  updateBehaviorMetrics(profile, interaction) {
    const { query, response, responseTime, userRating } = interaction;

    profile.behavior.totalInteractions++;
    profile.behavior.averageResponseTime = 
      (profile.behavior.averageResponseTime * (profile.behavior.totalInteractions - 1) + responseTime) / 
      profile.behavior.totalInteractions;

    profile.behavior.messageLength = response.length;

    // Estimate query complexity
    const wordCount = query.split(/\s+/).length;
    const complexity = wordCount > 30 ? 'high' : wordCount > 15 ? 'medium' : 'low';
    profile.behavior.queryComplexity = complexity;
  }

  /**
   * Extract topics from user queries for interest tracking
   */
  extractTopics(query, profile) {
    const topicKeywords = {
      'coding': ['code', 'javascript', 'python', 'function', 'class', 'debug', 'error', 'function'],
      'analysis': ['analyze', 'analysis', 'data', 'metrics', 'statistics', 'report'],
      'creative': ['creative', 'write', 'story', 'poem', 'ideas', 'brainstorm', 'imagine'],
      'research': ['research', 'study', 'investigate', 'explore', 'findings', 'evidence'],
      'planning': ['plan', 'roadmap', 'strategy', 'steps', 'process', 'workflow'],
      'learning': ['learn', 'understand', 'explain', 'how', 'what', 'why', 'tutorial']
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const queryLower = query.toLowerCase();
      const matchCount = keywords.filter(kw => queryLower.includes(kw)).length;
      
      if (matchCount > 0) {
        if (!profile.preferences.topicInterests[topic]) {
          profile.preferences.topicInterests[topic] = 0;
        }
        profile.preferences.topicInterests[topic] += matchCount;
      }
    });
  }

  /**
   * Get personalization recommendations for a user
   */
  getPersonalization(userId) {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return {
        userId,
        preferredProviders: [],
        responseStyle: 'balanced',
        focusTopics: [],
        confidence: 0
      };
    }

    // Rank providers by user preference
    const preferredProviders = Object.entries(profile.preferences.providerPreferences)
      .map(([provider, data]) => ({
        provider,
        score: data.score / Math.max(1, data.count)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(p => p.provider);

    // Determine response style
    const responseStyle = this.determineResponseStyle(profile);

    // Get top topics
    const focusTopics = Object.entries(profile.preferences.topicInterests)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(t => t[0]);

    // Calculate confidence (more interactions = higher confidence)
    const confidence = Math.min(1, profile.interactions.length / 20);

    return {
      userId,
      preferredProviders: preferredProviders.length > 0 ? preferredProviders : ['claude', 'gemini', 'gpt-4'],
      responseStyle,
      focusTopics,
      confidence,
      averageRating: profile.preferences.averageRating,
      totalInteractions: profile.behavior.totalInteractions
    };
  }

  /**
   * Determine user's preferred response style
   */
  determineResponseStyle(profile) {
    if (profile.preferences.topicInterests['coding']) return 'technical';
    if (profile.preferences.topicInterests['creative']) return 'creative';
    if (profile.preferences.topicInterests['analysis']) return 'analytical';
    if (profile.preferences.topicInterests['learning']) return 'educational';
    return 'balanced';
  }

  /**
   * Get user profile
   */
  getProfile(userId) {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Get all profiles (for analysis)
   */
  getAllProfiles() {
    return Array.from(this.userProfiles.values());
  }

  /**
   * Generate personalized system prompt
   */
  generateSystemPrompt(userId, mode = 'general') {
    const personalization = this.getPersonalization(userId);
    const profile = this.userProfiles.get(userId);

    let basePrompt = `You are TooLoo.ai, a multi-provider AI system that provides collaborative intelligence.`;

    if (profile && profile.interactions.length > 0) {
      basePrompt += `\n\nUser Profile:
- Preferred response style: ${personalization.responseStyle}
- Primary interests: ${personalization.focusTopics.join(', ') || 'general'}
- Previous satisfaction: ${(personalization.averageRating * 100).toFixed(0)}% average rating
- Interaction history: ${personalization.totalInteractions} previous queries`;
    }

    // Add mode-specific instructions
    const modeInstructions = {
      'coding': '\nProvide code examples, explain technical concepts with precision.',
      'analysis': '\nFocus on data-driven insights, metrics, and comparative analysis.',
      'creative': '\nEncourage innovation, provide diverse perspectives and ideas.',
      'learning': '\nExplain concepts clearly, use examples, build understanding progressively.'
    };

    if (modeInstructions[personalization.responseStyle]) {
      basePrompt += modeInstructions[personalization.responseStyle];
    }

    basePrompt += `\n\nAdapt your response based on this user's preferences and history. Be concise if they prefer it, detailed if they engage more with comprehensive responses.`;

    return basePrompt;
  }

  /**
   * Save profiles to disk
   */
  saveProfiles() {
    const data = Array.from(this.userProfiles.entries()).map(([userId, profile]) => ({
      userId,
      ...profile
    }));

    const filePath = path.join(this.dataDir, 'profiles.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Load profiles from disk
   */
  loadProfiles() {
    const filePath = path.join(this.dataDir, 'profiles.json');
    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        data.forEach(profile => {
          this.userProfiles.set(profile.userId, profile);
        });
      }
    } catch (err) {
      console.warn('Could not load personalization profiles:', err.message);
    }
  }

  /**
   * Clear old profiles (data cleanup)
   */
  clearOldProfiles(daysOld = 90) {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let removed = 0;

    for (const [userId, profile] of this.userProfiles) {
      const lastInteraction = profile.interactions[profile.interactions.length - 1];
      if (lastInteraction && lastInteraction.timestamp < cutoff) {
        this.userProfiles.delete(userId);
        removed++;
      }
    }

    if (removed > 0) {
      this.saveProfiles();
      console.log(`Cleaned up ${removed} old user profiles`);
    }

    return removed;
  }
}

export default PersonalizationEngine;
