/**
 * OAuth Adapter - Multi-provider OAuth2 authentication
 * Supports: Google, GitHub, Microsoft
 */

import { BaseAdapter } from './base-adapter.js';
import fetch from 'node-fetch';

export class OAuthAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('oauth', config);
    
    this.metadata.authentication = 'oauth2';
    this.metadata.capabilities = [
      'authenticate',
      'refresh-token',
      'revoke-token',
      'get-user-info',
      'list-providers'
    ];
    this.metadata.scopes = ['profile', 'email', 'offline_access'];
    
    // Provider configurations
    this.providers = {
      google: {
        name: 'google',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['profile', 'email', 'openid'],
        clientId: config.google_client_id,
        clientSecret: config.google_client_secret
      },
      github: {
        name: 'github',
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scopes: ['read:user', 'user:email'],
        clientId: config.github_client_id,
        clientSecret: config.github_client_secret
      },
      microsoft: {
        name: 'microsoft',
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scopes: ['profile', 'email', 'offline_access'],
        clientId: config.microsoft_client_id,
        clientSecret: config.microsoft_client_secret
      }
    };
    
    // Token storage (in-memory for now, could be backed by database)
    this.tokens = new Map(); // userId → {accessToken, refreshToken, expiresAt, provider}
  }

  /**
   * Initialize OAuth adapter with configuration
   */
  async initialize(config) {
    this.config = { ...this.config, ...config };
    this.validateConfig();
    
    // Update provider configs
    Object.keys(this.providers).forEach(providerName => {
      const provider = this.providers[providerName];
      provider.clientId = this.config[`${providerName}_client_id`];
      provider.clientSecret = this.config[`${providerName}_client_secret`];
    });
    
    this._markReady();
  }

  /**
   * Validate OAuth configuration
   */
  validateConfig() {
    const hasProvider = Object.keys(this.providers).some(p => 
      this.config[`${p}_client_id`] && this.config[`${p}_client_secret`]
    );
    
    if (!hasProvider) {
      throw new Error('OAuth: At least one provider must be configured (clientId + clientSecret)');
    }
  }

  /**
   * Test connection to OAuth providers
   */
  async connect() {
    const available = {};
    
    for (const [name, config] of Object.entries(this.providers)) {
      available[name] = !!(config.clientId && config.clientSecret);
    }
    
    return {
      status: 'ready',
      providers: available,
      activeProviders: Object.keys(available).filter(p => available[p])
    };
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(provider, redirectUri, state = null) {
    const config = this.providers[provider];
    if (!config) throw new Error(`Unknown OAuth provider: ${provider}`);
    if (!config.clientId) throw new Error(`${provider} OAuth not configured`);
    
    const url = new URL(config.authUrl);
    url.searchParams.append('client_id', config.clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('scope', config.scopes.join(' '));
    url.searchParams.append('response_type', 'code');
    
    if (state) {
      url.searchParams.append('state', state);
    }
    
    return url.toString();
  }

  /**
   * Exchange authorization code for tokens
   */
  async authenticate(provider, code, redirectUri) {
    const config = this.providers[provider];
    if (!config) throw new Error(`Unknown OAuth provider: ${provider}`);
    if (!config.clientId || !config.clientSecret) {
      throw new Error(`${provider} OAuth not configured`);
    }
    
    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.access_token) {
        throw new Error(`OAuth token exchange failed: ${data.error || 'Unknown error'}`);
      }
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        expiresIn: data.expires_in || 3600,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
        tokenType: data.token_type || 'Bearer',
        provider,
        scope: data.scope || config.scopes.join(' ')
      };
    } catch (err) {
      this._recordError(err);
      throw err;
    }
  }

  /**
   * Get user info from OAuth provider
   */
  async getUserInfo(provider, accessToken) {
    const config = this.providers[provider];
    if (!config) throw new Error(`Unknown OAuth provider: ${provider}`);
    
    try {
      let headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      };
      
      // GitHub requires User-Agent header
      if (provider === 'github') {
        headers['User-Agent'] = 'TooLoo.ai-OAuth-Adapter/1.0';
      }
      
      const response = await fetch(config.userInfoUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err) {
      this._recordError(err);
      throw err;
    }
  }

  /**
   * Refresh an expired access token
   */
  async refreshToken(userId, refreshToken) {
    const storedToken = this.tokens.get(userId);
    if (!storedToken) {
      throw new Error(`No stored token for user: ${userId}`);
    }
    
    const { provider } = storedToken;
    const config = this.providers[provider];
    
    if (!refreshToken || !config.clientId || !config.clientSecret) {
      throw new Error(`Cannot refresh token for ${provider}`);
    }
    
    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret
        })
      });
      
      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error('Token refresh failed');
      }
      
      const newToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
        provider
      };
      
      this.tokens.set(userId, newToken);
      return newToken;
    } catch (err) {
      this._recordError(err);
      throw err;
    }
  }

  /**
   * Revoke a token
   */
  async revokeToken(userId) {
    this.tokens.delete(userId);
  }

  /**
   * Execute OAuth actions
   */
  async executeAction(action, params) {
    switch (action) {
      case 'list-providers':
        return this.listProviders();
      
      case 'auth-url':
        return this.getAuthorizationUrl(params.provider, params.redirectUri, params.state);
      
      case 'authenticate':
        return this.authenticate(params.provider, params.code, params.redirectUri);
      
      case 'get-user':
        return this.getUserInfo(params.provider, params.accessToken);
      
      case 'refresh':
        return this.refreshToken(params.userId, params.refreshToken);
      
      case 'revoke':
        return this.revokeToken(params.userId);
      
      default:
        throw new Error(`Unknown OAuth action: ${action}`);
    }
  }

  /**
   * List available OAuth providers
   */
  listProviders() {
    return Object.keys(this.providers).filter(name => {
      const config = this.providers[name];
      return config.clientId && config.clientSecret;
    });
  }
}

export default OAuthAdapter;
