/**
 * Smart Response Analyzer
 * Extracts insights, patterns, gaps, and actionable recommendations
 * from cross-validation results for continuous improvement
 */

class SmartResponseAnalyzer {
  constructor() {
    this.insightTypes = {
      'accuracy_gap': 'Information accuracy issues or factual gaps',
      'clarity_issue': 'Communication clarity problems',
      'completeness_gap': 'Missing information or incomplete coverage',
      'consensus_strength': 'Strong agreement across providers',
      'provider_divergence': 'Significant disagreement between providers',
      'domain_specialization': 'Clear provider expertise patterns',
      'user_intent_mismatch': 'Response doesn\'t address actual user need',
      'structure_weakness': 'Organization or presentation issues',
      'tone_mismatch': 'Inappropriate style or voice',
      'technical_validation_needed': 'Technical content needs external verification'
    };

    this.recommendationLevels = {
      critical: 'Immediate action required',
      high: 'Should address soon',
      medium: 'Good to improve',
      low: 'Nice to have'
    };
  }

  /**
   * Analyze validation report to extract insights
   * @param {string} responseText - The response text to analyze
   * @param {Object} validationReport - Cross-validation report (optional)
   * @param {Object} context - Additional context (optional)
   * @returns {Object} Analysis result with insights, gaps, strengths, recommendations
   */
  analyzeValidationReport(responseText, validationReport = null, context = {}) {
    const insights = {
      responsePreview: responseText.substring(0, 100),
      timestamp: new Date().toISOString(),
      insights: [],
      gaps: [],
      strengths: [],
      recommendations: [],
      nextSteps: [],
      technicalValidationNeeded: false,
      confidenceScore: 0,
      actionPriority: 'medium'
    };

    // Extract insights from provider rankings
    insights.insights = this.extractInsights(validationReport);

    // Identify gaps and weaknesses
    insights.gaps = this.identifyGaps(validationReport, responseText);

    // Highlight strengths and consensus
    insights.strengths = this.identifyStrengths(validationReport);

    // Generate recommendations
    insights.recommendations = this.generateRecommendations(
      insights.insights,
      insights.gaps,
      validationReport
    );

    // Create actionable next steps
    insights.nextSteps = this.createActionPlan(
      insights.recommendations,
      responseText,
      context
    );

    // Determine if technical validation needed
    insights.technicalValidationNeeded = this.assessTechnicalValidationNeed(
      responseText,
      validationReport,
      insights.gaps
    );

    // Calculate overall confidence
    insights.confidenceScore = this.calculateConfidence(validationReport, insights);

    // Set action priority
    insights.actionPriority = this.determineActionPriority(
      insights.technicalValidationNeeded,
      insights.gaps,
      insights.confidenceScore
    );

    return insights;
  }

  /**
   * Extract key insights from cross-validation
   */
  extractInsights(validationReport) {
    const insights = [];
    if (!validationReport) return insights;
    const ranking = validationReport.overallRanking || [];
    const consensus = validationReport.consensusPoints || [];
    const conflicts = validationReport.conflictingPoints || [];

    // Consensus strength insight
    if (consensus.length > 0) {
      const consensusConfidence = Math.min(100, 70 + (consensus.length * 10));
      insights.push({
        type: 'consensus_strength',
        level: 'positive',
        description: `${consensus.length} consensus points identified across providers`,
        evidence: consensus.slice(0, 3).map(c => c.point),
        confidence: consensusConfidence,
        impact: 'High confidence in agreed-upon information',
        actionable: true
      });
    }

    // Provider divergence insight
    if (conflicts.length > 0) {
      insights.push({
        type: 'provider_divergence',
        level: 'warning',
        description: `${conflicts.length} points of disagreement between providers`,
        evidence: conflicts.slice(0, 3).map(c => c.point),
        confidence: 85,
        impact: 'Information requires verification or clarification',
        actionable: true,
        resolution_hint: 'Use provider ranking scores to select most reliable answer'
      });
    }

    // Provider specialization insight
    if (ranking.length > 1) {
      const topProvider = ranking[0];
      const scoreDiff = topProvider.overallScore - (ranking[1]?.overallScore || 0);
      
      if (scoreDiff > 15) {
        insights.push({
          type: 'domain_specialization',
          level: 'positive',
          description: `${topProvider.provider} shows strong specialization (+${scoreDiff} points)`,
          evidence: [`${topProvider.provider}: ${topProvider.overallScore}/100`],
          confidence: 90,
          impact: `${topProvider.provider} may excel in this domain`,
          actionable: true,
          recommendation: `Prioritize ${topProvider.provider}'s response for this domain`
        });
      }

      // Multi-provider consistency insight
      const scores = ranking.map(r => r.overallScore);
      const avgScore = scores.reduce((a, b) => a + b) / scores.length;
      const variance = Math.sqrt(scores.reduce((sq, n) => sq + Math.pow(n - avgScore, 2)) / scores.length);
      if (variance < 10) {
        insights.push({
          type: 'high_consistency',
          level: 'positive',
          description: `All providers show consistent quality (variance: ${variance.toFixed(1)})`,
          evidence: ranking.map(r => `${r.provider}: ${r.overallScore}/100`),
          confidence: 95,
          impact: 'Very high confidence in response quality regardless of provider choice',
          actionable: false
        });
      }
    }

    // Accuracy gaps
    const avgAccuracy = this.calculateAverageScore(ranking, 'accuracy');
    if (avgAccuracy < 80) {
      insights.push({
        type: 'accuracy_gap',
        level: 'warning',
        description: `Average accuracy score below threshold (${Math.round(avgAccuracy)}/100)`,
        evidence: ranking.map(r => `${r.provider}: ${r.criteria?.accuracy || 0}/100`),
        confidence: 85,
        impact: 'Responses may contain factual inaccuracies',
        actionable: true
      });
    } else if (avgAccuracy >= 90) {
      // Positive accuracy insight
      insights.push({
        type: 'high_accuracy',
        level: 'positive',
        description: `Excellent accuracy across providers (${Math.round(avgAccuracy)}/100)`,
        evidence: ranking.slice(0, 2).map(r => `${r.provider}: ${r.criteria?.accuracy || 0}/100`),
        confidence: 95,
        impact: 'Factual content is well-validated',
        actionable: false
      });
    }

    // Clarity issues
    const avgClarity = this.calculateAverageScore(ranking, 'clarity');
    if (avgClarity < 75) {
      insights.push({
        type: 'clarity_issue',
        level: 'warning',
        description: `Clarity concerns across responses (${Math.round(avgClarity)}/100)`,
        evidence: ranking.map(r => `${r.provider}: ${r.criteria?.clarity || 0}/100`),
        confidence: 80,
        impact: 'Responses may be hard to understand',
        actionable: true
      });
    } else if (avgClarity >= 85) {
      insights.push({
        type: 'high_clarity',
        level: 'positive',
        description: `Excellent clarity across responses (${Math.round(avgClarity)}/100)`,
        evidence: ranking.slice(0, 2).map(r => `${r.provider}: ${r.criteria?.clarity || 0}/100`),
        confidence: 90,
        impact: 'Content is well-structured and easy to understand',
        actionable: false
      });
    }

    // Completeness analysis
    const avgCompleteness = this.calculateAverageScore(ranking, 'completeness');
    if (avgCompleteness < 75) {
      insights.push({
        type: 'completeness_gap',
        level: 'warning',
        description: `Information gaps detected (${Math.round(avgCompleteness)}/100)`,
        evidence: ranking.map(r => `${r.provider}: ${r.criteria?.completeness || 0}/100`),
        confidence: 85,
        impact: 'Additional information or examples needed',
        actionable: true
      });
    } else if (avgCompleteness >= 85) {
      insights.push({
        type: 'high_completeness',
        level: 'positive',
        description: `Comprehensive response across providers (${Math.round(avgCompleteness)}/100)`,
        evidence: ranking.slice(0, 2).map(r => `${r.provider}: ${r.criteria?.completeness || 0}/100`),
        confidence: 92,
        impact: 'Response thoroughly addresses the question',
        actionable: false
      });
    }

    // Response quality trend
    if (ranking.length >= 2) {
      const topThreeAvg = ranking.slice(0, Math.min(3, ranking.length))
        .reduce((sum, r) => sum + r.overallScore, 0) / Math.min(3, ranking.length);
      if (topThreeAvg > 85) {
        insights.push({
          type: 'quality_threshold_exceeded',
          level: 'positive',
          description: `Top responses exceed quality threshold (${topThreeAvg.toFixed(1)}/100)`,
          evidence: ranking.slice(0, 3).map(r => `${r.provider}: ${r.overallScore}/100`),
          confidence: 93,
          impact: 'Response is production-ready with minimal revision needed',
          actionable: false
        });
      }
    }

    return insights;
  }

  /**
   * Identify specific gaps needing attention
   */
  identifyGaps(validationReport, responseText) {
    const gaps = [];
    if (!validationReport) return gaps;
    
    const conflicts = validationReport.conflictingPoints || [];
    const ranking = validationReport.overallRanking || [];

    // Conflict-based gaps
    conflicts.forEach(conflict => {
      gaps.push({
        gap: conflict.point,
        mentioned_by: conflict.mentions,
        severity: conflict.mentions > 1 ? 'high' : 'medium',
        type: 'provider_disagreement',
        solution_needed: true
      });
    });

    // Score-based gaps
    ranking.forEach(provider => {
      const low_scores = Object.entries(provider.criteria || {})
        .filter(([_, score]) => score < 75);
      
      low_scores.forEach(([criterion, score]) => {
        gaps.push({
          gap: `${provider.provider} weak in ${criterion} (${score}/100)`,
          mentioned_by: 1,
          severity: score < 60 ? 'high' : 'medium',
          type: 'low_criterion_score',
          criterion,
          provider: provider.provider,
          solution_needed: true
        });
      });
    });

    // Response content analysis
    const isTechnical = /api|code|function|class|variable|algorithm|database|query|sql|rest|json|xml|backend|frontend|devops|docker|kubernetes|lambda|cloud/i.test(responseText);

    if (isTechnical && ranking[0]?.criteria?.accuracy < 85) {
      gaps.push({
        gap: 'Technical content needs external verification',
        mentioned_by: 1,
        severity: 'high',
        type: 'technical_validation',
        solution_needed: true,
        external_validation: true
      });
    }

    return gaps;
  }

  /**
   * Identify strengths and what went well
   */
  identifyStrengths(validationReport) {
    const strengths = [];
    if (!validationReport) return strengths;
    const consensus = validationReport.consensusPoints || [];
    const ranking = validationReport.overallRanking || [];

    // Consensus-based strengths
    consensus.forEach((point, idx) => {
      if (idx < 5) { // Top 5 consensus points
        strengths.push({
          strength: point.point,
          type: 'multi_provider_agreement',
          providers_agreed: point.mentions,
          confidence: Math.min(100, 70 + (point.mentions * 15)),
          significance: point.mentions >= 3 ? 'critical' : 'important'
        });
      }
    });

    // High-scoring criteria
    ranking.slice(0, 2).forEach(provider => {
      const high_scores = Object.entries(provider.criteria || {})
        .filter(([_, score]) => score > 85)
        .sort((a, b) => b[1] - a[1]);
      
      high_scores.slice(0, 2).forEach(([criterion, score]) => {
        strengths.push({
          strength: `${provider.provider} excels at ${criterion} (${score}/100)`,
          type: 'provider_excellence',
          provider: provider.provider,
          criterion,
          score,
          significance: score > 95 ? 'exceptional' : 'strong'
        });
      });
    });

    // High synthesis score
    if (validationReport.synthesisScore > 85) {
      strengths.push({
        strength: `Synthesized response achieves high quality (${validationReport.synthesisScore}/100)`,
        type: 'synthesis_quality',
        score: validationReport.synthesisScore,
        confidence: 95,
        significance: 'critical'
      });
    }

    return strengths;
  }

  /**
   * Generate smart recommendations
   */
  generateRecommendations(insights, gaps, validationReport) {
    const recommendations = [];
    if (!validationReport) return recommendations;

    // For each gap, generate recommendation
    gaps.forEach(gap => {
      if (gap.external_validation) {
        recommendations.push({
          id: `rec-technical-validation-${Date.now()}`,
          type: 'external_validation',
          priority: 'critical',
          recommendation: 'Perform technical validation using external sources',
          why: `Technical content requires real-world verification`,
          how: 'Call technical validators (code checkers, API testers, docs validators)',
          expected_outcome: 'Verified technical accuracy',
          estimated_effort: 'medium'
        });
      } else if (gap.type === 'provider_disagreement') {
        recommendations.push({
          id: `rec-clarify-${Date.now()}`,
          type: 'clarification_needed',
          priority: 'high',
          recommendation: `Clarify conflicting point: "${gap.gap}"`,
          why: 'Providers disagree on this aspect',
          how: 'Use highest-scoring provider\'s explanation or research third-party source',
          expected_outcome: 'Clear, accurate information',
          estimated_effort: 'small'
        });
      } else if (gap.type === 'low_criterion_score') {
        recommendations.push({
          id: `rec-improve-${gap.criterion}`,
          type: 'improvement_needed',
          priority: gap.severity === 'high' ? 'high' : 'medium',
          recommendation: `Improve ${gap.criterion} in ${gap.provider}'s response`,
          why: `${gap.provider} scores low on ${gap.criterion}`,
          how: `Request enhanced explanation or add missing information`,
          expected_outcome: `${gap.criterion} score increased to 85+`,
          estimated_effort: 'small'
        });
      }
    });

    // For each insight, generate recommendation
    insights.forEach(insight => {
      if (insight.type === 'provider_divergence') {
        recommendations.push({
          id: `rec-resolve-divergence-${Date.now()}`,
          type: 'conflict_resolution',
          priority: 'high',
          recommendation: 'Resolve provider disagreements',
          why: 'Different providers have conflicting viewpoints',
          how: 'Research conflicting points independently or ask for deeper explanations',
          expected_outcome: 'Unified, accurate answer',
          estimated_effort: 'medium'
        });
      }
    });

    // Optimize based on synthesis score
    if (validationReport.synthesisScore < 80) {
      recommendations.push({
        id: `rec-optimize-synthesis-${Date.now()}`,
        type: 'quality_optimization',
        priority: 'medium',
        recommendation: 'Optimize synthesized response quality',
        why: `Synthesis score below target (${validationReport.synthesisScore}/100)`,
        how: 'Include more consensus points, reduce conflicting info, improve structure',
        expected_outcome: 'Synthesis score 85+',
        estimated_effort: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Create actionable next steps
   */
  createActionPlan(recommendations, query, context = {}) {
    const actions = [];
    const now = new Date();

    recommendations.forEach((rec, idx) => {
      actions.push({
        id: `action-${idx + 1}`,
        sequence: idx + 1,
        task: rec.recommendation,
        priority: rec.priority,
        type: rec.type,
        who_should_do: this.assignOwner(rec),
        when: this.calculateTiming(rec, now),
        success_criteria: [rec.expected_outcome],
        blockers: this.identifyBlockers(rec),
        dependencies: this.identifyDependencies(rec, recommendations),
        estimated_time: rec.estimated_effort
      });
    });

    // Add optimization actions for future improvement
    if (context.history_available) {
      actions.push({
        id: 'action-learn',
        sequence: actions.length + 1,
        task: 'Track this validation for learning patterns',
        priority: 'low',
        type: 'continuous_learning',
        who_should_do: 'system',
        when: 'immediately',
        success_criteria: ['Pattern stored', 'Provider specialization noted'],
        blockers: [],
        dependencies: [],
        estimated_time: 'minimal'
      });
    }

    return actions;
  }

  /**
   * Assess if technical validation is needed
   */
  assessTechnicalValidationNeed(query, validationReport, gaps) {
    const technicalKeywords = [
      'api', 'code', 'function', 'class', 'algorithm', 'database', 'query', 'sql',
      'rest', 'json', 'xml', 'backend', 'frontend', 'devops', 'docker', 'kubernetes',
      'lambda', 'cloud', 'aws', 'azure', 'gcp', 'javascript', 'python', 'java',
      'react', 'node', 'flask', 'django', 'microservice', 'architecture', 'design pattern'
    ];

    const isTechnical = technicalKeywords.some(kw => 
      query.toLowerCase().includes(kw)
    );

    if (!isTechnical) return false;

    // Check if any technical validation gaps exist
    const techGaps = gaps.filter(g => g.external_validation || g.type === 'technical_validation');
    const lowAccuracy = !validationReport || validationReport.overallRanking?.[0]?.criteria?.accuracy < 80;

    return techGaps.length > 0 || lowAccuracy;
  }

  /**
   * Calculate confidence score (targets 95%+ for high-quality responses)
   */
  calculateConfidence(validationReport, insights) {
    let score = 55; // Base score (raised from 50)
    if (!validationReport) return score;

    const ranking = validationReport.overallRanking || [];
    const consensus = validationReport.consensusPoints || [];
    const conflicts = validationReport.conflictingPoints || [];

    // 1. Consensus strength (up to 25 points)
    const consensusCount = consensus.length;
    if (consensusCount >= 5) {
      score += 25;  // Strong consensus across multiple points
    } else if (consensusCount >= 3) {
      score += 20;
    } else if (consensusCount >= 1) {
      score += 15;
    }

    // 2. Provider agreement quality (up to 25 points)
    if (ranking.length > 1) {
      const topScore = ranking[0].overallScore;
      const secondScore = ranking[1].overallScore;
      const topThreeAvg = ranking.slice(0, Math.min(3, ranking.length))
        .reduce((sum, r) => sum + r.overallScore, 0) / Math.min(3, ranking.length);
      
      // Agreement between top providers
      const agreement = Math.max(0, 1 - (Math.abs(topScore - secondScore) / 100));
      score += agreement * 15;
      
      // Quality of top responses
      if (topThreeAvg >= 90) {
        score += 10;  // Excellent quality responses
      } else if (topThreeAvg >= 80) {
        score += 7;
      } else if (topThreeAvg >= 70) {
        score += 4;
      }
    }

    // 3. Synthesis quality (up to 15 points)
    const synthesisScore = validationReport.synthesisScore || 0;
    if (synthesisScore >= 90) {
      score += 15;
    } else if (synthesisScore >= 80) {
      score += 12;
    } else if (synthesisScore >= 70) {
      score += 8;
    } else if (synthesisScore >= 60) {
      score += 4;
    }

    // 4. Conflict management (up to -15 points)
    const conflictCount = conflicts.length;
    if (conflictCount === 0) {
      score += 10;  // No conflicts = major confidence boost
    } else if (conflictCount <= 2) {
      score += 5;   // Few conflicts = minor boost
    } else {
      score -= Math.min(15, conflictCount * 3);  // Multiple conflicts reduce confidence
    }

    // 5. Criterion-level quality (up to 10 points)
    const avgAccuracy = this.calculateAverageScore(ranking, 'accuracy');
    const avgClarity = this.calculateAverageScore(ranking, 'clarity');
    const avgCompleteness = this.calculateAverageScore(ranking, 'completeness');
    
    const criteriaAvg = (avgAccuracy + avgClarity + avgCompleteness) / 3;
    if (criteriaAvg >= 85) {
      score += 10;
    } else if (criteriaAvg >= 75) {
      score += 6;
    } else if (criteriaAvg >= 65) {
      score += 2;
    }

    // 6. Provider variance (consistency bonus, up to 5 points)
    if (ranking.length > 1) {
      const scores = ranking.map(r => r.overallScore);
      const avgScore = scores.reduce((a, b) => a + b) / scores.length;
      const variance = Math.sqrt(scores.reduce((sq, n) => sq + Math.pow(n - avgScore, 2)) / scores.length);
      
      if (variance < 8) {
        score += 5;  // Very consistent providers
      } else if (variance < 12) {
        score += 3;
      }
    }

    // 7. Adjust for identified gaps (up to -20 points)
    const criticalGaps = insights.gaps.filter(g => g.severity === 'high').length;
    const mediumGaps = insights.gaps.filter(g => g.severity === 'medium').length;
    score -= (criticalGaps * 8 + mediumGaps * 2);

    // 8. Boost for positive insights (up to 5 points)
    const positiveInsights = insights.insights.filter(i => i.level === 'positive').length;
    if (positiveInsights >= 3) {
      score += 5;
    } else if (positiveInsights >= 1) {
      score += 2;
    }

    // Cap at 99 max (never 100%, always room for improvement) and minimum 0
    const finalScore = Math.round(Math.max(0, Math.min(99, score)));
    
    return finalScore;
  }

  /**
   * Determine action priority level
   */
  determineActionPriority(needsTechnical, gaps, confidence) {
    if (needsTechnical) return 'critical';
    if (gaps.filter(g => g.severity === 'high').length > 2) return 'high';
    if (confidence < 60) return 'high';
    if (gaps.length > 0) return 'medium';
    return 'low';
  }

  /**
   * Helper: Calculate average score for criterion
   */
  calculateAverageScore(ranking, criterion) {
    const scores = ranking
      .map(r => r.criteria?.[criterion] || 0)
      .filter(s => s > 0);
    
    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Helper: Assign owner to action
   */
  assignOwner(recommendation) {
    if (recommendation.type === 'external_validation') return 'external_validator';
    if (recommendation.type === 'technical_validation') return 'tech_validator';
    return 'system';
  }

  /**
   * Helper: Calculate timing
   */
  calculateTiming(recommendation, now) {
    const timings = {
      critical: 'immediately',
      high: 'within 1 hour',
      medium: 'within 24 hours',
      low: 'when convenient'
    };
    return timings[recommendation.priority] || 'medium-term';
  }

  /**
   * Helper: Identify blockers
   */
  identifyBlockers(recommendation) {
    const blockers = [];
    if (recommendation.type === 'external_validation') {
      blockers.push('External validator API availability');
      blockers.push('Rate limiting on external services');
    }
    if (recommendation.type === 'conflict_resolution') {
      blockers.push('Need human judgment to resolve');
    }
    return blockers;
  }

  /**
   * Helper: Identify dependencies
   */
  identifyDependencies(current, allRecommendations) {
    const dependencies = [];
    
    if (current.type === 'conflict_resolution') {
      const relatedActions = allRecommendations.filter(r => 
        r.type === 'clarification_needed' && r.why.includes('Providers')
      );
      if (relatedActions.length > 0) {
        dependencies.push(`Depends on: ${relatedActions[0].recommendation}`);
      }
    }

    return dependencies;
  }

  /**
   * Format insights for display
   */
  formatForDisplay(analysis) {
    let output = `## Smart Response Analysis\n\n`;

    output += `**Query:** ${analysis.query}\n`;
    output += `**Confidence Score:** ${analysis.confidenceScore}/100\n`;
    output += `**Action Priority:** ${analysis.actionPriority}\n\n`;

    if (analysis.technicalValidationNeeded) {
      output += `⚠️ **Technical Validation Needed**\n\n`;
    }

    // Strengths
    if (analysis.strengths.length > 0) {
      output += `### ✓ Strengths\n`;
      analysis.strengths.slice(0, 3).forEach(s => {
        output += `- **${s.strength}**\n`;
      });
      output += `\n`;
    }

    // Gaps
    if (analysis.gaps.length > 0) {
      output += `### ⚠️ Gaps Identified\n`;
      analysis.gaps.slice(0, 3).forEach(g => {
        output += `- ${g.gap} (${g.severity} severity)\n`;
      });
      output += `\n`;
    }

    // Recommendations
    if (analysis.recommendations.length > 0) {
      output += `### 📋 Recommendations\n`;
      analysis.recommendations.slice(0, 3).forEach((r, idx) => {
        output += `${idx + 1}. **${r.recommendation}** (${r.priority})\n`;
        output += `   Why: ${r.why}\n`;
        output += `   How: ${r.how}\n\n`;
      });
    }

    // Action Plan
    if (analysis.nextSteps.length > 0) {
      output += `### 🎯 Next Steps\n`;
      analysis.nextSteps.slice(0, 3).forEach((a, idx) => {
        output += `${idx + 1}. **${a.task}** - ${a.when}\n`;
      });
    }

    return output;
  }

  /**
   * Analyze a single response without cross-validation
   * Generates insights based on response quality, completeness, and clarity
   * @param {string} responseText - The response to analyze
   * @param {string} question - The question being answered
   * @param {Object} context - Optional context (metadata, etc.)
   * @returns {Object} Analysis result with insights, gaps, strengths
   */
  analyzeSingleResponse(responseText, question, context = {}) {
    const insights = {
      responsePreview: responseText.substring(0, 100),
      timestamp: new Date().toISOString(),
      insights: [],
      gaps: [],
      strengths: [],
      recommendations: [],
      nextSteps: [],
      technicalValidationNeeded: false,
      confidence: 0.65,
      actionPriority: 'medium'
    };

    // Analyze response quality
    const responseLength = responseText.length;
    const sentenceCount = (responseText.match(/[.!?]+/g) || []).length;
    const paragraphCount = (responseText.match(/\n\n+/g) || []).length + 1;
    const averageSentenceLength = responseLength / Math.max(1, sentenceCount);
    
    // Normalize response for analysis
    const lowerResponse = responseText.toLowerCase();
    const lowerQuestion = question.toLowerCase();

    // Extract key terms from question to check if they're covered
    const questionTerms = lowerQuestion
      .split(/\s+/)
      .filter(term => term.length > 4 && !['what', 'when', 'where', 'which', 'should', 'would', 'about', 'could', 'how', 'have'].includes(term));
    
    const coveredTerms = questionTerms.filter(term => lowerResponse.includes(term));
    const coverageRate = questionTerms.length > 0 ? coveredTerms.length / questionTerms.length : 1;

    // Check for completeness
    if (responseLength < 100) {
      insights.gaps.push({
        gap: 'Response appears to be incomplete or too brief',
        severity: 'medium',
        impact: 'May not fully address the question',
        suggestion: 'Provide more comprehensive answer with examples or details'
      });
    } else if (responseLength > 2000) {
      insights.gaps.push({
        gap: 'Response is unusually long',
        severity: 'low',
        impact: 'May be difficult to digest',
        suggestion: 'Consider summarizing key points more concisely'
      });
    } else {
      insights.strengths.push({
        strength: 'Appropriate response length',
        quality: 'good',
        confidence: 85,
        evidence: `${responseLength} characters is within optimal range`
      });
    }

    // Check for clarity and structure
    if (averageSentenceLength > 30) {
      insights.gaps.push({
        gap: 'Sentences are long and may be hard to follow',
        severity: 'low',
        impact: 'Reduced clarity',
        suggestion: 'Break longer sentences into shorter, clearer statements'
      });
    } else if (averageSentenceLength >= 15 && averageSentenceLength <= 25) {
      insights.strengths.push({
        strength: 'Good sentence structure and clarity',
        quality: 'excellent',
        confidence: 90,
        evidence: `Average sentence length of ${averageSentenceLength.toFixed(1)} words`
      });
    }

    // Check for key terms and specificity
    const hasExamples = /example|for instance|e\.g\.|such as|case study|scenario|illustration/i.test(responseText);
    const hasNumbers = /\d+%|\$\d+|\d+\s*(million|billion|thousand|units?|times?|years?|months?|weeks?|days?)/i.test(responseText);
    const hasComparisons = /compared to|versus|unlike|similar to|as opposed to|in contrast|alternatively/i.test(responseText);
    const hasLists = /[-•]\s|^\d+\.|1\.\s|2\.\s|3\./m.test(responseText);
    const hasSections = /^#+\s|^==.*==|^--.*--/m.test(responseText);
    const hasActionable = /should|must|can|recommend|suggest|consider|implement|apply|try|use/i.test(responseText);
    
    // Detect domain-specific content
    const isTechnical = /code|api|algorithm|function|variable|error|debug|exception|javascript|python|node|react|database|sql|architecture/i.test(responseText);
    const isBusinessFocused = /market|revenue|business|strategy|customer|sales|roi|profit|growth|competitive|position/i.test(responseText);
    const isEducational = /teach|learn|understand|explain|concept|principle|theory|fundamental|basic|advanced/i.test(responseText);

    if (hasExamples) {
      insights.strengths.push({
        strength: 'Includes concrete examples',
        quality: 'excellent',
        confidence: 85,
        evidence: 'Response uses illustrative examples'
      });
    } else {
      insights.gaps.push({
        gap: 'Lacks concrete examples or illustrations',
        severity: 'low',
        impact: 'May be too abstract',
        suggestion: 'Add specific examples to clarify points'
      });
    }

    if (hasNumbers) {
      insights.strengths.push({
        strength: 'Uses specific numbers and data',
        quality: 'good',
        confidence: 80,
        evidence: 'Response includes quantitative information'
      });
    }

    if (hasComparisons) {
      insights.strengths.push({
        strength: 'Provides comparative context',
        quality: 'excellent',
        confidence: 85,
        evidence: 'Response relates concepts to alternatives'
      });
    }

    if (hasActionable) {
      insights.strengths.push({
        strength: 'Provides actionable recommendations',
        quality: 'excellent',
        confidence: 85,
        evidence: 'Response includes practical guidance and next steps'
      });
    }

    // GENERATE REAL, CONTENT-SPECIFIC INSIGHTS
    // Insight 1: Question coverage and relevance
    if (coverageRate >= 0.8) {
      insights.insights.push({
        type: 'high_relevance',
        level: 'positive',
        description: `Response directly addresses ${Math.round(coverageRate * 100)}% of key question terms`,
        evidence: [`${coveredTerms.length} out of ${questionTerms.length} key terms covered`],
        confidence: 90,
        impact: 'Response is well-aligned with the original question',
        actionable: false
      });
    } else if (coverageRate >= 0.5) {
      insights.insights.push({
        type: 'partial_coverage',
        level: 'warning',
        description: `Response covers only ${Math.round(coverageRate * 100)}% of key question terms`,
        evidence: [`${coveredTerms.length} out of ${questionTerms.length} key terms covered`],
        confidence: 85,
        impact: 'Some aspects of the question may not be fully addressed',
        actionable: true
      });
    } else if (coverageRate < 0.5 && coverageRate > 0) {
      insights.insights.push({
        type: 'low_relevance',
        level: 'warning',
        description: `Response may not directly address the question (only ${Math.round(coverageRate * 100)}% coverage)`,
        evidence: [`Only ${coveredTerms.length} out of ${questionTerms.length} key terms mentioned`],
        confidence: 80,
        impact: 'Question may need clarification or response revision',
        actionable: true
      });
    }

    // Insight 2: Response structure and organization
    if (paragraphCount >= 3 && (hasLists || hasSections)) {
      insights.insights.push({
        type: 'quality_threshold_exceeded',
        level: 'positive',
        description: 'Response uses well-organized structure with clear sections',
        evidence: [`${paragraphCount} paragraphs with clear organization`, 'Uses lists or sections for clarity'],
        confidence: 90,
        impact: 'Information is easy to scan and navigate',
        actionable: false
      });
    } else if (paragraphCount >= 2) {
      insights.insights.push({
        type: 'moderate_organization',
        level: 'positive',
        description: 'Response has reasonable structure with multiple paragraphs',
        evidence: [`${paragraphCount} distinct paragraphs`],
        confidence: 75,
        impact: 'Information flow is generally clear',
        actionable: false
      });
    } else {
      insights.insights.push({
        type: 'structure_weakness',
        level: 'warning',
        description: 'Response lacks clear structural organization',
        evidence: ['Single large block of text without clear breaks'],
        confidence: 80,
        impact: 'May be harder to follow and digest',
        actionable: true,
        suggestion: 'Use paragraphs or lists to organize information'
      });
    }

    // Insight 3: Content specificity and evidence
    if (hasNumbers && hasExamples) {
      insights.insights.push({
        type: 'specificity',
        level: 'positive',
        description: 'Response is highly specific with both data and examples',
        evidence: ['Includes concrete numbers/statistics', 'Provides illustrative examples'],
        confidence: 95,
        impact: 'Claims are well-supported and credible',
        actionable: false
      });
    } else if (hasNumbers || hasExamples) {
      insights.insights.push({
        type: 'moderate_specificity',
        level: 'positive',
        description: 'Response includes specific evidence',
        evidence: [hasNumbers ? 'Includes quantitative data' : 'Provides concrete examples'],
        confidence: 85,
        impact: 'Content is grounded in specifics',
        actionable: false
      });
    } else if (responseLength >= 300) {
      insights.insights.push({
        type: 'specificity_gap',
        level: 'warning',
        description: 'Response lacks concrete examples or quantitative data',
        evidence: ['No numbers, percentages, or illustrative examples found'],
        confidence: 75,
        impact: 'Assertions may be harder to verify or remember',
        actionable: true,
        suggestion: 'Add specific numbers, statistics, or examples to strengthen claims'
      });
    }

    // Insight 4: Comparative/contextual depth
    if (hasComparisons) {
      insights.insights.push({
        type: 'high_accuracy',
        level: 'positive',
        description: 'Response provides comparative context and alternatives',
        evidence: ['Uses contrasts or comparative analysis'],
        confidence: 88,
        impact: 'Reader understands relative positioning and tradeoffs',
        actionable: false
      });
    } else if (responseLength >= 400) {
      insights.insights.push({
        type: 'missing_context',
        level: 'warning',
        description: 'Response could benefit from comparative or contextual perspective',
        evidence: ['No comparisons or contrasts with alternatives'],
        confidence: 70,
        impact: 'Perspective may be limited to single viewpoint',
        actionable: true,
        suggestion: 'Consider adding comparisons or context with alternatives'
      });
    }

    // Insight 5: Actionability
    if (hasActionable) {
      insights.insights.push({
        type: 'consensus_strength',
        level: 'positive',
        description: 'Response provides clear, actionable guidance',
        evidence: ['Includes recommendations and practical next steps'],
        confidence: 85,
        impact: 'Reader can immediately apply the information',
        actionable: false
      });
    } else if (responseLength >= 200) {
      insights.insights.push({
        type: 'implementation_gap',
        level: 'warning',
        description: 'Response is informational but lacks actionable guidance',
        evidence: ['No clear recommendations or implementation steps'],
        confidence: 75,
        impact: 'Reader may struggle to apply the information',
        actionable: true,
        suggestion: 'Add recommendations or practical next steps'
      });
    }

    // Insight 6: Domain-specific accuracy needs
    if (isTechnical) {
      insights.insights.push({
        type: 'technical_validation_needed',
        level: 'warning',
        description: 'Response contains technical content that should be verified',
        evidence: ['Technical terminology and concepts detected'],
        confidence: 85,
        impact: 'Code examples or API details should be tested',
        actionable: true,
        suggestion: 'Validate technical correctness with actual testing'
      });
      insights.technicalValidationNeeded = true;
    } else if (isBusinessFocused) {
      insights.insights.push({
        type: 'domain_specialization',
        level: 'positive',
        description: 'Response addresses business/strategy domain',
        evidence: ['Business and strategy terminology detected'],
        confidence: 80,
        impact: 'Response is relevant to business decision-making',
        actionable: false
      });
    } else if (isEducational) {
      insights.insights.push({
        type: 'educational_value',
        level: 'positive',
        description: 'Response is structured for learning and understanding',
        evidence: ['Teaching and explanation patterns detected'],
        confidence: 85,
        impact: 'Good for building foundational knowledge',
        actionable: false
      });
    }

    // Calculate confidence based on response quality signals
    let confidenceScore = 65;
    if (responseLength >= 100 && responseLength <= 2000) confidenceScore += 10;
    if (hasExamples) confidenceScore += 10;
    if (hasNumbers || hasComparisons) confidenceScore += 5;
    if (sentenceCount >= 3) confidenceScore += 5;
    if (insights.gaps.length <= 1) confidenceScore += 5;
    if (coverageRate >= 0.8) confidenceScore += 10;
    if (hasActionable && responseLength >= 200) confidenceScore += 5;
    if (isTechnical) confidenceScore -= 5; // Reduce confidence for technical without external validation

    insights.confidence = Math.min(100, confidenceScore) / 100;

    // Generate recommendations based on actual gaps
    if (insights.gaps.length > 0) {
      insights.recommendations = insights.gaps.slice(0, 3).map(gap => ({
        recommendation: gap.suggestion,
        priority: gap.severity === 'high' ? 'critical' : gap.severity === 'medium' ? 'high' : 'medium',
        why: gap.impact,
        how: `Address by: ${gap.suggestion}`,
        owner: 'responder'
      }));
    }

    // Add recommendations from insights with actionable=true
    const actionableInsights = insights.insights.filter(i => i.actionable && i.suggestion);
    actionableInsights.forEach(insight => {
      if (!insights.recommendations.some(r => r.why === insight.impact)) {
        insights.recommendations.push({
          recommendation: insight.suggestion,
          priority: insight.type === 'specificity_gap' ? 'high' : 'medium',
          why: insight.impact,
          how: `Improve by: ${insight.suggestion}`,
          owner: 'responder'
        });
      }
    });

    // Set action priority based on gaps
    if (insights.gaps.length >= 3 || insights.technicalValidationNeeded) {
      insights.actionPriority = 'high';
    } else if (insights.gaps.length >= 2) {
      insights.actionPriority = 'medium';
    } else {
      insights.actionPriority = 'low';
    }

    return insights;
  }
}

export default SmartResponseAnalyzer;
