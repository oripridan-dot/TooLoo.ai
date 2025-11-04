import fetch from 'node-fetch';

export class SlackAdapter {
  async execute(action, params, tokenData) {
    const { token } = tokenData;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'send-message':
        return this.sendMessage(headers, params);
      case 'get-channels':
        return this.getChannels(headers);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async sendMessage(headers, { channel, text, blocks }) {
    if (!channel || !text) throw new Error('channel, text required');
    const body = { channel, text };
    if (blocks) body.blocks = blocks;
    const r = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!data.ok) throw new Error(data.error || 'Slack API error');
    return data;
  }

  async getChannels(headers) {
    const r = await fetch('https://slack.com/api/conversations.list', { headers });
    const data = await r.json();
    if (!data.ok) throw new Error(data.error || 'Slack API error');
    return data;
  }
}

export default new SlackAdapter();
