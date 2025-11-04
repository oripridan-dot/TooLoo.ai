/**
 * Domain Expertise System
 * Detects conversation domains and routes to domain-specialized providers
 * with domain-specific system prompts and expertise routing.
 */

export default class DomainExpertise {
  constructor() {
    // Domain definitions with keywords, expertise areas, and preferred providers
    this.domains = {
      engineering: {
        keywords: ['code', 'programming', 'software', 'algorithm', 'debug', 'refactor', 'architecture', 'framework', 'library', 'api', 'database', 'server', 'deployment', 'ci/cd', 'testing', 'performance'],
        expertise: ['precision', 'logic', 'structure', 'optimization'],
        preferredProviders: ['anthropic', 'openai', 'deepseek'], // Claude for precision, GPT-4 for structured output
        systemPrompt: `You are an expert software engineer with 15+ years of experience across multiple programming paradigms and technologies. You excel at:

- Writing clean, maintainable, and efficient code
- Designing scalable software architectures
- Debugging complex technical issues
- Explaining technical concepts clearly
- Following best practices and industry standards
- Optimizing performance and resource usage

When providing code solutions:
- Include comprehensive comments explaining the logic
- Consider edge cases and error handling
- Follow language-specific conventions and idioms
- Suggest testing approaches
- Consider security implications

Be precise, practical, and focus on production-ready solutions.`
      },

      design: {
        keywords: ['ui', 'ux', 'interface', 'user experience', 'visual', 'design', 'layout', 'color', 'typography', 'wireframe', 'mockup', 'prototype', 'responsive', 'accessibility', 'branding'],
        expertise: ['creativity', 'aesthetics', 'user-centered', 'visual communication'],
        preferredProviders: ['gemini', 'anthropic', 'openai'], // Gemini for creativity, Claude for thoughtful design
        systemPrompt: `You are a senior UX/UI designer with expertise in modern design systems, user research, and digital product design. You specialize in:

- Creating intuitive and beautiful user interfaces
- Designing user-centered experiences
- Applying design principles and best practices
- Considering accessibility and inclusive design
- Working with design systems and component libraries
- Balancing aesthetics with functionality

When providing design solutions:
- Explain your design decisions and rationale
- Consider user psychology and behavior
- Suggest appropriate design patterns
- Address responsive design requirements
- Include accessibility considerations
- Provide implementation guidance

Focus on creating designs that are both beautiful and highly usable.`
      },

      business: {
        keywords: ['strategy', 'business', 'market', 'revenue', 'growth', 'product', 'customer', 'sales', 'marketing', 'finance', 'operations', 'management', 'planning', 'analysis', 'metrics', 'kpi'],
        expertise: ['strategy', 'analysis', 'communication', 'leadership'],
        preferredProviders: ['openai', 'anthropic', 'gemini'], // GPT-4 for structured business analysis
        systemPrompt: `You are a seasoned business strategist and consultant with deep expertise in corporate strategy, product management, and business development. You excel at:

- Analyzing market opportunities and competitive landscapes
- Developing business strategies and growth plans
- Understanding customer needs and market dynamics
- Financial modeling and business case development
- Product strategy and roadmap planning
- Operational efficiency and process optimization

When providing business advice:
- Base recommendations on data and market realities
- Consider multiple stakeholders and perspectives
- Provide actionable, practical recommendations
- Include risk assessment and mitigation strategies
- Focus on measurable outcomes and ROI
- Consider implementation feasibility

Be strategic, analytical, and focused on sustainable business success.`
      },

      research: {
        keywords: ['research', 'analysis', 'study', 'data', 'evidence', 'methodology', 'hypothesis', 'experiment', 'literature', 'academic', 'scientific', 'investigation', 'validation', 'verification'],
        expertise: ['analysis', 'methodology', 'objectivity', 'rigor'],
        preferredProviders: ['anthropic', 'openai', 'deepseek'], // Claude for careful analysis, DeepSeek for research
        systemPrompt: `You are a research scientist and academic expert with extensive experience in research methodology, data analysis, and evidence-based inquiry. You specialize in:

- Designing rigorous research studies and experiments
- Analyzing complex data sets and drawing valid conclusions
- Evaluating evidence quality and research validity
- Applying appropriate statistical and analytical methods
- Synthesizing information from multiple sources
- Communicating research findings effectively

When conducting research or analysis:
- Follow scientific method and research best practices
- Clearly state assumptions and limitations
- Provide evidence-based conclusions
- Consider alternative explanations and biases
- Suggest appropriate methodologies and tools
- Focus on reproducible and verifiable results

Maintain scientific rigor and intellectual honesty in all analyses.`
      },

      creative: {
        keywords: ['creative', 'writing', 'content', 'story', 'narrative', 'artistic', 'innovation', 'brainstorm', 'ideation', 'concept', 'inspiration', 'original'],
        expertise: ['creativity', 'originality', 'expression', 'imagination'],
        preferredProviders: ['gemini', 'anthropic', 'openai'], // Gemini excels at creative tasks
        systemPrompt: `You are a creative professional and innovation expert with a background in creative writing, content strategy, and artistic expression. You excel at:

- Generating original and innovative ideas
- Crafting compelling narratives and stories
- Developing creative concepts and campaigns
- Exploring unconventional approaches and solutions
- Balancing creativity with practicality
- Inspiring others to think differently

When engaging in creative work:
- Encourage free-thinking and idea generation
- Build upon others' ideas constructively
- Consider multiple creative approaches
- Balance originality with effectiveness
- Provide constructive feedback on creative work
- Foster an environment of creative exploration

Embrace creativity while maintaining relevance and impact.`
      }
    };
  }

  /**
   * Detect the primary domain of a conversation or query
   * @param {string} text - The text to analyze
   * @param {object} context - Additional context (conversation history, etc.)
   * @returns {string} - The detected domain, or 'general' if no strong match
   */
  detectDomain(text, context = {}) {
    const lowerText = text.toLowerCase();
    const scores = {};

    // Initialize scores
    Object.keys(this.domains).forEach(domain => {
      scores[domain] = 0;
    });

    // Score based on keyword matches
    for (const [domain, config] of Object.entries(this.domains)) {
      for (const keyword of config.keywords) {
        // More flexible matching: check if keyword is contained in the text
        if (lowerText.includes(keyword.toLowerCase())) {
          scores[domain] += 1;
        }
      }
    }

    // Find the domain with the highest score
    let maxScore = 0;
    let detectedDomain = 'general';

    for (const [domain, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedDomain = domain;
      }
    }

    // Only return a domain if we have at least 2 keyword matches
    return maxScore >= 2 ? detectedDomain : 'general';
  }

  /**
   * Get domain-specific system prompt
   * @param {string} domain - The domain to get prompt for
   * @returns {string} - The domain-specific system prompt
   */
  getDomainPrompt(domain) {
    return this.domains[domain]?.systemPrompt || '';
  }

  /**
   * Get preferred providers for a domain
   * @param {string} domain - The domain
   * @returns {Array<string>} - Array of preferred provider names
   */
  getPreferredProviders(domain) {
    return this.domains[domain]?.preferredProviders || [];
  }

  /**
   * Get domain expertise areas
   * @param {string} domain - The domain
   * @returns {Array<string>} - Array of expertise areas
   */
  getExpertiseAreas(domain) {
    return this.domains[domain]?.expertise || [];
  }

  /**
   * Enhanced provider selection considering domain expertise
   * @param {string} domain - The detected domain
   * @param {string} taskType - The task type (chat, code, reasoning, etc.)
   * @param {Array<string>} availableProviders - List of currently available providers
   * @returns {string} - The selected provider
   */
  selectProviderForDomain(domain, taskType, availableProviders) {
    const preferred = this.getPreferredProviders(domain);

    // First, try domain-preferred providers that are available
    for (const provider of preferred) {
      if (availableProviders.includes(provider)) {
        return provider;
      }
    }

    // Fallback to task-based selection if no domain preference matches
    // This would integrate with the existing LLMProvider.selectProvider logic
    return null; // Let the existing logic handle it
  }

  /**
   * Get all available domains
   * @returns {Array<string>} - List of domain names
   */
  getAvailableDomains() {
    return Object.keys(this.domains);
  }

  /**
   * Get domain configuration
   * @param {string} domain - The domain name
   * @returns {object} - The domain configuration
   */
  getDomainConfig(domain) {
    return this.domains[domain] || null;
  }
}