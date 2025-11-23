// @version 2.1.11
/**
 * Integration Example: AI Chat Scanner with Dynamic Refinery
 * Shows how to use the refinery engine within the scanner
 */

class ScannerWithRefinery {
  constructor() {
    this.promptAnalyzer = null;
    this.refineryEngine = null;
    this.refineryUI = null;
    this.currentAnalysis = null;
  }

  /**
   * Initialize all components
   */
  async initialize(promptAnalyzerClass, RefineryEngineClass, RefineryUIClass) {
    this.promptAnalyzer = new promptAnalyzerClass();
    this.refineryEngine = new RefineryEngineClass();
    this.refineryUI = new RefineryUIClass('refineryContainer');
    this.refineryUI.init(this.refineryEngine);
  }

  /**
   * Main workflow: Analyze prompt → Show refineries → Apply improvements
   */
  async analyzePromptWithRefinery(prompt) {
    console.log('🔍 Starting prompt analysis with refinery...');

    // Step 1: Analyze prompt quality
    const qualityAnalysis = this.promptAnalyzer.analyze(prompt);
    console.log('✅ Quality Analysis Complete', qualityAnalysis);

    // Step 2: Run refinery analysis to detect keywords and suggest refinements
    const refineryAnalysis = this.refineryEngine.analyze(prompt);
    console.log('✅ Refinery Analysis Complete', refineryAnalysis);

    // Step 3: Combine analyses for comprehensive report
    const combinedReport = this.combineAnalyses(qualityAnalysis, refineryAnalysis);
    console.log('✅ Combined Report Ready', combinedReport);

    // Step 4: Display refinery UI
    this.refineryUI.displayAnalysis(refineryAnalysis);

    // Step 5: Return comprehensive data
    return {
      originalPrompt: prompt,
      qualityAnalysis,
      refineryAnalysis,
      combinedReport,
      actions: {
        applyRefinements: (selectedKeywords) => this.applyRefinements(prompt, refineryAnalysis, selectedKeywords),
        generateImproved: () => this.generateImprovedPrompt(prompt, refineryAnalysis),
        exportReport: () => this.exportCombinedReport(prompt, qualityAnalysis, refineryAnalysis)
      }
    };
  }

  /**
   * Combine quality analysis with refinery analysis
   */
  combineAnalyses(qualityAnalysis, refineryAnalysis) {
    return {
      overallScore: this.calculateCombinedScore(qualityAnalysis, refineryAnalysis),
      clarity: {
        qualityScore: qualityAnalysis.breakdown?.clarity?.score || 0,
        refineryFocus: refineryAnalysis.focusArea || 'general'
      },
      keyStrengths: [
        ...qualityAnalysis.strengths?.map(s => `Quality: ${s}`) || [],
        ...this.identifyStrengths(refineryAnalysis) || []
      ],
      improvements: [
        ...qualityAnalysis.weaknesses?.map(w => `Quality: ${w}`) || [],
        ...this.identifyImprovements(refineryAnalysis) || []
      ],
      estimatedImpact: this.calculateCombinedImpact(qualityAnalysis, refineryAnalysis)
    };
  }

  /**
   * Calculate combined score from both analyses
   */
  calculateCombinedScore(qualityAnalysis, refineryAnalysis) {
    const qualityScore = (qualityAnalysis.overall || 5) / 10;
    const refineryScore = (refineryAnalysis.impactScore || 5) / 10;
    const combined = (qualityScore * 0.5 + refineryScore * 0.5) * 10;
    return Math.round(combined * 10) / 10;
  }

  /**
   * Identify strengths from refinery analysis
   */
  identifyStrengths(refineryAnalysis) {
    const strengths = [];

    // Strong keyword variety
    if (refineryAnalysis.weightedKeywords.length > 10) {
      strengths.push('Rich vocabulary and diverse keyword use');
    }

    // Good keyword distribution
    const topKeywordWeight = refineryAnalysis.weightedKeywords[0]?.weight || 0;
    if (topKeywordWeight < 6) {
      strengths.push('Well-distributed keyword emphasis');
    }

    // Context clarity
    if (refineryAnalysis.contextType !== 'general') {
      strengths.push(`Clear ${refineryAnalysis.contextType} context`);
    }

    // Few refinement opportunities
    if (refineryAnalysis.refinements.length < 5) {
      strengths.push('Already well-refined language');
    }

    return strengths;
  }

  /**
   * Identify improvements from refinery analysis
   */
  identifyImprovements(refineryAnalysis) {
    const improvements = [];

    // High-impact refinements available
    const highImpact = refineryAnalysis.refinements.filter(r => r.impact > 0.4);
    if (highImpact.length > 0) {
      improvements.push(`${highImpact.length} high-impact refinements available`);
    }

    // Weak keyword dominance
    const topKeyword = refineryAnalysis.weightedKeywords[0];
    if (topKeyword?.isWeak) {
      improvements.push(`Top keyword "${topKeyword.text}" is weak - consider stronger alternatives`);
    }

    // Vague language present
    const vagueRefinements = refineryAnalysis.refinements.filter(r => r.reason.includes('vague'));
    if (vagueRefinements.length > 0) {
      improvements.push(`Remove ${vagueRefinements.length} vague term(s) for clarity`);
    }

    // Generic context
    if (refineryAnalysis.contextType === 'general') {
      improvements.push('Consider adding more specific context');
    }

    return improvements;
  }

  /**
   * Calculate combined impact when refinements are applied
   */
  calculateCombinedImpact(qualityAnalysis, refineryAnalysis) {
    const qualityGain = 0.3; // 30% potential improvement from quality refinements
    const refineryGain = refineryAnalysis.impactScore * 0.5; // Up to 50% from keyword refinements
    const totalGain = qualityGain + refineryGain;

    const beforeScore = (qualityAnalysis.overall || 5) / 10;
    const afterScore = Math.min(1, beforeScore + totalGain);

    return {
      before: Math.round(beforeScore * 100),
      after: Math.round(afterScore * 100),
      improvement: Math.round((afterScore - beforeScore) / beforeScore * 100),
      potentialGain: Math.round(totalGain * 100)
    };
  }

  /**
   * Apply selected refinements to generate improved prompt
   */
  applyRefinements(originalPrompt, refineryAnalysis, selectedKeywords = []) {
    let improved = originalPrompt;

    // Apply refinements for selected keywords
    if (selectedKeywords.length > 0) {
      refineryAnalysis.refinements.forEach(ref => {
        if (selectedKeywords.includes(ref.originalKeyword)) {
          const regex = new RegExp(`\\b${ref.originalKeyword}\\b`, 'gi');
          improved = improved.replace(regex, ref.suggestedWord);
        }
      });
    } else {
      // Apply all high-impact refinements by default
      refineryAnalysis.refinements
        .filter(r => r.impact > 0.4)
        .forEach(ref => {
          const regex = new RegExp(`\\b${ref.originalKeyword}\\b`, 'gi');
          improved = improved.replace(regex, ref.suggestedWord);
        });
    }

    return {
      original: originalPrompt,
      improved,
      appliedRefinements: refineryAnalysis.refinements.filter(r => {
        return selectedKeywords.includes(r.originalKeyword) || 
               (selectedKeywords.length === 0 && r.impact > 0.4);
      })
    };
  }

  /**
   * Generate fully improved prompt with context
   */
  generateImprovedPrompt(originalPrompt, refineryAnalysis) {
    const applied = this.applyRefinements(originalPrompt, refineryAnalysis);
    
    // Add context suggestion if needed
    let final = applied.improved;
    if (refineryAnalysis.contextType === 'general') {
      final = `[Context: Consider adding context about who this is for and what outcome you need]\n\n${final}`;
    }

    return final;
  }

  /**
   * Export comprehensive report combining both analyses
   */
  exportCombinedReport(originalPrompt, qualityAnalysis, refineryAnalysis) {
    const improved = this.generateImprovedPrompt(originalPrompt, refineryAnalysis);
    const topRefinements = refineryAnalysis.refinements.slice(0, 5);

    return {
      timestamp: new Date().toISOString(),
      summary: {
        originalPrompt,
        improvedPrompt: improved,
        contextType: refineryAnalysis.contextType,
        qualityScore: qualityAnalysis.overall,
        refineryImpactScore: refineryAnalysis.impactScore,
        combinedScore: this.calculateCombinedScore(qualityAnalysis, refineryAnalysis)
      },
      analysis: {
        qualityDimensions: qualityAnalysis.breakdown,
        topKeywords: refineryAnalysis.weightedKeywords.slice(0, 10),
        keywordWeighting: {
          method: 'Frequency (35%) + Position (30%) + Emphasis (35%)',
          topWeighted: refineryAnalysis.weightedKeywords[0]?.text,
          topWeight: refineryAnalysis.weightedKeywords[0]?.weight
        }
      },
      refinements: {
        total: refineryAnalysis.refinements.length,
        topRefinements: topRefinements.map(r => ({
          original: r.originalKeyword,
          suggested: r.suggestedWord,
          reason: r.reason,
          impactPercent: Math.round(r.impact * 100)
        }))
      },
      impact: {
        estimatedImprovement: this.calculateCombinedImpact(qualityAnalysis, refineryAnalysis)
      }
    };
  }

  /**
   * Real-world example: Process user's ChatGPT conversation
   */
  async processConversation(conversation) {
    const results = [];

    for (const message of conversation) {
      if (message.role === 'user') {
        console.log(`\nAnalyzing user message: "${message.content.substring(0, 50)}..."`);
        
        const analysis = await this.analyzePromptWithRefinery(message.content);
        results.push({
          originalMessage: message.content,
          analysis,
          recommendations: this.generateRecommendations(analysis)
        });
      }
    }

    return {
      totalMessages: results.length,
      results,
      summary: this.generateConversationSummary(results)
    };
  }

  /**
   * Generate recommendations for a specific analysis
   */
  generateRecommendations(analysis) {
    const recs = [];

    // Quality recommendations
    if (analysis.qualityAnalysis.overall < 5) {
      recs.push({
        priority: 'HIGH',
        type: 'quality',
        suggestion: 'Improve prompt clarity - specify output format, constraints, and examples'
      });
    }

    // Refinery recommendations
    const topRefinements = analysis.refineryAnalysis.refinements.slice(0, 3);
    if (topRefinements.length > 0) {
      recs.push({
        priority: 'MEDIUM',
        type: 'refinement',
        suggestion: `Apply these refinements: ${topRefinements.map(r => `"${r.originalKeyword}" → "${r.suggestedWord}"`).join(', ')}`
      });
    }

    // Context recommendations
    if (analysis.refineryAnalysis.contextType === 'general') {
      recs.push({
        priority: 'LOW',
        type: 'context',
        suggestion: 'Consider adding specific context about your goal and audience'
      });
    }

    return recs.sort((a, b) => {
      const priorityMap = { HIGH: 1, MEDIUM: 2, LOW: 3 };
      return priorityMap[a.priority] - priorityMap[b.priority];
    });
  }

  /**
   * Generate summary across all messages analyzed
   */
  generateConversationSummary(results) {
    const avgQualityScore = results.reduce((sum, r) => sum + (r.analysis.qualityAnalysis.overall || 0), 0) / results.length;
    const avgRefineryScore = results.reduce((sum, r) => sum + (r.analysis.refineryAnalysis.impactScore || 0), 0) / results.length;

    const topKeywords = {};
    results.forEach(r => {
      r.analysis.refineryAnalysis.weightedKeywords.slice(0, 5).forEach(kw => {
        topKeywords[kw.text] = (topKeywords[kw.text] || 0) + 1;
      });
    });

    const contextTypes = {};
    results.forEach(r => {
      contextTypes[r.analysis.refineryAnalysis.contextType] = (contextTypes[r.analysis.refineryAnalysis.contextType] || 0) + 1;
    });

    return {
      averageQualityScore: Math.round(avgQualityScore * 10) / 10,
      averageRefineryScore: Math.round(avgRefineryScore * 10) / 10,
      topKeywordsByFrequency: Object.entries(topKeywords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([kw, count]) => ({ keyword: kw, appearances: count })),
      contextTypeDistribution: contextTypes,
      overallRecommendation: avgQualityScore > 6 && avgRefineryScore > 6 ? 
        '✅ Prompts are well-structured. Focus on applying specific refinements.' :
        '⚠️ Consider improving prompt quality and applying suggested refinements.'
    };
  }
}

/**
 * Usage Example
 */
async function exampleUsage() {
  const scanner = new ScannerWithRefinery();

  // Example conversation
  const exampleConversation = [
    {
      role: 'user',
      content: 'Write a blog post about AI'
    },
    {
      role: 'user',
      content: 'Create a detailed blog post for technical managers with: intro (150 words), 3 sections (500 each), conclusion with CTA. Avoid: hype, oversimplification, marketing speak.'
    }
  ];

  // Analyze both prompts to show difference
  console.log('📊 Analyzing conversation with refinery...\n');

  for (const msg of exampleConversation) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`USER PROMPT: "${msg.content.substring(0, 60)}..."`);
    console.log('='.repeat(60));

    const analysis = await scanner.analyzePromptWithRefinery(msg.content);
    
    console.log(`\n📈 QUALITY SCORE: ${analysis.qualityAnalysis.overall}/10`);
    console.log(`🔧 REFINERY IMPACT: ${analysis.refineryAnalysis.impactScore}%`);
    console.log(`\n🎯 CONTEXT: ${analysis.refineryAnalysis.contextType}`);
    console.log(`\n💡 TOP 3 REFINEMENTS:`);
    analysis.refineryAnalysis.refinements.slice(0, 3).forEach(r => {
      console.log(`  • "${r.originalKeyword}" → "${r.suggestedWord}" (+${Math.round(r.impact * 100)}%)`);
    });

    const recs = scanner.generateRecommendations(analysis);
    console.log(`\n✨ RECOMMENDATIONS:`);
    recs.forEach(r => {
      console.log(`  [${r.priority}] ${r.type.toUpperCase()}: ${r.suggestion}`);
    });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Analysis complete! UI would display refinement options.');
}

// Uncomment to run example:
// exampleUsage().catch(console.error);

// Export for both ES6 modules and browser global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScannerWithRefinery };
} else if (typeof window !== 'undefined') {
  window.ScannerWithRefinery = ScannerWithRefinery;
}
