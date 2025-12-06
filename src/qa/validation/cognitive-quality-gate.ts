// @version 1.0.0
/**
 * Cognitive Quality Gate
 *
 * Advanced quality assurance that uses cognitive analysis to validate
 * outputs beyond simple rule-based checks. Integrates with the meta-learner
 * and collaboration hub for holistic quality assessment.
 *
 * Features:
 * - Multi-dimensional quality scoring
 * - Cognitive coherence analysis
 * - Context appropriateness checking
 * - Learning-informed quality thresholds
 * - Automatic quality improvement suggestions
 * - Quality trend tracking
 *
 * @module qa/validation/cognitive-quality-gate
 */

import { bus } from '../../core/event-bus.js';

// ============================================================================
// TYPES
// ============================================================================

export interface QualityDimension {
  name: string;
  score: number; // 0-1
  weight: number; // Importance weight
  details: string;
  suggestions?: string[];
}

export interface CognitiveCoherence {
  logicalFlow: number; // Does the output follow logical progression?
  contextAlignment: number; // Does it align with the given context?
  selfConsistency: number; // Is it internally consistent?
  relevance: number; // Is it relevant to the task?
  completeness: number; // Does it fully address the request?
}

export interface QualityAssessment {
  id: string;
  taskId: string;
  timestamp: Date;
  overallScore: number;
  dimensions: QualityDimension[];
  coherence: CognitiveCoherence;
  passed: boolean;
  threshold: number;
  improvements: string[];
  confidence: number;
}

export interface QualityTrend {
  period: 'hour' | 'day' | 'week';
  avgScore: number;
  trend: 'improving' | 'stable' | 'declining';
  changePercent: number;
  sampleCount: number;
}

export interface QualityConfig {
  defaultThreshold: number;
  strictThreshold: number;
  lenientThreshold: number;
  dimensionWeights: Record<string, number>;
  adaptiveThresholds: boolean;
}

// ============================================================================
// COGNITIVE QUALITY GATE IMPLEMENTATION
// ============================================================================

export class CognitiveQualityGate {
  private static instance: CognitiveQualityGate;
  private assessmentHistory: QualityAssessment[] = [];
  private config: QualityConfig;
  private readonly MAX_HISTORY = 1000;

  private constructor() {
    this.config = {
      defaultThreshold: 0.7,
      strictThreshold: 0.85,
      lenientThreshold: 0.55,
      dimensionWeights: {
        accuracy: 0.25,
        completeness: 0.2,
        clarity: 0.15,
        relevance: 0.2,
        creativity: 0.1,
        efficiency: 0.1,
      },
      adaptiveThresholds: true,
    };

    this.setupEventListeners();
  }

  static getInstance(): CognitiveQualityGate {
    if (!CognitiveQualityGate.instance) {
      CognitiveQualityGate.instance = new CognitiveQualityGate();
    }
    return CognitiveQualityGate.instance;
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private setupEventListeners(): void {
    // Listen for quality check requests
    bus.on('qa:quality_check_request', async (event) => {
      const { taskId, content, context, options } = event.payload;
      const assessment = await this.assessQuality(taskId, content, context, options);

      bus.publish('system', 'qa:quality_check_complete', {
        requestId: event.payload.requestId,
        assessment,
      });
    });

    // Listen for meta-learner insights to adjust thresholds
    bus.on('meta:analysis_complete', (event) => {
      if (this.config.adaptiveThresholds) {
        this.adjustThresholdsFromLearning(event.payload);
      }
    });
  }

  // ============================================================================
  // QUALITY ASSESSMENT
  // ============================================================================

  async assessQuality(
    taskId: string,
    content: string,
    context?: Record<string, unknown>,
    options?: {
      threshold?: number;
      strictMode?: boolean;
      dimensions?: string[];
    }
  ): Promise<QualityAssessment> {
    const threshold = options?.strictMode
      ? this.config.strictThreshold
      : (options?.threshold ?? this.config.defaultThreshold);

    // Assess each quality dimension
    const dimensions = this.assessDimensions(content, context, options?.dimensions);

    // Calculate cognitive coherence
    const coherence = this.assessCoherence(content, context);

    // Calculate overall score
    const overallScore = this.calculateOverallScore(dimensions, coherence);

    // Generate improvement suggestions
    const improvements = this.generateImprovements(dimensions, coherence);

    // Calculate confidence based on content analysis depth
    const confidence = this.calculateConfidence(content, dimensions);

    const assessment: QualityAssessment = {
      id: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      taskId,
      timestamp: new Date(),
      overallScore,
      dimensions,
      coherence,
      passed: overallScore >= threshold,
      threshold,
      improvements,
      confidence,
    };

    // Store assessment
    this.assessmentHistory.push(assessment);
    if (this.assessmentHistory.length > this.MAX_HISTORY) {
      this.assessmentHistory = this.assessmentHistory.slice(-this.MAX_HISTORY);
    }

    // Publish assessment event
    bus.publish('system', 'qa:assessment_recorded', {
      assessment,
      timestamp: new Date().toISOString(),
    });

    return assessment;
  }

  private assessDimensions(
    content: string,
    context?: Record<string, unknown>,
    requestedDimensions?: string[]
  ): QualityDimension[] {
    const allDimensions: QualityDimension[] = [];
    const activeDimensions = requestedDimensions || Object.keys(this.config.dimensionWeights);

    for (const dimName of activeDimensions) {
      const weight = this.config.dimensionWeights[dimName] || 0.1;
      const dimension = this.assessSingleDimension(dimName, content, context);
      dimension.weight = weight;
      allDimensions.push(dimension);
    }

    return allDimensions;
  }

  private assessSingleDimension(
    name: string,
    content: string,
    context?: Record<string, unknown>
  ): QualityDimension {
    switch (name) {
      case 'accuracy':
        return this.assessAccuracy(content, context);
      case 'completeness':
        return this.assessCompleteness(content, context);
      case 'clarity':
        return this.assessClarity(content);
      case 'relevance':
        return this.assessRelevance(content, context);
      case 'creativity':
        return this.assessCreativity(content);
      case 'efficiency':
        return this.assessEfficiency(content);
      default:
        return {
          name,
          score: 0.7,
          weight: 0.1,
          details: 'Unknown dimension - using default score',
        };
    }
  }

  private assessAccuracy(content: string, context?: Record<string, unknown>): QualityDimension {
    const suggestions: string[] = [];
    let score = 0.8; // Base score

    // Check for potential inaccuracies
    const uncertainPhrases = [
      'i think',
      'maybe',
      'probably',
      'might be',
      'not sure',
      'possibly',
      'i believe',
      'it seems',
    ];

    const contentLower = content.toLowerCase();
    const uncertaintyCount = uncertainPhrases.filter((p) => contentLower.includes(p)).length;

    if (uncertaintyCount > 2) {
      score -= 0.1;
      suggestions.push('Consider reducing uncertainty language for more authoritative responses');
    }

    // Check for contradictions (simple heuristic)
    if (contentLower.includes(' not ') && contentLower.includes(' is ')) {
      // Could have contradictions - needs more sophisticated analysis
      score -= 0.05;
    }

    // Context alignment check
    if (context && context['expectedType']) {
      const expectedType = context['expectedType'] as string;
      if (expectedType === 'code' && !content.includes('```') && !content.includes('function')) {
        score -= 0.15;
        suggestions.push('Expected code output but none detected');
      }
    }

    return {
      name: 'accuracy',
      score: Math.max(0, Math.min(1, score)),
      weight: this.config.dimensionWeights['accuracy'] || 0.25,
      details: `Accuracy assessment based on certainty language and context alignment`,
      suggestions,
    };
  }

  private assessCompleteness(content: string, context?: Record<string, unknown>): QualityDimension {
    const suggestions: string[] = [];
    let score = 0.75;

    // Length-based heuristic (very short responses are often incomplete)
    if (content.length < 50) {
      score -= 0.2;
      suggestions.push('Response may be too brief - consider elaborating');
    } else if (content.length > 200) {
      score += 0.1;
    }

    // Check for common completeness indicators
    const hasConclusion =
      content.toLowerCase().includes('conclusion') ||
      content.toLowerCase().includes('in summary') ||
      content.toLowerCase().includes('to summarize');

    if (content.length > 500 && !hasConclusion) {
      score -= 0.05;
      suggestions.push('Consider adding a summary for long responses');
    }

    // Check if all aspects of a question are addressed
    if (context && context['aspects']) {
      const aspects = context['aspects'] as string[];
      const contentLower = content.toLowerCase();
      const addressedAspects = aspects.filter((a) => contentLower.includes(a.toLowerCase()));
      const coverage = addressedAspects.length / aspects.length;
      score = 0.5 * score + 0.5 * coverage;

      if (coverage < 1) {
        suggestions.push(
          `Missing aspects: ${aspects.filter((a) => !addressedAspects.includes(a)).join(', ')}`
        );
      }
    }

    return {
      name: 'completeness',
      score: Math.max(0, Math.min(1, score)),
      weight: this.config.dimensionWeights['completeness'] || 0.2,
      details: `Completeness based on response length and content coverage`,
      suggestions,
    };
  }

  private assessClarity(content: string): QualityDimension {
    const suggestions: string[] = [];
    let score = 0.8;

    // Sentence length analysis
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const avgSentenceLength =
      sentences.length > 0
        ? sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length
        : 0;

    if (avgSentenceLength > 30) {
      score -= 0.1;
      suggestions.push('Consider breaking up long sentences for better readability');
    } else if (avgSentenceLength < 5 && sentences.length > 3) {
      score -= 0.05;
      suggestions.push('Sentences may be too fragmented');
    }

    // Check for structure (headers, lists)
    const hasStructure =
      content.includes('\n') ||
      content.includes('- ') ||
      content.includes('1.') ||
      content.includes('##');

    if (content.length > 300 && !hasStructure) {
      score -= 0.1;
      suggestions.push('Consider using formatting (lists, paragraphs) for long content');
    }

    // Check for jargon overload
    const technicalTerms = content.match(/\b[A-Z]{2,}\b/g) || [];
    if (technicalTerms.length > 10) {
      score -= 0.05;
      suggestions.push('High density of acronyms/technical terms - consider explaining');
    }

    return {
      name: 'clarity',
      score: Math.max(0, Math.min(1, score)),
      weight: this.config.dimensionWeights['clarity'] || 0.15,
      details: `Clarity based on sentence structure and formatting`,
      suggestions,
    };
  }

  private assessRelevance(content: string, context?: Record<string, unknown>): QualityDimension {
    const suggestions: string[] = [];
    let score = 0.75;

    if (context && context['query']) {
      const query = (context['query'] as string).toLowerCase();
      const contentLower = content.toLowerCase();

      // Extract key terms from query
      const queryTerms = query.split(/\s+/).filter((t) => t.length > 3);
      const matchingTerms = queryTerms.filter((t) => contentLower.includes(t));

      const termRelevance = queryTerms.length > 0 ? matchingTerms.length / queryTerms.length : 0.5;
      score = 0.5 * score + 0.5 * termRelevance;

      if (termRelevance < 0.5) {
        suggestions.push('Response may not fully address the original query');
      }
    }

    // Check for off-topic indicators
    const offTopicPhrases = ['by the way', 'speaking of which', 'on another note'];
    const hasOffTopic = offTopicPhrases.some((p) => content.toLowerCase().includes(p));

    if (hasOffTopic) {
      score -= 0.1;
      suggestions.push('Response may contain off-topic content');
    }

    return {
      name: 'relevance',
      score: Math.max(0, Math.min(1, score)),
      weight: this.config.dimensionWeights['relevance'] || 0.2,
      details: `Relevance based on query term matching and focus`,
      suggestions,
    };
  }

  private assessCreativity(content: string): QualityDimension {
    let score = 0.6; // Base creativity score

    // Check for creative elements
    const hasMetaphors = /like a|as if|similar to|reminds me of/i.test(content);
    const hasExamples = /for example|for instance|such as/i.test(content);
    const hasAnalogies = /think of it as|imagine|picture/i.test(content);
    const hasVariety = new Set(content.toLowerCase().split(' ')).size / content.split(' ').length;

    if (hasMetaphors) score += 0.1;
    if (hasExamples) score += 0.1;
    if (hasAnalogies) score += 0.1;
    if (hasVariety > 0.6) score += 0.1;

    return {
      name: 'creativity',
      score: Math.max(0, Math.min(1, score)),
      weight: this.config.dimensionWeights['creativity'] || 0.1,
      details: `Creativity based on language variety and illustrative elements`,
    };
  }

  private assessEfficiency(content: string): QualityDimension {
    const suggestions: string[] = [];
    let score = 0.75;

    // Check for redundancy
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const uniqueSentences = new Set(sentences.map((s) => s.trim().toLowerCase()));

    if (uniqueSentences.size < sentences.length * 0.9) {
      score -= 0.15;
      suggestions.push('Content may contain redundant statements');
    }

    // Check for filler words
    const fillerWords = [
      'basically',
      'actually',
      'literally',
      'obviously',
      'really',
      'very',
      'just',
    ];
    const contentLower = content.toLowerCase();
    const fillerCount = fillerWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      return count + (contentLower.match(regex) || []).length;
    }, 0);

    const wordCount = content.split(/\s+/).length;
    const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;

    if (fillerRatio > 0.05) {
      score -= 0.1;
      suggestions.push('Consider removing filler words for more concise writing');
    }

    return {
      name: 'efficiency',
      score: Math.max(0, Math.min(1, score)),
      weight: this.config.dimensionWeights['efficiency'] || 0.1,
      details: `Efficiency based on redundancy and filler word analysis`,
      suggestions,
    };
  }

  // ============================================================================
  // COHERENCE ASSESSMENT
  // ============================================================================

  private assessCoherence(content: string, context?: Record<string, unknown>): CognitiveCoherence {
    return {
      logicalFlow: this.assessLogicalFlow(content),
      contextAlignment: this.assessContextAlignment(content, context),
      selfConsistency: this.assessSelfConsistency(content),
      relevance: this.assessTopicalRelevance(content, context),
      completeness: this.assessTopicalCompleteness(content, context),
    };
  }

  private assessLogicalFlow(content: string): number {
    let score = 0.75;

    // Check for transition words (indicate logical flow)
    const transitionWords = [
      'therefore',
      'however',
      'moreover',
      'furthermore',
      'consequently',
      'thus',
      'hence',
      'additionally',
      'first',
      'second',
      'finally',
      'in conclusion',
      'as a result',
      'on the other hand',
    ];

    const contentLower = content.toLowerCase();
    const transitionCount = transitionWords.filter((t) => contentLower.includes(t)).length;

    if (transitionCount > 0) {
      score += Math.min(0.2, transitionCount * 0.05);
    }

    // Penalize abrupt topic changes (simplified check)
    const paragraphs = content.split('\n\n').filter((p) => p.trim().length > 0);
    if (paragraphs.length > 1) {
      score += 0.05; // Has structure
    }

    return Math.min(1, score);
  }

  private assessContextAlignment(content: string, context?: Record<string, unknown>): number {
    if (!context) return 0.7;

    let score = 0.7;

    // Check domain alignment
    if (context['domain']) {
      const domain = context['domain'] as string;
      const domainKeywords: Record<string, string[]> = {
        code: ['function', 'variable', 'class', 'method', 'return', 'import', 'const', 'let'],
        creative: ['story', 'character', 'scene', 'imagine', 'create', 'design'],
        analysis: ['data', 'pattern', 'trend', 'insight', 'metric', 'result'],
      };

      const keywords = domainKeywords[domain] || [];
      const contentLower = content.toLowerCase();
      const matchCount = keywords.filter((k) => contentLower.includes(k)).length;

      if (keywords.length > 0) {
        score = 0.5 + 0.5 * (matchCount / Math.min(3, keywords.length));
      }
    }

    return Math.min(1, score);
  }

  private assessSelfConsistency(content: string): number {
    let score = 0.85;

    // Simple contradiction detection
    const contentLower = content.toLowerCase();

    // Check for "but" followed by contradictory statements
    const hasContradictions =
      contentLower.includes('but ') &&
      (contentLower.includes(' not ') || contentLower.includes(' never '));

    if (hasContradictions) {
      score -= 0.1; // Not necessarily bad, but might indicate inconsistency
    }

    return score;
  }

  private assessTopicalRelevance(content: string, context?: Record<string, unknown>): number {
    // Similar to dimension relevance but focused on topic
    if (!context || !context['topic']) return 0.7;

    const topic = (context['topic'] as string).toLowerCase();
    const contentLower = content.toLowerCase();

    return contentLower.includes(topic) ? 0.9 : 0.6;
  }

  private assessTopicalCompleteness(content: string, context?: Record<string, unknown>): number {
    if (!context || !context['requiredSections']) return 0.7;

    const requiredSections = context['requiredSections'] as string[];
    const contentLower = content.toLowerCase();

    const foundSections = requiredSections.filter((s) => contentLower.includes(s.toLowerCase()));
    return foundSections.length / requiredSections.length;
  }

  // ============================================================================
  // SCORING & IMPROVEMENTS
  // ============================================================================

  private calculateOverallScore(
    dimensions: QualityDimension[],
    coherence: CognitiveCoherence
  ): number {
    // Weighted dimension score
    let dimensionScore = 0;
    let totalWeight = 0;

    for (const dim of dimensions) {
      dimensionScore += dim.score * dim.weight;
      totalWeight += dim.weight;
    }

    dimensionScore = totalWeight > 0 ? dimensionScore / totalWeight : 0.5;

    // Coherence score
    const coherenceScore =
      (coherence.logicalFlow +
        coherence.contextAlignment +
        coherence.selfConsistency +
        coherence.relevance +
        coherence.completeness) /
      5;

    // Combined score (60% dimensions, 40% coherence)
    return 0.6 * dimensionScore + 0.4 * coherenceScore;
  }

  private generateImprovements(
    dimensions: QualityDimension[],
    coherence: CognitiveCoherence
  ): string[] {
    const improvements: string[] = [];

    // Collect dimension suggestions
    for (const dim of dimensions) {
      if (dim.suggestions && dim.score < 0.7) {
        improvements.push(...dim.suggestions);
      }
    }

    // Add coherence-based improvements
    if (coherence.logicalFlow < 0.6) {
      improvements.push('Improve logical flow with transition words and clear structure');
    }
    if (coherence.selfConsistency < 0.7) {
      improvements.push('Review for potential contradictions or inconsistencies');
    }
    if (coherence.completeness < 0.6) {
      improvements.push('Ensure all required topics/sections are covered');
    }

    // Deduplicate and limit
    return [...new Set(improvements)].slice(0, 5);
  }

  private calculateConfidence(content: string, dimensions: QualityDimension[]): number {
    // Confidence based on analysis depth
    let confidence = 0.7;

    // More content = more confident in analysis
    if (content.length > 500) confidence += 0.1;
    if (content.length > 1000) confidence += 0.05;

    // More dimensions analyzed = more confident
    if (dimensions.length >= 5) confidence += 0.1;

    // Consistent scores across dimensions = more confident
    const scores = dimensions.map((d) => d.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;

    if (variance < 0.02) confidence += 0.05;

    return Math.min(0.95, confidence);
  }

  // ============================================================================
  // ADAPTIVE THRESHOLDS
  // ============================================================================

  private adjustThresholdsFromLearning(learningData: Record<string, unknown>): void {
    const velocity = learningData['velocity'] as { current: number; trend: string } | undefined;

    if (velocity) {
      // If learning is accelerating, we can be stricter
      if (velocity.trend === 'accelerating') {
        this.config.defaultThreshold = Math.min(0.85, this.config.defaultThreshold + 0.02);
      }
      // If learning is stalled, be more lenient to encourage exploration
      else if (velocity.trend === 'stalled') {
        this.config.defaultThreshold = Math.max(0.6, this.config.defaultThreshold - 0.02);
      }
    }
  }

  // ============================================================================
  // QUALITY TRENDS
  // ============================================================================

  getQualityTrends(): Record<string, QualityTrend> {
    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;
    const weekAgo = now - 604800000;

    return {
      hour: this.calculateTrend(hourAgo, now, 'hour'),
      day: this.calculateTrend(dayAgo, now, 'day'),
      week: this.calculateTrend(weekAgo, now, 'week'),
    };
  }

  private calculateTrend(
    startTime: number,
    endTime: number,
    period: 'hour' | 'day' | 'week'
  ): QualityTrend {
    const periodAssessments = this.assessmentHistory.filter((a) => {
      const time = a.timestamp.getTime();
      return time >= startTime && time <= endTime;
    });

    if (periodAssessments.length === 0) {
      return {
        period,
        avgScore: 0,
        trend: 'stable',
        changePercent: 0,
        sampleCount: 0,
      };
    }

    const avgScore =
      periodAssessments.reduce((sum, a) => sum + a.overallScore, 0) / periodAssessments.length;

    // Calculate trend by comparing first and second half
    const midpoint = Math.floor(periodAssessments.length / 2);
    const firstHalf = periodAssessments.slice(0, midpoint);
    const secondHalf = periodAssessments.slice(midpoint);

    const firstAvg =
      firstHalf.length > 0
        ? firstHalf.reduce((sum, a) => sum + a.overallScore, 0) / firstHalf.length
        : avgScore;
    const secondAvg =
      secondHalf.length > 0
        ? secondHalf.reduce((sum, a) => sum + a.overallScore, 0) / secondHalf.length
        : avgScore;

    const change = secondAvg - firstAvg;
    const changePercent = firstAvg > 0 ? (change / firstAvg) * 100 : 0;

    let trend: 'improving' | 'stable' | 'declining';
    if (changePercent > 5) trend = 'improving';
    else if (changePercent < -5) trend = 'declining';
    else trend = 'stable';

    return {
      period,
      avgScore,
      trend,
      changePercent,
      sampleCount: periodAssessments.length,
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getConfig(): QualityConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<QualityConfig>): void {
    this.config = { ...this.config, ...updates };

    bus.publish('system', 'qa:config_updated', {
      config: this.config,
      timestamp: new Date().toISOString(),
    });
  }

  getAssessmentHistory(limit: number = 50): QualityAssessment[] {
    return this.assessmentHistory.slice(-limit);
  }

  getAssessment(assessmentId: string): QualityAssessment | null {
    return this.assessmentHistory.find((a) => a.id === assessmentId) || null;
  }

  getPassRate(): number {
    if (this.assessmentHistory.length === 0) return 0;
    const passed = this.assessmentHistory.filter((a) => a.passed).length;
    return passed / this.assessmentHistory.length;
  }
}

// Singleton export
export const cognitiveQualityGate = CognitiveQualityGate.getInstance();
