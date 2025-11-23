/**
 * Smart Intelligence Chat Widget
 * Real-time validation display for chat responses
 * Shows confidence scores, recommendations, and insights inline with responses
 */

class SmartIntelligenceWidget {
  constructor() {
    this.apiBase = `${window.location.protocol}//${window.location.host}`;
    this.validationInProgress = false;
  }

  /**
   * Validate a response and return intelligence report
   */
  async validateResponse(question, responseText) {
    try {
      this.validationInProgress = true;
      
      const response = await fetch(`${this.apiBase}/api/v1/chat/smart-intelligence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          responseText,
          metadata: { source: 'chat-widget' }
        })
      });

      if (!response.ok) {
        console.warn('Smart Intelligence validation failed:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('[SmartIntelligence] Full API response:', data);
      const report = data.content?.intelligenceReport;
      console.log('[SmartIntelligence] Extracted report:', report);
      this.validationInProgress = false;
      return report;
    } catch (error) {
      console.error('Smart Intelligence error:', error);
      this.validationInProgress = false;
      return null;
    }
  }

  /**
   * Create validation widget HTML for a response
   */
  createValidationWidget(report) {
    if (!report) return null;

    const assessment = report.finalAssessment || {};
    const analysis = report.analysis || {};

    // Determine color based on confidence
    const confidence = assessment.confidenceScore || 0;
    const confColor = confidence >= 80 ? '#10b981' : 
                      confidence >= 60 ? '#f59e0b' : 
                      confidence >= 40 ? '#f97316' : '#ef4444';

    const widget = document.createElement('div');
    widget.className = 'smart-intelligence-widget';
    
    // Build HTML in parts to handle data formatting properly
    let html = `
      <div class="si-header">
        <span class="si-title">🔍 Validation</span>
        <span class="si-confidence" style="color: ${confColor}">
          ${confidence}% confidence
        </span>
      </div>
      
      <div class="si-grid">
        <div class="si-metric">
          <div class="si-label">Recommendation</div>
          <div class="si-value si-action-${assessment.recommendedAction?.toLowerCase() || 'review'}">
            ${this.formatAction(assessment.recommendedAction)}
          </div>
        </div>
        
        <div class="si-metric">
          <div class="si-label">Status</div>
          <div class="si-value si-status">
            ${this.formatStatus(assessment.verificationStatus)}
          </div>
        </div>
        
        <div class="si-metric">
          <div class="si-label">Insights</div>
          <div class="si-value si-count">
            ${analysis.insights?.length || 0}
          </div>
        </div>
        
        <div class="si-metric">
          <div class="si-label">Gaps</div>
          <div class="si-value si-count">
            ${analysis.gaps?.length || 0}
          </div>
        </div>
      </div>
    `;

    // Add insights section if available
    if (analysis.insights && analysis.insights.length > 0) {
      html += '<div class="si-section"><div class="si-section-title">Key Insights</div><ul class="si-list">';
      analysis.insights.slice(0, 2).forEach(insight => {
        const text = typeof insight === 'string' ? insight :
          insight?.description || insight?.insight || 'Unknown insight';
        html += `<li>${this.escapeHtml(text)}</li>`;
      });
      html += '</ul></div>';
    }

    // Add gaps section if available
    if (analysis.gaps && analysis.gaps.length > 0) {
      html += '<div class="si-section"><div class="si-section-title">Areas to Review</div><ul class="si-list si-gaps">';
      analysis.gaps.slice(0, 2).forEach(gap => {
        const gapText = typeof gap === 'string' ? gap : gap?.gap || 'Unknown gap';
        const severity = typeof gap === 'object' ? gap?.severity || 'medium' : 'medium';
        html += `<li>${this.escapeHtml(gapText)} <span style="font-size: 10px; color: #999;">(${severity})</span></li>`;
      });
      html += '</ul></div>';
    }

    // Add key findings if available
    if (assessment.keyFindings && assessment.keyFindings.length > 0) {
      html += '<div class="si-findings">';
      html += `<div class="si-finding">${this.escapeHtml(assessment.keyFindings[0])}</div>`;
      html += '</div>';
    }

    // Add feedback section
    html += `
      <div class="si-feedback">
        <span class="si-feedback-label">Helpful?</span>
        <button class="si-feedback-btn si-thumbs-up" data-feedback="helpful" title="This validation was helpful">👍</button>
        <button class="si-feedback-btn si-thumbs-down" data-feedback="unhelpful" title="This validation was not helpful">👎</button>
        <button class="si-feedback-btn si-report" data-feedback="report" title="Report an issue">⚠️</button>
      </div>
    `;

    widget.innerHTML = html;

    // Add feedback event handlers
    const feedbackBtns = widget.querySelectorAll('.si-feedback-btn');
    feedbackBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleFeedback(e, report));
    });

    return widget;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      '\'': '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  formatGaps(gaps) {
    if (!gaps || gaps.length === 0) return '';
    return gaps.slice(0, 2).map(g => {
      const gapText = typeof g === 'string' ? g : g?.gap || g?.description || 'Unknown gap';
      const severity = typeof g === 'object' ? ` (${g?.severity || 'medium'})` : '';
      return `<li>${gapText}${severity}</li>`;
    }).join('');
  }

  formatInsights(insights) {
    if (!insights || insights.length === 0) return '';
    return insights.slice(0, 2).map(i => {
      const text = typeof i === 'string' ? i : i?.description || i?.insight || 'Unknown insight';
      return `<li>${text}</li>`;
    }).join('');
  }

  formatStatus(status) {
    const statuses = {
      'verified': '✓ Verified',
      'partially-verified': '◐ Partial',
      'unverified': '○ Unverified'
    };
    return statuses[status?.toLowerCase()] || status;
  }

  /**
   * Handle user feedback on validation
   */
  handleFeedback(event, report) {
    const btn = event.target;
    const feedback = btn.dataset.feedback;
    
    // Visual feedback
    btn.style.opacity = '0.5';
    btn.disabled = true;
    
    // Store feedback
    const feedbackData = {
      timestamp: new Date().toISOString(),
      feedback,
      confidenceScore: report.finalAssessment?.confidenceScore,
      recommendation: report.finalAssessment?.recommendedAction,
      gapsCount: report.analysis?.gaps?.length || 0,
      insightsCount: report.analysis?.insights?.length || 0
    };
    
    // Send to analytics endpoint if available
    this.sendFeedback(feedbackData).catch(err => {
      console.warn('Failed to send feedback:', err);
      // Still show success to user
    });
    
    // Show confirmation
    const feedbackMessages = {
      'helpful': '✓ Thanks for the feedback!',
      'unhelpful': '⚠️ We\'ll improve this',
      'report': '📝 Issue reported, thank you'
    };
    const message = feedbackMessages[feedback] || 'Thank you';
    
    btn.title = message;
    setTimeout(() => {
      btn.style.opacity = '1';
      btn.disabled = false;
    }, 2000);
  }

  /**
   * Send feedback to server for analytics
   */
  async sendFeedback(feedbackData) {
    try {
      const response = await fetch(`${this.apiBase}/api/v1/smart-intelligence/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      });
      
      if (response.ok) {
        console.log('Feedback recorded:', feedbackData.feedback);
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  }

  /**
   * Add validation widget to a message element
   */
  async attachToMessage(messageElement, question, responseText) {
    const report = await this.validateResponse(question, responseText);
    if (!report) {
      console.log('[SmartIntelligence] No report returned from validation');
      return;
    }

    console.log('[SmartIntelligence] Report received:', report);
    const widget = this.createValidationWidget(report);
    if (!widget) {
      console.log('[SmartIntelligence] Widget creation returned null');
      return;
    }

    console.log('[SmartIntelligence] Widget created, appending to message element');
    // Append widget directly to message element (works across different chat UIs)
    messageElement.appendChild(widget);
  }

  /**
   * Get analytics summary for sidebar display
   */
  async getAnalyticsSummary() {
    try {
      const response = await fetch(`${this.apiBase}/api/v1/smart-intelligence/analytics/summary?days=1`);
      if (!response.ok) return null;

      const data = await response.json();
      const summary = data.content?.summary;
      
      if (!summary) return null;

      return {
        totalValidations: summary.totalValidations,
        avgConfidence: summary.averageConfidence,
        criticalIssues: summary.confidenceDistribution?.critical || 0,
        topAction: Object.entries(summary.actionDistribution || {})
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'review'
      };
    } catch (error) {
      console.error('Analytics fetch failed:', error);
      return null;
    }
  }

  /**
   * Create analytics badge for header
   */
  createAnalyticsBadge(stats) {
    if (!stats) return null;

    const badge = document.createElement('div');
    badge.className = 'si-header-badge';
    badge.innerHTML = `
      <div class="si-badge-icon">📊</div>
      <div class="si-badge-text">
        <div class="si-badge-value">${stats.totalValidations}</div>
        <div class="si-badge-label">validations</div>
      </div>
    `;
    return badge;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartIntelligenceWidget;
}
