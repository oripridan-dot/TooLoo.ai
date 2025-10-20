/**
 * Prompt Quality Analyzer
 * Scores prompts on 5 key dimensions
 */

class PromptAnalyzer {
  constructor() {
    this.dimensions = {
      clarity: { name: 'Clarity', weight: 1 },
      completeness: { name: 'Completeness', weight: 1 },
      format: { name: 'Format', weight: 1 },
      constraints: { name: 'Constraints', weight: 1 },
      examples: { name: 'Examples', weight: 1 }
    };
  }

  /**
   * Main analysis method
   */
  analyze(prompt) {
    if (!prompt || prompt.trim().length === 0) {
      return {
        overall: 0,
        breakdown: this.getEmptyBreakdown(),
        strengths: [],
        weaknesses: ['Prompt is empty']
      };
    }

    const breakdown = {
      clarity: this.scoreClarity(prompt),
      completeness: this.scoreCompleteness(prompt),
      format: this.scoreFormat(prompt),
      constraints: this.scoreConstraints(prompt),
      examples: this.scoreExamples(prompt)
    };

    const overall = Math.round(
      (breakdown.clarity.score +
        breakdown.completeness.score +
        breakdown.format.score +
        breakdown.constraints.score +
        breakdown.examples.score) / 5 * 10
    ) / 10;

    return {
      overall,
      breakdown,
      strengths: this.identifyStrengths(breakdown),
      weaknesses: this.identifyWeaknesses(breakdown)
    };
  }

  /**
   * Clarity Score (0-2): How clear is the intent?
   */
  scoreClarity(prompt) {
    let score = 0;
    const vagueWords = [
      'something',
      'thing',
      'stuff',
      'whatever',
      'do',
      'make',
      'help',
      'get',
      'put'
    ];

    const hasVague = vagueWords.some(w =>
      new RegExp(`\\b${w}\\b`, 'gi').test(prompt)
    );

    if (!hasVague) score += 1;
    if (prompt.length > 100) score += 0.5;
    if (this.hasSpecificVerbs(prompt)) score += 0.5;

    return {
      score: Math.min(2, score),
      details: `${hasVague ? 'Contains vague language' : 'Clear intent'}`
    };
  }

  /**
   * Completeness Score (0-2): Has all needed info?
   */
  scoreCompleteness(prompt) {
    let score = 0;

    // Check for who/what/how
    if (prompt.match(/(for|to|who|what|which)/gi)) score += 0.7;

    // Check length indicates detail
    if (prompt.length > 200) score += 0.7;

    // Check for output format hints
    if (prompt.match(/(output|return|provide|show|include)/gi)) score += 0.6;

    return {
      score: Math.min(2, score),
      details: `${score >= 1.5 ? 'Well-specified' : score >= 0.5 ? 'Partially specified' : 'Vague'}`
    };
  }

  /**
   * Format Score (0-2): Is format specified?
   */
  scoreFormat(prompt) {
    let score = 0;

    const formatKeywords = [
      'format',
      'structure',
      'outline',
      'steps',
      'sections',
      'list',
      'table',
      'json',
      'markdown',
      'code',
      'template'
    ];

    if (
      formatKeywords.some(w => new RegExp(`\\b${w}\\b`, 'gi').test(prompt))
    ) {
      score += 1;
    }

    if (prompt.match(/\d+\s*(words?|sentences?|paragraphs?|lines?|points?)/gi)) {
      score += 1;
    }

    return {
      score: Math.min(2, score),
      details: `${score >= 1.5 ? 'Format specified' : score >= 0.5 ? 'Partially specified' : 'Not specified'}`
    };
  }

  /**
   * Constraints Score (0-2): Are limitations defined?
   */
  scoreConstraints(prompt) {
    let score = 0;

    const hasConstraintKeywords = prompt.match(
      /(avoid|exclude|don't|do not|not|skip|ignore|without|except)/gi
    );
    if (hasConstraintKeywords && hasConstraintKeywords.length >= 1) {
      score += 1;
    }

    const hasTimeConstraints = prompt.match(
      /(quick|fast|simple|easy|under|maximum|minimum|limit)/gi
    );
    if (hasTimeConstraints && hasTimeConstraints.length >= 1) {
      score += 1;
    }

    return {
      score: Math.min(2, score),
      details: `${score >= 1.5 ? 'Constraints clear' : score >= 0.5 ? 'Some constraints' : 'No constraints'}`
    };
  }

  /**
   * Examples Score (0-2): Are examples provided?
   */
  scoreExamples(prompt) {
    let score = 0;

    if (
      prompt.match(
        /(example|e\.g\.|for example|for instance|like|such as|sample)/gi
      )
    ) {
      score += 1;
    }

    // Check for code blocks or quoted content
    if (
      prompt.match(
        /(`{3}|```|"""|'''|\[.*?\]|\{.*?\}|"[^"]+"|'[^']+')/g
      )
    ) {
      score += 1;
    }

    return {
      score: Math.min(2, score),
      details: `${score >= 1.5 ? 'Examples provided' : score >= 0.5 ? 'Some examples' : 'No examples'}`
    };
  }

  /**
   * Helper: Identify specific verbs (not vague)
   */
  hasSpecificVerbs(prompt) {
    const specificVerbs = [
      'create',
      'develop',
      'analyze',
      'evaluate',
      'generate',
      'implement',
      'design',
      'build',
      'write',
      'explain',
      'describe',
      'compare',
      'summarize',
      'extract'
    ];

    return specificVerbs.some(v =>
      new RegExp(`\\b${v}`, 'gi').test(prompt)
    );
  }

  /**
   * Identify strengths
   */
  identifyStrengths(breakdown) {
    const strengths = [];

    if (breakdown.clarity.score >= 1.5) {
      strengths.push('Clear intent');
    }
    if (breakdown.completeness.score >= 1.5) {
      strengths.push('Well-specified');
    }
    if (breakdown.format.score >= 1.5) {
      strengths.push('Format defined');
    }
    if (breakdown.constraints.score >= 1.5) {
      strengths.push('Constraints explicit');
    }
    if (breakdown.examples.score >= 1.5) {
      strengths.push('Examples included');
    }

    return strengths.length > 0 ? strengths : ['Attempt to improve clarity'];
  }

  /**
   * Identify weaknesses
   */
  identifyWeaknesses(breakdown) {
    const weaknesses = [];

    if (breakdown.clarity.score < 1) {
      weaknesses.push('Vague language detected');
    }
    if (breakdown.completeness.score < 1) {
      weaknesses.push('Missing key details');
    }
    if (breakdown.format.score < 1) {
      weaknesses.push('Output format not specified');
    }
    if (breakdown.constraints.score < 1) {
      weaknesses.push('No constraints defined');
    }
    if (breakdown.examples.score < 1) {
      weaknesses.push('No examples provided');
    }

    return weaknesses.length > 0 ? weaknesses : [];
  }

  /**
   * Get empty breakdown
   */
  getEmptyBreakdown() {
    return {
      clarity: { score: 0, details: 'N/A' },
      completeness: { score: 0, details: 'N/A' },
      format: { score: 0, details: 'N/A' },
      constraints: { score: 0, details: 'N/A' },
      examples: { score: 0, details: 'N/A' }
    };
  }
}

// Export for both ES6 modules and browser global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PromptAnalyzer };
} else if (typeof window !== 'undefined') {
  window.PromptAnalyzer = PromptAnalyzer;
}
