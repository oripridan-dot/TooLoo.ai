/**
 * User Feedback Collection Service
 * Gathers user feedback and routes it to learning systems
 */

import fs from 'fs';
import path from 'path';

class UserFeedbackService {
  constructor(dataDir = './data/feedback') {
    this.dataDir = dataDir;
    this.ensureDirExists(dataDir);
    this.feedback = [];
    this.loadFeedback();
  }

  ensureDirExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Submit feedback on a response
   */
  submitFeedback(data) {
    const {
      responseId,
      userId,
      query,
      response,
      provider,
      rating, // 1-5
      accuracy, // 1-5
      relevance, // 1-5
      usability, // 1-5
      feedbackText,
      suggestedImprovement,
      timestamp = Date.now()
    } = data;

    const feedback = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      responseId,
      userId,
      query,
      response: response.substring(0, 300),
      provider,
      rating,
      accuracy,
      relevance,
      usability,
      feedbackText,
      suggestedImprovement,
      timestamp,
      processed: false
    };

    this.feedback.push(feedback);
    this.saveFeedback();

    return feedback.id;
  }

  /**
   * Get feedback summary
   */
  getFeedbackSummary() {
    if (this.feedback.length === 0) {
      return null;
    }

    const ratings = this.feedback.filter(f => f.rating);
    const accuracyScores = this.feedback.filter(f => f.accuracy);
    const relevanceScores = this.feedback.filter(f => f.relevance);
    const usabilityScores = this.feedback.filter(f => f.usability);

    const avg = (arr, key) => arr.length > 0 
      ? (arr.reduce((a, b) => a + b[key], 0) / arr.length).toFixed(2)
      : 0;

    return {
      totalFeedback: this.feedback.length,
      averageRating: avg(ratings, 'rating'),
      averageAccuracy: avg(accuracyScores, 'accuracy'),
      averageRelevance: avg(relevanceScores, 'relevance'),
      averageUsability: avg(usabilityScores, 'usability'),
      unprocessed: this.feedback.filter(f => !f.processed).length
    };
  }

  /**
   * Get feedback by provider
   */
  getFeedbackByProvider(provider) {
    return this.feedback
      .filter(f => f.provider === provider)
      .map(f => ({
        rating: f.rating,
        accuracy: f.accuracy,
        relevance: f.relevance,
        usability: f.usability,
        feedbackText: f.feedbackText,
        timestamp: f.timestamp
      }));
  }

  /**
   * Get improvement suggestions from feedback
   */
  getImprovementSuggestions() {
    return this.feedback
      .filter(f => f.suggestedImprovement)
      .map(f => ({
        provider: f.provider,
        suggestion: f.suggestedImprovement,
        context: f.feedbackText,
        timestamp: f.timestamp
      }));
  }

  /**
   * Get low-rated responses for analysis
   */
  getLowRatedResponses(threshold = 2) {
    return this.feedback
      .filter(f => f.rating && f.rating <= threshold)
      .map(f => ({
        query: f.query,
        response: f.response,
        provider: f.provider,
        rating: f.rating,
        reason: f.feedbackText,
        timestamp: f.timestamp
      }));
  }

  /**
   * Mark feedback as processed (for learning systems)
   */
  markAsProcessed(feedbackId) {
    const fb = this.feedback.find(f => f.id === feedbackId);
    if (fb) {
      fb.processed = true;
      this.saveFeedback();
      return true;
    }
    return false;
  }

  /**
   * Get unprocessed feedback for learning system
   */
  getUnprocessedFeedback() {
    return this.feedback.filter(f => !f.processed);
  }

  /**
   * Bulk mark feedback as processed
   */
  markBatchAsProcessed(feedbackIds) {
    feedbackIds.forEach(id => this.markAsProcessed(id));
    return feedbackIds.length;
  }

  /**
   * Save feedback to disk
   */
  saveFeedback() {
    const filePath = path.join(this.dataDir, 'feedback.json');
    fs.writeFileSync(filePath, JSON.stringify(this.feedback, null, 2));
  }

  /**
   * Load feedback from disk
   */
  loadFeedback() {
    const filePath = path.join(this.dataDir, 'feedback.json');
    try {
      if (fs.existsSync(filePath)) {
        this.feedback = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (err) {
      console.warn('Could not load feedback:', err.message);
    }
  }

  /**
   * Export feedback for analysis
   */
  exportFeedback(format = 'json') {
    if (format === 'csv') {
      return this.exportAsCSV();
    }
    return this.feedback;
  }

  /**
   * Export feedback as CSV
   */
  exportAsCSV() {
    const headers = ['timestamp', 'provider', 'rating', 'accuracy', 'relevance', 'usability', 'feedback'];
    const rows = this.feedback.map(f => [
      new Date(f.timestamp).toISOString(),
      f.provider,
      f.rating || '',
      f.accuracy || '',
      f.relevance || '',
      f.usability || '',
      `"${(f.feedbackText || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Clear old feedback (keep last 6 months)
   */
  clearOldFeedback(daysOld = 180) {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const initial = this.feedback.length;

    this.feedback = this.feedback.filter(f => f.timestamp > cutoff);

    if (this.feedback.length < initial) {
      this.saveFeedback();
      console.log(`Cleaned up ${initial - this.feedback.length} old feedback entries`);
    }

    return initial - this.feedback.length;
  }
}

export default UserFeedbackService;
