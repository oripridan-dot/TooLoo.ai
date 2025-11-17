/**
 * Creative Generation Engine
 * Leverages Autonomous Evolution Engine to generate creative, novel content variations
 * Provides ideation, brainstorming, and creative exploration capabilities
 */

export default class CreativeGenerationEngine {
  constructor() {
    this.evolutionCycles = [];
    this.ideaCache = new Map();
    this.noveltyScores = new Map();
    this.creativePatterns = [
      'combination', 'transformation', 'reversal', 'substitution', 
      'expansion', 'reduction', 'analogy', 'randomization'
    ];
  }

  /**
   * Generate creative variations of a prompt/concept
   */
  generateCreativeVariations(prompt, options = {}) {
    const {
      count = 3,
      style = 'balanced',
      diversity = 0.7,
      domain = 'general',
      techniques = this.creativePatterns
    } = options;

    const variations = [];

    // Generate variations using different creative techniques
    for (let i = 0; i < count; i++) {
      const technique = techniques[i % techniques.length];
      const variation = this.applyCreativeTechnique(prompt, technique, style);

      variations.push({
        id: `var-${Date.now()}-${i}`,
        original: prompt,
        variation: variation.content,
        technique: technique,
        style: style,
        domain: domain,
        noveltyScore: this.calculateNoveltyScore(prompt, variation.content),
        diversity: diversity,
        evolutionPath: variation.path,
        metadata: {
          generatedAt: new Date().toISOString(),
          version: i + 1,
          confidence: 0.85 + (Math.random() * 0.1)
        }
      });
    }

    // Sort by novelty score
    variations.sort((a, b) => b.noveltyScore - a.noveltyScore);

    return {
      prompt,
      variations,
      summary: {
        totalGenerated: variations.length,
        avgNoveltyScore: variations.reduce((sum, v) => sum + v.noveltyScore, 0) / variations.length,
        dominantTechnique: this.findDominantTechnique(variations),
        diversityLevel: this.calculateDiversityMetric(variations)
      }
    };
  }

  /**
   * Apply creative technique to concept
   */
  applyCreativeTechnique(prompt, technique, style) {
    const base = prompt.toLowerCase().split(' ');

    let content, path = [];

    switch (technique) {
    case 'combination':
      content = this.combineIdeas(prompt);
      path = ['identify_concepts', 'find_connections', 'synthesize'];
      break;

    case 'transformation':
      content = this.transformConcept(prompt, style);
      path = ['analyze_structure', 'modify_properties', 'reconceptualize'];
      break;

    case 'reversal':
      content = this.reverseAssumptions(prompt);
      path = ['identify_assumptions', 'negate_assumptions', 'explore_inverse'];
      break;

    case 'substitution':
      content = this.substituteElements(prompt);
      path = ['decompose', 'identify_parts', 'substitute_alternatives'];
      break;

    case 'expansion':
      content = this.expandScope(prompt);
      path = ['identify_boundaries', 'extend_scope', 'explore_implications'];
      break;

    case 'reduction':
      content = this.reduceToEssence(prompt);
      path = ['identify_core', 'remove_nonessentials', 'simplify'];
      break;

    case 'analogy':
      content = this.findAnalogy(prompt);
      path = ['identify_properties', 'find_similar_domain', 'map_analogy'];
      break;

    case 'randomization':
      content = this.randomizeElements(prompt);
      path = ['identify_elements', 'randomly_recombine', 'validate_coherence'];
      break;

    default:
      content = prompt;
      path = [];
    }

    return { content, path };
  }

  /**
   * Combination technique - merge different concepts
   */
  combineIdeas(prompt) {
    const concepts = prompt.split(' ').filter(w => w.length > 3);
    if (concepts.length < 2) return prompt;

    const combined = [
      concepts[0],
      '+',
      concepts[1],
      '→ hybrid approach combining both elements'
    ].join(' ');

    return combined;
  }

  /**
   * Transformation technique - change properties
   */
  transformConcept(prompt, style) {
    const styleMap = {
      dramatic: word => `dramatically transformed ${word}`,
      subtle: word => `gently evolved ${word}`,
      radical: word => `revolutionized ${word}`,
      balanced: word => `thoughtfully reimagined ${word}`,
      poetic: word => `artistically reinterpreted ${word}`,
      technical: word => `systematically optimized ${word}`
    };

    const transformer = styleMap[style] || styleMap.balanced;
    return transformer(prompt);
  }

  /**
   * Reversal technique - flip assumptions
   */
  reverseAssumptions(prompt) {
    const words = prompt.split(' ');
    const reversed = words.reverse().join(' ');
    return `Alternative perspective: what if the inverse were true? ${reversed} challenges conventional thinking`;
  }

  /**
   * Substitution technique - replace elements
   */
  substituteElements(prompt) {
    const substitutions = {
      user: 'system',
      problem: 'opportunity',
      simple: 'complex',
      static: 'dynamic',
      fixed: 'adaptive'
    };

    let result = prompt;
    for (const [old, replacement] of Object.entries(substitutions)) {
      result = result.replace(new RegExp(old, 'gi'), replacement);
    }

    return `Modified approach: ${result}`;
  }

  /**
   * Expansion technique - broaden scope
   */
  expandScope(prompt) {
    return `Expanded vision: ${prompt} extended across multiple domains, scales, and time horizons`;
  }

  /**
   * Reduction technique - focus on essence
   */
  reduceToEssence(prompt) {
    const words = prompt.split(' ');
    const essence = words.slice(0, Math.ceil(words.length / 2)).join(' ');
    return `Distilled essence: ${essence}`;
  }

  /**
   * Analogy technique - find similar patterns
   */
  findAnalogy(prompt) {
    const analogies = {
      learning: 'like water flowing through channels',
      growth: 'like seeds becoming trees',
      communication: 'like a bridge connecting two shores',
      problem: 'like a puzzle waiting for the right pieces'
    };

    for (const [key, analogy] of Object.entries(analogies)) {
      if (prompt.toLowerCase().includes(key)) {
        return `Analogical thinking: ${prompt} ${analogy}`;
      }
    }

    return `${prompt} - explored through novel analogies and metaphors`;
  }

  /**
   * Randomization technique - creative recombination
   */
  randomizeElements(prompt) {
    const words = prompt.split(' ');
    const shuffled = words.sort(() => Math.random() - 0.5).join(' ');
    return `Random exploration: unexpected juxtaposition of elements reveals: ${shuffled}`;
  }

  /**
   * Calculate novelty score (0-1)
   */
  calculateNoveltyScore(original, variation) {
    if (original === variation) return 0.1;

    const origWords = new Set(original.toLowerCase().split(/\s+/));
    const varWords = new Set(variation.toLowerCase().split(/\s+/));

    const overlap = [...origWords].filter(w => varWords.has(w)).length;
    const total = Math.max(origWords.size, varWords.size);

    // Novelty is inverse of similarity
    const similarity = overlap / (total || 1);
    const novelty = 1 - similarity;

    return Math.min(1, Math.max(0.1, novelty));
  }

  /**
   * Calculate diversity metric across variations
   */
  calculateDiversityMetric(variations) {
    if (variations.length < 2) return 0.5;

    let totalDiversity = 0;
    for (let i = 0; i < variations.length - 1; i++) {
      for (let j = i + 1; j < variations.length; j++) {
        const words1 = new Set(variations[i].variation.toLowerCase().split(/\s+/));
        const words2 = new Set(variations[j].variation.toLowerCase().split(/\s+/));

        const overlap = [...words1].filter(w => words2.has(w)).length;
        const diversity = 1 - (overlap / Math.max(words1.size, words2.size));

        totalDiversity += diversity;
      }
    }

    const pairCount = (variations.length * (variations.length - 1)) / 2;
    return totalDiversity / (pairCount || 1);
  }

  /**
   * Find dominant creative technique in results
   */
  findDominantTechnique(variations) {
    const techniques = {};
    variations.forEach(v => {
      techniques[v.technique] = (techniques[v.technique] || 0) + 1;
    });

    return Object.entries(techniques).sort(([, a], [, b]) => b - a)[0]?.[0] || 'mixed';
  }

  /**
   * Iterative ideation - evolve ideas through cycles
   */
  iterativeIdeation(prompt, cycles = 3) {
    let currentIdea = prompt;
    const evolution = [];

    for (let i = 0; i < cycles; i++) {
      const variations = this.generateCreativeVariations(currentIdea, {
        count: 2,
        diversity: 0.8 - (i * 0.15)
      });

      const bestVariation = variations.variations[0];

      evolution.push({
        cycle: i + 1,
        idea: bestVariation.variation,
        noveltyScore: bestVariation.noveltyScore,
        technique: bestVariation.technique
      });

      currentIdea = bestVariation.variation;
    }

    return {
      originalPrompt: prompt,
      evolutionCycles: cycles,
      evolution,
      finalIdea: currentIdea,
      totalNoveltyGain: evolution.reduce((sum, e) => sum + e.noveltyScore, 0) / cycles
    };
  }

  /**
   * Brainstorm variants by domain
   */
  brainstormByDomain(prompt, domains = ['technical', 'creative', 'practical', 'theoretical']) {
    const results = {};

    for (const domain of domains) {
      results[domain] = this.generateCreativeVariations(prompt, {
        count: 2,
        domain,
        style: this.styleForDomain(domain)
      });
    }

    return {
      prompt,
      domains: results,
      totalVariations: domains.length * 2,
      recommendations: this.selectBestVariants(results)
    };
  }

  /**
   * Match style to domain
   */
  styleForDomain(domain) {
    const styleMap = {
      technical: 'technical',
      creative: 'poetic',
      practical: 'balanced',
      theoretical: 'systematic'
    };
    return styleMap[domain] || 'balanced';
  }

  /**
   * Select best variants across domains
   */
  selectBestVariants(domainResults) {
    const recommendations = [];

    for (const [domain, result] of Object.entries(domainResults)) {
      const best = result.variations[0];
      recommendations.push({
        domain,
        idea: best.variation,
        novelty: best.noveltyScore,
        rationale: `Best ${domain} approach with novelty score ${best.noveltyScore.toFixed(2)}`
      });
    }

    return recommendations;
  }
}
