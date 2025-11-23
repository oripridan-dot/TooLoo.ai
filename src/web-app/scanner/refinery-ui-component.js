// @version 2.1.28
/**
 * Refinery UI Component
 * Interactive display for keyword refinements with before/after comparison
 */

class RefineryUIComponent {
  constructor(containerId = 'refinery-results', config = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.currentAnalysis = null;
    this.appliedRefinements = new Set();
    this.config = {
      showDifficulty: true,
      showMetrics: true,
      enablePreview: true,
      autoHighlight: true,
      ...config
    };
    
    this.initializeStyles();
  }

  /**
   * Render refinement results
   */
  render(analysis) {
    this.currentAnalysis = analysis;
    
    if (!this.container) {
      console.error(`Container #${this.containerId} not found`);
      return;
    }

    this.container.innerHTML = '';
    
    const mainPanel = document.createElement('div');
    mainPanel.className = 'refinery-main-panel';
    
    // Summary card
    mainPanel.appendChild(this.renderSummaryCard(analysis));
    
    // Metrics dashboard
    if (this.config.showMetrics) {
      mainPanel.appendChild(this.renderMetricsDashboard(analysis));
    }
    
    // Quick wins section
    mainPanel.appendChild(this.renderQuickWins(analysis));
    
    // Top recommendations
    mainPanel.appendChild(this.renderRecommendations(analysis));
    
    // Before/After comparison
    if (this.config.enablePreview) {
      mainPanel.appendChild(this.renderBeforeAfter(analysis));
    }
    
    // Implementation guide
    mainPanel.appendChild(this.renderImplementationGuide(analysis));
    
    this.container.appendChild(mainPanel);
  }

  /**
   * Render summary card
   */
  renderSummaryCard(analysis) {
    const card = document.createElement('div');
    card.className = 'refinery-card refinery-summary';
    
    const impact = analysis.report.summary.potentialImpact;
    const contextBadge = this.getContextBadge(analysis.contextType);
    
    card.innerHTML = `
      <div class="refinery-summary-header">
        <h3>📊 Refinement Analysis</h3>
        <span class="refinery-context-badge ${contextBadge.class}">${contextBadge.text}</span>
      </div>
      <div class="refinery-summary-body">
        <p class="refinery-summary-text">Your prompt has <strong>${analysis.report.summary.refinementOpportunities}</strong> improvement opportunities.</p>
        <p class="refinery-impact-headline">Potential Impact: <span class="refinery-impact-highlight">${impact}</span></p>
        <p class="refinery-summary-keywords">
          <strong>${analysis.report.summary.totalKeywords}</strong> key concepts identified • 
          <strong>${analysis.report.metrics.weakWordsIdentified}</strong> weak words found • 
          <strong>${analysis.report.metrics.keywordsWithHighWeight}</strong> high-impact keywords
        </p>
      </div>
    `;
    
    return card;
  }

  /**
   * Render metrics dashboard
   */
  renderMetricsDashboard(analysis) {
    const dashboard = document.createElement('div');
    dashboard.className = 'refinery-dashboard';
    
    const metrics = analysis.report.metrics;
    const avgScore = metrics.avgImpactScore;
    const scoreColor = avgScore >= 7 ? '#2ecc71' : avgScore >= 5 ? '#f39c12' : '#e74c3c';
    
    dashboard.innerHTML = `
      <div class="refinery-metric-item">
        <div class="refinery-metric-label">Avg Impact</div>
        <div class="refinery-metric-value" style="color: ${scoreColor};">${avgScore.toFixed(1)}/10</div>
      </div>
      <div class="refinery-metric-item">
        <div class="refinery-metric-label">Refinements</div>
        <div class="refinery-metric-value">${metrics.totalRefinements}</div>
      </div>
      <div class="refinery-metric-item">
        <div class="refinery-metric-label">High Weight Keywords</div>
        <div class="refinery-metric-value">${metrics.keywordsWithHighWeight}</div>
      </div>
      <div class="refinery-metric-item">
        <div class="refinery-metric-label">Weak Words</div>
        <div class="refinery-metric-value" style="color: #e74c3c;">${metrics.weakWordsIdentified}</div>
      </div>
    `;
    
    return dashboard;
  }

  /**
   * Render quick wins section
   */
  renderQuickWins(analysis) {
    const quickWinsRecs = analysis.report.topRecommendations
      .filter(r => r.difficulty === 'low')
      .slice(0, 3);
    
    if (quickWinsRecs.length === 0) {
      return document.createElement('div');
    }
    
    const section = document.createElement('div');
    section.className = 'refinery-card refinery-quick-wins';
    
    const header = document.createElement('h4');
    header.innerHTML = '⚡ Quick Wins (Easy, High-Impact)';
    section.appendChild(header);
    
    const winsList = document.createElement('div');
    winsList.className = 'refinery-wins-list';
    
    quickWinsRecs.forEach((rec, idx) => {
      const win = document.createElement('div');
      win.className = 'refinery-win-item';
      
      win.innerHTML = `
        <div class="refinery-win-indicator">✓</div>
        <div class="refinery-win-content">
          <div class="refinery-win-change">
            "<span class="refinery-old-word">${rec.originalKeyword}</span>" → 
            "<span class="refinery-new-word">${rec.suggestedWord}</span>"
          </div>
          <div class="refinery-win-reason">${rec.reason}</div>
          <div class="refinery-win-outcome">
            📈 ${rec.measurable} 
            <span class="refinery-impact-badge">+${rec.estimatedImprovement.replace('points', '').trim()}</span>
          </div>
        </div>
        <button class="refinery-apply-btn" data-idx="${idx}" onclick="this.parentElement.querySelector('input[type=checkbox]').click()">
          Apply
        </button>
        <input type="checkbox" class="refinery-apply-check" data-recommendation="${JSON.stringify(rec).replace(/"/g, '&quot;')}" hidden>
      `;
      
      winsList.appendChild(win);
    });
    
    section.appendChild(winsList);
    
    return section;
  }

  /**
   * Render recommendations list
   */
  renderRecommendations(analysis) {
    const section = document.createElement('div');
    section.className = 'refinery-card refinery-recommendations';
    
    const header = document.createElement('h4');
    header.innerHTML = '🎯 Top Refinement Recommendations';
    section.appendChild(header);
    
    const recsList = document.createElement('div');
    recsList.className = 'refinery-recommendations-list';
    
    analysis.report.topRecommendations.forEach((rec, idx) => {
      const item = document.createElement('div');
      item.className = `refinery-rec-item priority-${rec.priority}`;
      
      const difficultyColor = rec.difficulty === 'low' ? '#2ecc71' : 
                             rec.difficulty === 'medium' ? '#f39c12' : '#e74c3c';
      
      item.innerHTML = `
        <div class="refinery-rec-header">
          <span class="refinery-rec-rank">#${rec.rank}</span>
          <span class="refinery-rec-priority-badge">${rec.priority.toUpperCase()}</span>
          <span class="refinery-rec-difficulty" style="background: ${difficultyColor}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;">
            ${rec.difficulty}
          </span>
        </div>
        <div class="refinery-rec-change">
          "<span class="refinery-old-word">${rec.originalKeyword}</span>" → 
          "<span class="refinery-new-word">${rec.suggestedWord}</span>"
        </div>
        <div class="refinery-rec-reason">${rec.reason}</div>
        <div class="refinery-rec-details">
          <div class="refinery-rec-metric">Impact: ${rec.estimatedImprovement.replace('points', '')}</div>
          <div class="refinery-rec-metric">Outcome: ${rec.measurable}</div>
        </div>
      `;
      
      recsList.appendChild(item);
    });
    
    section.appendChild(recsList);
    
    return section;
  }

  /**
   * Render before/after comparison
   */
  renderBeforeAfter(analysis) {
    const refined = analysis.report.topRecommendations.length > 0;
    
    if (!refined) {
      return document.createElement('div');
    }
    
    const section = document.createElement('div');
    section.className = 'refinery-card refinery-comparison';
    
    const header = document.createElement('h4');
    header.innerHTML = '📋 Before/After Comparison';
    section.appendChild(header);
    
    const comparisonContainer = document.createElement('div');
    comparisonContainer.className = 'refinery-comparison-container';
    
    // Before section
    const before = document.createElement('div');
    before.className = 'refinery-comparison-panel before';
    before.innerHTML = `
      <h5>📝 Original Prompt</h5>
      <div class="refinery-prompt-text">${this.highlightKeywords(analysis.originalPrompt, analysis.weightedKeywords.slice(0, 5))}</div>
    `;
    
    // After section
    const refinedAnalysis = this.generateRefinedVersion(analysis);
    const after = document.createElement('div');
    after.className = 'refinery-comparison-panel after';
    after.innerHTML = `
      <h5>✨ Refined Prompt</h5>
      <div class="refinery-prompt-text">${this.highlightChanges(refinedAnalysis)}</div>
      <button class="refinery-copy-btn" onclick="navigator.clipboard.writeText(this.getAttribute('data-text')).then(() => alert('Copied!'))" data-text="${refinedAnalysis.refined}">
        📋 Copy Refined Prompt
      </button>
    `;
    
    comparisonContainer.appendChild(before);
    comparisonContainer.appendChild(after);
    
    section.appendChild(comparisonContainer);
    
    return section;
  }

  /**
   * Render implementation guide
   */
  renderImplementationGuide(analysis) {
    const guide = analysis.report.implementationGuide;
    
    const section = document.createElement('div');
    section.className = 'refinery-card refinery-guide';
    
    section.innerHTML = `
      <h4>📚 Implementation Guide</h4>
      <div class="refinery-guide-content">
        <div class="refinery-guide-step">
          <div class="refinery-guide-step-num">1</div>
          <div class="refinery-guide-step-content">
            <h5>${guide.phase1}</h5>
            <p>These require minimal changes but yield immediate clarity improvements.</p>
          </div>
        </div>
        <div class="refinery-guide-step">
          <div class="refinery-guide-step-num">2</div>
          <div class="refinery-guide-step-content">
            <h5>${guide.phase2}</h5>
            <p>More substantial rewording that significantly improves specificity.</p>
          </div>
        </div>
        <div class="refinery-guide-step">
          <div class="refinery-guide-step-num">3</div>
          <div class="refinery-guide-step-content">
            <h5>${guide.phase3}</h5>
            <p>Strategic restructuring for maximum impact and response quality.</p>
          </div>
        </div>
        <div class="refinery-guide-footer">
          <strong>⏱️ Time to Apply:</strong> ${guide.estimatedTimeToApply}
          <br>
          <strong>📊 Expected Outcome:</strong> ${guide.expectedOutcome}
        </div>
      </div>
    `;
    
    return section;
  }

  /**
   * Highlight important keywords
   */
  highlightKeywords(text, keywords) {
    let highlighted = text;
    
    keywords.forEach(kw => {
      const regex = new RegExp(`\\b(${kw.text})\\b`, 'gi');
      highlighted = highlighted.replace(regex, `<span class="refinery-keyword-highlight" title="Weight: ${kw.weight}">$1</span>`);
    });
    
    return highlighted;
  }

  /**
   * Highlight changes in refined version
   */
  highlightChanges(refined) {
    let highlighted = refined.refined;
    
    refined.changes.forEach(change => {
      const regex = new RegExp(`\\b(${change.to})\\b`, 'gi');
      highlighted = highlighted.replace(regex, `<span class="refinery-changed-word" title="Changed from: ${change.from}">$1</span>`);
    });
    
    return highlighted;
  }

  /**
   * Generate refined version
   */
  generateRefinedVersion(analysis) {
    let refined = analysis.originalPrompt;
    const changes = [];
    
    analysis.report.topRecommendations.slice(0, 5).forEach(rec => {
      const regex = new RegExp(`\\b${rec.originalKeyword}\\b`, 'gi');
      if (regex.test(refined)) {
        refined = refined.replace(regex, rec.suggestedWord);
        changes.push({
          from: rec.originalKeyword,
          to: rec.suggestedWord,
          impact: rec.estimatedImprovement
        });
      }
    });
    
    return {
      refined: refined,
      changes: changes
    };
  }

  /**
   * Get context badge styling
   */
  getContextBadge(contextType) {
    const badges = {
      action: { text: '⚡ Action-Oriented', class: 'badge-action' },
      analysis: { text: '🔍 Analysis-Focused', class: 'badge-analysis' },
      learning: { text: '🎓 Learning-Oriented', class: 'badge-learning' },
      'problem-solving': { text: '🔧 Problem-Solving', class: 'badge-problem' },
      strategy: { text: '📋 Strategy-Based', class: 'badge-strategy' },
      general: { text: '📝 General Purpose', class: 'badge-general' }
    };
    
    return badges[contextType] || badges.general;
  }

  /**
   * Initialize CSS styles
   */
  initializeStyles() {
    if (document.getElementById('refinery-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'refinery-styles';
    style.textContent = `
      .refinery-main-panel {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        max-width: 1000px;
        margin: 20px auto;
        color: #333;
      }

      .refinery-card {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 20px;
        margin: 15px 0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }

      .refinery-card h4 {
        margin-top: 0;
        margin-bottom: 15px;
        font-size: 16px;
        font-weight: 600;
        color: #2c3e50;
      }

      .refinery-card h5 {
        margin: 10px 0;
        font-size: 14px;
        color: #34495e;
      }

      .refinery-summary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }

      .refinery-summary-header h3 {
        margin: 0;
        font-size: 18px;
        color: #2c3e50;
      }

      .refinery-context-badge {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
      }

      .badge-action { background: #fff3cd; color: #856404; }
      .badge-analysis { background: #d1ecf1; color: #0c5460; }
      .badge-learning { background: #e2e3e5; color: #383d41; }
      .badge-problem { background: #f8d7da; color: #721c24; }
      .badge-strategy { background: #d4edda; color: #155724; }
      .badge-general { background: #cfe2ff; color: #084298; }

      .refinery-summary-text {
        margin: 10px 0;
        font-size: 14px;
      }

      .refinery-impact-headline {
        font-size: 14px;
        margin: 12px 0;
        font-weight: 500;
      }

      .refinery-impact-highlight {
        color: #27ae60;
        font-size: 18px;
        font-weight: 700;
      }

      .refinery-summary-keywords {
        font-size: 13px;
        color: #666;
        margin: 10px 0 0 0;
      }

      .refinery-dashboard {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
        background: white;
        padding: 20px;
        border-radius: 8px;
        margin: 15px 0;
        border: 1px solid #e9ecef;
      }

      .refinery-metric-item {
        text-align: center;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 6px;
      }

      .refinery-metric-label {
        font-size: 12px;
        font-weight: 500;
        color: #666;
        text-transform: uppercase;
        margin-bottom: 8px;
      }

      .refinery-metric-value {
        font-size: 24px;
        font-weight: 700;
        color: #2c3e50;
      }

      .refinery-wins-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .refinery-win-item {
        background: white;
        border: 2px solid #d4edda;
        border-radius: 6px;
        padding: 15px;
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }

      .refinery-win-indicator {
        color: #27ae60;
        font-size: 20px;
        font-weight: bold;
        flex-shrink: 0;
      }

      .refinery-win-content {
        flex: 1;
      }

      .refinery-win-change {
        font-weight: 500;
        margin-bottom: 5px;
        font-size: 14px;
      }

      .refinery-old-word {
        color: #e74c3c;
        text-decoration: line-through;
        font-style: italic;
      }

      .refinery-new-word {
        color: #27ae60;
        font-weight: 600;
      }

      .refinery-win-reason {
        font-size: 13px;
        color: #666;
        margin-bottom: 8px;
      }

      .refinery-win-outcome {
        font-size: 12px;
        color: #2c3e50;
        font-weight: 500;
      }

      .refinery-impact-badge {
        background: #d4edda;
        color: #155724;
        padding: 2px 6px;
        border-radius: 3px;
        margin-left: 5px;
      }

      .refinery-apply-btn {
        padding: 6px 12px;
        background: #27ae60;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        flex-shrink: 0;
      }

      .refinery-apply-btn:hover {
        background: #229954;
      }

      .refinery-recommendations-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .refinery-rec-item {
        background: white;
        border-left: 4px solid #3498db;
        border-radius: 4px;
        padding: 15px;
        margin-bottom: 10px;
      }

      .priority-high { border-left-color: #e74c3c; background: #fdeaea; }
      .priority-medium { border-left-color: #f39c12; background: #fef5e7; }
      .priority-low { border-left-color: #3498db; background: #ebf5fb; }

      .refinery-rec-header {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
        align-items: center;
      }

      .refinery-rec-rank {
        font-weight: 700;
        color: #2c3e50;
        font-size: 14px;
      }

      .refinery-rec-priority-badge {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .refinery-rec-change {
        font-weight: 500;
        margin-bottom: 5px;
        font-size: 14px;
      }

      .refinery-rec-reason {
        font-size: 13px;
        color: #666;
        margin-bottom: 8px;
      }

      .refinery-rec-details {
        display: flex;
        gap: 20px;
        font-size: 12px;
        color: #2c3e50;
      }

      .refinery-rec-metric {
        font-weight: 500;
      }

      .refinery-comparison-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-top: 15px;
      }

      @media (max-width: 768px) {
        .refinery-comparison-container {
          grid-template-columns: 1fr;
        }
      }

      .refinery-comparison-panel {
        background: white;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        padding: 15px;
      }

      .refinery-comparison-panel h5 {
        margin-top: 0;
        color: #2c3e50;
      }

      .refinery-prompt-text {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 4px;
        font-size: 13px;
        line-height: 1.6;
        margin-bottom: 10px;
        border: 1px solid #e9ecef;
      }

      .refinery-keyword-highlight {
        background: #fff3cd;
        padding: 2px 4px;
        border-radius: 2px;
        font-weight: 500;
        cursor: help;
      }

      .refinery-changed-word {
        background: #d4edda;
        padding: 2px 4px;
        border-radius: 2px;
        font-weight: 600;
        color: #155724;
      }

      .refinery-copy-btn {
        width: 100%;
        padding: 10px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 13px;
      }

      .refinery-copy-btn:hover {
        background: #2980b9;
      }

      .refinery-guide-content {
        background: white;
        border-radius: 6px;
        overflow: hidden;
      }

      .refinery-guide-step {
        display: flex;
        gap: 15px;
        padding: 15px;
        border-bottom: 1px solid #e9ecef;
      }

      .refinery-guide-step:last-child {
        border-bottom: none;
      }

      .refinery-guide-step-num {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: #3498db;
        color: white;
        border-radius: 50%;
        font-weight: 700;
        font-size: 18px;
        flex-shrink: 0;
      }

      .refinery-guide-step-content h5 {
        margin-top: 0;
      }

      .refinery-guide-step-content p {
        margin: 5px 0;
        font-size: 13px;
        color: #666;
      }

      .refinery-guide-footer {
        padding: 15px;
        background: #f8f9fa;
        font-size: 13px;
        line-height: 1.6;
        border-radius: 4px;
        margin-top: 10px;
      }

      .refinery-guide-footer strong {
        color: #2c3e50;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Show a specific refinement suggestion
   */
  highlightSuggestion(index) {
    const recommendations = document.querySelectorAll('.refinery-rec-item');
    if (index >= 0 && index < recommendations.length) {
      recommendations[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
      recommendations[index].style.boxShadow = '0 0 10px rgba(52, 152, 219, 0.5)';
      setTimeout(() => {
        recommendations[index].style.boxShadow = '';
      }, 2000);
    }
  }

  /**
   * Export recommendations as JSON
   */
  exportAsJSON() {
    if (!this.currentAnalysis) return null;
    
    return {
      timestamp: new Date().toISOString(),
      originalPrompt: this.currentAnalysis.originalPrompt,
      contextType: this.currentAnalysis.contextType,
      analysis: this.currentAnalysis.report,
      recommendations: this.currentAnalysis.report.topRecommendations
    };
  }

  /**
   * Export recommendations as CSV
   */
  exportAsCSV() {
    if (!this.currentAnalysis) return null;
    
    const recommendations = this.currentAnalysis.report.topRecommendations;
    const headers = ['Rank', 'Priority', 'Original', 'Suggested', 'Reason', 'Impact', 'Difficulty'];
    const rows = recommendations.map(r => [
      r.rank,
      r.priority,
      r.originalKeyword,
      r.suggestedWord,
      r.reason,
      r.estimatedImprovement,
      r.difficulty
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    return csv;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RefineryUIComponent };
}
