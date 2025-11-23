// @version 2.1.11
/**
 * Refinery Integration Example
 * Shows how to use RefineryEngine and RefineryUIComponent together
 */

// Example usage in scanner-ui.html or similar

class ScannerWithRefinery {
  constructor() {
    this.refineryEngine = new RefineryEngine();
    this.refineryUI = new RefineryUIComponent('refinery-results');
  }

  /**
   * Analyze a prompt and display results with refinements
   */
  async analyzePrompt(prompt) {
    try {
      // Run the refinement analysis
      const analysis = this.refineryEngine.analyze(prompt);
      
      // Render the results in the UI
      this.refineryUI.render(analysis);
      
      return analysis;
    } catch (error) {
      console.error('Analysis error:', error);
      this.displayError('Failed to analyze prompt. Please try again.');
    }
  }

  /**
   * Display error message
   */
  displayError(message) {
    const container = document.getElementById('refinery-results');
    if (container) {
      container.innerHTML = `
        <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 4px; border: 1px solid #f5c6cb;">
          <strong>⚠️ Error:</strong> ${message}
        </div>
      `;
    }
  }

  /**
   * Get quick wins (easy, high-impact refinements)
   */
  getQuickWins(analysis) {
    return analysis.report.topRecommendations
      .filter(r => r.difficulty === 'low' && r.priority === 'high')
      .slice(0, 3);
  }

  /**
   * Generate and copy refined prompt to clipboard
   */
  async copyRefinedPrompt(analysis) {
    const refined = this.refineryEngine.generateRefinedPrompt(analysis, 5);
    
    try {
      await navigator.clipboard.writeText(refined.refined);
      return {
        success: true,
        message: `Copied refined prompt (${refined.changes.length} changes applied)`,
        changeCount: refined.changes.length,
        totalImprovement: refined.totalEstimatedImprovement
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to copy to clipboard',
        error: error.message
      };
    }
  }

  /**
   * Get implementation steps (ranked by difficulty)
   */
  getImplementationSteps(analysis) {
    const byDifficulty = {
      low: [],
      medium: [],
      high: []
    };

    analysis.report.topRecommendations.forEach(rec => {
      byDifficulty[rec.difficulty].push(rec);
    });

    return {
      quickWins: byDifficulty.low.slice(0, 3),
      mediumEffort: byDifficulty.medium.slice(0, 3),
      highImpact: byDifficulty.high.slice(0, 3),
      timeline: {
        quickWins: '3-5 minutes',
        allChanges: '7-10 minutes'
      }
    };
  }

  /**
   * Generate before/after comparison
   */
  generateComparison(analysis) {
    const refined = this.refineryEngine.generateRefinedPrompt(analysis, 10);
    
    return {
      before: {
        text: analysis.originalPrompt,
        score: analysis.impactScore,
        keywordCount: analysis.weightedKeywords.length
      },
      after: {
        text: refined.refined,
        score: analysis.impactScore + (refined.totalEstimatedImprovement * 0.1),
        keywordCount: analysis.weightedKeywords.length,
        changesApplied: refined.changes.length,
        improvementPercentage: (refined.totalEstimatedImprovement / 100) * 10
      },
      changeLog: refined.changes
    };
  }

  /**
   * Generate a shareable report
   */
  generateReport(analysis) {
    const comparison = this.generateComparison(analysis);
    const steps = this.getImplementationSteps(analysis);

    return {
      title: 'Prompt Refinement Analysis Report',
      generatedAt: new Date().toLocaleString(),
      
      summary: {
        originalPrompt: analysis.originalPrompt,
        contextType: analysis.contextType,
        opportunitiesFound: analysis.report.summary.refinementOpportunities,
        potentialImpact: analysis.report.summary.potentialImpact
      },

      analysis: {
        totalKeywords: analysis.report.summary.totalKeywords,
        weakWordsIdentified: analysis.report.metrics.weakWordsIdentified,
        highWeightKeywords: analysis.report.metrics.keywordsWithHighWeight,
        averageImpactScore: analysis.report.metrics.avgImpactScore
      },

      recommendations: {
        total: analysis.report.topRecommendations.length,
        highPriority: analysis.report.topRecommendations.filter(r => r.priority === 'high').length,
        mediumPriority: analysis.report.topRecommendations.filter(r => r.priority === 'medium').length,
        lowPriority: analysis.report.topRecommendations.filter(r => r.priority === 'low').length
      },

      quickWins: steps.quickWins.map(r => ({
        change: `"${r.originalKeyword}" → "${r.suggestedWord}"`,
        reason: r.reason,
        impact: r.estimatedImprovement,
        time: '< 1 minute'
      })),

      comparison: {
        before: comparison.before.text,
        after: comparison.after.text,
        scoreImprovement: `+${(comparison.after.score - comparison.before.score).toFixed(1)}%`,
        changesApplied: comparison.changeLog.length
      },

      implementationGuide: {
        phase1: steps.quickWins.map(r => `Replace "${r.originalKeyword}" with "${r.suggestedWord}"`),
        phase2: steps.mediumEffort.map(r => `Replace "${r.originalKeyword}" with "${r.suggestedWord}"`),
        phase3: steps.highImpact.map(r => `Replace "${r.originalKeyword}" with "${r.suggestedWord}"`)
      },

      estimatedResults: {
        timeToImplement: '5-10 minutes',
        expectedQualityIncrease: `${(analysis.impactScore * 1.5).toFixed(1)}/10`,
        recommendedNextSteps: [
          '1. Apply Quick Wins first (easy, immediate benefits)',
          '2. Review Medium Effort changes (balance impact vs effort)',
          '3. Evaluate High Impact changes (significant restructuring)',
          '4. Test refined prompt with AI assistant',
          '5. Iterate based on response quality'
        ]
      }
    };
  }

  /**
   * Export report as formatted text
   */
  exportReportAsText(analysis) {
    const report = this.generateReport(analysis);
    
    let text = `${'='.repeat(70)}\n`;
    text += `${report.title}\n`;
    text += `Generated: ${report.generatedAt}\n`;
    text += `${'='.repeat(70)}\n\n`;

    text += `SUMMARY\n${'-'.repeat(70)}\n`;
    text += `Context Type: ${report.summary.contextType}\n`;
    text += `Opportunities Found: ${report.summary.opportunitiesFound}\n`;
    text += `Potential Impact: ${report.summary.potentialImpact}\n\n`;

    text += `ANALYSIS\n${'-'.repeat(70)}\n`;
    text += `Total Keywords: ${report.analysis.totalKeywords}\n`;
    text += `Weak Words Identified: ${report.analysis.weakWordsIdentified}\n`;
    text += `High Weight Keywords: ${report.analysis.highWeightKeywords}\n`;
    text += `Average Impact Score: ${report.analysis.averageImpactScore}/10\n\n`;

    text += `QUICK WINS (High-Impact, Low-Effort)\n${'-'.repeat(70)}\n`;
    report.quickWins.forEach((win, idx) => {
      text += `${idx + 1}. ${win.change}\n`;
      text += `   Reason: ${win.reason}\n`;
      text += `   Impact: ${win.impact}\n\n`;
    });

    text += `RECOMMENDATIONS\n${'-'.repeat(70)}\n`;
    text += `Total Recommendations: ${report.recommendations.total}\n`;
    text += `High Priority: ${report.recommendations.highPriority}\n`;
    text += `Medium Priority: ${report.recommendations.mediumPriority}\n`;
    text += `Low Priority: ${report.recommendations.lowPriority}\n\n`;

    text += `BEFORE\n${'-'.repeat(70)}\n`;
    text += `${report.comparison.before}\n\n`;

    text += `AFTER\n${'-'.repeat(70)}\n`;
    text += `${report.comparison.after}\n\n`;

    text += `IMPLEMENTATION GUIDE\n${'-'.repeat(70)}\n`;
    text += `Phase 1 (Quick Wins):\n`;
    report.implementationGuide.phase1.forEach(change => {
      text += `  • ${change}\n`;
    });
    if (report.implementationGuide.phase2.length > 0) {
      text += `\nPhase 2 (Medium Effort):\n`;
      report.implementationGuide.phase2.forEach(change => {
        text += `  • ${change}\n`;
      });
    }
    if (report.implementationGuide.phase3.length > 0) {
      text += `\nPhase 3 (High Impact):\n`;
      report.implementationGuide.phase3.forEach(change => {
        text += `  • ${change}\n`;
      });
    }

    text += `\n\nNEXT STEPS\n${'-'.repeat(70)}\n`;
    report.estimatedResults.recommendedNextSteps.forEach(step => {
      text += `${step}\n`;
    });

    text += `\n${'='.repeat(70)}\n`;
    text += `Time to Implement: ${report.estimatedResults.timeToImplement}\n`;
    text += `Expected Quality Increase: ${report.estimatedResults.expectedQualityIncrease}\n`;
    text += `${'='.repeat(70)}\n`;

    return text;
  }

  /**
   * Download report as text file
   */
  downloadReport(analysis, filename = 'prompt-refinement-report.txt') {
    const text = this.exportReportAsText(analysis);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Example HTML integration
const exampleHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Prompt Refinery Scanner</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      text-align: center;
      color: white;
      margin-bottom: 30px;
    }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header p { font-size: 16px; opacity: 0.9; }
    .scanner-panel {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      margin-bottom: 20px;
    }
    .input-group {
      margin-bottom: 15px;
    }
    .input-group label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }
    .input-group textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-family: 'Monaco', monospace;
      resize: vertical;
      min-height: 100px;
    }
    .input-group textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    .button-group {
      display: flex;
      gap: 10px;
    }
    .btn {
      flex: 1;
      padding: 12px 20px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4); }
    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }
    .btn-secondary:hover { background: #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Prompt Refinery Scanner</h1>
      <p>Get smarter refinement suggestions for better AI responses</p>
    </div>

    <div class="scanner-panel">
      <div class="input-group">
        <label>Enter Your Prompt</label>
        <textarea id="promptInput" placeholder="Paste your ChatGPT/Claude prompt here..."></textarea>
      </div>
      
      <div class="button-group">
        <button class="btn btn-primary" onclick="scanner.analyzePrompt(document.getElementById('promptInput').value)">
          🔍 Analyze Prompt
        </button>
        <button class="btn btn-secondary" onclick="document.getElementById('promptInput').value = ''">
          Clear
        </button>
      </div>
    </div>

    <div id="refinery-results"></div>
  </div>

  <script src="refinery-engine.js"></script>
  <script src="refinery-ui-component.js"></script>
  <script src="refinery-integration-example.js"></script>
  <script>
    // Initialize the scanner
    const scanner = new ScannerWithRefinery();

    // Example: Auto-analyze sample prompt on load
    window.addEventListener('load', () => {
      const samplePrompt = \`You are an expert Python developer. Write a function that helps me analyze data. Make it work well and handle errors properly. Show examples of how to use it.\`;
      // document.getElementById('promptInput').value = samplePrompt;
      // scanner.analyzePrompt(samplePrompt);
    });
  </script>
</body>
</html>
`;

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScannerWithRefinery, exampleHTML };
}
