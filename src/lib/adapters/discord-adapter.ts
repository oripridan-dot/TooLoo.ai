import fetch from 'node-fetch';

export class DiscordAdapter {
  async execute(action, params, tokenData) {
    const { token } = tokenData;
    const headers = {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'send-message':
        return this.sendMessage(headers, params);
      case 'get-guilds':
        return this.getGuilds(headers);
      case 'get-channels':
        return this.getChannels(headers, params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async sendMessage(headers, { channelId, content, embed }) {
    if (!channelId || !content) throw new Error('channelId, content required');
    const body = { content };
    if (embed) body.embeds = [embed];
    const r = await fetch(`https://discordapp.com/api/channels/${channelId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`Discord API error: ${r.status}`);
    return r.json();
  }

  async getGuilds(headers) {
    const r = await fetch('https://discordapp.com/api/users/@me/guilds', { headers });
    if (!r.ok) throw new Error(`Discord API error: ${r.status}`);
    return r.json();
  }

  async getChannels(headers, { guildId }) {
    if (!guildId) throw new Error('guildId required');
    const r = await fetch(`https://discordapp.com/api/guilds/${guildId}/channels`, { headers });
    if (!r.ok) throw new Error(`Discord API error: ${r.status}`);
    return r.json();
  }
}

export default new DiscordAdapter();
