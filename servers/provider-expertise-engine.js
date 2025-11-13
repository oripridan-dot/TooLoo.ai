/**
 * Provider Expertise Engine
 * Leverages each provider's unique strengths to deliver focused, actionable responses
 * Brands responses as TooLoo.ai with provider expertise attribution
 */

class ProviderExpertiseEngine {
  constructor() {
    this.providerProfiles = {
      claude: {
        name: 'Claude (Anthropic)',
        strengths: [
          'Deep reasoning and analysis',
          'Complex problem decomposition',
          'Nuanced understanding of context',
          'Code architecture & design patterns',
          'Long-form thoughtful analysis'
        ],
        expertise: {
          codeQuality: 95,
          reasoning: 98,
          creativity: 90,
          fastAnswers: 70,
          dataAnalysis: 85
        },
        systemPrompt: `You are Claude, an expert reasoning engine contributing to TooLoo.ai's unified intelligence platform.

Your role: Provide deep, analytical insights that break problems into actionable components.

CRITICAL: Be CONCISE. No fluff. Structure: Problem → Root Cause → Solution (with code/examples if technical)

Deliver exactly what's asked. One focused insight per response. Make it count.

Your unique value: You see patterns others miss. Deep reasoning. Nuanced understanding.

Sign responses as: "— Claude (via TooLoo.ai)"`,
        focusAreas: ['architecture', 'reasoning', 'complex-analysis', 'design-patterns']
      },
      
      gemini: {
        name: 'Gemini (Google)',
        strengths: [
          'Real-time information access',
          'Multi-modal understanding',
          'Creative brainstorming',
          'Wide knowledge base',
          'Practical implementations'
        ],
        expertise: {
          codeQuality: 85,
          reasoning: 82,
          creativity: 95,
          fastAnswers: 92,
          dataAnalysis: 88
        },
        systemPrompt: `You are Gemini, Google's creative intelligence engine contributing to TooLoo.ai.

Your role: Generate innovative, practical solutions that work in the real world.

CRITICAL: Be DIRECT and ACTIONABLE. Structure: Idea → Implementation → Quick Win

No lengthy explanations. Give them what works NOW. Add one surprising angle they didn't consider.

Your unique value: Creative problem-solving. Practical. Fast. Innovative.

Sign responses as: "— Gemini (via TooLoo.ai)"`,
        focusAreas: ['innovation', 'practicality', 'creativity', 'implementation']
      },
      
      openai: {
        name: 'GPT-4 (OpenAI)',
        strengths: [
          'Comprehensive knowledge',
          'Fast execution',
          'Clear explanations',
          'Balanced perspective',
          'Versatile problem-solving'
        ],
        expertise: {
          codeQuality: 88,
          reasoning: 85,
          creativity: 88,
          fastAnswers: 95,
          dataAnalysis: 85
        },
        systemPrompt: `You are GPT-4, OpenAI's versatile intelligence engine in TooLoo.ai's ecosystem.

Your role: Deliver balanced, efficient solutions with broad applicability.

CRITICAL: Answer FAST and CLEAR. Structure: What → Why → How (in 3 sentences max)

Efficiency first. Clarity always. One solid recommendation backed by why it works.

Your unique value: Speed. Clarity. Reliable, balanced analysis.

Sign responses as: "— GPT-4 (via TooLoo.ai)"`,
        focusAreas: ['balance', 'clarity', 'speed', 'broad-knowledge']
      }
    };
  }

  /**
   * Get provider system prompt for expertise-driven response
   */
  getExpertiseSystemPrompt(provider, userContext = {}) {
    const profile = this.providerProfiles[provider.toLowerCase()];
    if (!profile) return this.getDefaultPrompt();

    const basePrompt = profile.systemPrompt;
    
    // Add context-aware instructions
    let contextualPrompt = basePrompt;
    
    if (userContext.queryType === 'technical') {
      contextualPrompt += '\n\nFOCUS: Technical depth. Use code examples. Reference best practices.';
    } else if (userContext.queryType === 'strategic') {
      contextualPrompt += '\n\nFOCUS: Strategic thinking. Connect to business outcomes. Prioritize impact.';
    } else if (userContext.queryType === 'creative') {
      contextualPrompt += '\n\nFOCUS: Creative solutions. Think outside the box. Multiple angles.';
    }

    return contextualPrompt;
  }

  /**
   * Format response with provider expertise branding
   */
  formatExpertResponse(provider, response, metadata = {}) {
    const profile = this.providerProfiles[provider.toLowerCase()];
    if (!profile) return response;

    // Structure response for maximum impact
    const formatted = `🎯 **${this.getResponseTitle(provider, metadata)}**

${this.refinResponse(response, provider)}

${profile.systemPrompt.match(/Sign responses as: "(.+?)"/)[1]}`;

    return formatted;
  }

  /**
   * Get contextual title based on provider
   */
  getResponseTitle(provider, metadata = {}) {
    const provider_lower = provider.toLowerCase();
    const titles = {
      claude: metadata.title || 'Deep Analysis via TooLoo.ai',
      gemini: metadata.title || 'Innovative Solution via TooLoo.ai',
      openai: metadata.title || 'Practical Answer via TooLoo.ai'
    };
    return titles[provider_lower] || 'Response via TooLoo.ai';
  }

  /**
   * Refine response to match provider expertise
   */
  refinResponse(response, provider) {
    const provider_lower = provider.toLowerCase();

    if (provider_lower === 'claude') {
      return this.refineForClaude(response);
    } else if (provider_lower === 'gemini') {
      return this.refineForGemini(response);
    } else if (provider_lower === 'openai') {
      return this.refineForOpenAI(response);
    }

    return response;
  }

  /**
   * Refine for Claude: Deep reasoning, structured
   */
  refineForClaude(response) {
    // Remove fluff, focus on analysis
    let refined = response
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n');

    // Structure with clear sections
    if (!refined.includes('→') && !refined.includes('•')) {
      refined = refined
        .split('.')
        .slice(0, 3)
        .map(s => `• ${s.trim()}`)
        .join('\n');
    }

    return refined;
  }

  /**
   * Refine for Gemini: Creative, practical
   */
  refineForGemini(response) {
    // Add actionable elements
    let refined = response;

    // Highlight key actions
    refined = refined.replace(
      /^(?!.*→|.*•|.*Action|.*Try|.*Build)/m,
      '**Try this:** '
    );

    // Make implementation-focused
    if (!refined.includes('Implementation') && !refined.includes('Step')) {
      refined = refined.split('?').slice(0, 1).join('?') + 
                '\n\n**Quick implementation**: ' +
                refined.split('?').slice(1).join('?');
    }

    return refined;
  }

  /**
   * Refine for OpenAI: Clear, balanced, fast
   */
  refineForOpenAI(response) {
    // Keep it concise
    const sentences = response.split(/[.!?]+/).filter(s => s.trim());
    
    if (sentences.length > 5) {
      const refined = sentences
        .slice(0, 5)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .join('. ') + '.';
      return refined;
    }

    return response;
  }

  /**
   * Get provider focus keywords for better matching
   */
  getProviderFocusKeywords(provider) {
    const profile = this.providerProfiles[provider.toLowerCase()];
    if (!profile) return [];
    return profile.focusAreas;
  }

  /**
   * Determine best provider for query type
   */
  selectBestProvider(queryType, availableProviders = ['claude', 'gemini', 'openai']) {
    const typeToProvider = {
      'deep-analysis': 'claude',
      'code-architecture': 'claude',
      'design-patterns': 'claude',
      'reasoning': 'claude',
      'complex-problem': 'claude',

      'quick-answer': 'openai',
      'general-knowledge': 'openai',
      'clear-explanation': 'openai',
      'balanced-perspective': 'openai',

      'creative-solution': 'gemini',
      'innovation': 'gemini',
      'brainstorming': 'gemini',
      'practical-implementation': 'gemini',
      'multiple-angles': 'gemini'
    };

    let suggested = typeToProvider[queryType] || 'openai';
    
    if (!availableProviders.includes(suggested)) {
      suggested = availableProviders[0];
    }

    return suggested;
  }

  /**
   * Build multi-provider expertise response
   */
  buildMultiProviderResponse(userQuery, responses) {
    let consolidated = '## TooLoo.ai Unified Intelligence Response\n\n';

    // Identify best insight from each
    const insights = {
      claude: this.extractKeyInsight(responses.claude, 'claude'),
      gemini: this.extractKeyInsight(responses.gemini, 'gemini'),
      openai: this.extractKeyInsight(responses.openai, 'openai')
    };

    // Present with provider attribution
    consolidated += '### Core Insight\n';
    consolidated += insights.claude + '\n\n';

    consolidated += '### Innovation Angle\n';
    consolidated += insights.gemini + '\n\n';

    consolidated += '### Practical Action\n';
    consolidated += insights.openai + '\n\n';

    consolidated += '---\n';
    consolidated += '*TooLoo.ai unifies the expertise of Claude, Gemini, and GPT-4 for comprehensive intelligence.*';

    return consolidated;
  }

  /**
   * Extract key insight from provider response
   */
  extractKeyInsight(response, provider) {
    const provider_lower = provider.toLowerCase();
    const profile = this.providerProfiles[provider_lower];

    // Get first substantive paragraph
    const paragraphs = response.split('\n\n').filter(p => p.trim().length > 50);
    let insight = paragraphs[0] || response;

    // Trim to key points
    const sentences = insight.split(/[.!?]+/);
    insight = sentences.slice(0, 2).join('. ').trim() + '.';

    return `**${profile.name}:** ${insight}`;
  }

  /**
   * Get expertise matching score
   */
  getExpertiseScore(provider, queryType) {
    const profile = this.providerProfiles[provider.toLowerCase()];
    if (!profile) return 0;

    const expertise = profile.expertise;

    // Score based on query characteristics
    let score = 50; // Base score

    if (queryType.includes('code') || queryType.includes('architecture')) {
      score += expertise.codeQuality;
    }
    if (queryType.includes('think') || queryType.includes('analyze')) {
      score += expertise.reasoning;
    }
    if (queryType.includes('create') || queryType.includes('design')) {
      score += expertise.creativity;
    }
    if (queryType.includes('fast') || queryType.includes('quick')) {
      score += expertise.fastAnswers;
    }
    if (queryType.includes('data') || queryType.includes('analyze')) {
      score += expertise.dataAnalysis;
    }

    return Math.min(100, Math.round(score / 2));
  }

  /**
   * Create provider-specific collaboration prompt
   */
  getCollaborationPrompt(providers) {
    const profiles = providers.map(p => this.providerProfiles[p.toLowerCase()]);
    
    let prompt = 'You are part of TooLoo.ai\'s unified intelligence platform.\n\n';
    prompt += 'Your peers are:\n';
    
    profiles.forEach(p => {
      prompt += `• ${p.name}: ${p.strengths.slice(0, 2).join(', ')}\n`;
    });

    prompt += '\nYour job: Deliver YOUR unique expertise. Don\'t duplicate others.\n';
    prompt += 'Be focused. Be actionable. Add value no one else can.\n';
    prompt += 'Brief sign-off with provider name and "via TooLoo.ai"';

    return prompt;
  }

  /**
   * Get default system prompt (fallback)
   */
  getDefaultPrompt() {
    return `You are part of TooLoo.ai's unified AI intelligence platform.

Deliver focused, actionable, insightful responses. Be concise. Be valuable.

Structure: Problem → Root Cause → Solution (1-2 sentences each)

No fluff. No generic advice. Specific, practical recommendations only.

Sign as: "— TooLoo.ai"`;
  }

  /**
   * Quality check response for TooLoo.ai standards
   */
  checkResponseQuality(response, provider) {
    const issues = [];

    // Check for generic phrases
    const generic = [
      'it depends',
      'ultimately',
      'in conclusion',
      'various approaches',
      'to summarize'
    ];

    generic.forEach(phrase => {
      if (response.toLowerCase().includes(phrase)) {
        issues.push(`Generic phrase detected: "${phrase}"`);
      }
    });

    // Check length
    if (response.length < 100) {
      issues.push('Response too brief - needs more substance');
    }
    if (response.length > 2000) {
      issues.push('Response too long - refine for conciseness');
    }

    // Check for actionability
    if (!response.match(/\b(try|use|implement|build|run|apply)\b/i)) {
      issues.push('Not actionable enough - add specific steps');
    }

    // Check for insights
    const sentences = response.split(/[.!?]+/).length;
    if (sentences < 3) {
      issues.push('Not insightful enough - needs deeper analysis');
    }

    return {
      quality: issues.length === 0 ? 'excellent' : issues.length <= 2 ? 'good' : 'needs-improvement',
      issues
    };
  }

  /**
   * Transform generic response to TooLoo.ai standard
   */
  transformToTooLooStandard(response, provider, context = {}) {
    let transformed = response;

    // Step 1: Remove generic intro/outro
    transformed = transformed
      .replace(/^(Well, |I think |I believe |It's important to note that |)/i, '')
      .replace(/\s(In conclusion|To summarize|Ultimately|In the end),?.*$/i, '');

    // Step 2: Make actionable
    if (!transformed.match(/\b(try|use|implement|run|build|apply|create|set|configure|add)\b/i)) {
      // Find the key recommendation and reframe
      const sentences = transformed.split(/[.!?]+/);
      if (sentences.length > 1) {
        const keyPoint = sentences[1].trim();
        transformed = `**Action:** ${keyPoint}.\n\n${sentences.slice(2).join('. ')}`;
      }
    }

    // Step 3: Add provider expertise context
    const profile = this.providerProfiles[provider.toLowerCase()];
    if (profile) {
      transformed = `${transformed}\n\n*${profile.strengths[0]} — ${profile.name}*`;
    }

    // Step 4: Format for TooLoo.ai
    transformed = transformed
      .replace(/\n\n\n+/g, '\n\n')
      .trim();

    return transformed;
  }
}

export default ProviderExpertiseEngine;
