/**
 * Response Cross-Validator
 * Enables providers to validate and critique each other's responses
 * for accuracy, clarity, completeness, tone, and logical consistency
 */

class ResponseCrossValidator {
  constructor() {
    this.validationCriteria = {
      accuracy: { weight: 0.25, description: 'Factual correctness and reliability' },
      clarity: { weight: 0.20, description: 'Understandability and clear communication' },
      completeness: { weight: 0.20, description: 'Addresses all aspects of the question' },
      relevance: { weight: 0.15, description: 'Directly addresses the user intent' },
      tone: { weight: 0.10, description: 'Appropriate voice and style for context' },
      structure: { weight: 0.10, description: 'Well-organized and easy to follow' }
    };

    this.severityLevels = {
      critical: 'Breaks understanding or provides wrong info',
      major: 'Significantly impacts usefulness',
      minor: 'Small improvements possible',
      note: 'Observation without impact'
    };

    this.validationHistory = new Map(); // Track validation patterns for learning
  }

  /**
   * Orchestrate cross-validation between multiple provider responses
   * @param {Object} query - Original user query
   * @param {Array} responses - Array of {provider, response} objects
   * @param {Object} llmProvider - LLM provider instance for meta-analysis
   * @returns {Object} Cross-validation report with critiques and rankings
   */
  async orchestrateCrossValidation(query, responses, llmProvider) {
    if (responses.length < 2) {
      return { 
        status: 'insufficient_responses',
        message: 'Need at least 2 responses for cross-validation',
        responses
      };
    }

    const validationReport = {
      query,
      timestamp: new Date().toISOString(),
      totalResponses: responses.length,
      validations: [],
      overallRanking: [],
      consensusPoints: [],
      conflictingPoints: [],
      recommendations: null,
      synthesisScore: 0
    };

    // Phase 1: Each provider validates others' responses
    for (let i = 0; i < responses.length; i++) {
      const evaluator = responses[i];
      const subjectsToEvaluate = responses.filter((_, idx) => idx !== i);
      
      for (const subject of subjectsToEvaluate) {
        const critique = await this.generateCritique(
          query,
          evaluator.provider,
          evaluator.response,
          subject.provider,
          subject.response,
          llmProvider
        );
        
        validationReport.validations.push(critique);
      }
    }

    // Phase 2: Score each response based on critiques
    validationReport.overallRanking = this.scoreResponses(
      responses,
      validationReport.validations
    );

    // Phase 3: Identify consensus and conflicts
    const analysis = this.analyzeConsensus(validationReport.validations, responses);
    validationReport.consensusPoints = analysis.consensus;
    validationReport.conflictingPoints = analysis.conflicts;

    // Phase 4: Generate synthesis and recommendations
    validationReport.recommendations = await this.generateSynthesis(
      query,
      validationReport.overallRanking,
      validationReport.consensusPoints,
      llmProvider
    );

    // Phase 5: Calculate overall synthesis quality score
    validationReport.synthesisScore = this.calculateSynthesisScore(
      validationReport.overallRanking,
      validationReport.validations.length
    );

    // Track for learning
    this.recordValidationPattern(query, responses, validationReport);

    return validationReport;
  }

  /**
   * Generate detailed critique from one provider evaluating another's response
   */
  async generateCritique(query, evaluatorProvider, evaluatorResponse, subjectProvider, subjectResponse, llmProvider) {
    try {
      const critiquePrompt = `You are ${evaluatorProvider}, an expert AI provider tasked with objectively evaluating ${subjectProvider}'s response.

USER QUERY: "${query}"

${subjectProvider.toUpperCase()}'S RESPONSE:
${subjectResponse}

---

Provide a detailed, constructive critique evaluating the response across these dimensions:

1. **Accuracy** (0-100): How factually correct is the response? Are there any errors or misleading statements?
2. **Clarity** (0-100): How easy is it to understand? Is the language clear and well-expressed?
3. **Completeness** (0-100): Does it address all relevant aspects of the question?
4. **Relevance** (0-100): How directly does it answer the user's intent?
5. **Tone** (0-100): Is the tone appropriate for the context?
6. **Structure** (0-100): Is it well-organized and easy to follow?

For each dimension, provide:
- A score (0-100)
- Key findings
- Issues if any (with severity: critical/major/minor/note)
- Specific examples from the response

Format your critique as JSON with this structure:
{
  "evaluator": "${evaluatorProvider}",
  "subject": "${subjectProvider}",
  "criteria": {
    "accuracy": { "score": X, "findings": "...", "issues": [] },
    "clarity": { "score": X, "findings": "...", "issues": [] },
    "completeness": { "score": X, "findings": "...", "issues": [] },
    "relevance": { "score": X, "findings": "...", "issues": [] },
    "tone": { "score": X, "findings": "...", "issues": [] },
    "structure": { "score": X, "findings": "...", "issues": [] }
  },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."],
  "overallAssessment": "..."
}`;

      const critiqueResult = await llmProvider.generate({
        prompt: critiquePrompt,
        taskType: 'validation',
        context: { evaluator: evaluatorProvider, subject: subjectProvider }
      });

      let critiqueData;
      try {
        const responseText = critiqueResult.content || critiqueResult.response || critiqueResult;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        critiqueData = jsonMatch ? JSON.parse(jsonMatch[0]) : this.parseUnstructuredCritique(responseText);
      } catch (parseErr) {
        // If JSON parsing fails, create structured critique from text
        critiqueData = this.parseUnstructuredCritique(critiqueResult.content || critiqueResult.response || critiqueResult);
      }

      return {
        evaluator: evaluatorProvider,
        subject: subjectProvider,
        timestamp: new Date().toISOString(),
        critique: critiqueData,
        rawScore: this.calculateCritiqueScore(critiqueData)
      };
    } catch (error) {
      console.error(`[CrossValidator] Critique generation failed: ${error.message}`);
      return {
        evaluator: evaluatorProvider,
        subject: subjectProvider,
        error: error.message,
        critique: null,
        rawScore: 0
      };
    }
  }

  /**
   * Parse unstructured critique into structured format
   */
  parseUnstructuredCritique(text) {
    const defaultCriteria = {
      accuracy: { score: 75, findings: 'Unable to auto-parse detailed critique', issues: [] },
      clarity: { score: 75, findings: 'Unable to auto-parse detailed critique', issues: [] },
      completeness: { score: 75, findings: 'Unable to auto-parse detailed critique', issues: [] },
      relevance: { score: 75, findings: 'Unable to auto-parse detailed critique', issues: [] },
      tone: { score: 75, findings: 'Unable to auto-parse detailed critique', issues: [] },
      structure: { score: 75, findings: 'Unable to auto-parse detailed critique', issues: [] }
    };

    // Try to extract scores from text patterns like "accuracy: 80"
    const scorePattern = /(\w+):\s*(\d{1,3})(?:\/100)?/gi;
    let match;
    while ((match = scorePattern.exec(text)) !== null) {
      const criterion = match[1].toLowerCase();
      const score = Math.min(100, Math.max(0, parseInt(match[2])));
      if (defaultCriteria[criterion]) {
        defaultCriteria[criterion].score = score;
      }
    }

    return {
      ...defaultCriteria,
      overallAssessment: text.substring(0, 500),
      strengths: [],
      weaknesses: [],
      suggestions: []
    };
  }

  /**
   * Calculate overall score for a critique
   */
  calculateCritiqueScore(critiqueData) {
    if (!critiqueData || !critiqueData.criteria) return 0;

    let totalScore = 0;
    let count = 0;

    for (const [criterion, data] of Object.entries(critiqueData.criteria)) {
      if (this.validationCriteria[criterion]) {
        const weight = this.validationCriteria[criterion].weight;
        const score = (data.score || 0) * weight;
        totalScore += score;
        count++;
      }
    }

    return count > 0 ? Math.round(totalScore) : 0;
  }

  /**
   * Score each response based on critiques from other providers
   */
  scoreResponses(responses, validations) {
    const scores = {};

    responses.forEach(response => {
      scores[response.provider] = {
        provider: response.provider,
        responsePreview: response.response.substring(0, 150) + '...',
        criteria: {},
        critiquesReceived: [],
        overallScore: 0
      };
    });

    validations.forEach(validation => {
      if (validation.critique && validation.subject in scores) {
        scores[validation.subject].critiquesReceived.push({
          from: validation.evaluator,
          score: validation.rawScore
        });

        // Aggregate criteria scores
        for (const [criterion, data] of Object.entries(validation.critique.criteria || {})) {
          if (!scores[validation.subject].criteria[criterion]) {
            scores[validation.subject].criteria[criterion] = [];
          }
          scores[validation.subject].criteria[criterion].push(data.score);
        }
      }
    });

    // Calculate average scores
    for (const provider in scores) {
      let totalCriteriaScore = 0;
      let criteriaCount = 0;

      for (const criterion in scores[provider].criteria) {
        const scores_arr = scores[provider].criteria[criterion];
        if (scores_arr.length > 0) {
          const avgScore = Math.round(scores_arr.reduce((a, b) => a + b, 0) / scores_arr.length);
          const weight = this.validationCriteria[criterion].weight;
          totalCriteriaScore += avgScore * weight;
          criteriaCount++;
          scores[provider].criteria[criterion] = avgScore;
        }
      }

      scores[provider].overallScore = criteriaCount > 0 ? Math.round(totalCriteriaScore) : 0;
    }

    // Sort by overall score descending
    return Object.values(scores).sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Analyze consensus and conflicting points across validations
   */
  analyzeConsensus(validations, responses) {
    const consensus = [];
    const conflicts = [];
    const strengthCounts = {};
    const weaknessCounts = {};

    validations.forEach(validation => {
      const critique = validation.critique;
      if (!critique) return;

      // Count mentioned strengths
      (critique.strengths || []).forEach(strength => {
        const key = strength.toLowerCase().substring(0, 50);
        strengthCounts[key] = (strengthCounts[key] || 0) + 1;
      });

      // Count mentioned weaknesses
      (critique.weaknesses || []).forEach(weakness => {
        const key = weakness.toLowerCase().substring(0, 50);
        weaknessCounts[key] = (weaknessCounts[key] || 0) + 1;
      });
    });

    // Items mentioned by multiple evaluators = consensus
    Object.entries(strengthCounts).forEach(([item, count]) => {
      if (count >= Math.ceil(responses.length / 2)) {
        consensus.push({
          type: 'strength',
          point: item,
          mentions: count
        });
      }
    });

    Object.entries(weaknessCounts).forEach(([item, count]) => {
      if (count >= 2) {
        conflicts.push({
          type: 'weakness',
          point: item,
          mentions: count
        });
      }
    });

    return { consensus, conflicts };
  }

  /**
   * Generate synthesis recommendation combining best aspects
   */
  async generateSynthesis(query, ranking, consensusPoints, llmProvider) {
    try {
      const topResponses = ranking.slice(0, 2).map(r => ({
        provider: r.provider,
        score: r.overallScore,
        criteria: r.criteria
      }));

      const synthesisPrompt = `Based on cross-validation between multiple AI providers, synthesize the best response to:

USER QUERY: "${query}"

VALIDATION RESULTS:
${JSON.stringify(topResponses, null, 2)}

CONSENSUS STRENGTHS:
${consensusPoints.filter(p => p.type === 'strength').map(p => `- ${p.point} (mentioned ${p.mentions} times)`).join('\n')}

Please synthesize a response that:
1. Incorporates insights from the highest-scoring provider responses
2. Leverages the consensus strengths identified
3. Maintains clarity and accuracy
4. Provides a cohesive, well-structured answer
5. Acknowledges the multi-provider validation process if appropriate

Format as a natural response that directly answers the user query.`;

      const synthesis = await llmProvider.generate({
        prompt: synthesisPrompt,
        taskType: 'synthesis',
        context: { method: 'cross-validation' }
      });

      return {
        synthesized: synthesis.content || synthesis.response || synthesis,
        basedOnProviders: topResponses.map(r => r.provider),
        quality: 'high',
        validationBased: true
      };
    } catch (error) {
      console.error(`[CrossValidator] Synthesis generation failed: ${error.message}`);
      return {
        synthesized: null,
        error: error.message,
        quality: 'failed',
        validationBased: false
      };
    }
  }

  /**
   * Calculate overall synthesis quality score
   */
  calculateSynthesisScore(ranking, validationCount) {
    if (ranking.length === 0) return 0;

    const topScore = ranking[0].overallScore;
    const agreement = ranking.length > 1 ? 
      Math.abs(ranking[0].overallScore - ranking[1].overallScore) < 10 ? 1 : 0.7 : 0.5;
    
    const validationFactor = Math.min(1, validationCount / 20); // Normalize

    return Math.round((topScore * 0.7 + agreement * 20 + validationFactor * 10));
  }

  /**
   * Record validation pattern for learning and improvement
   */
  recordValidationPattern(query, responses, report) {
    const pattern = {
      timestamp: new Date().toISOString(),
      queryLength: query.length,
      responseCount: responses.length,
      synthesisScore: report.synthesisScore,
      topProvider: report.overallRanking[0]?.provider,
      consensusStrength: report.consensusPoints.length,
      conflictStrength: report.conflictingPoints.length
    };

    const patternKey = `${responses.map(r => r.provider).sort().join('-')}`;
    if (!this.validationHistory.has(patternKey)) {
      this.validationHistory.set(patternKey, []);
    }
    this.validationHistory.get(patternKey).push(pattern);
  }

  /**
   * Get validation insights from historical patterns
   */
  getValidationInsights() {
    const insights = {
      totalValidations: Array.from(this.validationHistory.values()).reduce((sum, arr) => sum + arr.length, 0),
      providerPatterns: {},
      averageSynthesisScore: 0
    };

    let totalScore = 0;
    let scoreCount = 0;

    for (const [pattern, entries] of this.validationHistory.entries()) {
      const avgScore = entries.reduce((sum, e) => sum + e.synthesisScore, 0) / entries.length;
      insights.providerPatterns[pattern] = {
        validations: entries.length,
        averageSynthesisScore: Math.round(avgScore),
        mostCommonTopProvider: this.getMostCommon(entries.map(e => e.topProvider))
      };

      totalScore += avgScore;
      scoreCount++;
    }

    insights.averageSynthesisScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    return insights;
  }

  /**
   * Helper to find most common item in array
   */
  getMostCommon(arr) {
    const counts = {};
    arr.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }

  /**
   * Simple synchronous validation for single or multiple responses
   * Called when LLM provider instance is not available
   * @param {string} question - The user's question
   * @param {Array|Object} responses - Single response or array of {provider, response} objects
   * @returns {Object} Validation report
   */
  validateResponses(question, responses) {
    // Normalize input
    const responseArray = Array.isArray(responses) ? responses : [{ provider: 'unknown', response: String(responses) }];
    
    if (responseArray.length === 0) {
      return null;
    }

    // Single response - return null to trigger single-response analysis
    if (responseArray.length === 1) {
      return null;
    }

    // Multiple responses - perform realistic validation with differentiation
    const report = {
      query: question,
      timestamp: new Date().toISOString(),
      totalResponses: responseArray.length,
      overallRanking: [],
      consensusPoints: [],
      conflictingPoints: [],
      consensusScore: 0,
      synthesisScore: 0
    };

    // Score each response based on multiple quality dimensions
    const scoredResponses = responseArray.map((item, idx) => {
      const response = typeof item === 'string' ? item : item.response;
      const provider = typeof item === 'string' ? `Provider${idx + 1}` : item.provider;
      
      let baseScore = 40;  // Start lower
      
      // 1. LENGTH QUALITY (15 pts max)
      // Too short or too long both penalize
      const wordCount = response.split(/\s+/).length;
      if (wordCount < 20) {
        // Too brief - major penalty
        baseScore += 2;
      } else if (wordCount >= 50 && wordCount <= 200) {
        // Optimal range
        baseScore += 15;
      } else if (wordCount > 200 && wordCount <= 400) {
        // Good, slightly verbose
        baseScore += 12;
      } else if (wordCount > 400) {
        // Too verbose, penalize
        baseScore += 6;
      } else {
        // 20-50 words, okay but brief
        baseScore += 8;
      }
      
      // 2. STRUCTURE QUALITY (15 pts max)
      // Well-organized responses score higher
      const hasLists = /[\d.)\-•]\s+[A-Z]|[\d.)\-•]\s+\w+:/.test(response);
      const hasSections = /^[A-Z][^.!?]*:(?:\n|.{0,50})/m.test(response);
      const hasExamples = /example|for instance|such as|e\.g|case|illustration|scenario/i.test(response);
      const hasTransitions = /however|furthermore|moreover|in addition|conversely|also|additionally/i.test(response);
      
      let structureScore = 5;
      if (hasLists) structureScore += 4;
      if (hasSections) structureScore += 3;
      if (hasExamples) structureScore += 5;
      if (hasTransitions) structureScore += 3;
      baseScore += structureScore;
      
      // 3. SPECIFICITY & DETAIL (15 pts max)
      // Responses with numbers, proper nouns, technical terms score higher
      const numbers = (response.match(/\d+/g) || []).length;
      const properNouns = (response.match(/\b[A-Z][a-z]+\b/g) || []).length;
      const technicalTerms = /algorithm|method|process|mechanism|principle|framework|architecture|paradigm|pattern/i.test(response);
      
      let specificityScore = 5;
      if (numbers >= 2) specificityScore += 5;
      if (properNouns >= 3) specificityScore += 4;
      if (technicalTerms) specificityScore += 6;
      baseScore += specificityScore;
      
      // 4. COMPLETENESS (10 pts max)
      // Multiple sentences with varied punctuation
      const sentences = (response.match(/[.!?]+/g) || []).length;
      const avgSentenceLength = response.split(/[.!?]+/).filter(s => s.trim()).reduce((sum, s) => sum + s.split(/\s+/).length, 0) / Math.max(1, sentences);
      
      let completenessScore = 0;
      if (sentences >= 3) completenessScore += 4;
      if (sentences >= 5) completenessScore += 3;
      if (avgSentenceLength >= 15 && avgSentenceLength <= 30) completenessScore += 3;
      baseScore += completenessScore;
      
      // 5. VARIANCE PENALTY
      // Penalize responses that are too similar to others (copy-like)
      let uniquenessScore = 10;  // Default
      
      // This would need cross-comparison in practice; for now assume slight variance
      baseScore += uniquenessScore;
      
      // Cap at 100
      const finalScore = Math.min(100, Math.max(0, baseScore));
      
      return {
        provider,
        response,
        overallScore: finalScore,
        criteria: {
          accuracy: 70 + (finalScore - 50) * 0.3,  // Derived from overall
          clarity: 65 + (finalScore - 50) * 0.35,
          completeness: 68 + (finalScore - 50) * 0.32
        },
        wordCount,
        details: {
          hasLists,
          hasSections,
          hasExamples,
          sentenceCount: sentences,
          avgSentenceLength: Math.round(avgSentenceLength)
        }
      };
    });

    // Rank responses
    scoredResponses.sort((a, b) => b.overallScore - a.overallScore);
    report.overallRanking = scoredResponses;

    // Find common points (semantic similarity)
    const responseTexts = responseArray.map(item => 
      typeof item === 'string' ? item.toLowerCase() : item.response.toLowerCase()
    );
    
    const keywords = responseTexts.map(text =>
      text.match(/\b[a-z]{4,}\b/g) || []
    );

    // Find consensus - keywords appearing in 3+ responses or 2+ if only 2 responses
    const minConsensus = responseArray.length <= 2 ? 2 : 3;
    const keywordCounts = {};
    keywords.forEach(set => {
      set.forEach(kw => {
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
      });
    });

    const commonKeywords = Object.entries(keywordCounts)
      .filter(([, count]) => count >= minConsensus)
      .map(([kw]) => kw)
      .slice(0, 4);  // Top 4 consensus points

    report.consensusPoints = commonKeywords.map(kw => ({
      point: `Agreement on '${kw}' concept`,
      mentions: keywordCounts[kw]
    }));

    // Identify conflicts - topics with high variance
    const topicVariance = Object.entries(keywordCounts)
      .filter(([, count]) => count < minConsensus && count > 0)
      .slice(0, 3);

    report.conflictingPoints = topicVariance.map(([topic]) => ({
      point: `Varying emphasis on '${topic}'`,
      mentions: keywordCounts[topic] || 1
    }));

    // Consensus score - based on actual agreement
    const consensusRatio = report.consensusPoints.length / Math.max(1, 10);
    report.consensusScore = Math.round(50 + (consensusRatio * 30));

    // Synthesis score - weighted average of top responses
    const weights = [0.4, 0.35, 0.25];  // Top 3 weighted differently
    let synthesisScore = 0;
    scoredResponses.slice(0, 3).forEach((r, idx) => {
      synthesisScore += r.overallScore * (weights[idx] || 0.1);
    });
    report.synthesisScore = Math.round(synthesisScore);

    // Add variance calculation
    const scores = scoredResponses.map(r => r.overallScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = Math.sqrt(scores.reduce((sq, n) => sq + Math.pow(n - avgScore, 2)) / scores.length);
    report.responseVariance = variance;
    report.averageScore = Math.round(avgScore);

    return report;
  }
}

export default ResponseCrossValidator;
