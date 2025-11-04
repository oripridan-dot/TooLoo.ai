// OAuth Manager - Orchestrates OAuth flows for multiple providers
// Handles token storage, refresh, and provider integration

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data', 'oauth-tokens');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export default {
  // Store OAuth token
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
  },

  // Retrieve OAuth token
  getToken(provider, userId) {
    try {
      const fileName = path.join(dataDir, `${provider}-${userId}.json`);
      if (!fs.existsSync(fileName)) return null;
      const data = JSON.parse(fs.readFileSync(fileName, 'utf8'));
      
      // Check if token is expired
      if (data.expiresAt && Date.now() > data.expiresAt) {
        return { expired: true, data };
      }
      
      return data;
    } catch (e) {
      return null;
    }
  },

  // Revoke token
  revokeToken(provider, userId) {
    try {
      const fileName = path.join(dataDir, `${provider}-${userId}.json`);
      if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // List user's connected providers
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
  },

  // Generate OAuth callback URL
  generateCallbackUrl(baseUrl, provider, userId) {
    return `${baseUrl}/oauth/callback/${provider}?userId=${userId}`;
  },

  // Validate token expiry and refresh if needed
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
};
