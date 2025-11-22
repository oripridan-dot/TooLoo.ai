// OAuth Manager - Orchestrates OAuth flows for multiple providers
// Handles token storage, refresh, and provider integration

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data', 'oauth-tokens');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export class OAuthManager {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    // In-memory token storage for testing
    this.tokens = new Map();
  }

  saveToken(provider, userId, tokenData) {
    try {
      const fileName = path.join(dataDir, `${provider}-${userId}.json`);
      fs.writeFileSync(fileName, JSON.stringify({
        provider,
        userId,
        ...tokenData,
        savedAt: new Date().toISOString()
      }, null, 2), 'utf8');
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  getToken(provider, userId) {
    try {
      const fileName = path.join(dataDir, `${provider}-${userId}.json`);
      if (!fs.existsSync(fileName)) return null;
      const data = JSON.parse(fs.readFileSync(fileName, 'utf8'));
      if (data.expiresAt && Date.now() > data.expiresAt) {
        return { expired: true, data };
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  revokeToken(provider, userId) {
    try {
      // Remove from in-memory storage (for testing)
      const key = `${userId}:${provider}`;
      if (this.tokens.has(key)) {
        this.tokens.delete(key);
      }
      
      // Also remove from file system
      const fileName = path.join(dataDir, `${provider}-${userId}.json`);
      if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  listConnectedProviders(userId) {
    try {
      const files = fs.readdirSync(dataDir);
      const providers = files
        .filter(f => f.endsWith(`-${userId}.json`))
        .map(f => f.replace(`-${userId}.json`, ''));
      return providers;
    } catch (e) {
      return [];
    }
  }

  generateCallbackUrl(baseUrl, provider, userId) {
    return `${baseUrl}/oauth/callback/${provider}?userId=${userId}`;
  }

  async validateToken(provider, userId, refreshHandler) {
    try {
      const token = this.getToken(provider, userId);
      if (!token) return null;
      if (token.expired && refreshHandler) {
        const refreshed = await refreshHandler(token.data);
        if (refreshed && refreshed.ok) {
          this.saveToken(provider, userId, refreshed);
          return refreshed;
        }
      }
      return token;
    } catch (e) {
      return null;
    }
  }

  initiateGitHubOAuth(userId) {
    const state = Math.random().toString(36).substring(7);
    const clientId = process.env.GITHUB_CLIENT_ID || 'test-client-id';
    const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/oauth/callback/github';
    
    const authUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=repo%20user&` +
      `state=${state}`;
    
    return { authorizationUrl: authUrl, state, provider: 'github', userId };
  }

  initiateSlackOAuth(userId) {
    const state = Math.random().toString(36).substring(7);
    const clientId = process.env.SLACK_CLIENT_ID || 'test-client-id';
    const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/oauth/callback/slack';
    
    const authUrl = `https://slack.com/oauth/v2/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=chat:write%20users:read&` +
      `state=${state}`;
    
    return { authorizationUrl: authUrl, state, provider: 'slack', userId };
  }

  isTokenExpired(token) {
    if (!token || !token.expiresAt) return false;
    return Date.now() > token.expiresAt;
  }

  getConnectedProviders(userId) {
    const providers = [];
    for (const [key, token] of this.tokens.entries()) {
      if (key.startsWith(`${userId}:`)) {
        const provider = key.split(':')[1];
        if (!this.isTokenExpired(token)) {
          providers.push({
            provider,
            username: token.providerUsername || token.username,
            token
          });
        }
      }
    }
    return providers;
  }

  getStoredToken(userId, provider) {
    const key = `${userId}:${provider}`;
    const token = this.tokens.get(key);
    if (!token) return null;
    if (this.isTokenExpired(token)) return null;
    return token;
  }
}
