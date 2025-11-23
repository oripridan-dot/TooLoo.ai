// @version 2.1.11
/**
 * Interactive Refinery UI Component
 * Displays weighted keywords and refinement suggestions visually
 * Shows measurable impact of proposed changes
 */

class RefineryUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.refineryEngine = null;
    this.currentReport = null;
    this.selectedRefinements = new Set();
  }

  /**
   * Initialize with refinery engine
   */
  init(refineryEngine) {
    this.refineryEngine = refineryEngine;
    this.createUI();
  }

  /**
   * Create the refinery UI structure
   */
  createUI() {
    this.container.innerHTML = `
      <div class="refinery-container">
        <!-- Header -->
        <div class="refinery-header">
          <h3>🔧 Prompt Refinement Studio</h3>
          <p>Analyze keyword weights and discover high-impact refinements</p>
        </div>

        <!-- Analysis Section -->
        <div class="refinery-section">
          <div class="section-header">
            <h4>📊 Keyword Analysis</h4>
            <span class="info-badge">Weighted by frequency, position, and emphasis</span>
          </div>
          <div id="keywordVisualization" class="keyword-visualization"></div>
          <div id="keywordDetails" class="keyword-details-table"></div>
        </div>

        <!-- Context Detection -->
        <div class="refinery-section">
          <div class="section-header">
            <h4>🎯 Detected Context</h4>
            <span class="info-badge">Determines refinement suggestions</span>
          </div>
          <div id="contextInfo" class="context-info"></div>
        </div>

        <!-- Refinement Options -->
        <div class="refinery-section">
          <div class="section-header">
            <h4>💡 Refinement Options</h4>
            <span class="filter-controls">
              <button class="filter-btn active" data-filter="all">All</button>
              <button class="filter-btn" data-filter="high">High Impact</button>
              <button class="filter-btn" data-filter="medium">Medium</button>
            </span>
          </div>
          <div id="refinementOptions" class="refinement-options"></div>
        </div>

        <!-- Impact Preview -->
        <div class="refinery-section">
          <div class="section-header">
            <h4>📈 Estimated Impact</h4>
            <span class="info-badge">When refinements are applied</span>
          </div>
          <div id="impactPreview" class="impact-preview"></div>
        </div>

        <!-- Before/After Comparison -->
        <div class="refinery-section">
          <div class="section-header">
            <h4>🔄 Prompt Comparison</h4>
            <button class="action-btn" id="applyRefinementsBtn">Apply Selected Refinements</button>
          </div>
          <div id="promptComparison" class="prompt-comparison"></div>
        </div>

        <!-- Export Section -->
        <div class="refinery-section">
          <div class="section-header">
            <h4>📥 Export Results</h4>
          </div>
          <div class="export-controls">
            <button class="action-btn" id="exportJsonBtn">Export as JSON</button>
            <button class="action-btn" id="copyRefinedBtn">Copy Refined Prompt</button>
            <button class="action-btn" id="exportReportBtn">Download Report</button>
          </div>
        </div>
      </div>

      <style>
        .refinery-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #333;
        }

        .refinery-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .refinery-header h3 {
          margin: 0 0 5px 0;
          font-size: 1.3em;
        }

        .refinery-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 0.95em;
        }

        .refinery-section {
          background: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e0e0e0;
        }

        .section-header h4 {
          margin: 0;
          color: #667eea;
          font-size: 1.1em;
        }

        .info-badge {
          background: #e8f0ff;
          color: #667eea;
          padding: 3px 12px;
          border-radius: 20px;
          font-size: 0.8em;
          font-weight: 500;
        }

        /* Keyword Visualization */
        .keyword-visualization {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 15px;
          padding: 10px;
          background: white;
          border-radius: 6px;
        }

        .keyword-tag {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          background: #f0f0f0;
          border: 2px solid transparent;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .keyword-tag:hover {
          border-color: #667eea;
          background: #e8f0ff;
        }

        .keyword-tag.high-impact {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: #667eea;
        }

        .keyword-tag.medium-impact {
          background: #fff3e0;
          border-color: #ffa726;
          color: #e65100;
        }

        .keyword-weight-bar {
          display: inline-block;
          width: 40px;
          height: 6px;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          border-radius: 3px;
          margin-left: 8px;
          opacity: 0.7;
        }

        /* Keyword Details Table */
        .keyword-details-table {
          overflow-x: auto;
        }

        .details-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9em;
        }

        .details-table th {
          background: #e8f0ff;
          color: #667eea;
          padding: 8px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #667eea;
        }

        .details-table td {
          padding: 8px;
          border-bottom: 1px solid #e0e0e0;
        }

        .details-table tr:hover {
          background: #f5f5f5;
        }

        .weight-display {
          font-weight: 600;
          color: #667eea;
        }

        /* Refinement Options */
        .refinement-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .refinement-option {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .refinement-option:hover {
          border-color: #667eea;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
        }

        .refinement-option.selected {
          background: #e8f0ff;
          border-color: #667eea;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
        }

        .refinement-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 8px;
        }

        .refinement-keyword {
          font-weight: 600;
          color: #333;
        }

        .refinement-badge {
          background: #e74c3c;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75em;
          font-weight: 600;
        }

        .refinement-badge.medium {
          background: #f39c12;
        }

        .refinement-badge.low {
          background: #95a5a6;
        }

        .refinement-suggestion {
          background: #f0f0f0;
          padding: 8px;
          border-radius: 4px;
          margin: 8px 0;
        }

        .suggestion-label {
          font-size: 0.8em;
          color: #666;
          font-weight: 500;
          margin-bottom: 3px;
        }

        .suggestion-replacement {
          font-weight: 600;
          color: #3fa46b;
          font-size: 1.05em;
        }

        .impact-meter {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }

        .impact-bar {
          flex: 1;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }

        .impact-fill {
          height: 100%;
          background: linear-gradient(90deg, #3fa46b 0%, #27ae60 100%);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .impact-percent {
          font-weight: 600;
          color: #27ae60;
          min-width: 35px;
          text-align: right;
        }

        /* Impact Preview */
        .impact-preview {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .impact-box {
          background: white;
          border-radius: 6px;
          padding: 12px;
          text-align: center;
        }

        .impact-box.before {
          border: 2px solid #e74c3c;
        }

        .impact-box.after {
          border: 2px solid #27ae60;
        }

        .impact-label {
          font-size: 0.9em;
          color: #666;
          margin-bottom: 5px;
        }

        .impact-score {
          font-size: 2em;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 5px;
        }

        .impact-improvement {
          font-size: 1.1em;
          font-weight: 600;
          color: #27ae60;
        }

        /* Prompt Comparison */
        .prompt-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .prompt-box {
          background: white;
          border-radius: 6px;
          padding: 12px;
          border: 1px solid #e0e0e0;
        }

        .prompt-box.before {
          border-left: 4px solid #e74c3c;
        }

        .prompt-box.after {
          border-left: 4px solid #27ae60;
        }

        .prompt-label {
          font-size: 0.9em;
          font-weight: 600;
          color: #666;
          margin-bottom: 8px;
        }

        .prompt-text {
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.9em;
          line-height: 1.5;
          color: #333;
          padding: 10px;
          background: #f9f9f9;
          border-radius: 4px;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .prompt-text.highlighted {
          background: #ffffcc;
        }

        /* Filter Controls */
        .filter-controls {
          display: flex;
          gap: 5px;
        }

        .filter-btn {
          background: white;
          border: 1px solid #ddd;
          padding: 4px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85em;
          transition: all 0.2s ease;
        }

        .filter-btn:hover {
          border-color: #667eea;
          color: #667eea;
        }

        .filter-btn.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        /* Action Buttons */
        .action-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
          font-size: 0.9em;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .action-btn:active {
          transform: translateY(0);
        }

        .export-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* Context Info */
        .context-info {
          display: flex;
          gap: 10px;
          align-items: center;
          background: white;
          padding: 12px;
          border-radius: 6px;
        }

        .context-badge {
          background: #667eea;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 600;
        }

        .context-description {
          color: #666;
          font-size: 0.9em;
        }

        @media (max-width: 768px) {
          .prompt-comparison, .impact-preview {
            grid-template-columns: 1fr;
          }

          .keyword-visualization {
            max-height: 150px;
            overflow-y: auto;
          }

          .filter-controls {
            flex-wrap: wrap;
          }
        }
      </style>
    `;

    this.attachEventListeners();
  }

  /**
   * Display analysis results
   */
  displayAnalysis(report) {
    this.currentReport = report;

    this.displayKeywords(report.weightedKeywords);
    this.displayContext(report.contextType);
    this.displayRefinements(report.refinements);
    this.displayImpact(report.impactScore);
    this.displayComparison(report);
  }

  /**
   * Display weighted keywords visualization
   */
  displayKeywords(weightedKeywords) {
    const vizContainer = document.getElementById('keywordVisualization');
    const tableContainer = document.getElementById('keywordDetails');

    // Visualization tags
    const maxWeight = Math.max(...weightedKeywords.map(k => k.weight));
    const tags = weightedKeywords.slice(0, 15).map(kw => {
      const impactClass = kw.weight > maxWeight * 0.7 ? 'high-impact' : 'medium-impact';
      const barWidth = (kw.weight / maxWeight) * 100;
      return `
        <div class="keyword-tag ${impactClass}" title="Weight: ${kw.weight}, Frequency: ${kw.frequency}">
          <span>${kw.text}</span>
          <div class="keyword-weight-bar" style="width: ${barWidth}px;"></div>
        </div>
      `;
    });
    vizContainer.innerHTML = tags.join('');

    // Details table
    const rows = weightedKeywords.slice(0, 10).map((kw, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${kw.text}</strong></td>
        <td>${kw.frequency}</td>
        <td>${kw.positionScore}</td>
        <td>${kw.emphasisScore}</td>
        <td><span class="weight-display">${kw.weight}</span></td>
        <td><span class="refinement-badge ${kw.refinementPriority === 'high' ? '' : 'medium'}">${kw.refinementPriority}</span></td>
      </tr>
    `);

    tableContainer.innerHTML = `
      <table class="details-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Keyword</th>
            <th>Frequency</th>
            <th>Position</th>
            <th>Emphasis</th>
            <th>Weight</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Display detected context
   */
  displayContext(contextType) {
    const contextMap = {
      'action': '✍️ Action-Oriented - Focus on creating, building, generating',
      'analysis': '🔍 Analysis-Focused - Emphasis on reviewing, comparing, evaluating',
      'learning': '📚 Learning-Oriented - Goal is understanding and explanation',
      'problem-solving': '🔧 Problem-Solving - Aimed at fixing, improving, optimizing',
      'strategy': '🎯 Strategic - Planning and methodology focused',
      'general': '📌 General Purpose - Mixed or unclear intent'
    };

    document.getElementById('contextInfo').innerHTML = `
      <div class="context-badge">${contextType.toUpperCase()}</div>
      <div class="context-description">${contextMap[contextType] || contextMap['general']}</div>
    `;
  }

  /**
   * Display refinement suggestions
   */
  displayRefinements(refinements, filter = 'all') {
    const container = document.getElementById('refinementOptions');
    
    let filtered = refinements;
    if (filter === 'high') {
      filtered = refinements.filter(r => r.impact > 0.4);
    } else if (filter === 'medium') {
      filtered = refinements.filter(r => r.impact <= 0.4 && r.impact > 0.2);
    }

    const options = filtered.slice(0, 12).map((ref, idx) => {
      const selected = this.selectedRefinements.has(ref.originalKeyword);
      const impactPercent = Math.round(ref.impact * 100);
      const badgeClass = ref.impact > 0.4 ? '' : (ref.impact > 0.2 ? 'medium' : 'low');

      return `
        <div class="refinement-option ${selected ? 'selected' : ''}" data-keyword="${ref.originalKeyword}" data-index="${idx}">
          <div class="refinement-header">
            <span class="refinement-keyword">"${ref.originalKeyword}"</span>
            <span class="refinement-badge ${badgeClass}">${impactPercent}% Impact</span>
          </div>
          <div style="color: #666; font-size: 0.9em; margin: 6px 0;">${ref.reason}</div>
          <div class="refinement-suggestion">
            <div class="suggestion-label">Suggested replacement:</div>
            <div class="suggestion-replacement">"${ref.suggestedWord}"</div>
          </div>
          <div class="impact-meter">
            <div class="impact-bar">
              <div class="impact-fill" style="width: ${impactPercent}%;"></div>
            </div>
            <span class="impact-percent">+${impactPercent}%</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = options.join('');

    // Attach click handlers for selection
    container.querySelectorAll('.refinement-option').forEach(el => {
      el.addEventListener('click', () => {
        el.classList.toggle('selected');
        const keyword = el.getAttribute('data-keyword');
        if (el.classList.contains('selected')) {
          this.selectedRefinements.add(keyword);
        } else {
          this.selectedRefinements.delete(keyword);
        }
        this.updateComparison();
      });
    });
  }

  /**
   * Display impact scores
   */
  displayImpact(impactScore) {
    const container = document.getElementById('impactPreview');
    const currentScore = 5;
    const projectedScore = Math.min(10, currentScore + (impactScore * 0.5));
    const improvement = Math.round((projectedScore - currentScore) / currentScore * 100);

    container.innerHTML = `
      <div class="impact-box before">
        <div class="impact-label">Current Focus Score</div>
        <div class="impact-score" style="color: #e74c3c;">${currentScore.toFixed(1)}</div>
        <div class="impact-label" style="font-size: 0.8em;">Before refinements</div>
      </div>
      <div class="impact-box after">
        <div class="impact-label">Projected Focus Score</div>
        <div class="impact-score" style="color: #27ae60;">${projectedScore.toFixed(1)}</div>
        <div class="impact-improvement">+${improvement}% improvement</div>
      </div>
    `;
  }

  /**
   * Display prompt comparison
   */
  displayComparison(report) {
    const container = document.getElementById('promptComparison');
    const refined = this.generateRefinedPrompt(report.originalPrompt);

    container.innerHTML = `
      <div class="prompt-box before">
        <div class="prompt-label">Original Prompt</div>
        <div class="prompt-text">${this.escapeHtml(report.originalPrompt)}</div>
      </div>
      <div class="prompt-box after">
        <div class="prompt-label">Refined Prompt (Preview)</div>
        <div class="prompt-text" id="refinedPromptPreview">${this.escapeHtml(refined)}</div>
      </div>
    `;
  }

  /**
   * Generate refined prompt from selected refinements
   */
  generateRefinedPrompt(original) {
    let refined = original;

    this.currentReport.refinements.forEach(ref => {
      if (this.selectedRefinements.has(ref.originalKeyword)) {
        const regex = new RegExp(`\\b${ref.originalKeyword}\\b`, 'gi');
        refined = refined.replace(regex, ref.suggestedWord);
      }
    });

    return refined;
  }

  /**
   * Update comparison when selections change
   */
  updateComparison() {
    if (!this.currentReport) return;
    
    const refined = this.generateRefinedPrompt(this.currentReport.originalPrompt);
    document.getElementById('refinedPromptPreview').textContent = refined;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-filter');
        this.displayRefinements(this.currentReport.refinements, filter);
      });
    });

    // Apply refinements button
    document.getElementById('applyRefinementsBtn')?.addEventListener('click', () => {
      this.copyRefinedPrompt();
    });

    // Export buttons
    document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
      this.exportJSON();
    });

    document.getElementById('copyRefinedBtn')?.addEventListener('click', () => {
      this.copyRefinedPrompt();
    });

    document.getElementById('exportReportBtn')?.addEventListener('click', () => {
      this.downloadReport();
    });
  }

  /**
   * Copy refined prompt to clipboard
   */
  copyRefinedPrompt() {
    const refined = this.generateRefinedPrompt(this.currentReport.originalPrompt);
    navigator.clipboard.writeText(refined).then(() => {
      alert('✅ Refined prompt copied to clipboard!');
    });
  }

  /**
   * Export analysis as JSON
   */
  exportJSON() {
    const data = {
      timestamp: new Date().toISOString(),
      originalPrompt: this.currentReport.originalPrompt,
      refinedPrompt: this.generateRefinedPrompt(this.currentReport.originalPrompt),
      analysis: {
        topKeywords: this.currentReport.weightedKeywords.slice(0, 5),
        contextType: this.currentReport.contextType,
        refinements: Array.from(this.selectedRefinements).map(kw =>
          this.currentReport.refinements.find(r => r.originalKeyword === kw)
        )
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    this.downloadFile(blob, 'refinery-analysis.json');
  }

  /**
   * Download report as text
   */
  downloadReport() {
    const refined = this.generateRefinedPrompt(this.currentReport.originalPrompt);
    const report = `
PROMPT REFINEMENT REPORT
Generated: ${new Date().toLocaleString()}

ORIGINAL PROMPT:
${this.currentReport.originalPrompt}

REFINED PROMPT:
${refined}

ANALYSIS:
Context Type: ${this.currentReport.contextType}
Top Keywords: ${this.currentReport.weightedKeywords.slice(0, 5).map(k => k.text).join(', ')}
Total Refinements Applied: ${this.selectedRefinements.size}

SELECTED REFINEMENTS:
${Array.from(this.selectedRefinements).map(kw => {
  const ref = this.currentReport.refinements.find(r => r.originalKeyword === kw);
  return `• "${kw}" → "${ref.suggestedWord}" (+${Math.round(ref.impact * 100)}%)`;
}).join('\n')}

EXPECTED IMPACT:
Focus Score Improvement: ~${Math.round(this.currentReport.impactScore * 5)}%
Clarity Gain: Increased specificity and impact
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    this.downloadFile(blob, 'refinery-report.txt');
  }

  /**
   * Helper: Download file
   */
  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Helper: Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for both ES6 modules and browser global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RefineryUI };
} else if (typeof window !== 'undefined') {
  window.RefineryUI = RefineryUI;
}
