/**
 * Smart Intelligence Orchestrator
 * Combines cross-validation, analysis, and technical validation
 * into a unified high-confidence response system
 */

class SmartIntelligenceOrchestrator {
  constructor() {
    this.confidenceBrackets = {
      critical: [90, 100],
      high: [80, 89],
      moderate: [70, 79],
      low: [50, 69],
      unverified: [0, 49]
    };
  }

  /**
   * Run full smart intelligence pipeline
   * @param {string} responseText - The response text to analyze
   * @param {Object} crossValidationResult - Result from cross-validation (can be null)
   * @param {Object} analysisResult - Result from smart analysis
   * @param {Object} technicalValidationResult - Result from technical validation
   * @param {Object} context - Additional context (question, metadata)
   * @returns {Object} Final assessment with confidence scoring
   */
  runFullPipeline(responseText, crossValidationResult, analysisResult, technicalValidationResult, context = {}) {
    const result = {
      responsePreview: responseText.substring(0, 100),
      timestamp: new Date().toISOString(),
      stagesCompleted: [],
      confidenceScore: 0,
      confidenceBracket: 'unverified',
      verificationStatus: 'pending',
      keyFindings: [],
      criticalIssues: [],
      recommendedAction: 'Review',
      actionRationale: '',
      nextActions: []
    };

    try {
      console.log('[SmartIntelligence] Starting Stage 1: Cross-Validation');

      // Stage 1: Cross-Validation analysis
      let cvScore = 0;
      if (crossValidationResult) {
        cvScore = (crossValidationResult.consensusScore || 0.5) * 100;
        result.stagesCompleted.push('cross-validation');
        result.keyFindings.push(`Consensus level: ${crossValidationResult.agreementLevel || 'moderate'}`);
      }

      // Stage 2: Analysis insights
      let analysisScore = 0;
      if (analysisResult) {
        // Use the improved confidence calculation from SmartResponseAnalyzer
        analysisScore = (analysisResult.confidenceScore !== undefined) ? analysisResult.confidenceScore : (analysisResult.confidence || 0.5) * 100;
        result.stagesCompleted.push('analysis');
        result.keyFindings.push(`Identified ${analysisResult.gaps?.length || 0} gaps`);
        result.keyFindings.push(`Found ${analysisResult.strengths?.length || 0} strengths`);
        result.nextActions.push(...(analysisResult.nextSteps || []));
      }

      // Stage 3: Technical validation
      let techScore = 0;
      if (technicalValidationResult) {
        techScore = technicalValidationResult.overallScore || 0;
        result.stagesCompleted.push('technical-validation');
        if (!technicalValidationResult.verified) {
          result.criticalIssues.push('Technical content requires external verification');
        }
      }

      // Stage 4: Synthesis - Calculate final confidence
      // Weighted formula: varies based on whether we have cross-validation
      // If cross-validation exists: CV(35%) + Tech(30%) + Consensus(20%) + Gaps(10%) + Analysis(5%)
      // If single response: Tech(50%) + Analysis(30%) + Gaps(20%)
      
      let confidenceScore = 0;
      
      if (crossValidationResult) {
        // Multi-provider validation - use cross-validation + analysis scores
        // Cross-validation already incorporates quality metrics
        const consensusBonus = crossValidationResult?.consensusPoints?.length > 0 ? 10 : 0;
        const conflictPenalty = crossValidationResult?.conflictingPoints?.length > 2 ? -15 : 0;
        
        // Weight: prioritize the improved analyzer confidence which already considers multiple factors
        confidenceScore = Math.round(
          (analysisScore * 0.60) +         // Trust the analyzer's sophisticated calculation
          (cvScore * 0.20) +               // Cross-validation consensus
          (techScore * 0.15) +             // Technical validation
          (consensusBonus * 0.05)          // Bonus for clear consensus
        ) + conflictPenalty;
      } else {
        // Single response validation - trust the analyzer's confidence which considers:
        // - Question coverage (80%)
        // - Response structure (75%)
        // - Specificity and evidence (70%)
        // - Actionability (85%)
        // - Domain-specific needs (75%)
        
        // The analyzer already does sophisticated analysis, so use it as primary signal
        confidenceScore = Math.round(
          (analysisScore * 0.75) +         // Primary: Trust analyzer's sophisticated content analysis
          (techScore * 0.15) +             // Secondary: Technical validation score
          (Math.min(100, (responseText.length / 500) * 100) * 0.10)  // Tertiary: Response completeness
        );
      }

      // Clamp to 0-100
      result.confidenceScore = Math.max(0, Math.min(100, confidenceScore));

      // Determine confidence bracket
      if (result.confidenceScore >= 90) {
        result.confidenceBracket = 'Critical';
        result.verificationStatus = 'verified';
        result.recommendedAction = 'Accept';
      } else if (result.confidenceScore >= 80) {
        result.confidenceBracket = 'High';
        result.verificationStatus = 'verified';
        result.recommendedAction = 'Accept';
      } else if (result.confidenceScore >= 70) {
        result.confidenceBracket = 'Moderate';
        result.verificationStatus = 'partially-verified';
        result.recommendedAction = 'Use With Caution';
      } else if (result.confidenceScore >= 50) {
        result.confidenceBracket = 'Low';
        result.verificationStatus = 'unverified';
        result.recommendedAction = 'Review';
      } else {
        result.confidenceBracket = 'Unverified';
        result.verificationStatus = 'unverified';
        result.recommendedAction = 'Revise';
      }

      // Build action rationale
      result.actionRationale = this.buildActionRationale(
        result.recommendedAction,
        result.confidenceScore,
        analysisResult,
        technicalValidationResult
      );

      result.stagesCompleted.push('synthesis');

    } catch (error) {
      result.criticalIssues.push(`Pipeline error: ${error.message}`);
      result.confidenceBracket = 'Unverified';
      result.recommendedAction = 'Revise';
    }

    return result;
  }

  /**
   * Build action rationale based on validation results
   */
  buildActionRationale(action, confidence, analysisResult, technicalValidationResult) {
    const reasons = [];

    if (confidence >= 90) {
      reasons.push('High consensus across providers');
      reasons.push('Technical content verified');
    } else if (confidence >= 70) {
      reasons.push('Moderate provider agreement');
      if (analysisResult?.gaps?.length > 0) {
        reasons.push(`${analysisResult.gaps.length} validation gaps identified`);
      }
    } else {
      reasons.push('Low confidence in response accuracy');
      if (technicalValidationResult?.verified === false) {
        reasons.push('Technical content needs external verification');
      }
    }

    return reasons.join('; ');
  }
}

export default SmartIntelligenceOrchestrator;
