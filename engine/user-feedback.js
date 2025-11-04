// User Feedback Loop System for TooLoo.ai
// Allows users to rate validation quality and improve recommendations

import fs from 'fs';
import path from 'path';

class UserFeedbackSystem {
  constructor() {
    this.feedbackFile = path.join(process.cwd(), 'logs', 'user-feedback.json');
    this.feedbackHistory = this.loadFeedbackHistory();
    
    // Feedback scoring system
    this.feedbackWeights = {
      helpful: 1.0,
      not_helpful: -0.5,
      very_helpful: 1.5,
      very_unhelpful: -1.0,
      neutral: 0.0
    };

    // Response quality tracking
    this.qualityMetrics = {
      validationAccuracy: new Map(), // provider pair -> accuracy scores
      userSatisfaction: new Map(),   // validation reason -> satisfaction
      improvementSuggestions: []     // user suggestions for improvement
    };

    this.loadQualityMetrics();
  }

  loadFeedbackHistory() {
    try {
      if (fs.existsSync(this.feedbackFile)) {
        return JSON.parse(fs.readFileSync(this.feedbackFile, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load feedback history:', error.message);
    }
    return [];
  }

  saveFeedbackHistory() {
    try {
      const dir = path.dirname(this.feedbackFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Keep only last 2000 feedback entries
      const recentFeedback = this.feedbackHistory.slice(-2000);
      fs.writeFileSync(this.feedbackFile, JSON.stringify(recentFeedback, null, 2));
    } catch (error) {
      console.warn('Could not save feedback history:', error.message);
    }
  }

  loadQualityMetrics() {
    // Initialize quality metrics from historical feedback
    for (const feedback of this.feedbackHistory) {
      this.updateQualityMetrics(feedback);
    }
  }

  recordFeedback({
    sessionId,
    validationId,
    prompt,
    primaryProvider,
    validatorProvider,
    validationReason,
    agreement,
    userRating, // helpful, not_helpful, very_helpful, very_unhelpful, neutral
    userComment = '',
    responseTime,
    expectedQuality = null,
    actualQuality = null,
    improvementSuggestion = ''
  }) {
    const feedback = {
      id: this.generateFeedbackId(),
      timestamp: new Date().toISOString(),
      sessionId,
      validationId,
      prompt: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : ''), // Truncate for privacy
      primaryProvider,
      validatorProvider,
      validationReason,
      agreement,
      userRating,
      userComment,
      responseTime,
      expectedQuality,
      actualQuality,
      improvementSuggestion,
      feedbackScore: this.feedbackWeights[userRating] || 0
    };

    this.feedbackHistory.push(feedback);
    this.updateQualityMetrics(feedback);
    this.saveFeedbackHistory();

    // Trigger learning update if significant feedback
    if (Math.abs(feedback.feedbackScore) >= 1.0) {
      this.triggerLearningUpdate(feedback);
    }

    return {
      id: feedback.id,
      recorded: true,
      impact: this.calculateFeedbackImpact(feedback),
      recommendation: this.generateRecommendation(feedback)
    };
  }

  updateQualityMetrics(feedback) {
    // Update validation accuracy by provider pair
    const providerPair = `${feedback.primaryProvider}->${feedback.validatorProvider}`;
    if (!this.qualityMetrics.validationAccuracy.has(providerPair)) {
      this.qualityMetrics.validationAccuracy.set(providerPair, {
        totalFeedback: 0,
        positiveCount: 0,
        averageScore: 0,
        lastUpdated: new Date().toISOString()
      });
    }

    const accuracy = this.qualityMetrics.validationAccuracy.get(providerPair);
    accuracy.totalFeedback++;
    if (feedback.feedbackScore > 0) {
      accuracy.positiveCount++;
    }
    accuracy.averageScore = ((accuracy.averageScore * (accuracy.totalFeedback - 1)) + feedback.feedbackScore) / accuracy.totalFeedback;
    accuracy.lastUpdated = new Date().toISOString();

    // Update user satisfaction by validation reason
    if (!this.qualityMetrics.userSatisfaction.has(feedback.validationReason)) {
      this.qualityMetrics.userSatisfaction.set(feedback.validationReason, {
        totalFeedback: 0,
        satisfactionScore: 0,
        commonComplaints: [],
        improvementAreas: []
      });
    }

    const satisfaction = this.qualityMetrics.userSatisfaction.get(feedback.validationReason);
    satisfaction.totalFeedback++;
    satisfaction.satisfactionScore = ((satisfaction.satisfactionScore * (satisfaction.totalFeedback - 1)) + feedback.feedbackScore) / satisfaction.totalFeedback;

    // Collect improvement suggestions
    if (feedback.improvementSuggestion && feedback.improvementSuggestion.trim()) {
      this.qualityMetrics.improvementSuggestions.push({
        suggestion: feedback.improvementSuggestion,
        validationReason: feedback.validationReason,
        providerPair,
        timestamp: feedback.timestamp,
        userRating: feedback.userRating
      });

      // Keep only last 100 suggestions
      if (this.qualityMetrics.improvementSuggestions.length > 100) {
        this.qualityMetrics.improvementSuggestions = this.qualityMetrics.improvementSuggestions.slice(-100);
      }
    }
  }

  calculateFeedbackImpact(feedback) {
    const providerPair = `${feedback.primaryProvider}->${feedback.validatorProvider}`;
    const accuracy = this.qualityMetrics.validationAccuracy.get(providerPair);
    
    let impact = 'low';
    if (Math.abs(feedback.feedbackScore) >= 1.5) {
      impact = 'high';
    } else if (Math.abs(feedback.feedbackScore) >= 1.0) {
      impact = 'medium';
    }

    // Consider frequency of this provider pair
    if (accuracy && accuracy.totalFeedback < 5) {
      impact = 'high'; // Early feedback has high impact
    }

    return {
      level: impact,
      providerPairFeedbackCount: accuracy?.totalFeedback || 0,
      currentAccuracyScore: accuracy?.averageScore || 0,
      satisfactionTrend: this.getSatisfactionTrend(feedback.validationReason)
    };
  }

  getSatisfactionTrend(validationReason) {
    const recentFeedback = this.feedbackHistory
      .filter(f => f.validationReason === validationReason)
      .slice(-10); // Last 10 feedback entries

    if (recentFeedback.length < 3) return 'insufficient_data';

    const recent5 = recentFeedback.slice(-5).reduce((sum, f) => sum + f.feedbackScore, 0) / 5;
    const previous5 = recentFeedback.slice(-10, -5).reduce((sum, f) => sum + f.feedbackScore, 0) / Math.min(5, recentFeedback.length - 5);

    if (recent5 > previous5 + 0.2) return 'improving';
    if (recent5 < previous5 - 0.2) return 'declining';
    return 'stable';
  }

  generateRecommendation(feedback) {
    const recommendations = [];

    // Provider pair recommendations
    const providerPair = `${feedback.primaryProvider}->${feedback.validatorProvider}`;
    const accuracy = this.qualityMetrics.validationAccuracy.get(providerPair);
    
    if (accuracy && accuracy.averageScore < -0.3) {
      recommendations.push(`Consider avoiding ${providerPair} validation pair (low user satisfaction)`);
    } else if (accuracy && accuracy.averageScore > 0.8) {
      recommendations.push(`${providerPair} pair performing excellently (high user satisfaction)`);
    }

    // Validation reason recommendations
    const satisfaction = this.qualityMetrics.userSatisfaction.get(feedback.validationReason);
    if (satisfaction && satisfaction.satisfactionScore < -0.2) {
      recommendations.push(`Validation for ${feedback.validationReason} needs improvement`);
    }

    // Agreement vs satisfaction correlation
    if (feedback.agreement > 80 && feedback.feedbackScore < 0) {
      recommendations.push('High agreement but low satisfaction - consider quality over similarity');
    } else if (feedback.agreement < 60 && feedback.feedbackScore > 0) {
      recommendations.push('Low agreement but high satisfaction - diversity in validation is valuable');
    }

    return recommendations;
  }

  triggerLearningUpdate(feedback) {
    // Send feedback to real-time learning system
    console.log(`📝 Significant feedback received (${feedback.userRating}): Updating learning system`);
    
    // This would integrate with the real-time learning engine
    // For now, we'll just log the important feedback
    if (feedback.feedbackScore <= -1.0) {
      console.log(`⚠️  Negative feedback for ${feedback.primaryProvider}->${feedback.validatorProvider} validation`);
      console.log(`   Reason: ${feedback.validationReason}, Agreement: ${feedback.agreement}%`);
      if (feedback.userComment) {
        console.log(`   User comment: ${feedback.userComment}`);
      }
    } else if (feedback.feedbackScore >= 1.0) {
      console.log(`✅ Positive feedback for ${feedback.primaryProvider}->${feedback.validatorProvider} validation`);
      console.log(`   Reason: ${feedback.validationReason}, Agreement: ${feedback.agreement}%`);
    }
  }

  getBestValidatorForTask(primaryProvider, validationReason) {
    // Find the best validator based on user feedback
    const candidatePairs = [];
    
    for (const [pair, accuracy] of this.qualityMetrics.validationAccuracy.entries()) {
      const [primary, validator] = pair.split('->');
      if (primary === primaryProvider && accuracy.totalFeedback >= 3) {
        candidatePairs.push({
          validator,
          score: accuracy.averageScore,
          confidence: Math.min(accuracy.totalFeedback / 10, 1), // More feedback = higher confidence
          feedbackCount: accuracy.totalFeedback
        });
      }
    }

    // Sort by score and confidence
    candidatePairs.sort((a, b) => (b.score * b.confidence) - (a.score * a.confidence));
    
    return candidatePairs[0] || null;
  }

  getValidationQualityPrediction(primaryProvider, validatorProvider, validationReason, agreement) {
    const providerPair = `${primaryProvider}->${validatorProvider}`;
    const accuracy = this.qualityMetrics.validationAccuracy.get(providerPair);
    const satisfaction = this.qualityMetrics.userSatisfaction.get(validationReason);

    let prediction = {
      expectedSatisfaction: 'unknown',
      confidence: 'low',
      recommendation: 'proceed',
      factors: []
    };

    if (accuracy && accuracy.totalFeedback >= 3) {
      const satisfactionScore = accuracy.averageScore;
      
      if (satisfactionScore > 0.5) {
        prediction.expectedSatisfaction = 'high';
        prediction.recommendation = 'highly_recommended';
      } else if (satisfactionScore > 0) {
        prediction.expectedSatisfaction = 'medium';
        prediction.recommendation = 'proceed';
      } else if (satisfactionScore > -0.5) {
        prediction.expectedSatisfaction = 'low';
        prediction.recommendation = 'caution';
      } else {
        prediction.expectedSatisfaction = 'very_low';
        prediction.recommendation = 'avoid';
      }

      prediction.confidence = accuracy.totalFeedback >= 10 ? 'high' : 
                            accuracy.totalFeedback >= 5 ? 'medium' : 'low';
      
      prediction.factors.push(`Provider pair has ${accuracy.totalFeedback} feedback entries`);
      prediction.factors.push(`Average satisfaction: ${satisfactionScore.toFixed(2)}`);
    }

    if (satisfaction && satisfaction.totalFeedback >= 3) {
      prediction.factors.push(`Validation reason satisfaction: ${satisfaction.satisfactionScore.toFixed(2)}`);
    }

    // Agreement correlation
    if (agreement > 85) {
      prediction.factors.push('High agreement typically correlates with satisfaction');
    } else if (agreement < 50) {
      prediction.factors.push('Low agreement may reduce user satisfaction');
    }

    return prediction;
  }

  getFeedbackSummary() {
    const totalFeedback = this.feedbackHistory.length;
    const recentFeedback = this.feedbackHistory.slice(-50);
    
    // Rating distribution
    const ratingCounts = {};
    for (const feedback of recentFeedback) {
      ratingCounts[feedback.userRating] = (ratingCounts[feedback.userRating] || 0) + 1;
    }

    // Top performing provider pairs
    const topPairs = Array.from(this.qualityMetrics.validationAccuracy.entries())
      .filter(([_, accuracy]) => accuracy.totalFeedback >= 3)
      .sort(([, a], [, b]) => b.averageScore - a.averageScore)
      .slice(0, 5)
      .map(([pair, accuracy]) => ({
        pair,
        averageScore: Number(accuracy.averageScore.toFixed(2)),
        feedbackCount: accuracy.totalFeedback,
        positiveRate: Math.round((accuracy.positiveCount / accuracy.totalFeedback) * 100)
      }));

    // Validation reason satisfaction
    const reasonSatisfaction = Array.from(this.qualityMetrics.userSatisfaction.entries())
      .filter(([_, satisfaction]) => satisfaction.totalFeedback >= 2)
      .sort(([, a], [, b]) => b.satisfactionScore - a.satisfactionScore)
      .map(([reason, satisfaction]) => ({
        reason,
        satisfactionScore: Number(satisfaction.satisfactionScore.toFixed(2)),
        feedbackCount: satisfaction.totalFeedback
      }));

    // Recent improvement suggestions
    const recentSuggestions = this.qualityMetrics.improvementSuggestions
      .slice(-10)
      .map(s => ({
        suggestion: s.suggestion,
        validationReason: s.validationReason,
        userRating: s.userRating
      }));

    return {
      overview: {
        totalFeedback,
        recentFeedback: recentFeedback.length,
        averageRecentScore: recentFeedback.length > 0 
          ? Number((recentFeedback.reduce((sum, f) => sum + f.feedbackScore, 0) / recentFeedback.length).toFixed(2))
          : 0
      },
      ratingDistribution: ratingCounts,
      topPerformingPairs: topPairs,
      validationReasonSatisfaction: reasonSatisfaction,
      recentImprovementSuggestions: recentSuggestions,
      qualityTrends: {
        improvingReasons: reasonSatisfaction.filter(r => r.satisfactionScore > 0.3).map(r => r.reason),
        needsAttention: reasonSatisfaction.filter(r => r.satisfactionScore < -0.2).map(r => r.reason)
      }
    };
  }

  generateFeedbackId() {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new UserFeedbackSystem();