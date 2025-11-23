// @version 2.1.28
/**
 * Dynamic Refinery Options Manager
 * Detects weighted keywords and suggests refined alternatives
 * Provides measurable, impactful refinements for better prompt results
 */

class RefineryEngine {
  constructor(config = {}) {
    this.config = {
      minKeywordLength: 3,
      maxSuggestions: 15,
      contextTypes: ['action', 'analysis', 'learning', 'problem-solving', 'strategy', 'general'],
      ...config
    };

    this.refinementMap = this.initializeRefinementMap();
    this.contextPatterns = this.initializeContextPatterns();
    
    // Words that indicate emphasis/importance
    this.emphasisIndicators = [
      'please', 'really', 'very', 'so', 'must', 'should', 'critical', 'essential',
      'important', 'definitely', 'absolutely', 'particularly', 'specifically', 'especially'
    ];

    // Common weak words that often need refinement
    this.weakWords = new Set([
      'good', 'bad', 'nice', 'thing', 'stuff', 'very', 'really', 'just', 'like',
      'get', 'make', 'use', 'help', 'show', 'tell', 'look', 'think', 'way', 'part',
      'work', 'do', 'go', 'come', 'see', 'find', 'try', 'know', 'have', 'take',
      'fast', 'slow', 'easy', 'hard', 'better', 'worse', 'big', 'small', 'more'
    ]);

    // Root cause mappings
    this.rootCauseMap = this.initializeRootCauses();
  }

  /**
   * Initialize root cause definitions
   */
  initializeRootCauses() {
    return {
      'clarity_issues': {
        name: 'Clarity & Grammar Issues',
        description: 'Grammatical awkwardness and semantic ambiguity',
        consequences: {
          immediate: 'AI may misinterpret your intent',
          downstream: 'Multiple refinement cycles needed',
          business: 'Slower time-to-value, more token waste'
        },
        examples: ['ambiguous_wording', 'grammatical_error', 'unclear_scope']
      },
      'structure_issues': {
        name: 'Structure & Organization Issues',
        description: 'Instructions grouped poorly or contradicting',
        consequences: {
          immediate: 'AI struggles with instruction precedence',
          downstream: 'Inconsistent outputs across calls',
          business: 'Cannot establish reliable patterns'
        },
        examples: ['conflicting_instructions', 'missing_grouping', 'poor_hierarchy']
      },
      'specificity_issues': {
        name: 'Specificity & Measurability Issues',
        description: 'Vague success criteria and unmeasurable goals',
        consequences: {
          immediate: 'Cannot evaluate if output is correct',
          downstream: 'User accepts wrong outputs, false confidence',
          business: 'Incorrect solutions shipped to production'
        },
        examples: ['no_success_criteria', 'vague_metrics', 'unclear_constraints']
      },
      'efficiency_issues': {
        name: 'Efficiency & Conciseness Issues',
        description: 'Redundant or excessive explanations',
        consequences: {
          immediate: 'Longer prompts = higher latency and cost',
          downstream: 'Waste of context window tokens',
          business: '3-5x higher operational costs per iteration'
        },
        examples: ['excessive_verbosity', 'redundant_content', 'unnecessary_detail']
      }
    };
  }

  /**
   * Main analysis: Detect keywords and generate refinements
   */
  analyze(prompt) {
    const keywords = this.extractKeywords(prompt);
    const weightedKeywords = this.analyzeWeights(keywords, prompt);
    const contextType = this.detectContext(prompt, weightedKeywords);
    const refinements = this.generateRefinements(weightedKeywords, contextType, prompt);
    
    // NEW: Group refinements by category
    const groupedRefinements = this.groupRefinementsByCategory(refinements);
    const issueAnalysis = this.analyzeIssues(groupedRefinements);
    
    return {
      originalPrompt: prompt,
      keywords: keywords,
      weightedKeywords: weightedKeywords,
      contextType: contextType,
      refinements: refinements,
      groupedRefinements: groupedRefinements,
      issueAnalysis: issueAnalysis,
      impactScore: this.calculateOverallImpact(refinements),
      focusArea: this.identifyFocusArea(weightedKeywords),
      recommendations: this.rankRecommendations(refinements),
      report: this.generateReport({
        originalPrompt: prompt,
        weightedKeywords,
        contextType,
        refinements,
        groupedRefinements,
        issueAnalysis,
        recommendations: this.rankRecommendations(refinements)
      })
    };
  }

  /**
   * Extract significant keywords from prompt
   */
  extractKeywords(prompt) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'be', 'are', 'been', 'being',
      'have', 'has', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
      'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
      'her', 'our', 'their', 'what', 'when', 'where', 'why', 'how', 'it\'s', 'don\'t'
    ]);

    const words = prompt.toLowerCase().match(/\b\w+\b/g) || [];
    const keywordMap = new Map();

    words.forEach((word, index) => {
      if (word.length >= this.config.minKeywordLength && !stopWords.has(word)) {
        const key = word.toLowerCase();
        if (!keywordMap.has(key)) {
          keywordMap.set(key, {
            text: word,
            frequency: 0,
            positions: [],
            isEmphatic: false,
            isWeak: this.weakWords.has(key)
          });
        }
        const entry = keywordMap.get(key);
        entry.frequency++;
        entry.positions.push(index);
      }
    });

    return Array.from(keywordMap.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Analyze keyword weights (frequency + emphasis + position + weakness)
   */
  analyzeWeights(keywords, prompt) {
    const tokens = prompt.toLowerCase().split(/\s+/);
    const totalLength = tokens.length;
    const promptLower = prompt.toLowerCase();
    
    return keywords.map((keyword, index) => {
      // Frequency score (0-10)
      const frequencyScore = Math.min(10, (keyword.frequency / totalLength) * 100);
      
      // Position score: important words at start/end rank higher
      const avgPosition = keyword.positions.reduce((a, b) => a + b, 0) / keyword.positions.length;
      const normalizedPosition = avgPosition / totalLength;
      const positionScore = (normalizedPosition < 0.15 || normalizedPosition > 0.85) ? 9 : 
                           (normalizedPosition < 0.3 || normalizedPosition > 0.7) ? 7 : 4;
      
      // Emphasis score: check for emphasis markers around keyword
      const wordIndex = promptLower.indexOf(keyword.text);
      const contextBefore = promptLower
        .substring(Math.max(0, wordIndex - 50), wordIndex)
        .toLowerCase();
      const emphasisScore = this.emphasisIndicators.some(em => contextBefore.includes(em)) ? 8 : 
                           keyword.isEmphatic ? 7 : 3;
      
      // Weakness factor: weak words get higher refinement priority
      const weaknessBoost = keyword.isWeak ? 1.3 : 1.0;
      
      // Combined weight calculation
      const baseWeight = (frequencyScore * 0.35) + (positionScore * 0.30) + (emphasisScore * 0.35);
      const weight = baseWeight * weaknessBoost;
      
      return {
        ...keyword,
        frequencyScore: Math.round(frequencyScore * 10) / 10,
        positionScore: positionScore,
        emphasisScore: emphasisScore,
        weight: Math.round(weight * 10) / 10,
        rank: 0,
        refinementPriority: keyword.isWeak ? 'high' : 'medium'
      };
    })
    .sort((a, b) => b.weight - a.weight)
    .map((kw, idx) => ({ ...kw, rank: idx + 1 }));
  }

  /**
   * Detect context type from prompt
   */
  detectContext(prompt, weightedKeywords) {
    const promptLower = prompt.toLowerCase();

    // Check for action-oriented patterns
    if (/write|create|build|develop|generate|make|design|code|program|implement|compose/i.test(promptLower)) {
      return 'action';
    }

    // Check for analysis patterns
    if (/analyze|review|examine|evaluate|assess|compare|explain|describe|summarize/i.test(promptLower)) {
      return 'analysis';
    }

    // Check for learning patterns
    if (/learn|understand|teach|explain|educate|help|guide|show|demonstrate/i.test(promptLower)) {
      return 'learning';
    }

    // Check for problem-solving patterns
    if (/fix|debug|solve|improve|optimize|enhance|refactor|troubleshoot|resolve/i.test(promptLower)) {
      return 'problem-solving';
    }

    // Check for strategy patterns
    if (/plan|strategy|approach|method|framework|process|workflow|steps|blueprint/i.test(promptLower)) {
      return 'strategy';
    }

    return 'general';
  }

  /**
   * Generate specific refinement suggestions
   */
  generateRefinements(weightedKeywords, contextType, originalPrompt) {
    const refinements = [];
    const topKeywords = weightedKeywords.slice(0, 12);

    for (const keyword of topKeywords) {
      if (keyword.weight < 3) break;

      // Get suggestions from refinement map
      const suggestions = this.getRefinementSuggestions(keyword.text, contextType);

      if (suggestions && suggestions.length > 0) {
        for (const suggestion of suggestions.slice(0, 2)) {
          const refined = {
            originalKeyword: keyword.text,
            suggestedWord: suggestion.replacement,
            reason: suggestion.reason,
            impact: suggestion.impact,
            context: contextType,
            category: suggestion.category,
            keywordWeight: keyword.weight,
            example: this.generateExample(originalPrompt, keyword.text, suggestion.replacement),
            estimatedImprovement: (suggestion.impact * keyword.weight) / 10,
            difficulty: suggestion.difficulty || 'low',
            alternative: suggestion.alternative || null,
            measurableOutcome: suggestion.measurableOutcome || 'Better response clarity'
          };

          refinements.push(refined);
        }
      }
    }

    return refinements.sort((a, b) => b.estimatedImprovement - a.estimatedImprovement);
  }

  /**
   * Get refinement suggestions for a keyword
   */
  getRefinementSuggestions(keyword, contextType) {
    const keywordLower = keyword.toLowerCase();

    // First check specific refinement map
    if (this.refinementMap.has(keywordLower)) {
      return this.refinementMap.get(keywordLower);
    }

    // Then check context-specific alternatives
    const contextualSuggestions = this.findContextualAlternatives(keywordLower, contextType);
    if (contextualSuggestions && contextualSuggestions.length > 0) {
      return contextualSuggestions;
    }

    return [];
  }

  /**
   * Find context-specific alternatives
   */
  findContextualAlternatives(keyword, contextType) {
    const genericMap = {
      // Action verbs
      'do': [
        { replacement: 'execute', impact: 8, category: 'verb', reason: 'More authoritative', difficulty: 'low', measurableOutcome: 'Clearer execution path' },
        { replacement: 'implement', impact: 9, category: 'verb', reason: 'More technical', difficulty: 'low', measurableOutcome: 'More actionable instructions' }
      ],
      'make': [
        { replacement: 'create', impact: 8, category: 'verb', reason: 'More specific', difficulty: 'low', measurableOutcome: 'Better creation clarity' },
        { replacement: 'generate', impact: 9, category: 'verb', reason: 'More technical', difficulty: 'low', measurableOutcome: 'More precise output' }
      ],
      'get': [
        { replacement: 'obtain', impact: 7, category: 'verb', reason: 'More formal', difficulty: 'low', measurableOutcome: 'Better result expectation' },
        { replacement: 'retrieve', impact: 8, category: 'verb', reason: 'More specific', difficulty: 'low', measurableOutcome: 'Clearer data handling' }
      ],
      'use': [
        { replacement: 'leverage', impact: 8, category: 'verb', reason: 'More strategic', difficulty: 'low', measurableOutcome: 'Strategic advantage shown' },
        { replacement: 'utilize', impact: 7, category: 'verb', reason: 'More formal', difficulty: 'low', measurableOutcome: 'More professional tone' }
      ],
      'help': [
        { replacement: 'assist', impact: 7, category: 'verb', reason: 'More formal', difficulty: 'low', measurableOutcome: 'Professional support framing' },
        { replacement: 'enable', impact: 9, category: 'verb', reason: 'More powerful', difficulty: 'medium', measurableOutcome: 'Empowerment focus' }
      ],
      'show': [
        { replacement: 'demonstrate', impact: 8, category: 'verb', reason: 'More authoritative', difficulty: 'low', measurableOutcome: 'Proof-oriented outcome' },
        { replacement: 'illustrate', impact: 7, category: 'verb', reason: 'More visual', difficulty: 'low', measurableOutcome: 'Better visualization' }
      ],
      'tell': [
        { replacement: 'explain', impact: 8, category: 'verb', reason: 'More specific', difficulty: 'low', measurableOutcome: 'Clarity improvement' },
        { replacement: 'communicate', impact: 7, category: 'verb', reason: 'More formal', difficulty: 'low', measurableOutcome: 'Better message delivery' }
      ],
      'look': [
        { replacement: 'examine', impact: 8, category: 'verb', reason: 'More analytical', difficulty: 'low', measurableOutcome: 'Deeper analysis' },
        { replacement: 'analyze', impact: 9, category: 'verb', reason: 'More specific', difficulty: 'low', measurableOutcome: 'Rigorous investigation' }
      ],
      'think': [
        { replacement: 'consider', impact: 7, category: 'verb', reason: 'More formal', difficulty: 'low', measurableOutcome: 'Thoughtful approach' },
        { replacement: 'evaluate', impact: 9, category: 'verb', reason: 'More analytical', difficulty: 'low', measurableOutcome: 'Critical assessment' }
      ],
      'work': [
        { replacement: 'function', impact: 8, category: 'verb', reason: 'More technical', difficulty: 'low', measurableOutcome: 'Technical clarity' },
        { replacement: 'operate', impact: 7, category: 'verb', reason: 'More systematic', difficulty: 'low', measurableOutcome: 'Process clarity' }
      ],
      'know': [
        { replacement: 'understand', impact: 8, category: 'verb', reason: 'More nuanced', difficulty: 'low', measurableOutcome: 'Deep comprehension' },
        { replacement: 'recognize', impact: 7, category: 'verb', reason: 'More specific', difficulty: 'low', measurableOutcome: 'Pattern identification' }
      ],
      'see': [
        { replacement: 'observe', impact: 8, category: 'verb', reason: 'More analytical', difficulty: 'low', measurableOutcome: 'Scientific rigor' },
        { replacement: 'identify', impact: 9, category: 'verb', reason: 'More actionable', difficulty: 'low', measurableOutcome: 'Solution focus' }
      ],
      'find': [
        { replacement: 'locate', impact: 7, category: 'verb', reason: 'More specific', difficulty: 'low', measurableOutcome: 'Precise discovery' },
        { replacement: 'discover', impact: 8, category: 'verb', reason: 'More exploratory', difficulty: 'low', measurableOutcome: 'Innovation focus' }
      ],
      'try': [
        { replacement: 'attempt', impact: 7, category: 'verb', reason: 'More formal', difficulty: 'low', measurableOutcome: 'Purposeful action' },
        { replacement: 'experiment', impact: 9, category: 'verb', reason: 'More scientific', difficulty: 'medium', measurableOutcome: 'Rigorous testing' }
      ],

      // Descriptors - weak adjectives
      'good': [
        { replacement: 'excellent', impact: 8, category: 'descriptor', reason: 'More positive', difficulty: 'low', measurableOutcome: '+30% enthusiasm' },
        { replacement: 'effective', impact: 9, category: 'descriptor', reason: 'Results-focused', difficulty: 'low', measurableOutcome: 'Outcome clarity' }
      ],
      'bad': [
        { replacement: 'suboptimal', impact: 8, category: 'descriptor', reason: 'More analytical', difficulty: 'medium', measurableOutcome: 'Professional tone' },
        { replacement: 'ineffective', impact: 9, category: 'descriptor', reason: 'More specific', difficulty: 'low', measurableOutcome: 'Clear problem ID' }
      ],
      'nice': [
        { replacement: 'elegant', impact: 8, category: 'descriptor', reason: 'More sophisticated', difficulty: 'low', measurableOutcome: '+40% quality perception' },
        { replacement: 'refined', impact: 7, category: 'descriptor', reason: 'More professional', difficulty: 'low', measurableOutcome: 'Sophistication increase' }
      ],
      'big': [
        { replacement: 'comprehensive', impact: 8, category: 'descriptor', reason: 'More specific', difficulty: 'low', measurableOutcome: 'Scope clarity' },
        { replacement: 'substantial', impact: 7, category: 'descriptor', reason: 'More professional', difficulty: 'low', measurableOutcome: 'Scale emphasis' }
      ],
      'small': [
        { replacement: 'concise', impact: 8, category: 'descriptor', reason: 'More precise', difficulty: 'low', measurableOutcome: 'Length clarity' },
        { replacement: 'focused', impact: 9, category: 'descriptor', reason: 'More strategic', difficulty: 'low', measurableOutcome: 'Precision +50%' }
      ],
      'fast': [
        { replacement: 'efficient', impact: 9, category: 'descriptor', reason: 'More nuanced', difficulty: 'low', measurableOutcome: 'Resource optimization' },
        { replacement: 'rapid', impact: 7, category: 'descriptor', reason: 'More formal', difficulty: 'low', measurableOutcome: 'Speed emphasis' }
      ],
      'slow': [
        { replacement: 'gradual', impact: 7, category: 'descriptor', reason: 'More neutral', difficulty: 'low', measurableOutcome: 'Methodical tone' },
        { replacement: 'methodical', impact: 9, category: 'descriptor', reason: 'More positive', difficulty: 'medium', measurableOutcome: '+60% trust' }
      ],
      'easy': [
        { replacement: 'straightforward', impact: 8, category: 'descriptor', reason: 'More specific', difficulty: 'low', measurableOutcome: 'Clarity +40%' },
        { replacement: 'intuitive', impact: 9, category: 'descriptor', reason: 'User-centric', difficulty: 'low', measurableOutcome: '+50% UX perception' }
      ],
      'hard': [
        { replacement: 'challenging', impact: 8, category: 'descriptor', reason: 'Positive framing', difficulty: 'low', measurableOutcome: 'Motivation +30%' },
        { replacement: 'complex', impact: 9, category: 'descriptor', reason: 'More specific', difficulty: 'low', measurableOutcome: 'Sophistication clear' }
      ],
      'better': [
        { replacement: 'optimized', impact: 9, category: 'descriptor', reason: 'More technical', difficulty: 'medium', measurableOutcome: 'Performance focus' },
        { replacement: 'enhanced', impact: 8, category: 'descriptor', reason: 'More professional', difficulty: 'low', measurableOutcome: 'Improvement clarity' }
      ],
      'worse': [
        { replacement: 'degraded', impact: 7, category: 'descriptor', reason: 'More technical', difficulty: 'medium', measurableOutcome: 'Problem ID' },
        { replacement: 'diminished', impact: 8, category: 'descriptor', reason: 'More formal', difficulty: 'low', measurableOutcome: 'Impact clarity' }
      ],

      // Intensifiers
      'very': [
        { replacement: 'extremely', impact: 7, category: 'intensifier', reason: 'Stronger emphasis', difficulty: 'low', measurableOutcome: '+25% impact' },
        { replacement: 'remarkably', impact: 8, category: 'intensifier', reason: 'More sophisticated', difficulty: 'low', measurableOutcome: '+30% uniqueness' }
      ],
      'really': [
        { replacement: 'genuinely', impact: 8, category: 'intensifier', reason: 'More formal', difficulty: 'low', measurableOutcome: '+20% authenticity' },
        { replacement: 'truly', impact: 7, category: 'intensifier', reason: 'More eloquent', difficulty: 'low', measurableOutcome: '+15% credibility' }
      ],
      'just': [
        { replacement: 'simply', impact: 7, category: 'qualifier', reason: 'More formal', difficulty: 'low', measurableOutcome: 'Clarity +30%' },
        { replacement: 'only', impact: 6, category: 'qualifier', reason: 'More precise', difficulty: 'low', measurableOutcome: 'Scope clarity' }
      ],

      // Prepositions/Conjunctions
      'like': [
        { replacement: 'such as', impact: 8, category: 'preposition', reason: 'More formal', difficulty: 'low', measurableOutcome: 'Formality +40%' },
        { replacement: 'including', impact: 7, category: 'preposition', reason: 'More specific', difficulty: 'low', measurableOutcome: 'Scope clarity' }
      ],

      // Nouns
      'thing': [
        { replacement: 'element', impact: 7, category: 'noun', reason: 'More professional', difficulty: 'low', measurableOutcome: 'Professionalism +25%' },
        { replacement: 'component', impact: 8, category: 'noun', reason: 'More technical', difficulty: 'low', measurableOutcome: 'Technical clarity' }
      ],
      'stuff': [
        { replacement: 'content', impact: 9, category: 'noun', reason: 'Much more specific', difficulty: 'low', measurableOutcome: '+50% clarity' },
        { replacement: 'materials', impact: 8, category: 'noun', reason: 'More professional', difficulty: 'low', measurableOutcome: '+35% formality' }
      ],
      'way': [
        { replacement: 'method', impact: 8, category: 'noun', reason: 'More technical', difficulty: 'low', measurableOutcome: 'Technical +30%' },
        { replacement: 'approach', impact: 9, category: 'noun', reason: 'More strategic', difficulty: 'low', measurableOutcome: 'Strategy clarity' }
      ],
      'part': [
        { replacement: 'section', impact: 7, category: 'noun', reason: 'More specific', difficulty: 'low', measurableOutcome: 'Structure clarity' },
        { replacement: 'component', impact: 8, category: 'noun', reason: 'More technical', difficulty: 'low', measurableOutcome: '+25% precision' }
      ]
    };

    return genericMap[keyword] || [];
  }

  /**
   * Initialize comprehensive refinement map
   */
  initializeRefinementMap() {
    const map = new Map();

    // High-impact mappings for common weak words
    map.set('help', [
      { replacement: 'assist', impact: 6, category: 'action', reason: 'More formal and professional', difficulty: 'low', measurableOutcome: '+20% professionalism' },
      { replacement: 'enable', impact: 9, category: 'action', reason: 'More powerful and action-oriented', difficulty: 'medium', measurableOutcome: '+45% empowerment sense' }
    ]);

    map.set('important', [
      { replacement: 'critical', impact: 9, category: 'qualifier', reason: 'Emphasizes urgency and significance', difficulty: 'low', measurableOutcome: '+50% urgency' },
      { replacement: 'essential', impact: 8, category: 'qualifier', reason: 'Stronger emphasis on necessity', difficulty: 'low', measurableOutcome: '+40% necessity' }
    ]);

    map.set('go', [
      { replacement: 'proceed', impact: 7, category: 'action', reason: 'More formal and deliberate', difficulty: 'low', measurableOutcome: '+25% formality' },
      { replacement: 'navigate', impact: 8, category: 'action', reason: 'More intentional and strategic', difficulty: 'low', measurableOutcome: '+30% strategy sense' }
    ]);

    map.set('come', [
      { replacement: 'emerge', impact: 8, category: 'action', reason: 'More eloquent and impactful', difficulty: 'low', measurableOutcome: '+35% eloquence' },
      { replacement: 'arrive', impact: 7, category: 'action', reason: 'More formal and purposeful', difficulty: 'low', measurableOutcome: '+20% formality' }
    ]);

    map.set('take', [
      { replacement: 'adopt', impact: 8, category: 'action', reason: 'More intentional and strategic', difficulty: 'low', measurableOutcome: '+30% intention clarity' },
      { replacement: 'seize', impact: 9, category: 'action', reason: 'More powerful and proactive', difficulty: 'medium', measurableOutcome: '+45% proactivity' }
    ]);

    return map;
  }

  /**
   * Initialize context patterns
   */
  initializeContextPatterns() {
    return {
      action: {
        keywords: ['write', 'create', 'build', 'generate', 'make', 'develop'],
        focus: 'Strong action verbs',
        priority: 'verb-refinement'
      },
      analysis: {
        keywords: ['analyze', 'review', 'examine', 'evaluate', 'assess'],
        focus: 'Analytical precision',
        priority: 'adverb-refinement'
      },
      learning: {
        keywords: ['learn', 'understand', 'explain', 'teach', 'guide'],
        focus: 'Clarity and pedagogy',
        priority: 'clarity-refinement'
      },
      'problem-solving': {
        keywords: ['fix', 'solve', 'improve', 'debug', 'optimize'],
        focus: 'Solution-oriented language',
        priority: 'method-refinement'
      },
      strategy: {
        keywords: ['plan', 'strategy', 'approach', 'framework', 'process'],
        focus: 'Structured thinking',
        priority: 'structure-refinement'
      },
      general: {
        keywords: [],
        focus: 'General clarity',
        priority: 'general-refinement'
      }
    };
  }

  /**
   * Generate before/after example
   */
  generateExample(originalPrompt, originalWord, replacementWord) {
    const regex = new RegExp(`\\b${originalWord}\\b`, 'gi');
    const before = originalPrompt;
    const after = originalPrompt.replace(regex, `**${replacementWord}**`);
    
    return {
      before: before,
      after: after,
      changed: originalWord,
      replacement: replacementWord,
      changeCount: (before.match(regex) || []).length
    };
  }

  /**
   * Calculate overall impact score
   */
  calculateOverallImpact(refinements) {
    if (refinements.length === 0) return 0;
    
    const topRefinements = refinements.slice(0, 5);
    const totalImprovement = topRefinements.reduce((sum, ref) => sum + ref.estimatedImprovement, 0);
    const avgImprovement = totalImprovement / Math.min(5, refinements.length);
    
    return Math.round(avgImprovement * 10) / 10;
  }

  /**
   * Identify primary focus area
   */
  identifyFocusArea(weightedKeywords) {
    if (weightedKeywords.length === 0) return 'general';

    const categories = {
      action: ['write', 'create', 'build', 'make', 'generate', 'develop', 'execute', 'implement'],
      analysis: ['analyze', 'review', 'examine', 'evaluate', 'assess', 'compare', 'examine'],
      learning: ['learn', 'understand', 'explain', 'teach', 'guide', 'show', 'demonstrate'],
      problem: ['fix', 'debug', 'solve', 'improve', 'optimize', 'enhance', 'refactor'],
      strategy: ['plan', 'strategy', 'approach', 'framework', 'process', 'method']
    };

    for (const keyword of weightedKeywords.slice(0, 3)) {
      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.includes(keyword.text.toLowerCase())) {
          return category;
        }
      }
    }

    return 'general';
  }

  /**
   * Rank recommendations by impact and difficulty
   */
  rankRecommendations(refinements) {
    return refinements
      .map(ref => ({
        ...ref,
        score: (ref.estimatedImprovement * 0.6) + ((10 - this.difficultyScore(ref.difficulty)) * 0.4),
        priorityLevel: ref.estimatedImprovement > 6.5 ? 'high' : 
                       ref.estimatedImprovement > 4.5 ? 'medium' : 'low'
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((ref, idx) => ({ ...ref, rank: idx + 1 }));
  }

  /**
   * Difficulty score converter
   */
  difficultyScore(difficulty) {
    const scores = { 'low': 2, 'medium': 5, 'high': 8 };
    return scores[difficulty] || 5;
  }

  /**
   * Generate comprehensive report
   */
  generateReport(analysis) {
    return {
      summary: {
        originalPrompt: analysis.originalPrompt,
        contextType: analysis.contextType,
        totalKeywords: analysis.weightedKeywords.length,
        refinementOpportunities: analysis.recommendations.length,
        potentialImpact: `${(this.calculateOverallImpact(analysis.recommendations) * 10).toFixed(0)}% quality increase`
      },

      topKeywordsToRefine: analysis.weightedKeywords
        .filter(kw => kw.weight > 5 || kw.isWeak)
        .slice(0, 5)
        .map(kw => ({
          word: kw.text,
          weight: kw.weight,
          frequency: kw.frequency,
          emphasis: kw.emphasisScore >= 7 ? 'High' : 'Medium',
          needsRefinement: kw.isWeak ? 'Yes' : 'No'
        })),

      topRecommendations: analysis.recommendations
        .slice(0, 5)
        .map((rec, idx) => ({
          rank: idx + 1,
          priority: rec.priorityLevel,
          change: `"${rec.originalKeyword}" → "${rec.suggestedWord}"`,
          reason: rec.reason,
          estimatedImprovement: `+${rec.estimatedImprovement.toFixed(1)} points`,
          measurable: rec.measurableOutcome,
          difficulty: rec.difficulty,
          before: rec.example.before,
          after: rec.example.after
        })),

      quickWins: analysis.recommendations
        .filter(r => r.difficulty === 'low')
        .slice(0, 3)
        .map(r => `Replace "${r.originalKeyword}" with "${r.suggestedWord}" (${r.reason})`),

      implementationGuide: {
        phase1: 'Apply Quick Wins (easy, immediate impact)',
        phase2: 'Apply Medium Effort changes (higher impact)',
        phase3: 'Evaluate High Impact changes (strategic shifts)',
        estimatedTimeToApply: '3-7 minutes',
        expectedOutcome: 'Significantly clearer, more impactful prompt'
      },

      metrics: {
        totalRefinements: analysis.recommendations.length,
        avgImpactScore: Math.round((analysis.recommendations.reduce((sum, r) => sum + r.estimatedImprovement, 0) / analysis.recommendations.length) * 10) / 10,
        keywordsWithHighWeight: analysis.weightedKeywords.filter(k => k.weight > 7).length,
        weakWordsIdentified: analysis.weightedKeywords.filter(k => k.isWeak).length
      }
    };
  }

  /**
   * Generate refined version of prompt
   */
  generateRefinedPrompt(analysis, maxRefinements = 5) {
    let refined = analysis.originalPrompt;
    const topRefinements = analysis.recommendations.slice(0, maxRefinements);

    const changeLog = [];
    for (const ref of topRefinements) {
      const regex = new RegExp(`\\b${ref.originalKeyword}\\b`, 'gi');
      if (regex.test(refined)) {
        refined = refined.replace(regex, ref.suggestedWord);
        changeLog.push({
          from: ref.originalKeyword,
          to: ref.suggestedWord,
          impact: ref.estimatedImprovement,
          reason: ref.reason
        });
      }
    }

    return {
      original: analysis.originalPrompt,
      refined: refined,
      changes: changeLog,
      totalEstimatedImprovement: changeLog.reduce((sum, c) => sum + c.impact, 0),
      changeCount: changeLog.length,
      confidenceScore: (changeLog.length / maxRefinements) * 100
    };
  }

  /**
   * Group refinements by issue category
   */
  groupRefinementsByCategory(refinements) {
    const grouped = {
      'clarity_issues': [],
      'structure_issues': [],
      'specificity_issues': [],
      'efficiency_issues': []
    };

    refinements.forEach(ref => {
      const category = this.categorizeRefinement(ref);
      if (grouped[category]) {
        grouped[category].push(ref);
      }
    });

    return grouped;
  }

  /**
   * Categorize a single refinement
   */
  categorizeRefinement(refinement) {
    const keyword = refinement.originalKeyword.toLowerCase();
    const reason = refinement.reason.toLowerCase();

    // Clarity indicators
    if (reason.includes('ambiguous') || reason.includes('unclear') || 
        reason.includes('grammar') || reason.includes('awkward') ||
        this.weakWords.has(keyword)) {
      return 'clarity_issues';
    }

    // Specificity indicators
    if (reason.includes('measurable') || reason.includes('criteria') ||
        reason.includes('specific') || reason.includes('vague') ||
        reason.includes('metric')) {
      return 'specificity_issues';
    }

    // Efficiency indicators
    if (reason.includes('verbose') || reason.includes('concise') ||
        reason.includes('redundant') || reason.includes('reduce')) {
      return 'efficiency_issues';
    }

    // Structure indicators (default)
    return 'structure_issues';
  }

  /**
   * Analyze issues and generate explanations
   */
  analyzeIssues(groupedRefinements) {
    const analysis = {};

    Object.entries(groupedRefinements).forEach(([category, refinements]) => {
      if (refinements.length === 0) return;

      const rootCause = this.rootCauseMap[category];
      analysis[category] = {
        category: rootCause.name,
        description: rootCause.description,
        count: refinements.length,
        consequences: rootCause.consequences,
        issues: refinements.map(r => ({
          problem: r.originalKeyword,
          suggestion: r.suggestedWord,
          reason: r.reason,
          rootCause: this.explainRootCause(r),
          impact: r.impact,
          consequence: rootCause.consequences.immediate
        })),
        priority: this.calculateCategoryPriority(refinements),
        estimatedFixTime: this.estimateFixTime(refinements.length)
      };
    });

    return analysis;
  }

  /**
   * Explain root cause for a refinement
   */
  explainRootCause(refinement) {
    const explanations = {
      'More authoritative': 'Stronger verbs command attention and convey confidence',
      'More specific': 'Specific terms reduce ambiguity and guide AI precisely',
      'More technical': 'Technical language signals domain expertise and precision',
      'Measurable': 'Concrete metrics allow evaluation of success'
    };

    return explanations[refinement.reason] || refinement.reason;
  }

  /**
   * Calculate priority for a category
   */
  calculateCategoryPriority(refinements) {
    const avgImpact = refinements.reduce((sum, r) => sum + r.impact, 0) / refinements.length;
    if (avgImpact >= 8) return 'critical';
    if (avgImpact >= 6) return 'high';
    if (avgImpact >= 4) return 'medium';
    return 'low';
  }

  /**
   * Estimate time to fix issues
   */
  estimateFixTime(count) {
    if (count <= 2) return '2-3 minutes';
    if (count <= 5) return '5-10 minutes';
    if (count <= 10) return '10-15 minutes';
    return '20-30 minutes';
  }

  /**
   * Build refinement framework/checklist
   */
  buildRefinementFramework(groupedRefinements) {
    const framework = {
      title: 'Refinement Checklist for Next Iteration',
      instructions: 'Apply these checks before submitting your next prompt',
      sections: []
    };

    // Clarity section
    if (groupedRefinements.clarity_issues.length > 0) {
      framework.sections.push({
        name: 'Clarity Check',
        question: 'Is every term explicitly defined?',
        why: 'AI interprets vagueness differently each time, causing variation',
        howToFix: 'Add parenthetical definitions for technical terms; specify scope',
        example: 'Instead of "analyze this", say "analyze the performance impact of token optimization"',
        priority: 'high'
      });
    }

    // Specificity section
    if (groupedRefinements.specificity_issues.length > 0) {
      framework.sections.push({
        name: 'Specificity Check',
        question: 'Are success criteria measurable?',
        why: 'Without concrete success markers, AI cannot know when to stop refining',
        howToFix: 'Add "success means..." statement with concrete examples',
        example: 'Add: "Success means the output includes concrete metrics and implementation steps"',
        priority: 'critical'
      });
    }

    // Structure section
    if (groupedRefinements.structure_issues.length > 0) {
      framework.sections.push({
        name: 'Structure Check',
        question: 'Are instructions grouped logically?',
        why: 'Organized prompts execute faster with better accuracy',
        howToFix: 'Number instructions; group related constraints; separate concerns',
        example: 'Group all input requirements together, then output format, then constraints',
        priority: 'high'
      });
    }

    // Efficiency section
    if (groupedRefinements.efficiency_issues.length > 0) {
      framework.sections.push({
        name: 'Efficiency Check',
        question: 'Can this be 20% shorter without losing meaning?',
        why: 'Shorter prompts reduce latency and token cost while maintaining clarity',
        howToFix: 'Remove redundant explanations; keep only unique constraints',
        example: 'If you explain something twice, remove one explanation',
        priority: 'medium'
      });
    }

    // Add next action
    framework.nextAction = this.buildNextAction(groupedRefinements);

    return framework;
  }

  /**
   * Build next action suggestion
   */
  buildNextAction(groupedRefinements) {
    const categories = Object.entries(groupedRefinements)
      .filter(([_, items]) => items.length > 0)
      .map(([cat, _]) => this.rootCauseMap[cat].name);

    return {
      suggestion: `Start by addressing the ${categories[0] || 'primary'} issue`,
      alternatives: categories.slice(1),
      estimatedTime: '3-10 minutes',
      expectedOutcome: 'Significantly improved clarity and effectiveness',
      whatNext: 'After refining, re-run the scanner to validate improvements'
    };
  }

  /**
   * Build dialogue prompt for further iteration
   */
  buildDialoguePrompt(analysis) {
    const categories = Object.keys(analysis)
      .filter(cat => analysis[cat].count > 0)
      .map(cat => analysis[cat].category);

    return {
      question: `What aspect would you like to refine first?`,
      options: categories.length > 0 ? categories : ['Clarity', 'Structure', 'Specificity'],
      followUp: 'After making changes, paste the refined prompt here to see improvements',
      encouragement: 'Each refinement typically improves effectiveness by 10-15%',
      nextSteps: [
        'Select an issue category above',
        'Apply the recommended changes',
        'Re-run analysis to validate',
        'Repeat until satisfaction'
      ]
    };
  }

  /**
   * Get importance level string
   */
  getImportanceLevel(weight) {
    if (weight >= 8) return 'Critical';
    if (weight >= 6) return 'High';
    if (weight >= 4) return 'Medium';
    return 'Low';
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RefineryEngine };
}
// Make available as browser global
if (typeof window !== 'undefined') {
  window.RefineryEngine = RefineryEngine;
}
