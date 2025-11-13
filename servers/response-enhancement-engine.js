/**
 * TooLoo.ai Response Enhancement Engine
 * Transforms generic provider responses into focused, actionable, insightful answers
 * Brands and delivers unified intelligence as TooLoo.ai
 */

import ProviderExpertiseEngine from './provider-expertise-engine.js';

class ResponseEnhancementEngine {
  constructor() {
    this.expertiseEngine = new ProviderExpertiseEngine();
    this.responseCache = new Map();
  }

  /**
   * Enhance single provider response with expertise
   */
  enhanceProviderResponse(provider, response, context = {}) {
    // Validate response
    if (!response || response.length < 50) {
      return this.getMinimalResponse(provider, context);
    }

    // Get quality assessment
    const quality = this.expertiseEngine.checkResponseQuality(response, provider);
    
    // If needs improvement, transform
    if (quality.quality !== 'excellent') {
      response = this.expertiseEngine.transformToTooLooStandard(response, provider, context);
    }

    // Format with expertise branding
    const enhanced = this.expertiseEngine.formatExpertResponse(provider, response, context);

    return enhanced;
  }

  /**
   * Build unified TooLoo.ai response from multiple providers
   */
  buildUnifiedResponse(query, responses, providers = ['claude', 'gemini', 'openai']) {
    // Ensure we have valid responses
    const validResponses = providers.filter(p => responses[p] && responses[p].length > 50);
    
    if (validResponses.length === 0) {
      return this.getFallbackResponse();
    }

    // Single provider response - enhance it
    if (validResponses.length === 1) {
      const provider = validResponses[0];
      return this.buildSingleProviderResponse(provider, responses[provider], query);
    }

    // Multiple providers - synthesize
    return this.synthesizeMultiProviderResponse(query, responses, validResponses);
  }

  /**
   * Build response from single provider
   */
  buildSingleProviderResponse(provider, response, query) {
    const profile = this.expertiseEngine.providerProfiles[provider.toLowerCase()];
    
    // Enhance the response
    const enhanced = this.expertiseEngine.transformToTooLooStandard(response, provider, {
      query,
      queryType: this.detectQueryType(query)
    });

    // Build TooLoo.ai branded response
    const title = this.generateTitle(provider, query);
    
    return `## ${title}

${enhanced}

---

**Delivered by TooLoo.ai**  
*Powered by ${profile.name}'s expertise in ${profile.focusAreas[0]}*`;
  }

  /**
   * Synthesize responses from multiple providers into unified insight
   */
  synthesizeMultiProviderResponse(query, responses, providers) {
    const response = {
      title: '🎯 TooLoo.ai Unified Intelligence Response',
      sections: [],
      providerCredits: []
    };

    // Detect query type to tailor synthesis
    const queryType = this.detectQueryType(query);

    // Extract and present each provider's unique insight
    if (providers.includes('claude')) {
      response.sections.push(this.createInsightSection(
        'Deep Analysis',
        responses['claude'],
        'claude',
        'Core insight through rigorous reasoning'
      ));
      response.providerCredits.push('Claude (reasoning)');
    }

    if (providers.includes('gemini')) {
      response.sections.push(this.createInsightSection(
        'Innovation & Practicality',
        responses['gemini'],
        'gemini',
        'Creative solution with implementation focus'
      ));
      response.providerCredits.push('Gemini (innovation)');
    }

    if (providers.includes('openai')) {
      response.sections.push(this.createInsightSection(
        'Actionable Implementation',
        responses['openai'],
        'openai',
        'Clear, fast, practical next steps'
      ));
      response.providerCredits.push('GPT-4 (clarity)');
    }

    // Build final response
    let output = `${response.title}\n\n`;

    // Add unified recommendation (synthesized from all)
    output += this.buildUnifiedRecommendation(responses, providers) + '\n\n';

    // Add individual insights
    response.sections.forEach(section => {
      output += `### ${section.title}\n${section.content}\n\n`;
    });

    // Add attribution
    output += `---\n**TooLoo.ai** unifies expertise from:\n`;
    response.providerCredits.forEach(credit => {
      output += `• ${credit}\n`;
    });
    output += '\n*Focused. Actionable. Insightful.*';

    return output;
  }

  /**
   * Create an insight section from provider response
   */
  createInsightSection(title, response, provider, subtitle) {
    // Extract key insight
    const lines = response.split('\n').filter(l => l.trim().length > 0);
    const keyInsights = [];

    // Get first 2-3 substantial sentences
    let charCount = 0;
    for (const line of lines) {
      if (charCount > 500) break; // Limit to ~500 chars
      if (line.trim().length > 20) {
        keyInsights.push(line.trim());
        charCount += line.length;
      }
      if (keyInsights.length >= 2) break;
    }

    const content = keyInsights.join('\n\n') || response.substring(0, 300);

    return {
      title: `${title}`,
      content: `${content}\n\n*${subtitle}*`
    };
  }

  /**
   * Build unified recommendation synthesizing all providers
   */
  buildUnifiedRecommendation(responses, providers) {
    // Extract actionable items from each
    const claudeInsight = this.extractKeyAction(responses['claude'] || '', 'claude');
    const geminiInsight = this.extractKeyAction(responses['gemini'] || '', 'gemini');
    const gptInsight = this.extractKeyAction(responses['openai'] || '', 'openai');

    const insights = [claudeInsight, geminiInsight, gptInsight].filter(Boolean);

    if (insights.length === 0) {
      return '**Recommendation:** Review provider responses for actionable insights.';
    }

    let recommendation = '**Unified Recommendation:**\n\n';
    
    if (insights.length >= 2) {
      // Synthesize multiple insights
      recommendation += `1. ${insights[0]}\n`;
      recommendation += `2. ${insights[1]}\n`;
      if (insights[2]) {
        recommendation += `3. ${insights[2]}\n`;
      }
    } else {
      recommendation += insights[0];
    }

    return recommendation;
  }

  /**
   * Extract key actionable insight from response
   */
  extractKeyAction(response, provider) {
    if (!response || response.length < 50) return null;

    const sentences = response.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 30);
    
    if (sentences.length === 0) return null;

    // Find most actionable sentence
    let keyAction = sentences[0];
    
    for (const sentence of sentences) {
      if (sentence.match(/\b(implement|use|try|build|apply|configure|run|create)\b/i)) {
        keyAction = sentence;
        break;
      }
    }

    // Make it concise
    if (keyAction.length > 150) {
      keyAction = keyAction.substring(0, 150) + '...';
    }

    return keyAction;
  }

  /**
   * Detect query type to tailor response
   */
  detectQueryType(query) {
    const queryLower = query.toLowerCase();

    // Technical queries
    if (queryLower.match(/\b(code|implement|build|debug|error|api|database|server)\b/)) {
      return 'technical';
    }

    // Strategic queries
    if (queryLower.match(/\b(strategy|approach|architecture|design|plan|framework)\b/)) {
      return 'strategic';
    }

    // Creative queries
    if (queryLower.match(/\b(create|generate|design|brainstorm|idea|concept)\b/)) {
      return 'creative';
    }

    // Analysis queries
    if (queryLower.match(/\b(analyze|understand|explain|why|how|what)\b/)) {
      return 'analytical';
    }

    return 'general';
  }

  /**
   * Generate contextual title
   */
  generateTitle(provider, query) {
    const shortQuery = query.substring(0, 50).replace(/\?+$/, '');
    
    const titlePrefixes = {
      claude: '🧠 Deep Insight',
      gemini: '💡 Creative Solution',
      openai: '⚡ Quick Answer'
    };

    const prefix = titlePrefixes[provider.toLowerCase()] || '🎯 Answer';

    return `${prefix}: ${shortQuery}...`;
  }

  /**
   * Get minimal response for insufficient content
   */
  getMinimalResponse(provider, context = {}) {
    const profile = this.expertiseEngine.providerProfiles[provider.toLowerCase()];
    
    return `Unable to generate detailed response at this time.

**Suggestion:** Rephrase your question to be more specific. Include:
• What you're trying to achieve
• What you've already tried
• Any specific constraints

*— TooLoo.ai (${profile.name})*`;
  }

  /**
   * Get fallback response when no valid provider responses
   */
  getFallbackResponse() {
    return `## TooLoo.ai Response

Unable to generate a response from available providers at this time.

**Please try:**
• Rephrasing your question with more specificity
• Breaking complex questions into smaller parts
• Providing more context about your goal

*— TooLoo.ai*`;
  }

  /**
   * Apply expertise lens to transform response
   */
  transformWithExpertiseLens(response, provider) {
    const profile = this.expertiseEngine.providerProfiles[provider.toLowerCase()];
    if (!profile) return response;

    // Remove generic phrases
    const genericPhrases = [
      /^(It depends|This depends|Ultimately|In summary|To summarize|In conclusion)\b/i,
      /\b(various|multiple|different|several) (approaches|ways|methods|options)\b/i,
      /\b(some people|many experts|research suggests|studies show)\b/i
    ];

    let refined = response;
    genericPhrases.forEach(phrase => {
      refined = refined.replace(phrase, '');
    });

    // Add expertise-specific framing
    const framings = {
      claude: '**Root Cause:** ',
      gemini: '**Try This:** ',
      openai: '**Quick Fix:** '
    };

    const framing = framings[provider.toLowerCase()];
    if (framing && !refined.startsWith('**')) {
      refined = framing + refined;
    }

    return refined.trim();
  }

  /**
   * Validate response meets TooLoo.ai standards
   */
  validateForTooLooStandards(response) {
    const standards = {
      focused: response.length > 100 && response.length < 2000,
      actionable: /\b(try|use|implement|run|build|apply|create)\b/i.test(response),
      insightful: response.split(/[.!?]+/).length >= 3,
      noGeneric: !response.match(/\b(it depends|ultimately|in conclusion|various approaches)\b/i)
    };

    return {
      meetsStandards: Object.values(standards).every(v => v),
      standards
    };
  }

  /**
   * Rate response quality on TooLoo.ai dimensions
   */
  rateResponseQuality(response, provider) {
    const validation = this.validateForTooLooStandards(response);
    const expertise = this.expertiseEngine.checkResponseQuality(response, provider);

    const ratings = {
      focus: validation.standards.focused ? 10 : 5,
      actionability: validation.standards.actionable ? 10 : 3,
      insight: validation.standards.insightful ? 10 : 5,
      authenticity: validation.standards.noGeneric ? 10 : 2
    };

    const total = Object.values(ratings).reduce((a, b) => a + b) / 4;

    return {
      overall: Math.round(total),
      ratings,
      meetsStandards: validation.meetsStandards,
      quality: expertise.quality
    };
  }
}

export default ResponseEnhancementEngine;
