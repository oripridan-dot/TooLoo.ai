/**
 * Cross-Validation Integration Service
 * Provides helper functions to easily integrate cross-validation
 * into conversation flows and decision-making processes
 */

import ResponseCrossValidator from '../lib/response-cross-validator.js';
import fetch from 'node-fetch';

class CrossValidationIntegration {
  constructor(baseUrl = 'http://127.0.0.1:3000') {
    this.baseUrl = baseUrl;
    this.validator = new ResponseCrossValidator();
  }

  /**
   * Call cross-validation API endpoint
   */
  async crossValidateViaAPI(message, providers = ['anthropic', 'openai', 'gemini'], sessionId = null) {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/chat/cross-validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          providers,
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[CrossValidationIntegration] API call failed:', error.message);
      throw error;
    }
  }

  /**
   * Get cross-validation insights from API
   */
  async getInsights() {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/chat/cross-validate/insights`);
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[CrossValidationIntegration] Failed to get insights:', error.message);
      throw error;
    }
  }

  /**
   * Format validation report for display in chat
   */
  formatReportForChat(validationReport) {
    const ranking = validationReport.overallRanking || [];
    const consensus = validationReport.consensusPoints || [];
    const conflicts = validationReport.conflictingPoints || [];

    let output = `## Cross-Validation Report\n\n`;

    // Provider Rankings
    output += `### Provider Rankings\n`;
    ranking.forEach((provider, idx) => {
      output += `${idx + 1}. **${provider.provider}** - Score: ${provider.overallScore}/100\n`;
      if (provider.criteria) {
        output += `   - Accuracy: ${provider.criteria.accuracy || 'N/A'}\n`;
        output += `   - Clarity: ${provider.criteria.clarity || 'N/A'}\n`;
        output += `   - Completeness: ${provider.criteria.completeness || 'N/A'}\n`;
      }
    });

    // Consensus Points
    if (consensus.length > 0) {
      output += `\n### Consensus Strengths\n`;
      consensus.forEach(point => {
        output += `✓ ${point.point} (${point.mentions} providers agreed)\n`;
      });
    }

    // Conflicting Points
    if (conflicts.length > 0) {
      output += `\n### Points for Improvement\n`;
      conflicts.forEach(point => {
        output += `⚠ ${point.point} (${point.mentions} providers noted)\n`;
      });
    }

    // Synthesis
    if (validationReport.recommendations?.synthesized) {
      output += `\n### Synthesized Response\n`;
      output += `${validationReport.recommendations.synthesized}\n`;
    }

    // Quality Score
    output += `\n**Overall Synthesis Quality: ${validationReport.synthesisScore}/100**\n`;

    return output;
  }

  /**
   * Quick validation check for a specific question
   * Returns true if providers agree sufficiently, false otherwise
   */
  async quickConsensusCheck(question, threshold = 0.7) {
    try {
      const result = await this.crossValidateViaAPI(question);
      const ranking = result.validationReport.overallRanking || [];
      
      if (ranking.length < 2) return false;

      const topScore = ranking[0].overallScore;
      const secondScore = ranking[1].overallScore;
      const agreement = 1 - (Math.abs(topScore - secondScore) / 100);

      return agreement >= threshold;
    } catch (error) {
      console.error('[CrossValidationIntegration] Consensus check failed:', error.message);
      return false;
    }
  }

  /**
   * Get the most trusted answer based on cross-validation
   */
  async getMostTrustedResponse(question, providers = ['anthropic', 'openai', 'gemini']) {
    try {
      const result = await this.crossValidateViaAPI(question, providers);
      const report = result.validationReport;

      return {
        provider: report.overallRanking[0]?.provider,
        score: report.overallRanking[0]?.overallScore,
        synthesizedResponse: report.recommendations?.synthesized,
        confidence: report.synthesisScore,
        validationMethod: 'cross-provider'
      };
    } catch (error) {
      console.error('[CrossValidationIntegration] Failed to get trusted response:', error.message);
      throw error;
    }
  }

  /**
   * Validate a specific response against standards
   */
  async validateResponse(question, response, provider) {
    try {
      const validator = new ResponseCrossValidator();
      const llmProvider = await this.getLLMProvider();

      const critique = await validator.generateCritique(
        question,
        'validator',
        'Internal validation',
        provider,
        response,
        llmProvider
      );

      return {
        provider,
        validated: true,
        score: critique.rawScore,
        critique: critique.critique,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[CrossValidationIntegration] Validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Compare two responses side-by-side
   */
  async compareResponses(question, provider1Response, provider1Name, provider2Response, provider2Name) {
    try {
      const validator = new ResponseCrossValidator();
      const llmProvider = await this.getLLMProvider();

      const critique1 = await validator.generateCritique(
        question,
        provider2Name,
        provider2Response,
        provider1Name,
        provider1Response,
        llmProvider
      );

      const critique2 = await validator.generateCritique(
        question,
        provider1Name,
        provider1Response,
        provider2Name,
        provider2Response,
        llmProvider
      );

      return {
        comparison: {
          [provider1Name]: {
            response: provider1Response.substring(0, 200) + '...',
            score: critique1.rawScore,
            critique: critique1.critique
          },
          [provider2Name]: {
            response: provider2Response.substring(0, 200) + '...',
            score: critique2.rawScore,
            critique: critique2.critique
          }
        },
        winner: critique1.rawScore > critique2.rawScore ? provider1Name : provider2Name,
        scoreDifference: Math.abs(critique1.rawScore - critique2.rawScore),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[CrossValidationIntegration] Comparison failed:', error.message);
      throw error;
    }
  }

  /**
   * Get LLM provider instance for validation operations
   */
  async getLLMProvider() {
    // Lazy load to avoid circular dependencies
    const { default: LLMProvider } = await import('../engine/llm-provider.js');
    return new LLMProvider();
  }

  /**
   * Format a provider comparison for chat display
   */
  formatComparisonForChat(comparison) {
    let output = `## Response Comparison\n\n`;

    for (const [provider, data] of Object.entries(comparison)) {
      output += `### ${provider}\n`;
      output += `**Score:** ${data.score}/100\n\n`;
      output += `**Response:** ${data.response}\n\n`;
      
      if (data.critique?.criteria) {
        output += `**Criteria Breakdown:**\n`;
        for (const [criterion, criteriaData] of Object.entries(data.critique.criteria)) {
          output += `- ${criterion}: ${criteriaData.score}/100\n`;
        }
      }
      output += `\n`;
    }

    return output;
  }

  /**
   * Create a validation dashboard summary
   */
  createDashboardSummary(validationReport) {
    const ranking = validationReport.overallRanking || [];
    const consensus = validationReport.consensusPoints || [];

    return {
      summary: {
        totalProvidersValidated: ranking.length,
        topProvider: ranking[0]?.provider,
        topProviderScore: ranking[0]?.overallScore,
        synthesisQuality: validationReport.synthesisScore,
        consensusStrength: consensus.length,
        validationType: 'cross-provider-validation',
        timestamp: new Date().toISOString()
      },
      providers: ranking.map((r, idx) => ({
        rank: idx + 1,
        name: r.provider,
        score: r.overallScore,
        accuracyScore: r.criteria?.accuracy || 0,
        clarityScore: r.criteria?.clarity || 0,
        completenessScore: r.criteria?.completeness || 0
      })),
      recommendations: validationReport.recommendations
    };
  }
}

export default CrossValidationIntegration;
