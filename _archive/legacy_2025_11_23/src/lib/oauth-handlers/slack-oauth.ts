// Slack OAuth Handler
// Handles token exchange, refresh, and API calls

import fetch from 'node-fetch';

const SLACK_OAUTH_URL = 'https://slack.com/oauth_authorize';
const SLACK_API_BASE = 'https://slack.com/api';

export default {
  // Generate authorization URL
  getAuthUrl(clientId, redirectUri, state, scopes = ['chat:write', 'files:read', 'users:read']) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state: state,
      scope: scopes.join(','),
      user_scope: 'search:read'
    });
    return `${SLACK_OAUTH_URL}?${params}`;
  },

  // Exchange code for access token
  async exchangeCode(clientId, clientSecret, code, redirectUri) {
    try {
      const response = await fetch(`${SLACK_API_BASE}/oauth.v2.access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri
        }).toString()
      });

      const data = await response.json();
      if (!data.ok) throw new Error(`Slack error: ${data.error}`);
      
      return {
        accessToken: data.access_token,
        tokenType: 'bearer',
        scope: data.scope,
        teamId: data.team.id,
        teamName: data.team.name,
        userId: data.authed_user.id,
        expiresAt: Date.now() + (3600 * 1000) // 1 hour default
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // Get workspace info
  async getWorkspaceInfo(accessToken) {
    try {
      const response = await fetch(`${SLACK_API_BASE}/team.info`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error);
      return {
        ok: true,
        workspace: {
          name: data.team.name,
          domain: data.team.domain,
          icon: data.team.icon
        }
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // List channels
  async listChannels(accessToken, excludeArchived = true) {
    try {
      const response = await fetch(
        `${SLACK_API_BASE}/conversations.list?exclude_archived=${excludeArchived}&limit=100`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const data = await response.json();
      if (!data.ok) throw new Error(data.error);
      return {
        ok: true,
        channels: data.channels.map(c => ({
          id: c.id,
          name: c.name,
          topic: c.topic?.value || '',
          members: c.num_members,
          isPrivate: c.is_private
        }))
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // Send message
  async sendMessage(accessToken, channel, text, metadata = {}) {
    try {
      const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: channel,
          text: text,
          metadata: metadata,
          mrkdwn: true
        })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error);
      return { ok: true, messageTs: data.ts, channel: data.channel };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // Get message history
  async getHistory(accessToken, channel, limit = 50) {
    try {
      const response = await fetch(
        `${SLACK_API_BASE}/conversations.history?channel=${channel}&limit=${limit}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const data = await response.json();
      if (!data.ok) throw new Error(data.error);
      return {
        ok: true,
        messages: data.messages.map(m => ({
          user: m.user,
          text: m.text,
          timestamp: m.ts,
          reactions: m.reactions || []
        }))
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // List users
  async listUsers(accessToken) {
    try {
      const response = await fetch(`${SLACK_API_BASE}/users.list`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error);
      return {
        ok: true,
        users: data.members
          .filter(u => !u.is_bot && !u.deleted)
          .map(u => ({
            id: u.id,
            name: u.name,
            realName: u.real_name,
            email: u.profile?.email,
            status: u.profile?.status_text
          }))
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // Get user info
  async getUserInfo(accessToken, userId) {
    try {
      const response = await fetch(`${SLACK_API_BASE}/users.info?user=${userId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error);
      return {
        ok: true,
        user: {
          id: data.user.id,
          name: data.user.name,
          email: data.user.profile?.email,
          timezone: data.user.tz
        }
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // Update user status
  async setUserStatus(accessToken, statusText, statusEmoji) {
    try {
      const response = await fetch(`${SLACK_API_BASE}/users.profile.set`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile: {
            status_text: statusText,
            status_emoji: statusEmoji
          }
        })
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error);
      return { ok: true, message: 'Status updated' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
};
