// @version 2.1.28
/**
 * Slack Notification Engine
 * Sends analysis results, alerts, and findings to Slack channels
 * Integrates with existing Slack provider for seamless notifications
 */

export default class SlackNotificationEngine {
  constructor(slackProvider = null) {
    this.slackProvider = slackProvider;
    this.channelConfig = {
      defaultAlerts: 'C09RD9CQE80', // #alerts channel ID (or name)
      defaultAnalysis: 'C09RD9CQE80', // #analysis channel ID (or name)
      routingRules: {}
    };
    this.notificationStats = {
      sent: 0,
      failed: 0,
      channels: 0,
      threads: 0
    };
  }

  /**
   * Send analysis result to Slack as formatted message
   */
  async sendAnalysisNotification(analysis, options = {}) {
    try {
      if (!this.slackProvider) {
        return {
          success: false,
          error: 'Slack provider not initialized'
        };
      }

      const channel = options.channel || this.channelConfig.defaultAnalysis;
      const blocks = this.formatAnalysisBlocks(analysis);

      const result = await this.slackProvider.sendBlocks(channel, blocks);

      this.notificationStats.sent++;

      return {
        success: true,
        messageTs: result.ts,
        channel,
        message: `Analysis posted: ${analysis.analysisType}`
      };
    } catch (error) {
      this.notificationStats.failed++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send finding alert with severity indicator
   */
  async sendFindingAlert(finding, severity = 'medium', options = {}) {
    try {
      if (!this.slackProvider) {
        return {
          success: false,
          error: 'Slack provider not initialized'
        };
      }

      const channel = options.channel || this.channelConfig.defaultAlerts;
      const blocks = this.formatAlertBlocks(finding, severity);

      const result = await this.slackProvider.sendBlocks(channel, blocks);

      this.notificationStats.sent++;

      return {
        success: true,
        messageTs: result.ts,
        channel,
        severity
      };
    } catch (error) {
      this.notificationStats.failed++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create threaded discussion of analysis results
   */
  async createAnalysisThread(analysis, messages = [], options = {}) {
    try {
      if (!this.slackProvider) {
        return {
          success: false,
          error: 'Slack provider not initialized'
        };
      }

      const channel = options.channel || this.channelConfig.defaultAnalysis;

      // Send initial message
      const initialBlocks = this.formatAnalysisBlocks(analysis);
      const initialResult = await this.slackProvider.sendBlocks(channel, initialBlocks);
      const threadTs = initialResult.ts;

      // Send follow-up messages in thread
      const threadMessages = [];
      for (const message of messages) {
        const threadResult = await this.slackProvider.createThread(
          channel,
          threadTs,
          message
        );
        if (threadResult) {
          threadMessages.push(threadResult);
        }
      }

      this.notificationStats.sent++;
      this.notificationStats.threads++;

      return {
        success: true,
        threadTs,
        channel,
        messageCount: threadMessages.length + 1
      };
    } catch (error) {
      this.notificationStats.failed++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Configure channel routing rules
   */
  configureChannelRouting(rules = {}) {
    try {
      if (rules.defaultAlerts) {
        this.channelConfig.defaultAlerts = rules.defaultAlerts;
      }
      if (rules.defaultAnalysis) {
        this.channelConfig.defaultAnalysis = rules.defaultAnalysis;
      }
      if (rules.routingRules) {
        this.channelConfig.routingRules = { ...rules.routingRules };
      }

      return {
        success: true,
        message: 'Channel routing configured',
        config: this.channelConfig
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get routing destination for analysis type
   */
  getChannelForAnalysis(analysisType) {
    const rules = this.channelConfig.routingRules;
    if (rules[analysisType]) {
      return rules[analysisType];
    }
    return this.channelConfig.defaultAnalysis;
  }

  /**
   * Format analysis as Slack blocks
   */
  formatAnalysisBlocks(analysis) {
    const color = this.getSentimentColor(analysis.sentiment || 'neutral');
    const timestamp = new Date().toISOString().split('T')[0];

    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 Analysis: ${analysis.analysisType || 'General'}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Primary*\n${analysis.primary || 'N/A'}`
          },
          {
            type: 'mrkdwn',
            text: `*Confidence*\n${((analysis.confidence || 0) * 100).toFixed(1)}%`
          },
          {
            type: 'mrkdwn',
            text: `*Sentiment*\n${analysis.sentiment || 'neutral'}`
          },
          {
            type: 'mrkdwn',
            text: `*Language*\n${analysis.language || 'en'}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${analysis.summary || 'Analysis completed'}`
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_Analysis Date: ${timestamp} | TooLoo.ai Phase 4.4_`
          }
        ]
      }
    ];
  }

  /**
   * Format alert as Slack blocks with severity indicator
   */
  formatAlertBlocks(finding, severity = 'medium') {
    const severityEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🔴'
    };
    const emoji = severityEmoji[severity] || '🟡';

    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Alert: ${finding.title || 'Finding'}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Severity*\n${severity}`
          },
          {
            type: 'mrkdwn',
            text: `*Type*\n${finding.type || 'Finding'}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: finding.description || 'Finding detected'
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_${new Date().toISOString()} | TooLoo.ai Phase 4.4_`
          }
        ]
      }
    ];
  }

  /**
   * Get color code based on sentiment
   */
  getSentimentColor(sentiment) {
    const colors = {
      positive: '#36a64f',
      negative: '#e74c3c',
      neutral: '#95a5a6',
      joy: '#f39c12',
      sadness: '#3498db',
      anger: '#c0392b',
      anticipation: '#9b59b6'
    };
    return colors[sentiment] || colors.neutral;
  }

  /**
   * Send status update to channel
   */
  async sendStatusUpdate(status, message, options = {}) {
    try {
      if (!this.slackProvider) {
        return {
          success: false,
          error: 'Slack provider not initialized'
        };
      }

      const channel = options.channel || this.channelConfig.defaultAnalysis;
      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${status}*\n${message}`
          }
        }
      ];

      const result = await this.slackProvider.sendBlocks(channel, blocks);

      this.notificationStats.sent++;

      return {
        success: true,
        messageTs: result.ts,
        status
      };
    } catch (error) {
      this.notificationStats.failed++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send batch notifications
   */
  async sendBatchNotifications(items, options = {}) {
    try {
      if (!this.slackProvider) {
        return {
          success: false,
          error: 'Slack provider not initialized'
        };
      }

      const results = [];
      let successCount = 0;

      for (const item of items) {
        try {
          const channel = options.channel || this.channelConfig.defaultAnalysis;
          const blocks = this.formatAnalysisBlocks(item);
          const result = await this.slackProvider.sendBlocks(channel, blocks);

          if (result) {
            successCount++;
            results.push({
              success: true,
              item: item.analysisType,
              messageTs: result.ts
            });
          }
        } catch (error) {
          results.push({
            success: false,
            item: item.analysisType,
            error: error.message
          });
        }
      }

      this.notificationStats.sent += successCount;
      if (items.length - successCount > 0) {
        this.notificationStats.failed += items.length - successCount;
      }

      return {
        success: successCount === items.length,
        sent: successCount,
        failed: items.length - successCount,
        results
      };
    } catch (error) {
      this.notificationStats.failed++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get notification statistics
   */
  getStats() {
    const total = this.notificationStats.sent + this.notificationStats.failed;
    const successRate = total > 0
      ? ((this.notificationStats.sent / total) * 100).toFixed(1)
      : 0;

    return {
      ...this.notificationStats,
      total,
      successRate
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.notificationStats = {
      sent: 0,
      failed: 0,
      channels: 0,
      threads: 0
    };
    return { success: true, message: 'Notification statistics reset' };
  }
}
