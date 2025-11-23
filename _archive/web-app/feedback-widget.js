/**
 * TooLoo.ai Feedback Widget
 * Collects user feedback on AI responses
 * Phase 5: User Feedback Loop Implementation
 */

class FeedbackWidget {
  constructor() {
    this.feedbackQueue = [];
    this.initializeWidget();
  }

  initializeWidget() {
    // Create feedback button container
    const container = document.createElement('div');
    container.id = 'feedback-widget';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 9999;
    `;

    // Inject into body
    if (document.body) {
      document.body.appendChild(container);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(container);
      });
    }
  }

  /**
   * Add feedback reaction buttons to a response element
   * @param {HTMLElement} responseEl - The response element to attach feedback to
   * @param {string} responseId - Unique ID for the response
   * @param {string} provider - AI provider name
   */
  addFeedbackButtons(responseEl, responseId, provider) {
    const feedbackContainer = document.createElement('div');
    feedbackContainer.className = 'feedback-buttons';
    feedbackContainer.style.cssText = `
      display: flex;
      gap: 6px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(148,163,184,.1);
      font-size: 13px;
    `;

    // Helpful reaction
    const helpfulBtn = this.createReactionButton('👍', 'Helpful', responseId, provider, 'helpful');
    // Not helpful reaction
    const notHelpfulBtn = this.createReactionButton('👎', 'Not Helpful', responseId, provider, 'not_helpful');
    // Accurate reaction
    const accurateBtn = this.createReactionButton('✓', 'Accurate', responseId, provider, 'accurate');
    // Inaccurate reaction
    const inaccurateBtn = this.createReactionButton('✗', 'Inaccurate', responseId, provider, 'inaccurate');

    feedbackContainer.appendChild(helpfulBtn);
    feedbackContainer.appendChild(notHelpfulBtn);
    feedbackContainer.appendChild(accurateBtn);
    feedbackContainer.appendChild(inaccurateBtn);

    responseEl.appendChild(feedbackContainer);
  }

  createReactionButton(emoji, label, responseId, provider, reaction) {
    const btn = document.createElement('button');
    btn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: rgba(59,130,246,.08);
      border: 1px solid rgba(59,130,246,.2);
      color: #94a3b8;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      transition: all 0.2s ease;
    `;

    btn.innerHTML = `<span>${emoji}</span><span>${label}</span>`;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      this.recordFeedback(responseId, provider, reaction);
      // Visual feedback
      btn.style.background = 'rgba(16,185,129,.2)';
      btn.style.borderColor = 'rgba(16,185,129,.5)';
      btn.style.color = '#10b981';
      btn.textContent = '✓ Noted';
      btn.disabled = true;
    });

    btn.addEventListener('mouseover', () => {
      if (!btn.disabled) {
        btn.style.background = 'rgba(59,130,246,.15)';
        btn.style.borderColor = 'rgba(59,130,246,.4)';
      }
    });

    btn.addEventListener('mouseout', () => {
      if (!btn.disabled) {
        btn.style.background = 'rgba(59,130,246,.08)';
        btn.style.borderColor = 'rgba(59,130,246,.2)';
      }
    });

    return btn;
  }

  /**
   * Record user feedback
   * @param {string} responseId - Unique response ID
   * @param {string} provider - AI provider name
   * @param {string} reaction - Reaction type (helpful, accurate, etc)
   */
  recordFeedback(responseId, provider, reaction) {
    const feedback = {
      timestamp: new Date().toISOString(),
      responseId,
      provider,
      reaction,
      conversationLength: this.getConversationLength()
    };

    // Add to queue
    this.feedbackQueue.push(feedback);

    // Save to localStorage
    this.persistFeedback(feedback);

    // Send to backend (async)
    this.sendFeedbackToServer(feedback);

    console.log('📊 Feedback recorded:', feedback);
  }

  persistFeedback(feedback) {
    try {
      const existing = JSON.parse(localStorage.getItem('tooloo_feedback') || '[]');
      existing.push(feedback);
      localStorage.setItem('tooloo_feedback', JSON.stringify(existing));
    } catch (err) {
      console.error('Failed to persist feedback:', err);
    }
  }

  async sendFeedbackToServer(feedback) {
    try {
      const response = await fetch('/api/v1/system/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback)
      });

      if (!response.ok) {
        console.warn('Feedback submission returned:', response.status);
      }
    } catch (err) {
      // Fail silently - don't disrupt user experience
      console.debug('Feedback submission failed (will retry on next activity):', err.message);
    }
  }

  getConversationLength() {
    try {
      return JSON.parse(localStorage.getItem('conversationHistory') || '[]').length;
    } catch {
      return 0;
    }
  }

  /**
   * Get feedback analytics summary
   * @returns {object} Summary of feedback data
   */
  getFeedbackAnalytics() {
    try {
      const feedback = JSON.parse(localStorage.getItem('tooloo_feedback') || '[]');

      const stats = {
        totalFeedback: feedback.length,
        byReaction: {},
        byProvider: {},
        helpful: 0,
        accurate: 0
      };

      feedback.forEach(f => {
        // By reaction
        stats.byReaction[f.reaction] = (stats.byReaction[f.reaction] || 0) + 1;

        // By provider
        stats.byProvider[f.provider] = (stats.byProvider[f.provider] || 0) + 1;

        // Aggregate
        if (f.reaction === 'helpful') stats.helpful++;
        if (f.reaction === 'accurate') stats.accurate++;
      });

      return stats;
    } catch (err) {
      console.error('Failed to get feedback analytics:', err);
      return {};
    }
  }

  /**
   * Export feedback for analysis
   * @returns {string} JSON export of all feedback
   */
  exportFeedback() {
    const feedback = JSON.parse(localStorage.getItem('tooloo_feedback') || '[]');
    return JSON.stringify(feedback, null, 2);
  }

  /**
   * Clear all feedback data
   */
  clearFeedback() {
    localStorage.removeItem('tooloo_feedback');
    this.feedbackQueue = [];
    console.log('Feedback data cleared');
  }
}

// Initialize feedback widget when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.feedbackWidget = new FeedbackWidget();
  });
} else {
  window.feedbackWidget = new FeedbackWidget();
}

export { FeedbackWidget };
