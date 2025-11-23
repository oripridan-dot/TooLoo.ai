// @version 2.1.28
/**
 * Smart Intelligence Integration Helper
 * Manages smart intelligence API calls and pattern storage
 */

class SmartIntelligenceIntegration {
  constructor(apiBaseUrl = 'http://127.0.0.1:3000') {
    this.apiBaseUrl = apiBaseUrl;
    this.endpoint = `${apiBaseUrl}/api/v1/chat/smart-intelligence`;
    this.storageKey = 'smartIntelligencePatterns';
    this.patterns = this.loadPatterns();
  }

  /**
   * Validate response and get intelligence report
   */
  async validateResponse(question, responseText, providerResponses = [], metadata = {}) {
    try {
      const payload = {
        question,
        responseText,
        providerResponses: providerResponses || [],
        metadata: {
          timestamp: new Date().toISOString(),
          ...metadata
        }
      };

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Store pattern for analytics
      if (result.ok && result.intelligenceReport) {
        this.storePattern(question, responseText, result.intelligenceReport);
      }

      return result;

    } catch (error) {
      console.error('[SmartIntelligence] Validation error:', error);
      return {
        ok: false,
        error: error.message,
        intelligenceReport: null
      };
    }
  }

  /**
   * Store validation pattern for analytics and learning
   */
  storePattern(question, response, report) {
    const pattern = {
      id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      question: question.substring(0, 200),
      responseLength: response.length,
      confidenceScore: report.finalAssessment?.confidenceScore,
      confidenceBracket: report.finalAssessment?.confidenceBracket,
      recommendedAction: report.finalAssessment?.recommendedAction,
      verificationStatus: report.finalAssessment?.verificationStatus,
      insightCount: report.analysis?.insights?.length || 0,
      gapCount: report.analysis?.gaps?.length || 0,
      issueCount: report.finalAssessment?.criticalIssues?.length || 0,
      stagesExecuted: report.metadata?.stagesExecuted || [],
      processingTime: report.metadata?.processingTime || 'unknown'
    };

    this.patterns.push(pattern);

    // Keep only last 1000 patterns
    if (this.patterns.length > 1000) {
      this.patterns = this.patterns.slice(-1000);
    }

    this.savePatterns();
    return pattern;
  }

  /**
   * Get analytics summary from stored patterns
   */
  getAnalyticsSummary() {
    if (this.patterns.length === 0) {
      return null;
    }

    const summary = {
      totalValidations: this.patterns.length,
      averageConfidence: 0,
      confidenceDistribution: {
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        unverified: 0
      },
      actionDistribution: {
        accept: 0,
        caution: 0,
        review: 0,
        revise: 0
      },
      verificationDistribution: {
        verified: 0,
        partiallyVerified: 0,
        unverified: 0
      },
      averageInsights: 0,
      averageGaps: 0,
      averageIssues: 0,
      recentPatterns: [],
      timeRange: {
        first: this.patterns[0].timestamp,
        last: this.patterns[this.patterns.length - 1].timestamp
      }
    };

    // Calculate aggregates
    let totalConfidence = 0;
    let totalInsights = 0;
    let totalGaps = 0;
    let totalIssues = 0;

    this.patterns.forEach(pattern => {
      // Confidence
      totalConfidence += pattern.confidenceScore || 0;
      summary.confidenceDistribution[pattern.confidenceBracket?.toLowerCase() || 'unverified']++;

      // Actions
      const actionKey = pattern.recommendedAction?.toLowerCase().replace(/\s+/g, '') || 'review';
      if (summary.actionDistribution.hasOwnProperty(actionKey)) {
        summary.actionDistribution[actionKey]++;
      }

      // Verification
      const verKey = pattern.verificationStatus
        ?.toLowerCase()
        .replace('-', '')
        .replace(' ', '') || 'unverified';
      if (verKey === 'verified') summary.verificationDistribution.verified++;
      else if (verKey === 'partiallyverified') summary.verificationDistribution.partiallyVerified++;
      else summary.verificationDistribution.unverified++;

      // Counts
      totalInsights += pattern.insightCount || 0;
      totalGaps += pattern.gapCount || 0;
      totalIssues += pattern.issueCount || 0;
    });

    summary.averageConfidence = Math.round(totalConfidence / this.patterns.length);
    summary.averageInsights = Math.round(totalInsights / this.patterns.length * 10) / 10;
    summary.averageGaps = Math.round(totalGaps / this.patterns.length * 10) / 10;
    summary.averageIssues = Math.round(totalIssues / this.patterns.length * 10) / 10;

    // Recent patterns (last 10)
    summary.recentPatterns = this.patterns.slice(-10).reverse();

    return summary;
  }

  /**
   * Get patterns by date range
   */
  getPatternsInRange(startDate, endDate) {
    return this.patterns.filter(p => {
      const pDate = new Date(p.timestamp);
      return pDate >= startDate && pDate <= endDate;
    });
  }

  /**
   * Get patterns by confidence bracket
   */
  getPatternsByConfidence(bracket) {
    return this.patterns.filter(p => 
      p.confidenceBracket?.toLowerCase() === bracket.toLowerCase()
    );
  }

  /**
   * Get patterns by action
   */
  getPatternsByAction(action) {
    return this.patterns.filter(p =>
      p.recommendedAction?.toLowerCase() === action.toLowerCase()
    );
  }

  /**
   * Clear all stored patterns
   */
  clearPatterns() {
    this.patterns = [];
    this.savePatterns();
  }

  /**
   * Export patterns as JSON
   */
  exportPatterns(startDate = null, endDate = null) {
    let data = this.patterns;

    if (startDate || endDate) {
      data = this.getPatternsInRange(
        startDate || new Date(0),
        endDate || new Date()
      );
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import patterns from JSON
   */
  importPatterns(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) {
        throw new Error('Invalid format: expected array');
      }

      this.patterns = [...this.patterns, ...imported];
      if (this.patterns.length > 1000) {
        this.patterns = this.patterns.slice(-1000);
      }

      this.savePatterns();
      return { ok: true, count: imported.length };

    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  /**
   * Save patterns to localStorage
   */
  savePatterns() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.patterns));
    } catch (error) {
      console.error('[SmartIntelligence] Failed to save patterns:', error);
    }
  }

  /**
   * Load patterns from localStorage
   */
  loadPatterns() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[SmartIntelligence] Failed to load patterns:', error);
      return [];
    }
  }

  /**
   * Get confidence trend over time (last N days)
   */
  getConfidenceTrend(days = 7) {
    const now = new Date();
    const trend = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayPatterns = this.patterns.filter(p =>
        p.timestamp.startsWith(dateStr)
      );

      if (dayPatterns.length > 0) {
        const avg = dayPatterns.reduce((sum, p) => sum + (p.confidenceScore || 0), 0) / dayPatterns.length;
        trend[dateStr] = Math.round(avg);
      }
    }

    return trend;
  }

  /**
   * Check if validation pattern exists for similar question
   */
  findSimilarPatterns(question, threshold = 0.7) {
    const questionWords = new Set(question.toLowerCase().match(/\b\w+\b/g) || []);

    return this.patterns.filter(pattern => {
      const patternWords = new Set(pattern.question.toLowerCase().match(/\b\w+\b/g) || []);
      const intersection = [...questionWords].filter(w => patternWords.has(w));
      const union = new Set([...questionWords, ...patternWords]);
      const similarity = intersection.length / union.size;

      return similarity >= threshold;
    });
  }
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartIntelligenceIntegration;
}
