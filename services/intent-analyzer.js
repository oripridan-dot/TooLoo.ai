/**
 * INTENT ANALYZER SERVICE
 * =======================
 * 
 * Analyzes user goals and requests to determine:
 * - What they're trying to accomplish (intent type)
 * - Which services should be involved
 * - Expected output format and quality level
 * - Resource requirements and priority
 * 
 * Returns a structured analysis to guide service orchestration.
 */

export class IntentAnalyzer {
  constructor(options = {}) {
    this.verbose = options.verbose !== false;

    // Intent taxonomy with patterns and metadata
    this.intents = {
      analysis: {
        name: 'Analysis',
        description: 'Understanding and breaking down information',
        keywords: [
          'analyze', 'understand', 'examine', 'breakdown', 'segment',
          'pattern', 'trend', 'insight', 'finding', 'discover',
          'what is', 'how', 'why', 'breakdown of'
        ],
        suggestedServices: ['segmentation', 'meta', 'reports'],
        outputTypes: ['insights', 'patterns', 'findings', 'summary'],
        complexity: 'medium',
        typicalDuration: '5-30 seconds'
      },

      improvement: {
        name: 'Improvement',
        description: 'Optimizing and enhancing existing systems or processes',
        keywords: [
          'improve', 'optimize', 'enhance', 'better', 'faster',
          'increase', 'boost', 'refactor', 'streamline', 'efficient',
          'performance', 'quality', 'reduce', 'minimize'
        ],
        suggestedServices: ['meta', 'training', 'coach', 'reports'],
        outputTypes: ['recommendations', 'implementation-guide', 'metrics'],
        complexity: 'high',
        typicalDuration: '15-60 seconds'
      },

      creation: {
        name: 'Creation',
        description: 'Building new artifacts, documents, or systems',
        keywords: [
          'create', 'generate', 'build', 'write', 'design', 'develop',
          'spec', 'document', 'plan', 'architecture', 'outline',
          'template', 'scaffold', 'draft', 'blueprint'
        ],
        suggestedServices: ['product', 'training', 'reports'],
        outputTypes: ['artifact', 'document', 'code', 'specification'],
        complexity: 'high',
        typicalDuration: '20-90 seconds'
      },

      prediction: {
        name: 'Prediction',
        description: 'Forecasting outcomes and recommending next actions',
        keywords: [
          'predict', 'next', 'what', 'future', 'should', 'recommend',
          'suggest', 'likely', 'estimate', 'forecast', 'will happen',
          'consequence', 'impact', 'outcome'
        ],
        suggestedServices: ['meta', 'coach', 'training'],
        outputTypes: ['recommendation', 'next-steps', 'predictions'],
        complexity: 'medium',
        typicalDuration: '5-20 seconds'
      },

      learning: {
        name: 'Learning',
        description: 'Structured learning and skill development',
        keywords: [
          'learn', 'teach', 'skill', 'master', 'training', 'course',
          'education', 'learn', 'understand', 'study', 'practice',
          'improve knowledge', 'get better at'
        ],
        suggestedServices: ['training', 'coach', 'meta'],
        outputTypes: ['learning-path', 'tutorial', 'exercises'],
        complexity: 'medium',
        typicalDuration: '10-60 seconds'
      },

      debugging: {
        name: 'Debugging',
        description: 'Identifying and resolving problems',
        keywords: [
          'debug', 'fix', 'error', 'problem', 'issue', 'broken',
          'wrong', 'bug', 'crash', 'fail', 'why not', 'help',
          'resolve', 'solution', 'troubleshoot'
        ],
        suggestedServices: ['meta', 'coach', 'reports'],
        outputTypes: ['diagnosis', 'solution', 'root-cause'],
        complexity: 'high',
        typicalDuration: '10-45 seconds'
      }
    };

    // Output format preferences
    this.outputFormats = {
      summary: 'Concise bullet-point summary',
      detailed: 'Comprehensive analysis with explanations',
      technical: 'Code-focused with implementation details',
      business: 'Business-focused with metrics and ROI',
      visual: 'Structured data suitable for visualization',
      document: 'Full document or specification'
    };

    // Quality levels
    this.qualityLevels = {
      draft: { timeEstimate: '5-10s', depth: 'shallow', polish: 'minimal' },
      standard: { timeEstimate: '10-30s', depth: 'medium', polish: 'good' },
      production: { timeEstimate: '30-120s', depth: 'comprehensive', polish: 'high' }
    };
  }

  /**
   * Analyze a user goal/request
   */
  analyze(goal, options = {}) {
    this.log(`Analyzing: "${goal}"`);

    // Extract intent type
    const intentAnalysis = this.detectIntent(goal);
    this.log(`  Intent: ${intentAnalysis.type} (confidence: ${intentAnalysis.confidence}%)`);

    // Detect output preferences
    const outputAnalysis = this.detectOutputPreferences(goal, options);

    // Detect quality requirements
    const qualityAnalysis = this.detectQualityLevel(goal, options);

    // Detect priority/urgency
    const priorityAnalysis = this.detectPriority(goal);

    // Extract entities/context
    const entities = this.extractEntities(goal);

    // Combine into structured analysis
    const analysis = {
      goal,
      intent: {
        type: intentAnalysis.type,
        name: this.intents[intentAnalysis.type].name,
        description: this.intents[intentAnalysis.type].description,
        confidence: intentAnalysis.confidence,
        keywords: intentAnalysis.matchedKeywords
      },
      suggestedServices: this.intents[intentAnalysis.type].suggestedServices,
      output: {
        formats: outputAnalysis.formats,
        types: this.intents[intentAnalysis.type].outputTypes
      },
      quality: qualityAnalysis,
      priority: priorityAnalysis,
      entities,
      estimatedDuration: this.intents[intentAnalysis.type].typicalDuration,
      complexity: this.intents[intentAnalysis.type].complexity,
      confidence: intentAnalysis.confidence,
      recommendation: this.generateRecommendation(intentAnalysis, qualityAnalysis, priorityAnalysis)
    };

    return analysis;
  }

  /**
   * Detect intent type from goal
   */
  detectIntent(goal) {
    const goalLower = goal.toLowerCase();
    const scores = {};

    // Score each intent type
    for (const [intentType, config] of Object.entries(this.intents)) {
      let score = 0;
      const matched = [];

      for (const keyword of config.keywords) {
        if (goalLower.includes(keyword)) {
          score += 10;
          matched.push(keyword);
        }
      }

      scores[intentType] = { score, matched };
    }

    // Find best match
    const [topIntent, topData] = Object.entries(scores)
      .sort((a, b) => b[1].score - a[1].score)[0];

    const totalPossible = Object.values(this.intents)[0].keywords.length * 10;
    const confidence = Math.min(100, Math.round((topData.score / totalPossible) * 100));

    return {
      type: topIntent,
      confidence: Math.max(confidence, 40), // Minimum confidence threshold
      matchedKeywords: topData.matched,
      allScores: scores
    };
  }

  /**
   * Detect output format preferences
   */
  detectOutputPreferences(goal, options = {}) {
    const goalLower = goal.toLowerCase();
    const formats = [];

    // Detect format keywords
    if (goalLower.match(/brief|quick|summary|tldr/)) {
      formats.push('summary');
    }
    if (goalLower.match(/detailed|comprehensive|full|explain/)) {
      formats.push('detailed');
    }
    if (goalLower.match(/code|technical|implement|how to/)) {
      formats.push('technical');
    }
    if (goalLower.match(/business|metrics|roi|financial|executive/)) {
      formats.push('business');
    }
    if (goalLower.match(/visual|chart|graph|diagram|table|format/)) {
      formats.push('visual');
    }
    if (goalLower.match(/document|spec|specification|plan|proposal/)) {
      formats.push('document');
    }

    // Default to detailed if no format detected
    if (formats.length === 0) {
      formats.push('detailed');
    }

    return { formats };
  }

  /**
   * Detect quality/polish level required
   */
  detectQualityLevel(goal, options = {}) {
    const goalLower = goal.toLowerCase();

    // Check for explicit quality keywords
    if (goalLower.match(/production|release|ship|publish|final|high.?quality/)) {
      return { level: 'production', ...this.qualityLevels.production };
    }
    if (goalLower.match(/quick|draft|rough|explore|experiment/)) {
      return { level: 'draft', ...this.qualityLevels.draft };
    }

    // Default to standard
    return { level: 'standard', ...this.qualityLevels.standard };
  }

  /**
   * Detect priority/urgency
   */
  detectPriority(goal) {
    const goalLower = goal.toLowerCase();

    if (goalLower.match(/urgent|asap|quickly|now|immediately|critical/)) {
      return 'high';
    }
    if (goalLower.match(/when you can|whenever|no rush|background/)) {
      return 'low';
    }

    return 'normal';
  }

  /**
   * Extract named entities from goal
   */
  extractEntities(goal) {
    const entities = {
      subjects: [],
      objects: [],
      domains: [],
      technologies: []
    };

    // Simple entity extraction (can be enhanced)
    const commonDomains = ['user', 'project', 'code', 'api', 'database', 'system', 'team', 'product'];
    const commonTechs = ['javascript', 'python', 'sql', 'react', 'node', 'aws', 'docker', 'kubernetes'];

    const goalLower = goal.toLowerCase();

    for (const domain of commonDomains) {
      if (goalLower.includes(domain)) {
        entities.domains.push(domain);
      }
    }

    for (const tech of commonTechs) {
      if (goalLower.includes(tech)) {
        entities.technologies.push(tech);
      }
    }

    return entities;
  }

  /**
   * Generate actionable recommendation
   */
  generateRecommendation(intentAnalysis, qualityAnalysis, priorityAnalysis) {
    const intent = this.intents[intentAnalysis.type];
    
    return {
      action: `${intent.description}. Recommended services: ${intent.suggestedServices.join(', ')}.`,
      expectedTime: intent.typicalDuration,
      quality: qualityAnalysis.level,
      priority: priorityAnalysis,
      shouldParallelize: intent.suggestedServices.length > 1,
      requiresGitHub: intentAnalysis.type === 'creation' || intentAnalysis.type === 'improvement'
    };
  }

  /**
   * Logging helper
   */
  log(message) {
    if (this.verbose) {
      console.log(`[IntentAnalyzer] ${message}`);
    }
  }
}

export default new IntentAnalyzer();
