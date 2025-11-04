/**
 * Segmentation API Skills
 * 
 * Provides semantic segmentation capabilities for conversation analysis.
 * This module can be integrated into larger AI systems to provide
 * advanced conversation understanding.
 */

import { SemanticSegmentationEngine } from '../../servers/segmentation-server.js';

// Configuration constants
const MAX_PROFILE_ITEMS = 20; // Maximum items to return in user profiles

export class SegmentationSkill {
  constructor(options = {}) {
    this.engine = new SemanticSegmentationEngine(options);
  }

  /**
   * Analyze a conversation and return semantic segments
   * 
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Segmentation results
   */
  async analyzeConversation(messages, options = {}) {
    return await this.engine.segmentMessages(messages);
  }

  /**
   * Extract traits from messages
   * 
   * @param {Array} messages - Array of message objects
   * @returns {Promise<Object>} Extracted traits
   */
  async extractTraits(messages) {
    return await this.engine.extractTraits(messages);
  }

  /**
   * Compare two conversations for similarity
   * 
   * @param {Array} conversation1 - First conversation messages
   * @param {Array} conversation2 - Second conversation messages
   * @returns {Promise<Object>} Similarity analysis
   */
  async compareConversations(conversation1, conversation2) {
    const result1 = await this.analyzeConversation(conversation1);
    const result2 = await this.analyzeConversation(conversation2);

    // Compare segments between conversations
    const crossLinks = [];
    
    for (let i = 0; i < result1.segments.length; i++) {
      const seg1 = result1.segments[i];
      
      for (let j = 0; j < result2.segments.length; j++) {
        const seg2 = result2.segments[j];
        
        // Find common topics
        const commonTopics = seg1.topics.filter(t => seg2.topics.includes(t));
        
        if (commonTopics.length > 0) {
          // Prevent division by zero when both segments have no topics
          const maxTopics = Math.max(seg1.topics.length, seg2.topics.length);
          const relevanceScore = maxTopics > 0 
            ? parseFloat((commonTopics.length / maxTopics).toFixed(2))
            : 0;
          
          crossLinks.push({
            conversation1Segment: i,
            conversation2Segment: j,
            commonTopics,
            relevanceScore
          });
        }
      }
    }

    return {
      conversation1: {
        segmentCount: result1.segments.length,
        traits: result1.traits,
        performance: result1.performance
      },
      conversation2: {
        segmentCount: result2.segments.length,
        traits: result2.traits,
        performance: result2.performance
      },
      crossLinks,
      overallSimilarity: this.calculateOverallSimilarity(result1.traits, result2.traits)
    };
  }

  /**
   * Calculate overall similarity between two trait sets
   */
  calculateOverallSimilarity(traits1, traits2) {
    let totalOverlap = 0;
    let totalItems = 0;

    for (const key of ['interests', 'skills', 'preferences', 'topics']) {
      const set1 = new Set(traits1[key] || []);
      const set2 = new Set(traits2[key] || []);
      const overlap = [...set1].filter(x => set2.has(x)).length;
      const total = Math.max(set1.size, set2.size);
      
      if (total > 0) {
        totalOverlap += overlap;
        totalItems += total;
      }
    }

    return totalItems > 0 ? parseFloat((totalOverlap / totalItems).toFixed(2)) : 0;
  }

  /**
   * Find similar conversations from a history
   * 
   * @param {Array} currentMessages - Current conversation messages
   * @param {Array} conversationHistory - Array of past conversations
   * @param {number} topK - Number of similar conversations to return
   * @returns {Promise<Array>} Most similar conversations
   */
  async findSimilarConversations(currentMessages, conversationHistory, topK = 5) {
    const currentResult = await this.analyzeConversation(currentMessages);
    const similarities = [];

    for (let i = 0; i < conversationHistory.length; i++) {
      const historyConv = conversationHistory[i];
      const comparison = await this.compareConversations(currentMessages, historyConv.messages);
      
      similarities.push({
        conversationId: historyConv.id || i,
        similarity: parseFloat(comparison.overallSimilarity),
        commonTraits: comparison.crossLinks.length,
        metadata: historyConv.metadata || {}
      });
    }

    // Sort by similarity and return top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topK);
  }

  /**
   * Build a user profile from conversation history
   * 
   * @param {Array} conversations - Array of conversation message arrays
   * @returns {Promise<Object>} Aggregated user profile
   */
  async buildUserProfile(conversations) {
    const allTraits = {
      interests: {},
      skills: {},
      preferences: {},
      topics: {},
      sentimentDistribution: { positive: 0, negative: 0, neutral: 0 }
    };

    let totalConversations = 0;

    for (const messages of conversations) {
      const result = await this.analyzeConversation(messages);
      totalConversations++;

      // Aggregate traits with frequency counts
      for (const [category, items] of Object.entries(result.traits)) {
        if (Array.isArray(items)) {
          for (const item of items) {
            if (!allTraits[category][item]) {
              allTraits[category][item] = 0;
            }
            allTraits[category][item]++;
          }
        }
      }

      // Aggregate sentiment
      if (result.traits.sentiment) {
        allTraits.sentimentDistribution[result.traits.sentiment]++;
      }
    }

    // Convert to sorted arrays with confidence scores
    const profile = {
      interests: this.rankAndScore(allTraits.interests, totalConversations),
      skills: this.rankAndScore(allTraits.skills, totalConversations),
      preferences: this.rankAndScore(allTraits.preferences, totalConversations),
      topics: this.rankAndScore(allTraits.topics, totalConversations),
      sentiment: this.calculateDominantSentiment(allTraits.sentimentDistribution),
      conversationCount: totalConversations
    };

    return profile;
  }

  /**
   * Rank items by frequency and calculate confidence scores
   */
  rankAndScore(itemCounts, totalConversations) {
    return Object.entries(itemCounts)
      .map(([item, count]) => ({
        item,
        frequency: count,
        confidence: parseFloat((count / totalConversations).toFixed(2))
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, MAX_PROFILE_ITEMS);
  }

  /**
   * Calculate dominant sentiment
   */
  calculateDominantSentiment(distribution) {
    const total = distribution.positive + distribution.negative + distribution.neutral;
    if (total === 0) return { dominant: 'neutral', confidence: 0 };

    const dominant = Object.entries(distribution)
      .reduce((max, [key, val]) => val > max.val ? { key, val } : max, { key: 'neutral', val: 0 });

    return {
      dominant: dominant.key,
      confidence: parseFloat((dominant.val / total).toFixed(2)),
      distribution
    };
  }
}

/**
 * Advanced semantic segmentation (placeholder for future enhancement)
 * 
 * NOTE: This is now implemented above! The SemanticSegmentationEngine provides:
 * - Embeddings-based segmentation using OpenAI
 * - Multi-turn context preservation
 * - Trait extraction and clustering
 * - Cross-conversation linking
 * - Confidence scoring
 * 
 * See line 404 reference in original issue - this is the implementation!
 */
export function advancedSemanticSegmentation(messages, options = {}) {
  const skill = new SegmentationSkill(options);
  return skill.analyzeConversation(messages, options);
}

export default SegmentationSkill;
