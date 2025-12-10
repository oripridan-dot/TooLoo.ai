// @version 2.1.35
/**
 * Domain Expertise System
 * Detects conversation domains and routes to domain-specialized providers
 * with domain-specific system prompts and expertise routing.
 *
 * V2.1.35: CRITICAL FIX - Domain prompts are now ADDITIVE, not identity-replacing.
 * Domain prompts no longer start with "You are..." to preserve TooLoo's core identity.
 */

interface DomainConfig {
  keywords: string[];
  expertise: string[];
  preferredProviders: string[];
  systemPrompt: string;
}

interface DomainMap {
  [key: string]: DomainConfig;
}

export default class DomainExpertise {
  private domains: DomainMap;

  constructor() {
    // Domain definitions with keywords, expertise areas, and preferred providers
    this.domains = {
      engineering: {
        keywords: [
          'code',
          'programming',
          'software',
          'algorithm',
          'debug',
          'refactor',
          'architecture',
          'framework',
          'library',
          'api',
          'database',
          'server',
          'deployment',
          'ci/cd',
          'testing',
          'performance',
        ],
        expertise: ['precision', 'logic', 'structure', 'optimization'],
        preferredProviders: ['anthropic', 'openai', 'deepseek'], // Claude for precision, GPT-4 for structured output
        systemPrompt: `For this engineering task, apply deep software engineering expertise with 15+ years experience across multiple programming paradigms. Your approach:

ENGINEERING CAPABILITIES:
- Write clean, maintainable, and efficient code
- Design scalable software architectures  
- Debug complex technical issues with systematic analysis
- Explain technical concepts clearly and precisely
- Follow best practices and industry standards
- Optimize performance and resource usage

WHEN PROVIDING CODE SOLUTIONS:
- Include comprehensive comments explaining the logic
- Consider edge cases and error handling
- Follow language-specific conventions and idioms
- Suggest testing approaches
- Consider security implications
- Use your execution capabilities to validate when appropriate

Be precise, practical, and focus on production-ready solutions.`,
      },

      design: {
        keywords: [
          'ui',
          'ux',
          'interface',
          'user experience',
          'visual',
          'design',
          'layout',
          'color',
          'typography',
          'wireframe',
          'mockup',
          'prototype',
          'responsive',
          'accessibility',
          'branding',
        ],
        expertise: ['creativity', 'aesthetics', 'user-centered', 'visual communication'],
        preferredProviders: ['gemini', 'anthropic', 'openai'], // Gemini for creativity, Claude for thoughtful design
        systemPrompt: `For this design task, apply senior UX/UI design expertise with deep knowledge of modern design systems and user research. Your approach:

DESIGN CAPABILITIES:
- Create intuitive and beautiful user interfaces
- Design user-centered experiences
- Apply design principles and best practices
- Consider accessibility and inclusive design
- Work with design systems and component libraries
- Balance aesthetics with functionality

WHEN PROVIDING DESIGN SOLUTIONS:
- Explain design decisions and rationale
- Consider user psychology and behavior
- Suggest appropriate design patterns
- Address responsive design requirements
- Include accessibility considerations
- Provide implementation guidance with code examples
- Use appropriate visual formats: charts for data, mermaid for flows, ascii for quick diagrams

Focus on creating designs that are both beautiful and highly usable.`,
      },

      business: {
        keywords: [
          'strategy',
          'business',
          'market',
          'revenue',
          'growth',
          'product',
          'customer',
          'sales',
          'marketing',
          'finance',
          'operations',
          'management',
          'planning',
          'analysis',
          'metrics',
          'kpi',
        ],
        expertise: ['strategy', 'analysis', 'communication', 'leadership'],
        preferredProviders: ['openai', 'anthropic', 'gemini'], // GPT-4 for structured business analysis
        systemPrompt: `For this business task, apply seasoned business strategist expertise with deep knowledge of corporate strategy and product management. Your approach:

BUSINESS CAPABILITIES:
- Analyze market opportunities and competitive landscapes
- Develop business strategies and growth plans
- Understand customer needs and market dynamics
- Create financial models and business case development
- Design product strategy and roadmap planning
- Optimize operational efficiency and processes

WHEN PROVIDING BUSINESS ADVICE:
- Base recommendations on data and market realities
- Consider multiple stakeholders and perspectives
- Provide actionable, practical recommendations
- Include risk assessment and mitigation strategies
- Focus on measurable outcomes and ROI
- Consider implementation feasibility
- Generate data visualizations when helpful

Be strategic, analytical, and focused on sustainable business success.`,
      },

      research: {
        keywords: [
          'research',
          'analysis',
          'study',
          'data',
          'evidence',
          'methodology',
          'hypothesis',
          'experiment',
          'literature',
          'academic',
          'scientific',
          'investigation',
          'validation',
          'verification',
        ],
        expertise: ['analysis', 'methodology', 'objectivity', 'rigor'],
        preferredProviders: ['anthropic', 'openai', 'deepseek'], // Claude for careful analysis, DeepSeek for research
        systemPrompt: `For this research task, apply deep research scientist expertise with extensive experience in methodology and evidence-based inquiry. Your approach:

RESEARCH CAPABILITIES:
- Design rigorous research studies and experiments
- Analyze complex data sets and draw valid conclusions
- Evaluate evidence quality and research validity
- Apply appropriate statistical and analytical methods
- Synthesize information from multiple sources
- Communicate research findings effectively

WHEN CONDUCTING RESEARCH OR ANALYSIS:
- Follow scientific method and research best practices
- Clearly state assumptions and limitations
- Provide evidence-based conclusions
- Consider alternative explanations and biases
- Suggest appropriate methodologies and tools
- Focus on reproducible and verifiable results
- Execute analysis code when verification needed

Maintain scientific rigor and intellectual honesty in all analyses.`,
      },

      creative: {
        keywords: [
          'creative',
          'writing',
          'content',
          'story',
          'narrative',
          'artistic',
          'innovation',
          'brainstorm',
          'ideation',
          'concept',
          'inspiration',
          'original',
        ],
        expertise: ['creativity', 'originality', 'expression', 'imagination'],
        preferredProviders: ['gemini', 'anthropic', 'openai'], // Gemini excels at creative tasks
        systemPrompt: `For this creative task, unleash your creative intelligence and artistic expression capabilities. Your approach:

CREATIVE CAPABILITIES:
- Generate original and innovative ideas
- Craft compelling narratives and stories
- Develop creative concepts and campaigns
- Explore unconventional approaches and solutions
- Balance creativity with practicality
- Inspire and provoke thought

WHEN ENGAGING IN CREATIVE WORK:
- Encourage free-thinking and idea generation
- Build upon ideas constructively
- Consider multiple creative approaches
- Balance originality with effectiveness
- Provide constructive feedback on creative work
- Foster an environment of creative exploration

Embrace creativity while maintaining relevance and impact.`,
      },
    };
  }

  /**
   * Detect the primary domain of a conversation or query
   * @param {string} text - The text to analyze
   * @param {object} context - Additional context (conversation history, etc.)
   * @returns {string} - The detected domain, or 'general' if no strong match
   */
  detectDomain(text: string, context: Record<string, unknown> = {}): string {
    const lowerText = text.toLowerCase();
    const scores: Record<string, number> = {};

    // Initialize scores
    Object.keys(this.domains).forEach((domain) => {
      scores[domain] = 0;
    });

    // Score based on keyword matches
    for (const [domain, config] of Object.entries(this.domains)) {
      for (const keyword of config.keywords) {
        // More flexible matching: check if keyword is contained in the text
        if (lowerText.includes(keyword.toLowerCase())) {
          const currentScore = scores[domain] ?? 0;
          scores[domain] = currentScore + 1;
        }
      }
    }

    // Find the domain with the highest score
    let maxScore = 0;
    let detectedDomain = 'general';

    for (const [domain, score] of Object.entries(scores)) {
      if (typeof score === 'number' && score > maxScore) {
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
  getDomainPrompt(domain: string): string {
    return this.domains[domain]?.systemPrompt || '';
  }

  /**
   * Get preferred providers for a domain
   * @param {string} domain - The domain
   * @returns {Array<string>} - Array of preferred provider names
   */
  getPreferredProviders(domain: string): string[] {
    return this.domains[domain]?.preferredProviders || [];
  }

  /**
   * Get domain expertise areas
   * @param {string} domain - The domain
   * @returns {Array<string>} - Array of expertise areas
   */
  getExpertiseAreas(domain: string): string[] {
    return this.domains[domain]?.expertise || [];
  }

  /**
   * Enhanced provider selection considering domain expertise
   * @param {string} domain - The detected domain
   * @param {string} taskType - The task type (chat, code, reasoning, etc.)
   * @param {Array<string>} availableProviders - List of currently available providers
   * @returns {string} - The selected provider
   */
  selectProviderForDomain(
    domain: string,
    taskType: string,
    availableProviders: string[]
  ): string | null {
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
  getDomainConfig(domain: string): DomainConfig | null {
    return this.domains[domain] || null;
  }
}
