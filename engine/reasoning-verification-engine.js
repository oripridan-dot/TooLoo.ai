/**
 * Reasoning Verification Engine
 * Validates logical consistency, checks premises, and ensures sound reasoning
 * Detects circular dependencies, logical fallacies, and inconsistencies
 */

export default class ReasoningVerificationEngine {
  constructor() {
    this.logicalFallacies = [
      'ad_hominem', 'straw_man', 'circular_reasoning', 'appeal_to_authority',
      'false_dilemma', 'hasty_generalization', 'post_hoc', 'slippery_slope'
    ];

    this.premiseTypes = [
      'factual', 'definitional', 'normative', 'conditional', 'empirical'
    ];
  }

  /**
   * Comprehensive reasoning verification
   */
  verifyReasoning(reasoning, premises = []) {
    if (!reasoning || typeof reasoning !== 'string') {
      return {
        success: false,
        error: 'Invalid reasoning input'
      };
    }

    const analysis = {
      originalReasoning: reasoning,
      premises,
      logicalChain: this.extractLogicalChain(reasoning),
      premiseValidation: this.validatePremises(premises),
      fallacyDetection: this.detectFallacies(reasoning),
      circularDependencies: this.checkCircularDependencies(reasoning, premises),
      consistency: this.checkConsistency(reasoning, premises),
      strength: this.assessReasoningStrength(reasoning, premises),
      suggestions: []
    };

    // Generate suggestions based on analysis
    analysis.suggestions = this.generateSuggestions(analysis);

    return {
      success: true,
      ...analysis
    };
  }

  /**
   * Extract logical chain from reasoning
   */
  extractLogicalChain(reasoning) {
    const steps = [];
    
    // Look for logical connectors
    const connectors = ['therefore', 'because', 'since', 'if', 'then', 'thus', 'hence', 'so'];
    const sentences = reasoning.split(/[.!?]+/).filter(s => s.trim());

    for (const sentence of sentences) {
      const connectorFound = connectors.find(c => sentence.toLowerCase().includes(c));
      
      steps.push({
        statement: sentence.trim(),
        connector: connectorFound || 'premise',
        type: this.classifyStatement(sentence),
        logicalValue: this.assessLogicalValue(sentence)
      });
    }

    return steps;
  }

  /**
   * Classify statement type
   */
  classifyStatement(statement) {
    const lower = statement.toLowerCase();

    if (/^if\s|^assuming\s|^suppose\s/.test(lower)) return 'conditional';
    if (/\bthen\b|\bimplies\b|\bthus\b|\btherefore\b|\bso\b/.test(lower)) return 'conclusion';
    if (/\bbecause\b|\bsince\b|\bas\s/.test(lower)) return 'justification';
    if (/^\w+\s(is|are|was|were)/.test(lower)) return 'definition';
    if (/\bshould\b|\bmust\b|\bought\b/.test(lower)) return 'normative';
    
    return 'factual';
  }

  /**
   * Assess logical value of statement
   */
  assessLogicalValue(statement) {
    const affirmative = statement.includes('is') || statement.includes('are');
    const negative = statement.includes('not') || statement.includes('no');

    return {
      affirmative,
      negative,
      modal: this.extractModality(statement),
      confidence: this.estimateConfidence(statement)
    };
  }

  /**
   * Extract modality (possibility, necessity, etc.)
   */
  extractModality(statement) {
    const lower = statement.toLowerCase();

    if (/\bmust\b|\brequires\b|\bnecessary\b/.test(lower)) return 'necessity';
    if (/\bcan\b|\bmay\b|\bpossible\b|\bcould\b/.test(lower)) return 'possibility';
    if (/\bshould\b|\bought\b|\brecommend\b/.test(lower)) return 'obligation';
    if (/\bis\b|\bare\b/.test(lower)) return 'assertion';

    return 'uncertain';
  }

  /**
   * Estimate statement confidence
   */
  estimateConfidence(statement) {
    const lower = statement.toLowerCase();
    const hedges = ['may', 'might', 'could', 'perhaps', 'seems', 'appears', 'somewhat', 'relatively'];
    const hedgeCount = hedges.filter(h => lower.includes(h)).length;

    // More hedges = lower confidence
    return Math.max(0.5, 1 - (hedgeCount * 0.1));
  }

  /**
   * Validate premises
   */
  validatePremises(premises) {
    if (!Array.isArray(premises) || premises.length === 0) {
      return {
        valid: true,
        count: 0,
        premises: []
      };
    }

    const validatedPremises = premises.map((premise, idx) => {
      return {
        index: idx,
        premise,
        type: this.classifyPremise(premise),
        plausibility: this.assessPlausibility(premise),
        supportingEvidence: this.evaluateEvidenceSupport(premise),
        isCircular: this.checkPremiseCircularity(premise),
        status: 'valid' // Will be updated if issues found
      };
    });

    // Check for circular references
    const circularPremises = validatedPremises.filter(p => p.isCircular);

    return {
      valid: circularPremises.length === 0,
      count: premises.length,
      premises: validatedPremises,
      circularPremisesFound: circularPremises
    };
  }

  /**
   * Classify premise type
   */
  classifyPremise(premise) {
    const lower = premise.toLowerCase();

    if (/\d+%|\d+ (of|out of)|\bdata\b|\bstudies\b|\bevidence\b/.test(lower)) return 'empirical';
    if (/\sis\s(defined|a|an)/.test(lower)) return 'definitional';
    if (/\bshould\b|\boug ht\b|\bmust\b|\bwrong\b|\bright\b/.test(lower)) return 'normative';
    if (/\bif\b|\bthen\b|\bimplies\b/.test(lower)) return 'conditional';

    return 'factual';
  }

  /**
   * Assess plausibility of premise
   */
  assessPlausibility(premise) {
    const lower = premise.toLowerCase();

    // Common knowledge = high plausibility
    if (/water|gravity|earth|sun|humans/.test(lower)) return 0.95;

    // Specific claims = medium plausibility
    if (/\d+%|\bdata\b|\bstudies?\b/.test(lower)) return 0.75;

    // Opinions = lower plausibility
    if (/believe|think|assume|suppose/.test(lower)) return 0.6;

    return 0.7; // Default
  }

  /**
   * Evaluate evidence support for premise
   */
  evaluateEvidenceSupport(premise) {
    const lower = premise.toLowerCase();

    const evidenceMarkers = {
      strong: ['studies show', 'data indicates', 'research proves', 'evidence shows', 'documented'],
      moderate: ['suggests', 'indicates', 'appears', 'seems', 'typical'],
      weak: ['might', 'could', 'possibly', 'perhaps', 'arguably']
    };

    for (const [level, markers] of Object.entries(evidenceMarkers)) {
      if (markers.some(m => lower.includes(m))) {
        return level;
      }
    }

    return 'unknown';
  }

  /**
   * Check if premise is circular
   */
  checkPremiseCircularity(premise) {
    // Simple check: does the premise mention itself or require itself to be proven?
    // This is a basic implementation - more complex cases need deeper analysis
    return /\b(because\s+[^.]*\b\w+ \1|by virtue of being [^.]*\1)/i.test(premise);
  }

  /**
   * Detect logical fallacies
   */
  detectFallacies(reasoning) {
    const detected = [];
    const lower = reasoning.toLowerCase();

    // Ad Hominem
    if (/\b(is wrong because|is stupid|is biased)\b/.test(lower)) {
      detected.push({
        fallacy: 'ad_hominem',
        severity: 'high',
        message: 'Argument attacks person rather than idea'
      });
    }

    // Straw Man
    if (/\b(they say|the other side argues)\s+[^.]*\b(obviously|clearly|ridiculous)\b/.test(lower)) {
      detected.push({
        fallacy: 'straw_man',
        severity: 'high',
        message: 'Argument misrepresents opposing view'
      });
    }

    // Circular Reasoning
    if (/\b(\w+) is true because \w+ is true\b/.test(lower) || 
        /\b(\w+) is true because \1 is true\b/.test(lower)) {
      detected.push({
        fallacy: 'circular_reasoning',
        severity: 'critical',
        message: 'Reasoning is circular'
      });
    }

    // Appeal to Authority
    if (/\b(experts say|studies show|research proves)\b/.test(lower) && !this.hasEvidenceSupport(reasoning)) {
      detected.push({
        fallacy: 'appeal_to_authority',
        severity: 'medium',
        message: 'Appeals to authority without specific evidence'
      });
    }

    // False Dilemma
    if (/\b(either|or|must choose between)\b.*\b(or)\b/.test(lower)) {
      detected.push({
        fallacy: 'false_dilemma',
        severity: 'medium',
        message: 'Presents false choice between limited options'
      });
    }

    // Hasty Generalization
    if (/\b(all|always|never|everyone|nobody)\b/.test(lower) && reasoning.length < 100) {
      detected.push({
        fallacy: 'hasty_generalization',
        severity: 'medium',
        message: 'Generalizes without sufficient evidence'
      });
    }

    return detected;
  }

  /**
   * Check for circular dependencies
   */
  checkCircularDependencies(reasoning, premises) {
    const dependencies = {};
    const circularDeps = [];

    // Build dependency graph
    for (const [idx, premise] of premises.entries()) {
      dependencies[idx] = this.extractDependencies(premise, premises);
    }

    // Check for cycles
    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (nodeIdx) => {
      visited.add(nodeIdx);
      recursionStack.add(nodeIdx);

      for (const dependent of dependencies[nodeIdx] || []) {
        if (!visited.has(dependent)) {
          if (hasCycle(dependent)) return true;
        } else if (recursionStack.has(dependent)) {
          return true;
        }
      }

      recursionStack.delete(nodeIdx);
      return false;
    };

    for (let i = 0; i < premises.length; i++) {
      if (!visited.has(i)) {
        if (hasCycle(i)) {
          circularDeps.push(`Circular dependency detected involving premise ${i}`);
        }
      }
    }

    return {
      hasCycles: circularDeps.length > 0,
      cycles: circularDeps,
      dependencyMap: dependencies
    };
  }

  /**
   * Extract dependencies from premise
   */
  extractDependencies(premise, allPremises) {
    const dependencies = [];

    for (let i = 0; i < allPremises.length; i++) {
      if (allPremises[i] !== premise) {
        // Simple check: if premise mentions key concepts from another premise
        const keywords = this.extractKeywords(premise);
        if (keywords.some(kw => allPremises[i].toLowerCase().includes(kw))) {
          dependencies.push(i);
        }
      }
    }

    return dependencies;
  }

  /**
   * Extract key concepts from text
   */
  extractKeywords(text) {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4 && !this.isCommonWord(w))
      .slice(0, 5);
  }

  /**
   * Check if word is common
   */
  isCommonWord(word) {
    const common = ['the', 'that', 'this', 'which', 'where', 'when', 'what', 'because', 'since'];
    return common.includes(word);
  }

  /**
   * Check consistency of reasoning
   */
  checkConsistency(reasoning, premises) {
    const statements = reasoning.split(/[.!?]+/).filter(s => s.trim());
    const contradictions = [];

    for (let i = 0; i < statements.length - 1; i++) {
      for (let j = i + 1; j < statements.length; j++) {
        if (this.isContradictory(statements[i], statements[j])) {
          contradictions.push({
            statement1: statements[i].trim(),
            statement2: statements[j].trim(),
            severity: 'high'
          });
        }
      }
    }

    return {
      consistent: contradictions.length === 0,
      contradictions,
      consistencyScore: Math.max(0, 1 - (contradictions.length * 0.2))
    };
  }

  /**
   * Check if two statements contradict
   */
  isContradictory(stmt1, stmt2) {
    const lower1 = stmt1.toLowerCase();
    const lower2 = stmt2.toLowerCase();

    // Simple contradiction detection
    if (/\bis\s+not\b/.test(lower1) && /\bis\b/.test(lower2)) {
      const subj1 = lower1.split(/\bis/)[0];
      const subj2 = lower2.split(/\bis/)[0];
      if (subj1 === subj2) return true;
    }

    return false;
  }

  /**
   * Assess overall reasoning strength
   */
  assessReasoningStrength(reasoning, premises) {
    const chain = this.extractLogicalChain(reasoning);
    const validation = this.validatePremises(premises);
    const fallacies = this.detectFallacies(reasoning);
    const consistency = this.checkConsistency(reasoning, premises);

    let strengthScore = 1.0;

    // Deduct for logical fallacies
    strengthScore -= fallacies.length * 0.15;

    // Deduct for consistency issues
    strengthScore -= (1 - consistency.consistencyScore) * 0.1;

    // Deduct for weak premises
    const weakPremises = validation.premises.filter(p => p.plausibility < 0.6).length;
    strengthScore -= weakPremises * 0.1;

    // Bonus for clear logical chain
    strengthScore += Math.min(0.2, chain.length * 0.05);

    return {
      score: Math.max(0, Math.min(1, strengthScore)),
      chainLength: chain.length,
      fallacyCount: fallacies.length,
      inconsistencies: consistency.contradictions.length,
      weakPremises: weakPremises,
      assessment: this.categorizeStrength(Math.max(0, Math.min(1, strengthScore)))
    };
  }

  /**
   * Categorize reasoning strength
   */
  categorizeStrength(score) {
    if (score >= 0.8) return 'strong';
    if (score >= 0.6) return 'moderate';
    if (score >= 0.4) return 'weak';
    return 'very_weak';
  }

  /**
   * Check if reasoning has evidence support
   */
  hasEvidenceSupport(reasoning) {
    return /\b(data|studies?|research|evidence|statistics)\b/.test(reasoning.toLowerCase());
  }

  /**
   * Generate improvement suggestions
   */
  generateSuggestions(analysis) {
    const suggestions = [];

    // Fallacy suggestions
    if (analysis.fallacyDetection.length > 0) {
      suggestions.push({
        category: 'logical_fallacy',
        priority: 'high',
        message: `Remove or address ${analysis.fallacyDetection.length} logical fallacies`,
        details: analysis.fallacyDetection.map(f => f.message)
      });
    }

    // Consistency suggestions
    if (!analysis.consistency.consistent) {
      suggestions.push({
        category: 'consistency',
        priority: 'high',
        message: 'Resolve contradictions in reasoning',
        count: analysis.consistency.contradictions.length
      });
    }

    // Circular dependency suggestions
    if (analysis.circularDependencies.hasCycles) {
      suggestions.push({
        category: 'circular_reasoning',
        priority: 'critical',
        message: 'Remove circular dependencies',
        cycles: analysis.circularDependencies.cycles
      });
    }

    // Premise strength suggestions
    const weakPremises = analysis.premiseValidation.premises.filter(p => p.plausibility < 0.6);
    if (weakPremises.length > 0) {
      suggestions.push({
        category: 'premise_strength',
        priority: 'medium',
        message: `Strengthen ${weakPremises.length} weak premises with evidence`
      });
    }

    return suggestions;
  }
}
