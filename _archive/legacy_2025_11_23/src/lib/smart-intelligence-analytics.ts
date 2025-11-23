/**
 * Smart Intelligence Analytics Service
 * Server-side storage and analytics for validation patterns
 * 
 * Provides endpoints for:
 * - Storing validation patterns
 * - Retrieving analytics summaries
 * - Exporting historical data
 * - Generating confidence trends
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PATTERNS_DIR = path.join(__dirname, '../data/validation-patterns');
const ANALYTICS_DIR = path.join(__dirname, '../data/analytics');

class SmartIntelligenceAnalytics {
  constructor() {
    this.patterns = [];
    this.maxPatternsInMemory = 1000;
    this.initializeDirs();
  }

  /**
   * Initialize data directories
   */
  async initializeDirs() {
    try {
      await fs.mkdir(PATTERNS_DIR, { recursive: true });
      await fs.mkdir(ANALYTICS_DIR, { recursive: true });
    } catch (error) {
      console.error('[Analytics] Failed to initialize directories:', error.message);
    }
  }

  /**
   * Store validation pattern
   */
  async storePattern(validationReport, metadata = {}) {
    try {
      const pattern = {
        id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        question: metadata.question?.substring(0, 200) || '',
        responseLength: metadata.responseLength || 0,
        confidenceScore: validationReport.finalAssessment?.confidenceScore || 0,
        confidenceBracket: validationReport.finalAssessment?.confidenceBracket || 'unknown',
        recommendedAction: validationReport.finalAssessment?.recommendedAction || 'unknown',
        verificationStatus: validationReport.finalAssessment?.verificationStatus || 'unknown',
        insightCount: validationReport.analysis?.insights?.length || 0,
        gapCount: validationReport.analysis?.gaps?.length || 0,
        issueCount: validationReport.finalAssessment?.criticalIssues?.length || 0,
        stagesExecuted: validationReport.metadata?.stagesExecuted || [],
        processingTime: validationReport.metadata?.processingTime || 'unknown',
        metadata
      };

      this.patterns.push(pattern);

      // Save to file (flush immediately for reliability)
      await this.flushPatterns();

      return { ok: true, pattern };

    } catch (error) {
      console.error('[Analytics] Pattern storage error:', error.message);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Flush patterns to disk
   */
  async flushPatterns() {
    try {
      if (this.patterns.length === 0) return;

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = path.join(PATTERNS_DIR, `patterns_${timestamp}.json`);

      // Load existing patterns for the day
      let existing = [];
      try {
        const data = await fs.readFile(filename, 'utf8');
        existing = JSON.parse(data);
      } catch (e) {
        // File doesn't exist yet
      }

      // Merge and save
      const all = [...existing, ...this.patterns];
      await fs.writeFile(filename, JSON.stringify(all, null, 2));

      // Keep only recent in memory
      this.patterns = this.patterns.slice(-100);

    } catch (error) {
      console.error('[Analytics] Failed to flush patterns:', error.message);
    }
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(days = 30) {
    try {
      const patterns = await this.loadPatterns(days);

      if (patterns.length === 0) {
        return {
          ok: true,
          summary: null,
          message: 'No validation patterns found'
        };
      }

      const summary = this.calculateSummary(patterns);
      return { ok: true, summary };

    } catch (error) {
      console.error('[Analytics] Summary error:', error.message);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(patterns) {
    const summary = {
      totalValidations: patterns.length,
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
        'use with caution': 0,
        review: 0,
        revise: 0
      },
      verificationDistribution: {
        verified: 0,
        'partially-verified': 0,
        unverified: 0
      },
      averageInsights: 0,
      averageGaps: 0,
      averageIssues: 0,
      averageResponseLength: 0,
      processingTimeStats: {
        min: Infinity,
        max: 0,
        average: 0
      },
      timeRange: {
        first: patterns[0].timestamp,
        last: patterns[patterns.length - 1].timestamp
      },
      topQuestions: [],
      confidenceTrend: {}
    };

    let totalConfidence = 0;
    let totalInsights = 0;
    let totalGaps = 0;
    let totalIssues = 0;
    let totalLength = 0;
    let totalProcessing = 0;
    let processingCount = 0;
    const questionFreq = {};
    const dateDistribution = {};

    patterns.forEach(pattern => {
      // Confidence
      totalConfidence += pattern.confidenceScore || 0;
      const bracket = pattern.confidenceBracket?.toLowerCase() || 'unverified';
      if (bracket in summary.confidenceDistribution) {
        summary.confidenceDistribution[bracket]++;
      }

      // Actions
      const action = pattern.recommendedAction?.toLowerCase() || 'review';
      if (action in summary.actionDistribution) {
        summary.actionDistribution[action]++;
      }

      // Verification
      const verKey = pattern.verificationStatus?.toLowerCase() || 'unverified';
      if (verKey.includes('verified')) {
        if (verKey.includes('partially')) {
          summary.verificationDistribution['partially-verified']++;
        } else {
          summary.verificationDistribution.verified++;
        }
      } else {
        summary.verificationDistribution.unverified++;
      }

      // Counts
      totalInsights += pattern.insightCount || 0;
      totalGaps += pattern.gapCount || 0;
      totalIssues += pattern.issueCount || 0;
      totalLength += pattern.responseLength || 0;

      // Processing time
      if (pattern.processingTime && typeof pattern.processingTime === 'number') {
        totalProcessing += pattern.processingTime;
        processingCount++;
        summary.processingTimeStats.min = Math.min(summary.processingTimeStats.min, pattern.processingTime);
        summary.processingTimeStats.max = Math.max(summary.processingTimeStats.max, pattern.processingTime);
      }

      // Track questions
      if (pattern.question) {
        questionFreq[pattern.question] = (questionFreq[pattern.question] || 0) + 1;
      }

      // Daily trend
      const date = pattern.timestamp.split('T')[0];
      if (!dateDistribution[date]) {
        dateDistribution[date] = { count: 0, totalConfidence: 0 };
      }
      dateDistribution[date].count++;
      dateDistribution[date].totalConfidence += pattern.confidenceScore || 0;
    });

    // Calculate averages
    summary.averageConfidence = Math.round(totalConfidence / patterns.length);
    summary.averageInsights = (totalInsights / patterns.length).toFixed(1);
    summary.averageGaps = (totalGaps / patterns.length).toFixed(1);
    summary.averageIssues = (totalIssues / patterns.length).toFixed(1);
    summary.averageResponseLength = Math.round(totalLength / patterns.length);

    if (processingCount > 0) {
      summary.processingTimeStats.average = Math.round(totalProcessing / processingCount);
    }

    // Top questions
    summary.topQuestions = Object.entries(questionFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([q, count]) => ({ question: q, count }));

    // Confidence trend
    Object.entries(dateDistribution).forEach(([date, data]) => {
      summary.confidenceTrend[date] = Math.round(data.totalConfidence / data.count);
    });

    return summary;
  }

  /**
   * Load patterns from disk
   */
  async loadPatterns(days = 30) {
    try {
      const patterns = [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const files = await fs.readdir(PATTERNS_DIR);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const data = await fs.readFile(path.join(PATTERNS_DIR, file), 'utf8');
          const filePatterns = JSON.parse(data);
          patterns.push(...filePatterns.filter(p => new Date(p.timestamp) >= cutoffDate));
        } catch (e) {
          console.error(`[Analytics] Error reading ${file}:`, e.message);
        }
      }

      // Add in-memory patterns
      patterns.push(...this.patterns);

      // Sort by timestamp
      patterns.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      return patterns;

    } catch (error) {
      console.error('[Analytics] Pattern loading error:', error.message);
      return [];
    }
  }

  /**
   * Get confidence trend
   */
  async getConfidenceTrend(days = 7) {
    try {
      const patterns = await this.loadPatterns(days);
      const trend = {};

      patterns.forEach(p => {
        const date = p.timestamp.split('T')[0];
        if (!trend[date]) {
          trend[date] = { scores: [], count: 0 };
        }
        trend[date].scores.push(p.confidenceScore);
        trend[date].count++;
      });

      const result = {};
      Object.entries(trend).forEach(([date, data]) => {
        const avg = data.scores.reduce((a, b) => a + b, 0) / data.count;
        result[date] = Math.round(avg);
      });

      return { ok: true, trend: result };

    } catch (error) {
      console.error('[Analytics] Trend error:', error.message);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Export patterns as CSV
   */
  async exportAsCSV(days = 30) {
    try {
      const patterns = await this.loadPatterns(days);

      if (patterns.length === 0) {
        return { ok: false, error: 'No patterns to export' };
      }

      const headers = [
        'timestamp',
        'confidence_score',
        'confidence_bracket',
        'action',
        'verification',
        'insights',
        'gaps',
        'issues',
        'response_length',
        'processing_time'
      ];

      const rows = patterns.map(p => [
        p.timestamp,
        p.confidenceScore,
        p.confidenceBracket,
        p.recommendedAction,
        p.verificationStatus,
        p.insightCount,
        p.gapCount,
        p.issueCount,
        p.responseLength,
        p.processingTime
      ]);

      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      return { ok: true, data: csv };

    } catch (error) {
      console.error('[Analytics] Export error:', error.message);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get action recommendations statistics
   */
  async getActionStats(days = 30) {
    try {
      const patterns = await this.loadPatterns(days);
      const stats = {
        'accept': { count: 0, avg_confidence: 0 },
        'use with caution': { count: 0, avg_confidence: 0 },
        'review': { count: 0, avg_confidence: 0 },
        'revise': { count: 0, avg_confidence: 0 }
      };

      patterns.forEach(p => {
        const action = p.recommendedAction?.toLowerCase() || 'review';
        if (stats[action]) {
          stats[action].count++;
          stats[action].avg_confidence += p.confidenceScore || 0;
        }
      });

      Object.entries(stats).forEach(([_action, data]) => {
        if (data.count > 0) {
          data.avg_confidence = Math.round(data.avg_confidence / data.count);
        }
      });

      return { ok: true, stats };

    } catch (error) {
      console.error('[Analytics] Action stats error:', error.message);
      return { ok: false, error: error.message };
    }
  }
}

export default SmartIntelligenceAnalytics;
