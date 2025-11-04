import fetch from 'node-fetch';

export class ZapierAdapter {
  async execute(action, params, tokenData) {
    const { token } = tokenData;

    switch (action) {
      case 'trigger-zap':
        return this.triggerZap(token, params);
      case 'get-webhooks':
        return this.getWebhooks(token);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async triggerZap(token, { webhookUrl, data }) {
    if (!webhookUrl || !data) throw new Error('webhookUrl, data required');
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error(`Zapier webhook error: ${r.status}`);
    return r.json();
  }

  async getWebhooks(token) {
    const r = await fetch('https://zapier.com/api/v1/webhooks', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!r.ok) throw new Error(`Zapier API error: ${r.status}`);
    return r.json();
  }
}

export default new ZapierAdapter();
