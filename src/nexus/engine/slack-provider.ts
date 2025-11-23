// @version 2.1.28
/**
 * Slack Provider
 * Handles communication with Slack API for notifications and interactions
 */

import fetch from 'node-fetch';

export class SlackProvider {
  constructor() {
    if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_WORKSPACE_ID) {
      console.warn('⚠️  Slack integration not fully configured. Set SLACK_BOT_TOKEN and SLACK_WORKSPACE_ID in .env');
    }
  }

  /**
   * Send message to Slack channel
   */
  async sendMessage(channelId, message, options = {}) {
    if (!process.env.SLACK_BOT_TOKEN) {
      return { success: false, error: 'Slack not configured' };
    }

    try {
      const payload = {
        channel: channelId,
        text: message,
        ...options
      };

      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return {
        success: true,
        ts: data.ts,
        channel: data.channel
      };
    } catch (e) {
      console.error('Error sending Slack message:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Send rich formatted blocks to Slack
   */
  async sendBlocks(channelId, blocks, options = {}) {
    if (!process.env.SLACK_BOT_TOKEN) {
      return { success: false, error: 'Slack not configured' };
    }

    try {
      const payload = {
        channel: channelId,
        blocks,
        ...options
      };

      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return {
        success: true,
        ts: data.ts,
        channel: data.channel
      };
    } catch (e) {
      console.error('Error sending Slack blocks:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Post to incoming webhook
   */
  async postToWebhook(webhookUrl, payload) {
    if (!webhookUrl) {
      return { success: false, error: 'Webhook URL required' };
    }

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Webhook error: ${res.status}`);
      }

      return { success: true };
    } catch (e) {
      console.error('Error posting to webhook:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Create thread message
   */
  async createThread(channelId, threadTs, message) {
    if (!process.env.SLACK_BOT_TOKEN) {
      return { success: false, error: 'Slack not configured' };
    }

    try {
      const payload = {
        channel: channelId,
        thread_ts: threadTs,
        text: message
      };

      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return {
        success: true,
        ts: data.ts,
        threadTs
      };
    } catch (e) {
      console.error('Error creating thread:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Upload file to Slack
   */
  async uploadFile(channelId, filename, content) {
    if (!process.env.SLACK_BOT_TOKEN) {
      return { success: false, error: 'Slack not configured' };
    }

    try {
      const formData = new FormData();
      formData.append('channels', channelId);
      formData.append('filename', filename);
      formData.append('file', new Blob([content]), filename);

      const res = await fetch('https://slack.com/api/files.upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
        },
        body: formData
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return {
        success: true,
        fileId: data.file.id,
        url: data.file.permalink
      };
    } catch (e) {
      console.error('Error uploading file:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Update user status
   */
  async updateStatus(statusText, emoji = ':robot_face:') {
    if (!process.env.SLACK_BOT_TOKEN) {
      return { success: false, error: 'Slack not configured' };
    }

    try {
      const payload = {
        profile: {
          status_text: statusText,
          status_emoji: emoji
        }
      };

      const res = await fetch('https://slack.com/api/users.profile.set', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return { success: true };
    } catch (e) {
      console.error('Error updating status:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Get channel list
   */
  async getChannels() {
    if (!process.env.SLACK_BOT_TOKEN) {
      return [];
    }

    try {
      const res = await fetch('https://slack.com/api/conversations.list', {
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return data.channels || [];
    } catch (e) {
      console.error('Error getting channels:', e.message);
      return [];
    }
  }

  /**
   * Get channel info
   */
  async getChannelInfo(channelId) {
    if (!process.env.SLACK_BOT_TOKEN) {
      return null;
    }

    try {
      const res = await fetch(
        `https://slack.com/api/conversations.info?channel=${channelId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await res.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return data.channel;
    } catch (e) {
      console.error('Error getting channel info:', e.message);
      return null;
    }
  }

  /**
   * Check if Slack is configured
   */
  isConfigured() {
    return !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_WORKSPACE_ID);
  }
}

export default new SlackProvider();
